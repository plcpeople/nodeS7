//@ts-check
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

const constants = require('../constants.json');
const util = require('util');
const debug = util.debuglog('nodes7');

/**
 * Helper
 * @param {number} i 
 */
function fromBCD(i) {
    return (100 * (i >> 8)) + (10 * ((i >> 4) & 0x0f)) + (i & 0x0f);
}

class S7UserDataParser {

    parseData(buffer, offset, parameter) {
        debug('S7UserDataParser parseData', parameter, offset, buffer);

        let obj = {};

        obj.returnCode = buffer.readUInt8(offset);
        offset += 1;
        obj.transportSize = buffer.readUInt8(offset);
        offset += 1;
        let length = buffer.readUInt16BE(offset);
        offset += 1;

        let err;

        //if length is zero, we don't have anything to parse anyway
        if (length > 0) {
            switch (parameter.function) {
                case constants.proto.userData.function.MODE_TRANSITION:
                    err = this._parseFuncModeTransition(buffer, offset, parameter, obj, length);
                    break;
                case constants.proto.userData.function.PROG_COMMAND:
                    err = this._parseFuncProdCommand(buffer, offset, parameter, obj, length);
                    break;
                case constants.proto.userData.function.CYCLIC_DATA:
                    err = this._parseFuncCyclicData(buffer, offset, parameter, obj, length);
                    break;
                case constants.proto.userData.function.BLOCK_FUNC:
                    err = this._parseFuncBlockFunc(buffer, offset, parameter, obj, length);
                    break;
                case constants.proto.userData.function.CPU_FUNC:
                    err = this._parseFuncCpuFunc(buffer, offset, parameter, obj, length);
                    break;
                case constants.proto.userData.function.SECURITY:
                    err = this._parseFuncSecurity(buffer, offset, parameter, obj, length);
                    break;
                case constants.proto.userData.function.PBC:
                    err = this._parseFuncPbc(buffer, offset, parameter, obj, length);
                    break;
                case constants.proto.userData.function.TIME:
                    err = this._parseFuncTime(buffer, offset, parameter, obj, length);
                    break;
                default:
                    return new Error(`Unknown UserData function [${parameter.function}]`);
            }
        }

        if (err) return err;

        //TODO maybe check if we have overflown the buffer using `length` field

        return obj;
    }

    // ------ parse functions ------

    _parseFuncModeTransition(buffer, offset, parameter, obj, length) {
        debug('S7UserDataParser _parseFuncModeTransition');
        switch (parameter.subfunction) {
            default:
                return new Error(`Unknown subfunction [${parameter.subfunction}] for function [${parameter.function}] (ModeTransition)`);
        }
    }

    _parseFuncProdCommand(buffer, offset, parameter, obj, length) {
        debug('S7UserDataParser _parseFuncProdCommand');
        switch (parameter.subfunction) {
            default:
                return new Error(`Unknown subfunction [${parameter.subfunction}] for function [${parameter.function}] (ProdCommand)`);
        }
    }

    _parseFuncCyclicData(buffer, offset, parameter, obj, length) {
        debug('S7UserDataParser _parseFuncCyclicData');
        switch (parameter.subfunction) {
            default:
                return new Error(`Unknown subfunction [${parameter.subfunction}] for function [${parameter.function}] (CyclicData)`);
        }
    }

    _parseFuncBlockFunc(buffer, offset, parameter, obj, length) {
        debug('S7UserDataParser _parseFuncBlockFunc');
        switch (parameter.subfunction) {
            default:
                return new Error(`Unknown subfunction [${parameter.subfunction}] for function [${parameter.function}] (BlockFunc)`);
        }
    }

