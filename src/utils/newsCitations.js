/**
 * newsCitations.js — one function every export renderer calls (Patterns §2).
 * fetchCitations({ entityId, limit, base }) → { items, source: 'live' | 'empty' | 'unavailable' }
 * 'unavailable' = backend unreachable; 'empty' = backend up, nothing tagged. The renderers print a
 * different fallback line for each so the operator never restarts a server to fix a feed that is
 * merely quiet. `base` lets the Node script point at a running server; in the browser it is ''.
 */
export async function fetchCitations({ entityId, limit = 8, minScore = 10, base = '' } = {}) {
  try {
    const qs = new URLSearchParams({ entity: entityId, limit: String(limit), minScore: String(minScore) })
    const r = await fetch(`${base}/api/news?${qs}`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const j = await r.json()
    const items = (j.items || []).map((n) => ({ title: n.title, source: n.source, url: n.url, publishedAt: n.publishedAt, topics: n.topics || [], score: n.score }))
    return { items, source: items.length ? 'live' : 'empty', fetchedAt: j.status?.lastSuccess || null }
  } catch {
    return { items: [], source: 'unavailable', fetchedAt: null }
  }
}

export const CITATION_FALLBACK = {
  empty: 'Live feed reachable, but no items tagged to this entity in the current window. Widen server/sources.json or add an alias in server/signals.js.',
  unavailable: 'Live feed unreachable when this brief was generated. Start the news server (or check the deploy) and re-export for citations.',
}
