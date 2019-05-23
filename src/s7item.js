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
     * @param {object} opts custom options (not used for now)
     */
    constructor(name, address, opts){
        debug('new S7Item', name, address, opts);

        super();

        this._name = name;
        this._address = address;

        this._props = parseAddress_NodeS7(this._address);
    }

    get name(){
        return this.name;
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

}

module.exports = S7Item;