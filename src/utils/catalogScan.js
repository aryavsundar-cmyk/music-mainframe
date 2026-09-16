/**
 * catalogScan.js — the demand-side view: which catalogs exist, who holds them, and which could come to market.
 * Pure functions, Node-testable (scripts/test-market.mjs).
 *
 * Holdings are derived from the transaction record (who bought what, when, for how much) and from entity-level
 * catalog metrics — every row traces to a sourced record. Nothing about a holding is invented: genre tags come from
 * words that actually appear in the sourced text, and "availability" is an explainable score, never a claim that an
 * asset is for sale. Live news adds sale-intent signals from the feed the app already ingests.
 */
import { ENTITIES, getEntity } from '../data/entities.js'
import { TRANSACTIONS, partyName } from '../data/transactions.js'

const monthsBetween = (a, b) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
const parseDate = (s) => { if (!s) return null; const d = new Date(`${String(s).length === 7 ? `${s}-01` : s}T00:00:00Z`); return Number.isNaN(+d) ? null : d }
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
export const TODAY = () => new Date()

/** Genre and character tags, matched on words that appear in the sourced text. The matched phrase is kept. */
export const GENRE_PATTERNS = [
  ['country', /\bcountry\b|\bnashville\b/i], ['latin', /\blatin\b|\breggaeton\b|\bregional mexican\b/i],
  ['hip-hop', /\bhip[- ]?hop\b|\brap\b|\btrap\b/i], ['rock', /\brock\b|\bmetal\b|\bpunk\b|\bgrunge\b/i],
  ['pop', /\bpop\b/i], ['r&b', /\br&b\b|\bsoul\b|\bmotown\b/i], ['electronic', /\belectronic\b|\bdance\b|\bedm\b|\bhouse\b/i],
  ['classical', /\bclassical\b|\bopera\b|\borchestr/i], ['jazz', /\bjazz\b|\bblues\b/i], ['film-tv', /\bfilm\b|\bscore\b|\bsoundtrack\b|\bsync\b/i],
  ['gospel', /\bgospel\b|\bchristian\b/i], ['k-pop', /\bk-?pop\b|\bkorean\b/i], ['afrobeats', /\bafrobeat|\bafropop\b/i],
  ['estate', /\bestate\b|\bheirs\b|\bposthumous\b/i], ['evergreen', /\bevergreen\b|\bclassic\b|\biconic\b|\blegendary\b/i],
]
export function genreTags(text = '') {
  const out = []
  for (const [tag, re] of GENRE_PATTERNS) { const m = String(text).match(re); if (m) out.push({ tag, matched: m[0] }) }
  return out
}

/** Phrases in the live feed that indicate a process is under way. Matched against news for the holder. */
export const SALE_INTENT = [
  ['process', /\bexplor(?:e|es|ed|ing) (?:a |the )?sale\b|\bstrategic review\b|\bput up for sale\b|\bup for sale\b|\bauction\b|\bseeking (?:a )?buyers?\b|\bweighs a sale\b|\bconsidering a sale\b|\bhires? (?:an )?adviser\b|\bhired .{0,20}adviser\b|\bsale process\b/i],
  ['stake', /\bstake sale\b|\bminority stake\b|\bsell(?:ing)? a stake\b/i],
  ['pressure', /\bwrite[- ]down\b|\bimpairment\b|\bdebt restructuring\b|\bcovenant\b/i],
  ['succession', /\bestate\b|\bheirs\b|\bdied\b|\bdeath of\b|\bsuccession\b/i],
]
export function saleIntent(items = []) {
  const hits = []
  for (const it of items) {
    const text = `${it.title || ''} ${it.summary || ''}`
    for (const [kind, re] of SALE_INTENT) { const m = text.match(re); if (m) { hits.push({ kind, matched: m[0], title: it.title, url: it.url, date: String(it.publishedAt || '').slice(0, 10) }); break } }
  }
  return hits
}

const OWNER_KIND = (e) => {
  if (!e) return 'other'
  if (e.roles?.includes('pe-fund')) return 'sponsor'
  if (e.roles?.includes('catalog-fund') || e.type === 'catalog-fund') return 'fund'
  if (e.type === 'label' || e.type === 'publisher' || e.type === 'strategic') return 'strategic'
  return 'other'
}
/** How ready each kind of owner usually is to sell, and the hold period at which a sale becomes likely. */
export const OWNER_BEHAVIOUR = {
  sponsor: { label: 'Private equity sponsor', peak: [4, 8], base: 18, note: 'Funds have a defined life; most assets turn over between years four and eight.' },
  fund: { label: 'Catalog fund / royalty platform', peak: [5, 10], base: 14, note: 'Platforms recycle capital through sales, continuation vehicles or securitisation.' },
  strategic: { label: 'Strategic owner', peak: [10, 25], base: 4, note: 'Majors and publishers rarely sell what they buy; they divest for regulatory or portfolio reasons.' },
  other: { label: 'Other holder', peak: [5, 12], base: 8, note: 'Estates, artists and private holders sell on their own timetable.' },
}

/**
 * holdings() — one row per acquisition on record, from the acquirer's side, plus catalog platforms whose scale is
 * known from their entity record but whose purchases are not itemised.
 */
