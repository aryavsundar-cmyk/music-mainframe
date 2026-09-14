/**
 * absDocs.js — ABS case deliverable on the shared block model: the investment committee credit memo.
 * Built from the trainee's own state and the computed ABS model, so exports never drift from the workspace.
 */
import { finish, push, disclaimer } from './labDocs.js'
import { reviewAbsChecks } from './abs.js'
import { fmtK, fmtM, fmtPct, fmtX, num } from './valuation.js'

export const REC_LABEL = { invest: 'Invest as offered', conditions: 'Invest with conditions', decline: 'Decline' }
const yr = (t) => (t == null ? '—' : `Year ${t}`)

export function buildCreditMemo(c, s, r) {
  const S = []; const add = push(S)
  const d = s.deliver
  const sev = r.scenarios.find((x) => x.id === c.targets.stressScenario)
  add('Executive summary', 'Recommendation', [
    { kind: 'stats', items: [
      { label: 'Recommendation', value: REC_LABEL[d.recommendation] || '—' },
      { label: 'Maximum Class A', value: num(d.maxA) ? fmtM(num(d.maxA), 0) : '—' },
      { label: 'Class A LTV (offered)', value: `${fmtPct(r.ltvA, 0)} vs ${fmtPct(c.asPresented.ltvA, 0)} stated` },
      { label: 'Year-1 DSCR', value: `${fmtX(r.base.dscr1, 2)} vs ${fmtX(c.asPresented.dscr, 2)} stated` },
    ] },
    { kind: 'paragraph', text: d.rationale || 'Rationale not yet written.' },
    (d.conditions || []).length ? { kind: 'bullets', items: d.conditions.map((id) => c.protections.find((p) => p.id === id)?.label).filter(Boolean) } : null,
  ])
  add('Transaction', c.title, [{ kind: 'bullets', items: c.scope }, { kind: 'table', columns: ['Attribute', 'Fact', 'Implication'], rows: c.profile }])
  add('Data tape', `${fmtM(r.tapeTotal)} tape → ${fmtM(r.normalized)} normalised`, [
    { kind: 'table', columns: ['Adjustment', 'Amount', 'Treatment', 'Applied'], rows: [['Tape LTM royalty income', '', '', fmtK(r.tapeTotal)], ...r.norm.map((n) => [n.label, fmtK(n.amount), n.treatment, fmtK(n.applied)]), ['Normalised LTM', '', '', fmtK(r.normalized)]] },
    { kind: 'table', columns: ['Period', 'Collections', 'One-offs', 'Normalised'], rows: c.history.map((h) => [h.period, fmtK(h.collections), fmtK(-h.oneOffs), fmtK(h.collections - h.oneOffs)]) },
  ])
  add('Collateral', `${fmtM(r.borrowingBase)} borrowing base`, [
    { kind: 'table', columns: ['Asset', 'Normalised', 'Eligibility', 'Excluded', 'Concentration excess', 'Credit'], rows: r.rows.map((x) => [x.label, fmtK(x.normalized), x.flag ? `${x.decision} — ${x.flag.issue}` : 'eligible', fmtK(x.excluded), fmtK(x.singleExcess), fmtK(x.eligible - x.singleExcess)]) },
    { kind: 'stats', items: [{ label: 'Eligible', value: fmtM(r.eligible) }, { label: 'Sync excess', value: fmtM(r.syncExcess, 2) }, { label: 'Non-USD excess', value: fmtM(r.nonUsdExcess, 2) }, { label: 'Borrowing base', value: fmtM(r.borrowingBase) }] },
  ])
  add('Value', `${fmtM(r.value, 0)} collateral value`, [
    { kind: 'stats', items: [{ label: 'Multiple of borrowing base', value: fmtX(r.multipleOfBase) }, { label: 'Class A LTV', value: fmtPct(r.ltvA, 0) }, { label: 'All notes LTV', value: fmtPct(r.ltvTotal, 0) }, { label: 'Sponsor appraisal', value: fmtM(c.asPresented.appraisal, 0) }] },
    { kind: 'note', text: `${s.exec.value.rate}% discount rate over ${s.exec.value.life} years; trend ${s.exec.cf.trend}% a year; ${s.exec.cf.servicing}% servicing fee and ${fmtM(num(s.exec.cf.expenses), 2)} senior expenses deducted.` },
  ])
  add('Waterfall', `Year-1 DSCR ${fmtX(r.base.dscr1, 2)}`, [
    { kind: 'table', columns: ['Year', 'Available', 'A interest', 'A principal', 'B interest', 'DSCR', 'Status', 'A balance', 'B balance'], rows: r.base.rows.slice(0, 12).map((x) => [String(x.t), fmtK(x.available), fmtK(x.aIntPaid), fmtK(x.aSchedPaid + x.aSweep), fmtK(x.bIntPaid), x.dscr == null ? '—' : fmtX(x.dscr, 2), x.status, fmtK(x.aBal), fmtK(x.bBal)]) },
    { kind: 'bullets', items: [`First cash trap: ${yr(r.base.firstTrap)}. First rapid amortisation: ${yr(r.base.firstRapid)}.`, `Class A outstanding at ARD: ${fmtM(r.base.aAtArd)}; repaid ${yr(r.base.aRepaidYear)}.`, `Reserve ${fmtM(num(s.exec.notes.reserve), 1)} covers ${r.reserveMonths.toFixed(1)} months of scheduled debt service.`] },
  ])
  add('Stress', `${sev.label}: ${sev.aLoss > 1000 ? `Class A loss ${fmtM(sev.aLoss)}` : 'Class A repaid'}`, [
    { kind: 'table', columns: ['Scenario', 'Haircut', 'Trend change', 'FX', 'Year-1 DSCR', 'First trap', 'Class A repaid', 'Class A loss', 'Class B shortfall'], rows: [{ label: 'Base', shock: 0, trendDelta: 0, fx: 0, ...r.base }, ...r.scenarios].map((x) => [x.label, `${x.shock}%`, `${x.trendDelta} pts`, `${x.fx}%`, fmtX(x.dscr1, 2), yr(x.firstTrap), yr(x.aRepaidYear), fmtM(x.aLoss), fmtM(x.bLoss)]) },
    { kind: 'stats', items: [
      { label: 'Haircut to trip cash trap in year 1', value: r.breakeven.trapYear1 == null ? 'n/a' : `${r.breakeven.trapYear1.toFixed(0)}%` },
      { label: 'Haircut to first Class B shortfall', value: r.breakeven.bLoss == null ? 'n/a' : `${r.breakeven.bLoss.toFixed(0)}%` },
      { label: 'Haircut to first Class A loss', value: r.breakeven.aLoss == null ? 'n/a' : `${r.breakeven.aLoss.toFixed(0)}%` },
      { label: 'Maximum Class A (model)', value: fmtM(r.maxA, 0) },
    ] },
    { kind: 'note', text: `Maximum Class A meets all three tests: year-1 DSCR ≥ ${fmtX(c.targets.dscr, 2)}, Class A LTV ≤ ${c.targets.ltvA}%, and no Class A loss in the ${sev.label.toLowerCase()} scenario, with Class B held as offered.` },
  ])
  const findings = c.findings.filter((f) => s.exec.findings[f.id]?.severity)
  if (findings.length) add('Findings', 'Findings and structural protections', [{ kind: 'table', columns: ['Finding', 'Severity', 'Protection'], rows: findings.map((f) => [f.finding, s.exec.findings[f.id].severity, c.protections.find((p) => p.id === s.exec.findings[f.id].protection)?.label || '—']) }])
  const reviewed = reviewAbsChecks(c).filter((k) => s.exec.checks[k.id]?.revealed)
  if (reviewed.length) add('Offering review', 'Corrections to the offering figures', [{ kind: 'table', columns: ['Area', 'Offering', 'Recomputed'], rows: reviewed.map((k) => [k.area, k.stated, k.computed]) }])
  add('Appendix', 'Method', [{ kind: 'bullets', items: c.takeaways }, disclaimer(c)])
  return finish(c, 'credit-memo', 'Investment committee credit memo', S, `${c.client.name} · pricing ${c.pricingDate}`)
}
