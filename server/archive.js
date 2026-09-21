/**
 * archive.js — the evidence archive: every music-relevant item the live feed has carried, kept.
 *
 * The live feed is a window, not a record. It lives in memory, holds a few weeks at most, and empties on every
 * restart — so a "last 365 days" count read from it measures how long the server has been up. The archive is
 * what makes a trailing window mean what it says.
 *
 * Storage is the repository itself: data/archive/YYYY-MM.json, one file per month of publication, plus
 * index.json. A scheduled GitHub Action (scripts/archive-news.mjs) appends to it daily and commits, so every
 * addition is versioned and every item keeps its source URL. The server reads the files it was deployed with,
 * then refreshes from the repository's raw files, so a new day's archive does not need a deploy.
 *
 * Pure functions here are shared by the job and the server; only load/write/fetch touch the outside world.
 */
import fs from 'node:fs'
import path from 'node:path'
import { titleKey, urlKey } from '../src/utils/eventKeys.js'

export const SUMMARY_MAX = 280
export const DEFAULT_REMOTE = 'https://raw.githubusercontent.com/aryavsundar-cmyk/music-mainframe/main/data/archive'

export { titleKey, urlKey }

/**
 * The fields worth keeping. Summaries are trimmed: the archive needs enough text to classify and to recognise
 * the story, not a copy of someone else's article — the URL is kept so the reader goes to the source.
 */
export function normalizeItem(n, { now = new Date().toISOString() } = {}) {
  const summary = String(n.summary || '').replace(/\s+/g, ' ').trim()
  return {
    id: String(n.id),
    url: n.url || '',
    title: String(n.title || '').trim(),
    summary: summary.length > SUMMARY_MAX ? `${summary.slice(0, SUMMARY_MAX - 1).trimEnd()}…` : summary,
    source: n.source || '',
    sourceId: n.sourceId || '',
    category: n.category || '',
    kind: n.kind || 'news',
    publishedAt: n.publishedAt || n.firstSeen || now,
    entities: [...(n.entities || [])].sort(),
    topics: [...(n.topics || [])].sort(),
    score: typeof n.score === 'number' ? Math.round(n.score * 100) / 100 : undefined,
    firstSeen: n.firstSeen || now,
  }
}

/**
 * Adds incoming items to an existing archive. An item already present — by id, URL or headline — is left as
 * it was first recorded, so re-running on the same feed changes nothing. Returns the merged list and what was
 * added, newest first, in a stable order so the files diff cleanly.
 */
export function mergeArchive(existing = [], incoming = [], { now = new Date().toISOString() } = {}) {
  const ids = new Set(existing.map((x) => x.id))
  const urls = new Set(existing.map((x) => urlKey(x.url)).filter(Boolean))
  const titles = new Set(existing.map((x) => titleKey(x.title)).filter(Boolean))
  const added = []
  for (const raw of incoming) {
    if (!raw?.id || !raw.title) continue
    const n = normalizeItem(raw, { now })
    const u = urlKey(n.url); const k = titleKey(n.title)
    if (ids.has(n.id) || (u && urls.has(u)) || (k && titles.has(k))) continue
    ids.add(n.id); if (u) urls.add(u); if (k) titles.add(k)
    added.push(n)
  }
  return { items: sortItems([...existing, ...added]), added: sortItems(added) }
}

export const sortItems = (xs) => [...xs].sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)) || a.id.localeCompare(b.id))

/** { 'YYYY-MM': items } by month of publication. */
export function partitionByMonth(items) {
  const out = {}
  for (const x of items) (out[String(x.publishedAt).slice(0, 7)] ||= []).push(x)
  return out
}

/**
 * Coverage is when the archive STARTED watching — the first day an item was recorded — not the oldest date in
 * it. The first run caught whatever the feed still held, a sample of the weeks before; counting from that
 * sample's oldest item would overstate what the archive saw.
 */
export function buildIndex(items, { updatedAt } = {}) {
  const months = partitionByMonth(items)
  const firstSeen = items.map((x) => x.firstSeen).filter(Boolean).sort()
  const published = items.map((x) => x.publishedAt).filter(Boolean).sort()
  return {
    coverageSince: (firstSeen[0] || '').slice(0, 10),
    oldestItem: (published[0] || '').slice(0, 10),
    newestItem: (published.at(-1) || '').slice(0, 10),
    count: items.length,
    months: Object.keys(months).sort().map((m) => ({ month: m, count: months[m].length })),
    updatedAt: updatedAt || new Date().toISOString(),
  }
}

// ── The outside world ───────────────────────────────────────────────────────────────────────────────────

const MONTH_FILE = /^\d{4}-\d{2}\.json$/

export function loadLocalArchive(dir) {
  if (!fs.existsSync(dir)) return { items: [], index: null }
  const items = fs.readdirSync(dir).filter((f) => MONTH_FILE.test(f)).flatMap((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
  const indexPath = path.join(dir, 'index.json')
  return { items: sortItems(items), index: fs.existsSync(indexPath) ? JSON.parse(fs.readFileSync(indexPath, 'utf8')) : null }
}

/** Writes only the months that changed, and bumps index.updatedAt only when something was added. */
export function writeArchive(dir, items, { changed = true, previousIndex = null } = {}) {
  fs.mkdirSync(dir, { recursive: true })
  const months = partitionByMonth(items)
  const written = []
  for (const [m, list] of Object.entries(months)) {
    const file = path.join(dir, `${m}.json`)
    const body = `${JSON.stringify(sortItems(list), null, 1)}\n`
    if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === body) continue
    fs.writeFileSync(file, body)
    written.push(m)
  }
  const index = buildIndex(items, { updatedAt: changed || !previousIndex ? new Date().toISOString() : previousIndex.updatedAt })
  const indexBody = `${JSON.stringify(index, null, 1)}\n`
  const indexPath = path.join(dir, 'index.json')
  if (!fs.existsSync(indexPath) || fs.readFileSync(indexPath, 'utf8') !== indexBody) fs.writeFileSync(indexPath, indexBody)
  return { written, index }
}

/** The repository's current archive, read over HTTP. Throws with a reason the server can report. */
export async function fetchRemoteArchive(base = DEFAULT_REMOTE, { timeoutMs = 15000 } = {}) {
  const get = async (p) => {
    const r = await fetch(`${base}/${p}`, { signal: AbortSignal.timeout(timeoutMs) })
    if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`)
    return r.json()
  }
  const index = await get('index.json')
  const lists = await Promise.all(index.months.map((m) => get(`${m.month}.json`)))
  return { index, items: sortItems(lists.flat()) }
}
