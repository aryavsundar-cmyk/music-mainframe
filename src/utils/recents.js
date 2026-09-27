/**
 * recents.js — the last few things this browser opened from search.
 *
 * Local to the browser, like the watchlists: a handful of titles and routes, never uploaded, and the palette
 * works without them. Reads and writes are guarded, so blocked storage costs the convenience and nothing else.
 */
const KEY = 'mm-recent-searches'
export const MAX_RECENTS = 6

/** The fields the palette renders — a recent entry is a result, minus the ranking. */
const slim = (item) => ({ id: item.id, kind: item.kind, title: item.title, subtitle: item.subtitle || '', meta: item.meta || '', to: item.to })

export function readRecents() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(raw) ? raw.filter((r) => r && r.id && r.to && r.title).slice(0, MAX_RECENTS) : []
  } catch { return [] }
}

/** Newest first, no duplicates, capped. A hand-off is a search, not a destination, so it is not remembered. */
export function pushRecent(item) {
  if (!item || item.kind === 'handoff') return readRecents()
  const next = [slim(item), ...readRecents().filter((r) => r.id !== item.id)].slice(0, MAX_RECENTS)
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* storage unavailable: nothing is remembered, everything still works */ }
  return next
}

export function clearRecents() {
  try { localStorage.removeItem(KEY) } catch { /* nothing to clear */ }
  return []
}
