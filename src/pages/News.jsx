import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Radio, WifiOff } from 'lucide-react'
import { format } from '../utils/format.js'
import { Link } from 'react-router-dom'
import { PageHeader, FilterBar, KeyFigures, Tag, Card, Button, Chip } from '../components/primitives/index.js'
import { NewsItem } from '../components/news/NewsItem.jsx'
import { useNewsStream } from '../hooks/useNewsStream.js'
import { useUrlFilters } from '../hooks/useUrlFilters.js'
import { ENTITY_TYPES, TYPE_ORDER, getEntity } from '../data/entities.js'
import { formatDate } from '../utils/format.js'
import { NewsForces } from '../components/forces/NewsForces.jsx'
import { useForceEvents } from '../hooks/useForces.js'
import { TRANSACTIONS } from '../data/transactions.js'
import { MILESTONES } from '../data/milestones.js'
import { classifyDeal, classifyMilestone } from '../utils/forces.js'
import { PageExport } from '../components/export/PageExport.jsx'
import { buildPageDoc, describeFilters } from '../utils/pageDocs.js'

const select = 'bg-ground-1 border border-line-2 rounded-md h-8 px-2 t-small text-ink-1 focus:border-accent outline-none'

function StatusLine({ state, status, total }) {
  if (state === 'unavailable') return <div className="flex items-center gap-2 t-small text-danger"><WifiOff size={14} aria-hidden="true" /> News backend unreachable. In dev, start <span className="font-mono">music-mainframe-server</span> (:3002); in prod, check the Render service.</div>
  if (state === 'loading') return <div className="t-small text-ink-3">Connecting…</div>
  const ok = status?.sourceCount ? status.sourceCount - (status.errors?.length || 0) : null
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 t-small text-ink-3">
      <span className="inline-flex items-center gap-1.5"><Radio size={13} className={state === 'live' ? 'text-secondary' : 'text-ink-4'} aria-hidden="true" />{state === 'live' ? 'live' : 'polling'}</span>
      {status?.lastSuccess && <span>refreshed {formatDate(status.lastSuccess.slice(0, 10))} {status.lastSuccess.slice(11, 16)}Z</span>}
      {ok != null && <span className="font-mono">{ok}/{status.sourceCount} sources</span>}
      <span className="font-mono">{total} items</span>
      {status?.lastError && <span className="text-danger">last error: {status.lastError}</span>}
    </div>
  )
}

