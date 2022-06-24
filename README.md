nodeS7
======

NodeS7 is a library that allows communication to S7-300/400/1200/1500 PLCs using the Siemens S7 Ethernet protocol RFC1006.

This software is not affiliated with Siemens in any way, nor am I.  S7-300, S7-400, S7-1200 and S7-1500 are trademarks of Siemens AG.

WARNING
=======
Fully test everything you do.  In situations where writing to a random area of memory within the PLC could cost you money, back up your data and test this really well.  If this could injure someone or worse, consider other software.

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
* S7-1200 and S7-1500 CPU access requires access using "Slot 1" and you must disable optimized block access (in TIA portal) for the blocks you are using.  In addition, you must "Enable GET/PUT Access" in the 1200/1500 controller in TIA Portal.  Doing so opens up the controller for other access by other applications as well, so be aware of the security implications of doing this.

* This has been tested on direct connections to newer PROFINET CPUs and Helmholz NetLINK PRO COMPACT and IBH units.  (Note with these gateways you often have to specify the MPI address as the slot number) It is reported to work with other CPU/CP combinations as well, although not all S7-200 datatypes are supported.  S7 routing is not supported.

* Logo 0BA8 PLCs are supported although you should set your local and remote TSAP to match your project, and your addresses have to be specified differently.  DB1,INT0 should get VM0. DB1,INT1118 should get AM1.

VFD Support
=======

* SINAMICS S120 and G120 FW 4.7 and up work as well, as these drives support direct connection USING SLOT 0 (instead of other examples that use 1 or 2) and some modified parameter addressing.  This technique can work with these drives with other software as well and is documented on the Siemens website.  Basically, to address parameter number 24, output frequency for example, is defined in the documentation as a real number, so DB24,REAL0 would return the output frequency.  If this parameter were an array, DB24,REAL1 would return the next in sequence even though a Siemens programmer would be tempted to use REAL4 which is not correct in this case.  For this reason, normal S7 optimization must be disabled.  After you declare `conn = new nodes7;` (or similar) then add `conn.doNotOptimize = true;` to ensure this isn't done, and don't try to request these items using array notation as this implies optimization, request REAL0 then REAL1 etc.  doNotOptimize is now also supported as a connection parameter.

Credit to the S7 Wireshark dissector plugin for help understanding why things were not working.
(http://sourceforge.net/projects/s7commwireshark/)

Examples
======

```js
var nodes7 = require('nodes7'); // This is the package name, if the repository is cloned you may need to require 'nodeS7' with uppercase S
var conn = new nodes7;
var doneReading = false;
var doneWriting = false;

var variables = {
      TEST1: 'MR4',          // Memory real at MD4
      TEST2: 'M32.2',        // Bit at M32.2
      TEST3: 'M20.0',        // Bit at M20.0
      TEST4: 'DB1,REAL0.20', // Array of 20 values in DB1
      TEST5: 'DB1,REAL4',    // Single real value
      TEST6: 'DB1,REAL8',    // Another single real value
      TEST7: 'DB1,INT12.2',  // Two integer value array
      TEST8: 'DB1,LREAL4',   // Single 8-byte real value
      TEST9: 'DB1,X14.0',    // Single bit in a data block
      TEST10: 'DB1,X14.0.8'  // Array of 8 bits in a data block
};

conn.initiateConnection({ port: 102, host: '192.168.0.2', rack: 0, slot: 1, debug: false }, connected); // slot 2 for 300/400, slot 1 for 1200/1500, change debug to true to get more info
// conn.initiateConnection({port: 102, host: '192.168.0.2', localTSAP: 0x0100, remoteTSAP: 0x0200, timeout: 8000, doNotOptimize: true}, connected);
// local and remote TSAP can also be directly specified instead. The timeout option specifies the TCP timeout.

function connected(err) {
  if (typeof(err) !== "undefined") {
    // We have an error. Maybe the PLC is not reachable.
    console.log(err);
    process.exit();
  }
  conn.setTranslationCB(function(tag) { return variables[tag]; }); // This sets the "translation" to allow us to work with object names
  conn.addItems(['TEST1', 'TEST4']);
  conn.addItems('TEST6');
  // conn.removeItems(['TEST2', 'TEST3']); // We could do this.
  // conn.writeItems(['TEST5', 'TEST6'], [ 867.5309, 9 ], valuesWritten); // You can write an array of items as well.
  // conn.writeItems('TEST7', [666, 777], valuesWritten); // You can write a single array item too.
  conn.writeItems('TEST3', true, valuesWritten); // This writes a single boolean item (one bit) to true
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
```

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
- DB10,LR32 - LREAL at byte offset 32 in DB10, for 1200/1500 only
- DB10,INT6 - DB10.DBW6 as INT
- DB10,I6 -same as above
- DB10,INT6.2 - DB10.DBW6 and DB10.DBW8 in an array with length 2
- DB10,X14.0 - DB10.DBX14.0 as BOOL
- DB10,X14.0.8 - DB10.DBB14 as an array of 8 BOOL
- PIW30 - PIW30 as INT
- DB10,S20.30 - String at offset 20 with length of 30 (actual array length 32 due to format of String type, length byte will be read/written)
- DB10,S20.30.3 - Array of 3 strings at offset 20, each with length of 30 (actual array length 32 due to format of String type, length byte will be read/written)
- DB10,C22.30 - Character array at offset 22 with length of 30 (best to not use this with strings as length byte is ignored)
- DB10,DT0 - Date and time
- DB10,DTZ0 - Date and time in UTC
- DB10,DTL0 - DTL in newer PLCs
- DB10,DTLZ0 - DTL in newer PLCs in UTC

The DT type is the well-known DATE_AND_TIME type of S7-300/400 PLCs, a 8-byte-wide field with BCD-encoded parts

The DTZ type is the same as the DT, but it expects that the timestamp is in UTC in the PLC (usually NOT the case)

The DTL type is the one seen on newer S7-1200/1500 PLCs, is 12-byte long and encodes the timestamp differently than the older DATE_AND_TIME

The DTLZ type is also the same as the DTL, but expecting the timestamp in UTC in the PLC

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
