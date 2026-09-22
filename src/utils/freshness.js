/**
 * freshness.js — is a company's financial figure still the latest one it should have?
 *
 * Two sources, two tests.
 *
 *   Filed with the SEC (data/financials/sec.json, refreshed daily). Current if the newest period is recent
 *   enough that no newer report is due yet; "pending" when a newer report is on file but SEC has not published
 *   its figures in structured form; "due" when a newer report should exist and the refresh has not found it —
 *   usually a sign the job has stopped, which is exactly what should not be silent.
 *
 *   Entered by hand (entities.js metrics). A figure for a fiscal year is superseded once the next year's results
 *   are due: the year end plus a reporting lag. A figure for 2024 on a calendar-year company is due for
 *   replacement from April 2026. Fiscal years that do not end in December say so (`metrics.fiscalYearEnd`).
 *
 * A third case: some companies stop publishing (Believe went private; BMI stopped giving a revenue figure). Their
 * last disclosed number is not "due" — nothing newer is coming — so it is marked `final` and says why.
 *
 * Every verdict says why, and when the figure became due, so a page can show "due since" rather than a colour.
 */

const KIND = { 'segment sales': 'Segment sales', distributions: 'Distributions', collections: 'Collections', revenue: 'Revenue', 'net assets': 'Net assets', 'management fees': 'Management fees' }
/** "Revenue", "Collections", "Segment sales" — what the number actually is. */
export const kindLabel = (m) => KIND[m?.revenueKind] || 'Revenue'
/** "FY2025", or "year to 2026-03-31" for fiscal years that do not end in December (Sony's "FY2025" ends March 2026). */
export function periodLabel(m) {
  const p = parsePeriod(m?.revenueYear)
  if (!p) return String(m?.revenueYear || '')
  if (p.part !== 'FY') return `${p.part} ${p.year}`
  const fy = m.fiscalYearEnd || '12-31'
  return fy === '12-31' ? `FY${p.year}` : `year to ${formatDate(periodEnd(p, fy))}`
}

import { formatDate } from './format.js'

const DAY = 86400000
const ms = (d) => Date.parse(String(d).length === 10 ? `${d}T00:00:00Z` : d)
const iso = (t) => new Date(t).toISOString().slice(0, 10)

/** Days after a period ends by which its results are normally out. Annual reports: ~90; interim: ~60. */
export const LAG = { annual: 100, quarter: 60 }

/** "2024" · 2024 · "Q2 2026" · "H1 2026" · "FY2025" → { year, part } where part is Q1–Q4, H1/H2 or FY. */
export function parsePeriod(p) {
  const s = String(p ?? '').trim()
  let m = s.match(/^(Q[1-4]|H[12])\s*(\d{4})$/i)
  if (m) return { year: Number(m[2]), part: m[1].toUpperCase() }
  m = s.match(/^(?:FY\s*)?(\d{4})$/i)
  if (m) return { year: Number(m[1]), part: 'FY' }
  return null
}

/** The date a period ended. Fiscal years ending outside December pass `fyEnd` as 'MM-DD' ('03-31' for Sony). */
export function periodEnd({ year, part }, fyEnd = '12-31') {
  if (part === 'FY') return fyEnd.startsWith('12') ? `${year}-${fyEnd}` : `${year}-${fyEnd}`
  const q = { Q1: '03-31', Q2: '06-30', Q3: '09-30', Q4: '12-31', H1: '06-30', H2: '12-31' }[part]
  return `${year}-${q}`
}

/** When the report after this one should be out. Annual → next year end + annual lag; interim → next quarter + lag. */
export function nextDue(end, kind = 'annual') {
  const d = new Date(ms(end))
  if (kind === 'annual') return iso(Date.UTC(d.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate()) + LAG.annual * DAY)
  return iso(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 3, d.getUTCDate()) + LAG.quarter * DAY)
}

/**
 * Verdict for one company. Returns { status: 'current' | 'pending' | 'due' | 'none', basis, label, asOf, dueSince,
 * reason, source }. `fin` is the company's record from sec.json (or undefined); `e` the entity.
 */
