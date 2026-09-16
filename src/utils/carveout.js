/**
 * carveout.js — the carve-out engine behind `carveout` cases in the lab. Pure functions, Node-testable
 * (scripts/test-carveout.mjs). Every figure a carve-out case shows is computed here from the case data and the
 * trainee's choices.
 *
 * computeCarve(c, exec) → carve-out P&L as reported · revenue mix and customer concentration · function-by-function
 * standalone cost build against parent allocations · the EBITDA bridge from reported to standalone (one-offs,
 * related-party repricing, non-recurring revenue, standalone costs, accounting policy) · separation cost register ·
 * TSA schedule in and out with a present value · enterprise value on standalone EBITDA net of separation and TSA ·
 * the equity cheque for the acquired stake · "what must be true" for the vendor's guide.
 * reviewCarveChecks(c) recomputes the vendor pack and reports what doesn't survive a standalone view.
 */
import { sum, num, fmtM, fmtPct, fmtX } from './valuation.js'


export function computeCarve(c, exec) {
  const v = exec.valuation || {}
  const revenueTotal = sum(c.revenue.map((r) => r.ltm))
  const costTotal = sum(c.costs.map((x) => x.ltm))
  const reported = revenueTotal - costTotal
  const parentRevenue = sum(c.revenue.filter((r) => r.customer === 'parent').map((r) => r.ltm))

  // standalone cost build
  const functions = c.functions.map((f) => {
    const standalone = exec.functions?.[f.id] === undefined ? f.standalone : num(exec.functions[f.id])
    return { ...f, standalone, delta: standalone - f.allocation }
  })
  const allocationTotal = sum(functions.map((f) => f.allocation))
  const standaloneCostTotal = sum(functions.map((f) => f.standalone))
  const standaloneDelta = standaloneCostTotal - allocationTotal

  // EBITDA bridge
  const bridge = c.bridge.map((b) => {
    const ch = exec.bridge?.[b.id] || {}
    const treatment = ch.treatment || b.draft
    const amount = b.kind === 'standalone' ? -standaloneDelta : b.amount
    const applied = treatment === 'accept' ? amount : treatment === 'reject' ? 0 : num(ch.amount)
    return { ...b, treatment, amount, applied }
  })
  const standaloneEbitda = reported + sum(bridge.map((b) => b.applied))
  const vendorEbitda = reported + sum(c.bridge.filter((b) => b.draft === 'accept').map((b) => b.amount))

  // separation and transitional services
  const separation = c.separation.map((s) => {
    const ch = exec.separation?.[s.id] || {}
    return { ...s, include: ch.include === undefined ? false : !!ch.include, amount: ch.amount === undefined ? s.amount : num(ch.amount) }
  })
  const separationTotal = sum(separation.filter((s) => s.include).map((s) => s.amount))
  const tsa = c.tsa.map((t) => {
    const months = Math.max(0, num(exec.tsa?.[t.id]?.months ?? t.months))
    const years = [1, 2, 3].map((y) => {
      const active = Math.max(0, Math.min(12, months - 12 * (y - 1)))
      return active * t.monthly * (t.direction === 'out' ? -1 : 1)
    })
    return { ...t, months, years, total: sum(years) }
  })
  const tsaYears = [0, 1, 2].map((i) => sum(tsa.map((t) => t.years[i])))
  const rate = num(v.rate) / 100
  const tsaPv = sum(tsaYears.map((x, i) => x / (1 + rate) ** (i + 1)))
  const tsaTotal = sum(tsaYears)

  // valuation
  const multiples = (v.multiples || c.asPresented.multiples).map(num)
  const deductions = (v.deductSeparation ? separationTotal : 0) + (v.deductTsa ? tsaPv : 0)
  const evRange = multiples.map((m) => m * standaloneEbitda - deductions)
  const multiple = num(v.multiple ?? multiples[1])
  const evGross = multiple * standaloneEbitda
  const ev = evGross - deductions
  const stake = num(v.stake) / 100
  const cheque = ev * stake
  const ask = c.asPresented.askEv

  return {
    revenueTotal, costTotal, reported, reportedMargin: reported / revenueTotal, parentRevenue, parentShare: parentRevenue / revenueTotal,
    functions, allocationTotal, standaloneCostTotal, standaloneDelta,
    bridge, standaloneEbitda, standaloneMargin: standaloneEbitda / revenueTotal, vendorEbitda,
    separation, separationTotal, tsa, tsaYears, tsaPv, tsaTotal, deductions,
    multiples, multiple, evGross, ev, evRange, stake, cheque, ask,
    impliedOnVendor: ev / c.asPresented.adjEbitda,
    wmbt: {
      multiple: standaloneEbitda ? (ask + deductions) / standaloneEbitda : null,
      ebitda: multiple ? (ask + deductions) / multiple : null,
      gap: ask - ev,
      gapPct: ask ? (ask - ev) / ask : null,
    },
  }
}

