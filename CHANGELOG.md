Version: 0.3.18
------------
- Add support for WDT to specify date/time which can be either UTC or local time depending on a connection parameter
- Call back readDoneCallback even when asked to read no valid tags

Version: 0.3.17
------------
- Modify the globalTimeout variable when timeout is specified as a connection parameter

Version: 0.3.16
------------
- Return error on timeout based on timer, similar to what is seen if there is a real TCP timeout

Version: 0.3.15
------------
- Check for NaN byte length causing crash in processS7Packet (thanks to cstim)

Version: 0.3.14
------------
- Allows DWT as well as DW for type specifier for compatibility with some OPC server tag file export format
- Allows doNotOptimize as a connection parameter (it defaults to false, should be set to true for G120 drives)

Version: 0.3.13
------------
- Fix for error ECONNRESET (thanks to adopozo)
- Documentation improvements including G120 drive support documentation (thanks to aurelien49 for testing this)

Version: 0.3.12
------------
- Fix for WORD datatype partially missing

Version: 0.3.11
------------
- Addition of date and time datatypes (thanks to gfcittolin)
- Minor documentation improvements

Version: 0.3.10
------------
- Fixes for sequence number collisions (thanks to gfcittolin)

Version: 0.3.9
------------
- Fixes for connection reset in cases where enough data was being read that more polls were required than could run in parallel

Version: 0.3.8
------------
- Further improvements on connection reset

Version: 0.3.7
------------
- outputLog spelling correction and connection ID added to some outputLog instances where it was missing
- LREAL type mentioned in documentation
- LINT type added but BigInt64 requires Node 12 so hold for now
- Only reset on packet timeout when connected

Version: 0.3.6
------------
- Reset on packet timeout
- LREAL type added

Version: 0.3.5
------------
- Fixed behavior if a write is requested while an earlier-requested one is in progress.
- Other improvements to re-establishing connection

Version: 0.3.4
------------
- Hotfix to prevent crash due to delayed packet (thanks to gfcittolin)

Version: 0.3.3
------------
- Hotfix to prevent crash from LOGO PLC sending split packet (thanks to gfcittolin)

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
