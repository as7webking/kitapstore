const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const preload = path.join(__dirname, 'safety.cjs');
function check(code) {
  const result = spawnSync(process.execPath, ['--require', preload, '-e', code], {
    cwd: path.resolve(__dirname, '../..'), encoding: 'utf8', timeout: 5000,
  });
  assert.equal(result.status, 0, result.stderr);
}
test('CI refuses private env reads before opening files, including URL and async APIs', () => check(`
  const assert = require('node:assert/strict'); const fs = require('node:fs');
  const {pathToFileURL} = require('node:url');
  assert.throws(() => fs.readFileSync('backend/.env'), {code:'ENOENT'});
  assert.throws(() => fs.readFileSync(pathToFileURL(process.cwd() + '/backend/.env')), {code:'ENOENT'});
  fs.readFile('frontend/.env.local', (error) => assert.equal(error.code, 'ENOENT'));
  fs.promises.readFile('backend/.env.production').then(() => assert.fail(), (error) => assert.equal(error.code, 'ENOENT'));
  assert.ok(fs.readFileSync('backend/.env.example').length);
`));
test('CI blocks SMTP transport and outbound sockets before dispatch', () => check(`
  const assert = require('node:assert/strict'); const net = require('node:net');
  assert.throws(() => new net.Socket().connect({host:'remote.example.test',port:443}), /blocks non-loopback/);
  const {createRequire} = require('node:module');
  const mail = createRequire(process.cwd() + '/backend/package.json')('nodemailer');
  assert.throws(() => mail.createTransport({}), /fake mail transport/);
  mail.createTransport = () => ({sendMail: async () => ({})});
  assert.equal(typeof mail.createTransport().sendMail, 'function');
`));
