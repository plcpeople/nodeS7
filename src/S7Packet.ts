export class S7Packet {
    public seqNum = undefined;				// Made-up sequence number to watch for.
    public itemList = undefined;  			// This will be assigned the object that details what was in the request.
    public reqTime = undefined;
    public sent = false;					// Have we sent the packet yet?
    public rcvd = false;					// Are we waiting on a reply?
    public timeoutError = undefined;		// The packet is marked with error on timeout so we don't then later switch to good data.
    public timeout = undefined;				// The timeout for use with clearTimeout()
}
