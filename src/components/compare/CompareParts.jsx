import { Link } from 'react-router-dom'
import { X, Search, Plus } from 'lucide-react'
import { formatDate } from '../../utils/format.js'
import { FreshnessTag } from '../entities/Financials.jsx'
import { ENTITY_TYPES } from '../../data/entities/_schema.js'

/** The column head: who this is, how fresh their figures are, and a way to the full profile. */
export function CompanyHead({ c, onRemove }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="flex items-start gap-1.5">
        <Link to={`/entities/${c.id}`} className="t-body font-semibold text-ink-1 no-underline hover:text-accent leading-tight">{c.e.name}</Link>
        {onRemove && (
          <button type="button" onClick={() => onRemove(c.id)} aria-label={`Remove ${c.e.name} from the comparison`}
            className="ml-auto shrink-0 w-5 h-5 grid place-items-center rounded-sm border-0 bg-transparent text-ink-4 cursor-pointer hover:text-ink-1 hover:bg-ground-3"><X size={12} aria-hidden="true" /></button>
        )}
      </div>
      <div className="t-micro text-ink-3">{ENTITY_TYPES[c.e.type]?.label}{c.e.ticker ? ` · ${c.e.ticker.split('·')[0].trim()}` : ''}</div>
      <div><FreshnessTag f={c.freshness} /></div>
    </div>
  )
}

/**
 * Revenue rebased to 100 at the start of a window every company shares — one small chart per company on one
 * scale, rather than six lines in six colours. Each shows where it ends.
 */
export function IndexSpark({ series, years, domain }) {
  const w = 96
  const h = 30
  const values = series.points.map((p) => p.value)
  const last = values.at(-1)
  const [lo, hi] = domain
  const x = (i) => (i / Math.max(1, values.length - 1)) * (w - 2) + 1
  const y = (v) => h - 2 - ((v - lo) / Math.max(1, hi - lo)) * (h - 4)
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  return (
    <div className="flex items-center gap-2">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img"
        aria-label={`Revenue indexed to 100 at ${formatDate(series.points[0].end)}, reaching ${Math.round(last)} at ${formatDate(series.points.at(-1).end)}`}>
        <line x1="1" x2={w - 1} y1={y(100)} y2={y(100)} stroke="var(--mm-line-2)" strokeWidth="1" strokeDasharray="2 2" />
        <path d={d} fill="none" stroke="var(--mm-accent)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(values.length - 1)} cy={y(last)} r="2.5" fill="var(--mm-accent)" />
      </svg>
      <span className="t-small font-mono tabular text-ink-1">{Math.round(last)}</span>
      <span className="t-micro text-ink-4">over {years} yrs</span>
    </div>
  )
}

/** Search-and-add. Suggestions are entities on the canvas; nothing is invented and nothing already picked repeats. */
export function Picker({ q, onQ, results, onAdd, full }) {
  return (
    <div className="relative">
      <label className="relative block">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-4" aria-hidden="true" />
        <input type="search" value={q} onChange={(ev) => onQ(ev.target.value)} disabled={full}
          placeholder={full ? 'Six companies is the limit — remove one to add another' : 'Add a company: name, ticker, city…'}
          aria-label="Add a company to the comparison"
          className="w-full h-9 pl-8 pr-2 bg-ground-1 border border-line-2 rounded-md t-small text-ink-1 placeholder:text-ink-4 outline-none focus:border-accent disabled:opacity-60" />
      </label>
      {results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full max-h-72 overflow-y-auto m-0 p-1 list-none bg-ground-1 border border-line-2 rounded-md shadow-2xl">
          {results.map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => onAdd(e.id)}
                className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-sm bg-transparent border-0 cursor-pointer text-ink-2 hover:bg-ground-3 hover:text-ink-1">
                <Plus size={12} className="shrink-0 text-ink-4" aria-hidden="true" />
                <span className="t-small truncate">{e.name}</span>
                <span className="t-micro text-ink-4 ml-auto shrink-0">{ENTITY_TYPES[e.type]?.label}{e.ticker ? ` · ${e.ticker.split('·')[0].trim()}` : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
