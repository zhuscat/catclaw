// SimpleSeen
// 大数据量的时候会造成内存泄漏，可以使用 redis 等工具

function SimpleSeen() {
  this._seen = {};
}

SimpleSeen.prototype.add = function add(key) {
  if (this._seen.hasOwnProperty(key)) {
    return false;
  }
  this._seen[key] = 1;
  return true;
}

module.exports = SimpleSeen;
