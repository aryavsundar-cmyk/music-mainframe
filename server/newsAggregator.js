/**
 * newsAggregator.js — RSS + Google News RSS + SEC EDGAR Atom. Free, keyless, in-memory.
 * Every fetcher is isolated (allSettled) and returns [] on failure so one dead feed never blocks the batch.
 */
import Parser from 'rss-parser'
import crypto from 'node:crypto'

const parser = new Parser({ timeout: 12000, headers: { 'User-Agent': 'MusicMainframe/0.5 (+https://music-mainframe.onrender.com)' } })

const id = (s) => crypto.createHash('md5').update(s).digest('hex').slice(0, 16)
const clean = (t = '') => t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&#8217;/g, '\'').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
const when = (d) => { const t = d ? new Date(d) : null; return t && !Number.isNaN(t.getTime()) ? t.toISOString() : new Date().toISOString() }

async function fetchRss(feed) {
  const parsed = await parser.parseURL(feed.url)
  return (parsed.items || []).slice(0, 20).map((it) => ({
    id: id((it.title || '') + (it.link || '')), title: clean(it.title), summary: clean(it.contentSnippet || it.content || it.summary || '').slice(0, 480),
    url: it.link || '', publishedAt: when(it.isoDate || it.pubDate), source: feed.name, sourceId: feed.id, category: feed.category || 'trade', kind: 'news',
  }))
}

async function fetchGoogle(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}+when:14d&hl=en-US&gl=US&ceid=US:en`
  const parsed = await parser.parseURL(url)
  return (parsed.items || []).slice(0, 12).map((it) => {
    // Google titles end with " - Publisher"; keep the publisher as the display source.
    const m = /^(.*) - ([^-]+)$/.exec(it.title || ''); const title = m ? m[1] : it.title; const pub = m ? m[2].trim() : 'Google News'
    return { id: id((title || '') + (it.link || '')), title: clean(title), summary: clean(it.contentSnippet || '').slice(0, 480), url: it.link || '', publishedAt: when(it.isoDate || it.pubDate), source: pub, sourceId: 'google_news', sourceQuery: query, category: 'search', kind: 'news' }
  })
}

async function fetchSec(c) {
  const url = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${c.cik}&type=&dateb=&owner=include&count=8&output=atom`
  const parsed = await parser.parseURL(url)
  return (parsed.items || []).slice(0, 6).map((it) => ({
    id: id((it.title || '') + (it.link || '')), title: `${c.name} — ${clean(it.title)}`, summary: `SEC filing by ${c.name} (${c.ticker}). ${clean(it.contentSnippet || it.summary || '').slice(0, 360)}`,
    url: it.link || '', publishedAt: when(it.isoDate || it.pubDate || it.updated), source: 'SEC EDGAR', sourceId: 'sec_edgar', category: 'filing', kind: 'filing', seedEntities: c.entityId ? [c.entityId] : [],
  }))
}

function dedupe(items) {
  const seen = new Set()
  return items.filter((it) => { const k = it.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 64); if (!k || seen.has(k)) return false; seen.add(k); return true })
}

/** Returns { items, errors, sourceCount }. */
export async function aggregate(sources) {
  const jobs = []; const labels = []
  for (const f of (sources.rssFeeds || []).filter((f) => f.enabled)) { jobs.push(fetchRss(f)); labels.push(f.name) }
  if (sources.googleNews?.enabled) for (const q of sources.googleNews.queries || []) { jobs.push(fetchGoogle(q)); labels.push(`Google: ${q}`) }
  if (sources.secFilings?.enabled) for (const c of (sources.secFilings.companies || []).filter((c) => c.cik)) { jobs.push(fetchSec(c)); labels.push(`SEC: ${c.ticker}`) }
  const results = await Promise.allSettled(jobs)
  const items = []; const errors = []
  results.forEach((r, i) => { if (r.status === 'fulfilled') items.push(...r.value); else errors.push({ source: labels[i], error: r.reason?.message || String(r.reason) }) })
  return { items: dedupe(items), errors, sourceCount: jobs.length }
}
