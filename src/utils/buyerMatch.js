/**
 * buyerMatch.js — the sell-side view: who buys catalogs, what each one actually buys, and which of them fit a
 * specific asset. Pure functions, Node-testable (scripts/test-market.mjs).
 *
 * A buyer profile is built only from transactions on record: what they bought, how big, how recently, how they
 * financed it, and who they bought it with. Nothing is asserted about appetite that a deal does not evidence.
 * matchBuyers() scores a buyer against a seller's brief and explains every point it awards.
 */
import { getEntity } from '../data/entities.js'
import { TRANSACTIONS, partyName } from '../data/transactions.js'
import { genreTags } from './catalogScan.js'

const parseDate = (s) => { if (!s) return null; const d = new Date(`${String(s).length === 7 ? `${s}-01` : s}T00:00:00Z`); return Number.isNaN(+d) ? null : d }
const months = (a, b) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
const median = (xs) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
export const TODAY = () => new Date()

export const GOALS = {
  'max-price': { label: 'Highest price', note: 'Competitive tension, financial buyers with leverage, willing to underwrite growth.' },
  speed: { label: 'Speed and certainty', note: 'Repeat buyers who have closed recently and know the asset class.' },
  legacy: { label: 'Legacy and stewardship', note: 'Long-term strategic owners who will keep and work the catalog.' },
  partial: { label: 'Sell part, keep upside', note: 'Buyers who do minority stakes, joint ventures and structured deals.' },
}
export const BUYER_KINDS = {
  sponsor: 'Private equity sponsor',
  fund: 'Catalog fund / royalty platform',
  major: 'Major label or publisher',
  independent: 'Independent consolidator',
  credit: 'Credit or structured investor',
  other: 'Other acquirer',
}
const kindOf = (e) => {
  if (!e) return 'other'
  if (e.roles?.includes('pe-fund')) return 'sponsor'
  if (e.roles?.includes('debt-investor') && !e.roles?.includes('catalog-fund')) return 'credit'
  if (e.roles?.includes('catalog-fund')) return 'fund'
  if (e.tier === 1 && (e.type === 'label' || e.type === 'publisher')) return 'major'
  if (e.type === 'label' || e.type === 'publisher' || e.type === 'distributor') return 'independent'
  return 'other'
}

/** Everything the record actually evidences about one buyer. */
export function buyerProfile(entityId, ctx = {}) {
  const e = getEntity(entityId)
  if (!e) return null
  const today = ctx.today || TODAY()
  const deals = TRANSACTIONS.filter((t) => t.acquirers.some((p) => p.entityId === entityId))
  const valued = deals.filter((d) => d.value > 0).map((d) => d.value)
  const assets = {}
  const structures = {}
  const genres = {}
  let partners = []
  for (const d of deals) {
    assets[d.asset || 'n/a'] = (assets[d.asset || 'n/a'] || 0) + 1
    if (d.structure) structures[d.structure] = (structures[d.structure] || 0) + 1
    for (const g of genreTags(`${d.title} ${d.summary || ''}`)) genres[g.tag] = (genres[g.tag] || 0) + 1
    partners = partners.concat(d.acquirers.filter((p) => p.entityId !== entityId).map(partyName))
  }
  const dates = deals.map((d) => parseDate(d.date)).filter(Boolean).sort((a, b) => b - a)
  const lastMonths = dates.length ? months(dates[0], today) : null
  const sales = TRANSACTIONS.filter((t) => t.sellers.some((p) => p.entityId === entityId))
  return {
    id: entityId, name: e.name, short: e.short, kind: kindOf(e), type: e.type, tier: e.tier, region: e.region,
    ownership: e.ownership, summary: e.summary, metrics: e.metrics || {},
    deals, dealCount: deals.length, valuedCount: valued.length,
    totalValue: valued.reduce((a, v) => a + v, 0), medianValue: median(valued), largest: valued.length ? Math.max(...valued) : 0,
    assets, structures, genres, partners: [...new Set(partners)],
    lastDeal: dates.length ? deals.find((d) => +parseDate(d.date) === +dates[0]) : null, lastMonths,
    usesAbs: !!structures.abs || !!structures.wbs, exits: sales.length,
  }
}

/** Every entity that has acquired something on record, profiled. */
export function buyers(ctx = {}) {
  const ids = [...new Set(TRANSACTIONS.flatMap((t) => t.acquirers.map((p) => p.entityId).filter(Boolean)))]
  return ids.map((id) => buyerProfile(id, ctx)).filter(Boolean).sort((a, b) => b.dealCount - a.dealCount)
}

/**
 * matchBuyers(brief, ctx) — score each buyer against what the seller has and wants.
 * brief: { asset, size, genre, region, goal }
 */
