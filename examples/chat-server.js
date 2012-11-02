/**
 * pingpong.js
 *
 * Copyright (c) 2012 Maximilian Antoni <mail@maxantoni.de>
 *
 * @license MIT
 */
'use strict';

var pingpong = require('../lib/pingpong');

pingpong.server(8000, function (err, server) {

  function broadcast(event, sender, message) {
    server.clients.forEach(function (client) {
      client.invoke(event, sender, message);
    });
  }

  server.onConnect(function (client) {
    var names = server.clients.map(function (client) {
      return client.name;
    });

    var name;
    client.onMessage(function (event, message, callback) {
      if (name && event === 'message') {
        broadcast('message', name, message);
      }
      if (!name && event === 'join') {
        name = client.name = message;
        callback(null, names);
        broadcast('join', name);
      }
    });

  });

  server.onDisconnect(function (client) {
    broadcast('leave', client.name);
  });

});
