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
    this.server = {
      listen : sinon.spy()
    };
    sinon.stub(net, 'createServer').returns(this.server);
    sinon.stub(pingpong, 'bind');
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


  'should return server': function () {
    var result = pingpong.server(8000, function () {});

    assert.strictEqual(result, this.server);
  },


  'should bind socket and given handler function': function () {
    var handler = function () {};
    var socket = new events.EventEmitter();
    net.createServer.yields(socket);

    pingpong.server(8000, handler);

    sinon.assert.calledOnce(pingpong.bind);
    sinon.assert.calledWith(pingpong.bind, socket, handler);
  }

});

