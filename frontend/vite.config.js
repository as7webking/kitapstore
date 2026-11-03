import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.VERCEL) {
    let url;
    try { url = new URL(env.VITE_API_URL); } catch { throw new Error('Set VITE_API_URL to the staging HTTPS backend origin'); }
    if (url.protocol !== 'https:' || url.origin !== env.VITE_API_URL || url.username || url.password || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      throw new Error('Vercel requires an exact public HTTPS VITE_API_URL origin without trailing slash');
    }
  }
  return { plugins: [react()] };
})
