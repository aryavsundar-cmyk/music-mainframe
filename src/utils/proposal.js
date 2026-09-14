/**
 * proposal.js — buildProposal(entityId, { categoryId, lines, rates, weeksOverride, citations }) → doc.
 * SCR executive summary, then MECE sections: Understanding · Objectives · Scope & workstreams · Approach &
 * timeline · Team · Commercials (indicative) · Capabilities · Risks · Next steps · Appendix · Sources.
 * Commercials use src/data/rateCard.js defaults unless `rates`/`staffing` are passed from the builder UI.
 */
import { getEntityProfile, ENTITY_TYPES, getBackers } from '../data/entities.js'
import { getTransactionsForEntity, TX_TYPES } from '../data/transactions.js'
import { getCategory, getConsultingContext, SERVICE_LINES, SERVICE_ORDER } from '../data/consulting.js'
import { ROLES, STAFFING, PHASES, WORKSTREAM_TEMPLATES } from '../data/rateCard.js'
import { CITATION_FALLBACK } from './newsCitations.js'
import { formatMoney, formatDate } from './format.js'

/** Compute the indicative commercial model for a set of lines. Exported so the UI can show it live. */
export function estimateCommercials({ lines, rates = ROLES, staffing = STAFFING, weeksOverride = null }) {
  const perLine = lines.map((line) => {
    const s = staffing[line] || STAFFING[line]
    const weeks = weeksOverride || s.weeks
    const rows = rates.map((r) => { const dpw = s.team[r.id] || 0; const days = dpw * weeks; return { role: r.label, dpw, days, rate: r.dayRate, fees: days * r.dayRate } }).filter((r) => r.days > 0)
    return { line, weeks, rows, fees: rows.reduce((a, r) => a + r.fees, 0), days: rows.reduce((a, r) => a + r.days, 0) }
  })
  const total = perLine.reduce((a, l) => a + l.fees, 0)
  const weeks = weeksOverride || Math.max(...perLine.map((l) => l.weeks), 0)
  return { perLine, total, low: total * 0.9, high: total * 1.15, weeks, days: perLine.reduce((a, l) => a + l.days, 0) }
}

