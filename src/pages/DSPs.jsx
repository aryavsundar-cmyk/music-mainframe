import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ExternalLink, Search, X } from 'lucide-react'
import { PageHeader, SectionHeader, Stat, Tag, Num, Card } from '../components/primitives/index.js'
import { listDsps, TIERS, TIER_ORDER, PAYOUT_MODELS, MARKET } from '../data/fundamentals.js'
import { getEntity } from '../data/entities.js'
import { useUrlFilters } from '../hooks/useUrlFilters.js'
import { formatDate, format } from '../utils/format.js'
import { PageExport } from '../components/export/PageExport.jsx'
import { buildPageDoc, describeFilters } from '../utils/pageDocs.js'

const rate = (v) => '$' + v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')

const chip = (a) => ['inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 t-small cursor-pointer select-none transition-colors duration-100',
  a ? 'bg-ground-4 border-line-3 text-ink-1' : 'bg-transparent border-line-1 text-ink-2 hover:bg-ground-2 hover:text-ink-1'].join(' ')
const MODEL_TONE = { 'pro-rata': 'neutral', 'artist-centric': 'publishing', 'user-centric': 'publishing', statutory: 'recording', 'lump-sum': 'accent', direct: 'secondary' }

function Row({ e, p }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-line-1">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full text-left grid grid-cols-[minmax(0,1.6fr)_1fr_1fr_1fr_1fr_24px] gap-4 items-center py-3 bg-transparent border-0 cursor-pointer -mx-2 px-2 rounded-md hover:bg-ground-1 transition-colors duration-100">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><span className="t-body text-ink-1">{e.name}</span>{p.verify && <Tag tone="danger">verify</Tag>}</div>
          <div className="t-micro text-ink-3 truncate">{e.subtype}{e.ticker ? ` · ${e.ticker}` : ''}</div>
        </div>
        <div><Tag tone={MODEL_TONE[p.model]}>{p.model}</Tag></div>
        <div className="text-right"><Num kind="count" value={p.subscribers} className="t-data" /><div className="t-micro text-ink-4">{p.subscribers ? 'subs' : p.mau ? <><Num kind="count" value={p.mau} className="t-micro" /> MAU</> : ''}</div></div>
        <div className="text-right">{p.priceUS != null ? <><Num kind="rate" value={p.priceUS} opts={{ digits: 2 }} className="t-data" /><div className="t-micro text-ink-4">US / mo</div></> : <span className="t-data text-ink-4">—</span>}</div>
        <div className="text-right">{p.perStream ? <><span className="t-data text-rate whitespace-nowrap">{rate(p.perStream[0])}–{rate(p.perStream[1]).slice(1)}</span><div className="t-micro text-ink-4">per stream</div></> : <span className="t-data text-ink-4">—</span>}</div>
        <ChevronDown size={14} className={`text-ink-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="pb-5 pt-1 px-2 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6">
          <div className="space-y-4">
            <p className="t-body text-ink-2 m-0">{p.posture || e.summary}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {p.marketShare != null && <Stat label="Subscriber share" kind="pct" value={p.marketShare} size="sm" hint={p.marketShareAsOf} />}
              {p.shareToRights != null && <Stat label="To rights holders" kind="pct" value={p.shareToRights} size="sm" hint="of net revenue (approx.)" />}
              {p.arpu != null && <Stat label="Premium ARPU" kind="rate" value={p.arpu} opts={{ currency: p.arpuCurrency === 'EUR' ? '€' : '$', digits: 2 }} size="sm" hint={p.arpuNote} />}
              {p.payouts2025 != null && <Stat label="Paid to rights holders 2025" kind="money" value={p.payouts2025} size="sm" />}
            </div>
            {(p.priceNote || p.subscribersNote) && <div className="t-small text-ink-3 space-y-0.5">{p.priceNote && <div>Price: {p.priceNote}</div>}{p.subscribersNote && <div>Subscribers: {p.subscribersNote}</div>}</div>}
            <div className="t-small text-ink-3">{PAYOUT_MODELS[p.model]}</div>
          </div>
          <div className="space-y-3">
            {p.shifts.length > 0 && <div><div className="t-micro uppercase tracking-[0.08em] text-ink-3 mb-1.5">Recent shifts</div><div className="space-y-1.5">{p.shifts.map((s) => <div key={s.date + s.text} className="grid grid-cols-[64px_minmax(0,1fr)] gap-2 t-small"><span className="t-data text-ink-4">{formatDate(s.date)}</span><span className="text-ink-2">{s.text}</span></div>)}</div></div>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 t-micro">{p.sources.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="text-ink-3 no-underline hover:text-accent inline-flex items-center gap-1">{s.label} <ExternalLink size={10} aria-hidden="true" /></a>)}<Link to={`/entities/${e.id}`} className="text-secondary no-underline hover:underline">entity record</Link></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DSPs() {
  const { params, set, clear, any, sp } = useUrlFilters(['q', 'tier', 'model'])
  const all = useMemo(() => listDsps(), [])
  const rows = useMemo(() => listDsps(params), [sp]) // eslint-disable-line react-hooks/exhaustive-deps
  const groups = TIER_ORDER.map((t) => [t, rows.filter((r) => r.tier === t)]).filter(([, l]) => l.length)
  const { ifpi, midia, splits, mechanicalRate } = MARKET
  const other = 100 - midia.shares.reduce((s, [, v]) => s + v, 0)

  return (
    <>
      <PageHeader eyebrow="Rights · distribution economics" tone="secondary" title="DSPs"
        lede="Streaming economics by platform: who pays what per stream, on which model, at what price, to how many. Per-stream figures are commonly cited all-in ranges, never contractual rates; treat them as order of magnitude." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label={`Recorded music ${ifpi.year} (IFPI)`} kind="money" value={ifpi.recordedRevenue} hint={<>+<Num kind="pct" value={ifpi.growth} className="t-micro" /> · streaming <Num kind="pct" value={ifpi.streamingShare} className="t-micro" /></>} />
        <Stat label="Paid subscription users (IFPI)" kind="count" value={ifpi.paidUsers} hint={<>subscription <Num kind="pct" value={ifpi.subscriptionShare} className="t-micro" /> of revenue</>} />
        <Stat label="Subscribers (MIDiA)" kind="count" value={midia.subscribers} hint={<>+<Num kind="pct" value={midia.growth} className="t-micro" /> · {midia.asOf}</>} />
        <Stat label="US streaming mechanical" value="15.35%" hint="of service revenue by 2027 (Phono IV)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8 mb-12 items-start">
        <Card pad="lg">
          <div className="t-eyebrow text-ink-3 mb-4">Subscriber share · {midia.asOf}</div>
          <div className="h-3 rounded-sm overflow-hidden flex bg-ground-3">
            {midia.shares.map(([id, v], i) => <div key={id} className={i % 2 ? 'bg-secondary' : 'bg-accent'} style={{ width: `${v}%`, opacity: 1 - i * 0.12 }} title={`${getEntity(id)?.name} ${v}%`} />)}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
            {midia.shares.map(([id, v], i) => <span key={id} className="t-small text-ink-2 inline-flex items-center gap-1.5"><span className={`inline-block w-2 h-2 rounded-sm ${i % 2 ? 'bg-secondary' : 'bg-accent'}`} style={{ opacity: 1 - i * 0.12 }} />{getEntity(id)?.short || getEntity(id)?.name} <Num kind="pct" value={v} className="t-micro" /></span>)}
            <span className="t-small text-ink-3">others <Num kind="pct" value={other} className="t-micro" /></span>
          </div>
          <p className="t-micro text-ink-4 mt-4 mb-0">{midia.note} <a href={midia.source.url} target="_blank" rel="noreferrer" className="text-ink-3 no-underline hover:text-accent">{midia.source.label}</a></p>
        </Card>
        <Card pad="lg">
          <div className="t-eyebrow text-ink-3 mb-4">Where a paid stream goes</div>
          <div className="h-3 rounded-sm overflow-hidden flex">
            <div className="bg-recording" style={{ width: `${splits.recording}%` }} title="recording" /><div className="bg-publishing" style={{ width: `${splits.publishing}%` }} title="publishing" /><div className="bg-ground-4" style={{ width: `${splits.dsp}%` }} title="DSP" />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 t-small">
            <div><Num kind="pct" value={splits.recording} opts={{ digits: 0 }} className="t-data text-recording" /><div className="t-micro text-ink-3">recording</div></div>
            <div><Num kind="pct" value={splits.publishing} opts={{ digits: 0 }} className="t-data text-publishing" /><div className="t-micro text-ink-3">publishing</div></div>
            <div><Num kind="pct" value={splits.dsp} opts={{ digits: 0 }} className="t-data text-ink-2" /><div className="t-micro text-ink-3">DSP keeps</div></div>
          </div>
          <p className="t-micro text-ink-4 mt-3 mb-0">{splits.note}</p>
          <div className="mt-4 pt-3 border-t border-line-1 t-micro text-ink-3"><span className="text-ink-2">Mechanical:</span> {mechanicalRate.current}. {mechanicalRate.next}. <a href={mechanicalRate.source.url} target="_blank" rel="noreferrer" className="no-underline hover:text-accent">{mechanicalRate.source.label}</a></div>
        </Card>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3">
          <label className="relative flex-1 max-w-xl">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true" />
            <input type="search" value={params.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search platforms"
              className="w-full h-9 pl-9 pr-3 bg-ground-1 border border-line-2 rounded-md t-body text-ink-1 placeholder:text-ink-4 outline-none focus:border-accent" />
          </label>
          <span className="t-small text-ink-3 tabular">{rows.length} of {all.length}</span>
          {any && <button type="button" onClick={clear} className="inline-flex items-center gap-1 t-small text-ink-3 hover:text-ink-1 bg-transparent border-0 cursor-pointer"><X size={13} aria-hidden="true" /> Clear</button>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={chip(!params.tier)} onClick={() => set({ tier: '' })}>All tiers</button>
          {TIER_ORDER.map((t) => <button key={t} type="button" className={chip(params.tier === t)} onClick={() => set({ tier: params.tier === t ? '' : t })}>{TIERS[t]}<span className="t-micro font-mono text-ink-4">{all.filter((r) => r.tier === t).length}</span></button>)}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={chip(!params.model)} onClick={() => set({ model: '' })}>All payout models</button>
          {Object.keys(PAYOUT_MODELS).map((m) => <button key={m} type="button" className={chip(params.model === m)} onClick={() => set({ model: params.model === m ? '' : m })}>{m}</button>)}
        </div>
      </div>

      {groups.length === 0 && <div className="py-12 text-center t-body text-ink-3">Nothing matches.</div>}
      {groups.map(([t, list]) => (
        <section key={t} className="mb-10">
          <SectionHeader eyebrow={TIERS[t]} tone="secondary" title={TIERS[t].split(' (')[0]} aside={`${list.length}`} />
          <div className="grid grid-cols-[minmax(0,1.6fr)_1fr_1fr_1fr_1fr_24px] gap-4 t-micro uppercase tracking-[0.08em] text-ink-4 px-0 pb-1"><span>Platform</span><span>Payout model</span><span className="text-right">Scale</span><span className="text-right">Price</span><span className="text-right">All-in rate</span><span /></div>
          <div className="border-t border-line-1">{list.map(({ e, ...p }) => <Row key={e.id} e={e} p={p} />)}</div>
        </section>
      ))}
      <PageExport build={() => buildPageDoc({
        slug: 'dsps',
        title: 'DSPs',
        eyebrow: 'Rights · where it is consumed',
        lede: 'Streaming platforms and other digital service providers: how each pays rightsholders, what it charges, and the all-in per-stream range on record.',
        filters: describeFilters(params, { q: { label: 'Search' }, tier: { label: 'Tier', format: (v) => TIERS[v] || v }, model: { label: 'Payout model', format: (v) => PAYOUT_MODELS[v]?.label || v } }),
        sort: 'Grouped by tier',
        stats: [
          { label: 'In this view', value: String(rows.length) },
          { label: 'On record', value: String(all.length) },
          { label: `Recorded music ${ifpi.year} (IFPI)`, value: format.money(ifpi.recordedRevenue) },
          { label: 'Paid subscription users (IFPI)', value: format.count(ifpi.paidUsers) },
        ],
        columns: ['Platform', 'Tier', 'Payout model', 'Scale', 'US price', 'All-in rate'],
        rows: rows.map(({ e, ...p }) => [e.name, TIERS[p.tier] || p.tier || '', PAYOUT_MODELS[p.model]?.label || p.model || '', p.subscribers ? `${format.count(p.subscribers)} subscribers` : p.mau ? `${format.count(p.mau)} monthly users` : '', p.priceUS ? `$${p.priceUS}` : '', p.perStream ? `${rate(p.perStream[0])}–${rate(p.perStream[1])}` : '']),
        total: all.length,
        notes: ['Per-stream rates are all-in ranges from public reporting, not rate cards. They move with mix, market and deal terms.', `US streaming mechanical rate: ${mechanicalRate}.`],
      })} />
    </>
  )
}
