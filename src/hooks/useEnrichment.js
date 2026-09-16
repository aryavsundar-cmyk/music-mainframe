import { useEffect, useState } from 'react'

/**
 * Live enrichment from the connectors the server runs: news signals per entity, structured SEC filings per entity,
 * and each connector's own status. Everything degrades to empty when a connector is unreachable — the UI says so
 * rather than quietly scoring lower.
 */
export function useEnrichment() {
  const [state, setState] = useState({ signals: {}, news: {}, filings: {}, connectors: [], ready: false })
  useEffect(() => {
    let alive = true
    const get = (url) => fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status))))).catch(() => null)
    Promise.all([get('/api/news?limit=300'), get('/api/filings?limit=300'), get('/api/enrichment/status')]).then(([news, filings, status]) => {
      if (!alive) return
      const signals = {}; const byEntity = {}; const filingsBy = {}
      for (const it of news?.items || []) for (const id of it.entities || []) { signals[id] = (signals[id] || 0) + 1; (byEntity[id] = byEntity[id] || []).push(it) }
      for (const f of filings?.items || []) (filingsBy[f.entityId] = filingsBy[f.entityId] || []).push(f)
      setState({ signals, news: byEntity, filings: filingsBy, connectors: status?.connectors || [], ready: true })
    })
    return () => { alive = false }
  }, [])
  return state
}