    _parseFuncCpuFunc(buffer, offset, parameter, obj, length) {
        debug('S7UserDataParser _parseFuncCpuFunc');
        switch (parameter.subfunction) {


            case constants.proto.userData.subfunction.CPU_FUNC.READSZL:
                /* SZLs can be fragmented. The "header" containing the id and index
                appear only on the first one, and we don't store enough state here to
                know whether a packet is the first one or not. Therefore, the upper
                layer have to handle this*/
                obj.payload = buffer.slice(offset, offset + length);

                break;

            case constants.proto.userData.subfunction.CPU_FUNC.MSGS:
                break;

            case constants.proto.userData.subfunction.CPU_FUNC.DIAGMSG:
                break;

            case constants.proto.userData.subfunction.CPU_FUNC.ALARM8_IND:
                break;

            case constants.proto.userData.subfunction.CPU_FUNC.NOTIFY_IND:
                break;

            case constants.proto.userData.subfunction.CPU_FUNC.ALARM8LOCK:
                break;

            case constants.proto.userData.subfunction.CPU_FUNC.ALARM8UNLOCK:
                break;

            case constants.proto.userData.subfunction.CPU_FUNC.SCAN_IND:
                break;

            case constants.proto.userData.subfunction.CPU_FUNC.ALARMACK:
                break;

            case constants.proto.userData.subfunction.CPU_FUNC.ALARMACK_IND:
                break;

            case constants.proto.userData.subfunction.CPU_FUNC.ALARM8LOCK_IND:
                break;

            case constants.proto.userData.subfunction.CPU_FUNC.ALARM8UNLOCK_IND:
                break;

            case constants.proto.userData.subfunction.CPU_FUNC.ALARMSQ_IND:
                break;

            case constants.proto.userData.subfunction.CPU_FUNC.ALARMS_IND:
                break;

            case constants.proto.userData.subfunction.CPU_FUNC.ALARMQUERY:
                break;

            case constants.proto.userData.subfunction.CPU_FUNC.NOTIFY8_IND:
                break;


            default:
                return new Error(`Unknown subfunction [${parameter.subfunction}] for function [${parameter.function}] (CpuFunc)`);
        }
    }

    _parseFuncSecurity(buffer, offset, parameter, obj, length) {
        debug('S7UserDataParser _parseFuncSecurity');
        switch (parameter.subfunction) {
            default:
                return new Error(`Unknown subfunction [${parameter.subfunction}] for function [${parameter.function}] (Security)`);
        }
    }

    _parseFuncPbc(buffer, offset, parameter, obj, length) {
        debug('S7UserDataParser _parseFuncPbc');
        switch (parameter.subfunction) {
            default:
                return new Error(`Unknown subfunction [${parameter.subfunction}] for function [${parameter.function}] (Pbc)`);
        }
    }

    _parseFuncTime(buffer, offset, parameter, obj, length) {
        debug('S7UserDataParser _parseFuncTime');
        switch (parameter.subfunction) {
            case constants.proto.userData.subfunction.TIME.READ:
            case constants.proto.userData.subfunction.TIME.SET:

                if (length != 10) {
                    return new Error(`Unknown time format (length [${length}] != 10)`);
                }

                let reserved = buffer.readUInt8(offset);
                offset += 1;
                let y1 = buffer.readUInt8(offset);
                offset += 1;
                let y2 = buffer.readUInt8(offset);
                offset += 1;
                let mon = buffer.readUInt8(offset);
                offset += 1;
                let day = buffer.readUInt8(offset);
                offset += 1;
                let hr = buffer.readUInt8(offset);
                offset += 1;
                let min = buffer.readUInt8(offset);
                offset += 1;
                let sec = buffer.readUInt8(offset);
                offset += 1;
                let ms = buffer.readUInt16BE(offset) >> 4; //last 4 bits are weekday, we ignore
                offset += 2;

                obj.timestamp = new Date(
                    (fromBCD(y1) * 100) + fromBCD(y2), fromBCD(mon) - 1, fromBCD(day),
                    fromBCD(hr), fromBCD(min), fromBCD(sec), fromBCD(ms));

                break;

            case constants.proto.userData.subfunction.TIME.READ_FOLLOWING:
                //break; //we haven't seen of it to know how it behaves
            case constants.proto.userData.subfunction.TIME.SET2:
                //break;

            default:
                return new Error(`Unknown subfunction [${parameter.subfunction}] for function [${parameter.function}] (Time)`);
        }
    }
}

module.exports = S7UserDataParser;