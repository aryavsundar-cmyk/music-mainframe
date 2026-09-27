/**
 * documentRead.js — what the canvas already knows about the document you just dropped.
 *
 * Parsing a file into text is the easy half and the sibling app already does it. The half that belongs in THIS
 * application is what happens next: 191 companies, 61 transactions, a forces taxonomy and 68 explained terms sit
 * one function call away, so an uploaded pack should come back as LINKS, not as a wall of text. A name becomes an
 * entity id. A figure next to that name gets set beside the figure the record holds. That is the difference
 * between "we read your file" and "we read your file and here is what we already have on it".
 *
 * **Nothing found here is a fact about the world.** It is a fact about a document someone handed us, and the two
 * must never be confused — which is the rule Sprints 36 to 39 spent four sprints building, pointed at input
 * instead of output. So:
 *
 * - every finding carries its provenance: the filename, and the page or slide where it was seen;
 * - every finding is `verify: true`, always, with no route to false;
 * - a figure in a document sitting near a company name is a PROMPT TO LOOK, never a restatement of the record.
 *   `checks` exists to say "these two numbers differ" — not to decide which is right.
 *
 * Pure: text in, findings out. No network, no files, no canvas mutation.
 */
import { ENTITIES, getEntity } from '../data/entities.js'
import { GLOSSARY } from '../data/glossary.js'
import { currentRevenue } from './freshness.js'
import { format } from './format.js'

/**
 * A name shorter than this matches too much to be worth reporting case-insensitively — "gamma" and "Apple" would
 * otherwise hit half the English language. But an all-caps acronym is unambiguous when matched case-SENSITIVELY:
 * "PPL" is a society, "ppl" is chat. So short names are allowed in, on that condition and no other.
 */
const MIN_NAME = 4
const MIN_ACRONYM = 3
/** Characters of surrounding text kept with a figure, so the reader can see what it was labelling. */
const CONTEXT = 90
/** A figure further than this from a company name is not about that company. */
const NEAR = 120
/** Anything past this and the document is telling us the same thing repeatedly. */
export const MAX_FINDINGS = 40

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const squash = (s) => String(s).replace(/\s+/g, ' ').trim()

/**
 * The names worth looking for. A canvas name is only searchable if it is long enough to be unambiguous — "gamma"
 * and "Apple" would otherwise match half the English language and every mention of a fruit.
 */
export function nameIndex(entities = ENTITIES) {
  const out = []
  for (const e of entities) {
    const names = new Set()
    for (const n of [e.name, e.short]) {
      if (!n) continue
      if (n.length >= MIN_NAME) names.add(n)
      else if (n.length >= MIN_ACRONYM && n === n.toUpperCase()) names.add(n)
    }
    // A ticker is unambiguous at any length, but only in its own form: "NASDAQ: WMG" gives us "WMG".
    const ticker = (e.ticker || '').split(':').pop()?.trim()
    if (ticker && ticker.length >= MIN_ACRONYM && /^[A-Z0-9.]+$/.test(ticker)) names.add(ticker)
    for (const name of names) {
      // Case-sensitive for an acronym, case-insensitive for a real name.
      const acronym = name.length < MIN_NAME || (name === name.toUpperCase() && name.length <= 5)
      out.push({ id: e.id, entity: e, name, acronym, re: new RegExp(`\\b${escapeRe(name)}\\b`, acronym ? 'g' : 'gi') })
    }
  }
  // Longest first, so "Sony Music Publishing" wins over "Sony Music" on the same span of text.
  return out.sort((a, b) => b.name.length - a.name.length)
}

/**
 * Money, as documents actually write it: `£315.3 million`, `$3.5bn`, `€1.2B`, `KRW 8.099 trillion`,
 * `₹1,175,919 crore`. Anything this cannot read with confidence is left alone rather than guessed at.
 */
