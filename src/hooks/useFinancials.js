import { useEffect, useState } from 'react'

/** One request per session: reported financials for every SEC filer, refreshed daily upstream. */
let request = null
const load = () => (request ||= fetch('/api/financials')
  .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
  .catch((err) => { request = null; throw err }))

/** { companies, updatedAt, state: loading · ok · unavailable, error } */
export function useFinancials() {
  const [fin, setFin] = useState({ companies: {}, updatedAt: null, state: 'loading', error: null })
  useEffect(() => {
    let alive = true
    load().then((j) => { if (alive) setFin({ companies: j.companies || {}, updatedAt: j.updatedAt, state: 'ok', error: j.error }) })
      .catch((err) => { if (alive) setFin((f) => ({ ...f, state: 'unavailable', error: err.message })) })
    return () => { alive = false }
  }, [])
  return fin
}
