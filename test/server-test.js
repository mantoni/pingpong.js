/*global describe, it, beforeEach, afterEach*/
/*
 * pingpong.js
 *
 * Copyright (c) 2012-2015 Maximilian Antoni <mail@maxantoni.de>
 *
 * @license MIT
 */
'use strict';

var assert   = require('assert');
var sinon    = require('sinon');
var net      = require('net');
var pingpong = require('../lib/pingpong');


describe('server', function () {
  var server;
  var invoker;

  beforeEach(function () {
    server = new net.Server();
    server.listen = sinon.stub();
    sinon.stub(net, 'createServer').returns(server);
    invoker = sinon.stub();
    sinon.stub(pingpong, 'bind').returns(invoker);
  });

  afterEach(function () {
    net.createServer.restore();
    pingpong.bind.restore();
  });

  it('invokes net.createServer and bind to given port', function () {
    pingpong.server(8000, function () { return; });

    sinon.assert.calledOnce(net.createServer);
    sinon.assert.calledOnce(server.listen);
    sinon.assert.calledWith(server.listen, 8000);
  });

  it('yields server on listening', function () {
    var spy = sinon.spy();

    pingpong.server(8000, spy);

    sinon.assert.notCalled(spy);

    server.listen.invokeCallback();

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWithMatch(spy, null, {
      server    : sinon.match.same(server),
      onConnect : sinon.match.func
    });
  });

  it('invokes onConnect with client', function () {
    server.listen.yields();
    var spy     = sinon.spy();
    var socket  = new net.Socket();

    pingpong.server(8000, function (err, server) {
      /*jslint unparam: true*/
      server.onConnect(spy);
    });
    net.createServer.invokeCallback(socket);

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWithMatch(spy, {
      socket    : sinon.match.same(socket),
      onMessage : sinon.match.func,
      invoke    : sinon.match.same(invoker)
    });
  });

  it('invokes onConnect with already connected client', function () {
    server.listen.yields();
    var spy     = sinon.spy();
    var socket  = new net.Socket();
    var s;

    pingpong.server(8000, function (err, server) {
      /*jslint unparam: true*/
      s = server;
    });
    net.createServer.invokeCallback(socket);
    s.onConnect(spy);

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWithMatch(spy, {
      socket    : sinon.match.same(socket),
      onMessage : sinon.match.func,
      invoke    : sinon.match.same(invoker)
    });
  });

  it('invokes message handler when bind yields', function () {
    server.listen.yields();
    var spy = sinon.spy();

    pingpong.server(8000, function (err, server) {
      /*jslint unparam: true*/
      server.onConnect(function (client) {
        client.onMessage(spy);
      });
    });
    net.createServer.invokeCallback(new net.Socket());
    pingpong.bind.invokeCallback(123, 'abc');

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, 123, 'abc');
  });

  it('does not throw if bind yields before handler registration', function () {
    server.listen.yields();

    pingpong.server(8000, function (err, server) {
      /*jslint unparam: true*/
      server.onConnect(function () { return; });
    });
    net.createServer.invokeCallback(new net.Socket());

    assert.doesNotThrow(function () {
      pingpong.bind.invokeCallback(123, 'abc');
    });
  });

  it('has clients array', function () {
    server.listen.yields();
    var s;

    pingpong.server(8000, function (err, server) {
      /*jslint unparam: true*/
      s = server;
    });

    assert(Array.isArray(s.clients));
  });

  it('adds client object to clients array on connect', function () {
    server.listen.yields();
    var spy     = sinon.spy();
    var socket  = new net.Socket();
    var s;

    pingpong.server(8000, function (err, server) {
      /*jslint unparam: true*/
      server.onConnect(spy);
      s = server;
    });
    net.createServer.invokeCallback(socket);

    assert.strictEqual(spy.firstCall.args[0], s.clients[0]);
  });

  it('removes client object from clients array on close', function () {
    server.listen.yields();
    var socket = new net.Socket();
    var s;

    pingpong.server(8000, function (err, server) {
      /*jslint unparam: true*/
      s = server;
    });
    net.createServer.invokeCallback(socket);
    socket.emit('close');

    assert.equal(s.clients.length, 0);
  });

  it('invokes onDisconnect callback on close', function () {
    server.listen.yields();
    var spy1    = sinon.spy();
    var spy2    = sinon.spy();
    var socket  = new net.Socket();

    pingpong.server(8000, function (err, server) {
      /*jslint unparam: true*/
      server.onConnect(spy1);
      server.onDisconnect(spy2);
    });
    net.createServer.invokeCallback(socket);
    socket.emit('close');

    sinon.assert.calledOnce(spy2);
    sinon.assert.calledWith(spy2, spy1.firstCall.args[0]);
  });

});
