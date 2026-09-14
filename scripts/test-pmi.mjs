#!/usr/bin/env node
/** test-pmi.mjs — asserts the PMI engine against hand calculations for the Halcyon + Brightwater case. `npm run test:pmi` */
import assert from 'node:assert/strict'
import { HALCYON as c } from '../src/data/cases/halcyon.js'
import { computePmi, asPresentedPmi, benchmarkPmi, benchmarkBoard, reviewPmiChecks, leverMatches } from '../src/utils/pmi.js'
import { benchmarkState, defaultState, scorecard, progress } from '../src/utils/labState.js'
import { buildBoardMemo } from '../src/utils/pmiDocs.js'
import { buildPitchMemo, buildWorkplan } from '../src/utils/labDocs.js'
import { fmtM, fmtX } from '../src/utils/valuation.js'
import { renderBriefText } from '../src/utils/briefText.js'
import { renderBriefMarkdown } from '../src/utils/briefMarkdown.js'
import { briefDocxBuffer } from '../src/utils/briefDocx.js'
import { briefPptxBuffer } from '../src/utils/briefPptx.js'

const M = 1e6
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (±${tol})`)
let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }

const draft = computePmi(c, asPresentedPmi(c))
const bench = computePmi(c, benchmarkPmi(c))

t('premium = price − standalone', () => assert.equal(c.deal.price - c.deal.standalone, c.deal.premium))
t('function costs tie to cost / NPS in the profile', () => {
  const tot = (k) => c.functions.reduce((a, f) => a + f[k].cost, 0)
  near(tot('brightwater') / 58e6, 0.52, 0.005, 'brightwater'); near(tot('halcyon') / 186e6, 0.38, 0.005, 'halcyon')
})
t('banker levers sum to $20.0M and capitalise to $186M', () => { near(draft.runRate, 20 * M, 1, 'rr'); near(draft.capitalised, 186 * M, 1, 'cap'); near(draft.coverage, 186 / 70, 1e-9, 'coverage') })
t('banker one-offs = $2.0M', () => near(draft.oneOffBudget, c.asPresented.oneOffTotal, 1, 'one-offs'))
t('draft year 1 = run rate − 70% of one-offs', () => near(draft.annual[0].net, 20 * M - 0.7 * 2 * M, 1, 'y1'))
t('TSA 12 months × $220K lands in year 1', () => { const o = bench.oneOffs.find((x) => x.kind === 'tsa'); near(o.amount, 2.64 * M, 1, 'tsa'); near(o.flows[0], -2.64 * M, 1, 'y1'); near(o.flows[1], 0, 0, 'y2') })
t('TSA 18 months spills 6 months into year 2', () => {
  const ex = benchmarkPmi(c); ex.oneOffs.tsa.months = 18
  const o = computePmi(c, ex).oneOffs.find((x) => x.kind === 'tsa'); near(o.flows[1], -6 * 0.22 * M, 1, 'y2')
})
t('people drive retention and attrition', () => {
  near(bench.keyBonus, 1.2 * M, 1, 'bonus'); near(bench.npsAtRisk, 1.725 * M, 1, 'nps at risk')
  near(bench.dis.find((d) => d.id === 'writer-attrition').rr, -0.8625 * M, 1, 'attrition')
  near(bench.oneOffs.find((o) => o.kind === 'retention').amount, 1.8 * M, 1, 'retention total')
})
t('unmanaged people lose 25% of relationship NPS', () => near(draft.npsAtRisk, 21.9 * M * 0.25, 1, 'unmanaged'))
t('benchmark register: $14.31M gross, $10.87M risk-weighted', () => { near(bench.runRate, 14.31 * M, 1, 'gross'); near(bench.runRateWeighted, 10.873 * M, 1, 'weighted') })
t('one-offs are not risk-weighted', () => near(bench.oneOffBudget, 9.35 * M + 2.64 * M + 1.8 * M + 2.2 * M + 0.3 * M, 1, 'budget'))
t('working capital nets to zero over two years', () => { const w = bench.oneOffs.find((o) => o.kind === 'wc'); near(w.flows[0] + w.flows[1], 0, 1, 'wc') })
t('hand NPV of a flat $1M synergy for 10 years at 10%', () => {
  const ex = asPresentedPmi(c)
  ex.levers = Object.fromEntries(c.levers.map((l, i) => [l.id, { status: i ? 'reject' : 'keep', rr: 1 * M, phasing: [100, 100, 100, 100], oneOff: 0, prob: 100 }]))
  ex.valuation = { method: 'npv', rate: 10, horizon: 10, terminal: 'none', g: 0, riskWeight: true }
  near(computePmi(c, ex).npv, 6.1446 * M, 100, 'annuity')
  ex.valuation.terminal = 'perpetuity'
  near(computePmi(c, ex).npv, 10 * M, 100, 'perpetuity at g=0 equals 1/r')
})
t('benchmark coverage is about 1x the premium', () => { assert.ok(bench.npvCoverage > 0.9 && bench.npvCoverage < 1.1, `coverage ${bench.npvCoverage}`); assert.equal(bench.breakEven, 3); assert.ok(bench.annual[0].net < 0) })
t('what-must-be-true solves hit the premium', () => {
  near(bench.npvAt(bench.rate, bench.wmbt.scale).npv, c.deal.premium, 5, 'scale'); near(bench.npvAt(bench.wmbt.rate).npv, c.deal.premium, 5, 'rate')
})
t('downside < base < unweighted upside', () => assert.ok(bench.downside < bench.npv && bench.npv < bench.upside))
t('benchmark levers all match; draft levers mostly do not', () => {
  const ex = benchmarkPmi(c)
  for (const l of c.levers) assert.ok(leverMatches(l, ex.levers[l.id]), l.id)
  assert.ok(c.levers.filter((l) => leverMatches(l, asPresentedPmi(c).levers[l.id])).length <= 1)
})
t('ten review checks with text', () => { const k = reviewPmiChecks(c); assert.equal(k.length, 10); for (const x of k) assert.ok(x.stated && x.computed && x.text && x.lesson, x.id) })
t('reviewer answers score 100%; a fresh case scores low', () => {
  const s = benchmarkState(c); const sc = scorecard(c, s, computePmi(c, s.exec), bench)
  assert.equal(sc.score, sc.max, JSON.stringify(sc.rows.filter((r) => r.score < r.max)))
  const d = defaultState(c); const dsc = scorecard(c, d, computePmi(c, d.exec), bench)
  assert.ok(dsc.pct < 0.2, `fresh ${dsc.pct}`)
  assert.equal(progress(c, s).overall, 1)
})
t('board recommendation: target and budget from the benchmark', () => { const b = benchmarkBoard(c); near(b.target, 10 * M, 1, 'target'); near(b.budget, 16.3 * M, 1, 'budget') })
const docsFor = (s) => [buildPitchMemo(c, s), buildWorkplan(c, s), buildBoardMemo(c, s, computePmi(c, s.exec))]
t('documents build and render to text and Markdown (reviewer and fresh state)', () => {
  for (const s of [benchmarkState(c), defaultState(c)]) for (const doc of docsFor(s)) {
    assert.ok(doc.sections.length >= 3, doc.slug)
    for (const sec of doc.sections) assert.ok(sec.blocks.length, `${doc.slug} ${sec.title}`)
    assert.ok(renderBriefText(doc).length > 500 && renderBriefMarkdown(doc).length > 500, doc.slug)
  }
})
for (const doc of docsFor(benchmarkState(c))) {
  const [docx, pptx] = await Promise.all([briefDocxBuffer(doc), briefPptxBuffer(doc)])
  assert.ok(docx.length > 5000 && pptx.length > 20000, `${doc.slug} binary exports`); n++
}
console.log('✓ board memo, pitch memo, and workplan render to Word and slides')

console.log(`\n${n} checks passed`)
console.log(`draft: run rate ${fmtM(draft.runRate)} × ${fmtX(draft.capMultiple)} = ${fmtM(draft.capitalised, 0)} (${fmtX(draft.coverage, 2)} premium)`)
console.log(`bench: gross ${fmtM(bench.runRate, 2)} · weighted ${fmtM(bench.runRateWeighted, 2)} · net ${fmtM(bench.netRunRate, 2)} · one-offs ${fmtM(bench.oneOffBudget, 2)} (${fmtX(bench.costToAchieve, 2)}) · NPV ${fmtM(bench.npv, 2)} (${fmtX(bench.npvCoverage, 2)}) · downside ${fmtM(bench.downside)} · upside ${fmtM(bench.upside)} · break-even Y${bench.breakEven} · needs ${(bench.wmbt.scale * 100).toFixed(0)}% of register or ${(bench.wmbt.rate * 100).toFixed(1)}%`)
