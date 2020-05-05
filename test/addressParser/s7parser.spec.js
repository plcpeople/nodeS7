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

const {
    expect
} = require('chai');
const parse = require('../../src/addressParser/nodes7.js').parse;
//@ts-ignore
const constants = require('../../src/constants.json');

const R_BYTE = constants.proto.transport.BYTE;
const R_TIMER = constants.proto.transport.TIMER;

const W_BIT = constants.proto.dataTransport.BBIT;
const W_BYTE = constants.proto.dataTransport.BBYTE;

const A_INPUTS = constants.proto.area.INPUTS;
const A_OUTPUTS = constants.proto.area.OUTPUTS;
const A_FLAGS = constants.proto.area.FLAGS;
const A_PERIPHALS = constants.proto.area.PERIPHALS;
const A_TIMER = constants.proto.area.TIMER;
const A_COUNTER = constants.proto.area.COUNTER;
const A_DB = constants.proto.area.DB;

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

    // -- Inputs
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

    // -- Outputs
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

    // -- DB
    decodeAddress('DB1,X0.0', 'DB', 'X', 1, 0, 0, 1, 1, R_BYTE, W_BIT, A_DB, 1, 1);
    decodeAddress('DB2,B1', 'DB', 'BYTE', 1, 1, 0, 1, 2, R_BYTE, W_BYTE, A_DB, 1, 1);
    decodeAddress('DB2,BYTE1', 'DB', 'BYTE', 1, 1, 0, 1, 2, R_BYTE, W_BYTE, A_DB, 1, 1);
    decodeAddress('DB10,C2.4', 'DB', 'CHAR', 1, 2, 0, 4, 10, R_BYTE, W_BYTE, A_DB, 4, 4);
    decodeAddress('DB10,CHAR2.4', 'DB', 'CHAR', 1, 2, 0, 4, 10, R_BYTE, W_BYTE, A_DB, 4, 4);
    decodeAddress('DB9,S6.8', 'DB', 'STRING', 10, 6, 0, 1, 9, R_BYTE, W_BYTE, A_DB, 10, 10);
    decodeAddress('DB9,STRING6.8', 'DB', 'STRING', 10, 6, 0, 1, 9, R_BYTE, W_BYTE, A_DB, 10, 10);
    decodeAddress('DB9,S6.8.2', 'DB', 'STRING', 10, 6, 0, 2, 9, R_BYTE, W_BYTE, A_DB, 20, 20);
    decodeAddress('DB9,I16', 'DB', 'INT', 2, 16, 0, 1, 9, R_BYTE, W_BYTE, A_DB, 2, 2);
    decodeAddress('DB9,INT16', 'DB', 'INT', 2, 16, 0, 1, 9, R_BYTE, W_BYTE, A_DB, 2, 2);
    decodeAddress('DB8,W18', 'DB', 'WORD', 2, 18, 0, 1, 8, R_BYTE, W_BYTE, A_DB, 2, 2);
    decodeAddress('DB8,WORD18', 'DB', 'WORD', 2, 18, 0, 1, 8, R_BYTE, W_BYTE, A_DB, 2, 2);
    decodeAddress('DB9,DI16', 'DB', 'DINT', 4, 16, 0, 1, 9, R_BYTE, W_BYTE, A_DB, 4, 4);
    decodeAddress('DB9,DINT16', 'DB', 'DINT', 4, 16, 0, 1, 9, R_BYTE, W_BYTE, A_DB, 4, 4);
    decodeAddress('DB8,DW18', 'DB', 'DWORD', 4, 18, 0, 1, 8, R_BYTE, W_BYTE, A_DB, 4, 4);
    decodeAddress('DB8,DWORD18', 'DB', 'DWORD', 4, 18, 0, 1, 8, R_BYTE, W_BYTE, A_DB, 4, 4);
    decodeAddress('DB8,D18.2', 'DB', 'DWORD', 4, 18, 0, 2, 8, R_BYTE, W_BYTE, A_DB, 8, 8);
    decodeAddress('DB7,R22', 'DB', 'REAL', 4, 22, 0, 1, 7, R_BYTE, W_BYTE, A_DB, 4, 4);
    decodeAddress('DB7,REAL22', 'DB', 'REAL', 4, 22, 0, 1, 7, R_BYTE, W_BYTE, A_DB, 4, 4);
    decodeAddress('DB6,DT72', 'DB', 'DT', 8, 72, 0, 1, 6, R_BYTE, W_BYTE, A_DB, 8, 8);
    decodeAddress('DB6,DT32.2', 'DB', 'DT', 8, 32, 0, 2, 6, R_BYTE, W_BYTE, A_DB, 16, 16);
    decodeAddress('DB6,DTZ72', 'DB', 'DTZ', 8, 72, 0, 1, 6, R_BYTE, W_BYTE, A_DB, 8, 8);
    decodeAddress('DB6,DTZ32.2', 'DB', 'DTZ', 8, 32, 0, 2, 6, R_BYTE, W_BYTE, A_DB, 16, 16);
    decodeAddress('DB11,DTL74', 'DB', 'DTL', 12, 74, 0, 1, 11, R_BYTE, W_BYTE, A_DB, 12, 12);
    decodeAddress('DB11,DTL34.2', 'DB', 'DTL', 12, 34, 0, 2, 11, R_BYTE, W_BYTE, A_DB, 24, 24);
    decodeAddress('DB11,DTLZ74', 'DB', 'DTLZ', 12, 74, 0, 1, 11, R_BYTE, W_BYTE, A_DB, 12, 12);
    decodeAddress('DB11,DTLZ34.2', 'DB', 'DTLZ', 12, 34, 0, 2, 11, R_BYTE, W_BYTE, A_DB, 24, 24);

    // Flags
    decodeAddress('MC0', 'M', 'CHAR', 1, 0, 0, 1, undefined, R_BYTE, W_BYTE, A_FLAGS, 1, 1);
    decodeAddress('MI2', 'M', 'INT', 2, 2, 0, 1, undefined, R_BYTE, W_BYTE, A_FLAGS, 2, 2);
    decodeAddress('MDI4', 'M', 'DINT', 4, 4, 0, 1, undefined, R_BYTE, W_BYTE, A_FLAGS, 4, 4);
    decodeAddress('MW8.2', 'M', 'WORD', 2, 8, 0, 2, undefined, R_BYTE, W_BYTE, A_FLAGS, 4, 4);
    decodeAddress('MD12', 'M', 'DWORD', 4, 12, 0, 1, undefined, R_BYTE, W_BYTE, A_FLAGS, 4, 4);
    decodeAddress('MDW12', 'M', 'DWORD', 4, 12, 0, 1, undefined, R_BYTE, W_BYTE, A_FLAGS, 4, 4);
    decodeAddress('MR16', 'M', 'REAL', 4, 16, 0, 1, undefined, R_BYTE, W_BYTE, A_FLAGS, 4, 4);

    // Periphals
    decodeAddress('PIB0', 'P', 'BYTE', 1, 0, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 1, 1);
    decodeAddress('PQB0', 'P', 'BYTE', 1, 0, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 1, 1);
    decodeAddress('PEB1', 'P', 'BYTE', 1, 1, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 1, 1);
    decodeAddress('PAB1', 'P', 'BYTE', 1, 1, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 1, 1);
    decodeAddress('PIC2', 'P', 'CHAR', 1, 2, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 1, 1);
    decodeAddress('PQC2', 'P', 'CHAR', 1, 2, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 1, 1);
    decodeAddress('PEC3', 'P', 'CHAR', 1, 3, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 1, 1);
    decodeAddress('PAC3', 'P', 'CHAR', 1, 3, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 1, 1);
    decodeAddress('PII2', 'P', 'INT', 2, 2, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 2, 2);
    decodeAddress('PQI2', 'P', 'INT', 2, 2, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 2, 2);
    decodeAddress('PEI3', 'P', 'INT', 2, 3, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 2, 2);
    decodeAddress('PAI3', 'P', 'INT', 2, 3, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 2, 2);
    decodeAddress('PIW2', 'P', 'WORD', 2, 2, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 2, 2);
    decodeAddress('PQW2', 'P', 'WORD', 2, 2, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 2, 2);
    decodeAddress('PEW3', 'P', 'WORD', 2, 3, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 2, 2);
    decodeAddress('PAW3', 'P', 'WORD', 2, 3, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 2, 2);
    decodeAddress('PIDI2', 'P', 'DINT', 4, 2, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 4, 4);
    decodeAddress('PQDI2', 'P', 'DINT', 4, 2, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 4, 4);
    decodeAddress('PEDI3', 'P', 'DINT', 4, 3, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 4, 4);
    decodeAddress('PADI3', 'P', 'DINT', 4, 3, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 4, 4);
    decodeAddress('PID2', 'P', 'DWORD', 4, 2, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 4, 4);
    decodeAddress('PQD2', 'P', 'DWORD', 4, 2, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 4, 4);
    decodeAddress('PED3', 'P', 'DWORD', 4, 3, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 4, 4);
    decodeAddress('PAD3', 'P', 'DWORD', 4, 3, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 4, 4);
    decodeAddress('PIDW2', 'P', 'DWORD', 4, 2, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 4, 4);
    decodeAddress('PQDW2', 'P', 'DWORD', 4, 2, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 4, 4);
    decodeAddress('PEDW3', 'P', 'DWORD', 4, 3, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 4, 4);
    decodeAddress('PADW3', 'P', 'DWORD', 4, 3, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 4, 4);
    decodeAddress('PIR2', 'P', 'REAL', 4, 2, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 4, 4);
    decodeAddress('PQR2', 'P', 'REAL', 4, 2, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 4, 4);
    decodeAddress('PER3', 'P', 'REAL', 4, 3, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 4, 4);
    decodeAddress('PAR3', 'P', 'REAL', 4, 3, 0, 1, undefined, R_BYTE, W_BYTE, A_PERIPHALS, 4, 4);
    
    // Timers, Counters
    /**
     * TODO - Read area code in original NodeS7 was "0x09", that seems to be "date".
     * Needs to check what is the correct code for this.
     */
    //decodeAddress('T0', 'T', 'TIMER', 2, 0, 0, 1, undefined, R_TIMER, W_BYTE, A_TIMER, 2, 2);
    //decodeAddress('T1.2', 'T', 'TIMER', 2, 1, 0, 2, undefined, R_TIMER, W_BYTE, A_TIMER, 4, 4);
    //decodeAddress('C0', 'C', 'COUNTER', 2, 0, 0, 1, undefined, R_COUNTER, W_BYTE, A_COUNTER, 2, 2);
    //decodeAddress('C2.3', 'C', 'COUNTER', 2, 2, 0, 3, undefined, R_COUNTER, W_BYTE, A_COUNTER, 6, 6);

    // TODO: Add more addresses
    
    catchAddress("FOO", "invalid address format");
    catchAddress("D0.0", "address type");
    catchAddress("MFOO3", "Unknown data type");
    catchAddress("MB0.0.1", "use of bit address");
    catchAddress("DB2"); //missing address of DB
    catchAddress("DB1,X0", "Bit address offset required");
    catchAddress("DB0,X0.1", "Invalid DB Number");
    catchAddress("DB1,FOO0", "Unknown DB data type");
    catchAddress("DB12,S10", "String length required");
    catchAddress("DB7.X0.5", "invalid address format"); //dot instead of comma
    catchAddress("I0.10", "Bit address offset out of range");
    catchAddress("IB0.0", "Invalid array length");

    // TODO: Add more invalid addresses
});