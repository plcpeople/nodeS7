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

class S7Parser extends Transform {

    constructor(opts) {
        opts = opts || {};
        opts.readableObjectMode = true;
        opts.decodeStrings = true;

        super(opts);

        this._nBuffer = null;
        debug("new S7Parser");
    }

    _parseRequestParameter(chunk, offset, length){
        let obj = {}, offsetStart = offset;

        obj.function = chunk.readUInt8(offset);
        offset += 1;
        switch(obj.function){
            case constants.proto.function.READ_VAR:
            case constants.proto.function.WRITE_VAR:
                let itemCount = chunk.readUInt8(offset);
                offset += 1;

                obj.items = [];
                for(let i = 0; i < itemCount; i++){
                    let varSpec = chunk.readUInt8(offset);
                    if (varSpec != constants.proto.VAR_SPEC){
                        return new Error(`Unknown variable specification [${varSpec}]`);
                    }

                    //TODO - we're skipping the length (but checking the variable specification) - should we check this too?

                    obj.items.push({
                        syntax: chunk.readUInt8(offset + 2),
                        transport: chunk.readUInt8(offset + 3),
                        length: chunk.readUInt16BE(offset + 4),
                        db: chunk.readUInt16BE(offset + 6),
                        area: chunk.readUInt8(offset + 8),
                        address: chunk.readUIntBE(offset + 9, 3)
                    });

                    offset += 12;
                }
                break;
            case constants.proto.function.UPLOAD_START:
            case constants.proto.function.UPLOAD_BLOCK:
            case constants.proto.function.UPLOAD_END:
                obj.status = chunk.readUInt8(offset);
                offset += 1;
                if (obj.function == constants.proto.function.UPLOAD_END){
                    obj.errorCode = chunk.readUInt16BE(offset);
                }
                offset += 2;
                obj.uploadID = chunk.readUInt32BE(offset);
                offset += 4;
                if (obj.function == constants.proto.function.UPLOAD_START) {
                    let filenameLength = chunk.readUInt8(offset);
                    offset += 1;
                    obj.filename = chunk.toString('ascii', offset, offset + filenameLength);
                    offset += filenameLength;
                }
                break;
            case constants.proto.function.PLC_CONTROL:
                //skip 7 unknown bytes
                offset += 7;
                let paramLength = chunk.readUInt16BE(offset);
                offset += 2;
                obj.parameter = chunk.toString('ascii', offset, offset + paramLength);
                offset += paramLength;
                let serviceLength = chunk.readUInt8(offset);
                offset += 1;
                obj.piService = chunk.toString('ascii', offset, offset + serviceLength);
                offset += serviceLength;
                break;
            case constants.proto.function.PLC_STOP:
                //skip 5 unknown bytes
                offset += 5;
                let piLength = chunk.readUInt8(offset);
                offset += 1;
                obj.piService = chunk.toString('ascii', offset, offset + piLength);
                offset += piLength;
                break;
            case constants.proto.function.COMM_SETUP:
                //skip 1 unknown byte
                offset += 1;
                obj.maxJobsCalling = chunk.readUInt16BE(offset);
                offset += 2;
                obj.maxJobsCalled = chunk.readUInt16BE(offset);
                offset += 2;
                obj.pduLength = chunk.readUInt16BE(offset);
                offset += 2;
                break;
            default:
                return new Error(`Unknown request parameter function [${obj.function}]`);
        }

        if(offset > offsetStart + length) {
            //safe check that we haven't read more than the length of the parameters area
            return new Error(`Parser overflow reading request parameter [${offset}] > [${offsetStart + length}]`);
        }

        return obj;
    }

    _parseResponseParameter(chunk, offset, length) {
        let obj = {}, offsetStart = offset;

        obj.function = chunk.readUInt8(offset);
        offset += 1;
        switch(obj.function){
            case constants.proto.function.READ_VAR:
            case constants.proto.function.WRITE_VAR:
                obj.itemCount = chunk.readUInt8(offset);
                offset += 1;
                break;
            case constants.proto.function.UPLOAD_END:
                break;
            case constants.proto.function.UPLOAD_START:
            case constants.proto.function.UPLOAD_BLOCK:
                obj.status = chunk.readUInt8(offset);
                offset += 1;
                if (obj.function == constants.proto.function.UPLOAD_START) {
                    //skip 2 unknown bytes
                    offset += 2;
                    obj.uploadID = chunk.readUInt32BE(offset);
                    offset += 4;
                    let blockLengthLength = chunk.readUInt8(offset);
                    offset += 1;
                    obj.blockLength = chunk.toString('ascii', offset, offset + blockLengthLength);
                    offset += blockLengthLength;
                }
                break;
            case constants.proto.function.PLC_CONTROL:
            case constants.proto.function.PLC_STOP:
                break;
            case constants.proto.function.COMM_SETUP:
                //skip 1 unknown byte
                offset += 1;
                obj.maxJobsCalling = chunk.readUInt16BE(offset);
                offset += 2;
                obj.maxJobsCalled = chunk.readUInt16BE(offset);
                offset += 2;
                obj.pduLength = chunk.readUInt16BE(offset);
                offset += 2;
                break;
            default:
                return new Error(`Unknown response parameter function [${obj.function}]`);
        }

        if(offset > offsetStart + length) {
            //safe check that we haven't read more than the length of the parameters area
            return new Error(`Parser overflow reading response parameter [${offset}] > [${offsetStart + length}]`);
        }

        return obj;
    }

