#!/usr/bin/env node
/**
 * test-reported.mjs — a company that does not file with the SEC still gets measured.
 * `npm run test:reported`
 *
 * The /compare page offers "the three majors" as its first preset, and until now that preset answered with one
 * company. Warner files with the SEC, so nine rows of the table were filled from EDGAR; UMG lists on Euronext and
 * Sony Music is a segment inside Sony Group's accounts, so both showed a revenue figure and then dashes all the
 * way down — no margin, no growth, no cash flow, no trend. The figures were not missing from the world. They were
 * in documents this application already cited and had nowhere to put.
 *
 * `metrics.reported` is that place, and this file is the fence around it. Filling a gap with hand-typed numbers is
 * exactly the move that turns a sourced canvas into a plausible one, so most of what follows is prohibition:
 *
 * 1. an SEC filer's figures are STILL never hand-typed — the filing always wins;
 * 2. nothing is derived that the record does not hold, and a gap stays a gap;
 * 3. every reported figure carries a document, and the page and the export say it is not a filing;
 * 4. a segment is described by what its parent does NOT report, which is the caveat that was wrong before.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { ENTITIES, getEntity } from '../src/data/entities.js'
import { CONCEPTS, reportedFinancials, basisFor, fiveYearRecord, operatingMargin, freeCashFlow } from '../src/utils/financialConcepts.js'
import { buildComparison, cagr, cellText } from '../src/utils/compare.js'
import { buildBrief } from '../src/utils/brief.js'
import { renderBriefText } from '../src/utils/briefText.js'
import { classifyCitation } from '../src/utils/citations.js'

let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }
const SEC = JSON.parse(fs.readFileSync(new URL('../data/financials/sec.json', import.meta.url), 'utf8')).companies
const WITH_REPORTED = ENTITIES.filter((e) => e.metrics?.reported)

t('every reported block is a real set of years, in the shape the refresh job writes', () => {
  assert.ok(WITH_REPORTED.length >= 2, 'the majors preset needs UMG and Sony Music to hold reported figures')
  const KEYS = new Set(Object.keys(CONCEPTS))
  for (const e of WITH_REPORTED) {
    const r = e.metrics.reported
    assert.ok(r.currency && r.years?.length, `${e.id}: a reported block needs a currency and years`)
    assert.ok(['consolidated', 'segment'].includes(r.scope), `${e.id}: scope must say whose accounts these are`)
    const ends = r.years.map((y) => y.end)
    assert.equal(new Set(ends).size, ends.length, `${e.id}: two entries for the same year end`)
    for (const y of r.years) {
      assert.match(y.end, /^\d{4}-\d{2}-\d{2}$/, `${e.id}: a year needs a real end date`)
      assert.ok(Number.isFinite(y.revenue), `${e.id} ${y.end}: a year with no revenue has no denominator`)
      for (const k of Object.keys(y)) {
        if (['end', 'source', 'published'].includes(k)) continue
        assert.ok(KEYS.has(k), `${e.id} ${y.end}: "${k}" is not a figure this application reads`)
        assert.ok(Number.isFinite(y[k]), `${e.id} ${y.end}: ${k} is not a number`)
      }
    }
    // The expansion has to produce the shape everything downstream reads, or it is a second dialect.
    const fin = reportedFinancials(e)
    assert.equal(fin.basis, 'reported')
    assert.equal(fin.metrics.revenue.history.length, r.years.length)
    assert.deepEqual(fin.metrics.revenue.history.map((h) => h.end), [...ends].sort().reverse(), `${e.id}: years must come out newest first`)
    assert.equal(fin.latestFiling, null, 'a reported basis must never look like a filing')
    for (const c of Object.values(fin.metrics)) {
      for (const f of c.history) assert.equal(f.currency, r.currency, `${e.id}: one currency per reported block`)
    }
  }
})

t('an SEC filer is never given hand-typed figures', () => {
  // The rule in CLAUDE.md, and the one this feature could most easily break: EDGAR is the only source for a filer.
  for (const e of WITH_REPORTED) {
    assert.equal(SEC[e.id] === undefined, true, `${e.id} files with the SEC — its figures must come from EDGAR, not a reported block`)
  }
  // And if one ever did, the filing would still win.
  const umg = getEntity('umg')
  const pretend = { metrics: { revenue: { annual: { value: 1, currency: 'USD', end: '2025-12-31' } } } }
  assert.equal(basisFor(umg, pretend), pretend, 'a filing must take precedence over a reported block')
  assert.equal(basisFor(umg, null).basis, 'reported')
  assert.equal(basisFor(getEntity('wmg'), null), null, 'a company with neither gets nothing invented for it')
})

t('nothing is derived that the record does not hold', () => {
  const sony = reportedFinancials(getEntity('sony-music-group'))
  // Sony reports the Music segment's sales and operating income and nothing else. The margin computes; the rest
  // must stay absent rather than being assembled out of group figures.
  assert.ok(operatingMargin(sony) > 20 && operatingMargin(sony) < 22)
  for (const k of ['netIncome', 'operatingCashFlow', 'capex', 'cash', 'longTermDebt']) {
    assert.equal(sony.metrics[k], undefined, `Sony's Music segment has no ${k} and must not acquire one`)
  }
  assert.equal(freeCashFlow(sony), null, 'free cash flow with no cash-flow figure is an invention')

  // UMG holds cash flow for its two most recent years only, so the earlier years' cells stay empty rather than
  // borrowing a neighbour's.
  const umg = reportedFinancials(getEntity('umg'))
  const rec = fiveYearRecord(umg)
  const ocf = rec.rows.find((r) => r.key === 'operatingCashFlow')
  assert.equal(ocf.cells.filter(Boolean).length, 2, 'a year with no cash-flow figure must show a dash')
  assert.equal(ocf.cells.at(-1).value, 1739e6, 'the newest year is the last column')
  // Free cash flow is computed from the two figures on record, never imported from the company's own definition:
  // UMG's "Free Cash Flow" (EUR 702M) nets catalogue investments too, and two definitions in one column is the
  // comparison this table exists to prevent.
  assert.equal(freeCashFlow(umg).value, 1739e6 - 70e6)
})

t('a year-on-year change needs two consecutive years', () => {
  const gappy = { id: 'x', name: 'X', metrics: { reported: { currency: 'USD', scope: 'consolidated', years: [
    { end: '2025-12-31', revenue: 200 }, { end: '2022-12-31', revenue: 100 },
  ] } } }
  const fin = reportedFinancials(gappy)
  assert.equal(fin.metrics.revenue.annual.value, 200)
  assert.equal(fin.metrics.revenue.priorAnnual, null, 'three years apart is not a year-on-year change')
  // And a non-December year is dated by its real start, so a period is never described as the wrong twelve months.
  const sony = reportedFinancials(getEntity('sony-music-group'))
  assert.equal(sony.metrics.revenue.annual.start, '2025-04-01')
  assert.equal(reportedFinancials(getEntity('umg')).metrics.revenue.annual.start, '2025-01-01')
})

t('the three majors comparison answers with three companies', () => {
  const c = buildComparison('umg,sony-music-group,wmg', { financials: SEC })
  const row = (k) => c.rows.find((r) => r.key === k)
  // The rows that were dashes for two of the three. Each must now hold a figure for every company that reports
  // the inputs — and Sony's empty cells must be the ones its parent genuinely does not break out.
  for (const k of ['growth', 'cagr', 'opMargin']) {
    assert.equal(row(k).cells.filter(Boolean).length, 3, `${k} is still empty for a company that reports it`)
  }
  for (const k of ['netMargin', 'fcfMargin', 'ocf', 'cash', 'debt', 'debtToOcf']) {
    const cells = row(k).cells
    assert.ok(cells[0], `UMG reports ${k} and the table does not show it`)
    assert.equal(cells[1], null, `Sony's Music segment has no ${k} — the cell must be empty, not filled`)
    assert.ok(cells[2], `Warner's ${k} came from EDGAR and must be untouched`)
  }
  // Ranked in dollars: UMG is the largest of the three by revenue, and the margin ranking is Sony's.
  assert.equal(row('revenue').best, 0)
  assert.equal(row('opMargin').best, 1)
  assert.match(cellText(row('revenue').cells[0]), /^\$14\.\d+B \(€12\.5\d+B\)$/)
  // The trend chart needs the same number of years for everyone, and all three now have enough to be in it.
  assert.equal(c.index.excluded.length, 0, `excluded from the indexed chart: ${c.index.excluded.join(', ')}`)
  assert.ok(c.index.years >= 3)
  assert.ok(cagr(c.companies[0].history).years >= 3)
})

t('the table says these figures are not filings, and what a segment leaves out', () => {
  const c = buildComparison('umg,sony-music-group,wmg', { financials: SEC })
  assert.match(c.caveat, /do not file with the SEC/, 'a reader must be told which figures are not from EDGAR')
  assert.match(c.caveat, /Universal Music Group and Sony Music Group/)
  // The sentence that was wrong: it claimed a segment reports no margin at all, in a table showing Sony's margin.
  assert.equal(/no margin or cash flow for the segment alone/.test(c.caveat), false, 'the old, false segment caveat is back')
  assert.match(c.caveat, /sales and operating income are reported for the segment/)
  for (const empty of ['net income', 'cash flow', 'cash and debt']) {
    assert.ok(c.caveat.includes(empty), `the caveat must name ${empty} as what a segment does not report`)
  }
})

t('a reported figure carries a document a reader can open, and it is never a search', () => {
  for (const e of WITH_REPORTED) {
    const r = e.metrics.reported
    for (const y of r.years) {
      const s = y.source || r.source
      assert.ok(s?.url, `${e.id} ${y.end}: a figure with no source is not on record`)
      // Sprint 39's rule: no figure may rest on a search page or a front page.
      assert.equal(classifyCitation(s.url), 'document', `${e.id} ${y.end}: ${s.url} is not a document that reports the figure`)
    }
    assert.ok(r.published || r.years.every((y) => y.published), `${e.id}: a reported block must say when it was published`)
    assert.ok(r.note, `${e.id}: a reported block must say what it does and does not include`)
  }
})

t('an export never presents a reported figure as a filing', () => {
  for (const id of ['umg', 'sony-music-group']) {
    const text = renderBriefText(buildBrief(id, { mode: 'full', financials: SEC[id] || null }))
    const metrics = text.slice(text.indexOf('Headline numbers'))
    assert.equal(/As filed with the SEC/.test(metrics), false, `${id}: the brief calls a press release a filing`)
    assert.ok(metrics.includes('Operating margin'), `${id}: the five-year record did not reach the export`)
    assert.ok(metrics.includes(getEntity(id).metrics.reported.source.url), `${id}: the source document did not reach the export`)
  }
  const umg = renderBriefText(buildBrief('umg', { mode: 'full', financials: null }))
  assert.match(umg, /does not file with the SEC/)
  const sony = renderBriefText(buildBrief('sony-music-group', { mode: 'full', financials: null }))
  // Fragments only: the renderer wraps these notes, so a long phrase would be split by a newline.
  assert.match(sony, /segment note of its parent/)
  assert.match(sony, /does not report net income/)
  // Warner's brief is exactly what it was: this feature must not have touched a filer's provenance.
  assert.match(renderBriefText(buildBrief('wmg', { mode: 'full', financials: SEC.wmg })), /As filed with the SEC/)
})

t('the company page reads the same basis as the table, and labels it', () => {
  const page = fs.readFileSync(new URL('../src/components/entities/Financials.jsx', import.meta.url), 'utf8')
  assert.match(page, /basisFor\(e, fin\)/, 'the page must apply the same fallback as /compare')
  assert.equal(/fin\?\.metrics \? \(/.test(page), false, 'the page still gates its table on the SEC refresh job')
  assert.match(page, /does not file with the SEC/)
  assert.match(page, /segment note/)
  // And the years link somewhere: a filer to EDGAR, a non-filer to the document the record cites for that year.
  assert.match(page, /f\?\.source\?\.url/)
})

console.log(`\n${n} reported-figure checks passed.`)
