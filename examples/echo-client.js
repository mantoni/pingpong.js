/**
 * pingpong.js
 *
 * Copyright (c) 2012 Maximilian Antoni <mail@maxantoni.de>
 *
 * @license MIT
 */
'use strict';

var pingpong = require('../lib/pingpong');

pingpong.client({ port : 8000 }, function (invoke) {
  var count = 0;
  setInterval(function () {
    invoke('Hello world (' + (++count) + ')', function (err, result) {
      console.log(err || result);
    });
  }, 100);
});
