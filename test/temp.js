var CatClaw = require('../src');

var indicator = 0;

var clawer = new CatClaw({
  startUrls: ['https://book.douban.com/tag/%E5%B0%8F%E8%AF%B4?start=0&type=T'],
  callback: function(err, res, utils) {
    if (!err) {
      console.log(res);
    } else {
      console.log('an error occurs');
    }
  },
  maxConcurrency: 5,
  interval: 1000,
  maxRetries: 3,
  timeout: 4000,
  drain: function() {
    console.log('drain...');
  },
  hostsRestricted: ['book.douban.com', 'movie.douban.com']
});

clawer.use('https://book.douban.com/tag/%E5%B0%8F%E8%AF%B4?start=:pagenumber', function(err, res, utils) {
  if (err) {
    console.log('error');
    return;
  }
  const $ = res.$;
  $('.subject-item .info h2 a').each((idx, ele) => {
    console.log($(ele).attr('title'));
  });
  $('.paginator a').each((idx, ele) => {
    utils.add($(ele).attr('href'));
  });
});

clawer.start();