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
  longTermDebt: { label: 'Long-term debt', kind: 'instant', tags: {
    'us-gaap': ['LongTermDebtNoncurrent', 'LongTermDebt'],
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
