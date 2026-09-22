import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Search, X, ArrowDown, ArrowUp, Table2 } from 'lucide-react'
import { PageHeader } from '../components/primitives/index.js'
import { ENTITIES, OWNERSHIP, AS_OF } from '../data/entities.js'
import { COLUMNS, DIRECTIONS, MARKET_STRIP, buildMap, filterEntitiesForMap, connectionsOf, columnOf } from '../utils/entityMap.js'
import { useUrlFilters } from '../hooks/useUrlFilters.js'
import { useFinancials } from '../hooks/useFinancials.js'
import { MapColumn, MapGroup, MapCard, MarketStrip } from '../components/entities/map/MapParts.jsx'
import { LENS, cardMetric } from '../components/entities/map/mapStyle.js'
import { MapDrawer } from '../components/entities/map/MapDrawer.jsx'
import { PageExport } from '../components/export/PageExport.jsx'
import { buildPageDoc, describeFilters } from '../utils/pageDocs.js'

const chip = (a) => ['inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 t-small cursor-pointer select-none transition-colors duration-100 whitespace-nowrap',
  a ? 'bg-ground-4 border-line-3 text-ink-1' : 'bg-transparent border-line-1 text-ink-2 hover:bg-ground-2 hover:text-ink-1'].join(' ')
const seg = (on) => `inline-flex items-center gap-1.5 px-2.5 py-1 t-small border-0 cursor-pointer transition-colors duration-100 ${on ? 'bg-ground-4 text-ink-1' : 'bg-transparent text-ink-2 hover:text-ink-1 hover:bg-ground-2'}`
const list = (v) => String(v || '').split(',').filter(Boolean)
const toggleIn = (v, x) => { const s = new Set(list(v)); if (s.has(x)) s.delete(x); else s.add(x); return [...s].join(',') }
const OWNERSHIP_ORDER = ['public', 'pe-backed', 'private', 'subsidiary', 'member-owned', 'nonprofit', 'state']
const LEGEND = [['money', 'Capital'], ['recording', 'Recording'], ['publishing', 'Publishing & collection'], ['structure', 'Platforms, live & tech']]

/**
 * Entity map — the canvas as an ecosystem: every entity placed in the value chain, from the capital that owns the
 * rights down to the platforms and promoters where fans pay (or, flipped, following the money back up).
 *
 * A card opens a detail panel beside the map; ✕ or Esc closes it and returns focus to the card. Selecting an
 * entity highlights everyone connected to it on the record — parent, children, backers, deal counterparties — so
 * the map answers "who is tied to whom" without leaving it. Filters, direction and selection live in the URL.
 */
