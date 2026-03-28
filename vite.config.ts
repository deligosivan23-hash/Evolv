import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // 'autoUpdate' silently updates the SW in the background.
        registerType: 'autoUpdate',

        // Tell the plugin to use your existing manifest instead of
        // generating a new one — keeps your icon and theme color.
        manifest: false,

        // Workbox config — this is what actually makes offline work.
        workbox: {
          // Pre-cache every file Vite emits (JS, CSS, HTML, assets).
          // Workbox reads the build output automatically — no manual
          // filename list needed, so hashed filenames are always correct.
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

          // Also cache the root and manifest at runtime.
          additionalManifestEntries: [
            { url: '/', revision: null },
            { url: '/manifest.json', revision: null },
          ],

          // Navigation fallback — any unmatched route serves index.html
          // so React Router (if added later) works offline too.
          navigateFallback: '/index.html',

          // Runtime caching for Google Fonts so they load offline.
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
