# pingpong.js

Dead simple RPC with response support.

[![Build Status](https://secure.travis-ci.org/mantoni/pingpong.js.png?branch=master)](http://travis-ci.org/mantoni/pingpong.js)

## Install on Node

```
npm install pingpong
```

## What it does

Allows a client side function to invoke a server side function with some arguments and an optional callback. The server can err or answer on the callback.

That's it.

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
