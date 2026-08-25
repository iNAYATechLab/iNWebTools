import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

/**
 * Vite configuration for the iNWebTools SPA.
 *
 * The browser always calls the relative path `/api/...`. In development Vite
 * proxies that to the Express server; in production both are served from the
 * same origin. Either way the client never hardcodes a backend host, so there
 * are no CORS surprises and no environment-specific URLs in the bundle.
 */
export default defineConfig(({ mode }) => {
  // Load .env from WebApplication/ so client and server share one file.
  const env = loadEnv(mode, fileURLToPath(new URL('../', import.meta.url)), '');
  const apiTarget = `http://localhost:${env.PORT ?? '5000'}`;

  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    server: {
      port: 5173,
      host: true,
      strictPort: false,
      // Required for the sandboxed preview host to reach the dev server.
      allowedHosts: true,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true, secure: false },
        '/health': { target: apiTarget, changeOrigin: true, secure: false },
      },
    },

    preview: {
      port: 4173,
      host: true,
      allowedHosts: true,
    },

    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      chunkSizeWarningLimit: 900,
    },
  };
});
