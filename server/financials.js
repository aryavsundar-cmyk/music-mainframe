/**
 * financials.js — reported financials for every SEC-filing company on the canvas, read from EDGAR's XBRL API
 * (data.sec.gov/api/xbrl/companyfacts). Official, structured, and published the day a filing lands, so these
 * figures can stay current without anyone re-typing them.
 *
 * What makes this harder than reading a tag: companies change tags. Warner Music stopped reporting `Revenues` in
 * 2020 and moved to `RevenueFromContractWithCustomerExcludingAssessedTax`; reading the first tag that exists would
 * present 2020 revenue as the latest. So for each metric every candidate tag is read and the one carrying the
 * newest period wins. Within a tag, a period reported in several filings keeps the most recently filed value, so
 * restatements replace originals. Every figure keeps its form, filing date and accession number, and links to it.
 *
 * Pure extraction here (tested on fixtures); the fetch is at the bottom. SEC requires a declared User-Agent with
 * a contact address and rejects anonymous callers — SEC_USER_AGENT supplies it, and without it nothing is fetched.
 */

const DAY = 86400000
const days = (a, b) => (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY

import { CONCEPTS, staleInstant } from '../src/utils/financialConcepts.js'

export { CONCEPTS }

const ANNUAL = [350, 380]
const QUARTER = [80, 100]
const within = (d, [lo, hi]) => d >= lo && d <= hi
const ANNUAL_FORMS = /^(10-K|20-F|40-F)/
const PERIOD_FORMS = /^(10-K|10-Q|20-F|40-F|6-K)/

/** A currency unit is three capitals ("USD", "EUR", "CNY", "JPY"); prefer USD where a filer reports several. */
const currencyUnits = (units) => Object.keys(units || {}).filter((u) => /^[A-Z]{3}$/.test(u))
const pickUnit = (units) => { const c = currencyUnits(units); return c.includes('USD') ? 'USD' : c[0] }

/** One fact per period — the most recently filed, so a restatement replaces the original. */
function latestPerPeriod(facts) {
  const by = new Map()
  for (const f of facts) {
    if (!PERIOD_FORMS.test(f.form || '')) continue
    const k = `${f.start || ''}|${f.end}`
    const cur = by.get(k)
    if (!cur || String(f.filed) > String(cur.filed)) by.set(k, f)
  }
  return [...by.values()]
}

const pick = (f, currency, tag, taxonomy) => (f ? { value: f.val, currency, start: f.start || null, end: f.end, form: f.form, filed: f.filed, accn: f.accn, tag: `${taxonomy}:${tag}` } : null)

/** The fact whose period ended about a year before `end` (±20 days) — for a like-for-like comparison. */
const yearBefore = (list, end) => list.find((f) => Math.abs(days(f.end, end) - 365) <= 20) || null

/**
 * Read one metric from a companyfacts document. Each kind of figure — annual, quarterly, point-in-time — takes
 * the candidate tag carrying the newest period OF THAT KIND: iHeart reports quarters under `Revenues` but its
 * annual figure under a different tag, so choosing one tag for the whole metric loses the year.
 */
export function readMetric(facts, concept) {
  const series = []
  for (const [taxonomy, tags] of Object.entries(concept.tags)) {
    for (const tag of tags) {
      const units = facts?.[taxonomy]?.[tag]?.units
      const unit = pickUnit(units)
      if (!unit) continue
      const all = latestPerPeriod(units[unit])
      // Years are read from annual reports only. A 10-Q can repeat a full year as a comparative and be the most
      // recent filing of it (WMG's FY2021, last filed in a 2024 10-Q); keeping only the latest filing per period
      // across all forms would then drop that year altogether.
      const annualAll = latestPerPeriod(units[unit].filter((f) => ANNUAL_FORMS.test(f.form || '')))
      if (all.length) series.push({ taxonomy, tag, unit, all, annualAll })
    }
  }
  if (!series.length) return null
  // The newest list of one kind, across every candidate tag; ties keep the earlier (preferred) tag.
  const bestOf = (select) => {
    let best = null
    for (const s of series) {
      const list = select(s.all, s).sort((a, b) => b.end.localeCompare(a.end))
      if (list.length && (!best || list[0].end > best.list[0].end)) best = { ...s, list }
    }
    return best
  }
  if (concept.kind === 'instant') {
    const b = bestOf((all) => all.filter((f) => !f.start))
    if (!b) return null
    return { latest: pick(b.list[0], b.unit, b.tag, b.taxonomy), prior: pick(yearBefore(b.list, b.list[0].end), b.unit, b.tag, b.taxonomy) }
  }
  const isAnnual = (f) => f.start && within(days(f.start, f.end), ANNUAL)
  const a = bestOf((_all, s) => s.annualAll.filter(isAnnual))
  const q = concept.annualOnly ? null : bestOf((all) => all.filter((f) => f.start && within(days(f.start, f.end), QUARTER)))
  if (!a && !q) return null
  return {
    history: a ? annualHistory(a, series, isAnnual) : [],
    annual: a ? pick(a.list[0], a.unit, a.tag, a.taxonomy) : null,
    priorAnnual: a ? pick(yearBefore(a.list, a.list[0].end), a.unit, a.tag, a.taxonomy) : null,
    quarter: q ? pick(q.list[0], q.unit, q.tag, q.taxonomy) : null,
    priorQuarter: q ? pick(yearBefore(q.list, q.list[0].end), q.unit, q.tag, q.taxonomy) : null,
  }
}

/**
 * Up to HISTORY_YEARS fiscal years, newest first, in the winning tag's currency. The winning tag supplies every
 * year it has; older years come from the other candidate tags (WMG's pre-2020 revenue sits under `Revenues`). Two
 * facts whose years end within 20 days of each other are the same year (52/53-week calendars), and the first kept
 * wins — so a newer tag never gets a second, conflicting value for a year it already has.
 */
export const HISTORY_YEARS = 5
function annualHistory(best, series, isAnnual) {
  const out = []
  const add = (f, s) => { if (!out.some((o) => Math.abs(days(o.end, f.end)) <= 20)) out.push(pick(f, s.unit, s.tag, s.taxonomy)) }
  for (const f of best.list) add(f, best)
  for (const s of series) if ((s.tag !== best.tag || s.taxonomy !== best.taxonomy) && s.unit === best.unit) for (const f of s.annualAll.filter(isAnnual)) add(f, s)
  return out.sort((x, y) => y.end.localeCompare(x.end)).slice(0, HISTORY_YEARS)
}

/**
 * The newest annual and periodic reports from a company's filing index (data.sec.gov/submissions). Structured
 * figures can lag the filing itself — Sony's, Tencent Music's and Anghami's 2026 annual reports were on file with
 * no XBRL figures in SEC's dataset — so the index says whether a newer report exists than the figures show.
 */
export function latestFilings(submissions, cik) {
  const r = submissions?.filings?.recent
  if (!r?.form) return { annual: null, periodic: null }
  const rows = r.form.map((form, i) => ({ form, filed: r.filingDate[i], reportDate: r.reportDate[i], accn: r.accessionNumber[i] }))
  const base = (f) => String(f).split('/')[0]
  const row = (x) => (x ? { form: x.form, filed: x.filed, reportDate: x.reportDate, url: filingUrl(cik, x.accn) } : null)
  const annual = rows.find((x) => ['10-K', '20-F', '40-F'].includes(base(x.form)) && x.reportDate)
  const periodic = rows.find((x) => ['10-K', '20-F', '40-F', '10-Q'].includes(base(x.form)) && x.reportDate)
  return { annual: row(annual), periodic: row(periodic) }
}

/** A companyfacts document → the metrics the app shows, plus the newest filing any of them came from. */
export function extractFinancials(doc, { cik, entityId, ticker, submissions = null } = {}) {
  const facts = doc?.facts || {}
  const metrics = {}
  for (const [key, concept] of Object.entries(CONCEPTS)) {
    const m = readMetric(facts, concept)
    if (m) metrics[key] = m
  }
  // Every single figure shown — the history arrays are the same filings over again, and not figures themselves.
  const used = Object.values(metrics).flatMap((m) => Object.entries(m).filter(([k]) => k !== 'history').map(([, v]) => v)).filter(Boolean)
  const newest = used.reduce((a, b) => (!a || String(b.filed) > String(a.filed) ? b : a), null)
  const periods = used.map((f) => f.end).sort()
  // A balance whose tag stopped years ago (KKR's debt was last tagged in 2021, Live Nation's old tag in 2011) is
  // marked, not dropped: the figure was really filed, but nothing may read it as the position today.
  for (const [key, concept] of Object.entries(CONCEPTS)) {
    if (concept.kind !== 'instant' || !metrics[key]) continue
    for (const which of ['latest', 'prior']) {
      const f = metrics[key][which]
      if (f && staleInstant(f, periods.at(-1))) f.stale = periods.at(-1)
    }
  }
  const filings = latestFilings(submissions, cik)
  // A report newer than the figures: say so, with the filing, instead of presenting last year's number as current.
  const shownEnd = metrics.revenue?.annual?.end || null
  const pending = filings.annual && shownEnd && filings.annual.reportDate > shownEnd
    ? { ...filings.annual, note: `A ${filings.annual.form} for the year to ${filings.annual.reportDate} was filed on ${filings.annual.filed}; SEC has not yet published its figures in structured form.` }
    : null
  return {
    entityId,
    name: doc?.entityName || '',
    ticker,
    cik: Number(cik),
    metrics,
    latestFiling: newest ? { form: newest.form, filed: newest.filed, accn: newest.accn, url: filingUrl(cik, newest.accn) } : null,
    latestPeriodEnd: periods.at(-1) || null,
    filings,
    pending,
    source: `https://data.sec.gov/api/xbrl/companyfacts/CIK${String(cik).padStart(10, '0')}.json`,
  }
}

export const filingUrl = (cik, accn) => (accn ? `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${String(accn).replace(/-/g, '')}/` : '')

/** "NYSE: TME · HKEX: 1698" → "TME" — the US listing, which is the one that files with the SEC. */
export const usTicker = (t) => (String(t || '').match(/(?:NYSE|NASDAQ|Nasdaq)(?: American)?:\s*([A-Z.]+)/) || [])[1] || null

// ── The outside world ───────────────────────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getJson(url, ua) {
  const r = await fetch(url, { headers: { 'User-Agent': ua, Accept: 'application/json' }, signal: AbortSignal.timeout(30000) })
  if (!r.ok) throw new Error(`HTTP ${r.status}${r.status === 403 ? ' — SEC refused the request (a declared User-Agent with a contact address is required)' : ''}`)
  return r.json()
}

