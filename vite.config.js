import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const dir = path.dirname(fileURLToPath(import.meta.url))
const at = (p) => path.resolve(dir, p)

/**
 * The work edition is produced by REPLACING the authored modules with stubs at build time, so their contents
 * never enter the bundle. Hiding a route would still ship its data to anyone who opens developer tools.
 * scripts/test-edition.mjs builds this and greps the output for private strings.
 */
const WORK_SWAPS = [
  ['src/data/consulting.js', 'src/editions/stubs/consulting.js'],
  ['src/navPrivate.js', 'src/editions/stubs/navPrivate.js'],
  ['src/data/siblings.js', 'src/editions/stubs/siblings.js'],
  ['src/data/rateCard.js', 'src/editions/stubs/rateCard.js'],
  ['src/data/personas.js', 'src/editions/stubs/personas.js'],
  ['src/data/playbooks.js', 'src/editions/stubs/playbooks.js'],
  ['src/data/cases/index.js', 'src/editions/stubs/cases.js'],
  ['src/utils/gammaExport.js', 'src/editions/stubs/gammaExport.js'],
  ['src/utils/proposal.js', 'src/editions/stubs/docBuilder.js'],
  ['src/utils/accountPlan.js', 'src/editions/stubs/docBuilder.js'],
  ['src/utils/categoryDeck.js', 'src/editions/stubs/docBuilder.js'],
  ['src/pages/Consulting.jsx', 'src/editions/stubs/Page.jsx'],
  ['src/pages/ConsultingCategory.jsx', 'src/editions/stubs/Page.jsx'],
  ['src/pages/Deliverables.jsx', 'src/editions/stubs/Page.jsx'],
  ['src/pages/Lab.jsx', 'src/editions/stubs/Page.jsx'],
  ['src/pages/LabCase.jsx', 'src/editions/stubs/Page.jsx'],
]

/**
 * Swaps the authored modules for stubs by RESOLVED path, not by import string — an alias on the specifier
 * misses every importer that spells the path differently, which is exactly how a leak gets shipped.
 */
function editionPlugin(edition) {
  if (edition !== 'work') return null
  const swaps = new Map(WORK_SWAPS.map(([from, to]) => [path.normalize(at(from)), at(to)]))
  return {
    name: 'mm-edition-swap',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (options?.isEntry) return null
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
      if (!resolved) return null
      const hit = swaps.get(path.normalize(resolved.id.split('?')[0]))
      return hit || null
    },
  }
}

const edition = process.env.MM_EDITION === 'work' ? 'work' : 'full'

export default defineConfig({
  plugins: [react(), tailwindcss(), editionPlugin(edition)].filter(Boolean),
  define: { 'import.meta.env.VITE_MM_EDITION': JSON.stringify(edition) },
  server: {
    port: 5190, host: true,
    // Live-news backend runs separately on :3002 in dev (same origin in prod).
    proxy: { '/api': 'http://localhost:3002', '/ws': { target: 'ws://localhost:3002', ws: true } },
  },
  build: {
    outDir: edition === 'work' ? 'dist-work' : 'dist',
    rollupOptions: {
      output: {
        // Keep vendor React/Router separate so future export renderers (pptxgenjs, docx)
        // can be lazy-loaded without bloating the core bundle (sibling anti-pattern #1).
        manualChunks: { vendor: ['react', 'react-dom', 'react-router-dom'] },
      },
    },
  },
})
