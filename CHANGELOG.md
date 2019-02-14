Version: 0.3.2
------------
- Fix bug related to bit array length (thanks to luisbardalez)
- Better tracking of timers during dropConnection (thanks to gfcittolin)

Version: 0.3.1
------------
- Fix bug related to variable timeout

Version: 0.3.0
------------
- Add variable timeout (thanks to babinc)
- Add reference to MIT license to package.json
- Use of arrow functions requires dropping support for very old versions of node

Version: 0.2.5
------------
- Fix request packet bigger than PDU size

Version: 0.2.4
------------
- Fix logging when slicing response packet from PLC

Version: 0.2.3
------------
- Fix support for string arrays

Version: 0.2.2
------------
- Fix readDoneCallback typeof typo

Version: 0.2.1
------------
- Change from `Buffer.from()` to `buffer.slice()`, so we keep compatible with versions of NodeJS older than 6.x

Version: 0.2.0
------------
- Implement TSAP mode connection. Allows to directly specify local and remote TSAP values instead of only rack/slot. Useful for connecting with PLCs like Logo.

Version: 0.1.15
------------
- Ensure the socket is destroyed on connection cleanup

Version: 0.1.14
------------
- Fix bug to handle the case when more than one packet is waiting in the incoming buffer

Version: 0.1.13
------------
- Fix bug when writing a single character

Version: 0.1.12
------------
- Add more options for datatype syntax (thanks to sembaye)
- Add support for RFC1006 fast acknowledge for old PLCs and WinAC RTX (thanks to sembaye)
- Fix for onClientClose causing readAllItems to never return when connection closed by partner

Version: 0.1.11
------------
- Fix error when reading across multiple DBs

Version: 0.1.10
------------
- Fix errors writing single/multiple items of bit and byte length
- Fix errors writing arrays of boolean with length greater than 8 and at least one true value

Version: 0.1.9
------------
- Fix missing self.globalWriteBlockList reinitialize
- remove dependencies
- Linting

Version: 0.1.8
------------
- Fix missing self in dropConnection
- Add callback to dropConnection

Version: 0.1.7
------------
- Add optional options to NodeS7 constructor
- Add silent/debug mode options

Version: 0.1.6
------------
- Fixes #4: Error on writing more then 32 byte of data
- Fixes #5: Error on writing Array of Boolean

All other version are not recorded.
