/**
 * watchlist.js — the companies this reader follows, and when they last looked.
 *
 * Local to the browser, like the prospecting notes: a list of entity ids and a timestamp, nothing else. It never
 * leaves the machine, and losing it loses nothing but convenience — every page works without one. Reads and
 * writes are guarded: a private window or a browser with storage blocked gets the default list, not an error.
 */
const LISTS_KEY = 'mm-watchlists'
const SEEN_KEY = 'mm-changes-last-seen'
export const DEFAULT_LIST = { id: 'watching', label: 'Watching', ids: [] }

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable: the app still works, the choice just is not remembered */ } }

/** Every list, the default one first. Always returns at least the default list. */
export function readLists() {
  const stored = read(LISTS_KEY, null)
  if (!Array.isArray(stored) || stored.length === 0) return [DEFAULT_LIST]
  return stored
    .filter((l) => l && typeof l.id === 'string' && Array.isArray(l.ids))
    .map((l) => ({ id: l.id, label: String(l.label || l.id), ids: [...new Set(l.ids.filter((x) => typeof x === 'string'))] }))
}

export const saveLists = (lists) => write(LISTS_KEY, lists)
export const getList = (lists, id) => lists.find((l) => l.id === id) || lists[0]

/** Add or remove one company from a list, returning the new lists. */
export function toggleInList(lists, listId, entityId) {
  const out = lists.map((l) => (l.id !== listId ? l : { ...l, ids: l.ids.includes(entityId) ? l.ids.filter((x) => x !== entityId) : [...l.ids, entityId] }))
  saveLists(out)
  return out
}

/** A new list, named by the reader. Ids are entity ids; a list with none means "everything on the canvas". */
export function addList(lists, label, ids = []) {
  const id = `list-${Date.now().toString(36)}`
  const out = [...lists, { id, label: String(label || 'New list').slice(0, 40), ids }]
  saveLists(out)
  return { lists: out, id }
}

export function removeList(lists, id) {
  const out = lists.filter((l) => l.id !== id)
  const safe = out.length ? out : [DEFAULT_LIST]
  saveLists(safe)
  return safe
}

export const isWatched = (lists, entityId) => lists.some((l) => l.ids.includes(entityId))

/** When this browser last opened the change feed, or null the first time. */
export const lastSeen = () => read(SEEN_KEY, null)
export const markSeen = (whenIso = new Date().toISOString()) => write(SEEN_KEY, whenIso)
