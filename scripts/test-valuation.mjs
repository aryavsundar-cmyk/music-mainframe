#!/usr/bin/env node
/** test-valuation.mjs — asserts the valuation engine against hand calculations for the Northstar case. `npm run test:valuation` */
import assert from 'node:assert/strict'
import { NORTHSTAR as c } from '../src/data/cases/northstar.js'
import { computeCase, asPresentedExec, benchmarkExec, reviewChecks, draftForecast, dcf, fmtM, fmtK, fmtX, fmtPct } from '../src/utils/valuation.js'

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (±${tol})`)
let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }

const draft = computeCase(c, asPresentedExec(c))
const bench = computeCase(c, benchmarkExec(c))

t('waterfall ties to stated net receipts', () => { assert.deepEqual(draft.wf.map((y) => y.net), [1148000, 1246000, 1397000, 1501000]) })
t('stream mix ties to LTM', () => { assert.equal(draft.streamTotal, 1501000); assert.equal(draft.counterpartyTotal, 1501000) })
t('inventory does NOT tie (draft error)', () => { assert.equal(draft.inventoryNet, 1601000) })
t('top-10 share is 53.5%, not 43%', () => near(draft.top10Share, 0.535, 0.001, 'top10'))
t('3-year CAGR is 9.3%, not 8.5%', () => near(draft.cagr3, 0.0935, 0.0005, 'cagr'))
t('draft normalised LTM = 1,408K', () => assert.equal(draft.normalized, 1408000))
t('benchmark normalised LTM excludes synergy = 1,396K', () => assert.equal(bench.normalized, 1396000))
t('draft base with $43K plug totals 1,365K', () => near(draft.baseTotal, 1365000, 1, 'base'))
t('benchmark base reconciles to normalised LTM', () => near(bench.baseTotal, bench.normalized, 1, 'bench base'))
t('draft forecast recomputed from its own assumptions', () => { const f = draftForecast(c); near(f[0], 1396400, 100, 'y1'); near(f[4], 1427200, 100, 'y5') })
t('discount factors at 12.5%', () => { const d = dcf({ cashflows: [1, 1, 1, 1, 1], rate: 0.125 }); assert.deepEqual(d.explicit.map((x) => +x.df.toFixed(3)), [0.889, 0.790, 0.702, 0.624, 0.555]) })
t('PV of stated explicit CFs = $5.085M', () => { const d = dcf({ cashflows: c.asPresented.forecastTotals, rate: 0.125 }); near(d.pvExplicit, 5085000, 2000, 'pv explicit') })
t('terminal PV on stated terms = $5.22M, not $5.9M', () => { const d = dcf({ cashflows: c.asPresented.forecastTotals, rate: 0.125, terminal: c.asPresented.terminal }); near(d.pvTerminal, 5216000, 2000, 'terminal') })
t('multiples on draft base', () => { assert.deepEqual(draft.multipleValues.map((v) => Math.round(v / 1000)), [10560, 11968, 13376]) })
t('Gordon terminal needs rate > g', () => { const d = dcf({ cashflows: [100], rate: 0.1, terminal: { method: 'gordon', g: 2 } }); near(d.valueAtN, 102 / 0.08, 0.01, 'gordon') })
t('bridge math', () => { const ex = benchmarkExec(c); const r = computeCase(c, ex); near(r.price, ex.headline - 133000 + 58000 + 20000 - 45000, 1, 'price'); near(r.cashAtClose, (r.price - 750000) * 0.95, 1, 'cash') })
t('what-must-be-true solves hit the ask', () => {
  const ex = benchmarkExec(c); const r = computeCase(c, ex)
  const at = computeCase(c, { ...ex, rateBuild: { ...ex.rateBuild, base: ex.rateBuild.base + (r.wmbt.rate * 100 - r.ratePct) } })
  near(at.dcf.ev, c.sellerAsk, 5000, 'rate solve')
})
t('ten review checks with text', () => { const k = reviewChecks(c); assert.equal(k.length, 10); for (const x of k) assert.ok(x.text && x.lesson, x.id) })

console.log(`\n${n} checks passed`)
console.log(`draft: normalised ${fmtK(draft.normalized)} · DCF ${fmtM(draft.dcf.ev, 2)} (${fmtX(draft.impliedMultiple)}) · multiples ${draft.multipleValues.map((v) => fmtM(v)).join('/')}`)
console.log(`bench: normalised ${fmtK(bench.normalized)} · base ${fmtK(bench.baseTotal)} · Y1 ${fmtK(bench.totals[0])} · DCF ${fmtM(bench.dcf.ev, 2)} (${fmtX(bench.impliedMultiple)}) · terminal share ${fmtPct(bench.dcf.terminalShare)} · multiples ${bench.multipleValues.map((v) => fmtM(v, 2)).join('/')}`)
console.log(`bench: headline ${fmtM(bench.headline, 2)} → price ${fmtM(bench.price, 2)} · cash at close ${fmtM(bench.cashAtClose, 2)} · ask needs ${fmtX(bench.wmbt.multiple)} or rate ${fmtPct(bench.wmbt.rate)} or trend ${bench.wmbt.trend?.toFixed(2)}% or CF uplift ${fmtPct(bench.wmbt.uplift - 1)}`)
console.log('scenarios:', bench.scenarios.map((s) => `${s.label} ${fmtM(s.ev)} (stated ${fmtM(s.stated)})`).join(' · '))
