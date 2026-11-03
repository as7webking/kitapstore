const codes = new Map(Object.entries(require('../utils/legacyApiCodes.json')));

// Additive contract: keep legacy English messages and field errors unchanged.
// New handlers may set code/fieldCodes directly without relying on legacy text.
function withMessageCodes(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const message = body.message || body.error;
  const result = { ...body };
  if (typeof message === 'string') result.code = body.code || codes.get(message) || 'API_ERROR';
  if (body.errors && typeof body.errors === 'object' && !Array.isArray(body.errors)) {
    result.fieldCodes = Object.fromEntries(Object.entries(body.errors).map(([field, error]) => [field,
      body.fieldCodes?.[field] || codes.get(error) || 'API_ERROR',
    ]));
  }
  return result;
}
function apiMessages(req, res, next) {
  const json = res.json;
  res.json = function (body) { return json.call(this, withMessageCodes(body)); };
  next();
}
module.exports = { apiMessages, withMessageCodes };
