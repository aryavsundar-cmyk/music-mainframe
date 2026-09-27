#!/usr/bin/env node
/**
 * test-readings.mjs — a page may only say what its data says.
 * `npm run test:readings`
 *
 * Sprint 35 gives every data page a computed sentence about its own numbers. A sentence is the easiest thing in
 * this app to get wrong, because nothing about "the busiest year is 2024" fails to render if it is false. So every
 * reading carries the figures it rests on (`cites`), and this file checks two things for each one:
 *
 *   1. **The figure is in the sentence.** A cite that never appears in the text is a number the reader cannot see,
 *      which means the claim beside it is unsourced prose.
 *   2. **The figure is in the data.** Each input is recomputed here, straight from the data modules, rather than
 *      taken from whatever the page happened to pass. If a page starts counting the wrong rows, these diverge.
 *
 * The rest of the checks are the rules from the head of `readings.js`: too few records is itself a reading; a
 * ranking claim ("the largest") is dropped when more than one currency is in play; and no sentence is empty.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  TOO_FEW, readEntities, readDeals, readCatalogs, readAbs, readPros, readDsps, readPe, readCatalogScan, readingDate,
} from '../src/utils/readings.js'
import { format } from '../src/utils/format.js'
import { ENTITIES, COUNTS } from '../src/data/entities.js'
import { TRANSACTIONS, CATALOG_SALES, ABS_DEALS, ABS_MARKET, TX_TOTALS, YEARS, year, partyName } from '../src/data/transactions.js'
import { listPros } from '../src/data/pros.js'
import { listDsps } from '../src/data/fundamentals.js'
import { listFunds } from '../src/data/peFunds.js'
import { freshnessOf } from '../src/utils/freshness.js'

let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }
const SEC = JSON.parse(fs.readFileSync(new URL('../data/financials/sec.json', import.meta.url), 'utf8')).companies

/**
 * Every cited figure must be legible in the sentence. A reading formats counts and money the same way the rest of
 * the app does, so one of those forms is what the reader sees; which one depends on the figure's kind, and this
 * accepts either rather than making every cite declare it.
 */
function citesAreVisible(reading, where) {
  assert.ok(reading.text.trim(), `${where}: empty reading`)
  for (const cite of reading.cites) {
    const forms = [
      format.count(cite.value, { full: true }),
      format.count(cite.value),
      format.money(cite.value),
      String(cite.value),
    ]
    assert.ok(forms.some((f) => reading.text.includes(f)),
      `${where}: cites "${cite.label}" = ${cite.value}, but no form of it appears in "${reading.text}"`)
  }
}

t('entities: the figures are counted off the canvas, and every one is in the sentence', () => {
  const verdicts = ENTITIES.map((e) => freshnessOf(e, SEC[e.id]))
  const input = {
    total: ENTITIES.length,
    listed: ENTITIES.filter((e) => e.ownership === 'public').length,
    secFilers: ENTITIES.filter((e) => SEC[e.id]?.metrics).length,
    due: verdicts.filter((v) => v.status === 'due').length,
    pending: verdicts.filter((v) => v.status === 'pending').length,
  }
  // The canvas counts its own totals; a reading must agree with them rather than keep a second tally.
  assert.equal(input.total, COUNTS.total, 'the reading counts a different canvas from COUNTS')
  assert.equal(input.listed, COUNTS.public, 'the reading counts a different number of listed companies')
  const r = readEntities(input)
  citesAreVisible(r, 'readEntities')
  assert.match(r.text, /publicly listed/)
  assert.ok(input.secFilers > 0, 'no SEC filers on the canvas — the daily-refresh claim would be false')
  assert.match(r.text, /refresh daily/)
  // Nothing on screen: say so, and claim nothing else.
  assert.equal(readEntities({ total: 0, listed: 0, secFilers: 0, due: 0, pending: 0 }).cites.length, 0)
  assert.match(readEntities({ total: 0 }).text, /Nothing on the canvas/)
})

