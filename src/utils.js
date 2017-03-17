const omit = (obj, keys) => {
  const clone = Object.assign({}, obj);
  for (const key of keys) {
    delete clone[key];
  }
  return clone;
}

const optionToUrlItem = (urlOption) => {
  if (Object.prototype.toString.call(urlOption) === '[object String]') {
    urlOption = {
      url: urlOption,
      method: 'GET',
    };
  };
  const urlItem = {
    url: urlOption.url,
    method: urlOption.method || 'GET',
    retries: 0,
  };
  if (urlOption.postData) {
    urlItem.postData = urlOption.postData;
  }
  return urlItem;
}

module.exports = {
  omit,
  optionToUrlItem,
};
