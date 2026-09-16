import { useEffect, useState } from 'react'

/** Live news-signal counts per entity, used by the timing score. Degrades to none when the feed is unreachable. */
export function useSignals() {
  const [state, setState] = useState({ signals: {}, state: 'loading' })
  useEffect(() => {
    let alive = true
    fetch('/api/news?limit=300')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => {
        if (!alive) return
        const map = {}
        for (const it of j.items || []) for (const id of it.entities || []) map[id] = (map[id] || 0) + 1
        setState({ signals: map, state: 'live' })
      })
      .catch(() => { if (alive) setState({ signals: {}, state: 'unavailable' }) })
    return () => { alive = false }
  }, [])
  return state
}
