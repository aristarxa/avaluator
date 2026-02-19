import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const PROXY_SLOPE = {
  target: 'https://tile.osmand.net',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/tile-proxy\/slope/, '/hd/slope'),
  secure: true,
};

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
            // OsmAnd slope tiles via proxy (dev) or reverse-proxy (prod)
            urlPattern: /^\/tile-proxy\/slope\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'slope-tiles',
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/api\.maptiler\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'maptiler-tiles',
              expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 14 },
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
      // Dev: /tile-proxy/slope/{z}/{x}/{y}.png → https://tile.osmand.net/hd/slope/{z}/{x}/{y}.png
      '/tile-proxy/slope': PROXY_SLOPE
    }
  },

  preview: {
    proxy: {
      '/tile-proxy/slope': PROXY_SLOPE
    }
  }
});