export function freshnessOf(e, fin, today = new Date()) {
  const now = (today instanceof Date ? today : new Date(today)).getTime()
  if (fin?.metrics) {
    const r = fin.metrics.revenue
    const latest = [r?.quarter, r?.annual].filter(Boolean).sort((a, b) => b.end.localeCompare(a.end))[0]
    const end = latest?.end || fin.latestPeriodEnd
    if (!end) return { status: 'none', basis: 'sec', reason: 'No figures in SEC’s structured data.' }
    const due = nextDue(end, latest?.form?.startsWith('10-Q') || latest === r?.quarter ? 'quarter' : 'annual')
    const label = latest === r?.quarter ? `quarter to ${formatDate(end)}` : `year to ${formatDate(end)}`
    if (fin.pending) return { status: 'pending', basis: 'sec', label, asOf: end, dueSince: fin.pending.filed, reason: fin.pending.note, source: fin.pending.url }
    if (now > ms(due)) return { status: 'due', basis: 'sec', label, asOf: end, dueSince: due, reason: `The report after the ${label} was due by ${due} and has not been found. The daily refresh may have stopped.`, source: fin.latestFiling?.url }
    return { status: 'current', basis: 'sec', label, asOf: end, reason: `Latest SEC filing: ${fin.latestFiling?.form} filed ${fin.latestFiling?.filed}. Refreshed daily.`, source: fin.latestFiling?.url }
  }
  const m = e?.metrics || {}
  if (!m.revenue) return { status: 'none', basis: 'record', reason: 'No financial figure on record.' }
  const p = parsePeriod(m.revenueYear)
  if (!p) return { status: 'due', basis: 'record', reason: `The period "${m.revenueYear}" cannot be read, so its freshness cannot be judged.` }
  const end = periodEnd(p, m.fiscalYearEnd || '12-31')
  const due = nextDue(end, p.part === 'FY' ? 'annual' : 'quarter')
  const label = periodLabel(m)
  if (m.disclosure === 'ended') return { status: 'final', basis: 'record', label, asOf: end, reason: m.disclosureNote || `${label} is the last figure the company disclosed.`, source: m.revenueSource?.url }
  if (now > ms(due)) return { status: 'due', basis: 'record', label, asOf: end, dueSince: due, reason: `A newer result than ${label} was due by ${due}. This figure is entered by hand and has not been updated.` }
  return { status: 'current', basis: 'record', label, asOf: end, reason: `${label} is the latest result expected before ${due}.` }
}

/** All companies with a verdict other than 'none', worst first, for the /entities facet and the refresh queue. */
export function freshnessReport(entities, secCompanies = {}, today = new Date()) {
  const rank = { due: 0, pending: 1, final: 2, current: 3 }
  return entities
    .map((e) => ({ e, f: freshnessOf(e, secCompanies[e.id], today) }))
    .filter((x) => x.f.status !== 'none')
    .sort((a, b) => rank[a.f.status] - rank[b.f.status] || String(a.f.dueSince || '').localeCompare(String(b.f.dueSince || '')) || a.e.name.localeCompare(b.e.name))
}

/**
 * The headline figure a page should show: the newest of the hand-entered figure and the SEC's, with where it
 * came from. A filing always beats a hand-entered figure for the same or an earlier period.
 */
export function currentRevenue(e, fin) {
  const filed = fin?.metrics?.revenue?.annual
  const m = e?.metrics || {}
  const p = parsePeriod(m.revenueYear)
  const recordEnd = p ? periodEnd(p, m.fiscalYearEnd || '12-31') : null
  if (filed && (!recordEnd || filed.end >= recordEnd)) return { value: filed.value, currency: filed.currency, label: `Revenue, year to ${formatDate(filed.end)}`, end: filed.end, source: 'sec', form: filed.form, filed: filed.filed }
  if (m.revenue) return { value: m.revenue, currency: m.revenueCurrency || 'USD', label: `${kindLabel(m)}, ${periodLabel(m)}`, end: recordEnd, source: 'record', published: m.revenuePublished, sourceRef: m.revenueSource, note: m.revenueNote }
  return null
}
