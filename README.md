example-worker
==============

Taskcluster example worker with no actually useful functionality outside of some docs and a "getting started" implementations.

## Developing

```sh
npm install
node server.js
```


## Goals:

  - Show usage of the [taskcluster client](https://github.com/taskcluster/taskcluster-client)

  - "Claim" particular tasks based on their task id and then mark them
    completed logging a message in stdout.
