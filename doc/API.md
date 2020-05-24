## Classes

<dl>
<dt><a href="#NodeS7Error">NodeS7Error</a></dt>
<dd><p>Custom NodeS7 Error class that tries to export the root-cause of an error by 
extending the built-in Error class with a <code>code</code> and an <code>info</code> property.</p>
<p>The <code>code</code> property is always populated, and can be of type &quot;string&quot;, when
caused by internal checks of the library, or of type &quot;number&quot; when caused
by a faulty error code from the PLC.</p>
<p>Here is a list of the error codes that can be thrown by the library itself:</p>
<ul>
<li><code>ERR_ILLEGAL_STATE</code>: Internal condition required for executing an action is not fulfilled</li>
<li><code>ERR_INTERRUPTED</code>: Pending job has been interrupted (e.g. by a disconnection)</li>
<li><code>ERR_INVALID_ARGUMENT</code>: A supplied parameter of a called function is out of specification </li>
<li><code>ERR_ITEM_TOO_BIG</code>: Item being written does not fit a single write request</li>
<li><code>ERR_NOT_CONNECTED</code>: Trying to perform an operation that requires communication to the PLC, but no connection is currently established</li>
<li><code>ERR_PARSE_ADDR_OFFSET</code>: Address parsing: Byte offset of an address is invalid</li>
<li><code>ERR_PARSE_AREA</code>: Address parsing: Area addressed is unknown or invalid</li>
<li><code>ERR_PARSE_BIT_OFFSET</code>: Address parsing: Bit offset is missing or is invalid</li>
<li><code>ERR_PARSE_DATATYPE</code>: Address parsing: Datatype is unknown or invalid</li>
<li><code>ERR_PARSE_DB_DATATYPE</code>: Address parsing: Datatype of a DB area is unknown or invalid</li>
<li><code>ERR_PARSE_DB_NUMBER</code>: Address parsing: Number of a DB is unknown or invalid</li>
<li><code>ERR_PARSE_INVALID_ARR_LEN</code>: Address parsing: Array length of an array specification is invalid</li>
<li><code>ERR_PARSE_INVALID_BIT_OFFSET</code>: Address parsing: Bit offset is specified in a type that doesn&#39;t support it</li>
<li><code>ERR_PARSE_STRING_LEN</code>: Address parsing: String length specified is missing or is invalid</li>
<li><code>ERR_PARSE_UNKNOWN_FORMAT</code>: Address parsing: Basic format of a NODES7 address format cannot be identified</li>
<li><code>ERR_TIMEOUT</code>: Communication timeout</li>
<li><code>ERR_UNEXPECTED_RESPONSE</code>: Unexpected or invalid data received from the device. Usually causes the current connection to be terminated</li>
</ul>
</dd>
<dt><a href="#S7Connection">S7Connection</a></dt>
<dd></dd>
<dt><a href="#S7Endpoint">S7Endpoint</a></dt>
<dd><p>Represents a S7 PLC, handling the connection to it and
allowing to call methods that act on it</p>
</dd>
<dt><a href="#S7Item">S7Item</a></dt>
<dd></dd>
<dt><a href="#S7ItemGroup">S7ItemGroup</a></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#BlockCountResponse">BlockCountResponse</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#ListBlockResponse">ListBlockResponse</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#BlockCountResponse">BlockCountResponse</a> : <code>S7Connection.BlockCountResponse</code></dt>
<dd></dd>
<dt><a href="#ListBlockResponse">ListBlockResponse</a> : <code>S7Connection.ListBlockResponse</code></dt>
<dd></dd>
<dt><a href="#BlockList">BlockList</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#ModuleInformation">ModuleInformation</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#ComponentIdentification">ComponentIdentification</a> : <code>object</code></dt>
<dd></dd>
</dl>

<a name="NodeS7Error"></a>

## NodeS7Error
Custom NodeS7 Error class that tries to export the root-cause of an error by 
extending the built-in Error class with a `code` and an `info` property.

The `code` property is always populated, and can be of type "string", when
caused by internal checks of the library, or of type "number" when caused
by a faulty error code from the PLC.

Here is a list of the error codes that can be thrown by the library itself:
 - `ERR_ILLEGAL_STATE`: Internal condition required for executing an action is not fulfilled
 - `ERR_INTERRUPTED`: Pending job has been interrupted (e.g. by a disconnection)
 - `ERR_INVALID_ARGUMENT`: A supplied parameter of a called function is out of specification 
 - `ERR_ITEM_TOO_BIG`: Item being written does not fit a single write request
 - `ERR_NOT_CONNECTED`: Trying to perform an operation that requires communication to the PLC, but no connection is currently established
 - `ERR_PARSE_ADDR_OFFSET`: Address parsing: Byte offset of an address is invalid
 - `ERR_PARSE_AREA`: Address parsing: Area addressed is unknown or invalid
 - `ERR_PARSE_BIT_OFFSET`: Address parsing: Bit offset is missing or is invalid
 - `ERR_PARSE_DATATYPE`: Address parsing: Datatype is unknown or invalid
 - `ERR_PARSE_DB_DATATYPE`: Address parsing: Datatype of a DB area is unknown or invalid
 - `ERR_PARSE_DB_NUMBER`: Address parsing: Number of a DB is unknown or invalid
 - `ERR_PARSE_INVALID_ARR_LEN`: Address parsing: Array length of an array specification is invalid
 - `ERR_PARSE_INVALID_BIT_OFFSET`: Address parsing: Bit offset is specified in a type that doesn't support it
 - `ERR_PARSE_STRING_LEN`: Address parsing: String length specified is missing or is invalid
 - `ERR_PARSE_UNKNOWN_FORMAT`: Address parsing: Basic format of a NODES7 address format cannot be identified
 - `ERR_TIMEOUT`: Communication timeout
 - `ERR_UNEXPECTED_RESPONSE`: Unexpected or invalid data received from the device. Usually causes the current connection to be terminated

