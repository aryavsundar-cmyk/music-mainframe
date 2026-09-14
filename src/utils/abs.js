/**
 * abs.js — the royalty-ABS collateral-review engine behind ABS cases in the lab. Pure functions, Node-testable
 * (scripts/test-abs.mjs). Every figure an ABS case shows is computed here from the case data and the trainee's choices.
 *
 * computeAbs(c, exec) → tape normalisation (one-offs out, pro-forma add-backs out, tape tied to cash) · eligibility
 * screen · concentration limits (excess concentrations get no credit) · collateral cash flow after servicing fee and
 * senior expenses · collateral value and loan-to-value · annual note waterfall with DSCR triggers (cash trap, rapid
 * amortisation), liquidity reserve, anticipated repayment date (ARD) and legal final · stress scenarios · break-even
 * haircuts · maximum Class A size that meets the investor's tests.
 * reviewAbsChecks(c) recomputes the sponsor's offering figures and reports what doesn't survive scrutiny.
 * Annual periods, pre-tax, for practice.
 */
import { sum, num, fmtM, fmtPct, fmtX } from './valuation.js'

const clone = (x) => JSON.parse(JSON.stringify(x))

// ── collateral: tape → normalised → eligible → borrowing base ────────────────────
export function collateral(c, exec) {
  const rows = c.tape.map((r) => ({ ...r, normAdj: 0 }))
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]))
  const norm = c.normalization.map((n) => {
    const ch = exec.norm?.[n.id] || {}
    const treatment = ch.treatment || n.draft
    const applied = treatment === 'accept' ? n.amount : treatment === 'reject' ? 0 : num(ch.amount)
    byId[n.row].normAdj += applied
    return { ...n, treatment, applied }
  })
  const tapeTotal = sum(rows.map((r) => r.ltm))
  for (const r of rows) {
    r.normalized = r.ltm + r.normAdj
    const flag = c.eligibility.find((e) => e.row === r.id)
    const decision = flag ? (exec.elig?.[flag.id] || 'eligible') : 'eligible'
    r.flag = flag || null
    r.decision = decision
    r.excluded = flag && decision === 'exclude' ? r.normalized * flag.share : 0
    r.eligible = r.normalized - r.excluded
  }
  const normalized = sum(rows.map((r) => r.normalized))
  const eligible = sum(rows.map((r) => r.eligible))

  // concentration limits: single-pass against the eligible pool (excess concentrations get no credit)
  const L = exec.limits || {}
  const apply = !!L.apply
  const single = num(L.single) / 100; const sync = num(L.sync) / 100; const nonUsd = num(L.nonUsd) / 100
  for (const r of rows) r.singleExcess = apply && !r.pool ? Math.max(0, r.eligible - single * eligible) : 0
  const syncTotal = sum(rows.filter((r) => r.sync).map((r) => r.eligible))
  const nonUsdTotal = sum(rows.map((r) => r.eligible * (r.nonUsd || 0)))
  const syncExcess = apply ? Math.max(0, syncTotal - sync * eligible) : 0
  const nonUsdExcess = apply ? Math.max(0, nonUsdTotal - nonUsd * eligible) : 0
  const singleExcess = sum(rows.map((r) => r.singleExcess))
  const borrowingBase = eligible - singleExcess - syncExcess - nonUsdExcess
  const titled = rows.filter((r) => !r.pool)
  return {
    rows, norm, tapeTotal, normalized, eligible, syncTotal, nonUsdTotal, syncExcess, nonUsdExcess, singleExcess, borrowingBase,
    nonUsdShare: borrowingBase ? sum(rows.map((r) => (r.eligible - r.singleExcess) * (r.nonUsd || 0))) / borrowingBase : 0,
    shares: {
      topAsset: eligible ? Math.max(...titled.map((r) => r.eligible)) / eligible : 0,
      top10: eligible ? sum(titled.map((r) => r.eligible).sort((a, b) => b - a).slice(0, 10)) / eligible : 0,
      sync: eligible ? syncTotal / eligible : 0,
      nonUsd: eligible ? nonUsdTotal / eligible : 0,
    },
  }
}

