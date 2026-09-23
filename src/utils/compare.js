/**
 * compare.js — companies side by side, without the false comparisons a table invites.
 *
 * Three rules hold everywhere here:
 *
 * 1. A figure in one currency is never ranked against a figure in another. €988.8M is not "less than" $1.31B in
 *    this app, because nothing on record converts them at the right date. Money rows are shown, with each
 *    company's own currency, and marked not comparable the moment two currencies appear.
 * 2. Ratios are unit-free, so margins, growth and multiples compare across currencies — as long as each side is
 *    built from one company's own figures for one period.
 * 3. Fiscal years differ (Reservoir's ends in March, WMG's in September). A comparison says so rather than
 *    lining the columns up and hoping.
 *
 * Everything is read from what the pages already show: SEC filings for filers (`data/financials/sec.json`) and
 * the sourced hand-entered figures for everyone else. Nothing here re-states a fact; a missing figure stays
 * missing.
 */
import { ENTITIES, getEntity } from '../data/entities.js'
import { getTransactionsForEntity } from '../data/transactions.js'
import { format, currencySymbol, formatDate } from './format.js'
import { currentRevenue, freshnessOf, kindLabel } from './freshness.js'
import { freeCashFlow, operatingMargin, sameYear, pctChange } from './financialConcepts.js'

export const MAX_COMPARE = 6
/** At least this many consecutive years before a trend is drawn: two points are a line, not a trend. */
export const MIN_TREND_YEARS = 3

/** Ready-made sets, each one a question someone actually asks. Ids are checked against the canvas at load. */
export const PRESETS = [
  { id: 'majors', label: 'The three majors', ids: ['umg', 'sony-music-group', 'wmg'] },
  { id: 'dsps', label: 'Listed streaming', ids: ['spotify', 'tencent-music', 'deezer', 'netease-cloud-music'] },
  { id: 'live', label: 'Live and ticketing', ids: ['live-nation', 'cts-eventim', 'tko', 'sphere-entertainment'] },
  { id: 'publishing', label: 'Listed rights owners', ids: ['reservoir', 'wmg', 'hybe'] },
].map((p) => ({ ...p, ids: p.ids.filter((id) => ENTITIES.some((e) => e.id === id)) })).filter((p) => p.ids.length > 1)

/** Ids the page can actually compare: real entities, no duplicates, in the order the reader picked them. */
export const readIds = (value) => [...new Set(String(value || '').split(',').map((s) => s.trim()).filter(Boolean))]
  .filter((id) => ENTITIES.some((e) => e.id === id))
  .slice(0, MAX_COMPARE)

/** Search for the picker: name, short name, ticker, subtype, HQ. Companies already picked are dropped. */
export function searchEntities(q, { exclude = [], limit = 8 } = {}) {
  const needle = String(q).trim().toLowerCase()
  if (!needle) return []
  return ENTITIES
    .filter((e) => !exclude.includes(e.id) && `${e.name} ${e.short || ''} ${e.ticker || ''} ${e.subtype || ''} ${e.hq || ''}`.toLowerCase().includes(needle))
    .sort((a, b) => Number(b.name.toLowerCase().startsWith(needle)) - Number(a.name.toLowerCase().startsWith(needle)) || a.tier - b.tier || a.name.localeCompare(b.name))
    .slice(0, limit)
}

const pct = (a, b) => (a == null || !b ? null : (a / b) * 100)
const endOf = (f) => (f?.end ? String(f.end) : null)

/** One company's figures, each with the period and currency it was reported for. */
function readCompany(id, financials = {}, today = new Date()) {
  const e = getEntity(id)
  if (!e) return null
  const fin = financials[id] || null
  const m = e.metrics || {}
  const rev = currentRevenue(e, fin)
  const sec = fin?.metrics || null
  const annual = sec?.revenue?.annual || null
  const history = sec?.revenue?.history || []
  const fcf = freeCashFlow(fin)
  const net = sec?.netIncome?.annual || null
  const ocf = sec?.operatingCashFlow?.annual || null
  // A balance last tagged years ago is shown with its date, never ranked, and never used in a ratio.
  const debt = sec?.longTermDebt?.latest || null
  const cash = sec?.cash?.latest || null
  const usable = (f) => f && !f.stale
  return {
    id,
    e,
    fin,
    rev,
    freshness: freshnessOf(e, fin, today),
    currency: rev?.currency || annual?.currency || null,
    // The fiscal year a company reports on, as the end date of its latest annual figure.
    fiscalEnd: endOf(annual) || (m.revenue ? e.metrics?.fiscalYearEnd || '12-31' : null),
    annual,
    history,
    interim: m.interim || (sec?.revenue?.quarter ? { period: `quarter to ${formatDate(sec.revenue.quarter.end)}`, end: sec.revenue.quarter.end, revenue: sec.revenue.quarter.value, currency: sec.revenue.quarter.currency, filed: sec.revenue.quarter.filed } : null),
    growth: annual && sec?.revenue?.priorAnnual ? pctChange(annual, sec.revenue.priorAnnual) : null,
    opMargin: operatingMargin(fin),
    netMargin: annual && net && sameYear(annual, net) && annual.currency === net.currency ? pct(net.value, annual.value) : null,
    fcf,
    fcfMargin: annual && fcf && sameYear(annual, fcf) && annual.currency === fcf.currency ? pct(fcf.value, annual.value) : null,
    ocf,
    cash,
    debt,
    debtToOcf: usable(debt) && ocf && ocf.value > 0 && debt.currency === ocf.currency ? debt.value / ocf.value : null,
    metrics: m,
    // A company whose figure is a segment of a listed parent's accounts (Sony Music inside Sony Group) reports
    // no margin or cash flow of its own — the empty cells below have a reason, and it belongs on the page.
    segmentOf: m.revenueKind === 'segment sales' ? (getEntity(e.parentId)?.name || 'a listed parent') : null,
    deals: getTransactionsForEntity(id),
    kind: kindLabel(m),
  }
}

