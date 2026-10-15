import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-192.png', 'pwa-512.png'],
      manifest: {
        name: 'Hotel Ops Admin',
        short_name: 'Hotel Admin',
        description: 'Admin console for hotel subscriptions',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#F4F7FB',
        theme_color: '#2B7BF0',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // Never serve API calls from the cache, so hotel data is always live.
      workbox: { navigateFallbackDenylist: [/^\/api/] },
    }),
  ],
  server: { host: true, port: 5173, proxy: { '/api': 'http://localhost:8080' } },
  preview: { port: 4173, proxy: { '/api': 'http://localhost:8080' } },
});