/**
 * pmi.js — the post-merger integration engine behind PMI cases in the lab. Pure functions, Node-testable
 * (scripts/test-pmi.mjs). Every figure a PMI case shows is computed here from the case data and the trainee's choices.
 *
 * computePmi(c, exec) → people (retention cost, relationship NPS at risk) · synergy levers (run rate × phasing ×
 * probability; one-off costs are never risk-weighted) · dis-synergies · one-off costs, TSA, working capital ·
 * annual net synergy cash flow · NPV with optional perpetuity · the draft's capitalised value · premium coverage ·
 * cost to achieve · cash break-even · downside / upside · "what must be true" to cover the premium.
 * reviewPmiChecks(c) recomputes the banker case and reports what doesn't survive scrutiny.
 * All flows are pre-tax, year-end, for practice.
 */
import { sum, num, fmtK, fmtM, fmtPct, fmtX, solve } from './valuation.js'

const clone = (x) => JSON.parse(JSON.stringify(x))
/** Phasing lookup: t is 1-based; years beyond the array hold the last value. */
const phaseAt = (arr, t) => num(arr?.[Math.min(t, arr.length) - 1])
const spread = (amount, weights, t) => amount * (num(weights?.[t - 1]) / 100)
const ONE_OFF_SPREAD = [70, 30]
const BACKLOG_SPREAD = [60, 40]

