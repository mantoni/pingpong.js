# pingpong.js

Dead simple RPC with response support.

[![Build Status](https://secure.travis-ci.org/mantoni/pingpong.js.png?branch=master)](http://travis-ci.org/mantoni/pingpong.js)

## Install on Node

```
npm install pingpong
```

## What it does

Allows a client side function to invoke a server side function with some
arguments and an optional callback. The server can use the callback to send
a reply or an error to the client.

## Usage

Server:

```js
var pingpong = require('pingpong');

pingpong.server(8000, function (err, server) {

  server.onConnect(function (client) {
    client.onMessage(function (text, responder) {
      responder(null, text.toUpperCase());
    });
  });

});
```

Client:

```js
var pingpong = require('pingpong');

pingpong.client({ port : 8000 }, function (err, remote) {
  remote.invoke('Hello world!', function (err, result) {
    console.log(result);
  });
});
```

Prints `HELLO WORLD!`.

Run `echo.sh` from within the examples directory to see it in action.

## API

- `server(port, callback)`: Creates a server. Invokes `callback` with `(err,
  server)`.
- `client(config, callback)`: Creates a new client. The config is passed to
  `net.connect`. Invokes `callback` with `(err, remote)`.
- `bind(socket, handler)`: Binds a message handler to the given socket and
  returns an invoker. The message handler will receive messages and invoker can
  be used to invoke functions on the other side.

### Server API

- `server`: The server returned by `net.createServer`.
- `clients`: An array of clients.
- `onConnect(callback)`: Sets the connection handler. On new client
  connections, `callback` is invoked with `client`.
- `onDisconnect(callback)`: Sets the disconnct handler. On client disconnects,
  `callback` is invoked with `client`.

### Server side client API

- `socket`: The `net.Socket` of the client.
- `onMessage(callback)`: Sets the client message handler. On new client
  messages, `callback` is invoked with the arguments that where passed in on
  the client side. If a client passes in a callback as the last argument to
  `invoke`, it is passed in to the handler and allows to send a reply.
- `invoke(...[, callback])`: Invokes the `onMessage` callback of thie client
  with the given arguments. If a callback is given, it will be invoked with
  `(err, reply)`.

### Client side remote API

- `socket`: The socket as returned by `net.connect`.
- `invoke(...[, callback])`: Invokes the `onMessage` callback for this client
  on the server with the given arguments. If a callback is given, it will be
  invoked with `(err, reply)`.
- `onMessage(callback)`: Sets the server message handler. On new server
  messages, `calback` is invoked with the arguments that where passed in on
  the server side. If a server passes in a callback as the last argument to
  `invoke`, it is passe in to hte handler and allows to send a reply.

## License

MIT
