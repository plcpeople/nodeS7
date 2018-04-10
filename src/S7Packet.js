"use strict";
exports.__esModule = true;
var S7Packet = /** @class */ (function () {
    function S7Packet() {
        this.seqNum = undefined; // Made-up sequence number to watch for.
        this.itemList = undefined; // This will be assigned the object that details what was in the request.
        this.reqTime = undefined;
        this.sent = false; // Have we sent the packet yet?
        this.rcvd = false; // Are we waiting on a reply?
        this.timeoutError = undefined; // The packet is marked with error on timeout so we don't then later switch to good data.
        this.timeout = undefined; // The timeout for use with clearTimeout()
    }
    return S7Packet;
}());
exports.S7Packet = S7Packet;
//# sourceMappingURL=S7Packet.js.map