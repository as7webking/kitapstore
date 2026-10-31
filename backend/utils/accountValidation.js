const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function normalizeEmail(value) { return typeof value === 'string' ? value.trim().toLowerCase() : ''; }
function validEmail(value) { return value.length <= 254 && emailPattern.test(value); }
function passwordError(value) {
  return typeof value !== 'string' || !value.trim() || value.length < 8 || Buffer.byteLength(value, 'utf8') > 72
    ? 'Use at least 8 characters and at most 72 UTF-8 bytes.' : '';
}
function registration(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};
  const errors = {};
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const email = normalizeEmail(body.email);
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  if (username.length < 4 || username.length > 50 || !/^[\p{L}\p{N}_. -]+$/u.test(username)) errors.username = 'Use 4–50 letters, numbers, spaces, dots, dashes or underscores.';
  if (!validEmail(email)) errors.email = 'Enter a valid email address.';
  if (passwordError(body.password)) errors.password = passwordError(body.password);
  if (!address || address.length > 500) errors.address = 'Enter an address (up to 500 characters).';
  return { errors, values: { username, email, address, password: body.password } };
}
function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
module.exports = { registration, escapeRegex, normalizeEmail, validEmail, passwordError };