// ── notes waterfall ──────────────────────────────────────────────────────────────
/** Annual waterfall. scenario = { shock (% level haircut), trendDelta (pts), fx (% haircut on non-USD) }. */
export function waterfall(c, exec, col, scenario = {}, override = {}) {
  const cf = exec.cf || {}; const n = { ...(exec.notes || {}), ...override }; const tr = exec.triggers || {}
  const years = c.structure.legalFinal
  const trend = (num(cf.trend) + num(scenario.trendDelta)) / 100
  const shock = num(scenario.shock) / 100
  const fx = (num(scenario.fx) / 100) * col.nonUsdShare
  const servicing = num(cf.servicing) / 100; const expenses = num(cf.expenses)
  const trap = num(tr.trap); const rapid = num(tr.rapid)
  const ard = c.structure.ard
  let a = num(n.aSize); let b = num(n.bSize); let bDeferred = 0
  const aRate = num(n.aRate) / 100; const bRate = num(n.bRate) / 100; const aAmort = (num(n.aAmort) / 100) * num(n.aSize)
  let reserveTarget = num(n.reserve)
  let reserve = reserveTarget
  const rows = []
  let firstTrap = null; let firstRapid = null; let aInterestShortfall = 0; let reserveDraws = 0
  for (let t = 1; t <= years; t++) {
    const collections = col.borrowingBase * (1 - shock) * (1 - fx) * (1 + trend) ** (t - 1)
    const available = Math.max(0, collections * (1 - servicing) - expenses)
    const aInt = a * aRate
    const aSched = t <= ard ? Math.min(a, aAmort) : 0
    const bInt = b * bRate
    const scheduled = aInt + aSched + bInt
    const dscr = scheduled > 0 ? available / scheduled : null
    const status = a <= 0.5 && b <= 0.5 && bDeferred <= 0.5 ? 'repaid' : t > ard ? 'post-ARD sweep' : dscr < rapid ? 'rapid amortisation' : dscr < trap ? 'cash trap' : 'normal'
    if ((status === 'cash trap' || status === 'rapid amortisation') && firstTrap == null) firstTrap = t
    if (status === 'rapid amortisation' && firstRapid == null) firstRapid = t
    let cash = available
    // 1. Class A interest, supported by the liquidity reserve
    let aIntPaid = Math.min(cash, aInt); cash -= aIntPaid
    let aDraw = 0
    if (aIntPaid < aInt) { aDraw = Math.min(reserve, aInt - aIntPaid); reserve -= aDraw; aIntPaid += aDraw; reserveDraws += aDraw }
    aInterestShortfall += aInt - aIntPaid
    // 2. Class A scheduled principal
    const aSchedPaid = Math.min(cash, aSched); cash -= aSchedPaid; a -= aSchedPaid
    // 3. Class B interest — subordinated (deferred) under rapid amortisation or post-ARD while Class A is outstanding
    const subordinate = (status === 'rapid amortisation' || status === 'post-ARD sweep') && a > 0.5
    let bIntPaid = 0; let draws = 0
    if (!subordinate) {
      // current interest first (reserve-supported unless under rapid amortisation), then any deferred interest from cash only
      let cur = Math.min(cash, bInt); cash -= cur
      if (cur < bInt && status !== 'rapid amortisation') { const draw = Math.min(reserve, bInt - cur); reserve -= draw; cur += draw; draws += draw }
      bDeferred += bInt - cur
      const old = Math.min(cash, Math.max(0, bDeferred - (bInt - cur))); cash -= old; bDeferred -= old
      bIntPaid = cur + old
    } else bDeferred += bInt
    // 4. replenish the reserve (released once every note is repaid)
    const refill = Math.min(cash, Math.max(0, reserveTarget - reserve)); reserve += refill; cash -= refill
    // 5. release to the sponsor, or sweep to Class A then Class B
    let aSweep = 0; let bPrin = 0; let released = 0
    if (status === 'normal' || status === 'repaid') released = cash
    else {
      aSweep = Math.min(cash, a); a -= aSweep; cash -= aSweep
      if (a <= 0.5) {
        if (bDeferred > 0) { const paid = Math.min(cash, bDeferred); cash -= paid; bDeferred -= paid; bIntPaid += paid }
        bPrin = Math.min(cash, b); b -= bPrin; cash -= bPrin
        if (b <= 0.5 && bDeferred <= 0.5) released = cash
      }
    }
    let reserveRelease = 0
    if (a <= 0.5 && b <= 0.5 && bDeferred <= 0.5 && reserve > 0) { reserveRelease = reserve; released += reserve; reserve = 0; reserveTarget = 0 }
    reserveDraws += draws
    rows.push({ t, reserveIn: refill, reserveOut: aDraw + draws + reserveRelease, collections, available, aInt, aSched, bInt, dscr, status, aIntPaid, aSchedPaid, bIntPaid, aSweep, bPrin, released, reserve, aBal: a, bBal: b, bDeferred })
  }
  const at = (t) => rows[Math.min(t, rows.length) - 1]
  return {
    rows, firstTrap, firstRapid, aInterestShortfall, reserveDraws,
    dscr1: rows[0].dscr, aAtArd: at(ard).aBal, bAtArd: at(ard).bBal,
    aLoss: rows[rows.length - 1].aBal, bLoss: rows[rows.length - 1].bBal + rows[rows.length - 1].bDeferred,
    aRepaidYear: rows.find((r) => r.aBal <= 0.5)?.t ?? null,
    bRepaidYear: rows.find((r) => r.bBal <= 0.5 && r.bDeferred <= 0.5)?.t ?? null,
    releasedToArd: sum(rows.slice(0, ard).map((r) => r.released)),
  }
}

