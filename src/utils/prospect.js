/**
 * prospect.js — the coverage and prospecting engine. Pure functions, Node-testable (scripts/test-prospect.mjs).
 *
 * buildAccounts(ctx) turns the entity, fund, society, and platform tables into accounts placed in one selling
 * segment each, then scores every account out of 100:
 *   fit (0–40)     — does a PEPI service line have a specific hypothesis here, at what scale and role breadth
 *   timing (0–40)  — dated triggers (deals, ABS repayment dates, society reform milestones, news signals), decayed
 *   access (0–20)  — Hub cross-links, the operator's own relationship record, adviser overlap on past deals
 * Every component returns its reasons, so a score can be defended in a meeting. Nothing here invents a contact:
 * personas are roles, and relationship strength comes only from what the operator entered.
 */
import { ENTITIES, getBackedBy, getEntity } from '../data/entities.js'
import { TRANSACTIONS, partyIds as txPartyIds, partyName } from '../data/transactions.js'
import { CLIENT_CATEGORIES, SERVICE_LINES, getConsultingContext } from '../data/consulting.js'
import { listPros } from '../data/pros.js'
import { SHARED_COMPANY_IDS, SHARED_SPONSOR_IDS } from '../data/siblings.js'

export const TODAY = () => new Date()
/** Tier cuts, set against the live distribution so Tier A stays a week's worth of calls. */
export const TIER_CUTS = { a: 55, b: 40 }
const monthsBetween = (a, b) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
const parseDate = (s) => { if (!s) return null; const d = new Date(`${String(s).length === 7 ? `${s}-01` : s}T00:00:00Z`); return Number.isNaN(+d) ? null : d }
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

/** Selling segments, in match order: an account belongs to exactly the first one it matches. */
export const SEGMENTS = [
  { id: 'sponsors', label: 'PE & growth sponsors', side: 'buy', lines: ['diligence', 'pmi', 'value-creation'], personas: ['deal-partner', 'operating-partner'], match: (e) => e.type === 'pe-fund' || e.roles.includes('pe-fund') },
  { id: 'catalog-funds', label: 'Catalog funds & rights investors', side: 'buy', lines: ['diligence', 'value-creation', 'strategy'], personas: ['deal-partner', 'royalty-ops'], match: (e) => e.type === 'catalog-fund' || e.roles.includes('catalog-fund') },
  { id: 'debt', label: 'Debt & structured investors', side: 'buy', lines: ['diligence', 'strategy'], personas: ['credit-pm'], match: (e) => e.type === 'debt-investor' || e.roles.includes('debt-investor') },
  { id: 'strategics', label: 'Strategic acquirers', side: 'buy', lines: ['pmi', 'diligence', 'carve-out'], personas: ['deal-partner', 'cfo'], match: (e) => e.type === 'strategic' },
  { id: 'labels-publishers', label: 'Labels & publishers', side: 'sell', lines: ['carve-out', 'value-creation', 'diligence', 'pmi'], personas: ['cfo', 'royalty-ops'], match: (e) => e.type === 'label' || e.type === 'publisher' },
  { id: 'distributors', label: 'Distributors & artist services', side: 'sell', lines: ['value-creation', 'pmi', 'strategy'], personas: ['cfo', 'royalty-ops'], match: (e) => e.type === 'distributor' || e.type === 'artist-services' },
  { id: 'societies', label: 'PROs, CMOs & societies', side: 'sell', lines: ['value-creation', 'carve-out', 'strategy'], personas: ['society-ceo', 'royalty-ops'], match: (e) => e.type === 'pro' },
  { id: 'live', label: 'Live & venues', side: 'sell', lines: ['pmi', 'diligence', 'value-creation'], personas: ['cfo', 'deal-partner'], match: (e) => e.type === 'live' },
  { id: 'platforms', label: 'Platforms, data & music tech', side: 'sell', lines: ['strategy', 'diligence', 'value-creation'], personas: ['cfo', 'deal-partner'], match: (e) => e.type === 'dsp' || e.type === 'music-tech' || e.type === 'data' },
]
export const SEGMENT_BY_ID = Object.fromEntries(SEGMENTS.map((s) => [s.id, s]))
export const segmentFor = (e) => SEGMENTS.find((s) => s.match(e)) || null

