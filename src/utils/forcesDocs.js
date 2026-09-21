/**
 * forcesDocs.js — the Five Forces as a document on the shared block model: one overview, then each force with its
 * thesis, its activity, and the evidence behind it. Word, slides, Excel and text come from the existing renderers.
 *
 * The document reports what the classifier found and how. It says how many items were declined and why, it says
 * when a force has too little evidence to read a trend, and it carries the force limit: a tag is evidence of
 * something, not a forecast of it, and a count is not a size.
 */
import { FORCES, FORCE_BY_ID, DIRECTIONS, EXPOSURE_TYPES } from '../data/forces.js'
import { LIMITS } from '../data/limits.js'
import { forceActivity } from './forces.js'

/** Below this, a force's numbers describe a handful of items, not a trend. */
export const THIN_EVIDENCE = 5

const day = (d) => String(d || '').slice(0, 10)
const origin = (x) => (x.kind === 'deal' ? 'On record' : 'Live feed')

export function evidenceRows(items, forceId) {
  return items.map((x) => [
    day(x.date),
    origin(x),
    x.title,
    x.primary_force_id === forceId ? 'Direct' : 'Adjacent',
    DIRECTIONS[x.force_impact_direction] || '',
    x.primary_force_id === forceId ? x.force_confidence : x.secondary_confidence?.[forceId] || '',
    EXPOSURE_TYPES[x.exposure_type] || x.exposure_type,
    x.source_url,
  ])
}

/**
 * buildForcesBrief(tagged, { today, unclassified, filters, forces })
 * tagged: output of classifyAll().tagged (already filtered by the page if it is exporting a view).
 * forces: which forces get a section of their own — all five by default, or the ones the page has selected.
 */
export function buildForcesBrief(tagged, { today = new Date(), unclassified = [], filters = [], forces = FORCES.map((f) => f.id), generatedAt = new Date().toISOString(), coverageSince = null, archive = null } = {}) {
  const sections = []
  const add = (eyebrow, title, blocks) => { const b = blocks.filter(Boolean); if (b.length) sections.push({ eyebrow, title, blocks: b }) }
  const board = FORCES.map((f) => forceActivity(tagged, f.id, { today, feed: 12, coverageSince }))
  const win = (b, d) => `${b.complete[d] ? '' : '≥'}${b.trailing[d]}`
  const deals = tagged.filter((x) => x.kind === 'deal').length
  const reasons = unclassified.reduce((acc, x) => { const k = x.unclassified.split(' — ')[0]; acc[k] = (acc[k] || 0) + 1; return acc }, {})

  add('Method', 'How this was read', [
    { kind: 'paragraph', text: 'Every transaction on record and every item in the live feed at the time of export was read against five strategic forces. Each gets one primary force — the one most directly affected — and up to three secondary forces where the record gives a material, evidenced link. Tags come from the record itself: deal type and structure, the companies involved and where regional ones are based, and the words in the title and summary. Every tag keeps the evidence that produced it.' },
    { kind: 'facts', rows: [
      ['Items tagged', `${tagged.length} (${deals} on record, ${tagged.length - deals} from the live feed)`],
      ['Items declined', unclassified.length ? `${unclassified.length}: ${Object.entries(reasons).map(([k, v]) => `${v} ${k.replace(/\.$/, '').toLowerCase()}`).join('; ')}` : 'None'],
      ['Evidence archive', coverageSince ? `Market events recorded from ${coverageSince}${archive?.count ? ` (${archive.count} archived)` : ''}. Windows reaching back further hold every deal but only the events still in the live feed, and are marked ≥ as floors.` : 'Unavailable — events come from the live feed alone, which holds a few weeks. Every window that includes events is a floor (≥).'],
      ['Filters', filters.length ? filters.map((f) => `${f.label}: ${f.value}`).join(' · ') : 'None — everything on record and in the feed'],
      ['Captured', generatedAt.slice(0, 16).replace('T', ' ')],
    ] },
    { kind: 'note', text: `${LIMITS.force.claim} ${LIMITS.force.detail}` },
  ])

  add('Overview', 'The five forces at a glance', [
    { kind: 'table', columns: ['#', 'Force', 'Direct', 'Adjacent', 'Last 30 days', 'Last 90 days', 'Last 365 days', 'Supports', 'Challenges', 'Mixed', 'Neutral'],
      rows: board.map((b) => [String(b.force.number), b.force.short_title, String(b.direct), String(b.adjacent), win(b, 30), win(b, 90), win(b, 365), String(b.byDirection.supports || 0), String(b.byDirection.challenges || 0), String(b.byDirection.mixed || 0), String(b.byDirection.neutral || 0)]) },
    { kind: 'note', text: 'Direct counts events where the force is primary; adjacent counts events where it is secondary. Trailing windows count both, by event date. A transaction and a trade-press item each count once, whatever their size.' },
  ])

  // One table for the trend: weeks down, forces across, so it reads as a series in Excel and in print alike.
  const weeks = board[0].series
  add('Trend', 'Weekly activity, last 12 weeks', [
    { kind: 'table', columns: ['Week of', ...board.map((b) => `${b.force.number} ${b.force.short_title}`), 'Archived'],
      rows: weeks.map((w, i) => [w.start, ...board.map((b) => String(b.series[i].count)), w.covered ? 'yes' : 'no — deals only']) },
    { kind: 'note', text: 'Weeks marked "no" fall before the evidence archive began: they count deals on record but not the market events nobody was recording yet. Read them as incomplete, not as quiet.' },
  ])

  for (const id of forces) {
    const f = FORCE_BY_ID[id]
    const b = board.find((x) => x.force.id === id)
    add(`Force ${f.number}`, f.title, [
      { kind: 'paragraph', text: `Thesis. ${f.thesis}` },
      { kind: 'paragraph', text: f.summary },
      { kind: 'stats', items: [
        { label: 'Direct', value: String(b.direct) },
        { label: 'Adjacent', value: String(b.adjacent) },
        { label: 'Last 90 days', value: String(b.trailing[90]) },
        { label: 'Last 365 days', value: String(b.trailing[365]) },
      ] },
      b.total < THIN_EVIDENCE ? { kind: 'note', text: `Only ${b.total} item${b.total === 1 ? '' : 's'} tie${b.total === 1 ? 's' : ''} to this force. That is too few to read a trend — treat these as individual signals.` } : null,
      b.feed.length
        ? { kind: 'table', columns: ['Date', 'Source', 'Event', 'Relationship', 'Direction', 'Confidence', 'Exposure', 'Link'], rows: evidenceRows(b.feed, id) }
        : { kind: 'note', text: 'No event in this view ties to this force.' },
      { kind: 'bullets', items: f.industry_force.map((x) => `Force: ${x}`) },
      { kind: 'bullets', items: f.implications.map((x) => `Implication: ${x}`) },
      { kind: 'bullets', items: f.market_opportunities.map((x) => `Opportunity: ${x}`) },
    ])
  }

  sections.forEach((s, i) => { s.num = i + 1 })
  return {
    kind: 'forces',
    entity: null,
    mode: 'forces',
    modeLabel: 'Five Forces',
    title: 'Music Market Five Forces',
    subtitle: forces.length === FORCES.length ? 'All five forces' : forces.map((id) => FORCE_BY_ID[id].short_title).join(' · '),
    slug: forces.length === FORCES.length ? 'five-forces' : `five-forces-${forces.join('-').replace(/_/g, '-')}`,
    generatedAt,
    asOf: day(generatedAt),
    sections,
    citations: { items: [], source: 'empty' },
  }
}
