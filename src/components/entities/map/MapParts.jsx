import { ArrowRight, ExternalLink } from 'lucide-react'
import { format } from '../../../utils/format.js'
import { LENS, cardMetric, money } from './mapStyle.js'
import { initials } from '../../../utils/entityMap.js'

/**
 * One entity. A button: pressing it opens the detail panel without leaving the map. When a selection is active,
 * cards outside its connections dim, so the reader sees who is tied to whom at a glance.
 */
export function MapCard({ e, lens, fin, selected, related, dim, onSelect }) {
  const metric = cardMetric(e, fin)
  const L = LENS[lens]
  return (
    <button type="button" data-entity={e.id} onClick={() => onSelect(e.id)} aria-pressed={selected}
      aria-label={`${e.name}, tier ${e.tier}${metric ? `, ${metric.kind} ${metric.text}` : ''} — show details`}
      className={[
        'w-full text-left rounded-md border p-2.5 flex gap-2.5 items-start cursor-pointer transition-[opacity,background-color,border-color] duration-150',
        selected ? 'border-accent bg-accent-soft' : related ? 'border-secondary-line bg-ground-2' : 'border-line-1 bg-ground-1 hover:bg-ground-2 hover:border-line-2',
        dim ? 'opacity-35 hover:opacity-100' : '',
      ].join(' ')}>
      <span className={`shrink-0 w-8 h-8 rounded-md border grid place-items-center t-micro font-mono font-semibold ${L.avatar}`} aria-hidden="true">{initials(e)}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="t-small text-ink-1 font-medium truncate">{e.name}</span>
          <span className="shrink-0 t-micro font-mono text-ink-3 border border-line-2 rounded-sm px-1 leading-4">T{e.tier}</span>
          {e.ticker && <span className="ml-auto shrink-0 t-micro font-mono text-ink-4 truncate max-w-[4.5rem]" title={e.ticker}>{e.ticker.split('·')[0].split(':').pop().trim()}</span>}
        </span>
        <span className="block t-micro text-ink-3 truncate">{e.subtype}</span>
        {metric && <span className="block t-micro font-mono tabular text-money truncate" title={`${metric.kind} ${metric.text} — ${metric.label}`}>{metric.kind}: {metric.text} <span className="text-ink-4">{metric.label}</span></span>}
      </span>
    </button>
  )
}

/** A column: the stage's header card (with its sourced market figure, or a count), then its groups of cards. */
export function MapColumn({ column, last, children }) {
  const L = LENS[column.lens]
  const mkt = column.market
  return (
    <section aria-label={column.title} className="w-[268px] shrink-0 flex flex-col gap-3">
      <div className="relative rounded-md border border-line-2 bg-ground-1 p-3 pl-4 min-h-[148px] flex flex-col">
        <span className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r ${L.rail}`} aria-hidden="true" />
        <h2 className={`t-body font-semibold m-0 leading-snug ${L.title}`}>{column.title}</h2>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="t-data text-lg text-ink-1 tabular">{mkt ? money(mkt.value, mkt.currency) : column.count}</span>
          <span className="t-micro text-ink-3 truncate" title={mkt?.label}>{mkt ? mkt.label : column.count === 1 ? 'entity' : 'entities'}</span>
        </div>
        <p className="t-micro text-ink-3 m-0 mt-1.5">{column.blurb}</p>
        <div className="t-micro text-ink-4 mt-auto pt-1.5 flex items-center justify-between gap-2">
          <span className="tabular">{mkt ? `${column.count} ${column.count === 1 ? 'entity' : 'entities'}` : 'no sourced market figure'}</span>
          {mkt && (mkt.url
            ? <a href={mkt.url} target="_blank" rel="noreferrer" className="text-ink-4 no-underline hover:text-accent inline-flex items-center gap-0.5 truncate">{mkt.source}<ExternalLink size={9} aria-hidden="true" /></a>
            : <span className="truncate">{mkt.source}</span>)}
        </div>
        {!last && <ArrowRight size={14} className="absolute -right-[19px] top-1/2 -translate-y-1/2 text-ink-4" aria-hidden="true" />}
      </div>
      {children}
    </section>
  )
}

/** A group heading inside a column, with its count. */
export function MapGroup({ label, count, lens, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 pl-0.5">
        <span className={`w-[3px] h-3 rounded-sm ${LENS[lens].rail}`} aria-hidden="true" />
        <span className="t-eyebrow text-ink-3">{label}</span>
        <span className="t-micro font-mono text-ink-4">{count}</span>
      </div>
      {children}
    </div>
  )
}

/** The market strip: sourced headline figures, each linking to where it comes from. */
export function MarketStrip({ items }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-line-1 bg-ground-1 px-4 py-2.5 mb-4">
      <span className="t-eyebrow text-ink-3">Market</span>
      {items.map((m) => (
        <a key={m.label} href={m.url} target="_blank" rel="noreferrer" className="no-underline group inline-flex items-baseline gap-2" title={`Source: ${m.source}`}>
          <span className="t-micro text-ink-3 group-hover:text-ink-1">{m.label}</span>
          <span className="t-small font-mono tabular text-money">{m.count != null ? format.count(m.count) : money(m.value, m.currency)}</span>
          <span className="t-micro font-mono text-ink-3 border border-line-1 rounded-sm px-1">{m.delta}</span>
        </a>
      ))}
    </div>
  )
}
