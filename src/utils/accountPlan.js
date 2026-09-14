/**
 * accountPlan.js — buildAccountPlan(entityId, { citations }) → doc (same block model as brief.js).
 * Structure follows SCR (situation · complication · resolution) with MECE section groups:
 * Snapshot · SCR summary · Stakeholders · Opportunity matrix · Roadmap · KPIs · Money · Movement · Sources.
 */
import { getEntityProfile, getEntity, getParentChain, getChildren, getBackers, getBackedBy, ENTITY_TYPES, TIERS, OWNERSHIP } from '../data/entities.js'
import { getTransactionsForEntity, TX_TYPES, partyName } from '../data/transactions.js'
import { getConsultingContext, CLIENT_CATEGORIES, SERVICE_LINES, SERVICE_ORDER } from '../data/consulting.js'
import { hubLinks } from '../data/siblings.js'
import { CITATION_FALLBACK } from './newsCitations.js'
import { formatMoney, formatCount, formatDate, currencySymbol } from './format.js'

const money = (v, cur = 'USD') => formatMoney(v, { currency: currencySymbol(cur), digits: 2 })
const list = (xs) => (xs && xs.length ? xs.join(', ') : '—')

export function buildAccountPlan(entityId, { citations = { items: [], source: 'unavailable' } } = {}) {
  const e = getEntityProfile(entityId)
  const type = ENTITY_TYPES[e.type] || { label: e.type }
  const ctx = getConsultingContext(e.id)
  const cats = ctx.categories.length ? ctx.categories : CLIENT_CATEGORIES.filter((c) => c.id === 'label-sponsors').slice(0, 0)
  const deals = getTransactionsForEntity(e.id)
  const chain = getParentChain(e.id); const kids = getChildren(e.id); const backers = getBackers(e.id); const backs = getBackedBy(e.id)
  const counterparties = [...new Set(deals.flatMap((t) => [...t.acquirers, ...t.sellers].map(partyName)))].filter((n) => n !== e.name)
  const m = e.metrics
  const sections = []
  const add = (eyebrow, title, blocks) => { const b = blocks.filter(Boolean); if (b.length) sections.push({ eyebrow, title, blocks: b }) }

  // Situation
  const situation = [e.summary, m.revenue ? `Revenue ${m.revenueYear || ''}: ${money(m.revenue, m.revenueCurrency)}.` : '', m.subscribers ? `${formatCount(m.subscribers)} paid subscribers (${m.metricsAsOf || 'latest'}).` : '', m.catalogSize ? `Catalog of ${formatCount(m.catalogSize)} songs.` : ''].filter(Boolean).join(' ')
  // Complication: category triggers + recent deal types + news topics
  const recentDeals = deals.slice(0, 3)
  const topicCounts = citations.items.flatMap((c) => c.topics).reduce((acc, t) => ((acc[t] = (acc[t] || 0) + 1), acc), {})
  const topTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t)
  const complication = [
    cats.length ? `As a ${cats.map((c) => c.label.toLowerCase()).join(' and ')} account, the live engagement triggers are: ${cats.flatMap((c) => c.triggers).slice(0, 4).join('; ')}.` : 'No consulting category is mapped for this entity yet; triggers below are generic.',
    recentDeals.length ? `Recent transactions: ${recentDeals.map((t) => `${t.title} (${formatDate(t.date)}${t.value ? `, ${formatMoney(t.value)}` : ''})`).join('; ')}.` : '',
    topTopics.length ? `Live coverage in the last two weeks clusters on ${topTopics.join(', ')}.` : '',
  ].filter(Boolean).join(' ')
  const resolution = ctx.hypotheses.length ? `Lead with ${ctx.hypotheses.map((h) => `${SERVICE_LINES[h.line].label.toLowerCase()} (${h.text.split(':')[0].toLowerCase()})`).join('; ')}.` : 'Open with a diligence-style diagnostic to establish the baseline.'

  add('Snapshot', e.name, [
    { kind: 'facts', rows: [
      ['Type', `${type.label}${e.subtype ? ` · ${e.subtype}` : ''}`], ['Tier', TIERS[e.tier] || '—'], ['Ownership', `${OWNERSHIP[e.ownership] || e.ownership}${e.ticker ? ` · ${e.ticker}` : ''}`],
      ['Headquarters', e.hq || '—'], ['Region', e.region || '—'], ['Client categories', list(cats.map((c) => c.label))],
    ] },
    hubLinks(e.id).length ? { kind: 'bullets', items: hubLinks(e.id).map((l) => `Also in Intelligence Hub — ${l.label.replace(' · Intelligence Hub', '')}: ${l.url}`) } : null,
  ])
  add('Summary', 'Situation · complication · resolution', [
    { kind: 'paragraph', text: `Situation. ${situation}` },
    { kind: 'paragraph', text: `Complication. ${complication}` },
    { kind: 'paragraph', text: `Resolution. ${resolution}` },
  ])
  add('Stakeholders', 'Who decides and who influences', [
    { kind: 'facts', rows: [
      ['Parent chain', chain.length ? chain.map((p) => p.name).join(' → ') : 'independent'],
      ['Subsidiaries', list(kids.map((k) => k.name))],
      ['Capital behind it', list(backers.map((b) => b.name))],
      ['Capital it backs', list(backs.map((b) => b.name))],
      ['Deal counterparties', list(counterparties.slice(0, 10))],
    ] },
    { kind: 'note', text: 'Add named executives and sponsor deal-team contacts before circulating; the data model carries organisations, not people.' },
  ])
  if (cats.length) add('Opportunity', 'Category × service-line matrix', [
    { kind: 'table', columns: ['Category', ...SERVICE_ORDER.map((l) => SERVICE_LINES[l].short)], rows: cats.map((c) => [c.label, ...SERVICE_ORDER.map((l) => String((c.engagements[l] || []).length))]) },
    { kind: 'bullets', items: ctx.hypotheses.map((h) => `${SERVICE_LINES[h.line].label} — ${h.text}`) },
  ])
  const lines = [...new Set(ctx.hypotheses.map((h) => h.line))]
  add('Roadmap', '30 · 60 · 90 days', [
    { kind: 'table', columns: ['Window', 'Objective', 'Actions'], rows: [
      ['Days 1–30', 'Access and baseline', `Executive meeting on the SCR above; data request (${lines.map((l) => SERVICE_LINES[l].label.toLowerCase()).join(', ') || 'diagnostic'} scope); map sponsor and board calendar against triggers`],
      ['Days 31–60', 'Prove the hypothesis', `Short diagnostic on the lead hypothesis; quantify with the KPIs below; align with ${backers[0]?.name || 'the capital partner'} where relevant`],
      ['Days 61–90', 'Convert', `Proposal for the first engagement (${lines[0] ? SERVICE_LINES[lines[0]].label.toLowerCase() : 'diligence'}); steering cadence; success metrics agreed`],
    ] },
  ])
  if (cats.length) add('Metrics', 'KPIs a deal team will ask for', [{ kind: 'bullets', items: [...new Set(cats.flatMap((c) => c.kpis))] }])
  if (deals.length) add('Money', 'Transactions on file', [
    { kind: 'table', columns: ['Date', 'Deal', 'Type', 'Value'], rows: deals.slice(0, 12).map((t) => [formatDate(t.date), t.title, TX_TYPES[t.type]?.label || t.type, t.value ? formatMoney(t.value, { digits: 2 }) : t.valueNote || '—']) },
  ])
  add('Movement', 'In the news', [
    citations.items.length ? { kind: 'table', columns: ['Date', 'Source', 'Headline'], rows: citations.items.map((c) => [formatDate(c.publishedAt.slice(0, 10)), c.source, c.title]) } : { kind: 'note', text: CITATION_FALLBACK[citations.source] || CITATION_FALLBACK.unavailable },
    citations.items.length ? { kind: 'bullets', items: citations.items.map((c) => c.url) } : null,
  ])
  add('Sources', 'Provenance', [{ kind: 'bullets', items: e.sources.map((s) => `${s.label} — ${s.url}`) }, { kind: 'note', text: `Record as of ${e.asOf}. Generated by Mainframe · Music.` }])

  sections.forEach((s, i) => { s.num = i + 1 })
  return { kind: 'account-plan', entity: e, mode: 'account-plan', modeLabel: 'Account plan', title: e.name, subtitle: `${type.label} · Account plan`, slug: `${e.id}-account-plan`, generatedAt: new Date().toISOString(), asOf: e.asOf, sections, citations }
}

export const getEntityForPlan = getEntity
