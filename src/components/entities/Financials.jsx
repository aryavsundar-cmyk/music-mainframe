import { ExternalLink } from 'lucide-react'
import { Tag } from '../primitives/index.js'
import { format, currencySymbol, formatDate } from '../../utils/format.js'
import { CONCEPTS, pctChange as change } from '../../utils/financialConcepts.js'
import { kindLabel, periodLabel } from '../../utils/freshness.js'

const money = (v, cur) => (v == null ? '—' : format.money(v, { currency: currencySymbol(cur) }))
const to = (f) => (f ? `to ${formatDate(f.end)}` : '')

/** What the freshness verdict means, in words and one tone — never a colour alone. */
export function FreshnessTag({ f }) {
  if (!f || f.status === 'none') return null
  const text = {
    current: `Current · ${f.label}`,
    pending: 'Newer report filed · figures pending',
    due: `Due since ${formatDate(f.dueSince)}`,
    final: `Last disclosed · ${f.label}`,
  }[f.status]
  return <span title={f.reason}><Tag tone={f.status === 'due' ? 'danger' : f.status === 'pending' ? 'accent' : 'neutral'}>{text}</Tag></span>
}

function SecTable({ fin }) {
  const rows = Object.entries(CONCEPTS).filter(([k]) => fin.metrics[k])
  const r = fin.metrics.revenue
  const th = 't-micro text-ink-3 font-medium py-1.5 px-2 border-b border-line-2 text-right whitespace-nowrap'
  return (
    <div className="overflow-x-auto">
      {/* The periods live in one caption, not in stacked column headers. */}
      <p className="t-micro text-ink-3 m-0 mb-1.5">
        {r?.annual && <>Year {to(r.annual)} against the year before</>}{r?.annual && r?.quarter && ' · '}{r?.quarter && <>quarter {to(r.quarter)} against the same quarter a year earlier</>}
      </p>
      <table className="w-full border-collapse t-small tabular">
        <thead>
          <tr className="text-left">
            <th className="t-micro text-ink-3 font-medium py-1.5 pr-2 border-b border-line-2 text-left">Figure</th>
            <th className={th}>Year</th>
            <th className={th}>Prior</th>
            <th className={th}>Change</th>
            <th className={th}>Quarter</th>
            <th className={th}>Prior</th>
            <th className={`${th} pr-0`}>Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, c]) => {
            const m = fin.metrics[k]
            if (c.kind === 'instant') {
              return (
                <tr key={k}>
                  <td className="py-1.5 pr-2 border-b border-line-1 text-ink-2">{c.label}<div className="t-micro text-ink-4">at {formatDate(m.latest.end)}</div></td>
                  <td className="py-1.5 px-2 border-b border-line-1 text-right text-ink-1 font-mono" colSpan={3}>{money(m.latest.value, m.latest.currency)}</td>
                  <td className="py-1.5 px-2 border-b border-line-1 text-right text-ink-3 font-mono" colSpan={2}>{m.prior ? money(m.prior.value, m.prior.currency) : '—'}</td>
                  <td className="py-1.5 pl-2 border-b border-line-1 text-right text-ink-2 font-mono">{change(m.latest, m.prior)}</td>
                </tr>
              )
            }
            return (
              <tr key={k}>
                <td className="py-1.5 pr-2 border-b border-line-1 text-ink-2">{c.label}</td>
                <td className="py-1.5 px-2 border-b border-line-1 text-right text-ink-1 font-mono">{money(m.annual?.value, m.annual?.currency)}</td>
                <td className="py-1.5 px-2 border-b border-line-1 text-right text-ink-3 font-mono">{money(m.priorAnnual?.value, m.priorAnnual?.currency)}</td>
                <td className="py-1.5 px-2 border-b border-line-1 text-right text-ink-2 font-mono whitespace-nowrap">{change(m.annual, m.priorAnnual)}</td>
                <td className="py-1.5 px-2 border-b border-line-1 text-right text-ink-1 font-mono">{money(m.quarter?.value, m.quarter?.currency)}</td>
                <td className="py-1.5 px-2 border-b border-line-1 text-right text-ink-3 font-mono">{money(m.priorQuarter?.value, m.priorQuarter?.currency)}</td>
                <td className="py-1.5 pl-2 border-b border-line-1 text-right text-ink-2 font-mono whitespace-nowrap">{change(m.quarter, m.priorQuarter)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/**
 * A company's financials, with where each number came from and whether it is still the latest. SEC filers are
 * read from EDGAR's structured data every day; everyone else shows the figure on record, its kind (revenue,
 * collections, segment sales), when it was published, its source, and whether a newer result is due.
 */
export function Financials({ e, fin, freshness }) {
  const m = e.metrics || {}
  if (!fin?.metrics && !m.revenue) return null
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <div className="t-eyebrow text-accent">Financials</div>
        <FreshnessTag f={freshness} />
      </div>
      {fin?.metrics ? (
        <>
          <SecTable fin={fin} />
          <p className="t-micro text-ink-3 m-0 mt-2">
            As filed with the SEC — consolidated figures for the whole company, read from EDGAR&apos;s structured data and refreshed daily.
            {fin.latestFiling && <> Latest: <a href={fin.latestFiling.url} target="_blank" rel="noreferrer" className="text-ink-2 no-underline hover:text-accent inline-flex items-center gap-0.5">{fin.latestFiling.form} filed {formatDate(fin.latestFiling.filed)}<ExternalLink size={10} aria-hidden="true" /></a>.</>}
          </p>
          {fin.pending && <p className="t-micro text-ink-2 m-0 mt-1">{fin.pending.note} <a href={fin.pending.url} target="_blank" rel="noreferrer" className="text-accent no-underline">Open the filing</a>.</p>}
          {m.revenue && m.revenueYear && String(m.revenueYear).match(/^(Q|H)/) && (
            <p className="t-micro text-ink-3 m-0 mt-1">More recent than the SEC&apos;s structured data: {kindLabel(m).toLowerCase()} {money(m.revenue, m.revenueCurrency)} for {periodLabel(m)}{m.revenueSource ? <>, <a href={m.revenueSource.url} target="_blank" rel="noreferrer" className="text-ink-2 no-underline hover:text-accent">{m.revenueSource.label}</a></> : ' (on record)'}.</p>
          )}
        </>
      ) : (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span className="t-data text-2xl text-ink-1">{money(m.revenue, m.revenueCurrency)}</span>
            <span className="t-small text-ink-2">{kindLabel(m)}, {periodLabel(m)}</span>
            {m.revenuePublished && <span className="t-micro text-ink-4">published {formatDate(m.revenuePublished)}</span>}
          </div>
          {m.revenueSource && <a href={m.revenueSource.url} target="_blank" rel="noreferrer" className="t-micro text-ink-3 no-underline hover:text-accent inline-flex items-center gap-1">{m.revenueSource.label}<ExternalLink size={10} aria-hidden="true" /></a>}
          {m.interim && <p className="t-small text-ink-2 m-0">Latest interim: {money(m.interim.revenue, m.interim.currency)} for {m.interim.period} (to {formatDate(m.interim.end)}){m.interim.source && <> — <a href={m.interim.source.url} target="_blank" rel="noreferrer" className="text-ink-3 no-underline hover:text-accent">{m.interim.source.label}</a></>}.</p>}
          {m.projection && <p className="t-small text-ink-3 m-0">Projection, not a result: {m.projection.label} — {money(m.projection.value, m.projection.currency)} for {m.projection.year}.</p>}
          {m.revenueNote && <p className="t-micro text-ink-3 m-0">{m.revenueNote}</p>}
          {freshness?.status !== 'current' && freshness?.reason && <p className="t-micro text-ink-3 m-0">{freshness.reason}</p>}
          {!m.revenueSource && !m.revenuePublished && <p className="t-micro text-ink-4 m-0">Entered by hand from the sources listed on this page.</p>}
        </div>
      )}
    </section>
  )
}
