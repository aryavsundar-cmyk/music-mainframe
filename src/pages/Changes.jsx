import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Plus, X, Info, Check } from 'lucide-react'
import { PageHeader, Card, Tag } from '../components/primitives/index.js'
import { useUrlFilters } from '../hooks/useUrlFilters.js'
import { useChanges } from '../hooks/useChanges.js'
import { KINDS, KIND_LIST, WINDOWS, DEFAULT_WINDOW, DEFAULT_KINDS, NEWS_PER_DAY, byDay } from '../utils/changes.js'
import { readLists, saveLists, addList, removeList, getList, markSeen, lastSeen } from '../utils/watchlist.js'
import { searchEntities } from '../utils/compare.js'
import { getEntity } from '../data/entities.js'
import { formatDate } from '../utils/format.js'
import { PageExport } from '../components/export/PageExport.jsx'
import { buildPageDoc, describeFilters } from '../utils/pageDocs.js'

const chip = (on) => ['inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 t-small cursor-pointer transition-colors duration-100 whitespace-nowrap',
  on ? 'bg-ground-4 border-line-3 text-ink-1' : 'bg-transparent border-line-1 text-ink-2 hover:bg-ground-2 hover:text-ink-1'].join(' ')
const TONE = { figure: 'accent', deal: 'accent', filing: 'neutral', milestone: 'secondary', news: 'neutral' }

/**
 * What changed — one dated feed across everything the app watches on its own: SEC filings, figures that moved
 * when a filing landed, deals and milestones on the record, and archived news.
 *
 * The page is only useful if it is honest about what it could not have seen: each source states the first day it
 * holds, and a window reaching further back says so instead of showing an empty day as a quiet one.
 */
