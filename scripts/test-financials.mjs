#!/usr/bin/env node
/**
 * test-financials.mjs — company financials: read from filings correctly, and never stale without saying so.
 * `npm run test:financials`
 *
 * The extraction tests use fixtures shaped like SEC's companyfacts documents, so they run offline and pin the
 * traps found on the real data: a company switching revenue tags (Warner Music, 2020), a company reporting
 * quarters and years under different tags (iHeart), restatements, and newer reports whose figures SEC has not
 * yet structured (Sony, Tencent Music, Anghami).
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { readMetric, extractFinancials, latestFilings, usTicker } from '../server/financials.js'
import { formMeaning } from '../server/filings.js'
import { CONCEPTS, pctChange, freeCashFlow, operatingMargin, fiveYearRecord } from '../src/utils/financialConcepts.js'
import { freshnessOf, freshnessReport, currentRevenue, parsePeriod, periodLabel, nextDue } from '../src/utils/freshness.js'
import { ENTITIES, getEntity } from '../src/data/entities.js'
import { buildBrief } from '../src/utils/brief.js'
import { renderBriefText } from '../src/utils/briefText.js'

let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }
const TODAY = new Date('2026-09-22T12:00:00Z')
const fact = (start, end, val, form = '10-K', filed = '2025-11-20', accn = '0000000000-25-000001') => ({ start, end, val, form, filed, accn })
const inst = (end, val, form = '10-Q', filed = '2026-08-05') => ({ end, val, form, filed, accn: '0000000000-26-000002' })
const doc = (usgaap = {}, ifrs = null) => ({ entityName: 'Fixture Co', facts: { 'us-gaap': Object.fromEntries(Object.entries(usgaap).map(([k, v]) => [k, { units: { USD: v } }])), ...(ifrs ? { 'ifrs-full': ifrs } : {}) } })

t('a company that switched revenue tags is read from the tag with the newest period', () => {
  const d = doc({
    Revenues: [fact('2018-10-01', '2019-09-30', 4475e6, '10-K', '2019-11-21'), fact('2019-10-01', '2020-09-30', 4463e6, '10-K', '2020-11-23')],
    RevenueFromContractWithCustomerExcludingAssessedTax: [fact('2023-10-01', '2024-09-30', 6426e6), fact('2024-10-01', '2025-09-30', 6707e6)],
  })
  const r = readMetric(d.facts, CONCEPTS.revenue)
  assert.equal(r.annual.end, '2025-09-30', 'the 2020 figure under the old tag must not be presented as the latest')
  assert.equal(r.annual.value, 6707e6)
  assert.equal(r.priorAnnual.value, 6426e6, 'the comparison is the same tag, a year earlier')
})

t('years and quarters each take the tag that carries their newest period', () => {
  const d = doc({
    Revenues: [fact('2026-04-01', '2026-06-30', 977e6, '10-Q', '2026-08-10'), fact('2025-04-01', '2025-06-30', 950e6, '10-Q', '2025-08-11')],
    RevenueFromContractWithCustomerIncludingAssessedTax: [fact('2025-01-01', '2025-12-31', 3865e6, '10-K', '2026-03-02'), fact('2024-01-01', '2024-12-31', 3850e6, '10-K', '2025-03-03')],
  })
  const r = readMetric(d.facts, CONCEPTS.revenue)
  assert.equal(r.annual?.value, 3865e6, 'iHeart: the year is under a different tag from the quarters, and must not be lost')
  assert.equal(r.quarter?.value, 977e6)
  assert.equal(r.priorQuarter?.value, 950e6)
})

t('a restated period keeps the most recently filed value; year-to-date periods are not quarters', () => {
  const d = doc({ Revenues: [
    fact('2025-01-01', '2025-12-31', 100, '10-K', '2026-02-01'),
    fact('2025-01-01', '2025-12-31', 104, '10-K/A', '2026-05-01'),
    fact('2026-01-01', '2026-09-30', 90, '10-Q', '2026-11-01'),
    fact('2026-07-01', '2026-09-30', 31, '10-Q', '2026-11-01'),
  ] })
  const r = readMetric(d.facts, CONCEPTS.revenue)
  assert.equal(r.annual.value, 104, 'the amended filing replaces the original')
  assert.equal(r.quarter.value, 31, 'a nine-month year-to-date figure is not a quarter')
})

t('history: five years newest first, spanning a tag switch, one value per year', () => {
  const d = doc({
    Revenues: [fact('2018-10-01', '2019-09-30', 4475e6, '10-K', '2019-11-21'), fact('2019-10-01', '2020-09-30', 4463e6, '10-K', '2020-11-23'), fact('2020-10-01', '2021-09-30', 9999e6, '10-K', '2021-11-23')],
    RevenueFromContractWithCustomerExcludingAssessedTax: [fact('2020-10-01', '2021-09-30', 5301e6, '10-K', '2021-11-23'), fact('2021-10-01', '2022-09-30', 5919e6), fact('2022-10-01', '2023-09-30', 6037e6), fact('2023-10-01', '2024-09-30', 6426e6), fact('2024-10-01', '2025-09-30', 6707e6)],
  })
  const h = readMetric(d.facts, CONCEPTS.revenue).history
  assert.deepEqual(h.map((x) => x.end), ['2025-09-30', '2024-09-30', '2023-09-30', '2022-09-30', '2021-09-30'])
  assert.equal(h.at(-1).value, 5301e6, 'the winning tag keeps a year both tags report; the old tag never overwrites it')
  const six = readMetric(doc({ Revenues: [fact('2019-10-01', '2020-09-30', 1), ...[2021, 2022, 2023, 2024, 2025].map((y) => fact(`${y - 1}-10-01`, `${y}-09-30`, y))] }).facts, CONCEPTS.revenue).history
  assert.equal(six.length, 5, 'capped at five years')
  const gap = readMetric(doc({ Revenues: [fact('2024-10-01', '2025-09-30', 2)], SalesRevenueNet: [fact('2018-10-01', '2019-09-30', 1)] }).facts, CONCEPTS.revenue).history
  assert.deepEqual(gap.map((x) => x.end), ['2025-09-30', '2019-09-30'], 'older years from another tag fill in; missing years stay missing, never invented')
})

t('a year last repeated in a 10-Q comparative is still read from its 10-K', () => {
  const d = doc({ Revenues: [
    fact('2020-10-01', '2021-09-30', 5301e6, '10-K', '2021-11-23'),
    fact('2020-10-01', '2021-09-30', 5301e6, '10-Q', '2024-02-08'),
    fact('2021-10-01', '2022-09-30', 5919e6, '10-K', '2022-11-22'),
  ] })
  const r = readMetric(d.facts, CONCEPTS.revenue)
  assert.deepEqual(r.history.map((x) => x.end), ['2022-09-30', '2021-09-30'], 'WMG FY2021 was lost this way')
  assert.equal(r.priorAnnual.value, 5301e6)
  const x = extractFinancials(d, { cik: 1, entityId: 'x', ticker: 'X' })
  assert.equal(x.latestFiling.form, '10-K', 'history arrays are not figures: the latest filing is a real one')
})

t('stakes filed under the post-2024 form names are read as stakes, not routine', () => {
  assert.equal(formMeaning('SCHEDULE 13D').label, 'Activist stake')
  assert.equal(formMeaning('SCHEDULE 13G/A').label, 'Passive stake')
  assert.equal(formMeaning('SC 13D').weight, formMeaning('SCHEDULE 13D').weight)
})

t('cash-flow figures are annual only: 10-Q cash flows are year-to-date', () => {
  const d = doc({ NetCashProvidedByUsedInOperatingActivities: [
    fact('2025-01-01', '2025-12-31', 800, '10-K', '2026-02-01'),
    fact('2026-01-01', '2026-03-31', 150, '10-Q', '2026-05-01'),
    fact('2026-01-01', '2026-06-30', 420, '10-Q', '2026-08-01'),
  ] })
  const r = readMetric(d.facts, CONCEPTS.operatingCashFlow)
  assert.equal(r.annual.value, 800)
  assert.equal(r.quarter, null, 'a Q1 cash flow must not be shown as the latest quarter')
})

t('derived figures: free cash flow and margin only from the same year; the record never borrows a year', () => {
  const y = (end, value, currency = 'USD') => ({ start: `${Number(end.slice(0, 4)) - 1}${end.slice(4)}`, end, value, currency, form: '10-K', filed: '2026-01-01' })
  const fin = { metrics: {
    revenue: { annual: y('2025-12-31', 1000), history: [y('2025-12-31', 1000), y('2024-12-31', 800), y('2022-12-31', 500)] },
    operatingIncome: { annual: y('2025-12-31', 100), history: [y('2025-12-31', 100), y('2022-12-31', -20)] },
    operatingCashFlow: { annual: y('2025-12-31', 300), priorAnnual: y('2024-12-31', 250), history: [y('2025-12-31', 300), y('2024-12-31', 250)] },
    capex: { annual: y('2021-12-31', 40), history: [y('2021-12-31', 40)] },
  } }
  assert.equal(freeCashFlow(fin), null, 'capex from 2021 must not be netted against 2025 cash flow (Sony)')
  assert.equal(operatingMargin(fin), 10)
  const rec = fiveYearRecord(fin)
  assert.deepEqual(rec.years.map((x) => x.end), ['2022-12-31', '2024-12-31', '2025-12-31'])
  assert.deepEqual(rec.rows.find((r) => r.key === 'growth').text, ['—', '—', '+25.0%'], 'no growth across a missing year')
  assert.deepEqual(rec.rows.find((r) => r.key === 'operatingIncome').cells.map((c) => c?.value ?? null), [-20, null, 100], 'a missing year stays empty')
  assert.equal(rec.rows.find((r) => r.key === 'fcf'), undefined, 'no year has both cash flow and capex, so no free-cash-flow row')
  const euro = { metrics: { ...fin.metrics, operatingIncome: { annual: y('2025-12-31', 100, 'EUR') } } }
  assert.equal(operatingMargin(euro), null, 'never a ratio across currencies')
})

t('point-in-time figures and IFRS filers in their own currency', () => {
  const d = doc({ CashAndCashEquivalentsAtCarryingValue: [inst('2026-06-30', 618e6), inst('2025-06-30', 527e6, '10-Q', '2025-08-06')] })
  const c = readMetric(d.facts, CONCEPTS.cash)
  assert.deepEqual([c.latest.value, c.prior.value], [618e6, 527e6])
  const ifrs = { facts: { 'ifrs-full': { Revenue: { units: { CNY: [fact('2024-01-01', '2024-12-31', 28.4e9, '20-F', '2025-04-23')] } } } } }
  const r = readMetric(ifrs.facts, CONCEPTS.revenue)
  assert.deepEqual([r.annual.value, r.annual.currency, r.annual.form], [28.4e9, 'CNY', '20-F'])
})

t('a newer report without structured figures is pending, with its filing — never shown as current', () => {
  const submissions = { filings: { recent: { form: ['6-K', '20-F', '20-F'], filingDate: ['2026-09-11', '2026-04-17', '2025-04-23'], reportDate: ['', '2025-12-31', '2024-12-31'], accessionNumber: ['a', '0001193125-26-160257', 'c'] } } }
  const d = { entityName: 'TME', facts: { 'ifrs-full': { Revenue: { units: { CNY: [fact('2024-01-01', '2024-12-31', 28.4e9, '20-F', '2025-04-23')] } } } } }
  const x = extractFinancials(d, { cik: 1744676, entityId: 'tencent-music', ticker: 'TME', submissions })
  assert.ok(x.pending && /year to 2025-12-31 was filed on 2026-04-17/.test(x.pending.note))
  assert.equal(x.pending.url, 'https://www.sec.gov/Archives/edgar/data/1744676/000119312526160257/')
  assert.equal(freshnessOf({ id: 'tencent-music' }, x, TODAY).status, 'pending')
  assert.deepEqual(latestFilings(null, 1), { annual: null, periodic: null })
  assert.equal(usTicker('NYSE: TME · HKEX: 1698'), 'TME')
  assert.equal(usTicker('AMS: UMG'), null, 'a non-US listing does not file with the SEC')
})

t('hand-entered figures: due once a newer result should be out, with the date', () => {
  const due = freshnessOf({ metrics: { revenue: 1, revenueYear: 2024 } }, null, TODAY)
  assert.equal(due.status, 'due')
  assert.equal(due.dueSince, nextDue('2024-12-31', 'annual'), 'FY2024 on a calendar year is superseded once FY2025 is due')
  assert.equal(freshnessOf({ metrics: { revenue: 1, revenueYear: 2025 } }, null, TODAY).status, 'current')
  const sony = { metrics: { revenue: 1, revenueYear: 2026, fiscalYearEnd: '03-31' } }
  assert.equal(periodLabel(sony.metrics), 'year to 31 Mar 2026', 'Sony’s "FY2025" is labelled by its end date, never as FY2026 or FY2025')
  assert.equal(freshnessOf(sony, null, TODAY).status, 'current')
  const gone = freshnessOf({ metrics: { revenue: 1, revenueYear: 2024, disclosure: 'ended', disclosureNote: 'Went private.' } }, null, TODAY)
  assert.deepEqual([gone.status, gone.reason], ['final', 'Went private.'], 'a company that stopped publishing is last disclosed, not due')
  assert.deepEqual(parsePeriod('Q2 2026'), { year: 2026, part: 'Q2' })
  assert.equal(freshnessOf({ metrics: { revenue: 1, revenueYear: 'sometime' } }, null, TODAY).status, 'due', 'an unreadable period cannot be passed as current')
})

t('SEC figures: current while the next report is not yet due; due — refresh stopped — once it is', () => {
  const at = (qEnd) => ({ metrics: { revenue: { quarter: { end: qEnd, value: 1, form: '10-Q' }, annual: { end: '2025-12-31', value: 4, form: '10-K' } } }, latestFiling: { form: '10-Q', filed: '2026-08-05', url: 'u' } })
  assert.equal(freshnessOf({}, at('2026-06-30'), TODAY).status, 'current')
  const stale = freshnessOf({}, at('2026-03-31'), TODAY)
  assert.equal(stale.status, 'due', 'the June quarter should have been filed by now')
  assert.match(stale.reason, /refresh may have stopped/)
})

t('the headline figure is the freshest source, and says which', () => {
  const fin = { metrics: { revenue: { annual: { end: '2025-09-30', value: 6707e6, currency: 'USD', form: '10-K', filed: '2025-11-20' } } } }
  const wmg = currentRevenue({ metrics: { revenue: 6.43e9, revenueYear: 2024, revenueCurrency: 'USD' } }, fin)
  assert.deepEqual([wmg.value, wmg.source], [6707e6, 'sec'], 'a filing beats an older hand-entered figure')
  const spot = currentRevenue({ metrics: { revenue: 4.78e9, revenueYear: 'Q2 2026', revenueCurrency: 'EUR' } }, { metrics: { revenue: { annual: { end: '2025-12-31', value: 17.19e9, currency: 'EUR' } } } })
  assert.equal(spot.source, 'record', 'a newer hand-entered quarter beats an older filed year')
  assert.match(currentRevenue({ metrics: { revenue: 1, revenueYear: 2025, revenueKind: 'collections' } }).label, /^Collections, FY2025/, 'collections are not called revenue')
})

t('changes off a loss are described, not computed', () => {
  assert.equal(pctChange({ value: 204 }, { value: -16 }), 'from a loss', 'not "+1,375%"')
  assert.equal(pctChange({ value: -5 }, { value: 10 }), 'to a loss')
  assert.equal(pctChange({ value: -5 }, { value: -16 }), 'loss narrower')
  assert.equal(pctChange({ value: 1864 }, { value: 1689 }), '+10.4%')
  assert.equal(pctChange({ value: 1 }, { value: 0 }), 'n/m')
  assert.equal(pctChange(null, { value: 1 }), '—')
})

const SEC = JSON.parse(fs.readFileSync(new URL('../data/financials/sec.json', import.meta.url), 'utf8'))

t('the committed SEC file is sound: every company is on the canvas, every figure links to its filing', () => {
  assert.ok(Object.keys(SEC.companies).length >= 25, 'the SEC filers on the canvas are covered')
  for (const [id, c] of Object.entries(SEC.companies)) {
    assert.ok(getEntity(id), `${id} is not an entity`)
    assert.ok(c.latestFiling?.url?.startsWith('https://www.sec.gov/Archives/edgar/data/'), `${id}: no filing link`)
    for (const [k, m] of Object.entries(c.metrics)) {
      const { history = [], ...one } = m
      for (const f of [...Object.values(one), ...history]) if (f) assert.ok(f.end && f.filed && f.form && f.currency, `${id}: a figure without its period, filing or currency`)
      // History is newest first, one value per year, in one currency, and its newest year is the headline year.
      assert.ok(history.every((h, i) => i === 0 || h.end < history[i - 1].end), `${id} ${k}: history out of order`)
      assert.ok(new Set(history.map((h) => h.currency)).size <= 1, `${id} ${k}: history mixes currencies`)
      if (m.annual && history.length) assert.equal(history[0].end, m.annual.end, `${id} ${k}: history does not start at the headline year`)
      if (m.annual && history.length) assert.equal(history[0].value, m.annual.value, `${id} ${k}: history disagrees with the headline`)
    }
  }
})

t('as of this release nothing on the canvas is due — and every hand-entered figure updated here carries its source', () => {
  const due = freshnessReport(ENTITIES, SEC.companies, TODAY).filter((x) => x.f.status === 'due')
  assert.deepEqual(due.map((x) => x.e.id), [], 'the cleanup left something stale')
  const updatedHere = (x) => /^\d{4}-\d{2}-\d{2}$/.test(String(x.metrics?.metricsAsOf || '')) && x.metrics.metricsAsOf >= '2026-09-22'
  for (const e of ENTITIES.filter((x) => x.metrics?.revenue && (updatedHere(x) || String(x.metrics.revenueYear).startsWith('Q')))) {
    assert.ok(e.metrics.revenueSource || e.metrics.disclosure === 'ended' || e.metrics.revenuePublished, `${e.id}: a hand-entered figure without its source`)
  }
  assert.equal(getEntity('sony-music-group').metrics.revenueKind, 'segment sales', 'Sony Music is a segment of Sony, and is labelled so')
  assert.ok(getEntity('bmg').metrics.projection && getEntity('bmg').metrics.revenue === 0.9e9, 'BMG shows its reported figure; the $2.2B pro forma is a projection')
})

t('the brief carries current figures, their filing, and whatever is not current', () => {
  const wmg = renderBriefText(buildBrief('wmg', { mode: 'financial', financials: SEC.companies.wmg })).replace(/\s+/g, ' ')
  assert.ok(/year to 30 Sep 2025/.test(wmg) && /As filed with the SEC/.test(wmg), 'the filed year and its source')
  assert.ok(!/1375/.test(wmg), 'no percentage off a loss')
  const bmg = renderBriefText(buildBrief('bmg', { mode: 'financial' })).replace(/\s+/g, ' ')
  assert.ok(/Projection, not a result/.test(bmg), 'a projection is never presented as a result')
  const believe = renderBriefText(buildBrief('believe', { mode: 'financial' })).replace(/\s+/g, ' ')
  assert.ok(/no longer publishes results/.test(believe), 'last disclosed, and why')
})

console.log(`\n${n} checks passed`)
const rep = freshnessReport(ENTITIES, SEC.companies, TODAY)
console.log(`figures: ${rep.length} companies · ${['due', 'pending', 'final', 'current'].map((s) => `${rep.filter((x) => x.f.status === s).length} ${s}`).join(' · ')} · SEC file ${SEC.updatedAt?.slice(0, 10)}`)
