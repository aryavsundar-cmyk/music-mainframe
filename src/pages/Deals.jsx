import { useMemo } from 'react'
import { useUrlFilters } from '../hooks/useUrlFilters.js'
import { Search, X } from 'lucide-react'
import { PageHeader, Stat } from '../components/primitives/index.js'
import { TransactionList } from '../components/money/TransactionRow.jsx'
import { filterTransactions, TX_TYPES, ASSETS, STRUCTURES, YEARS, TX_TOTALS, partyName } from '../data/transactions.js'
import { PageExport } from '../components/export/PageExport.jsx'
import { buildPageDoc, describeFilters } from '../utils/pageDocs.js'
import { format } from '../utils/format.js'
import { ExportBar } from '../components/export/ExportBar.jsx'
import { ForceBoard } from '../components/forces/ForceBoard.jsx'
import { ForcePanel } from '../components/forces/ForcePanel.jsx'
import { ForceFilters } from '../components/forces/ForceFilters.jsx'
import { EventList } from '../components/forces/EventList.jsx'
import { useForces } from '../hooks/useForces.js'
import { classifyDeal, filterTagged, forceBoard, forceActivity, geographiesIn } from '../utils/forces.js'
import { buildForcesBrief, evidenceRows } from '../utils/forcesDocs.js'
import { FORCE_BY_ID, FORCE_IDS, DIRECTIONS, EXPOSURE_TYPES, RIGHTS_TYPES } from '../data/forces.js'

const KEYS = ['q', 'type', 'asset', 'structure', 'year', 'status', 'force', 'reach', 'exposure', 'dir', 'geo', 'rights']
const csvLabel = (map) => (v) => String(v).split(',').filter(Boolean).map((x) => map(x)).join(', ')
const FILTER_LABELS = {
  q: { label: 'Search' },
  type: { label: 'Type', format: (v) => TX_TYPES[v]?.label || v },
  asset: { label: 'Asset', format: (v) => ASSETS[v] || v },
  structure: { label: 'Structure', format: (v) => STRUCTURES[v] || v },
  year: { label: 'Year' },
  status: { label: 'Status' },
  force: { label: 'Force', format: csvLabel((id) => `${FORCE_BY_ID[id]?.number} ${FORCE_BY_ID[id]?.short_title}`) },
  reach: { label: 'Reach', format: (v) => (v === 'direct' ? 'Direct only' : 'Direct and adjacent') },
  exposure: { label: 'Exposure', format: csvLabel((x) => EXPOSURE_TYPES[x] || x) },
  dir: { label: 'Direction', format: csvLabel((x) => DIRECTIONS[x] || x) },
  geo: { label: 'Geography', format: csvLabel((x) => x) },
  rights: { label: 'Rights', format: csvLabel((x) => RIGHTS_TYPES[x] || x) },
}
const FORCE_KEYS = ['force', 'reach', 'exposure', 'dir', 'geo', 'rights']
const parties = (list) => (list || []).map(partyName).join(' · ')
const chip = (a) => ['inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 t-small cursor-pointer select-none transition-colors duration-100',
  a ? 'bg-ground-4 border-line-3 text-ink-1' : 'bg-transparent border-line-1 text-ink-2 hover:bg-ground-2 hover:text-ink-1'].join(' ')
const select = 'bg-ground-1 border border-line-2 rounded-md h-8 px-2 t-small text-ink-1 focus:border-accent outline-none'

/** What the board is reading, stated plainly — including what it declined and whether the live half is there. */
function FeedLine({ feed, tagged, declined }) {
  const deals = tagged.filter((x) => x.kind === 'deal').length
  if (feed.state === 'unavailable') return <span className="t-micro text-danger">Live feed unreachable — forces reflect {deals} deals on record only.</span>
  if (feed.state === 'loading') return <span className="t-micro text-ink-3">Reading the live feed…</span>
  return (
    <span className="t-micro text-ink-3 tabular">
      {deals} deals on record · {tagged.length - deals} live events tagged · {declined} declined
      {feed.total > feed.read && ` · newest ${feed.read} of ${feed.total} feed items read`}
    </span>
  )
}

