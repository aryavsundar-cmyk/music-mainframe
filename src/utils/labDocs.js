/**
 * labDocs.js — Valuation Lab deliverables on the shared block model, so the existing renderers export them to
 * Word, slides, text, Markdown, and Gamma with no changes: pitch memo · engagement workplan · IC valuation memo.
 * Every document is built from the trainee's own state and the computed model.
 */
import { ROLES } from '../data/rateCard.js'
import { fmtK, fmtM, fmtPct, fmtX, num, reviewChecks, sum } from './valuation.js'

const finish = (c, kind, label, sections, subtitle) => {
  sections.forEach((s, i) => { s.num = i + 1 })
  return { kind, entity: null, mode: kind, modeLabel: label, title: `${c.title} — ${label}`, subtitle, slug: `${c.id}-${kind}`, generatedAt: new Date().toISOString(), asOf: c.valuationDate, sections, citations: { items: [], source: 'empty' } }
}
const push = (sections) => (eyebrow, title, blocks) => { const b = blocks.filter(Boolean); if (b.length) sections.push({ eyebrow, title, blocks: b }) }
const disclaimer = (c) => ({ kind: 'note', text: c.disclaimer })

export function teamFee(team) {
  const rows = ROLES.map((r) => ({ ...r, days: num(team?.[r.id]), fees: num(team?.[r.id]) * r.dayRate })).filter((r) => r.days > 0)
  return { rows, days: sum(rows.map((r) => r.days)), fees: sum(rows.map((r) => r.fees)) }
}

export function buildPitchMemo(c, s) {
  const S = []; const add = push(S)
  const fee = teamFee(s.pitch.team)
  add('Situation · complication · resolution', 'Why Meridian needs this work', [
    { kind: 'paragraph', text: `Situation. ${s.pitch.scr.s || c.client.situation}` },
    { kind: 'paragraph', text: `Complication. ${s.pitch.scr.c || c.centralQuestion}` },
    { kind: 'paragraph', text: `Resolution. ${s.pitch.scr.r || c.client.ask}` },
  ])
  add('Client', c.client.name, [{ kind: 'paragraph', text: c.client.profile }, { kind: 'paragraph', text: c.client.ask }])
  add('Target', c.title, [{ kind: 'bullets', items: c.scope }, { kind: 'table', columns: ['Attribute', 'Fact', 'Implication'], rows: c.profile }])
  const per = c.perimeter.filter((p) => s.pitch.perimeter[p.id])
  if (per.length) add('Perimeter', 'What the buyer is acquiring', [{ kind: 'table', columns: ['Item', 'Treatment'], rows: per.map((p) => [p.text, { in: 'In perimeter', out: 'Out of perimeter', diligence: 'Depends on diligence / SPA' }[s.pitch.perimeter[p.id]]]) }])
  const qs = c.questions.filter((q) => s.pitch.questions.includes(q.id))
  if (qs.length) add('Key questions', 'What the engagement must answer', [{ kind: 'bullets', items: qs.map((q) => q.text) }, { kind: 'paragraph', text: `Central question: ${c.centralQuestion}` }])
  add('Scope', 'Workstreams', [{ kind: 'table', columns: ['Workstream', 'Lead', 'Weeks', 'Core analyses'], rows: c.workstreams.map((w) => [w.label, w.lead, `${w.weeks[0]}–${w.weeks[1]}`, w.analyses.slice(0, 3).join(' · ')]) }])
  add('Commercials', 'Team and indicative fees', [
    { kind: 'stats', items: [{ label: 'Indicative fees', value: fmtK(fee.fees) }, { label: 'Consultant days', value: String(fee.days) }, { label: 'Duration', value: '5 weeks' }, { label: 'Fee as % of ask', value: fmtPct(fee.fees / c.sellerAsk) }] },
    { kind: 'table', columns: ['Role', 'Days', 'Day rate', 'Fees'], rows: fee.rows.map((r) => [r.label, String(r.days), fmtK(r.dayRate), fmtK(r.fees)]) },
    { kind: 'note', text: 'Day rates are indicative placeholders from data/rateCard.js. Replace with the engagement rate card before sending.' },
  ])
  add('Notice', 'Practice case', [disclaimer(c)])
  return finish(c, 'pitch-memo', 'Pitch memo', S, `${c.client.name} · buy-side diligence proposal`)
}

