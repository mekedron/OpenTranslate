import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Standalone Vite app for the WebKit UI harness (see test/webkit/drive.mjs and
// AGENTS.md → "Testing Safari-only UI in WebKit"). It mounts real extension
// components so Playwright/WebKit (Safari's engine) can reproduce Safari-only
// layout/positioning bugs without a full Xcode + Simulator build.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: { alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) } },
  plugins: [react()],
})