/** PV of available cash (after servicing and expenses) over the valuation life. */
export function collateralValue(c, exec, col, rateOverride) {
  const cf = exec.cf || {}; const v = exec.value || {}
  const rate = (rateOverride ?? num(v.rate)) / 100
  const life = Math.max(1, Math.round(num(v.life)) || 25)
  const trend = num(cf.trend) / 100; const servicing = num(cf.servicing) / 100; const expenses = num(cf.expenses)
  let pv = 0
  for (let t = 1; t <= life; t++) pv += Math.max(0, col.borrowingBase * (1 + trend) ** (t - 1) * (1 - servicing) - expenses) / (1 + rate) ** t
  return pv
}

export function computeAbs(c, exec) {
  const col = collateral(c, exec)
  const value = collateralValue(c, exec, col)
  const n = exec.notes || {}
  const aSize = num(n.aSize); const bSize = num(n.bSize)
  const base = waterfall(c, exec, col)
  const scenarios = c.scenarios.map((s) => ({ ...s, ...waterfall(c, exec, col, s) }))
  const custom = waterfall(c, exec, col, exec.stress || {})
  const ts = c.targets

  // break-even level haircuts (base trend) — the shock at which each outcome first occurs
  const be = (test) => { if (test(0)) return 0; if (!test(99)) return null; let lo = 0; let hi = 99; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (test(m)) hi = m; else lo = m } return hi }
  const breakeven = {
    trapYear1: be((s) => { const w = waterfall(c, exec, col, { shock: s }); return w.firstTrap === 1 }),
    bLoss: be((s) => waterfall(c, exec, col, { shock: s }).bLoss > 1000),
    aLoss: be((s) => waterfall(c, exec, col, { shock: s }).aLoss > 1000),
  }

  // maximum Class A size that meets every investor test (B held as offered)
  const passes = (size) => {
    const o = { aSize: size }
    const w = waterfall(c, exec, col, {}, o)
    const severe = waterfall(c, exec, col, c.scenarios.find((s) => s.id === ts.stressScenario) || {}, o)
    return (w.dscr1 ?? 0) >= ts.dscr && size / (value || 1) <= ts.ltvA / 100 && severe.aLoss <= 1000
  }
  let lo = 0; let hi = Math.max(aSize, 1) * 2
  if (passes(hi)) lo = hi
  else for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (passes(m)) lo = m; else hi = m }
  const maxA = Math.floor(lo / 1e6) * 1e6

  const reserveMonths = (() => { const ds = aSize * (num(n.aRate) / 100) + (num(n.aAmort) / 100) * aSize + bSize * (num(n.bRate) / 100); return ds ? num(n.reserve) / (ds / 12) : 0 })()
  return {
    ...col, value, aSize, bSize, ltvA: value ? aSize / value : null, ltvTotal: value ? (aSize + bSize) / value : null,
    base, scenarios, custom, breakeven, maxA, reserveMonths,
    reserveMonthsAInterest: aSize ? num(n.reserve) / (aSize * (num(n.aRate) / 100) / 12) : 0,
    multipleOfBase: col.borrowingBase ? value / col.borrowingBase : null,
  }
}

