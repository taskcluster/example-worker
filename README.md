# Task cluster example worker

The taskcluster example worker has two purposes:

 - show [examples](/examples) of basic worker functionality

 - provide a public interface that can be used in tests which need a
   worker to complete tasks.

## Usage

```js
var Worker = require('taskcluster-exmple-worker');
var instance = new Worker('provisionerId', 'workerType');

instance.listen(function() {
 // worker is now listening to events...
});

// close listener in the worker if running...
instance.close(function() {
});
```

The worker accepts a format like this:

```json
{
  "success": true
}
```

The payload `success` field is used when marking the task completed so
the worker is suitable for emulating task success/failure states.
