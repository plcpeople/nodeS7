// NodeS7 - A library for communication to Siemens PLCs from node.js.

// The MIT License (MIT)

// Copyright (c) 2013 Dana Moffit

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

// EXTRA WARNING - This is BETA software and as such, be careful, especially when
// writing values to programmable controllers.
//
// Some actions or errors involving programmable controllers can cause injury or death,
// and YOU are indicating that you understand the risks, including the
// possibility that the wrong address will be overwritten with the wrong value,
// when using this library.  Test thoroughly in a laboratory environment.


var net = require("net");
var util = require("util");
var effectiveDebugLevel = 0; // intentionally global, shared between connections
var silentMode = false;

module.exports = NodeS7;

function NodeS7(opts) {
	opts = opts || {};
	silentMode = opts.silent || false;
	effectiveDebugLevel = opts.debug ? 99 : 0

	var self = this;

	self.connectReq = Buffer.from([0x03, 0x00, 0x00, 0x16, 0x11, 0xe0, 0x00, 0x00, 0x00, 0x02, 0x00, 0xc0, 0x01, 0x0a, 0xc1, 0x02, 0x01, 0x00, 0xc2, 0x02, 0x01, 0x02]);
	self.negotiatePDU = Buffer.from([0x03, 0x00, 0x00, 0x19, 0x02, 0xf0, 0x80, 0x32, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0xf0, 0x00, 0x00, 0x08, 0x00, 0x08, 0x03, 0xc0]);
	self.readReqHeader = Buffer.from([0x03, 0x00, 0x00, 0x1f, 0x02, 0xf0, 0x80, 0x32, 0x01, 0x00, 0x00, 0x08, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x04, 0x01]);
	self.readReq = Buffer.alloc(1500);
	self.writeReqHeader = Buffer.from([0x03, 0x00, 0x00, 0x1f, 0x02, 0xf0, 0x80, 0x32, 0x01, 0x00, 0x00, 0x08, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x05, 0x01]);
	self.writeReq = Buffer.alloc(1500);

	self.resetPending = false;
	self.resetTimeout = undefined;
	self.isoclient = undefined;
	self.isoConnectionState = 0;
	self.requestMaxPDU = 960;
	self.maxPDU = 960;
	self.requestMaxParallel = 8;
	self.maxParallel = 8;
	self.parallelJobsNow = 0;
	self.maxGap = 5;
	self.doNotOptimize = false;
	self.connectCallback = undefined;
	self.readDoneCallback = undefined;
	self.writeDoneCallback = undefined;
	self.connectTimeout = undefined;
	self.PDUTimeout = undefined;
	self.globalTimeout = 1500; // In many use cases we will want to increase this
        // In 0.3.17 this was made variable from cParam.timeout to ensure packets don't timeout at 1500ms if the user has specified a timeout externally.
	self.rack = 0;
	self.slot = 2;
	self.localTSAP = null;
	self.remoteTSAP = null;

	self.readPacketArray = [];
	self.writePacketArray = [];
	self.polledReadBlockList = [];
	self.instantWriteBlockList = [];
	self.globalReadBlockList = [];
	self.globalWriteBlockList = [];
	self.masterSequenceNumber = 1;
	self.translationCB = doNothing;
	self.connectionParams = undefined;
	self.connectionID = 'UNDEF';
	self.addRemoveArray = [];
	self.readPacketValid = false;
	self.writeInQueue = false;
	self.connectCBIssued = false;
	self.dropConnectionCallback = null;
	self.dropConnectionTimer = null;
	self.reconnectTimer = undefined;
	self.rereadTimer = undefined;
}

NodeS7.prototype.getNextSeqNum = function() {
	var self = this;

	self.masterSequenceNumber += 1;
	if (self.masterSequenceNumber > 32767) {
		self.masterSequenceNumber = 1;
	}
	outputLog('seqNum is ' + self.masterSequenceNumber, 1, self.connectionID);
	return self.masterSequenceNumber;
}

NodeS7.prototype.setTranslationCB = function(cb) {
	var self = this;
	if (typeof cb === "function") {
		outputLog('Translation OK');
		self.translationCB = cb;
	}
}

NodeS7.prototype.initiateConnection = function(cParam, callback) {
	var self = this;
	if (cParam === undefined) { cParam = { port: 102, host: '192.168.8.106' }; }
	outputLog('Initiate Called - Connecting to PLC with address and parameters:');
	outputLog(cParam);
	if (typeof (cParam.rack) !== 'undefined') {
		self.rack = cParam.rack;
	}
	if (typeof (cParam.slot) !== 'undefined') {
		self.slot = cParam.slot;
	}
	if (typeof (cParam.localTSAP) !== 'undefined') {
		self.localTSAP = cParam.localTSAP;
	}
	if (typeof (cParam.remoteTSAP) !== 'undefined') {
		self.remoteTSAP = cParam.remoteTSAP;
	}
	if (typeof (cParam.connection_name) === 'undefined') {
		self.connectionID = cParam.host + " S" + self.slot;
	} else {
		self.connectionID = cParam.connection_name;
	}
	if (typeof (cParam.doNotOptimize) !== 'undefined') {
		self.doNotOptimize = cParam.doNotOptimize;
	}
	if (typeof (cParam.timeout) !== 'undefined') { // Added in 0.3.17 to ensure packets don't timeout at 1500ms if the user has specified a timeout externally.
		self.globalTimeout = cParam.timeout;
	}
	self.connectionParams = cParam;
	self.connectCallback = callback;
	self.connectCBIssued = false;
	self.connectNow(self.connectionParams, false);
}

NodeS7.prototype.dropConnection = function(callback) {
	var self = this;

	// prevents triggering reconnection even after calling dropConnection (fixes #70)
	clearTimeout(self.reconnectTimer);
	clearTimeout(self.rereadTimer);
	clearTimeout(self.connectTimeout);
	clearTimeout(self.PDUTimeout);
	self.reconnectTimer = undefined;
	self.rereadTimer = undefined;
	self.connectTimeout = undefined;
	self.PDUTimeout = undefined;

	if (typeof (self.isoclient) !== 'undefined') {
		// store the callback and request and end to the connection
		self.dropConnectionCallback = callback;
		self.isoclient.end();
		// now wait for 'on close' event to trigger connection cleanup

		// but also start a timer to destroy the connection in case we do not receive the close
		self.dropConnectionTimer = setTimeout(function() {
			if (self.dropConnectionCallback) {
				// clean up the connection now the socket has closed
				self.connectionCleanup();
				// initate the callback
				self.dropConnectionCallback();
				// prevent any possiblity of the callback being called twice
				self.dropConnectionCallback = null;
			}
		}, 2500);
	} else {
		// if client not active, then callback immediately
		callback();
	}
}

NodeS7.prototype.connectNow = function(cParam) {
	var self = this;

	// prevents any reconnect timer to fire this again
	clearTimeout(self.reconnectTimer);
	self.reconnectTimer = undefined;

	// Don't re-trigger.
	if (self.isoConnectionState >= 1) { return; }
	self.connectionCleanup();

        self.isoclient = net.connect(cParam);                                                                                                                                        

        self.isoclient.setTimeout(cParam.timeout || 5000, () => {                                                                                                                    
            self.isoclient.destroy();                                                                                                                                            
            self.connectError.apply(self, [{ code: 'EUSERTIMEOUT' }]); // Former use of "arguments" was always going to be 0.  Use "USERTIMEOUT" to show difference between this and TCP timeout.                                                                                                                            
        });                                                                                                                                                                          

        self.isoclient.once('connect', () => {                                                                                                                                       
            self.isoclient.setTimeout(0);                                                                                                                                                
            self.onTCPConnect.apply(self, arguments);                                                                                                                            
        });                                                                                                                                                                          

        self.isoConnectionState = 1;  // 1 = trying to connect  

	self.isoclient.on('error', function() {
            self.connectError.apply(self, arguments);
	});

	outputLog('<initiating a new connection ' + Date() + '>', 1, self.connectionID);
	outputLog('Attempting to connect to host...', 0, self.connectionID);
}

NodeS7.prototype.connectError = function(e) {
	var self = this;

	// Note that a TCP connection timeout error will appear here.  An ISO connection timeout error is a packet timeout.
	outputLog('We Caught a connect error ' + e.code, 0, self.connectionID);
	if ((!self.connectCBIssued) && (typeof (self.connectCallback) === "function")) {
		self.connectCBIssued = true;
		self.connectCallback(e);
	}
	self.isoConnectionState = 0;
}

NodeS7.prototype.readWriteError = function(e) {
	var self = this;
	outputLog('We Caught a read/write error ' + e.code + ' - will DISCONNECT and attempt to reconnect.');
	self.isoConnectionState = 0;
	self.connectionReset();
}

NodeS7.prototype.packetTimeout = function(packetType, packetSeqNum) {
	var self = this;
	outputLog('PacketTimeout called with type ' + packetType + ' and seq ' + packetSeqNum, 1, self.connectionID);
	if (packetType === "connect") {
		outputLog("TIMED OUT connecting to the PLC - Disconnecting", 0, self.connectionID);
		outputLog("Wait for 2 seconds then try again.", 0, self.connectionID);
		self.connectionReset();
		outputLog("Scheduling a reconnect from packetTimeout, connect type", 0, self.connectionID);
		clearTimeout(self.reconnectTimer);
		self.reconnectTimer = setTimeout(function() {
			outputLog("The scheduled reconnect from packetTimeout, connect type, is happening now", 0, self.connectionID);
			if (self.isoConnectionState === 0) {
				self.connectNow.apply(self, arguments);
			}
		}, 2000, self.connectionParams);
		return undefined;
	}
	if (packetType === "PDU") {
		outputLog("TIMED OUT waiting for PDU reply packet from PLC - Disconnecting");
		outputLog("Wait for 2 seconds then try again.", 0, self.connectionID);
		self.connectionReset();
		outputLog("Scheduling a reconnect from packetTimeout, connect type", 0, self.connectionID);
		clearTimeout(self.reconnectTimer);
		self.reconnectTimer = setTimeout(function() {
			outputLog("The scheduled reconnect from packetTimeout, PDU type, is happening now", 0, self.connectionID);
			self.connectNow.apply(self, arguments);
		}, 2000, self.connectionParams);
		return undefined;
	}
	if (packetType === "read") {
		outputLog("READ TIMEOUT on sequence number " + packetSeqNum, 0, self.connectionID);
		if (self.isoConnectionState === 4) { // Reset before calling writeResponse so ResetNow will take place this cycle 
			outputLog("ConnectionReset from read packet timeout.", 0, self.connectionID);
			self.connectionReset();
		}
		self.readResponse(undefined, self.findReadIndexOfSeqNum(packetSeqNum));
		return undefined;
	}
	if (packetType === "write") {
		outputLog("WRITE TIMEOUT on sequence number " + packetSeqNum, 0, self.connectionID);
		if (self.isoConnectionState === 4) { // Reset before calling writeResponse so ResetNow will take place this cycle 
			outputLog("ConnectionReset from write packet timeout.", 0, self.connectionID);
			self.connectionReset();
		}
		self.writeResponse(undefined, self.findWriteIndexOfSeqNum(packetSeqNum));
		return undefined;
	}
	outputLog("Unknown timeout error.  Nothing was done - this shouldn't happen.");
}

NodeS7.prototype.onTCPConnect = function() {
	var self = this, connBuf;

	outputLog('TCP Connection Established to ' + self.isoclient.remoteAddress + ' on port ' + self.isoclient.remotePort, 0, self.connectionID);
	outputLog('Will attempt ISO-on-TCP connection', 0, self.connectionID);

	// Track the connection state
	self.isoConnectionState = 2;  // 2 = TCP connected, wait for ISO connection confirmation

	// Send an ISO-on-TCP connection request.
	self.connectTimeout = setTimeout(function() {
		self.packetTimeout.apply(self, arguments);
	}, self.globalTimeout, "connect");

	connBuf = self.connectReq.slice();

	if(self.localTSAP !== null && self.remoteTSAP !== null) {
		outputLog('Using localTSAP [0x' + self.localTSAP.toString(16) + '] and remoteTSAP [0x' + self.remoteTSAP.toString(16) + ']', 0, self.connectionID);
		connBuf.writeUInt16BE(self.localTSAP, 16)
		connBuf.writeUInt16BE(self.remoteTSAP, 20)
	} else {
		outputLog('Using rack [' + self.rack + '] and slot [' + self.slot + ']', 0, self.connectionID);
		connBuf[21] = self.rack * 32 + self.slot;
	}

	self.isoclient.write(connBuf);

	// Listen for a reply.
	self.isoclient.on('data', function() {
		self.onISOConnectReply.apply(self, arguments);
	});

	// Hook up the event that fires on disconnect
	self.isoclient.on('end', function() {
		self.onClientDisconnect.apply(self, arguments);
	});

    // listen for close (caused by us sending an end)
	self.isoclient.on('close', function() {
		self.onClientClose.apply(self, arguments);

	});
}

NodeS7.prototype.onISOConnectReply = function(data) {
	var self = this;
	self.isoclient.removeAllListeners('data'); //self.onISOConnectReply);
	//self.isoclient.removeAllListeners('error'); Avoid removing the calback before setting it again

	clearTimeout(self.connectTimeout);

	// ignore if we're not expecting it - prevents write after end exception as of #80
	if (self.isoConnectionState != 2) { 
		outputLog('Ignoring ISO connect reply, expecting isoConnectionState of 2, is currently ' + self.isoConnectionState, 0, self.connectionID);
		return; 
	}

	// Track the connection state
	self.isoConnectionState = 3;  // 3 = ISO-ON-TCP connected, Wait for PDU response.

	// Expected length is from packet sniffing - some applications may be different, especially using routing - not considered yet.
	if (data.readInt16BE(2) !== data.length || data.length < 22 || data[5] !== 0xd0 || data[4] !== (data.length - 5)) {
		outputLog('INVALID PACKET or CONNECTION REFUSED - DISCONNECTING');
		outputLog(data);
		outputLog('TPKT Length From Header is ' + data.readInt16BE(2) + ' and RCV buffer length is ' + data.length + ' and COTP length is ' + data.readUInt8(4) + ' and data[5] is ' + data[5]);
		self.connectionReset();
		return null;
	}

	outputLog('ISO-on-TCP Connection Confirm Packet Received', 0, self.connectionID);

	self.negotiatePDU.writeInt16BE(self.requestMaxParallel, 19);
	self.negotiatePDU.writeInt16BE(self.requestMaxParallel, 21);
	self.negotiatePDU.writeInt16BE(self.requestMaxPDU, 23);

	self.PDUTimeout = setTimeout(function() {
		self.packetTimeout.apply(self, arguments);
	}, self.globalTimeout, "PDU");

	self.isoclient.write(self.negotiatePDU.slice(0, 25));
	self.isoclient.on('data', function() {
		self.onPDUReply.apply(self, arguments);
	});
        self.isoclient.removeAllListeners('error');
	self.isoclient.on('error', function() {
		self.readWriteError.apply(self, arguments);
	});
}

