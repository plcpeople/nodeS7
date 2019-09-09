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
const { Duplex } = require('stream');
const S7Connection = require('../../src/s7connection');
//@ts-ignore
const constants = require('../../src/constants.json');

/**
 * @private
 * @param {Buffer[]} requests the expected requests
 * @param {Buffer[]} responses the responses to be sent
 */
function createStream(requests, responses) {
    let ptr = 0;
    return new Duplex({
        read(size) { },
        write(chunk, encoding, cb) {
            let expReq = requests[ptr];
            let expRes = responses[ptr];
            ptr++;

            if (expReq.compare(chunk)) {
                throw new Error(`Expected output [${expReq}] doesn't match with outcoming [${chunk}]`);
            }
            
            if (expRes) {
                process.nextTick(() => this.push(expRes));
            }
            cb();
        }
    });
}

describe('S7Connection', () => {

    it('should connect and negotiate parameters', done => {
        let reqs = [
            Buffer.from('32010000000000080000f0000008000803c0', 'hex') //REQ - Setup communication
        ];

        let ress = [
            Buffer.from('320300000000000800000000f0000003000300f0', 'hex') //RES - Setup communication
        ]

        let stream = createStream(reqs, ress)
        let conn = new S7Connection(stream, {maxJobs: 8, maxPDUSize: 960, timeout: 2000});
        conn.connect();
        conn.on('error', e => { throw e; })
        conn.on('connect', () => {
            expect(conn.pduSize).to.be.equal(240);
            expect(conn.parallelJobs).to.be.equal(3);
            conn.destroy();
            done();
        });
    });

    it('should connect and negotiate parameters (limit at ours)', done => {
        let reqs = [
            Buffer.from('32010000000000080000f000000100010078', 'hex') //REQ - Setup communication
        ];

        let ress = [
            Buffer.from('320300000000000800000000f0000003000300f0', 'hex') //RES - Setup communication
        ]

        let stream = createStream(reqs, ress)
        let conn = new S7Connection(stream, { maxJobs: 1, maxPDUSize: 120, timeout: 2000 });
        conn.connect();
        conn.on('error', e => { throw e; })
        conn.on('connect', () => {
            expect(conn.pduSize).to.be.equal(120);
            expect(conn.parallelJobs).to.be.equal(1);
            conn.destroy();
            done();
        });
    });

    it('should resolve incoming packets to their requests', done => {
        let reqs = [
            Buffer.from('32010000000000080000f0000008000803c0', 'hex'), //REQ - Setup communication
            Buffer.from('320100000001000e00000401120a10020001000081000000', 'hex') //REQ - Read Var  - I0.0 BYTE 1
        ];

        let ress = [
            Buffer.from('320300000000000800000000f0000003000300f0', 'hex'), //RES - Setup communication
            Buffer.from('3203000000010002000500000401ff04000808', 'hex') //RES - Read Var  - I0.0 BYTE 1
        ]

        let stream = createStream(reqs, ress)
        let conn = new S7Connection(stream, { maxJobs: 8, maxPDUSize: 960, timeout: 2000 });
        conn.connect();
        conn.on('error', e => { throw e; })
        conn.on('connect', () => {
            conn.sendRaw({
                header: {
                    type: constants.proto.type.REQUEST
                },
                param: {
                    function: constants.proto.function.READ_VAR,
                    items: [{
                        syntax: constants.proto.syntax.S7ANY,
                        area: constants.proto.area.INPUTS,
                        transport: constants.proto.transport.BYTE,
                        address: 0,
                        length: 1
                    }]
                }
            }).then(data => {
                expect(data.header.pduReference).to.be.equal(1);
                //console.log('data', data);
                conn.destroy();
                done();
            });
        });
    });

    it('should reject requests on timeout', done => {
        let reqs = [
            Buffer.from('32010000000000080000f0000008000803c0', 'hex'), //REQ - Setup communication
            Buffer.from('320100000001000e00000401120a10020001000081000000', 'hex') //REQ - Read Var  - I0.0 BYTE 1
        ];

        let ress = [
            Buffer.from('320300000000000800000000f0000003000300f0', 'hex'), //RES - Setup communication
            //Buffer.from('3203000000010002000500000401ff04000808', 'hex') //RES - Read Var  - I0.0 BYTE 1
        ]

        let stream = createStream(reqs, ress)
        let conn = new S7Connection(stream, { maxJobs: 8, maxPDUSize: 960, timeout: 200 });
        conn.connect();
        conn.on('error', e => { throw e; })
        conn.on('connect', () => {
            conn.sendRaw({
                header: {
                    type: constants.proto.type.REQUEST
                },
                param: {
                    function: constants.proto.function.READ_VAR,
                    items: [{
                        syntax: constants.proto.syntax.S7ANY,
                        area: constants.proto.area.INPUTS,
                        transport: constants.proto.transport.BYTE,
                        address: 0,
                        length: 1
                    }]
                }
            }).catch(e => {
                expect(e).to.be.an('error', 'timeout');
                conn.destroy();
                done();
            });
        });
    });


    it('should reject requests on incoming error code', done => {
        let reqs = [
            Buffer.from('32010000000000080000f0000008000803c0', 'hex'), //REQ - Setup communication
            Buffer.from('320100000001000e00000401120a10020001000081000000', 'hex') //REQ - Read Var  - I0.0 BYTE 1
        ];

        let ress = [
            Buffer.from('320300000000000800000000f0000003000300f0', 'hex'), //RES - Setup communication
            Buffer.from('320300000001000000008101', 'hex') //RES - Error code
        ]

        let stream = createStream(reqs, ress)
        let conn = new S7Connection(stream, { maxJobs: 8, maxPDUSize: 960, timeout: 2000 });
        conn.connect();
        conn.on('error', e => { throw e; })
        conn.on('connect', () => {
            conn.sendRaw({
                header: {
                    type: constants.proto.type.REQUEST
                },
                param: {
                    function: constants.proto.function.READ_VAR,
                    items: [{
                        syntax: constants.proto.syntax.S7ANY,
                        area: constants.proto.area.INPUTS,
                        transport: constants.proto.transport.BYTE,
                        address: 0,
                        length: 1
                    }]
                }
            }).catch(e => {
                expect(e).to.be.an('error', 'PLC error');
                conn.destroy();
                done();
            });
        });
    });

});