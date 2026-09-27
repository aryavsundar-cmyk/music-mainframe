/**
 * changes.js — what changed since you last looked, across everything the app already watches.
 *
 * Four records already arrive on their own: SEC filings (every six hours), figures that move when a filing lands
 * (the daily refresh writes the log), news (the archive, daily), and the curated record of deals and milestones.
 * This turns them into one feed for a chosen window and a chosen set of companies.
 *
 * The honesty problem here is COVERAGE, not classification. An empty feed can mean nothing happened, or that
 * nothing was being watched yet: the archive only began on its own start date, the figure log began on its own,
 * and EDGAR's index holds a limited window. So a window is always reported with what could have been seen in it,
 * and a window reaching back before a source began says so rather than showing silence.
 */
import { getEntity } from '../data/entities.js'
import { TRANSACTIONS } from '../data/transactions.js'
import { MILESTONES } from '../data/milestones.js'
import { CONCEPTS } from './financialConcepts.js'
import { formatDate, format, currencySymbol } from './format.js'

/** The kinds of change, in the order a reader cares about them when two land on the same day. */
export const KINDS = {
  figure: { id: 'figure', label: 'Figures', rank: 0, hint: 'A reported figure moved when a filing landed.' },
  deal: { id: 'deal', label: 'Deals', rank: 1, hint: 'A transaction on record, by the date it was announced.' },
  filing: { id: 'filing', label: 'Filings', rank: 2, hint: 'A company filed with the SEC.' },
  milestone: { id: 'milestone', label: 'Milestones', rank: 3, hint: 'A sourced market event on the record.' },
  news: { id: 'news', label: 'News', rank: 4, hint: 'A story in the archive naming the company.' },
}
export const KIND_LIST = Object.values(KINDS).sort((a, b) => a.rank - b.rank)

export const WINDOWS = [
  { id: '1', label: 'Last 24 hours', days: 1 },
  { id: '7', label: 'Last 7 days', days: 7 },
  { id: '30', label: 'Last 30 days', days: 30 },
  { id: '90', label: 'Last quarter', days: 90 },
]
export const DEFAULT_WINDOW = '7'
/**
 * News is off unless asked for. The feed is for changes to the RECORD — a filing, a figure, a deal — and the
 * archive adds hundreds of stories a week that would bury them. The chip carries its count, so it is one click,
 * and /news is the page for reading the coverage itself.
 */
export const DEFAULT_KINDS = ['figure', 'deal', 'filing', 'milestone']
/** However many stories a day holds, only this many reach the feed; the rest are counted, not listed. */
export const NEWS_PER_DAY = 6

const day = (v) => String(v || '').slice(0, 10)
const iso = (d) => new Date(d).toISOString().slice(0, 10)
/** The first day of a window ending today, as YYYY-MM-DD. */
export const windowStart = (days, today = new Date()) => iso(new Date(today).getTime() - (days - 1) * 86400000)

/** Material SEC forms plus the periodic reports — the same rule the company page uses. */
const PERIODIC = /^(10-K|10-Q|20-F|40-F)/
export const leadsFiling = (f) => f.weight >= 5 || PERIODIC.test(f.form)

const money = (f) => (f?.value == null ? '—' : format.money(f.value, { currency: currencySymbol(f.currency), digits: Math.abs(f.value) >= 1e9 ? 2 : 1 }))

/** "Revenue, quarter to 30 Jun 2026" — what moved, in the reader's words rather than the tag's. */
const slotLabel = { annual: 'year', quarter: 'quarter', latest: 'balance' }
function figureTitle(c) {
  const label = CONCEPTS[c.metric]?.label || c.metric
  const period = c.slot === 'latest' ? `at ${formatDate(c.to.end)}` : `${slotLabel[c.slot] || c.slot} to ${formatDate(c.to.end)}`
  return c.kind === 'restated'
    ? `${label} restated for the ${period}: ${money(c.from)} → ${money(c.to)}`
    : `${label}, ${period}: ${money(c.to)}`
}

/**
 * One feed. Every source is optional — a page that cannot reach the filings service still shows the rest, and
 * `coverage` says which sources answered.
 */
