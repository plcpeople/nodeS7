# nodeS7

NodeS7 is a library that allows communication to S7-300/400/1200/1500 PLCs using the Siemens S7Communication protocol over Ethernet (RFC1006) or MPI/PPI/DP USB Adapters.

This software is not affiliated with Siemens in any way, nor am I.  S7-300, S7-400, S7-1200 and S7-1500 are trademarks of Siemens AG.


## WARNING
This is ALPHA CODE and you need to be aware that WRONG VALUES could be written to WRONG LOCATIONS.  Fully test everything you do.  In situations where writing to a random area of memory within the PLC could cost you money, back up your data and test this really well.  If this could injure someone or worse, consider other software.

This is **Work in progress!**. The API may change without notice, be prepared for breaking changes until this reaches a stable release.


## Installation

This is currently not published on NPM. You need to have Git setup and run

    npm install plcpeople/nodeS7#next


## Usage Example

```js
const { S7Endpoint, S7ItemGroup } = require('nodes7');

let plc = new S7Endpoint({ host: '192.168.0.1', rack: 0, slot: 1 });

plc.on('error', e => console.log('PLC Error!', e));
plc.on('disconnect', () => console.log('PLC Disconnect'));
plc.once('connect', async () => {
	console.log('connected!');

	// check the documentation for all available functions
	await plc.getTime(); //gets the PLC's current date/time
	await plc.blockCount(); //gets a count of blocks from the PLC of each type

	// you can use the S7ItemGroup to perform optimized read/write of variables

	let itemGroup = new S7ItemGroup(plc);

	let vars = {
		TEST1: 'MR4', 			// Memory real at MD4
		TEST2: 'M32.2', 		// Bit at M32.2
		TEST3: 'M20.0', 		// Bit at M20.0
		TEST4: 'DB1,REAL0.20',	// Array of 20 values in DB1
		TEST5: 'DB1,REAL4',		// Single real value
		TEST6: 'DB1,REAL8',		// Another single real value
		TEST7: 'DB1,INT12.2'	// Two integer value array
	}
	itemGroup.setTranslationCB(tag => vars[tag]); //translates a tag name to its address
	itemGroup.addItems(Object.keys(vars));

	console.log(await itemGroup.readAllItems());

	await plc.disconnect(); 	//clean disconnection
});
```

## Documentation

Please check the [API documentation](doc/API.md), specially the [S7Endpoint](doc/API.md#S7Endpoint) and [S7ItemGroup](doc/API.md#S7ItemGroup) sections