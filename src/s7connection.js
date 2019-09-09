//@ts-check
/*
    Copyright (c) 2019 Guilherme Francescon Cittolin

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/
/*jshint esversion: 6, node: true*/

const { EventEmitter } = require('events')
//@ts-ignore
const constants = require('./constants.json');
const util = require('util');
const debug = util.debuglog('nodes7');

const S7Parser = require('./s7protocol/s7parser.js');
const S7serializer = require('./s7protocol/s7serializer.js');

const CONN_NOT_INITIALIZED = 0;
const CONN_CONNECTING = 1;
const CONN_CONNECTED = 2;
const CONN_DISCONNECTED = 3;
const CONN_ERROR = 99;


/**
 * Emitted when an error occurs while communicating
 * with the PLC
 * @event S7Connection#error
 * @param {*} e the error
 */

/**
 * @emits connect
 * @emits message
 */
class S7Connection extends EventEmitter {

    /**
     * 
     * @param {object} stream 
     * @param {object} [opts] configuration options
     * @param {number} [opts.maxJobs] the max number of parallel jobs
     * @param {number} [opts.maxPDUSize] the max PDU Size
     * @param {number} [opts.timeout=2000] the timeout for execution of requests. 0 for no timeout
     */
    constructor(stream, opts) {
        debug('new S7Connection');

        super();

        if (stream.write === undefined) {
            throw new Error('Underlying stream must support "write" calls');
        }

        this.stream = stream;

        opts = opts || {};
        this.maxJobs = opts.maxJobs || 8;
        this.maxPDUSize = opts.maxPDUSize || 960;
        this.timeout = opts.timeout !== undefined && !isNaN(opts.timeout) ? opts.timeout : 2000;

        this._parser = new S7Parser();
        this._serializer = new S7serializer();
        this._parser.on('error', e => this._onParserError(e));
        this._serializer.on('error', e => this._onSerializerError(e));

        this._parser.on('data', d => this._onIncomingData(d));
        this.stream.pipe(this._parser);
        this._serializer.pipe(this.stream);

        this._initParams();
    }

    _initParams() {
        debug('S7Connection _initParams');

        this._connectionState = CONN_NOT_INITIALIZED
        this._pduSize = this.maxPDUSize;
        this._maxJobs = this.maxJobs;
        this._pduSequence = 0;
        this._jobQueue = [];
        this._jobInProcess = new Map();
    }

    _nextPDU() {
        let pdu = this._pduSequence++;
        if (this._pduSequence > 0xffff) {
            this._pduSequence = 1;
        }
        return pdu;
    }

    _onParserError(e) {
        debug('S7Connection _onParserError', e);
        this.emit('error', e);
        this.destroy(); //abort connection if we can't understand what we're receiving
    }
    
    _onSerializerError(e) {
        debug('S7Connection _onSerializerError', e);
        this.emit('error', e);
        //TODO - ideally we should reject the promise that caused the error to happen
    }

    /**
     * Handles incoming data
     * 
     * @private
     * @param {object} data 
     */
    _onIncomingData(data) {
        debug('S7Connection _onIncomingData', data);

        if (!data || !data.header) {
            //TODO should never happen, but let's assert it
        }

        let pdu = data.header.pduReference;

        // find related job
        let job = this._jobInProcess.get(pdu);
        this._jobInProcess.delete(pdu);

        // clear request timeout timer
        if (job) {
            clearTimeout(job.timer);
        }

        // send next telegrams if any job in the queue
        this._processQueue();

        // check for errors
        if (data.header.errorClass || data.header.errorCode) {
            let errCode = (data.header.errorClass << 8) | data.header.errorCode
            let errDesc = constants.proto.errorCodeDesc[errCode] || `<Unknown error code>`;
            let err = new Error(`PLC error [0x${errCode.toString(16)}]: ${errDesc}`);

            if (job) {
                job.rej(err, data);
            } else {
                this.emit('error', err);
            }

            return;
        }

        if (job) {
            job.res(data);
            return;
        }

        //setup connection params
        if (data.header.type == constants.proto.type.RESPONSE &&
            data.param && data.param.function === constants.proto.function.COMM_SETUP) {

            if (this._connectionState != CONN_CONNECTING) {
                this.emit('error', new Error(`Received a COMM_SETUP package while not in CONN_CONNECTING stage`));
                return;
            }

            this._maxJobs = Math.min(data.param.maxJobsCalling, data.param.maxJobsCalled, this.maxJobs)
            this._pduSize = Math.min(data.param.pduLength, this.maxPDUSize)

            this._connectionState = CONN_CONNECTED;

            /**
             * Emitted when the connection is negotiated and established
             * @event S7Connection#connect
             */
            process.nextTick(() => this.emit('connect'));

            return;
        }

        // emits any unhandled message
        /**
         * Emitted on all incoming packets from the PLC that
         * are NOT response of a request in the queue
         * @event S7Connection#timeout
         * @param {object} data The job's payload, if available
         */
        this.emit('message', data);
    }

