function frontendOrigins(env = process.env) {
  const canonical = env.FRONTEND_URL || 'http://localhost:5173';
  const values = [canonical, ...(env.CORS_ORIGINS || '').split(',').filter(Boolean)];
  for (const value of values) {
    let url;
    try { url = new URL(value); } catch { throw new Error('Frontend origins must be valid HTTP(S) origins'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value || url.username || url.password || url.hostname.includes('*')) {
      throw new Error('Frontend origins must be exact origins without paths or trailing slashes');
    }
    if (env.APP_ENV === 'staging' && url.protocol !== 'https:') throw new Error('Staging frontend origins must use HTTPS');
  }
  return [...new Set(values)];
}
function validateDeployment(env = process.env) {
  if (env.VERCEL) throw new Error('This backend requires a persistent Node service; Vercel is configured for frontend only');
  frontendOrigins(env);
  const hops = Number(env.TRUST_PROXY_HOPS || 0);
  if (!Number.isInteger(hops) || hops < 0 || hops > 1) throw new Error('TRUST_PROXY_HOPS must be 0 or 1 after checking the ingress topology');
  if (env.APP_ENV === 'staging') {
    const db = env.URI?.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?/]*)/i)?.[1];
    if (db !== 'kitapstore_test' || env.MONGODB_DB_NAME !== 'kitapstore_test') {
      throw new Error('Staging requires URI database and MONGODB_DB_NAME to equal kitapstore_test');
    }
    if (env.EMAIL_HOST !== 'smtp.ethereal.email' || env.EMAIL_PORT !== '587' || !env.EMAIL_USER || !env.EMAIL_PASS) {
      throw new Error('Staging requires the Ethereal test SMTP transport on port 587');
    }
    if (env.JWT_SECRET?.length < 32) throw new Error('Staging requires a separate JWT_SECRET of at least 32 characters');
    if (env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_SECRET || env.FACEBOOK_CLIENT_ID || env.FACEBOOK_CLIENT_SECRET) {
      throw new Error('OAuth must remain disabled in this staging configuration');
    }
  }
  return { trustProxy: hops || false };
}
module.exports = { frontendOrigins, validateDeployment };
