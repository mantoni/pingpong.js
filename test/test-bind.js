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
var net       = require('net');


test('pingpong.bind', {

  before: function () {
    this.socket = new net.Socket();
    this.socket.write = sinon.stub();
    this.handle = sinon.stub();
    this.invoke = pingpong.bind(this.socket, this.handle);
  },


  'should return a function': function () {
    assert.equal(typeof this.invoke, 'function');
  },


  'should write empty json object to socket': function () {
    this.invoke();

    sinon.assert.calledOnce(this.socket.write);
    sinon.assert.calledWith(this.socket.write, '{}\n');
  },


  'should write single argument': function () {
    this.invoke(42);

    sinon.assert.calledWith(this.socket.write, '{"ar":[42]}\n');
  },


  'should write multiple arguments': function () {
    this.invoke('abc', 42, ['some', 'stuff']);

    sinon.assert.calledWith(this.socket.write,
      '{"ar":["abc",42,["some","stuff"]]}\n');
  },


  'should write id': function () {
    this.invoke(function () {});

    sinon.assert.calledWith(this.socket.write, '{"id":0}\n');
  },


  'should increment id on next call': function () {
    this.invoke(function () {});
    this.socket.write.reset();
    this.invoke(function () {});

    sinon.assert.calledWith(this.socket.write, '{"id":1}\n');
  },


  'should write id and args': function () {
    this.invoke(123, 'abc', function () {});

    sinon.assert.calledWith(this.socket.write, '{"id":0,"ar":[123,"abc"]}\n');
  },


  'should invoke callback on response': function () {
    var spy = sinon.spy();
    this.invoke(spy);

    this.socket.emit('data', new Buffer('{"ci":0}\n'));

    sinon.assert.calledOnce(spy);
  },


  'should not invoke callback again': function () {
    var spy = sinon.spy();
    this.invoke(spy);

    this.socket.emit('data', new Buffer('{"ci":0}\n'));
    this.socket.emit('data', new Buffer('{"ci":0}\n'));

    sinon.assert.calledOnce(spy);
  },


  'should invoke with null and response': function () {
    var spy = sinon.spy();
    this.invoke(spy);

    this.socket.emit('data', new Buffer('{"ci":0,"re":{"abc":123}}\n'));

    sinon.assert.calledWith(spy, null, { abc : 123 });
  },


  'should invoke with error only': function () {
    var spy = sinon.spy();
    this.invoke(spy);

    this.socket.emit('data', new Buffer('{"ci":0,"er":"some error"}\n'));

    sinon.assert.calledWith(spy, sinon.match({
      name    : 'Error',
      message : 'some error'
    }));
  },


  'should only invoke first': function () {
    var spy1 = sinon.spy();
    var spy2 = sinon.spy();
    this.invoke(spy1);
    this.invoke(spy2);

    this.socket.emit('data', new Buffer('{"ci":0}\n'));

    sinon.assert.calledOnce(spy1);
    sinon.assert.notCalled(spy2);
  },


  'should only invoke second': function () {
    var spy1 = sinon.spy();
    var spy2 = sinon.spy();
    this.invoke(spy1);
    this.invoke(spy2);

    this.socket.emit('data', new Buffer('{"ci":1}\n'));

    sinon.assert.notCalled(spy1);
    sinon.assert.calledOnce(spy2);
  },


  'should invoke first and second': function () {
    var spy1 = sinon.spy();
    var spy2 = sinon.spy();
    this.invoke(spy1);
    this.invoke(spy2);

    this.socket.emit('data', new Buffer('{"ci":0}\n{"ci":1}\n'));

    sinon.assert.calledOnce(spy1);
    sinon.assert.calledOnce(spy2);
  },


  'should err on all outstanding responses if socket errs': function () {
    var spy1 = sinon.spy();
    var spy2 = sinon.spy();
    this.invoke(spy1);
    this.invoke(spy2);

    this.socket.emit('error', 'ouch!');

    sinon.assert.calledOnce(spy1);
    sinon.assert.calledOnce(spy2);
    sinon.assert.calledWith(spy1, 'ouch!');
    sinon.assert.calledWith(spy2, 'ouch!');
  },


  'should not err on responses on second error': function () {
    var spy1 = sinon.spy();
    var spy2 = sinon.spy();
    this.invoke(spy1);
    this.invoke(spy2);

    this.socket.emit('error', 'ouch 1');
    this.socket.emit('error', 'ouch 2');

    sinon.assert.calledOnce(spy1);
    sinon.assert.calledOnce(spy2);
  },


  'should err on second callback if first throws on error': sinon.test(
    function () {
      this.stub(process.stderr, 'write'); // stop moaning!
      var stub  = sinon.stub().throws(new TypeError('wrf?'));
      var spy   = sinon.spy();
      this.invoke(stub);
      this.invoke(spy);

      this.socket.emit('error', 'ouch');

      sinon.assert.calledOnce(spy);
    }
  ),


  'should err on all outstanding responses if socket closes': function () {
    var spy1 = sinon.spy();
    var spy2 = sinon.spy();
    this.invoke(spy1);
    this.invoke(spy2);

    this.socket.emit('close');

    sinon.assert.calledOnce(spy1);
    sinon.assert.calledOnce(spy2);
    sinon.assert.calledWithMatch(spy1, {
      name    : 'Error',
      message : 'Socket closed'
    });
    sinon.assert.calledWithMatch(spy2, {
      name    : 'Error',
      message : 'Socket closed'
    });
  },


  'should not err on responses on second close': function () {
    var spy1 = sinon.spy();
    var spy2 = sinon.spy();
    this.invoke(spy1);
    this.invoke(spy2);

    this.socket.emit('close');
    this.socket.emit('close');

    sinon.assert.calledOnce(spy1);
    sinon.assert.calledOnce(spy2);
  },


  'should err on second callback if first throws on close': sinon.test(
    function () {
      this.stub(process.stderr, 'write'); // stop moaning!
      var stub  = sinon.stub().throws(new TypeError('wrf?'));
      var spy   = sinon.spy();
      this.invoke(stub);
      this.invoke(spy);

      this.socket.emit('close');

      sinon.assert.calledOnce(spy);
    }
  ),


  'should invoke handle on data without ci': function () {
    this.socket.emit('data', new Buffer('{"id":5}\n'));

    sinon.assert.calledOnce(this.handle);
    sinon.assert.calledWithExactly(this.handle, sinon.match.func);
  },


  'should invoke handle with given args': function () {
    this.socket.emit('data', new Buffer('{"id":4,"ar":[123,"abc"]}\n'));

    sinon.assert.calledWithExactly(this.handle, 123, "abc", sinon.match.func);
  },


  'should not pass function if no id was given': function () {
    this.socket.emit('data', new Buffer('{}\n'));

    sinon.assert.calledWithExactly(this.handle);
  },


  'should append function to args if no id was given': function () {
    this.socket.emit('data', new Buffer('{"ar":[123,"abc"]}\n'));

    sinon.assert.calledWithExactly(this.handle, 123, "abc");
  }


});


