/**
 * filings.js — enrichment connector: structured SEC filings for every US-listed entity in the app.
 *
 * Tickers come from src/data/entities.js, so coverage tracks the entity table rather than a hand-kept list
 * (sibling anti-pattern #3). CIKs are resolved from SEC's own ticker map, then each company's submissions feed
 * gives real form types — 8-K, S-4, SC 13D, ABS-15G — rather than a headline we would have to parse.
 *
 * SEC asks for a declared User-Agent with contact details and no more than ten requests a second. Set
 * SEC_USER_AGENT in the environment; the default names the app and is polite but anonymous.
 */
import { ENTITIES } from '../src/data/entities.js'

// SEC asks for a declared agent with contact details and rejects requests it does not recognise, sometimes by IP.
// Set SEC_USER_AGENT to something like "Your Name your@email"; without it the connector still tries, and says so.
const UA = process.env.SEC_USER_AGENT || 'Mainframe Music research tool (set SEC_USER_AGENT with contact details)'
const HEADERS = { 'User-Agent': UA, Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate' }
export const uaConfigured = () => !!process.env.SEC_USER_AGENT
const TICKER_MAP = 'https://www.sec.gov/files/company_tickers.json'
const SUBMISSIONS = (cik) => `https://data.sec.gov/submissions/CIK${cik}.json`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** What each form actually tells you. `weight` feeds the prospecting timing score. */
export const FORM_MEANING = {
  '8-K': { label: 'Material event', weight: 8, note: 'Something happened the company had to report within days.' },
  'S-4': { label: 'Merger registration', weight: 14, note: 'Securities issued in a merger or exchange — a deal is in progress.' },
  'S-1': { label: 'Registration', weight: 12, note: 'Registering securities for sale, often ahead of an offering or listing.' },
  'SC 13D': { label: 'Activist stake', weight: 12, note: 'An investor has taken over 5% with intent to influence.' },
  'SC 13G': { label: 'Passive stake', weight: 6, note: 'An investor has passed 5%, passively.' },
  'SC 14D9': { label: 'Tender offer response', weight: 14, note: 'The board is responding to a takeover offer.' },
  'DEFM14A': { label: 'Merger proxy', weight: 14, note: 'Shareholders are being asked to vote on a transaction.' },
  'DEF 14A': { label: 'Proxy', weight: 4, note: 'Annual meeting materials: pay, board, auditor.' },
  '424B5': { label: 'Offering', weight: 10, note: 'Pricing supplement — securities are being sold now.' },
  'ABS-15G': { label: 'Securitisation report', weight: 10, note: 'Asset-backed deal reporting, including repurchase demands.' },
  '10-K': { label: 'Annual report', weight: 3, note: 'The full year, audited.' },
  '10-Q': { label: 'Quarterly report', weight: 2, note: 'A quarter, unaudited.' },
  '20-F': { label: 'Annual report (foreign issuer)', weight: 3, note: 'The annual report for a non-US filer.' },
  '6-K': { label: 'Foreign issuer update', weight: 5, note: 'Interim disclosure from a non-US filer.' },
}
export const formMeaning = (form) => FORM_MEANING[form] || FORM_MEANING[String(form).split('/')[0]] || { label: form, weight: 2, note: 'Routine filing.' }

/** US tickers from the entity table: "NASDAQ: WMG", "NYSE: SPOT · HKEX: 1698" → WMG, SPOT. */
export function listedEntities() {
  const out = []
  for (const e of ENTITIES) {
    if (!e.ticker) continue
    for (const part of String(e.ticker).split('·')) {
      const m = part.trim().match(/^(NASDAQ|NYSE|AMEX|NYSE American)\s*:\s*([A-Z.]+)$/i)
      if (m) { out.push({ entityId: e.id, name: e.name, ticker: m[2].toUpperCase() }); break }
    }
  }
  return out
}

let tickerCache = { at: 0, map: null }
async function tickerToCik() {
  if (tickerCache.map && Date.now() - tickerCache.at < 24 * 3600 * 1000) return tickerCache.map
  const res = await fetch(TICKER_MAP, { headers: HEADERS })
  if (!res.ok) throw new Error(`ticker map HTTP ${res.status}`)
  const j = await res.json()
  const map = {}
  for (const row of Object.values(j)) map[String(row.ticker).toUpperCase()] = String(row.cik_str).padStart(10, '0')
  tickerCache = { at: Date.now(), map }
  return map
}

function recentFor(company, cik, submissions, limit) {
  const r = submissions?.filings?.recent
  if (!r?.form) return []
  const out = []
  for (let i = 0; i < r.form.length && out.length < limit; i++) {
    const form = r.form[i]
    const accession = String(r.accessionNumber[i] || '').replace(/-/g, '')
    const doc = r.primaryDocument[i]
    out.push({
      id: `${company.entityId}-${r.accessionNumber[i]}`,
      entityId: company.entityId, company: company.name, ticker: company.ticker,
      form, formLabel: formMeaning(form).label, weight: formMeaning(form).weight, note: formMeaning(form).note,
      filed: r.filingDate[i], period: r.reportDate?.[i] || '',
      description: r.primaryDocDescription?.[i] || '',
      url: accession && doc ? `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession}/${doc}` : `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=&dateb=&owner=include&count=40`,
      source: 'SEC EDGAR',
    })
  }
  return out
}

/** Fetch recent filings for every listed entity. Sequential and paced — SEC rate-limits hard. */
export async function fetchAllFilings({ perCompany = 12, pauseMs = 150, seed = [] } = {}) {
  const companies = listedEntities()
  const errors = []
  // CIKs already known in sources.json seed the run, so a blocked ticker map degrades to partial coverage
  // rather than none. Everything else is resolved from SEC's map when it is reachable.
  const seeded = Object.fromEntries(seed.filter((c) => c.cik && c.ticker).map((c) => [String(c.ticker).toUpperCase(), String(c.cik).padStart(10, '0')]))
  let map = {}
  try { map = await tickerToCik() } catch (err) {
    errors.push({ source: 'SEC ticker map', error: `${err.message}${err.message.includes('403') ? ' — SEC refused the request; set SEC_USER_AGENT with contact details, and note SEC blocks some hosting providers' : ''}` })
  }
  const filings = []
  let resolved = 0
  for (const c of companies) {
    const cik = seeded[c.ticker] || map[c.ticker]
    if (!cik) { errors.push({ source: `SEC: ${c.ticker}`, error: 'no CIK — not in the SEC ticker map and not seeded in sources.json' }); continue }
    try {
      const res = await fetch(SUBMISSIONS(cik), { headers: HEADERS })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      filings.push(...recentFor(c, cik, await res.json(), perCompany))
      resolved += 1
    } catch (err) { errors.push({ source: `SEC: ${c.ticker}`, error: err.message }) }
    await sleep(pauseMs)
  }
  filings.sort((a, b) => String(b.filed).localeCompare(String(a.filed)))
  return { filings, errors, companies: companies.length, resolved, uaConfigured: uaConfigured() }
}