// ── the sponsor's offering, and the reviewer's benchmark ─────────────────────────
export function asPresentedAbs(c) {
  const ap = c.asPresented
  return {
    norm: Object.fromEntries(c.normalization.map((x) => [x.id, { treatment: x.draft, amount: x.amount }])),
    elig: {},
    limits: { apply: false, ...clone(c.structure.limits) },
    cf: clone(ap.cf),
    value: clone(ap.value),
    notes: clone(c.structure.notes),
    triggers: clone(c.structure.triggers),
    stress: clone(ap.stress),
    findings: {}, checks: {},
  }
}

export function benchmarkAbs(c) {
  const ex = asPresentedAbs(c)
  ex.norm = Object.fromEntries(c.normalization.map((x) => [x.id, { treatment: x.benchmark, amount: x.amount, touched: true }]))
  ex.elig = Object.fromEntries(c.eligibility.map((e) => [e.id, e.benchmark]))
  ex.limits = { apply: true, ...clone(c.structure.limits) }
  ex.cf = clone(c.benchmarkModel.cf)
  ex.value = clone(c.benchmarkModel.value)
  ex.stress = clone(c.benchmarkModel.stress)
  ex.findings = Object.fromEntries(c.findings.map((f) => [f.id, { ...f.benchmark }]))
  ex.checks = Object.fromEntries(c.checks.map((k) => [k.id, { verdict: 'issue', revealed: true }]))
  return ex
}

export function benchmarkCredit(c) {
  const r = computeAbs(c, benchmarkAbs(c))
  return { recommendation: c.benchmarkDeliver.recommendation, maxA: r.maxA, conditions: [...c.benchmarkDeliver.conditions], rationale: c.benchmarkDeliver.rationale }
}