t('deals: the disclosed total excludes terminated deals, exactly as the page totals do', () => {
  const priced = TRANSACTIONS.filter((x) => x.value && x.status !== 'terminated')
  const input = {
    rows: TRANSACTIONS.length,
    total: TX_TOTALS.count,
    disclosed: priced.reduce((sum, x) => sum + x.value, 0),
    undisclosed: TRANSACTIONS.filter((x) => !x.value).length,
    byYear: Object.fromEntries(YEARS.map((y) => [y, TRANSACTIONS.filter((x) => year(x) === y).length])),
    estimates: TRANSACTIONS.filter((x) => x.verify).length,
  }
  assert.equal(input.disclosed, TX_TOTALS.disclosed, 'the reading’s disclosed total differs from TX_TOTALS')
  assert.deepEqual(input.byYear, TX_TOTALS.byYear, 'the reading counts years differently from TX_TOTALS')
  const r = readDeals(input)
  citesAreVisible(r, 'readDeals')
  // A total that ignores the undisclosed deals reads as the size of the market. It must not.
  assert.ok(input.undisclosed > 0, 'no undisclosed deals on file — the floor caveat would be unverifiable here')
  assert.match(r.text, /a floor, not the size of the market/)
  // "The busiest year on record" is a claim about the record, not about the industry.
  const busiest = Object.entries(input.byYear).sort((a, b) => b[1] - a[1])[0]
  if (Object.values(input.byYear).filter((c) => c === busiest[1]).length === 1) {
    assert.match(r.text, new RegExp(`busiest year on record is ${busiest[0]}`),
      'the busiest year in the sentence is not the busiest year in the data')
  }
})

t('deals: too few to read is itself a reading, and it cites the count', () => {
  for (const rows of [0, 1, TOO_FEW - 1]) {
    const r = readDeals({ rows, total: TX_TOTALS.count, disclosed: 0, undisclosed: 0, byYear: {}, estimates: 0 })
    assert.equal(/busiest/.test(r.text), false, `${rows} rows: a pattern was read from too few records`)
    if (rows) assert.match(r.text, /too few to read a pattern/)
    else assert.match(r.text, /No deal on record/)
    citesAreVisible(r, `readDeals(${rows})`)
  }
  // And the threshold is the one the module declares, not a number written twice.
  assert.equal(/too few/.test(readDeals({ rows: TOO_FEW, total: 9, disclosed: 1e9, undisclosed: 0, byYear: { 2025: 5 }, estimates: 0 }).text), false)
})

