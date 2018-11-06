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
const S7Serializer = require('../../src/s7protocol/s7serializer.js');
const constants = require('../../src/constants.json');
const Stream = require('stream');

describe('S7Protocol Serializer', () => {

    it('should be a stream', () => {
        expect(new S7Serializer()).to.be.instanceOf(Stream);
    });

    it('should create a new instance', () => {
        expect(new S7Serializer).to.be.instanceOf(Stream); //jshint ignore:line
    });

    it('should encode a Request -> Communication setup', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('32010000000000080000f0000001000101e0');
            done();
        });

        serializer.write({
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
    });

    it('should encode a Response -> Communication setup', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('320300000000000800000000f0000001000100f0');
            done();
        });

        serializer.write({
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
    });

    it('should encode a partial Request -> Communication setup', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('32010000000000080000f0000001000101e0');
            done();
        });

        serializer.write({
            header: {
                type: constants.proto.type.REQUEST
            },
            param: {
                function: constants.proto.function.COMM_SETUP,
                maxJobsCalling: 1,
                maxJobsCalled: 1,
                pduLength: 480
            }
        });
    });

    it('should encode a partial Response -> Communication setup', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('320300000000000800000000f0000001000100f0');
            done();
        });

        serializer.write({
            header: {
                type: constants.proto.type.RESPONSE
            },
            param: {
                function: constants.proto.function.COMM_SETUP,
                maxJobsCalling: 1,
                maxJobsCalled: 1,
                pduLength: 240
            }
        });
    });

    it('should encode a Request -> ReadVar', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('320100001900000e00000401120a10080001000083000080');
            done();
        });

        serializer.write({
            header: {
                type: constants.proto.type.REQUEST,
                rid: 0,
                pduReference: 0x1900
            },
            param: {
                function: constants.proto.function.READ_VAR,
                items: [{
                    syntax: constants.proto.syntax.S7ANY,
                    transport: constants.proto.transport.REAL,
                    area: constants.proto.area.FLAGS,
                    db: 0,
                    address: 0x80,
                    length: 1
                }]
            }
        });
    });

    it('should encode a Response -> ReadVar', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('3203000019000002000800000401ff07000400000000');
            done();
        });

        serializer.write({
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
    });

    it('should encode a Request -> ReadVar (multi-item)', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('320100001b00003e00000405120a10020010000083000000120a10020010000081000000120a10020010000082000000120a101d000800001d000000120a101c000800001c000000');
            done();
        });

        serializer.write({
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
    });

    it('should encode a Response -> ReadVar (multi-item)', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('320300001b000002006400000405ff040080acde000daddeaddeaddeaddeaddeaddeff040080aaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbff040080bbbbbbbbbbbbbbbbaddeaddeaddeaddeff09001000000000000000000000000000000000ff09001000110000000000000000000000000000');
            done();
        });

        serializer.write({
            header: {
                type: constants.proto.type.RESPONSE,
                rid: 0,
                pduReference: 0x1b00,
                errorCode: 0,
                errorClass: 0
            },
            param: {
                function: constants.proto.function.READ_VAR,
                itemCount: 5
            },
            data: {
                items: [{
                    returnCode: constants.proto.retval.DATA_OK,
                    transportSize: constants.proto.dataTransport.BBYTE,
                    data: Buffer.from('acde000daddeaddeaddeaddeaddeadde', 'hex')
                }, {
                    returnCode: constants.proto.retval.DATA_OK,
                    transportSize: constants.proto.dataTransport.BBYTE,
                    data: Buffer.from('aaaaaaaaaaaaaaaabbbbbbbbbbbbbbbb', 'hex')
                }, {
                    returnCode: constants.proto.retval.DATA_OK,
                    transportSize: constants.proto.dataTransport.BBYTE,
                    data: Buffer.from('bbbbbbbbbbbbbbbbaddeaddeaddeadde', 'hex')
                }, {
                    returnCode: constants.proto.retval.DATA_OK,
                    transportSize: constants.proto.dataTransport.BSTR,
                    data: Buffer.from('00000000000000000000000000000000', 'hex')
                }, {
                    returnCode: constants.proto.retval.DATA_OK,
                    transportSize: constants.proto.dataTransport.BSTR,
                    data: Buffer.from('00110000000000000000000000000000', 'hex')
                }]
            }
        });
    });

    it('should encode a Request -> WriteVar', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('320100001800000e00080501120a100800010000830000800007000479e9f642');
            done();
        });

        serializer.write({
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
    });

    it('should encode a Response -> WriteVar', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('3203000018000002000100000501ff');
            done();
        });

        serializer.write({
            header: {
                type: constants.proto.type.RESPONSE,
                rid: 0,
                pduReference: 0x1800,
                errorCode: 0,
                errorClass: 0
            },
            param: {
                function: constants.proto.function.WRITE_VAR,
                itemCount: 1
            },
            data: {
                items: [{
                    returnCode: constants.proto.retval.DATA_OK
                }]
            }
        });
    });

    it('should encode a Request -> WriteVar (multi-item)', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('320100001a00003e00740505120a10040010000083000000120a10020010000081000000120a10020010000082000000120a101d000800001d000000120a101c000800001c00000000040100addeaddeaddeaddeaddeaddeaddeaddeefbeefbeefbeefbeefbeefbeefbeefbe00040080aaaaaaaaaaaaaaaabbbbbbbbbbbbbbbb00040080bbbbbbbbbbbbbbbbaddeaddeaddeadde00090010efbeefbeefbeefbeefbeefbeefbeefbe00090010fecafecafecafecafecafecafecafeca');
            done();
        });

        serializer.write({
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
    });

    it('should encode a Response -> WriteVar (multi-item)', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('320300001a000002000500000505ffffff0303');
            done();
        });

        serializer.write({
            header: {
                type: constants.proto.type.RESPONSE,
                rid: 0,
                pduReference: 0x1a00,
                errorCode: 0,
                errorClass: 0
            },
            param: {
                function: constants.proto.function.WRITE_VAR,
                itemCount: 5
            },
            data: {
                items: [{
                    returnCode: constants.proto.retval.DATA_OK
                }, {
                    returnCode: constants.proto.retval.DATA_OK
                }, {
                    returnCode: constants.proto.retval.DATA_OK
                }, {
                    returnCode: constants.proto.retval.DATA_ACCESS_FAULT
                }, {
                    returnCode: constants.proto.retval.DATA_ACCESS_FAULT
                }]
            }
        });
    });

    it('should encode a Request -> ReadVar (DB 210.DBX 0.0 BYTE 219)', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('320100000002000e00000401120a100200db00d284000000');
            done();
        });

        serializer.write({
            header: {
                type: constants.proto.type.REQUEST,
                rid: 0,
                pduReference: 2
            },
            param: {
                function: constants.proto.function.READ_VAR,
                items: [{
                    syntax: constants.proto.syntax.S7ANY,
                    transport: constants.proto.transport.BYTE,
                    area: constants.proto.area.DB,
                    db: 210,
                    address: 0,
                    length: 219
                }]
            }
        });
    });

    it('should encode a Response -> ReadVar (DB 210.DBX 0.0 BYTE 219)', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('320300000002000200df00000401ff0406d80200010080000088000100000dae5f5f5f5f5f5f5f5f5f5f5f5f5f5f303030303030000c0c000000800000870002000023895f5f5f5f5f5f5f5f5f5f5f5f5f5f303030303030000000000000800000860003000039665f5f5f5f5f5f5f5f5f5f5f5f5f5f30303030303000000000000080000085000400004fa65f5f5f5f5f5f5f5f5f5f5f5f5f5f303030303030000000000000800000840005000065835f5f5f5f5f5f5f5f5f5f5f5f5f5f30303030303000040400000080000083000600007b605f5f5f5f5f5f5f5f5f5f5f5f5f5f3030303030300000000000');
            done();
        });

        serializer.write({
            header: {
                type: constants.proto.type.RESPONSE,
                rid: 0,
                pduReference: 2,
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
                    transportSize: constants.proto.dataTransport.BBYTE,
                    data: Buffer.from('0200010080000088000100000dae5f5f5f5f5f5f5f5f5f5f5f5f5f5f303030303030000c0c000000800000870002000023895f5f5f5f5f5f5f5f5f5f5f5f5f5f303030303030000000000000800000860003000039665f5f5f5f5f5f5f5f5f5f5f5f5f5f30303030303000000000000080000085000400004fa65f5f5f5f5f5f5f5f5f5f5f5f5f5f303030303030000000000000800000840005000065835f5f5f5f5f5f5f5f5f5f5f5f5f5f30303030303000040400000080000083000600007b605f5f5f5f5f5f5f5f5f5f5f5f5f5f3030303030300000000000', 'hex')
                }]
            }
        });
    });

    it('should encode a Request -> ReadVar (DB 210.DBX 220.0 BYTE 220)', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('320100000003000e00000401120a100200dc00d2840006e0');
            done();
        });

        serializer.write({
            header: {
                type: constants.proto.type.REQUEST,
                rid: 0,
                pduReference: 3
            },
            param: {
                function: constants.proto.function.READ_VAR,
                items: [{
                    syntax: constants.proto.syntax.S7ANY,
                    transport: constants.proto.transport.BYTE,
                    area: constants.proto.area.DB,
                    db: 210,
                    address: 0x6e0,
                    length: 220
                }]
            }
        });
    });

    it('should encode a Response -> ReadVar (DB 210.DBX 220.0 BYTE 220)', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('320300000003000200e000000401ff0406e08000008200070000913c5f5f5f5f5f5f5f5f5f5f5f5f5f5f3030303030300004040000008000008100080000a7195f5f5f5f5f5f5f5f5f5f5f5f5f5f3030303030300008080000008000008000090000bcf65f5f5f5f5f5f5f5f5f5f5f5f5f5f3030303030300008080000008000007f000a0000d2d35f5f5f5f5f5f5f5f5f5f5f5f5f5f3030303030300000000000008000007e000b0000e8af5f5f5f5f5f5f5f5f5f5f5f5f5f5f3030303030300000000000008000007d000c0000fe8c5f5f5f5f5f5f5f5f5f5f5f5f5f5f3030303030300000000000008000007c');
            done();
        });

        serializer.write({
            header: {
                type: constants.proto.type.RESPONSE,
                rid: 0,
                pduReference: 3,
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
                    transportSize: constants.proto.dataTransport.BBYTE,
                    data: Buffer.from('8000008200070000913c5f5f5f5f5f5f5f5f5f5f5f5f5f5f3030303030300004040000008000008100080000a7195f5f5f5f5f5f5f5f5f5f5f5f5f5f3030303030300008080000008000008000090000bcf65f5f5f5f5f5f5f5f5f5f5f5f5f5f3030303030300008080000008000007f000a0000d2d35f5f5f5f5f5f5f5f5f5f5f5f5f5f3030303030300000000000008000007e000b0000e8af5f5f5f5f5f5f5f5f5f5f5f5f5f5f3030303030300000000000008000007d000c0000fe8c5f5f5f5f5f5f5f5f5f5f5f5f5f5f3030303030300000000000008000007c', 'hex')
                }]
            }
        });
    });

    it('should encode a Request -> Upload start', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('320100000800001200001d00000000000000095f3042303030303041');
            done();
        });

        serializer.write({
            header: {
                type: constants.proto.type.REQUEST,
                rid: 0,
                pduReference: 0x0800
            },
            param: {
                function: constants.proto.function.UPLOAD_START,
                status: 0,
                uploadID: 0,
                filename: "_0B00000A"
            }
        });
    });

    it('should encode a Response -> Upload start', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('3203000008000010000000001d000100000000070730303030323136');
            done();
        });

        serializer.write({
            header: {
                type: constants.proto.type.RESPONSE,
                rid: 0,
                pduReference: 0x0800,
                errorCode: 0,
                errorClass: 0
            },
            param: {
                function: constants.proto.function.UPLOAD_START,
                status: 0,
                uploadID: 7,
                blockLength: "0000216"
            }
        });
    });

    it('should encode a Request -> Upload', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('320100000900000800001e00000000000007');
            done();
        });

        serializer.write({
            header: {
                type: constants.proto.type.REQUEST,
                rid: 0,
                pduReference: 0x0900
            },
            param: {
                function: constants.proto.function.UPLOAD_BLOCK,
                status: 0,
                uploadID: 7
            }
        });
    });

    it('should encode a Response -> Upload', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('320300000900000200dc00001e0000d800fb70700302070b0000000000d880000000003921002d9804ef6d80122c00000000000000901c031001010100001f0202040001210500140000019f003c01900027741553373330302f45543230304d2073746174696f6e5f310000504c435f31000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005354455020372023202020202020202020202020202020200000d1cc3152481400000000');
            done();
        });

        serializer.write({
            header: {
                type: constants.proto.type.RESPONSE,
                rid: 0,
                pduReference: 0x0900,
                errorCode: 0,
                errorClass: 0
            },
            param: {
                function: constants.proto.function.UPLOAD_BLOCK,
                status: 0
            },
            data: {
                payload: Buffer.from('70700302070b0000000000d880000000003921002d9804ef6d80122c00000000000000901c031001010100001f0202040001210500140000019f003c01900027741553373330302f45543230304d2073746174696f6e5f310000504c435f31000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005354455020372023202020202020202020202020202020200000d1cc3152481400000000', 'hex')
            }
        });
    });

    it('should encode a Request -> Upload end', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('320100000a00000800001f00000000000007');
            done();
        });

        serializer.write({
            header: {
                type: constants.proto.type.REQUEST,
                rid: 0,
                pduReference: 0x0a00
            },
            param: {
                function: constants.proto.function.UPLOAD_END,
                status: 0,
                errorCode: 0,
                uploadID: 7
            }
        });
    });

    it('should encode a Response -> Upload end', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('320300000a000001000000001f');
            done();
        });

        serializer.write({
            header: {
                type: constants.proto.type.RESPONSE,
                rid: 0,
                pduReference: 0x0a00,
                errorCode: 0,
                errorClass: 0
            },
            param: {
                function: constants.proto.function.UPLOAD_END
            }
        });
    });

    it('should encode a Request -> PLC Stop', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('320100001c000010000029000000000009505f50524f4752414d');
            done();
        });

        serializer.write({
            header: {
                type: constants.proto.type.REQUEST,
                rid: 0,
                pduReference: 0x1c00
            },
            param: {
                function: constants.proto.function.PLC_STOP,
                piService: "P_PROGRAM"
            }
        });
    });

    it('should encode a Response -> PLC Stop', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('320300001c0000010000000029');
            done();
        });

        serializer.write({
            header: {
                type: constants.proto.type.RESPONSE,
                rid: 0,
                pduReference: 0x1c00,
                errorCode: 0,
                errorClass: 0
            },
            param: {
                function: constants.proto.function.PLC_STOP
            }
        });
    });

    it('should encode a Request -> PLC Control -> Copy RAM to ROM', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('320100001d000012000028000000000000fd00024550055f4d4f4455');
            done();
        });

        serializer.write({
            header: {
                type: constants.proto.type.REQUEST,
                rid: 0,
                pduReference: 0x1d00
            },
            param: {
                function: constants.proto.function.PLC_CONTROL,
                parameter: "EP",
                piService: "_MODU"
            }
        });
    });

    it('should encode a Response -> PLC Control -> Copy RAM to ROM', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('320300001d0000010000000028');
            done();
        });

        serializer.write({
            header: {
                type: constants.proto.type.RESPONSE,
                rid: 0,
                pduReference: 0x1d00,
                errorCode: 0,
                errorClass: 0
            },
            param: {
                function: constants.proto.function.PLC_CONTROL
            }
        });
    });

    it('should encode a Request -> PLC Control -> Compress PLC Memory', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('320100001e000010000028000000000000fd0000055f47415242');
            done();
        });

        serializer.write({
            header: {
                type: constants.proto.type.REQUEST,
                rid: 0,
                pduReference: 0x1e00
            },
            param: {
                function: constants.proto.function.PLC_CONTROL,
                parameter: "", //no parameter
                piService: "_GARB"
            }
        });
    });

    it('should encode a Response -> PLC Control -> Compress PLC Memory', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('320300001d0000010000000028');
            done();
        });

        serializer.write({
            header: {
                type: constants.proto.type.RESPONSE,
                rid: 0,
                pduReference: 0x1d00,
                errorCode: 0,
                errorClass: 0
            },
            param: {
                function: constants.proto.function.PLC_CONTROL
            }
        });
    });

    /*
    it('should encode a ', (done) => {
        let serializer = new S7Serializer();
        serializer.on('data', (data) => {
            expect(data.toString('hex')).to.be.equal('');
            done();
        });

        serializer.write();
    });
    //*/

    it('should throw if object has no type', (done) => {
        let serializer = new S7Serializer();
        serializer.on('error', (err) => {
            expect(err).to.be.an('error');
            done();
        });

        serializer.write({
            header: {
                //type: constants.proto.type.REQUEST,
                rid: 0,
                pduReference: 0,
            }
        });
    });
});