import { useEffect, useMemo, useState } from 'react'
import { Search, X, RefreshCw, Radio, WifiOff } from 'lucide-react'
import { PageHeader, Stat, Tag, Card, Button } from '../components/primitives/index.js'
import { NewsItem } from '../components/news/NewsItem.jsx'
import { useNewsStream } from '../hooks/useNewsStream.js'
import { useUrlFilters } from '../hooks/useUrlFilters.js'
import { ENTITY_TYPES, TYPE_ORDER, getEntity } from '../data/entities.js'
import { formatDate } from '../utils/format.js'
import { PageExport } from '../components/export/PageExport.jsx'
import { buildPageDoc, describeFilters } from '../utils/pageDocs.js'

const chip = (a) => ['inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 t-small cursor-pointer select-none transition-colors duration-100',
  a ? 'bg-ground-4 border-line-3 text-ink-1' : 'bg-transparent border-line-1 text-ink-2 hover:bg-ground-2 hover:text-ink-1'].join(' ')
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
  const { params, set, clear, any } = useUrlFilters(['q', 'entity', 'type', 'topic', 'source', 'kind'])
  const { items, total, status, state, reload } = useNewsStream({ ...params, limit: 150 })
  const [stats, setStats] = useState(null)
  useEffect(() => { fetch('/api/news/stats').then((r) => r.json()).then(setStats).catch(() => {}) }, [status?.lastSuccess])
  const entity = params.entity ? getEntity(params.entity) : null
  const topics = stats?.topics || {}
  const sources = useMemo(() => Object.entries(stats?.bySource || {}).sort((a, b) => b[1] - a[1]), [stats])
  const refresh = () => fetch('/api/news/refresh', { method: 'POST' }).then(() => setTimeout(reload, 4000)).catch(() => {})

  return (
    <>
      <PageHeader eyebrow="Live · movement" tone="muted" title="News"
        lede="The trades, Google News queries, and SEC filings, aggregated every 15 minutes and tagged to entities and topics by the same table that drives the rest of the canvas."
        actions={<Button variant="secondary" icon={RefreshCw} onClick={refresh} disabled={state === 'unavailable'}>Refresh now</Button>} />

      <div className="mb-6"><StatusLine state={state} status={status} total={status?.total ?? 0} /></div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Stat label="Items in window" kind="count" value={stats.total} opts={{ full: true }} hint="14-day Google window · latest 20 per feed" />
          <Stat label="Tagged to an entity" kind="count" value={Object.values(stats.byEntity || {}).length} opts={{ full: true }} hint="distinct entities mentioned" />
          <Stat label="Entity signals" kind="count" value={stats.signals?.entities} opts={{ full: true }} hint={`${stats.signals?.patterns} patterns, generated from entities.js`} />
          <Stat label="SEC filings" kind="count" value={stats.bySource?.sec_edgar || 0} opts={{ full: true }} />
        </div>
      )}

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3">
          <label className="relative flex-1 max-w-xl">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true" />
            <input type="search" value={params.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search headlines and summaries"
              className="w-full h-9 pl-9 pr-3 bg-ground-1 border border-line-2 rounded-md t-body text-ink-1 placeholder:text-ink-4 outline-none focus:border-accent" />
          </label>
          <span className="t-small text-ink-3 tabular">{total} match</span>
          {any && <button type="button" onClick={clear} className="inline-flex items-center gap-1 t-small text-ink-3 hover:text-ink-1 bg-transparent border-0 cursor-pointer"><X size={13} aria-hidden="true" /> Clear</button>}
        </div>
        {entity && <div className="flex items-center gap-2 t-small text-ink-2">Entity: <Tag tone="secondary">{entity.name}</Tag><button type="button" onClick={() => set({ entity: '' })} className="t-micro text-ink-3 hover:text-ink-1 bg-transparent border-0 cursor-pointer">remove</button></div>}
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={chip(!params.type)} onClick={() => set({ type: '' })}>All types</button>
          {TYPE_ORDER.filter((t) => stats?.byType?.[t]).map((t) => <button key={t} type="button" className={chip(params.type === t)} onClick={() => set({ type: params.type === t ? '' : t })}>{ENTITY_TYPES[t].label}<span className="t-micro font-mono text-ink-4">{stats.byType[t]}</span></button>)}
        </div>
        <div className="flex flex-wrap gap-2">
          <select className={select} value={params.topic} onChange={(e) => set({ topic: e.target.value })} aria-label="Topic"><option value="">Any topic</option>{Object.entries(topics).map(([k, v]) => <option key={k} value={k}>{v}{stats?.byTopic?.[k] ? ` (${stats.byTopic[k]})` : ''}</option>)}</select>
          <select className={select} value={params.source} onChange={(e) => set({ source: e.target.value })} aria-label="Source"><option value="">Any source</option>{sources.map(([k, n]) => <option key={k} value={k}>{k} ({n})</option>)}</select>
          <select className={select} value={params.kind} onChange={(e) => set({ kind: e.target.value })} aria-label="Kind"><option value="">News + filings</option><option value="news">News only</option><option value="filing">SEC filings only</option></select>
        </div>
      </div>

      {state === 'unavailable' ? (
        <Card pad="lg" className="max-w-2xl"><p className="t-body text-ink-2 m-0">Nothing to show because the backend is not reachable, not because nothing matched. The page will reconnect on its own.</p></Card>
      ) : items.length === 0 && state !== 'loading' ? (
        <Card pad="lg" className="max-w-2xl"><p className="t-body text-ink-2 m-0">Backend is up but nothing matches these filters in the current window. Clear a facet, or widen the feed in <span className="font-mono">server/sources.json</span>.</p></Card>
      ) : (
        <div className="border-t border-line-1 max-w-4xl">{items.map((n) => <NewsItem key={n.id} n={n} topics={topics} />)}</div>
      )}
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
