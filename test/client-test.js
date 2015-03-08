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


describe('client', function () {
  var socket;
  var invoker;

  beforeEach(function () {
    socket = new net.Socket();
    sinon.stub(net, 'connect').returns(socket);
    invoker = function () { return; };
    sinon.stub(pingpong, 'bind').returns(invoker);
  });

  afterEach(function () {
    net.connect.restore();
    pingpong.bind.restore();
  });

  it('invokes net.connect with given config', function () {
    var config = { port : 8000 };

    pingpong.client(config, function () { return; });

    sinon.assert.calledOnce(net.connect);
    sinon.assert.calledWith(net.connect, config, sinon.match.func);
  });

  it('does not yield if not connected', function () {
    var spy = sinon.spy();

    pingpong.client({}, spy);

    sinon.assert.notCalled(spy);
  });

  it('yields error on connection error', function () {
    var spy = sinon.spy();
    var err = new Error();
    pingpong.client({}, spy);

    socket.emit('error', err);

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, err);
  });

  it('does not yield errors twice', function () {
    var spy = sinon.spy();
    pingpong.client({}, spy);

    socket.emit('error');
    try {
      socket.emit('error');
    } catch (ignore) {}

    sinon.assert.calledOnce(spy);
  });

  it('yields null and remote once connected', function () {
    var spy = sinon.spy();
    pingpong.client({}, spy);

    net.connect.invokeCallback();

    sinon.assert.calledOnce(pingpong.bind);
    sinon.assert.calledWith(pingpong.bind, socket);
    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, null, sinon.match({
      socket : socket,
      invoke : invoker
    }));
  });

  it('does not yield again on error after successful connect', function () {
    var spy = sinon.spy();
    pingpong.client({}, spy);
    net.connect.invokeCallback();
    spy.reset();

    try {
      socket.emit('error');
    } catch (ignore) {}

    sinon.assert.notCalled(spy);
  });

  it('allows to register a message handler', function () {
    var spy = sinon.spy();

    pingpong.client({}, function (err, remote) {
      /*jslint unparam: true*/
      remote.onMessage(spy);
    });
    net.connect.invokeCallback();
    pingpong.bind.invokeCallback(123, 'abc');

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, 123, 'abc');
  });

  it('does not throw if no message listener was installed', function () {
    pingpong.client({}, function () { return; });
    net.connect.invokeCallback();

    assert.doesNotThrow(function () {
      pingpong.bind.invokeCallback(123, 'abc');
    });
  });

});
