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

const { expect } = require('chai');
const S7Item = require('../../src/s7item');
//@ts-ignore
const constants = require('../../src/constants.json');

function testReadData(addr, expectedValue, buffer) {

    it(`should read the value of item "${addr}"`, done => {
        let item = new S7Item(addr, addr);
        let req = item.getReadItemRequest();
        let res = {
            returnCode: constants.proto.retval.DATA_OK,
            data: buffer
        };
        item.readValueFromResponse(res, req);
        item.updateValueFromBuffer();
        expect(item.value).to.be.deep.equal(expectedValue);
        done();
    });
}

function testWriteData(addr, value, bufData) {

    it(`should write the value of item "${addr}"`, done => {
        let item = new S7Item(addr, addr);

        let b = item.getWriteBuffer(value)
        expect(b.toString('hex')).to.be.equal(bufData);
        done();
    });
}

describe('S7Item', () => {

    it('should throw on creating and invalid address', done => {
        expect(() => new S7Item("Bad", "BAD_ADDR")).to.throw();
        done();
    });

    testReadData('I0.0', false, Buffer.from('00', 'hex'));
    testReadData('E0.0', false, Buffer.from('fe', 'hex'));
    testReadData('I1.0', true, Buffer.from('01', 'hex'));
    testReadData('E1.0', true, Buffer.from('ff', 'hex'));
    testReadData('I0.7', false, Buffer.from('00', 'hex'));
    testReadData('E0.7', false, Buffer.from('7f', 'hex'));
    testReadData('I1.7', true, Buffer.from('80', 'hex'));
    testReadData('E1.7', true, Buffer.from('ff', 'hex'));
    testReadData('E4.0.10', [false, true, false, true, false, true, false, true, false, true], Buffer.from('aaaa', 'hex'));
    testReadData('IB0', 0x55, Buffer.from('55', 'hex'));
    testReadData('QB0', 0x66, Buffer.from('66', 'hex'));
    testReadData('IW4', 0x1234, Buffer.from('1234', 'hex'));
    testReadData('QW4', 0x4321, Buffer.from('4321', 'hex'));
    testReadData('DB10,CHAR2', '0', Buffer.from('30', 'hex'));
    testReadData('DB10,CHAR10.5', 'abcde', Buffer.from('6162636465', 'hex'));
    testReadData('DB10,CHAR20.5', 'abc\u0000\u0000', Buffer.from('6162630000', 'hex'));
    testReadData('DB10,C30.3', '\u0000\u0000\u0000', Buffer.from('000000', 'hex'));
    testReadData('DB10,S7.10', 'foo', Buffer.from('0a03666f6f00000000000000', 'hex'));
    testReadData('II8.4', [-1, 1, 32767, -32768], Buffer.from('ffff00017fff8000', 'hex'));
    testReadData('QDI32.4', [-1, 1, 2147483647, -2147483648], Buffer.from('ffffffff000000017fffffff80000000', 'hex'));
    testReadData('DB1,REAL0.2', [3, 1234.5], Buffer.from('40400000449a5000', 'hex'));

    it('should read the value of item DB1,DT0', done => {
        let item = new S7Item("Item", "DB1,DT0");
        let req = item.getReadItemRequest();
        let res = {
            returnCode: constants.proto.retval.DATA_OK,
            data: Buffer.from('1911121802167093', 'hex')
        };
        item.readValueFromResponse(res, req);
        item.updateValueFromBuffer();
        expect(item.value.toISOString()).to.be.equal('2019-11-12T21:02:16.709Z');
        done();
    });

    it('should read the value of item DB1,DTZ0', done => {
        let item = new S7Item("Item", "DB1,DTZ0");
        let req = item.getReadItemRequest();
        let res = {
            returnCode: constants.proto.retval.DATA_OK,
            data: Buffer.from('1911122102167093', 'hex')
        };
        item.readValueFromResponse(res, req);
        item.updateValueFromBuffer();
        expect(item.value.toISOString()).to.be.equal('2019-11-12T21:02:16.709Z');
        done();
    });

    it('should read the value of item DB1,DTL0', done => {
        let item = new S7Item("Item", "DB1,DTL0");
        let req = item.getReadItemRequest();
        let res = {
            returnCode: constants.proto.retval.DATA_OK,
            data: Buffer.from('07e4031803132c172af99640', 'hex')
        };
        item.readValueFromResponse(res, req);
        item.updateValueFromBuffer();
        expect(item.value.toISOString()).to.be.equal('2020-03-24T22:44:23.721Z');
        done();
    });

    it('should read the value of item DB1,DTLZ0', done => {
        let item = new S7Item("Item", "DB1,DTLZ0");
        let req = item.getReadItemRequest();
        let res = {
            returnCode: constants.proto.retval.DATA_OK,
            data: Buffer.from('07e4031803162c172af99640', 'hex')
        };
        item.readValueFromResponse(res, req);
        item.updateValueFromBuffer();
        expect(item.value.toISOString()).to.be.equal('2020-03-24T22:44:23.721Z');
        done();
    });

    it('should skip out of bounds read data', done => {
        let item = new S7Item("Item", "QB20.4");

        let req1 = { address: 16 };
        let res1 = {
            returnCode: constants.proto.retval.DATA_OK,
            data: Buffer.from('fffefdfcfbfaf9f8', 'hex')
        }
        item.readValueFromResponse(res1, req1);

        let req2 = { address: 24 };
        let res2 = {
            returnCode: constants.proto.retval.DATA_OK,
            data: Buffer.from('f7f6f5f4', 'hex')
        }
        expect(() => item.readValueFromResponse(res2, req2)).to.throw();

        item.updateValueFromBuffer()
        expect(item.value).to.be.deep.equal([0xfb, 0xfa, 0xf9, 0xf8]);
        done();
    });

    it('should read the value from two distinct reads', done => {
        let item = new S7Item("Item", "MDW2");

        let req1 = { address: 0 };
        let res1 = {
            returnCode: constants.proto.retval.DATA_OK,
            data: Buffer.from('01020304', 'hex')
        }
        item.readValueFromResponse(res1, req1);

        let req2 = { address: 4 };
        let res2 = {
            returnCode: constants.proto.retval.DATA_OK,
            data: Buffer.from('05060708', 'hex')
        }
        item.readValueFromResponse(res2, req2);

        item.updateValueFromBuffer();
        expect(item.value).to.be.equal(0x03040506);
        done();
    });

    testWriteData('Q0.0', true, '01');
    testWriteData('A0.0', false, '00');
    testWriteData('Q8.2.3', [true, false, true], '010001'); //TODO check is failing
    testWriteData('Q8.2.2', [true, false], '0100');
    testWriteData('MB1', 0x12, '12');
    testWriteData('MB2.4', [0x21, 0x32, 0x43, 0x54], '21324354');
    testWriteData('DB3,W4', 100, '0064');
    testWriteData('DB3,DW4', 101, '00000065');
    testWriteData('QI0.5', [0, 1, -1, 32767, -32768], '00000001ffff7fff8000');
    testWriteData('QDI11.5', [0, 1, -1, 2147483647, -2147483648], '0000000000000001ffffffff7fffffff80000000');
    testWriteData('DB2,CHAR2', 'C', '43');
    testWriteData('DB2,CHAR2.5', 'CCDCE', '4343444345');
    testWriteData('DB2,C2.5', 'CE', '4345000000');
    testWriteData('DB2,S0.6', 'st-one', '060673742d6f6e65');
    testWriteData('DB4,S2.5', 'smart-tech', '0505736d617274');
    testWriteData('DB66,S2.3', '', '0300000000');
    testWriteData('QR0.3', [0, 1234.5, 3], '00000000449a500040400000');

    testWriteData('DB1,DT0', new Date('2019-11-12T21:02:16.709Z'), '1911121802167093');
    testWriteData('DB1,DTZ0', new Date('2019-11-12T21:02:16.709Z'), '1911122102167093');
    testWriteData('DB1,DTZ1', 1573596766876, '1911122212468763');
    testWriteData('DB1,DTL0', new Date('2020-03-24T22:44:23.721Z'), '07e4031803132c172af99640');
    testWriteData('DB1,DTLZ0', new Date('2020-03-24T22:44:23.721Z'), '07e4031803162c172af99640');
    testWriteData('DB1,DTLZ1', 1585089863721, '07e4031803162c172af99640');

});