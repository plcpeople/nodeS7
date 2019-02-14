nodeS7
======

NodeS7 is a library that allows communication to S7-300/400/1200/1500 PLCs using the Siemens S7 Ethernet protocol RFC1006.

This software is not affiliated with Siemens in any way, nor am I.  S7-300, S7-400, S7-1200 and S7-1500 are trademarks of Siemens AG.

WARNING
=======
This is ALPHA CODE and you need to be aware that WRONG VALUES could be written to WRONG LOCATIONS.  Fully test everything you do.  In situations where writing to a random area of memory within the PLC could cost you money, back up your data and test this really well.  If this could injure someone or worse, consider other software.

Installation
=======
Using npm:
* `npm install nodes7`

Using yarn:
* `yarn add nodes7`

Optimization
=======

* It is optimized in three ways - It sorts a large number of items being requested from the PLC and decides what overall data areas to request, then it groups multiple small requests together in a single packet or number of packets up to the maximum length the PLC supports, then it sends multiple packets at once, for maximum speed.   So a request for 100 different bits, all close (but not necessarily completely contiguous) will be grouped in one single request to the PLC, with no additional direction from the user.

* NodeS7 manages reconnects for you.  So if the connection is lost because the PLC is powered down or disconnected, you can continue to request data with no other action necessary.  "Bad" values are returned, and eventually the connection will be automatically restored.

* NodeS7 is written entirely in Javascript, so no compiler installation is necessary on Windows, and deployment on other platforms (ARM, etc) should be no problem.

PLC Support
=======
* S7-1200 and S7-1500 CPU access requires access using "Slot 1" and you must disable optimized block access (in TIA portal) for the blocks you are using.  In addition, you must "Enable GET/PUT Access" in the 1500 controller in TIA Portal.  Doing so opens up the controller for other access by other applications as well, so be aware of the security implications of doing this.

* This has been tested only on direct connection to newer PROFINET CPUs and Helmholz NetLINK PRO COMPACT units.  It SHOULD work with any CP that supports TCP as well, but S7-200/400/1200 haven't been tested.  Very old CPUs have not been tested.  S7 routing is not supported.

Credit to the S7 Wireshark dissector plugin for help understanding why things were not working.
(http://sourceforge.net/projects/s7commwireshark/)

Examples
======

	var nodes7 = require('nodes7');  // This is the package name, if the repository is cloned you may need to require 'nodeS7' with uppercase S
	var conn = new nodes7;
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
	//conn.initiateConnection({port: 102, host: '192.168.0.2', localTSAP: 0x0100, remoteTSAP: 0x0200, timeout: 8000}, connected); // local and remote TSAP can also be directly specified instead.  The timeout option specifies the TCP timeout.

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

API
=====
 - [initiateConnection()](#initiate-connection)
 - [dropConnection()](#drop-connection)
 - [setTranslationCB()](#set-translation-cb)
 - [addItems()](#add-items)
 - [removeItems()](#remove-items)
 - [writeItems()](#write-items)
 - [readAllItems()](#read-all-items)


## <a name="initiate-connection"></a>nodes7.initiateConnection(options, callback)
#### Description
Connects to a PLC.

#### Arguments

`Options`

|Property|type|default|
| --- | --- | --- |
| rack       | number   | 0             |
| slot       | number   | 2             |
| port       | number   | 102           |
| host       | string   | 192.168.8.106 |
| timeout    | number   | 5000          |
| localTSAP  | hex      | undefined     |
| remoteTSAP | hex      | undefined     |

`callback(err)`
<dl>
  <dt>err</dt>
  <dd>
  err is either an error object, or undefined on successful connection.
  </dd>
</dl>

## <a name="drop-connection"></a>nodes7.dropConnection(callback)
#### Description
Disconnects from a PLC. This simply terminates the TCP connection.
#### Arguments

`callback()`

The callback is called upon completion of the close.

## <a name="set-translation-cb"></a>nodes7.setTranslationCB(translator)
#### Description
Sets a callback for name - address translation.

This is optional - you can choose to use "addItem" etc with absolute addresses.

If you use it, `translator` should be a function that takes a string as an argument, and returns a string in the following format:
`<data block number.><memory area><data type><byte offset><.array length>`

#### Examples:
- MR30 - MD30 as REAL
- DB10,INT6 - DB10.DBW6 as INT
- DB10,I6 -same as above
- DB10,INT6.2 - DB10.DBW6 and DB10.DBW8 in an array with length 2
- PIW30 - PIW30 as INT
- DB10,S20.30 - String at offset 20 with length of 30 (actual array length 32 due to format of String type, length byte will be read/written)
- DB10,S20.30.3 - Array of 3 strings at offset 20, each with length of 30 (actual array length 32 due to format of String type, length byte will be read/written)
- DB10,C22.30 - Character array at offset 22 with length of 30 (best to not use this with strings as length byte is ignored)

In the example above, an object is declared and the `translator` references that object.  It could just as reference a file or database.  In any case, it allows cleaner Javascript code to be written that refers to a name instead of an absolute address.

## <a name="add-items"></a>nodes7.addItems(items)
#### Description
Adds `items` to the internal read polling list.


#### Arguments
`items` can be a string or an array of strings.

If `items` includes the value `_COMMERR` it will return current communication status.

## <a name="remove-items"></a>nodes7.removeItems(items)
#### Description
Removes `items` to the internal read polling list.

#### Arguments
`items` can be a string or an array of strings.

If `items` is not defined then all items are removed.

## <a name="write-items"></a>nodes7.writeItems(items, values, callback)
#### Description
Writes `items` to the PLC using the corresponding `values` and calls `callback` when done.

You should monitor the return value - if it is non-zero, the write will not be processed as there is already one it progress, and the callback will not be called.

#### Arguments
`items` can be a string or an array of strings.

If `items` is a single string, `values` should then be a single item.

If `items` is an array of strings, `values` must also be an array of values.

`callback(err)`

<dl>
  <dt>err</dt>
  <dd>a boolean indicating if ANY of the items have "bad quality".</dd>
</dl>

## <a name="read-all-items"></a>nodes7.readAllItems(callback)
#### Description
Reads the internal polling list and calls `callback` when done.

#### Arguments
`callback(err, values)` 

<dl>
  <dt>err</dt>
  <dd>a boolean indicating if ANY of the items have "bad quality".</dd>
  <dt>values</dt>
  <dd>an object containing the values being read as keys and their value (from the PLC) as the value.</dd>
</dl>
