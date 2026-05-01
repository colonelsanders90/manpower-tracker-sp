// vite.config.ts — standard for all SP 2013 apps.
// Inlines all JS/CSS into a single index.html for SharePoint document library deployment.

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Inject a build identifier so the AppBar badge auto-updates on every push.
// Format: "<short-hash> (<date>)" e.g. "efb06ba (2026-05-01)"
// Falls back to "dev" when git is unavailable (CI without a clone, etc.).
function buildVersion(): string {
  try {
    const hash = execSync('git rev-parse --short HEAD').toString().trim()
    const date = new Date().toISOString().slice(0, 10)
    return `${hash} (${date})`
  } catch {
    return 'dev'
  }
}

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  define: {
    // Available in source as the global __APP_VERSION__ — see src/version.ts
    __APP_VERSION__: JSON.stringify(buildVersion()),
  },
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
    target: 'esnext',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
  }
})
