import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Дринкит · Москва 10',
        short_name: 'Дринкит 10',
        description: 'Выручка и табло мотивации кофеен',
        lang: 'ru',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F6F8FD',
        theme_color: '#F6F8FD',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        runtimeCaching: [
          { urlPattern: /^https:\/\/publicapi\.drinkit\.dodois\.io\//, handler: 'NetworkOnly' },
          { urlPattern: /\/data\/daily\.json$/, handler: 'NetworkFirst', options: { cacheName: 'history' } },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: { fs: { strict: false } },
})
