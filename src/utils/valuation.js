/**
 * valuation.js — the catalog-valuation engine behind the Valuation Lab. Pure functions, Node-testable
 * (scripts/test-valuation.mjs). Every number the lab shows is computed here from the case data and the trainee's
 * choices, so the model can never drift from its inputs.
 *
 * computeCase(c, exec) → earnings history · concentration · normalisation · stream-level forecast base (structural
 * allocation, so an adjustment can't be counted twice) · forecast · risk-built discount rate · DCF (end- or
 * mid-year; finite-life declining, Gordon, or none) · multiples · sensitivity grid · purchase-price bridge ·
 * "what must be true" solves for the seller's ask.
 * reviewChecks(c) recomputes the draft case and reports where its stated figures don't follow from its inputs.
 */

export const sum = (xs) => xs.reduce((a, b) => a + (Number(b) || 0), 0)
export const num = (v) => { const n = Number(String(v ?? '').replace(/[^0-9.-]/g, '')); return Number.isFinite(n) ? n : 0 }

// ── formatting (lab-specific: $K tables, $M conclusions) ─────────────────────────
export const fmtK = (v) => (v == null || Number.isNaN(v) ? '—' : `${v < 0 ? '−' : ''}$${Math.round(Math.abs(v) / 1000).toLocaleString('en-US')}K`)
export const fmtM = (v, d = 1) => (v == null || Number.isNaN(v) ? '—' : `${v < 0 ? '−' : ''}$${(Math.abs(v) / 1e6).toFixed(d)}M`)
export const fmtPct = (v, d = 1) => (v == null || Number.isNaN(v) ? '—' : `${(v * 100).toFixed(d)}%`)
export const fmtX = (v, d = 1) => (v == null || !Number.isFinite(v) ? '—' : `${v.toFixed(d)}x`)

// ── building blocks ──────────────────────────────────────────────────────────────
export function waterfall(history) {
  return history.map((y, i) => {
    const net = y.gross - y.participations - y.fees - y.reserves
    const prev = i ? history[i - 1] : null
    const prevNet = prev ? prev.gross - prev.participations - prev.fees - prev.reserves : null
    return { ...y, net, deductions: y.participations + y.fees + y.reserves, netMargin: net / y.gross, growth: prevNet ? net / prevNet - 1 : null }
  })
}

export function dcf({ cashflows, rate, midYear = false, terminal = { method: 'none' }, startYear = 1 }) {
  const shift = midYear ? 0.5 : 0
  const explicit = cashflows.map((cf, i) => { const t = i + 1 - shift; const df = 1 / (1 + rate) ** t; return { year: startYear + i, cf, t, df, pv: cf * df } })
  const pvExplicit = sum(explicit.map((x) => x.pv))
  const n = cashflows.length
  const last = cashflows[n - 1]
  const g = num(terminal.g) / 100
  let pvTerminal = 0; let firstCf = 0; let valueAtN = 0; const terminalRows = []
  if (terminal.method === 'finite') {
    firstCf = num(terminal.firstCf) || last * (1 + g)
    const years = Math.max(0, Math.round(num(terminal.years)))
    for (let k = 1; k <= years; k++) {
      const cf = firstCf * (1 + g) ** (k - 1)
      const pv = cf / (1 + rate) ** (n + k - shift)
      pvTerminal += pv; terminalRows.push({ year: startYear + n + k - 1, cf, pv })
    }
    valueAtN = pvTerminal * (1 + rate) ** n
  } else if (terminal.method === 'gordon') {
    firstCf = num(terminal.firstCf) || last * (1 + g)
    if (rate > g) { valueAtN = firstCf / (rate - g); pvTerminal = valueAtN / (1 + rate) ** (n - shift) }
  }
  const horizon = n + (terminal.method === 'finite' ? Math.round(num(terminal.years)) : terminal.method === 'gordon' ? Infinity : 0)
  return { rate, explicit, pvExplicit, pvTerminal, ev: pvExplicit + pvTerminal, firstCf, valueAtN, terminalRows, horizon, terminalShare: pvTerminal / (pvExplicit + pvTerminal || 1) }
}

