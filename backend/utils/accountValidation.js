const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function registration(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};
  const errors = {};
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  if (username.length < 4 || username.length > 50 || !/^[\p{L}\p{N}_. -]+$/u.test(username)) errors.username = 'Use 4–50 letters, numbers, spaces, dots, dashes or underscores.';
  if (email.length > 254 || !emailPattern.test(email)) errors.email = 'Enter a valid email address.';
  if (typeof body.password !== 'string' || !body.password.trim() || body.password.length < 8 || Buffer.byteLength(body.password, 'utf8') > 72) errors.password = 'Use at least 8 characters and at most 72 UTF-8 bytes.';
  if (!address || address.length > 500) errors.address = 'Enter an address (up to 500 characters).';
  return { errors, values: { username, email, address, password: body.password } };
}
function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
module.exports = { registration, escapeRegex };