export const TRIGGER_KINDS = {
  'm&a': { label: 'M&A closed', weight: 14, window: 24 },
  'take-private': { label: 'Take-private', weight: 14, window: 24 },
  abs: { label: 'ABS issuance', weight: 12, window: 24 },
  'pe-round': { label: 'PE investment', weight: 10, window: 24 },
  portfolio: { label: 'Portfolio activity', weight: 7, window: 18 },
  'catalog-sale': { label: 'Catalog transaction', weight: 8, window: 18 },
  debt: { label: 'Debt financing', weight: 8, window: 18 },
  ard: { label: 'ABS repayment date approaching', weight: 12, window: 36 },
  reform: { label: 'Society reform milestone', weight: 10, window: 18 },
  signal: { label: 'News signal', weight: 2, window: 3 },
}

/** Linear decay to zero across the trigger's window; events in the future (an ARD) decay as they get further away. */
function decay(kind, date, today) {
  const k = TRIGGER_KINDS[kind]
  if (!k || !date) return 0
  const months = monthsBetween(date, today)
  const age = months >= 0 ? months : -months
  if (age >= k.window) return 0
  const full = months >= 0 ? 6 : 0
  return age <= full ? 1 : 1 - (age - full) / (k.window - full)
}

const partyIds = (t) => [...txPartyIds(t), ...(t.catalogOf ? [t.catalogOf] : [])]

const money = (v, currency = 'USD') => {
  if (!v) return ''
  const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'
  return v >= 1e9 ? `${sym}${(v / 1e9).toFixed(v >= 1e10 ? 0 : 1)}B` : `${sym}${Math.round(v / 1e6)}M`
}
const others = (list, entityId) => list.filter((p) => p.entityId !== entityId).map(partyName)

/**
 * A factual clause naming the event from the transaction's own fields, written from the account's side —
 * "your $889M securitisation", "your acquisition of Kobalt" — rather than recycling a headline.
 */
export function clauseForTransaction(t, entityId) {
  const isAcquirer = (t.acquirers || []).some((p) => p.entityId === entityId)
  const isSeller = (t.sellers || []).some((p) => p.entityId === entityId)
  const mine = isAcquirer || isSeller
  const amount = money(t.value, t.currency)
  const buyers = others(t.acquirers || [], entityId)
  // sellers often list the sponsor and the company; name the company, and never the asset-class label ("publishing")
  const sellerNames = (t.sellers || []).filter((x) => x.entityId !== entityId).map((x) => ({ name: partyName(x), type: x.entityId ? getEntity(x.entityId)?.type : '' }))
  const acquired = (sellerNames.find((x) => x.type && x.type !== 'pe-fund') || sellerNames[0])?.name || 'the business'
  const issuerPhrase = t.abs?.issuer && !new RegExp((getEntity(entityId)?.name || '').split(' ')[0], 'i').test(t.abs.issuer) ? ` through ${t.abs.issuer}` : ''
  switch (t.type) {
    case 'abs':
      return `${mine ? 'your' : 'the'} ${amount ? `${amount} ` : ''}securitisation${issuerPhrase}`
    case 'debt':
      return `${mine ? 'your' : 'the'} ${amount ? `${amount} ` : ''}financing`
    case 'pe-round':
      return isAcquirer ? `your investment in ${acquired}` : `the ${amount ? `${amount} ` : ''}investment${buyers[0] ? ` from ${buyers[0]}` : ''}`
    case 'take-private':
      return isAcquirer ? `your ${amount ? `${amount} ` : ''}take-private proposal${acquired !== 'the business' ? ` for ${acquired}` : ''}` : `the ${amount ? `${amount} ` : ''}take-private approach${buyers[0] ? ` from ${buyers[0]}` : ''}`
    case 'catalog-sale':
      return isAcquirer ? `your acquisition of ${acquired === 'the business' ? 'the catalog' : `the ${acquired} catalog`}` : isSeller ? `your catalog sale${buyers[0] ? ` to ${buyers[0]}` : ''}` : `the ${t.title}`
    default:
      return isAcquirer ? `your acquisition of ${acquired}` : isSeller ? `your sale${buyers[0] ? ` to ${buyers[0]}` : ''}` : `the ${t.title}`
  }
}