// ── the vendor's pack, and the reviewing director's benchmark ────────────────────
export function asPresentedCarve(c) {
  const ap = c.asPresented
  return {
    functions: Object.fromEntries(c.functions.map((f) => [f.id, f.allocation])),
    bridge: Object.fromEntries(c.bridge.map((b) => [b.id, { treatment: b.draft, amount: b.amount }])),
    separation: Object.fromEntries(c.separation.map((s) => [s.id, { amount: s.amount }])),
    tsa: Object.fromEntries(c.tsa.map((t) => [t.id, { months: t.months }])),
    valuation: { multiples: [...ap.multiples], multiple: ap.multiples[1], stake: ap.stake, deductSeparation: ap.deductSeparation, deductTsa: ap.deductTsa, rate: ap.rate },
    findings: {}, checks: {},
  }
}

export function benchmarkCarve(c) {
  const ex = asPresentedCarve(c)
  const bm = c.benchmarkModel
  ex.functions = Object.fromEntries(c.functions.map((f) => [f.id, f.standalone]))
  ex.bridge = Object.fromEntries(c.bridge.map((b) => [b.id, { treatment: b.benchmark, amount: b.benchmark === 'partial' ? b.amount / 2 : b.amount, touched: true }]))
  ex.separation = Object.fromEntries(c.separation.map((s) => [s.id, { include: s.benchmark, amount: s.amount }]))
  ex.tsa = Object.fromEntries(c.tsa.map((t) => [t.id, { months: t.benchmark }]))
  ex.valuation = { multiples: [...bm.multiples], multiple: bm.multiples[1], stake: bm.stake, deductSeparation: bm.deductSeparation, deductTsa: bm.deductTsa, rate: bm.rate }
  ex.findings = Object.fromEntries(c.findings.map((f) => [f.id, { ...f.benchmark }]))
  ex.checks = Object.fromEntries(c.checks.map((k) => [k.id, { verdict: 'issue', revealed: true }]))
  return ex
}

export function benchmarkOffer(c) {
  const r = computeCarve(c, benchmarkCarve(c))
  const round = (x) => Math.round(x / 5e5) * 5e5
  return { low: round(r.evRange[0]), high: round(r.evRange[2]), offer: round(r.ev), conditions: [...c.benchmarkDeliver.conditions], rationale: c.benchmarkDeliver.rationale }
}