export function reviewAbsChecks(c) {
  const draft = computeAbs(c, asPresentedAbs(c))
  const bench = computeAbs(c, benchmarkAbs(c))
  const ap = c.asPresented
  const N = Object.fromEntries(c.normalization.map((x) => [x.id, x]))
  const oneOffs = c.normalization.filter((x) => x.kind === 'one-off')
  const addBacks = c.normalization.filter((x) => x.kind === 'pro-forma')
  const tapeGap = N['accrued'].amount
  const hist = c.history.map((h) => h.collections - h.oneOffs)
  const histTrend = (hist[hist.length - 1] / hist[0]) ** (1 / (hist.length - 1)) - 1
  const dsNotes = draft.base.rows[0].aInt + draft.base.rows[0].aSched + draft.base.rows[0].bInt
  const severe = bench.scenarios.find((s) => s.id === c.targets.stressScenario)
  const sponsorStress = draft.scenarios.find((s) => s.id === 'sponsor')
  const d = {
    'tape-cash': { stated: `${fmtM(ap.tapeLtm)} LTM on the tape`, computed: `${fmtM(ap.tapeLtm + tapeGap)} received in bank`, text: `The long-tail publishing line books ${fmtM(-tapeGap, 2)} of royalties accrued from society statements but not yet received. Bank receipts, not accruals, service notes. Until the tape ties to cash by row, every ratio built on it is unreliable.`, lesson: 'Tie the data tape to bank receipts before you test anything else.' },
    'one-offs': { stated: `${fmtM(ap.tapeLtm)} treated as recurring`, computed: `${fmtM(sum(oneOffs.map((x) => -x.amount)), 2)} of one-offs inside LTM`, text: `${oneOffs.map((x) => `${x.label} (${fmtM(-x.amount, 2)})`).join('; ')}. None recurs, so none can support debt service.`, lesson: 'One-offs are cash, not capacity. Strip them before sizing debt.' },
    'pro-forma': { stated: `${fmtM(ap.offeringNcf)} "pro forma LTM"`, computed: `${fmtM(sum(addBacks.map((x) => x.amount)), 2)} of add-backs removed`, text: `${addBacks.map((x) => `${x.label} (+${fmtM(x.amount, 2)})`).join('; ')}. Pro-forma income that hasn't been collected belongs in an upside case, never in the borrowing base.`, lesson: 'Size notes on collected cash, not on the sponsor\'s plan.' },
    eligibility: { stated: 'All assets eligible', computed: `${fmtM(bench.normalized - bench.eligible, 2)} ineligible`, text: `Assets that can terminate before legal final, lack a required consent, or are in ownership litigation fail standard eligibility criteria. They can stay in the pool as upside, but they get no credit in the borrowing base.`, lesson: 'Screen every asset against the indenture\'s eligibility criteria.' },
    concentration: { stated: `Limits not applied (largest asset ${fmtPct(draft.shares.topAsset)})`, computed: `${fmtM(bench.singleExcess + bench.syncExcess + bench.nonUsdExcess, 2)} excess concentration`, text: `Against the eligible pool, the largest asset is ${fmtPct(bench.shares.topAsset)} versus a ${c.structure.limits.single}% single-asset limit, and sync-dependent assets are ${fmtPct(bench.shares.sync)} versus ${c.structure.limits.sync}%. The excess gets no credit.`, lesson: 'Apply concentration limits to the eligible pool, not the whole tape.' },
    fees: { stated: `DSCR ${fmtX(draft.base.dscr1, 2)} on gross collections`, computed: `${fmtPct(c.benchmarkModel.cf.servicing / 100, 0)} servicing fee + ${fmtM(c.benchmarkModel.cf.expenses, 2)} senior expenses first`, text: `The servicing fee and senior expenses (trustee, backup servicer, rating surveillance) sit above noteholders in the waterfall. Debt service is ${fmtM(dsNotes)} in year 1, so leaving ${fmtM(draft.base.rows[0].available * (c.benchmarkModel.cf.servicing / 100) + c.benchmarkModel.cf.expenses)} of senior costs out flatters DSCR materially.`, lesson: 'Compute DSCR on cash available after senior costs, exactly as the waterfall pays.' },
    trend: { stated: ap.cf.trend ? `${ap.cf.trend > 0 ? '+' : ''}${ap.cf.trend}% a year` : 'Flat', computed: `${fmtPct(histTrend)} a year (normalised history)`, text: `Collections net of one-offs went ${hist.map((x) => fmtM(x)).join(' → ')} over ${c.history.map((h) => h.period).join(', ')}. A seasoned catalog declining about ${fmtPct(-histTrend, 1)} a year can't be modelled as ${ap.cf.trend ? `${ap.cf.trend}% a year` : 'flat'}, and the decline compounds over a 25-year note.`, lesson: 'Base the collateral trend on normalised history, not the sponsor\'s growth plan.' },
    ltv: { stated: `Class A LTV ${fmtPct(ap.ltvA, 0)} on ${fmtM(ap.appraisal, 0)}`, computed: `Class A LTV ${fmtPct(bench.ltvA, 0)} on ${fmtM(bench.value, 0)}`, text: `The appraisal capitalises the unadjusted pro-forma tape at ${ap.value.rate}% with growth and no senior costs. On the eligible, limit-compliant borrowing base, net of fees, at ${c.benchmarkModel.value.rate}%, collateral is worth ${fmtM(bench.value, 0)}, so Class A alone is ${fmtPct(bench.ltvA, 0)} of value and all notes ${fmtPct(bench.ltvTotal, 0)}.`, lesson: 'Recompute LTV on your own collateral value; an appraisal is an input, not a conclusion.' },
    reserve: { stated: `${fmtM(c.structure.notes.reserve, 1)} "covers six months of debt service"`, computed: `${bench.reserveMonths.toFixed(1)} months of scheduled debt service`, text: `The reserve equals six months of Class A interest only (${bench.reserveMonthsAInterest.toFixed(1)} months). Against Class A interest, scheduled amortisation, and Class B interest it covers ${bench.reserveMonths.toFixed(1)} months.`, lesson: 'Check what a reserve is sized on, not just its headline.' },
    stress: { stated: `Sponsor stress (${sponsorStress.shock}% haircut): Class A repaid year ${sponsorStress.aRepaidYear ?? '—'}`, computed: `${severe.label}: ${severe.aLoss > 1000 ? `Class A loss ${fmtM(severe.aLoss)}` : `Class A repaid year ${severe.aRepaidYear}`}; A-loss break-even ${bench.breakeven.aLoss == null ? 'n/a' : `${bench.breakeven.aLoss.toFixed(0)}%`}`, text: `A ${sponsorStress.shock}% haircut is a normal year's volatility, not a stress. Test the notes against an agency-style scenario and solve for the haircut that first causes a Class A loss. Whether the break-even is enough is a judgement about rating level and your risk appetite.`, lesson: 'Report break-evens, not just scenarios the sponsor chose.' },
  }
  return c.checks.map((k) => ({ ...k, ...d[k.id] }))
}