/** Dated triggers for one entity, newest first. ctx.signals maps entityId → live news-signal count. */
export function triggersFor(entityId, ctx = {}) {
  const today = ctx.today || TODAY()
  const out = []
  for (const t of TRANSACTIONS) {
    if (!partyIds(t).includes(entityId)) continue
    const d = parseDate(t.date)
    const w = decay(t.type, d, today)
    if (w > 0) out.push({ id: `${t.id}`, kind: t.type, date: t.date, label: `${TRIGGER_KINDS[t.type]?.label || t.type}: ${t.title}`, clause: clauseForTransaction(t, entityId), detail: t.summary, weight: TRIGGER_KINDS[t.type].weight * w, sources: t.sources })
    if (t.abs?.ard) {
      const ard = parseDate(`${t.abs.ard.length === 4 ? `${t.abs.ard}-01` : t.abs.ard}`)
      const aw = ard && ard > today ? decay('ard', ard, today) : 0
      if (aw > 0) out.push({ id: `${t.id}-ard`, kind: 'ard', date: t.abs.ard, label: `Anticipated repayment date ${t.abs.ard} — ${t.abs.issuer || t.title}`, clause: `the ${t.abs.ard} anticipated repayment date on ${t.abs.issuer || t.title}`, detail: t.abs.notes, weight: TRIGGER_KINDS.ard.weight * aw, sources: t.sources })
    }
  }
  // a sponsor's portfolio company doing a deal is a reason to call the sponsor
  const backed = ctx.backed || getBackedBy(entityId)
  if (backed.length) {
    const ids = new Set(backed.map((x) => x.id))
    for (const t of TRANSACTIONS) {
      const hit = partyIds(t).find((id) => ids.has(id))
      if (!hit) continue
      const d = parseDate(t.date)
      const w = decay('portfolio', d, today)
      if (w > 0) out.push({ id: `${t.id}-pf-${hit}`, kind: 'portfolio', date: t.date, label: `Portfolio activity at ${getEntity(hit)?.name || hit}: ${t.title}`, clause: `${getEntity(hit)?.name || hit}'s ${clauseForTransaction(t, hit).replace(/^(your|the) /, '')}`, detail: t.summary, weight: TRIGGER_KINDS.portfolio.weight * w, sources: t.sources })
    }
  }
  const pro = (ctx.pros || listPros()).find((p) => p.entity?.id === entityId)
  for (const r of pro?.reforms || []) {
    const d = parseDate(r.date)
    const w = decay('reform', d, today)
    if (w > 0) out.push({ id: `${entityId}-${r.date}`, kind: 'reform', date: r.date, label: `Reform milestone: ${r.text}`, clause: `what you published — ${String(r.text).replace(/\.\s*$/, '')}`, detail: '', weight: TRIGGER_KINDS.reform.weight * w, sources: pro.sources })
  }
  const signals = ctx.signals?.[entityId] || 0
  if (signals > 0) out.push({ id: `${entityId}-signals`, kind: 'signal', date: ctx.signalsAsOf || '', label: `${signals} news ${signals === 1 ? 'item' : 'items'} in the live feed`, clause: '', detail: '', weight: Math.min(signals, 5) * TRIGGER_KINDS.signal.weight })
  return out.sort((a, b) => String(b.date).localeCompare(String(a.date)) || b.weight - a.weight)
}

