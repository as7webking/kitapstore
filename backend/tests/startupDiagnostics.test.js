const { test } = require('node:test');
const assert = require('node:assert/strict');
// Block dotenv before importing entry points. No private env is read by this test.
require('dotenv').config = () => ({});
const { validateEnv, validateWorkerEnv } = require('../config/env');
const { startupMessage } = require('../utils/startupErrors');
const { prepareWorker } = require('../workers/resetMail');
const base = { URI: 'mongodb://synthetic.invalid/test', JWT_SECRET: 'synthetic',
  FRONTEND_URL: 'https://shop.example.test', RESET_MAIL_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
  EMAIL_HOST: 'smtp.example.test', EMAIL_USER: 'synthetic', EMAIL_PASS: 'synthetic' };

test('startup identifies missing names and invalid formats without including values', () => {
  assert.throws(() => validateWorkerEnv({ ...base, EMAIL_PASS: '', RESET_MAIL_ENCRYPTION_KEY: '' }), /Missing required.*RESET_MAIL_ENCRYPTION_KEY, EMAIL_PASS/);
  for (const [key, value] of [['URI', 'secret-canary'], ['PORT', 'secret-canary'], ['FRONTEND_URL', 'secret-canary'],
    ['RESET_MAIL_ENCRYPTION_KEY', 'secret-canary'], ['EMAIL_PORT', 'secret-canary'], ['PASSWORD_RESET_TTL_MINUTES', 'secret-canary']]) {
    try { validateWorkerEnv({ ...base, [key]: value }); assert.fail('must reject'); }
    catch (error) { const message = startupMessage(error); assert.match(message, /STARTUP_CONFIGURATION/); assert.doesNotMatch(message, /secret-canary/); }
  }
  validateEnv({ URI: base.URI, JWT_SECRET: base.JWT_SECRET }); // Mail remains optional for ordinary accounts.
  validateWorkerEnv(base);
});

test('unexpected or forged errors never expose their message, code or stack', () => {
  const error = new Error('secret-canary mongodb://credentials #token=secret');
  error.code = 'STARTUP_CONFIGURATION';
  assert.equal(startupMessage(error), '[STARTUP_FAILED] Startup failed unexpectedly. Check service configuration.');
  assert.match(startupMessage(null), /STARTUP_FAILED/);
});

test('worker separates validation, connection and index failures and closes failed startup', async () => {
  for (const failure of ['validate', 'connect', 'initialize', null]) {
    const calls = [];
    const dependencies = Object.fromEntries(['validate', 'connect', 'initialize', 'disconnect'].map((step) => [step, () => {
      calls.push(step);
      if (step === failure || (step === 'disconnect' && failure)) throw new Error('secret-canary');
    }]));
    if (failure) {
      await assert.rejects(prepareWorker(dependencies), (error) => {
        const message = startupMessage(error);
        assert.doesNotMatch(message, /secret-canary/);
        assert.match(message, new RegExp({ validate: 'STARTUP_FAILED', connect: 'STARTUP_DATABASE', initialize: 'STARTUP_QUEUE' }[failure]));
        return true;
      });
    } else await prepareWorker(dependencies);
    assert.deepEqual(calls, failure === 'validate' ? ['validate'] : failure === 'connect'
      ? ['validate', 'connect', 'disconnect'] : failure === 'initialize'
        ? ['validate', 'connect', 'initialize', 'disconnect'] : ['validate', 'connect', 'initialize']);
  }
});
