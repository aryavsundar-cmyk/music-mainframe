import { useMemo } from 'react'
import { useUrlFilters } from '../hooks/useUrlFilters.js'
import { Search, X } from 'lucide-react'
import { PageHeader, Stat } from '../components/primitives/index.js'
import { TransactionList } from '../components/money/TransactionRow.jsx'
import { filterTransactions, TX_TYPES, ASSETS, STRUCTURES, YEARS, TX_TOTALS } from '../data/transactions.js'

const KEYS = ['q', 'type', 'asset', 'structure', 'year', 'status']
const chip = (a) => ['inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 t-small cursor-pointer select-none transition-colors duration-100',
  a ? 'bg-ground-4 border-line-3 text-ink-1' : 'bg-transparent border-line-1 text-ink-2 hover:bg-ground-2 hover:text-ink-1'].join(' ')
const select = 'bg-ground-1 border border-line-2 rounded-md h-8 px-2 t-small text-ink-1 focus:border-accent outline-none'

export default function Deals() {
  const { params, set, clear, any, sp } = useUrlFilters(KEYS)
  const rows = useMemo(() => filterTransactions(params), [sp]) // eslint-disable-line react-hooks/exhaustive-deps
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
    </>
  )
}