const SCALE = { k: 1e3, thousand: 1e3, m: 1e6, mm: 1e6, million: 1e6, bn: 1e9, b: 1e9, billion: 1e9, t: 1e12, trillion: 1e12, crore: 1e7, lakh: 1e5 }
const SYMBOL = { '$': 'USD', '£': 'GBP', '€': 'EUR', '¥': 'JPY', '₩': 'KRW', '₹': 'INR' }
const CODE = /^(USD|GBP|EUR|JPY|KRW|INR|AUD|CAD|CNY|CHF|SEK)$/i
const MONEY = /(?:(USD|GBP|EUR|JPY|KRW|INR|AUD|CAD|CNY|CHF|SEK|A\$|C\$|US\$)\s*|([$£€¥₩₹]))\s*([\d]{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*(k|thousand|mm?|million|bn?|billion|t|trillion|crore|lakh)?\b/gi

export function findFigures(text, { from, pageOf } = {}) {
  const out = []
  for (const m of text.matchAll(MONEY)) {
    const [whole, code, symbol, digits, scale] = m
    const n = Number(String(digits).replace(/,/g, ''))
    if (!Number.isFinite(n) || n === 0) continue
    const multiplier = scale ? SCALE[scale.toLowerCase()] || 1 : 1
    const currency = symbol ? SYMBOL[symbol] : (CODE.test(code || '') ? code.toUpperCase() : { 'A$': 'AUD', 'C$': 'CAD', 'US$': 'USD' }[code] || 'USD')
    // A bare number with no scale word and no decimals under 1000 is usually a count, a year or a page reference.
    if (!scale && n < 1000) continue
    out.push({
      text: squash(whole),
      value: n * multiplier,
      currency,
      context: squash(text.slice(Math.max(0, m.index - CONTEXT), m.index + whole.length + CONTEXT)),
      at: m.index,
      from,
      page: pageOf ? pageOf(m.index) : null,
      verify: true,
    })
  }
  return out
}

/** Which canvas companies this document names, and where. */
export function findCompanies(text, { from, pageOf, index = nameIndex() } = {}) {
  const seen = new Map()
  const claimed = []
  const overlaps = (start, end) => claimed.some(([s, e]) => start < e && end > s)
  for (const entry of index) {
    for (const m of text.matchAll(entry.re)) {
      const start = m.index
      const end = start + m[0].length
      // A longer name already matched this span: "Sony Music Publishing" must not also report "Sony Music".
      if (overlaps(start, end)) continue
      claimed.push([start, end])
      const hit = seen.get(entry.id) || { id: entry.id, name: entry.entity.name, hits: 0, matched: new Set(), at: [], where: [] }
      hit.hits += 1
      hit.matched.add(m[0])
      if (hit.at.length < 40) hit.at.push({ s: start, e: end })
      if (hit.where.length < 3) {
        hit.where.push({ from, page: pageOf ? pageOf(start) : null, quote: squash(text.slice(Math.max(0, start - CONTEXT), end + CONTEXT)) })
      }
      seen.set(entry.id, hit)
    }
  }
  return [...seen.values()]
    .map((h) => ({ ...h, matched: [...h.matched], verify: true }))
    .sort((a, b) => b.hits - a.hits)
}

/** Explained terms the document uses, so the reader can hand someone the glossary rather than a definition. */
export function findTerms(text, { glossary = GLOSSARY } = {}) {
  const lower = text.toLowerCase()
  return glossary
    .filter((g) => g.term && g.term.length >= MIN_NAME && lower.includes(g.term.toLowerCase()))
    .map((g) => ({ id: g.id, term: g.term, short: g.short }))
    .slice(0, MAX_FINDINGS)
}

/**
 * Where a document's figure sits next to a company the canvas has a figure for.
 *
 * This is the most useful and the most dangerous thing in the file, so read the wording carefully: it reports that
 * two numbers exist, names both, and says which is which. It does NOT decide that the document is wrong, and it
 * does not touch the record. The document may be measuring a different thing, a different period or a different
 * entity in the same group — and a tool that quietly "corrected" one against the other would be inventing facts.
 */
export function compareFigures(companies, figures, { financials = {} } = {}) {
  const checks = []
  // A figure belongs to the company whose name is CLOSEST to it, not to every company mentioned nearby. The first
  // version of this used "does the context window contain the name", and on one sentence — "Warner Music Group
  // reported $6.4 billion, while Universal Music Group posted €12.5B" — it cheerfully attributed Warner's figure
  // to Universal as well. Plausible, well-formatted and wrong is the failure mode this whole app exists to avoid.
  //
  // Direction matters as much as distance. Financial prose reads "X reported revenue of $N", so a company named
  // BEFORE a figure owns it ahead of one named after — and measuring start-to-start rather than end-to-start made
  // Universal fractionally "nearer" to Warner's number than Warner was. Both corrections were needed.
  const owner = new Map()
  for (const f of figures) {
    let best = null
    for (const c of companies) {
      for (const at of c.at || []) {
        const before = at.e <= f.at
        const gap = before ? f.at - at.e : at.s - (f.at + f.text.length)
        if (gap < 0 || gap > NEAR) continue
        const rank = (before ? 0 : NEAR * 10) + gap
        if (!best || rank < best.rank) best = { id: c.id, rank }
      }
    }
    if (!best) continue
    const held = owner.get(best.id)
    if (!held || best.rank < held.rank) owner.set(best.id, { figure: f, rank: best.rank })
  }
  for (const c of companies) {
    const e = getEntity(c.id)
    if (!e) continue
    const ours = currentRevenue(e, financials[c.id])
    if (!ours) continue
    const near = owner.get(c.id)?.figure
    if (!near) continue
    const sameCurrency = near.currency === ours.currency
    const apart = sameCurrency && ours.value ? Math.abs(near.value - ours.value) / ours.value : null
    checks.push({
      entityId: c.id,
      name: e.name,
      theirs: { text: near.text, value: near.value, currency: near.currency, context: near.context, from: near.from, page: near.page },
      ours: { value: ours.value, currency: ours.currency, label: ours.label, text: format.usd(ours.value, ours.currency) },
      sameCurrency,
      // Only ever a prompt. Under a percent apart they are almost certainly the same figure rounded differently.
      differs: apart == null ? null : apart > 0.01,
      verify: true,
    })
  }
  return checks.slice(0, MAX_FINDINGS)
}

/** A page/slide locator for a document whose parser gave us pages. */
export function pageLocator(pages) {
  if (!pages?.length) return null
  const bounds = []
  let at = 0
  pages.forEach((p, i) => { const head = `— page ${i + 1} —\n`.length; at += head; bounds.push([at, at + p.length, i + 1]); at += p.length + 2 })
  return (index) => (bounds.find(([s, e]) => index >= s && index <= e) || [])[2] || null
}

/**
 * Everything the canvas can say about one parsed document.
 *
 * `from` is carried into every finding rather than attached once at the top, because findings get merged across
 * files and a merged list that has lost track of which file said what is worse than no list.
 */
export function readDocument(parsed, { financials = {}, index = nameIndex() } = {}) {
  const { text, filename, pages } = parsed
  const pageOf = pageLocator(pages)
  const companies = findCompanies(text, { from: filename, pageOf, index }).slice(0, MAX_FINDINGS)
  const figures = findFigures(text, { from: filename, pageOf }).slice(0, MAX_FINDINGS)
  return {
    filename,
    kind: parsed.kind,
    chars: text.length,
    words: (text.match(/\S+/g) || []).length,
    companies,
    figures,
    terms: findTerms(text),
    checks: compareFigures(companies, figures, { financials }),
  }
}

/** Findings from several files, merged, with every hit still naming the file it came from. */
export function mergeReadings(readings) {
  const companies = new Map()
  for (const r of readings) {
    for (const c of r.companies) {
      const hit = companies.get(c.id) || { ...c, hits: 0, where: [], files: new Set() }
      hit.hits += c.hits
      hit.where = [...hit.where, ...c.where].slice(0, 4)
      hit.files.add(r.filename)
      companies.set(c.id, hit)
    }
  }
  return {
    files: readings.map((r) => ({ filename: r.filename, kind: r.kind, words: r.words, companies: r.companies.length, figures: r.figures.length })),
    companies: [...companies.values()].map((c) => ({ ...c, files: [...c.files] })).sort((a, b) => b.hits - a.hits),
    figures: readings.flatMap((r) => r.figures),
    terms: [...new Map(readings.flatMap((r) => r.terms).map((t) => [t.id, t])).values()],
    checks: readings.flatMap((r) => r.checks),
    words: readings.reduce((n, r) => n + r.words, 0),
  }
}
