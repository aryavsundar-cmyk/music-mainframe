import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { X, Info } from 'lucide-react'
import { PageHeader, Card } from '../components/primitives/index.js'
import { useUrlFilters } from '../hooks/useUrlFilters.js'
import { useFinancials } from '../hooks/useFinancials.js'
import { buildComparison, searchEntities, readIds, cellText, PRESETS, MAX_COMPARE, MIN_TREND_YEARS } from '../utils/compare.js'
import { CompanyHead, Picker, IndexSpark } from '../components/compare/CompareParts.jsx'
import { LimitNote } from '../components/prospecting/LimitNote.jsx'
import { PageExport } from '../components/export/PageExport.jsx'
import { buildPageDoc } from '../utils/pageDocs.js'
import { formatDate } from '../utils/format.js'
import { LIMITS } from '../data/limits.js'

const chip = 'inline-flex items-center gap-1.5 rounded-md border border-line-1 bg-transparent text-ink-2 px-2.5 py-1 t-small cursor-pointer hover:bg-ground-2 hover:text-ink-1'

/**
 * Compare — companies side by side, on the figures they actually reported.
 *
 * The table never converts a currency or lines up fiscal years that do not match; it says so instead, and marks
 * the best cell only in rows where a ranking means something (a unit-free ratio, or money every company reported
 * in one currency). The trend line is revenue rebased to 100 over a window every company shares.
 */
