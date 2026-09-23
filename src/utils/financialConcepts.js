/**
 * financialConcepts.js — the financial figures the app reads from SEC filings, and the XBRL tags each may be
 * filed under. Shared by the refresh job (server/financials.js) and the company page, so the table a reader sees
 * and the figures the job collects cannot disagree about what a row is.
 */
/** Candidate tags per metric, US GAAP and IFRS (foreign filers such as Spotify, Tencent Music and Sony). */
export const CONCEPTS = {
  revenue: { label: 'Revenue', kind: 'duration', tags: {
    'us-gaap': ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'RevenueFromContractWithCustomerIncludingAssessedTax', 'SalesRevenueNet', 'RevenuesNetOfInterestExpense'],
    'ifrs-full': ['Revenue', 'RevenueFromContractsWithCustomers'],
  } },
  operatingIncome: { label: 'Operating income', kind: 'duration', tags: {
    'us-gaap': ['OperatingIncomeLoss'],
    'ifrs-full': ['ProfitLossFromOperatingActivities'],
  } },
  netIncome: { label: 'Net income', kind: 'duration', tags: {
    'us-gaap': ['NetIncomeLoss', 'ProfitLoss'],
    'ifrs-full': ['ProfitLossAttributableToOwnersOfParent', 'ProfitLoss'],
  } },
  cash: { label: 'Cash and equivalents', kind: 'instant', tags: {
    'us-gaap': ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents'],
    'ifrs-full': ['CashAndCashEquivalents'],
  } },
  // Cash-flow statements in 10-Qs are year-to-date, so a "quarter" read from them would be Q1 only or a
  // cumulative figure: these are annual only.
  operatingCashFlow: { label: 'Operating cash flow', kind: 'duration', annualOnly: true, tags: {
    'us-gaap': ['NetCashProvidedByUsedInOperatingActivities', 'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations'],
    'ifrs-full': ['CashFlowsFromUsedInOperatingActivities'],
  } },
  capex: { label: 'Capital expenditure', kind: 'duration', annualOnly: true, tags: {
    'us-gaap': ['PaymentsToAcquirePropertyPlantAndEquipment', 'PaymentsToAcquireProductiveAssets'],
    'ifrs-full': ['PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities', 'PurchaseOfPropertyPlantAndEquipment'],
  } },
  longTermDebt: { label: 'Long-term debt', kind: 'instant', tags: {
    // Live Nation reports its debt only under the capital-lease combined tags; reading the first two alone gave
    // its 2011 balance as today's.
    'us-gaap': ['LongTermDebtNoncurrent', 'LongTermDebt', 'LongTermDebtAndCapitalLeaseObligations', 'LongTermDebtAndCapitalLeaseObligationsNoncurrent'],
    'ifrs-full': ['NoncurrentPortionOfNoncurrentBorrowings', 'LongtermBorrowings'],
  } },
}


/**
 * Change on the comparable period. A percentage off a loss or a zero base is arithmetic, not meaning (a move from
 * −$16M to +$204M is "+1,375%"), so those cases are described in words instead, as analysts do.
 */
export function pctChange(a, b) {
  if (a?.value == null || b?.value == null) return '—'
  if (b.value === 0) return 'n/m'
  if (b.value < 0) {
    if (a.value >= 0) return 'from a loss'
    return Math.abs(a.value) < Math.abs(b.value) ? 'loss narrower' : 'loss wider'
  }
  if (a.value < 0) return 'to a loss'
  const pct = ((a.value - b.value) / b.value) * 100
  return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`
}

const DAY_MS = 86400000
/** A balance more than this far behind the company's latest reported period is a leftover tag, not the position. */
export const STALE_INSTANT_DAYS = 400

/** Is this point-in-time figure far older than the newest period the company reported? */
export const staleInstant = (f, latestPeriodEnd) => !!(f?.end && latestPeriodEnd && (Date.parse(latestPeriodEnd) - Date.parse(f.end)) / DAY_MS > STALE_INSTANT_DAYS)
/** Two periods are the same fiscal year when their ends fall within 20 days (52/53-week calendars). */
export const sameYear = (a, b) => !!(a?.end && b?.end && Math.abs(Date.parse(a.end) - Date.parse(b.end)) <= 20 * DAY_MS)

/**
 * Free cash flow = operating cash flow less capital expenditure, for a year only when BOTH are reported for that
 * same year in the same currency. Never mixes a year of one with a year of the other.
 */
export function freeCashFlow(fin, which = 'annual') {
  const o = fin?.metrics?.operatingCashFlow?.[which]
  const c = fin?.metrics?.capex?.[which]
  if (!o || !c || !sameYear(o, c) || o.currency !== c.currency) return null
  return { ...o, value: o.value - c.value, derived: 'Operating cash flow less capital expenditure' }
}

/** Operating margin for one period: operating income over revenue for the same period and currency. */
export function operatingMargin(fin, which = 'annual') {
  const r = fin?.metrics?.revenue?.[which]
  const o = fin?.metrics?.operatingIncome?.[which]
  if (!r || !o || !sameYear(r, o) || r.currency !== o.currency || !r.value) return null
  return (o.value / r.value) * 100
}

/**
 * The five-year record: the years revenue is reported for (oldest first), and each figure in each of those years
 * where the filing gives it. A cell is empty rather than borrowed from a neighbouring year. Growth is computed only
 * between consecutive years.
 */
export function fiveYearRecord(fin) {
  const m = fin?.metrics || {}
  const years = [...(m.revenue?.history || [])].reverse()
  if (years.length < 2) return null
  const cell = (key, y) => (m[key]?.history || []).find((h) => sameYear(h, y) && h.currency === y.currency) || null
  const consecutive = (a, b) => a && b && Math.abs((Date.parse(b.end) - Date.parse(a.end)) / DAY_MS - 365) <= 20
  const row = (key, label) => ({ key, label, cells: years.map((y) => cell(key, y)) })
  const revenue = row('revenue', 'Revenue')
  const growth = { key: 'growth', label: 'Growth', text: years.map((y, i) => (i && consecutive(years[i - 1], y) ? pctChange(y, years[i - 1]) : '—')) }
  const op = row('operatingIncome', 'Operating income')
  const margin = { key: 'margin', label: 'Operating margin', text: years.map((y, i) => (op.cells[i] && y.value ? `${((op.cells[i].value / y.value) * 100).toFixed(1)}%` : '—')) }
  const ocf = row('operatingCashFlow', 'Operating cash flow')
  const capex = row('capex', 'Capital expenditure')
  const fcf = { key: 'fcf', label: 'Free cash flow', cells: years.map((_, i) => (ocf.cells[i] && capex.cells[i] ? { ...ocf.cells[i], value: ocf.cells[i].value - capex.cells[i].value } : null)) }
  const rows = [revenue, growth, op, margin, row('netIncome', 'Net income'), ocf, capex, fcf]
    .filter((r) => (r.cells || r.text).some((c) => (r.cells ? c : c !== '—')))
  return { years, currency: years[0].currency, rows }
}
