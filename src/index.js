const request = require('request');
const { EventEmitter } = require('events');
const url = require('url');
const pathToRegexp = require('path-to-regexp');
const cheerio = require('cheerio');
const SimpleQueue = require('./simpleQueue');
const SimpleSeen = require('./simpleSeen');

/*
options
- startUrls
- callback
- maxConcurrency
- interval
*/
function CatClaw(options) {
  // 可以替换 queue 只要接口一致
  this._queue = options.queue || new SimpleQueue();
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
  this.timeout = options.timeout;
  this._eventEmitter.on('available', () => {
    this.start();
  });
  this.routes = [];
  this.drain = options.drain;
  // 可以替换 seen，只要接口一致
  this.seen = options.seen || new SimpleSeen();
  this.hostsRestricted = options.hostsRestricted;
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
  if ((this._concurrency === 0) && (this._queue.getLen() === 0)) {
    this.drain();
  }
};

CatClaw.prototype.request = function request(urlItem) {
  // do something...
}

CatClaw.prototype.get = function get(urlItem) {
  const requestOptions = {};
  if (this.timeout) {
    requestOptions.timeout = this.timeout;
  }
  const { url } = urlItem;
  request.get(url, requestOptions, (err, res) => {
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
    callback(err, res, {
      add: this.add.bind(this, url),
    });
    if (this._concurrency === this.maxConcurrency) {
      this._concurrency = this._concurrency - 1;
      this._eventEmitter.emit('available');
    } else {
      this._concurrency = this._concurrency - 1;
    }
  });
};

CatClaw.prototype.use = function use(path, action) {
  this.routes.push([pathToRegexp(path), action]);
};

CatClaw.prototype.add = function add(fromUrl, toUrl) {
  const resolvedUrl = url.resolve(fromUrl, toUrl);
  const encodedUrl = encodeURI(resolvedUrl);
  const parsedUrlObj = url.parse(encodedUrl);
  if (options.hostsRestricted.length > 0 && options.hostsRestricted.indexOf(parsedUrlObj.host) == -1) {
    return;
  }
  if (this.seen.add(encodedUrl)) {
    this._queue.enqueue({
      url: encodedUrl,
      retries: 0,
    });
  }
};

module.exports = CatClaw;