export default function Compare() {
  const { params, set } = useUrlFilters(['ids'])
  const financials = useFinancials()
  const [q, setQ] = useState('')
  const ids = readIds(params.ids)
  const data = useMemo(() => buildComparison(ids, { financials: financials.companies }), [params.ids, financials.companies]) // eslint-disable-line react-hooks/exhaustive-deps
  const results = useMemo(() => searchEntities(q, { exclude: ids }), [q, params.ids]) // eslint-disable-line react-hooks/exhaustive-deps
  const full = ids.length >= MAX_COMPARE

  const setIds = (next) => set({ ids: next.join(',') })
  const add = (id) => { if (!full) { setIds([...ids, id]); setQ('') } }
  const remove = (id) => setIds(ids.filter((x) => x !== id))

  const { companies, rows, index } = data
  const domain = useMemo(() => {
    const all = index.series.flatMap((s) => s.points.map((p) => p.value)).filter((v) => v != null)
    return all.length ? [Math.min(100, ...all) * 0.98, Math.max(100, ...all) * 1.02] : [0, 100]
  }, [index])

  const build = () => buildPageDoc({
    slug: 'comparison',
    title: companies.length ? `Comparison — ${companies.map((c) => c.e.name).join(', ')}` : 'Comparison',
    eyebrow: 'Canvas · side by side',
    lede: data.caveat || 'Reported figures for the companies picked, each in the currency and period it was reported for.',
    filters: [{ label: 'Companies', value: companies.map((c) => c.e.name).join(', ') || 'none picked' }],
    sort: 'In the order they were added',
    columns: ['Figure', ...companies.map((c) => c.e.name)],
    rows: rows.map((r) => [r.label + (r.rankable ? '' : ' (not comparable)'), ...r.cells.map((c) => (c ? `${cellText(c)}${c.period ? ` (${c.period})` : ''}` : '—'))]),
    total: rows.length,
    tableTitle: 'Reported figures',
    limits: ['comparison'],
    notes: [
      data.caveat,
      index.series.length > 1 ? `Revenue rebased to 100 over the ${index.years} fiscal years every company reports: ${index.series.map((s) => `${s.name} ${Math.round(s.points.at(-1).value)}`).join(' · ')}.` : '',
      index.excluded.length ? `Not in the rebased trend (fewer than ${MIN_TREND_YEARS} consecutive years on record): ${index.excluded.join(', ')}.` : '',
      'A dash means the figure is not on record for that company, never zero.',
    ].filter(Boolean),
  })

  return (
    <>
      <PageHeader eyebrow="Canvas · side by side" title="Compare companies"
        lede="Pick up to six companies and read their reported figures beside each other. Money stays in the currency each company reported, and is never ranked across currencies; the ratios are what travel." />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] gap-4 items-start mb-6">
        <Picker q={q} onQ={setQ} results={results} onAdd={add} full={full} />
        <div className="flex flex-wrap items-center gap-2">
          {ids.length === 0 && <span className="t-small text-ink-3 mr-1">Start with a set:</span>}
          {ids.length === 0
            ? PRESETS.map((p) => <button key={p.id} type="button" className={chip} onClick={() => setIds(p.ids)}>{p.label}</button>)
            : (
              <>
                {companies.map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1.5 rounded-md border border-line-2 bg-ground-2 px-2 py-1 t-small text-ink-1">
                    {c.e.short && c.e.short.length < 14 ? c.e.short : c.e.name}
                    <button type="button" onClick={() => remove(c.id)} aria-label={`Remove ${c.e.name}`} className="bg-transparent border-0 p-0 cursor-pointer text-ink-4 hover:text-ink-1"><X size={12} aria-hidden="true" /></button>
                  </span>
                ))}
                <button type="button" onClick={() => setIds([])} className="t-small text-ink-3 bg-transparent border-0 cursor-pointer hover:text-ink-1">Clear</button>
              </>
            )}
        </div>
      </div>

      {companies.length < 2 ? (
        <Card pad="lg">
          <p className="t-body text-ink-2 m-0">Pick at least two companies — search above, choose a set, or open any company page and use “Compare”.</p>
          <p className="t-small text-ink-3 m-0 mt-2">{LIMITS.comparison.claim} {LIMITS.comparison.detail}</p>
        </Card>
      ) : (
        <>
          {data.caveat && (
            <div className="flex items-start gap-2 rounded-md border border-line-1 bg-ground-1 px-4 py-3 mb-5">
              <Info size={15} className="shrink-0 mt-0.5 text-accent" aria-hidden="true" />
              <p className="t-small text-ink-2 m-0">{data.caveat}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className="text-left align-bottom p-2 pl-0 border-b border-line-2 w-[16rem] min-w-[12rem]">
                    <span className="t-eyebrow text-ink-3">Figure</span>
                  </th>
                  {companies.map((c) => (
                    <th scope="col" key={c.id} className="text-left align-bottom p-2 border-b border-line-2 min-w-[11rem]">
                      <CompanyHead c={c} onRemove={remove} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {index.series.length > 1 && (
                  <tr>
                    <th scope="row" className="text-left p-2 pl-0 border-b border-line-1 align-top">
                      <span className="t-small text-ink-2">Revenue rebased to 100</span>
                      <span className="block t-micro text-ink-4">{index.years} fiscal years they all report{index.excluded.length ? ` · ${index.excluded.length} not shown` : ''}</span>
                    </th>
                    {companies.map((c) => {
                      const s = index.series.find((x) => x.id === c.id)
                      return (
                        <td key={c.id} className="p-2 border-b border-line-1 align-top">
                          {s ? <IndexSpark series={s} years={index.years} domain={domain} />
                            : <span className="t-micro text-ink-4" title={`Fewer than ${MIN_TREND_YEARS} consecutive years on record`}>not enough years on record</span>}
                        </td>
                      )
                    })}
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.key}>
                    <th scope="row" className="text-left p-2 pl-0 border-b border-line-1 align-top">
                      <span className="t-small text-ink-2">{r.label}</span>
                      {!r.rankable && r.cells.filter(Boolean).length > 1 && r.unit !== 'text' && (
                        <span className="block t-micro text-ink-4" title="Two currencies — nothing on record converts them">shown, not ranked</span>
                      )}
                      {r.note && <span className="block t-micro text-ink-4">{r.note}</span>}
                    </th>
                    {r.cells.map((cell, i) => (
                      <td key={companies[i].id} className={`p-2 border-b border-line-1 align-top ${r.best === i ? 'bg-accent-soft' : ''}`}>
                        {cell ? (
                          <>
                            <span className={`t-small font-mono tabular ${r.unit === 'money' ? 'text-money' : 'text-ink-1'}`}>{cellText(cell)}</span>
                            {r.best === i && <span className="t-micro text-accent ml-1.5" title={r.lowerIsBetter ? 'Lowest here' : 'Highest here'}>{r.lowerIsBetter ? 'lowest' : 'highest'}</span>}
                            {cell.period && <span className="block t-micro text-ink-4">{cell.period}</span>}
                          </>
                        ) : <span className="t-small text-ink-4" title="Not on record for this company">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="t-micro text-ink-4 mt-3">
            A dash means the figure is not on record, never zero. SEC filers are refreshed daily from EDGAR; everyone else carries the source and date on their own page.
            {financials.updatedAt && ` SEC figures read ${formatDate(String(financials.updatedAt).slice(0, 10))}.`}
            {' '}Open any company for the detail: {companies.map((c, i) => <span key={c.id}>{i > 0 && ' · '}<Link to={`/entities/${c.id}`} className="text-ink-3 no-underline hover:text-accent">{c.e.name}</Link></span>)}.
          </p>

          <LimitNote ids={['comparison']} title="What this table is, and is not" className="mt-6" />
          <PageExport build={build} label="Export this comparison — companies, periods and caveats included" />
        </>
      )}
    </>
  )
}
