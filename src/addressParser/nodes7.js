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

const util = require('util');
const debug = util.debuglog('nodes7');
//@ts-ignore
const constants = require('../constants.json');

/**
 * Regex to match the address format of addresses
 * Match 1: DB Number
 * Match 2: Type
 * Match 3: Address
 * Match 4: Bit address / Array length
 * Match 5: Array length (for fields that need bit address)
 */
const REGEX_NODES7_ADDR = /^(?:DB(\d+),)?([A-Z]+)(\d+)(?:\.(\d+))?(?:\.(\d+))?$/;

/**
 * Parse address strings according to NodeS7 rules
 */
class AddressParserNodeS7 {

    /**
     * 
     * @param {string} address the address to be parsed
     */
    parse(address) {
        debug("S7Item parseAddress_NodeS7", address);

        let match = address.match(REGEX_NODES7_ADDR);
        if (!match) {
            throw new Error(`Could not parse item "${address}", invalid address format`);
        }

        debug("S7Item parseAddress_NodeS7 match", match);

        // variables for the fields extracted from the address string
        let match_db = match[1];
        let match_area = match[2];
        let match_addr = match[3];
        let match_bitAddr = parseInt(match[4]);
        let match_arrLen = parseInt(match[5]);

        // variables for the parsed and validated fields
        let addrType, dataType, dataTypeLength, addressOffset,
            bitAddressOffset, arrayLength, dbNumber,
            readTransportCode, writeTransportCode, areaCode, 
            byteLength, byteLengthWrite, byteLengthWithFill;

        /* Parse S7 Address */

        // test address offset
        addressOffset = parseInt(match_addr)
        if (isNaN(addressOffset)) {
            throw new Error(`Invalid address offset on "${address}"`);
        }

        // parse DB number
        if (match_db) {
            dbNumber = parseInt(match_db);

            if (dbNumber < 1 || isNaN(dbNumber)) {
                throw new Error(`Invalid DB Number on "${address}"`);
            }
        }

        // extract addrType and dataType
        if (dbNumber) {

            addrType = "DB";

            // validate data type
            switch (match_area) {
                case "X":
                case "BYTE":
                case "CHAR":
                case "STRING":
                case "INT":
                case "DINT":
                case "WORD":
                case "DWORD":
                case "REAL":
                case "DT":
                case "DTZ":
                case "DTL":
                case "DTLZ":
                    dataType = match_area;
                    break;
                case "B":
                    dataType = "BYTE";
                    break;
                case "C":
                    dataType = "CHAR";
                    break;
                case "S":
                    dataType = "STRING";
                    break;
                case "I":
                    dataType = "INT";
                    break;
                case "DI":
                    dataType = "DINT";
                    break;
                case "W":
                    dataType = "WORD";
                    break;
                case "D":
                case "DW":
                    dataType = "DWORD";
                    break;
                case "R":
                    dataType = "REAL";
                    break;
                default:
                    throw new Error(`Unknown DB data type "${match_area}" for address "${address}"`);
            }

        } else {

            // the first char indicates the PLC area (I, Q, M, P, ...)
            addrType = match_area.charAt(0);
            // the data type (if area is P, skip the first char (I,E,Q,A))
            dataType = match_area.substr(addrType === "P" ? 2 : 1);

            // validate address type
            switch (addrType) {
                case "E":
                    addrType = "I";
                    break;
                case "A":
                    addrType = "Q";
                case "P":
                case "I":
                case "Q":
                case "M":
                case "T":
                case "C":
                    break;
                default:
                    throw new Error(`Unknown address type "${addrType}" for address "${address}"`);
            }

            // validate data type
            switch (dataType) {
                case "":
                    if (addrType === "T") {
                        dataType = "TIMER";
                    } else if (addrType === "C") {
                        dataType = "COUNTER";
                    } else {
                        dataType = "X";
                    }
                    break;
                case "B":
                    dataType = "BYTE";
                    break;
                case "C":
                    dataType = "CHAR";
                    break;
                case "I":
                    dataType = "INT";
                    break;
                case "DI":
                    dataType = "DINT";
                    break;
                case "W":
                    dataType = "WORD";
                    break;
                case "D":
                case "DW":
                    dataType = "DWORD";
                    break;
                case "R":
                    dataType = "REAL";
                    break;
                default:
                    throw new Error(`Unknown data type "${dataType}" for address "${address}"`);
            }
        }

        // handle array lengths and bit address
        if (dataType === "X") {
            if (isNaN(match_bitAddr)) {
                throw new Error(`Bit address offset required for data type "X" on "${address}"`);
            }
            if (match_bitAddr > 7) {
                throw new Error(`Bit address offset out of range 0-7 on "${address}"`);
            }

            bitAddressOffset = match_bitAddr;
            arrayLength = match_arrLen;

            if (isNaN(arrayLength) || arrayLength < 1) {
                arrayLength = 1;
            }

        } else if (dataType === "STRING") {
            // match_bitAddr is the string length for string types
            if (isNaN(match_bitAddr) || match_bitAddr < 1) {
                throw new Error(`String length required for data type "STRING" on "${address}"`);
            }

            dataTypeLength = match_bitAddr + 2; //strings have 2 extra bytes for string length
            bitAddressOffset = 0;
            arrayLength = match_arrLen;

            if (isNaN(arrayLength) || arrayLength < 1) {
                arrayLength = 1;
            }

        } else {
            if (!isNaN(match_arrLen)) {
                // the array length should be at the bitAddr field, this is a syntax error
                throw new Error(`Invalid use of bit address offset on "${address}"`);
            }

            bitAddressOffset = 0;

            // the bitAddr field is actually the array length
            if (!isNaN(match_bitAddr)) {
                arrayLength = match_bitAddr;

                if (arrayLength < 1) {
                    throw new Error(`Invalid array length on "${address}"`);
                }
            } else {
                arrayLength = 1;
            }
        }

        switch (dataType) {
            case "DTL":
            case "DTLZ":
                dataTypeLength = 12;
                break;
            case "DT":
            case "DTZ":
                dataTypeLength = 8;
                break;
            case "REAL":
            case "DWORD":
            case "DINT":
                dataTypeLength = 4;
                break;
            case "INT":
            case "WORD":
            case "TIMER":
            case "COUNTER":
                dataTypeLength = 2;
                break;
            case "X":
            case "BYTE":
            case "CHAR":
                dataTypeLength = 1;
                break;
            case "STRING":
                // For strings, arrayLength and dtypelen were assigned during parsing.
                break;
            default:
                // we have validated the dataType before, so we should never reach this
                throw new Error(`Cannot determine the length of type "${dataType}" for address "${address}"`);
        }

        // set area/transport codes accordingly

        //readTransportCode = 0x04; //TODO - this is WORD from the original code
        readTransportCode = constants.proto.transport.BYTE;
        writeTransportCode = constants.proto.dataTransport.BBYTE;

        switch (addrType) {
            case "DB":
            case "DI":
                areaCode = constants.proto.area.DB;
                break;
            case "I":
            case "E":
                areaCode = constants.proto.area.INPUTS;
                break;
            case "Q":
            case "A":
                areaCode = constants.proto.area.OUTPUTS;
                break;
            case "M":
                areaCode = constants.proto.area.FLAGS;
                break;
            case "P":
                areaCode = constants.proto.area.PERIPHALS;
                break;
            case "C":
                areaCode = constants.proto.area.COUNTER;
                readTransportCode = constants.proto.transport.DATE;
                break;
            case "T":
                areaCode = constants.proto.area.TIMER;
                readTransportCode = constants.proto.transport.DATE;
                break;
            default:
                throw new Error(`Cannot determine area codes for address "${address}"`);
        }

        if (dataType === 'X') {
            writeTransportCode = constants.proto.dataTransport.BBIT;
        }

        // determine the length in bytes of this item

        if (dataType === 'X') {
            byteLength = Math.ceil((bitAddressOffset + arrayLength) / 8);
        } else {
            byteLength = arrayLength * dataTypeLength;
        }

        // for writes, boolen values use a whole byte for each
        byteLengthWrite = arrayLength * dataTypeLength;

        byteLengthWithFill = byteLength;
        byteLengthWithFill += byteLengthWithFill % 2;

        let result = {
            addrtype: addrType,
            datatype: dataType,
            dtypelen: dataTypeLength,
            offset: addressOffset,
            bitOffset: bitAddressOffset,
            arrayLength: arrayLength,
            dbNumber: dbNumber,
            readTransportCode: readTransportCode, 
            writeTransportCode: writeTransportCode, 
            areaCode: areaCode,
            byteLength: byteLength, 
            byteLengthWrite: byteLengthWrite,
            byteLengthWithFill: byteLengthWithFill
        };

        debug("S7Item parseAddress_NodeS7 result", result);
        return result;
    }
}

module.exports = new AddressParserNodeS7();