export function holdings() {
  const rows = []
  for (const t of TRANSACTIONS) {
    if (!['catalog-sale', 'm&a', 'take-private', 'pe-round'].includes(t.type)) continue
    for (const a of t.acquirers) {
      if (!a.entityId) continue
      const owner = getEntity(a.entityId)
      if (!owner) continue
      const soldBy = t.sellers.map(partyName).join(', ')
      const text = `${t.title} ${t.summary || ''} ${t.asset || ''}`
      rows.push({
        id: `${t.id}-${a.entityId}`,
        ownerId: a.entityId, owner: owner.name, ownerKind: OWNER_KIND(owner), ownerType: owner.type,
        label: t.asset && t.asset !== 'n/a' ? `${t.title}` : t.title,
        asset: t.asset || 'n/a', value: t.value || 0, valueNote: t.valueNote || '', currency: t.currency || 'USD',
        acquired: t.date, structure: t.structure || '', dealType: t.type, soldBy,
        genres: genreTags(text), region: owner.region, sources: t.sources || [], summary: t.summary || '',
        kind: 'transaction', transactionId: t.id,
      })
    }
  }
  // platforms whose holdings are known in aggregate rather than deal by deal
  for (const e of ENTITIES) {
    if (!e.metrics?.catalogSize) continue
    if (rows.some((r) => r.ownerId === e.id)) continue
    rows.push({
      id: `${e.id}-portfolio`, ownerId: e.id, owner: e.name, ownerKind: OWNER_KIND(e), ownerType: e.type,
      label: `${e.name} catalog (${e.metrics.catalogSize.toLocaleString('en-US')} works or recordings)`,
      asset: e.roles?.includes('publisher') && e.roles?.includes('label') ? 'both' : e.roles?.includes('publisher') ? 'publishing' : 'recording',
      value: 0, valueNote: '', currency: 'USD', acquired: '', structure: '', dealType: 'holding', soldBy: '',
      genres: genreTags(e.summary || ''), region: e.region, sources: e.sources || [], summary: e.summary || '',
      kind: 'portfolio', transactionId: '',
    })
  }
  return rows
}

/**
 * availability(holding, ctx) — an explainable 0–100 read on how likely this holding is to come to market.
 * It is a prompt to do work, never a claim that an asset is for sale. ctx.news maps ownerId → live feed items.
 */
export function availability(h, ctx = {}) {
  const today = ctx.today || TODAY()
  const reasons = []
  const behaviour = OWNER_BEHAVIOUR[h.ownerKind]
  let score = behaviour.base
  reasons.push(`${behaviour.label}: ${behaviour.note} (+${behaviour.base})`)

  const d = parseDate(h.acquired)
  const years = d ? monthsBetween(d, today) / 12 : null
  if (years != null) {
    const [lo, hi] = behaviour.peak
    if (years >= lo && years <= hi) { score += 22; reasons.push(`Held ${years.toFixed(1)} years — inside the ${lo}–${hi} year window when this kind of owner usually moves (+22)`) }
    else if (years > hi) { score += 10; reasons.push(`Held ${years.toFixed(1)} years, beyond the usual ${lo}–${hi} year window (+10)`) }
    else { score += 2; reasons.push(`Held ${years.toFixed(1)} years — early in the hold (+2)`) }
  } else reasons.push('No acquisition date on record, so hold period cannot be scored')

  const abs = TRANSACTIONS.filter((t) => t.abs?.ard && [...t.sellers, ...t.acquirers].some((p) => p.entityId === h.ownerId))
  for (const t of abs) {
    const ard = parseDate(t.abs.ard.length === 4 ? `${t.abs.ard}-01` : t.abs.ard)
    if (!ard) continue
    const away = monthsBetween(today, ard)
    if (away > 0 && away <= 48) { score += 12; reasons.push(`Securitisation repayment date ${t.abs.ard} is ${Math.round(away / 12)} years out — refinance or sell (+12)`) }
  }

  const sold = TRANSACTIONS.filter((t) => t.sellers.some((p) => p.entityId === h.ownerId))
  if (sold.length) { score += 8; reasons.push(`Has sold ${sold.length} time${sold.length === 1 ? '' : 's'} before — a seller, not a holder (+8)`) }

  const intents = saleIntent(ctx.news?.[h.ownerId] || [])
  const process = intents.find((i) => i.kind === 'process')
  if (process) { score += 35; reasons.push(`Live signal: "${process.matched}" — ${process.title} (+35)`) }
  else if (intents.length) { score += 12; reasons.push(`Live signal: ${intents[0].kind} — "${intents[0].matched}" (+12)`) }

  score = clamp(Math.round(score), 0, 100)
  const band = score >= 60 ? 'live' : score >= 40 ? 'watch' : 'quiet'
  return { score, band, reasons, intents, years }
}

export function scanCatalogs(ctx = {}) {
  const rows = holdings().map((h) => ({ ...h, availability: availability(h, ctx) }))
  return rows.sort((a, b) => b.availability.score - a.availability.score || (b.value || 0) - (a.value || 0))
}

export function filterCatalogs(rows, f = {}) {
  return rows.filter((r) => {
    if (f.asset && r.asset !== f.asset) return false
    if (f.owner && r.ownerKind !== f.owner) return false
    if (f.band && r.availability.band !== f.band) return false
    if (f.genre && !r.genres.some((g) => g.tag === f.genre)) return false
    if (f.minValue && (r.value || 0) < Number(f.minValue)) return false
    if (f.q && !`${r.label} ${r.owner} ${r.soldBy} ${r.summary}`.toLowerCase().includes(String(f.q).toLowerCase())) return false
    return true
  })
}

export function marketStats(rows) {
  const valued = rows.filter((r) => r.value > 0)
  return {
    holdings: rows.length,
    live: rows.filter((r) => r.availability.band === 'live').length,
    watch: rows.filter((r) => r.availability.band === 'watch').length,
    tracked: valued.reduce((a, r) => a + r.value, 0),
    genres: [...new Set(rows.flatMap((r) => r.genres.map((g) => g.tag)))].sort(),
    owners: [...new Set(rows.map((r) => r.ownerId))].length,
  }
}
