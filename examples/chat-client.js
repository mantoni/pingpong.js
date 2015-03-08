/*jslint unparam: true*/
/*
 * pingpong.js
 *
 * Copyright (c) 2012-2015 Maximilian Antoni <mail@maxantoni.de>
 *
 * @license MIT
 */
'use strict';

var pingpong = require('../lib/pingpong');
var readline = require('readline');

var ctrl_a = { ctrl : true, name : 'a' };
var ctrl_e = { ctrl : true, name : 'e' };

var rl = readline.createInterface({
  input   : process.stdin,
  output  : process.stdout
});
rl.setPrompt('> ');

rl.question('Your name? ', function (name) {

  pingpong.client({ port : 8000 }, function (err, remote) {

    function write(text) {
      rl.write(null, ctrl_a);
      process.stdout.write(text + '\n');
      rl.write(null, ctrl_e);
      rl.prompt(true);
    }

    function system(text) {
      write(' - ' + text + ' -');
    }

    remote.invoke('join', name, function (err, names) {
      if (names.length === 1) {
        system(names[0] + ' is here');
      } else if (names.length === 1) {
        system(names.join(' and ') + ' are here');
      } else {
        system('nobody here yet');
      }
    });

    rl.prompt();
    rl.on('line', function (line) {
      remote.invoke('message', line);
      rl.prompt();
    });

    remote.onMessage(function (event, sender, message) {
      if (event === 'join' && sender !== name) {
        system(sender + ' joined');
      }
      if (event === 'leave') {
        system(sender + ' left');
      }
      if (event === 'message' && sender !== name) {
        write(sender + ': ' + message);
      }
    });

  });
});
