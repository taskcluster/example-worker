/**
Example script showing the setup of the worker and posting a single task to show
en entire work flow for the worker.
*/
var slugid = require('slugid');
var Worker = require('../');

var Queue  = require('taskcluster-client').Queue;

// Note that we rely on the environment variables here to configure the queue.
var queue  = new Queue();

var WORKER_TYPE    = 'worker_worker_type';
var PROVISIONER_ID = 'worker_provisioner_id';

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
    'provisionerId': PROVISIONER_ID, // Max 22 characters
    'workerType':    WORKER_TYPE,    // Max 22 characters
    'schedulerId':   'worker_scheduler_id',   // Max 22 characters
    'taskGroupId':   'worker_task_group_id--',// 22 characters exactly
    'routes': [], // Advanced topic, per-task routing
    'retries': 5,
    'priority': 3,
    'created': createdDate.toJSON(),
    'deadline': deadline.toJSON(),
    'scopes': ['worker_scheduler_id/worker_task_group_id--'],
    'payload': {
      'success': true
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

var worker = new Worker(PROVISIONER_ID, WORKER_TYPE);

// Begin listening then post a single task...
worker.listen().then(function() {
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
  return queue.createTask(taskId, task).then(function(result) {
    console.log('*** Task created, status object:');
    console.log(result.status);
    console.log('*** End of createTask status object');
  });
}).catch(function(err) {
  // Need to throw in the next tick so the promise does not catch this error.
  process.nextTick(function() {
    throw err;
  });
});

// Notify when the task was worked and shutdown the worker...
worker.once('task completed', function() {
  console.log('Worker completed running task...');
  process.nextTick(function() {
    worker.close();
  });
});
