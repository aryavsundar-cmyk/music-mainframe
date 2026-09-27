#!/usr/bin/env node
/**
 * test-citations.mjs — a citation must be what it looks like.
 * `npm run test:citations`
 *
 * Sprint 39 checked whether the app's 360 cited links still open. They did, once seven genuinely dead ones were
 * replaced. The more uncomfortable finding needed no network at all: **84 of them were not sources.** They were
 * Music Business Worldwide search urls — a query box with the words pre-filled — labelled plainly "Music Business
 * Worldwide", which reads as the article that reports the fact. They resolve, so a link checker would never flag
 * one, and they had been accumulating since Sprint 1.
 *
 * These checks are offline on purpose. Whether a link is REACHABLE needs the network and lives in
 * `scripts/check-sources.mjs`, which is not part of the build. Whether a link is HONEST is a property of the data,
 * and belongs in the build.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { classifyCitation, collectCitations, citationQuality } from '../src/utils/citations.js'
import { ENTITIES } from '../src/data/entities.js'
import { TRANSACTIONS } from '../src/data/transactions.js'
import { MILESTONES } from '../src/data/milestones.js'

let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }
const ROOTS = [ENTITIES, TRANSACTIONS, MILESTONES]
const ALL = collectCitations(ROOTS)

t('a publication search is labelled as a search, never as the article', () => {
  const searches = ALL.filter((c) => c.kind === 'search')
  assert.ok(searches.length > 0, 'no search-style citations — this check would prove nothing')
  for (const c of searches) {
    assert.match(c.label, /search/i, `a search url labelled "${c.label}" reads as a specific piece: ${c.url}`)
  }
  // And the helper that builds most of them says so at the source, so 84 call sites cannot drift apart.
  const schema = fs.readFileSync(new URL('../src/data/entities/_schema.js', import.meta.url), 'utf8')
  assert.match(schema, /search: /, 'the mbw() helper must label its output as a search')
})

t('every figure rests on a specific document', () => {
  // A revenue or AUM figure citing a company's front page is not evidence of the figure. Two exceptions, both
  // explicit: a record that admits it is unverified, and a "does not publish" finding, where the absence of an
  // investor-relations section IS the evidence and a landing page is therefore the right thing to point at.
  const bad = []
  for (const e of ENTITIES) {
    const m = e.metrics || {}
    const cites = [
      ['revenueSource', m.revenueSource, m.verify],
      ['aumSource', m.aumSource, m.verify],
      ['interim', m.interim?.source, m.verify],
      ['projection', m.projection?.source, m.verify],
    ]
    for (const [where, cite, excused] of cites) {
      if (!cite?.url || excused) continue
      const kind = classifyCitation(cite.url)
      if (kind !== 'document') bad.push(`${e.id}.${where}: ${kind} — ${cite.url}`)
    }
    // The "does not publish" exception has to be declared by being that state, not by being any landing page.
    if (e.figures?.source?.url && e.figures.state !== 'none') {
      assert.equal(classifyCitation(e.figures.source.url), 'document', `${e.id}: a figures note needs a document`)
    }
  }
  assert.deepEqual(bad, [], 'a figure citing a front page is not sourced')
})

t('every deal and milestone cites something, and nothing cites a malformed url', () => {
  for (const d of TRANSACTIONS) {
    assert.ok(d.sources?.length, `${d.id}: a transaction with no source`)
    for (const s of d.sources) {
      assert.ok(s.url && s.label, `${d.id}: a source with no url or no label`)
      assert.notEqual(classifyCitation(s.url), 'invalid', `${d.id}: malformed url ${s.url}`)
    }
  }
  for (const ms of MILESTONES) {
    assert.ok(ms.sources?.length, `${ms.id}: a milestone with no source`)
    for (const s of ms.sources) assert.notEqual(classifyCitation(s.url), 'invalid', `${ms.id}: malformed url ${s.url}`)
  }
  assert.equal(ALL.filter((c) => c.kind === 'invalid').length, 0)
})

t('the citation mix is counted, and /about prints it rather than asserting it', () => {
  const q = citationQuality(ROOTS)
  assert.equal(q.total, q.documents + q.searches + q.homes + q.invalid, 'a citation fell between two kinds')
  assert.ok(q.documents > 0 && q.searches > 0, 'the split must be real for the page to be worth printing')
  assert.equal(q.pct, Math.round((q.documents / q.total) * 100))
  const about = fs.readFileSync(new URL('../src/pages/About.jsx', import.meta.url), 'utf8')
  assert.match(about, /citationQuality\(/, '/about must measure the mix, never state it')
  for (const literal of [String(q.documents), String(q.searches)]) {
    assert.equal(about.includes(`>${literal}<`), false, `/about hard-codes ${literal}`)
  }
})

t('the committed link check is readable and says when it ran', () => {
  // The report is a snapshot written by `npm run sources`, which needs the network and so cannot run in the
  // build. What the build CAN insist on is that the committed file is intact and dated.
  const report = JSON.parse(fs.readFileSync(new URL('../data/source-check.json', import.meta.url), 'utf8'))
  assert.match(report.checkedAt, /^\d{4}-\d{2}-\d{2}T/, 'the report must say when it ran')
  assert.ok(report.total > 300, `only ${report.total} links checked`)
  assert.equal(report.dead, 0, `${report.dead} cited links are gone — run npm run sources and fix them`)
  assert.ok(Array.isArray(report.unverifiedLinks), 'the unsettled links are part of the report, not hidden')
  // Every unsettled link carries its reason, so nobody has to guess whether it is broken.
  for (const u of report.unverifiedLinks) assert.ok(u.why?.trim(), `${u.url}: unverified with no reason given`)
})

console.log(`\n${n} citation checks passed.`)
