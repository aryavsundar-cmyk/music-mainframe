import { useEffect, useMemo, useState } from 'react'
import { useNewsStream } from './useNewsStream.js'
import { TRANSACTIONS } from '../data/transactions.js'
import { classifyAll } from '../utils/forces.js'
import { mergeUnique } from '../utils/eventKeys.js'

/**
 * useForces — every deal on record, plus every market event from the evidence archive and the live feed,
 * read against the Five Forces.
 *
 * Two sources of events, because each alone misleads. The live feed forgets on every restart, so on its own a
 * "last 365 days" count measures server uptime. The archive only knows what it has seen since it started. The
 * page gets both, merged, and `coverageSince` — the day the archive began — so a window that reaches further
 * back can be shown as a floor rather than a total.
 */
/**
 * One archive request per filter set per session, shared by every page; a failure clears it so the next page
 * retries. Filters go to the server, which applies the same function it uses for /api/news.
 */
const archiveRequests = new Map()
const loadArchive = (filters = {}) => {
  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString()
  if (!archiveRequests.has(qs)) {
    archiveRequests.set(qs, fetch(`/api/archive${qs ? `?${qs}` : ''}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .catch((err) => { archiveRequests.delete(qs); throw err }))
  }
  return archiveRequests.get(qs)
}

/** The archive, optionally filtered. `state`: loading · ok · unavailable. */
export function useArchive(filters = {}) {
  const key = JSON.stringify(filters)
  const [archive, setArchive] = useState({ key: null, items: [], coverage: null, state: 'loading', error: null, source: null })
  useEffect(() => {
    let alive = true
    loadArchive(JSON.parse(key))
      .then((j) => { if (alive) setArchive({ key, items: j.items || [], coverage: j.coverage, state: 'ok', error: j.error, source: j.source }) })
      .catch((err) => { if (alive) setArchive((a) => ({ ...a, key, state: 'unavailable', error: err.message })) })
    return () => { alive = false }
  }, [key])
  // Until the request for THIS filter set answers, report loading rather than the previous set's items.
  return archive.key === key ? archive : { ...archive, items: [], state: 'loading' }
}

/**
 * Market events only — archive plus the live items the page already holds — for pages that show the feed.
 * The News page passes its own stream, so it never opens a second connection for the same data.
 */
export function useForceEvents({ live = [], filters = {} } = {}) {
  const archive = useArchive(filters)
  const events = useMemo(() => mergeUnique(live, archive.items), [live, archive.items])
  const { tagged, unclassified } = useMemo(() => classifyAll({ events }), [events])
  return { tagged, unclassified, coverageSince: archive.coverage?.since || null, archive }
}

export function useForces() {
  const { items: live, total, state } = useNewsStream({ limit: 300 })
  const archive = useArchive()
  const today = useMemo(() => new Date(), [])
  const events = useMemo(() => mergeUnique(live, archive.items), [live, archive.items])
  const { tagged, unclassified } = useMemo(() => classifyAll({ deals: TRANSACTIONS, events }), [events])
  return {
    tagged,
    unclassified,
    today,
    coverageSince: archive.coverage?.since || null,
    feed: { state, total, read: live.length },
    loading: state === 'loading' || archive.state === 'loading',
    archive: { state: archive.state, coverage: archive.coverage, error: archive.error, source: archive.source, count: archive.items.length },
  }
}
