/**
 * carveState.js — carve-out-specific pieces of lab state: execution steps, progress items, and scorecard rows.
 * labState.js owns the shared pitch/plan logic and dispatches here by case kind.
 */
import { num } from './valuation.js'

export const CARVE_STEPS = [
  { id: 'baseline', label: 'Carve-out P&L', terms: ['carve-out', 'allocation', 'ebitda', 'margin'] },
  { id: 'revenue', label: 'Revenue quality', terms: ['arms-length', 'one-off', 'run-rate', 'pro-forma'] },
  { id: 'standalone', label: 'Standalone cost build', terms: ['standalone-cost', 'allocation', 'carve-out'] },
  { id: 'bridge', label: 'EBITDA bridge', terms: ['adjusted-ebitda', 'normalisation', 'capitalisation-policy', 'arms-length', 'standalone-cost'] },
  { id: 'separation', label: 'Separation & TSA', terms: ['tsa', 'cost-to-achieve', 'stranded-cost', 'retention'] },
  { id: 'value', label: 'Value & price', terms: ['multiple', 'enterprise-value', 'present-value', 'price-bridge'] },
  { id: 'findings', label: 'Findings & protections', terms: ['condition-precedent', 'consent', 'earn-out', 'escrow', 'working-capital'] },
  { id: 'review', label: 'Vendor pack review', terms: ['what-must-be-true', 'allocation', 'pro-forma', 'capitalisation-policy'] },
]

const filled = (t) => String(t || '').trim().length >= 40
const within = (a, target, pct, abs) => Math.abs(num(a) - target) <= Math.max(Math.abs(target) * pct, abs)

export function bridgeMatches(item, ch = {}, computedAmount) {
  const treatment = ch.treatment || item.draft
  if (treatment !== item.benchmark) return false
  if (item.benchmark !== 'partial') return true
  return within(ch.amount, (computedAmount ?? item.amount) / 2, 0.35, 0.1e6)
}

export function carveProgress(c, s) {
  const e = s.exec
  const execute = [
    ...c.functions.map((f) => num(e.functions?.[f.id]) !== f.allocation),
    ...c.bridge.map((b) => !!e.bridge[b.id]?.touched),
    ...c.separation.map((x) => e.separation?.[x.id]?.include !== undefined),
    ...c.findings.map((f) => !!(e.findings[f.id]?.severity && e.findings[f.id]?.protection)),
    ...c.checks.map((k) => !!e.checks[k.id]?.verdict),
  ]
  const d = s.deliver
  const deliver = [num(d.low) > 0, num(d.high) > 0, num(d.offer) > 0, (d.conditions || []).length > 0, filled(d.rationale)]
  return { execute, deliver }
}

export function carveScoreRows(c, s, r, b, add) {
  const e = s.exec
  const fOk = r.functions.filter((f) => within(f.standalone, f.allocation === f.standalone ? f.standalone : c.functions.find((x) => x.id === f.id).standalone, 0.15, 0.2e6))
  add('Standalone cost build', fOk.length, c.functions.length, r.functions.filter((f) => !within(f.standalone, c.functions.find((x) => x.id === f.id).standalone, 0.15, 0.2e6)).map((f) => `${f.label}: ${f.why}`))

  const bOk = r.bridge.filter((x) => bridgeMatches(x, e.bridge[x.id], x.amount))
  add('EBITDA bridge calls', bOk.length, c.bridge.length, r.bridge.filter((x) => !bridgeMatches(x, e.bridge[x.id], x.amount)).map((x) => `${x.label}: ${x.why}`))

  const sep = r.separation.filter((x) => x.include === x.benchmark)
  const tsa = r.tsa.filter((x) => Math.abs(x.months - x.benchmark) <= 3)
  add('Separation cost and TSA', sep.length + tsa.length, c.separation.length + c.tsa.length, [
    ...r.separation.filter((x) => x.include !== x.benchmark).map((x) => `${x.label}: ${x.why}`),
    ...r.tsa.filter((x) => Math.abs(x.months - x.benchmark) > 3).map((x) => `${x.label}: reviewer runs it ${x.benchmark} months. ${x.why}`),
  ])

  const v = e.valuation || {}
  const ebitdaOk = Math.abs(r.standaloneEbitda / b.standaloneEbitda - 1) <= 0.1 ? 1 : 0
  const deductOk = v.deductSeparation && v.deductTsa ? 1 : 0
  const multOk = num(v.multiple) <= c.benchmarkModel.multiples[2] ? 1 : 0
  add('Valuation discipline', ebitdaOk + deductOk + multOk, 3, [
    !ebitdaOk && `Standalone EBITDA ${(r.standaloneEbitda / 1e6).toFixed(1)}M is more than 10% from the reviewer's ${(b.standaloneEbitda / 1e6).toFixed(1)}M — check the cost build and the bridge.`,
    !deductOk && 'Deduct separation cost and the present value of transitional services from enterprise value; the buyer pays both.',
    !multOk && `A multiple above ${c.benchmarkModel.multiples[2]}x needs an argument this carve-out doesn't support.`,
  ].filter(Boolean))

  const fnd = c.findings.filter((f) => { const x = e.findings[f.id] || {}; return x.severity === f.benchmark.severity && x.protection === f.benchmark.protection })
  add('Findings → protections', fnd.length, c.findings.length, c.findings.filter((f) => { const x = e.findings[f.id] || {}; return (x.severity || x.protection) && !(x.severity === f.benchmark.severity && x.protection === f.benchmark.protection) }).map((f) => `${f.finding}: reviewer rates ${f.benchmark.severity}, "${c.protections.find((p) => p.id === f.benchmark.protection)?.label}".`))
}

export function carveConclusionRow(c, s, r, b, add) {
  const d = s.deliver
  const lo = num(d.low); const hi = num(d.high); const offer = num(d.offer)
  const conds = d.conditions || []
  const rangeOk = lo > 0 && hi > lo && offer >= lo && offer <= hi
  const levelOk = offer > 0 && Math.abs(offer / b.ev - 1) <= 0.2
  const condOk = c.benchmarkDeliver.conditions.every((k) => conds.includes(k))
  add('Enterprise value & conditions', [rangeOk, levelOk, condOk].filter(Boolean).length, 3, [
    !rangeOk && 'Set a range with low < high and a recommended enterprise value inside it.',
    !levelOk && `Your enterprise value should follow your own standalone case; the reviewer lands near ${(b.ev / 1e6).toFixed(0)}M against the ${(c.asPresented.askEv / 1e6).toFixed(0)}M guide.`,
    !condOk && `Conditions should at least cover: ${c.benchmarkDeliver.conditions.map((k) => c.protections.find((p) => p.id === k)?.label).join('; ')}.`,
  ].filter(Boolean))
}