/** Bisection: find x in [lo, hi] with fn(x) ≈ target. Returns null if the target isn't bracketed. */
export function solve(fn, target, lo, hi, iters = 100) {
  let flo = fn(lo) - target; const fhi = fn(hi) - target
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return null
  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) / 2; const fm = fn(mid) - target
    if (Math.abs(fm) < 0.5) return mid
    if (flo * fm <= 0) hi = mid; else { lo = mid; flo = fm }
  }
  return (lo + hi) / 2
}

// ── the full case model ──────────────────────────────────────────────────────────
export function computeCase(c, exec) {
  const wf = waterfall(c.history)
  const ltm = wf[wf.length - 1].net
  const first = wf[0].net
  const cagr3 = (ltm / first) ** (1 / (wf.length - 1)) - 1

  // mix & concentration
  const streamLtm = Object.fromEntries(c.streams.map((s) => [s.id, s.hist[s.hist.length - 1]]))
  const streamTotal = sum(Object.values(streamLtm))
  const titled = c.inventory.filter((r) => !r.longTail).sort((a, b) => b.net - a.net)
  const inventoryNet = sum(c.inventory.map((r) => r.net))
  const top1Share = titled[0].net / ltm
  const top10Share = sum(titled.slice(0, 10).map((r) => r.net)) / ltm
  const counterpartyTotal = sum(c.counterparties.map((x) => x.net))

  // normalisation
  const norm = c.normalization.map((it) => {
    const choice = exec.norm?.[it.id] || {}
    const treatment = choice.treatment || 'accept'
    const applied = treatment === 'accept' ? it.amount : treatment === 'reject' ? 0 : num(choice.amount)
    return { ...it, treatment, applied }
  })
  const normalized = ltm + sum(norm.map((r) => r.applied))

  // forecast base: each adjustment lands in exactly one stream (or pro rata), so nothing double counts
  const base = { ...streamLtm }
  for (const r of norm) {
    if (!r.applied) continue
    if (r.stream === 'pro-rata') for (const k of Object.keys(base)) base[k] += r.applied * (streamLtm[k] / streamTotal)
    else base[r.stream] += r.applied
  }
  const leakage = num(exec.leakage)
  if (leakage) for (const k of Object.keys(base)) base[k] -= leakage * (streamLtm[k] / streamTotal)
  const baseTotal = sum(Object.values(base))

  const years = c.forecastYears
  const forecast = c.streams.map((s) => {
    const g = exec.growth?.[s.id] || years.map(() => 0)
    let v = base[s.id]
    const vals = years.map((_, i) => (v = v * (1 + num(g[i]) / 100)))
    return { id: s.id, label: s.label, base: base[s.id], growth: g, vals }
  })
  const totals = years.map((_, i) => sum(forecast.map((r) => r.vals[i])))

  // discount rate & DCF
  const rateRows = c.rateBuild.map((x) => ({ ...x, pct: exec.rateBuild?.[x.id] ?? x.pct }))
  const ratePct = sum(rateRows.map((x) => num(x.pct)))
  const rate = ratePct / 100
  const terminal = exec.terminal || { method: 'none' }
  const run = (r, g = terminal.g, cfs = totals) => dcf({ cashflows: cfs, rate: r, midYear: !!exec.midYear, terminal: { ...terminal, g }, startYear: years[0] })
  const d = run(rate)

  // multiples
  const mults = (exec.multiples || [7.5, 8.5, 9.5]).map(num)
  const multipleValues = mults.map((m) => normalized * m)
  const impliedMultiple = d.ev / normalized

  // sensitivity: discount rate × long-run trend (applied to the terminal period; explicit forecast held)
  const gridRates = [10, 11, 12.5, 14, 16]
  const gridTrends = [0.5, -0.5, -1.5, -2.5, -4]
  const grid = gridRates.map((rp) => ({ rate: rp, cells: gridTrends.map((g) => ({ g, ev: run(rp / 100, g).ev })) }))
  const scenarios = (c.asPresented.sensitivity || []).map((s) => ({ ...s, ev: run(s.rate / 100, s.g).ev }))

  // purchase-price bridge
  const headline = num(exec.headline)
  const bridge = c.bridge.map((b) => { const ch = exec.bridge?.[b.id] || {}; return { ...b, include: !!ch.include, amount: ch.amount != null && ch.amount !== '' ? num(ch.amount) : b.amount } })
  const price = headline + sum(bridge.filter((b) => b.include).map((b) => b.amount))
  const escrowPct = num(exec.structure?.escrowPct)
  const earnout = num(exec.structure?.earnout)
  const fixed = price - earnout
  const escrow = fixed * (escrowPct / 100)
  const cashAtClose = fixed - escrow

  // what must be true for the seller's ask
  const ask = c.sellerAsk
  const wmbt = {
    ask,
    multiple: ask / normalized,
    ltmAtBaseMultiple: ask / (mults[1] || 8.5),
    rate: solve((r) => run(r).ev, ask, 0.01, 0.4),
    trend: terminal.method === 'finite' || terminal.method === 'gordon' ? solve((g) => run(rate, g).ev, ask, -20, Math.min(rate * 100 - 0.1, 20)) : null,
    uplift: solve((u) => run(rate, terminal.g, totals.map((t) => t * u)).ev, ask, 0.5, 3),
  }

  return {
    wf, ltm, cagr3, streamLtm, streamTotal, inventoryNet, top1Share, top10Share, counterpartyTotal,
    norm, normalized, base, leakage, baseTotal, years, forecast, totals,
    rateRows, ratePct, rate, dcf: d, mults, multipleValues, impliedMultiple, grid, gridRates, gridTrends, scenarios,
    headline, bridge, price, escrowPct, escrow, earnout, cashAtClose, wmbt,
  }
}

