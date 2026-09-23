#!/usr/bin/env node
/**
 * test-compare.mjs — the side-by-side view, and the comparisons it must refuse to make.
 * `npm run test:compare`
 *
 * A comparison table is the easiest place in this app to state something false: two currencies in one column,
 * a CAGR across a gap in the years, a "winner" chosen from figures that measure different things. Every check
 * here is one of those.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { buildComparison, cagr, indexedRevenue, readIds, searchEntities, cellText, PRESETS, MAX_COMPARE, MIN_TREND_YEARS } from '../src/utils/compare.js'
import { LIMITS } from '../src/data/limits.js'
import { ENTITIES, getEntity } from '../src/data/entities.js'
import { buildPageDoc } from '../src/utils/pageDocs.js'
import { renderBriefText } from '../src/utils/briefText.js'

let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }
const SEC = JSON.parse(fs.readFileSync(new URL('../data/financials/sec.json', import.meta.url), 'utf8')).companies
const row = (data, key) => data.rows.find((r) => r.key === key)
const year = (end, value, currency = 'USD') => ({ start: `${Number(end.slice(0, 4)) - 1}${end.slice(4)}`, end, value, currency, form: '10-K', filed: `${Number(end.slice(0, 4)) + 1}-02-01` })

t('picking: real ids only, no duplicates, capped, order kept', () => {
  assert.deepEqual(readIds('wmg,spotify'), ['wmg', 'spotify'])
  assert.deepEqual(readIds('spotify,wmg'), ['spotify', 'wmg'], 'the reader’s order is the column order')
  assert.deepEqual(readIds('wmg,wmg, wmg '), ['wmg'])
  assert.deepEqual(readIds('wmg,not-a-company'), ['wmg'])
  assert.deepEqual(readIds(''), [])
  assert.equal(readIds(ENTITIES.map((e) => e.id).join(',')).length, MAX_COMPARE)
  for (const p of PRESETS) for (const id of p.ids) assert.ok(getEntity(id), `preset ${p.id} names ${id}, which is not on the canvas`)
  assert.ok(PRESETS.every((p) => p.ids.length <= MAX_COMPARE))
})

t('search finds a company by name, short name and ticker, and never re-offers one already picked', () => {
  assert.ok(searchEntities('warner').some((e) => e.id === 'wmg'))
  assert.ok(searchEntities('WMG').some((e) => e.id === 'wmg'))
  assert.equal(searchEntities('warner', { exclude: ['wmg'] }).some((e) => e.id === 'wmg'), false)
  assert.deepEqual(searchEntities(''), [])
  assert.deepEqual(searchEntities('  '), [])
})

t('money is never ranked across currencies; ratios always are', () => {
  const data = buildComparison('wmg,umg', { financials: SEC })
  assert.equal(data.mixedCurrency, true, 'WMG reports in USD, UMG in EUR')
  const rev = row(data, 'revenue')
  assert.equal(rev.rankable, false, 'a dollar figure must not be ranked against a euro figure')
  assert.equal(rev.best, null)
  assert.match(data.caveat, /never ranked across currencies/)
  const usd = buildComparison('wmg,live-nation', { financials: SEC })
  assert.equal(usd.mixedCurrency, false)
  assert.equal(row(usd, 'revenue').rankable, true, 'one currency across the row: ranking it means something')
  assert.equal(row(usd, 'revenue').best, 1, 'Live Nation reports more revenue than WMG')
})

t('the best cell: highest, except where lower is better', () => {
  const data = buildComparison('wmg,live-nation,spotify', { financials: SEC })
  const margin = row(data, 'opMargin')
  assert.ok(margin.rankable && margin.best != null)
  const vals = margin.cells.map((c) => c?.value)
  assert.equal(vals[margin.best], Math.max(...vals.filter((v) => v != null)))
  const lev = row(data, 'debtToOcf')
  if (lev && lev.best != null) {
    const lv = lev.cells.map((c) => c?.value)
    assert.equal(lv[lev.best], Math.min(...lv.filter((v) => v != null)), 'debt to cash flow: lowest is marked, not highest')
  }
  const single = buildComparison('wmg,umg', { financials: SEC })
  const catalog = row(single, 'catalogSize')
  if (catalog) assert.equal(catalog.best, null, 'one figure present is not a ranking')
})

t('CAGR: consecutive years in one currency, or nothing', () => {
  const five = [year('2025-12-31', 1610), year('2024-12-31', 1400), year('2023-12-31', 1200), year('2022-12-31', 1100), year('2021-12-31', 1000)]
  const g = cagr(five)
  assert.equal(g.years, 5)
  assert.equal(Number(g.value.toFixed(2)), 12.64, '1000 → 1610 over four years')
  assert.equal(cagr(five.slice(0, 2)), null, 'two points are not a trend')
  assert.equal(cagr([year('2025-12-31', 1610), year('2024-12-31', 1400), year('2022-12-31', 1100)]), null, 'a missing year breaks it')
  assert.equal(cagr([year('2025-12-31', 1610), year('2024-12-31', 1400, 'EUR'), year('2023-12-31', 1200)]), null, 'two currencies break it')
  assert.equal(cagr([year('2025-12-31', 100), year('2024-12-31', 0), year('2023-12-31', -50)]), null, 'no growth rate off a zero or a loss')
})

t('the rebased trend uses one window for everyone, and names who is left out', () => {
  const co = (id, history) => ({ id, e: { name: id }, history })
  const long = [year('2025-12-31', 150), year('2024-12-31', 130), year('2023-12-31', 120), year('2022-12-31', 100)]
  const short = [year('2025-12-31', 120), year('2024-12-31', 110), year('2023-12-31', 100)]
  const idx = indexedRevenue([co('a', long), co('b', short)])
  assert.equal(idx.years, MIN_TREND_YEARS, 'the shorter record sets the window: three years, not four')
  assert.equal(idx.series[0].points.length, 3)
  assert.equal(idx.series[0].points[0].value, 100, 'every company starts at 100')
  assert.equal(Math.round(idx.series[0].points.at(-1).value), 125, 'a rebased to its own 2023, not to 2022')
  assert.equal(Math.round(idx.series[1].points.at(-1).value), 120)
  const withTooShort = indexedRevenue([co('a', long), co('b', short), co('c', [year('2025-12-31', 10)])])
  assert.deepEqual(withTooShort.excluded, ['c'], 'a company with too few years is named, not quietly dropped')
  assert.equal(withTooShort.series.length, 2)
  assert.equal(indexedRevenue([co('a', long)]).series.length, 0, 'nothing to compare against')
  const mixed = indexedRevenue([co('a', [year('2025-12-31', 150), year('2024-12-31', 130, 'EUR'), year('2023-12-31', 120)]), co('b', short), co('c', long)])
  assert.deepEqual(mixed.excluded, ['a'], 'a record that switches currency cannot be rebased')
  assert.deepEqual(indexedRevenue([co('a', long), co('b', [year('2025-12-31', 10)])]).excluded, ['a', 'b'], 'one company left is nothing to compare: say so rather than draw it alone')
})

t('a missing figure is a gap, never a zero, and every cell keeps its period', () => {
  const data = buildComparison('wmg,umg', { financials: SEC })
  const ocf = row(data, 'ocf')
  assert.equal(ocf.cells[1], null, 'UMG files no SEC cash-flow figure: the cell is empty')
  assert.notEqual(ocf.cells[0], null)
  for (const r of data.rows) for (const c of r.cells) {
    if (!c) continue
    assert.ok(typeof c.value === 'number' || typeof c.text === 'string', `${r.key}: a cell with neither a value nor words`)
    if (c.unit === 'money') assert.ok(c.currency, `${r.key}: money without a currency`)
  }
  assert.equal(cellText(null), null)
  assert.equal(cellText({ unit: 'pct', value: 12.34 }), '12.3%')
  assert.equal(cellText({ unit: 'x', value: 3.456 }), '3.5×')
  assert.equal(cellText({ unit: 'money', value: 6.707e9, currency: 'USD' }), '$6.71B')
  assert.equal(cellText({ unit: 'money', value: 2.64987e12, currency: 'KRW' }), '₩2.65T', 'each company keeps its own currency')
})

t('a stale balance is never ranked and never feeds a ratio', () => {
  const data = buildComparison('live-nation,kkr,tko', { financials: SEC })
  const debt = row(data, 'debt')
  const kkr = debt.cells[1]
  assert.ok(kkr.stale, 'KKR last tagged long-term debt in 2021')
  assert.match(kkr.period, /last tagged .* not the position today/)
  assert.equal(debt.rankable, false, 'one stale balance in the row and nothing in it is ranked')
  assert.equal(debt.best, null)
  assert.equal(row(data, 'debtToOcf').cells[1], null, 'no ratio from a 2021 balance and 2025 cash flow')
  assert.ok(row(data, 'debtToOcf').cells[0].value > 0, 'the companies with current balances still get one')
})

t('counts of what this app holds are not a ranking', () => {
  const data = buildComparison('live-nation,kkr,tko', { financials: SEC })
  const deals = row(data, 'deals')
  assert.equal(deals.rankable, false, 'more deals on record is not "better" — it is what has been filed here')
  assert.equal(deals.best, null)
})

t('mismatched fiscal years are stated, not lined up silently', () => {
  const data = buildComparison('wmg,live-nation', { financials: SEC })
  assert.equal(data.mixedFiscalYear, true, 'WMG closes in September, Live Nation in December')
  assert.match(data.caveat, /fiscal years end on different dates/)
  const same = buildComparison('live-nation,spotify', { financials: SEC })
  assert.equal(same.mixedFiscalYear, false)
})

t('the real comparisons hold up: the majors, and streaming', () => {
  const majors = buildComparison('umg,sony-music-group,wmg', { financials: SEC })
  assert.equal(majors.companies.length, 3)
  assert.equal(majors.currencies.length, 3, 'EUR, JPY and USD — three currencies, three ways of counting')
  assert.equal(row(majors, 'revenue').rankable, false)
  const dsps = buildComparison('spotify,tencent-music,deezer', { financials: SEC })
  assert.equal(dsps.companies.length, 3)
  assert.ok(row(dsps, 'revenue').cells.every(Boolean), 'every listed streaming company has a figure on record')
  assert.ok(row(dsps, 'subscribers').cells.some(Boolean))
})

t('the export states the caveat, the limit and the empty cells', () => {
  const data = buildComparison('wmg,umg', { financials: SEC })
  const doc = buildPageDoc({
    slug: 'comparison',
    title: 'Comparison',
    lede: data.caveat,
    filters: [{ label: 'Companies', value: data.companies.map((c) => c.e.name).join(', ') }],
    columns: ['Figure', ...data.companies.map((c) => c.e.name)],
    rows: data.rows.map((r) => [r.label, ...r.cells.map((c) => (c ? cellText(c) : '—'))]),
    limits: ['comparison'],
    notes: [data.caveat, 'A dash means the figure is not on record for that company, never zero.'],
  })
  const text = renderBriefText(doc).replace(/\s+/g, ' ')
  assert.ok(text.includes(LIMITS.comparison.claim), 'the export must carry the limit')
  assert.ok(text.includes('never ranked across currencies'))
  assert.ok(text.includes('never zero'))
  assert.ok(text.includes('Warner Music Group') && text.includes('Universal Music Group'))
})

t('the page states the limit and reads it from the single source', () => {
  const page = fs.readFileSync(new URL('../src/pages/Compare.jsx', import.meta.url), 'utf8')
  assert.ok(/<LimitNote[^>]*comparison/.test(page.replace(/\s+/g, ' ')), 'the Compare page must show the comparison limit')
  assert.ok(page.includes("from '../data/limits.js'"))
})

console.log(`\n${n} comparison checks passed.`)
