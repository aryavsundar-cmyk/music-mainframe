import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Card } from '../primitives/index.js'
import { formatDate } from '../../utils/format.js'

/**
 * What a company page leads with: material forms (weight ≥ 5 in server/filings.js — events, stakes, deals,
 * offerings) and the periodic reports themselves, which weigh little as prospecting triggers but are where the
 * numbers are. Insider forms (3, 4, 144), registrations of employee plans and the like are routine.
 */
const MATERIAL = 5
const PERIODIC = /^(10-K|10-Q|20-F|40-F)/
const leads = (f) => f.weight >= MATERIAL || PERIODIC.test(f.form)
const SHOW = 8

/**
 * The company's own SEC filings, straight from EDGAR's submissions index (server/filings.js, refreshed every six
 * hours). Material filings first; routine insider and registration forms are one click away, never hidden
 * silently. Renders nothing for companies that do not file with the SEC.
 */
export function SecFilings({ entityId }) {
  const [data, setData] = useState({ state: 'loading', items: [], status: null })
  const [all, setAll] = useState(false)
  const [n, setN] = useState(SHOW)
  useEffect(() => {
    let alive = true
    fetch(`/api/filings?entity=${encodeURIComponent(entityId)}&limit=200`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j) => { if (alive) setData({ state: 'ok', items: j.items || [], status: j.status || null }) })
      .catch(() => { if (alive) setData({ state: 'unavailable', items: [], status: null }) })
    return () => { alive = false }
  }, [entityId])
  if (data.state === 'ok' && data.items.length === 0) return null
  if (data.state === 'loading') return null
  const material = data.items.filter(leads)
  const list = all ? data.items : material
  return (
    <Card pad="md">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <div className="t-eyebrow text-ink-3">SEC filings</div>
        {data.state === 'ok' && (
          <button type="button" onClick={() => { setAll((v) => !v); setN(SHOW) }} className="t-micro text-accent bg-transparent border-0 p-0 cursor-pointer hover:underline">
            {all ? `Reports and material only (${material.length})` : `Include routine (${data.items.length - material.length})`}
          </button>
        )}
      </div>
      {data.state === 'unavailable'
        ? <p className="t-small text-ink-4 m-0">Filings service unreachable — start the server or check the deploy.</p>
        : (
          <>
            <p className="t-micro text-ink-3 m-0 mb-2">Straight from EDGAR, refreshed every six hours{data.status?.lastSuccess ? ` · last read ${formatDate(String(data.status.lastSuccess).slice(0, 10))}` : ''}.</p>
            {list.length === 0 && <p className="t-small text-ink-4 m-0">No reports or material filings in the current window.</p>}
            <ul className="m-0 p-0 list-none">
              {list.slice(0, n).map((f) => (
                <li key={f.id} className="grid grid-cols-[5.5rem_6.5rem_1fr] gap-2 items-baseline py-1.5 border-t border-line-1">
                  <span className="t-micro font-mono text-ink-4">{formatDate(f.filed)}</span>
                  <span className={`t-micro font-mono ${leads(f) ? 'text-ink-1' : 'text-ink-3'}`}>{f.form}</span>
                  <a href={f.url} target="_blank" rel="noreferrer" className="t-micro text-ink-2 no-underline hover:text-accent inline-flex items-start gap-1 min-w-0">
                    <span className="min-w-0">{f.formLabel && f.formLabel !== f.form ? f.formLabel : f.note}{f.period && f.period !== f.filed ? ` · period ${formatDate(f.period)}` : ''}</span>
                    <ExternalLink size={9} className="shrink-0 mt-0.5 text-ink-4" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
            {list.length > n && <button type="button" onClick={() => setN((v) => v + SHOW * 2)} className="mt-2 t-micro text-accent bg-transparent border-0 cursor-pointer p-0">Show more ({list.length - n} left)</button>}
          </>
        )}
    </Card>
  )
}
