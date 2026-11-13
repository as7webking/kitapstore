import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Isolated test server. Never loads private .env files or uses a real backend.
export default defineConfig({
  plugins: [react()],
  envDir: false,
  define: { 'import.meta.env.VITE_API_URL': '""' },
});
