/**
 * pingpong.js
 *
 * Copyright (c) 2012 Maximilian Antoni <mail@maxantoni.de>
 *
 * @license MIT
 */
'use strict';

var net = require('net');


function responder(socket, id) {
  return function (err, val) {
    var msg = { ci : id };
    if (err) {
      msg.er = err instanceof Error ? err.message : err;
    } else if (val) {
      msg.re = val;
    }
    socket.write(JSON.stringify(msg));
  };
}


function invoker(socket, callbacks) {
  var id = 0;
  return function invoke() {
    var msg = {};
    if (arguments.length) {
      var args = Array.prototype.slice.call(arguments);
      if (typeof args[args.length - 1] === 'function') {
        callbacks[id] = args.pop();
        msg.id = id++;
      }
      if (args.length) {
        msg.ar = args;
      }
    }
    socket.write(JSON.stringify(msg));
  };
}


function dataHandler(socket, callbacks, handle) {
  return function (data) {
    var json = JSON.parse(data);
    if (json.hasOwnProperty('ci')) {
      var ci        = json.ci;
      var callback  = callbacks[ci];
      if (callback) {
        delete callbacks[ci];
        if (json.er) {
          callback(new Error(json.er));
        } else {
          callback(null, json.re);
        }
      }
    } else {
      var args = json.ar;
      if (json.hasOwnProperty('id')) {
        args = args || [];
        args[Math.max(args.length, handle.length - 1)] =
          responder(socket, json.id);
      }
      try {
        if (args) {
          handle.apply(null, args);
        } else {
          handle();
        }
      } catch (e) {
        process.stderr.write('Caught err in handler.\n  Data: ' + data +
          '\n  ' + e.stack + '\n');
      }
    }
  };
}


function errorHandler(callbacks) {
  return function (err) {
    var ci;
    for (ci in callbacks) {
      if (callbacks.hasOwnProperty(ci)) {
        try {
          callbacks[ci](err);
        } catch (e) {
          process.stderr.write('Caught error in callback.\n  ' +
            e.stack + '\n');
        }
      }
    }
    callbacks = {};
  };
}


exports.bind = function (socket, handle) {
  var callbacks = {};
  var error = errorHandler(callbacks);
  socket.on('error', error);
  socket.on('close', function () {
    error(new Error('Socket closed'));
  });
  socket.on('data', dataHandler(socket, callbacks, handle));
  return invoker(socket, callbacks);
};

exports.server = function (port, handle) {
  var server = net.createServer(function (socket) {
    exports.bind(socket, handle);
  });
  server.listen(port);
  return server;
};

exports.client = function (config, callback) {
  var client = net.connect(config, function () {
    var invoker = exports.bind(client);
    callback(invoker);
  });
  return client;
};
