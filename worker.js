#! /usr/bin/env node

var taskcluster  = require('taskcluster-client');
var slugid       = require('slugid');
var debug        = require('debug')('taskcluster:example-worker');

var Promise      = require('promise');
var EventEmitter = require('events').EventEmitter;

/**
Fetch listener credentials.

@private
@return {Promise[String]} uri credentials for rabbitmq.
*/
function listenerCredentials(queue) {
  // Try a cache environment variable/default first.
  if (process.env.TASKCLUSTER_AMQP_URL) {
    return Promise.resolve(process.env.TASKCLUSTER_AMQP_URL);
  }

  // Fallback to the deprecated queue endpoint.
  return queue.getAMQPConnectionString().then(function(result) {
    return result.url;
  });
}

function Worker(provisionerId, workerType, credentials) {
  this.provisionerId = provisionerId;
  this.workerType    = workerType;
  this.credentials   = credentials;

  EventEmitter.call(this);
}

Worker.prototype = {
  __proto__: EventEmitter.prototype,

  /**
  Begin listening for task for worker to consume.

  @return {Promise}
  */
  listen: function() {
    debug('*** Fetching credentials...');
    var queue = new taskcluster.Queue(this.credentials || {});
    var self = this;

    //
    // Get a connection string for the AMQP queue we will be using.
    //
    return listenerCredentials(queue).then(function(url) {
      debug('*** Creating listener, connection string url: ' + url);

      //
      // Create a listener -- this creates an AMQP queue
      //
      var listener = new taskcluster.Listener({ connectionString: url });

      // Save listener for closing, etc...
      self.listener = listener;

      //
      // Instantiate QueueEvents -- used to specify the kind of events (tasks)
      // to listen for
      //
      var queueEvents = new taskcluster.QueueEvents();

      debug('*** Binding listener to workerType');

      listener.bind(queueEvents.taskPending({
        provisionerId: self.provisionerId,
        workerType: self.workerType
      }));

      //
      // Consume events (tasks) the listener receives.
      //
      listener.on('message', function(message) {
        var taskId = message.payload.status.taskId;
        var runId = message.payload.runId;

        debug('Claiming task -- taskId: ' + taskId + ', runId: ' + runId);
        //
        // For more information regarding the claimTask API, see:
        // http://docs.taskcluster.net/queue/api-docs/#claimTask
        //
        queue.claimTask(taskId, runId, {
          'workerGroup': 'example_workerGroup',
          'workerId': 'example_workerId'
        }).then(function(result) {
          debug('*** Task is claimed, status object: ');
          debug(result.status);
          debug('*** End of claimTask status object');
          return queue.getTask(taskId);
        }).then(function(task) {
          debug(
            'Reporting task completed',
            'taskId: ' + taskId + ', runId: ' + runId
          );
          //
          // For more information regarding the reportCompleted API, see:
          // http://docs.taskcluster.net/queue/api-docs/#reportCompleted
          //
          return queue.reportCompleted(
            taskId, runId, { 'success': task.payload.success }
          ).then(function(result) {
            debug('*** Task is reported as completed, status object: ');
            debug(result.status);
            debug('*** End of reportCompleted status object');
            self.emit('task completed', taskId, runId);
          });
        }).catch(function(err) {
          debug(JSON.stringify(err));
          var err = new Error('Failed to work task');
          err.body = err.body;
          self.emit('error', err);
        });
      });

      //
      // Start to listen
      //
      return listener.resume();
    });
  },

  /**
  Close the listener.

  @return {Promise}
  */
  close: function() {
    if (this.listener) {
      return this.listener.close();
    }
    return Promise.resolve();
  }
};

module.exports = Worker;
