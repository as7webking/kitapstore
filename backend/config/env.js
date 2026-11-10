const { configurationError } = require('../utils/startupErrors');
function validateEnv(env = process.env) {
  const missing = ["URI", "JWT_SECRET"].filter((key) => !env[key]?.trim());
  if (missing.length) throw configurationError(`Missing required environment variables: ${missing.join(", ")}`);
  if (!/^mongodb(?:\+srv)?:\/\//.test(env.URI)) throw configurationError("URI must be a MongoDB connection string");
  const port = Number(env.PORT || 1001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw configurationError("PORT must be between 1 and 65535");
  require('./deployment').validateDeployment(env);
  if (env.RESET_MAIL_ENCRYPTION_KEY) require('../utils/resetMailCrypto').encryptionKey(env);
  const emailPort = Number(env.EMAIL_PORT || 465);
  if (!Number.isInteger(emailPort) || emailPort < 1 || emailPort > 65535) throw configurationError('EMAIL_PORT must be between 1 and 65535');
  const minutes = Number(env.PASSWORD_RESET_TTL_MINUTES || 30);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 120) throw configurationError('PASSWORD_RESET_TTL_MINUTES must be between 1 and 120');
  return { port };
}

function validateWorkerEnv(env = process.env) {
  validateEnv(env);
  const missing = ['RESET_MAIL_ENCRYPTION_KEY', 'EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS']
    .filter((key) => !env[key]?.trim());
  if (missing.length) throw configurationError(`Missing required environment variables: ${missing.join(', ')}`);
  require('../utils/resetMailCrypto').encryptionKey(env);
}

module.exports = { validateEnv, validateWorkerEnv };
