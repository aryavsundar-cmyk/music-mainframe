#!/usr/bin/env node
/**
 * test-flows.mjs — the dollar on /flows adds up, and says where it came from.
 * `npm run test:flows`
 *
 * Sprint 43 put money on a page that until now only drew plumbing. That is the most dangerous kind of feature
 * this app can ship: a split tree looks authoritative, the numbers are small and round, and nobody checking a
 * deck would notice that 55% of a dollar had been quietly divided into shares adding to 103%, or that a
 * confident 8.8¢ was a midpoint of a range nobody publishes, or that a step with no public figure had been
 * given a plausible one to complete the picture.
 *
 * So this file is mostly arithmetic and prohibition:
 *
 * 1. every branch's children sum to the branch, with exactly one explicit remainder;
 * 2. no rate is written into a scenario — every one is an address into the stage that publishes it;
 * 3. a published range stays a range, and is measured on the same base as the figure beside it;
 * 4. a step nobody discloses says so, with a reason, and never carries a number;
 * 5. the page and its export both state the limit, and neither offers an input box.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { FLOWS, FLOW_IDS, getFlowNode } from '../src/data/flows.js'
import { SCENARIOS, SCENARIO_IDS, scenariosForFlow } from '../src/data/scenarios.js'
import { buildWaterfall, allWaterfalls, landingTable, resolveRate, point } from '../src/utils/waterfall.js'
import { readFlows } from '../src/utils/readings.js'
import { classifyCitation } from '../src/utils/citations.js'
import { getEntity } from '../src/data/entities.js'
import { LIMITS } from '../src/data/limits.js'
import { GLOSSARY_BY_ID } from '../src/data/glossary.js'

let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }
const read = (f) => fs.readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')
const near = (a, b) => Math.abs(a - b) < 0.0005

t('every scenario resolves with nothing left unexplained', () => {
  assert.ok(SCENARIO_IDS.length >= 5, 'the page needs enough routes to be a comparison')
  for (const w of allWaterfalls()) {
    assert.deepEqual(w.problems, [], `${w.scenario.id}: ${w.problems.join(' · ')}`)
    assert.ok(w.rows.length, `${w.scenario.id} resolved to no rows`)
    assert.ok(w.scenario.unit.startsWith('one dollar'), `${w.scenario.id}: every unit is one dollar of a named thing`)
    assert.ok(w.scenario.unitNote && w.scenario.lede, `${w.scenario.id}: a unit needs saying what it is and is not`)
    for (const d of w.scenario.domains) assert.ok(FLOW_IDS.includes(d), `${w.scenario.id}: "${d}" is not a flow`)
  }
})

t('a branch\'s children add up to the branch, and exactly one may take the remainder', () => {
  // The check the engine performs on itself is asserted here against the resolved rows too, so a bug that
  // silenced `problems` could not also hide a tree that does not balance.
  for (const w of allWaterfalls()) {
    const byParent = new Map()
    const stack = []
    for (const r of w.rows) {
      while (stack.length && stack.at(-1).depth >= r.depth) stack.pop()
      const parent = stack.at(-1)
      const key = parent ? parent.id : '@root'
      if (!byParent.has(key)) byParent.set(key, { parent, kids: [] })
      byParent.get(key).kids.push(r)
      stack.push(r)
    }
    for (const [key, { parent, kids }] of byParent) {
      assert.ok(kids.filter((k) => k.rest).length <= 1, `${w.scenario.id}/${key}: two steps claim the same remainder`)
      // Only a branch where every child has a figure can be summed. Where one child is undisclosed the branch
      // is deliberately not summable, which is the honest outcome and not a hole in the test.
      if (!kids.every((k) => k.share != null)) continue
      const total = kids.reduce((a, k) => a + k.share, 0)
      const expect = parent ? parent.share : 1
      if (parent && parent.relative !== kids[0].relative) continue // a branch that restarts the base
      assert.ok(near(total, expect), `${w.scenario.id}/${key}: children come to ${total}, parent is ${expect}`)
    }
  }
  // And the whole of a fully-known route is exactly one dollar.
  const stream = buildWaterfall('paid-stream')
  const top = stream.rows.filter((r) => r.depth === 0)
  assert.ok(near(top.reduce((a, r) => a + r.share, 0), 1), 'a paid stream must divide exactly one dollar')
  assert.ok(near(buildWaterfall('statutory-radio').rows.reduce((a, r) => a + r.share, 0), 1), 'the statutory split is 50/45/5')
})

t('no rate is written into a scenario — every one is an address into the stage that publishes it', () => {
  const src = read('data/scenarios.js')
  const body = src.slice(src.indexOf('export const SCENARIOS'))
  // A bare number in the scenario tree is the failure this whole indirection exists to prevent: a rate written
  // twice is a rate that will disagree with itself the first time one copy is updated.
  const numbers = body.match(/:\s*-?\d+(\.\d+)?\s*[,}]/g) || []
  assert.deepEqual(numbers, [], `a number is written into scenarios.js: ${numbers.join(' ')} — point at a stage's econ entry instead`)
  // Every address resolves, and resolves to the stage economics a reader can read on the page.
  for (const w of allWaterfalls()) {
    for (const r of w.rows.filter((x) => x.rate)) {
      // A rate resolves to a point, a band, or both — never to nothing.
      const usable = typeof r.rate.value === 'number' || (typeof r.rate.low === 'number' && typeof r.rate.high === 'number')
      assert.ok(usable, `${w.scenario.id}/${r.id}: rate did not resolve to a figure or a range`)
      assert.ok(r.rate.sources.length, `${w.scenario.id}/${r.id}: a rate with no source`)
      assert.ok(r.rate.sources.every((s) => s.url?.startsWith('http')), `${w.scenario.id}/${r.id}: a source a reader cannot open`)
    }
  }
  assert.equal(resolveRate({ flow: 'recording', node: 'label', label: 'no such rate' }), null, 'a missing rate resolves to nothing, never to a guess')
  assert.ok(buildWaterfall('paid-stream').rows.some((r) => r.rate?.flow === 'publishing'), 'a recording-side route must be able to cite a publishing stage — that is what a scenario is for')
})

t('a published range stays a range, on the same base as the figure beside it', () => {
  for (const w of allWaterfalls()) {
    for (const r of w.rows) {
      if (r.low == null && r.high == null) continue
      assert.ok(r.low <= r.high, `${w.scenario.id}/${r.id}: a band that runs backwards`)
      // A row may be a band with no point: a source that publishes "4–7%" and names no typical figure gets a
      // range here and no midpoint anywhere. Where there IS a point, the band must bracket it — a band that
      // does not contain its own figure means the two were computed on different bases, which is exactly the
      // cell that used to read "33% (50–75%)".
      if (r.share == null) continue
      assert.ok(r.share >= r.low - 0.0005 && r.share <= r.high + 0.0005, `${w.scenario.id}/${r.id}: ${r.share} is outside its own band ${r.low}–${r.high}`)
    }
  }
  // The rates that carry a range in prose must carry it as numbers too, or the band silently disappears.
  for (const flow of Object.values(FLOWS)) {
    for (const node of flow.nodes) {
      for (const e of node.econ || []) {
        if (e.kind !== 'pct' || !/\d+\s*[–-]\s*\d+%/.test(e.note || '')) continue
        assert.equal(typeof e.low, 'number', `${flow.id}/${node.id} "${e.label}": the note states a range and the record holds no low`)
        assert.ok(e.low <= e.high, `${flow.id}/${node.id} "${e.label}": a band that runs backwards`)
        // A point is optional; where the source names one it has to sit inside its own band.
        if (typeof e.value !== 'number') continue
        assert.ok(e.low <= e.value && e.value <= e.high, `${flow.id}/${node.id} "${e.label}": ${e.value} is outside its own ${e.low}–${e.high}`)
      }
    }
  }
})

t('a step nobody discloses says so, and never carries a number', () => {
  const ugc = buildWaterfall('ugc')
  assert.ok(ugc.undisclosed.length >= 3, 'the UGC route is mostly non-disclosure and must show it')
  assert.equal(ugc.rows.every((r) => r.share == null), true, 'not one figure may be invented for a route nobody publishes')
  assert.equal(landingTable().find((r) => r.id === 'ugc').recording, null)
  for (const w of allWaterfalls()) {
    for (const r of w.rows.filter((x) => x.state === 'undisclosed' || x.state === 'split-unknown')) {
      assert.ok(r.why, `${w.scenario.id}/${r.id}: a missing figure must say why it is missing`)
      assert.equal(r.share, null, `${w.scenario.id}/${r.id}: an undisclosed step holds a number`)
    }
  }
  // "Pays nothing" and "no figure on record" are different claims and the table must be able to tell them apart.
  const live = landingTable().find((r) => r.id === 'live')
  assert.equal(live.recording, null)
  assert.ok(live.paysNothing.recording, 'a live performance pays the recording nothing — that is a finding, not a gap')
  assert.equal(landingTable().find((r) => r.id === 'ugc').paysNothing.recording, undefined, 'UGC pays the recording; the amount is what is unknown')
})

t('a branch with an unpublished base is measured against itself, never against the dollar', () => {
  const stream = buildWaterfall('paid-stream')
  const perf = stream.rows.find((r) => r.id === 'performance')
  assert.equal(perf.state, 'split-unknown')
  assert.equal(perf.share, null, 'the performance share of the publishing dollar is not published and must not be computed')
  const admin = stream.rows.find((r) => r.id === 'pro-admin')
  assert.equal(admin.relative, true, 'a child of an unknown base is relative')
  assert.ok(near(admin.share, 0.12), 'and is a proportion of its own route')
  // Every descendant stays relative, however many known splits sit between it and the unknown base.
  for (const id of ['writer-direct', 'writer-contract', 'publisher-retains']) {
    assert.equal(stream.rows.find((r) => r.id === id).relative, true, `${id} inherited an absolute share from an unknown base`)
  }
  // Nothing outside that branch is contaminated by it.
  assert.equal(stream.rows.find((r) => r.id === 'artist-royalty').relative, false)
  assert.ok(near(stream.rows.find((r) => r.id === 'publishing-side').share, 0.15))
})

t('every stage a step points at exists, and every company on it is on the canvas', () => {
  for (const w of allWaterfalls()) {
    for (const r of w.rows.filter((x) => x.node)) {
      assert.ok(getFlowNode(r.node.flow, r.node.id), `${w.scenario.id}/${r.id}: points at ${r.node.flow}/${r.node.id}, which is not a stage`)
    }
    for (const r of w.rows.filter((x) => x.tail?.node)) {
      assert.ok(getFlowNode(r.tail.node.flow, r.tail.node.id), `${w.scenario.id}: a tail points at a stage that does not exist`)
    }
  }
  // The modern layer is only worth drawing if it links to companies that already have pages.
  for (const flow of Object.values(FLOWS)) {
    for (const node of flow.nodes) {
      for (const id of node.entityIds) assert.ok(getEntity(id), `${flow.id}/${node.id}: "${id}" is not an entity`)
    }
  }
  for (const id of ['ugc', 'contentid']) assert.ok(getFlowNode('recording', id), `the recording chain is missing ${id}`)
  for (const id of ['ugc', 'blackbox']) assert.ok(getFlowNode('publishing', id), `the publishing fan is missing ${id}`)
  assert.ok(getFlowNode('recording', 'ugc').entityIds.includes('tiktok'))
})

t('every flow offers a route, and a route that touches a domain appears on it', () => {
  for (const id of FLOW_IDS) assert.ok(scenariosForFlow(id).length >= 1, `${id} has no money route to divide`)
  assert.ok(scenariosForFlow('recording').includes('statutory-radio'))
  assert.equal(scenariosForFlow('recording').includes('live'), false, 'a live performance is not an exploitation of a recording')
  // A scenario that declares a domain must actually have a step on that side, or the tab is a promise it breaks.
  for (const s of Object.values(SCENARIOS)) {
    const w = buildWaterfall(s.id)
    for (const d of s.domains) {
      const has = w.rows.some((r) => r.side === d) || w.rows.some((r) => r.node?.flow === d)
      assert.ok(has, `${s.id} claims the ${d} domain and never touches it`)
    }
  }
})

t('the page divides a published unit and never offers to calculate anybody\'s royalties', () => {
  // The Sprint 0 non-goal — no royalty calculator, no artist tooling — and the line this feature could cross
  // without anyone noticing: one input box turns an illustration of structure into an earnings estimator.
  const page = read('pages/Flows.jsx')
  const chart = read('components/flows/Waterfall.jsx')
  for (const file of [page, chart]) {
    assert.equal(/<input|useState\(\s*['"]?\d|type="number"/.test(file), false, 'the flows page has grown a number input')
  }
  assert.ok(LIMITS.flow, 'the flow limit must exist as a shared sentence, not inline prose')
  assert.match(LIMITS.flow.claim, /not an estimate of what anyone earns/)
  assert.match(LIMITS.flow.enforced, /No rate is written into a scenario/)
  assert.match(page, /LIMITS\.flow/, 'the page must render the limit from the single source')
  assert.match(page, /limits: waterfall \? \['flow'\]/, 'and every export of it must carry the limit')
  assert.match(page, /waterfall\.rows\.map/, 'the export must carry the waterfall, not just the stage list')
  // The vocabulary the page now uses has to be explained somewhere a reader can reach.
  for (const id of ['pro-rata', 'lump-sum-licence', 'content-id-claim', 'black-box-route', 'mechanical-royalty', 'mfn', 'cue-sheet']) {
    assert.ok(GLOSSARY_BY_ID[id], `"${id}" is used on /flows and is not in the glossary`)
  }
})

t('the comparison across routes compares shape, and never sums two different dollars', () => {
  const table = landingTable()
  assert.equal(table.length, SCENARIO_IDS.length)
  for (const r of table) {
    const parts = [r.recording, r.publishing, r.other].filter(Boolean)
    if (!parts.length) continue
    // The LOW ends must fit inside a dollar. Summing the highs of several independent ranges would over-count,
    // because they cannot all be at their maximum at once.
    const floor = parts.reduce((a, t) => a + (t.value ?? t.low), 0)
    assert.ok(floor <= 1.0005, `${r.id}: the sides come to ${floor} of one dollar — a parent and its children have been added together`)
  }
  const stream = table.find((r) => r.id === 'paid-stream')
  assert.ok(near(stream.recording.value + stream.publishing.value + stream.other.value, 1), 'a paid stream is fully accounted for')
  assert.ok(stream.recording.value > stream.publishing.value * 3, 'the recording share is several times the publishing share — the structural fact of streaming')
  const live = table.find((r) => r.id === 'live')
  assert.ok(live.publishing.value < 0.05 && live.other.value > 0.9, 'almost all of a ticket is not a music-rights payment')
  const sync = table.find((r) => r.id === 'sync')
  assert.ok(near(sync.recording.value, sync.publishing.value), 'MFN means the two sides of a sync are paid the same')
  // The route whose platform publishes its whole split is the contrast the rest of the page is read against.
  const d2f = table.find((r) => r.id === 'direct-to-fan')
  assert.equal(d2f.recording.value, null, 'Bandcamp publishes a range and names no typical figure; neither may this')
  assert.ok(d2f.recording.low > stream.recording.value, 'the shortest chain must leave the artist more of the dollar than a stream leaves the recording side')
})

t('a range with no midpoint stays a range, all the way to the total', () => {
  // Bandcamp publishes its share as 15%, payment processing as "4–7%", and names no typical processing figure.
  // Inventing one would have been the easiest thing in this whole sprint and would have made every figure
  // downstream of it false by a number nobody could check.
  const w = buildWaterfall('direct-to-fan')
  const fee = w.rows.find((r) => r.id === 'd2f-processing')
  assert.equal(fee.share, null, 'a midpoint was invented for a figure published only as a range')
  assert.ok(near(fee.low, 0.04) && near(fee.high, 0.07))
  assert.equal(fee.state, 'reported', 'a banded figure is reported, not undisclosed — the source published it')
  // And the remainder inherits the uncertainty rather than swallowing it.
  const artist = w.rows.find((r) => r.id === 'd2f-artist')
  assert.equal(artist.share, null)
  assert.ok(near(artist.low, 0.78) && near(artist.high, 0.81), `the artist keeps ${artist.low}–${artist.high}, not a point`)
  // A remainder of ranged siblings is ranged everywhere, including where a point also exists.
  const stream = buildWaterfall('paid-stream')
  const service = stream.rows.find((r) => r.id === 'service')
  assert.ok(near(service.share, 0.30), 'the point remains where every sibling has a point')
  assert.ok(service.high > service.share, 'and it carries the band its ranged siblings imply')
  // A range cannot be divided further: a share of a range is not a figure.
  assert.deepEqual(w.problems, [])
})

t('the newest routes draw the pipes and refuse to price them', () => {
  const ai = buildWaterfall('ai')
  assert.ok(ai.rows.length >= 3, 'the value of the AI route is the routes, so there must be more than one')
  assert.equal(ai.rows.every((r) => r.share == null && r.low == null), true, 'not one AI figure may be invented')
  assert.equal(ai.rows.every((r) => r.state === 'undisclosed' && r.why), true, 'every AI step must say why it has no figure')
  // Input and output are different questions and the page must not merge them.
  assert.ok(ai.rows.some((r) => r.id === 'ai-output'), 'the output side is the unsettled one and needs its own row')
  assert.ok(ai.rows.some((r) => r.side === 'recording') && ai.rows.some((r) => r.side === 'publishing'), 'a model is trained on both rights')
  // The deals are real even though the rates are not published, so the route cites the deals.
  assert.ok(ai.sources.length >= 2)
  assert.ok(ai.sources.every((x) => classifyCitation(x.url) === 'document'), 'a route with no figures rests entirely on its citations')
  assert.match(ai.scenario.unitNote, /equity/, 'a cash unit is the wrong unit here and the page must say so')
  for (const flow of ['recording', 'publishing']) assert.ok(getFlowNode(flow, 'ai'), `${flow} is missing the AI stage`)
  assert.ok(getFlowNode('recording', 'ai').entityIds.includes('suno'))
})

t('a money edge is drawn at the weight of the share it carries', () => {
  const diagram = fs.readFileSync(new URL('../src/components/flows/FlowDiagram.jsx', import.meta.url), 'utf8')
  assert.match(diagram, /moneyWeight/, 'money edges are still all drawn at one weight')
  assert.match(diagram, /strokeWidth=\{money \? moneyWeight\(e\)/)
  // Only money carries magnitude: a rights edge is a licence, which has no size.
  assert.equal(/kind === 'rights'[^\n]*moneyWeight/.test(diagram), false)
  const weighted = Object.values(FLOWS).flatMap((f) => f.edges).filter((e) => e.kind === 'money' && e.econ?.kind === 'pct')
  assert.ok(weighted.length >= 5, 'too few edges declare a share for weighting to say anything')
  for (const e of weighted) assert.ok(e.econ.value > 0 && e.econ.value <= 100, `${e.from}→${e.to}: ${e.econ.value} is not a share`)
})

t('the page states what its own routes add up to, and cites every figure in the sentence', () => {
  const rows = landingTable()
  const ref = rows.find((r) => r.id === 'paid-stream')
  const r = readFlows({
    routes: rows.length,
    priced: rows.filter((x) => point(x.recording) != null || point(x.publishing) != null).length,
    undisclosed: rows.reduce((a, x) => a + x.undisclosed, 0),
    reference: { label: ref.label, recording: ref.recording.value, publishing: ref.publishing.value },
  })
  // Sprint 35's rule: a reading is counted off the data, and every number in it is checkable against the data.
  assert.match(r.text, new RegExp(`\\b${rows.length}\\b`))
  for (const c of r.cites) assert.ok(r.text.includes(String(Math.round(c.value))), `the sentence claims ${c.label} and does not show it`)
  assert.ok(r.cites.every((c) => c.value !== 0), 'a zero is never cited')
  assert.match(r.text, /no published figure at all/, 'the reading must carry the part a slide would drop')
  const page = read('pages/Flows.jsx')
  assert.match(page, /answer=\{<Reading/, 'the reading belongs in the PageHeader answer slot, like every other page')
  assert.equal(/\d+ ways money reaches/.test(page), false, 'a sentence with a number in it was written into the page')
  // An empty reading is still a sentence, not a gap.
  assert.match(readFlows({ routes: 0 }).text, /No money route/)
})

console.log(`\n${n} flow checks passed.`)
console.log(`${SCENARIO_IDS.length} money routes · ${Object.values(FLOWS).reduce((a, f) => a + f.nodes.length, 0)} stages · ${allWaterfalls().reduce((a, w) => a + w.rows.length, 0)} steps · ${allWaterfalls().reduce((a, w) => a + w.undisclosed.length, 0)} undisclosed`)