NodeS7.prototype.onPDUReply = function(theData) {
	var self = this;
	self.isoclient.removeAllListeners('data');
	self.isoclient.removeAllListeners('error');

	clearTimeout(self.PDUTimeout);

	var data=checkRFCData(theData);

	if(data==="fastACK"){
		//Read again and wait for the requested data
		outputLog('Fast Acknowledge received.', 0, self.connectionID);
		self.isoclient.removeAllListeners('error');
		self.isoclient.removeAllListeners('data');
		self.isoclient.on('data', function() {
			self.onPDUReply.apply(self, arguments);
		});
		self.isoclient.on('error', function() {
			self.readWriteError.apply(self, arguments);
		});
	}else if((data[4] + 1 + 12 + data.readInt16BE(13) === data.readInt16BE(2) - 4)){//valid the length of FA+S7 package :  ISO_Length+ISO_LengthItself+S7Com_Header+S7Com_Header_ParameterLength===TPKT_Length-4
		//Everything OK...go on
		// Track the connection state
		self.isoConnectionState = 4;  // 4 = Received PDU response, good to go
		self.parallelJobsNow = 0;     // We need to zero this here as it can go negative when not connected

		var partnerMaxParallel1 = data.readInt16BE(21);
		var partnerMaxParallel2 = data.readInt16BE(23);
		var partnerPDU = data.readInt16BE(25);

		self.maxParallel = self.requestMaxParallel;

		if (partnerMaxParallel1 < self.requestMaxParallel) {
			self.maxParallel = partnerMaxParallel1;
		}
		if (partnerMaxParallel2 < self.requestMaxParallel) {
			self.maxParallel = partnerMaxParallel2;
		}
		if (partnerPDU < self.requestMaxPDU) {
			self.maxPDU = partnerPDU;
		} else {
			self.maxPDU = self.requestMaxPDU;
		}

		outputLog('Received PDU Response - Proceeding with PDU ' + self.maxPDU + ' and ' + self.maxParallel + ' max parallel connections.', 0, self.connectionID);
		self.isoclient.on('data', function() {
			self.onResponse.apply(self, arguments);
		});  // We need to make sure we don't add this event every time if we call it on data.
		self.isoclient.on('error', function() {
			self.readWriteError.apply(self, arguments);
		});  // Might want to remove the self.connecterror listener
		//self.isoclient.removeAllListeners('error');
		if ((!self.connectCBIssued) && (typeof (self.connectCallback) === "function")) {
			self.connectCBIssued = true;
			self.connectCallback();
		}
	}else{
		outputLog('INVALID Telegram ', 0, self.connectionID);
		outputLog('Byte 0 From Header is ' + theData[0] + ' it has to be 0x03, Byte 5 From Header is  ' + theData[5] + ' and it has to be 0x0F ', 0, self.connectionID);
		outputLog('INVALID PDU RESPONSE or CONNECTION REFUSED - DISCONNECTING', 0, self.connectionID);
		outputLog('TPKT Length From Header is ' + theData.readInt16BE(2) + ' and RCV buffer length is ' + theData.length + ' and COTP length is ' + theData.readUInt8(4) + ' and data[6] is ' + theData[6], 0, self.connectionID);
		outputLog(theData);
		self.isoclient.end();
		clearTimeout(self.reconnectTimer);
		self.reconnectTimer = setTimeout(function() {
			self.connectNow.apply(self, arguments);
		}, 2000, self.connectionParams);
		return null;
	}
}


NodeS7.prototype.writeItems = function(arg, value, cb) {
	var self = this, i;
	outputLog("Preparing to WRITE " + arg + " to value " + value, 0, self.connectionID);
	if (self.isWriting() || self.writeInQueue) {
		outputLog("You must wait until all previous writes have finished before scheduling another. ", 0, self.connectionID);
		return 1;  // Watch for this in your code - 1 means it hasn't actually entered into the queue.
	}

	if (typeof cb === "function") {
		self.writeDoneCallback = cb;
	} else {
		self.writeDoneCallback = doNothing;
	}

	self.instantWriteBlockList = []; // Initialize the array.

	if (typeof arg === "string") {
		self.instantWriteBlockList.push(stringToS7Addr(self.translationCB(arg), arg, self.connectionParams));
		if (typeof (self.instantWriteBlockList[self.instantWriteBlockList.length - 1]) !== "undefined") {
			self.instantWriteBlockList[self.instantWriteBlockList.length - 1].writeValue = value;
		}
	} else if (Array.isArray(arg) && Array.isArray(value) && (arg.length == value.length)) {
		for (i = 0; i < arg.length; i++) {
			if (typeof arg[i] === "string") {
				self.instantWriteBlockList.push(stringToS7Addr(self.translationCB(arg[i]), arg[i], self.connectionParams));
				if (typeof (self.instantWriteBlockList[self.instantWriteBlockList.length - 1]) !== "undefined") {
					self.instantWriteBlockList[self.instantWriteBlockList.length - 1].writeValue = value[i];
				}
			}
		}
	}

	// Validity check.
	for (i = self.instantWriteBlockList.length - 1; i >= 0; i--) {
		if (self.instantWriteBlockList[i] === undefined) {
			self.instantWriteBlockList.splice(i, 1);
			outputLog("Dropping an undefined write item.");
		}
	}
	self.prepareWritePacket();
	if (!self.isReading()) {
		self.sendWritePacket();
	} else {
		if (self.writeInQueue) {
			outputLog("Write was already in queue - should be prevented above",1,self.connectionID);
		}
		self.writeInQueue = true;
		outputLog("Adding write to queue");
	}
	return 0;
}


NodeS7.prototype.findItem = function(useraddr) {
	var self = this, i;
	var commstate = { value: self.isoConnectionState !== 4, quality: 'OK' };
	if (useraddr === '_COMMERR') { return commstate; }
	for (i = 0; i < self.polledReadBlockList.length; i++) {
		if (self.polledReadBlockList[i].useraddr === useraddr) { return self.polledReadBlockList[i]; }
	}
	return undefined;
}

NodeS7.prototype.addItems = function(arg) {
	var self = this;
	self.addRemoveArray.push({ arg: arg, action: 'add' });
}

NodeS7.prototype.addItemsNow = function(arg) {
	var self = this, i;
	outputLog("Adding " + arg, 0, self.connectionID);
	if (typeof (arg) === "string" && arg !== "_COMMERR") {
		self.polledReadBlockList.push(stringToS7Addr(self.translationCB(arg), arg, self.connectionParams));
	} else if (Array.isArray(arg)) {
		for (i = 0; i < arg.length; i++) {
			if (typeof (arg[i]) === "string" && arg[i] !== "_COMMERR") {
				self.polledReadBlockList.push(stringToS7Addr(self.translationCB(arg[i]), arg[i], self.connectionParams));
			}
		}
	}

	// Validity check.
	for (i = self.polledReadBlockList.length - 1; i >= 0; i--) {
		if (self.polledReadBlockList[i] === undefined) {
			self.polledReadBlockList.splice(i, 1);
			outputLog("Dropping an undefined request item.", 0, self.connectionID);
		}
	}
	//	self.prepareReadPacket();
	self.readPacketValid = false;
}

NodeS7.prototype.removeItems = function(arg) {
	var self = this;
	self.addRemoveArray.push({ arg: arg, action: 'remove' });
}

NodeS7.prototype.removeItemsNow = function(arg) {
	var self = this, i;
	if (typeof arg === "undefined") {
		self.polledReadBlockList = [];
	} else if (typeof arg === "string") {
		for (i = 0; i < self.polledReadBlockList.length; i++) {
			outputLog('TCBA ' + self.translationCB(arg));
			if (self.polledReadBlockList[i].addr === self.translationCB(arg)) {
				outputLog('Splicing');
				self.polledReadBlockList.splice(i, 1);
			}
		}
	} else if (Array.isArray(arg)) {
		for (i = 0; i < self.polledReadBlockList.length; i++) {
			for (var j = 0; j < arg.length; j++) {
				if (self.polledReadBlockList[i].addr === self.translationCB(arg[j])) {
					self.polledReadBlockList.splice(i, 1);
				}
			}
		}
	}
	self.readPacketValid = false;
	//	self.prepareReadPacket();
}

NodeS7.prototype.readAllItems = function(arg) {
	var self = this;

	outputLog("Reading All Items (readAllItems was called)", 1, self.connectionID);

	if (typeof arg === "function") {
		self.readDoneCallback = arg;
	} else {
		self.readDoneCallback = doNothing;
	}

	if (self.isoConnectionState !== 4) {
		outputLog("Unable to read when not connected. Return bad values.", 0, self.connectionID);
	} // For better behaviour when auto-reconnecting - don't return now

	// Check if ALL are done...  You might think we could look at parallel jobs, and for the most part we can, but if one just finished and we end up here before starting another, it's bad.
	if (self.isWaiting()) {
		outputLog("Waiting to read for all R/W operations to complete.  Will re-trigger readAllItems in 100ms.", 0, self.connectionID);
		clearTimeout(self.rereadTimer);
		self.rereadTimer = setTimeout(function() {
			self.rereadTimer = undefined; //already fired, can safely discard
			self.readAllItems.apply(self, arguments);
		}, 100, arg);
		return;
	}

	// Now we check the array of adding and removing things.  Only now is it really safe to do this.
	self.addRemoveArray.forEach(function(element) {
		outputLog('Adding or Removing ' + util.format(element), 1, self.connectionID);
		if (element.action === 'remove') {
			self.removeItemsNow(element.arg);
		}
		if (element.action === 'add') {
			self.addItemsNow(element.arg);
		}
	});

	self.addRemoveArray = []; // Clear for next time.

	if (!self.readPacketValid) { self.prepareReadPacket(); }

	// ideally...  incrementSequenceNumbers();

	outputLog("Calling SRP from RAI", 1, self.connectionID);
	self.sendReadPacket(); // Note this sends the first few read packets depending on parallel connection restrictions.
}

NodeS7.prototype.isWaiting = function() {
	var self = this;
	return (self.isReading() || self.isWriting());
}

NodeS7.prototype.isReading = function() {
	var self = this, i;
	// Walk through the array and if any packets are marked as sent, it means we haven't received our final confirmation.
	for (i = 0; i < self.readPacketArray.length; i++) {
		if (self.readPacketArray[i].sent === true) { return true }
	}
	return false;
}

NodeS7.prototype.isWriting = function() {
	var self = this, i;
	// Walk through the array and if any packets are marked as sent, it means we haven't received our final confirmation.
	for (i = 0; i < self.writePacketArray.length; i++) {
		if (self.writePacketArray[i].sent === true) { return true }
	}
	return false;
}


NodeS7.prototype.clearReadPacketTimeouts = function() {
	var self = this, i;
	outputLog('Clearing read PacketTimeouts', 1, self.connectionID);
	// Before we initialize the self.readPacketArray, we need to loop through all of them and clear timeouts.
	for (i = 0; i < self.readPacketArray.length; i++) {
		clearTimeout(self.readPacketArray[i].timeout);
		self.readPacketArray[i].sent = false;
		self.readPacketArray[i].rcvd = false;
	}
}

NodeS7.prototype.clearWritePacketTimeouts = function() {
	var self = this, i;
	outputLog('Clearing write PacketTimeouts', 1, self.connectionID);
	// Before we initialize the self.readPacketArray, we need to loop through all of them and clear timeouts.
	for (i = 0; i < self.writePacketArray.length; i++) {
		clearTimeout(self.writePacketArray[i].timeout);
		self.writePacketArray[i].sent = false;
		self.writePacketArray[i].rcvd = false;
	}
}

NodeS7.prototype.prepareWritePacket = function() {
	var self = this, i;
	var itemList = self.instantWriteBlockList;
	var requestList = [];			// The request list consists of the block list, split into chunks readable by PDU.
	var requestNumber = 0;

	// Sort the items using the sort function, by type and offset.
	itemList.sort(itemListSorter);

	// Just exit if there are no items.
	if (itemList.length === 0) {
		return undefined;
	}

	// Reinitialize the WriteBlockList
	self.globalWriteBlockList = [];

	// At this time we do not do write optimizations.
	// The reason for this is it is would cause numerous issues depending how the code was written in the PLC.
	// If we write M0.1 and M0.2 then to optimize we would have to write MB0, which also writes 0.0, 0.3, 0.4...
	//
	// I suppose when working with integers, if we write MW0 and MW2, we could write these as one block.
	// But if you really, really want the program to do that, write an array yourself.
	self.globalWriteBlockList[0] = itemList[0];
	self.globalWriteBlockList[0].itemReference = [];
	self.globalWriteBlockList[0].itemReference.push(itemList[0]);

	var thisBlock = 0;
	itemList[0].block = thisBlock;
	var maxByteRequest = 4 * Math.floor((self.maxPDU - 18 - 12) / 4);  // Absolutely must not break a real array into two requests.  Maybe we can extend by two bytes when not DINT/REAL/INT.  But modified now for LREAL.
	maxByteRequest = 8 * Math.floor((self.maxPDU - 18 - 12) / 8);
	//	outputLog("Max Write Length is " + maxByteRequest);

	// Just push the items into blocks and figure out the write buffers
	for (i = 0; i < itemList.length; i++) {
		self.globalWriteBlockList[i] = itemList[i]; // Remember - by reference.
		self.globalWriteBlockList[i].isOptimized = false;
		self.globalWriteBlockList[i].itemReference = [];
		self.globalWriteBlockList[i].itemReference.push(itemList[i]);
		bufferizeS7Item(itemList[i]);
	}

	var thisRequest = 0;

	// Split the blocks into requests, if they're too large.
	for (i = 0; i < self.globalWriteBlockList.length; i++) {
		var startByte = self.globalWriteBlockList[i].offset;
		var remainingLength = self.globalWriteBlockList[i].byteLength;
		var lengthOffset = 0;

		// Always create a request for a self.globalReadBlockList.
		requestList[thisRequest] = self.globalWriteBlockList[i].clone();

		// How many parts?
		self.globalWriteBlockList[i].parts = Math.ceil(self.globalWriteBlockList[i].byteLength / maxByteRequest);
		//		outputLog("self.globalWriteBlockList " + i + " parts is " + self.globalWriteBlockList[i].parts + " offset is " + self.globalWriteBlockList[i].offset + " MBR is " + maxByteRequest);

		self.globalWriteBlockList[i].requestReference = [];

		// If we're optimized...
		for (var j = 0; j < self.globalWriteBlockList[i].parts; j++) {
			requestList[thisRequest] = self.globalWriteBlockList[i].clone();
			self.globalWriteBlockList[i].requestReference.push(requestList[thisRequest]);
			requestList[thisRequest].offset = startByte;
			requestList[thisRequest].byteLength = Math.min(maxByteRequest, remainingLength);
			requestList[thisRequest].byteLengthWithFill = requestList[thisRequest].byteLength;
			if (requestList[thisRequest].byteLengthWithFill % 2) { requestList[thisRequest].byteLengthWithFill += 1; }

			// max

			requestList[thisRequest].writeBuffer = self.globalWriteBlockList[i].writeBuffer.slice(lengthOffset, lengthOffset + requestList[thisRequest].byteLengthWithFill);
			requestList[thisRequest].writeQualityBuffer = self.globalWriteBlockList[i].writeQualityBuffer.slice(lengthOffset, lengthOffset + requestList[thisRequest].byteLengthWithFill);
			lengthOffset += self.globalWriteBlockList[i].requestReference[j].byteLength;

			if (self.globalWriteBlockList[i].parts > 1) {
				requestList[thisRequest].datatype = 'BYTE';
				requestList[thisRequest].dtypelen = 1;
				requestList[thisRequest].arrayLength = requestList[thisRequest].byteLength;//self.globalReadBlockList[thisBlock].byteLength;		(This line shouldn't be needed anymore - shouldn't matter)
			}
			remainingLength -= maxByteRequest;
			thisRequest++;
			startByte += maxByteRequest;
		}
	}

	self.clearWritePacketTimeouts();
	self.writePacketArray = [];

	//	outputLog("GWBL is " + self.globalWriteBlockList.length);


	// Before we initialize the self.writePacketArray, we need to loop through all of them and clear timeouts.

	// The packetizer...
	while (requestNumber < requestList.length) {
		// Set up the read packet
		// Yes this is the same master sequence number shared with the read queue

		var numItems = 0;

		// Maybe this shouldn't really be here?
		self.writeReqHeader.copy(self.writeReq, 0);

		// Packet's length
		var packetWriteLength = 10 + 4;  // 10 byte header and 4 byte param header

		self.writePacketArray.push(new S7Packet());
		var thisPacketNumber = self.writePacketArray.length - 1;
		self.writePacketArray[thisPacketNumber].seqNum = self.getNextSeqNum();
		//		outputLog("Write Sequence Number is " + self.writePacketArray[thisPacketNumber].seqNum);

		self.writePacketArray[thisPacketNumber].itemList = [];  // Initialize as array.

		for (i = requestNumber; i < requestList.length; i++) {
			//outputLog("Number is " + (requestList[i].byteLengthWithFill + 4 + packetReplyLength));
			if (requestList[i].byteLengthWithFill + 12 + 4 + packetWriteLength > self.maxPDU) { // 12 byte header for each item and 4 bytes for the data header
				if (numItems === 0) {
					outputLog("breaking when we shouldn't, byte length with fill is  " + requestList[i].byteLengthWithFill + " max byte request " + maxByteRequest, 0, self.connectionID);
					throw new Error("Somehow write request didn't split properly - exiting.  Report this as a bug.");
				}
				break;  // We can't fit this packet in here.
			}
			requestNumber++;
			numItems++;
			packetWriteLength += (requestList[i].byteLengthWithFill + 12 + 4); // Don't forget each request has a 12 byte header as well.
			//outputLog('I is ' + i + ' Addr Type is ' + requestList[i].addrtype + ' and type is ' + requestList[i].datatype + ' and DBNO is ' + requestList[i].dbNumber + ' and offset is ' + requestList[i].offset + ' bit ' + requestList[i].bitOffset + ' len ' + requestList[i].arrayLength);
			//S7AddrToBuffer(requestList[i]).copy(self.writeReq, 19 + numItems * 12);  // i or numItems?  used to be i.
			//itemBuffer = bufferizeS7Packet(requestList[i]);
			//itemBuffer.copy(dataBuffer, dataBufferPointer);
			//dataBufferPointer += itemBuffer.length;
			self.writePacketArray[thisPacketNumber].itemList.push(requestList[i]);
		}
		//		dataBuffer.copy(self.writeReq, 19 + (numItems + 1) * 12, 0, dataBufferPointer - 1);
	}
}


