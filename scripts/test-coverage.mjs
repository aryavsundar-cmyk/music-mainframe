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
import { ENTITIES, getEntity } from '../src/data/entities.js'
import { getTransactionsForEntity } from '../src/data/transactions.js'
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

t('a company that has a figure is never also reported as a gap', () => {
  for (const e of ENTITIES) {
    const hasFigure = !!(e.metrics?.revenue || figuresFor(e.id)?.metrics?.revenue)
    assert.equal(gapOf(e).state === 'reported', hasFigure, `${e.id}: coverage disagrees with the record`)
  }
  // Coverage answers "is there a figure", freshness answers "is it still current". Two systems, one question each.
  const ended = ENTITIES.filter((e) => e.metrics?.disclosure === 'ended')
  assert.ok(ended.length > 0, 'no company on the canvas has stopped disclosing — this check would prove nothing')
  for (const e of ended) {
    assert.equal(gapOf(e).state, 'reported', `${e.id}: a company that stopped disclosing still HAS a figure on record`)
    assert.equal(freshnessOf(e, figuresFor(e.id)).status, 'final', `${e.id}: freshness owns the "is it current" question`)
  }
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

console.log(`\n${n} coverage checks passed.`)
