/*
    Copyright (c) 2018 Guilherme Francescon Cittolin

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

const {
    Transform
} = require('stream');
const constants = require('../constants.json');
const util = require('util');
const debug = util.debuglog('nodes7');

const NodeS7Error = require('../errors.js');

const PTR_HDR_PARAM_LEN = 6;
const PTR_HDR_DATA_LEN = 8;

function serializeParamItems(buf, items, ptr) {
    buf.writeUInt8(items.length, ptr++);
    for (let i = 0; i < items.length; i++) {
        let elm = items[i];
        buf.writeUInt8(0x12, ptr++); //varSpec
        buf.writeUInt8(10, ptr++); //varSpec length
        buf.writeUInt8(elm.syntax, ptr++);
        buf.writeUInt8(elm.transport, ptr++);
        buf.writeUInt16BE(elm.length, ptr);
        ptr += 2;
        buf.writeUInt16BE(elm.db || 0, ptr);
        ptr += 2;
        buf.writeUInt8(elm.area, ptr++);
        buf.writeUIntBE(elm.address, ptr, 3);
        ptr += 3;
    }
    return ptr;
}

function serializeDataItems(buf, items, ptr) {
    for (let i = 0; i < items.length; i++) {
        let elm = items[i];
        buf.writeUInt8(elm.returnCode || 0, ptr++); //varSpec
        buf.writeUInt8(elm.transportSize, ptr++);
        let dataLength = elm.data.length;
        if (//elm.transportSize === constants.proto.dataTransport.BBIT ||
            elm.transportSize === constants.proto.dataTransport.BBYTE ||
            elm.transportSize === constants.proto.dataTransport.BINT) {
            //the length is in bits for these transports
            dataLength *= 8;
        }
        buf.writeUInt16BE(dataLength, ptr);
        ptr += 2;
        elm.data.copy(buf, ptr);
        ptr += elm.data.length;
        if ((elm.data.length % 2) && (i < items.length - 1)) {
            //pad even data fields
            ptr += 1;
        }
    }
    return ptr;
}

class S7Serializer extends Transform {

    constructor(opts) {
        opts = opts || {};
        opts.writableObjectMode = true;

        super(opts);

        this._nBuffer = null;
        debug("new S7Serializer");
    }

    _transform(chunk, encoding, cb) {
        debug("S7Serializer _transform");

        this.serialize(chunk, (err, data) => {
            if (err) {
                cb(err);
            } else {
                this.push(data);
                cb();
            }
        });
    }

    _serializeRequest(chunk) {
        debug("S7Serializer _serializeRequest");
        let buf, parameterLength, dataLength = 0;

        //we're skipping a lot of validations, since we expect the upper layers to do that

        switch (chunk.param.function) {
            case constants.proto.function.WRITE_VAR:
            case constants.proto.function.READ_VAR:
                //let's accept `item` as if it's a single item from `items` array
                if (chunk.param.item && !chunk.param.items) {
                    chunk.param.items = [item];
                }

                parameterLength = 2 + (chunk.param.items.length * 12);
                if (chunk.param.function == constants.proto.function.WRITE_VAR) {
                    for (let i = 0; i < chunk.data.items.length; i++) {
                        let e = chunk.data.items[i]
                        dataLength += 4 + e.data.length;
                        if ((e.data.length % 2) && (i < chunk.data.items.length)) {
                            // padding if data is even, but not the last one
                            dataLength += 1;
                        }
                    }
                }
                buf = Buffer.alloc(10 + parameterLength + dataLength);

                serializeParamItems(buf, chunk.param.items, 11);
                if (chunk.param.function == constants.proto.function.WRITE_VAR) {
                    serializeDataItems(buf, chunk.data.items, 10 + parameterLength);
                }
                break;

            case constants.proto.function.UPLOAD_START:
                let filename = chunk.param.filename || "";
                parameterLength = 9 + filename.length;
                buf = Buffer.alloc(10 + parameterLength + dataLength);

                buf.writeUInt8(chunk.param.status || 0, 11);
                buf.writeUInt16BE(chunk.param.errorCode || 0, 12);
                buf.writeUInt32BE(chunk.param.uploadID || 0, 14);
                buf.writeUInt8(filename.length, 18);
                buf.write(filename, 19, 'ascii');
                break;

            case constants.proto.function.UPLOAD_BLOCK:
            case constants.proto.function.UPLOAD_END:
                parameterLength = 8;
                buf = Buffer.alloc(10 + parameterLength + dataLength);

                buf.writeUInt8(chunk.param.status || 0, 11);
                buf.writeUInt16BE(chunk.param.errorCode || 0, 12);
                buf.writeUInt32BE(chunk.param.uploadID || 0, 14);
                break;

            case constants.proto.function.PLC_CONTROL:
                let service = chunk.param.piService || "";
                let parameter = chunk.param.parameter || "";
                parameterLength = 11 + service.length + parameter.length;
                buf = Buffer.alloc(10 + parameterLength + dataLength);

                buf.writeUInt8(0xfd, 17); //?????
                buf.writeUInt16BE(parameter.length, 18);
                buf.write(parameter, 20, 'ascii');
                buf.writeUInt8(service.length, 20 + parameter.length);
                buf.write(service, 21 + parameter.length, 'ascii');
                break;

            case constants.proto.function.PLC_STOP:
                let piService = chunk.param.piService || "";
                parameterLength = 7 + piService.length;
                buf = Buffer.alloc(10 + parameterLength + dataLength);

                buf.writeUInt8(piService.length, 16);
                buf.write(piService, 17, 'ascii');
                break;

            case constants.proto.function.COMM_SETUP:
                parameterLength = 8;
                buf = Buffer.alloc(10 + parameterLength + dataLength);

                buf.writeUInt16BE(chunk.param.maxJobsCalling, 12);
                buf.writeUInt16BE(chunk.param.maxJobsCalled, 14);
                buf.writeUInt16BE(chunk.param.pduLength, 16);
                break;

            default:
                return new NodeS7Error('ERR_INVALID_ARGUMENT', `Unknown request parameter function [${chunk.param.function}]`);
        }

        buf.writeUInt16BE(parameterLength, PTR_HDR_PARAM_LEN);
        buf.writeUInt16BE(dataLength, PTR_HDR_DATA_LEN);
        buf.writeUInt8(chunk.param.function, 10);

        return buf;
    }

    _serializeResponse(chunk) {
        debug("S7Serializer _serializeResponse");
        let buf, parameterLength, dataLength = 0;

        //we're skipping a lot of validations, since we expect the upper layers to do that

        switch (chunk.param.function) {
            case constants.proto.function.WRITE_VAR:
            case constants.proto.function.READ_VAR:
                //let's accept `item` as if it's a single item from `items` array
                if (chunk.data.item && !chunk.data.items) {
                    chunk.data.items = [item];
                }

                parameterLength = 2;
                if (chunk.param.function == constants.proto.function.READ_VAR) {
                    for (let i = 0; i < chunk.data.items.length; i++) {
                        let e = chunk.data.items[i];
                        dataLength += 4 + e.data.length;
                        if ((e.data.length % 2) && (i < chunk.data.items.length - 1)) {
                            // padding if data is even, but not the last one
                            dataLength += 1;
                        }
                    }
                } else {
                    dataLength = chunk.data.items.length;
                }
                buf = Buffer.alloc(12 + parameterLength + dataLength);

                buf.writeUInt8(chunk.param.itemCount, 13);

                if (chunk.param.function == constants.proto.function.READ_VAR) {
                    serializeDataItems(buf, chunk.data.items, 12 + parameterLength);
                } else {
                    for (let i = 0; i < chunk.data.items.length; i++) {
                        const elm = chunk.data.items[i];
                        buf.writeUInt8(elm.returnCode, 12 + parameterLength + i);
                    }
                }
                break;

            case constants.proto.function.UPLOAD_START:
                let blockLength = chunk.param.blockLength || "";
                parameterLength = 9 + blockLength.length;
                buf = Buffer.alloc(12 + parameterLength + dataLength);

                buf.writeUInt8(chunk.param.status || 0, 13);
                buf.writeUInt16BE(0x0100, 14); //?????
                buf.writeUInt32BE(chunk.param.uploadID || 0, 16);
                buf.writeUInt8(blockLength.length, 20);
                buf.write(blockLength, 21, 'ascii');
                break;

            case constants.proto.function.UPLOAD_BLOCK:
                parameterLength = 2;
                dataLength = 4 + chunk.data.payload.length;
                buf = Buffer.alloc(12 + parameterLength + dataLength);

                buf.writeUInt8(chunk.param.status || 0, 13);
                buf.writeUInt16BE(chunk.data.payload.length, 14);
                buf.writeUInt16BE(0x00fb, 16); //?????
                chunk.data.payload.copy(buf, 18);
                break;

            case constants.proto.function.UPLOAD_END:
            case constants.proto.function.PLC_STOP:
            case constants.proto.function.PLC_CONTROL:
                parameterLength = 1;
                buf = Buffer.alloc(12 + parameterLength + dataLength);
                break;

            case constants.proto.function.COMM_SETUP:
                parameterLength = 8;
                buf = Buffer.alloc(12 + parameterLength + dataLength);

                buf.writeUInt16BE(chunk.param.maxJobsCalling, 14);
                buf.writeUInt16BE(chunk.param.maxJobsCalled, 16);
                buf.writeUInt16BE(chunk.param.pduLength, 18);
                break;

            default:
                return new NodeS7Error('ERR_INVALID_ARGUMENT', `Unknown response parameter function [${chunk.param.function}]`);
        }

        buf.writeUInt16BE(parameterLength, PTR_HDR_PARAM_LEN);
        buf.writeUInt16BE(dataLength, PTR_HDR_DATA_LEN);
        buf.writeUInt8(chunk.param.function, 12);

        return buf;
    }

    _serializeUserData(chunk) {
        debug("S7Serializer _serializeUserData");
        let buf;

        if (chunk.param.method !== constants.proto.userData.method.REQUEST
            && chunk.param.method !== constants.proto.userData.method.RESPONSE) {
            return new NodeS7Error('ERR_INVALID_ARGUMENT', `Unknown userData method [${chunk.param.method}]`);
        }

        let isResMethod = chunk.param.method === constants.proto.userData.method.RESPONSE;
        let typeFunction = ((chunk.param.type & 0x0f) << 4) | (chunk.param.function & 0x0f)
        let payload = chunk.data.payload;

        let parameterLength = isResMethod ? 12 : 8;
        let dataLength = (payload && payload.length || 0) + 4;

        buf = Buffer.alloc(10 + parameterLength + dataLength);

        // parameter section

        buf.writeUIntBE(0x000112, 10, 3); //userData header
        buf.writeUInt8(isResMethod ? 8 : 4, 13); //param length
        buf.writeUInt8(chunk.param.method, 14);
        buf.writeUInt8(typeFunction, 15);
        buf.writeUInt8(chunk.param.subfunction, 16);
        buf.writeUInt8(chunk.param.sequenceNumber || 0, 17);

        let ptr = 18;
        if (isResMethod) {
            buf.writeUInt8(chunk.param.dataUnitReference || 0, ptr++);
            buf.writeUInt8(chunk.param.hasMoreData ? 1 : 0, ptr++);
            buf.writeUInt16BE(chunk.param.errorCode || 0, ptr);
            ptr += 2;
        }

        // data section

        buf.writeUInt8(chunk.data.returnCode || 0, ptr++);
        buf.writeUInt8(chunk.data.transportSize || 0, ptr++);
        buf.writeUInt16BE(payload && payload.length || 0, ptr);
        ptr += 2;

        if (payload) {
            payload.copy(buf, ptr);
        }

        // header lengths

        buf.writeUInt16BE(parameterLength, PTR_HDR_PARAM_LEN);
        buf.writeUInt16BE(dataLength, PTR_HDR_DATA_LEN);

        return buf;
    }

    serialize(chunk, cb) {
        debug("S7Serializer serialize");

        let buf, headerLength;

        //check if we have a header
        if (!chunk.header) {
            cb(new NodeS7Error('ERR_INVALID_ARGUMENT', 'Missing telegram header'));
            return;
        }

        //check if we have a valid header type, and set its length (used if we don't have parameters/data)
        switch (chunk.header.type) {
            case constants.proto.type.REQUEST:
                headerLength = 10;
                break;
            case constants.proto.type.USERDATA:
                headerLength = 10;
                break;
            case constants.proto.type.ACK:
            case constants.proto.type.RESPONSE:
                headerLength = 12;
                break;
            default:
                cb(new NodeS7Error('ERR_INVALID_ARGUMENT', `Unknown telegram type [${chunk.header.type}]`));
                return;
        }

        //delegate buffer creation if we have parameters
        if (chunk.param) {
            switch (chunk.header.type) {
                case constants.proto.type.REQUEST:
                    buf = this._serializeRequest(chunk);
                    break;
                case constants.proto.type.USERDATA:
                    buf = this._serializeUserData(chunk);
                    break;
                case constants.proto.type.ACK:
                case constants.proto.type.RESPONSE:
                    buf = this._serializeResponse(chunk);
                    break;
            }

            //report an eventual error
            if (buf instanceof Error) {
                cb(buf);
                return;
            }
        } else {
            buf = Buffer.alloc(headerLength);
            buf.writeUInt16BE(0, PTR_HDR_PARAM_LEN); //parameterLength
            buf.writeUInt16BE(0, PTR_HDR_DATA_LEN); //dataLength
        }

        //build header
        // 0x32 + type(1) + redundancyID(2) + pduReference(2) + parameterLength(2) + dataLength(2) [ + errorClass(1) + errorCode(1) ] = 10[12]
        buf.writeUInt8(constants.proto.ID, 0);
        buf.writeUInt8(chunk.header.type, 1);
        buf.writeUInt16BE(Number(chunk.header.rid) || 0, 2);
        buf.writeUInt16BE(Number(chunk.header.pduReference) || 0, 4);
        if (chunk.header.type == constants.proto.type.ACK || chunk.header.type == constants.proto.type.RESPONSE) {
            buf.writeUInt8(Number(chunk.header.errorClass) || 0, 10);
            buf.writeUInt8(Number(chunk.header.errorCode) || 0, 11);
        }


        debug("S7Serializer serialize", buf);
        cb(null, buf);
    }
}

module.exports = S7Serializer;
