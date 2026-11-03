const pending = new Set();
function trackBackgroundTask(promise) {
  const task = Promise.resolve(promise);
  pending.add(task);
  // Both branches remove the task; do not create an unhandled rejected finally promise.
  task.then(() => pending.delete(task), () => pending.delete(task));
  return task;
}
async function drainBackgroundTasks() {
  while (pending.size) await Promise.allSettled([...pending]);
}
module.exports = { trackBackgroundTask, drainBackgroundTasks };
