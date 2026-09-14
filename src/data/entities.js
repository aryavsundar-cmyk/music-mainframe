/**
 * entities.js — ONE flat table of every actor on the canvas, plus helpers.
 *
 * Source rows live in ./entities/*.js (one file per brief §4 section) and are merged here.
 * Every record is normalised to typed defaults (empty string / array / object — never null / undefined)
 * so detail pages render "—" naturally instead of crashing.
 */
import { SECTIONS } from './entities/index.js'
import { ENTITY_TYPES, TIERS, OWNERSHIP, LENS_TONE, AS_OF } from './entities/_schema.js'

export { ENTITY_TYPES, TIERS, OWNERSHIP, LENS_TONE, AS_OF }

const DEFAULTS = {
  short: '', type: 'label', roles: [], tier: 3, subtype: '', status: 'active',
  hq: '', founded: null, ownership: 'private', ticker: '', parentId: '', backers: [], region: '',
  metrics: {}, summary: '', notes: [], sources: [], verify: false, asOf: AS_OF,
}

function normalise(row, section) {
  const e = { ...DEFAULTS, ...row, section }
  if (!e.roles.includes(e.type)) e.roles = [e.type, ...e.roles]
  e.metrics = { ...e.metrics }
  e.searchText = [e.name, e.short, e.subtype, e.hq, e.region, e.ticker, e.summary, ...(e.notes || [])].join(' ').toLowerCase()
  return e
}

export const ENTITIES = SECTIONS.flatMap((s) => s.rows.map((r) => normalise(r, s.key)))

const BY_ID = new Map(ENTITIES.map((e) => [e.id, e]))

/** Duplicate-id guard at module load — fails loudly in dev instead of silently shadowing. */
if (BY_ID.size !== ENTITIES.length) {
  const seen = new Set(); const dupes = ENTITIES.map((e) => e.id).filter((id) => seen.has(id) || !seen.add(id))
  throw new Error(`entities.js: duplicate ids → ${dupes.join(', ')}`)
}

export const getEntity = (id) => BY_ID.get(id) || null

/** Typed-default profile — the "autogenerator" fallback. Never returns null for a known shape. */
export function getEntityProfile(id) {
  return getEntity(id) || { ...DEFAULTS, id, name: id, roles: [DEFAULTS.type], section: '', searchText: '', missing: true }
}

export const getChildren = (id) => ENTITIES.filter((e) => e.parentId === id)

/** Walk parentId up to the root (guards against cycles). */
export function getParentChain(id) {
  const chain = []; const seen = new Set([id])
  let cur = getEntity(id)
  while (cur && cur.parentId && !seen.has(cur.parentId)) {
    const p = getEntity(cur.parentId); if (!p) break
    chain.push(p); seen.add(p.id); cur = p
  }
  return chain
}

export const getBackers = (id) => (getEntity(id)?.backers || []).map((b) => getEntity(b) || { id: b, name: b, missing: true })
export const getBackedBy = (id) => ENTITIES.filter((e) => e.backers.includes(id))

export const entitiesByType = (type) => ENTITIES.filter((e) => e.type === type)
export const entitiesWithRole = (role) => ENTITIES.filter((e) => e.roles.includes(role))

/** Entities that can be a parent facet: anything with at least one child. */
export const PARENTS = ENTITIES.filter((e) => getChildren(e.id).length > 0).sort((a, b) => a.name.localeCompare(b.name))

export const TYPE_ORDER = Object.entries(ENTITY_TYPES).sort((a, b) => a[1].order - b[1].order).map(([k]) => k)

/**
 * filterEntities({ q, type, tier, ownership, parent, role, verify }) — all optional, AND-ed.
 * Sorted by type order, then tier, then name.
 */
export function filterEntities({ q = '', type = '', tier = '', ownership = '', parent = '', role = '', verify = '' } = {}) {
  const needle = q.trim().toLowerCase()
  return ENTITIES.filter((e) =>
    (!needle || e.searchText.includes(needle)) &&
    (!type || e.type === type) &&
    (!tier || String(e.tier) === String(tier)) &&
    (!ownership || e.ownership === ownership) &&
    (!parent || e.parentId === parent || e.id === parent) &&
    (!role || e.roles.includes(role)) &&
    (!verify || e.verify),
  ).sort((a, b) =>
    TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || a.tier - b.tier || a.name.localeCompare(b.name))
}

export const COUNTS = {
  total: ENTITIES.length,
  byType: Object.fromEntries(TYPE_ORDER.map((t) => [t, entitiesByType(t).length])),
  verify: ENTITIES.filter((e) => e.verify).length,
  public: ENTITIES.filter((e) => e.ownership === 'public').length,
}

/** Primary metric to show in a list row, by type. Returns { kind, value, label } or null. */
export function headlineMetric(e) {
  const m = e.metrics
  if (m.revenue) return { kind: 'money', value: m.revenue, label: `Revenue ${m.revenueYear || ''}`.trim(), currency: m.revenueCurrency }
  if (m.aum) return { kind: 'money', value: m.aum, label: 'AUM' }
  if (m.subscribers) return { kind: 'count', value: m.subscribers, label: 'Subscribers' }
  if (m.catalogSize) return { kind: 'count', value: m.catalogSize, label: 'Catalog (songs)' }
  return null
}
