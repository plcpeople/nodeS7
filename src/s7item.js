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

const { EventEmitter } = require('events');
//@ts-ignore
const constants = require('./constants.json');
const util = require('util');
const debug = util.debuglog('nodes7');

const parseAddress_NodeS7 = require('./addressParser/nodes7.js');

class S7Item extends EventEmitter {

    /**
     * 
     * @param {string} name name of this item
     * @param {string} address address of this item
     * @param {object} [opts] custom options (not used for now)
     */
    constructor(name, address, opts) {
        debug('new S7Item', name, address, opts);

        super();

        this._name = name;
        this._address = address;

        this._props = parseAddress_NodeS7(this._address);
        this._string = `S7Item ${this._name}:[${this._address}]`;
    }

    get name() {
        return this._name;
    }
    get address() {
        return this._address;
    }
    get addrtype() {
        return this._props.addrtype;
    }
    get datatype() {
        return this._props.datatype;
    }
    get dtypelen() {
        return this._props.dtypelen;
    }
    get offset() {
        return this._props.offset;
    }
    get bitOffset() {
        return this._props.bitOffset;
    }
    get arrayLength() {
        return this._props.arrayLength;
    }
    get dbNumber() {
        return this._props.dbNumber;
    }
    get readTransportCode() {
        return this._props.readTransportCode;
    }
    get writeTransportCode() {
        return this._props.writeTransportCode;
    }
    get areaCode() {
        return this._props.areaCode;
    }
    get byteLength() {
        return this._props.byteLength;
    }
    get byteLengthWithFill() {
        return this._props.byteLengthWithFill;
    }


    /**
     * Return a request item that may be used with readVars
     * @returns an object with properties area, db, transport, address and length
     */
    getReadItemRequest() {
        let res = {
            area: this._props.areaCode,
            db: this._props.dbNumber,
            transport: this._props.readTransportCode,
            address: this._props.offset,
            length: this._props.byteLength
        }
        debug('S7Item getReadItemRequest', res);
        return res;
    }

    /**
     * 
     * @param {*} res 
     * @param {*} [req] the request used to query the value, defaults to the one from getReadItemRequest()
     * @returns the parsed value according to the item
     */
    getValueFromResponse(res, req) {
        debug('S7Item getValueFromResponse', this._string, res);

        if (!req) {
            req = this.getReadItemRequest();
        }

        if (!res || !res.data) {
            throw new Error("No data present for parsing the item's value");
        }

        // check response's error code
        if (res.returnCode != constants.proto.retval.DATA_OK) {
            let errDesc = constants.proto.retvalDesc[res.returnCode] || `<Unknown error code ${res.returnCode}>`;
            throw new Error(`Error returned from request of Area [${res.area}] DB [${res.db}] Addr [${res.address}] Len [${res.length}]: "${errDesc}"`)
        }

        // check the bounds of returned data (whether it can fit our data)
        debug('S7Item getValueFromResponse offsets', req.address, this._props.offset, this._props.byteLength, res.data.length);
        let dataOffset = this._props.offset - req.address;
        if (dataOffset < 0 || (dataOffset + this._props.byteLength) > res.data.length) {
            throw new Error("Response address out of bounds");
        }
        let dataBitOffset = this._props.bitOffset;

        //TODO: Maybe check if parameters from request are correct

        // parse the data
        let value;
        if (this._props.datatype === "CHAR") {
            // we handle an array of chars as a single string
            value = getValueByDataType(res.data, this._props.datatype, dataOffset, dataBitOffset, this._props.arrayLength);
        } else {
            // for the other types, we return an array of values
            value = []
            for (let i = 0; i < this._props.arrayLength; i++) {
                // get the data
                value.push(getValueByDataType(res.data, this._props.datatype, dataOffset, dataBitOffset, this._props.arrayLength));
                
                // increment the offsets for the next item
                if (this._props.datatype === "X"){
                    dataBitOffset++;
                    if (dataBitOffset > 7) {
                        dataBitOffset = 0;
                        dataOffset++;
                    }
                } else {
                    dataOffset += this._props.dtypelen;
                }
            }
        }

        // de-encapsulate from the array if it's only one item long
        if (Array.isArray(value) && value.length === 1){
            value = value[0];
        }

        return value;
    }
}

/**
 * 
 * @param {Buffer} buffer the Buffer containing the data
 * @param {string} type the data type
 * @param {number} offset from where to get the data
 * @param {number} bitOffset the bitOffset for boolean
 * @param {number} length the length for char arrays
 */
function getValueByDataType(buffer, type, offset, bitOffset, length = 1){
    switch (type) {
        case "REAL":
            return buffer.readFloatBE(offset);
        case "DWORD":
            return buffer.readUInt32BE(offset);
        case "DINT":
            return buffer.readInt32BE(offset);
        case "TIMER":
        case "COUNTER":
        case "INT":
            return buffer.readInt16BE(offset);
        case "WORD":
            return buffer.readUInt16BE(offset);
        case "BYTE":
            return buffer.readUInt8(offset);
        case "CHAR":
            return buffer.toString('ascii', offset, offset + length);
        case "STRING":
            // data[0] is the max length, data[1] is the current length, data[2..] is the string itself
            let maxlen = buffer.readUInt8(offset);
            let strlen = buffer.readUInt8(offset + 1);
            let len = Math.min(maxlen, strlen);
            return buffer.toString('ascii', offset + 2, offset + 2 + len);
        case "X":
            return !!((buffer.readUInt8(offset) >> bitOffset) & 0x01);
        default:
            throw new Error(`Cannot parse data of unknown type "${this._props.datatype}" for item "${this._string}"`);
    }
}

module.exports = S7Item;