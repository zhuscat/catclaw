function SimpleQueue() {
  this._queue = [];
}

SimpleQueue.prototype.dequeue = function dequeue() {
  return this._queue.shift();
}

SimpleQueue.prototype.enqueue = function enqueue(item) {
  return this._queue.push(item);
}

SimpleQueue.prototype.getLen = function getLen() {
  return this._queue.length;
}

module.exports = SimpleQueue;
