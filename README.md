example-worker
==============

## Goals:

  - Show usage of the [taskcluster client](https://github.com/taskcluster/taskcluster-client)

  - "Claim" particular tasks based on their task id and then mark them
    completed logging a message in stdout.

The taskcluster example worker demonstrates the API usage and workflow of a taskcluster worker. The workflow of the example worker is:

 - Instantiate taskcluster queue
 - Get connection string for AMQP queue
 - Instantiate listener
 - Instantiate QueueEvents (for controlling which events to listen for)
 - Use QueueEvents to bind listener to events corresponding to pending tasks
 - Create event handler for events corresponding to pending tasks
 - Start listening process.
    - (Create a task -- in a production environment, a developer will submit
       a task-graph to the scheduler and the scheduler will create a task on
       the queue. To keep this worker simple, it creates a task itself).
    -  Claim task
    -  Report task as completed

## Developing

```sh
npm install
node server.js
```


