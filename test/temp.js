var CatClaw = require('../src');

var indicator = 0;

var clawer = new CatClaw({
  startUrls: ['http://www.baidu.com'],
  callback: function(err, res) {
    if (!err) {
      console.log(res);
    } else {
      console.log('an error occurs');
    }
  },
  maxConcurrency: 5,
  interval: 1000,
  maxRetries: 3,
});

clawer.use('http://www.baidu.com', function(err, res) {
  console.log(res.$.html());
});

clawer.use('http://www.qq.com', function(err, res) {
  console.log('qq handle');
});

clawer.start();