NodeS7.prototype.prepareReadPacket = function() {
	var self = this, i;
	// Note that for a PDU size of 240, the MOST bytes we can request depends on the number of items.
	// To figure this out, allow for a 247 byte packet.  7 TPKT+COTP header doesn't count for PDU, so 240 bytes of "S7 data".
	// In the response you ALWAYS have a 12 byte S7 header.
	// Then you have a 2 byte parameter header.
	// Then you have a 4 byte "item header" PER ITEM.
	// So you have overhead of 18 bytes for one item, 22 bytes for two items, 26 bytes for 3 and so on.  So for example you can request 240 - 22 = 218 bytes for two items.

	// We can calculate a max byte length for single request as 4*Math.floor((self.maxPDU - 18)/4) - to ensure we don't cross boundaries.

	var itemList = self.polledReadBlockList;				// The items are the actual items requested by the user
	var requestList = [];						// The request list consists of the block list, split into chunks readable by PDU.

	// Validity check.
	for (i = itemList.length - 1; i >= 0; i--) {
		if (itemList[i] === undefined) {
			itemList.splice(i, 1);
			outputLog("Dropping an undefined request item.", 0, self.connectionID);
		}
	}

	// Sort the items using the sort function, by type and offset.
	itemList.sort(itemListSorter);

	// Just exit if there are no items.
	if (itemList.length === 0) {
		return undefined;
	}

	self.globalReadBlockList = [];

	// ...because you have to start your optimization somewhere.
	self.globalReadBlockList[0] = itemList[0];
	self.globalReadBlockList[0].itemReference = [];
	self.globalReadBlockList[0].itemReference.push(itemList[0]);

	var thisBlock = 0;
	itemList[0].block = thisBlock;
	var maxByteRequest = 4 * Math.floor((self.maxPDU - 18) / 4);  // Absolutely must not break a real array into two requests.  Maybe we can extend by two bytes when not DINT/REAL/INT.

	// Optimize the items into blocks
	for (i = 1; i < itemList.length; i++) {
		// Skip T, C, P types
		if ((itemList[i].areaS7Code !== self.globalReadBlockList[thisBlock].areaS7Code) ||   	// Can't optimize between areas
			(itemList[i].dbNumber !== self.globalReadBlockList[thisBlock].dbNumber) ||			// Can't optimize across DBs
			(!self.isOptimizableArea(itemList[i].areaS7Code)) || 					// Can't optimize T,C (I don't think) and definitely not P.
			((itemList[i].offset - self.globalReadBlockList[thisBlock].offset + itemList[i].byteLength) > maxByteRequest) ||      	// If this request puts us over our max byte length, create a new block for consistency reasons.
			(itemList[i].offset - (self.globalReadBlockList[thisBlock].offset + self.globalReadBlockList[thisBlock].byteLength) > self.maxGap)) {		// If our gap is large, create a new block.

			outputLog("Skipping optimization of item " + itemList[i].addr, 0, self.connectionID);

			// At this point we give up and create a new block.
			thisBlock = thisBlock + 1;
			self.globalReadBlockList[thisBlock] = itemList[i]; // By reference.
			//				itemList[i].block = thisBlock; // Don't need to do this.
			self.globalReadBlockList[thisBlock].isOptimized = false;
			self.globalReadBlockList[thisBlock].itemReference = [];
			self.globalReadBlockList[thisBlock].itemReference.push(itemList[i]);
		} else {
			outputLog("Attempting optimization of item " + itemList[i].addr + " with " + self.globalReadBlockList[thisBlock].addr, 0, self.connectionID);
			// This next line checks the maximum.
			// Think of this situation - we have a large request of 40 bytes starting at byte 10.
			//	Then someone else wants one byte starting at byte 12.  The block length doesn't change.
			//
			// But if we had 40 bytes starting at byte 10 (which gives us byte 10-49) and we want byte 50, our byte length is 50-10 + 1 = 41.
			self.globalReadBlockList[thisBlock].byteLength = Math.max(self.globalReadBlockList[thisBlock].byteLength, itemList[i].offset - self.globalReadBlockList[thisBlock].offset + itemList[i].byteLength);

			// Point the buffers (byte and quality) to a sliced version of the optimized block.  This is by reference (same area of memory)
			itemList[i].byteBuffer = self.globalReadBlockList[thisBlock].byteBuffer.slice(itemList[i].offset - self.globalReadBlockList[thisBlock].offset, itemList[i].offset - self.globalReadBlockList[thisBlock].offset + itemList[i].byteLength);
			itemList[i].qualityBuffer = self.globalReadBlockList[thisBlock].qualityBuffer.slice(itemList[i].offset - self.globalReadBlockList[thisBlock].offset, itemList[i].offset - self.globalReadBlockList[thisBlock].offset + itemList[i].byteLength);

			// For now, change the request type here, and fill in some other things.

			// I am not sure we want to do these next two steps.
			// It seems like things get screwed up when we do this.
			// Since self.globalReadBlockList[thisBlock] exists already at this point, and our buffer is already set, let's not do this now.
			// self.globalReadBlockList[thisBlock].datatype = 'BYTE';
			// self.globalReadBlockList[thisBlock].dtypelen = 1;
			self.globalReadBlockList[thisBlock].isOptimized = true;
			self.globalReadBlockList[thisBlock].itemReference.push(itemList[i]);
		}
	}

	var thisRequest = 0;

	//	outputLog("Preparing the read packet...");

	// Split the blocks into requests, if they're too large.
	for (i = 0; i < self.globalReadBlockList.length; i++) {
		// Always create a request for a self.globalReadBlockList.
		requestList[thisRequest] = self.globalReadBlockList[i].clone();

		// How many parts?
		self.globalReadBlockList[i].parts = Math.ceil(self.globalReadBlockList[i].byteLength / maxByteRequest);
		outputLog("self.globalReadBlockList " + i + " parts is " + self.globalReadBlockList[i].parts + " offset is " + self.globalReadBlockList[i].offset + " MBR is " + maxByteRequest, 1, self.connectionID);
		var startByte = self.globalReadBlockList[i].offset;
		var remainingLength = self.globalReadBlockList[i].byteLength;

		self.globalReadBlockList[i].requestReference = [];

		// If we're optimized...
		for (var j = 0; j < self.globalReadBlockList[i].parts; j++) {
			requestList[thisRequest] = self.globalReadBlockList[i].clone();
			self.globalReadBlockList[i].requestReference.push(requestList[thisRequest]);
			//outputLog(self.globalReadBlockList[i]);
			//outputLog(self.globalReadBlockList.slice(i,i+1));
			requestList[thisRequest].offset = startByte;
			requestList[thisRequest].byteLength = Math.min(maxByteRequest, remainingLength);
			requestList[thisRequest].byteLengthWithFill = requestList[thisRequest].byteLength;
			if (requestList[thisRequest].byteLengthWithFill % 2) { requestList[thisRequest].byteLengthWithFill += 1; }
			// Just for now...
			if (self.globalReadBlockList[i].parts > 1) {
				requestList[thisRequest].datatype = 'BYTE';
				requestList[thisRequest].dtypelen = 1;
				requestList[thisRequest].arrayLength = requestList[thisRequest].byteLength;//self.globalReadBlockList[thisBlock].byteLength;
			}
			remainingLength -= maxByteRequest;
			thisRequest++;
			startByte += maxByteRequest;
		}
	}

	//requestList[5].offset = 243;
	//	requestList = self.globalReadBlockList;

	// The packetizer...
	var requestNumber = 0;

	self.clearReadPacketTimeouts();
	self.readPacketArray = [];

	while (requestNumber < requestList.length) {

		var numItems = 0;
		self.readReqHeader.copy(self.readReq, 0);

		// Packet's expected reply length
		var packetReplyLength = 12 + 2;  //
		var packetRequestLength = 12; //s7 header and parameter header

		self.readPacketArray.push(new S7Packet());
		var thisPacketNumber = self.readPacketArray.length - 1;
		// don't set a fixed sequence number here. Instead, set it just before sending to avoid conflict with write sequence numbers
		self.readPacketArray[thisPacketNumber].seqNum = 0;
		self.readPacketArray[thisPacketNumber].itemList = [];  // Initialize as array.

		for (i = requestNumber; i < requestList.length; i++) {
			//outputLog("Number is " + (requestList[i].byteLengthWithFill + 4 + packetReplyLength));
			if (requestList[i].byteLengthWithFill + 4 + packetReplyLength > self.maxPDU || packetRequestLength + 12 > self.maxPDU) {
				outputLog("Splitting request: " + numItems + " items, requestLength would be " + (packetRequestLength + 12) + ", replyLength would be " + (requestList[i].byteLengthWithFill + 4 + packetReplyLength) + ", PDU is " + self.maxPDU, 1, self.connectionID);
				if (numItems === 0) {
					outputLog("breaking when we shouldn't, rlibl " + requestList[i].byteLengthWithFill + " MBR " + maxByteRequest, 0, self.connectionID);
					throw new Error("Somehow write request didn't split properly - exiting.  Report this as a bug.");
				}
				break;  // We can't fit this packet in here.
			}
			requestNumber++;
			numItems++;
			packetReplyLength += (requestList[i].byteLengthWithFill + 4);
			packetRequestLength += 12;
			//outputLog('I is ' + i + ' Addr Type is ' + requestList[i].addrtype + ' and type is ' + requestList[i].datatype + ' and DBNO is ' + requestList[i].dbNumber + ' and offset is ' + requestList[i].offset + ' bit ' + requestList[i].bitOffset + ' len ' + requestList[i].arrayLength);
			// skip this for now S7AddrToBuffer(requestList[i]).copy(self.readReq, 19 + numItems * 12);  // i or numItems?
			self.readPacketArray[thisPacketNumber].itemList.push(requestList[i]);
		}
	}
	self.readPacketValid = true;
}

