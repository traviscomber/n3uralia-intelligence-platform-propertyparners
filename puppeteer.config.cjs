const path = require('node:path')

/** @type {import('puppeteer').Configuration} */
module.exports = {
  cacheDirectory: path.join(__dirname, 'node_modules', '.puppeteer_cache'),
  chrome: {
    skipDownload: false,
  },
  firefox: {
    skipDownload: true,
  },
}