/**
 * Compound annual growth over the years available, newest last. Needs MIN_TREND_YEARS consecutive fiscal years
 * (each about 365 days after the one before) and one currency, or it returns null — a CAGR across a gap is a
 * different number wearing the same name.
 */
export function cagr(history = []) {
  const years = [...history].reverse()
  if (years.length < MIN_TREND_YEARS) return null
  if (new Set(years.map((y) => y.currency)).size > 1) return null
  for (let i = 1; i < years.length; i++) {
    const gap = (Date.parse(years[i].end) - Date.parse(years[i - 1].end)) / 86400000
    if (Math.abs(gap - 365) > 20) return null
  }
  const first = years[0].value
  const last = years.at(-1).value
  if (!(first > 0) || !(last > 0)) return null
  const rate = ((last / first) ** (1 / (years.length - 1)) - 1) * 100
  return { value: rate, years: years.length, from: years[0].end, to: years.at(-1).end }
}

/**
 * Revenue rebased to 100, over the SAME number of years for every company that has them. Indexing each company
 * from its own first reported year would compare a five-year run against a three-year one; companies with too
 * few years are excluded by name instead.
 */
export function indexedRevenue(companies) {
  const usable = companies.filter((c) => c.history.length >= MIN_TREND_YEARS && new Set(c.history.map((h) => h.currency)).size === 1)
  const excluded = companies.filter((c) => !usable.includes(c)).map((c) => c.e.name)
  if (usable.length < 2) return { years: 0, series: [], excluded: companies.map((c) => c.e.name) }
  const years = Math.min(...usable.map((c) => c.history.length))
  const series = usable.map((c) => {
    const window = [...c.history].slice(0, years).reverse()
    const base = window[0].value
    return {
      id: c.id,
      name: c.e.name,
      base: window[0],
      points: window.map((y) => ({ end: y.end, value: base > 0 ? (y.value / base) * 100 : null })),
    }
  })
  return { years, series, excluded }
}

const money = (f, currency) => (f == null ? null : { value: f, unit: 'money', currency })
/** A balance, with its date — and, where its tag stopped years ago, the words that say so. */
const instant = (f) => (f ? { value: f.value, unit: 'money', currency: f.currency, period: f.stale ? `last tagged ${formatDate(f.end)} — not the position today` : `at ${formatDate(f.end)}`, stale: !!f.stale } : null)
const ratio = (v, unit = 'pct') => (v == null ? null : { value: v, unit })

/**
 * The comparison table. Every row says what it is measured in; `rankable` is true only where a ranking means
 * something — a unit-free ratio, or money that every company reported in the same currency.
 */