export default function News() {
  const { params, set, clear } = useUrlFilters(['q', 'entity', 'type', 'topic', 'source', 'kind'])
  const { items, total, status, state, reload } = useNewsStream({ ...params, limit: 150 })
  const [stats, setStats] = useState(null)
  useEffect(() => { fetch('/api/news/stats').then((r) => r.json()).then(setStats).catch(() => {}) }, [status?.lastSuccess])
  const entity = params.entity ? getEntity(params.entity) : null
  const topics = stats?.topics || {}
  const sources = useMemo(() => Object.entries(stats?.bySource || {}).sort((a, b) => b[1] - a[1]), [stats])
  const refresh = () => fetch('/api/news/refresh', { method: 'POST' }).then(() => setTimeout(reload, 4000)).catch(() => {})
  // The forces view reads the same filtered feed the list below shows, plus the archive filtered the same way.
  const forces = useForceEvents({ live: items, filters: params })
  const today = useMemo(() => new Date(), [])
  // The longer history: deals on record reach back to 2019, sourced milestones to the MMA in 2018.
  const deals = useMemo(() => TRANSACTIONS.map(classifyDeal), [])
  const milestones = useMemo(() => MILESTONES.map(classifyMilestone).filter((m) => m.primary_force_id), [])
  const filterLabels = { q: { label: 'Search' }, entity: { label: 'Entity', format: (v) => getEntity(v)?.name || v }, type: { label: 'Entity type', format: (v) => ENTITY_TYPES[v]?.label || v }, topic: { label: 'Topic', format: (v) => topics[v] || v }, source: { label: 'Source' }, kind: { label: 'Kind' } }

  const activeFilters = [
    params.q && { key: 'q', label: `“${params.q}”`, onRemove: () => set({ q: '' }) },
    entity && { key: 'entity', label: entity.name, onRemove: () => set({ entity: '' }) },
    params.type && { key: 'type', label: ENTITY_TYPES[params.type]?.label || params.type, onRemove: () => set({ type: '' }) },
    params.topic && { key: 'topic', label: topics[params.topic] || params.topic, onRemove: () => set({ topic: '' }) },
    params.source && { key: 'source', label: params.source, onRemove: () => set({ source: '' }) },
    params.kind && { key: 'kind', label: params.kind === 'news' ? 'News only' : 'SEC filings only', onRemove: () => set({ kind: '' }) },
  ].filter(Boolean)

  return (
    <>
      <PageHeader eyebrow="Live · movement" tone="muted" title="News"
        answer={<KeyFigures items={[
          { value: format.count(stats?.total ?? 0, { full: true }), label: 'items in the window' },
          { value: format.count(Object.values(stats?.byEntity || {}).length, { full: true }), label: 'companies mentioned' },
          { value: format.count(stats?.bySource?.sec_edgar || 0, { full: true }), label: 'SEC filings', to: '/changes?kind=filing' },
          { value: format.count(total, { full: true }), label: 'match these filters' },
        ]} />}
        lede="The trades, Google News queries and SEC filings, aggregated every 15 minutes and tagged to the entities on the canvas."
        actions={<div className="flex items-center gap-3">
          <Link to="/changes" className="t-small text-ink-2 no-underline hover:text-ink-1 whitespace-nowrap">What changed →</Link>
          <Button variant="secondary" icon={RefreshCw} onClick={refresh} disabled={state === 'unavailable'}>Refresh now</Button>
        </div>} />

      <div className="mb-4"><StatusLine state={state} status={status} total={status?.total ?? 0} /></div>

      <FilterBar
        search={{ value: params.q, onChange: (v) => set({ q: v }), placeholder: 'Search headlines and summaries' }}
        active={activeFilters}
        onClear={clear}
        count={{ shown: items.length, total, noun: 'stories' }}
        aside={<a href="#five-forces" className="t-small text-ink-2 no-underline hover:text-ink-1 whitespace-nowrap">Five forces ↓</a>}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <span className="t-micro text-ink-4 w-20 shrink-0 pt-1.5">Company type</span>
            <div className="flex flex-wrap gap-1.5">
              <Chip pressed={!params.type} onClick={() => set({ type: '' })}>All types</Chip>
              {TYPE_ORDER.filter((t) => stats?.byType?.[t]).map((t) => <Chip key={t} pressed={params.type === t} onClick={() => set({ type: params.type === t ? '' : t })}>{ENTITY_TYPES[t].label}<span className="t-micro font-mono text-ink-3">{stats.byType[t]}</span></Chip>)}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="t-micro text-ink-4 w-20 shrink-0 pt-1.5">Feed</span>
            <div className="flex flex-wrap gap-2">
              <select className={select} value={params.topic} onChange={(e) => set({ topic: e.target.value })} aria-label="Topic"><option value="">Any topic</option>{Object.entries(topics).map(([k, v]) => <option key={k} value={k}>{v}{stats?.byTopic?.[k] ? ` (${stats.byTopic[k]})` : ''}</option>)}</select>
              <select className={select} value={params.source} onChange={(e) => set({ source: e.target.value })} aria-label="Source"><option value="">Any source</option>{sources.map(([k, n]) => <option key={k} value={k}>{k} ({n})</option>)}</select>
              <select className={select} value={params.kind} onChange={(e) => set({ kind: e.target.value })} aria-label="Kind"><option value="">News + filings</option><option value="news">News only</option><option value="filing">SEC filings only</option></select>
            </div>
          </div>
        </div>
      </FilterBar>

      {state === 'unavailable' ? (
        <Card pad="lg" className="max-w-2xl"><p className="t-body text-ink-2 m-0">Nothing to show because the backend is not reachable, not because nothing matched. The page will reconnect on its own.</p></Card>
      ) : items.length === 0 && state !== 'loading' ? (
        <Card pad="lg" className="max-w-2xl"><p className="t-body text-ink-2 m-0">Backend is up but nothing matches these filters in the current window. Clear a facet, or widen the feed in <span className="font-mono">server/sources.json</span>.</p></Card>
      ) : (
        <div className="border-t border-line-1 max-w-4xl">{items.map((n) => <NewsItem key={n.id} n={n} topics={topics} />)}</div>
      )}
      <section id="five-forces" className="mt-12 scroll-mt-6">
      <NewsForces tagged={forces.tagged} deals={deals} milestones={milestones} coverageSince={forces.coverageSince} archive={forces.archive} today={today} pageFilters={params} pageFilterLabels={filterLabels} />
      </section>

      {!!items.length && <PageExport build={() => buildPageDoc({
        slug: 'news',
        title: 'Live news',
        eyebrow: 'Live · what just changed',
        lede: 'Trade press, search and SEC filings, tagged to the entities on the canvas.',
        filters: describeFilters(params, { q: { label: 'Search' }, entity: { label: 'Entity', format: (v) => getEntity(v)?.name || v }, type: { label: 'Entity type', format: (v) => ENTITY_TYPES[v]?.label || v }, topic: { label: 'Topic' }, source: { label: 'Source' }, kind: { label: 'Kind' } }),
        sort: 'Most recent first',
        stats: [{ label: 'In this export', value: String(items.length) }, { label: 'Matching the filters', value: String(total) }, { label: 'Feed state', value: state }],
        columns: ['Published', 'Source', 'Kind', 'Headline', 'Entities', 'Link'],
        rows: items.map((n) => [n.publishedAt ? n.publishedAt.slice(0, 10) : '', n.source || '', n.kind || '', n.title || '', (n.entities || []).map((id) => getEntity(id)?.name || id).join(' · '), n.url || '']),
        total,
        notes: [
          'This is a snapshot of a live feed taken at the moment of export. The feed moves; the file does not.',
          status?.lastError ? `The last fetch reported an error: ${status.lastError}. Some sources may be missing from this snapshot.` : '',
        ].filter(Boolean),
      })} />}
    </>
  )
}