function core(c, exec, { forceRiskWeight } = {}) {
  const v = exec.valuation || {}
  const horizon = Math.max(1, Math.min(20, Math.round(num(v.horizon)) || 10))
  const years = Array.from({ length: horizon }, (_, i) => i + 1)
  const ratePct = num(v.rate); const rate = ratePct / 100
  const g = num(v.g) / 100
  const riskWeight = forceRiskWeight ?? !!v.riskWeight

  // people → retention cost and relationship NPS at risk
  const people = c.people.map((p) => {
    const decision = exec.people?.[p.id] || ''
    const rule = c.peopleRules[decision] || c.peopleRules.unmanaged
    return { ...p, decision, bonusPaid: p.bonus * rule.bonus, npsAtRisk: p.nps * rule.loss, lossRate: rule.loss }
  })
  const keyBonus = sum(people.map((p) => p.bonusPaid))
  const npsAtRisk = sum(people.map((p) => p.npsAtRisk))

  // synergy levers
  const levers = c.levers.map((l) => {
    const x = exec.levers?.[l.id] || {}
    const status = x.status || 'keep'
    const on = status !== 'reject'
    const rr = on ? num(x.rr) : 0
    const phasing = (x.phasing || l.draft.phasing).map(num)
    const prob = num(x.prob ?? 100)
    const weight = riskWeight ? prob / 100 : 1
    const oneOff = on ? num(x.oneOff) : 0
    const backlog = on ? num(x.backlog) : 0
    return {
      ...l, status, on, rr, phasing, prob, weight, oneOff, backlog, rrWeighted: rr * (prob / 100),
      recurring: years.map((t) => rr * (phaseAt(phasing, t) / 100) * weight),
      costs: years.map((t) => -spread(oneOff, ONE_OFF_SPREAD, t)),
      backlogFlows: years.map((t) => spread(backlog * weight, BACKLOG_SPREAD, t)),
    }
  })

  // dis-synergies (recurring, negative)
  const contribution = c.attritionContribution ?? 0.5
  const dis = c.dissynergies.map((d) => {
    const include = !!exec.dis?.[d.id]?.include
    const rr = d.computed === 'attrition' ? -npsAtRisk * contribution : d.rr
    return { ...d, include, rr, steady: rr * (phaseAt(d.phasing, horizon + 1) / 100), flows: years.map((t) => (include ? rr * (phaseAt(d.phasing, t) / 100) : 0)) }
  })

  // one-off costs, TSA, working capital
  const oneOffs = c.oneOffs.map((o) => {
    const x = exec.oneOffs?.[o.id] || {}
    const include = !!x.include
    let amount; let flows
    if (o.kind === 'tsa') {
      const months = Math.max(0, num(x.months ?? o.months))
      amount = months * o.monthly
      flows = years.map((t) => (include ? -o.monthly * Math.max(0, Math.min(12, months - 12 * (t - 1))) : 0))
      return { ...o, include, months, amount, flows, cost: true }
    }
    if (o.kind === 'wc') {
      amount = num(x.amount ?? o.amount)
      flows = years.map((t) => (include ? (t === 1 ? -amount : t === 2 ? amount : 0) : 0))
      return { ...o, include, amount, flows, cost: false }
    }
    amount = o.kind === 'retention' ? keyBonus + o.pool : num(x.amount ?? o.amount)
    flows = years.map((t) => (include ? -spread(amount, o.phase, t) : 0))
    return { ...o, include, amount, flows, cost: true }
  })

  // annual cash flows
  const R = years.map((_, i) => sum(levers.map((l) => l.recurring[i])))
  const B = years.map((_, i) => sum(levers.map((l) => l.backlogFlows[i])))
  const D = years.map((_, i) => sum(dis.map((d) => d.flows[i])))
  const Lc = years.map((_, i) => sum(levers.map((l) => l.costs[i])))
  const Oc = years.map((_, i) => sum(oneOffs.filter((o) => o.cost).map((o) => o.flows[i])))
  const W = years.map((_, i) => sum(oneOffs.filter((o) => !o.cost).map((o) => o.flows[i])))

  const npvAt = (r, scale = 1, costScale = 1) => {
    let pv = 0
    for (let i = 0; i < horizon; i++) pv += (scale * (R[i] + B[i]) + D[i] + costScale * (Lc[i] + Oc[i]) + W[i]) / (1 + r) ** (i + 1)
    let pvTerminal = 0
    if (v.terminal === 'perpetuity' && r > g) {
      const steady = scale * R[horizon - 1] + sum(dis.filter((d) => d.include).map((d) => d.steady))
      pvTerminal = ((steady * (1 + g)) / (r - g)) / (1 + r) ** horizon
    }
    return { pvExplicit: pv, pvTerminal, npv: pv + pvTerminal }
  }

  const annual = years.map((t, i) => {
    const net = R[i] + B[i] + D[i] + Lc[i] + Oc[i] + W[i]
    const df = 1 / (1 + rate) ** t
    return { t, recurring: R[i], backlog: B[i], dis: D[i], costs: Lc[i] + Oc[i], wc: W[i], net, df, pv: net * df }
  })
  let cum = 0; let breakEven = null
  for (const a of annual) { cum += a.net; a.cumulative = cum; if (breakEven == null && cum >= 0) breakEven = a.t }

  const val = npvAt(rate)
  const runRate = sum(levers.map((l) => l.rr))
  const runRateWeighted = sum(levers.map((l) => l.rrWeighted))
  const disSteady = sum(dis.filter((d) => d.include).map((d) => d.steady))
  const oneOffBudget = sum(levers.map((l) => l.oneOff)) + sum(oneOffs.filter((o) => o.cost && o.include).map((o) => o.amount))
  const capMultiple = num(v.capMultiple ?? c.deal.dealMultiple)
  const capitalised = runRate * capMultiple
  const method = v.method === 'multiple' ? 'multiple' : 'npv'
  const value = method === 'multiple' ? capitalised : val.npv
  const premium = c.deal.premium

  return {
    horizon, years, rate, ratePct, g: num(v.g), riskWeight, method, capMultiple,
    people, keyBonus, npsAtRisk, levers, dis, oneOffs, annual, breakEven,
    pvExplicit: val.pvExplicit, pvTerminal: val.pvTerminal, npv: val.npv, capitalised, value, premium,
    coverage: value / premium, npvCoverage: val.npv / premium,
    runRate, runRateWeighted, disSteady, netRunRate: runRateWeighted + disSteady,
    oneOffBudget, costToAchieve: runRate ? oneOffBudget / runRate : null,
    year1Run: sum(levers.map((l) => l.rr * (phaseAt(l.phasing, 1) / 100))),
    downside: npvAt(rate, 0.75, 1.25).npv,
    wmbt: {
      scale: solve((s) => npvAt(rate, s).npv, premium, 0, 6),
      rate: solve((r) => -npvAt(r).npv, -premium, 0.001, 0.6),
    },
    npvAt,
  }
}

