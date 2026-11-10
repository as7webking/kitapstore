const { configurationError } = require('../utils/startupErrors');
function frontendOrigins(env = process.env) {
  const canonical = env.FRONTEND_URL || 'http://localhost:5173';
  const values = [canonical, ...(env.CORS_ORIGINS || '').split(',').filter(Boolean)];
  for (const value of values) {
    let url;
    try { url = new URL(value); } catch { throw configurationError('FRONTEND_URL and CORS_ORIGINS must be valid HTTP(S) origins'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value || url.username || url.password || url.hostname.includes('*')) {
      throw configurationError('FRONTEND_URL and CORS_ORIGINS must be exact origins without paths or trailing slashes');
    }
    if (env.APP_ENV === 'staging' && url.protocol !== 'https:') throw configurationError('Staging FRONTEND_URL and CORS_ORIGINS must use HTTPS');
  }
  return [...new Set(values)];
}
function validateDeployment(env = process.env) {
  if (env.VERCEL) throw configurationError('This backend requires a persistent Node service; Vercel is configured for frontend only');
  frontendOrigins(env);
  const hops = Number(env.TRUST_PROXY_HOPS || 0);
  if (!Number.isInteger(hops) || hops < 0 || hops > 1) throw configurationError('TRUST_PROXY_HOPS must be 0 or 1 after checking the ingress topology');
  if (env.APP_ENV === 'staging') {
    const db = env.URI?.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?/]*)/i)?.[1];
    if (db !== 'kitapstore_test' || env.MONGODB_DB_NAME !== 'kitapstore_test') {
      throw configurationError('Staging requires URI database and MONGODB_DB_NAME to equal kitapstore_test');
    }
    if (env.EMAIL_HOST !== 'smtp.ethereal.email' || env.EMAIL_PORT !== '587' || !env.EMAIL_USER || !env.EMAIL_PASS) {
      throw configurationError('Staging requires the Ethereal test SMTP transport on port 587');
    }
    if (env.JWT_SECRET?.length < 32) throw configurationError('Staging requires a separate JWT_SECRET of at least 32 characters');
    if (env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_SECRET || env.FACEBOOK_CLIENT_ID || env.FACEBOOK_CLIENT_SECRET) {
      throw configurationError('OAuth must remain disabled in this staging configuration');
    }
  }
  return { trustProxy: hops || false };
}
module.exports = { frontendOrigins, validateDeployment };
