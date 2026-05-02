// vite.config.ts — standard for all SP 2013 apps.
// Inlines all JS/CSS into a single index.html for SharePoint document library deployment.

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Inject a build version so the AppBar badge auto-updates on every push.
// Format: "vX.Y.Z (abcdef0)" — semver from package.json + commit count + short
// hash so you can always match what's in prod back to an exact git commit.
// Falls back gracefully when git is unavailable.
function buildVersion(): string {
  // Read major.minor from package.json — bump manually for features/releases.
  let base = 'v0.0'
  try {
    const pkg = JSON.parse(
      execSync('cat package.json').toString()
    ) as { version?: string }
    const parts = (pkg.version ?? '0.0.0').split('.')
    base = `v${parts[0]}.${parts[1]}`
  } catch { /* keep default */ }

  // Patch = total commit count — auto-increments on every commit.
  let patch = '0'
  try {
    patch = execSync('git rev-list --count HEAD').toString().trim()
  } catch { /* keep default */ }

  // Short hash — lets you `git checkout <hash>` straight from the badge.
  let hash = ''
  try {
    hash = execSync('git rev-parse --short HEAD').toString().trim()
  } catch { /* omit if unavailable */ }

  const ver = `${base}.${patch}`
  return hash ? `${ver} (${hash})` : ver
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
