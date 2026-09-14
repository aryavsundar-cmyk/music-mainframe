import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5190, host: true },
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