NodeS7.prototype.sendReadPacket = function() {
	var self = this, i, j, flagReconnect = false;

	outputLog("SendReadPacket called", 1, self.connectionID);

	if (!self.readPacketArray.length && (typeof(self.readDoneCallback) === "function")) {
		// Call back the callback if we are being asked for zero tags - for consistency
		self.readDoneCallback(false, {}); // Data is second argument and shouldn't be undefined
	}

	for (i = 0; i < self.readPacketArray.length; i++) {
		if (self.readPacketArray[i].sent) { continue; }
		if (self.parallelJobsNow >= self.maxParallel) { continue; }

		// Set sequence number of packet here
		self.readPacketArray[i].seqNum = self.getNextSeqNum();

		// From here down is SENDING the packet
		self.readPacketArray[i].reqTime = process.hrtime();
		self.readReq.writeUInt8(self.readPacketArray[i].itemList.length, 18);
		self.readReq.writeUInt16BE(19 + self.readPacketArray[i].itemList.length * 12, 2); // buffer length
		self.readReq.writeUInt16BE(self.readPacketArray[i].seqNum, 11);
		self.readReq.writeUInt16BE(self.readPacketArray[i].itemList.length * 12 + 2, 13); // Parameter length - 14 for one read, 28 for 2.

		for (j = 0; j < self.readPacketArray[i].itemList.length; j++) {
			S7AddrToBuffer(self.readPacketArray[i].itemList[j], false).copy(self.readReq, 19 + j * 12);
		}

		if (self.isoConnectionState == 4) {
			outputLog('Sending Read Packet With Sequence Number ' + self.readPacketArray[i].seqNum, 1, self.connectionID);

			self.readPacketArray[i].timeout = setTimeout(function() {
				self.packetTimeout.apply(self, arguments);
			}, self.globalTimeout, "read", self.readPacketArray[i].seqNum);
			self.isoclient.write(self.readReq.slice(0, 19 + self.readPacketArray[i].itemList.length * 12));  // was 31
			self.readPacketArray[i].sent = true;
			self.readPacketArray[i].rcvd = false;
			self.readPacketArray[i].timeoutError = false;
			self.parallelJobsNow += 1;
		} else {
			//			outputLog('Somehow got into read block without proper self.isoConnectionState of 3.  Disconnect.');
			//			self.isoclient.end();
			//			setTimeout(function(){
			//				self.connectNow.apply(self, arguments);
			//			}, 2000, self.connectionParams);
			// self.parallelJobsNow += 1;  // Note that we don't do this here - we want all packets to time out at once when not connected. 
			self.readPacketArray[i].sent = true;
			self.readPacketArray[i].rcvd = false;
			self.readPacketArray[i].timeoutError = true;
			if (!flagReconnect) {
				// Prevent duplicates
				outputLog('Not Sending Read Packet because we are not connected - ISO CS is ' + self.isoConnectionState, 0, self.connectionID);
			}
			// This is essentially an instantTimeout.
			if (self.isoConnectionState === 0) {
				flagReconnect = true;
			}
			outputLog('Requesting PacketTimeout Due to ISO CS NOT 4 - READ SN ' + self.readPacketArray[i].seqNum, 1, self.connectionID);
			self.readPacketArray[i].timeout = setTimeout(function() {
				self.packetTimeout.apply(self, arguments);
			}, 0, "read", self.readPacketArray[i].seqNum);
		}
	}

/* NOTE: We no longer do this here.
Reconnects are done on the response that we will get from the above packets.
Reason: We could have some packets waiting for timeout from the PLC, and others coming back instantly.
	if (flagReconnect) {
		//		console.log("Asking for callback next tick and my ID is " + self.connectionID);
		clearTimeout(self.reconnectTimer)
		self.reconnectTimer = setTimeout(function() {
			//			console.log("Next tick is here and my ID is " + self.connectionID);
			outputLog("The scheduled reconnect from sendReadPacket is happening now", 1, self.connectionID);
			self.connectNow(self.connectionParams);  // We used to do this NOW - not NextTick() as we need to mark isoConnectionState as 1 right now.  Otherwise we queue up LOTS of connects and crash.
		}, 0);
	}
*/

}


NodeS7.prototype.sendWritePacket = function() {
	var self = this, i, dataBuffer, itemBuffer, dataBufferPointer, flagReconnect;

	dataBuffer = Buffer.alloc(8192);

	self.writeInQueue = false;

	for (i = 0; i < self.writePacketArray.length; i++) {
		if (self.writePacketArray[i].sent) { continue; }
		if (self.parallelJobsNow >= self.maxParallel) { continue; }
		// From here down is SENDING the packet
		self.writePacketArray[i].reqTime = process.hrtime();
		self.writeReq.writeUInt8(self.writePacketArray[i].itemList.length, 18);
		self.writeReq.writeUInt16BE(self.writePacketArray[i].seqNum, 11);

		dataBufferPointer = 0;
		for (var j = 0; j < self.writePacketArray[i].itemList.length; j++) {
			S7AddrToBuffer(self.writePacketArray[i].itemList[j], true).copy(self.writeReq, 19 + j * 12);
			itemBuffer = getWriteBuffer(self.writePacketArray[i].itemList[j]);
			itemBuffer.copy(dataBuffer, dataBufferPointer);
			dataBufferPointer += itemBuffer.length;
			// NOTE: It seems that when writing, the data that is sent must have a "fill byte" so that data length is even only for all
			//  but the last request.  The last request must have no padding.  So we add the padding here.
			if (j < (self.writePacketArray[i].itemList.length - 1)) {
				if (itemBuffer.length % 2) {
					dataBufferPointer += 1;
				}
			}
		}

		//		outputLog('DataBufferPointer is ' + dataBufferPointer);
		self.writeReq.writeUInt16BE(19 + self.writePacketArray[i].itemList.length * 12 + dataBufferPointer, 2); // buffer length
		self.writeReq.writeUInt16BE(self.writePacketArray[i].itemList.length * 12 + 2, 13); // Parameter length - 14 for one read, 28 for 2.
		self.writeReq.writeUInt16BE(dataBufferPointer, 15); // Data length - as appropriate.

		dataBuffer.copy(self.writeReq, 19 + self.writePacketArray[i].itemList.length * 12, 0, dataBufferPointer);

		if (self.isoConnectionState === 4) {
			//			outputLog('writing' + (19+dataBufferPointer+self.writePacketArray[i].itemList.length*12));
			self.writePacketArray[i].timeout = setTimeout(function() {
				self.packetTimeout.apply(self, arguments);
			}, self.globalTimeout, "write", self.writePacketArray[i].seqNum);
			self.isoclient.write(self.writeReq.slice(0, 19 + dataBufferPointer + self.writePacketArray[i].itemList.length * 12));  // was 31
			self.writePacketArray[i].sent = true;
			self.writePacketArray[i].rcvd = false;
			self.writePacketArray[i].timeoutError = false;
			self.parallelJobsNow += 1;
			outputLog('Sending Write Packet With Sequence Number ' + self.writePacketArray[i].seqNum, 1, self.connectionID);
		} else {
			//			outputLog('Somehow got into write block without proper isoConnectionState of 4.  Disconnect.');
			//			connectionReset();
			//			setTimeout(connectNow, 2000, connectionParams);
			// This is essentially an instantTimeout.
			self.writePacketArray[i].sent = true;
			self.writePacketArray[i].rcvd = false;
			self.writePacketArray[i].timeoutError = true;

			// Without the scopePlaceholder, this doesn't work.   writePacketArray[i] becomes undefined.
			// The reason is that the value i is part of a closure and when seen "nextTick" has the same value
			// it would have just after the FOR loop is done.
			// (The FOR statement will increment it to beyond the array, then exit after the condition fails)
			// scopePlaceholder works as the array is de-referenced NOW, not "nextTick".
//dm			var scopePlaceholder = self.writePacketArray[i].seqNum;
//dm			process.nextTick(function() {
//dm				self.packetTimeout("write", scopePlaceholder);
//dm			});

			self.writePacketArray[i].timeout = setTimeout(function () {
				self.packetTimeout.apply(self, arguments);
			}, 0, "write", self.writePacketArray[i].seqNum);

			if (self.isoConnectionState === 0) {
				flagReconnect = true;
			}
		}
	}
/* NOTE: We no longer do this here.
Reconnects are done on the response that we will get from the above packets.
Reason: We could have some packets waiting for timeout from the PLC, and others coming back instantly.	
	if (flagReconnect) {
		//		console.log("Asking for callback next tick and my ID is " + self.connectionID);
		clearTimeout(self.reconnectTimer);
		self.reconnectTimer = setTimeout(function() {
			//			console.log("Next tick is here and my ID is " + self.connectionID);
			outputLog("The scheduled reconnect from sendWritePacket is happening now", 1, self.connectionID);
			self.connectNow(self.connectionParams);  // We used to do this NOW - not NextTick() as we need to mark isoConnectionState as 1 right now.  Otherwise we queue up LOTS of connects and crash.
		}, 0);
	}*/
}

NodeS7.prototype.isOptimizableArea = function(area) {
	var self = this;

	if (self.doNotOptimize) { return false; } // Are we skipping all optimization due to user request?
	switch (area) {
		case 0x84: // db
		case 0x81: // input bytes
		case 0x82: // output bytes
		case 0x83: // memory bytes
			return true;
		default:
			return false;
	}
}

NodeS7.prototype.onResponse = function(theData) {
	var self = this;
	// Packet Validity Check.  Note that this will pass even with a "not available" response received from the server.
	// For length calculation and verification:
	// data[4] = COTP header length. Normally 2.  This doesn't include the length byte so add 1.
	// read(13) is parameter length.  Normally 4.
	// read(14) is data length.  (Includes item headers)
	// 12 is length of "S7 header"
	// Then we need to add 4 for TPKT header.

	// Decrement our parallel jobs now

	// NOT SO FAST - can't do this here.  If we time out, then later get the reply, we can't decrement this twice.  Or the CPU will not like us.  Do it if not rcvd.  self.parallelJobsNow--;

	// hotfix for #78, prevents RangeErrors for undersized packets
	if (!(theData && theData.length > 6)) {
		outputLog('INVALID READ RESPONSE - DISCONNECTING');
		outputLog("The incoming packet doesn't have the required minimum length of 7 bytes");
		outputLog(theData);
		self.connectionReset();
		return;
	}

	var data=checkRFCData(theData);

	if(data==="fastACK"){
		//read again and wait for the requested data
		outputLog('Fast Acknowledge received.', 0, self.connectionID);
		self.isoclient.removeAllListeners('error');
		self.isoclient.removeAllListeners('data');
		self.isoclient.on('data', function() {
			self.onResponse.apply(self, arguments);
		});
		self.isoclient.on('error', function() {
			self.readWriteError.apply(self, arguments);
		});
	}else if( data[7] === 0x32 ){//check the validy of FA+S7 package

		//*********************   VALIDY CHECK ***********************************
		//TODO: Check S7-Header properly
		if (data.length > 8 && data[8] != 3) {
			outputLog('PDU type (byte 8) was returned as ' + data[8] + ' where the response PDU of 3 was expected.');
			outputLog('Maybe you are requesting more than 240 bytes of data in a packet?');
			outputLog(data);
			self.connectionReset();
			return null;
		}
		// The smallest read packet will pass a length check of 25.  For a 1-item write response with no data, length will be 22.
		if (data.length > data.readInt16BE(2)) {
			outputLog("An oversize packet was detected.  Excess length is " + (data.length - data.readInt16BE(2)) + ".  ");
			outputLog("We assume this is because two packets were sent at nearly the same time by the PLC.");
			outputLog("We are slicing the buffer and scheduling the second half for further processing next loop.");
			setTimeout(function() {
				self.onResponse.apply(self, arguments);
			}, 0, data.slice(data.readInt16BE(2)));  // This re-triggers this same function with the sliced-up buffer.
			// was used as a test		setTimeout(process.exit, 2000);
		}

		if (data.length < data.readInt16BE(2) || data.readInt16BE(2) < 22 || data[5] !== 0xf0 || data[4] + 1 + 12 + 4 + data.readInt16BE(13) + data.readInt16BE(15) !== data.readInt16BE(2) || !(data[6] >> 7) || (data[7] !== 0x32) || (data[8] !== 3)) {
			outputLog('INVALID READ RESPONSE - DISCONNECTING');
			outputLog('TPKT Length From Header is ' + data.readInt16BE(2) + ' and RCV buffer length is ' + data.length + ' and COTP length is ' + data.readUInt8(4) + ' and data[6] is ' + data[6]);
			outputLog(data);
			self.connectionReset();
			return null;
		}

		//**********************   GO ON  *************************
		// Log the receive
		outputLog('Received ' + data.readUInt16BE(15) + ' bytes of S7-data from PLC.  Sequence number is ' + data.readUInt16BE(11), 1, self.connectionID);

		// Check the sequence number
		var foundSeqNum; // self.readPacketArray.length - 1;
		var isReadResponse, isWriteResponse;

		//	for (packetCount = 0; packetCount < self.readPacketArray.length; packetCount++) {
		//		if (self.readPacketArray[packetCount].seqNum == data.readUInt16BE(11)) {
		//			foundSeqNum = packetCount;
		//			break;
		//		}
		//	}
		foundSeqNum = self.findReadIndexOfSeqNum(data.readUInt16BE(11));

		//	if (self.readPacketArray[packetCount] == undefined) {
		if (foundSeqNum === undefined) {
			foundSeqNum = self.findWriteIndexOfSeqNum(data.readUInt16BE(11));
			if (foundSeqNum !== undefined) {
				//		for (packetCount = 0; packetCount < self.writePacketArray.length; packetCount++) {
				//			if (self.writePacketArray[packetCount].seqNum == data.readUInt16BE(11)) {
				//				foundSeqNum = packetCount;
				self.writeResponse(data, foundSeqNum);
				isWriteResponse = true;
				//				break;
			}


		} else {
			isReadResponse = true;
			self.readResponse(data, foundSeqNum);
		}

		if ((!isReadResponse) && (!isWriteResponse)) {
			outputLog("Sequence number that arrived wasn't a write reply either - dropping");
			outputLog(data);
			// 	I guess this isn't a showstopper, just ignore it.
			//		self.isoclient.end();
			//		setTimeout(self.connectNow, 2000, self.connectionParams);
			return null;
		}

	}else{
		outputLog('INVALID READ RESPONSE - DISCONNECTING');
		outputLog('TPKT Length From Header is ' + theData.readInt16BE(2) + ' and RCV buffer length is ' + theData.length + ' and COTP length is ' + theData.readUInt8(4) + ' and data[6] is ' + theData[6]);
		outputLog(theData);
		self.connectionReset();
		return null;
	}

}

NodeS7.prototype.findReadIndexOfSeqNum = function(seqNum) {
	var self = this, packetCounter;
	for (packetCounter = 0; packetCounter < self.readPacketArray.length; packetCounter++) {
		if (self.readPacketArray[packetCounter].seqNum == seqNum) {
			return packetCounter;
		}
	}
	return undefined;
}

NodeS7.prototype.findWriteIndexOfSeqNum = function(seqNum) {
	var self = this, packetCounter;
	for (packetCounter = 0; packetCounter < self.writePacketArray.length; packetCounter++) {
		if (self.writePacketArray[packetCounter].seqNum == seqNum) {
			return packetCounter;
		}
	}
	return undefined;
}

NodeS7.prototype.writeResponse = function(data, foundSeqNum) {
	var self = this, dataPointer = 21, i, anyBadQualities;

	for (var itemCount = 0; itemCount < self.writePacketArray[foundSeqNum].itemList.length; itemCount++) {
		//		outputLog('Pointer is ' + dataPointer);
		dataPointer = processS7WriteItem(data, self.writePacketArray[foundSeqNum].itemList[itemCount], dataPointer);
		if (!dataPointer) {
			outputLog('Stopping Processing Write Response Packet due to unrecoverable packet error');
			break;
		}
	}

	// Make a note of the time it took the PLC to process the request.
	self.writePacketArray[foundSeqNum].reqTime = process.hrtime(self.writePacketArray[foundSeqNum].reqTime);
	outputLog('Time is ' + self.writePacketArray[foundSeqNum].reqTime[0] + ' seconds and ' + Math.round(self.writePacketArray[foundSeqNum].reqTime[1] * 10 / 1e6) / 10 + ' ms.', 1, self.connectionID);

	//	self.writePacketArray.splice(foundSeqNum, 1);
	if (!self.writePacketArray[foundSeqNum].rcvd) {
		self.writePacketArray[foundSeqNum].rcvd = true;
		self.parallelJobsNow--;
	}
	clearTimeout(self.writePacketArray[foundSeqNum].timeout);

	if (!self.writePacketArray.every(doneSending)) {
		outputLog("Not done sending - sending more packets from writeResponse",1,self.connectionID);
		self.sendWritePacket();
	} else {
		outputLog("Received all packets in writeResponse",1,self.connectionID);
		for (i = 0; i < self.writePacketArray.length; i++) {
			self.writePacketArray[i].sent = false;
			self.writePacketArray[i].rcvd = false;
		}

		anyBadQualities = false;

		for (i = 0; i < self.globalWriteBlockList.length; i++) {
			// Post-process the write code and apply the quality.
			// Loop through the global block list...
			writePostProcess(self.globalWriteBlockList[i]);
			for (var k = 0; k < self.globalWriteBlockList[i].itemReference.length; k++) {
				outputLog(self.globalWriteBlockList[i].itemReference[k].addr + ' write completed with quality ' + self.globalWriteBlockList[i].itemReference[k].writeQuality, 0, self.connectionID);
				if (!isQualityOK(self.globalWriteBlockList[i].itemReference[k].writeQuality)) {
					anyBadQualities = true;
				}
			}
//			outputLog(self.globalWriteBlockList[i].addr + ' write completed with quality ' + self.globalWriteBlockList[i].writeQuality, 1, self.connectionID);
			if (!isQualityOK(self.globalWriteBlockList[i].writeQuality)) { anyBadQualities = true; }
		}
		if (self.resetPending) {
			outputLog('Calling reset from writeResponse as there is one pending',0,self.connectionID);
			self.resetNow();
		}
		if (self.isoConnectionState === 0) {
			self.connectNow(self.connectionParams, false);
		}
		outputLog('We are calling back our writeDoneCallback.',1,self.connectionID);
		if (typeof(self.writeDoneCallback) === 'function') {
			self.writeDoneCallback(anyBadQualities);
		}
	}
}

