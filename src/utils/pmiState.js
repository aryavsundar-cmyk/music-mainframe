/**
 * pmiState.js — PMI-specific pieces of lab state: execution steps, progress items, and scorecard rows.
 * labState.js owns the shared pitch/plan logic and dispatches here by case kind.
 */
import { leverMatches } from './pmi.js'
import { num } from './valuation.js'

export const PMI_STEPS = [
  { id: 'baseline', label: 'Deal & cost baseline' },
  { id: 'register', label: 'Synergy register' },
  { id: 'costs', label: 'Dis-synergies & one-offs' },
  { id: 'value', label: 'Synergy value' },
  { id: 'day1', label: 'Day 1 & TSA' },
  { id: 'people', label: 'Organisation & retention' },
  { id: 'risks', label: 'Risks & mitigations' },
  { id: 'review', label: 'Synergy case review' },
]

const filled = (t) => String(t || '').trim().length >= 40

export function pmiProgress(c, s) {
  const e = s.exec
  const execute = [
    ...c.levers.map((l) => !!e.levers[l.id]?.touched),
    ...c.day1.map((d) => !!e.day1[d.id]),
    ...c.people.map((p) => !!e.people[p.id]),
    ...c.risks.map((k) => !!(e.risks[k.id]?.severity && e.risks[k.id]?.mitigation)),
    ...c.checks.map((k) => !!e.checks[k.id]?.verdict),
  ]
  const deliver = [num(s.deliver.target) > 0, num(s.deliver.budget) > 0, filled(s.deliver.rationale)]
  return { execute, deliver }
}

/** Kind-specific scorecard rows. add(area, score, max, notes). r = trainee model, b = benchmark model. */
export function pmiScoreRows(c, s, r, b, add) {
  const e = s.exec
  const lOk = c.levers.filter((l) => leverMatches(l, e.levers[l.id]))
  add('Synergy register calls', lOk.length, c.levers.length, c.levers.filter((l) => !leverMatches(l, e.levers[l.id])).map((l) => `${l.label}: ${l.why}`))

  const items = [...c.dissynergies.map((d) => ({ label: d.label, ok: !!e.dis[d.id]?.include === d.benchmark, why: d.why })), ...c.oneOffs.map((o) => ({ label: o.label, ok: !!e.oneOffs[o.id]?.include === o.benchmark, why: o.why }))]
  add('Dis-synergies & one-off costs recognised', items.filter((x) => x.ok).length, items.length, items.filter((x) => !x.ok).map((x) => `${x.label}: ${x.why}`))

  const v = e.valuation
  const methodOk = v.method === 'npv' ? 1 : 0
  const rwOk = v.riskWeight ? 1 : 0
  const npvOk = Math.abs(r.npv / b.npv - 1) <= 0.1 ? 1 : 0
  add('Synergy valuation discipline', methodOk + rwOk + npvOk, 3, [
    !methodOk && 'Value synergies as discounted cash flows, not run rate × the deal multiple.',
    !rwOk && 'Risk-weight each lever by its probability of delivery; don\'t risk-weight costs.',
    !npvOk && `Your NPV ${(r.npv / 1e6).toFixed(1)}M is more than 10% from the reviewer's ${(b.npv / 1e6).toFixed(1)}M — check levers, phasing, one-offs, and dis-synergies.`,
  ].filter(Boolean))

  const LABEL = { day1: 'Day 1', day100: 'Day 100', year1: 'Year 1' }
  const dOk = c.day1.filter((d) => e.day1[d.id] === d.benchmark)
  add('Day-1 sequencing', dOk.length, c.day1.length, c.day1.filter((d) => e.day1[d.id] && e.day1[d.id] !== d.benchmark).map((d) => `${d.text}: reviewer puts it at ${LABEL[d.benchmark]}.`))

  const pOk = c.people.filter((p) => e.people[p.id] === p.benchmark)
  add('Organisation & retention', pOk.length, c.people.length, c.people.filter((p) => e.people[p.id] !== p.benchmark).map((p) => `${p.role}: reviewer would ${p.benchmark}. ${p.why}`))

  const kOk = c.risks.filter((k) => { const x = e.risks[k.id] || {}; return x.severity === k.benchmark.severity && x.mitigation === k.benchmark.mitigation })
  add('Risks → mitigations', kOk.length, c.risks.length, c.risks.filter((k) => { const x = e.risks[k.id] || {}; return (x.severity || x.mitigation) && !(x.severity === k.benchmark.severity && x.mitigation === k.benchmark.mitigation) }).map((k) => `${k.risk}: reviewer rates ${k.benchmark.severity}, "${c.mitigations.find((m) => m.id === k.benchmark.mitigation)?.label}".`))
}

export function pmiConclusionRow(c, s, r, b, add) {
  const target = num(s.deliver.target); const budget = num(s.deliver.budget)
  const t1 = target > 0 && target <= r.runRate && target >= b.netRunRate * 0.8
  const t2 = budget >= b.oneOffBudget * 0.9
  const t3 = target > 0 && target < c.asPresented.boardTarget * 0.8
  add('Board recommendation', [t1, t2, t3].filter(Boolean).length, 3, [
    !t1 && 'Commit to a run-rate target between the risk-weighted net run rate and the gross run rate of your register.',
    !t2 && 'Fund the one-off budget in full; an under-funded integration misses its synergies.',
    !t3 && 'A target near the banker case needs every lever delivered at 100% from Day 1. Re-base it.',
  ].filter(Boolean))
}