// ── the draft's own model, and the review checks against it ─────────────────────
export function asPresentedExec(c) {
  return {
    norm: Object.fromEntries(c.normalization.map((n) => [n.id, { treatment: 'accept', amount: n.amount }])),
    growth: JSON.parse(JSON.stringify(c.growthAsPresented)),
    leakage: c.asPresented.leakage,
    rateBuild: Object.fromEntries(c.rateBuild.map((x) => [x.id, x.pct])),
    midYear: false,
    terminal: { ...c.asPresented.terminal },
    multiples: [...c.asPresented.multiples],
    findings: {},
    headline: c.asPresented.headline,
    bridge: Object.fromEntries(c.bridge.map((b) => [b.id, { include: false, amount: b.amount }])),
    structure: { escrowPct: 0, earnout: 0 },
    checks: {},
  }
}

export function benchmarkExec(c) {
  const ex = asPresentedExec(c)
  ex.norm = Object.fromEntries(c.normalization.map((n) => [n.id, { treatment: n.benchmark, amount: n.amount }]))
  ex.leakage = 0
  ex.terminal = { ...c.asPresented.terminal, firstCf: '' }
  ex.findings = Object.fromEntries(c.findings.map((f) => [f.id, { ...f.benchmark }]))
  ex.bridge = Object.fromEntries(c.bridge.map((b) => [b.id, { include: b.benchmark, amount: b.amount }]))
  ex.structure = { ...c.structureBenchmark }
  const r = computeCase(c, ex)
  ex.headline = Math.round(((r.dcf.ev + r.multipleValues[0]) / 2) / 50000) * 50000 // anchor between corrected DCF and the multiple floor
  ex.checks = Object.fromEntries(c.checks.map((k) => [k.id, { verdict: 'issue', revealed: true }]))
  return ex
}

