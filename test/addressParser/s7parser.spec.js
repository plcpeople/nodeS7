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

const {
    expect
} = require('chai');
const parse = require('../../src/addressParser/nodes7.js');
const constants = require('../../src/constants.json');

const R_BYTE = constants.proto.transport.BYTE;

const W_BIT = constants.proto.dataTransport.BBIT;
const W_BYTE = constants.proto.dataTransport.BBYTE;

const A_INPUTS = constants.proto.area.INPUTS;
const A_OUTPUTS = constants.proto.area.OUTPUTS;

describe('NodeS7 Address Parser', () => {

    it('should be a function', () => {
        expect(typeof parse).to.be.equal('function');
    });

    function decodeAddress(address, addrtype, datatype, dtypelen, offset, bitOffset, arrayLength, dbNumber, readTransportCode, writeTransportCode, areaCode, byteLength, byteLengthWrite) {
        it(`should decode address "${address}"`, (done) => {
            expect(parse(address)).to.be.deep.equal({
                addrtype,
                datatype,
                dtypelen,
                offset,
                bitOffset,
                arrayLength,
                dbNumber,
                readTransportCode,
                writeTransportCode,
                areaCode,
                byteLength,
                byteLengthWrite,
                byteLengthWithFill: byteLength + (byteLength % 2)
            });
            done();
        });
    }

    function catchAddress(address, cause) {
        it(`should throw "${cause}" on invalid address "${address}"`, (done) => {
            expect(() => parse(address)).to.throw(cause);
            done();
        });
    }

    // -- single input bit
    decodeAddress('I0.0', 'I', 'X', 1, 0, 0, 1, undefined, R_BYTE, W_BIT, A_INPUTS, 1, 1);
    decodeAddress('E0.6', 'I', 'X', 1, 0, 6, 1, undefined, R_BYTE, W_BIT, A_INPUTS, 1, 1);
    decodeAddress('I5.0', 'I', 'X', 1, 5, 0, 1, undefined, R_BYTE, W_BIT, A_INPUTS, 1, 1);
    decodeAddress('E241.1', 'I', 'X', 1, 241, 1, 1, undefined, R_BYTE, W_BIT, A_INPUTS, 1, 1);

    // -- array of input bits
    decodeAddress('I0.0.5', 'I', 'X', 1, 0, 0, 5, undefined, R_BYTE, W_BIT, A_INPUTS, 1, 5);
    decodeAddress('E0.6.4', 'I', 'X', 1, 0, 6, 4, undefined, R_BYTE, W_BIT, A_INPUTS, 2, 4);
    decodeAddress('I5.0.20', 'I', 'X', 1, 5, 0, 20, undefined, R_BYTE, W_BIT, A_INPUTS, 3, 20);
    decodeAddress('E241.1.8', 'I', 'X', 1, 241, 1, 8, undefined, R_BYTE, W_BIT, A_INPUTS, 2, 8);

    // -- single input byte
    decodeAddress('IB0', 'I', 'BYTE', 1, 0, 0, 1, undefined, R_BYTE, W_BYTE, A_INPUTS, 1, 1);
    decodeAddress('EB25', 'I', 'BYTE', 1, 25, 0, 1, undefined, R_BYTE, W_BYTE, A_INPUTS, 1, 1);
    decodeAddress('IB452', 'I', 'BYTE', 1, 452, 0, 1, undefined, R_BYTE, W_BYTE, A_INPUTS, 1, 1);

    // -- array of input bytes
    decodeAddress('EB0.101', 'I', 'BYTE', 1, 0, 0, 101, undefined, R_BYTE, W_BYTE, A_INPUTS, 101, 101);
    decodeAddress('IB25.12', 'I', 'BYTE', 1, 25, 0, 12, undefined, R_BYTE, W_BYTE, A_INPUTS, 12, 12);
    decodeAddress('EB452.2', 'I', 'BYTE', 1, 452, 0, 2, undefined, R_BYTE, W_BYTE, A_INPUTS, 2, 2);

    // -- single output bit
    decodeAddress('Q0.0', 'Q', 'X', 1, 0, 0, 1, undefined, R_BYTE, W_BIT, A_OUTPUTS, 1, 1);
    decodeAddress('A0.6', 'Q', 'X', 1, 0, 6, 1, undefined, R_BYTE, W_BIT, A_OUTPUTS, 1, 1);
    decodeAddress('Q5.0', 'Q', 'X', 1, 5, 0, 1, undefined, R_BYTE, W_BIT, A_OUTPUTS, 1, 1);
    decodeAddress('A241.1', 'Q', 'X', 1, 241, 1, 1, undefined, R_BYTE, W_BIT, A_OUTPUTS, 1, 1);

    // -- array of output bits
    decodeAddress('Q0.0.5', 'Q', 'X', 1, 0, 0, 5, undefined, R_BYTE, W_BIT, A_OUTPUTS, 1, 5);
    decodeAddress('A0.6.4', 'Q', 'X', 1, 0, 6, 4, undefined, R_BYTE, W_BIT, A_OUTPUTS, 2, 4);
    decodeAddress('Q5.0.20', 'Q', 'X', 1, 5, 0, 20, undefined, R_BYTE, W_BIT, A_OUTPUTS, 3, 20);
    decodeAddress('A241.1.8', 'Q', 'X', 1, 241, 1, 8, undefined, R_BYTE, W_BIT, A_OUTPUTS, 2, 8);

    // -- single output byte
    decodeAddress('QB0', 'Q', 'BYTE', 1, 0, 0, 1, undefined, R_BYTE, W_BYTE, A_OUTPUTS, 1, 1);
    decodeAddress('AB25', 'Q', 'BYTE', 1, 25, 0, 1, undefined, R_BYTE, W_BYTE, A_OUTPUTS, 1, 1);
    decodeAddress('QB452', 'Q', 'BYTE', 1, 452, 0, 1, undefined, R_BYTE, W_BYTE, A_OUTPUTS, 1, 1);

    // -- array of output bytes
    decodeAddress('AB0.101', 'Q', 'BYTE', 1, 0, 0, 101, undefined, R_BYTE, W_BYTE, A_OUTPUTS, 101, 101);
    decodeAddress('QB25.12', 'Q', 'BYTE', 1, 25, 0, 12, undefined, R_BYTE, W_BYTE, A_OUTPUTS, 12, 12);
    decodeAddress('AB452.2', 'Q', 'BYTE', 1, 452, 0, 2, undefined, R_BYTE, W_BYTE, A_OUTPUTS, 2, 2);

    // TODO: Add more addresses
    
    catchAddress("FOO", "invalid format");
    catchAddress("D0.0", "address type");
    catchAddress("MB0.0.1", "use of bit address");
    catchAddress("DB2"); //missing address of DB
    catchAddress("DB1,X0", "Bit address offset required");
    catchAddress("DB7.X0.5", "invalid format"); //dot instead of comma
    catchAddress("I0.10", "Bit address offset out of range");

    // TODO: Add more invalid addresses
});