export function buildWorkplan(c, s) {
  const S = []; const add = push(S)
  add('Workstreams', 'Who does what, when', [{ kind: 'table', columns: ['Workstream', 'Lead', 'Weeks', 'Analyses'], rows: c.workstreams.map((w) => [w.label, w.lead, `${w.weeks[0]}–${w.weeks[1]}`, w.analyses.join(' · ')]) }])
  const byP = (p) => c.irl.filter((i) => (s.plan.irl[i.id]?.priority || '—') === p)
  add('Information request list', 'Data room requests by priority', [
    { kind: 'table', columns: ['Priority', 'Request', 'Workstream', 'Status'], rows: ['P1', 'P2', 'P3', '—'].flatMap((p) => byP(p).map((i) => [p, i.text, c.workstreams.find((w) => w.id === i.ws)?.label || i.ws, s.plan.irl[i.id]?.status || 'Not yet requested'])) },
  ])
  const qs = c.questions.filter((q) => s.pitch.questions.includes(q.id))
  if (qs.length) add('Hypotheses', 'Questions and how we test them', [{ kind: 'bullets', items: qs.map((q) => q.text) }])
  add('Notice', 'Practice case', [disclaimer(c)])
  return finish(c, 'workplan', 'Engagement workplan', S, 'Five-week buy-side diligence plan')
}

