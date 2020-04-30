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
         * @event S7Connection#message
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

        if (this._connectionState == CONN_DISCONNECTED) return;

        this._connectionState = CONN_DISCONNECTED;

        this.clearQueue();
        this._jobInProcess.forEach(job => {
            job.rej(new Error("Disconnected"));
            clearTimeout(job.timer);
        });
        this._jobInProcess.clear();

        function destroySafe(stream) {
            //handles older NodeJS versions
            if (stream.destroy) {
                stream.destroy();
            } else if (stream._destroy) {
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

            if (this._connectionState > CONN_CONNECTED) {
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
     * 
     * @param {number} func the function number
     * @param {number} subfunc the subfunction number
     * @param {Buffer} [data] the payload of the userdata call
     * @param {number} [transport=BSTR] the payload's transport type
     * @param {number} [method=REQUEST] the initial transport code
     * @returns {Promise<Buffer>}
     */
    async sendUserData(func, subfunc, data, transport = constants.proto.dataTransport.BSTR, method = constants.proto.userData.method.REQUEST) {
        debug('S7Connection sendUserData', func, subfunc, transport, method);

        let resBufs = [];
        let seqNum = 0;
        let resMsg;
        let first = true;

        do {
            debug('S7Connection sendUserData loop', seqNum);

            let reqMsg = {
                header: {
                    type: constants.proto.type.USERDATA
                },
                param: {
                    method: method,
                    type: constants.proto.userData.type.REQUEST,
                    function: func,
                    subfunction: subfunc,
                    sequenceNumber: seqNum
                },
                data: {
                    returnCode: constants.proto.retval.DATA_ERR,
                    transportSize: constants.proto.dataTransport.NULL
                }
            };

            if (first && data) { //the first call, with the actual data
                reqMsg.data = {
                    returnCode: constants.proto.retval.DATA_OK,
                    transportSize: transport,
                    payload: data
                }
            }

            // in the case we hasMoreData = true, method needs to be RESPONSE in the next requests
            method = constants.proto.userData.method.RESPONSE;
            first = false;

            resMsg = await this.sendRaw(reqMsg);

            if (resMsg.param.errorCode != constants.proto.error.OK) {
                let errDesc = constants.proto.errorCodeDesc[resMsg.param.errorCode] || '<Unknown error code>'
                throw new Error(`Unexpected error code reply on userdata response [${resMsg.param.errorCode}]: "${errDesc}"`);
            }

            seqNum = resMsg.param.sequenceNumber;
            resBufs.push(resMsg.data.payload);

        } while (resMsg.param.hasMoreData);

        let res = Buffer.concat(resBufs);
        debug('S7Connection sendUserData res', res);
        return res;
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

    // ------ data exchange methods ------

    /**
     * Sends a REQUEST telegram with READ_VAR funtction
     * @param {object[]} items 
     * @returns {Promise<object[]>}
     */
    requestReadVars(items) {
        debug('S7Connection requestReadVars', items && items.length);

        return this.sendRaw({
            header: {
                type: constants.proto.type.REQUEST
            },
            param: {
                function: constants.proto.function.READ_VAR,
                items: items
            }
        }).then(msg => msg.data.items);
    }

    /**
     * Sends a REQUEST telegram with WRITE_VAR function
     * @param {object[]} items 
     * @param {object[]} data
     * @returns {Promise<object[]>}
     */
    requestWriteVar(items, data) {
        debug('S7Connection requestWriteVar', items && items.length, data && data.length);

        return this.sendRaw({
            header: {
                type: constants.proto.type.REQUEST
            },
            param: {
                function: constants.proto.function.WRITE_VAR,
                items: items
            },
            data: {
                items: data
            }
        }).then(msg => msg.data.items);
    }

    /**
     * @typedef {object} BlockCountResponse
     * @property {number} [OB] the amount of OBs
     * @property {number} [DB] the amount of DBs
     * @property {number} [SDB] the amount of SDBs
     * @property {number} [FC] the amount of FCs
     * @property {number} [SFC] the amount of SFCs
     * @property {number} [FB] the amount of FBs
     * @property {number} [SFB] the amount of SFBs
     */

    /**
     * gets a count of blocks from the PLC
     * @returns {Promise<BlockCountResponse>} an object with the block type as property key ("DB", "FB", ...) and the count as property value
     */
    async blockCount() {
        debug('S7Connection blockCount');

        let res = await this.sendUserData(constants.proto.userData.function.BLOCK_FUNC, 
            constants.proto.userData.subfunction.BLOCK_FUNC.LIST);

        if (res.length % 4) {
            throw new Error(`Expecting blockCount response length to be multiple of 4 (got [${res.length}])`);
        }

        //create search index for block types from constants
        const blockTypes = constants.proto.block.subtype;
        /** @type {Map<number,string>} */
        const blkTypeIdx = new Map();
        Object.keys(blockTypes).forEach(k => blkTypeIdx.set(blockTypes[k], k));

        let blockCount = {};
        for (let i = 0; i < res.length; i += 4) {
            let blkTypeId = parseInt(res.toString('ascii', i, i + 2), 16);
            let count = res.readUInt16BE(i + 2);

            let blkType = blkTypeIdx.get(blkTypeId);
            if (!blkType) {
                throw new Error(`Unknown block type id [${blkTypeId}] on buffer [${res.toString('hex')}]`);
            }

            blockCount[blkType] = count;
        }

        return blockCount;
    }

    /**
     * @typedef {object} ListBlockResponse
     * @property {number} number the block number
     * @property {number} flags
     * @property {number} lang
     */

    /**
     * 
     * @param {number|string} type the block name in string, or its ID
     * @returns {Promise<ListBlockResponse[]>}
     */
    async listBlocks(type) {
        debug('S7Connection listBlocks', type);

        let blkTypeId;
        switch (typeof type) {
            case 'number':
                if (isNaN(type) || type < 0 || type > 255) {
                    throw new Error(`Invalid parameter for block type [${type}]`);
                }
                blkTypeId = type;
                break;
            case 'string':
                blkTypeId = constants.proto.block.subtype[type.toUpperCase()];
                if (blkTypeId === undefined) {
                    throw new Error(`Unknown block type [${type}]`);
                }
                break;
            default:
                throw new Error(`Unknown type for parameter block type [${type}]`);
        }

        let blkTypeString = blkTypeId.toString(16).padStart(2, '0').toUpperCase();
        if (blkTypeString.length !== 2) {
            // act as a safeguard, should never happen
            throw new Error(`Internal error parsing type [${type}], generated ID [${blkTypeString}]`);
        }

        let req = Buffer.from(blkTypeString);

        let res = await this.sendUserData(constants.proto.userData.function.BLOCK_FUNC, 
            constants.proto.userData.subfunction.BLOCK_FUNC.TYPE, req);

        if (res.length % 4) {
            throw new Error(`Expecting listBlocks response length to be multiple of 4 (got [${res.length}])`);
        }

        let blocks = []
        for (let i = 0; i < res.length; i += 4) {
            let number = res.readUInt16BE(i);
            let flags = res.readUInt8(i + 2);
            let lang = res.readUInt8(i + 3);
            blocks.push({number, flags, lang});
        }

        return blocks;
    }

    /**
     * 
     * @param {string|number} type the block type
     * @param {number} number the block number
     * @param {string} [filesystem='A'] the filesystem being queried
     * @returns {Promise<Buffer>}
     */
    async getBlockInfo(type, number, filesystem = "A") {
        debug('S7Connection listBlocks', type, number, filesystem);

        let blkTypeId;
        switch (typeof type) {
            case 'number':
                if (isNaN(type) || type < 0 || type > 255) {
                    throw new Error(`Invalid parameter for block type [${type}]`);
                }
                blkTypeId = type;
                break;
            case 'string':
                blkTypeId = constants.proto.block.subtype[type.toUpperCase()];
                if (blkTypeId === undefined) {
                    throw new Error(`Unknown block type [${type}]`);
                }
                break;
            default:
                throw new Error(`Unknown type for parameter block type [${type}]`);
        }

        let blkTypeString = blkTypeId.toString(16).padStart(2, '0').toUpperCase();
        let blkNumString = number.toString().padStart(5, '0');
        let filename = blkTypeString + blkNumString + filesystem;
        
        if (filename.length !== 8) {
            throw new Error(`Internal error on generated filename [${filename}]`);
        }

        let req = Buffer.from(filename);

        let res = await this.sendUserData(constants.proto.userData.function.BLOCK_FUNC, 
            constants.proto.userData.subfunction.BLOCK_FUNC.BLOCKINFO, req);

        return res;
    }

    /**
     * Gets the current PLC time
     * @returns {Promise<Date>}
     */
    async getTime() {
        debug('S7Connection getTime');

        let buffer = await this.sendUserData(constants.proto.userData.function.TIME,
            constants.proto.userData.subfunction.TIME.READ);

        if (buffer.length !== 10) {
            throw new Error(`Expecting 10 bytes as response from getTime, got [${buffer.length}]`);
        }

        let offset = 0;
        let reserved = fromBCD(buffer.readUInt8(offset));
        offset += 1;
        let y1 = fromBCD(buffer.readUInt8(offset));
        offset += 1;
        let y2 = fromBCD(buffer.readUInt8(offset));
        offset += 1;
        let mon = fromBCD(buffer.readUInt8(offset));
        offset += 1;
        let day = fromBCD(buffer.readUInt8(offset));
        offset += 1;
        let hr = fromBCD(buffer.readUInt8(offset));
        offset += 1;
        let min = fromBCD(buffer.readUInt8(offset));
        offset += 1;
        let sec = fromBCD(buffer.readUInt8(offset));
        offset += 1;
        let ms = fromBCD(buffer.readUInt16BE(offset) >> 4); //last 4 bits are weekday, we ignore
        offset += 2;

        //the first byte (y1) seems to be hardcoded to `0x19` 
        let year = y2 + (y2 > 89 ? 1900 : 2000);
        let plcDate = new Date(year, mon - 1, day, hr, min, sec, ms);

        debug('S7Connection getTime', plcDate);
        return plcDate;
    }

    /**
     * Gets the current PLC time
     * @param {Date} date the date/time to be setted
     * @returns {Promise<void>}
     */
    async setTime(date = new Date()) {
        debug('S7Connection setTime', date);

        let buf = Buffer.alloc(10);
        buf.writeUInt8(0, 0);
        buf.writeUInt8(toBCD((date.getFullYear() / 100) >> 0), 1);
        buf.writeUInt8(toBCD(date.getFullYear() % 100), 2);
        buf.writeUInt8(toBCD(date.getMonth() + 1), 3);
        buf.writeUInt8(toBCD(date.getDate()), 4);
        buf.writeUInt8(toBCD(date.getHours()), 5);
        buf.writeUInt8(toBCD(date.getMinutes()), 6);
        buf.writeUInt8(toBCD(date.getSeconds()), 7);
        buf.writeUInt8(toBCD((date.getMilliseconds() / 10) >> 0), 8);
        buf.writeUInt8(toBCD(((date.getMilliseconds() % 10) << 4) | (date.getDay() + 1)), 7);

        await this.sendUserData(constants.proto.userData.function.TIME,
            constants.proto.userData.subfunction.TIME.SET, buf);
    }

    /**
     * Requests the upload of a block
     * @param {string} filename the filename of the block to be uploaded
     * @returns {Promise<Buffer>} the block's content
     */
    async uploadBlock(filename) {
        debug('S7Connection uploadBlock', filename);

        let blockParts = [];

        let upStartRes = await this.sendRaw({
            header: {
                type: constants.proto.type.REQUEST
            },
            param: {
                function: constants.proto.function.UPLOAD_START,
                status: 0,
                uploadID: 0,
                filename: filename
            }
        });

        if (upStartRes.param.status !== 0){
            throw new Error(`Unexpected status [${upStartRes.param.status}] != 0 on uploadStart`);
        }

        let uploadId = upStartRes.param.uploadID;
        let blockLen = parseInt(upStartRes.param.blockLength);

        debug('S7Connection uploadBlock uploadStart-res', uploadId, blockLen);

        /* Surround the process ina try-catch block, so we can properly cleanup
           the process with an UPLOAD_END */
        try {

            if (isNaN(blockLen)) {
                throw new Error(`Unexpected value for total block length [${upStartRes.param.blockLength}] on uploadStart`);
            }

            let upRes, upResErr, upResMoreData;
            do {
                upRes = await this.sendRaw({
                    header: {
                        type: constants.proto.type.REQUEST
                    },
                    param: {
                        function: constants.proto.function.UPLOAD_BLOCK,
                        status: 0,
                        uploadID: uploadId
                    }
                });
                
                upResMoreData = upRes.param.status & 0x01;
                upResErr = upRes.param.status & 0x02;
                let payload = upRes.data.payload;

                debug('S7Connection uploadBlock upload-res', upRes.param.status, payload && payload.length);
                
                if (upResErr) {
                    throw new Error(`Unexpected error status [${upRes.param.status}] on upload`);
                }
                
                blockParts.push(payload);

            } while (upResMoreData);

        } catch (e) {
            debug('S7Connection uploadBlock catch', e);

            // release resources on the PLC by sending UPLOAD_END...
            await this.sendRaw({
                header: {
                    type: constants.proto.type.REQUEST
                },
                param: {
                    function: constants.proto.function.UPLOAD_END,
                    status: 0,
                    errorCode: 0xFFFF,
                    uploadID: uploadId
                }
            });

            // ... and then throw original error
            throw e;
        }

        debug('S7Connection uploadBlock uploadEnd');

        await this.sendRaw({
            header: {
                type: constants.proto.type.REQUEST
            },
            param: {
                function: constants.proto.function.UPLOAD_END,
                status: 0,
                errorCode: 0,
                uploadID: uploadId
            }
        });

        let res = Buffer.concat(blockParts);
        if (res.length !== blockLen) {
            throw new Error(`Size mismatch between informed length [${blockLen}] and received data [${res.length}]`);
        }

        return res;
    }
}

module.exports = S7Connection;

/**
 * Helper to convert from BCD notation
 * @private
 * @param {number} i 
 */
function fromBCD(i) {
    return (100 * (i >> 8)) + (10 * ((i >> 4) & 0x0f)) + (i & 0x0f);
}

/**
 * Helper to convert to BCD notation
 * @private
 * @param {number} i 
 */
function toBCD(i) {
    return ((i / 10) << 4) | (i % 10);
}