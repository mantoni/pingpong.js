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


describe('bind', function () {
  var socket;
  var handle;
  var invoke;

  beforeEach(function () {
    socket = new net.Socket();
    socket.write = sinon.stub();
    handle = sinon.stub();
    invoke = pingpong.bind(socket, handle);
  });

  it('returns a function', function () {
    assert.equal(typeof invoke, 'function');
  });

  it('writes empty json object to socket', function () {
    invoke();

    sinon.assert.calledOnce(socket.write);
    sinon.assert.calledWith(socket.write, '{}\n');
  });

  it('writes single argument', function () {
    invoke(42);

    sinon.assert.calledWith(socket.write, '{"ar":[42]}\n');
  });

  it('writes multiple arguments', function () {
    invoke('abc', 42, ['some', 'stuff']);

    sinon.assert.calledWith(socket.write,
      '{"ar":["abc",42,["some","stuff"]]}\n');
  });

  it('writes id', function () {
    invoke(function () { return; });

    sinon.assert.calledWith(socket.write, '{"id":0}\n');
  });

  it('increments id on next call', function () {
    invoke(function () { return; });
    socket.write.reset();
    invoke(function () { return; });

    sinon.assert.calledWith(socket.write, '{"id":1}\n');
  });

  it('writes id and args', function () {
    invoke(123, 'abc', function () { return; });

    sinon.assert.calledWith(socket.write, '{"id":0,"ar":[123,"abc"]}\n');
  });

  it('invokes callback on response', function () {
    var spy = sinon.spy();
    invoke(spy);

    socket.emit('data', new Buffer('{"ci":0}\n'));

    sinon.assert.calledOnce(spy);
  });

  it('does not invoke callback again', function () {
    var spy = sinon.spy();
    invoke(spy);

    socket.emit('data', new Buffer('{"ci":0}\n'));
    socket.emit('data', new Buffer('{"ci":0}\n'));

    sinon.assert.calledOnce(spy);
  });

  it('invokes with null and response', function () {
    var spy = sinon.spy();
    invoke(spy);

    socket.emit('data', new Buffer('{"ci":0,"re":{"abc":123}}\n'));

    sinon.assert.calledWith(spy, null, { abc : 123 });
  });

  it('invokes with error only', function () {
    var spy = sinon.spy();
    invoke(spy);

    socket.emit('data', new Buffer('{"ci":0,"er":"some error"}\n'));

    sinon.assert.calledWith(spy, sinon.match({
      name    : 'Error',
      message : 'some error'
    }));
  });

  it('only invokes first', function () {
    var spy1 = sinon.spy();
    var spy2 = sinon.spy();
    invoke(spy1);
    invoke(spy2);

    socket.emit('data', new Buffer('{"ci":0}\n'));

    sinon.assert.calledOnce(spy1);
    sinon.assert.notCalled(spy2);
  });

  it('only invokes second', function () {
    var spy1 = sinon.spy();
    var spy2 = sinon.spy();
    invoke(spy1);
    invoke(spy2);

    socket.emit('data', new Buffer('{"ci":1}\n'));

    sinon.assert.notCalled(spy1);
    sinon.assert.calledOnce(spy2);
  });

  it('invokes first and second', function () {
    var spy1 = sinon.spy();
    var spy2 = sinon.spy();
    invoke(spy1);
    invoke(spy2);

    socket.emit('data', new Buffer('{"ci":0}\n{"ci":1}\n'));

    sinon.assert.calledOnce(spy1);
    sinon.assert.calledOnce(spy2);
  });

  it('handles multiple chunks', function () {
    var spy = sinon.spy();
    invoke(spy);

    socket.emit('data', new Buffer('{"ci":'));
    socket.emit('data', new Buffer('0}\n'));

    sinon.assert.calledOnce(spy);
  });

  it('handles mutliple chunks twice', function () {
    var spy1 = sinon.spy();
    var spy2 = sinon.spy();
    invoke(spy1);
    invoke(spy2);

    socket.emit('data', new Buffer('{"ci'));
    socket.emit('data', new Buffer('":'));
    socket.emit('data', new Buffer('0}\n'));
    socket.emit('data', new Buffer('{"ci":'));
    socket.emit('data', new Buffer('1}\n'));

    sinon.assert.calledOnce(spy1);
    sinon.assert.calledOnce(spy2);
  });

  it('errs on all outstanding responses if socket errs', function () {
    var spy1 = sinon.spy();
    var spy2 = sinon.spy();
    invoke(spy1);
    invoke(spy2);

    socket.emit('error', 'ouch!');

    sinon.assert.calledOnce(spy1);
    sinon.assert.calledOnce(spy2);
    sinon.assert.calledWith(spy1, 'ouch!');
    sinon.assert.calledWith(spy2, 'ouch!');
  });

  it('does not err on responses on second error', function () {
    var spy1 = sinon.spy();
    var spy2 = sinon.spy();
    invoke(spy1);
    invoke(spy2);

    socket.emit('error', 'ouch 1');
    socket.emit('error', 'ouch 2');

    sinon.assert.calledOnce(spy1);
    sinon.assert.calledOnce(spy2);
  });

  it('errs on second callback if first throws on error', sinon.test(
    function () {
      this.stub(process.stderr, 'write'); // stop moaning!
      var stub  = sinon.stub().throws(new TypeError('wtf?'));
      var spy   = sinon.spy();
      invoke(stub);
      invoke(spy);

      socket.emit('error', 'ouch');

      sinon.assert.calledOnce(spy);
    }
  ));

  it('errs on all outstanding responses if socket closes', function () {
    var spy1 = sinon.spy();
    var spy2 = sinon.spy();
    invoke(spy1);
    invoke(spy2);

    socket.emit('close');

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
  });

  it('does not err on responses on second close', function () {
    var spy1 = sinon.spy();
    var spy2 = sinon.spy();
    invoke(spy1);
    invoke(spy2);

    socket.emit('close');
    socket.emit('close');

    sinon.assert.calledOnce(spy1);
    sinon.assert.calledOnce(spy2);
  });

  it('errs on second callback if first throws on close', sinon.test(
    function () {
      this.stub(process.stderr, 'write'); // stop moaning!
      var stub  = sinon.stub().throws(new TypeError('wrf?'));
      var spy   = sinon.spy();
      invoke(stub);
      invoke(spy);

      socket.emit('close');

      sinon.assert.calledOnce(spy);
    }
  ));

  it('invokes handle on data without ci', function () {
    socket.emit('data', new Buffer('{"id":5}\n'));

    sinon.assert.calledOnce(handle);
    sinon.assert.calledWithExactly(handle, sinon.match.func);
  });

  it('invokes handle with given args', function () {
    socket.emit('data', new Buffer('{"id":4,"ar":[123,"abc"]}\n'));

    sinon.assert.calledWithExactly(handle, 123, "abc", sinon.match.func);
  });

  it('does not pass function if no id was given', function () {
    socket.emit('data', new Buffer('{}\n'));

    sinon.assert.calledWithExactly(handle);
  });

  it('appends function to args if no id was given', function () {
    socket.emit('data', new Buffer('{"ar":[123,"abc"]}\n'));

    sinon.assert.calledWithExactly(handle, 123, "abc");
  });

  it('appends JSON string to error message if parsing fails', function () {
    var invalidJson = '{"ar:xy}';
    try {
      socket.emit('data', new Buffer(invalidJson + '\n'));
      assert.fail('Exception expected');
    } catch (e) {
      assert.equal(e.name, 'SyntaxError');
      assert.notEqual(e.message.indexOf(invalidJson), -1);
    }
  });

});


