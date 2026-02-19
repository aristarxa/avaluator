import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Avalancher',
        short_name: 'Avalancher',
        description: 'PWA для анализа лавиноопасных склонов Красной Поляны',
        theme_color: '#1565C0',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Proxy path — cached by SW in prod
            urlPattern: /^\/tile-proxy\/slope\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'slope-tiles',
              expiration: { maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'openfreemap-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/api\.maptiler\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'maptiler-tiles',
              expiration: { maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/s3\.amazonaws\.com\/elevation-tiles-prod\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'dem-tiles',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/overpass-api\.de\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'overpass-api',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ],

  server: {
    proxy: {
      /**
       * Dev CORS proxy: /tile-proxy/slope/{z}/{x}/{y}.png
       *   → https://www.openslopemap.org/karten/gps/{z}/{x}/{y}.png
       *
       * Vite adds CORS headers automatically — browser sees localhost.
       */
      '/tile-proxy/slope': {
        target: 'https://www.openslopemap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tile-proxy\/slope/, '/karten/gps'),
        secure: true
      }
    }
  },

  preview: {
    proxy: {
      '/tile-proxy/slope': {
        target: 'https://www.openslopemap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tile-proxy\/slope/, '/karten/gps'),
        secure: true
      }
    }
  }
});
