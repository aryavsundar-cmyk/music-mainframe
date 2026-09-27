import { useMemo } from 'react'
import { useUrlFilters } from '../hooks/useUrlFilters.js'
import { PageHeader, FilterBar, KeyFigures, Chip, Eyebrow } from '../components/primitives/index.js'
import { TransactionList } from '../components/money/TransactionRow.jsx'
import { filterTransactions, TX_TYPES, ASSETS, STRUCTURES, YEARS, TX_TOTALS, partyName } from '../data/transactions.js'
import { PageExport } from '../components/export/PageExport.jsx'
import { buildPageDoc, describeFilters } from '../utils/pageDocs.js'
import { format, formatDate } from '../utils/format.js'
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
const select = 'bg-ground-1 border border-line-2 rounded-md h-8 px-2 t-small text-ink-1 focus:border-accent outline-none'

/** What the board is reading, stated plainly — including what it declined and whether the live half is there. */
function FeedLine({ feed, archive, tagged, declined }) {
  const deals = tagged.filter((x) => x.kind === 'deal').length
  const archiveLine = archive.state === 'ok' && archive.coverage
    ? `archive: ${archive.count} items since ${formatDate(archive.coverage.since)}${archive.error ? ' (repository unreachable — deployed copy)' : ''}`
    : archive.state === 'unavailable' ? 'archive unavailable' : 'reading the archive…'
  if (feed.state === 'unavailable' && archive.state !== 'ok') return <span className="t-micro text-danger">Live feed and archive unreachable — forces reflect {deals} deals on record only.</span>
  return (
    <span className="t-micro text-ink-3 tabular text-right">
      {deals} deals on record · {tagged.length - deals} events tagged · {declined} declined
      <br />{feed.state === 'unavailable' ? <span className="text-danger">live feed unreachable</span> : feed.state === 'loading' ? 'reading the live feed…' : `live feed: ${feed.read} items`} · {archive.state === 'unavailable' ? <span className="text-danger">{archiveLine}</span> : archiveLine}
    </span>
  )
}

