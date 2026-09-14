import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, X, ArrowRight } from 'lucide-react'
import { PageHeader, Stat, Card, Tag, Num } from '../components/primitives/index.js'
import { listFunds, FUND_KINDS, MONEY_TYPES, kindOf } from '../data/peFunds.js'
import { OWNERSHIP } from '../data/entities.js'
import { useUrlFilters } from '../hooks/useUrlFilters.js'

const chip = (a) => ['inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 t-small cursor-pointer select-none transition-colors duration-100',
  a ? 'bg-ground-4 border-line-3 text-ink-1' : 'bg-transparent border-line-1 text-ink-2 hover:bg-ground-2 hover:text-ink-1'].join(' ')

export default function PE() {
  const { params, set, clear, any, sp } = useUrlFilters(['q', 'kind'])
  const all = useMemo(() => listFunds(), [])
  const rows = useMemo(() => listFunds(params), [sp]) // eslint-disable-line react-hooks/exhaustive-deps
  const groups = MONEY_TYPES.map((k) => [k, rows.filter((r) => kindOf(r.e) === k)]).filter(([, l]) => l.length)

  return (
    <>
      <PageHeader eyebrow="Money · who holds the capital" title="PE funds & capital"
        lede="Catalog investors, sponsors, credit and ABS players, and strategic holders — with thesis, structure preference, portfolio, exits, and every transaction on file." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Money-side actors" kind="count" value={all.length} opts={{ full: true }} />
        <Stat label="With investment profile" kind="count" value={all.filter((r) => r.hasProfile).length} opts={{ full: true }} />
        <Stat label="Deal volume on file" kind="money" value={all.reduce((s, r) => s + r.dealVolume, 0)} hint="double-counts both sides; use for ranking only" />
        <Stat label="ABS issuers on file" kind="count" value={all.filter((r) => r.absIssued.length).length} opts={{ full: true }} />
      </div>

      <div className="space-y-3 mb-8">
        <div className="flex items-center gap-3">
          <label className="relative flex-1 max-w-xl">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true" />
            <input type="search" value={params.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search funds, sponsors, lenders"
              className="w-full h-9 pl-9 pr-3 bg-ground-1 border border-line-2 rounded-md t-body text-ink-1 placeholder:text-ink-4 outline-none focus:border-accent" />
          </label>
          <span className="t-small text-ink-3 tabular">{rows.length} of {all.length}</span>
          {any && <button type="button" onClick={clear} className="inline-flex items-center gap-1 t-small text-ink-3 hover:text-ink-1 bg-transparent border-0 cursor-pointer"><X size={13} aria-hidden="true" /> Clear</button>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={chip(!params.kind)} onClick={() => set({ kind: '' })}>All</button>
          {MONEY_TYPES.map((k) => <button key={k} type="button" className={chip(params.kind === k)} onClick={() => set({ kind: params.kind === k ? '' : k })}>{FUND_KINDS[k].label}<span className="t-micro font-mono text-ink-4">{all.filter((r) => kindOf(r.e) === k).length}</span></button>)}
        </div>
      </div>

      {groups.length === 0 && <div className="py-12 text-center t-body text-ink-3">Nothing matches.</div>}
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
    </>
  )
}