    _onRequestTimeout(pdu) {
        debug('S7Connection _onRequestTimeout', pdu);

        // find related job
        let job = this._jobInProcess.get(pdu);
        this._jobInProcess.delete(pdu);

        if (job) job.rej(new Error("Request timeout"));

        /**
         * Emitted when a job times out. The job currently in
         * progress that caused the timeout already gets its 
         * promise rejected
         * @event S7Connection#timeout
         * @param {object} [payload] The job's payload, if available
         */
        this.emit('timeout', job && job.payload);
    }

    _processQueue() {
        debug('S7Connection _processQueue');

        if (!this.isConnected) return;
        if (!this._jobQueue.length) return;
        if (this._jobInProcess.size >= this._maxJobs) return;

        let job = this._jobQueue.shift();
        let pdu = this._nextPDU();
        job.payload.header.pduReference = pdu;

        if (this._jobInProcess.has(pdu)) {
            // should never happen
            this.emit('error', new Error(`Pending job with PDU [${job.pdu}] conflicting with new job`));
        }

        this._jobInProcess.set(pdu, job);
        if (this.timeout > 0) {
            job.timer = setTimeout(() => this._onRequestTimeout(pdu), this.timeout);
        }

        this._serializer.write(job.payload);

    }

    // ------ public methods -----

    /**
     * the negotiated maximum pdu size
     */
    get pduSize() {
        return this._pduSize;
    }

    /**
     * the negotiated number of maximum parallel jobs
     */
    get parallelJobs() {
        return this._maxJobs;
    }

    /**
     * whether we're connected or not
     */
    get isConnected() {
        return this._connectionState === CONN_CONNECTED;
    }

    /**
     * Initiates the connection using the provided stream
     */
    connect(cb) {
        debug('S7Connection connect');

        if (this._connectionState > CONN_NOT_INITIALIZED) {
            throw new Error("Already Initialized")
        }

        if (typeof cb === 'function') {
            this.once('connect', cb);
        }

        this._connectionState = CONN_CONNECTING;

        this._serializer.write({
            header: {
                type: constants.proto.type.REQUEST,
                rid: 0,
                pduReference: this._nextPDU(),
            },
            param: {
                function: constants.proto.function.COMM_SETUP,
                maxJobsCalling: this.maxJobs,
                maxJobsCalled: this.maxJobs,
                pduLength: this.maxPDUSize
            }
        });
    }

    /**
     * Finishes this connection instance by cancelling all 
     * pending jobs and destroying all internal objects
     */
    destroy() {
        debug('S7Connection disconnect');

        if(this._connectionState == CONN_DISCONNECTED) return;

        this._connectionState = CONN_DISCONNECTED;

        this.clearQueue();
        this._jobInProcess.forEach(job => {
            job.rej(new Error("Disconnected"));
        });
        this._jobInProcess.clear();

        function destroySafe(stream){
            //handles older NodeJS versions
            if(stream.destroy){
                stream.destroy();
            } else if (stream._destroy){
                stream._destroy();
            }
        }

        destroySafe(this._serializer);
        destroySafe(this._parser);
    }

    /**
     * Sends a message raw message to the PLC. It expects an object
     * that will be serialized by S7Parser
     * 
     * @async
     * @param {object} msg the message to be sent to the PLC
     * @returns the response sent by the PLC on the fulfillment of the Promise
     */
    sendRaw(msg) {
        debug('S7Connection sendRaw', msg);

        return new Promise((res, rej) => {
            if (!msg.header) {
                rej(new Error("Missing message header"));
                return;
            }

            if (this._connectionState > CONN_CONNECTED){
                rej(new Error("Not connected"));
            }

            this._jobQueue.push({
                payload: msg,
                res, rej
            });
            this._processQueue();
        });
    }

    /**
     * Remove any request from the queue that has not been already sent.
     * Any pending promise will be rejected
     */
    clearQueue() {
        debug('S7Connection clearQueue');

        let oldQueue = this._jobQueue;
        this._jobQueue = [];
        for (const job of oldQueue) {
            job.rej(new Error("Job interrupted"));
        }
    }
}

module.exports = S7Connection;