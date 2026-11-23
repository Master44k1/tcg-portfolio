import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Sealed Portfolio',
        short_name: 'Sealed',
        description: 'Sealed-TCG-Produkte scannen und mit Cardmarket-Preisen verfolgen',
        lang: 'de',
        display: 'standalone',
        start_url: '.',
        background_color: '#14161c',
        theme_color: '#14161c',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        runtimeCaching: [
          { urlPattern: /\/data\/.*\.json$/, handler: 'NetworkFirst', options: { cacheName: 'price-data' } },
        ],
      },
    }),
  ],
});
