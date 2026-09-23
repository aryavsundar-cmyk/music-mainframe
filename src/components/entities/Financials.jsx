import { ExternalLink } from 'lucide-react'
import { Tag } from '../primitives/index.js'
import { format, currencySymbol, formatDate } from '../../utils/format.js'
import { CONCEPTS, pctChange as change, sameYear, freeCashFlow, fiveYearRecord } from '../../utils/financialConcepts.js'
import { kindLabel, periodLabel } from '../../utils/freshness.js'

// Two decimals in billions ($6.04B, not $6B): these tables are read for year-on-year differences.
const money = (v, cur) => (v == null ? '—' : format.money(v, { currency: currencySymbol(cur), digits: Math.abs(v) >= 1e9 ? 2 : 1 }))
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

/**
 * One duration figure. A figure whose latest year or quarter is not the headline period (Sony last tagged capex
 * for the year to March 2021) carries its own period under the value, so it is never read as the current year.
 */
function DurationRow({ label, note, m, head: r }) {
  const td = 'py-1.5 px-2 border-b border-line-1 text-right font-mono'
  const off = (f, head) => (f && head && !sameYear(f, head) ? <div className="t-micro text-danger font-sans">{f.start ? `${formatDate(f.start)} – ` : ''}{formatDate(f.end)}</div> : null)
  return (
    <tr>
      <td className="py-1.5 pr-2 border-b border-line-1 text-ink-2">{label}{note && <div className="t-micro text-ink-4">{note}</div>}</td>
      <td className={`${td} text-ink-1`}>{money(m.annual?.value, m.annual?.currency)}{off(m.annual, r?.annual)}</td>
      <td className={`${td} text-ink-3`}>{money(m.priorAnnual?.value, m.priorAnnual?.currency)}</td>
      <td className={`${td} text-ink-2 whitespace-nowrap`}>{change(m.annual, m.priorAnnual)}</td>
      <td className={`${td} text-ink-1`}>{m.quarter ? money(m.quarter.value, m.quarter.currency) : <span className="text-ink-4" title="Not reported for a single quarter">—</span>}{off(m.quarter, r?.quarter)}</td>
      <td className={`${td} text-ink-3`}>{money(m.priorQuarter?.value, m.priorQuarter?.currency)}</td>
      <td className="py-1.5 pl-2 border-b border-line-1 text-right text-ink-2 font-mono whitespace-nowrap">{change(m.quarter, m.priorQuarter)}</td>
    </tr>
  )
}

/** Five fiscal years from the filings: the trend a single year-on-year change hides. Cells never borrow a year. */
export function FiveYear({ fin }) {
  const rec = fiveYearRecord(fin)
  if (!rec) return null
  const max = Math.max(...rec.years.map((y) => Math.abs(y.value)))
  const th = 't-micro text-ink-3 font-medium py-1.5 px-2 border-b border-line-2 text-right whitespace-nowrap'
  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <div className="t-eyebrow text-ink-3">Five-year record</div>
        <div className="t-micro text-ink-4">fiscal years from annual reports · {rec.currency}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse t-small tabular">
          <thead>
            <tr>
              <th className="t-micro text-ink-3 font-medium py-1.5 pr-2 border-b border-line-2 text-left">Year to</th>
              {rec.years.map((y) => (
                <th key={y.end} className={th}>
                  <div className="flex flex-col items-end gap-1">
                    <span className="block w-full max-w-[72px] h-8 flex items-end justify-end" aria-hidden="true">
                      <span className="block w-full rounded-t-sm bg-accent-line" style={{ height: `${Math.max(6, (Math.abs(y.value) / max) * 100)}%` }} />
                    </span>
                    <a href={filingLink(fin, y)} target="_blank" rel="noreferrer" className="text-ink-3 no-underline hover:text-accent" title={`${y.form} filed ${formatDate(y.filed)}`}>{formatDate(y.end)}</a>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rec.rows.map((row) => (
              <tr key={row.key}>
                <td className={`py-1.5 pr-2 border-b border-line-1 ${row.text ? 'text-ink-3 t-micro' : 'text-ink-2'}`}>{row.label}</td>
                {rec.years.map((y, i) => (
                  <td key={y.end} className={`py-1.5 px-2 border-b border-line-1 text-right font-mono whitespace-nowrap ${row.text ? 't-micro text-ink-3' : i === rec.years.length - 1 ? 'text-ink-1' : 'text-ink-2'}`}>
                    {row.text ? row.text[i] : row.cells[i] ? money(row.cells[i].value, row.cells[i].currency) : <span className="text-ink-4">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="t-micro text-ink-4 m-0 mt-1.5">Each year as last reported in an annual report, restatements included. Free cash flow is operating cash flow less capital expenditure, shown only where both are filed for the year. A dash means the filing does not give the figure.</p>
    </div>
  )
}

const filingLink = (fin, f) => (f?.accn ? `https://www.sec.gov/Archives/edgar/data/${fin.cik}/${String(f.accn).replace(/-/g, '')}/` : fin.source)

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
          {[...rows.filter(([, c]) => c.kind !== 'instant'), ['fcf', null], ...rows.filter(([, c]) => c.kind === 'instant')].map(([k, c]) => {
            if (k === 'fcf') return freeCashFlow(fin) ? <DurationRow key="fcf" label="Free cash flow" note="operating cash flow less capex" m={{ annual: freeCashFlow(fin), priorAnnual: freeCashFlow(fin, 'priorAnnual') }} head={r} /> : null
            const m = fin.metrics[k]
            if (c.kind === 'instant') {
              return (
                <tr key={k}>
                  <td className="py-1.5 pr-2 border-b border-line-1 text-ink-2">{c.label}
                    <div className={`t-micro ${m.latest.stale ? 'text-danger' : 'text-ink-4'}`} title={m.latest.stale ? `The company last tagged this figure here; it has reported through ${formatDate(m.latest.stale)} since.` : undefined}>
                      {m.latest.stale ? `last tagged ${formatDate(m.latest.end)}` : `at ${formatDate(m.latest.end)}`}
                    </div>
                  </td>
                  <td className="py-1.5 px-2 border-b border-line-1 text-right text-ink-1 font-mono" colSpan={3}>{money(m.latest.value, m.latest.currency)}</td>
                  <td className="py-1.5 px-2 border-b border-line-1 text-right text-ink-3 font-mono" colSpan={2}>{m.prior ? money(m.prior.value, m.prior.currency) : '—'}</td>
                  <td className="py-1.5 pl-2 border-b border-line-1 text-right text-ink-2 font-mono">{change(m.latest, m.prior)}</td>
                </tr>
              )
            }
            return <DurationRow key={k} label={c.label} m={m} head={r} />
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
          <FiveYear fin={fin} />
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
