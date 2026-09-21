/**
 * pageDocs.js — export what is on screen, exactly as it is on screen.
 *
 * Every page in the app is a filtered, sorted view of records. This turns one of those views into a document on
 * the shared block model, so the existing renderers produce Word, slides, Excel and text with no new code.
 *
 * The rule that shapes everything here: a document must not misrepresent the view it came from. So the first
 * section always states which filters were applied, how the rows were sorted, and how many of the total are
 * present. A filtered export that looked like a complete table would be worse than no export at all — someone
 * reads "61 transactions" and believes it is the whole market.
 *
 * Rows arrive already filtered and ordered by the page. This module never re-filters or re-sorts: the screen is
 * the source of truth, and a second implementation of the same filter would eventually disagree with it.
 */
import { LIMITS } from '../data/limits.js'

/** A document is a document, not a database dump. Beyond this the file stops being useful and starts being a CSV. */
export const MAX_TABLE_ROWS = 400

const clean = (v) => (v === null || v === undefined ? '' : String(v))

/**
 * Turn raw filter state into something a reader understands: [{ label, value }] for the filters actually set.
 * `defs` maps each key to a label and an optional formatter, so "tier=a" prints as "Tier · A-list".
 */
export function describeFilters(params = {}, defs = {}) {
  return Object.entries(params)
    .filter(([, v]) => v !== '' && v !== null && v !== undefined && v !== false)
    .map(([key, value]) => {
      const def = defs[key] || {}
      const label = def.label || key.replace(/^\w/, (c) => c.toUpperCase())
      const shown = typeof def.format === 'function' ? def.format(value) : value
      return { label, value: clean(shown) }
    })
    .filter((f) => f.value)
}

/**
 * One sentence naming the filters behind a view, for the documents that build their own narrative rather than
 * a plain table (the catalog scan, the buyer shortlist, the call sheet). Same words, same place, every export.
 */
export function filterSentence(filters, { shown, total } = {}) {
  const scope = filters.length ? `Filtered view — ${filters.map((f) => `${f.label}: ${f.value}`).join(' · ')}` : 'Unfiltered'
  const counted = shown != null && total != null && shown !== total ? `, ${shown} of ${total} records` : ''
  return `${scope}${counted}`
}

/** The sentence a reader needs before they trust a number in this file. */
function viewNote({ shown, total, capped }) {
  const parts = []
  if (shown < total) parts.push(`This is the filtered view: ${shown} of ${total} records match. It is not the full table.`)
  if (capped) parts.push(`The table stops at ${MAX_TABLE_ROWS} rows. Narrow the filters, or use the Excel export, to work with the rest.`)
  return parts.join(' ')
}

/**
 * buildPageDoc — one view of one page as a block-model document.
 *
 * title/eyebrow/lede mirror the page's own header, so the file reads like the screen it came from.
 * filters: [{label, value}] from describeFilters. sort: a human phrase. stats: the page's summary tiles.
 * columns/rows: the visible table, rows in display order. limits: ids from data/limits.js for score pages.
 */
export function buildPageDoc({
  slug,
  title,
  eyebrow = '',
  lede = '',
  filters = [],
  sort = '',
  stats = [],
  columns = [],
  rows = [],
  total = rows.length,
  tableTitle = '',
  notes = [],
  extra = [],
  limits = [],
  citations = { items: [], source: 'empty' },
  asOf = '',
  generatedAt = new Date().toISOString(),
} = {}) {
  const shown = rows.length
  const capped = shown > MAX_TABLE_ROWS
  const body = capped ? rows.slice(0, MAX_TABLE_ROWS) : rows
  const sections = []
  const add = (eye, ttl, blocks) => { const b = blocks.filter(Boolean); if (b.length) sections.push({ eyebrow: eye, title: ttl, blocks: b }) }

  const caveat = viewNote({ shown, total, capped })
  add('Export · what this is', 'The view this document came from', [
    lede ? { kind: 'paragraph', text: lede } : null,
    {
      kind: 'facts',
      rows: [
        ['Page', title],
        ['Filters', filters.length ? filters.map((f) => `${f.label}: ${f.value}`).join(' · ') : 'None — the full table as the page loads it'],
        sort ? ['Sorted by', sort] : null,
        ['Records', shown === total ? `${total}` : `${shown} of ${total}`],
        ['Captured', generatedAt.slice(0, 16).replace('T', ' ')],
        asOf ? ['Records as of', asOf] : null,
      ].filter(Boolean),
    },
    caveat ? { kind: 'note', text: caveat } : null,
  ])

  if (stats.length) add('Summary', 'What this view adds up to', [{ kind: 'stats', items: stats.map((s) => ({ label: s.label, value: clean(s.value) })) }])

  add('Records', tableTitle || title, [
    body.length
      ? { kind: 'table', columns, rows: body.map((r) => r.map(clean)) }
      : { kind: 'note', text: 'No records match these filters. The filters are listed above, so this file records an empty result rather than an empty page.' },
  ])

  // Further views of the same page (the Deals page's market events, say), each already built as blocks.
  for (const s of extra) add(s.eyebrow, s.title, s.blocks)

  const noteBlocks = [
    ...notes.map((text) => ({ kind: 'note', text })),
    ...limits.map((id) => LIMITS[id]).filter(Boolean).map((l) => ({ kind: 'note', text: `${l.claim} ${l.detail}` })),
  ]
  if (noteBlocks.length) add('Notes', 'What these numbers do and do not mean', noteBlocks)

  sections.forEach((s, i) => { s.num = i + 1 })
  return {
    kind: 'view',
    entity: null,
    mode: 'view',
    modeLabel: 'Page export',
    title,
    subtitle: [eyebrow, filters.map((f) => `${f.label}: ${f.value}`).join(' · ')].filter(Boolean).join(' — '),
    slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    generatedAt,
    asOf,
    sections,
    citations,
  }
}