export function reviewCarveChecks(c) {
  const draft = computeCarve(c, asPresentedCarve(c))
  const bench = computeCarve(c, benchmarkCarve(c))
  const B = Object.fromEntries(bench.bridge.map((b) => [b.id, b]))
  const cap = c.profile.find((p) => p[0].startsWith('Development'))
  const d = {
    allocation: { stated: `${fmtM(bench.allocationTotal, 1)} of parent allocations`, computed: `${fmtM(bench.standaloneCostTotal, 1)} standalone`, text: `Function by function — executive team, finance, HR, legal, corporate IT, facilities, audit — the business needs ${fmtM(bench.standaloneCostTotal, 1)} a year to run itself, ${fmtM(bench.standaloneDelta, 1)} more than the society charged it. The vendor pack presents the allocation as if it were a cost base.`, lesson: 'Build standalone costs bottom-up with headcount; an allocation is what the parent charged itself.' },
    'related-party': { stated: 'Anchor revenue at contracted rates', computed: `${fmtM(B['related-party'].amount, 1)} reset to arm’s length`, text: `${fmtPct(bench.parentShare, 0)} of revenue comes from the society at cost plus 8%, and the services agreement is signed at closing. Benchmarked against what third parties pay for the same services, the rate card is about 4.5% lower, so the reset belongs in the base case rather than a footnote.`, lesson: 'Related-party revenue is priced inside the group. Benchmark it, then model the reset.' },
    projects: { stated: `${fmtM(c.revenue.find((r) => r.id === 'projects').ltm, 1)} of implementation fees in recurring revenue`, computed: `${fmtM(-B.projects.amount, 1)} non-recurring`, text: 'One large implementation went live in the period. Project work continues, but at a materially lower run rate, and it should never carry a recurring multiple.', lesson: 'Split episodic project revenue from the subscription base before applying a multiple.' },
    capdev: { stated: cap ? cap[1] : 'Parent capitalisation policy', computed: `${fmtM(-B.capdev.amount, 1)} more expensed each year`, text: 'The society capitalises 40% of development spend. Under a policy a sponsor-backed company would adopt, more of that cost hits EBITDA every year. The cash is identical; the multiple applied to it is not.', lesson: 'Accounting policy travels with the parent. Normalise it before pricing.' },
    separation: { stated: 'No separation cost in the price', computed: `${fmtM(bench.separationTotal, 1)} one-off`, text: `IT separation and data migration, standalone systems, entity set-up and consents, recruiting the corporate team, rebranding, and retention. The buyer pays these to own a business that works on Day 1, so they come off the enterprise value.`, lesson: 'Separation cost is part of the price, not a post-close surprise.' },
    tsa: { stated: 'Transitional services not costed', computed: `${fmtM(bench.tsaTotal, 1)} net (${fmtM(bench.tsaPv, 1)} present value)`, text: `Hosting and service desk for ${bench.tsa.find((t) => t.id === 'in-it').months} months, finance and payroll for ${bench.tsa.find((t) => t.id === 'in-finance').months}, offices for ${bench.tsa.find((t) => t.id === 'in-facilities').months}, less reverse-TSA income that ends after a year. Netting the income into run-rate EBITDA would be worse still: it is temporary.`, lesson: 'Cost the TSA both ways, and never leave reverse-TSA income in run-rate earnings.' },
    multiple: { stated: `${fmtX(draft.multiple)} × ${fmtM(draft.vendorEbitda, 1)} = ${fmtM(draft.ev, 0)}`, computed: `${fmtX(bench.multiple)} × ${fmtM(bench.standaloneEbitda, 1)} − ${fmtM(bench.deductions, 1)} = ${fmtM(bench.ev, 0)}`, text: `The multiple is the least interesting number in a carve-out. Applied to pro forma EBITDA that was never earned standalone, ${fmtX(draft.multiple)} produces ${fmtM(draft.ev, 0)}; applied to standalone EBITDA net of separation and transitional services, a full turn lower still produces ${fmtM(bench.ev, 0)}. The vendor guide of ${fmtM(c.asPresented.askEv, 0)} needs ${fmtX(bench.wmbt.multiple)} on the standalone base.`, lesson: 'Argue about the base, not the multiple.' },
    wc: { stated: 'No carve-out balance sheet', computed: 'No working-capital history to peg', text: 'Beacon has never had its own balance sheet, so there is no normal level of working capital to set a peg against. Build a pro-forma working-capital profile from billing and payroll cycles, and use completion accounts rather than a locked box until you have one.', lesson: 'In a carve-out, insist on a pro-forma balance sheet and a defensible working-capital mechanism.' },
    retention: { stated: `${fmtM(c.bridge.find((b) => b.id === 'retention').amount, 1)} added back as one-off`, computed: 'Recurs in substance', text: 'The same people need retaining through separation under new ownership, so the buyer will pay a similar cost. Adding it back and then budgeting a retention plan in the separation register sells the same money twice. Judgement: if the buyer\'s plan is genuinely smaller, take part of it.', lesson: 'Test every add-back against what the buyer will actually spend next year.' },
    'service-levels': { stated: 'Not claimed', computed: `${fmtM(B['service-levels'].applied, 1)} of ${fmtM(B['service-levels'].amount, 1)} taken`, text: 'Some of the society\'s gold-plated service levels genuinely disappear standalone, but the seven-year anchor agreement locks most of them in. Taking half is defensible; taking all of it, or none, needs an argument either way.', lesson: 'Where the evidence is partial, take part of the adjustment and say why.' },
  }
  return c.checks.map((k) => ({ ...k, ...d[k.id] }))
}

