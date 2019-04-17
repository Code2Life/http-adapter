const fs = require('fs');
const zlib = require('zlib');
const http = require('http');
const { fork } = require('child_process');

const CDN_BASE = 'http://filecdn.code2life.top';
const SERVER_FILE = 'http-adapter.js';

/**
 * TODO params validation, deliver, pre-load adapters
 * version control, server file cache based on MD5
 */

function valid(options) {
  const port = +options.port;
  if (port < 80 || port > 65535) {
    console.error('Invalid port');
    return false;
  }
  return true;
}

function startApplication(options) {
  if(valid(options)) {
    try {
      process.env.NODE_PORT = options.port;
      process.env.CONF_PATH = __dirname + '/adapters';
      process.env.DEBUG = options.debug ? 'server:*' : '';
      let exists = fs.existsSync(SERVER_FILE);
      let conf = fs.existsSync(process.env.CONF_PATH);
      if (!conf) {
        fs.mkdirSync(process.env.CONF_PATH);
      }
      if (exists) {
        startServer();
        return;
      }
      http.get(`${CDN_BASE}/${SERVER_FILE}` , { headers: { 'Accept-Encoding': 'gzip' }}, (res) => {
        if (res.statusCode !== 200) {
          console.error(`Can not download server file from CDN, status: ${res.statusCode}`);
          return;
        }
        if (res.headers['content-encoding'].indexOf('gzip') !== -1) {
          res.pipe(zlib.createGunzip()).pipe(fs.createWriteStream(SERVER_FILE));
        } else {
          res.pipe(fs.createWriteStream(SERVER_FILE));
        }
        res.on('end', () => {
          startServer();
        });
      });
    } catch(ex) {
      console.error(ex);
      process.exit(1);
    }
  } else {
    console.error('Invalid options!');
    process.exit(1);
  }
}

function startServer() {
  let server = fork('http-adapter.js', [], {
    stdio: 'inherit'
  });
  server.on('exit', (code, signal) => {
    console.log(`server exited: ${code} ${signal || ''}.`);
    process.exit(code);
  });
}

exports.start = startApplication;
