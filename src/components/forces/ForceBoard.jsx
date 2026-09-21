import { ArrowUp, ArrowDown } from 'lucide-react'
import { EXPOSURE_TYPES } from '../../data/forces.js'
import { THIN_EVIDENCE } from '../../utils/forcesDocs.js'

/**
 * The five forces side by side: direct activity, adjacent activity, trailing windows, and which way the evidence
 * points. Pressing a force filters the page to it. A force with too little evidence says so on its card instead
 * of presenting a handful of items as a trend.
 */
export function ForceBoard({ board, selected = [], onToggle }) {
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
      {board.map((b) => {
        const on = selected.includes(b.force.id)
        const lead = Object.entries(b.byExposure).sort((x, y) => y[1] - x[1])[0]
        return (
          <button key={b.force.id} type="button" aria-pressed={on} onClick={() => onToggle(b.force.id)}
            className={`text-left rounded-md border p-3.5 cursor-pointer transition-colors duration-100 flex flex-col gap-2 ${on ? 'border-accent-line bg-accent-soft' : 'border-line-1 bg-ground-1 hover:bg-ground-2 hover:border-line-2'}`}>
            <div className="flex items-start gap-2">
              <span className={`font-mono t-small ${on ? 'text-accent' : 'text-ink-3'}`}>{b.force.number}</span>
              <span className="t-small text-ink-1 font-medium leading-snug">{b.force.short_title}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="t-data text-2xl text-ink-1 tabular">{b.direct}</span>
              <span className="t-micro text-ink-3">direct</span>
              <span className="t-micro text-ink-3 ml-auto">+{b.adjacent} adjacent</span>
            </div>
            <div className="t-micro text-ink-3 font-mono tabular">30d {b.trailing[30]} · 90d {b.trailing[90]} · 365d {b.trailing[365]}</div>
            <div className="flex items-center gap-3 t-micro text-ink-2">
              <span className="inline-flex items-center gap-0.5" title="supports the thesis"><ArrowUp size={11} aria-hidden="true" />{b.byDirection.supports || 0}</span>
              <span className={`inline-flex items-center gap-0.5 ${b.byDirection.challenges ? 'text-danger' : ''}`} title="challenges the thesis"><ArrowDown size={11} aria-hidden="true" />{b.byDirection.challenges || 0}</span>
              <span className="text-ink-4">{b.deals} on record · {b.events} live</span>
            </div>
            {b.total < THIN_EVIDENCE
              ? <div className="t-micro text-ink-3 border-t border-line-1 pt-1.5">Thin evidence — {b.total} item{b.total === 1 ? '' : 's'}. Read as signals, not a trend.</div>
              : lead && <div className="t-micro text-ink-3 border-t border-line-1 pt-1.5">Mostly {EXPOSURE_TYPES[lead[0]].toLowerCase()} ({lead[1]})</div>}
          </button>
        )
      })}
    </div>
  )
}
