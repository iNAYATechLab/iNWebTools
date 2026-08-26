import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

/**
 * Vite configuration for the iNWebTools SPA.
 *
 * Production optimizations:
 * - Vendor chunk splitting
 * - Asset minification and compression
 * - Modern ES2022 target
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
        '/sitemap.xml': { target: apiTarget, changeOrigin: true, secure: false },
        '/robots.txt': { target: apiTarget, changeOrigin: true, secure: false },
      },
    },

    preview: {
      port: 4173,
      host: true,
      allowedHosts: true,
    },

    build: {
      outDir: 'dist',
      target: 'es2022',
      sourcemap: mode !== 'production',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 950,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
    },
  };
});