t('catalogs: "the largest" is only claimed when one currency covers the rows', () => {
  const currencies = new Set(CATALOG_SALES.map((x) => x.currency || 'USD'))
  const largest = [...CATALOG_SALES].sort((a, b) => (b.value || 0) - (a.value || 0))[0]
  const input = {
    rows: CATALOG_SALES.length,
    total: CATALOG_SALES.reduce((sum, x) => sum + (x.value || 0), 0),
    largest,
    buyers: new Set(CATALOG_SALES.flatMap((x) => x.acquirers.map(partyName))).size,
    estimates: CATALOG_SALES.filter((x) => x.verify).length,
    currencies: currencies.size,
  }
  assert.equal(input.total, TX_TOTALS.catalog, 'the reading’s catalog total differs from TX_TOTALS')
  const r = readCatalogs(input)
  citesAreVisible(r, 'readCatalogs')
  assert.match(r.text, new RegExp(`The largest is ${largest.catalogOf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
  // Two currencies and the ranking claim has to go, whatever the values say.
  const mixed = readCatalogs({ ...input, currencies: 2 })
  assert.equal(/The largest is/.test(mixed.text), false, 'a "largest" claim survived a mixed-currency view')
  assert.match(mixed.text, /superstar catalog sales on file/, 'the rest of the reading must still be said')
})

t('abs: the table states that it is a floor against what KBRA has rated', () => {
  const issued = ABS_DEALS.reduce((sum, x) => sum + (x.value || 0), 0)
  const issuers = new Set(ABS_DEALS.map((x) => (x.sellers[0] ? partyName(x.sellers[0]) : x.abs?.issuer || '—'))).size
  const r = readAbs({ deals: ABS_DEALS.length, issued, issuers, ratedSince2020: ABS_MARKET.ratedSince2020, ratedIssuers: ABS_MARKET.issuers })
  citesAreVisible(r, 'readAbs')
  assert.ok(issued < ABS_MARKET.ratedSince2020, 'the file now holds more than KBRA has rated — check the market figures')
  assert.match(r.text, /a floor rather than the whole market/)
  assert.match(r.text, new RegExp(`${ABS_MARKET.issuers} issuers since 2020`))
  // Were the app ever to hold the whole market, the caveat would be false and must drop out.
  assert.equal(/a floor/.test(readAbs({ deals: 3, issued: 20e9, issuers: 3, ratedSince2020: 12.9e9, ratedIssuers: 18 }).text), false)
})

t('pros: the sentence names the currency conversion, because this page ranks across currencies', () => {
  const all = listPros()
  const input = {
    rows: all.length,
    total: all.length,
    disclosing: all.filter((r) => r.latest).length,
    currencies: new Set(all.map((r) => r.currency)).size,
    latestYear: all.reduce((y, r) => Math.max(y, r.latest?.year || 0), 0) || null,
  }
  assert.ok(input.currencies > 1, 'every society reports in one currency — the conversion note would be untrue')
  const r = readPros(input)
  citesAreVisible(r, 'readPros')
  assert.match(r.text, /converts at rounded rates/, 'an ordering across currencies must say so')
  assert.equal(/league table/.test(r.text), true)
  assert.match(r.text, new RegExp(`reporting year on file is ${input.latestYear}`))
  // One currency and there is nothing to disclaim.
  assert.equal(/rounded rates/.test(readPros({ ...input, currencies: 1 }).text), false)
})

t('dsps: subscriber counts are never summed across periods', () => {
  const all = listDsps()
  const input = {
    rows: all.length,
    total: all.length,
    reporting: all.filter((r) => r.subscribers).length,
    withRate: all.filter((r) => r.perStream).length,
  }
  const r = readDsps(input)
  citesAreVisible(r, 'readDsps')
  // Each platform reports as of its own quarter; a sum of those would be a figure no source states.
  const summed = all.reduce((sum, x) => sum + (x.subscribers || 0), 0)
  assert.equal(r.text.includes(format.count(summed)), false, 'the reading adds subscriber counts across periods')
  assert.equal(r.text.includes(format.count(summed, { full: true })), false)
  assert.match(r.text, /never a contractual rate/, 'a per-stream range must carry what it is')
  assert.ok(input.withRate < input.rows, 'every platform carries a rate — the silent count would be zero')
  assert.match(r.text, new RegExp(`${input.rows - input.withRate} publish nothing`))
})

t('pe: deal volume is stated as double-counted, because it is', () => {
  const all = listFunds()
  const input = {
    rows: all.length,
    total: all.length,
    profiled: all.filter((r) => r.hasProfile).length,
    absIssuers: all.filter((r) => r.absIssued.length).length,
    volume: all.reduce((sum, r) => sum + r.dealVolume, 0),
  }
  const r = readPe(input)
  citesAreVisible(r, 'readPe')
  assert.match(r.text, /double-counts both sides/, 'deal volume counts a transaction twice and must say so')
  assert.match(r.text, new RegExp(`${input.absIssuers} have issued securitisations`))
})

t('catalog scan: a score is a prompt to do work, never a claim that anything is for sale', () => {
  const r = readCatalogScan({ rows: 40, total: 188, watch: 9, live: 3, owners: 21 })
  citesAreVisible(r, 'readCatalogScan')
  assert.match(r.text, /never a claim that anything is for sale/)
  assert.match(r.text, /12 score above quiet/, 'the two bands above quiet are counted together')
  assert.match(r.text, /3 of them in the top band/)
  // Nothing scoring is a reading too, and it must not imply there is something to chase.
  const quiet = readCatalogScan({ rows: 40, total: 188, watch: 0, live: 0, owners: 21 })
  assert.match(quiet.text, /nothing here to chase/)
  assert.equal(/for sale/.test(quiet.text), false)
  assert.match(readCatalogScan({ rows: 0 }).text, /No holding matches/)
})

t('every reading is one paragraph of finished sentences, with no gaps where a clause dropped out', () => {
  const samples = [
    readEntities({ total: 188, listed: 39, secFilers: 20, due: 0, pending: 1 }),
    readDeals({ rows: 90, total: 90, disclosed: 5e10, undisclosed: 0, byYear: { 2025: 20, 2024: 20 }, estimates: 0 }),
    readCatalogs({ rows: 20, total: 1e10, largest: null, buyers: 9, estimates: 0 }),
    readAbs({ deals: 20, issued: 1e10, issuers: 8 }),
    readPros({ rows: 20, total: 20, disclosing: 12, currencies: 1, latestYear: null }),
    readDsps({ rows: 20, total: 20, reporting: 20, withRate: 20 }),
    readPe({ rows: 20, total: 20, profiled: 12, absIssuers: 0, volume: 0 }),
    readCatalogScan({ rows: 20, total: 40, watch: 0, live: 1, owners: 5 }),
  ]
  for (const r of samples) {
    assert.ok(r.text.trim(), 'a reading came back empty')
    assert.equal(/ {2}/.test(r.text), false, `double space — a clause dropped out of "${r.text}"`)
    assert.equal(/\.\./.test(r.text), false, `doubled full stop in "${r.text}"`)
    assert.match(r.text, /\.$/, `a reading must end in a full stop: "${r.text}"`)
    for (const cite of r.cites) assert.notEqual(cite.value, null, 'a null figure was cited')
  }
})

t('a reading formats a date the way the rest of the app does', () => {
  assert.equal(readingDate('2026-09-27T12:00:00Z'), format.date('2026-09-27'))
})

console.log(`\n${n} reading checks passed.`)
