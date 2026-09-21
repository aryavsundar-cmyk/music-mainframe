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
export function useForces() {
  const { items: live, total, state } = useNewsStream({ limit: 300 })
  const [archive, setArchive] = useState({ items: [], coverage: null, state: 'loading', error: null, source: null })
  useEffect(() => {
    let alive = true
    fetch('/api/archive')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j) => { if (alive) setArchive({ items: j.items || [], coverage: j.coverage, state: 'ok', error: j.error, source: j.source }) })
      .catch((err) => { if (alive) setArchive((a) => ({ ...a, state: 'unavailable', error: err.message })) })
    return () => { alive = false }
  }, [])
  const today = useMemo(() => new Date(), [])
  const events = useMemo(() => mergeUnique(live, archive.items), [live, archive.items])
  const { tagged, unclassified } = useMemo(() => classifyAll({ deals: TRANSACTIONS, events }), [events])
  return {
    tagged,
    unclassified,
    today,
    coverageSince: archive.coverage?.since || null,
    feed: { state, total, read: live.length },
    archive: { state: archive.state, coverage: archive.coverage, error: archive.error, source: archive.source, count: archive.items.length },
  }
}
