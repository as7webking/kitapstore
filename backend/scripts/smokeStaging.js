// Standalone HTTP client: no dotenv, models, database or account imports.
const MAX_BODY_BYTES = 4096;
function apiOrigin(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Provide an HTTPS staging API origin.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      url.origin !== value || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Use an exact HTTPS staging API origin without credentials, path, query or trailing slash.');
  }
  return url.origin;
}
async function smallBody(response) {
  if (!response.body) throw new Error('Missing body');
  const reader = response.body.getReader();
  const chunks = []; let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) throw new Error('Oversized body');
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally { await reader.cancel().catch(() => {}); }
}
async function checkEndpoint(origin, path, fetcher, timeoutMs) {
  const controller = new AbortController();
  let timer;
  try {
    await Promise.race([
      (async () => {
        const response = await fetcher(origin + path, {
          method: 'GET', redirect: 'error', signal: controller.signal,
          credentials: 'omit', cache: 'no-store', headers: { Accept: path === '/healthz' ? 'application/json' : 'text/plain' },
        });
        // Never follow redirects or print server payloads, URLs, tokens or raw errors.
        if (response.status !== 200) { await response.body?.cancel(); throw new Error('Unexpected status'); }
        const body = await smallBody(response);
        if (path === '/healthz') {
          if (!response.headers.get('content-type')?.includes('application/json') || JSON.parse(body).status !== 'ready') throw new Error('Not ready');
        } else if (body.trim() !== 'API OK') throw new Error('Unexpected API response');
      })(),
      new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('Timeout')); }, timeoutMs); }),
    ]);
    return { path, ok: true };
  } catch { return { path, ok: false }; }
  finally { clearTimeout(timer); controller.abort(); }
}
async function smokeStaging(value, { fetcher = globalThis.fetch, timeoutMs = 8000 } = {}) {
  const origin = apiOrigin(value);
  const results = [];
  for (const path of ['/healthz', '/api/v1/test']) results.push(await checkEndpoint(origin, path, fetcher, timeoutMs));
  return results;
}
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--staging-api' || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    console.error('Usage: npm run smoke:staging --prefix backend -- --staging-api https://YOUR-TEST-API. Keep TLS verification enabled.');
    process.exitCode = 1;
  } else {
    smokeStaging(args[1]).then((results) => {
      for (const result of results) console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.path}`);
      console.log('GET checks only. Accounts, mail worker, recovery and checkout are NOT verified.');
      if (results.some((result) => !result.ok)) process.exitCode = 1;
    }).catch(() => { console.error('Invalid staging API origin. No checks completed.'); process.exitCode = 1; });
  }
}
module.exports = { apiOrigin, smokeStaging };
