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
    this.client = new events.EventEmitter();
    sinon.stub(net, 'connect').returns(this.client);
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


  'should return client': function () {
    var result = pingpong.client({}, function () {});

    assert.strictEqual(result, this.client);
  },


  'should bind client yield invoker': function () {
    var spy = sinon.spy();

    pingpong.client({}, spy);
    net.connect.invokeCallback();

    sinon.assert.calledOnce(pingpong.bind);
    sinon.assert.calledWith(pingpong.bind, this.client);
    sinon.assert.calledOnce(spy);
    sinon.assert.calledWith(spy, this.invoker);
  }

});