/**
 * Fetch every SEC filer among `entities`. Sequential and paced: SEC allows ten requests a second and blocks
 * callers who exceed it. Returns { companies, errors, unresolved } — a company that fails keeps its previous
 * record in the caller, and the error says why, so one bad fetch never blanks a page.
 */
export async function fetchAllFinancials(entities, { ua, pauseMs = 250 } = {}) {
  if (!ua) throw new Error('SEC_USER_AGENT is not set. SEC refuses anonymous requests, so nothing was refreshed.')
  const tickers = await getJson('https://www.sec.gov/files/company_tickers.json', ua)
  const cikOf = Object.fromEntries(Object.values(tickers).map((v) => [v.ticker, v.cik_str]))
  const companies = {}
  const errors = {}
  const unresolved = []
  const noFigures = []
  for (const e of entities) {
    const t = usTicker(e.ticker)
    if (!t) continue
    const cik = cikOf[t]
    if (!cik) { unresolved.push(`${e.id} (${t})`); continue }
    try {
      const pad = String(cik).padStart(10, '0')
      const doc = await getJson(`https://data.sec.gov/api/xbrl/companyfacts/CIK${pad}.json`, ua)
      await sleep(pauseMs)
      const submissions = await getJson(`https://data.sec.gov/submissions/CIK${pad}.json`, ua).catch(() => null)
      const rec = extractFinancials(doc, { cik, entityId: e.id, ticker: t, submissions })
      // A filer with no structured figures yet (a new listing reporting on 6-K, say) is not a record: an empty one
      // would displace the verified hand-entered figures on the page. Say so instead.
      if (Object.keys(rec.metrics).length) companies[e.id] = rec
      else noFigures.push(`${e.id} (${t}): on file with the SEC, but no structured financial figures yet`)
    } catch (err) { errors[e.id] = err.message }
    await sleep(pauseMs)
  }
  return { companies, errors, unresolved, noFigures }
}
