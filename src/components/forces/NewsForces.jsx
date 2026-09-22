import { useState } from 'react'
import { X, ExternalLink } from 'lucide-react'
import { FORCES, FORCE_BY_ID, DIRECTIONS, EXPOSURE_TYPES } from '../../data/forces.js'
import { PERIODS, PERIOD_IDS, RANGE_FLOOR, MMA_DATE, periodActivity, inPeriod, filterTagged, resolveRange, rangeBucket, unitsFor, linkOf, readRange, includeDeals } from '../../utils/forces.js'
import { useUrlFilters } from '../../hooks/useUrlFilters.js'
import { formatDate } from '../../utils/format.js'
import { buildPageDoc, describeFilters } from '../../utils/pageDocs.js'
import { ExportBar } from '../export/ExportBar.jsx'
import { ForceSpark } from './ForceSpark.jsx'
import { ForceChips } from './ForceChip.jsx'
import { EventList } from './EventList.jsx'

const seg = (on) => `px-2.5 py-1 t-small border-0 cursor-pointer transition-colors duration-100 ${on ? 'bg-ground-4 text-ink-1' : 'bg-transparent text-ink-2 hover:text-ink-1 hover:bg-ground-2'}`
const chip = (a) => ['inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 t-small cursor-pointer select-none transition-colors duration-100',
  a ? 'bg-ground-4 border-line-3 text-ink-1' : 'bg-transparent border-line-1 text-ink-2 hover:bg-ground-2 hover:text-ink-1'].join(' ')
const dateInput = 'bg-ground-1 border border-line-2 rounded-md h-8 px-2 t-small text-ink-1 focus:border-accent outline-none'
const list = (v) => String(v || '').split(',').filter(Boolean)
const toggleIn = (v, x) => { const s = new Set(list(v)); if (s.has(x)) s.delete(x); else s.add(x); return [...s].join(',') }
const LIST_STEP = 15
const PERIOD_OPTIONS = [...PERIOD_IDS, 'custom']
const cap = (w) => w[0].toUpperCase() + w.slice(1)

/** "+4 on the previous week", or why there is no comparison yet. */
function Delta({ a, noun }) {
  if (a.previous == null) return <span className="t-micro text-ink-4">no earlier {noun} archived yet</span>
  const d = a.total - a.previous
  return <span className="t-micro text-ink-3 tabular">{d > 0 ? '+' : ''}{d} on the previous {noun}</span>
}

/**
 * Deals on record are not news items: they have no source, topic, kind or entity-type tags, so the page's news
 * filters cannot all apply to them. Search and entity can (text; party or headline link). If any other news
 * filter is set, deals are left out and the view says why — never included unfiltered.
 */
function dealsFor(deals, pageFilters) {
  const blocked = ['type', 'topic', 'source', 'kind'].filter((k) => pageFilters[k])
  if (blocked.length) return { items: [], blocked }
  const q = String(pageFilters.q || '').trim().toLowerCase()
  const items = deals.filter((x) => {
    if (q && !`${x.title} ${x.record?.summary || ''} ${x.record?.valueNote || ''}`.toLowerCase().includes(q)) return false
    if (pageFilters.entity) { const l = linkOf(x, pageFilters.entity); if (!l || l.link === 'mention') return false }
    return true
  })
  return { items, blocked }
}

/**
 * The five forces as a way to read the news. Pick a period — a preset, or any range back to 2018, the year of
 * the Music Modernization Act — and the forces you care about; the view shows counts, a trend, the market
 * milestones in the range, a computed reading of what the numbers say, and the events themselves. The search
 * and filters further down the page narrow it too.
 *
 * Evidence is chosen intelligently and said out loud. News is archived from the archive's first day, so a range
 * reaching further back includes the deals on record by default — they are the only evidence that old — and the
 * view states that it has done so, with one click to leave them out. Coverage stays honest: "≥" floors, hatched
 * and faded buckets, and no comparison with a period nobody recorded.
 */
