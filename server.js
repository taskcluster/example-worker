#! /usr/bin/env node

var taskcluster = require('taskcluster-client');

var queue = new taskcluster.Queue();
queue.getAMQPConnectionString().then(function(result) {
  console.log(result);
});

console.log('fetching credentials...');
