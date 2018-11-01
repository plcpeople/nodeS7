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
    expect
} = require('chai');
const S7Parser = require('../../src/s7protocol/s7parser.js');
const constants = require('../../src/constants.json');
const Stream = require('stream');

describe('S7Protocol Parser Parser', () => {

    it('should be a stream', () => {
        expect(new S7Parser()).to.be.instanceOf(Stream);
    });

    it('should create a new instance', () => {
        expect(new S7Parser).to.be.instanceOf(Stream); //jshint ignore:line
    });

    it('should emit an error when input is not a buffer', (done) => {
        let parser = new S7Parser();
        parser.on('error', (err) => {
            expect(err).to.be.an('error');
            done();
        });

        parser.write({});
    });

    it('should decode a Request -> Communication setup', (done) => {
        let parser = new S7Parser();
        parser.on('data', (data) => {
            expect(data).to.be.deep.equal({
                header: {
                    type: constants.proto.type.REQUEST,
                    rid: 0,
                    pduReference: 0,
                },
                param: {
                    function: constants.proto.function.COMM_SETUP,
                    maxJobsCalling: 1,
                    maxJobsCalled: 1,
                    pduLength: 480
                }
            });
            done();
        });

        parser.write(Buffer.from('32010000000000080000f0000001000101e0', 'hex'));
    });

    it('should decode a Response -> Communication setup', (done) => {
        let parser = new S7Parser();
        parser.on('data', (data) => {
            expect(data).to.be.deep.equal({
                header: {
                    type: constants.proto.type.RESPONSE,
                    rid: 0,
                    pduReference: 0,
                    errorClass: 0,
                    errorCode: 0
                },
                param: {
                    function: constants.proto.function.COMM_SETUP,
                    maxJobsCalling: 1,
                    maxJobsCalled: 1,
                    pduLength: 240
                }
            });
            done();
        });

        parser.write(Buffer.from('320300000000000800000000f0000001000100f0', 'hex'));
    });

    it('should decode a Request -> ReadVar', (done) => {
        let parser = new S7Parser();
        parser.on('data', (data) => {
            expect(data).to.be.deep.equal({
                header: {
                    type: constants.proto.type.REQUEST,
                    rid: 0,
                    pduReference: 0x1900
                },
                param: {
                    function: constants.proto.function.READ_VAR,
                    items: [
                        {
                            syntax: constants.proto.syntax.S7ANY,
                            transport: constants.proto.transport.REAL,
                            area: constants.proto.area.FLAGS,
                            db: 0,
                            address: 0x80,
                            length: 1
                        }
                    ]
                }
            });
            done();
        });

        parser.write(Buffer.from('320100001900000e00000401120a10080001000083000080', 'hex'));
    });

    it('should decode a Request -> ReadVar (multi-item)', (done) => {
        let parser = new S7Parser();
        parser.on('data', (data) => {
            expect(data).to.be.deep.equal({
                header: {
                    type: constants.proto.type.REQUEST,
                    rid: 0,
                    pduReference: 0x1b00
                },
                param: {
                    function: constants.proto.function.READ_VAR,
                    items: [{
                        syntax: constants.proto.syntax.S7ANY,
                        transport: constants.proto.transport.BYTE,
                        area: constants.proto.area.FLAGS,
                        db: 0,
                        address: 0x00,
                        length: 16
                    }, {
                        syntax: constants.proto.syntax.S7ANY,
                        transport: constants.proto.transport.BYTE,
                        area: constants.proto.area.INPUTS,
                        db: 0,
                        address: 0x00,
                        length: 16
                    }, {
                        syntax: constants.proto.syntax.S7ANY,
                        transport: constants.proto.transport.BYTE,
                        area: constants.proto.area.OUTPUTS,
                        db: 0,
                        address: 0x00,
                        length: 16
                    }, {
                        syntax: constants.proto.syntax.S7ANY,
                        transport: constants.proto.transport.TIMER,
                        area: constants.proto.area.TIMER,
                        db: 0,
                        address: 0x00,
                        length: 8
                    }, {
                        syntax: constants.proto.syntax.S7ANY,
                        transport: constants.proto.transport.COUNTER,
                        area: constants.proto.area.COUNTER,
                        db: 0,
                        address: 0x00,
                        length: 8
                    }]
                }
            });
            done();
        });

        parser.write(Buffer.from('320100001b00003e00000405120a10020010000083000000120a10020010000081000000120a10020010000082000000120a101d000800001d000000120a101c000800001c000000', 'hex'));
    });

    it('should decode a Request -> WriteVar', (done) => {
        let parser = new S7Parser();
        parser.on('data', (data) => {
            expect(data).to.be.deep.equal({
                header: {
                    type: constants.proto.type.REQUEST,
                    rid: 0,
                    pduReference: 0x1800
                },
                param: {
                    function: constants.proto.function.WRITE_VAR,
                    items: [{
                        syntax: constants.proto.syntax.S7ANY,
                        transport: constants.proto.transport.REAL,
                        area: constants.proto.area.FLAGS,
                        db: 0,
                        address: 0x80,
                        length: 1
                    }]
                },
                data: {
                    items: [{
                        returnCode: 0,
                        transportSize: constants.proto.dataTransport.BREAL,
                        data: Buffer.from('79e9f642', 'hex')
                    }]
                }
            });
            done();
        });

        parser.write(Buffer.from('320100001800000e00080501120a100800010000830000800007000479e9f642', 'hex'));
    });

    it('should decode a Request -> WriteVar (multi-item)', (done) => {
        let parser = new S7Parser();
        parser.on('data', (data) => {
            expect(data).to.be.deep.equal({
                header: {
                    type: constants.proto.type.REQUEST,
                    rid: 0,
                    pduReference: 0x1a00
                },
                param: {
                    function: constants.proto.function.WRITE_VAR,
                    items: [{
                        syntax: constants.proto.syntax.S7ANY,
                        transport: constants.proto.transport.WORD,
                        area: constants.proto.area.FLAGS,
                        db: 0,
                        address: 0,
                        length: 16
                    }, {
                        syntax: constants.proto.syntax.S7ANY,
                        transport: constants.proto.transport.BYTE,
                        area: constants.proto.area.INPUTS,
                        db: 0,
                        address: 0,
                        length: 16
                    }, {
                        syntax: constants.proto.syntax.S7ANY,
                        transport: constants.proto.transport.BYTE,
                        area: constants.proto.area.OUTPUTS,
                        db: 0,
                        address: 0,
                        length: 16
                    }, {
                        syntax: constants.proto.syntax.S7ANY,
                        transport: constants.proto.transport.TIMER,
                        area: constants.proto.area.TIMER,
                        db: 0,
                        address: 0,
                        length: 8
                    }, {
                        syntax: constants.proto.syntax.S7ANY,
                        transport: constants.proto.transport.COUNTER,
                        area: constants.proto.area.COUNTER,
                        db: 0,
                        address: 0,
                        length: 8
                    }]
                },
                data: {
                    items: [{
                        returnCode: 0,
                        transportSize: constants.proto.dataTransport.BBYTE,
                        data: Buffer.from('addeaddeaddeaddeaddeaddeaddeaddeefbeefbeefbeefbeefbeefbeefbeefbe', 'hex')
                    }, {
                        returnCode: 0,
                        transportSize: constants.proto.dataTransport.BBYTE,
                        data: Buffer.from('aaaaaaaaaaaaaaaabbbbbbbbbbbbbbbb', 'hex')
                    }, {
                        returnCode: 0,
                        transportSize: constants.proto.dataTransport.BBYTE,
                        data: Buffer.from('bbbbbbbbbbbbbbbbaddeaddeaddeadde', 'hex')
                    }, {
                        returnCode: 0,
                        transportSize: constants.proto.dataTransport.BSTR,
                        data: Buffer.from('efbeefbeefbeefbeefbeefbeefbeefbe', 'hex')
                    }, {
                        returnCode: 0,
                        transportSize: constants.proto.dataTransport.BSTR,
                        data: Buffer.from('fecafecafecafecafecafecafecafeca', 'hex')
                    }]
                }
            });
            done();
        });

        parser.write(Buffer.from('320100001a00003e00740505120a10040010000083000000120a10020010000081000000120a10020010000082000000120a101d000800001d000000120a101c000800001c00000000040100addeaddeaddeaddeaddeaddeaddeaddeefbeefbeefbeefbeefbeefbeefbeefbe00040080aaaaaaaaaaaaaaaabbbbbbbbbbbbbbbb00040080bbbbbbbbbbbbbbbbaddeaddeaddeadde00090010efbeefbeefbeefbeefbeefbeefbeefbe00090010fecafecafecafecafecafecafecafeca', 'hex'));
    });

    it('should decode a Response -> ReadVar', (done) => {
        let parser = new S7Parser();
        parser.on('data', (data) => {
            expect(data).to.be.deep.equal({
                header: {
                    type: constants.proto.type.RESPONSE,
                    rid: 0,
                    pduReference: 0x1900,
                    errorCode: 0,
                    errorClass: 0
                },
                param: {
                    function: constants.proto.function.READ_VAR,
                    itemCount: 1
                },
                data: {
                    items: [{
                        returnCode: constants.proto.retval.DATA_OK,
                        transportSize: constants.proto.dataTransport.BREAL,
                        data: Buffer.from('00000000', 'hex')
                    }]
                }
            });
            done();
        });

        parser.write(Buffer.from('3203000019000002000800000401ff07000400000000', 'hex'));
    });
});