function doneSending(element) {
	return ((element.sent && element.rcvd) ? true : false);
}

NodeS7.prototype.readResponse = function(data, foundSeqNum) {
	var self = this, i;
	var anyBadQualities;
	var dataPointer = 21; // For non-routed packets we start at byte 21 of the packet.  If we do routing it will be more than this.
	var dataObject = {};

	//	if (self.readPacketArray.timeod (i forget what was going on here)
	//	if (typeof(data) === "undefined") {
	//		outputLog("Undefined " + foundSeqNum);
	//	} else {
	//		outputLog("Defined " + foundSeqNum);
	//	}

	outputLog("ReadResponse called", 1, self.connectionID);

	if (!self.readPacketArray[foundSeqNum].sent) {
		outputLog('WARNING: Received a read response packet that was not marked as sent', 0, self.connectionID);
		//TODO - fix the network unreachable error that made us do this
		return null;
	}

	if (self.readPacketArray[foundSeqNum].rcvd) {
		outputLog('WARNING: Received a read response packet that was already marked as received', 0, self.connectionID);
		return null;
	}

	for (var itemCount = 0; itemCount < self.readPacketArray[foundSeqNum].itemList.length; itemCount++) {
		dataPointer = processS7Packet(data, self.readPacketArray[foundSeqNum].itemList[itemCount], dataPointer, self.connectionID);
		if (!dataPointer) {
			outputLog('Received a ZERO RESPONSE Processing Read Packet due to unrecoverable packet error', 0, self.connectionID);
			// We rely on this for our timeout.
		}
	}

	// Make a note of the time it took the PLC to process the request.
	self.readPacketArray[foundSeqNum].reqTime = process.hrtime(self.readPacketArray[foundSeqNum].reqTime);
	outputLog('Time is ' + self.readPacketArray[foundSeqNum].reqTime[0] + ' seconds and ' + Math.round(self.readPacketArray[foundSeqNum].reqTime[1] * 10 / 1e6) / 10 + ' ms.', 1, self.connectionID);

	// Do the bookkeeping for packet and timeout.
	if (!self.readPacketArray[foundSeqNum].rcvd) {
		self.readPacketArray[foundSeqNum].rcvd = true;
		self.parallelJobsNow--;
	}
	clearTimeout(self.readPacketArray[foundSeqNum].timeout);

	if (self.readPacketArray.every(doneSending)) {  // if sendReadPacket returns true we're all done.
		// Mark our packets unread for next time.
		for (i = 0; i < self.readPacketArray.length; i++) {
			self.readPacketArray[i].sent = false;
			self.readPacketArray[i].rcvd = false;
		}

		anyBadQualities = false;

		// Loop through the global block list...
		for (i = 0; i < self.globalReadBlockList.length; i++) {
			var lengthOffset = 0;
			// For each block, we loop through all the requests.  Remember, for all but large arrays, there will only be one.
			for (var j = 0; j < self.globalReadBlockList[i].requestReference.length; j++) {
				// Now that our request is complete, we reassemble the BLOCK byte buffer as a copy of each and every request byte buffer.
				self.globalReadBlockList[i].requestReference[j].byteBuffer.copy(self.globalReadBlockList[i].byteBuffer, lengthOffset, 0, self.globalReadBlockList[i].requestReference[j].byteLength);
				self.globalReadBlockList[i].requestReference[j].qualityBuffer.copy(self.globalReadBlockList[i].qualityBuffer, lengthOffset, 0, self.globalReadBlockList[i].requestReference[j].byteLength);
				lengthOffset += self.globalReadBlockList[i].requestReference[j].byteLength;
			}
			// For each ITEM reference pointed to by the block, we process the item.
			for (var k = 0; k < self.globalReadBlockList[i].itemReference.length; k++) {
				processS7ReadItem(self.globalReadBlockList[i].itemReference[k]);
				outputLog('Address ' + self.globalReadBlockList[i].itemReference[k].addr + ' has value ' + self.globalReadBlockList[i].itemReference[k].value + ' and quality ' + self.globalReadBlockList[i].itemReference[k].quality, 1, self.connectionID);
				if (!isQualityOK(self.globalReadBlockList[i].itemReference[k].quality)) {
					anyBadQualities = true;
					dataObject[self.globalReadBlockList[i].itemReference[k].useraddr] = self.globalReadBlockList[i].itemReference[k].quality;
				} else {
					dataObject[self.globalReadBlockList[i].itemReference[k].useraddr] = self.globalReadBlockList[i].itemReference[k].value;
				}
			}
		}

// Not as of Feb 2019		if (self.resetPending) {
// Not as of Feb 2019			self.resetNow();
// Not as of Feb 2019		}

		if (!self.writeInQueue) {
			if (self.resetPending) {
				outputLog('Calling reset from readResponse as there is one pending',0,self.connectionID);
				self.resetNow();
			}
			if (self.isoConnectionState === 0) {
				self.connectNow(self.connectionParams, false);
			}
		} else {
			outputLog('Write In Queue.  ICS ' + self.isoConnectionState + ' resetPending ' + self.resetPending,1,self.connectionID);		
		}

		// Inform our user that we are done and that the values are ready for pickup.
		outputLog("We are calling back our readDoneCallback.", 1, self.connectionID);
		if (typeof (self.readDoneCallback) === 'function') {
			self.readDoneCallback(anyBadQualities, dataObject);
		}

		if (!self.isReading() && self.writeInQueue) {
			outputLog("SendWritePacket called because write was queued.", 0, self.connectionID);
			self.sendWritePacket();
		}
	} else {
		self.sendReadPacket();
	}
}


NodeS7.prototype.onClientDisconnect = function() {
	var self = this;
	outputLog('ISO-on-TCP connection DISCONNECTED.', 0, self.connectionID);

	// We issue the callback here for Trela/Honcho - in some cases TCP connects, and ISO-on-TCP doesn't.
	// If this is the case we need to issue the Connect CB in order to keep trying.
	if ((!self.connectCBIssued) && (typeof (self.connectCallback) === "function")) {
		self.connectCBIssued = true;
		self.connectCallback("Error - TCP connected, ISO didn't");
	}

	// We used to call self.connectionCleanup() - in other words we would give up.
	// However - realize that this event is called when the OTHER END of the connection sends a FIN packet.
	// Certain situations (download user program to mem card on S7-400, pop memory card out of S7-300, both with NetLink) cause this to happen.
	// So now, let's try a "connetionReset".  This way, we are guaranteed to return values (or bad) and reset at the proper time.
	// self.connectionCleanup();
	self.connectionReset();
}

NodeS7.prototype.onClientClose = function() {
	var self = this;
    // clean up the connection now the socket has closed
		// We used to call self.connectionCleanup() here, but it caused problems.
		// However - realize that this event is also called when the OTHER END of the connection sends a FIN packet.
		// Certain situations (download user program to mem card on S7-400, pop memory card out of S7-300, both with NetLink) cause this to happen.
		// So now, let's try a "connetionReset".  This way, we are guaranteed to return values (even if bad) and reset at the proper time.
		// Without this, client applications had to be prepared for a read/write not returning.
	self.connectionReset();

    // initiate the callback stored by dropConnection
    if (self.dropConnectionCallback) {
        self.dropConnectionCallback();
        // prevent any possiblity of the callback being called twice
        self.dropConnectionCallback = null;
        // and cancel the timeout
        clearTimeout(self.dropConnectionTimer);
    }
}

NodeS7.prototype.connectionReset = function() {
	var self = this;
	self.isoConnectionState = 0;
	self.resetPending = true;
	outputLog('ConnectionReset has been called to set the reset as pending', 0, self.connectionID);
	if (!self.isReading() && !self.isWriting() && !self.writeInQueue && typeof(self.resetTimeout) === 'undefined') { // We can no longer logically ignore writes here
		self.resetTimeout = setTimeout(function() {
			outputLog('Timed reset has happened. Ideally this would never be called as reset should be completed when done r/w.',0,self.connectionID);
			self.resetNow.apply(self, arguments);
		}, 3500);  // Increased to 3500 to prevent problems with packet timeouts
	}
	// We wait until read() is called again to re-connect.
}

NodeS7.prototype.resetNow = function() {
	var self = this;
	self.isoConnectionState = 0;
	self.isoclient.end();
	outputLog('ResetNOW is happening', 0, self.connectionID);
	self.resetPending = false;
	// In some cases, we can have a timeout scheduled for a reset, but we don't want to call it again in that case.
	// We only want to call a reset just as we are returning values.  Otherwise, we will get asked to read // more values and we will "break our promise" to always return something when asked.
	if (typeof (self.resetTimeout) !== 'undefined') {
		clearTimeout(self.resetTimeout);
		self.resetTimeout = undefined;
		outputLog('Clearing an earlier scheduled reset', 0, self.connectionID);
	}
}

NodeS7.prototype.connectionCleanup = function() {
	var self = this;
	self.isoConnectionState = 0;
	outputLog('Connection cleanup is happening', 0, self.connectionID);
	if (typeof (self.isoclient) !== "undefined") {
		// destroy the socket connection
		self.isoclient.destroy();
		self.isoclient.removeAllListeners('data');
		self.isoclient.removeAllListeners('error');
		self.isoclient.removeAllListeners('connect');
		self.isoclient.removeAllListeners('end');
		self.isoclient.removeAllListeners('close');
		self.isoclient.on('error',function() {
			outputLog('TCP socket error following connection cleanup');
		});
	}
	clearTimeout(self.connectTimeout);
	clearTimeout(self.PDUTimeout);
	self.clearReadPacketTimeouts();  // Note this clears timeouts.
	self.clearWritePacketTimeouts();  // Note this clears timeouts.
}

/**
 * Internal Functions
 */

function checkRFCData(data){
   var ret=null;
   var RFC_Version = data[0];
   var TPKT_Length = data.readInt16BE(2);
   var TPDU_Code = data[5]; //Data==0xF0 !!
   var LastDataUnit = data[6];//empty fragmented frame => 0=not the last package; 1=last package

   if(RFC_Version !==0x03 && TPDU_Code !== 0xf0){
      //Check if its an RFC package and a Data package
      return 'error';
   }else if((LastDataUnit >> 7) === 0 && TPKT_Length == data.length &&  data.length === 7){
      // Check if its a Fast Acknowledge package from older PLCs or  WinAC or data is too long ...
      // For example: <Buffer 03 00 00 07 02 f0 00> => data.length==7
      ret='fastACK';
   }else if((LastDataUnit >> 7) == 1 && TPKT_Length <= data.length){
      // Check if its an  FastAcknowledge package + S7Data package
      // <Buffer 03 00 00 1b 02 f0 80 32 03 00 00 00 00 00 08 00 00 00 00 f0 00 00 01 00 01 00 f0> => data.length==7+20=27
      ret=data;
   }else if((LastDataUnit >> 7) == 0  && TPKT_Length !== data.length){
      // Check if its an  FastAcknowledge package + FastAcknowledge package+ S7Data package
      // Possibly because NodeS7 or Application is too slow at this moment!
      // <Buffer 03 00 00 07 02 f0 00 03 00 00 1b 02 f0 80 32 03 00 00 00 00 00 08 00 00 00 00 f0 00 00 01 00 01 00 f0>  => data.length==7+7+20=34
      ret=data.slice(7, data.length)//Cut off the first Fast Acknowledge Packet
   }else{
      ret='error';
   }
   return ret;
}

