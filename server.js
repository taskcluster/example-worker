#! /usr/bin/env node

var taskcluster = require('taskcluster-client');
var slugid      = require('slugid');

function getCreateTaskRequest(taskId) {
  var createdDate = new Date();
  var deadline = new Date();
  var oneDayMs = 1000 * 60 * 60 * 24;
  deadline.setTime(createdDate.getTime() + oneDayMs);
  //
  // For more information regarding the createTask request schema, see:
  // http://schemas.taskcluster.net/queue/v1/task.json
  //
  var task = {
    'provisionerId': 'worker_provisioner_id', // Max 22 characters
    'workerType':    'worker_worker_type',    // Max 22 characters
    'schedulerId':   'worker_scheduler_id',   // Max 22 characters
    'taskGroupId':   'worker_task_group_id--',// 22 characters exactly
    'routes': [], // Advanced topic, per-task routing
    'retries': 5,
    'priority': 3,
    'created': createdDate.toJSON(),
    'deadline': deadline.toJSON(),
    'scopes': ['worker_scheduler_id/worker_task_group_id--'],
    'payload': {
      'example_worker_payload_key': 'example_worker_payload_value'
    },
    'metadata': {
      'description': 'metadata description',
      'name': 'name',
      'owner': 'owner@mozilla.com',
      'source': 'http://host.com'
    },
    'tags': {
      'misc_info': 'task created by example worker'
    }
  };

  return task;
}

function runWorker() {

  console.log('*** Fetching credentials...');

  var client_id = process.env.TASKCLUSTER_CLIENT_ID;
  var access_token = process.env.TASKCLUSTER_ACCESS_TOKEN;

  console.log('*** client id is ' + client_id);
  console.log('*** access token is ' + access_token);

  var credentials = {
    clientId:    client_id,
    accessToken: access_token
  };

  var queue = new taskcluster.Queue(credentials);

  //
  // Get a connection string for the AMQP queue we will be using.
  //
  queue.getAMQPConnectionString().then(function(result) {

    console.log('*** Creating listener, connection string url: ' + result.url);

    //
    // Create a listener -- this creates an AMQP queue
    //
    var listener = new taskcluster.Listener({
      connectionString: result.url
    });

    //
    // Instantiate QueueEvents -- used to specify the kind of events (tasks)
    // to listen for
    //
    var queueEvents = new taskcluster.QueueEvents();

    console.log('*** Binding listener to workerType');

    listener.bind(queueEvents.taskPending({'workerType': 'worker_worker_type'}));

    //
    // Consume events (tasks) the listener receives.
    //
    listener.on('message', function(message) {
      var taskId = message.payload.status.taskId;
      var runId = message.payload.runId;

      console.log('Claiming task -- taskId: ' + taskId + ', runId: ' + runId);
      //
      // For more information regarding the claimTask API, see:
      // http://docs.taskcluster.net/queue/api-docs/#claimTask
      //
      queue.claimTask(taskId, runId, {
        'workerGroup': 'example_workerGroup',
        'workerId': 'example_workerId'
      }).then(function(result) {
        console.log('*** Task is claimed, status object: ');
        console.log(result.status);
        console.log('*** End of claimTask status object');

        console.log('Reporting task completed -- taskId: ' + taskId + ', runId: ' + runId);
        //
        // For more information regarding the reportCompleted API, see:
        // http://docs.taskcluster.net/queue/api-docs/#reportCompleted
        //
        queue.reportCompleted(taskId, runId, { 'success': true 
        }).then(function(result) {
          console.log('*** Task is reported as completed, status object: ');
          console.log(result.status);
          console.log('*** End of reportCompleted status object');
        }).catch(function(err) {
          console.log(JSON.stringify(err));
        });
      }).catch(function(err) {
        console.log(JSON.stringify(err));
      });
    });

    //
    // Start to listen
    //
    listener.resume().then(function() {

      // Now listening
      console.log('*** Listening for messages...');

      // Create task after setting up listener to ensure we don't "lose"
      // the message (messages created before the listener is listening
      // will not be received).
      var task = getCreateTaskRequest();
      var taskId = slugid.v4();

      console.log('*** Creating a task with taskId: ' + taskId);
      //
      // In a production environment, a developer will submit
      // a task-graph to the scheduler and the scheduler will create a task on
      // the queue. To keep this worker simple, it creates a task itself.
      //
      // For more information regarding the createTask API, see:
      // http://docs.taskcluster.net/queue/api-docs/#createTask
      //
      queue.createTask(taskId, task).then(function(result) {
        console.log('*** Task created, status object:');
        console.log(result.status);
        console.log('*** End of createTask status object');
      }).catch(function(error) {
        console.log(JSON.stringify(err));
      });
    });
  }).catch(function(err) {
    console.log('Error getting connection string');
    console.log(err);
  });
}

runWorker();

