import { useMemo } from 'react'
import { PageHeader, SectionHeader, Stat, Card, Num, Reading, Bar, Caveat } from '../components/primitives/index.js'
import { TransactionList } from '../components/money/TransactionRow.jsx'
import { ABS_DEALS, ABS_MARKET, partyName, year } from '../data/transactions.js'
import { formatDate, format } from '../utils/format.js'
import { PageExport } from '../components/export/PageExport.jsx'
import { buildPageDoc } from '../utils/pageDocs.js'
import { readAbs } from '../utils/readings.js'

export default function ABS() {
  const byIssuer = useMemo(() => {
    const m = new Map()
    for (const t of ABS_DEALS) { const k = t.sellers[0] ? partyName(t.sellers[0]) : t.abs?.issuer || '—'; const cur = m.get(k) || { n: 0, v: 0, ids: new Set() }; cur.n++; cur.v += t.value || 0; m.set(k, cur) }
    return [...m.entries()].sort((a, b) => b[1].v - a[1].v)
  }, [])
  const byYear = useMemo(() => { const m = {}; for (const t of ABS_DEALS) { const y = year(t); m[y] = (m[y] || 0) + (t.value || 0) } return Object.entries(m).sort((a, b) => b[0] - a[0]) }, [])
  const max = Math.max(...byYear.map(([, v]) => v))
  // The gap between what is filed here and what KBRA has rated is the honest frame for every figure above, so the
  // reading states it rather than leaving it to the footnote under the bar chart.
  const reading = readAbs({
    deals: ABS_DEALS.length,
    issued: ABS_DEALS.reduce((sum, t) => sum + (t.value || 0), 0),
    issuers: byIssuer.length,
    ratedSince2020: ABS_MARKET.ratedSince2020,
    ratedIssuers: ABS_MARKET.issuers,
  })

  return (
    <>
      <PageHeader eyebrow="Money · structured finance" title="Music-royalty ABS"
        answer={<Reading reading={reading} />}
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
                <Bar share={v / max} height="h-2.5" />
                <Num kind="money" value={v} className="t-data text-right" />
              </div>
            ))}
          </div>
          <Caveat className="mt-4" more={<>Private securitisations (HarbourView, Influence) are included where the size was disclosed and absent where it was not, so a quiet year on this chart can mean a year of private deals rather than a year of few deals. KBRA&apos;s market total as of {formatDate(ABS_MARKET.asOf)} is the wider count.</>}>
            Every bar is a floor: only deals on file here, and the market is larger.
          </Caveat>
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
      <PageExport build={() => buildPageDoc({
        slug: 'abs-securitisations',
        title: 'Royalty securitisations',
        eyebrow: 'Money · how it is financed',
        lede: 'Every securitisation on file, with issuance by year and by issuer. This page has no filters — it is the full set.',
        sort: 'Newest first',
        stats: [
          { label: 'Deals on file', value: String(ABS_DEALS.length) },
          { label: 'Value on file', value: format.money(ABS_DEALS.reduce((a, t) => a + (t.value || 0), 0)) },
          { label: 'Issuance 2025', value: format.money(ABS_MARKET.issuance2025) },
          { label: 'KBRA forecast 2026', value: format.money(ABS_MARKET.forecast2026) },
        ],
        columns: ['Date', 'Deal', 'Issuer', 'Value', 'Structure', 'Status'],
        rows: ABS_DEALS.map((t) => [t.date, t.title, t.sellers[0] ? partyName(t.sellers[0]) : t.abs?.issuer || '', t.value ? format.money(t.value) : 'undisclosed', t.abs?.structure || t.structure || '', t.status || '']),
        notes: [ABS_MARKET.note, `Issuance by year: ${byYear.map(([y, v]) => `${y} ${format.money(v)}`).join(' · ')}.`, `By issuer: ${byIssuer.slice(0, 8).map(([k, v]) => `${k} ${v.n} (${format.money(v.v)})`).join(' · ')}.`],
      })} />
    </>
  )
}
