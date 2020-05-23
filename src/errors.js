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

/**
 * Custom NodeS7 Error class that tries to export the root-cause of an error by 
 * extending the built-in Error class with a `code` and an `info` property.
 * 
 * The `code` property is always populated, and can be of type "string", when
 * caused by internal checks of the library, or of type "number" when caused
 * by a faulty error code from the PLC.
 * 
 * Here is a list of the error codes that can be thrown by the library itself:
 *  - `ERR_ILLEGAL_STATE`: Internal condition required for executing an action is not fulfilled
 *  - `ERR_INTERRUPTED`: Pending job has been interrupted (e.g. by a disconnection)
 *  - `ERR_INVALID_ARGUMENT`: A supplied parameter of a called function is out of specification 
 *  - `ERR_ITEM_TOO_BIG`: Item being written does not fit a single write request
 *  - `ERR_NOT_CONNECTED`: Trying to perform an operation that requires communication to the PLC, but no connection is currently established
 *  - `ERR_PARSE_ADDR_OFFSET`: Address parsing: Byte offset of an address is invalid
 *  - `ERR_PARSE_AREA`: Address parsing: Area addressed is unknown or invalid
 *  - `ERR_PARSE_BIT_OFFSET`: Address parsing: Bit offset is missing or is invalid
 *  - `ERR_PARSE_DATATYPE`: Address parsing: Datatype is unknown or invalid
 *  - `ERR_PARSE_DB_DATATYPE`: Address parsing: Datatype of a DB area is unknown or invalid
 *  - `ERR_PARSE_DB_NUMBER`: Address parsing: Number of a DB is unknown or invalid
 *  - `ERR_PARSE_INVALID_ARR_LEN`: Address parsing: Array length of an array specification is invalid
 *  - `ERR_PARSE_INVALID_BIT_OFFSET`: Address parsing: Bit offset is specified in a type that doesn't support it
 *  - `ERR_PARSE_STRING_LEN`: Address parsing: String length specified is missing or is invalid
 *  - `ERR_PARSE_UNKNOWN_FORMAT`: Address parsing: Basic format of a NODES7 address format cannot be identified
 *  - `ERR_TIMEOUT`: Communication timeout
 *  - `ERR_UNEXPECTED_RESPONSE`: Unexpected or invalid data received from the device. Usually causes the current connection to be terminated
 */
class NodeS7Error extends Error {
    
    /**
     * Encapsulates an error, whether caused from a return code from the PLC or
     * internally in the library, identified by a code for it and an optional info
     * about the cause of the error
     * 
     * @param {number|string} code the error code. numeric codes are from PLC responses, string codes are generated internally
     * @param {string} message the error message
     * @param {object} [info] Object containing additional info about the causes of the error. May not be always available
     */
    constructor(code, message, info) {
        super(message);
        /** @type {number|string} */
        this.code = code;
        /** @type {object} */
        this.info = info;
    }
}

module.exports = NodeS7Error;