import { useEffect, useMemo, useState } from 'react'
import { useArchive } from './useForces.js'
import { collectChanges, coverageOf, countByKind, windowStart, DEFAULT_KINDS } from '../utils/changes.js'

/** One request per session for each service, shared across pages; a failure clears it so the next page retries. */
const requests = new Map()
const load = (url) => {
  if (!requests.has(url)) {
    requests.set(url, fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .catch((err) => { requests.delete(url); throw err }))
  }
  return requests.get(url)
}

const useJson = (url) => {
  const [s, setS] = useState({ data: null, state: 'loading', error: null })
  useEffect(() => {
    let alive = true
    load(url).then((d) => { if (alive) setS({ data: d, state: 'ok', error: null }) })
      .catch((err) => { if (alive) setS({ data: null, state: 'unavailable', error: err.message }) })
    return () => { alive = false }
  }, [url])
  return s
}

/**
 * The change feed for one window and one set of companies: filings, figure moves, deals, milestones and news,
 * merged and dated. Every source degrades on its own — an unreachable filings service costs the filings, not
 * the page — and `coverage` says what the window could not have shown.
 */
export function useChanges({ days = 7, ids = null, kinds = null, since = null } = {}) {
  const from = since || windowStart(days)
  const filings = useJson('/api/filings?limit=400')
  const figures = useJson(`/api/financials/changes?since=${from}`)
  const archive = useArchive({ since: from })

  const { items, coverage, newsHidden, counts } = useMemo(() => {
    const sources = {
      filings: filings.data?.items || [],
      figures: figures.data?.entries || [],
      news: archive.items || [],
    }
    // Chip counts come from the whole window, uncapped: a kind that is switched off still says how much it holds.
    const everything = collectChanges({ since: from, ids, ...sources, newsPerDay: Infinity })
    const shownKinds = kinds && kinds.length ? kinds : DEFAULT_KINDS
    const { items: all, newsHidden: hidden } = collectChanges({ since: from, ids, kinds: shownKinds, ...sources })
    return {
      items: all,
      newsHidden: hidden,
      counts: countByKind(everything.items),
      coverage: coverageOf({
        from,
        kinds: shownKinds,
        archiveSince: archive.coverage?.since || null,
        figuresSince: figures.data?.startedAt ? String(figures.data.startedAt).slice(0, 10) : null,
        filingsSince: (filings.data?.items || []).map((f) => f.filed).sort()[0] || null,
      }),
    }
  }, [from, ids, kinds, filings.data, figures.data, archive.items, archive.coverage])

  return {
    items,
    coverage,
    newsHidden,
    counts,
    from,
    state: [filings.state, figures.state, archive.state].includes('loading') ? 'loading' : 'ok',
    sources: {
      filings: { state: filings.state, error: filings.error },
      figures: { state: figures.state, error: figures.error, startedAt: figures.data?.startedAt || null },
      news: { state: archive.state, error: archive.error, since: archive.coverage?.since || null },
    },
  }
}
