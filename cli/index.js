const fs = require('fs');
const zlib = require('zlib');
const http = require('http');
const https = require('https');
const { fork } = require('child_process');

const CDN_BASE = 'http://filecdn.code2life.top';
const SERVER_FILE_PREFIX = 'http-adapter-';
const VERSION_URL = 'https://raw.githubusercontent.com/Code2Life/http-adapter/master/package.json';

let SERVER_FILE = '';

async function startApplication(options) {
  if (valid(options)) {
    try {
      process.env.NODE_PORT = options.port || process.env.NODE_PORT;
      process.env.CONF_PATH = process.env.CONF_PATH || __dirname + '/conf';
      process.env.DEBUG = process.env.DEBUG || options.debug ? 'server:*' : '';
      const designatedVersion = process.env.SERVER_VERSION || options['server-version'];
      if (!designatedVersion) {
        await setTargetVersionNumber();
      } else {
        SERVER_FILE = SERVER_FILE_PREFIX + designatedVersion + '.js';
        console.log(`User specify the version: ${SERVER_FILE}`);
      }
      await checkConfDir();
      await downloadServerCodeAndStart();
    } catch (ex) {
      console.error(ex);
      process.exit(1);
    }
  } else {
    console.error('Invalid options!');
    process.exit(1);
  }
}

function valid(options) {
  const port = +options.port;
  if (port < 80 || port > 65535) {
    console.error('Invalid port');
    return false;
  }
  return true;
}

function setTargetVersionNumber() {
  return new Promise((resolve, reject) => {
    https.get(VERSION_URL, {} , res => {
      if (res.statusCode !== 200) {
        reject(new Error(`Can not fetch latest version source repo, status: ${res.statusCode}`));
        return;
      }
      let total = Buffer.from('');
      res.on('data', buffer => {
        total += buffer;
      });
      res.on('end', () => {
        let version = JSON.parse(total.toString()).version;
        console.log(`Got latest version info: ${version}`);
        SERVER_FILE = SERVER_FILE_PREFIX + version + '.js';
        resolve();
      });
      res.on('error', err => {
        reject(err);
      });
    })
  });
}

function checkConfDir() {
  return new Promise((resolve, reject) => {
    let conf = fs.existsSync(process.env.CONF_PATH);
    if (!conf) {
      console.log(`No configurations found, initialize configurations`);
      fs.mkdirSync(process.env.CONF_PATH);
    }
    resolve();
  });
}

function downloadServerCodeAndStart() {
  return new Promise((resolve, reject) => {
    let exists = fs.existsSync(SERVER_FILE);
    if (exists) {
      console.log(`${SERVER_FILE} has already been there, start server directly`);
      startServer();
      resolve();
      return;
    }
    console.log(`${SERVER_FILE} not found, download from CDN`);
    http.get(`${CDN_BASE}/${SERVER_FILE}`, { headers: { 'Accept-Encoding': 'gzip' } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Can not download server file (${CDN_BASE}/${SERVER_FILE}) from CDN, status: ${res.statusCode}`));
        return;
      }
      if (res.headers['content-encoding'].indexOf('gzip') !== -1) {
        res.pipe(zlib.createGunzip()).pipe(fs.createWriteStream(SERVER_FILE));
      } else {
        res.pipe(fs.createWriteStream(SERVER_FILE));
      }
      res.on('end', () => {
        console.log(`${SERVER_FILE} downloaded, start server now`);
        startServer();
        resolve();
      });
      res.on('error', err => {
        reject(err);
      });
    });
  });
}

function startServer() {
  let server = fork(SERVER_FILE, [], {
    env: process.env,
    stdio: 'inherit'
  });
  server.on('exit', (code, signal) => {
    console.log(`Server process exited: ${code} ${signal || ''}.`);
    process.exit(code);
  });
  server.on('error', err => {
    console.error('Got Error from server process', err);
    // server.kill('SIGKILL');
    process.exit(1);
  });
}

exports.start = startApplication;
