/**
 * pingpong.js
 *
 * Copyright (c) 2012 Maximilian Antoni <mail@maxantoni.de>
 *
 * @license MIT
 */
'use strict';

var test      = require('utest');
var assert    = require('assert');
var sinon     = require('sinon');

var pingpong  = require('../lib/pingpong');
var events    = require('events');
var net       = require('net');


test('pingpong.server', {

  before: function () {
    this.server = new events.EventEmitter();
    this.server.listen = sinon.stub();
    sinon.stub(net, 'createServer').returns(this.server);
    this.invoker = sinon.stub();
    sinon.stub(pingpong, 'bind').returns(this.invoker);
  },

  after: function () {
    net.createServer.restore();
    pingpong.bind.restore();
  },


  'should invoke net.createServer and bind to given port': function () {
    pingpong.server(8000, function () {});

    sinon.assert.calledOnce(net.createServer);
    sinon.assert.calledOnce(this.server.listen);
    sinon.assert.calledWith(this.server.listen, 8000);
  },


  'should yield server on listening': function () {
    var spy = sinon.spy();

    pingpong.server(8000, spy);

    sinon.assert.notCalled(spy);

    this.server.listen.invokeCallback();

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWithMatch(spy, null, {
      server    : sinon.match.same(this.server),
      onConnect : sinon.match.func
    });
  },


  'should invoke onConnect with client': function () {
    this.server.listen.yields();
    var spy     = sinon.spy();
    var socket  = new events.EventEmitter();

    pingpong.server(8000, function (err, server) {
      server.onConnect(spy);
    });
    net.createServer.invokeCallback(socket);

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWithMatch(spy, {
      socket    : sinon.match.same(socket),
      onMessage : sinon.match.func,
      invoke    : sinon.match.same(this.invoker)
    });
  },


  'should invoke onConnect with already connected client': function () {
    this.server.listen.yields();
    var spy     = sinon.spy();
    var socket  = new events.EventEmitter();
    var s;

    pingpong.server(8000, function (err, server) {
      s = server;
    });
    net.createServer.invokeCallback(socket);
    s.onConnect(spy);

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWithMatch(spy, {
      socket    : sinon.match.same(socket),
      onMessage : sinon.match.func,
      invoke    : sinon.match.same(this.invoker)
    });
  },


  'should invoke message handler when bind yields': function () {
    this.server.listen.yields();
    var spy = sinon.spy();

    pingpong.server(8000, function (err, server) {
      server.onConnect(function (client) {
        client.onMessage(spy);
      });
    });
    net.createServer.invokeCallback(new events.EventEmitter());
    pingpong.bind.invokeCallback(123, 'abc');

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, 123, 'abc');
  },


  'should not throw if bind yields before handler registration': function () {
    this.server.listen.yields();
    var spy = sinon.spy();

    pingpong.server(8000, function (err, server) {
      server.onConnect(function () {});
    });
    net.createServer.invokeCallback(new events.EventEmitter());

    assert.doesNotThrow(function () {
      pingpong.bind.invokeCallback(123, 'abc');
    });
  },


  'should have clients array': function () {
    this.server.listen.yields();
    var s;

    pingpong.server(8000, function (err, server) {
      s = server;
    });

    assert(Array.isArray(s.clients));
  },


  'should add client object to clients array on connect': function () {
    this.server.listen.yields();
    var spy     = sinon.spy();
    var socket  = new events.EventEmitter();
    var s;

    pingpong.server(8000, function (err, server) {
      server.onConnect(spy);
      s = server;
    });
    net.createServer.invokeCallback(socket);

    assert.strictEqual(spy.firstCall.args[0], s.clients[0]);
  },


  'should remove client object from clients array on close': function () {
    this.server.listen.yields();
    var socket = new events.EventEmitter();
    var s;

    pingpong.server(8000, function (err, server) {
      s = server;
    });
    net.createServer.invokeCallback(socket);
    socket.emit('close');

    assert.equal(s.clients.length, 0);
  },


  'should invoke onDisconnect callback on close': function () {
    this.server.listen.yields();
    var spy1    = sinon.spy();
    var spy2    = sinon.spy();
    var socket  = new events.EventEmitter();

    pingpong.server(8000, function (err, server) {
      server.onConnect(spy1);
      server.onDisconnect(spy2);
    });
    net.createServer.invokeCallback(socket);
    socket.emit('close');

    sinon.assert.calledOnce(spy2);
    sinon.assert.calledWith(spy2, spy1.firstCall.args[0]);
  }


});

