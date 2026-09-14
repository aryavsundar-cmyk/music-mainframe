import { useCallback, useEffect, useRef, useState } from 'react'

const WS_URL = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`

/**
 * useNewsStream — REST first (so filters work), WebSocket for pushes.
 * `state`: 'loading' | 'live' | 'polling' (REST ok, WS down) | 'unavailable' (backend unreachable).
 * Distinguishes "backend unreachable" from "no matches" — the operator needs to know which.
 */
export function useNewsStream(params = {}) {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState(null)
  const [state, setState] = useState('loading')
  const [wsUp, setWsUp] = useState(false)
  const key = JSON.stringify(params)
  const wsRef = useRef(null)

  const load = useCallback(async () => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
    try {
      const r = await fetch(`/api/news${qs ? `?${qs}` : ''}`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const j = await r.json()
      setItems(j.items); setTotal(j.total); setStatus(j.status)
      setState((s) => (s === 'unavailable' || s === 'loading' ? 'polling' : s))
    } catch { setState('unavailable') }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  // Deferred so the fetch (and its setState) runs outside the effect body.
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t) }, [load])

  useEffect(() => {
    let timer; let closed = false
    const connect = () => {
      try {
        const ws = new WebSocket(WS_URL); wsRef.current = ws
        ws.onopen = () => { setWsUp(true); setState((s) => (s === 'unavailable' ? 'live' : 'live')) }
        ws.onmessage = (ev) => { try { const m = JSON.parse(ev.data); if (m.type === 'update' || m.type === 'initial') { setStatus(m.status); if (m.type === 'update') load() } } catch { /* ignore */ } }
        ws.onclose = () => { setWsUp(false); setState((s) => (s === 'live' ? 'polling' : s)); if (!closed) timer = setTimeout(connect, 8000) }
        ws.onerror = () => ws.close()
      } catch { timer = setTimeout(connect, 8000) }
    }
    connect()
    const poll = setInterval(load, 5 * 60 * 1000)
    return () => { closed = true; clearTimeout(timer); clearInterval(poll); wsRef.current?.close() }
  }, [load])

  return { items, total, status, state: state === 'polling' && wsUp ? 'live' : state, reload: load }
}