export function collectChanges({
  since,
  until = iso(new Date()),
  ids = null,
  filings = [],
  figures = [],
  news = [],
  deals = TRANSACTIONS,
  milestones = MILESTONES,
  kinds = null,
  newsPerDay = NEWS_PER_DAY,
} = {}) {
  const from = day(since)
  const to = day(until)
  const inWindow = (d) => !!d && day(d) >= from && day(d) <= to
  const watched = ids && ids.length ? new Set(ids) : null
  const named = (id) => !watched || watched.has(id)
  const name = (id) => getEntity(id)?.name || id
  const out = []

  for (const c of figures) {
    if (!inWindow(c.at) || !named(c.entityId)) continue
    out.push({
      id: `figure:${c.entityId}:${c.metric}:${c.slot}:${c.to.end}:${c.to.filed}`,
      kind: 'figure', at: day(c.at), entityId: c.entityId, entityName: name(c.entityId),
      title: figureTitle(c), detail: `${c.to.form} filed ${formatDate(c.to.filed)}`, url: c.to.accn ? `/entities/${c.entityId}` : '', weight: c.kind === 'restated' ? 9 : 8,
    })
  }

  for (const d of deals) {
    if (!inWindow(d.date)) continue
    const parties = [...(d.acquirers || []), ...(d.sellers || [])].map((p) => p.entityId).filter(Boolean)
    if (watched && !parties.some((p) => watched.has(p))) continue
    out.push({
      id: `deal:${d.id}`, kind: 'deal', at: day(d.date),
      entityId: parties.find((p) => named(p)) || parties[0] || '', entityName: parties.filter(named).map(name).join(' · ') || 'Market',
      title: d.title, detail: [d.value ? format.money(d.value, { currency: currencySymbol(d.currency) }) : '', d.type].filter(Boolean).join(' · '),
      url: `/deals#${d.id}`, weight: 10,
    })
  }

  for (const f of filings) {
    if (!inWindow(f.filed) || !named(f.entityId) || !leadsFiling(f)) continue
    out.push({
      id: `filing:${f.id}`, kind: 'filing', at: day(f.filed), entityId: f.entityId, entityName: f.company || name(f.entityId),
      title: `${f.form} — ${f.formLabel && f.formLabel !== f.form ? f.formLabel : f.note}`, detail: f.period && day(f.period) !== day(f.filed) ? `period ${formatDate(day(f.period))}` : '',
      url: f.url, weight: f.weight || 5,
    })
  }

  for (const m of milestones) {
    if (!inWindow(m.date)) continue
    if (watched && !(m.entities || []).some((id) => watched.has(id))) continue
    out.push({
      id: `milestone:${m.id}`, kind: 'milestone', at: day(m.date), entityId: (m.entities || []).find(named) || '',
      entityName: (m.entities || []).filter(named).map(name).join(' · ') || 'Market',
      title: m.title, detail: m.summary || '', url: m.sources?.[0]?.url || '', weight: 7,
    })
  }

  for (const n of news) {
    const at = day(n.publishedAt)
    if (!inWindow(at)) continue
    const hit = (n.entities || []).filter((id) => named(id))
    if (watched && hit.length === 0) continue
    out.push({
      id: `news:${n.id}`, kind: 'news', at, entityId: hit[0] || '', entityName: hit.map(name).join(' · ') || (n.source || 'Trade press'),
      title: n.title, detail: n.source || '', url: n.url || n.source_url || '', weight: 3,
    })
  }

  const wanted = kinds && kinds.length ? new Set(kinds) : null
  const sorted = out
    .filter((c) => !wanted || wanted.has(c.kind))
    .sort((a, b) => b.at.localeCompare(a.at) || KINDS[a.kind].rank - KINDS[b.kind].rank || b.weight - a.weight || a.title.localeCompare(b.title))
  // Cap the stories per day, and count what that leaves out rather than dropping it silently.
  const perDay = new Map()
  const items = []
  let newsHidden = 0
  for (const c of sorted) {
    if (c.kind !== 'news') { items.push(c); continue }
    const seen = perDay.get(c.at) || 0
    if (seen >= newsPerDay) { newsHidden++; continue }
    perDay.set(c.at, seen + 1)
    items.push(c)
  }
  return { items, from, to, newsHidden }
}

/** The feed grouped into days, newest first — how it is read. */
export function byDay(items) {
  const days = new Map()
  for (const c of items) {
    if (!days.has(c.at)) days.set(c.at, [])
    days.get(c.at).push(c)
  }
  return [...days.entries()].map(([date, list]) => ({ date, items: list }))
}

/** A count per kind, for the filter chips: a chip that would show nothing says zero rather than lying. */
export function countByKind(items) {
  return Object.fromEntries(KIND_LIST.map((k) => [k.id, items.filter((c) => c.kind === k.id).length]))
}

/**
 * What the window could have shown. Each source states the first day it holds; a window that starts earlier is
 * partial, and the page says which part was not being watched.
 */
export function coverageOf({ from, archiveSince, figuresSince, filingsSince, kinds = null, today = iso(new Date()) }) {
  const gaps = []
  // A source that is switched off has no coverage problem worth stating: a company strip with news off was warning
  // that the archive starts late, which reads as a gap in what is on screen when nothing from it was on screen.
  const on = (kind) => !kinds || kinds.includes(kind)
  const mark = (kind, label, start, note) => {
    if (!on(kind)) return
    if (!start) { gaps.push(`${label}: not reachable, so nothing from it is in this feed.`); return }
    if (day(start) > day(from)) gaps.push(`${label} ${note} ${formatDate(day(start))}${day(start) > today ? '' : ''}, so anything earlier in this window is not shown.`)
  }
  mark('news', 'The news archive', archiveSince, 'only holds stories from')
  mark('figure', 'The figure log', figuresSince, 'has been recording changes since')
  if (on('filing') && filingsSince && day(filingsSince) > day(from)) gaps.push(`SEC filings are read from EDGAR's recent index, which here reaches back to ${formatDate(day(filingsSince))}.`)
  return { complete: gaps.length === 0, gaps }
}
