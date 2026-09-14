#!/usr/bin/env node
/** test-abs.mjs — asserts the royalty-ABS engine against hand calculations for the Cadence 2026-1 case. `npm run test:abs` */
import assert from 'node:assert/strict'
import { CADENCE as c } from '../src/data/cases/cadence.js'
import { computeAbs, asPresentedAbs, benchmarkAbs, benchmarkCredit, reviewAbsChecks, waterfall, collateral } from '../src/utils/abs.js'
import { benchmarkState, defaultState, scorecard, progress } from '../src/utils/labState.js'
import { buildCreditMemo } from '../src/utils/absDocs.js'
import { buildPitchMemo, buildWorkplan } from '../src/utils/labDocs.js'
import { renderBriefText } from '../src/utils/briefText.js'
import { renderBriefMarkdown } from '../src/utils/briefMarkdown.js'
import { briefDocxBuffer } from '../src/utils/briefDocx.js'
import { briefPptxBuffer } from '../src/utils/briefPptx.js'
import { fmtM, fmtX, fmtPct } from '../src/utils/valuation.js'

const M = 1e6
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (±${tol})`)
let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }
const annuity = (r, years) => (1 - (1 + r) ** -years) / r

const draft = computeAbs(c, asPresentedAbs(c))
const bench = computeAbs(c, benchmarkAbs(c))
const ds1 = 220 * M * 0.06 + 220 * M * 0.02 + 40 * M * 0.085

t('tape sums to $38.0M and history ties LTM bank receipts to tape less the accrual', () => { near(draft.tapeTotal, 38 * M, 1, 'tape'); near(c.history.at(-1).collections, 38 * M - 0.8 * M, 1, 'bank') })
t('offering pro forma = tape + $1.6M add-backs = $39.6M', () => near(draft.borrowingBase, c.asPresented.offeringNcf, 1, 'offering'))
t('offering DSCR 1.89x and appraisal ≈ $400M reproduce from the sponsor inputs', () => {
  near(draft.base.dscr1, 39.6 / 21.0, 1e-9, 'dscr'); near(draft.value, 39.6 * M * annuity(0.08, 22), 1, 'value')
  near(draft.ltvA, c.asPresented.ltvA, 0.01, 'ltv')
})
t('normalised $35.4M; eligible $31.96M after 40% Vega, 100% Delacroix, 25% Northline', () => { near(bench.normalized, 35.4 * M, 1, 'norm'); near(bench.eligible, 35.4 * M - 0.4 * 3.1 * M - 1.8 * M - 0.25 * 1.6 * M, 1, 'eligible') })
t('concentration: Anthem single-asset and Sato sync excess on the eligible pool', () => {
  near(bench.singleExcess, 4.2 * M - 0.1 * bench.eligible, 1, 'anthem'); near(bench.syncExcess, 2.0 * M - 0.05 * bench.eligible, 1, 'sync'); assert.equal(bench.nonUsdExcess, 0)
  near(bench.borrowingBase, bench.eligible - bench.singleExcess - bench.syncExcess, 1, 'base')
})
t('limits off → no excess; eligibility off → eligible equals normalised', () => { const col = collateral(c, { ...benchmarkAbs(c), limits: { ...c.structure.limits, apply: false }, elig: {} }); assert.equal(col.borrowingBase, col.normalized) })
t('year-1 available = base × (1 − 6%) − $0.8M; DSCR on scheduled debt service', () => {
  near(bench.base.rows[0].available, bench.borrowingBase * 0.94 - 0.8 * M, 1, 'available'); near(bench.base.dscr1, bench.base.rows[0].available / ds1, 1e-9, 'dscr')
})
t('collateral value = PV of declining available cash over 22 years at 8%', () => {
  let pv = 0; for (let k = 1; k <= 22; k++) pv += (bench.borrowingBase * 0.99 ** (k - 1) * 0.94 - 0.8 * M) / 1.08 ** k
  near(bench.value, pv, 1, 'value')
})
t('reserve $6.6M = 6.0 months of Class A interest but 3.8 months of scheduled debt service', () => { near(bench.reserveMonthsAInterest, 6, 1e-9, 'A int'); near(bench.reserveMonths, 6.6 / (21 / 12), 1e-9, 'DS') })
t('break-even haircut to trip the cash trap in year 1 matches the closed form', () => near(bench.breakeven.trapYear1, (1 - (1.25 * ds1 + 0.8 * M) / (bench.borrowingBase * 0.94)) * 100, 0.01, 'trap'))
t('waterfall conserves cash every year, in base and severe scenarios', () => {
  for (const w of [bench.base, bench.scenarios.find((s) => s.id === 'severe'), draft.base]) for (const x of w.rows) near(x.aIntPaid + x.aSchedPaid + x.bIntPaid + x.aSweep + x.bPrin + x.released + x.reserveIn - x.reserveOut, x.available, 1, `year ${x.t}`)
})
t('base case repays both classes; post-ARD years sweep', () => { assert.ok(bench.base.aRepaidYear && bench.base.bRepaidYear); assert.equal(bench.base.rows[c.structure.ard].status, 'post-ARD sweep') })
t('offered Class A takes a loss in the severe scenario; the offering\'s own model does not', () => {
  assert.ok(bench.scenarios.find((s) => s.id === 'severe').aLoss > 1000); assert.equal(draft.scenarios.find((s) => s.id === 'severe').aLoss, 0)
})
t('maximum Class A passes every test and $1M more fails one', () => {
  const ex = benchmarkAbs(c); const col = collateral(c, ex)
  const test = (size) => { const w = waterfall(c, ex, col, {}, { aSize: size }); const sv = waterfall(c, ex, col, c.scenarios.find((s) => s.id === 'severe'), { aSize: size }); return w.dscr1 >= c.targets.dscr && size / bench.value <= c.targets.ltvA / 100 && sv.aLoss <= 1000 }
  assert.ok(test(bench.maxA)); assert.ok(!test(bench.maxA + 1 * M))
  assert.ok(bench.maxA < 220 * M && bench.maxA > 100 * M, `maxA ${bench.maxA}`)
})
t('break-evens are ordered: trap < B shortfall < A loss', () => assert.ok(bench.breakeven.trapYear1 < bench.breakeven.bLoss && bench.breakeven.bLoss < bench.breakeven.aLoss))
t('ten review checks with text', () => { const k = reviewAbsChecks(c); assert.equal(k.length, 10); for (const x of k) assert.ok(x.stated && x.computed && x.text && x.lesson, x.id) })
t('reviewer answers score 100%; a fresh case scores low', () => {
  const s = benchmarkState(c); const sc = scorecard(c, s, computeAbs(c, s.exec), bench)
  assert.equal(sc.score, sc.max, JSON.stringify(sc.rows.filter((r) => r.score < r.max)))
  const d = defaultState(c); const dsc = scorecard(c, d, computeAbs(c, d.exec), bench)
  assert.ok(dsc.pct < 0.2, `fresh ${dsc.pct}`); assert.equal(progress(c, s).overall, 1)
})
t('credit recommendation from the benchmark', () => { const b = benchmarkCredit(c); assert.equal(b.recommendation, 'conditions'); assert.equal(b.maxA, bench.maxA) })
const docsFor = (s) => [buildPitchMemo(c, s), buildWorkplan(c, s), buildCreditMemo(c, s, computeAbs(c, s.exec))]
t('documents build and render to text and Markdown (reviewer and fresh state)', () => {
  for (const s of [benchmarkState(c), defaultState(c)]) for (const doc of docsFor(s)) {
    for (const sec of doc.sections) assert.ok(sec.blocks.length, `${doc.slug} ${sec.title}`)
    assert.ok(renderBriefText(doc).length > 500 && renderBriefMarkdown(doc).length > 500, doc.slug)
  }
})
for (const doc of docsFor(benchmarkState(c))) {
  const [docx, pptx] = await Promise.all([briefDocxBuffer(doc), briefPptxBuffer(doc)])
  assert.ok(docx.length > 5000 && pptx.length > 20000, `${doc.slug} binary exports`); n++
}
console.log('✓ credit memo, pitch memo, and workplan render to Word and slides')

console.log(`\n${n} checks passed`)
console.log(`offering: base ${fmtM(draft.borrowingBase)} · DSCR ${fmtX(draft.base.dscr1, 2)} · value ${fmtM(draft.value, 0)} · A LTV ${fmtPct(draft.ltvA, 0)}`)
console.log(`review:   base ${fmtM(bench.borrowingBase, 2)} · DSCR ${fmtX(bench.base.dscr1, 2)} · value ${fmtM(bench.value, 0)} · A LTV ${fmtPct(bench.ltvA, 0)} · all ${fmtPct(bench.ltvTotal, 0)} · break-evens trap ${bench.breakeven.trapYear1.toFixed(1)}% / B ${bench.breakeven.bLoss.toFixed(1)}% / A ${bench.breakeven.aLoss.toFixed(1)}% · max Class A ${fmtM(bench.maxA, 0)}`)
