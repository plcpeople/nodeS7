nodeS7
======

NodeS7 is a library that allows communication to S7-300/400/1200/1500 PLCs using the Siemens S7 Ethernet protocol RFC1006.  

This software is not affiliated with Siemens in any way, nor am I.  S7-300, S7-400, S7-1200 and S7-1500 are trademarks of Siemens AG.

WARNING - This is ALPHA CODE and you need to be aware that WRONG VALUES could be written to WRONG LOCATIONS.  Fully test everything you do.  In situations where writing to a random area of memory within the PLC could cost you money, back up your data and test this really well.  If this could injure someone or worse, consider other software.  

It is optimized in three ways - It sorts a large number of items being requested from the PLC and decides what overall data areas to request, then it groups multiple small requests together in a single packet or number of packets up to the maximum length the PLC supports, then it sends multiple packets at once, for maximum speed.   So a request for 100 different bits, all close (but not necessarily completely contiguous) will be grouped in one single request to the PLC, with no additional direction from the user.  

NodeS7 manages reconnects for you.  So if the connection is lost because the PLC is powered down or disconnected, you can continue to request data with no other action necessary.  "Bad" values are returned, and eventually the connection will be automatically restored.

NodeS7 is written entirely in Javascript, so no compiler installation is necessary on Windows, and deployment on other platforms (ARM, etc) should be no problem.

S7-1200 and S7-1500 CPU access requires access using "Slot 1" and you must disable optimized block access (in TIA portal) for the blocks you are using.  In addition, you must "Enable GET/PUT Access" in the 1500 controller in TIA Portal.  Doing so opens up the controller for other access by other applications as well, so be aware of the security implications of doing this.

This has been tested only on direct connection to newer PROFINET CPUs and Helmholz NetLINK PRO COMPACT units.  It SHOULD work with any CP that supports TCP as well, but S7-200/400/1200 haven't been tested.  Very old CPUs have not been tested.  S7 routing is not supported.

Credit to the S7 Wireshark dissector plugin for help understanding why things were not working.
(http://sourceforge.net/projects/s7commwireshark/)

To get started:

	npm install nodeS7

Example usage:

	var nodeS7 = require('nodeS7');
	var conn = new nodeS7;
	var doneReading = false;
	var doneWriting = false;

	var variables = { TEST1: 'MR4', 		// Memory real at MD4
			  TEST2: 'M32.2', 		// Bit at M32.2
			  TEST3: 'M20.0', 		// Bit at M20.0
			  TEST4: 'DB1,REAL0.20',	// Array of 20 values in DB1
			  TEST5: 'DB1,REAL4',		// Single real value
			  TEST6: 'DB1,REAL8',		// Another single real value
			  TEST7: 'DB1,INT12.2'		// Two integer value array
	};	

	conn.initiateConnection({port: 102, host: '192.168.0.2', rack: 0, slot: 1}, connected); // slot 2 for 300/400, slot 1 for 1200/1500

	function connected(err) {
		if (typeof(err) !== "undefined") {
			// We have an error.  Maybe the PLC is not reachable.  
			console.log(err);
			process.exit();
		}
		conn.setTranslationCB(function(tag) {return variables[tag];}); 	// This sets the "translation" to allow us to work with object names
		conn.addItems(['TEST1', 'TEST4']);	
		conn.addItems('TEST6');
	//	conn.removeItems(['TEST2', 'TEST3']);  // We could do this.  
	//	conn.writeItems(['TEST5', 'TEST6'], [ 867.5309, 9 ], valuesWritten);  // You can write an array of items as well.  
		conn.writeItems('TEST7', [ 666, 777 ], valuesWritten);  // You can write a single array item too.  
		conn.readAllItems(valuesReady);	
	}

	function valuesReady(anythingBad, values) {
		if (anythingBad) { console.log("SOMETHING WENT WRONG READING VALUES!!!!"); }
		console.log(values);
		doneReading = true;
		if (doneWriting) { process.exit(); }
	}

	function valuesWritten(anythingBad) {
		if (anythingBad) { console.log("SOMETHING WENT WRONG WRITING VALUES!!!!"); }
		console.log("Done writing.");
		doneWriting = true;
		if (doneReading) { process.exit(); }
	}



### API
 - [initiateConnection()](#initiate-connection)
 - [dropConnection()](#drop-connection)
 - [setTranslationCB()](#set-translation-cb)
 - [addItems()](#add-items)
 - [removeItems()](#remove-items)
 - [writeItems()](#write-items)
 - [readAllItems()](#read-all-items)


#### <a name="initiate-connection"></a>nodeS7.initiateConnection(params, callback)
Connects to a PLC.  

params should be an object with the following keys:
- rack (default 0)
- slot (default 2)
- port (normally specify 102)
- host (address)

`callback(err)` will be executed on success or failure.  err is either an error object, or undefined on successful connection.


#### <a name="drop-connection"></a>nodeS7.dropConnection()
Disconnects from a PLC.  

This simply terminates the TCP connection.


#### <a name="set-translation-cb"></a>nodeS7.setTranslationCB(translator)
Sets a callback for name - address translation.  

This is optional - you can choose to use "addItem" etc with absolute addresses.

If you use it, `translator` should be a function that takes a string as an argument, and returns a string in the following format:
- <data block number.><memory area><data type><byte offset><.array length>
- Examples:
- MR30 - MD30 as REAL
- DB10,INT6 - DB10.DBW6 as INT
- DB10,INT6.2 - DB10.DBW6 and DB10.DBW8 in an array with length 2
- PIW30 - PIW30 as INT

In the example above, an object is declared and the `translator` references that object.  It could just as reference a file or database.  In any case, it allows cleaner Javascript code to be written that refers to a name instead of an absolute address.  


#### <a name="add-items"></a>nodeS7.addItems(items)
Adds `items` to the internal read polling list.  

`items` can be a string or an array of strings.

#### <a name="remove-items"></a>nodeS7.removeItems(items)
Removes `items` to the internal read polling list.  

`items` can be a string or an array of strings.

#### <a name="write-items"></a>nodeS7.writeItems(items, values)
Writes `items` to the PLC using the corresponding `values`.  

`items` can be a string or an array of strings.  If `items` is a single string, `values` should then be a single item (or an array if `items` is an array item).  If `items` is an array of strings, `values` must be an array.


#### <a name="read-all-items"></a>nodeS7.readAllItems(callback)
Reads the internal polling list and calls `callback` when done.  

`callback(err, values)` is called with two arguments - a boolean indicating if ANY of the items have "bad quality", and `values`, an object containing the values being read as keys and their value (from the PLC) as the value.



