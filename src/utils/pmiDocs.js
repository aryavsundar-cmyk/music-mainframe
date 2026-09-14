/**
 * pmiDocs.js — PMI case deliverable on the shared block model: the 100-day integration board memo.
 * Built from the trainee's own state and the computed PMI model, so exports never drift from the workspace.
 */
import { finish, push, disclaimer } from './labDocs.js'
import { reviewPmiChecks } from './pmi.js'
import { fmtK, fmtM, fmtPct, fmtX, num } from './valuation.js'

const WHEN = { day1: 'Day 1', day100: 'Day 100', year1: 'Year 1' }
const phase = (p) => p.map((x) => `${num(x)}%`).join(' / ')

export function buildBoardMemo(c, s, r) {
  const S = []; const add = push(S)
  const target = num(s.deliver.target); const budget = num(s.deliver.budget)
  add('Executive summary', 'Board recommendation', [
    { kind: 'stats', items: [
      { label: 'Committed run-rate synergies', value: target ? fmtM(target) : '—' },
      { label: 'One-off budget', value: budget ? fmtM(budget) : '—' },
      { label: 'Synergy NPV (risk-weighted)', value: fmtM(r.npv) },
      { label: 'Premium coverage', value: `${fmtX(r.npvCoverage, 2)} of ${fmtM(r.premium, 0)}` },
    ] },
    { kind: 'paragraph', text: s.deliver.rationale || 'Rationale not yet written.' },
    s.pitch.scr.c ? { kind: 'paragraph', text: `Why it matters. ${s.pitch.scr.c}` } : null,
  ])
  add('Deal', c.title, [
    { kind: 'facts', rows: [['Price', fmtM(c.deal.price, 0)], ['Standalone value', fmtM(c.deal.standalone, 0)], ['Premium to earn', fmtM(c.deal.premium, 0)], ['Deal multiple', fmtX(c.deal.dealMultiple)]] },
    { kind: 'bullets', items: c.scope },
  ])
  add('Synergy register', `${fmtM(r.runRate)} gross run rate · ${fmtM(r.runRateWeighted)} risk-weighted`, [
    { kind: 'table', columns: ['Lever', 'Run rate', 'Phasing Y1–Y4', 'One-off', 'Probability', 'Status'], rows: r.levers.map((l) => [l.label, fmtK(l.rr), phase(l.phasing), fmtK(l.oneOff), `${l.prob}%`, l.status === 'reject' ? 'Rejected' : l.backlog ? `Kept · ${fmtK(l.backlog)} backlog once` : 'Kept']) },
    { kind: 'note', text: `Banker case: ${fmtM(c.asPresented.runRate)} run rate capitalised at ${fmtX(c.asPresented.capMultiple)} = ${fmtM(c.asPresented.value, 0)}.` },
  ])
  add('Costs to achieve', `${fmtM(r.oneOffBudget)} one-off · ${fmtX(r.costToAchieve, 2)} run rate`, [
    { kind: 'table', columns: ['Item', 'Amount', 'Included'], rows: [
      ...r.levers.filter((l) => l.oneOff).map((l) => [`${l.label} (lever one-off)`, fmtK(l.oneOff), 'Yes']),
      ...r.oneOffs.map((o) => [o.kind === 'tsa' ? `${o.label} (${o.months} months)` : o.label, o.kind === 'wc' ? `${fmtK(-o.amount)} Y1 / ${fmtK(o.amount)} Y2` : fmtK(o.amount), o.include ? 'Yes' : 'No']),
    ] },
    { kind: 'table', columns: ['Dis-synergy', 'Run rate', 'Included'], rows: r.dis.map((d) => [d.label, fmtK(d.rr), d.include ? 'Yes' : 'No']) },
  ])
  add('Synergy value', `${fmtM(r.npv)} at ${r.ratePct}%`, [
    { kind: 'table', columns: ['Year', 'Synergies', 'Backlog', 'Dis-synergies', 'Costs', 'Working capital', 'Net', 'Cumulative'], rows: r.annual.map((a) => [`Y${a.t}`, fmtK(a.recurring), fmtK(a.backlog), fmtK(a.dis), fmtK(a.costs), fmtK(a.wc), fmtK(a.net), fmtK(a.cumulative)]) },
    { kind: 'stats', items: [
      { label: 'PV explicit', value: fmtM(r.pvExplicit) }, { label: 'PV terminal', value: fmtM(r.pvTerminal) },
      { label: 'Downside / upside', value: `${fmtM(r.downside)} / ${fmtM(r.upside)}` }, { label: 'Cash break-even', value: r.breakEven ? `Year ${r.breakEven}` : 'Not in horizon' },
    ] },
    { kind: 'bullets', items: [
      r.wmbt.scale != null ? `To cover the premium exactly, delivered synergies must be ${fmtPct(r.wmbt.scale, 0)} of the register.` : null,
      r.wmbt.rate != null ? `Or the discount rate must be ${fmtPct(r.wmbt.rate)} (modelled ${r.ratePct}%).` : null,
      `Terminal: ${s.exec.valuation.terminal === 'perpetuity' ? `perpetuity at ${r.g}% a year` : 'none'}; ${r.riskWeight ? 'probability-weighted synergies' : 'synergies not risk-weighted'}; pre-tax, year-end.`,
    ].filter(Boolean) },
  ])
  const d1 = c.day1.filter((d) => s.exec.day1[d.id])
  if (d1.length) add('Day 1', 'Integration sequencing', [{ kind: 'table', columns: ['When', 'Action'], rows: ['day1', 'day100', 'year1'].flatMap((w) => d1.filter((d) => s.exec.day1[d.id] === w).map((d) => [WHEN[w], d.text])) }])
  add('People', `${fmtK(r.keyBonus)} key-person retention · ${fmtM(r.npsAtRisk, 2)} NPS at risk`, [
    { kind: 'table', columns: ['Role', 'Holds', 'NPS', 'Decision', 'Expected NPS lost'], rows: r.people.map((p) => [p.role, p.holds, p.nps ? fmtM(p.nps) : '—', p.decision || 'Unmanaged', p.nps ? fmtK(p.npsAtRisk) : '—']) },
  ])
  const risks = c.risks.filter((k) => s.exec.risks[k.id]?.severity)
  if (risks.length) add('Risks', 'Risks and mitigations', [{ kind: 'table', columns: ['Risk', 'Severity', 'Mitigation'], rows: risks.map((k) => [k.risk, s.exec.risks[k.id].severity, c.mitigations.find((m) => m.id === s.exec.risks[k.id].mitigation)?.label || '—']) }])
  const reviewed = reviewPmiChecks(c).filter((k) => s.exec.checks[k.id]?.revealed)
  if (reviewed.length) add('Synergy case review', 'Corrections to the banker case', [{ kind: 'table', columns: ['Area', 'Banker case', 'Re-based'], rows: reviewed.map((k) => [k.area, k.stated, k.computed]) }])
  add('Appendix', 'Method', [{ kind: 'bullets', items: c.takeaways }, disclaimer(c)])
  return finish(c, 'board-memo', '100-day integration board memo', S, `${c.client.name} · close ${c.closeDate}`)
}
