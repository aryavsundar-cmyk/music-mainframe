/**
 * entityMap.js — every entity on the canvas, placed in the music industry's value chain.
 *
 * Eight columns, ordered the way ownership runs: capital at the top, then the rights it buys, the organisations
 * that collect on and administer those rights, the companies that distribute and market the music, the
 * platforms and live businesses where fans pay, and the technology around all of it. "Fan-up" reverses the order
 * to follow the money instead: fans pay platforms and promoters, and it flows back up to rights owners and the
 * capital behind them.
 *
 * Column headers carry a market figure only where one is sourced on record (IFPI, CISAC, MIDiA, the deals
 * table); elsewhere they carry a count. Every entity is placed in exactly one column, by its type — the test
 * holds that to all 188.
 */
import { ENTITIES, getEntity, getChildren, getBackedBy } from '../data/entities.js'
import { ENTITY_TYPES, TIERS } from '../data/entities/_schema.js'
import { TRANSACTIONS, TX_TOTALS, ABS_MARKET } from '../data/transactions.js'
import { MARKET } from '../data/fundamentals.js'
import { GLOBAL_COLLECTIONS } from '../data/pros.js'

/** The value chain. `types` place entities; `market` is a sourced figure for the header, or null. */
export const COLUMNS = [
  { id: 'capital', title: 'Capital & investors', lens: 'money', types: ['pe-fund', 'catalog-fund', 'debt-investor', 'strategic'],
    blurb: 'Sponsors, catalog funds, credit and securitisation investors, and the strategic holders who own the majors.',
    market: { value: TX_TOTALS.disclosed, currency: 'USD', label: 'disclosed deal value on record', source: 'Deals table' } },
  { id: 'recorded', title: 'Recorded music', lens: 'recording', types: ['label'],
    blurb: 'Labels and label groups that own and exploit master recordings.',
    market: { value: MARKET.ifpi.recordedRevenue, currency: 'USD', label: `global recorded-music revenue ${MARKET.ifpi.year} · +${MARKET.ifpi.growth}%`, source: 'IFPI Global Music Report', url: MARKET.ifpi.source?.url } },
  { id: 'publishing', title: 'Publishing & sync', lens: 'publishing', types: ['publisher', 'sync'],
    blurb: 'Music publishers, administrators and sync specialists that own and license songs.',
    market: null },
  { id: 'collection', title: 'Collection & rights data', lens: 'publishing', types: ['pro', 'data', 'trade'],
    blurb: 'Collecting societies, rights registries and data services — where royalties are matched and paid.',
    market: { value: GLOBAL_COLLECTIONS.music, currency: GLOBAL_COLLECTIONS.currency, label: `music collections ${GLOBAL_COLLECTIONS.year} · +${GLOBAL_COLLECTIONS.musicGrowth}%`, source: 'CISAC Global Collections Report', url: GLOBAL_COLLECTIONS.source?.url } },
  { id: 'distribution', title: 'Distribution & artist services', lens: 'recording', types: ['distributor', 'artist-services'],
    blurb: 'Distributors and services companies that deliver releases to platforms and handle marketing and royalties.',
    market: null },
  { id: 'platforms', title: 'Streaming & platforms', lens: 'structure', types: ['dsp'],
    blurb: 'Streaming services, video and social platforms where listeners pay or advertisers fund.',
    market: { value: MARKET.ifpi.streamingRevenue, currency: 'USD', label: `streaming revenue ${MARKET.ifpi.year} · ${MARKET.ifpi.streamingShare}% of recorded`, source: 'IFPI Global Music Report', url: MARKET.ifpi.source?.url } },
  { id: 'live', title: 'Live & fan', lens: 'structure', types: ['live'],
    blurb: 'Promoters, ticketing, venues and festivals — the scarce, premium inventory of live music.',
    market: null },
  { id: 'tech', title: 'Music tech & AI', lens: 'structure', types: ['music-tech'],
    blurb: 'Fan platforms, discovery tools and generative AI companies building on and around the rights.',
    market: null },
]

export const DIRECTIONS = {
  down: { label: 'Capital-down', flow: 'Who owns what: capital → rights → collection → distribution → platforms → fans' },
  up: { label: 'Fan-up', flow: 'Where the money comes from: fans → platforms → distribution → collection → rights → capital' },
}

/** Headline market figures for the strip above the map, each with its source. */
export const MARKET_STRIP = [
  { label: `Recorded music ${MARKET.ifpi.year}`, value: MARKET.ifpi.recordedRevenue, currency: 'USD', delta: `+${MARKET.ifpi.growth}%`, source: 'IFPI', url: MARKET.ifpi.source?.url },
  { label: 'Streaming', value: MARKET.ifpi.streamingRevenue, currency: 'USD', delta: `${MARKET.ifpi.streamingShare}% share`, source: 'IFPI', url: MARKET.ifpi.source?.url },
  { label: 'Paid subscription users', count: MARKET.ifpi.paidUsers, delta: `+${MARKET.ifpi.subscriptionGrowth}%`, source: 'IFPI', url: MARKET.ifpi.source?.url },
  { label: `Music collections ${GLOBAL_COLLECTIONS.year}`, value: GLOBAL_COLLECTIONS.music, currency: GLOBAL_COLLECTIONS.currency, delta: `+${GLOBAL_COLLECTIONS.musicGrowth}%`, source: 'CISAC', url: GLOBAL_COLLECTIONS.source?.url },
  { label: 'Royalty ABS rated since 2020', value: ABS_MARKET.ratedSince2020, currency: 'USD', delta: `${ABS_MARKET.issuers} issuers`, source: 'KBRA', url: ABS_MARKET.source?.url },
]