export default function Deals() {
  const { params, set, clear, any, sp } = useUrlFilters(KEYS)
  const listed = useMemo(() => filterTransactions(params), [sp]) // eslint-disable-line react-hooks/exhaustive-deps
  const { tagged, unclassified, today, feed } = useForces()

  // The force facets narrow deals and market events alike. The board ignores its own force selection — pressing
  // one force should not make the other four read zero — but honours the rest (exposure, direction, place, rights).
  const facets = { force: params.force, reach: params.reach, exposure: params.exposure, direction: params.dir, geography: params.geo, rights: params.rights }
  const boardItems = filterTagged(tagged, { ...facets, force: '' })
  const board = forceBoard(boardItems, { today })
  const selected = String(params.force || '').split(',').filter(Boolean)
  const forcing = FORCE_KEYS.some((k) => params[k])
  const rows = forcing ? filterTagged(listed.map(classifyDeal), facets).map((x) => x.record) : listed
  const q = params.q.trim().toLowerCase()
  const events = filterTagged(tagged.filter((x) => x.kind === 'event'), facets).filter((x) => !q || x.title.toLowerCase().includes(q))
  const toggleForce = (id) => set({ force: selected.length === 1 && selected[0] === id ? '' : id })
  const forceFilters = describeFilters(Object.fromEntries(FORCE_KEYS.map((k) => [k, params[k]])), FILTER_LABELS)
  const counts = useMemo(() => Object.fromEntries(Object.keys(TX_TYPES).map((t) => [t, filterTransactions({ ...params, type: t }).length])), [sp]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <PageHeader eyebrow="Money · who is buying" title="Deals"
        lede="Every catalog sale, sponsor round, securitisation, take-private, and merger on file, newest first. Click a row for the terms and sources. ABS rows carry the structure." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Transactions" kind="count" value={TX_TOTALS.count} opts={{ full: true }} hint={`${YEARS[YEARS.length - 1]}–${YEARS[0]}`} />
        <Stat label="Disclosed value" kind="money" value={TX_TOTALS.disclosed} hint="sum of reported values; excludes undisclosed" />
        <Stat label="ABS issued" kind="money" value={TX_TOTALS.abs} hint="on file; KBRA counts $12.9B rated since 2020" />
        <Stat label="Superstar catalog sales" kind="money" value={TX_TOTALS.catalog} />
      </div>

      <section className="mb-8">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <div className="t-eyebrow text-accent">Five forces</div>
            <p className="t-small text-ink-2 m-0 mt-1 max-w-2xl">Every deal on record and every item in the live feed, read against the five forces reshaping the market. Press a force to see its thesis and the evidence behind it.</p>
          </div>
          <FeedLine feed={feed} tagged={tagged} declined={unclassified.length} />
        </div>
        <ForceBoard board={board} selected={selected} onToggle={toggleForce} />
        <div className="mt-3">
          <ExportBar title={selected.length ? `Export the brief — ${selected.map((id) => FORCE_BY_ID[id].short_title).join(', ')}` : 'Export the five forces brief'}
            build={() => buildForcesBrief(filterTagged(tagged, facets), { today, unclassified, filters: forceFilters, forces: selected.length ? selected : FORCE_IDS })} />
        </div>
      </section>

      {selected.length === 1 && <ForcePanel activity={forceActivity(boardItems, selected[0], { today, feed: 12 })} />}

      <ForceFilters params={params} set={set} geographies={geographiesIn(tagged)} />

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3">
          <label className="relative flex-1 max-w-xl">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true" />
            <input type="search" value={params.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search title, parties, summary"
              className="w-full h-9 pl-9 pr-3 bg-ground-1 border border-line-2 rounded-md t-body text-ink-1 placeholder:text-ink-4 outline-none focus:border-accent" />
          </label>
          <span className="t-small text-ink-3 tabular">{rows.length} of {TX_TOTALS.count}</span>
          {any && <button type="button" onClick={clear} className="inline-flex items-center gap-1 t-small text-ink-3 hover:text-ink-1 bg-transparent border-0 cursor-pointer"><X size={13} aria-hidden="true" /> Clear</button>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={chip(!params.type)} onClick={() => set({ type: '' })}>All types</button>
          {Object.entries(TX_TYPES).map(([k, v]) => (
            <button key={k} type="button" className={chip(params.type === k)} onClick={() => set({ type: params.type === k ? '' : k })}>{v.label}<span className="t-micro font-mono text-ink-4">{counts[k]}</span></button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <select className={select} value={params.asset} onChange={(e) => set({ asset: e.target.value })} aria-label="Asset"><option value="">Any asset</option>{Object.entries(ASSETS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select className={select} value={params.structure} onChange={(e) => set({ structure: e.target.value })} aria-label="Structure"><option value="">Any structure</option>{Object.entries(STRUCTURES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select className={select} value={params.year} onChange={(e) => set({ year: e.target.value })} aria-label="Year"><option value="">Any year</option>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select>
          <select className={select} value={params.status} onChange={(e) => set({ status: e.target.value })} aria-label="Status"><option value="">Any status</option><option value="closed">Closed</option><option value="pending">Pending</option><option value="announced">Announced</option><option value="terminated">Terminated</option></select>
        </div>
      </div>

      <TransactionList items={rows} dense={!!params.type} />

      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
          <div className="t-eyebrow text-accent">Market events · live feed</div>
          {forcing && <span className="t-small text-ink-3 tabular">{events.length} matching</span>}
        </div>
        {forcing
          ? <EventList items={events} empty={feed.state === 'unavailable' ? 'The live feed is unreachable, so only deals on record are shown above.' : 'No market event in the live feed matches these filters.'} />
          : <p className="t-small text-ink-3 m-0">Choose a force, exposure, direction, place or rights type to see the market events behind it — lawsuits, launches, licensing deals and results that the deals table does not hold.</p>}
      </section>

      <PageExport build={() => buildPageDoc({
        slug: 'deals',
        title: 'Deals',
        eyebrow: 'Money · who is buying',
        lede: 'Transactions on record — acquisitions, catalog sales, securitisations and stake sales — as this view filtered them.',
        filters: describeFilters(params, FILTER_LABELS),
        sort: 'Most recent first',
        stats: [
          { label: 'In this view', value: String(rows.length) },
          { label: 'Disclosed value here', value: format.money(rows.reduce((a, t) => a + (t.value || 0), 0)) },
          { label: 'On record', value: String(TX_TOTALS.count) },
        ],
        columns: ['Date', 'Transaction', 'Type', 'Asset', 'Acquirer', 'Seller', 'Value', 'Status', 'Primary force', 'Secondary forces', 'Direction', 'Why this matters'],
        rows: rows.map((t) => { const x = classifyDeal(t); return [t.date, t.title, TX_TYPES[t.type]?.label || t.type, ASSETS[t.asset] || t.asset, parties(t.acquirers), parties(t.sellers), t.value ? format.money(t.value) : 'undisclosed', t.status || '', FORCE_BY_ID[x.primary_force_id]?.short_title || '', x.secondary_force_ids.map((id) => FORCE_BY_ID[id].short_title).join(' · '), DIRECTIONS[x.force_impact_direction] || '', x.force_rationale] }),
        total: TX_TOTALS.count,
        extra: forcing ? [{ eyebrow: 'Market events', title: 'From the live feed, matching the same force filters', blocks: [events.length
          ? { kind: 'table', columns: ['Date', 'Source', 'Event', 'Relationship', 'Direction', 'Confidence', 'Exposure', 'Link'], rows: selected.length === 1 ? evidenceRows(events, selected[0]) : events.map((x) => [String(x.date).slice(0, 10), x.source_label, x.title, FORCE_BY_ID[x.primary_force_id].short_title, DIRECTIONS[x.force_impact_direction], x.force_confidence, EXPOSURE_TYPES[x.exposure_type], x.source_url]) }
          : { kind: 'note', text: 'No market event in the live feed matched these filters at the time of export.' }] }] : [],
        limits: ['force'],
        notes: rows.some((t) => t.verify) ? ['Values marked in the app as press estimates are not confirmed by the parties. Check the source before quoting a figure.'] : [],
      })} />
    </>
  )
}
