import { useState } from 'react'
import { X } from 'lucide-react'
import { FORCES, FORCE_BY_ID, DIRECTIONS, EXPOSURE_TYPES } from '../../data/forces.js'
import { PERIODS, PERIOD_IDS, periodActivity, inPeriod, filterTagged } from '../../utils/forces.js'
import { useUrlFilters } from '../../hooks/useUrlFilters.js'
import { formatDate } from '../../utils/format.js'
import { buildPageDoc, describeFilters } from '../../utils/pageDocs.js'
import { ExportBar } from '../export/ExportBar.jsx'
import { ForceSpark } from './ForceSpark.jsx'
import { EventList } from './EventList.jsx'

const seg = (on) => `px-2.5 py-1 t-small border-0 cursor-pointer transition-colors duration-100 ${on ? 'bg-ground-4 text-ink-1' : 'bg-transparent text-ink-2 hover:text-ink-1 hover:bg-ground-2'}`
const chip = (a) => ['inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 t-small cursor-pointer select-none transition-colors duration-100',
  a ? 'bg-ground-4 border-line-3 text-ink-1' : 'bg-transparent border-line-1 text-ink-2 hover:bg-ground-2 hover:text-ink-1'].join(' ')
const list = (v) => String(v || '').split(',').filter(Boolean)
const toggleIn = (v, x) => { const s = new Set(list(v)); if (s.has(x)) s.delete(x); else s.add(x); return [...s].join(',') }
const LIST_STEP = 15

/** "+4 on the previous week", or why there is no comparison yet. */
function Delta({ a, noun }) {
  if (a.previous == null) return <span className="t-micro text-ink-4">no earlier {noun} archived yet</span>
  const d = a.total - a.previous
  return <span className="t-micro text-ink-3 tabular">{d > 0 ? '+' : ''}{d} on the previous {noun}</span>
}

/**
 * The five forces as a way to read the news: pick a period, pick the forces, and see what the feed and the
 * evidence archive hold for them — as counts, as a trend, and as the events themselves. The search and filters
 * further down the page narrow this view too, because the server applies the same filter to the archive and
 * to the live feed.
 *
 * Every count is honest about coverage. A period reaching back before the archive began shows "≥" (a floor),
 * its early buckets are hatched, and no comparison with a previous period is offered until that period was
 * recorded in full.
 */