const COLUMN_OF = Object.fromEntries(COLUMNS.flatMap((c) => c.types.map((t) => [t, c.id])))
export const columnOf = (e) => COLUMN_OF[e.type] || null

const STOP = new Set(['the', 'of', 'and', '&', 'for', 'de', 'la'])
/** Two-letter mark for a card: the first letters of the name's first two words ("Live Nation" → LN, not "LY"). */
export function initials(e) {
  const words = e.name.replace(/[^A-Za-z0-9& ]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w.toLowerCase()))
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase()
  if (e.short && e.short.length <= 3) return e.short.toUpperCase()
  return (words[0] || e.name).slice(0, 2).toUpperCase()
}

/** Tier names: the labels' own vocabulary in the recorded-music column, plain words everywhere else. */
const GENERIC_TIERS = { 1: 'Global', 2: 'Regional & specialist', 3: 'Niche' }
const tierLabel = (t, columnId) => (columnId === 'recorded' ? (TIERS[t] || `Tier ${t}`).replace(/^Tier \d · /, '').replace(/^./, (c) => c.toUpperCase()) : GENERIC_TIERS[t] || `Tier ${t}`)

/**
 * Filters: search (name, short name, ticker, subtype, HQ), columns, tiers, ownership. Empty values match all.
 * Returns the entities that pass, in canvas order.
 */
export function filterEntitiesForMap(entities = ENTITIES, { q = '', columns = [], tiers = [], ownership = [] } = {}) {
  const needle = String(q).trim().toLowerCase()
  return entities.filter((e) => {
    if (needle && !`${e.name} ${e.short || ''} ${e.ticker || ''} ${e.subtype || ''} ${e.hq || ''}`.toLowerCase().includes(needle)) return false
    if (columns.length && !columns.includes(columnOf(e))) return false
    if (tiers.length && !tiers.includes(String(e.tier))) return false
    if (ownership.length && !ownership.includes(e.ownership)) return false
    return true
  })
}

/**
 * The map: columns in the chosen direction, each with its groups and cards. Multi-type columns group by type;
 * single-type columns group by tier. Within a group: tier, then name — sizes in different currencies are not
 * ranked against each other.
 */
export function buildMap(entities = ENTITIES, { direction = 'down' } = {}) {
  const cols = direction === 'up' ? [...COLUMNS].reverse() : COLUMNS
  return cols.map((c) => {
    const members = entities.filter((e) => c.types.includes(e.type)).sort((a, b) => (a.tier - b.tier) || a.name.localeCompare(b.name))
    const groups = c.types.length > 1
      ? c.types.map((t) => ({ id: t, label: ENTITY_TYPES[t]?.label || t, items: members.filter((e) => e.type === t) }))
      : [1, 2, 3].map((t) => ({ id: `tier-${t}`, label: tierLabel(t, c.id), items: members.filter((e) => Number(e.tier) === t) }))
    return { ...c, count: members.length, groups: groups.filter((g) => g.items.length) }
  })
}

/**
 * Who each entity is connected to, on the record: its parent and children, the funds that back it and the
 * companies it backs, and its counterparties in the deals table. Undirected, and every id is a real entity.
 */
let GRAPH = null
export function connections() {
  if (GRAPH) return GRAPH
  const g = new Map(ENTITIES.map((e) => [e.id, new Map()]))
  const link = (a, b, why) => {
    if (!a || !b || a === b || !g.has(a) || !g.has(b)) return
    if (!g.get(a).has(b)) g.get(a).set(b, new Set())
    if (!g.get(b).has(a)) g.get(b).set(a, new Set())
    g.get(a).get(b).add(why); g.get(b).get(a).add(why)
  }
  for (const e of ENTITIES) {
    if (e.parentId) link(e.id, e.parentId, 'ownership')
    for (const b of e.backers || []) link(e.id, b, 'backer')
  }
  for (const t of TRANSACTIONS) {
    const ids = [...(t.acquirers || []), ...(t.sellers || [])].map((p) => p.entityId).filter(Boolean)
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) link(ids[i], ids[j], 'deal')
  }
  GRAPH = g
  return g
}

/** One entity's connections, labelled: [{ entity, reasons: ['ownership' | 'backer' | 'deal'] }], strongest first. */
export function connectionsOf(id) {
  const m = connections().get(id)
  if (!m) return []
  const rank = (r) => (r.has('ownership') ? 0 : r.has('backer') ? 1 : 2)
  return [...m.entries()].map(([other, reasons]) => ({ entity: getEntity(other), reasons: [...reasons] })).sort((a, b) => rank(new Set(a.reasons)) - rank(new Set(b.reasons)) || a.entity.name.localeCompare(b.entity.name))
}

/** Deals on record an entity took part in, newest first. */
export const dealsOf = (id) => TRANSACTIONS.filter((t) => [...(t.acquirers || []), ...(t.sellers || [])].some((p) => p.entityId === id))

export { getChildren, getBackedBy }
