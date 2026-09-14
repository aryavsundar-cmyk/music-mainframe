import { useMemo } from 'react'
import { PageHeader, SectionHeader, Stat, Card, Num } from '../components/primitives/index.js'
import { TransactionList } from '../components/money/TransactionRow.jsx'
import { ABS_DEALS, ABS_MARKET, partyName, year } from '../data/transactions.js'
import { formatDate } from '../utils/format.js'

export default function ABS() {
  const byIssuer = useMemo(() => {
    const m = new Map()
    for (const t of ABS_DEALS) { const k = t.sellers[0] ? partyName(t.sellers[0]) : t.abs?.issuer || '—'; const cur = m.get(k) || { n: 0, v: 0, ids: new Set() }; cur.n++; cur.v += t.value || 0; m.set(k, cur) }
    return [...m.entries()].sort((a, b) => b[1].v - a[1].v)
  }, [])
  const byYear = useMemo(() => { const m = {}; for (const t of ABS_DEALS) { const y = year(t); m[y] = (m[y] || 0) + (t.value || 0) } return Object.entries(m).sort((a, b) => b[0] - a[0]) }, [])
  const max = Math.max(...byYear.map(([, v]) => v))

  return (
    <>
      <PageHeader eyebrow="Money · structured finance" title="Music-royalty ABS"
        lede="Every securitisation on file with the fixed-income view: issuer, series, rating, advance rate against collateral, anticipated repayment and legal final, arrangers. Expand a row for the structure." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Rated since 2020 (KBRA)" kind="money" value={ABS_MARKET.ratedSince2020} hint={`${ABS_MARKET.ratings} ratings · ${ABS_MARKET.issuers} issuers`} />
        <Stat label="Issuance 2025" kind="money" value={ABS_MARKET.issuance2025} hint="≈ same as 2024" />
        <Stat label="KBRA forecast 2026" kind="money" value={ABS_MARKET.forecast2026} hint="≈ −25% year on year" />
        <Stat label="Deals on file" kind="count" value={ABS_DEALS.length} opts={{ full: true }} hint={<><Num kind="money" value={ABS_DEALS.reduce((s, t) => s + (t.value || 0), 0)} className="t-micro" /> total</>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8 mb-12 items-start">
        <Card pad="lg">
          <div className="t-eyebrow text-ink-3 mb-4">Issuance on file by year</div>
          <div className="space-y-2">
            {byYear.map(([y, v]) => (
              <div key={y} className="grid grid-cols-[48px_minmax(0,1fr)_72px] gap-3 items-center">
                <span className="t-data text-ink-3">{y}</span>
                <div className="h-2.5 rounded-sm bg-ground-3 overflow-hidden"><div className="h-full bg-accent" style={{ width: `${(v / max) * 100}%` }} /></div>
                <Num kind="money" value={v} className="t-data text-right" />
              </div>
            ))}
          </div>
          <p className="t-micro text-ink-4 mt-4 mb-0">Only deals filed here; the market total (KBRA, {formatDate(ABS_MARKET.asOf)}) is larger. Private securitisations (HarbourView, Influence) included where sizes were disclosed.</p>
        </Card>
        <Card pad="lg">
          <div className="t-eyebrow text-ink-3 mb-4">Issuers on file</div>
          <div className="space-y-1.5">
            {byIssuer.map(([k, { n, v }]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 t-small">
                <span className="text-ink-2 truncate">{k}<span className="t-micro font-mono text-ink-4 ml-1.5">{n}</span></span>
                <Num kind="money" value={v} className="t-data shrink-0" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <SectionHeader eyebrow="Market" title="What KBRA says" aside={`as of ${formatDate(ABS_MARKET.asOf)}`} />
      <p className="t-body text-ink-2 max-w-3xl mb-2">{ABS_MARKET.note}</p>
      <a href={ABS_MARKET.source.url} target="_blank" rel="noreferrer" className="t-small text-ink-3 no-underline hover:text-accent">{ABS_MARKET.source.label}</a>

      <div className="mt-12">
        <SectionHeader eyebrow="Deals" title="Securitisations" aside={`${ABS_DEALS.length} on file · newest first`} />
        <TransactionList items={ABS_DEALS} dense />
      </div>
    </>
  )
}
