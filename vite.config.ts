// vite.config.ts — standard for all SP 2013 apps.
// Inlines all JS/CSS into a single index.html for SharePoint document library deployment.

import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// SP 2013's Edge security zone blocks inline <script type="module">.
// Strip the attribute after vite-plugin-singlefile has written the file —
// transformIndexHtml runs too early (before the inline is complete), so
// we patch the output file directly in writeBundle instead.
// IIFE output has no import/export so a plain <script> executes correctly.
const stripModuleType: Plugin = {
  name: 'strip-module-type',
  apply: 'build',
  writeBundle(options) {
    const outDir = options.dir ?? 'dist'
    const filePath = path.resolve(__dirname, outDir, 'index.html')
    if (!fs.existsSync(filePath)) return
    const original = fs.readFileSync(filePath, 'utf-8')
    const patched = original
      .replace(/<script type="module" crossorigin>/g, '<script>')
      .replace(/<script type="module">/g, '<script>')
    fs.writeFileSync(filePath, patched)
    console.log('[strip-module-type] removed type="module" from inline script')
  },
}

export default defineConfig({
  plugins: [react(), viteSingleFile(), stripModuleType],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/sp-apps': 'http://localhost:3000'  // dev only — routes mock API calls
    }
  },
  build: {
    target: 'es2015',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    // IIFE format avoids <script type="module"> in the output — SP 2013's
    // security zone blocks inline module scripts. Plain <script> works fine.
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'ManpowerTrackerApp',
      },
    },
  }
})
