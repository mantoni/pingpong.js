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


test('pingpong.client', {

  before: function () {
    this.socket = new events.EventEmitter();
    sinon.stub(net, 'connect').returns(this.socket);
    this.invoker = function () {};
    sinon.stub(pingpong, 'bind').returns(this.invoker);
  },

  after: function () {
    net.connect.restore();
    pingpong.bind.restore();
  },


  'should invoke net.connect with given config': function () {
    var config = { port : 8000 };

    pingpong.client(config, function () {});

    sinon.assert.calledOnce(net.connect);
    sinon.assert.calledWith(net.connect, config, sinon.match.func);
  },


  'should not yield if not connected': function () {
    var spy = sinon.spy();

    pingpong.client({}, spy);

    sinon.assert.notCalled(spy);
  },


  'should yield error on connection error': function () {
    var spy = sinon.spy();
    var err = new Error();
    pingpong.client({}, spy);

    this.socket.emit('error', err);

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, err);
  },


  'should not yield errors twice': function () {
    var spy = sinon.spy();
    pingpong.client({}, spy);

    this.socket.emit('error');
    try {
      this.socket.emit('error');
    } catch (ignored) {}

    sinon.assert.calledOnce(spy);
  },


  'should yield null and remote once connected': function () {
    var spy = sinon.spy();
    pingpong.client({}, spy);

    net.connect.invokeCallback();

    sinon.assert.calledOnce(pingpong.bind);
    sinon.assert.calledWith(pingpong.bind, this.socket);
    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, null, sinon.match({
      socket : this.socket,
      invoke : this.invoker
    }));
  },


  'should not yield again on error after successful connect': function () {
    var spy = sinon.spy();
    pingpong.client({}, spy);
    net.connect.invokeCallback();
    spy.reset();

    try {
      this.socket.emit('error');
    } catch (ignored) {}

    sinon.assert.notCalled(spy);
  },


  'should allow to register a message handler': function () {
    var spy = sinon.spy();

    pingpong.client({}, function (err, remote) {
      remote.onMessage(spy);
    });
    net.connect.invokeCallback();
    pingpong.bind.invokeCallback(123, 'abc');

    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, 123, 'abc');
  },


  'should not throw if no message listener was installed': function () {
    pingpong.client({}, function () {});
    net.connect.invokeCallback();

    assert.doesNotThrow(function () {
      pingpong.bind.invokeCallback(123, 'abc');
    });
  }

});