function S7AddrToBuffer(addrinfo, isWriting) {
	var thisBitOffset = 0, theReq = Buffer.from([0x12, 0x0a, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

	// First 3 bytes (0,1,2) is constant, sniffed from other traffic, for S7 head.
	// Next one is "byte length" - we always request X number of bytes - even for a REAL with length of 1 we read BYTES length of 4.
	theReq[3] = 0x02;  // Byte length

	// Next we write the number of bytes we are going to read.
	if (addrinfo.datatype === 'X') {
		theReq.writeUInt16BE(addrinfo.byteLength, 4);
		if (isWriting && addrinfo.arrayLength === 1) {
			// Byte length will be 1 already so no need to special case this.
			theReq[3] = 0x01;  // 1 = "BIT" length
			// We need to specify the bit offset in this case only.  Normally, when reading, we read the whole byte anyway and shift bits around.  Can't do this when writing only one bit.
			thisBitOffset = addrinfo.bitOffset;
		}
	} else if (addrinfo.datatype === 'TIMER' || addrinfo.datatype === 'COUNTER') {
		theReq.writeUInt16BE(1, 4);
		theReq.writeUInt8(addrinfo.areaS7Code, 3);
	} else {
		theReq.writeUInt16BE(addrinfo.byteLength, 4);
	}

	// Then we write the data block number.
	theReq.writeUInt16BE(addrinfo.dbNumber, 6);

	// Write our area crossing pointer.  When reading, write a bit offset of 0 - we shift the bit offset out later only when reading.
	theReq.writeUInt32BE(addrinfo.offset * 8 + thisBitOffset, 8);

	// Now we have to BITWISE OR the area code over the area crossing pointer.
	// This must be done AFTER writing the area crossing pointer as there is overlap, but this will only be noticed on large DB.
	theReq[8] |= addrinfo.areaS7Code;

	return theReq;
}

function processS7Packet(theData, theItem, thePointer, theCID) {

	var remainingLength;

	if (typeof (theData) === "undefined") {
		remainingLength = 0;
		outputLog("Processing an undefined packet, likely due to timeout error", 0, theCID);
	} else if (isNaN(theItem.byteLength)) {
		// byteLength Nan should probably never reach this method.
		// This temporal fix avoids the library crashing
		outputLog("Processing an undefined packet, perhaps bad input?", 0, theCID);
		return 0;
	} else {
		remainingLength = theData.length - thePointer;  // Say if length is 39 and pointer is 35 we can access 35,36,37,38 = 4 bytes.
	}
	var prePointer = thePointer;

	// Create a new buffer for the quality.
	theItem.qualityBuffer = Buffer.alloc(theItem.byteLength);
	theItem.qualityBuffer.fill(0xFF);  // Fill with 0xFF (255) which means NO QUALITY in the OPC world.

	if (remainingLength < 4) {
		theItem.valid = false;
		if (typeof (theData) !== "undefined") {
			theItem.errCode = 'Malformed Packet - Less Than 4 Bytes.  TDL' + theData.length + 'TP' + thePointer + 'RL' + remainingLength;
		} else {
			theItem.errCode = "Timeout error - zero length packet";
		}
		outputLog(theItem.errCode, 0, theCID);
		return 0;   			// Hard to increment the pointer so we call it a malformed packet and we're done.
	}

	var reportedDataLength;

	if (theItem.readTransportCode == 0x04) {
		reportedDataLength = theData.readUInt16BE(thePointer + 2) / 8;  // For different transport codes this may not be right.
	} else {
		reportedDataLength = theData.readUInt16BE(thePointer + 2);
	}
	var responseCode = theData[thePointer];
	var transportCode = theData[thePointer + 1];

	if (remainingLength == (reportedDataLength + 2)) {
		outputLog("Not last part.", 0, theCID);
	}

	if (remainingLength < reportedDataLength + 2) {
		theItem.valid = false;
		theItem.errCode = 'Malformed Packet - Item Data Length and Packet Length Disagree.  RDL+2 ' + (reportedDataLength + 2) + ' remainingLength ' + remainingLength;
		outputLog(theItem.errCode, 0 , theCID);
		return 0;   			// Hard to increment the pointer so we call it a malformed packet and we're done.
	}

	if (responseCode !== 0xff) {
		theItem.valid = false;
		theItem.errCode = 'Invalid Response Code - ' + responseCode;
		outputLog(theItem.errCode, 0 , theCID);
		return thePointer + reportedDataLength + 4;
	}

	if (transportCode !== theItem.readTransportCode) {
		theItem.valid = false;
		theItem.errCode = 'Invalid Transport Code - ' + transportCode;
		outputLog(theItem.errCode, 0 , theCID);
		return thePointer + reportedDataLength + 4;
	}

	var expectedLength = theItem.byteLength;

	if (reportedDataLength !== expectedLength) {
		theItem.valid = false;
		theItem.errCode = 'Invalid Response Length - Expected ' + expectedLength + ' but got ' + reportedDataLength + ' bytes.';
		outputLog(theItem.errCode, 0 , theCID);
		return reportedDataLength + 2;
	}

	// Looks good so far.
	// Increment our data pointer past the status code, transport code and 2 byte length.
	thePointer += 4;

	theItem.valid = true;
	theItem.byteBuffer = theData.slice(thePointer, thePointer + reportedDataLength);
	theItem.qualityBuffer.fill(0xC0);  // Fill with 0xC0 (192) which means GOOD QUALITY in the OPC world.

	thePointer += theItem.byteLength; //WithFill;

	if (((thePointer - prePointer) % 2)) { // Odd number.  With the S7 protocol we only request an even number of bytes.  So there will be a filler byte.
		thePointer += 1;
	}

	//	outputLog("We have an item value of " + theItem.value + " for " + theItem.addr + " and pointer of " + thePointer);

	return thePointer;
}

function processS7WriteItem(theData, theItem, thePointer) {

	var remainingLength;

	if (!theData) {
		theItem.writeQualityBuffer.fill(0xFF);  // Note that ff is good in the S7 world but BAD in our fill here.
		theItem.valid = false;
		theItem.errCode = 'We must have timed Out - we have no response to process';
		outputLog(theItem.errCode);
		return 0;
	}

	remainingLength = theData.length - thePointer;  // Say if length is 39 and pointer is 35 we can access 35,36,37,38 = 4 bytes.

	if (remainingLength < 1) {
		theItem.writeQualityBuffer.fill(0xFF);  // Note that ff is good in the S7 world but BAD in our fill here.
		theItem.valid = false;
		theItem.errCode = 'Malformed Packet - Less Than 1 Byte.  TDL ' + theData.length + ' TP' + thePointer + ' RL' + remainingLength;
		outputLog(theItem.errCode);
		return 0;   			// Hard to increment the pointer so we call it a malformed packet and we're done.
	}

	var writeResponse = theData.readUInt8(thePointer);

	theItem.writeResponse = writeResponse;

	if (writeResponse !== 0xff) {
		outputLog('Received write error of ' + theItem.writeResponse + ' on ' + theItem.addr);
		theItem.writeQualityBuffer.fill(0xFF);  // Note that ff is good in the S7 world but BAD in our fill here.
	} else {
		theItem.writeQualityBuffer.fill(0xC0);
	}

	return (thePointer + 1);
}

function writePostProcess(theItem) {
	var thePointer = 0;
	if (theItem.arrayLength === 1) {
		if (theItem.writeQualityBuffer[0] === 0xFF) {
			theItem.writeQuality = 'BAD';
		} else {
			theItem.writeQuality = 'OK';
		}
	} else {
		// Array value.
		theItem.writeQuality = [];
		for (var arrayIndex = 0; arrayIndex < theItem.arrayLength; arrayIndex++) {
			if (theItem.writeQualityBuffer[thePointer] === 0xFF) {
				theItem.writeQuality[arrayIndex] = 'BAD';
			} else {
				theItem.writeQuality[arrayIndex] = 'OK';
			}
			if (theItem.datatype == 'X') {
				// For bit arrays, we have to do some tricky math to get the pointer to equal the byte offset.
				// Note that we add the bit offset here for the rare case of an array starting at other than zero.  We either have to
				// drop support for this at the request level or support it here.

				if ((((arrayIndex + theItem.bitOffset + 1) % 8) === 0) || (arrayIndex == theItem.arrayLength - 1)) {
					thePointer += theItem.dtypelen;
				}
			} else {
				// Add to the pointer every time.
				thePointer += theItem.dtypelen;
			}
		}
	}
}

function fromBCD(n) {
	return ((n >> 4) * 10) + (n & 0xf)
}

function toBCD(n) {
	return ((n / 10) << 4) | (n % 10)
}

function readDT(buffer, offset, isUTC) {
	let year = fromBCD(buffer.readUInt8(offset));
	let month = fromBCD(buffer.readUInt8(offset + 1));
	let day = fromBCD(buffer.readUInt8(offset + 2));
	let hour = fromBCD(buffer.readUInt8(offset + 3));
	let min = fromBCD(buffer.readUInt8(offset + 4));
	let sec = fromBCD(buffer.readUInt8(offset + 5));
	let ms_1 = fromBCD(buffer.readUInt8(offset + 6));
	let ms_2 = fromBCD(buffer.readUInt8(offset + 7) & 0xf0);

	let date;
	if (isUTC) {
		date = new Date(Date.UTC((year > 89 ? 1900 : 2000) + year, month - 1,
			day, hour, min, sec, (ms_1 * 10) + (ms_2 / 10)))
	} else {
		date = new Date((year > 89 ? 1900 : 2000) + year, month - 1,
			day, hour, min, sec, (ms_1 * 10) + (ms_2 / 10));
	}

	return date;
}

function writeDT(date, buffer, offset, isUTC){
	if (!(date instanceof Date)) {
		if (date > 631152000000 && date < 3786911999999) {
			// is between "1990-01-01T00:00:00.000Z" and "2089-12-31T23:59:59.999Z" in JS epoch
			// as per data type's range definition
			date = new Date(date);
		} else {
			outputLog("Unsupported value of [" + date + "] for writing data of type DATE_AND_TIME. Skipping item");
			return;
		}
	}

	if (isUTC) {
		buffer.writeUInt8(toBCD(date.getUTCFullYear() % 100), offset);
		buffer.writeUInt8(toBCD(date.getUTCMonth() + 1), offset + 1);
		buffer.writeUInt8(toBCD(date.getUTCDate()), offset + 2);
		buffer.writeUInt8(toBCD(date.getUTCHours()), offset + 3);
		buffer.writeUInt8(toBCD(date.getUTCMinutes()), offset + 4);
		buffer.writeUInt8(toBCD(date.getUTCSeconds()), offset + 5);
		buffer.writeUInt8(toBCD((date.getUTCMilliseconds() / 10) >> 0), offset + 6);
		buffer.writeUInt8(toBCD(((date.getUTCMilliseconds() % 10) * 10) + (date.getUTCDay() + 1)), offset + 7);
	} else {
		buffer.writeUInt8(toBCD(date.getFullYear() % 100), offset);
		buffer.writeUInt8(toBCD(date.getMonth() + 1), offset + 1);
		buffer.writeUInt8(toBCD(date.getDate()), offset + 2);
		buffer.writeUInt8(toBCD(date.getHours()), offset + 3);
		buffer.writeUInt8(toBCD(date.getMinutes()), offset + 4);
		buffer.writeUInt8(toBCD(date.getSeconds()), offset + 5);
		buffer.writeUInt8(toBCD((date.getMilliseconds() / 10) >> 0), offset + 6);
		buffer.writeUInt8(toBCD(((date.getMilliseconds() % 10) * 10) + (date.getDay() + 1)), offset + 7);
	}
}

function readDTL(buffer, offset, isUTC) {
	let year = buffer.readUInt16BE(offset);
	let month = buffer.readUInt8(offset + 2);
	let day = buffer.readUInt8(offset + 3);
	//let weekday = buffer.readUInt8(offset + 4);
	let hour = buffer.readUInt8(offset + 5);
	let min = buffer.readUInt8(offset + 6);
	let sec = buffer.readUInt8(offset + 7);
	let ns = buffer.readUInt32BE(offset + 8);

	let date;
	if (isUTC) {
		date = new Date(Date.UTC(year, month - 1,
			day, hour, min, sec, ns / 1e6))
	} else {
		date = new Date(year, month - 1,
			day, hour, min, sec, ns / 1e6);
	}

	return date;
}

function writeDTL(date, buffer, offset, isUTC) {
	if (!(date instanceof Date)) {
		if (date >= 0 && date < 9223382836854) {
			// is between "1970-01-01T00:00:00.000Z" and "2262-04-11T23:47:16.854Z" in JS epoch
			// as per data type's range definition
			date = new Date(date);
		} else {
			outputLog("Unsupported value of [" + date + "] for writing data of type DATE_AND_TIME. Skipping item");
			return;
		}
	}

	if (isUTC) {
		buffer.writeUInt16BE(date.getUTCFullYear(), offset);
		buffer.writeUInt8(date.getUTCMonth() + 1, offset + 2);
		buffer.writeUInt8(date.getUTCDate(), offset + 3);
		buffer.writeUInt8(date.getUTCDay() + 1, offset + 4);
		buffer.writeUInt8(date.getUTCHours(), offset + 5);
		buffer.writeUInt8(date.getUTCMinutes(), offset + 6);
		buffer.writeUInt8(date.getUTCSeconds(), offset + 7);
		buffer.writeUInt32BE(date.getUTCMilliseconds() * 1e6, offset + 8);
	} else {
		buffer.writeUInt16BE(date.getFullYear(), offset);
		buffer.writeUInt8(date.getMonth() + 1, offset + 2);
		buffer.writeUInt8(date.getDate(), offset + 3);
		buffer.writeUInt8(date.getDay() + 1, offset + 4);
		buffer.writeUInt8(date.getHours(), offset + 5);
		buffer.writeUInt8(date.getMinutes(), offset + 6);
		buffer.writeUInt8(date.getSeconds(), offset + 7);
		buffer.writeUInt32BE(date.getMilliseconds() * 1e6, offset + 8);
	}
}

function processS7ReadItem(theItem) {

	var thePointer = 0;
	var strlen = 0;
	var tempString = '';

	if (theItem.arrayLength > 1) {
		// Array value.
		if (theItem.datatype != 'C' && theItem.datatype != 'CHAR') {
			theItem.value = [];
			theItem.quality = [];
		} else {
			theItem.value = '';
			theItem.quality = '';
		}
		var bitShiftAmount = theItem.bitOffset;
		for (var arrayIndex = 0; arrayIndex < theItem.arrayLength; arrayIndex++) {
			if (theItem.qualityBuffer[thePointer] !== 0xC0) {
				if (theItem.quality instanceof Array) {
					theItem.value.push(theItem.badValue());
					theItem.quality.push('BAD ' + theItem.qualityBuffer[thePointer]);
				} else {
					theItem.value = theItem.badValue();
					theItem.quality = 'BAD ' + theItem.qualityBuffer[thePointer];
				}
			} else {
				// If we're a string, quality is not an array.
				if (theItem.quality instanceof Array) {
					theItem.quality.push('OK');
				} else {
					theItem.quality = 'OK';
				}
				switch (theItem.datatype) {

					case "DT":
						theItem.value.push(readDT(theItem.byteBuffer, thePointer, false));
						break;
					case "DTZ":
						theItem.value.push(readDT(theItem.byteBuffer, thePointer, true));
						break;
					case "DTL":
						theItem.value.push(readDTL(theItem.byteBuffer, thePointer, false));
						break;
					case "DTLZ":
						theItem.value.push(readDTL(theItem.byteBuffer, thePointer, true));
						break;
					case "REAL":
						theItem.value.push(theItem.byteBuffer.readFloatBE(thePointer));
						break;
					case "LREAL":
						theItem.value.push(theItem.byteBuffer.readDoubleBE(thePointer));
						break;
					case "LINT":
//						theItem.value.push(theItem.byteBuffer.readBigInt64BE(thePointer));
						break;
					case "DWORD":
						theItem.value.push(theItem.byteBuffer.readUInt32BE(thePointer));
						break;
					case "DINT":
						theItem.value.push(theItem.byteBuffer.readInt32BE(thePointer));
						break;
					case "INT":
						theItem.value.push(theItem.byteBuffer.readInt16BE(thePointer));
						break;
					case "WORD":
						theItem.value.push(theItem.byteBuffer.readUInt16BE(thePointer));
						break;
					case "X":
						theItem.value.push(((theItem.byteBuffer.readUInt8(thePointer) >> (bitShiftAmount)) & 1) ? true : false);
						break;
					case "B":
					case "BYTE":
						theItem.value.push(theItem.byteBuffer.readUInt8(thePointer));
						break;
					case "S":
					case "STRING":
						strlen = theItem.byteBuffer.readUInt8(thePointer+1);
						tempString = '';
						for (var charOffset = 2; charOffset < theItem.dtypelen && (charOffset - 2) < strlen; charOffset++) {
							// say strlen = 1 (one-char string) this char is at arrayIndex of 2.
							// Convert to string.
							tempString += String.fromCharCode(theItem.byteBuffer.readUInt8(thePointer+charOffset));
						}
						theItem.value.push(tempString);
						break;
					case "C":
					case "CHAR":
						// Convert to string.
						theItem.value += String.fromCharCode(theItem.byteBuffer.readUInt8(thePointer));
						break;
					case "TIMER":
					case "COUNTER":
						theItem.value.push(theItem.byteBuffer.readInt16BE(thePointer));
						break;

					default:
						outputLog("Unknown data type in response - should never happen.  Should have been caught earlier.  " + theItem.datatype);
						return 0;
				}
			}
			if (theItem.datatype == 'X') {
				// For bit arrays, we have to do some tricky math to get the pointer to equal the byte offset.
				// Note that we add the bit offset here for the rare case of an array starting at other than zero.  We either have to
				// drop support for this at the request level or support it here.
				bitShiftAmount++;
				if ((((arrayIndex + theItem.bitOffset + 1) % 8) === 0) || (arrayIndex == theItem.arrayLength - 1)) {
					thePointer += theItem.dtypelen;
					bitShiftAmount = 0;
				}
			} else {
				// Add to the pointer every time.
				thePointer += theItem.dtypelen;
			}
		}
	} else {
		// Single value.
		if (theItem.qualityBuffer[thePointer] !== 0xC0) {
			theItem.value = theItem.badValue();
			theItem.quality = ('BAD ' + theItem.qualityBuffer[thePointer]);
		} else {
			theItem.quality = ('OK');
			switch (theItem.datatype) {

				case "DT":
					theItem.value = readDT(theItem.byteBuffer, thePointer, false);
					break;
				case "DTZ":
					theItem.value = readDT(theItem.byteBuffer, thePointer, true);
					break;
				case "DTL":
					theItem.value = readDTL(theItem.byteBuffer, thePointer, false);
					break;
				case "DTLZ":
					theItem.value = readDTL(theItem.byteBuffer, thePointer, true);
					break;
				case "REAL":
					theItem.value = theItem.byteBuffer.readFloatBE(thePointer);
					break;
				case "LREAL":
					theItem.value = theItem.byteBuffer.readDoubleBE(thePointer);
					break;
				case "LINT":
//					theItem.value = theItem.byteBuffer.readBigInt64BE(thePointer);
					break;
				case "DWORD":
					theItem.value = theItem.byteBuffer.readUInt32BE(thePointer);
					break;
				case "DINT":
					theItem.value = theItem.byteBuffer.readInt32BE(thePointer);
					break;
				case "INT":
					theItem.value = theItem.byteBuffer.readInt16BE(thePointer);
					break;
				case "WORD":
					theItem.value = theItem.byteBuffer.readUInt16BE(thePointer);
					break;
				case "X":
					theItem.value = (((theItem.byteBuffer.readUInt8(thePointer) >> (theItem.bitOffset)) & 1) ? true : false);
					break;
				case "B":
				case "BYTE":
					// No support as of yet for signed 8 bit.  This isn't that common in Siemens.
					theItem.value = theItem.byteBuffer.readUInt8(thePointer);
					break;
				case "S":
				case "STRING":
					strlen = theItem.byteBuffer.readUInt8(thePointer+1);
					theItem.value = '';
					for (var charOffset = 2; charOffset < theItem.dtypelen && (charOffset - 2) < strlen; charOffset++) {
						// say strlen = 1 (one-char string) this char is at arrayIndex of 2.
						// Convert to string.
						theItem.value += String.fromCharCode(theItem.byteBuffer.readUInt8(thePointer+charOffset));
					}
					break;
				case "C":
				case "CHAR":
					// No support as of yet for signed 8 bit.  This isn't that common in Siemens.
					theItem.value = String.fromCharCode(theItem.byteBuffer.readUInt8(thePointer));
					break;
				case "TIMER":
				case "COUNTER":
					theItem.value = theItem.byteBuffer.readInt16BE(thePointer);
					break;
				default:
					outputLog("Unknown data type in response - should never happen.  Should have been caught earlier.  " + theItem.datatype);
					return 0;
			}
		}
		thePointer += theItem.dtypelen;
	}

	if (((thePointer) % 2)) { // Odd number.  With the S7 protocol we only request an even number of bytes.  So there will be a filler byte.
		thePointer += 1;
	}

	//	outputLog("We have an item value of " + theItem.value + " for " + theItem.addr + " and pointer of " + thePointer);
	return thePointer; // Should maybe return a value now???
}

function getWriteBuffer(theItem) {
	var newBuffer;

	// NOTE: It seems that when writing, the data that is sent must have a "fill byte" so that data length is even only for all
	//  but the last request.  The last request must have no padding.  So we DO NOT add the padding here anymore.

	if (theItem.datatype === 'X' && theItem.arrayLength === 1) {
		newBuffer = Buffer.alloc(2 + 3); // Changed from 2 + 4 to 2 + 3 as padding was moved out of this function
		// Initialize, especially be sure to get last bit which may be a fill bit.
		newBuffer.fill(0);
		newBuffer.writeUInt16BE(1, 2); // Might need to do something different for different trans codes
	} else {
		newBuffer = Buffer.alloc(theItem.byteLength + 4); // Changed from 2 + 4 to 2 + 3 as padding was moved out of this function
		newBuffer.fill(0);
		newBuffer.writeUInt16BE(theItem.byteLength * 8, 2); // Might need to do something different for different trans codes
	}

	if (theItem.writeBuffer.length < theItem.byteLengthWithFill) {
		outputLog("Attempted to access part of the write buffer that wasn't there when writing an item.");
	}

	newBuffer[0] = 0;
	newBuffer[1] = theItem.writeTransportCode;

	theItem.writeBuffer.copy(newBuffer, 4, 0, theItem.byteLength);  // Not with fill.  It might not be that long.

	return newBuffer;
}

function bufferizeS7Item(theItem) {
	var thePointer, theByte;
	theByte = 0;
	thePointer = 0; // After length and header

	if (theItem.arrayLength > 1) {
		// Array value.
		var bitShiftAmount = theItem.bitOffset;
		for (var arrayIndex = 0; arrayIndex < theItem.arrayLength; arrayIndex++) {
			switch (theItem.datatype) {
				case "DT":
					writeDT(theItem.writeValue[arrayIndex], theItem.writeBuffer, thePointer, false);
					break;
				case "DTZ":
					writeDT(theItem.writeValue[arrayIndex], theItem.writeBuffer, thePointer, true);
					break;
				case "DTL":
					writeDTL(theItem.writeValue[arrayIndex], theItem.writeBuffer, thePointer, false);
					break;
				case "DTLZ":
					writeDTL(theItem.writeValue[arrayIndex], theItem.writeBuffer, thePointer, true);
					break;
				case "REAL":
					theItem.writeBuffer.writeFloatBE(theItem.writeValue[arrayIndex], thePointer);
					break;
				case "LREAL":
					theItem.writeBuffer.writeDoubleBE(theItem.writeValue[arrayIndex], thePointer);
					break;
				case "LINT":
//					theItem.writeBuffer.writeBigInt64BE(theItem.writeValue[arrayIndex], thePointer);
					break;
				case "DWORD":
					theItem.writeBuffer.writeInt32BE(theItem.writeValue[arrayIndex], thePointer);
					break;
				case "DINT":
					theItem.writeBuffer.writeInt32BE(theItem.writeValue[arrayIndex], thePointer);
					break;
				case "INT":
					theItem.writeBuffer.writeInt16BE(theItem.writeValue[arrayIndex], thePointer);
					break;
				case "WORD":
					theItem.writeBuffer.writeUInt16BE(theItem.writeValue[arrayIndex], thePointer);
					break;
				case "X":
					theByte = theByte | (((theItem.writeValue[arrayIndex] === true) ? 1 : 0) << bitShiftAmount);
					// Maybe not so efficient to do this every time when we only need to do it every 8.  Need to be careful with optimizations here for odd requests.
					theItem.writeBuffer.writeUInt8(theByte, thePointer);
					bitShiftAmount++;
					break;
				case "B":
				case "BYTE":
					theItem.writeBuffer.writeUInt8(theItem.writeValue[arrayIndex], thePointer);
					break;
				case "C":
				case "CHAR":
					// Convert to string.
					//??					theItem.writeBuffer.writeUInt8(theItem.writeValue.toCharCode(), thePointer);
					theItem.writeBuffer.writeUInt8(theItem.writeValue.charCodeAt(arrayIndex), thePointer);
					break;
				case "S":
				case "STRING":
					// Convert to bytes.
					theItem.writeBuffer.writeUInt8(theItem.dtypelen - 2, thePointer); // Array length is requested val, -2 is string length
					theItem.writeBuffer.writeUInt8(Math.min(theItem.dtypelen - 2, theItem.writeValue[arrayIndex].length), thePointer+1); // Array length is requested val, -2 is string length
					for (var charOffset = 2; charOffset < theItem.dtypelen; charOffset++) {
						if (charOffset < (theItem.writeValue[arrayIndex].length + 2)) {
							theItem.writeBuffer.writeUInt8(theItem.writeValue[arrayIndex].charCodeAt(charOffset-2), thePointer+charOffset);
						} else {
							theItem.writeBuffer.writeUInt8(32, thePointer+charOffset); // write space
						}
					}
					break;
				case "TIMER":
				case "COUNTER":
					// I didn't think we supported arrays of timers and counters.
					theItem.writeBuffer.writeInt16BE(theItem.writeValue[arrayIndex], thePointer);
					break;
				default:
					outputLog("Unknown data type when preparing array write packet - should never happen.  Should have been caught earlier.  " + theItem.datatype);
					return 0;
			}
			if (theItem.datatype == 'X') {
				// For bit arrays, we have to do some tricky math to get the pointer to equal the byte offset.
				// Note that we add the bit offset here for the rare case of an array starting at other than zero.  We either have to
				// drop support for this at the request level or support it here.
				if ((((arrayIndex + theItem.bitOffset + 1) % 8) === 0) || (arrayIndex == theItem.arrayLength - 1)) {
					thePointer += theItem.dtypelen;
					bitShiftAmount = 0;
					// Zero this now.  Otherwise it will have the same value next byte if non-zero.
					theByte = 0;
				}
			} else {
				// Add to the pointer every time.
				thePointer += theItem.dtypelen;
			}
		}
	} else {
		// Single value.
		switch (theItem.datatype) {

			case "DT":
				writeDT(theItem.writeValue, theItem.writeBuffer, thePointer, false);
				break;
			case "DTZ":
				writeDT(theItem.writeValue, theItem.writeBuffer, thePointer, true);
				break;
			case "DTL":
				writeDTL(theItem.writeValue, theItem.writeBuffer, thePointer, false);
				break;
			case "DTLZ":
				writeDTL(theItem.writeValue, theItem.writeBuffer, thePointer, true);
				break;
			case "REAL":
				theItem.writeBuffer.writeFloatBE(theItem.writeValue, thePointer);
				break;
			case "LREAL":
				theItem.writeBuffer.writeDoubleBE(theItem.writeValue, thePointer);
				break;
			case "LINT":
//				theItem.writeBuffer.writeBigInt64BE(theItem.writeValue, thePointer);
				break;
			case "DWORD":
				theItem.writeBuffer.writeUInt32BE(theItem.writeValue, thePointer);
				break;
			case "DINT":
				theItem.writeBuffer.writeInt32BE(theItem.writeValue, thePointer);
				break;
			case "INT":
				theItem.writeBuffer.writeInt16BE(theItem.writeValue, thePointer);
				break;
			case "WORD":
				theItem.writeBuffer.writeUInt16BE(theItem.writeValue, thePointer);
				break;
			case "X":
				theItem.writeBuffer.writeUInt8(((theItem.writeValue === true) ? 1 : 0), thePointer);
				// not here				theItem.writeBuffer[1] = 1; // Set transport code to "BIT" to write a single bit.
				// not here				theItem.writeBuffer.writeUInt16BE(1, 2); // Write only one bit.
				break;
			case "B":
			case "BYTE":
				// No support as of yet for signed 8 bit.  This isn't that common in Siemens.
				theItem.writeBuffer.writeUInt8(theItem.writeValue, thePointer);
				break;
			case "C":
			case "CHAR":
				// No support as of yet for signed 8 bit.  This isn't that common in Siemens.
				theItem.writeBuffer.writeUInt8(theItem.writeValue.charCodeAt(0), thePointer);
				break;
			case "S":
			case "STRING":
				// Convert to bytes.
				theItem.writeBuffer.writeUInt8(theItem.dtypelen - 2, thePointer); // Array length is requested val, -2 is string length
				theItem.writeBuffer.writeUInt8(Math.min(theItem.dtypelen - 2, theItem.writeValue.length), thePointer+1); // Array length is requested val, -2 is string length

				for (var charOffset = 2; charOffset < theItem.dtypelen; charOffset++) {
					if (charOffset < (theItem.writeValue.length + 2)) {
						theItem.writeBuffer.writeUInt8(theItem.writeValue.charCodeAt(charOffset-2), thePointer+charOffset);
					} else {
						theItem.writeBuffer.writeUInt8(32, thePointer+charOffset); // write space
					}
				}
				break;
			case "TIMER":
			case "COUNTER":
				theItem.writeBuffer.writeInt16BE(theItem.writeValue, thePointer);
				break;
			default:
				outputLog("Unknown data type in write prepare - should never happen.  Should have been caught earlier.  " + theItem.datatype);
				return 0;
		}
		thePointer += theItem.dtypelen;
	}
	return undefined;
}

function stringToS7Addr(addr, useraddr, cParam) {
	"use strict";
	var theItem, splitString, splitString2;

	if (useraddr === '_COMMERR') { return undefined; } // Special-case for communication error status - this variable returns true when there is a communications error

	theItem = new S7Item();
	splitString = addr.split(',');
	if (splitString.length === 0 || splitString.length > 2) {
		outputLog("Error - String Couldn't Split Properly.");
		return undefined;
	}

	if (splitString.length > 1) { // Must be DB type
		theItem.addrtype = 'DB';  // Hard code
		splitString2 = splitString[1].split('.');
		theItem.datatype = splitString2[0].replace(/[0-9]/gi, '').toUpperCase(); // Clear the numbers
		if (theItem.datatype === 'X' && splitString2.length === 3) {
			theItem.arrayLength = parseInt(splitString2[2], 10);
		} else if ((theItem.datatype === 'S' || theItem.datatype === 'STRING') && splitString2.length === 3) {
			theItem.dtypelen = parseInt(splitString2[1], 10) + 2; // With strings, add 2 to the length due to S7 header
			theItem.arrayLength = parseInt(splitString2[2], 10);  // For strings, array length is now the number of strings
		} else if ((theItem.datatype === 'S' || theItem.datatype === 'STRING') && splitString2.length === 2) {
			theItem.dtypelen = parseInt(splitString2[1], 10) + 2; // With strings, add 2 to the length due to S7 header
			theItem.arrayLength = 1;
		} else if (theItem.datatype !== 'X' && splitString2.length === 2) {
			theItem.arrayLength = parseInt(splitString2[1], 10);
		} else {
			theItem.arrayLength = 1;
		}
		if (theItem.arrayLength <= 0) {
			outputLog('Zero length arrays not allowed, returning undefined');
			return undefined;
		}

		// Get the data block number from the first part.
		theItem.dbNumber = parseInt(splitString[0].replace(/[A-z]/gi, ''), 10);

		// Get the data block byte offset from the second part, eliminating characters.
		// Note that at this point, we may miss some info, like a "T" at the end indicating TIME data type or DATE data type or DT data type.  We ignore these.
		// This is on the TODO list.
		theItem.offset = parseInt(splitString2[0].replace(/[A-z]/gi, ''), 10);  // Get rid of characters

		// Get the bit offset
		if (splitString2.length > 1 && theItem.datatype === 'X') {
			theItem.bitOffset = parseInt(splitString2[1], 10);
			if (theItem.bitOffset > 7) {
				outputLog("Invalid bit offset specified for address " + addr);
				return undefined;
			}
		}
	} else { // Must not be DB.  We know there's no comma.
		splitString2 = addr.split('.');

		switch (splitString2[0].replace(/[0-9]/gi, '')) {
			/* We do have the memory areas:
			  "input", "peripheral input", "output", "peripheral output", ",marker", "counter" and "timer" as I, PI, Q, PQ, M, C and T.
			   Datablocks are handles somewere else.
			   We do have the data types:
			   "bit", "byte", "char", "word", "int16", "dword", "int32", "real" as X, B, C, W, I, DW, DI and R
			   What about "uint16", "uint32"
			*/

/* All styles of peripheral IOs (no bit access allowed) */
			case "PIB":
			case "PEB":
			case "PQB":
			case "PAB":
				theItem.addrtype = "P";
				theItem.datatype = "BYTE";
				break;
			case "PIC":
			case "PEC":
			case "PQC":
			case "PAC":
				theItem.addrtype = "P";
				theItem.datatype = "CHAR";
				break;
			case "PIW":
			case "PEW":
			case "PQW":
			case "PAW":
				theItem.addrtype = "P";
				theItem.datatype = "WORD";
				break;
			case "PII":
			case "PEI":
			case "PQI":
			case "PAI":
				theItem.addrtype = "P";
				theItem.datatype = "INT";
				break;
			case "PID":
			case "PED":
			case "PQD":
			case "PAD":
				theItem.addrtype = "P";
				theItem.datatype = "DWORD";
				break;
			case "PIDI":
			case "PEDI":
			case "PQDI":
			case "PADI":
				theItem.addrtype = "P";
				theItem.datatype = "DINT";
				break;
			case "PIR":
			case "PER":
			case "PQR":
			case "PAR":
				theItem.addrtype = "P";
				theItem.datatype = "REAL";
				break;

/* All styles of standard inputs (in oposit to peripheral inputs) */
			case "I":
			case "E":
				theItem.addrtype = "I";
				theItem.datatype = "X";
				break;
			case "IB":
			case "EB":
				theItem.addrtype = "I";
				theItem.datatype = "BYTE";
				break;
			case "IC":
			case "EC":
				theItem.addrtype = "I";
				theItem.datatype = "CHAR";
				break;
			case "IW":
			case "EW":
				theItem.addrtype = "I";
				theItem.datatype = "WORD";
				break;
			case "II":
			case "EI":
				theItem.addrtype = "I";
				theItem.datatype = "INT";
				break;
			case "ID":
			case "ED":
				theItem.addrtype = "I";
				theItem.datatype = "DWORD";
				break;
			case "IDI":
			case "EDI":
				theItem.addrtype = "I";
				theItem.datatype = "DINT";
				break;
			case "IR":
			case "ER":
				theItem.addrtype = "I";
				theItem.datatype = "REAL";
				break;
			case "ILR":
			case "ELR":
				theItem.addrtype = "I";
				theItem.datatype = "LREAL";
				break;
			case "ILI":
			case "ELI":
				theItem.addrtype = "I";
				theItem.datatype = "LINT";
				break;
/* All styles of standard outputs (in oposit to peripheral outputs) */
			case "Q":
			case "A":
				theItem.addrtype = "Q";
				theItem.datatype = "X";
				break;
			case "QB":
			case "AB":
				theItem.addrtype = "Q";
				theItem.datatype = "BYTE";
				break;
			case "QC":
			case "AC":
				theItem.addrtype = "Q";
				theItem.datatype = "CHAR";
				break;
			case "QW":
			case "AW":
				theItem.addrtype = "Q";
				theItem.datatype = "WORD";
				break;
			case "QI":
			case "AI":
				theItem.addrtype = "Q";
				theItem.datatype = "INT";
				break;
			case "QD":
			case "AD":
				theItem.addrtype = "Q";
				theItem.datatype = "DWORD";
				break;
			case "QDI":
			case "ADI":
				theItem.addrtype = "Q";
				theItem.datatype = "DINT";
				break;
			case "QR":
			case "AR":
				theItem.addrtype = "Q";
				theItem.datatype = "REAL";
				break;
			case "QLR":
			case "ALR":
				theItem.addrtype = "Q";
				theItem.datatype = "LREAL";
				break;
			case "QLI":
			case "ALI":
				theItem.addrtype = "Q";
				theItem.datatype = "LINT";
				break;
/* All styles of marker */
			case "M":
				theItem.addrtype = "M";
				theItem.datatype = "X";
				break;
			case "MB":
				theItem.addrtype = "M";
				theItem.datatype = "BYTE";
				break;
			case "MC":
				theItem.addrtype = "M";
				theItem.datatype = "CHAR";
				break;
			case "MW":
				theItem.addrtype = "M";
				theItem.datatype = "WORD";
				break;
			case "MI":
				theItem.addrtype = "M";
				theItem.datatype = "INT";
				break;
			case "MD":
				theItem.addrtype = "M";
				theItem.datatype = "DWORD";
				break;
			case "MDI":
				theItem.addrtype = "M";
				theItem.datatype = "DINT";
				break;
			case "MR":
				theItem.addrtype = "M";
				theItem.datatype = "REAL";
				break;
			case "MLR":
				theItem.addrtype = "M";
				theItem.datatype = "LREAL";
				break;
			case "MLI":
				theItem.addrtype = "M";
				theItem.datatype = "LINT";
				break;
/* Timer */
			case "T":
				theItem.addrtype = "T";
				theItem.datatype = "TIMER";
				break;

/* Counter */
			case "C":
				theItem.addrtype = "C";
				theItem.datatype = "COUNTER";
				break;

			default:
				outputLog('Failed to find a match for ' + splitString2[0]);
				return undefined;
		}

		theItem.bitOffset = 0;
		if (splitString2.length > 1 && theItem.datatype === 'X') { // Bit and bit array
			theItem.bitOffset = parseInt(splitString2[1].replace(/[A-z]/gi, ''), 10);
			if (splitString2.length > 2) {  // Bit array only
				theItem.arrayLength = parseInt(splitString2[2].replace(/[A-z]/gi, ''), 10);
			} else {
				theItem.arrayLength = 1;
			}
		} else if (splitString2.length > 1 && theItem.datatype !== 'X') { // Bit and bit array
			theItem.arrayLength = parseInt(splitString2[1].replace(/[A-z]/gi, ''), 10);
		} else {
			theItem.arrayLength = 1;
		}
		theItem.dbNumber = 0;
		theItem.offset = parseInt(splitString2[0].replace(/[A-z]/gi, ''), 10);
	}

	if (theItem.datatype === 'DI') {
		theItem.datatype = 'DINT';
	}
	if (theItem.datatype === 'I') {
		theItem.datatype = 'INT';
	}
	if (theItem.datatype === 'DW' || theItem.datatype === 'DWT') {
		theItem.datatype = 'DWORD';
	}
	if (theItem.datatype === 'WDT') {
		if (cParam.wdtAsUTC) {
			theItem.datatype = 'DTZ';
		} else {
			theItem.datatype = 'DT';
		}
	}
	if (theItem.datatype === 'W') {
		theItem.datatype = 'WORD';
	}
	if (theItem.datatype === 'R') {
		theItem.datatype = 'REAL';
	}
	if (theItem.datatype === 'LR') {
		theItem.datatype = 'LREAL';
	}
	if (theItem.datatype === 'LI') {
		theItem.datatype = 'LINT';
	}
	switch (theItem.datatype) {
		case "DTL":
		case "DTLZ":
			theItem.dtypelen = 12;
			break;
		case "LREAL":
		case "LINT":
		case "DT":
		case "DTZ":
			theItem.dtypelen = 8;
			break;
		case "REAL":
		case "DWORD":
		case "DINT":
			theItem.dtypelen = 4;
			break;
		case "INT":
		case "WORD":
		case "TIMER":
		case "COUNTER":
			theItem.dtypelen = 2;
			break;
		case "X":
		case "B":
		case "C":
		case "BYTE":
		case "CHAR":
			theItem.dtypelen = 1;
			break;
		case "S":
		case "STRING":
			// For strings, arrayLength and dtypelen were assigned during parsing.
			break;
		default:
			outputLog("Unknown data type " + theItem.datatype);
			return undefined;
	}

	// Default
	theItem.readTransportCode = 0x04;

	switch (theItem.addrtype) {
		case "DB":
		case "DI":
			theItem.areaS7Code = 0x84;
			break;
		case "I":
		case "E":
			theItem.areaS7Code = 0x81;
			break;
		case "Q":
		case "A":
			theItem.areaS7Code = 0x82;
			break;
		case "M":
			theItem.areaS7Code = 0x83;
			break;
		case "P":
			theItem.areaS7Code = 0x80;
			break;
		case "C":
			theItem.areaS7Code = 0x1c;
			theItem.readTransportCode = 0x09;
			break;
		case "T":
			theItem.areaS7Code = 0x1d;
			theItem.readTransportCode = 0x09;
			break;
		default:
			outputLog("Unknown memory area entered - " + theItem.addrtype);
			return undefined;
	}

	if (theItem.datatype === 'X' && theItem.arrayLength === 1) {
		theItem.writeTransportCode = 0x03;
	} else {
		theItem.writeTransportCode = theItem.readTransportCode;
	}

	// Save the address from the argument for later use and reference
	theItem.addr = addr;
	if (useraddr === undefined) {
		theItem.useraddr = addr;
	} else {
		theItem.useraddr = useraddr;
	}

	if (theItem.datatype === 'X') {
		theItem.byteLength = Math.ceil((theItem.bitOffset + theItem.arrayLength) / 8);
	} else {
		theItem.byteLength = theItem.arrayLength * theItem.dtypelen;
	}

	//	outputLog(' Arr lenght is ' + theItem.arrayLength + ' and DTL is ' + theItem.dtypelen);

	theItem.byteLengthWithFill = theItem.byteLength;
	if (theItem.byteLengthWithFill % 2) { theItem.byteLengthWithFill += 1; }  // S7 will add a filler byte.  Use this expected reply length for PDU calculations.

	return theItem;
}

function S7Packet() {
	this.seqNum = undefined;				// Made-up sequence number to watch for.
	this.itemList = undefined;  			// This will be assigned the object that details what was in the request.
	this.reqTime = undefined;
	this.sent = false;						// Have we sent the packet yet?
	this.rcvd = false;						// Are we waiting on a reply?
	this.timeoutError = undefined;			// The packet is marked with error on timeout so we don't then later switch to good data.
	this.timeout = undefined;				// The timeout for use with clearTimeout()
}

function S7Item() { // Object
	// Save the original address
	this.addr = undefined;
	this.useraddr = undefined;

	// First group is properties to do with S7 - these alone define the address.
	this.addrtype = undefined;
	this.datatype = undefined;
	this.dbNumber = undefined;
	this.bitOffset = undefined;
	this.offset = undefined;
	this.arrayLength = undefined;

	// These next properties can be calculated from the above properties, and may be converted to functions.
	this.dtypelen = undefined;
	this.areaS7Code = undefined;
	this.byteLength = undefined;
	this.byteLengthWithFill = undefined;

	// Note that read transport codes and write transport codes will be the same except for bits which are read as bytes but written as bits
	this.readTransportCode = undefined;
	this.writeTransportCode = undefined;

	// This is where the data can go that arrives in the packet, before calculating the value.
	this.byteBuffer = Buffer.alloc(8192);
	this.writeBuffer = Buffer.alloc(8192);

	// We use the "quality buffer" to keep track of whether or not the requests were successful.
	// Otherwise, it is too easy to lose track of arrays that may only be partially complete.
	this.qualityBuffer = Buffer.alloc(8192);
	this.writeQualityBuffer = Buffer.alloc(8192);

	// Then we have item properties
	this.value = undefined;
	this.writeValue = undefined;
	this.valid = false;
	this.errCode = undefined;

	// Then we have result properties
	this.part = undefined;
	this.maxPart = undefined;

	// Block properties
	this.isOptimized = false;
	this.resultReference = undefined;
	this.itemReference = undefined;

	// And functions...
	this.clone = function() {
		var newObj = new S7Item();
		for (var i in this) {
			if (i == 'clone') continue;
			newObj[i] = this[i];
		} return newObj;
	};

	this.badValue = function() {
		switch (this.datatype) {
			case "DT":
			case "DTZ":
			case "DTL":
			case "DTLZ":
				return new Date(NaN);
			case "REAL":
			case "LREAL":
				return 0.0;
			case "DWORD":
			case "DINT":
			case "INT":
			case "LINT":
			case "WORD":
			case "B":
			case "BYTE":
			case "TIMER":
			case "COUNTER":
				return 0;
			case "X":
				return false;
			case "C":
			case "CHAR":
			case "S":
			case "STRING":
				// Convert to string.
				return "";
			default:
				outputLog("Unknown data type when figuring out bad value - should never happen.  Should have been caught earlier.  " + this.datatype);
				return 0;
		}
	};
}

function itemListSorter(a, b) {
	// Feel free to manipulate these next two lines...
	if (a.areaS7Code < b.areaS7Code) { return -1; }
	if (a.areaS7Code > b.areaS7Code) { return 1; }

	// Group first the items of the same DB
	if (a.addrtype === 'DB') {
		if (a.dbNumber < b.dbNumber) { return -1; }
		if (a.dbNumber > b.dbNumber) { return 1; }
	}

	// But for byte offset we need to start at 0.
	if (a.offset < b.offset) { return -1; }
	if (a.offset > b.offset) { return 1; }

	// Then bit offset
	if (a.bitOffset < b.bitOffset) { return -1; }
	if (a.bitOffset > b.bitOffset) { return 1; }

	// Then item length - most first.  This way smaller items are optimized into bigger ones if they have the same starting value.
	if (a.byteLength > b.byteLength) { return -1; }
	if (a.byteLength < b.byteLength) { return 1; }
}

function doNothing(arg) {
	return arg;
}

function isQualityOK(obj) {
	if (typeof obj === "string") {
		if (obj !== 'OK') { return false; }
	} else if (Array.isArray(obj)) {
		for (var i = 0; i < obj.length; i++) {
			if (typeof obj[i] !== "string" || obj[i] !== 'OK') { return false; }
		}
	}
	return true;
}

function outputLog(txt, debugLevel, id) {
	if (silentMode) return;

	var idtext;
	if (typeof (id) === 'undefined') {
		idtext = '';
	} else {
		idtext = ' ' + id;
	}
	if (typeof (debugLevel) === 'undefined' || effectiveDebugLevel >= debugLevel) {
		console.log('[' + process.hrtime() + idtext + '] ' + util.format(txt));
	}
}