**Kind**: global class  

* [NodeS7Error](#NodeS7Error)
    * [new NodeS7Error(code, message, [info])](#new_NodeS7Error_new)
    * [.code](#NodeS7Error+code) : <code>number</code> \| <code>string</code>
    * [.info](#NodeS7Error+info) : <code>object</code>

<a name="new_NodeS7Error_new"></a>

### new NodeS7Error(code, message, [info])
Encapsulates an error, whether caused from a return code from the PLC or
internally in the library, identified by a code for it and an optional info
about the cause of the error


| Param | Type | Description |
| --- | --- | --- |
| code | <code>number</code> \| <code>string</code> | the error code. numeric codes are from PLC responses, string codes are generated internally |
| message | <code>string</code> | the error message |
| [info] | <code>object</code> | Object containing additional info about the causes of the error. May not be always available |

<a name="NodeS7Error+code"></a>

### nodeS7Error.code : <code>number</code> \| <code>string</code>
**Kind**: instance property of [<code>NodeS7Error</code>](#NodeS7Error)  
<a name="NodeS7Error+info"></a>

### nodeS7Error.info : <code>object</code>
**Kind**: instance property of [<code>NodeS7Error</code>](#NodeS7Error)  
<a name="S7Connection"></a>

## S7Connection
**Kind**: global class  
**Emits**: <code>event:connect</code>, <code>event:message</code>  

* [S7Connection](#S7Connection)
    * [new S7Connection(stream, [opts])](#new_S7Connection_new)
    * [.pduSize](#S7Connection+pduSize) ⇒ <code>number</code>
    * [.parallelJobs](#S7Connection+parallelJobs) ⇒ <code>number</code>
    * [.isConnected](#S7Connection+isConnected) ⇒ <code>boolean</code>
    * [.connect([cb])](#S7Connection+connect)
    * [.destroy()](#S7Connection+destroy)
    * [.sendRaw(msg)](#S7Connection+sendRaw) ⇒ <code>Promise.&lt;object&gt;</code>
    * [.sendUserData(func, subfunc, [data], [transport], [method])](#S7Connection+sendUserData) ⇒ <code>Promise.&lt;Buffer&gt;</code>
    * [.clearQueue()](#S7Connection+clearQueue)
    * [.requestReadVars(items)](#S7Connection+requestReadVars) ⇒ <code>Promise.&lt;Array.&lt;object&gt;&gt;</code>
    * [.requestWriteVar(items, data)](#S7Connection+requestWriteVar) ⇒ <code>Promise.&lt;Array.&lt;object&gt;&gt;</code>
    * [.blockCount()](#S7Connection+blockCount) ⇒ [<code>Promise.&lt;BlockCountResponse&gt;</code>](#BlockCountResponse)
    * [.listBlocks(type)](#S7Connection+listBlocks) ⇒ <code>Promise.&lt;Array.&lt;ListBlockResponse&gt;&gt;</code>
    * [.getBlockInfo(type, number, [filesystem])](#S7Connection+getBlockInfo) ⇒ <code>Promise.&lt;Buffer&gt;</code>
    * [.getTime()](#S7Connection+getTime) ⇒ <code>Promise.&lt;Date&gt;</code>
    * [.setTime(date)](#S7Connection+setTime) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.uploadBlock(filename)](#S7Connection+uploadBlock) ⇒ <code>Promise.&lt;Buffer&gt;</code>
    * ["error" (e)](#S7Connection+event_error)
    * ["connect"](#S7Connection+event_connect)
    * ["message" (data)](#S7Connection+event_message)
    * ["timeout" ([payload])](#S7Connection+event_timeout)
    * ["pdu-size" (pduSize)](#S7Connection+event_pdu-size)

<a name="new_S7Connection_new"></a>

### new S7Connection(stream, [opts])
Creates a new S7 Connection


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| stream | <code>object</code> |  | the Duplex Stream used to exchange data with the PLC |
| [opts] | <code>object</code> |  | configuration options |
| [opts.maxJobs] | <code>number</code> |  | the max number of parallel jobs |
| [opts.maxPDUSize] | <code>number</code> |  | the max PDU Size |
| [opts.timeout] | <code>number</code> | <code>2000</code> | the timeout for execution of requests. 0 for no timeout |

<a name="S7Connection+pduSize"></a>

### s7Connection.pduSize ⇒ <code>number</code>
the negotiated maximum pdu size

**Kind**: instance property of [<code>S7Connection</code>](#S7Connection)  
<a name="S7Connection+parallelJobs"></a>

### s7Connection.parallelJobs ⇒ <code>number</code>
the negotiated number of maximum parallel jobs

**Kind**: instance property of [<code>S7Connection</code>](#S7Connection)  
<a name="S7Connection+isConnected"></a>

### s7Connection.isConnected ⇒ <code>boolean</code>
whether we're connected or not

**Kind**: instance property of [<code>S7Connection</code>](#S7Connection)  
<a name="S7Connection+connect"></a>

### s7Connection.connect([cb])
Initiates the connection using the provided stream

**Kind**: instance method of [<code>S7Connection</code>](#S7Connection)  

| Param | Type | Description |
| --- | --- | --- |
| [cb] | <code>function</code> | an optional callback, added once to the "connect" event |

<a name="S7Connection+destroy"></a>

### s7Connection.destroy()
Finishes this connection instance by cancelling all 
pending jobs and destroying all internal objects

**Kind**: instance method of [<code>S7Connection</code>](#S7Connection)  
<a name="S7Connection+sendRaw"></a>

### s7Connection.sendRaw(msg) ⇒ <code>Promise.&lt;object&gt;</code>
Sends a message raw message to the PLC. It expects an object
that will be serialized by S7Parser

**Kind**: instance method of [<code>S7Connection</code>](#S7Connection)  
**Returns**: <code>Promise.&lt;object&gt;</code> - the response sent by the PLC on the fulfillment of the Promise  

| Param | Type | Description |
| --- | --- | --- |
| msg | <code>object</code> | the message to be sent to the PLC |

<a name="S7Connection+sendUserData"></a>

### s7Connection.sendUserData(func, subfunc, [data], [transport], [method]) ⇒ <code>Promise.&lt;Buffer&gt;</code>
**Kind**: instance method of [<code>S7Connection</code>](#S7Connection)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| func | <code>number</code> |  | the function number |
| subfunc | <code>number</code> |  | the subfunction number |
| [data] | <code>Buffer</code> |  | the payload of the userdata call |
| [transport] | <code>number</code> | <code>BSTR</code> | the payload's transport type |
| [method] | <code>number</code> | <code>REQUEST</code> | the initial transport code |

<a name="S7Connection+clearQueue"></a>

### s7Connection.clearQueue()
Remove any request from the queue that has not been already sent.
Any pending promise will be rejected

**Kind**: instance method of [<code>S7Connection</code>](#S7Connection)  
<a name="S7Connection+requestReadVars"></a>

### s7Connection.requestReadVars(items) ⇒ <code>Promise.&lt;Array.&lt;object&gt;&gt;</code>
Sends a REQUEST telegram with READ_VAR funtction

**Kind**: instance method of [<code>S7Connection</code>](#S7Connection)  

| Param | Type |
| --- | --- |
| items | <code>Array.&lt;object&gt;</code> | 

<a name="S7Connection+requestWriteVar"></a>

### s7Connection.requestWriteVar(items, data) ⇒ <code>Promise.&lt;Array.&lt;object&gt;&gt;</code>
Sends a REQUEST telegram with WRITE_VAR function

**Kind**: instance method of [<code>S7Connection</code>](#S7Connection)  

| Param | Type |
| --- | --- |
| items | <code>Array.&lt;object&gt;</code> | 
| data | <code>Array.&lt;object&gt;</code> | 

<a name="S7Connection+blockCount"></a>

### s7Connection.blockCount() ⇒ [<code>Promise.&lt;BlockCountResponse&gt;</code>](#BlockCountResponse)
gets a count of blocks from the PLC

**Kind**: instance method of [<code>S7Connection</code>](#S7Connection)  
**Returns**: [<code>Promise.&lt;BlockCountResponse&gt;</code>](#BlockCountResponse) - an object with the block type as property key ("DB", "FB", ...) and the count as property value  
<a name="S7Connection+listBlocks"></a>

### s7Connection.listBlocks(type) ⇒ <code>Promise.&lt;Array.&lt;ListBlockResponse&gt;&gt;</code>
**Kind**: instance method of [<code>S7Connection</code>](#S7Connection)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>number</code> \| <code>string</code> | the block name in string, or its ID |

<a name="S7Connection+getBlockInfo"></a>

### s7Connection.getBlockInfo(type, number, [filesystem]) ⇒ <code>Promise.&lt;Buffer&gt;</code>
**Kind**: instance method of [<code>S7Connection</code>](#S7Connection)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| type | <code>string</code> \| <code>number</code> |  | the block type |
| number | <code>number</code> |  | the block number |
| [filesystem] | <code>string</code> | <code>&quot;&#x27;A&#x27;&quot;</code> | the filesystem being queried |

<a name="S7Connection+getTime"></a>

### s7Connection.getTime() ⇒ <code>Promise.&lt;Date&gt;</code>
Gets the current PLC time

**Kind**: instance method of [<code>S7Connection</code>](#S7Connection)  
<a name="S7Connection+setTime"></a>

### s7Connection.setTime(date) ⇒ <code>Promise.&lt;void&gt;</code>
Gets the current PLC time

**Kind**: instance method of [<code>S7Connection</code>](#S7Connection)  

| Param | Type | Description |
| --- | --- | --- |
| date | <code>Date</code> | the date/time to be setted |

<a name="S7Connection+uploadBlock"></a>

### s7Connection.uploadBlock(filename) ⇒ <code>Promise.&lt;Buffer&gt;</code>
Requests the upload of a block

**Kind**: instance method of [<code>S7Connection</code>](#S7Connection)  
**Returns**: <code>Promise.&lt;Buffer&gt;</code> - the block's content  

| Param | Type | Description |
| --- | --- | --- |
| filename | <code>string</code> | the filename of the block to be uploaded |

<a name="S7Connection+event_error"></a>

### "error" (e)
Emitted when an error occurs while communicating
with the PLC

**Kind**: event emitted by [<code>S7Connection</code>](#S7Connection)  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>\*</code> | the error |

<a name="S7Connection+event_connect"></a>

### "connect"
Emitted when the connection is negotiated and established

**Kind**: event emitted by [<code>S7Connection</code>](#S7Connection)  
<a name="S7Connection+event_message"></a>

### "message" (data)
Emitted on all incoming packets from the PLC that
are NOT response of a request in the queue

**Kind**: event emitted by [<code>S7Connection</code>](#S7Connection)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>object</code> | The job's payload, if available |

<a name="S7Connection+event_timeout"></a>

### "timeout" ([payload])
Emitted when a job times out. The job currently in
progress that caused the timeout already gets its 
promise rejected

**Kind**: event emitted by [<code>S7Connection</code>](#S7Connection)  

| Param | Type | Description |
| --- | --- | --- |
| [payload] | <code>object</code> | The job's payload, if available |

<a name="S7Connection+event_pdu-size"></a>

### "pdu-size" (pduSize)
Emitted when the negotiated PDU size has changed

**Kind**: event emitted by [<code>S7Connection</code>](#S7Connection)  

| Param | Type | Description |
| --- | --- | --- |
| pduSize | <code>number</code> | the new PDU size negotiated |

<a name="S7Endpoint"></a>

## S7Endpoint
Represents a S7 PLC, handling the connection to it and
allowing to call methods that act on it

**Kind**: global class  

* [S7Endpoint](#S7Endpoint)
    * [new S7Endpoint(opts)](#new_S7Endpoint_new)
    * [.isConnected](#S7Endpoint+isConnected) ⇒ <code>boolean</code>
    * [.pduSize](#S7Endpoint+pduSize) ⇒ <code>number</code>
    * [.connect()](#S7Endpoint+connect) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.disconnect()](#S7Endpoint+disconnect) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.readVars(items)](#S7Endpoint+readVars) ⇒ <code>Promise.&lt;object&gt;</code>
    * [.readArea(area, address, length, [db])](#S7Endpoint+readArea) ⇒ <code>Promise.&lt;Buffer&gt;</code>
    * [.readDB(db, address, length)](#S7Endpoint+readDB) ⇒ <code>Promise.&lt;Buffer&gt;</code>
    * [.readInputs(address, length)](#S7Endpoint+readInputs) ⇒ <code>Promise.&lt;Buffer&gt;</code>
    * [.readOutputs(address, length)](#S7Endpoint+readOutputs) ⇒ <code>Promise.&lt;Buffer&gt;</code>
    * [.readFlags(address, length)](#S7Endpoint+readFlags) ⇒ <code>Promise.&lt;Buffer&gt;</code>
    * [.writeVars(items)](#S7Endpoint+writeVars) ⇒ <code>Promise.&lt;object&gt;</code>
    * [.writeArea(area, address, data, [db])](#S7Endpoint+writeArea) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.writeDB(db, address, data)](#S7Endpoint+writeDB) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.writeOutputs(address, data)](#S7Endpoint+writeOutputs) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.writeFlags(address, data)](#S7Endpoint+writeFlags) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.blockCount()](#S7Endpoint+blockCount) ⇒ [<code>Promise.&lt;BlockCountResponse&gt;</code>](#BlockCountResponse)
    * [.listBlocks(type)](#S7Endpoint+listBlocks) ⇒ <code>Promise.&lt;Array.&lt;ListBlockResponse&gt;&gt;</code>
    * [.getBlockInfo(type, number, [filesystem])](#S7Endpoint+getBlockInfo) ⇒ <code>Promise.&lt;Buffer&gt;</code>
    * [.listAllBlocks()](#S7Endpoint+listAllBlocks) ⇒ [<code>Promise.&lt;BlockList&gt;</code>](#BlockList)
    * [.getTime()](#S7Endpoint+getTime) ⇒ <code>Promise.&lt;Date&gt;</code>
    * [.setTime([date])](#S7Endpoint+setTime) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.uploadBlock(type, number, [headerOnly], [filesystem])](#S7Endpoint+uploadBlock) ⇒ <code>Promise.&lt;Buffer&gt;</code>
    * [.getSSL([id], [index], [strict])](#S7Endpoint+getSSL) ⇒ <code>Promise.&lt;Array.&lt;Buffer&gt;&gt;</code>
    * [.getAvailableSSL()](#S7Endpoint+getAvailableSSL) ⇒ <code>Promise.&lt;Array.&lt;number&gt;&gt;</code>
    * [.getModuleIdentification()](#S7Endpoint+getModuleIdentification) ⇒ [<code>Promise.&lt;ModuleInformation&gt;</code>](#ModuleInformation)
    * [.getComponentIdentification()](#S7Endpoint+getComponentIdentification) ⇒ [<code>Promise.&lt;ComponentIdentification&gt;</code>](#ComponentIdentification)
    * ["error" (e)](#S7Endpoint+event_error)
    * ["disconnect"](#S7Endpoint+event_disconnect)
    * ["connect"](#S7Endpoint+event_connect)

<a name="new_S7Endpoint_new"></a>

### new S7Endpoint(opts)
Creates a new S7Endpoint

**Throws**:

- <code>Error</code> Will throw an error if invalid options are passed


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| opts | <code>object</code> |  | the options object |
| [opts.type] | <code>string</code> |  | the type of the connection to the PLC, either "tcp" or "mpi". If left undefined, will be automatically infered from the presence of the "host" or the "mpiAdapter" parameters |
| [opts.host] | <code>string</code> |  | the hostname or IP Address to connect to. Infers "tcp" type of connection |
| [opts.port] | <code>number</code> | <code>102</code> | the TCP port to connect to |
| [opts.rack] | <code>number</code> | <code>0</code> | the rack on the PLC configuration |
| [opts.slot] | <code>number</code> | <code>2</code> | the slot on the PLC configuration |
| [opts.srcTSAP] | <code>number</code> | <code>0x0100</code> | the source TSAP, when connecting using TSAP method |
| [opts.dstTSAP] | <code>number</code> | <code>0x0102</code> | the destination TSAP, when connecting using TSAP method |
| [opts.mpiAdapter] | <code>\*</code> |  | the MPI adapter used to communicate to the PLC. Infers "mpi" type of connection |
| [opts.mpiAddress] | <code>number</code> | <code>2</code> | the address of the PLC on the MPI bus |
| [opts.autoReconnect] | <code>number</code> | <code>5000</code> | the time to wait before trying to connect to the PLC again, in ms. If set to 0, disables the functionality |
| [opts.s7ConnOpts] | <code>object</code> |  | the [S7Connection](#S7Connection) constructor options, allowing to fine-tune specific parameters |

<a name="S7Endpoint+isConnected"></a>

### s7Endpoint.isConnected ⇒ <code>boolean</code>
Whether we're currently connected to the PLC or not

**Kind**: instance property of [<code>S7Endpoint</code>](#S7Endpoint)  
<a name="S7Endpoint+pduSize"></a>

### s7Endpoint.pduSize ⇒ <code>number</code>
The currently negotiated pdu size

**Kind**: instance property of [<code>S7Endpoint</code>](#S7Endpoint)  
<a name="S7Endpoint+connect"></a>

### s7Endpoint.connect() ⇒ <code>Promise.&lt;void&gt;</code>
Connects to the PLC. Note that this will be automatically
called if the autoReconnect parameter of the constructor 
is not zero.

**Kind**: instance method of [<code>S7Endpoint</code>](#S7Endpoint)  
<a name="S7Endpoint+disconnect"></a>

### s7Endpoint.disconnect() ⇒ <code>Promise.&lt;void&gt;</code>
Disconnects from the PLC.

**Kind**: instance method of [<code>S7Endpoint</code>](#S7Endpoint)  
<a name="S7Endpoint+readVars"></a>

### s7Endpoint.readVars(items) ⇒ <code>Promise.&lt;object&gt;</code>
Reads multiple values from multiple PLC areas. Care must be
taken not to exceed the maximum PDU size both of the request
and the response telegrams

**Kind**: instance method of [<code>S7Endpoint</code>](#S7Endpoint)  

| Param | Type | Description |
| --- | --- | --- |
| items | <code>Array.&lt;object&gt;</code> | the array of items to send |
| items[].area | <code>number</code> | the area code to be read |
| [items[].db] | <code>number</code> | the db number to be read (in case of a DB) |
| items[].transport | <code>number</code> | the transport length |
| items[].address | <code>number</code> | the address where to read from |
| items[].length | <code>number</code> | the number of elements to read (according to transport) |

<a name="S7Endpoint+readArea"></a>

### s7Endpoint.readArea(area, address, length, [db]) ⇒ <code>Promise.&lt;Buffer&gt;</code>
Reads arbitrary length of data from a memory area of 
the PLC. This method accounts for the negotiated PDU 
size and splits it in multiple requests if necessary

**Kind**: instance method of [<code>S7Endpoint</code>](#S7Endpoint)  

| Param | Type | Description |
| --- | --- | --- |
| area | <code>number</code> | the code of the area to be read |
| address | <code>number</code> | the address where to read from |
| length | <code>number</code> | the amount of bytes to read |
| [db] | <code>number</code> | the db number to be read (in the case area is a DB) |

<a name="S7Endpoint+readDB"></a>

### s7Endpoint.readDB(db, address, length) ⇒ <code>Promise.&lt;Buffer&gt;</code>
Reads data from a DB

**Kind**: instance method of [<code>S7Endpoint</code>](#S7Endpoint)  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>number</code> | the number of the DB to be read |
| address | <code>number</code> | the address where to read from |
| length | <code>number</code> | the amount of bytes to read |

<a name="S7Endpoint+readInputs"></a>

### s7Endpoint.readInputs(address, length) ⇒ <code>Promise.&lt;Buffer&gt;</code>
Reads data from the inputs area

**Kind**: instance method of [<code>S7Endpoint</code>](#S7Endpoint)  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>number</code> | the address where to read from |
| length | <code>number</code> | the amount of bytes to read |

<a name="S7Endpoint+readOutputs"></a>

### s7Endpoint.readOutputs(address, length) ⇒ <code>Promise.&lt;Buffer&gt;</code>
Reads data from the outputs area

**Kind**: instance method of [<code>S7Endpoint</code>](#S7Endpoint)  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>number</code> | the address where to read from |
| length | <code>number</code> | the amount of bytes to read |

<a name="S7Endpoint+readFlags"></a>

### s7Endpoint.readFlags(address, length) ⇒ <code>Promise.&lt;Buffer&gt;</code>
Reads data from the flags (memory / merker) area

**Kind**: instance method of [<code>S7Endpoint</code>](#S7Endpoint)  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>number</code> | the address where to read from |
| length | <code>number</code> | the amount of bytes to read |

<a name="S7Endpoint+writeVars"></a>

### s7Endpoint.writeVars(items) ⇒ <code>Promise.&lt;object&gt;</code>
Writes multiple values onto multiple PLC areas. Care must be
taken not to exceed the maximum PDU size both of the request
and the response telegrams

**Kind**: instance method of [<code>S7Endpoint</code>](#S7Endpoint)  

| Param | Type | Description |
| --- | --- | --- |
| items | <code>Array.&lt;object&gt;</code> | the array of items to send |
| items[].area | <code>number</code> | the area code to be read |
| [items[].db] | <code>number</code> | the db number to be read (in case of a DB) |
| items[].transport | <code>number</code> | the transport length |
| items[].address | <code>number</code> | the address where to read from |
| items[].length | <code>number</code> | the number of elements to read (according to transport) |
| items[].dataTransport | <code>number</code> | the transport length of the written buffer |
| items[].data | <code>Buffer</code> | the transport length of the written buffer |

<a name="S7Endpoint+writeArea"></a>

### s7Endpoint.writeArea(area, address, data, [db]) ⇒ <code>Promise.&lt;void&gt;</code>
Writes arbitrary length of data into a memory area of 
the PLC. This method accounts for the negotiated PDU 
size and splits it in multiple requests if necessary

**Kind**: instance method of [<code>S7Endpoint</code>](#S7Endpoint)  

| Param | Type | Description |
| --- | --- | --- |
| area | <code>number</code> | the code of the area to be written |
| address | <code>number</code> | the address where to write to |
| data | <code>Buffer</code> | the data to be written |
| [db] | <code>number</code> | the db number to be written (in the case area is a DB) |

<a name="S7Endpoint+writeDB"></a>

### s7Endpoint.writeDB(db, address, data) ⇒ <code>Promise.&lt;void&gt;</code>
Writes data into a DB

**Kind**: instance method of [<code>S7Endpoint</code>](#S7Endpoint)  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>number</code> | the number of the DB to be written |
| address | <code>number</code> | the address where to write to |
| data | <code>Buffer</code> | the amount of bytes to write |

<a name="S7Endpoint+writeOutputs"></a>

### s7Endpoint.writeOutputs(address, data) ⇒ <code>Promise.&lt;void&gt;</code>
Writes data into the outputs area

**Kind**: instance method of [<code>S7Endpoint</code>](#S7Endpoint)  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>number</code> | the address where to write to |
| data | <code>Buffer</code> | the amount of bytes to write |

<a name="S7Endpoint+writeFlags"></a>

### s7Endpoint.writeFlags(address, data) ⇒ <code>Promise.&lt;void&gt;</code>
Writes data into the flags (memory / merker) area

**Kind**: instance method of [<code>S7Endpoint</code>](#S7Endpoint)  

| Param | Type | Description |
| --- | --- | --- |
| address | <code>number</code> | the address where to write to |
| data | <code>Buffer</code> | the amount of bytes to write |

<a name="S7Endpoint+blockCount"></a>

### s7Endpoint.blockCount() ⇒ [<code>Promise.&lt;BlockCountResponse&gt;</code>](#BlockCountResponse)
Gets a count of blocks from the PLC of each type

**Kind**: instance method of [<code>S7Endpoint</code>](#S7Endpoint)  
**Returns**: [<code>Promise.&lt;BlockCountResponse&gt;</code>](#BlockCountResponse) - an object with the block type as property key ("DB", "FB", ...) and the count as property value  
<a name="S7Endpoint+listBlocks"></a>

### s7Endpoint.listBlocks(type) ⇒ <code>Promise.&lt;Array.&lt;ListBlockResponse&gt;&gt;</code>
List the available blocks of the requested type

**Kind**: instance method of [<code>S7Endpoint</code>](#S7Endpoint)  

| Param | Type | Description |
| --- | --- | --- |
| type | <code>number</code> \| <code>string</code> | the block name in string, or its ID |

<a name="S7Endpoint+getBlockInfo"></a>

### s7Endpoint.getBlockInfo(type, number, [filesystem]) ⇒ <code>Promise.&lt;Buffer&gt;</code>
Gets the information buffer of the requested block

**Kind**: instance method of [<code>S7Endpoint</code>](#S7Endpoint)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| type | <code>string</code> \| <code>number</code> |  | the block type |
| number | <code>number</code> |  | the block number |
| [filesystem] | <code>string</code> | <code>&quot;&#x27;A&#x27;&quot;</code> | the filesystem being queried |

<a name="S7Endpoint+listAllBlocks"></a>

### s7Endpoint.listAllBlocks() ⇒ [<code>Promise.&lt;BlockList&gt;</code>](#BlockList)
List all blocks of all available types

**Kind**: instance method of [<code>S7Endpoint</code>](#S7Endpoint)  
<a name="S7Endpoint+getTime"></a>

### s7Endpoint.getTime() ⇒ <code>Promise.&lt;Date&gt;</code>
Gets the PLC's date/time

**Kind**: instance method of [<code>S7Endpoint</code>](#S7Endpoint)  
<a name="S7Endpoint+setTime"></a>

### s7Endpoint.setTime([date]) ⇒ <code>Promise.&lt;void&gt;</code>
Sets the PLC's date/time

**Kind**: instance method of [<code>S7Endpoint</code>](#S7Endpoint)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [date] | <code>Date</code> | <code>now</code> | The date/time to be set. Defaults to the current timestamp |

<a name="S7Endpoint+uploadBlock"></a>

### s7Endpoint.uploadBlock(type, number, [headerOnly], [filesystem]) ⇒ <code>Promise.&lt;Buffer&gt;</code>
Reads the specified block from the PLC

**Kind**: instance method of [<code>S7Endpoint</code>](#S7Endpoint)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| type | <code>string</code> \| <code>number</code> |  |  |
| number | <code>number</code> |  |  |
| [headerOnly] | <code>boolean</code> | <code>false</code> | if we should ask for module header (`$`) instead of complete (`_`) |
| [filesystem] | <code>string</code> | <code>&quot;&#x27;A&#x27;&quot;</code> | the filesystem to query (`A`, `P` or `B`) |

<a name="S7Endpoint+getSSL"></a>

### s7Endpoint.getSSL([id], [index], [strict]) ⇒ <code>Promise.&lt;Array.&lt;Buffer&gt;&gt;</code>
Gets a SystemStatusList specified by its ID and Index

**Kind**: instance method of [<code>S7Endpoint</code>](#S7Endpoint)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [id] | <code>number</code> | <code>0</code> | the SSL ID |
| [index] | <code>number</code> | <code>0</code> | the SSL Index |
| [strict] | <code>boolean</code> | <code>false</code> | Whether it should verify if the requested Ids and indexes match |

<a name="S7Endpoint+getAvailableSSL"></a>

### s7Endpoint.getAvailableSSL() ⇒ <code>Promise.&lt;Array.&lt;number&gt;&gt;</code>
Gets the available SSL IDs by querying SSL ID 0x000, Index 0x0000

**Kind**: instance method of [<code>S7Endpoint</code>](#S7Endpoint)  
<a name="S7Endpoint+getModuleIdentification"></a>

### s7Endpoint.getModuleIdentification() ⇒ [<code>Promise.&lt;ModuleInformation&gt;</code>](#ModuleInformation)
Gets and parses the 0x0011 SSL ID that contains, among other
infos, the equipment's order number.
This may not be supported by the PLC. In this case, an error
is thrown

**Kind**: instance method of [<code>S7Endpoint</code>](#S7Endpoint)  
<a name="S7Endpoint+getComponentIdentification"></a>

### s7Endpoint.getComponentIdentification() ⇒ [<code>Promise.&lt;ComponentIdentification&gt;</code>](#ComponentIdentification)
Gets and parses the 0x001c SSL ID that contains general information
about the device and the installation
This may not be supported by the PLC. In this case, an error
is thrown

**Kind**: instance method of [<code>S7Endpoint</code>](#S7Endpoint)  
<a name="S7Endpoint+event_error"></a>

### "error" (e)
Emitted when an error occurs with the underlying
transport or the underlying connection

**Kind**: event emitted by [<code>S7Endpoint</code>](#S7Endpoint)  

| Param | Type | Description |
| --- | --- | --- |
| e | <code>\*</code> | the error |

<a name="S7Endpoint+event_disconnect"></a>

### "disconnect"
Emitted when we have disconnected from the PLC

**Kind**: event emitted by [<code>S7Endpoint</code>](#S7Endpoint)  
<a name="S7Endpoint+event_connect"></a>

### "connect"
Emitted when we're connected to the PLC and
ready to communicate

**Kind**: event emitted by [<code>S7Endpoint</code>](#S7Endpoint)  
<a name="S7Item"></a>

## S7Item
**Kind**: global class  

* [S7Item](#S7Item)
    * [new S7Item(name, address, [opts])](#new_S7Item_new)
    * [.updateValueFromBuffer()](#S7Item+updateValueFromBuffer)
    * [.getWriteBuffer(value)](#S7Item+getWriteBuffer)
    * [.getReadItemRequest()](#S7Item+getReadItemRequest) ⇒
    * [.readValueFromResponse(res, req)](#S7Item+readValueFromResponse)

<a name="new_S7Item_new"></a>

### new S7Item(name, address, [opts])

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | name of this item |
| address | <code>string</code> | address of this item |
| [opts] | <code>object</code> | custom options (not used for now) |

<a name="S7Item+updateValueFromBuffer"></a>

### s7Item.updateValueFromBuffer()
Update the item's value according to the internal buffer data.

**Kind**: instance method of [<code>S7Item</code>](#S7Item)  
<a name="S7Item+getWriteBuffer"></a>

### s7Item.getWriteBuffer(value)
Returns a buffer with the data to be written to the PLC, 
according to the type of the item and the values provided

**Kind**: instance method of [<code>S7Item</code>](#S7Item)  

| Param | Type | Description |
| --- | --- | --- |
| value | <code>\*</code> | array of values |

<a name="S7Item+getReadItemRequest"></a>

### s7Item.getReadItemRequest() ⇒
Return a request item that may be used with readVars

**Kind**: instance method of [<code>S7Item</code>](#S7Item)  
**Returns**: an object with properties area, db, transport, address and length  
<a name="S7Item+readValueFromResponse"></a>

### s7Item.readValueFromResponse(res, req)
Updates the item's internal buffer with the supplied request-response pair.
Large items may need multiple requests to read the whole memory area.

**Kind**: instance method of [<code>S7Item</code>](#S7Item)  

| Param | Type | Description |
| --- | --- | --- |
| res | <code>\*</code> | the response item returned from the PLC |
| req | <code>\*</code> | the request used to query the value |

<a name="S7ItemGroup"></a>

## S7ItemGroup
**Kind**: global class  

* [S7ItemGroup](#S7ItemGroup)
    * [new S7ItemGroup(s7endpoint, [opts])](#new_S7ItemGroup_new)
    * [.destroy()](#S7ItemGroup+destroy)
    * [.setTranslationCB(func)](#S7ItemGroup+setTranslationCB)
    * [.addItems(tags)](#S7ItemGroup+addItems)
    * [.removeItems(tags)](#S7ItemGroup+removeItems)
    * [.writeItems(tags, values)](#S7ItemGroup+writeItems)
    * [.readAllItems()](#S7ItemGroup+readAllItems)

<a name="new_S7ItemGroup_new"></a>

### new S7ItemGroup(s7endpoint, [opts])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| s7endpoint | [<code>S7Endpoint</code>](#S7Endpoint) |  |  |
| [opts] | <code>object</code> |  |  |
| [opts.skipOptimization] | <code>boolean</code> | <code>false</code> | whether item optimization should be skipped |
| [opts.optimizationGap] | <code>number</code> | <code>5</code> | how many bytes away from the last item we may still try to optimize |

<a name="S7ItemGroup+destroy"></a>

### s7ItemGroup.destroy()
Destroys this intance, releasing the used resources and 
the references on S7Endpoint

**Kind**: instance method of [<code>S7ItemGroup</code>](#S7ItemGroup)  
<a name="S7ItemGroup+setTranslationCB"></a>

### s7ItemGroup.setTranslationCB(func)
Sets a function that will be called whenever a tag name needs to be 
resolved to an address. By default, if none is given, then no translation
is performed

**Kind**: instance method of [<code>S7ItemGroup</code>](#S7ItemGroup)  
**Throws**:

- an error when the supplied parameter is not a function


| Param | Type | Description |
| --- | --- | --- |
| func | <code>null</code> \| <code>undefined</code> \| <code>function</code> | the function that translates tags to addresses |

<a name="S7ItemGroup+addItems"></a>

### s7ItemGroup.addItems(tags)
Add an item or a group of items to be read from "readAllItems"

**Kind**: instance method of [<code>S7ItemGroup</code>](#S7ItemGroup)  
**Throws**:

- if the supplied parameter is not a string or an array of strings
- if the format of the address of the tag is invalid


| Param | Type | Description |
| --- | --- | --- |
| tags | <code>string</code> \| <code>Array.&lt;string&gt;</code> | the tag or list of tags to be added |

<a name="S7ItemGroup+removeItems"></a>

### s7ItemGroup.removeItems(tags)
Removes an item or a group of items to be read from "readAllItems"

**Kind**: instance method of [<code>S7ItemGroup</code>](#S7ItemGroup)  

| Param | Type | Description |
| --- | --- | --- |
| tags | <code>string</code> \| <code>Array.&lt;string&gt;</code> | the tag or list of tags to be removed |

<a name="S7ItemGroup+writeItems"></a>

### s7ItemGroup.writeItems(tags, values)
Writes the provided items with the provided values on the PLC

Writing items whose payload's size is bigger than the max packet 
size allowed by the PLC is intentionally not supported. This 
would need to be split among multiple packets and could cause issues
on the PLC depending on the programmed logic. You'll need to write 
items individually, and if synchronization is an issue, to write 
additional logic on the PLC for synchronization

**Kind**: instance method of [<code>S7ItemGroup</code>](#S7ItemGroup)  
**Throws**:

- [<code>NodeS7Error</code>](#NodeS7Error) ERR_ITEM_TOO_BIG - when the item being written does not fit a single write request


| Param | Type |
| --- | --- |
| tags | <code>string</code> \| <code>Array.&lt;string&gt;</code> | 
| values | <code>\*</code> \| <code>Array.&lt;\*&gt;</code> | 

<a name="S7ItemGroup+readAllItems"></a>

### s7ItemGroup.readAllItems()
Reads the values of all items in this group

**Kind**: instance method of [<code>S7ItemGroup</code>](#S7ItemGroup)  
<a name="BlockCountResponse"></a>

## BlockCountResponse : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [OB] | <code>number</code> | the amount of OBs |
| [DB] | <code>number</code> | the amount of DBs |
| [SDB] | <code>number</code> | the amount of SDBs |
| [FC] | <code>number</code> | the amount of FCs |
| [SFC] | <code>number</code> | the amount of SFCs |
| [FB] | <code>number</code> | the amount of FBs |
| [SFB] | <code>number</code> | the amount of SFBs |

<a name="ListBlockResponse"></a>

## ListBlockResponse : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| number | <code>number</code> | the block number |
| flags | <code>number</code> |  |
| lang | <code>number</code> |  |

<a name="BlockCountResponse"></a>

## BlockCountResponse : <code>S7Connection.BlockCountResponse</code>
**Kind**: global typedef  
<a name="ListBlockResponse"></a>

## ListBlockResponse : <code>S7Connection.ListBlockResponse</code>
**Kind**: global typedef  
<a name="BlockList"></a>

## BlockList : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| OB | [<code>Array.&lt;ListBlockResponse&gt;</code>](#ListBlockResponse) | list of blocks of type OB |
| DB | [<code>Array.&lt;ListBlockResponse&gt;</code>](#ListBlockResponse) | list of blocks of type DB |
| SDB | [<code>Array.&lt;ListBlockResponse&gt;</code>](#ListBlockResponse) | list of blocks of type SDB |
| FC | [<code>Array.&lt;ListBlockResponse&gt;</code>](#ListBlockResponse) | list of blocks of type FC |
| SFC | [<code>Array.&lt;ListBlockResponse&gt;</code>](#ListBlockResponse) | list of blocks of type SFC |
| FB | [<code>Array.&lt;ListBlockResponse&gt;</code>](#ListBlockResponse) | list of blocks of type FB |
| SFB | [<code>Array.&lt;ListBlockResponse&gt;</code>](#ListBlockResponse) | list of blocks of type SFB |

<a name="ModuleInformation"></a>

## ModuleInformation : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type |
| --- | --- |
| [moduleOrderNumber] | <code>string</code> | 
| [hardwareOrderNumber] | <code>string</code> | 
| [firmwareOrderNumber] | <code>string</code> | 

<a name="ComponentIdentification"></a>

## ComponentIdentification : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| [systemName] | <code>string</code> | W#16#0001: Name of the automation system |
| [moduleName] | <code>string</code> | W#16#0002: Name of the module |
| [plantName] | <code>string</code> | W#16#0003: Plant designation of the module |
| [copyright] | <code>string</code> | W#16#0004: Copyright entry |
| [serialNumber] | <code>string</code> | W#16#0005: Serial number of the module |
| [partType] | <code>string</code> | W#16#0007: Module type name |
| [mmcSerialNumber] | <code>string</code> | W#16#0008: Serial number of the memory card |
| [vendorId] | <code>number</code> | W#16#0009: Manufacturer and profile of a CPU module - Vendor ID |
| [profileId] | <code>number</code> | W#16#0009: Manufacturer and profile of a CPU module - Profile ID |
| [profileSpecific] | <code>number</code> | W#16#0009: Manufacturer and profile of a CPU module - Profile-specific Id |
| [oemString] | <code>string</code> | W#16#000A: OEM ID of a module (S7-300 only) |
| [oemId] | <code>number</code> | W#16#000A: OEM ID of a module (S7-300 only) |
| [oemAdditionalId] | <code>number</code> | W#16#000A: OEM ID of a module (S7-300 only) |
| [location] | <code>string</code> | W#16#000B: Location ID of a module |

