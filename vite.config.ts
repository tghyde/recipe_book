import react from '@vitejs/plugin-react'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/** In dev, serve data/ and photos/ from the repo the way the deploy workflow copies them into dist/. */
function serveRepoFiles(): Plugin {
  return {
    name: 'serve-repo-files',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0].replace(/^\/recipe_book/, '')
        if (!/^\/(data|photos)\//.test(url)) return next()
        const file = join(process.cwd(), decodeURIComponent(url))
        if (!existsSync(file) || !statSync(file).isFile()) return next()
        res.setHeader('Content-Type', url.endsWith('.json') ? 'application/json' : 'image/jpeg')
        res.setHeader('Cache-Control', 'no-store')
        createReadStream(file).pipe(res)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/recipe_book/',
  plugins: [
    react(),
    serveRepoFiles(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png', 'icon-512-maskable.png'],
      manifest: {
        name: "When you forget what you've cooked before",
        short_name: 'Cooked before',
        description: 'A small recipe book that remembers when you last made things.',
        start_url: '/recipe_book/',
        scope: '/recipe_book/',
        display: 'standalone',
        background_color: '#f6f0e4',
        theme_color: '#f6f0e4',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/recipe_book/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        runtimeCaching: [
          {
            // Photos from the deployed site or straight from the repo: cache first, they never change.
            urlPattern: /^https:\/\/(tghyde\.github\.io|raw\.githubusercontent\.com)\/.*\/photos\/.*\.jpg$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'photos',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
})
