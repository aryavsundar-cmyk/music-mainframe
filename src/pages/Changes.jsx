import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, X, Info, Check } from 'lucide-react'
import { PageHeader, Card, FilterBar, KeyFigures, Chip, Segmented, SearchInput, Loading } from '../components/primitives/index.js'
import { useUrlFilters } from '../hooks/useUrlFilters.js'
import { useChanges } from '../hooks/useChanges.js'
import { ChangeList } from '../components/changes/ChangeList.jsx'
import { KINDS, KIND_LIST, WINDOWS, DEFAULT_WINDOW, byDay } from '../utils/changes.js'
import { readLists, saveLists, addList, removeList, getList, markSeen, lastSeen } from '../utils/watchlist.js'
import { searchEntities } from '../utils/compare.js'
import { getEntity } from '../data/entities.js'
import { formatDate } from '../utils/format.js'
import { PageExport } from '../components/export/PageExport.jsx'
import { buildPageDoc, describeFilters } from '../utils/pageDocs.js'


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
        answer={<KeyFigures items={[
          { value: String(items.length), label: `changes since ${formatDate(from)}` },
          ...KIND_LIST.filter((k) => counts[k.id]).map((k) => ({ value: String(counts[k.id]), label: k.label.toLowerCase() })),
        ]} />}
        lede={`Filings, figures that moved, deals and milestones on record — one dated feed.${seen ? ` This browser last opened it on ${formatDate(String(seen).slice(0, 10))}; anything since is marked new.` : ''}`}
        actions={<Link to="/news" className="t-small text-ink-2 no-underline hover:text-ink-1">The full news feed →</Link>} />

      <FilterBar
        active={[
          ...kinds.map((k) => ({ key: `kind-${k}`, label: KINDS[k]?.label || k, onRemove: () => toggleKind(k) })),
          list && list.ids.length ? { key: 'list', label: `${list.label}: ${list.ids.length} companies`, onRemove: () => set({ list: 'all' }) } : null,
        ].filter(Boolean)}
        onClear={() => set({ kind: '', list: 'all' })}
        count={{ shown: items.length, total: items.length + newsHidden, noun: 'changes' }}
        aside={<Segmented label="Window" value={win.id} onChange={(id) => set({ w: id })} options={WINDOWS.map((w) => ({ id: w.id, label: w.label }))} />}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <span className="t-micro text-ink-4 w-20 shrink-0 pt-1.5">Show</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip pressed={kinds.length === 0} onClick={() => set({ kind: '' })} title={`Changes to the record. News is not included by default — ${KINDS.news.hint}`}>Changes to the record</Chip>
              <Chip pressed={kinds.length === KIND_LIST.length} onClick={() => set({ kind: KIND_LIST.map((k) => k.id).join(',') })}>Everything, news included</Chip>
              {KIND_LIST.map((k) => (
                <Chip pressed={kinds.includes(k.id)} key={k.id} onClick={() => toggleKind(k.id)} title={k.hint}>
                  {k.label}<span className="t-micro font-mono text-ink-3">{counts[k.id] || 0}</span>
                </Chip>
              ))}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="t-micro text-ink-4 w-20 shrink-0 pt-1.5">Watching</span>
            <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Chip pressed={params.list === 'all'} onClick={() => set({ list: 'all' })}>All companies</Chip>
          {lists.map((l) => (
            <span key={l.id} className="inline-flex items-center">
              <Chip pressed={!params.list ? l.id === lists[0].id : params.list === l.id} onClick={() => set({ list: l.id })}>
                {l.label}<span className="t-micro font-mono text-ink-4">{l.ids.length || 'all'}</span>
              </Chip>
              {lists.length > 1 && (
                <button type="button" onClick={() => setLists(removeList(readLists(), l.id))} aria-label={`Delete the list ${l.label}`}
                  className="ml-1 bg-transparent border-0 p-0 cursor-pointer text-ink-4 hover:text-danger"><X size={12} aria-hidden="true" /></button>
              )}
            </span>
          ))}
          <Chip pressed={false} onClick={() => { const { lists: next, id } = addList(readLists(), `List ${lists.length + 1}`); setLists(next); set({ list: id }) }}>
            <Plus size={12} aria-hidden="true" />New list
          </Chip>
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
              <SearchInput value={q} onChange={setQ} size="sm" icon={false}
                placeholder="Add a company to this list…" label="Add a company to this watchlist" />
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
            </div>
          </div>
        </div>
      </FilterBar>

      {!coverage.complete && (
        <div className="flex items-start gap-2 rounded-md border border-line-1 bg-ground-1 px-4 py-3 mb-5">
          <Info size={15} className="shrink-0 mt-0.5 text-accent" aria-hidden="true" />
          <div>
            <p className="t-small text-ink-2 m-0">What this window could not show:</p>
            <ul className="m-0 mt-1 pl-4 t-micro text-ink-3 space-y-0.5">{coverage.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
          </div>
        </div>
      )}

      {state === 'loading' && items.length === 0 && <Loading what="Reading filings, figures and the archive…" lines={6} className="mb-6" />}

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
            <ChangeList items={list2} layout="grouped" seen={seen} />
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