export function buildValuationMemo(c, s, r) {
  const S = []; const add = push(S)
  const lo = num(s.deliver.low); const hi = num(s.deliver.high); const offer = num(s.deliver.offer)
  const checks = reviewChecks(c)
  add('Executive summary', 'Recommendation', [
    { kind: 'stats', items: [
      { label: 'Concluded range', value: lo && hi ? `${fmtM(lo)}–${fmtM(hi)}` : '—' },
      { label: 'Recommended offer', value: offer ? fmtM(offer, 2) : '—' },
      { label: 'Seller ask', value: fmtM(c.sellerAsk) },
      { label: 'DCF (corrected model)', value: `${fmtM(r.dcf.ev, 2)} · ${fmtX(r.impliedMultiple)}` },
    ] },
    { kind: 'paragraph', text: s.deliver.rationale || 'Rationale not yet written.' },
    s.pitch.scr.c ? { kind: 'paragraph', text: `Why it matters. ${s.pitch.scr.c}` } : null,
  ])
  add('Perimeter', 'What Meridian is buying', [{ kind: 'bullets', items: c.scope }])
  add('Earnings', 'Gross to net royalty receipts', [
    { kind: 'table', columns: ['Period', 'Gross', 'Participations', 'Fees', 'Reserves', 'Net cash', 'Growth'], rows: r.wf.map((y) => [y.period, fmtK(y.gross), fmtK(-y.participations), fmtK(-y.fees), fmtK(-y.reserves), fmtK(y.net), y.growth == null ? '—' : fmtPct(y.growth)]) },
    { kind: 'bullets', items: [`Three-year net CAGR ${fmtPct(r.cagr3)}.`, `Reported royalty income of ${fmtK(r.wf[r.wf.length - 1].gross)} overstates buyer-acquired cash flow; value starts from net receipts of ${fmtK(r.ltm)}.`] },
  ])
  add('Mix & concentration', 'Where the cash comes from', [
    { kind: 'table', columns: ['Stream', ...c.periods, 'LTM share', 'Quality'], rows: c.streams.map((x) => [x.label, ...x.hist.map(fmtK), fmtPct(x.hist[x.hist.length - 1] / r.ltm), x.quality]) },
    { kind: 'stats', items: [{ label: 'Top title', value: fmtPct(r.top1Share) }, { label: 'Top 10 titles', value: fmtPct(r.top10Share) }, { label: 'Spotify', value: fmtPct(c.counterparties[0].net / r.ltm) }] },
  ])
  add('Quality of earnings', `Normalised LTM ${fmtK(r.normalized)}`, [
    { kind: 'table', columns: ['Item', 'Proposed', 'Treatment', 'Applied', 'Stream'], rows: [['Reported LTM net receipts', '', '', fmtK(r.ltm), ''], ...r.norm.map((n) => [n.label, fmtK(n.amount), n.treatment, fmtK(n.applied), n.stream]), ['Normalised LTM net cash flow', '', '', fmtK(r.normalized), '']] },
    r.leakage ? { kind: 'note', text: `A ${fmtK(r.leakage)} collection-leakage deduction is applied pro rata in the forecast base.` } : null,
  ])
  add('Forecast', 'Stream-level net cash flow', [
    { kind: 'table', columns: ['Stream', 'Base', ...r.years.map(String)], rows: [...r.forecast.map((f) => [f.label, fmtK(f.base), ...f.vals.map(fmtK)]), ['Total', fmtK(r.baseTotal), ...r.totals.map(fmtK)]] },
  ])
  add('DCF', `${fmtM(r.dcf.ev, 2)} at ${r.ratePct.toFixed(2)}%`, [
    { kind: 'table', columns: ['Discount-rate component', 'Rate'], rows: [...r.rateRows.map((x) => [x.label, `${num(x.pct).toFixed(2)}%`]), ['Blended', `${r.ratePct.toFixed(2)}%`]] },
    { kind: 'table', columns: ['Year', 'Cash flow', 'Discount factor', 'PV'], rows: r.dcf.explicit.map((x) => [String(x.year), fmtK(x.cf), x.df.toFixed(3), fmtK(x.pv)]) },
    { kind: 'stats', items: [{ label: 'PV explicit', value: fmtM(r.dcf.pvExplicit, 2) }, { label: 'PV terminal', value: fmtM(r.dcf.pvTerminal, 2) }, { label: 'Terminal share', value: fmtPct(r.dcf.terminalShare) }, { label: 'Implied multiple', value: fmtX(r.impliedMultiple) }] },
    { kind: 'note', text: `Terminal: ${s.exec.terminal.method === 'finite' ? `${s.exec.terminal.years}-year finite life, ${s.exec.terminal.g}% a year from ${fmtK(r.dcf.firstCf)}` : s.exec.terminal.method === 'gordon' ? `Gordon growth at ${s.exec.terminal.g}%` : 'none'}; ${s.exec.midYear ? 'mid-year' : 'end-year'} discounting.` },
  ])
  add('Market cross-check', 'Multiples of normalised LTM', [
    { kind: 'table', columns: ['Case', 'Multiple', 'Implied value'], rows: ['Downside', 'Base', 'Upside'].map((k, i) => [k, fmtX(r.mults[i]), fmtM(r.multipleValues[i], 2)]) },
    { kind: 'note', text: 'Multiples are case assumptions for practice, not market evidence.' },
  ])
  add('Sensitivity', 'DCF value by discount rate and long-run trend', [
    { kind: 'table', columns: ['Rate \\ trend', ...r.gridTrends.map((g) => `${g > 0 ? '+' : ''}${g}%`)], rows: r.grid.map((row) => [`${row.rate}%`, ...row.cells.map((x) => fmtM(x.ev))]) },
  ])
  const findings = c.findings.filter((f) => s.exec.findings[f.id]?.severity)
  if (findings.length) add('Findings', 'Diligence findings and value protection', [{ kind: 'table', columns: ['Finding', 'Severity', 'Protection'], rows: findings.map((f) => [f.finding, s.exec.findings[f.id].severity, c.protections.find((p) => p.id === s.exec.findings[f.id].protection)?.label || '—']) }])
  add('Price', 'From rights value to cash at close', [
    { kind: 'table', columns: ['Item', 'Amount'], rows: [['Headline rights value', fmtK(r.headline)], ...r.bridge.filter((b) => b.include).map((b) => [b.label, fmtK(b.amount)]), ['Purchase price', fmtK(r.price)], ['Less: earn-out (contingent)', fmtK(-r.earnout)], [`Less: escrow (${r.escrowPct}%)`, fmtK(-r.escrow)], ['Cash at close', fmtK(r.cashAtClose)]] },
  ])
  add('Seller ask', `What must be true for ${fmtM(c.sellerAsk)}`, [{ kind: 'bullets', items: [
    `A ${fmtX(r.wmbt.multiple)} multiple of normalised LTM (case range ${fmtX(r.mults[0])}–${fmtX(r.mults[2])}).`,
    r.wmbt.rate != null ? `Or a ${fmtPct(r.wmbt.rate)} discount rate (risk-built ${r.ratePct.toFixed(2)}%).` : null,
    r.wmbt.trend != null ? `Or a long-run trend of ${r.wmbt.trend > 0 ? '+' : ''}${r.wmbt.trend.toFixed(1)}% a year (modelled ${s.exec.terminal.g}%).` : null,
    r.wmbt.uplift != null ? `Or ${fmtPct(r.wmbt.uplift - 1, 0)} higher cash flow in every forecast year.` : null,
    `Or normalised LTM of ${fmtK(r.wmbt.ltmAtBaseMultiple)} at the base multiple.`,
  ].filter(Boolean) }])
  const reviewed = checks.filter((k) => s.exec.checks[k.id]?.revealed)
  if (reviewed.length) add('Model review', 'Corrections to the inherited draft', [{ kind: 'table', columns: ['Area', 'Draft', 'Recomputed'], rows: reviewed.map((k) => [k.area, k.stated, k.computed]) }])
  add('Appendix', 'Method and sources', [{ kind: 'bullets', items: [...c.takeaways, ...c.sources.map((x) => `${x.label} — ${x.url}`)] }, disclaimer(c)])
  return finish(c, 'valuation-memo', 'IC valuation memo', S, `${c.client.name} · valuation date ${c.valuationDate}`)
}
