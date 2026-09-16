import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, Stat, Tag, Num } from '../components/primitives/index.js'
import { TransactionList } from '../components/money/TransactionRow.jsx'
import { CATALOG_SALES, ASSETS, partyName } from '../data/transactions.js'
import { formatDate, format } from '../utils/format.js'
import { PageExport } from '../components/export/PageExport.jsx'
import { buildPageDoc } from '../utils/pageDocs.js'

const ASSET_TONE = { recording: 'recording', publishing: 'publishing', both: 'accent' }
const TH = 'text-left t-micro uppercase tracking-[0.08em] text-ink-3 font-medium py-2 px-3 border-b border-line-2 whitespace-nowrap'
const TD = 'py-2.5 px-3 border-b border-line-1 align-top'

export default function Catalogs() {
  const [sort, setSort] = useState('value')
  const rows = useMemo(() => [...CATALOG_SALES].sort((a, b) => sort === 'value' ? (b.value || 0) - (a.value || 0) : b.date.localeCompare(a.date)), [sort])
  const total = CATALOG_SALES.reduce((s, t) => s + (t.value || 0), 0)
  const largest = rows[0]

  return (
    <>
      <PageHeader eyebrow="Money · superstar rights" title="Catalog sales"
        lede="Publicly reported superstar catalog transactions: whose songs or masters, who bought them, which rights, for how much. Artists and estates sit outside the entity table; corporate catalog M&A (Recognition, Kobalt) lives under Deals." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Sales on file" kind="count" value={CATALOG_SALES.length} opts={{ full: true }} />
        <Stat label="Reported value" kind="money" value={total} hint="press estimates; see verify tags" />
        <Stat label="Largest" kind="money" value={largest?.value} hint={largest?.catalogOf || ''} />
        <Stat label="Buyers" kind="count" value={new Set(CATALOG_SALES.flatMap((t) => t.acquirers.map(partyName))).size} opts={{ full: true }} />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="t-small text-ink-3">Sort</span>
        {['value', 'date'].map((k) => (
          <button key={k} type="button" onClick={() => setSort(k)} className={['rounded-sm border px-2 py-1 t-small cursor-pointer', sort === k ? 'bg-ground-4 border-line-3 text-ink-1' : 'bg-transparent border-line-1 text-ink-2 hover:bg-ground-2'].join(' ')}>{k === 'value' ? 'By value' : 'By date'}</button>
        ))}
      </div>
      <div className="overflow-x-auto -mx-3 mb-12">
        <table className="w-full border-collapse min-w-[720px]">
          <thead><tr><th className={TH}>Catalog</th><th className={TH}>Buyer</th><th className={TH}>Rights</th><th className={TH}>Date</th><th className={`${TH} text-right`}>Value</th></tr></thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="hover:bg-ground-2 transition-colors duration-100">
                <td className={TD}>
                  <a href={`#${t.id}`} className="t-body text-ink-1 no-underline hover:underline">{t.catalogOf}</a>{t.verify && <Tag tone="danger" className="ml-2">verify</Tag>}
                  <div className="t-micro text-ink-4">from {t.sellers.map(partyName).join(', ') || '—'}</div>
                </td>
                <td className={`${TD} t-small`}>{t.acquirers.map((p, i) => <span key={i}>{i > 0 && ', '}{p.entityId ? <Link to={`/entities/${p.entityId}`} className="text-secondary no-underline hover:underline">{partyName(p)}</Link> : p.name}</span>)}</td>
                <td className={TD}><Tag tone={ASSET_TONE[t.asset] || 'neutral'}>{ASSETS[t.asset]}</Tag></td>
                <td className={`${TD} t-data text-ink-3`}>{formatDate(t.date)}</td>
                <td className={`${TD} text-right`}><Num kind="money" value={t.value} className="t-data" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="t-eyebrow text-accent mb-4">Terms and sources</div>
      <TransactionList items={rows} dense />
      <PageExport build={() => buildPageDoc({
        slug: 'catalog-sales',
        title: 'Catalog sales',
        eyebrow: 'Money · what changed hands',
        lede: 'Songwriter and artist catalogs sold, with the rights transferred and the reported consideration.',
        sort: sort === 'value' ? 'Largest reported value first' : 'Most recent first',
        stats: [
          { label: 'Sales on file', value: String(rows.length) },
          { label: 'Reported value', value: format.money(total) },
          { label: 'Largest', value: largest ? format.money(largest.value) : '—' },
        ],
        columns: ['Catalog', 'Seller', 'Buyer', 'Rights', 'Date', 'Value'],
        rows: rows.map((t) => [t.catalogOf || t.title, (t.sellers || []).map(partyName).join(' · '), (t.acquirers || []).map(partyName).join(' · '), ASSETS[t.asset] || t.asset, formatDate(t.date), t.value ? format.money(t.value) : 'undisclosed']),
        notes: rows.some((t) => t.verify) ? ['Values marked in the app as press estimates are not confirmed by the parties.'] : [],
      })} />
    </>
  )
}
