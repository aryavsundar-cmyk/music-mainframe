/**
 * absState.js — ABS-specific pieces of lab state: execution steps, progress items, and scorecard rows.
 * labState.js owns the shared pitch/plan logic and dispatches here by case kind.
 */
import { num } from './valuation.js'
import { collateral, waterfall } from './abs.js'

export const ABS_STEPS = [
  { id: 'tape', label: 'Data tape tie-out', terms: ['securitisation', 'normalisation', 'one-off', 'pro-forma', 'net-receipts'] },
  { id: 'eligibility', label: 'Eligibility screen', terms: ['eligibility', 'consent', 'reversion', 'chain-of-title'] },
  { id: 'concentration', label: 'Concentration limits', terms: ['concentration-limit', 'concentration', 'eligibility'] },
  { id: 'cashflow', label: 'Collateral cash flow', terms: ['waterfall', 'servicer', 'decay', 'forecast'] },
  { id: 'value', label: 'Collateral value & LTV', terms: ['appraisal', 'dcf', 'ltv', 'advance-rate', 'discount-rate'] },
  { id: 'waterfall', label: 'Waterfall & triggers', terms: ['waterfall', 'dscr', 'cash-trap', 'ard', 'reserve-account'] },
  { id: 'stress', label: 'Stress & break-evens', terms: ['break-even', 'sensitivity', 'probability-weighting', 'dscr'] },
  { id: 'findings', label: 'Findings & protections', terms: ['condition-precedent', 'escrow', 'servicer', 'eligibility'] },
  { id: 'review', label: 'Offering review', terms: ['what-must-be-true', 'pro-forma', 'ltv'] },
]

const filled = (t) => String(t || '').trim().length >= 40
export const KEY_CONDITIONS = ['downsize', 'eligibility', 'reserve', 'cp']

export function absProgress(c, s) {
  const e = s.exec
  const execute = [
    ...c.normalization.map((n) => !!e.norm[n.id]?.touched),
    ...c.eligibility.map((x) => !!e.elig[x.id]),
    !!e.limits?.apply,
    ...c.findings.map((f) => !!(e.findings[f.id]?.severity && e.findings[f.id]?.protection)),
    ...c.checks.map((k) => !!e.checks[k.id]?.verdict),
  ]
  const d = s.deliver
  const deliver = [!!d.recommendation, num(d.maxA) > 0, (d.conditions || []).length > 0, filled(d.rationale)]
  return { execute, deliver }
}

export function absScoreRows(c, s, r, b, add) {
  const e = s.exec
  const nOk = c.normalization.filter((n) => (e.norm[n.id]?.treatment || n.draft) === n.benchmark)
  add('Tape normalisation calls', nOk.length, c.normalization.length, c.normalization.filter((n) => (e.norm[n.id]?.treatment || n.draft) !== n.benchmark).map((n) => `${n.label}: ${n.why}`))

  const eOk = c.eligibility.filter((x) => (e.elig[x.id] || 'eligible') === x.benchmark)
  add('Eligibility screen', eOk.length, c.eligibility.length, c.eligibility.filter((x) => (e.elig[x.id] || 'eligible') !== x.benchmark).map((x) => `${x.issue}: ${x.why}`))

  add('Concentration limits applied', e.limits?.apply ? 1 : 0, 1, e.limits?.apply ? [] : ['Apply the indenture limits to the eligible pool; excess concentrations get no credit.'])

  const cf = e.cf || {}; const bm = c.benchmarkModel.cf
  const feesOk = Math.abs(num(cf.servicing) - bm.servicing) <= 2 && num(cf.expenses) > 0 ? 1 : 0
  const trendOk = num(cf.trend) <= -0.5 && num(cf.trend) >= -2.5 ? 1 : 0
  const valueOk = Math.abs(r.value / b.value - 1) <= 0.1 ? 1 : 0
  add('Collateral cash flow and value', feesOk + trendOk + valueOk, 3, [
    !feesOk && `Deduct the servicing fee (about ${bm.servicing}%) and senior expenses before debt service.`,
    !trendOk && 'Set the trend from normalised history (about −1% a year), not the sponsor\'s flat case.',
    !valueOk && `Your collateral value ${(r.value / 1e6).toFixed(0)}M is more than 10% from the reviewer's ${(b.value / 1e6).toFixed(0)}M.`,
  ].filter(Boolean))

  // scored at the offered structure, so exploring other note sizes in the workspace costs nothing
  const offered = { ...e, notes: c.structure.notes, triggers: c.structure.triggers }
  const col = collateral(c, offered)
  const severe = c.scenarios.find((y) => y.id === c.targets.stressScenario)
  const mine = { base: waterfall(c, offered, col), severe: waterfall(c, offered, col, severe) }
  const sevB = b.scenarios.find((y) => y.id === c.targets.stressScenario)
  const dscrOk = b.base.dscr1 && mine.base.dscr1 && Math.abs(mine.base.dscr1 / b.base.dscr1 - 1) <= 0.05 ? 1 : 0
  const lossOk = (mine.severe.aLoss > 1000) === (sevB.aLoss > 1000) ? 1 : 0
  add('Waterfall and stress (offered structure)', dscrOk + lossOk, 2, [
    !dscrOk && `Year-1 DSCR on the offered notes ${mine.base.dscr1?.toFixed(2)}x vs the reviewer's ${b.base.dscr1?.toFixed(2)}x — check the collateral base, fees, and trend.`,
    !lossOk && `In the ${severe.label.toLowerCase()} scenario the reviewer's model ${sevB.aLoss > 1000 ? 'shows a Class A loss' : 'repays Class A'} on the offered notes; yours doesn't.`,
  ].filter(Boolean))

  const fOk = c.findings.filter((f) => { const x = e.findings[f.id] || {}; return x.severity === f.benchmark.severity && x.protection === f.benchmark.protection })
  add('Findings → protections', fOk.length, c.findings.length, c.findings.filter((f) => { const x = e.findings[f.id] || {}; return (x.severity || x.protection) && !(x.severity === f.benchmark.severity && x.protection === f.benchmark.protection) }).map((f) => `${f.finding}: reviewer rates ${f.benchmark.severity}, "${c.protections.find((p) => p.id === f.benchmark.protection)?.label}".`))
}

export function absConclusionRow(c, s, r, b, add) {
  const d = s.deliver
  const recOk = d.recommendation === c.benchmarkDeliver.recommendation
  const maxA = num(d.maxA)
  const sizeOk = maxA > 0 && Math.abs(maxA / b.maxA - 1) <= 0.15
  const conds = d.conditions || []
  const condOk = KEY_CONDITIONS.every((k) => conds.includes(k))
  add('Credit recommendation', [recOk, sizeOk, condOk].filter(Boolean).length, 3, [
    !recOk && 'The collateral is real but the offered size isn\'t supported: invest with conditions, not a clean yes or a no.',
    !sizeOk && `Size Class A from your own tests; the reviewer's maximum is about ${(b.maxA / 1e6).toFixed(0)}M.`,
    !condOk && `Conditions should at least cover: ${KEY_CONDITIONS.map((k) => c.protections.find((p) => p.id === k)?.label).join('; ')}.`,
  ].filter(Boolean))
}
