/**
 * pingpong.js
 *
 * Copyright (c) 2012 Maximilian Antoni <mail@maxantoni.de>
 *
 * @license MIT
 */
'use strict';

var pingpong = require('../lib/pingpong');

pingpong.server(8000, function (text, responder) {
  responder(null, '[server] ' + text);
});
