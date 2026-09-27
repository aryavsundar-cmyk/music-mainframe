#!/usr/bin/env node
/**
 * test-coverage.mjs — a gap must say which kind of gap it is, and may not guess.
 * `npm run test:coverage`
 *
 * The whole point of Sprint 36 is that a blank space is four different facts wearing the same clothes. The risk in
 * fixing that is the opposite failure: filling the silence with a plausible story. "Private company, so it does not
 * publish" is plausible, reads well, and is wrong often enough to matter — UK companies file at Companies House,
 * Bertelsmann publishes a full annual report, and Merlin, a member-owned body, files a statutory transparency
 * report more detailed than several listed companies manage.
 *
 * So the checks here are mostly prohibitions: what the model may NOT conclude, and from what it may not conclude it.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { figureGap, coverageOf, canvasCoverage, GAPS, GAP_ORDER } from '../src/utils/coverage.js'
import { ENTITIES, getEntity, getChildren, getBackedBy } from '../src/data/entities.js'
import { ENTITY_TYPES, FIGURE_LABEL, DEFAULT_FIGURE, figuresFor as expectedFor } from '../src/data/entities/_schema.js'
import { getTransactionsForEntity } from '../src/data/transactions.js'
import { buildQueue, blockedBy, SIGNALS, OPEN } from '../src/utils/researchQueue.js'
import { freshnessOf, nextDue, LAG } from '../src/utils/freshness.js'

let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }
const SEC = JSON.parse(fs.readFileSync(new URL('../data/financials/sec.json', import.meta.url), 'utf8')).companies
const figuresFor = (id) => SEC[id] || null
const deps = { getEntity, figuresFor }
const gapOf = (e) => figureGap(e, figuresFor(e.id), deps)

t('every company on the canvas has exactly one coverage state, and it is a declared one', () => {
  for (const e of ENTITIES) {
    const g = gapOf(e)
    assert.ok(GAP_ORDER.includes(g.state), `${e.id}: unknown coverage state "${g.state}"`)
    assert.equal(g.label, GAPS[g.state].label)
    // Everything except a company that HAS a figure owes the reader a sentence.
    if (g.state !== 'reported') assert.ok(g.note?.trim(), `${e.id}: a gap with no explanation is the silence this exists to remove`)
  }
})

t('"does not publish" is never inferred from ownership', () => {
  // The only route to `none` is a declared `figures` block on the record. If this ever becomes derivable from
  // `ownership === 'private'`, 55 companies acquire a claim about their behaviour that nobody established.
  const claimed = ENTITIES.filter((e) => gapOf(e).state === 'none')
  for (const e of claimed) {
    assert.equal(e.figures?.state, 'none', `${e.id}: claims "does not publish" without declaring it`)
    assert.ok(e.figures?.note?.trim(), `${e.id}: a "does not publish" claim needs the finding that established it`)
  }
  // And the inference itself must not exist: a private company with nothing declared stays unresearched.
  const privateNoFigure = ENTITIES.filter((e) => e.ownership === 'private' && !e.metrics?.revenue && !e.figures)
  for (const e of privateNoFigure) {
    assert.notEqual(gapOf(e).state, 'none', `${e.id}: "private" was read as "discloses nothing"`)
  }
})

t('a consolidated company names a parent that exists, and says whether that parent publishes', () => {
  for (const e of ENTITIES) {
    const g = gapOf(e)
    if (g.state !== 'consolidated') continue
    assert.ok(g.via, `${e.id}: consolidated into nothing`)
    assert.ok(getEntity(g.via.id), `${e.id}: consolidated into an entity that is not on the canvas`)
    assert.notEqual(g.via.id, e.id, `${e.id}: consolidated into itself`)
    assert.match(g.note, new RegExp(g.via.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${e.id}: the note does not name the parent`)
    // The distinction that makes the link worth following, or worth not following.
    const parentHasFigure = !!(g.via.metrics?.revenue || figuresFor(g.via.id)?.metrics?.revenue)
    assert.equal(g.readable, parentHasFigure, `${e.id}: says the parent's figure is ${g.readable ? 'readable' : 'unreadable'}, which is wrong`)
    if (!parentHasFigure) assert.match(g.note, /does not publish them either/)
  }
})

t('the chain is walked past a silent ancestor, not stopped at the first one', () => {
  // The Orchard → Sony Music Entertainment (silent) → Sony Music Group (reports). Naming the immediate parent
  // would send the reader to another blank page, which is the bug this walk exists to avoid.
  const orchard = getEntity('the-orchard')
  if (orchard) {
    const g = gapOf(orchard)
    assert.equal(g.state, 'consolidated')
    assert.notEqual(g.via.id, orchard.parentId, 'stopped at the immediate parent, which has no figure either')
    assert.equal(g.readable, true, 'the named ancestor must be one whose figure can actually be read')
  }
  // A cycle in parentId must terminate rather than hang the page.
  const cyclic = { id: 'a', name: 'A', ownership: 'subsidiary', parentId: 'b', metrics: {}, sources: [] }
  const other = { id: 'b', name: 'B', ownership: 'subsidiary', parentId: 'a', metrics: {}, sources: [] }
  const looped = figureGap(cyclic, null, { getEntity: (id) => (id === 'a' ? cyclic : other), figuresFor: () => null })
  assert.ok(GAP_ORDER.includes(looped.state))
})

t('a company that has the figure that measures it is never also reported as a gap', () => {
  const holds = (e, f) => (f === 'revenue'
    ? !!(e.metrics?.revenue || figuresFor(e.id)?.metrics?.revenue)
    : !!e.metrics?.[f])
  for (const e of ENTITIES) {
    const answered = expectedFor(e.type).some((f) => holds(e, f))
    assert.equal(gapOf(e).state === 'reported', answered, `${e.id}: coverage disagrees with the record`)
  }
  // Coverage answers "is there a figure", freshness answers "is it still current". Two systems, one question each.
  const ended = ENTITIES.filter((e) => e.metrics?.disclosure === 'ended')
  assert.ok(ended.length > 0, 'no company on the canvas has stopped disclosing — this check would prove nothing')
  for (const e of ended) {
    assert.equal(gapOf(e).state, 'reported', `${e.id}: a company that stopped disclosing still HAS a figure on record`)
    assert.equal(freshnessOf(e, figuresFor(e.id)).status, 'final', `${e.id}: freshness owns the "is it current" question`)
  }
})

t('every entity type has a decision about which figure measures it', () => {
  // A new type must not silently inherit "revenue" because nobody thought about it. Being in the default is a
  // decision; not being considered is not.
  for (const type of Object.keys(ENTITY_TYPES)) {
    const want = expectedFor(type)
    assert.ok(Array.isArray(want) && want.length, `${type}: no expected figure`)
    for (const f of want) assert.ok(FIGURE_LABEL[f], `${type}: expects "${f}", which has no reader-facing name`)
  }
  // The decisions this sprint turned on, stated so that changing one is deliberate.
  for (const t2 of ['pe-fund', 'debt-investor']) assert.deepEqual(expectedFor(t2), ['aum'], `${t2}: a sponsor's scale is AUM, not fee income`)
  assert.deepEqual(expectedFor('catalog-fund'), ['aum', 'catalogSize'])
  assert.deepEqual(expectedFor('dsp'), ['revenue', 'subscribers'], 'Apple has never broken out Apple Music; the paid base is published')
  assert.deepEqual(expectedFor('label'), DEFAULT_FIGURE)
})

t('asking a better question never turns "we do not know" into "not applicable"', () => {
  // The risk in Sprint 37 is laundering: redefine the question, watch the gap shrink, claim progress. So the
  // money-side actors with no AUM on record must still be counted as open gaps, not quietly excused.
  const sponsors = ENTITIES.filter((e) => ['pe-fund', 'debt-investor', 'catalog-fund'].includes(e.type))
  assert.ok(sponsors.length >= 40, `only ${sponsors.length} money-side actors — this check would prove little`)
  for (const e of sponsors) {
    const g = gapOf(e)
    if (g.state === 'reported') {
      assert.ok(e.metrics?.aum || e.metrics?.catalogSize, `${e.id}: counted as answered without the figure that answers it`)
      continue
    }
    if (g.state === 'consolidated' || g.state === 'none') continue
    assert.ok(['partial', 'unresearched'].includes(g.state), `${e.id}: a sponsor with no AUM must stay an open gap`)
    assert.match(g.note, /assets under management/, `${e.id}: the gap must name the figure to go and find`)
  }
  // And a sponsor that files revenue is NOT answered by it: revenue is fee income, and reads as scale if allowed to.
  const filing = sponsors.filter((e) => (e.metrics?.revenue || figuresFor(e.id)?.metrics?.revenue) && !e.metrics?.aum)
  for (const e of filing) assert.equal(gapOf(e).state, 'partial', `${e.id}: revenue was accepted as a sponsor's scale`)
  assert.ok(filing.length > 0, 'no sponsor on the canvas files revenue — this check would prove nothing')
})

t('the checklist counts this app’s records, and says so', () => {
  const wmg = getEntity('wmg')
  const c = coverageOf(wmg, {
    fin: figuresFor('wmg'), gap: gapOf(wmg),
    deals: getTransactionsForEntity('wmg').length, links: 3,
  })
  assert.equal(c.held.length, 5)
  assert.deepEqual(c.held.map((h) => h.id), ['figure', 'filings', 'deals', 'links', 'sources'])
  assert.equal(c.held.find((h) => h.id === 'figure').has, true)
  assert.match(c.held.find((h) => h.id === 'figure').detail, /EDGAR/, 'an SEC filer says where its figure came from')
  assert.match(c.held.find((h) => h.id === 'deals').detail, /on record/, '"on record" is the app’s records, not the market')
  // A hand-entered figure must not claim to come from EDGAR.
  const ppl = getEntity('ppl')
  const cp = coverageOf(ppl, { fin: null, gap: gapOf(ppl) })
  assert.match(cp.held.find((h) => h.id === 'figure').detail, /entered by hand from a cited source/)
  assert.equal(cp.held.find((h) => h.id === 'filings').has, false, 'a UK society is not an SEC filer')
})

t('the canvas coverage figure is measured, and the states add up to the canvas', () => {
  const c = canvasCoverage(ENTITIES, deps)
  assert.equal(c.total, ENTITIES.length)
  assert.equal(Object.values(c.byState).reduce((a, b) => a + b, 0), ENTITIES.length, 'a company fell between two states')
  assert.equal(c.known, c.total - c.byState.unresearched)
  assert.equal(c.pct, Math.round((c.known / c.total) * 100))
  // The number the /about page prints. It is allowed to move; it is not allowed to be asserted in prose.
  assert.ok(c.byState.reported >= 50, `only ${c.byState.reported} companies carry a figure`)
  assert.ok(c.byState.unresearched > 0, 'nothing is unresearched — check the default has not been quietly removed')
  const about = fs.readFileSync(new URL('../src/pages/About.jsx', import.meta.url), 'utf8')
  assert.match(about, /canvasCoverage\(ENTITIES/, '/about must measure coverage, never state it')
  for (const literal of [String(c.byState.reported), String(c.byState.unresearched), `${c.pct}%`]) {
    assert.equal(about.includes(`>${literal}<`), false, `/about hard-codes ${literal}`)
  }
})

t('a slow-reporting body is judged on its own calendar, not a listed company’s', () => {
  // Merlin files its statutory transparency report ~11 months after the period it covers. On the default 100-day
  // lag the latest report in existence was marked overdue, which sends the reader to find a number nobody has.
  const merlin = getEntity('merlin')
  assert.ok(merlin?.metrics?.reportingLag, 'Merlin must declare the lag its verdict depends on')
  assert.equal(freshnessOf(merlin, null).status, 'current', 'the latest published figure is not overdue')
  assert.ok(nextDue('2024-12-31', 'annual', 330) > nextDue('2024-12-31', 'annual'), 'a declared lag must push the due date out')
  assert.equal(nextDue('2024-12-31', 'annual', null), nextDue('2024-12-31', 'annual'), 'and no declared lag keeps the default')
  assert.equal(LAG.annual, 100)
})

t('the four figures researched this sprint carry a primary source and the right kind', () => {
  const expected = {
    ppl: { kind: 'collections', currency: 'GBP', host: 'ppluk.com' },
    merlin: { kind: 'collections', currency: 'GBP', host: 'merlinnetwork.org' },
    'the-mlc': { kind: 'distributions', currency: 'USD', host: 'themlc.com' },
    bertelsmann: { kind: 'revenue', currency: 'EUR', host: 'bertelsmann.com' },
  }
  for (const [id, want] of Object.entries(expected)) {
    const m = getEntity(id)?.metrics
    assert.ok(m?.revenue, `${id}: no figure`)
    assert.equal(m.revenueKind, want.kind, `${id}: collections are not revenue and distributions are not either`)
    assert.equal(m.revenueCurrency, want.currency)
    assert.ok(m.revenueSource?.url.includes(want.host), `${id}: the source is not the company’s own`)
    assert.ok(m.revenuePublished, `${id}: a hand-entered figure must say when it was published`)
    assert.ok(m.revenueNote?.trim(), `${id}: a pass-through or whole-group figure must say what it is`)
  }
  // The two that would mislead if read as music revenue say so in their own words.
  assert.match(getEntity('bertelsmann').metrics.revenueNote, /not a music figure/)
  assert.match(getEntity('merlin').metrics.revenueNote, /not Merlin's own income/)
  // And the MLC's year-on-year trap is named rather than left for the reader to fall into.
  assert.match(getEntity('the-mlc').metrics.revenueNote, /reprocessing keeps adding to a usage year/)
})

t('the research queue ranks this app’s gaps, and every point carries its reason', () => {
  const blocks = blockedBy(ENTITIES, gapOf)
  const rows = buildQueue(ENTITIES, {
    gapOf,
    dealsOf: (id) => getTransactionsForEntity(id).length,
    childrenOf: (id) => getChildren(id).length,
    backsOf: (id) => getBackedBy(id).length,
    blocksOf: (id) => blocks.get(id) || 0,
  })
  assert.ok(rows.length > 0, 'nothing is open — the queue would have nothing to rank')
  // Only open gaps. A company consolidated into a parent that reports is answered; researching it buys nothing.
  for (const r of rows) assert.ok(OPEN.includes(r.state), `${r.id}: a closed gap is in the work list`)
  for (const e of ENTITIES) {
    if (OPEN.includes(gapOf(e).state)) assert.ok(rows.some((r) => r.id === e.id), `${e.id}: an open gap missing from the queue`)
  }
  // Every score is the sum of its stated reasons — no unexplained points.
  for (const r of rows) {
    assert.equal(r.score, r.reasons.reduce((sum, x) => sum + x.points, 0), `${r.id}: score does not equal its reasons`)
    for (const x of r.reasons) assert.ok(SIGNALS[x.key] && x.text.trim(), `${r.id}: a reason with no text`)
    assert.ok(r.wanted.trim(), `${r.id}: the queue must say what to go and find`)
  }
  // Deterministic: same input, same order, never insertion order.
  const again = buildQueue([...ENTITIES].reverse(), {
    gapOf, dealsOf: (id) => getTransactionsForEntity(id).length, childrenOf: (id) => getChildren(id).length,
    backsOf: (id) => getBackedBy(id).length, blocksOf: (id) => blocks.get(id) || 0,
  })
  assert.deepEqual(again.map((r) => r.id), rows.map((r) => r.id), 'the ranking depends on input order')
  assert.deepEqual([...rows].sort((a, b) => b.score - a.score).map((r) => r.score), rows.map((r) => r.score), 'not sorted by score')
})

t('"blocks" only counts subsidiaries a silent parent actually blanks', () => {
  // The signal exists because of Sprint 36's consolidation walk: researching Anschutz once answers AEG and AEG
  // Presents. Counting subsidiaries whose parent ALREADY reports would inflate the queue with work that buys
  // nothing — Sony Music Group reports, so The Orchard is answered and Sony Music Entertainment blocks no one.
  const blocks = blockedBy(ENTITIES, gapOf)
  for (const [parentId, count] of blocks) {
    const parent = getEntity(parentId)
    assert.ok(parent, `blocks names ${parentId}, which is not on the canvas`)
    assert.equal(gapOf(parent).state === 'reported', false, `${parentId}: a reporting parent cannot block anything`)
    assert.ok(count > 0)
  }
  assert.equal(blocks.get('sony-music-entertainment'), undefined, 'a parent whose own parent reports blocks nobody')
  const anschutz = blocks.get('anschutz')
  assert.ok(anschutz >= 2, `Anschutz should block its live subsidiaries, got ${anschutz}`)
})

t('the queue is a prompt to do work, and says so on screen', () => {
  // Same discipline as every other score in the app: it ranks THIS APPLICATION's gaps, never the companies.
  const page = fs.readFileSync(new URL('../src/pages/Entities.jsx', import.meta.url), 'utf8')
  assert.match(page, /ranks this application/, 'the queue must state what it is ranking')
  assert.match(page, /not more secretive or more important/, 'and what it is not saying about the company')
  // The score itself stays off the screen: a number beside a company name reads as a judgement about the company.
  const table = fs.readFileSync(new URL('../src/components/entities/EntityTable.jsx', import.meta.url), 'utf8')
  assert.equal(/\{row\.score\}/.test(table), false, 'the raw score must not be rendered beside a company name')
})

console.log(`\n${n} coverage checks passed.`)
