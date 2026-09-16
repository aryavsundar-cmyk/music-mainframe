/**
 * Mainframe · Music — server.
 * Serves the Vite build with SPA fallback, /api/health, and the live-news layer:
 * in-memory aggregation from RSS + Google News + SEC EDGAR every N minutes, REST filters, WebSocket push.
 * Restart-safe, no DB, no auth. Lives outside src/ so Vite never bundles it.
 */
import express from 'express'
import compression from 'compression'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'
import { aggregate } from './newsAggregator.js'
import { fetchAllFilings, listedEntities, uaConfigured } from './filings.js'
import { scoreAll } from './relevanceScorer.js'
import { SIGNAL_STATS, TOPIC_SIGNALS } from './signals.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(__dirname, `../${process.env.MM_EDITION === 'work' ? 'dist-work' : 'dist'}`)
const PORT = process.env.PORT || 3002
const SPRINT = 19
const started = new Date()

// Minimal .env loader (no dependency): KEY=value lines at repo root, never overriding real env.
try { for (const line of fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8').split('\n')) { const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '') } } catch { /* no .env */ }

const sources = JSON.parse(fs.readFileSync(path.join(__dirname, 'sources.json'), 'utf8'))

// ── Edition, embedding and access ─────────────────────────────────────────────
// The work edition is the shareable build: no Gamma proxy, and it can be embedded and gated without a code change.
const EDITION = process.env.MM_EDITION === 'work' ? 'work' : 'full'
// EMBED_ALLOW: space- or comma-separated hosts permitted to frame this app (a SharePoint tenant, say).
const EMBED_ALLOW = (process.env.EMBED_ALLOW || '').split(/[\s,]+/).filter(Boolean)
const ACCESS_USER = process.env.ACCESS_USER || ''
const ACCESS_PASS = process.env.ACCESS_PASS || ''
const REFRESH_MS = (sources.refreshMinutes || 15) * 60 * 1000

// ── News state ────────────────────────────────────────────────────────────────
let cache = []
let status = { running: false, lastFetch: null, lastSuccess: null, lastError: null, errors: [], sourceCount: 0, rawCount: 0 }

async function fetchNews() {
  if (status.running) return
  status.running = true
  const t0 = Date.now()
  try {
    const { items, errors, sourceCount } = await aggregate(sources)
    const scored = scoreAll(items)
    const known = new Set(cache.map((n) => n.id))
    const fresh = scored.filter((n) => !known.has(n.id))
    cache = scored.slice(0, 600)
    status = { ...status, lastFetch: new Date().toISOString(), lastSuccess: new Date().toISOString(), lastError: null, errors, sourceCount, rawCount: items.length }
    console.log(`[news] ${items.length} items from ${sourceCount - errors.length}/${sourceCount} sources in ${Date.now() - t0}ms (${fresh.length} new, ${errors.length} source errors)`)
    if (fresh.length) broadcast({ type: 'update', items: fresh.slice(0, 50), status: publicStatus() })
  } catch (err) {
    status = { ...status, lastFetch: new Date().toISOString(), lastError: err.message }
    console.error('[news] fetch failed:', err.message)
  } finally { status.running = false }
}

const publicStatus = () => ({ ...status, total: cache.length, refreshMinutes: sources.refreshMinutes || 15 })

// ── Enrichment: structured SEC filings ────────────────────────────────────────
// Slow-moving compared with news, so it refreshes on its own, longer clock.
const FILINGS_REFRESH_MS = (Number(process.env.FILINGS_REFRESH_MINUTES) || 360) * 60 * 1000
let filings = []
let filingsStatus = { running: false, lastFetch: null, lastSuccess: null, lastError: null, errors: [], companies: listedEntities().length, resolved: 0 }

async function fetchFilings() {
  if (filingsStatus.running) return
  filingsStatus.running = true
  const t0 = Date.now()
  try {
    const r = await fetchAllFilings({ perCompany: 12, seed: sources.secFilings?.companies || [] })
    if (r.filings.length) filings = r.filings
    filingsStatus = { ...filingsStatus, lastFetch: new Date().toISOString(), lastSuccess: r.filings.length ? new Date().toISOString() : filingsStatus.lastSuccess, lastError: r.filings.length ? null : (r.errors[0]?.error || 'no filings returned'), errors: r.errors, companies: r.companies, resolved: r.resolved }
    console.log(`[filings] ${r.filings.length} filings from ${r.resolved}/${r.companies} companies in ${Date.now() - t0}ms (${r.errors.length} errors)`)
  } catch (err) {
    filingsStatus = { ...filingsStatus, lastFetch: new Date().toISOString(), lastError: err.message }
    console.error('[filings] fetch failed:', err.message)
  } finally { filingsStatus.running = false }
}

const filingsPublic = () => ({ ...filingsStatus, total: filings.length, refreshMinutes: FILINGS_REFRESH_MS / 60000 })

function filterNews({ q = '', entity = '', type = '', topic = '', source = '', kind = '', minScore = '' }) {
  const needle = q.trim().toLowerCase()
  return cache.filter((n) =>
    (!needle || `${n.title} ${n.summary}`.toLowerCase().includes(needle)) &&
    (!entity || n.entities.includes(entity)) && (!type || n.types.includes(type)) && (!topic || n.topics.includes(topic)) &&
    (!source || n.sourceId === source) && (!kind || n.kind === kind) && (!minScore || n.score >= Number(minScore)))
}

// ── HTTP ──────────────────────────────────────────────────────────────────────
const app = express()
app.disable('x-powered-by')
app.use(compression())

/** Framing policy: deny by default, allow named hosts when the deployment is meant to be embedded. */
app.use((req, res, next) => {
  const ancestors = EMBED_ALLOW.length ? `'self' ${EMBED_ALLOW.join(' ')}` : "'none'"
  res.setHeader('Content-Security-Policy', `frame-ancestors ${ancestors}`)
  if (!EMBED_ALLOW.length) res.setHeader('X-Frame-Options', 'DENY')
  next()
})

/**
 * Optional access control for a private deployment. Off unless both variables are set, and never applied to the
 * health endpoint, so the uptime watcher keeps working.
 */
app.use((req, res, next) => {
  if (!ACCESS_USER || !ACCESS_PASS || req.path === '/api/health') return next()
  const header = req.headers.authorization || ''
  const [scheme, encoded] = header.split(' ')
  if (scheme === 'Basic' && encoded) {
    const [user, pass] = Buffer.from(encoded, 'base64').toString('utf8').split(':')
    if (user === ACCESS_USER && pass === ACCESS_PASS) return next()
  }
  res.setHeader('WWW-Authenticate', 'Basic realm="Mainframe Music", charset="UTF-8"')
  return res.status(401).send('Authentication required.')
})

app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'music-mainframe', edition: EDITION, embeddable: EMBED_ALLOW.length ? EMBED_ALLOW : false, gated: !!(ACCESS_USER && ACCESS_PASS), sprint: SPRINT, started: started.toISOString(), uptimeSec: Math.round(process.uptime()), news: { total: cache.length, lastSuccess: status.lastSuccess, lastError: status.lastError } }))

