import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Maison — Family Command Center',
        short_name: 'Maison',
        description: 'Un centre de commande familial, calme et partagé.',
        display: 'standalone',
        theme_color: '#526E59',
        background_color: '#FCF8F5',
        lang: 'fr',
        icons: [
          {
            src: 'icons/pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icons/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    exclude: ['e2e/**', '**/node_modules/**', '**/dist/**'],
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
