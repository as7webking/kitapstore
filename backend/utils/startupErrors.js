// Only errors created here may contribute text to startup logs.
const trusted = new WeakSet();
function startupError(code, message) {
  const error = new Error(message);
  error.code = code;
  trusted.add(error);
  return error;
}
function configurationError(message) { return startupError('STARTUP_CONFIGURATION', message); }
function startupMessage(error) {
  return trusted.has(error) ? `[${error.code}] ${error.message}`
    : '[STARTUP_FAILED] Startup failed unexpectedly. Check service configuration.';
}
module.exports = { startupError, configurationError, startupMessage };