    _parseUserDataParameter(chunk, offset, length) {
        let obj = {}, offsetStart = offset;

        obj.head = chunk.readUIntBE(offset, 3);
        offset += 3;
        let paramLength = chunk.readUInt8(offset);
        //skip one more unknown byte
        offset += 2;
        let type_function = chunk.readUInt8(offset);
        offset += 1;
        obj.type = type_function >> 4;
        obj.function = type_function & 0x0f;
        obj.subfunction = chunk.readUInt8(offset);
        offset += 1;
        obj.sequenceNumber = chunk.readUInt8(offset);
        offset += 1;
        if(paramLength == 8){
            obj.dataUnitReference = chunk.readUInt8(offset);
            offset += 1;
            obj.lastDataUnit = !(chunk.readUInt8(offset));
            offset += 1;
            obj.errorCode = chunk.readUInt16BE(offset);
            offset += 2;
        }

        //some helpers
        obj.isRequest = obj.type === constants.proto.userData.type.REQUEST;
        obj.isResponse = obj.type === constants.proto.userData.type.RESPONSE;

        if (offset > offsetStart + length) {
            //safe check that we haven't read more than the length of the data area
            return new Error(`Parser overflow reading response data section [${offset}] > [${offsetStart + length}]`);
        }

        return obj;
    }

    _parseRequestData(chunk, offset, length, param){
        let obj = {}, offsetStart = offset;

        switch (param.function) {
            case constants.proto.function.WRITE_VAR:
                obj.items = [];
                for(let i = 0; i < param.items.length; i++){
                    let returnCode = chunk.readUInt8(offset);
                    offset += 1;
                    let transportSize = chunk.readUInt8(offset);
                    offset += 1;
                    let itemLenBytes = chunk.readUInt16BE(offset);
                    offset += 2;
                    if (transportSize === constants.proto.dataTransport.BBIT ||
                        transportSize === constants.proto.dataTransport.BBYTE || 
                        transportSize === constants.proto.dataTransport.BINT) {
                            //the length is in bits for these transports
                            itemLenBytes = Math.ceil(itemLenBytes / 8);
                        }
                    obj.items.push({
                        returnCode,
                        transportSize,
                        data: chunk.slice(offset, offset + itemLenBytes)
                    });
                    offset += itemLenBytes;
                }
                break;
            default:
                return new Error(`Don't know how to parse the data section of request function [${obj.function}]`);

        }

        if (offset > offsetStart + length) {
            //safe check that we haven't read more than the length of the data area
            return new Error(`Parser overflow reading request data section [${offset}] > [${offsetStart + length}]`);
        }

        return obj;
    }

    _parseResponseData(chunk, offset, length, param){
        let obj = {}, offsetStart = offset;

        switch (param.function) {
            case constants.proto.function.UPLOAD_BLOCK:
                let dataLength = chunk.readUInt16BE(offset);
                //also skips 2 more unknown bytes
                offset += 4;
                obj.payload = chunk.slice(offset, offset + dataLength);
                offset += dataLength;
                break;
            case constants.proto.function.WRITE_VAR:
                obj.items = [];
                for (let i = 0; i < param.itemCount; i++) {
                    let returnCode = chunk.readUInt8(offset);
                    offset += 1;
                    obj.items.push({
                        returnCode
                    });
                }
                break;
            case constants.proto.function.READ_VAR:
                obj.items = [];
                for(let i = 0; i < param.itemCount; i++){
                    let returnCode = chunk.readUInt8(offset);
                    offset += 1;
                    let transportSize = chunk.readUInt8(offset);
                    offset += 1;
                    let itemLenBytes = chunk.readUInt16BE(offset);
                    offset += 2;
                    if (transportSize === constants.proto.dataTransport.BBIT ||
                        transportSize === constants.proto.dataTransport.BBYTE || 
                        transportSize === constants.proto.dataTransport.BINT) {
                            //the length is in bits for these transports
                            itemLenBytes = Math.ceil(itemLenBytes / 8);
                        }
                    obj.items.push({
                        returnCode,
                        transportSize,
                        data: chunk.slice(offset, offset + itemLenBytes)
                    });
                    offset += itemLenBytes;
                }
                break;
            default:
                return new Error(`Don't know how to parse the data section of response function [${obj.function}]`);

        }

        if (offset > offsetStart + length) {
            //safe check that we haven't read more than the length of the data area
            return new Error(`Parser overflow reading response data section [${offset}] > [${offsetStart + length}]`);
        }

        return obj;
    }

