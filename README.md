# CyPRus

[JSON-RPC](http://www.jsonrpc.org/specification) 2.0 client for WebSockets (node or browser). Bring your own Promise polyfill where required.

For a JSON-RPC 2.0 server check out [ResPeCt](https://github.com/mhingston/respect).

## Installation

    npm install mhingston/cyprus
    
## Usage

### Instantiate a client

```javascript
const rpc = new Cyprus(
{
    url: 'ws://127.0.0.1:3000',
    retryDelay: 3000,
    timeout: 60000,
    logger: false
});
```
* `url` {String} Websocket URL (required).
* `retryDelay` {Number} If the connection is closed retry connecting after this many milliseconds (optional). Default = `3000`.
* `timeout` {Number} If an RPC call receives no response after this period (milliseconds) then a timeout error will be returned to the callback (optional). Default = `60000`.
* `logger` {Boolean|Function} Set to true to have debug log written to the console or pass a function to receive the log messages (optional). Default = `false`.

### Connect

```javascript
// Callback
rpc.connect(() =>
{
    // ready to make calls
})

// Promise
rpc.connect()
.then(() =>
{
    // ready to make calls
})
```

### Sending a call

```javascript
// Single call (callback)
rpc.call(
{
    method: 'Some.RPC.Method',
    params:
    {
        foo: '',
        bar:
        {
            qux: 1,
            quux: null
        },
        baz: [1, 2, 3]

    },
    callback: (error, results) =>
    {
        console.log(error)
        console.log(results)
    }
});

// Single call (promise)
rpc.call(
{
    method: 'Some.RPC.Method',
    params:
    {
        foo: '',
        bar:
        {
            qux: 1,
            quux: null
        },
        baz: [1, 2, 3]

    }
})
.then((resultOrError) => console.log(resultOrError));

// Batched call (callback)
rpc.call(
[
    {
        method: 'Another.RPC.Method',
        params: [1, 2, 3],
        callback: (error, results) =>
        {
            console.log(error)
            console.log(results)
        }
    },
    {
        method: 'HelloWorld',
        notification: true
    }
]);

// Batched call (promise)
rpc.call(
[
    {
        method: 'Another.RPC.Method',
        params: [1, 2, 3]
    },
    {
        method: 'HelloWorld',
        notification: true
    }
])
.then((resultOrError) => console.log(resultOrError));
```
This method takes an `Object` or an `Array` of `Objects` as below:

* `method` {String} Name of the RPC method to call (required).
* `params` {Array | Object} Arguments to pass to the RPC method (optional). Be aware that your params will be "[JSONified](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)".
* `notification` {Boolean} Whether the call is a notification or not (i.e. expects a response).
* `callback` {Function} The function to return the response to (optional).
  * `error` {Error} Error object. Will be `null` if there is no error.
  * `result` {Object} Response from the RPC call.

## Notes

* Supports JSON-RPC 2.0 **only**.
* No errors (exceptions) are thrown from RPC calls. When an error occurs on the RPC server an RPC [Error object](http://www.jsonrpc.org/specification#error_object) is returned. Due to this when using the promises be aware that the resolved value will be `resultOrError`. See [the JSON-RPC 2.0 spec](http://www.jsonrpc.org/specification#response_object) for more information.
* If using webpack make sure you set `externals: ['ws']` in your webpack config to avoid warnings about missing dependencies. See [this issue](https://github.com/socketio/socket.io-client/issues/933) for more background.

```javascript
externals: ['ws']
```