import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { X, ArrowRight } from 'lucide-react'
import { getEntity, OWNERSHIP, TIERS } from '../../../data/entities.js'
import { ENTITY_TYPES } from '../../../data/entities/_schema.js'
import { TRANSACTIONS } from '../../../data/transactions.js'
import { format, currencySymbol, formatDate } from '../../../utils/format.js'
import { currentRevenue, freshnessOf } from '../../../utils/freshness.js'
import { initials, connectionsOf, dealsOf, columnOf, COLUMNS } from '../../../utils/entityMap.js'
import { classifyDeal, entityExposure } from '../../../utils/forces.js'
import { FreshnessTag } from '../Financials.jsx'
import { ForceChip } from '../../forces/ForceChip.jsx'
import { LENS } from './mapStyle.js'

const REASON = { ownership: 'Ownership', backer: 'Backing', deal: 'Deal counterparties' }

/**
 * The detail for one entity, beside the map rather than instead of it. Everything here is a summary with a
 * way further: connections select other entities on the map, and "Full profile" opens the entity page. ✕ or Esc
 * closes it and returns focus to the card that opened it.
 */
export function MapDrawer({ id, fin, onClose, onSelect, highlight, onToggleHighlight }) {
  const e = getEntity(id)
  const heading = useRef(null)
  useEffect(() => { heading.current?.focus() }, [id])
  const links = useMemo(() => connectionsOf(id), [id])
  const deals = useMemo(() => dealsOf(id).slice(0, 4), [id])
  const forces = useMemo(() => entityExposure(TRANSACTIONS.map(classifyDeal), id).forces.filter((f) => f.total), [id])
  if (!e) return null
  const col = COLUMNS.find((c) => c.id === columnOf(e))
  const L = LENS[col?.lens || 'structure']
  const rev = currentRevenue(e, fin)
  const fresh = freshnessOf(e, fin)
  const parent = e.parentId ? getEntity(e.parentId) : null
  const byReason = Object.keys(REASON).map((r) => ({ r, items: links.filter((l) => l.reasons.includes(r)) })).filter((g) => g.items.length)

  return (
    <aside aria-labelledby="map-drawer-title" className="fixed right-0 top-0 bottom-0 z-40 w-full sm:w-[420px] bg-ground-1 border-l border-line-2 shadow-2xl flex flex-col motion-safe:animate-[mm-slide-in_160ms_ease-out]">
      <div className="flex items-start gap-3 p-4 border-b border-line-1">
        <span className={`shrink-0 w-10 h-10 rounded-md border grid place-items-center t-small font-mono font-semibold ${L.avatar}`} aria-hidden="true">{initials(e)}</span>
        <div className="min-w-0 flex-1">
          <div className="t-eyebrow text-ink-3">{col?.title} · {ENTITY_TYPES[e.type]?.label}</div>
          <h2 id="map-drawer-title" ref={heading} tabIndex={-1} className="t-h3 text-ink-1 m-0 leading-tight outline-none">{e.name}</h2>
          <div className="t-micro text-ink-3 mt-0.5">{TIERS[e.tier]} · {OWNERSHIP[e.ownership] || e.ownership}{e.ticker ? ` · ${e.ticker}` : ''}</div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close details and return to the map" title="Close (Esc)"
          className="shrink-0 w-8 h-8 grid place-items-center rounded-md border border-line-2 bg-transparent text-ink-2 cursor-pointer hover:bg-ground-3 hover:text-ink-1">
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
        {e.summary && <p className="t-small text-ink-2 m-0">{e.summary}</p>}

        {rev && (
          <div className="rounded-md border border-line-1 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="t-micro text-ink-3">{rev.label}</span>
              <FreshnessTag f={fresh} />
            </div>
            <div className="t-data text-2xl text-money tabular mt-0.5">{format.money(rev.value, { currency: currencySymbol(rev.currency) })}</div>
            <div className="t-micro text-ink-4">{rev.source === 'sec' ? `${rev.form} filed ${formatDate(rev.filed)} · SEC, refreshed daily` : rev.published ? `published ${formatDate(rev.published)}` : 'on record'}</div>
          </div>
        )}

        <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1 m-0">
          {e.hq && <><dt className="t-micro text-ink-4">Headquarters</dt><dd className="t-small text-ink-2 m-0">{e.hq}</dd></>}
          {e.founded && <><dt className="t-micro text-ink-4">Founded</dt><dd className="t-small text-ink-2 m-0 font-mono">{e.founded}</dd></>}
          {parent && <><dt className="t-micro text-ink-4">Parent</dt><dd className="m-0"><button type="button" onClick={() => onSelect(parent.id)} className="t-small text-secondary bg-transparent border-0 p-0 cursor-pointer hover:underline">{parent.name}</button></dd></>}
          {e.region && <><dt className="t-micro text-ink-4">Region</dt><dd className="t-small text-ink-2 m-0">{e.region}</dd></>}
        </dl>

        {byReason.length > 0 && (
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="t-eyebrow text-ink-3">Connected on the map · {links.length}</span>
              <label className="t-micro text-ink-3 inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={highlight} onChange={onToggleHighlight} className="accent-[var(--mm-accent)]" />
                Highlight on map
              </label>
            </div>
            {byReason.map(({ r, items }) => (
              <div key={r} className="mb-2">
                <div className="t-micro text-ink-4 mb-1">{REASON[r]}</div>
                <div className="flex flex-wrap gap-1">
                  {items.map(({ entity }) => (
                    <button key={entity.id} type="button" onClick={() => onSelect(entity.id)}
                      className="t-micro rounded-sm border border-line-2 bg-transparent text-ink-2 px-1.5 py-0.5 cursor-pointer hover:bg-ground-3 hover:text-ink-1">{entity.short && entity.short.length < 14 ? entity.short : entity.name}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {byReason.length === 0 && (
          <p className="t-micro text-ink-4 m-0">No connections on record: no parent or subsidiary on the canvas, no backers, and no deal with another company on the map. That is what the record shows, not a claim that none exist.</p>
        )}

        {deals.length > 0 && (
          <div>
            <div className="t-eyebrow text-ink-3 mb-1.5">Deals on record</div>
            <ul className="m-0 p-0 list-none space-y-1.5">
              {deals.map((t) => (
                <li key={t.id} className="grid grid-cols-[4.5rem_1fr_auto] gap-2 items-baseline">
                  <span className="t-micro font-mono text-ink-4">{formatDate(String(t.date).slice(0, 10))}</span>
                  <Link to={`/deals#${t.id}`} className="t-micro text-ink-2 no-underline hover:text-accent">{t.title}</Link>
                  <span className="t-micro font-mono text-money">{t.value ? format.money(t.value) : ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {forces.length > 0 && (
          <div>
            <div className="t-eyebrow text-ink-3 mb-1.5">Five forces · from deals on record</div>
            <div className="flex flex-wrap gap-1">{forces.map((f) => <ForceChip key={f.force.id} id={f.force.id} role={f.direct ? 'primary' : 'secondary'} to={`/deals?force=${f.force.id}`} />)}</div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-line-1 flex items-center justify-between gap-2">
        <button type="button" onClick={onClose} className="t-small text-ink-2 bg-transparent border-0 cursor-pointer p-0 hover:text-ink-1">Back to the map</button>
        <Link to={`/entities/${e.id}`} className="inline-flex items-center gap-1.5 rounded-md bg-accent text-accent-ink px-3 py-1.5 t-small font-medium no-underline hover:bg-accent-hover">Full profile <ArrowRight size={14} aria-hidden="true" /></Link>
      </div>
    </aside>
  )
}