export function NewsForces({ tagged, coverageSince, archive, today, pageFilters, pageFilterLabels }) {
  const { params, set } = useUrlFilters(['fperiod', 'fforce', 'freach', 'fdir'])
  const period = PERIODS[params.fperiod] ? params.fperiod : 'week'
  const p = PERIODS[period]
  const picked = list(params.fforce)
  const reach = params.freach === 'direct' ? 'direct' : 'any'
  const [shown, setShown] = useState(LIST_STEP)

  // Direction narrows everything in the view; force selection narrows the list, not the cards — pressing one
  // force must not make the other four read zero.
  const pool = filterTagged(tagged, { direction: params.fdir })
  const cards = FORCES.map((f) => ({ f, a: periodActivity(pool, { period, forceId: f.id, reach, today, coverageSince }) }))
  const events = inPeriod(filterTagged(pool, { force: params.fforce, reach }), { period, today })
  const overall = periodActivity(filterTagged(pool, { force: params.fforce, reach }), { period, today, coverageSince })
  const floor = !overall.complete
  const any = picked.length || params.fdir || params.freach
  const narrowedBy = describeFilters(pageFilters, pageFilterLabels)

  const viewFilters = [
    { label: 'Period', value: `${p.span} (from ${formatDate(overall.from)})` },
    ...(picked.length ? [{ label: 'Forces', value: picked.map((id) => FORCE_BY_ID[id].short_title).join(' or ') }] : []),
    ...(reach === 'direct' ? [{ label: 'Reach', value: 'Direct only' }] : []),
    ...(params.fdir ? [{ label: 'Direction', value: list(params.fdir).map((d) => DIRECTIONS[d]).join(' or ') }] : []),
    ...narrowedBy,
  ]
  const build = () => buildPageDoc({
    slug: `news-forces-${period}`,
    title: 'Five forces in the news',
    eyebrow: 'Live · the forces behind the headlines',
    lede: 'Market events from the live feed and the evidence archive, read against the five forces over the chosen period.',
    filters: viewFilters,
    sort: 'Most recent first',
    stats: cards.map(({ f, a }) => ({ label: `${f.number} ${f.short_title}`, value: `${a.complete ? '' : '≥'}${a.total}` })),
    columns: ['Date', 'Source', 'Headline', 'Primary force', 'Secondary forces', 'Direction', 'Confidence', 'Exposure', 'Link'],
    rows: events.map((x) => [String(x.date).slice(0, 10), x.source_label, x.title, FORCE_BY_ID[x.primary_force_id].short_title, x.secondary_force_ids.map((id) => FORCE_BY_ID[id].short_title).join(' · '), DIRECTIONS[x.force_impact_direction], x.force_confidence, EXPOSURE_TYPES[x.exposure_type], x.source_url]),
    extra: [{ eyebrow: 'Trend', title: `By ${p.bucket} across the ${p.noun}`, blocks: [
      { kind: 'table', columns: [p.bucket === 'day' ? 'Day' : p.bucket === 'week' ? 'Week' : 'Month', ...FORCES.map((f) => `${f.number} ${f.short_title}`), 'Archived'],
        rows: cards[0].a.series.map((w, i) => [w.label, ...cards.map(({ a }) => String(a.series[i].count)), w.covered ? 'yes' : 'no — live feed only']) },
    ] }],
    notes: [
      floor && coverageSince ? `The evidence archive began on ${coverageSince}. Buckets before that hold only what the live feed still carried, so totals marked ≥ are floors.` : '',
      !coverageSince ? 'The evidence archive was unavailable, so these counts come from the live feed alone and are floors.' : '',
    ].filter(Boolean),
    limits: ['force'],
  })

  return (
    <section className="mb-8 rounded-md border border-line-1 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="max-w-2xl">
          <div className="t-eyebrow text-accent">Five forces in the news</div>
          <p className="t-small text-ink-2 m-0 mt-1">Pick a period and the forces you care about to isolate their events and see how they are trending. Everything below the view — search, entity, topic, source — narrows it too.</p>
        </div>
        <div role="group" aria-label="Period" className="inline-flex rounded-md border border-line-2 overflow-hidden">
          {PERIOD_IDS.map((id) => <button key={id} type="button" aria-pressed={period === id} className={seg(period === id)} onClick={() => { set({ fperiod: id === 'week' ? '' : id }); setShown(LIST_STEP) }}>{PERIODS[id].label}</button>)}
        </div>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 mb-3">
        {cards.map(({ f, a }) => {
          const on = picked.includes(f.id)
          return (
            <button key={f.id} type="button" aria-pressed={on} onClick={() => { set({ fforce: toggleIn(params.fforce, f.id) }); setShown(LIST_STEP) }}
              className={`text-left rounded-md border p-3 cursor-pointer transition-colors duration-100 flex flex-col gap-2 ${on ? 'border-accent-line bg-accent-soft' : 'border-line-1 bg-ground-1 hover:bg-ground-2 hover:border-line-2'}`}>
              <div className="flex items-start gap-2">
                <span className={`font-mono t-small ${on ? 'text-accent' : 'text-ink-3'}`}>{f.number}</span>
                <span className="t-small text-ink-1 font-medium leading-snug">{f.short_title}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="t-data text-2xl text-ink-1 tabular">{a.complete ? '' : '≥'}{a.total}</span>
                <span className="t-micro text-ink-3">{p.span}</span>
              </div>
              <ForceSpark series={a.series} label={`${f.short_title}, ${p.span}`} />
              <Delta a={a} noun={p.noun} />
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="t-micro text-ink-4">Reach</span>
          <button type="button" aria-pressed={reach !== 'direct'} className={chip(reach !== 'direct')} onClick={() => set({ freach: '' })}>Direct and adjacent</button>
          <button type="button" aria-pressed={reach === 'direct'} className={chip(reach === 'direct')} onClick={() => set({ freach: 'direct' })}>Direct only</button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="t-micro text-ink-4">Direction</span>
          {Object.entries(DIRECTIONS).map(([d, label]) => <button key={d} type="button" aria-pressed={list(params.fdir).includes(d)} className={chip(list(params.fdir).includes(d))} onClick={() => set({ fdir: toggleIn(params.fdir, d) })}>{label}</button>)}
        </div>
        {any && <button type="button" className="inline-flex items-center gap-1 t-micro text-ink-3 bg-transparent border-0 cursor-pointer hover:text-ink-1" onClick={() => set({ fforce: '', freach: '', fdir: '' })}><X size={12} aria-hidden="true" />Clear forces</button>}
      </div>

      <p className="t-micro text-ink-3 m-0 mb-3">
        {archive.state === 'unavailable'
          ? <span className="text-danger">The evidence archive is unavailable — counts come from the live feed alone and are floors.</span>
          : floor && coverageSince
            ? <>The archive began on {formatDate(coverageSince)}; this {p.noun} reaches further back, so hatched {p.bucket}s and totals marked ≥ hold only what the live feed still carried. They fill in as the archive grows.</>
            : `Every ${p.bucket} in this ${p.noun} is archived.`}
        {narrowedBy.length > 0 && <> Also narrowed by the filters below — {narrowedBy.map((f) => `${f.label}: ${f.value}`).join(' · ')}.</>}
      </p>

      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1">
        <div className="t-small text-ink-1">
          <span className="tabular">{floor ? '≥' : ''}{events.length}</span> event{events.length === 1 ? '' : 's'} in the {p.span}
          {picked.length > 0 && <> · {picked.map((id) => FORCE_BY_ID[id].short_title).join(' or ')}</>}
        </div>
        <span className="t-micro text-ink-4">newest first · expand an event for why it is tagged</span>
      </div>
      <EventList items={events.slice(0, shown)} empty={`No market event in the ${p.span} matches this selection.`} />
      {events.length > shown && (
        <button type="button" className="mt-2 t-small text-accent bg-transparent border-0 cursor-pointer p-0" onClick={() => setShown((n) => n + LIST_STEP * 2)}>Show more ({events.length - shown} left)</button>
      )}

      <div className="mt-4"><ExportBar title="Export this view — period, forces and filters included" build={build} primary="xlsx" /></div>
    </section>
  )
}
