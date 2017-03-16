const request = require('request');
const { EventEmitter } = require('events');
const pathToRegexp = require('path-to-regexp');
const cheerio = require('cheerio');
const SimpleQueue = require('./simpleQueue');

/*
options
- startUrls
- callback
- maxConcurrency
- interval
*/
function CatClaw(options) {
  this._queue = new SimpleQueue();
  this._callback = options.callback;
  for (let url of options.startUrls) {
    this._queue.enqueue({
      url,
      retries: 0,
    });
  }
  this._eventEmitter = new EventEmitter();
  this._concurrency = 0;
  this.maxConcurrency = options.maxConcurrency;
  this.interval = options.interval;
  this.maxRetries = options.maxRetries;
  this._eventEmitter.on('available', () => {
    this.start();
  });
  this.routes = [];
}

CatClaw.prototype.start = function start() {
  if ((this._concurrency < this.maxConcurrency) && (this._queue.getLen() > 0)) {
    const urlItem = this._queue.dequeue();
    this.get(urlItem);
    this._concurrency = this._concurrency + 1;
    setTimeout(() => {
      this.start();
    }, this.interval);
  }
}

CatClaw.prototype.get = function get(urlItem) {
  const { url } = urlItem;
  request.get(url, (err, res) => {
    let callback, $;
    for (let i = 0; i < this.routes.length; i++) {
      const route = this.routes[i];
      if (route[0].test(url)) {
        callback = route[1];
        break;
      }
    }
    if (!callback) {
      callback = this._callback;
    }
    if (err) {
      urlItem.retries = urlItem.retries + 1;
      if (urlItem.retries < this.maxRetries) {
        this._queue.enqueue(urlItem);
      }
    } else if (res.body) {
      $ = cheerio.load(res.body);
      res.$ = $;
    }
    callback(err, res);
    if (this._concurrency === this.maxConcurrency) {
      this._concurrency = this._concurrency - 1;
      this._eventEmitter.emit('available');
    } else {
      this._concurrency = this._concurrency - 1;
    }
  });
}

CatClaw.prototype.use = function use(path, action) {
  this.routes.push([pathToRegexp(path), action]);
}

module.exports = CatClaw;
