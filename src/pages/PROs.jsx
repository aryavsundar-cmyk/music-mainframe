import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { PageHeader, Stat, Tag, Num, Card } from '../components/primitives/index.js'
import { MoneyBar } from '../components/rights/MoneyBar.jsx'
import { listPros, SCOPES, MODELS, REGIONS, GLOBAL_COLLECTIONS, toUsd } from '../data/pros.js'
import { useUrlFilters } from '../hooks/useUrlFilters.js'
import { currencySymbol, format } from '../utils/format.js'
import { PageExport } from '../components/export/PageExport.jsx'
import { buildPageDoc, describeFilters } from '../utils/pageDocs.js'

const chip = (a) => ['inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 t-small cursor-pointer select-none transition-colors duration-100',
  a ? 'bg-ground-4 border-line-3 text-ink-1' : 'bg-transparent border-line-1 text-ink-2 hover:bg-ground-2 hover:text-ink-1'].join(' ')
const TH = 'text-left t-micro uppercase tracking-[0.08em] text-ink-3 font-medium py-2 px-3 border-b border-line-2 whitespace-nowrap'
const TD = 'py-3 px-3 border-b border-line-1 align-top'

export default function PROs() {
  const { params, set, clear, any, sp } = useUrlFilters(['q', 'region', 'scope'])
  const all = useMemo(() => listPros(), [])
  const rows = useMemo(() => listPros(params), [sp]) // eslint-disable-line react-hooks/exhaustive-deps
  const max = Math.max(...all.map((r) => toUsd(r.latest?.collections, r.currency) || 0))
  const disclosed = all.filter((r) => r.latest)
  const totalUsd = disclosed.reduce((s, r) => s + toUsd(r.latest.collections, r.currency), 0)

  return (
    <>
      <PageHeader eyebrow="Rights · collective management" tone="secondary" title="PROs & CMOs"
        lede="Performance, mechanical, and neighbouring-rights societies side by side: what each collects, what it pays out, how it decides who gets what, and what changed. Figures in native currency from each society's own report." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Societies on file" kind="count" value={all.length} opts={{ full: true }} hint={`${disclosed.length} disclose collections`} />
        <Stat label="Latest collections, disclosed" kind="money" value={totalUsd} hint="USD-equivalent for scale only" />
        <Stat label="CISAC music collections 2024" kind="money" value={GLOBAL_COLLECTIONS.music} opts={{ currency: '€' }} hint={<>+<Num kind="pct" value={GLOBAL_COLLECTIONS.musicGrowth} className="t-micro" /> · digital <Num kind="pct" value={GLOBAL_COLLECTIONS.digitalShare} className="t-micro" /></>} />
        <Stat label="Largest by collections" value={disclosed[0]?.e.short || disclosed[0]?.e.name} hint={disclosed[0] ? `${disclosed[0].latest.year} · ${disclosed[0].currency}` : ''} />
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3">
          <label className="relative flex-1 max-w-xl">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true" />
            <input type="search" value={params.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search societies"
              className="w-full h-9 pl-9 pr-3 bg-ground-1 border border-line-2 rounded-md t-body text-ink-1 placeholder:text-ink-4 outline-none focus:border-accent" />
          </label>
          <span className="t-small text-ink-3 tabular">{rows.length} of {all.length}</span>
          {any && <button type="button" onClick={clear} className="inline-flex items-center gap-1 t-small text-ink-3 hover:text-ink-1 bg-transparent border-0 cursor-pointer"><X size={13} aria-hidden="true" /> Clear</button>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={chip(!params.region)} onClick={() => set({ region: '' })}>All regions</button>
          {REGIONS.map((r) => <button key={r} type="button" className={chip(params.region === r)} onClick={() => set({ region: params.region === r ? '' : r })}>{r}<span className="t-micro font-mono text-ink-4">{all.filter((x) => x.region === r).length}</span></button>)}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={chip(!params.scope)} onClick={() => set({ scope: '' })}>All rights</button>
          {Object.entries(SCOPES).map(([k, v]) => <button key={k} type="button" className={chip(params.scope === k)} onClick={() => set({ scope: params.scope === k ? '' : k })}>{v.label}</button>)}
        </div>
      </div>

      <div className="overflow-x-auto -mx-3 mb-10">
        <table className="w-full border-collapse min-w-[900px]">
          <thead><tr>
            <th className={TH}>Society</th><th className={TH}>Rights</th><th className={TH}>Model</th>
            <th className={TH}>Latest collections</th><th className={`${TH} text-right`}>YoY</th><th className={`${TH} text-right`}>Paid out</th><th className={`${TH} text-right`}>Overhead</th><th className={`${TH} text-right`}>Members</th>
          </tr></thead>
          <tbody>
            {rows.map(({ e, ...p }) => {
              const cur = currencySymbol(p.currency)
              return (
                <tr key={e.id} className="hover:bg-ground-2 transition-colors duration-100">
                  <td className={TD}>
                    <Link to={`/pros/${e.id}`} className="t-body text-ink-1 no-underline hover:underline">{e.short && e.short !== e.name ? `${e.name} ` : e.name}</Link>
                    {p.verify && <Tag tone="danger" className="ml-2">verify</Tag>}
                    <div className="t-micro text-ink-3">{p.region} · {e.subtype}</div>
                  </td>
                  <td className={TD}><div className="flex flex-wrap gap-1">{p.scopes.map((s) => <Tag key={s} tone={SCOPES[s].tone}>{SCOPES[s].label.split(' (')[0]}</Tag>)}</div></td>
                  <td className={`${TD} t-small text-ink-2`}>{MODELS[p.model]?.split(',')[0]}</td>
                  <td className={TD}>
                    {p.latest ? <><MoneyBar value={p.latest.collections} currency={cur} share={toUsd(p.latest.collections, p.currency) / max} /><div className="t-micro text-ink-4 mt-0.5">{p.latest.year}{p.currency !== 'USD' ? ` · ${p.currency}` : ''}</div></> : <span className="t-small text-ink-4">{p.seriesNote ? 'not disclosed' : '—'}</span>}
                  </td>
                  <td className={`${TD} text-right`}>{p.growth != null ? <Num kind="pct" value={p.growth} className="t-data" /> : <span className="t-data text-ink-4">—</span>}</td>
                  <td className={`${TD} text-right`}>{p.latestDist ? <Num kind="money" value={p.latestDist.distributions} opts={{ currency: cur, digits: 2 }} className="t-data" /> : <span className="t-data text-ink-4">—</span>}</td>
                  <td className={`${TD} text-right`}>{p.overhead != null ? <Num kind="pct" value={p.overhead} className="t-data text-rate" /> : <span className="t-data text-ink-4">—</span>}</td>
                  <td className={`${TD} text-right`}>{p.members ? <Num kind="count" value={p.members} className="t-data" /> : <span className="t-data text-ink-4">—</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <PageExport build={() => buildPageDoc({
        slug: 'pros-cmos',
        title: 'PROs and CMOs',
        eyebrow: 'Rights · who collects',
        lede: 'Collective management organisations on record: what they license, how they distribute, and what they collected in their latest reported year.',
        filters: describeFilters(params, { q: { label: 'Search' }, region: { label: 'Region', format: (v) => REGIONS[v] || v }, scope: { label: 'Rights', format: (v) => SCOPES[v]?.label || v } }),
        sort: 'Latest collections, largest first',
        stats: [
          { label: 'In this view', value: String(rows.length) },
          { label: 'Collections here (USD equiv.)', value: format.money(rows.filter((r) => r.latest).reduce((s, r) => s + toUsd(r.latest.collections, r.currency), 0)) },
          { label: 'On record', value: String(all.length) },
          { label: 'CISAC music collections 2024', value: format.money(GLOBAL_COLLECTIONS.music) },
        ],
        columns: ['Society', 'Region', 'Rights', 'Model', 'Latest collections', 'Year', 'YoY', 'Paid out', 'Overhead', 'Members'],
        rows: rows.map(({ e, ...p }) => [e.name, p.region || '', (p.scopes || []).map((s) => SCOPES[s]?.label || s).join(' · '), MODELS[p.model] || p.model || '', p.latest ? `${currencySymbol(p.currency)}${format.count(p.latest.collections)}` : '', p.latest?.year ? String(p.latest.year) : '', p.growth != null ? format.pct(p.growth) : '', p.latestDist ? `${currencySymbol(p.currency)}${format.count(p.latestDist.distributions)}` : '', p.overhead != null ? format.pct(p.overhead) : '', p.members ? format.count(p.members) : '']),
        total: all.length,
        notes: ['Collections are reported in each society\u2019s own currency; the summary converts at the rates in data/pros.js for comparison only.', GLOBAL_COLLECTIONS.note],
      })} />

      <Card pad="lg" className="max-w-3xl">
        <div className="t-eyebrow text-publishing mb-2">Global context</div>
        <p className="t-body text-ink-2 m-0">{GLOBAL_COLLECTIONS.note}</p>
        <a href={GLOBAL_COLLECTIONS.source.url} target="_blank" rel="noreferrer" className="t-small text-ink-3 no-underline hover:text-accent mt-2 inline-block">{GLOBAL_COLLECTIONS.source.label}</a>
      </Card>
    </>
  )
}
