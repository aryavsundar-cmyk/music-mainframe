import { useState } from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { formatDate } from '../../utils/format.js'
import { ForceChips, Direction } from './ForceChip.jsx'
import { WhyThisMatters } from './WhyThisMatters.jsx'

function EventRow({ x }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-line-1">
      <div className="grid grid-cols-[92px_minmax(0,1fr)_auto] gap-4 items-start py-3">
        <div className="t-data text-ink-3 pt-0.5">{formatDate(String(x.date).slice(0, 10))}</div>
        <div className="min-w-0">
          <a href={x.source_url} target="_blank" rel="noreferrer" className="t-body text-ink-1 no-underline hover:text-accent inline-flex gap-1.5">{x.title}<ExternalLink size={11} className="shrink-0 mt-1.5 text-ink-4" aria-hidden="true" /></a>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="t-micro text-ink-3">{x.source_label}</span>
            <ForceChips tag={x} />
          </div>
        </div>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-2 bg-transparent border-0 cursor-pointer p-0 pt-0.5">
          <Direction d={x.force_impact_direction} />
          <ChevronDown size={14} className={`text-ink-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </div>
      {open && <div className="pb-4 pl-[108px] pr-2"><WhyThisMatters tag={x} /></div>}
    </div>
  )
}

/** Market events from the live feed that match the force filters. Deals on record are listed separately above. */
export function EventList({ items, empty }) {
  if (!items.length) return <div className="py-8 text-center t-body text-ink-3">{empty}</div>
  return <div className="border-t border-line-1">{items.map((x) => <EventRow key={x.id} x={x} />)}</div>
}
