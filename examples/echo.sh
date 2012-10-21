#!/bin/bash

node echo-server.js &
PID=$!
sleep 0.1
node echo-client.js
kill $PID