export function buildComparison(ids, { financials = {}, today = new Date() } = {}) {
  const companies = readIds(ids).map((id) => readCompany(id, financials, today)).filter(Boolean)
  const currencies = [...new Set(companies.map((c) => c.currency).filter(Boolean))]
  const fiscalEnds = [...new Set(companies.map((c) => (c.fiscalEnd || '').slice(-5)).filter(Boolean))]
  const mixedCurrency = currencies.length > 1
  const mixedFiscalYear = fiscalEnds.length > 1

  const row = (key, label, cells, opts = {}) => ({
    key,
    label,
    cells,
    unit: opts.unit || 'money',
    lowerIsBetter: !!opts.lowerIsBetter,
    note: opts.note || '',
    // Money is only rankable when one currency covers every figure present.
    // `rank: false` for a count of what this app happens to hold (deals on record): more records is not better.
    rankable: opts.rank === false || cells.some((c) => c?.stale)
      ? false
      : opts.unit === 'money' || !opts.unit
        ? new Set(cells.filter(Boolean).map((c) => c.currency)).size === 1 && cells.filter(Boolean).length > 1
        : cells.filter(Boolean).length > 1,
  })

  const rows = [
    row('revenue', 'Latest reported figure', companies.map((c) => (c.rev ? { value: c.rev.value, unit: 'money', currency: c.rev.currency, period: c.rev.label, source: c.rev.source } : null)), { unit: 'money' }),
    row('growth', 'Revenue growth on the year', companies.map((c) => (c.growth ? { text: c.growth, unit: 'text' } : null)), { unit: 'text' }),
    row('cagr', `Revenue CAGR, ${MIN_TREND_YEARS}+ years`, companies.map((c) => { const g = cagr(c.history); return g ? { value: g.value, unit: 'pct', period: `${g.years} years to ${formatDate(g.to)}` } : null }), { unit: 'pct' }),
    row('opMargin', 'Operating margin', companies.map((c) => ratio(c.opMargin)), { unit: 'pct' }),
    row('netMargin', 'Net margin', companies.map((c) => ratio(c.netMargin)), { unit: 'pct' }),
    row('fcfMargin', 'Free cash flow margin', companies.map((c) => ratio(c.fcfMargin)), { unit: 'pct', note: 'Operating cash flow less capital expenditure, over revenue.' }),
    row('ocf', 'Operating cash flow', companies.map((c) => (c.ocf ? { value: c.ocf.value, unit: 'money', currency: c.ocf.currency, period: `year to ${formatDate(c.ocf.end)}` } : null)), { unit: 'money' }),
    row('cash', 'Cash and equivalents', companies.map((c) => instant(c.cash)), { unit: 'money' }),
    row('debt', 'Long-term debt', companies.map((c) => instant(c.debt)), { unit: 'money', lowerIsBetter: true }),
    row('debtToOcf', 'Long-term debt ÷ operating cash flow', companies.map((c) => ratio(c.debtToOcf, 'x')), { unit: 'x', lowerIsBetter: true, note: 'Both figures from the same filer and currency; not a leverage ratio a lender would use.' }),
    row('subscribers', 'Paid subscribers', companies.map((c) => (c.metrics.subscribers ? { value: c.metrics.subscribers, unit: 'count', period: c.metrics.metricsAsOf } : null)), { unit: 'count' }),
    row('mau', 'Monthly active users', companies.map((c) => (c.metrics.mau ? { value: c.metrics.mau, unit: 'count', period: c.metrics.metricsAsOf } : null)), { unit: 'count' }),
    row('catalogSize', 'Catalog (songs)', companies.map((c) => (c.metrics.catalogSize ? { value: c.metrics.catalogSize, unit: 'count' } : null)), { unit: 'count' }),
    row('aum', 'AUM', companies.map((c) => money(c.metrics.aum, 'USD')), { unit: 'money' }),
    row('deals', 'Deals on record', companies.map((c) => ({ value: c.deals.length, unit: 'count', period: c.deals.length ? `latest ${formatDate(String(c.deals.map((d) => d.date).sort().at(-1)).slice(0, 10))}` : 'none filed' })), { unit: 'count', rank: false }),
    row('freshness', 'Figures', companies.map((c) => ({ text: c.freshness.status === 'none' ? 'none on record' : c.freshness.status, unit: 'text', period: c.freshness.label })), { unit: 'text' }),
  ].filter((r) => r.cells.some(Boolean))

  // Best in each rankable row, so the table marks one cell rather than leaving the reader to scan.
  for (const r of rows) {
    r.best = null
    if (!r.rankable || r.unit === 'text') continue
    const vals = r.cells.map((c) => (c && typeof c.value === 'number' ? c.value : null))
    const present = vals.filter((v) => v != null)
    if (present.length < 2) continue
    const target = r.lowerIsBetter ? Math.min(...present) : Math.max(...present)
    r.best = vals.indexOf(target)
  }

  return {
    companies,
    rows,
    currencies,
    mixedCurrency,
    mixedFiscalYear,
    fiscalEnds,
    index: indexedRevenue(companies),
    /** The sentence the page and every export lead with, so nobody reads the table as like-for-like. */
    caveat: [
      mixedCurrency ? `These companies report in ${currencies.length} currencies (${currencies.join(', ')}). Money is shown as each reported it and is never ranked across currencies; only the ratios compare.` : '',
      mixedFiscalYear ? 'Their fiscal years end on different dates, so the years beside each other are not the same twelve months.' : '',
      companies.some((c) => c.rev?.source === 'record') && companies.some((c) => c.rev?.source === 'sec') ? 'Some figures are filed with the SEC and refreshed daily; others are entered by hand from the company’s own results, with the source on each page.' : '',
      companies.filter((c) => c.segmentOf).map((c) => `${c.e.name}'s figure is segment revenue inside ${c.segmentOf}'s accounts, which report no margin or cash flow for the segment alone.`).join(' '),
    ].filter(Boolean).join(' '),
  }
}

/** A cell's value in the unit it was reported in. Money keeps its own currency symbol — never converted. */
export function cellText(cell) {
  if (!cell) return null
  if (cell.unit === 'text') return cell.text
  if (cell.unit === 'money') return format.money(cell.value, { currency: currencySymbol(cell.currency), digits: Math.abs(cell.value) >= 1e9 ? 2 : 1 })
  if (cell.unit === 'pct') return format.pct(cell.value)
  if (cell.unit === 'x') return `${cell.value.toFixed(1)}×`
  return format.count(cell.value)
}
