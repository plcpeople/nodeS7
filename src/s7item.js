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

const AddressParserNodeS7 = require('./addressParser/nodes7.js');

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
        this._value = undefined;

        this._props = AddressParserNodeS7.parse(this._address);
        this._string = `S7Item ${this._name}:[${this._address}]`;

        this._dataBuffer = Buffer.alloc(this._props.byteLength);
    }

    get name() {
        return this._name;
    }
    get address() {
        return this._address;
    }
    get value() {
        return this._value;
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
    get byteLengthWrite() {
        return this._props.byteLengthWrite;
    }
    get byteLengthWithFill() {
        return this._props.byteLengthWithFill;
    }

    /**
     * @private
     * Calculates the buffer offsets to be used in Buffer.copy()
     * that are the memory area intersection between the memory
     * area of this item and the given one
     * 
     * @param {number} address 
     * @param {number} length 
     * @returns an object with targetStart, sourceStart, and sourceEnd, 
     * or null if the provided addresses doesn't intersect
     */
    _getCopyBufferOffsets(address, length) {
        debug('S7Item _getCopyBufferOffsets', address, length);

        let dataStart = address;
        let dataEnd = address + length;
        let itemStart = this._props.offset;
        let itemEnd = this._props.offset + this._props.byteLength;
        debug('S7Item _getCopyBufferOffsets positions', dataStart, dataEnd, itemStart, itemEnd);

        if (dataStart > itemEnd || dataEnd < itemStart) {
            return null
        }

        let targetStart = Math.max(dataStart, itemStart) - itemStart;
        let sourceStart = Math.max(dataStart, itemStart) - dataStart;
        let sourceEnd = Math.min(dataEnd, itemEnd) - dataStart;
        debug('S7Item _getCopyBufferOffsets result', targetStart, sourceStart, sourceEnd);

        return { targetStart, sourceStart, sourceEnd };
    }

    /**
     * @private
     * Updates the internal buffer with provided data
     * 
     * @param {Buffer} buffer the buffer containing the data
     * @param {object} offsets offsets object, as returned from _getCopyBufferOffsets()
     * @param {number} offsets.targetStart offset to this item
     * @param {number} offsets.sourceStart where to start copying from
     * @param {number} offsets.sourceEnd until where to copy the data
     */
    _copyFromBuffer(buffer, offsets) {
        debug('S7Item _getCopyBufferOffsets', this._string, buffer);
        buffer.copy(this._dataBuffer, offsets.targetStart, offsets.sourceStart, offsets.sourceEnd);
    }

    /**
     * Update the item's value according to the internal buffer data.
     */
    updateValueFromBuffer() {
        debug('S7Item updateValueFromBuffer', this._dataBuffer);

        let dataBitOffset = this._props.bitOffset;
        let dataOffset = 0;

        // parse the data
        if (this._props.datatype === "CHAR") {
            // we handle an array of chars as a single string
            this._value = getValueByDataType(this._dataBuffer, this._props.datatype, dataOffset, dataBitOffset, this._props.arrayLength);
        } else {
            // for the other types, we return an array of values
            this._value = []
            for (let i = 0; i < this._props.arrayLength; i++) {
                // get the data
                this._value.push(getValueByDataType(this._dataBuffer, this._props.datatype, dataOffset, dataBitOffset, this._props.arrayLength));

                // increment the offsets for the next item
                if (this._props.datatype === "X") {
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
        if (Array.isArray(this._value) && this._value.length === 1) {
            this._value = this._value[0];
        }
    }

    /**
     * Returns a buffer with the data to be written to the PLC, 
     * according to the type of the item and the values provided
     * @param {*} value array of values
     */
    getWriteBuffer(value) {
        debug('S7Item getWriteBuffer', value);

        let b = Buffer.alloc(this._props.byteLengthWrite);

        if (this._props.datatype === "CHAR") {
            // we handle an array of chars as a single string
            bufferWriteByDataType(b, value, this._props.datatype, 0, this._props.arrayLength);
        } else {
            if (this._props.arrayLength > 1) {
                if (!Array.isArray(value) || this._props.arrayLength !== value.length) {
                    throw new Error(`Expected [${this._props.arrayLength}] values for this item`);
                }

                let ptr = 0
                for (let i = 0; i < this._props.arrayLength; i++) {
                    ptr += this._props.dtypelen;
                    bufferWriteByDataType(b, value[i], this._props.datatype, ptr, this._props.dtypelen - 2);
                }
            } else {
                bufferWriteByDataType(b, value, this._props.datatype, 0, this._props.dtypelen - 2);
            }
        }

        return b;
    }

    /**
     * Return a request item that may be used with readVars
     * @returns an object with properties area, db, transport, address and length
     */
    getReadItemRequest() {
        // TODO doesn't work for big items, we need to split into multiple
        // items and return an array instead
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
     * Updates the item's internal buffer with the supplied request-response pair.
     * Large items may need multiple requests to read the whole memory area.
     * @param {*} res the response item returned from the PLC
     * @param {*} req the request used to query the value
     */
    readValueFromResponse(res, req) {
        debug('S7Item readValueFromResponse', this._string, res);

        if (!req) {
            throw new Error("Missing request data");
        }

        if (!res || !res.data) {
            throw new Error("No data present for parsing the item's value");
        }

        // check response's error code
        if (res.returnCode != constants.proto.retval.DATA_OK) {
            let errDesc = constants.proto.retvalDesc[res.returnCode] || `<Unknown error code ${res.returnCode}>`;
            throw new Error(`Error returned from request of Area [${res.area}] DB [${res.db}] Addr [${res.address}] Len [${res.length}]: "${errDesc}"`)
        }

        let offsets = this._getCopyBufferOffsets(req.address, res.data.length);
        if (!offsets) {
            throw new Error("No matching data for this request");
        }
        this._copyFromBuffer(res.data, offsets);
    }
}

/**
 * Reads data from the buffer according to the item's type
 * @private
 * @param {Buffer} buffer the Buffer containing the data
 * @param {string} type the data type
 * @param {number} offset from where to get the data
 * @param {number} bitOffset the bitOffset for boolean
 * @param {number} [length] the length for char arrays
 */
function getValueByDataType(buffer, type, offset, bitOffset, length = 1) {
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

/**
 * Writes data to buffer according to the item's type
 * @private
 * @param {Buffer} buffer the Buffer containing the data
 * @param {*} data the Buffer containing the data
 * @param {string} type the data type
 * @param {number} offset from where to get the data
 * @param {number} [length] the length for char arrays
 */
function bufferWriteByDataType(buffer, data, type, offset, length = 1) {

    // type check
    switch (type) {
        case "REAL":
        case "DWORD":
        case "DINT":
        case "TIMER":
        case "COUNTER":
        case "INT":
        case "WORD":
        case "BYTE":
            if (typeof data !== 'number') throw new Error(`Data for item of type '${type}' must be a number`);
            break;
        case "CHAR":
        case "STRING":
            if (typeof data !== 'string') throw new Error(`Data for item of type '${type}' must be a string`);
            break;
        case "X":
            //everything is valid here, JS rules for boolean conversion will apply
            break;
        default:
            throw new Error(`Cannot parse data of unknown type "${this._props.datatype}" for item "${this._string}"`);
    }


    switch (type) {
        case "REAL":
            return buffer.writeFloatBE(data, offset);
        case "DWORD":
            return buffer.writeUInt32BE(data, offset);
        case "DINT":
            return buffer.writeInt32BE(data, offset);
        case "TIMER":
        case "COUNTER":
        case "INT":
            return buffer.writeInt16BE(data, offset);
        case "WORD":
            return buffer.writeUInt16BE(data, offset);
        case "BYTE":
            return buffer.writeUInt8(data, offset);
        case "CHAR":
            // this is supposed to be a clean buffer, no need to empty it first
            return buffer.write(data, offset, length, 'ascii');
        case "STRING":
            // data[0] is the max length, data[1] is the current length, data[2..] is the string itself
            buffer.writeUInt8(length, offset);
            buffer.writeUInt8(Math.min(length, data.length), offset + 1);
            return buffer.write(data, offset + 2, length, 'ascii') + 2;
        case "X":
            return buffer.writeUInt8(data ? 1 : 0, offset);
        default:
            throw new Error(`Cannot parse data of unknown type "${this._props.datatype}" for item "${this._string}"`);
    }
}

module.exports = S7Item;