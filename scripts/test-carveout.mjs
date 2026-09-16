#!/usr/bin/env node
/** test-carveout.mjs — asserts the carve-out engine against hand calculations for the Beacon case. `npm run test:carveout` */
import assert from 'node:assert/strict'
import { BEACON as c } from '../src/data/cases/beacon.js'
import { computeCarve, asPresentedCarve, benchmarkCarve, benchmarkOffer, reviewCarveChecks } from '../src/utils/carveout.js'
import { benchmarkState, defaultState, scorecard, progress } from '../src/utils/labState.js'
import { buildCarveMemo } from '../src/utils/carveDocs.js'
import { buildPitchMemo, buildWorkplan } from '../src/utils/labDocs.js'
import { renderBriefText } from '../src/utils/briefText.js'
import { renderBriefMarkdown } from '../src/utils/briefMarkdown.js'
import { briefDocxBuffer } from '../src/utils/briefDocx.js'
import { briefPptxBuffer } from '../src/utils/briefPptx.js'
import { fmtM, fmtX, fmtPct, sum } from '../src/utils/valuation.js'

const M = 1e6
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (±${tol})`)
let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }

const draft = computeCarve(c, asPresentedCarve(c))
const bench = computeCarve(c, benchmarkCarve(c))

t('carve-out P&L ties: $128.0M revenue less $93.0M cost = $35.0M reported EBITDA', () => {
  near(draft.revenueTotal, 128 * M, 1, 'revenue'); near(draft.costTotal, 93 * M, 1, 'cost')
  near(draft.reported, c.asPresented.reportedEbitda, 1, 'ebitda'); near(draft.reportedMargin, 35 / 128, 1e-9, 'margin')
})
t('parent is 62% of revenue', () => near(draft.parentShare, 79 / 128, 1e-9, 'parent share'))
t('vendor pack: $38.0M adjusted EBITDA from three add-backs', () => {
  near(draft.vendorEbitda, c.asPresented.adjEbitda, 1, 'vendor'); near(draft.standaloneEbitda, 38 * M, 1, 'draft standalone')
  assert.equal(draft.standaloneDelta, 0, 'draft treats allocations as standalone cost')
})
t('standalone cost build: $9.0M allocated → $13.4M standalone', () => {
  near(bench.allocationTotal, 9 * M, 1, 'allocation'); near(bench.standaloneCostTotal, 13.4 * M, 1, 'standalone'); near(bench.standaloneDelta, 4.4 * M, 1, 'delta')
})
t('the standalone bridge line is computed from the cost build, not typed', () => {
  const ex = benchmarkCarve(c); ex.functions.exec = 5 * M
  const r = computeCarve(c, ex)
  near(r.bridge.find((b) => b.id === 'standalone').applied, -(4.4 * M + 2 * M), 1, 'bridge follows the build')
  near(r.standaloneEbitda, bench.standaloneEbitda - 2 * M, 1, 'EBITDA follows')
})
t('reviewer standalone EBITDA $25.1M (19.6% margin)', () => {
  near(bench.standaloneEbitda, 25.1 * M, 1, 'standalone')
  near(bench.standaloneEbitda, 35 * M + 1.5 * M + 0.6 * M - 3.5 * M - 2.5 * M - 4.4 * M - 2 * M + 0.4 * M, 1, 'hand bridge')
  near(bench.standaloneMargin, 25.1 / 128, 1e-4, 'margin')
})
t('partial treatment takes half the service-level adjustment', () => near(bench.bridge.find((b) => b.id === 'service-levels').applied, 0.4 * M, 1, 'partial'))
t('separation register totals $18.6M when every item is carried', () => near(bench.separationTotal, sum(c.separation.map((x) => x.amount)), 1, 'separation'))
t('TSA schedule: year 1 $4.08M net, year 2 $2.40M, PV $5.69M at 10%', () => {
  near(bench.tsaYears[0], (12 * 0.22 + 12 * 0.18 + 12 * 0.09 - 12 * 0.15) * M, 1, 'y1')
  near(bench.tsaYears[1], (6 * 0.22 + 12 * 0.09) * M, 1, 'y2')
  near(bench.tsaPv, bench.tsaYears[0] / 1.1 + bench.tsaYears[1] / 1.21, 1, 'pv')
})
t('reverse TSA is income: dropping it raises the net cost', () => {
  const ex = benchmarkCarve(c); ex.tsa['out-data'].months = 0
  assert.ok(computeCarve(c, ex).tsaTotal > bench.tsaTotal)
})
t('enterprise value = multiple × standalone EBITDA less separation and TSA', () => {
  near(bench.evGross, 9 * bench.standaloneEbitda, 1, 'gross'); near(bench.deductions, bench.separationTotal + bench.tsaPv, 1, 'deductions')
  near(bench.ev, bench.evGross - bench.deductions, 1, 'ev'); near(bench.cheque, bench.ev * 0.7, 1, 'cheque')
  near(bench.ev, 201.6 * M, 0.2 * M, 'about $202M')
})
t('vendor pack prices above its own guide; the standalone case is 41% below', () => {
  assert.ok(draft.ev > c.asPresented.askEv); near(bench.wmbt.gapPct, (c.asPresented.askEv - bench.ev) / c.asPresented.askEv, 1e-9, 'gap')
  assert.ok(bench.wmbt.gapPct > 0.35 && bench.wmbt.gapPct < 0.45, `gap ${bench.wmbt.gapPct}`)
})
t('what must be true: the guide needs 14.5x standalone or $40.5M of EBITDA', () => {
  near(bench.wmbt.multiple, (c.asPresented.askEv + bench.deductions) / bench.standaloneEbitda, 1e-9, 'multiple')
  near(bench.wmbt.ebitda, (c.asPresented.askEv + bench.deductions) / 9, 1, 'ebitda')
  near(computeCarve(c, { ...benchmarkCarve(c), valuation: { ...benchmarkCarve(c).valuation, multiple: bench.wmbt.multiple } }).ev, c.asPresented.askEv, 5, 'solve ties back')
})
t('ten review checks with text', () => { const k = reviewCarveChecks(c); assert.equal(k.length, 10); for (const x of k) assert.ok(x.stated && x.computed && x.text && x.lesson, x.id) })
t('reviewer answers score 100%; a fresh case scores low', () => {
  const s = benchmarkState(c); const sc = scorecard(c, s, computeCarve(c, s.exec), bench)
  assert.equal(sc.score, sc.max, JSON.stringify(sc.rows.filter((r) => r.score < r.max)))
  const d = defaultState(c); const dsc = scorecard(c, d, computeCarve(c, d.exec), bench)
  assert.ok(dsc.pct < 0.25, `fresh ${dsc.pct}`); assert.equal(progress(c, s).overall, 1)
})
t('benchmark offer: range, recommendation, and conditions', () => {
  const o = benchmarkOffer(c)
  assert.ok(o.low < o.offer && o.offer < o.high); near(o.offer, bench.ev, 0.5 * M, 'offer'); assert.ok(o.conditions.includes('services-agreement'))
})
const docsFor = (s) => [buildPitchMemo(c, s), buildWorkplan(c, s), buildCarveMemo(c, s, computeCarve(c, s.exec))]
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
console.log('✓ carve-out memo, pitch memo, and workplan render to Word and slides')

console.log(`\n${n} checks passed`)
console.log(`vendor:   ${fmtM(draft.vendorEbitda, 1)} adjusted EBITDA · ${fmtX(draft.multiple)} · ${fmtM(draft.ev, 0)} EV · guide ${fmtM(c.asPresented.askEv, 0)}`)
console.log(`reviewer: ${fmtM(bench.standaloneEbitda, 1)} standalone (${fmtPct(bench.standaloneMargin, 1)}) · separation ${fmtM(bench.separationTotal, 1)} · TSA PV ${fmtM(bench.tsaPv, 1)} · ${fmtX(bench.multiple)} → ${fmtM(bench.ev, 0)} EV · ${fmtM(bench.cheque, 0)} for ${bench.stake * 100}% · guide needs ${fmtX(bench.wmbt.multiple)} (gap ${fmtPct(bench.wmbt.gapPct, 0)})`)
