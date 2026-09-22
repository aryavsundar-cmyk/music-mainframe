/**
 * brief.js — the SINGLE source-of-truth data builder for every export (Patterns §1, §6).
 *
 * buildBrief(entityId, { mode, citations }) → {
 *   entity, mode, modeLabel, title, subtitle, generatedAt, asOf,
 *   sections: [{ num, eyebrow, title, blocks: Block[] }],   // numbered after mode filtering → "§ 01 — …"
 *   citations: { items, source }                              // from newsCitations.fetchCitations
 * }
 * Block kinds: paragraph{text} · facts{rows:[[label,value]]} · stats{items:[{label,value,hint}]} ·
 *              bullets{items} · table{columns,rows} · note{text}
 *
 * Renderers (briefText / briefDocx / briefPptx) consume this and nothing else. They never hard-code a
 * section list; they read `brief.mode` only for the cover. Modes are per entity type, not binary.
 */
import { getEntityProfile, getEntity, getParentChain, getChildren, getBackers, getBackedBy, ENTITY_TYPES, TIERS, OWNERSHIP } from '../data/entities.js'
import { getTransactionsForEntity, TX_TYPES, ASSETS, partyName, TRANSACTIONS } from '../data/transactions.js'
import { getFundProfile, kindOf, FUND_KINDS } from '../data/peFunds.js'
import { getProProfile, SCOPES, MODELS } from '../data/pros.js'
import { getDspProfile, TIERS as DSP_TIERS, PAYOUT_MODELS } from '../data/fundamentals.js'
import { flowsForEntity, FLOWS } from '../data/flows.js'
import { OVERLAY_LABEL, getConsultingContext, SERVICE_LINES } from '../data/consulting.js'
import { hubFundLink, hubLinks } from '../data/siblings.js'
import { CITATION_FALLBACK } from './newsCitations.js'
import { formatMoney, formatCount, formatPct, formatRate, formatDate, currencySymbol } from './format.js'
import { classifyDeal, entityExposure } from './forces.js'
import { DIRECTIONS, FORCE_BY_ID } from '../data/forces.js'
import { LIMITS } from '../data/limits.js'

const MONEY_TYPES = new Set(['catalog-fund', 'pe-fund', 'debt-investor', 'strategic'])
const RIGHTS_OPS = new Set(['label', 'publisher', 'distributor', 'artist-services'])

export const MODES = {
  full: { label: 'Full brief', blurb: 'Everything on the page' },
  catalog: { label: 'Catalog brief', blurb: 'Profile, hierarchy, flows, catalog deals' },
  financial: { label: 'Financial brief', blurb: 'Transactions, ABS, investment view, consulting lens' },
  distribution: { label: 'Distribution brief', blurb: 'Profile, flows, distribution relationships' },
  methodology: { label: 'Methodology brief', blurb: 'How the society licenses, distributes, and reforms' },
  membership: { label: 'Membership brief', blurb: 'Collections, members, payout policy' },
  economics: { label: 'Economics brief', blurb: 'Subscribers, price, payout model, per-stream' },
  rights: { label: 'Rights brief', blurb: 'Where the platform sits in both flows' },
}

/** Modes available for an entity, by type. Always starts with 'full'. */
export function modesFor(entity) {
  const t = entity.type
  if (RIGHTS_OPS.has(t)) return ['full', 'catalog', 'financial', 'distribution']
  if (MONEY_TYPES.has(t)) return ['full', 'financial']
  if (t === 'pro') return ['full', 'methodology', 'membership']
  if (t === 'dsp') return ['full', 'economics', 'rights']
  return ['full']
}

const money = (v, cur = 'USD') => formatMoney(v, { currency: currencySymbol(cur), digits: 2 })
const dash = (v) => (v == null || v === '' ? '—' : String(v))
const list = (xs) => (xs && xs.length ? xs.join(', ') : '—')