export default function Changes() {
  const { params, set } = useUrlFilters(['w', 'list', 'kind'])
  const [lists, setLists] = useState(readLists)
  const [q, setQ] = useState('')
  const [seen] = useState(lastSeen)
  useEffect(() => { markSeen() }, [])

  const win = WINDOWS.find((w) => w.id === params.w) || WINDOWS.find((w) => w.id === DEFAULT_WINDOW)
  const list = params.list === 'all' ? null : getList(lists, params.list || lists[0].id)
  const watching = list && list.ids.length ? list.ids : null
  const kinds = useMemo(() => params.kind.split(',').filter(Boolean), [params.kind])
  const { items, coverage, from, state, sources, newsHidden, counts } = useChanges({ days: win.days, ids: watching, kinds })
  const days = useMemo(() => byDay(items), [items])
  const results = useMemo(() => searchEntities(q, { exclude: list?.ids || [], limit: 6 }), [q, list])

  const toggleKind = (id) => { const s = new Set(kinds); if (s.has(id)) s.delete(id); else s.add(id); set({ kind: [...s].join(',') }) }
  const watch = (entityId) => { setLists(readLists().map((l) => (l.id !== list.id ? l : { ...l, ids: [...new Set([...l.ids, entityId])] }))); setQ('') }
  const unwatch = (entityId) => setLists(readLists().map((l) => (l.id !== list.id ? l : { ...l, ids: l.ids.filter((x) => x !== entityId) })))
  useEffect(() => { saveLists(lists) }, [lists])

  const build = () => buildPageDoc({
    slug: 'what-changed',
    title: 'What changed',
    eyebrow: 'Live · change feed',
    lede: `Every change on record between ${formatDate(from)} and today, across SEC filings, reported figures, deals, milestones and archived news.`,
    filters: describeFilters({ window: win.label, list: list ? `${list.label} (${list.ids.length || 'all companies'})` : 'All companies', kind: kinds.map((k) => KINDS[k]?.label || k).join(', ') }, {
      window: { label: 'Window' }, list: { label: 'Watching' }, kind: { label: 'Kinds' },
    }),
    sort: 'Newest first, then by kind',
    stats: KIND_LIST.map((k) => ({ label: k.label, value: String(counts[k.id] || 0) })),
    columns: ['Date', 'Kind', 'Company', 'What changed', 'Detail', 'Source'],
    rows: items.map((c) => [formatDate(c.at), KINDS[c.kind].label, c.entityName, c.title, c.detail || '', c.url || '']),
    total: items.length,
    notes: [
      ...coverage.gaps,
      'A quiet day is only quiet for the sources listed above. Deals and milestones are curated records, dated by when they were announced.',
    ],
  })

  return (
    <>
      <PageHeader eyebrow="Live · change feed" title="What changed"
        lede={`Filings, figures that moved, deals and milestones on record — one dated feed.${seen ? ` This browser last opened it on ${formatDate(String(seen).slice(0, 10))}; anything since is marked new.` : ''}`}
        actions={<Link to="/news" className="t-small text-ink-2 no-underline hover:text-ink-1">The full news feed →</Link>} />

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div role="group" aria-label="Window" className="inline-flex rounded-md border border-line-2 overflow-hidden">
          {WINDOWS.map((w) => (
            <button key={w.id} type="button" aria-pressed={w.id === win.id} onClick={() => set({ w: w.id })}
              className={`px-2.5 py-1 t-small border-0 cursor-pointer ${w.id === win.id ? 'bg-ground-4 text-ink-1' : 'bg-transparent text-ink-2 hover:bg-ground-2 hover:text-ink-1'}`}>{w.label}</button>
          ))}
        </div>
        <span className="t-small text-ink-3">since {formatDate(from)}</span>
        <span className="t-small text-ink-3 tabular ml-auto">{state === 'loading' ? 'reading…' : `${items.length} change${items.length === 1 ? '' : 's'}`}{newsHidden > 0 ? ` · ${newsHidden} more stories` : ''}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <button type="button" aria-pressed={kinds.length === 0} className={chip(kinds.length === 0)} onClick={() => set({ kind: '' })} title={`Changes to the record. News is not included by default — ${KINDS.news.hint}`}>Changes to the record</button>
        <button type="button" aria-pressed={kinds.length === KIND_LIST.length} className={chip(kinds.length === KIND_LIST.length)} onClick={() => set({ kind: KIND_LIST.map((k) => k.id).join(',') })}>Everything, news included</button>
        {KIND_LIST.map((k) => (
          <button key={k.id} type="button" aria-pressed={kinds.includes(k.id)} className={chip(kinds.includes(k.id))} onClick={() => toggleKind(k.id)} title={k.hint}>
            {k.label}<span className="t-micro font-mono text-ink-4">{counts[k.id] || 0}</span>
          </button>
        ))}
      </div>

      <Card pad="md" className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="t-eyebrow text-ink-3 mr-1">Watching</span>
          <button type="button" aria-pressed={params.list === 'all'} className={chip(params.list === 'all')} onClick={() => set({ list: 'all' })}>All companies</button>
          {lists.map((l) => (
            <span key={l.id} className="inline-flex items-center">
              <button type="button" aria-pressed={!params.list ? l.id === lists[0].id : params.list === l.id} className={chip(params.list === l.id || (!params.list && l.id === lists[0].id))} onClick={() => set({ list: l.id })}>
                {l.label}<span className="t-micro font-mono text-ink-4">{l.ids.length || 'all'}</span>
              </button>
              {lists.length > 1 && (
                <button type="button" onClick={() => setLists(removeList(readLists(), l.id))} aria-label={`Delete the list ${l.label}`}
                  className="ml-1 bg-transparent border-0 p-0 cursor-pointer text-ink-4 hover:text-danger"><X size={12} aria-hidden="true" /></button>
              )}
            </span>
          ))}
          <button type="button" className={chip(false)} onClick={() => { const { lists: next, id } = addList(readLists(), `List ${lists.length + 1}`); setLists(next); set({ list: id }) }}>
            <Plus size={12} aria-hidden="true" />New list
          </button>
        </div>

        {list && (
          <div className="mt-3 pt-3 border-t border-line-1 flex flex-wrap items-start gap-2">
            {list.ids.length === 0 && <span className="t-small text-ink-3">Empty list — showing every company on the canvas. Add companies to narrow it.</span>}
            {list.ids.map((id) => (
              <span key={id} className="inline-flex items-center gap-1.5 rounded-md border border-line-2 bg-ground-2 px-2 py-1 t-small text-ink-1">
                <Link to={`/entities/${id}`} className="text-ink-1 no-underline hover:text-accent">{getEntity(id)?.name || id}</Link>
                <button type="button" onClick={() => unwatch(id)} aria-label={`Stop watching ${id}`} className="bg-transparent border-0 p-0 cursor-pointer text-ink-4 hover:text-ink-1"><X size={12} aria-hidden="true" /></button>
              </span>
            ))}
            <div className="relative ml-auto w-full max-w-xs">
              <input type="search" value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Add a company to this list…" aria-label="Add a company to this watchlist"
                className="w-full h-8 px-2 bg-ground-1 border border-line-2 rounded-md t-small text-ink-1 placeholder:text-ink-4 outline-none focus:border-accent" />
              {results.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full m-0 p-1 list-none bg-ground-1 border border-line-2 rounded-md shadow-2xl max-h-60 overflow-y-auto">
                  {results.map((e) => (
                    <li key={e.id}><button type="button" onClick={() => watch(e.id)} className="w-full text-left px-2 py-1.5 rounded-sm bg-transparent border-0 cursor-pointer t-small text-ink-2 hover:bg-ground-3 hover:text-ink-1">{e.name}</button></li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Card>

      {!coverage.complete && (
        <div className="flex items-start gap-2 rounded-md border border-line-1 bg-ground-1 px-4 py-3 mb-5">
          <Info size={15} className="shrink-0 mt-0.5 text-accent" aria-hidden="true" />
          <div>
            <p className="t-small text-ink-2 m-0">What this window could not show:</p>
            <ul className="m-0 mt-1 pl-4 t-micro text-ink-3 space-y-0.5">{coverage.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
          </div>
        </div>
      )}

      {state === 'loading' && items.length === 0 && <p className="t-small text-ink-3">Reading filings, figures and the archive…</p>}

      {state !== 'loading' && items.length === 0 && (
        <Card pad="lg">
          <p className="t-body text-ink-2 m-0">Nothing on record changed in this window{list?.ids.length ? ` for ${list.label}` : ''}.</p>
          <p className="t-small text-ink-3 m-0 mt-2">That is what the sources above hold — not a claim that the market was quiet. Widen the window, or watch more companies.</p>
        </Card>
      )}

      <div className="flex flex-col gap-6">
        {days.map(({ date, items: list2 }) => (
          <section key={date}>
            <div className="flex items-baseline gap-3 mb-2 pb-1 border-b border-line-1">
              <h2 className="t-body font-semibold text-ink-1 m-0">{formatDate(date)}</h2>
              <span className="t-micro text-ink-4">{list2.length} change{list2.length === 1 ? '' : 's'}</span>
            </div>
            <ul className="m-0 p-0 list-none flex flex-col">
              {list2.map((c) => (
                <li key={c.id} className="grid grid-cols-[6.5rem_minmax(0,11rem)_minmax(0,1fr)] gap-3 items-baseline py-2 border-b border-line-1 last:border-0">
                  <span className="inline-flex items-center gap-1.5">
                    {seen && c.at > String(seen).slice(0, 10) && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" title="Since your last visit" />}
                    <Tag tone={TONE[c.kind]}>{KINDS[c.kind].label}</Tag>
                  </span>
                  <span className="t-small text-ink-2 truncate" title={c.entityName}>
                    {c.entityId ? <Link to={`/entities/${c.entityId}`} className="text-ink-2 no-underline hover:text-accent">{c.entityName}</Link> : c.entityName}
                  </span>
                  <span className="min-w-0">
                    {c.url?.startsWith('http')
                      ? <a href={c.url} target="_blank" rel="noreferrer" className="t-small text-ink-1 no-underline hover:text-accent inline-flex items-start gap-1">{c.title}<ExternalLink size={10} className="shrink-0 mt-1 text-ink-4" aria-hidden="true" /></a>
                      : c.url ? <Link to={c.url} className="t-small text-ink-1 no-underline hover:text-accent">{c.title}</Link>
                        : <span className="t-small text-ink-1">{c.title}</span>}
                    {c.detail && <span className="block t-micro text-ink-4">{c.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="t-micro text-ink-4 mt-6">
        Filings from EDGAR every six hours ({sources.filings.state === 'ok' ? 'reachable' : 'unreachable'}) · figures from the daily refresh, recorded since {sources.figures.startedAt ? formatDate(String(sources.figures.startedAt).slice(0, 10)) : 'the log began'} · news from the archive since {sources.news.since ? formatDate(sources.news.since) : '—'} · deals and milestones are curated records, dated by announcement.
        {' '}Watchlists live in this browser only.
      </p>

      {items.length > 0 && <PageExport build={build} label="Export this feed — window, watchlist and coverage included" />}
      <p className="t-micro text-ink-4 mt-4 inline-flex items-center gap-1"><Check size={11} aria-hidden="true" />Opening this page marks everything as seen, so the next visit starts here.</p>
    </>
  )
}
