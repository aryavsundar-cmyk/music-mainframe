/**
 * search.js — one index over everything the app holds, so nothing has to be found by remembering where it lives.
 *
 * Until now a company could only be reached by first choosing the right page: the entity table, the map, the PE
 * list, prospecting, compare. That is an information-architecture failure, not a search feature — "an effective
 * IA allows users to understand where they are, where they can go, and how to find what they're looking for".
 *
 * Four rules:
 *
 * 1. **Everything is indexed from the records themselves.** Companies, deals, glossary terms and pages come from
 *    the same data the pages render; nothing is restated here, so nothing can drift.
 * 2. **Ranking is deterministic and explainable.** A result knows WHY it matched (`why`), and equal scores break
 *    by kind, then tier, then name — never by array order.
 * 3. **The industry's words are the user's words.** `data/aliases.js` maps "majors", "PRO", "securitisation" and
 *    the rest onto real records, and every alias is checked against the canvas by the tests.
 * 4. **No invented answers.** A query that matches nothing says so and offers the pages it could not search
 *    (the live feed and the archive live on the server, so the palette hands those off to /news and /changes).
 */
import { ENTITIES } from '../data/entities.js'
import { ENTITY_TYPES } from '../data/entities/_schema.js'
import { TRANSACTIONS } from '../data/transactions.js'
import { GLOSSARY } from '../data/glossary.js'
import { PAGE_GUIDE } from '../data/pageGuide.js'
import { ALIASES, SAVED_VIEWS } from '../data/aliases.js'
import { format, formatDate } from './format.js'

/** The kinds a result can be, in the order they are grouped. */
export const KINDS = {
  entity: { id: 'entity', label: 'Companies', rank: 0 },
  view: { id: 'view', label: 'Views', rank: 1 },
  page: { id: 'page', label: 'Pages', rank: 2 },
  deal: { id: 'deal', label: 'Deals', rank: 3 },
  term: { id: 'term', label: 'Finance, explained', rank: 4 },
}
export const KIND_LIST = Object.values(KINDS).sort((a, b) => a.rank - b.rank)

export const MAX_RESULTS = 24
/** Below this, a match is a word buried in a summary: kept out so the list stays about what was asked for. */
export const MIN_SCORE = 12
const norm = (s) => String(s || '').toLowerCase().trim()
/** Ampersands, punctuation and spacing vary between how a name is written and how it is typed. */
const loose = (s) => norm(s).replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim()
const words = (s) => loose(s).split(' ').filter(Boolean)

/**
 * How well `text` answers `q`, and why. Higher is better; 0 means no match. Scores are coarse on purpose — the
 * bands are what rank results, and within a band the tie-breaks decide.
 */
function scoreText(q, text, { weight = 1 } = {}) {
  const t = loose(text)
  if (!t) return null
  const n = loose(q)
  if (!n) return null
  if (t === n) return { score: 100 * weight, why: 'exact' }
  if (t.startsWith(n)) return { score: 80 * weight, why: 'starts with' }
  // A match at the start of any word beats one buried mid-word ("music" in "Music Group", not in "Musicbed").
  if (words(t).some((w) => w.startsWith(n))) return { score: 65 * weight, why: 'word' }
  if (t.includes(n)) return { score: 40 * weight, why: 'contains' }
  return null
}

const best = (...results) => results.filter(Boolean).sort((a, b) => b.score - a.score)[0] || null