export function matchBuyers(brief = {}, ctx = {}) {
  const list = ctx.buyers || buyers(ctx)
  const scored = list.map((b) => {
    const reasons = []
    let score = 0

    if (brief.asset) {
      const direct = b.assets[brief.asset] || 0
      const both = b.assets.both || 0
      if (direct) { score += 25; reasons.push(`Has bought ${brief.asset === 'both' ? 'recording and publishing together' : brief.asset} ${direct} time${direct === 1 ? '' : 's'} (+25)`) }
      else if (both) { score += 18; reasons.push(`Buys recording and publishing together (${both} deal${both === 1 ? '' : 's'}), so this asset fits (+18)`) }
      else reasons.push(`No ${brief.asset} purchase on record — the fit is unproven`)
    } else { score += 12; reasons.push('No asset type specified (+12)') }

    const size = Number(brief.size) || 0
    if (size && b.medianValue) {
      const r = size / b.medianValue
      if (r >= 0.4 && r <= 2.5) { score += 25; reasons.push(`Typical cheque is ${(b.medianValue / 1e6).toFixed(0)}M — this is the size they write (+25)`) }
      else if (r > 2.5 && size <= b.largest * 1.5) { score += 14; reasons.push(`Larger than their median but inside their range — biggest on record is ${(b.largest / 1e6).toFixed(0)}M (+14)`) }
      else if (r < 0.4) { score += 8; reasons.push(`Smaller than they usually buy (median ${(b.medianValue / 1e6).toFixed(0)}M) — may still fit a platform deal (+8)`) }
      else reasons.push(`Bigger than anything on their record (largest ${(b.largest / 1e6).toFixed(0)}M)`)
    } else if (size) { score += 8; reasons.push('No disclosed deal values, so size fit cannot be evidenced (+8)') }

    if (b.lastMonths != null) {
      const a = b.lastMonths <= 12 ? 20 : b.lastMonths <= 24 ? 14 : b.lastMonths <= 36 ? 8 : 2
      score += a
      reasons.push(`Last acquisition ${b.lastMonths <= 1 ? 'this month' : `${b.lastMonths} months ago`} (+${a})`)
    }
    const depth = Math.min(b.dealCount, 5) * 2
    score += depth
    reasons.push(`${b.dealCount} acquisition${b.dealCount === 1 ? '' : 's'} on record (+${depth})`)

    if (b.usesAbs) { score += 8; reasons.push('Finances with securitisation, so large cheques are fundable (+8)') }
    if (b.tier === 1) { score += 6; reasons.push('Tier 1 within its type (+6)') }
    else if (b.tier === 2) { score += 3; reasons.push('Tier 2 within its type (+3)') }

    const goal = brief.goal
    if (goal === 'max-price' && (b.kind === 'sponsor' || b.kind === 'fund') && b.usesAbs) { score += 10; reasons.push('Financial buyer with leverage — the profile that pushes price (+10)') }
    if (goal === 'speed' && b.lastMonths != null && b.lastMonths <= 18 && b.dealCount >= 2) { score += 10; reasons.push('Repeat buyer who has closed recently — the fastest route (+10)') }
    if (goal === 'legacy' && (b.kind === 'major' || b.kind === 'independent') && b.exits === 0) { score += 10; reasons.push('Strategic owner with no exits on record — buys to keep (+10)') }
    if (goal === 'partial' && (b.structures['royalty-stream'] || b.deals.some((d) => d.type === 'pe-round') || b.kind === 'sponsor')) { score += 10; reasons.push('Does stakes, joint ventures and structured deals (+10)') }

    if (brief.region && (b.region === brief.region || b.region === 'Global')) { score += 6; reasons.push(`Active in ${b.region} (+6)`) }
    if (brief.genre && b.genres[brief.genre]) { score += 6; reasons.push(`Has bought ${brief.genre} catalogs before (+6)`) }

    const total = Math.max(0, Math.min(100, Math.round(score)))
    return { ...b, match: { score: total, band: total >= 65 ? 'strong' : total >= 45 ? 'possible' : 'weak', reasons } }
  })
  return scored.sort((a, b) => b.match.score - a.match.score || b.dealCount - a.dealCount)
}

/** A short, factual description of how this buyer behaves, for the shortlist. */
export function buyerNarrative(b) {
  const bits = []
  bits.push(`${BUYER_KINDS[b.kind]}${b.region ? `, ${b.region}` : ''}`)
  if (b.dealCount) bits.push(`${b.dealCount} acquisition${b.dealCount === 1 ? '' : 's'} on record`)
  if (b.medianValue) bits.push(`median disclosed cheque ${(b.medianValue / 1e6).toFixed(0)}M`)
  const topAsset = Object.entries(b.assets).sort((x, y) => y[1] - x[1])[0]
  if (topAsset && topAsset[0] !== 'n/a') bits.push(`mostly ${topAsset[0] === 'both' ? 'recording and publishing' : topAsset[0]}`)
  if (b.usesAbs) bits.push('finances with securitisation')
  if (b.exits) bits.push(`${b.exits} exit${b.exits === 1 ? '' : 's'} on record`)
  return `${bits.join(' · ')}.`
}