/** Draft forecast exactly as the draft built it: its stated stream base × its stated growth rates. */
export function draftForecast(c) {
  return c.forecastYears.map((_, i) => sum(c.streams.map((s) => {
    const g = c.growthAsPresented[s.id]
    return c.asPresented.forecastBase[s.id] * g.slice(0, i + 1).reduce((a, x) => a * (1 + x / 100), 1)
  })))
}

export function reviewChecks(c) {
  const draft = computeCase(c, asPresentedExec(c))
  const ap = c.asPresented
  const recomputed = draftForecast(c)
  const statedCfDcf = dcf({ cashflows: ap.forecastTotals, rate: 0.125, terminal: ap.terminal, startYear: c.forecastYears[0] })
  const statedCfMid = dcf({ cashflows: ap.forecastTotals, rate: 0.125, midYear: true, terminal: ap.terminal, startYear: c.forecastYears[0] })
  const synergy = c.normalization.find((n) => n.id === 'admin-synergy')
  const viral = c.normalization.find((n) => n.id === 'viral')
  const streamMap = Object.fromEntries(c.streams.map((s) => [s.id, s.hist[s.hist.length - 1]]))
  const syncAvg = sum(c.streams.find((s) => s.id === 'sync').hist) / c.periods.length
  const maxForecastGap = Math.max(...ap.forecastTotals.map((t, i) => t - recomputed[i]))
  const reversionYear = new Date(c.valuationDate).getFullYear() + ap.contractTerm
  const horizonEnd = c.forecastYears[0] + draft.dcf.horizon - 1

  const detail = {
    inventory: { stated: fmtK(ap.inventoryTotal), computed: fmtK(draft.inventoryNet), text: `The title rows plus the long tail sum to ${fmtK(draft.inventoryNet)}, not the ${fmtK(draft.ltm)} LTM net receipts the rest of the model uses — a ${fmtK(draft.inventoryNet - draft.ltm)} gap. Until the inventory ties to the royalty ledger, title-level concentration and any title-level price adjustment are unreliable.`, lesson: 'Tie every data-room table to the cash ledger before you analyse it.' },
    top10: { stated: fmtPct(ap.top10Share, 0), computed: fmtPct(draft.top10Share), text: `The ten named titles earn ${fmtK(sum(c.inventory.filter((r) => !r.longTail).map((r) => r.net)))}, which is ${fmtPct(draft.top10Share)} of LTM net receipts — not 43%. Concentration is materially worse than the profile says, which should push the title-concentration premium and the earn-out conversation.`, lesson: 'Recompute headline ratios from the rows; profiles get copied forward unchecked.' },
    cagr: { stated: fmtPct(ap.cagr3), computed: fmtPct(draft.cagr3), text: `Net receipts went from ${fmtK(draft.wf[0].net)} (2023A) to ${fmtK(draft.ltm)} (LTM 2026): a three-year CAGR of ${fmtPct(draft.cagr3)}. Two-year 2023A→2025A is ${fmtPct((draft.wf[2].net / draft.wf[0].net) ** 0.5 - 1)}. Neither is 8.5%. Define the period, then let the number follow.`, lesson: 'State the start point, end point, and basis for every growth rate.' },
    synergy: { stated: fmtK(ap.normalizedLtm), computed: fmtK(draft.ltm + sum(c.normalization.filter((n) => n.benchmark === 'accept').map((n) => n.amount))), text: `Normalised LTM includes +${fmtK(synergy.amount)} from Meridian's lower admin rate. That is a buyer synergy, not standalone earnings — at 8.5x it adds about ${fmtM(synergy.amount * 8.5, 2)} to the price paid to the seller, contradicting the case's own rule. Standalone normalised LTM is ${fmtK(draft.ltm + sum(c.normalization.filter((n) => n.benchmark === 'accept').map((n) => n.amount)))}.`, lesson: 'Keep buyer synergies out of the seller\'s price; show them in buyer returns.' },
    allocation: { stated: fmtK(sum(Object.values(ap.forecastBase))), computed: fmtK(draft.normalized), text: `The draft's forecast base deducts the ${fmtK(Math.abs(viral.amount))} viral normalisation from BOTH UGC (${fmtK(streamMap.ugc)}→${fmtK(ap.forecastBase.ugc)}) and master streaming (${fmtK(streamMap.masterStreaming)}→${fmtK(ap.forecastBase.masterStreaming)}), leaves performance untouched despite −$21K and +$18K adjustments, and never allocates the +$12K. The resulting ${fmtK(sum(Object.values(ap.forecastBase)) - draft.normalized)} gap is then explained after the fact as "$43K of cash-timing leakage". A real leakage belongs in the model with evidence, not as a plug.`, lesson: 'Allocate each normalisation to exactly one stream; reconcile the forecast base to normalised LTM.' },
    forecast: { stated: ap.forecastTotals.map((t) => fmtK(t)).join(' · '), computed: recomputed.map((t) => fmtK(t)).join(' · '), text: `Applying the draft's own growth rates to its own stream base gives totals ${fmtK(maxForecastGap)} lower by 2030. The stated forecast doesn't follow from its assumptions, and every overstated year flows into the DCF.`, lesson: 'Rebuild the forecast from assumptions; never type totals.' },
    terminal: { stated: fmtM(ap.terminalPv), computed: `${fmtM(statedCfDcf.pvTerminal, 2)} (end-year) · ${fmtM(statedCfMid.pvTerminal, 2)} (mid-year)`, text: `A 20-year annuity starting at $1.415M, declining 1.5% a year, discounted at 12.5% from 2032, is worth ${fmtM(statedCfDcf.pvTerminal, 2)} today — ${fmtM(statedCfMid.pvTerminal, 2)} even with a mid-year convention. The draft's $5.9M overstates it by about ${fmtM(ap.terminalPv - statedCfDcf.pvTerminal, 1)}, so its $11.0M DCF is really ${fmtM(statedCfDcf.ev, 1)} on its own cash flows.`, lesson: 'Terminal value is usually half the answer — recompute it every time.' },
    'dcf-vs-multiple': { stated: `${fmtX(ap.dcfEv / ap.normalizedLtm)} implied`, computed: `${fmtX(statedCfDcf.ev / ap.normalizedLtm)} implied`, text: `Corrected, the draft's DCF implies ${fmtX(statedCfDcf.ev / ap.normalizedLtm)} normalised LTM — below the 7.5x floor of its own multiple range. Triangulation should explain that gap (is the market pricing lower risk, longer duration, or a different earnings base?) rather than average across it.`, lesson: 'When methods disagree, the reason is the finding.' },
    horizon: { stated: `${draft.dcf.horizon}-year cash-flow horizon (to ${horizonEnd})`, computed: `${ap.contractTerm}-year weighted contract term (≈${reversionYear}) with early reversions`, text: `The draft runs cash flows ${draft.dcf.horizon} years, but some publishing rights revert or become terminable and existing contracts average ${ap.contractTerm} years remaining. Copyright can outlast contracts, so the long horizon may be fine for owned rights — but reverting titles must be cut off at their reversion dates in a title-level schedule.`, lesson: 'Forecast only the enforceable economic life, title by title where it matters.' },
    'sync-run-rate': { stated: fmtK(ap.forecastBase.sync), computed: `${fmtK(syncAvg)} four-year average`, text: `Normalised sync of ${fmtK(ap.forecastBase.sync)} sits well below every historical year (${c.streams.find((s) => s.id === 'sync').hist.map(fmtK).join(', ')}). Either earlier years also contained one-offs — test the license log — or the run rate is conservative. Not an error; a judgement you should be able to defend at IC.`, lesson: 'Conservative is a position, not a default. Evidence it.' },
  }
  return c.checks.map((k) => ({ ...k, ...detail[k.id] }))
}