/** Every record, flattened into one shape the palette can render without knowing what it is. */
export function buildIndex({ entities = ENTITIES, transactions = TRANSACTIONS, glossary = GLOSSARY, guide = PAGE_GUIDE, aliases = ALIASES, views = SAVED_VIEWS } = {}) {
  const items = []

  for (const e of entities) {
    items.push({
      id: `entity:${e.id}`,
      kind: 'entity',
      title: e.name,
      subtitle: [ENTITY_TYPES[e.type]?.label, e.subtype, e.hq].filter(Boolean).join(' · '),
      meta: e.ticker ? e.ticker.split('·')[0].trim() : '',
      to: `/entities/${e.id}`,
      tier: e.tier || 3,
      // Fields that identify the company, in the order they are trusted.
      keys: [
        { text: e.name, weight: 1 },
        { text: e.short, weight: 0.98 },
        { text: e.ticker, weight: 0.95 },
        { text: e.subtype, weight: 0.5 },
        { text: e.hq, weight: 0.45 },
        { text: e.region, weight: 0.4 },
        { text: e.summary, weight: 0.25 },
      ],
    })
  }

  for (const t of transactions) {
    items.push({
      id: `deal:${t.id}`,
      kind: 'deal',
      title: t.title,
      subtitle: [formatDate(String(t.date).slice(0, 10)), t.type, t.asset].filter(Boolean).join(' · '),
      meta: t.value ? format.usd(t.value, t.currency) : '',
      to: `/deals?q=${encodeURIComponent(t.title.slice(0, 40))}#${t.id}`,
      tier: 2,
      keys: [
        { text: t.title, weight: 1 },
        { text: t.catalogOf, weight: 0.8 },
        { text: t.type, weight: 0.4 },
        { text: t.summary, weight: 0.25 },
      ],
    })
  }

  for (const g of glossary) {
    items.push({
      id: `term:${g.id}`,
      kind: 'term',
      title: g.term,
      subtitle: g.short,
      meta: (g.tags || [])[0] || '',
      to: `/glossary?q=${encodeURIComponent(g.term)}`,
      tier: 2,
      keys: [
        { text: g.term, weight: 1 },
        ...(g.aka || []).map((a) => ({ text: a, weight: 0.95 })),
        { text: g.short, weight: 0.3 },
      ],
    })
  }

  for (const p of guide) {
    if (p.path.includes(':')) continue // a template, not a destination
    items.push({
      id: `page:${p.path}`,
      kind: 'page',
      title: p.title,
      subtitle: p.what,
      meta: p.path,
      to: p.path,
      tier: 1,
      keys: [
        { text: p.title, weight: 1 },
        { text: p.path, weight: 0.6 },
        { text: p.what, weight: 0.3 },
        { text: (p.use || []).join(' '), weight: 0.2 },
      ],
    })
  }

  for (const v of views) {
    items.push({
      id: `view:${v.path}`,
      kind: 'view',
      title: v.label,
      subtitle: 'Saved view',
      meta: '',
      to: v.path,
      tier: 1,
      keys: [{ text: v.term, weight: 1 }, { text: v.label, weight: 0.9 }],
    })
  }

  // Aliases do not become results themselves: they point AT results, and lend their score to them.
  const aliasMap = aliases.map((a) => ({ ...a, key: loose(a.term) }))

  return { items, aliases: aliasMap }
}

let INDEX = null
export const getIndex = () => (INDEX ||= buildIndex())
/** Tests build their own index; this clears the shared one. */
export const resetIndex = () => { INDEX = null }

/**
 * Search everything. Returns at most `limit` results, ranked, each carrying why it matched. An alias match
 * promotes the records it names to the top of their kind and labels them with the word that found them.
 */
export function search(q, { limit = MAX_RESULTS, index = getIndex() } = {}) {
  const query = norm(q)
  if (!query) return []
  const { items, aliases } = index

  // Which records an alias points at, and the word that did it.
  const promoted = new Map()
  for (const a of aliases) {
    const hit = scoreText(query, a.key)
    if (!hit || hit.score < 65) continue
    // A category word ("PRO", "DSP", "securitisation") usually means the section; a group word ("majors") means
    // the companies. Pages therefore outrank the records an alias also names.
    for (const path of a.paths || []) promoted.set(`page:${path.split('?')[0]}`, { score: 94, why: `“${a.term}”`, label: a.label, to: path })
    for (const id of a.ids || []) promoted.set(`entity:${id}`, { score: 90, why: `“${a.term}”`, label: a.label })
  }

  const out = []
  for (const item of items) {
    const direct = best(...item.keys.map((k) => (k.text ? scoreText(query, k.text, { weight: k.weight }) : null)))
    const via = promoted.get(item.id)
    const hit = best(direct, via && { score: via.score, why: `matched ${via.why}` })
    if (!hit || hit.score < MIN_SCORE) continue
    out.push({
      ...item,
      to: via?.to || item.to,
      score: hit.score,
      why: hit.why,
      aliasLabel: via?.label || '',
    })
  }

  return out
    .sort((a, b) => b.score - a.score
      || KINDS[a.kind].rank - KINDS[b.kind].rank
      || a.tier - b.tier
      || a.title.localeCompare(b.title))
    .slice(0, limit)
}

/** The feed and the archive are served, not indexed here — so the palette hands those queries to their pages. */
export const handoffs = (q) => (norm(q) ? [
  { id: 'handoff:news', kind: 'handoff', title: `Search the news feed for “${q}”`, to: `/news?q=${encodeURIComponent(q)}`, subtitle: 'Live trade press and the archive' },
  { id: 'handoff:deals', kind: 'handoff', title: `Search deals for “${q}”`, to: `/deals?q=${encodeURIComponent(q)}`, subtitle: 'Every transaction on record' },
] : [])

/**
 * Results grouped for display. Groups are ordered by their best result, not by kind: searching "securitisation"
 * puts the ABS page first because that is the best answer, even though companies mention it too. Kind order only
 * breaks ties, so a list of equally good matches still reads companies → views → pages → deals → terms.
 */
export function groupResults(results) {
  return KIND_LIST
    .map((k) => {
      const items = results.filter((r) => r.kind === k.id)
      return { ...k, items, top: Math.max(0, ...items.map((i) => i.score || 0)) }
    })
    .filter((g) => g.items.length)
    .sort((a, b) => b.top - a.top || a.rank - b.rank)
}
