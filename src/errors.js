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