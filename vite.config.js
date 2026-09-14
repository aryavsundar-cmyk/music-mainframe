import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5190, host: true,
    // Live-news backend runs separately on :3002 in dev (same origin in prod).
    proxy: { '/api': 'http://localhost:3002', '/ws': { target: 'ws://localhost:3002', ws: true } },
  },
  build: {
    rollupOptions: {
      output: {
        // Keep vendor React/Router separate so future export renderers (pptxgenjs, docx)
        // can be lazy-loaded without bloating the core bundle (sibling anti-pattern #1).
        manualChunks: { vendor: ['react', 'react-dom', 'react-router-dom'] },
      },
    },
  },
})
