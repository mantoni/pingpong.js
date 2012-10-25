/**
 * pingpong.js
 *
 * Copyright (c) 2012 Maximilian Antoni <mail@maxantoni.de>
 *
 * @license MIT
 */
'use strict';

var pingpong = require('../lib/pingpong');

pingpong.client({ port : 8000 }, function (err, remote) {
  var count = 0;
  setInterval(function () {
    remote.invoke('Hello world (' + (++count) + ')', function (err, result) {
      console.log(err || result);
    });
  }, 100);
});