export function computePmi(c, exec) {
  const r = core(c, exec)
  r.upside = core(c, exec, { forceRiskWeight: false }).npv
  return r
}

// ── the banker's draft, and the integration director's benchmark ─────────────────
export function asPresentedPmi(c) {
  const ap = c.asPresented
  return {
    levers: Object.fromEntries(c.levers.map((l) => [l.id, { status: 'keep', ...clone(l.draft) }])),
    dis: Object.fromEntries(c.dissynergies.map((d) => [d.id, { include: false }])),
    oneOffs: Object.fromEntries(c.oneOffs.map((o) => [o.id, { include: false, ...(o.kind === 'tsa' ? { months: o.months } : o.kind === 'retention' ? {} : { amount: o.amount }) }])),
    valuation: { method: ap.method, rate: ap.rate, horizon: ap.horizon, terminal: ap.terminal, g: c.valuationDefaults.g, capMultiple: ap.capMultiple, riskWeight: ap.riskWeight },
    day1: {}, people: {}, risks: {}, checks: {},
  }
}

export function benchmarkPmi(c) {
  const ex = asPresentedPmi(c)
  ex.levers = Object.fromEntries(c.levers.map((l) => [l.id, { status: 'keep', backlog: 0, ...clone(l.benchmark), touched: true }]))
  ex.dis = Object.fromEntries(c.dissynergies.map((d) => [d.id, { include: d.benchmark }]))
  ex.oneOffs = Object.fromEntries(c.oneOffs.map((o) => [o.id, { ...ex.oneOffs[o.id], include: o.benchmark }]))
  ex.valuation = { ...ex.valuation, ...c.valuationDefaults, capMultiple: c.asPresented.capMultiple }
  ex.day1 = Object.fromEntries(c.day1.map((d) => [d.id, d.benchmark]))
  ex.people = Object.fromEntries(c.people.map((p) => [p.id, p.benchmark]))
  ex.risks = Object.fromEntries(c.risks.map((k) => [k.id, { ...k.benchmark }]))
  ex.checks = Object.fromEntries(c.checks.map((k) => [k.id, { verdict: 'issue', revealed: true }]))
  return ex
}

/** Board recommendation the reviewer would make from the benchmark model. */
export function benchmarkBoard(c) {
  const r = computePmi(c, benchmarkPmi(c))
  const round = (x) => Math.round(x / 1e5) * 1e5
  return { target: round(r.netRunRate), budget: round(r.oneOffBudget), rationale: c.benchmarkDeliver.rationale }
}

/** Is a lever's register entry close enough to the reviewer's? Tolerances are deliberately generous. */
export function leverMatches(l, x = {}) {
  const b = l.benchmark
  if (l.id === 'creative' && x.status === 'reject') return true
  if ((x.status || 'keep') === 'reject') return false
  const within = (a, target, pct, abs) => Math.abs(num(a) - target) <= Math.max(Math.abs(target) * pct, abs)
  const ph = (x.phasing || []).map(num)
  return within(x.rr, b.rr, 0.15, 0.1e6) && within(ph[0], b.phasing[0], 0, 20) && within(ph[1], b.phasing[1], 0, 25)
    && within(x.oneOff, b.oneOff, 0.3, 0.2e6) && within(x.prob, b.prob, 0, 15) && within(x.backlog || 0, b.backlog || 0, 0.2, 0.3e6)
}

