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
import { scoreAll } from './relevanceScorer.js'
import { SIGNAL_STATS, TOPIC_SIGNALS } from './signals.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(__dirname, '../dist')
const PORT = process.env.PORT || 3002
const SPRINT = 7
const started = new Date()

const sources = JSON.parse(fs.readFileSync(path.join(__dirname, 'sources.json'), 'utf8'))
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

app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'music-mainframe', sprint: SPRINT, started: started.toISOString(), uptimeSec: Math.round(process.uptime()), news: { total: cache.length, lastSuccess: status.lastSuccess, lastError: status.lastError } }))

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
})