describe('pingpong.bind handle', function () {
  var socket;

  beforeEach(function () {
    socket = new net.Socket();
    socket.write = sinon.stub();
  });

  it('invokes handle with undefined args', function () {
    var handle = sinon.spy(function (a, b, c, callback) {
      /*jslint unparam: true*/
      return;
    });
    pingpong.bind(socket, handle);

    socket.emit('data', new Buffer('{"id":3}\n'));

    sinon.assert.calledWithExactly(handle, undefined, undefined, undefined,
      sinon.match.func);
  });

  it('invokes handle with some args and undefined args', function () {
    var handle = sinon.spy(function (a, b, c, callback) {
      /*jslint unparam: true*/
      return;
    });
    pingpong.bind(socket, handle);

    socket.emit('data', new Buffer('{"id":2,"ar":[123,"abc"]}\n'));

    sinon.assert.calledWithExactly(handle, 123, 'abc', undefined,
      sinon.match.func);
  });

  it('writes ci 0 to socket on handle invocation', function () {
    var handle = sinon.stub().yields();
    pingpong.bind(socket, handle);

    socket.emit('data', new Buffer('{"id":0}\n'));

    sinon.assert.calledOnce(socket.write);
    sinon.assert.calledWith(socket.write, '{"ci":0}\n');
  });

  it('writes ci 1 to socket on handle invocation', function () {
    var handle = sinon.stub().yields();
    pingpong.bind(socket, handle);

    socket.emit('data', new Buffer('{"id":1}\n'));

    sinon.assert.calledOnce(socket.write);
    sinon.assert.calledWith(socket.write, '{"ci":1}\n');
  });

  it('writes ci and return value to socket on handle invocation', function () {
    var handle = sinon.stub().yields(null, "oh, hi!");
    pingpong.bind(socket, handle);

    socket.emit('data', new Buffer('{"id":4}\n'));

    sinon.assert.calledOnce(socket.write);
    sinon.assert.calledWith(socket.write, '{"ci":4,"re":"oh, hi!"}\n');
  });


  it('writes ci and err to socket on handle invocation', function () {
    var handle = sinon.stub().yields(new Error('oh, shit!'));
    pingpong.bind(socket, handle);

    socket.emit('data', new Buffer('{"id":5}\n'));

    sinon.assert.calledOnce(socket.write);
    sinon.assert.calledWith(socket.write, '{"ci":5,"er":"oh, shit!"}\n');
  });

  it('writes ci and err str to socket on handle invocation', function () {
    var handle = sinon.stub().yields('oh, hell!');
    pingpong.bind(socket, handle);

    socket.emit('data', new Buffer('{"id":9}\n'));

    sinon.assert.calledOnce(socket.write);
    sinon.assert.calledWith(socket.write, '{"ci":9,"er":"oh, hell!"}\n');
  });

});
