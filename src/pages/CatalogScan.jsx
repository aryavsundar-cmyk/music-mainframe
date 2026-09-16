import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ExternalLink, Search, X } from 'lucide-react'
import { PageHeader, Card, Tag } from '../components/primitives/index.js'
import { ExportBar } from '../components/export/ExportBar.jsx'
import { selectClass } from '../components/prospecting/ProspectUi.jsx'
import { LimitNote } from '../components/prospecting/LimitNote.jsx'
import { ConnectorStatus } from '../components/prospecting/ConnectorStatus.jsx'
import { useEnrichment } from '../hooks/useEnrichment.js'
import { filterCatalogs, marketStats, scanCatalogs, OWNER_BEHAVIOUR } from '../utils/catalogScan.js'
import { buildCatalogScan } from '../utils/marketDocs.js'
import { ASSETS } from '../data/transactions.js'
import { fmtM } from '../utils/valuation.js'
import { useUrlFilters } from '../hooks/useUrlFilters.js'

const money = (v) => (!v ? '—' : v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : fmtM(v, 0))
const BANDS = { live: { label: 'Live signal', tone: 'danger' }, watch: { label: 'Worth watching', tone: 'accent' }, quiet: { label: 'Quiet', tone: 'neutral' } }

export default function CatalogScan() {
  const { params, set, clear, any } = useUrlFilters(['q', 'asset', 'owner', 'band', 'genre', 'row'])
  const { news, filings, connectors, ready } = useEnrichment()
  const rows = useMemo(() => scanCatalogs({ news, filings }), [news, filings])
  const stats = useMemo(() => marketStats(rows), [rows])
  const shown = filterCatalogs(rows, params)
  const selected = rows.find((r) => r.id === params.row) || null

  return (
    <>
      <PageHeader eyebrow="Market · demand side" title="Catalog scan"
        lede="Every catalog holding the app can trace to a sourced transaction, scored on how likely it is to come to market — from how that kind of owner behaves, how long they have held it, refinancing dates ahead, and sale-intent language in the live feed."
        actions={<span className="t-micro text-ink-4">{!ready ? 'Loading enrichment…' : connectors.length ? `${connectors.filter((c) => c.live).length}/${connectors.length} connectors live` : 'Enrichment unreachable'}</span>} />

      <LimitNote ids={['availability']} className="mb-6" />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[['Holdings tracked', stats.holdings], ['Live signal', stats.live], ['Worth watching', stats.watch], ['Owners', stats.owners], ['Disclosed value', money(stats.tracked)]].map(([label, value]) => (
          <Card key={label} pad="md"><div className="t-micro uppercase tracking-[0.08em] text-ink-3">{label}</div><div className="t-stat text-ink-1">{value}</div></Card>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-4" aria-hidden="true" />
          <input value={params.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search holdings, owners, sellers" aria-label="Search holdings"
            className="bg-ground-1 border border-line-2 rounded-md h-8 pl-8 pr-2 t-small text-ink-1 placeholder:text-ink-4 focus:border-accent outline-none w-64" />
        </div>
        <select value={params.asset} onChange={(e) => set({ asset: e.target.value })} className={`${selectClass} w-44`} aria-label="Asset type">
          <option value="">Any asset</option>
          {Object.entries(ASSETS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <select value={params.owner} onChange={(e) => set({ owner: e.target.value })} className={`${selectClass} w-52`} aria-label="Owner kind">
          <option value="">Any owner</option>
          {Object.entries(OWNER_BEHAVIOUR).map(([id, b]) => <option key={id} value={id}>{b.label}</option>)}
        </select>
        <select value={params.band} onChange={(e) => set({ band: e.target.value })} className={`${selectClass} w-40`} aria-label="Availability">
          <option value="">Any signal</option>
          {Object.entries(BANDS).map(([id, b]) => <option key={id} value={id}>{b.label}</option>)}
        </select>
        <select value={params.genre} onChange={(e) => set({ genre: e.target.value })} className={`${selectClass} w-40`} aria-label="Genre tag">
          <option value="">Any tag</option>
          {stats.genres.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <span className="t-small text-ink-3 font-mono tabular">{shown.length}</span>
        {any && <button type="button" onClick={clear} className="t-small text-secondary bg-transparent border-0 cursor-pointer px-0">Clear</button>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,400px)] gap-6 items-start">
        <Card pad="md">
          <div className="overflow-x-auto -mx-2.5">
            <table className="w-full border-collapse" style={{ minWidth: 760 }}>
              <thead><tr>{['Holding', 'Owner', 'Asset', 'Value', 'Held', 'Signal'].map((h) => <th key={h} className="text-left t-micro uppercase tracking-[0.08em] text-ink-3 font-medium py-2 px-2.5 border-b border-line-2 whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {shown.slice(0, 80).map((r) => (
                  <tr key={r.id} className={`cursor-pointer ${r.id === params.row ? 'bg-ground-3' : 'hover:bg-ground-2'}`} onClick={() => set({ row: r.id === params.row ? '' : r.id })}>
                    <td className="py-2 px-2.5 border-b border-line-1">
                      <span className="t-small text-ink-1 block max-w-[360px] truncate">{r.label}</span>
                      <span className="t-micro text-ink-4">{r.genres.length ? r.genres.map((g) => g.tag).join(' · ') : 'no genre in the sourced text'}</span>
                    </td>
                    <td className="py-2 px-2.5 border-b border-line-1"><span className="t-small text-ink-2 block">{r.owner}</span><span className="t-micro text-ink-4">{OWNER_BEHAVIOUR[r.ownerKind].label}</span></td>
                    <td className="py-2 px-2.5 border-b border-line-1"><span className="t-micro text-ink-3">{ASSETS[r.asset] || r.asset}</span></td>
                    <td className="py-2 px-2.5 border-b border-line-1 font-mono tabular t-data text-money whitespace-nowrap">{money(r.value)}</td>
                    <td className="py-2 px-2.5 border-b border-line-1 font-mono tabular t-data text-ink-3 whitespace-nowrap">{r.availability.years != null ? `${r.availability.years.toFixed(1)}y` : '—'}</td>
                    <td className="py-2 px-2.5 border-b border-line-1">
                      <span className="inline-flex items-center gap-2">
                        <Tag tone={BANDS[r.availability.band].tone}>{BANDS[r.availability.band].label}</Tag>
                        <span className="font-mono tabular t-data text-ink-1">{r.availability.score}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!shown.length && <p className="t-body text-ink-3 m-0 py-6 text-center">No holdings match these filters.</p>}
        </Card>

        <div className="xl:sticky xl:top-6 space-y-4">
          {selected ? <HoldingPanel row={selected} onClose={() => set({ row: '' })} />
            : <Card pad="lg"><p className="t-body text-ink-3 m-0">Pick a holding to see why it scores, the sources behind it, and which buyers would fit.</p></Card>}
          <ExportBar title="Export the scan" build={() => buildCatalogScan(shown, any ? 'Filtered view' : 'All tracked holdings')} />
          <ConnectorStatus connectors={connectors} ready={ready} />
        </div>
      </div>

      <p className="t-micro text-ink-4 mt-6">Genre tags come only from words that appear in the sourced text, so many rows are honestly untagged.</p>
    </>
  )
}

function HoldingPanel({ row, onClose }) {
  const buyerLink = `/market/buyers?asset=${row.asset === 'n/a' ? '' : row.asset}&size=${row.value || ''}&genre=${row.genres[0]?.tag || ''}`
  return (
    <Card pad="lg" className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Tag tone={BANDS[row.availability.band].tone}>{BANDS[row.availability.band].label} · {row.availability.score}</Tag>
          <h3 className="t-h3 text-ink-1 m-0 mt-2">{row.label}</h3>
          <p className="t-small text-ink-3 m-0 mt-1">{row.owner} · {OWNER_BEHAVIOUR[row.ownerKind].label}{row.soldBy ? ` · bought from ${row.soldBy}` : ''}</p>
        </div>
        <button type="button" onClick={onClose} className="text-ink-4 hover:text-ink-1 bg-transparent border-0 cursor-pointer p-1 shrink-0" aria-label="Close panel"><X size={16} /></button>
      </div>
      {row.summary && <p className="t-small text-ink-2 m-0">{row.summary}</p>}
      <div>
        <div className="t-eyebrow text-ink-3 mb-2">Why it scores</div>
        <ul className="m-0 pl-4 t-small text-ink-2 space-y-1">{row.availability.reasons.map((x) => <li key={x}>{x}</li>)}</ul>
      </div>
      {row.availability.intents.length > 0 && (
        <div>
          <div className="t-eyebrow text-ink-3 mb-2">Live signals</div>
          <div className="space-y-1.5">
            {row.availability.intents.slice(0, 4).map((i) => (
              <div key={i.title} className="t-small text-ink-2">
                <span className="t-micro font-mono text-ink-4 mr-2">{i.date}</span>
                <a href={i.url} target="_blank" rel="noreferrer" className="text-ink-1 no-underline hover:text-accent">{i.title}</a>
                <span className="t-micro text-accent ml-2">“{i.matched}”</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-3 pt-3 border-t border-line-1">
        <Link to={`/entities/${row.ownerId}`} className="t-small text-accent no-underline inline-flex items-center gap-1">Owner <ArrowUpRight size={12} aria-hidden="true" /></Link>
        <Link to={buyerLink} className="t-small text-secondary no-underline inline-flex items-center gap-1">Who would buy this <ArrowUpRight size={12} aria-hidden="true" /></Link>
        {(row.sources || []).slice(0, 2).map((s) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="t-small text-ink-3 no-underline inline-flex items-center gap-1 hover:text-ink-1">{s.label.slice(0, 28)} <ExternalLink size={11} aria-hidden="true" /></a>)}
      </div>
    </Card>
  )
}
