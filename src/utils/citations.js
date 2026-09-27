/**
 * citations.js — how good are this application's citations, counted rather than claimed.
 *
 * `/about` says every record carries its sources. That was true and it was not the whole truth: 84 of the 360
 * cited links — nearly a quarter — are Music Business Worldwide SEARCH urls, a query box with the words
 * pre-filled rather than the article that reports the fact. They resolve, so no link checker would ever flag
 * them, and they were labelled plainly "Music Business Worldwide", which reads as a specific piece.
 *
 * That is the failure this file exists to make visible. A citation has three useful properties and they are not
 * the same thing:
 *
 * - **document** — a specific page that reports the fact. What a citation should be.
 * - **search** — a query against a publication. It points at where the answer probably is, which is a lead, not
 *   a source. Counted separately and never described as anything else.
 * - **home** — a company's front page or investor-relations index. Fine for "this company exists and here it
 *   is", useless as evidence for a figure.
 *
 * Nothing here judges whether a link WORKS; that needs the network and lives in `scripts/check-sources.mjs`.
 */

/** A publication search, not an article. Extend this only with patterns that are genuinely query strings. */
const SEARCH = [/[?&]s=/, /[?&]q=/, /[?&]query=/, /\/search\b/]

/** A front page or a section index: no path, or a path that is only a well-known landing segment. */
const LANDING = /^\/?(|en|en-us|investors?|investor-relations|ir|about|company|news|newsroom|media|press)\/?$/i

export function classifyCitation(url) {
  let parsed
  try { parsed = new URL(url) } catch { return 'invalid' }
  if (SEARCH.some((re) => re.test(parsed.search) || re.test(parsed.pathname))) return 'search'
  if (LANDING.test(parsed.pathname)) return 'home'
  return 'document'
}

/** Walk any data structure and pull out every `{ label, url }` it holds, once per distinct url. */
export function collectCitations(roots) {
  const found = new Map()
  const walk = (node, depth = 0) => {
    if (!node || depth > 10 || typeof node !== 'object') return
    if (Array.isArray(node)) return node.forEach((x) => walk(x, depth + 1))
    if (typeof node.url === 'string' && /^https?:/i.test(node.url) && !found.has(node.url)) {
      found.set(node.url, { url: node.url, label: node.label || '', kind: classifyCitation(node.url) })
    }
    for (const value of Object.values(node)) walk(value, depth + 1)
  }
  for (const root of roots) walk(root, 0)
  return [...found.values()]
}

/**
 * The counts `/about` prints. `documents` is the number worth being proud of; `searches` is the backlog, and it
 * is shown next to it rather than folded into a single "N sources" figure that would hide it.
 */
export function citationQuality(roots) {
  const all = collectCitations(roots)
  const of = (kind) => all.filter((c) => c.kind === kind).length
  return {
    total: all.length,
    documents: of('document'),
    searches: of('search'),
    homes: of('home'),
    invalid: of('invalid'),
    pct: all.length ? Math.round((of('document') / all.length) * 100) : 0,
  }
}