export default function Deals() {
  const { params, set, clear, sp } = useUrlFilters(KEYS)
  const listed = useMemo(() => filterTransactions(params), [sp]) // eslint-disable-line react-hooks/exhaustive-deps
  const { tagged, unclassified, today, feed, archive, coverageSince } = useForces()

  // The force facets narrow deals and market events alike. The board ignores its own force selection — pressing
  // one force should not make the other four read zero — but honours the rest (exposure, direction, place, rights).
  const facets = { force: params.force, reach: params.reach, exposure: params.exposure, direction: params.dir, geography: params.geo, rights: params.rights }
  const boardItems = filterTagged(tagged, { ...facets, force: '' })
  const board = forceBoard(boardItems, { today, coverageSince })
  const floors = board.some((b) => !b.complete[365])
  const selected = String(params.force || '').split(',').filter(Boolean)
  const forcing = FORCE_KEYS.some((k) => params[k])
  const rows = forcing ? filterTagged(listed.map(classifyDeal), facets).map((x) => x.record) : listed
  const q = params.q.trim().toLowerCase()
  const events = filterTagged(tagged.filter((x) => x.kind === 'event'), facets).filter((x) => !q || x.title.toLowerCase().includes(q))
  const toggleForce = (id) => set({ force: selected.length === 1 && selected[0] === id ? '' : id })
  const forceFilters = describeFilters(Object.fromEntries(FORCE_KEYS.map((k) => [k, params[k]])), FILTER_LABELS)
  const activeFilters = describeFilters(params, FILTER_LABELS).map((f, i) => ({
    key: `${f.label}-${i}`,
    label: `${f.label}: ${f.value}`,
    onRemove: () => set({ [KEYS.find((k) => (FILTER_LABELS[k]?.label || k) === f.label)]: '' }),
  }))
  const counts = useMemo(() => Object.fromEntries(Object.keys(TX_TYPES).map((t) => [t, filterTransactions({ ...params, type: t }).length])), [sp]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <PageHeader eyebrow="Money · who is buying" title="Deals"
        answer={<KeyFigures items={[
          { value: format.count(TX_TOTALS.count, { full: true }), label: `transactions, ${YEARS[YEARS.length - 1]}–${YEARS[0]}` },
          { value: format.money(TX_TOTALS.disclosed), label: 'disclosed value' },
          { value: format.money(TX_TOTALS.abs), label: 'ABS issued', to: '/abs' },
          { value: format.money(TX_TOTALS.catalog), label: 'superstar catalog sales', to: '/catalogs' },
        ]} />}
        lede="Every catalog sale, sponsor round, securitisation, take-private and merger on file, newest first. Click a row for the terms and sources." />

      <FilterBar
        search={{ value: params.q, onChange: (v) => set({ q: v }), placeholder: 'Search title, parties, summary' }}
        active={activeFilters}
        onClear={clear}
        count={{ shown: rows.length, total: TX_TOTALS.count, noun: 'deals' }}
        aside={<a href="#five-forces" className="t-small text-ink-2 no-underline hover:text-ink-1 whitespace-nowrap">Five forces ↓</a>}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <span className="t-micro text-ink-4 w-20 shrink-0 pt-1.5">Type</span>
            <div className="flex flex-wrap gap-1.5">
              <Chip pressed={!params.type} onClick={() => set({ type: '' })}>All types</Chip>
              {Object.entries(TX_TYPES).map(([k, v]) => (
                <Chip key={k} pressed={params.type === k} onClick={() => set({ type: params.type === k ? '' : k })}>{v.label}<span className="t-micro font-mono text-ink-3">{counts[k]}</span></Chip>
              ))}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="t-micro text-ink-4 w-20 shrink-0 pt-1.5">Terms</span>
            <div className="flex flex-wrap gap-2">
              <select className={select} value={params.asset} onChange={(e) => set({ asset: e.target.value })} aria-label="Asset"><option value="">Any asset</option>{Object.entries(ASSETS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <select className={select} value={params.structure} onChange={(e) => set({ structure: e.target.value })} aria-label="Structure"><option value="">Any structure</option>{Object.entries(STRUCTURES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <select className={select} value={params.year} onChange={(e) => set({ year: e.target.value })} aria-label="Year"><option value="">Any year</option>{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}</select>
              <select className={select} value={params.status} onChange={(e) => set({ status: e.target.value })} aria-label="Status"><option value="">Any status</option><option value="closed">Closed</option><option value="pending">Pending</option><option value="announced">Announced</option><option value="terminated">Terminated</option></select>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="t-micro text-ink-4 w-20 shrink-0 pt-1.5">Forces</span>
            <div className="min-w-0 flex-1"><ForceFilters params={params} set={set} geographies={geographiesIn(tagged)} /></div>
          </div>
        </div>
      </FilterBar>

      <TransactionList items={rows} dense={!!params.type} />


      <section id="five-forces" className="mt-12 mb-8 scroll-mt-6">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <Eyebrow as="h2" className="m-0">Five forces</Eyebrow>
            <p className="t-small text-ink-2 m-0 mt-1 max-w-2xl">Every deal on record and every item in the live feed, read against the five forces reshaping the market. Press a force to see its thesis and the evidence behind it.</p>
          </div>
          <FeedLine feed={feed} archive={archive} tagged={tagged} declined={unclassified.length} />
        </div>
        <ForceBoard board={board} selected={selected} onToggle={toggleForce} />
        {floors && (
          <p className="t-micro text-ink-3 m-0 mt-2 max-w-4xl">
            {coverageSince
              ? <>Market events are archived from {formatDate(coverageSince)}. A window marked ≥ reaches back before that: it holds every deal on record but only the events still in the live feed, so its count is a floor. Hatched weeks in the sparklines are incomplete the same way. Both fill in as the archive grows.</>
              : <>The evidence archive is unavailable, so events come from the live feed alone, which holds only a few weeks and empties on restart. Windows marked ≥ are floors.</>}
          </p>
        )}
        {selected.length === 1 && <ForcePanel activity={forceActivity(boardItems, selected[0], { today, feed: 12, coverageSince })} />}
        <div className="mt-3">
          <ExportBar title={selected.length ? `Export the brief — ${selected.map((id) => FORCE_BY_ID[id].short_title).join(', ')}` : 'Export the five forces brief'}
            build={() => buildForcesBrief(filterTagged(tagged, facets), { today, unclassified, filters: forceFilters, forces: selected.length ? selected : FORCE_IDS, coverageSince, archive })} />
        </div>
      </section>

      {selected.length === 1 && <ForcePanel activity={forceActivity(boardItems, selected[0], { today, feed: 12, coverageSince })} />}

      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
          <Eyebrow as="h2" className="m-0">Market events · live feed</Eyebrow>
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
