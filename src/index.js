const request = require('request');
const { EventEmitter } = require('events');
const url = require('url');
const pathToRegexp = require('path-to-regexp');
const cheerio = require('cheerio');
const SimpleQueue = require('./simpleQueue');
const SimpleSeen = require('./simpleSeen');
const utils = require('./utils');
const userAgents = require('./userAgents.json');
const iconv = require('iconv-lite');

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
  for (let urlOption of options.startUrls) {
    const urlItem = utils.optionToUrlItem(urlOption);
    this._queue.enqueue(urlItem);
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
  this.seenEnable = options.seenEnable || true;
  this.hostsRestricted = options.hostsRestricted;
  this.referer = options.referer;
  this.encoding = options.encoding || 'utf8';
}

CatClaw.prototype.start = function start() {
  if ((this._concurrency < this.maxConcurrency) && (this._queue.getLen() > 0)) {
    const urlItem = this._queue.dequeue();
    this.request(urlItem);
    this._concurrency = this._concurrency + 1;
    setTimeout(() => {
      this.start();
    }, this.interval);
  }
  if ((this._concurrency === 0) && (this._queue.getLen() === 0)) {
    this.drain();
  }
};

CatClaw.prototype.request = function myrequest(urlItem) {
  const { url } = urlItem;
  const requestOptions = utils.omit(urlItem, ['retries']);
  requestOptions.headers = {
    'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
  };
  if (this.referer) {
    requestOptions.headers.referer = this.referer;
  }
  requestOptions.encoding = null;
  if (this.timeout) {
    requestOptions.timeout = this.timeout;
  }
  request(requestOptions, (err, res) => {
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
      console.log(res);
      res.body = iconv.decode(res.body, this.encoding);
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
}

CatClaw.prototype.use = function use(path, action) {
  this.routes.push([pathToRegexp(path), action]);
};

CatClaw.prototype.add = function add(fromUrl, toUrlOption) {
  const toUrlItem = utils.optionToUrlItem(toUrlOption);
  const resolvedUrl = url.resolve(fromUrl, toUrlItem.url);
  const encodedUrl = encodeURI(resolvedUrl);
  toUrlItem.url = encodedUrl;
  const parsedUrlObj = url.parse(encodedUrl);
  if (this.hostsRestricted.length > 0 && this.hostsRestricted.indexOf(parsedUrlObj.host) == -1) {
    return;
  }
  // now it's simply judge if two url are the same (not compare request `body`, `method` etc.)
  if (this.seenEnable) {
    if (this.seen.add(encodedUrl)) {
      this._queue.enqueue({
        url: encodedUrl,
        retries: 0,
      });
    }
  }
};

module.exports = CatClaw;