export function NewsForces({ tagged, deals = [], milestones = [], coverageSince, archive, today, pageFilters, pageFilterLabels }) {
  const { params, set } = useUrlFilters(['fperiod', 'fforce', 'freach', 'fdir', 'ffrom', 'fto', 'fdeals', 'fby'])
  const [shown, setShown] = useState(LIST_STEP)
  const todayIso = new Date(today).toISOString().slice(0, 10)
  const period = PERIOD_OPTIONS.includes(params.fperiod) ? params.fperiod : 'week'
  const custom = period === 'custom'
  const range = custom ? resolveRange({ from: params.ffrom, to: params.fto, today }) : null
  const bad = custom && !!range.error
  const units = custom && !bad ? unitsFor(range.from, range.to) : []
  const unit = custom ? (units.includes(params.fby) ? params.fby : rangeBucket(range.from, range.to)) : PERIODS[period].bucket
  const span = custom ? { from: range.from, to: range.to, unit } : {}
  const p = custom ? { noun: 'range', span: `range ${formatDate(range.from)} – ${formatDate(range.to)}`, bucket: unit } : PERIODS[period]
  const picked = list(params.fforce)
  const reach = params.freach === 'direct' ? 'direct' : 'any'

  // Where does this period start? Needed before the counts, to decide whether deals belong in them.
  const probe = bad ? null : periodActivity([], { period, today, coverageSince, ...span })
  const beforeArchive = probe ? !probe.complete : false
  // Deals: '1' on, '0' off, '' automatic — on exactly when the period reaches back before the news archive.
  const withDeals = includeDeals(params.fdeals, beforeArchive)
  const auto = params.fdeals === '' && withDeals

  const dealPart = withDeals ? dealsFor(deals, pageFilters) : { items: [], blocked: [] }
  // Direction narrows everything; force selection narrows the list and milestones, not the cards — pressing one
  // force must not make the other four read zero.
  const pool = filterTagged([...tagged, ...dealPart.items], { direction: params.fdir })
  const marks = filterTagged(milestones, { direction: params.fdir })
  const cards = bad ? [] : FORCES.map((f) => ({ f, a: periodActivity(pool, { period, forceId: f.id, reach, today, coverageSince, milestones: marks, ...span }) }))
  const selected = filterTagged(pool, { force: params.fforce, reach })
  const events = bad ? [] : inPeriod(selected, { period, today, ...span })
  const overall = bad ? null : periodActivity(selected, { period, today, coverageSince, ...span })
  const floor = overall ? !overall.complete : false
  const inRangeMilestones = bad ? [] : inPeriod(filterTagged(marks, { force: params.fforce, reach }), { period, today, ...span })
  const reading = bad ? [] : readRange({ items: events, cards, coverageSince, unit, milestones: inRangeMilestones, withDeals })
  const any = picked.length || params.fdir || params.freach
  const narrowedBy = describeFilters(pageFilters, pageFilterLabels)
  const nDeals = events.filter((x) => x.kind === 'deal').length

  const setPeriod = (id) => {
    setShown(LIST_STEP)
    if (id === 'custom') set({ fperiod: 'custom', ffrom: params.ffrom || MMA_DATE, fto: params.fto || todayIso })
    else set({ fperiod: id === 'week' ? '' : id, ffrom: '', fto: '', fby: '' })
  }
  const setRange = (ffrom, fto) => { set({ fperiod: 'custom', ffrom, fto, fby: '' }); setShown(LIST_STEP) }
  const presets = [
    ['Since the MMA', MMA_DATE, 'The Music Modernization Act was signed into law on 11 October 2018'],
    ['Since 2020', '2020-01-01'],
    ['Year to date', `${todayIso.slice(0, 4)}-01-01`],
    ...(coverageSince ? [['Since the archive began', coverageSince, 'The first day news events were recorded']] : []),
  ]

  const viewFilters = bad ? [] : [
    { label: 'Period', value: custom ? `${formatDate(range.from)} – ${formatDate(range.to)}, by ${unit}` : `${p.span} (from ${formatDate(overall.from)})` },
    ...(picked.length ? [{ label: 'Forces', value: picked.map((id) => FORCE_BY_ID[id].short_title).join(' or ') }] : []),
    ...(reach === 'direct' ? [{ label: 'Reach', value: 'Direct only' }] : []),
    ...(params.fdir ? [{ label: 'Direction', value: list(params.fdir).map((d) => DIRECTIONS[d]).join(' or ') }] : []),
    ...(withDeals ? [{ label: 'Includes', value: dealPart.blocked.length ? 'deals on record — excluded by the news filters' : `deals on record${auto ? ' (automatically: the period starts before the news archive)' : ''}` }] : []),
    ...narrowedBy,
  ]
  const build = () => buildPageDoc({
    slug: `news-forces-${custom ? `${range.from}-to-${range.to}` : period}`,
    title: 'Five forces in the news',
    eyebrow: 'Live · the forces behind the headlines',
    lede: withDeals
      ? 'Market events from the live feed and the evidence archive, with the deals on record, read against the five forces over the chosen period.'
      : 'Market events from the live feed and the evidence archive, read against the five forces over the chosen period.',
    filters: viewFilters,
    sort: 'Most recent first',
    stats: cards.map(({ f, a }) => ({ label: `${f.number} ${f.short_title}`, value: `${a.complete ? '' : '≥'}${a.total}` })),
    columns: ['Date', 'Kind', 'Source', 'Headline', 'Primary force', 'Secondary forces', 'Direction', 'Confidence', 'Exposure', 'Link'],
    rows: events.map((x) => [String(x.date).slice(0, 10), x.kind === 'deal' ? 'Deal on record' : 'News', x.source_label, x.title, FORCE_BY_ID[x.primary_force_id].short_title, x.secondary_force_ids.map((id) => FORCE_BY_ID[id].short_title).join(' · '), DIRECTIONS[x.force_impact_direction], x.force_confidence, EXPOSURE_TYPES[x.exposure_type], x.source_url]),
    extra: [
      { eyebrow: 'Reading', title: 'What the numbers say', blocks: [{ kind: 'bullets', items: reading }] },
      ...(cards.length ? [{ eyebrow: 'Trend', title: `By ${unit} across the ${p.noun}`, blocks: [
        { kind: 'table', columns: [cap(unit), ...FORCES.map((f) => `${f.number} ${f.short_title}`), 'News archived', 'Milestones'],
          rows: cards[0].a.series.map((w, i) => [w.label, ...cards.map(({ a }) => String(a.series[i].count)), w.covered ? 'yes' : 'no — news incomplete', (inRangeMilestones.filter((m) => String(m.date) >= w.start && (!cards[0].a.series[i + 1] || String(m.date) < cards[0].a.series[i + 1].start)).map((m) => m.title).join('; '))]) },
      ] }] : []),
      ...(inRangeMilestones.length ? [{ eyebrow: 'Milestones', title: 'What happened in the market meanwhile', blocks: [
        { kind: 'table', columns: ['Date', 'Milestone', 'Primary force', 'Source'], rows: inRangeMilestones.map((m) => [String(m.date).slice(0, 10), m.title, FORCE_BY_ID[m.primary_force_id].short_title, m.source_url]) },
        { kind: 'note', text: 'Milestones are context, not activity: they are marked on the trend but never counted in it. Each is sourced, and its forces come from its own text, like any event.' },
      ] }] : []),
    ],
    notes: [
      floor && coverageSince ? `News events are archived from ${coverageSince}. Buckets before that hold ${withDeals ? 'the deals on record and ' : ''}only what the live feed still carried, so totals marked ≥ are floors.` : '',
      !coverageSince ? 'The evidence archive was unavailable, so news counts come from the live feed alone and are floors.' : '',
      withDeals ? 'Deals on record are the notable transactions filed in the app, not every deal in the market.' : '',
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
          {PERIOD_OPTIONS.map((id) => <button key={id} type="button" aria-pressed={period === id} className={seg(period === id)} onClick={() => setPeriod(id)}>{id === 'custom' ? 'Custom' : PERIODS[id].label}</button>)}
        </div>
      </div>

      {custom && (
        <div className="rounded-md border border-line-1 bg-ground-1 p-3 mb-3 space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <label className="t-micro text-ink-3 inline-flex items-center gap-1.5">From
              <input type="date" className={dateInput} value={params.ffrom || MMA_DATE} min={RANGE_FLOOR} max={todayIso} onChange={(e) => setRange(e.target.value, params.fto || todayIso)} aria-label="Start date" />
            </label>
            <label className="t-micro text-ink-3 inline-flex items-center gap-1.5">To
              <input type="date" className={dateInput} value={params.fto || todayIso} min={RANGE_FLOOR} max={todayIso} onChange={(e) => setRange(params.ffrom || MMA_DATE, e.target.value)} aria-label="End date" />
            </label>
            {!bad && (
              <div className="inline-flex items-center gap-1.5">
                <span className="t-micro text-ink-4">By</span>
                <div role="group" aria-label="Bucket size" className="inline-flex rounded-md border border-line-2 overflow-hidden">
                  {units.map((u) => <button key={u} type="button" aria-pressed={unit === u} className={seg(unit === u)} onClick={() => set({ fby: u === rangeBucket(range.from, range.to) ? '' : u })}>{cap(u)}</button>)}
                </div>
                <span className="t-micro text-ink-4">{cards[0]?.a.series.length} {unit}s</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="t-micro text-ink-4 mr-1">Quick ranges</span>
            {presets.map(([label, from, title]) => (
              <button key={label} type="button" title={title} aria-pressed={range.from === from && range.to === todayIso} className={chip(range.from === from && range.to === todayIso)} onClick={() => setRange(from, todayIso)}>{label}</button>
            ))}
          </div>
          {bad && <p className="t-small text-danger m-0">{range.error} Choose a start on or before {formatDate(range.to)}.</p>}
          {range.notes.map((n) => <p key={n} className="t-micro text-ink-3 m-0">{n}</p>)}
        </div>
      )}

      {!bad && (
        <>
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
                    <span className="t-micro text-ink-3">{custom ? 'in range' : p.span}</span>
                  </div>
                  <div className="pt-2"><ForceSpark series={a.series} label={`${f.short_title}, ${p.span}`} /></div>
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
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="t-micro text-ink-4">Evidence</span>
              <button type="button" aria-pressed={withDeals} className={chip(withDeals)} onClick={() => { set({ fdeals: withDeals ? '0' : '1' }); setShown(LIST_STEP) }}>{deals.length} deals on record{auto ? ' · auto' : ''}</button>
              {params.fdeals && <button type="button" className="t-micro text-ink-3 bg-transparent border-0 cursor-pointer p-0 hover:text-ink-1" onClick={() => set({ fdeals: '' })} title="Include deals automatically whenever the period starts before the news archive">reset to automatic</button>}
            </div>
            {any && <button type="button" className="inline-flex items-center gap-1 t-micro text-ink-3 bg-transparent border-0 cursor-pointer hover:text-ink-1" onClick={() => set({ fforce: '', freach: '', fdir: '' })}><X size={12} aria-hidden="true" />Clear forces</button>}
          </div>

          <div className="t-micro text-ink-3 mb-3 space-y-1">
            <p className="m-0">
              {archive.state === 'unavailable'
                ? <span className="text-danger">The evidence archive is unavailable — news counts come from the live feed alone and are floors.</span>
                : floor && coverageSince
                  ? <>News is archived from {formatDate(coverageSince)}; this {p.noun} reaches further back, so hatched {unit}s and totals marked ≥ hold {withDeals ? 'the deals on record plus ' : ''}only what the live feed still carried.</>
                  : `Every ${unit} in this ${p.noun} is archived.`}
              {narrowedBy.length > 0 && <> Also narrowed by the filters below — {narrowedBy.map((f) => `${f.label}: ${f.value}`).join(' · ')}.</>}
            </p>
            {withDeals && (dealPart.blocked.length
              ? <p className="m-0">Deals are excluded here: they carry no {dealPart.blocked.map((k) => ({ type: 'entity type', topic: 'topic', source: 'source', kind: 'kind' }[k])).join(' or ')}, so that filter cannot apply to them.</p>
              : <p className="m-0">{auto ? `Including the deals on record automatically, because news before ${formatDate(coverageSince)} was never recorded` : 'Including the deals on record'} — {nDeals} in this {p.noun}, the notable transactions filed in the app rather than every deal in the market.{pageFilters.q || pageFilters.entity ? ' Search and entity filters apply to them too.' : ''}</p>)}
          </div>

          {reading.length > 0 && (
            <div className="rounded-md border border-line-1 bg-ground-1 p-3 mb-3">
              <div className="t-eyebrow text-ink-3 mb-1.5">Reading</div>
              <ul className="m-0 pl-4 space-y-0.5">{reading.map((r) => <li key={r} className="t-small text-ink-2">{r}</li>)}</ul>
            </div>
          )}

          {inRangeMilestones.length > 0 && (
            <div className="mb-4">
              <div className="t-eyebrow text-ink-3 mb-1.5">Market milestones in this {p.noun} · marked ● on the trend lines · not counted</div>
              <ul className="m-0 p-0 list-none border-t border-line-1">
                {inRangeMilestones.map((m) => (
                  <li key={m.id} className="grid grid-cols-[92px_minmax(0,1fr)] gap-4 py-2 border-b border-line-1">
                    <span className="t-data text-ink-3">{formatDate(String(m.date).slice(0, 10))}</span>
                    <div className="min-w-0">
                      <a href={m.source_url} target="_blank" rel="noreferrer" className="t-small text-ink-1 no-underline hover:text-accent inline-flex gap-1">{m.title}<ExternalLink size={10} className="shrink-0 mt-1 text-ink-4" aria-hidden="true" /></a>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1"><span className="t-micro text-ink-4">{m.source_label}</span><ForceChips tag={m} /></div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-baseline justify-between gap-3 mb-1">
            <div className="t-small text-ink-1">
              <span className="tabular">{floor ? '≥' : ''}{events.length}</span> {withDeals ? 'item' : 'event'}{events.length === 1 ? '' : 's'} in the {p.span}
              {picked.length > 0 && <> · {picked.map((id) => FORCE_BY_ID[id].short_title).join(' or ')}</>}
            </div>
            <span className="t-micro text-ink-4">newest first · expand an item for why it is tagged</span>
          </div>
          <EventList items={events.slice(0, shown)} empty={`Nothing in the ${p.span} matches this selection.`} />
          {events.length > shown && (
            <button type="button" className="mt-2 t-small text-accent bg-transparent border-0 cursor-pointer p-0" onClick={() => setShown((n) => n + LIST_STEP * 2)}>Show more ({events.length - shown} left)</button>
          )}

          <div className="mt-4"><ExportBar title="Export this view — period, forces, reading and milestones included" build={build} primary="xlsx" /></div>
        </>
      )}
    </section>
  )
}