    _parseUserDataData(chunk, offset, length, param){
        let obj = {}, offsetStart = offset;

        obj.returnCode = chunk.readUInt8(offset);
        offset += 1;
        obj.transportSize = chunk.readUInt8(offset);
        offset += 1;
        let len = chunk.readUInt16BE(offset);
        offset += 2;

        //TODO - correctly parse the data
        //for now, export the buffer
        obj.payload = chunk.slice(offset, offset + len);
        offset += len;

        /*
        switch (param.function) {
            default:
                return new Error(`Don't know how to parse the data section of response function [${obj.function}]`);
        }//*/

        if (offset > offsetStart + length) {
            //safe check that we haven't read more than the length of the data area
            return new Error(`Parser overflow reading response data section [${offset}] > [${offsetStart + length}]`);
        }

        return obj;
    }

    _transform(chunk, encoding, cb) {
        debug("S7Parser _transform");

        let ptr = 0;

        if (this._nBuffer !== null) {
            chunk = Buffer.concat([this._nBuffer, chunk]);
            this._nBuffer = null;
        }

        // test for minimum length
        if (chunk.length < 10) {
            debug("S7Parser _transform skip-small-pkt", chunk.length);
            this._nBuffer = chunk;
            cb();
            return;
        }

        while (ptr < chunk.length) {

            let obj = {};

            // S7 header
            // 0x32 + type(1) + redundancyID(2) + pduReference(2) + parameterLength(2) + dataLength(2) [ + errorClass(1) + errorCode(1) ] = 10[12]
            let header = {};

            let protocolID = chunk.readUInt8(ptr);
            if (protocolID !== constants.proto.ID) {
                debug("S7Parser _transform err-unknown-proto-id", protocolID);
                cb(new Error(`Unknown protocol ID [${protocolID}]`));
                return;
            }
            ptr += 1;

            header.type = chunk.readUInt8(ptr);
            ptr += 1;

            header.rid = chunk.readUInt16BE(ptr);
            ptr += 2;

            header.pduReference = chunk.readUInt16BE(ptr);
            ptr += 2;
            
            let paramLength = chunk.readUInt16BE(ptr);
            ptr += 2;
            let dataLength = chunk.readUInt16BE(ptr);
            ptr += 2;

            if (header.type == constants.proto.type.RESPONSE || header.type == constants.proto.type.ACK) {
                header.errorClass = chunk.readUInt8(ptr);
                ptr += 1;
                header.errorCode = chunk.readUInt8(ptr);
                ptr += 1;
            }

            obj.header = header;

            //S7 Parameter
            if(paramLength > 0){
                let param;
                switch(header.type){
                    case constants.proto.type.REQUEST:
                        param = this._parseRequestParameter(chunk, ptr, paramLength);
                        break;
                    case constants.proto.type.ACK:
                    case constants.proto.type.RESPONSE:
                        param = this._parseResponseParameter(chunk, ptr, paramLength);
                        break;
                    case constants.proto.type.USERDATA:
                        param = this._parseUserDataParameter(chunk, ptr, paramLength);
                        break;
                    default:
                        debug("S7Parser _transform err-unknown-header-type", header.type);
                        cb(new Error(`Unknown header type [${header.type}]`));
                        return;
                }

                //report an eventual error
                if (param instanceof Error) {
                    cb(param);
                    return;
                }

                obj.param = param;
                ptr += paramLength;
            }

            //S7 Data
            if (dataLength > 0){
                let data;
                switch (header.type) {
                    case constants.proto.type.REQUEST:
                        data = this._parseRequestData(chunk, ptr, dataLength, obj.param);
                        break;
                    case constants.proto.type.ACK:
                    case constants.proto.type.RESPONSE:
                        data = this._parseResponseData(chunk, ptr, dataLength, obj.param);
                        break;
                    case constants.proto.type.USERDATA:
                        data = this._parseUserDataData(chunk, ptr, dataLength, obj.param);
                        break;
                    default:
                        debug("S7Parser _transform err-unknown-header-type", header.type);
                        cb(new Error(`Unknown header type [${header.type}]`));
                        return;
                }

                //report an eventual error
                if (data instanceof Error) {
                    cb(data);
                    return;
                }

                obj.data = data;
                ptr += dataLength;
            }

            this.push(obj);
        }

        cb();
    }
}
module.exports = S7Parser;