export function reviewPmiChecks(c) {
  const draft = computePmi(c, asPresentedPmi(c))
  const bench = computePmi(c, benchmarkPmi(c))
  const L = Object.fromEntries(c.levers.map((l) => [l.id, l]))
  const BL = Object.fromEntries(bench.levers.map((l) => [l.id, l]))
  const af = c.adminFee
  const renewing = af.collections * (af.renewingShare / 100)
  const lost = renewing * (af.churn / 100)
  const uplift = (af.collections - lost) * ((af.to - af.from) / 100)
  const feeLost = lost * (af.from / 100)
  const backlogPv = bench.npvAt(bench.rate).npv - core(c, { ...benchmarkPmi(c), levers: { ...benchmarkPmi(c).levers, unmatched: { ...benchmarkPmi(c).levers.unmatched, backlog: 0 } } }).npv
  const y1 = bench.annual[0]
  const allExit = sum(c.people.map((p) => p.nps * c.peopleRules.exit.loss)) * (c.attritionContribution ?? 0.5)

  const detail = {
    'double-count': { stated: `${fmtM(L.system.draft.rr)} run rate`, computed: `${fmtM(L.system.benchmark.rr)} run rate`, text: `The system lever includes ${fmtM(L.system.draft.rr - L.system.benchmark.rr)} of "manual-workaround staff" who are already among the 22 roles in the royalty-ops lever. Counted twice, it adds ${fmtM((L.system.draft.rr - L.system.benchmark.rr) * c.deal.dealMultiple)} at the deal multiple.`, lesson: 'Map every lever to named cost lines and headcount; any line in two levers is a double count.' },
    'ga-baseline': { stated: `${fmtM(L.ga.draft.rr)} run rate`, computed: `${fmtM(L.ga.benchmark.rr)} run rate`, text: `The G&A lever counts ${fmtM(L.ga.draft.rr - L.ga.benchmark.rr)} of founder salaries that ended at closing and are already out of the post-close baseline. A saving has to come off a cost the combined company would otherwise pay.`, lesson: 'Baseline synergies against the post-close cost base, not last year\'s P&L.' },
    phasing: { stated: `${fmtM(draft.year1Run)} achieved in year 1`, computed: `${fmtM(bench.year1Run)} achievable in year 1 (before probability)`, text: `The draft books every lever at 100% from Day 1. Royalty roles can only go after migration, the system licence runs until cut-over, sub-publishing contracts exit at notice windows over two to four years, and admin fees reset at renewals. Realistic year-1 delivery is ${fmtPct(bench.year1Run / bench.runRate, 0)} of the run rate.`, lesson: 'Tie every lever\'s phasing to a real constraint: a system, a contract window, a statement cycle.' },
    'one-offs': { stated: `${fmtM(c.asPresented.oneOffTotal)} one-off (${fmtX(c.asPresented.oneOffTotal / c.asPresented.runRate, 2)} run rate)`, computed: `${fmtM(bench.oneOffBudget)} one-off (${fmtX(bench.costToAchieve, 2)} run rate)`, text: `Missing: migration and parallel running, a ${bench.oneOffs.find((o) => o.kind === 'tsa').months}-month TSA at ${fmtK(c.oneOffs.find((o) => o.kind === 'tsa').monthly)} a month, severance, the lease exit, retention, and the IMO itself. Publisher integrations typically cost around one year of run-rate synergies; a 0.1x cost to achieve is a red flag.`, lesson: 'Build the one-off budget line by line; test the ratio of cost to run rate against experience.' },
    backlog: { stated: `${fmtM(L.unmatched.draft.rr)} run rate → ${fmtM(L.unmatched.draft.rr * c.deal.dealMultiple)} at ${fmtX(c.deal.dealMultiple)}`, computed: `${fmtM(L.unmatched.benchmark.backlog)} once + ${fmtM(L.unmatched.benchmark.rr)} run rate · backlog PV ${fmtM(backlogPv)}`, text: `The ${fmtM(L.unmatched.benchmark.backlog)} of identified unmatched royalties can be recovered once. Treated as recurring and capitalised, it adds about ${fmtM(L.unmatched.draft.rr * c.deal.dealMultiple)} of value. The recurring benefit of better matching is closer to ${fmtM(L.unmatched.benchmark.rr)} a year.`, lesson: 'A one-time recovery is cash, not a run rate.' },
    'subpub-net': { stated: `${fmtM(L.subpub.draft.rr)} from year 1`, computed: `${fmtM(L.subpub.benchmark.rr)} net, ${L.subpub.benchmark.phasing.join('/')}% phasing`, text: `The draft removes the full 15% third-party fee on day one. Halcyon’s own foreign collection costs about ${fmtM(L.subpub.draft.rr - L.subpub.benchmark.rr)}, and contracts can only be exited at notice windows over two to four years, so the saving is smaller and later.`, lesson: 'In-sourcing savings are net of the in-house cost, and timed by the contracts.' },
    'admin-churn': { stated: `${fmtM(L['admin-fee'].draft.rr)} (+${af.to - af.from} pts on ${fmtM(af.collections, 0)})`, computed: `${fmtM(uplift - feeLost, 2)} net`, text: `${af.renewingShare}% of collections (${fmtM(renewing)}) renew within 24 months. If ${af.churn}% of those clients leave on a ${fmtPct((af.to - af.from) / af.from, 0)} fee rise, the uplift on retained collections is ${fmtM(uplift, 2)} and the lost fees are ${fmtM(feeLost, 2)}: about ${fmtM(uplift - feeLost, 2)} net, landing only at renewals.`, lesson: 'Revenue synergies need churn and renewal modelling before they are booked.' },
    capitalisation: { stated: `${fmtM(draft.capitalised, 0)} · ${fmtX(draft.coverage)} premium`, computed: `${fmtM(bench.npv, 1)} NPV · ${fmtX(bench.npvCoverage, 2)} premium`, text: `Run rate × ${fmtX(c.deal.dealMultiple)} applies a revenue (NPS) multiple to cost savings with no phasing, no one-off costs, no probability, and no dis-synergies. Phased, risk-weighted, and net of costs at ${bench.ratePct}% with a ${bench.g}% perpetuity, the corrected synergies are worth ${fmtM(bench.npv, 1)} — ${fmtX(bench.npvCoverage, 2)} the ${fmtM(c.deal.premium, 0)} premium, not ${fmtX(draft.coverage)}.`, lesson: 'Value synergies as phased, risk-weighted, net cash flows — never run rate × deal multiple.' },
    'cash-dip': { stated: `Year 1 +${fmtM(draft.annual[0].net)}`, computed: `Year 1 ${fmtM(y1.net)} · cash break-even year ${bench.breakEven ?? '—'}`, text: `With costs front-loaded, synergies ramping, and ${fmtM(c.oneOffs.find((o) => o.kind === 'wc').amount)} of collections delayed by society payee changes, year 1 is cash-negative. The board needs to fund the trough, not bank a year-1 windfall.`, lesson: 'Show the board the cash profile, including working capital, not just the run rate.' },
    'creative-cut': { stated: `${fmtM(L.creative.draft.rr)} run rate, 10 roles`, computed: `${fmtM(BL.creative.rrWeighted)} risk-weighted · all-exit attrition ${fmtM(-allExit)} a year`, text: `Cutting 10 of 26 creatives saves salaries, but creatives hold writer relationships. If the key relationship holders all left, expected attrition would cost about ${fmtM(allExit)} a year in contribution — most of the saving. A smaller, relationship-aware cut with retention is the defensible position; rejecting the lever is also defensible.`, lesson: 'In publishing, people are the asset. Price the relationship risk before cutting.' },
  }
  return c.checks.map((k) => ({ ...k, ...detail[k.id] }))
}
