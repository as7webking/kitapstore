// Test/build preload only. Never use this file in a deployed service.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const net = require('node:net');
const { fileURLToPath } = require('node:url');
function privateEnv(file) {
  if (file instanceof URL && file.protocol === 'file:') file = fileURLToPath(file);
  const name = typeof file === 'string' || Buffer.isBuffer(file) ? path.basename(String(file)) : '';
  return /^\.env(?:\.|$)/.test(name) && name !== '.env.example';
}
function denied() { const error = new Error('CI does not read private environment files'); error.code = 'ENOENT'; return error; }
const readSync = fs.readFileSync;
fs.readFileSync = function(file, ...args) { if (privateEnv(file)) throw denied(); return readSync.call(this, file, ...args); };
const read = fs.readFile;
fs.readFile = function(file, ...args) {
  if (privateEnv(file)) return queueMicrotask(() => args.at(-1)(denied()));
  return read.call(this, file, ...args);
};
const readPromise = fs.promises.readFile;
fs.promises.readFile = async function(file, ...args) { if (privateEnv(file)) throw denied(); return readPromise.call(this, file, ...args); };

// HTTP tests may bind loopback; a CLI failure test may connect to loopback port 1.
// Real external database/SMTP connections are forbidden, even if an env leaks in.
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function(...args) {
  const options = Array.isArray(args[0]) ? args[0] : args;
  const first = options[0];
  const host = typeof first === 'object' ? first?.host : typeof options[1] === 'string' ? options[1] : undefined;
  if ((typeof first === 'object' && first?.path) || (typeof first === 'string') ||
      (host && !['127.0.0.1', 'localhost', '::1'].includes(host))) {
    throw new Error('CI blocks non-loopback network connections');
  }
  return connect.apply(this, args);
};
// Existing tests explicitly replace createTransport with fake transports.
const load = Module._load;
Module._load = function(name, ...args) {
  const value = load.call(this, name, ...args);
  if (name === 'nodemailer' && !value.__kitapstoreCiGuard) {
    value.createTransport = () => { throw new Error('CI requires a fake mail transport'); };
    Object.defineProperty(value, '__kitapstoreCiGuard', { value: true });
  }
  return value;
};