app.get('/api/news', (req, res) => {
  const items = filterNews(req.query)
  const limit = Math.min(Number(req.query.limit) || 100, 300)
  res.json({ items: items.slice(0, limit), total: items.length, status: publicStatus() })
})

app.get('/api/news/stats', (_req, res) => {
  const count = (key) => cache.reduce((m, n) => { for (const v of n[key] || []) m[v] = (m[v] || 0) + 1; return m }, {})
  const bySource = cache.reduce((m, n) => { m[n.sourceId] = (m[n.sourceId] || 0) + 1; return m }, {})
  res.json({ total: cache.length, byEntity: count('entities'), byType: count('types'), byTopic: count('topics'), bySource, topics: Object.fromEntries(Object.entries(TOPIC_SIGNALS).map(([k, v]) => [k, v.label])), signals: SIGNAL_STATS, status: publicStatus() })
})

app.get('/api/news/sources', (_req, res) => res.json({
  rss: (sources.rssFeeds || []).map(({ id, name, url, enabled, category }) => ({ id, name, url, enabled, category })),
  googleQueries: sources.googleNews?.enabled ? sources.googleNews.queries : [],
  sec: (sources.secFilings?.companies || []).map(({ ticker, name, entityId }) => ({ ticker, name, entityId })),
  refreshMinutes: sources.refreshMinutes || 15, errors: status.errors,
}))

app.post('/api/news/refresh', (_req, res) => { fetchNews(); res.json({ ok: true, running: true }) })

// ── Gamma (presentation / document generation) ───────────────────────────────
// Proxies Gamma's public API (same shape as the Intelligence Hub). Needs GAMMA_API_KEY (Render env or .env).
// Gamma is async: POST creates a generation, then poll GET until completed. ~20–40s.
app.use(express.json({ limit: '2mb' }))
app.get('/api/filings', (req, res) => {
  const { entity = '', form = '', minWeight = '' } = req.query
  const limit = Math.min(Number(req.query.limit) || 100, 400)
  const items = filings.filter((f) => (!entity || f.entityId === entity) && (!form || f.form === form) && (!minWeight || f.weight >= Number(minWeight)))
  res.json({ items: items.slice(0, limit), total: items.length, status: filingsPublic() })
})

app.post('/api/filings/refresh', (_req, res) => { fetchFilings(); res.json({ ok: true, running: true }) })