export function buildProposal(entityId, { categoryId = '', lines = [], rates = ROLES, staffing = STAFFING, weeksOverride = null, citations = { items: [], source: 'unavailable' } } = {}) {
  const e = getEntityProfile(entityId)
  const type = ENTITY_TYPES[e.type] || { label: e.type }
  const ctx = getConsultingContext(e.id)
  const cat = getCategory(categoryId) || ctx.categories[0] || null
  const chosen = (lines.length ? lines : [...new Set(ctx.hypotheses.map((h) => h.line))].slice(0, 2)).filter((l) => SERVICE_LINES[l])
  const active = chosen.length ? chosen : ['diligence']
  const hyps = active.map((line) => ({ line, items: cat ? (cat.engagements[line] || []) : [] }))
  const comm = estimateCommercials({ lines: active, rates, staffing, weeksOverride })
  const deals = getTransactionsForEntity(e.id)
  const backers = getBackers(e.id)
  const sections = []
  const add = (eyebrow, title, blocks) => { const b = blocks.filter(Boolean); if (b.length) sections.push({ eyebrow, title, blocks: b }) }
  const lineLabels = active.map((l) => SERVICE_LINES[l].label)

  add('Executive summary', `A ${lineLabels.join(' and ').toLowerCase()} engagement for ${e.name}`, [
    { kind: 'paragraph', text: `Situation. ${e.summary}` },
    { kind: 'paragraph', text: `Complication. ${cat ? cat.thesis : 'The music rights and capital markets are consolidating faster than most operating models.'}${deals[0] ? ` Most recently: ${deals[0].title} (${formatDate(deals[0].date)}).` : ''}` },
    { kind: 'paragraph', text: `Resolution. A&M PEPI proposes a ${comm.weeks}-week ${lineLabels.join(' and ').toLowerCase()} engagement${hyps[0]?.items[0] ? `, opening with: ${hyps[0].items[0]}` : ''}. Indicative fees ${formatMoney(comm.low)}–${formatMoney(comm.high)}, subject to scoping.` },
  ])
  add('Our understanding', 'Where you are', [
    { kind: 'facts', rows: [['Client', e.name], ['Category', cat ? cat.label : '—'], ['Capital partners', backers.length ? backers.map((b) => b.name).join(', ') : '—'], ['Engagement triggers observed', cat ? cat.triggers.slice(0, 3).join('; ') : '—']] },
    citations.items.length ? { kind: 'bullets', items: citations.items.slice(0, 4).map((c) => `${formatDate(c.publishedAt.slice(0, 10))} · ${c.source}: ${c.title}`) } : { kind: 'note', text: CITATION_FALLBACK[citations.source] || CITATION_FALLBACK.unavailable },
  ])
  add('Objectives', 'What success looks like', [
    { kind: 'bullets', items: hyps.flatMap((h) => h.items.map((t) => `${SERVICE_LINES[h.line].label}: ${t}`)) },
    cat ? { kind: 'bullets', items: cat.kpis.map((k) => `Measured by: ${k}`) } : null,
  ])
  add('Scope', 'Workstreams', hyps.map((h) => {
    const t = WORKSTREAM_TEMPLATES[h.line]
    return { kind: 'table', columns: [SERVICE_LINES[h.line].label, 'Detail'], rows: [
      ['Hypothesis', h.items.join(' · ') || SERVICE_LINES[h.line].blurb],
      ['Activities', t.activities.join(' · ')],
      ['Deliverables', t.deliverables.join(' · ')],
      ['Duration', `${(staffing[h.line] || STAFFING[h.line]).weeks} weeks`],
    ] }
  }))
  add('Approach', 'Phases and timeline', [
    { kind: 'table', columns: ['Phase', 'Weeks', 'Focus'], rows: PHASES.map((p) => [p.label, String(Math.max(1, Math.round(p.share * comm.weeks))), p.text]) },
    { kind: 'note', text: 'Weekly steering with the sponsor deal team; fortnightly readouts to the board or investment committee as required.' },
  ])
  add('Team', 'Staffing (indicative)', [
    { kind: 'table', columns: ['Workstream', 'Role', 'Days / week', 'Days', 'Day rate', 'Fees'], rows: comm.perLine.flatMap((l) => l.rows.map((r) => [SERVICE_LINES[l.line].label, r.role, String(r.dpw), String(Math.round(r.days)), formatMoney(r.rate, { full: true }), formatMoney(r.fees, { digits: 2 })])) },
  ])
  add('Commercials', 'Indicative fees', [
    { kind: 'stats', items: [{ label: 'Indicative range', value: `${formatMoney(comm.low)}–${formatMoney(comm.high)}` }, { label: 'Base estimate', value: formatMoney(comm.total, { digits: 2 }) }, { label: 'Duration', value: `${comm.weeks} weeks` }, { label: 'Consultant days', value: String(Math.round(comm.days)) }] },
    { kind: 'note', text: 'Day rates and staffing are placeholders from src/data/rateCard.js — replace with the engagement rate card before sending. Expenses at cost. Fixed-fee or success-fee structures available for diligence and value-creation work.' },
  ])
  add('Capabilities', 'Why A&M PEPI', [
    { kind: 'bullets', items: [
      ...active.map((l) => `${SERVICE_LINES[l].label}: ${SERVICE_LINES[l].blurb}`),
      cat ? `${cat.label} focus: ${cat.description}` : null,
      'Operator-led teams: former label, publisher, society, and DSP executives alongside PEPI deal professionals.',
      'One canvas: this proposal is built from the same entity, transaction, PRO, and DSP data that drives the live intelligence platform.',
    ].filter(Boolean) },
  ])
  add('Risks', 'Risks, dependencies, assumptions', [
    { kind: 'bullets', items: [
      'Data access: royalty statements, society registrations, and contracts are needed within the first two weeks.',
      'Counterparty timing: society and DSP cycles can delay validation; we plan around them.',
      cat?.topics.includes('litigation') ? 'Litigation and regulatory timelines may move scope; we ring-fence legal workstreams.' : 'Scope changes are handled through a change note agreed at steering.',
      'Assumes a single sponsor point of contact and weekly access to the management team.',
    ] },
  ])
  add('Next steps', 'To proceed', [{ kind: 'bullets', items: ['Confirm scope and lines in a 45-minute working session', 'Agree data request and access list', 'Sign engagement letter; mobilise within five working days'] }])
  add('Appendix', 'Supporting data', [
    deals.length ? { kind: 'table', columns: ['Date', 'Deal', 'Type', 'Value'], rows: deals.slice(0, 10).map((t) => [formatDate(t.date), t.title, TX_TYPES[t.type]?.label || t.type, t.value ? formatMoney(t.value, { digits: 2 }) : t.valueNote || '—']) } : null,
    citations.items.length ? { kind: 'bullets', items: citations.items.map((c) => c.url) } : null,
  ])
  add('Sources', 'Provenance', [{ kind: 'bullets', items: e.sources.map((s) => `${s.label} — ${s.url}`) }, { kind: 'note', text: `Record as of ${e.asOf}. Generated by Mainframe · Music.` }])

  sections.forEach((s, i) => { s.num = i + 1 })
  return { kind: 'proposal', entity: e, category: cat, lines: active, commercials: comm, mode: 'proposal', modeLabel: 'Proposal', title: `${e.name} — ${lineLabels.join(' & ')}`, subtitle: `${type.label}${cat ? ` · ${cat.label}` : ''} · A&M PEPI proposal`, slug: `${e.id}-proposal-${active.join('-')}`, generatedAt: new Date().toISOString(), asOf: e.asOf, sections, citations }
}

export const PROPOSAL_LINES = SERVICE_ORDER
