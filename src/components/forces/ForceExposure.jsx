import { Link } from 'react-router-dom'
import { ArrowUp, ArrowDown, ExternalLink } from 'lucide-react'
import { formatDate } from '../../utils/format.js'
import { LimitLine } from '../prospecting/LimitNote.jsx'
import { ForceChip } from './ForceChip.jsx'

/**
 * Which of the five forces the record ties this company to. Built only from deals it is a party to and headlines
 * that name it; a passing mention elsewhere in an article is counted underneath, never inside. The same rule as
 * the buyer match: no company is credited with exposure the record does not show.
 */
export function ForceExposure({ exposure, name, loading = false }) {
  const shown = exposure.forces.filter((f) => f.total)
  return (
    <div className="rounded-md border border-line-1 bg-ground-1 p-4">
      <div className="t-eyebrow text-ink-3 mb-1">Five forces exposure</div>
      <p className="t-micro text-ink-3 m-0 mb-3">From deals {name} is a party to and headlines that name it{loading ? ' — still reading the live feed and archive…' : '.'}</p>
      {shown.length ? shown.map((f) => (
        <div key={f.force.id} className="py-2.5 border-t border-line-1">
          <div className="flex items-center justify-between gap-2">
            <ForceChip id={f.force.id} to={`/deals?force=${f.force.id}`} />
            <span className="t-micro text-ink-3 font-mono tabular">{f.direct} primary · {f.adjacent} secondary</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 t-micro text-ink-3">
            <span>{f.party} as a party · {f.subject} named</span>
            <span className="inline-flex items-center gap-0.5 ml-auto" title="supports the thesis"><ArrowUp size={11} aria-hidden="true" />{f.byDirection.supports || 0}</span>
            <span className={`inline-flex items-center gap-0.5 ${f.byDirection.challenges ? 'text-danger' : ''}`} title="challenges the thesis"><ArrowDown size={11} aria-hidden="true" />{f.byDirection.challenges || 0}</span>
          </div>
          <ul className="m-0 mt-1.5 p-0 list-none space-y-1">
            {f.latest.slice(0, 2).map((l) => (
              <li key={l.item.id} className="t-micro text-ink-2 flex gap-2">
                <span className="text-ink-4 font-mono shrink-0">{formatDate(String(l.item.date).slice(0, 10))}</span>
                {l.item.kind === 'deal'
                  ? <Link to={`/deals#${l.item.id}`} className="text-ink-2 no-underline hover:text-accent">{l.item.title}</Link>
                  : <a href={l.item.source_url} target="_blank" rel="noreferrer" className="text-ink-2 no-underline hover:text-accent inline-flex gap-1">{l.item.title}<ExternalLink size={9} className="shrink-0 mt-0.5 text-ink-4" aria-hidden="true" /></a>}
              </li>
            ))}
          </ul>
        </div>
      )) : <p className="t-small text-ink-3 m-0 border-t border-line-1 pt-2.5">Nothing on record ties {name} to a force as a party or a subject.</p>}
      {exposure.mentions > 0 && <p className="t-micro text-ink-4 m-0 mt-2">Also mentioned in passing in {exposure.mentions} feed item{exposure.mentions === 1 ? '' : 's'}. Mentions are not counted as exposure.</p>}
      <div className="mt-3 pt-2 border-t border-line-1"><LimitLine id="force" /></div>
    </div>
  )
}