export default function EntityMap() {
  const { params, set } = useUrlFilters(['q', 'col', 'tier', 'own', 'dir', 'e', 'hl'])
  const financials = useFinancials()
  const direction = params.dir === 'up' ? 'up' : 'down'
  const filtered = useMemo(() => filterEntitiesForMap(ENTITIES, { q: params.q, columns: list(params.col), tiers: list(params.tier), ownership: list(params.own) }), [params.q, params.col, params.tier, params.own])
  const map = useMemo(() => buildMap(filtered, { direction }), [filtered, direction])
  const selected = params.e && ENTITIES.some((x) => x.id === params.e) ? params.e : ''
  const related = useMemo(() => new Set(selected ? connectionsOf(selected).map((l) => l.entity.id) : []), [selected])
  const highlight = params.hl !== '0'
  const opener = useRef('')
  const returnTo = useRef('')
  const filtersOn = params.q || params.col || params.tier || params.own

  const select = (id) => { if (!opener.current) opener.current = selected || id; set({ e: id }) }
  const close = () => {
    const back = opener.current || selected
    opener.current = ''
    returnTo.current = back
    set({ e: '' })
  }
  // The URL update renders asynchronously, so focus goes back once the panel has actually gone.
  useEffect(() => {
    if (selected || !returnTo.current) return
    const card = document.querySelector(`[data-entity="${returnTo.current}"]`)
    returnTo.current = ''
    card?.focus()
  }, [selected])
  useEffect(() => {
    if (!selected) return undefined
    const onKey = (ev) => { if (ev.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const build = () => buildPageDoc({
    slug: 'entity-map',
    title: 'Entity map',
    eyebrow: 'Canvas · the music ecosystem',
    lede: 'Every entity on the canvas placed in the value chain, from capital to fans.',
    filters: describeFilters({ q: params.q, col: params.col, tier: params.tier, own: params.own }, {
        q: { label: 'Search' },
        col: { label: 'Stages', format: (v) => list(v).map((id) => COLUMNS.find((c) => c.id === id)?.title || id).join(', ') },
        tier: { label: 'Tiers', format: (v) => list(v).map((t) => `T${t}`).join(', ') },
        own: { label: 'Ownership', format: (v) => list(v).map((o) => OWNERSHIP[o] || o).join(', ') },
      }),
    sort: `${DIRECTIONS[direction].label} — ${DIRECTIONS[direction].flow}; within a stage by group, tier and name`,
    stats: map.map((c) => ({ label: c.title, value: String(c.count) })),
    columns: ['Stage', 'Group', 'Entity', 'Tier', 'Ownership', 'HQ', 'Headline figure'],
    rows: map.flatMap((c) => c.groups.flatMap((g) => g.items.map((e) => { const m = cardMetric(e, financials.companies[e.id]); return [c.title, g.label, e.name, `T${e.tier}`, OWNERSHIP[e.ownership] || e.ownership, e.hq || '', m ? `${m.text} ${m.label}` : ''] }))),
    total: ENTITIES.length,
    asOf: AS_OF,
    notes: map.filter((c) => c.market).map((c) => `${c.title}: ${c.market.label} — ${c.market.source}.`),
  })

  return (
    <>
      <PageHeader eyebrow="Canvas · the music ecosystem" title="Entity map"
        lede="Every company on the canvas, placed in the value chain — from the capital that owns the rights to the platforms and promoters where fans pay. Select any company for its detail and connections; close it to come back to the whole map."
        actions={<Link to="/entities" className="inline-flex items-center gap-1.5 t-small text-ink-2 no-underline hover:text-ink-1"><Table2 size={14} aria-hidden="true" />Table view</Link>} />

      <MarketStrip items={MARKET_STRIP} />

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <label className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-4" aria-hidden="true" />
          <input type="search" value={params.q} onChange={(ev) => set({ q: ev.target.value })} placeholder="Search companies, tickers, segments, cities" aria-label="Search the map"
            className="w-full h-9 pl-8 pr-2 bg-ground-1 border border-line-2 rounded-md t-small text-ink-1 placeholder:text-ink-4 outline-none focus:border-accent" />
        </label>
        <div role="group" aria-label="Flow direction" className="inline-flex rounded-md border border-line-2 overflow-hidden">
          <button type="button" aria-pressed={direction === 'down'} className={seg(direction === 'down')} onClick={() => set({ dir: '' })}><ArrowDown size={13} aria-hidden="true" />{DIRECTIONS.down.label}</button>
          <button type="button" aria-pressed={direction === 'up'} className={seg(direction === 'up')} onClick={() => set({ dir: 'up' })}><ArrowUp size={13} aria-hidden="true" />{DIRECTIONS.up.label}</button>
        </div>
        <span className="t-small text-ink-3 tabular ml-auto">{filtered.length} / {ENTITIES.length} entities</span>
        {filtersOn && <button type="button" onClick={() => set({ q: '', col: '', tier: '', own: '' })} className="inline-flex items-center gap-1 t-small text-ink-3 bg-transparent border-0 cursor-pointer hover:text-ink-1"><X size={13} aria-hidden="true" />Clear filters</button>}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <button type="button" aria-pressed={!params.col} className={chip(!params.col)} onClick={() => set({ col: '' })}>All stages</button>
        {COLUMNS.map((c) => <button key={c.id} type="button" aria-pressed={list(params.col).includes(c.id)} className={chip(list(params.col).includes(c.id))} onClick={() => set({ col: toggleIn(params.col, c.id) })}>{c.title}</button>)}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <span className="t-micro text-ink-4 mr-1">Tier</span>
        {['1', '2', '3'].map((t) => <button key={t} type="button" aria-pressed={list(params.tier).includes(t)} className={chip(list(params.tier).includes(t))} onClick={() => set({ tier: toggleIn(params.tier, t) })}>T{t}</button>)}
        <span className="t-micro text-ink-4 ml-3 mr-1">Ownership</span>
        {OWNERSHIP_ORDER.map((o) => <button key={o} type="button" aria-pressed={list(params.own).includes(o)} className={chip(list(params.own).includes(o))} onClick={() => set({ own: toggleIn(params.own, o) })}>{OWNERSHIP[o] || o}</button>)}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-1 pt-2 mb-3">
        <div className="t-micro text-ink-3"><span className="t-eyebrow text-accent mr-2">{DIRECTIONS[direction].label}</span>{DIRECTIONS[direction].flow}</div>
        <div className="flex flex-wrap items-center gap-3">
          {LEGEND.map(([lens, label]) => <span key={lens} className="inline-flex items-center gap-1.5 t-micro text-ink-3"><span className={`w-2 h-2 rounded-full ${LENS[lens].rail}`} aria-hidden="true" />{label}</span>)}
          {selected && <span className="t-micro text-ink-2">· {related.size ? `${related.size} connected to the selection${highlight ? ' (others dimmed)' : ''}` : 'no connections on record for the selection'}</span>}
        </div>
      </div>

      <div className="overflow-x-auto pb-4 -mx-1 px-1" role="region" aria-label="Entity map — scroll sideways for more stages" tabIndex={0}>
        <div className="flex gap-6 items-start w-max">
          {map.map((c, i) => (
            <MapColumn key={c.id} column={c} last={i === map.length - 1}>
              {c.groups.length === 0 && <p className="t-micro text-ink-4 m-0 px-1">No entities here match the filters.</p>}
              {c.groups.map((g) => (
                <MapGroup key={g.id} label={g.label} count={g.items.length} lens={c.lens}>
                  {g.items.map((e) => (
                    <MapCard key={e.id} e={e} lens={COLUMNS.find((x) => x.id === columnOf(e)).lens} fin={financials.companies[e.id]}
                      selected={e.id === selected} related={related.has(e.id)}
                      dim={!!selected && highlight && related.size > 0 && e.id !== selected && !related.has(e.id)} onSelect={select} />
                  ))}
                </MapGroup>
              ))}
            </MapColumn>
          ))}
        </div>
      </div>

      <PageExport build={build} label="Export this map — stages, filters and figures included" />

      {selected && <MapDrawer id={selected} fin={financials.companies[selected]} onClose={close} onSelect={select} highlight={highlight} onToggleHighlight={() => set({ hl: highlight ? '0' : '' })} />}
    </>
  )
}
