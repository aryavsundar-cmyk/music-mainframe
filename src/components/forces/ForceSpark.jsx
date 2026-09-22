import { formatDate } from '../../utils/format.js'

/**
 * Twelve weeks of activity for one force, as a sparkline: recessive bars, the current week in the accent.
 * Weeks before the evidence archive began are drawn as texture, not as short bars — their count holds deals
 * but not the events nobody was recording yet, and a short bar would read as a quiet week.
 * Each force keeps its own scale (capital would flatten the other four); the peak is labelled so the height
 * is never mistaken for a comparison across cards.
 */
export function ForceSpark({ series, height = 28, label }) {
  // The scale is floored at 1 so an empty series still draws; the LABEL shows the real peak, which may be 0.
  const top = Math.max(0, ...series.map((w) => w.count))
  const peak = Math.max(1, top)
  // A bucket with its own label (a day, a week, a month) names itself; a Five Forces week also splits deals from events.
  const tip = (w) => (w.label
    ? `${w.label}: ${w.count} event${w.count === 1 ? '' : 's'}${w.covered ? '' : ' — before the archive began, so only what the live feed still holds'}`
    : `Week of ${formatDate(w.start)}: ${w.count} (${w.deals} deal${w.deals === 1 ? '' : 's'}, ${w.events} event${w.events === 1 ? '' : 's'})${w.covered ? '' : ' — before the archive began, so events are missing'}`)
  return (
    <div className="flex items-end gap-2" role="img" aria-label={`${label}: activity over ${series.length} ${series[0]?.label ? 'periods' : 'weeks'}, peak ${top}`}>
      <div className="flex items-end gap-[2px] flex-1" style={{ height }}>
        {series.map((w) => {
          const h = w.count ? Math.max(2, Math.round((w.count / peak) * height)) : 1
          // An uncovered week keeps its known bar (the deals) over a hatched band that marks it incomplete.
          const band = w.covered ? undefined : { backgroundImage: 'repeating-linear-gradient(135deg, color-mix(in srgb, var(--mm-ink-4) 45%, transparent) 0 1px, transparent 1px 4px)' }
          return (
            <span key={w.start} title={tip(w)} className="flex-1 flex items-end h-full cursor-default rounded-t-[2px]" style={band}>
              {/* An incomplete bar is drawn faded as well: a tall bar would otherwise hide the hatching behind it. */}
              <span className={`block w-full rounded-t-[2px] ${w.current ? 'bg-accent' : 'bg-ink-4'}`} style={{ height: h, opacity: w.covered ? 1 : 0.45 }} />
            </span>
          )
        })}
      </div>
      <span className="t-micro text-ink-4 font-mono tabular leading-none" title="The busiest bucket, on this card's own scale">{top}</span>
    </div>
  )
}
