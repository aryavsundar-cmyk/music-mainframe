import { useSearchParams } from 'react-router-dom'

/** Facet state held in the URL so a filtered view is shareable. `set({ k: v })` with '' deletes the key. */
export function useUrlFilters(keys) {
  const [sp, setSp] = useSearchParams()
  const params = Object.fromEntries(keys.map((k) => [k, sp.get(k) || '']))
  const set = (patch) => { const n = new URLSearchParams(sp); for (const [k, v] of Object.entries(patch)) v ? n.set(k, v) : n.delete(k); setSp(n, { replace: true }) }
  const clear = () => set(Object.fromEntries(keys.map((k) => [k, ''])))
  return { params, set, clear, any: keys.some((k) => params[k]), sp }
}
