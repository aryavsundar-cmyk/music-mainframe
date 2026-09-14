/**
 * Mainframe · Music — production server.
 * Sprint 0: serves the Vite build + SPA fallback + /api/health.
 * Sprint 5: grows the RSS / Google News / SEC EDGAR aggregator + WebSocket push here
 *           (pattern: am-intelligence-hub/server). Lives outside src/ so Vite never bundles it.
 */
import express from 'express'
import compression from 'compression'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(__dirname, '../dist')
const PORT = process.env.PORT || 3002
const started = new Date()

const app = express()
app.disable('x-powered-by')
app.use(compression())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, app: 'music-mainframe', sprint: 0, started: started.toISOString(), uptimeSec: Math.round(process.uptime()) })
})

app.use(express.static(DIST, { maxAge: '1h', index: false }))
// SPA fallback — every non-API, non-asset route renders index.html and React Router takes over.
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/') || /\.[a-z0-9]+$/i.test(req.path)) return next()
  res.sendFile(path.join(DIST, 'index.html'), { maxAge: 0 })
})

app.listen(PORT, () => console.log(`music-mainframe listening on :${PORT} (dist: ${DIST})`))