/** What each enrichment connector is, and whether it is actually working right now. */
app.get('/api/enrichment/status', (_req, res) => res.json({
  connectors: [
    { id: 'news', label: 'Trade press and search', kind: 'news', live: !!status.lastSuccess && !status.lastError, items: cache.length, sources: status.sourceCount, lastSuccess: status.lastSuccess, lastError: status.lastError, errors: status.errors?.length || 0, refreshMinutes: sources.refreshMinutes || 15 },
    { id: 'sec', label: 'SEC EDGAR filings', kind: 'filing', live: !!filingsStatus.lastSuccess && !filingsStatus.lastError, items: filings.length, sources: filingsStatus.resolved, lastSuccess: filingsStatus.lastSuccess, lastError: filingsStatus.lastError, errors: filingsStatus.errors?.length || 0, refreshMinutes: FILINGS_REFRESH_MS / 60000, coverage: `${filingsStatus.resolved}/${filingsStatus.companies} listed entities`, hint: uaConfigured() ? '' : 'Set SEC_USER_AGENT with contact details; SEC refuses anonymous callers and blocks some hosting providers.' },
  ],
}))

if (EDITION === 'full') app.get('/api/gamma/status', (_req, res) => res.json({ configured: !!process.env.GAMMA_API_KEY }))
if (EDITION === 'full') app.post('/api/gamma/generate', async (req, res) => {
  const key = process.env.GAMMA_API_KEY
  if (!key) return res.status(503).json({ error: 'GAMMA_API_KEY not configured', help: 'Set GAMMA_API_KEY on the Render service (or in .env locally). Get a key at gamma.app/settings/api. Meanwhile, download the .md and paste it into Gamma.' })
  const { content, title, format = 'presentation', numCards = 12 } = req.body || {}
  if (!content) return res.status(400).json({ error: 'content is required' })
  const base = process.env.GAMMA_API_URL || 'https://public-api.gamma.app/v1.0'
  try {
    const r = await fetch(`${base}/generations`, { method: 'POST', headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputText: content, textMode: 'preserve', format, numCards, textOptions: { tone: 'professional, precise', audience: 'private-equity deal team and music executives', language: 'en' }, imageOptions: { source: 'aiGenerated' }, cardSplit: 'inputTextBreaks' }) })
    const text = await r.text(); let data = {}; try { data = JSON.parse(text) } catch { /* non-JSON */ }
    if (!r.ok) return res.status(r.status).json({ error: 'Gamma API error', details: data?.message || data?.error || text.slice(0, 300) })
    const id = data.generationId
    if (!id) return res.status(502).json({ error: 'Gamma did not return a generation ID', raw: data })
    console.log(`[gamma] ${id} · ${format} · "${title}" · ${content.length} chars`)
    for (let i = 0; i < 45; i++) {
      await new Promise((ok) => setTimeout(ok, 2000))
      const s = await fetch(`${base}/generations/${id}`, { headers: { 'X-API-KEY': key } }).then((x) => x.json()).catch(() => ({}))
      if (s.status === 'completed' && s.gammaUrl) { console.log(`[gamma] done in ${(i + 1) * 2}s → ${s.gammaUrl}`); return res.json({ url: s.gammaUrl, generationId: id, status: 'complete', title }) }
      if (s.status === 'failed') return res.status(502).json({ error: 'Gamma generation failed', details: s })
    }
    res.status(504).json({ error: 'Gamma generation timed out (90s). Try again or use the .md export.' })
  } catch (err) { res.status(502).json({ error: 'Failed to reach Gamma API', details: err.message }) }
})

if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { maxAge: '1h', index: false }))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/') || req.path === '/ws') return next()
    res.sendFile(path.join(DIST, 'index.html'), { maxAge: 0 })
  })
} else {
  app.use((req, res, next) => (req.path.startsWith('/api/') ? next() : res.status(503).type('text').send('No dist/ build — run `npm run build`, or use the Vite dev server on :5190 (it proxies /api and /ws here).')))
}

// ── WebSocket ─────────────────────────────────────────────────────────────────
const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })
const clients = new Set()
wss.on('connection', (ws) => {
  clients.add(ws)
  ws.send(JSON.stringify({ type: 'initial', items: cache.slice(0, 100), status: publicStatus() }))
  ws.on('close', () => clients.delete(ws))
  ws.on('error', () => clients.delete(ws))
})
function broadcast(msg) { const payload = JSON.stringify(msg); for (const ws of clients) if (ws.readyState === 1) ws.send(payload) }

// ── Start ─────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`music-mainframe :${PORT} · dist ${fs.existsSync(DIST) ? 'served' : 'absent'} · signals ${SIGNAL_STATS.entities} entities / ${SIGNAL_STATS.patterns} patterns / ${SIGNAL_STATS.topics} topics · refresh ${sources.refreshMinutes || 15}m`)
  fetchNews()
  setInterval(fetchNews, REFRESH_MS).unref()
  setTimeout(fetchFilings, 4000).unref()
  setInterval(fetchFilings, FILINGS_REFRESH_MS).unref()
})