export const ACCESS_LEVELS = { none: 0, cold: 0, warm: 6, strong: 12 }

/** Scale band from whatever headline metric the record carries — revenue, collections, AUM, or catalog size. */
export function sizeBand(account) {
  const m = account.metrics || {}
  const usd = m.revenue || m.collections || m.aum || 0
  if (usd >= 1e9) return { points: 8, label: 'Global scale (≥$1B headline metric)' }
  if (usd >= 250e6) return { points: 6, label: 'Large ($250M–$1B)' }
  if (usd >= 50e6) return { points: 4, label: 'Mid-market ($50–250M)' }
  if (usd > 0) return { points: 2, label: 'Small (<$50M)' }
  if (m.catalogSize >= 100000 || m.subscribers >= 10e6 || m.mau >= 50e6) return { points: 6, label: 'Large by catalog or audience' }
  if (m.catalogSize || m.subscribers || m.mau) return { points: 3, label: 'Mid by catalog or audience' }
  return { points: 0, label: 'No headline metric on file' }
}

/** Score one account. `record` is the operator's own overlay: { access, owner, status, note }. */
export function scoreAccount(account, ctx = {}) {
  const record = ctx.records?.[account.id] || {}
  const fitReasons = []; const timingReasons = []; const accessReasons = []

  const tierPoints = { 1: 12, 2: 8, 3: 4 }[account.tier] || 4
  fitReasons.push(`Tier ${account.tier} within ${account.type} (+${tierPoints})`)
  const sizePoints = sizeBand(account).points
  if (sizePoints) fitReasons.push(`${sizeBand(account).label} (+${sizePoints})`)
  const catPoints = Math.min(account.categories.length * 5, 10)
  if (catPoints) fitReasons.push(`${account.categories.length} PEPI ${account.categories.length === 1 ? 'category' : 'categories'} with named hypotheses (+${catPoints})`)
  const rolePoints = Math.min(account.roles.length, 3) * 2
  fitReasons.push(`${account.roles.length} ${account.roles.length === 1 ? 'role' : 'roles'} in the value chain (+${rolePoints})`)
  const hypPoints = Math.min(account.hypotheses, 4)
  if (hypPoints) fitReasons.push(`${account.hypotheses} engagement hypotheses across our lines (+${hypPoints})`)
  const fit = clamp(tierPoints + sizePoints + catPoints + rolePoints + hypPoints, 0, 40)

  const triggers = account.triggers || []
  let timing = 0
  for (const t of triggers) { timing += t.weight; timingReasons.push(`${t.label} (+${t.weight.toFixed(0)})`) }
  timing = clamp(Math.round(timing), 0, 40)

  let access = 0
  const hubSponsor = SHARED_SPONSOR_IDS.includes(account.id)
  const hubCompany = SHARED_COMPANY_IDS.includes(account.id)
  if (hubSponsor || hubCompany) { access += 8; accessReasons.push(`Covered in the Intelligence Hub as a shared ${hubSponsor ? 'sponsor' : 'company'} (+8)`) }
  const rel = ACCESS_LEVELS[record.access] || 0
  if (rel) { access += rel; accessReasons.push(`Relationship recorded as ${record.access} (+${rel})`) }
  const sponsorOverlap = (account.backers || []).filter((b) => SHARED_SPONSOR_IDS.includes(b))
  if (sponsorOverlap.length) { access += 4; accessReasons.push(`Backed by ${sponsorOverlap.length} sponsor${sponsorOverlap.length > 1 ? 's' : ''} we cover elsewhere (+4)`) }
  access = clamp(access, 0, 20)

  const total = fit + timing + access
  const tier = total >= TIER_CUTS.a || (timing >= 20 && access >= 8) ? 'A' : total >= TIER_CUTS.b ? 'B' : 'C'
  return { fit, timing, access, total, tier, fitReasons, timingReasons, accessReasons }
}

