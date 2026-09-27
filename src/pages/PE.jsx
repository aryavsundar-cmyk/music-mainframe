import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { PageHeader, FilterBar, KeyFigures, Card, Tag, Num, Chip, EmptyState, EmptyAction } from '../components/primitives/index.js'
import { listFunds, FUND_KINDS, MONEY_TYPES, kindOf } from '../data/peFunds.js'
import { OWNERSHIP } from '../data/entities.js'
import { useUrlFilters } from '../hooks/useUrlFilters.js'
import { PageExport } from '../components/export/PageExport.jsx'
import { buildPageDoc, describeFilters } from '../utils/pageDocs.js'
import { format } from '../utils/format.js'


export default function PE() {
  const { params, set, clear, sp } = useUrlFilters(['q', 'kind'])
  const all = useMemo(() => listFunds(), [])
  const rows = useMemo(() => listFunds(params), [sp]) // eslint-disable-line react-hooks/exhaustive-deps
  const groups = MONEY_TYPES.map((k) => [k, rows.filter((r) => kindOf(r.e) === k)]).filter(([, l]) => l.length)

  return (
    <>
      <PageHeader eyebrow="Money · who holds the capital" title="PE funds & capital"
        answer={<KeyFigures items={[
          { value: format.count(all.length, { full: true }), label: 'money-side actors' },
          { value: format.count(all.filter((r) => r.hasProfile).length, { full: true }), label: 'with an investment profile' },
          { value: format.money(all.reduce((sum, r) => sum + r.dealVolume, 0)), label: 'deal volume on file' },
          { value: format.count(all.filter((r) => r.absIssued.length).length, { full: true }), label: 'ABS issuers', to: '/abs' },
        ]} />}
        lede="Catalog investors, sponsors, credit and ABS players and strategic holders — with thesis, structure preference, portfolio and every transaction on file. Deal volume double-counts both sides; use it for ranking only." />
      <FilterBar
        search={{ value: params.q, onChange: (v) => set({ q: v }), placeholder: 'Search funds, sponsors, lenders' }}
        active={[
          params.q && { key: 'q', label: `“${params.q}”`, onRemove: () => set({ q: '' }) },
          params.kind && { key: 'kind', label: FUND_KINDS[params.kind]?.label || params.kind, onRemove: () => set({ kind: '' }) },
        ].filter(Boolean)}
        onClear={clear}
        count={{ shown: rows.length, total: all.length, noun: 'money-side actors' }}
      >
        <div className="flex items-start gap-2">
          <span className="t-micro text-ink-4 w-16 shrink-0 pt-1.5">Kind</span>
          <div className="flex flex-wrap gap-1.5">
            <Chip pressed={!params.kind} onClick={() => set({ kind: '' })}>All</Chip>
            {MONEY_TYPES.map((k) => <Chip key={k} pressed={params.kind === k} onClick={() => set({ kind: params.kind === k ? '' : k })}>{FUND_KINDS[k].label}<span className="t-micro font-mono text-ink-3">{all.filter((r) => kindOf(r.e) === k).length}</span></Chip>)}
          </div>
        </div>
      </FilterBar>

      {groups.length === 0 && <EmptyState title="No fund or sponsor matches these filters." why="Every money-side actor on the canvas is here; the filters have narrowed it to none." action={<EmptyAction onClick={clear}>Clear the filters</EmptyAction>} />}
      {groups.map(([k, list]) => (
        <section key={k} className="mb-12">
          <div className="flex items-baseline gap-3 mb-1"><span className="t-eyebrow text-accent">{FUND_KINDS[k].label}</span><span className="t-micro font-mono text-ink-4">{list.length}</span></div>
          <p className="t-small text-ink-3 mb-4">{FUND_KINDS[k].blurb}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {list.map(({ e, thesis, dealVolume, deals, absIssued, hasProfile }) => (
              <Link key={e.id} to={`/pe/${e.id}`} className="no-underline">
                <Card interactive pad="md" className="h-full flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="t-h3 text-ink-1">{e.name}</div>
                    {e.status !== 'active' && <Tag tone="neutral">{e.status}</Tag>}
                  </div>
                  <div className="t-micro text-ink-3 mb-2">{e.subtype || OWNERSHIP[e.ownership]}{e.ticker ? ` · ${e.ticker}` : ''}</div>
                  <p className="t-small text-ink-2 m-0 flex-1 line-clamp-3">{thesis || e.summary}</p>
                  <div className="flex items-end justify-between mt-3 pt-3 border-t border-line-1">
                    <div className="flex gap-3 t-micro text-ink-4">
                      <span><span className="font-mono text-ink-2">{deals.length}</span> deals</span>
                      {absIssued.length > 0 && <span><span className="font-mono text-ink-2">{absIssued.length}</span> ABS</span>}
                      {!hasProfile && <span>base record</span>}
                    </div>
                    <span className="inline-flex items-center gap-1 t-small"><Num kind="money" value={dealVolume || null} className="t-data" /><ArrowRight size={13} className="text-ink-4" aria-hidden="true" /></span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
      <PageExport build={() => buildPageDoc({
        slug: 'money-side-actors',
        title: 'PE funds and money-side actors',
        eyebrow: 'Money · who is funding it',
        lede: 'Sponsors, catalog funds, credit providers and strategics on record, with the deals and securitisations attributed to each.',
        filters: describeFilters(params, { q: { label: 'Search' }, kind: { label: 'Kind', format: (v) => FUND_KINDS[v]?.label || v } }),
        sort: 'Grouped by kind, then deal volume',
        stats: [
          { label: 'In this view', value: String(rows.length) },
          { label: 'With an investment profile', value: String(rows.filter((r) => r.hasProfile).length) },
          { label: 'Deal volume here', value: format.money(rows.reduce((a, r) => a + (r.dealVolume || 0), 0)) },
          { label: 'On record', value: String(all.length) },
        ],
        columns: ['Actor', 'Kind', 'Ownership', 'Deals on file', 'ABS issued', 'Deal volume', 'Thesis'],
        rows: rows.map((r) => [r.e.name, FUND_KINDS[kindOf(r.e)]?.label || kindOf(r.e), r.e.subtype || OWNERSHIP[r.e.ownership] || '', String(r.deals.length), String(r.absIssued.length), r.dealVolume ? format.money(r.dealVolume) : '', (r.thesis || r.e.summary || '').slice(0, 220)]),
        total: all.length,
      })} />
    </>
  )
}