test('pingpong.bind handle', {

  before: function () {
    this.socket = new net.Socket();
    this.socket.write = sinon.stub();
  },


  'should invoke handle with undefined args': function () {
    var handle = sinon.spy(function (a, b, c, callback) {});
    pingpong.bind(this.socket, handle);

    this.socket.emit('data', new Buffer('{"id":3}\n'));

    sinon.assert.calledWithExactly(handle, undefined, undefined, undefined,
      sinon.match.func);
  },


  'should invoke handle with some args and undefined args': function () {
    var handle = sinon.spy(function (a, b, c, callback) {});
    pingpong.bind(this.socket, handle);

    this.socket.emit('data', new Buffer('{"id":2,"ar":[123,"abc"]}\n'));

    sinon.assert.calledWithExactly(handle, 123, 'abc', undefined,
      sinon.match.func);
  },


  'should write ci 0 to socket on handle invocation': function () {
    var handle = sinon.stub().yields();
    pingpong.bind(this.socket, handle);

    this.socket.emit('data', new Buffer('{"id":0}\n'));

    sinon.assert.calledOnce(this.socket.write);
    sinon.assert.calledWith(this.socket.write, '{"ci":0}\n');
  },


  'should write ci 1 to socket on handle invocation': function () {
    var handle = sinon.stub().yields();
    pingpong.bind(this.socket, handle);

    this.socket.emit('data', new Buffer('{"id":1}\n'));

    sinon.assert.calledOnce(this.socket.write);
    sinon.assert.calledWith(this.socket.write, '{"ci":1}\n');
  },


  'should write ci and return value to socket on handle invocation':
    function () {
      var handle = sinon.stub().yields(null, "oh, hi!");
      pingpong.bind(this.socket, handle);

      this.socket.emit('data', new Buffer('{"id":4}\n'));

      sinon.assert.calledOnce(this.socket.write);
      sinon.assert.calledWith(this.socket.write, '{"ci":4,"re":"oh, hi!"}\n');
    },


  'should write ci and err to socket on handle invocation': function () {
    var handle = sinon.stub().yields(new Error('oh, shit!'));
    pingpong.bind(this.socket, handle);

    this.socket.emit('data', new Buffer('{"id":5}\n'));

    sinon.assert.calledOnce(this.socket.write);
    sinon.assert.calledWith(this.socket.write, '{"ci":5,"er":"oh, shit!"}\n');
  },


  'should write ci and err str to socket on handle invocation': function () {
    var handle = sinon.stub().yields('oh, hell!');
    pingpong.bind(this.socket, handle);

    this.socket.emit('data', new Buffer('{"id":9}\n'));

    sinon.assert.calledOnce(this.socket.write);
    sinon.assert.calledWith(this.socket.write, '{"ci":9,"er":"oh, hell!"}\n');
  }

});