/** All accounts, scored and sorted by score. ctx: { records, signals, today }. */
export function buildAccounts(ctx = {}) {
  const pros = listPros()
  const accounts = []
  for (const e of ENTITIES) {
    if (e.status === 'dissolved') continue
    const segment = segmentFor(e)
    if (!segment) continue
    const consulting = getConsultingContext(e.id)
    const categories = consulting.categories.map((c) => c.id)
    const hypotheses = consulting.hypotheses?.length || 0
    const deals = TRANSACTIONS.filter((t) => partyIds(t).includes(e.id))
      const triggers = triggersFor(e.id, { ...ctx, pros })
    const account = {
      id: e.id, name: e.name, short: e.short, type: e.type, roles: e.roles, tier: e.tier, region: e.region, hq: e.hq,
      ownership: e.ownership, backers: e.backers || [], metrics: e.metrics || {}, summary: e.summary,
      segment: segment.id, side: segment.side, lines: segment.lines, personas: segment.personas,
      categories, hypotheses, deals, triggers, topTrigger: triggers[0] || null,
    }
    account.score = scoreAccount(account, ctx)
    accounts.push(account)
  }
  return accounts.sort((a, b) => b.score.total - a.score.total || a.name.localeCompare(b.name))
}

/** Coverage matrix: segment × tier, with how many carry an owner and a status beyond "new". */
export function coverage(accounts, records = {}) {
  const rows = SEGMENTS.map((s) => {
    const inSeg = accounts.filter((a) => a.segment === s.id)
    const byTier = { A: 0, B: 0, C: 0 }
    for (const a of inSeg) byTier[a.score.tier] += 1
    const priority = inSeg.filter((a) => a.score.tier !== 'C')
    const worked = priority.filter((a) => { const r = records[a.id] || {}; return r.status && r.status !== 'new' })
    return { ...s, accounts: inSeg.length, byTier, priority: priority.length, worked: worked.length, coverage: priority.length ? worked.length / priority.length : null }
  })
  const totals = rows.reduce((acc, r) => ({ accounts: acc.accounts + r.accounts, A: acc.A + r.byTier.A, B: acc.B + r.byTier.B, C: acc.C + r.byTier.C, priority: acc.priority + r.priority, worked: acc.worked + r.worked }), { accounts: 0, A: 0, B: 0, C: 0, priority: 0, worked: 0 })
  return { rows, totals, coverage: totals.priority ? totals.worked / totals.priority : 0 }
}

/** What a trigger says about the work: an ABS points at diligence, a closed deal at integration. */
export const TRIGGER_LINE = { abs: 'diligence', ard: 'diligence', 'catalog-sale': 'diligence', 'pe-round': 'value-creation', 'm&a': 'pmi', 'take-private': 'pmi', portfolio: 'diligence', reform: 'value-creation', debt: 'diligence' }

/**
 * The service line to lead with: the line the live trigger points at, if the segment sells it and the account's
 * categories carry a hypothesis for it; otherwise the segment's first line with a hypothesis.
 */
export function recommendedLine(account) {
  const cats = CLIENT_CATEGORIES.filter((c) => account.categories.includes(c.id))
  const has = (line) => account.lines.includes(line) && cats.some((c) => (c.engagements?.[line] || []).length)
  const fromTrigger = TRIGGER_LINE[account.topTrigger?.kind]
  if (fromTrigger && has(fromTrigger)) return fromTrigger
  for (const line of account.lines) if (has(line)) return line
  return account.lines[0]
}

export function lineLabel(id) { return SERVICE_LINES[id]?.label || id }

/** The hypotheses behind a recommendation, so the message can cite something specific. */
export function hypothesesFor(account, line) {
  const out = []
  for (const c of CLIENT_CATEGORIES) {
    if (!account.categories.includes(c.id)) continue
    for (const text of c.engagements?.[line] || []) out.push({ category: c.id, categoryLabel: c.label, text })
  }
  return out
}

export const entityFor = (id) => getEntity(id)
