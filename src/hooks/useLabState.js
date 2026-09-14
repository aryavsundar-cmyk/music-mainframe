import { useCallback, useEffect, useState } from 'react'
import { benchmarkState, defaultState, merge, setIn } from '../utils/labState.js'

/** Per-case trainee state in localStorage (per browser). update(path, value) is an immutable deep set. */
export function useLabState(c) {
  const key = `mm-lab-${c.id}-v1`
  const [state, setState] = useState(() => {
    try { const raw = localStorage.getItem(key); if (raw) return merge(defaultState(c), JSON.parse(raw)) } catch { /* storage unavailable */ }
    return defaultState(c)
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(state)) } catch { /* ignore */ } }, [key, state])
  const update = useCallback((path, value) => setState((s) => setIn(s, path, value)), [])
  const reset = useCallback(() => setState((s) => ({ ...defaultState(c), ui: s.ui })), [c])
  const loadBenchmark = useCallback(() => setState((s) => ({ ...benchmarkState(c), ui: s.ui })), [c])
  return { state, update, reset, loadBenchmark }
}

/** Read-only progress for the case library (no hook state). */
export function readLabState(c) {
  try { const raw = localStorage.getItem(`mm-lab-${c.id}-v1`); return raw ? merge(defaultState(c), JSON.parse(raw)) : null } catch { return null }
}