export function buildBrief(entityId, { mode = 'full', citations = { items: [], source: 'unavailable' }, forceItems = null } = {}) {
  const e = getEntityProfile(entityId)
  const type = ENTITY_TYPES[e.type] || { label: e.type }
  const inMode = (...ms) => mode === 'full' || ms.includes(mode)
  const sections = []
  const add = (eyebrow, title, blocks) => { const b = blocks.filter(Boolean); if (b.length) sections.push({ eyebrow, title, blocks: b }) }

  // § Profile — always
  add('Profile', e.name, [
    e.summary && { kind: 'paragraph', text: e.summary },
    { kind: 'facts', rows: [
      ['Type', `${type.label}${e.subtype ? ` · ${e.subtype}` : ''}`],
      ['Roles', list(e.roles.map((r) => ENTITY_TYPES[r]?.label || r))],
      ['Tier', TIERS[e.tier] || dash(e.tier)],
      ['Ownership', `${OWNERSHIP[e.ownership] || e.ownership}${e.ticker ? ` · ${e.ticker}` : ''}`],
      ['Headquarters', dash(e.hq)], ['Founded', dash(e.founded)], ['Region', dash(e.region)],
      ['Parent', e.parentId ? (getEntity(e.parentId)?.name || e.parentId) : '—'],
      ['Backers', list(getBackers(e.id).map((b) => b.name))],
      ['Backs', list(getBackedBy(e.id).map((b) => b.name))],
      ['Status', e.status !== 'active' ? e.status : 'active'],
    ] },
    e.notes.length ? { kind: 'bullets', items: e.notes } : null,
    e.verify ? { kind: 'note', text: 'This record carries at least one fact from the kickoff brief that is not yet confirmed against a primary source.' } : null,
    hubLinks(e.id).length ? { kind: 'bullets', items: hubLinks(e.id).map((l) => `Also in Intelligence Hub — ${l.label.replace(' · Intelligence Hub', '')}: ${l.url}`) } : null,
  ])

  // § Metrics — when present
  const m = e.metrics
  const stats = []
  if (m.revenue) stats.push({ label: `Revenue ${m.revenueYear || ''}`.trim(), value: money(m.revenue, m.revenueCurrency), hint: m.revenueCurrency && m.revenueCurrency !== 'USD' ? `reported in ${m.revenueCurrency}` : '' })
  if (m.aum) stats.push({ label: 'AUM', value: money(m.aum) })
  if (m.subscribers) stats.push({ label: 'Paid subscribers', value: formatCount(m.subscribers), hint: m.metricsAsOf || '' })
  if (m.mau) stats.push({ label: 'Monthly active users', value: formatCount(m.mau), hint: m.metricsAsOf || '' })
  if (m.catalogSize) stats.push({ label: 'Catalog (songs)', value: formatCount(m.catalogSize) })
  if (stats.length && inMode('financial', 'membership', 'economics', 'catalog')) add('Metrics', 'Headline numbers', [{ kind: 'stats', items: stats }])

  // § Corporate hierarchy
  if (inMode('catalog', 'financial', 'distribution')) {
    const chain = getParentChain(e.id).reverse(); const kids = getChildren(e.id)
    if (chain.length || kids.length) add('Structure', 'Corporate hierarchy', [
      { kind: 'bullets', items: [...chain.map((p, i) => `${'  '.repeat(i)}${p.name}`), `${'  '.repeat(chain.length)}${e.name} ←`, ...kids.map((k) => `${'  '.repeat(chain.length + 1)}${k.name}${k.status !== 'active' ? ` (${k.status})` : ''}`)] },
    ])
  }

  // § Investment view — money-side entities
  if (MONEY_TYPES.has(e.type) || e.roles.some((r) => MONEY_TYPES.has(r))) {
    const p = getFundProfile(e.id)
    if (inMode('financial') && p.hasProfile) add('Investment view', `${FUND_KINDS[kindOf(e)]?.label || 'Capital'} thesis`, [
      p.thesis && { kind: 'paragraph', text: p.thesis },
      { kind: 'facts', rows: [['Structure preference', list(p.structure)], ['LP base / capital source', dash(p.lpBase)], ['Portfolio entities', list(p.portfolio.map((x) => x.name))], ['Named catalogs', list(p.catalogs)]] },
      p.exits.length ? { kind: 'bullets', items: p.exits.map((x) => `Exit: ${x}`) } : null,
      hubFundLink(e.id) ? { kind: 'note', text: `Also profiled in the Intelligence Hub PE Academy: ${hubFundLink(e.id).url}` } : null,
    ])
  }

  // § Money — transactions
  const deals = getTransactionsForEntity(e.id)
  const dealRows = mode === 'catalog' ? deals.filter((t) => t.type === 'catalog-sale' || t.asset !== 'n/a') : deals
  if (inMode('financial', 'catalog') && dealRows.length) add('Money', 'Transactions on file', [
    { kind: 'table', columns: ['Date', 'Deal', 'Type', 'Asset', 'Value'], rows: dealRows.map((t) => [formatDate(t.date), t.title, TX_TYPES[t.type]?.label || t.type, ASSETS[t.asset] || t.asset, t.value ? formatMoney(t.value, { digits: 2 }) : dash(t.valueNote || '')]) },
    ...dealRows.filter((t) => t.abs).map((t) => ({ kind: 'bullets', items: [
      `${t.title}: issuer ${t.abs.issuer} · series ${t.abs.series} · rating ${t.abs.rating}${t.abs.arrangers?.length ? ` · arrangers ${t.abs.arrangers.join(', ')}` : ''}${t.abs.catalogValue ? ` · collateral valued ${formatMoney(t.abs.catalogValue, { digits: 2 })}` : ''}${t.abs.advanceRate ? ` · advance rate ${formatPct(t.abs.advanceRate)}` : ''}${t.abs.ard ? ` · ARD ${formatDate(t.abs.ard)}` : ''}${t.abs.finalMaturity ? ` · legal final ${formatDate(t.abs.finalMaturity)}` : ''}`,
    ] })),
    { kind: 'note', text: `Counterparties: ${[...new Set(dealRows.flatMap((t) => [...t.acquirers, ...t.sellers].map(partyName)))].filter((n) => n !== e.name).slice(0, 12).join(' · ') || '—'}` },
  ])

  // § Collections — PROs
  if (e.type === 'pro') {
    const p = getProProfile(e.id); const cur = p.currency
    if (inMode('membership', 'methodology')) add('Collections', 'What it collects and pays', [
      p.latest ? { kind: 'stats', items: [
        { label: `Collections ${p.latest.year}`, value: money(p.latest.collections, cur) },
        p.latestDist ? { label: `Distributions ${p.latestDist.year}`, value: money(p.latestDist.distributions, cur) } : null,
        p.growth != null ? { label: 'Growth', value: formatPct(p.growth) } : null,
        p.overhead != null ? { label: 'Overhead', value: formatPct(p.overhead), hint: p.overheadNote } : null,
      ].filter(Boolean) } : { kind: 'note', text: p.seriesNote || 'Collections not disclosed.' },
      p.series.length ? { kind: 'table', columns: ['Year', `Collected (${cur})`, `Paid out (${cur})`], rows: p.series.map((s) => [String(s.year), money(s.collections, cur), money(s.distributions, cur)]) } : null,
      { kind: 'facts', rows: [['Rights', list(p.scopes.map((s) => SCOPES[s]?.label || s))], ['Model', MODELS[p.model] || p.model], ['Members', p.members ? `${formatCount(p.members)} — ${p.membersNote}` : dash(p.membersNote)], ['Reports in', cur]] },
    ])
    if (inMode('methodology')) add('Methodology', 'How the money moves', [
      p.methodology && { kind: 'paragraph', text: `Licensing and distribution. ${p.methodology}` },
      p.payoutPolicy && { kind: 'paragraph', text: `Payout policy. ${p.payoutPolicy}` },
      p.reciprocal && { kind: 'paragraph', text: `Reciprocal footprint. ${p.reciprocal}` },
      p.reforms.length ? { kind: 'table', columns: ['Date', 'Reform / event'], rows: p.reforms.map((r) => [formatDate(r.date), r.text]) } : null,
    ])
  }

  // § Economics — DSPs
  if (e.type === 'dsp') {
    const p = getDspProfile(e.id)
    if (inMode('economics')) add('Economics', 'Streaming economics', [
      { kind: 'stats', items: [
        p.subscribers ? { label: 'Subscribers', value: formatCount(p.subscribers), hint: p.metricsAsOf } : null,
        p.mau ? { label: 'MAU', value: formatCount(p.mau), hint: p.metricsAsOf } : null,
        p.priceUS != null ? { label: 'US price / month', value: formatRate(p.priceUS, { digits: 2 }) } : null,
        p.perStream ? { label: 'All-in per stream (cited)', value: `${formatRate(p.perStream[0])}–${formatRate(p.perStream[1]).slice(1)}` } : null,
        p.marketShare != null ? { label: 'Subscriber share', value: formatPct(p.marketShare), hint: p.marketShareAsOf } : null,
        p.shareToRights != null ? { label: 'To rights holders', value: formatPct(p.shareToRights), hint: 'approx.' } : null,
        p.payouts2025 ? { label: 'Paid to rights holders 2025', value: formatMoney(p.payouts2025) } : null,
      ].filter(Boolean) },
      { kind: 'facts', rows: [['Tier', DSP_TIERS[p.tier] || p.tier], ['Payout model', PAYOUT_MODELS[p.model] || p.model], ['Price note', dash(p.priceNote)], ['Subscriber note', dash(p.subscribersNote)]] },
      p.posture && { kind: 'paragraph', text: p.posture },
      p.shifts.length ? { kind: 'table', columns: ['Date', 'Shift'], rows: p.shifts.map((s) => [formatDate(s.date), s.text]) } : null,
    ])
  }

  // § Flows
  const roles = flowsForEntity(e.id)
  if (inMode('catalog', 'distribution', 'rights') && roles.length) add('Flows', 'Where it sits in the two rights flows', [
    { kind: 'bullets', items: roles.map(({ flowId, node }) => `${FLOWS[flowId].label} → ${node.label}: ${node.description}`) },
  ])

  // § consulting overlay
  const ctx = getConsultingContext(e.id)
  if (inMode('financial') && OVERLAY_LABEL && ctx.categories.length) add(OVERLAY_LABEL, 'Where the consulting work is', [
    { kind: 'facts', rows: [['Client categories', list(ctx.categories.map((c) => c.label))]] },
    { kind: 'bullets', items: ctx.hypotheses.map((h) => `${SERVICE_LINES[h.line].label}: ${h.text}`) },
    { kind: 'paragraph', text: ctx.categories[0].thesis },
  ])

  // § In the news — always
  add('Movement', 'In the news', [
    citations.items.length
      ? { kind: 'table', columns: ['Date', 'Source', 'Headline'], rows: citations.items.map((c) => [formatDate(c.publishedAt.slice(0, 10)), c.source, c.title]) }
      : { kind: 'note', text: CITATION_FALLBACK[citations.source] || CITATION_FALLBACK.unavailable },
    citations.items.length ? { kind: 'bullets', items: citations.items.map((c) => c.url) } : null,
  ])

  // § Five forces — the company's exposure, from deals it is party to and headlines that name it. Without the
  // feed and archive (a Node export, say) it falls back to deals on record and says so rather than reading low.
  if (inMode('financial', 'catalog', 'distribution', 'rights', 'economics', 'membership')) {
    const pool = forceItems || TRANSACTIONS.map(classifyDeal)
    const x = entityExposure(pool, e.id, { latest: 8 })
    const arrows = (d) => `↑${d.supports || 0} ↓${d.challenges || 0}${d.mixed ? ` ↕${d.mixed}` : ''}`
    // Each item once, with the forces it carries — a deal tagged to three forces is one deal, not three rows.
    const seen = new Map()
    for (const f of x.forces) for (const l of f.latest) if (!seen.has(l.item.id)) seen.set(l.item.id, l)
    const latest = [...seen.values()].sort((a, b) => String(b.item.date).localeCompare(String(a.item.date))).slice(0, 8)
    const forcesOf = (it) => [it.primary_force_id, ...it.secondary_force_ids].map((id) => FORCE_BY_ID[id].short_title).join(' · ')
    add('Five forces', 'Which forces the record ties this company to', [
      { kind: 'paragraph', text: `Built from deals ${e.name} is party to and headlines that name it${forceItems ? ', across deals on record, the evidence archive and the live feed' : ''}. Being mentioned elsewhere in an article is counted separately and does not count as exposure.` },
      forceItems ? null : { kind: 'note', text: 'Deals on record only — the live feed and evidence archive were not available to this export, so market events are missing.' },
      x.forces.some((f) => f.total)
        ? { kind: 'table', columns: ['Force', 'Primary', 'Secondary', 'As party', 'As subject', 'Mentioned', 'Direction'], rows: x.forces.map((f) => [`${f.force.number} ${f.force.short_title}`, String(f.direct), String(f.adjacent), String(f.party), String(f.subject), String(f.mentions), arrows(f.byDirection)]) }
        : { kind: 'note', text: `Nothing on record ties ${e.name} to a force as a party or a subject.` },
      latest.length ? { kind: 'table', columns: ['Date', 'Item', 'Forces (primary first)', 'How it is tied', 'Direction'], rows: latest.map((l) => [String(l.item.date).slice(0, 10), l.item.title, forcesOf(l.item), l.link === 'party' ? `party (${l.role})` : 'named in the headline', DIRECTIONS[l.item.force_impact_direction] || '']) } : null,
      { kind: 'note', text: `${LIMITS.force.claim} Exposure says what the record ties a company to, not its strategy.` },
    ])
  }

  // § Sources — always
  add('Sources', 'Provenance', [
    { kind: 'bullets', items: e.sources.map((s) => `${s.label} — ${s.url}`) },
    { kind: 'note', text: `Record as of ${e.asOf}. Generated by Mainframe · Music.` },
  ])

  sections.forEach((s, i) => { s.num = i + 1 })
  return {
    kind: 'brief', slug: `${e.id}-${mode}-brief`, entity: e, mode, modeLabel: MODES[mode]?.label || mode, title: e.name,
    subtitle: `${type.label}${e.subtype ? ` · ${e.subtype}` : ''} · ${MODES[mode]?.label || mode}`,
    generatedAt: new Date().toISOString(), asOf: e.asOf, sections, citations,
  }
}

export const briefFilename = (doc, ext) => `${doc.slug || `${doc.entity?.id}-${doc.mode}-brief`}-${doc.generatedAt.slice(0, 10)}.${ext}`
