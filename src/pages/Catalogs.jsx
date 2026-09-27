import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, FilterBar, KeyFigures, Tag, Num, DataTable, Th, Eyebrow, Segmented } from '../components/primitives/index.js'
import { TransactionList } from '../components/money/TransactionRow.jsx'
import { CATALOG_SALES, ASSETS, partyName } from '../data/transactions.js'
import { formatDate, format } from '../utils/format.js'
import { PageExport } from '../components/export/PageExport.jsx'
import { buildPageDoc } from '../utils/pageDocs.js'

const ASSET_TONE = { recording: 'recording', publishing: 'publishing', both: 'accent' }
const TD = 'py-2.5 px-3 border-b border-line-1 align-top'

export default function Catalogs() {
  const [sort, setSort] = useState('value')
  const rows = useMemo(() => [...CATALOG_SALES].sort((a, b) => sort === 'value' ? (b.value || 0) - (a.value || 0) : b.date.localeCompare(a.date)), [sort])
  const total = CATALOG_SALES.reduce((s, t) => s + (t.value || 0), 0)
  const largest = rows[0]

  return (
    <>
      <PageHeader eyebrow="Money · superstar rights" title="Catalog sales"
        answer={<KeyFigures items={[
          { value: format.count(CATALOG_SALES.length, { full: true }), label: 'sales on file' },
          { value: format.money(total), label: 'reported value' },
          { value: format.money(largest?.value), label: `largest — ${largest?.catalogOf || ''}` },
          { value: format.count(new Set(CATALOG_SALES.flatMap((t) => t.acquirers.map(partyName))).size, { full: true }), label: 'buyers' },
        ]} />}
        lede="Publicly reported superstar catalog transactions: whose songs or masters, who bought them, which rights, for how much. Values are press estimates unless a filing says otherwise — see the verify tags." />
      <FilterBar
        count={{ shown: rows.length, total: CATALOG_SALES.length, noun: 'sales on file' }}
        aside={<div className="flex items-center gap-2">
          <span className="t-micro text-ink-4">Sort</span>
          <Segmented label="Sort the table" value={sort} onChange={setSort} options={[{ id: 'value', label: 'By value' }, { id: 'date', label: 'By date' }]} />
        </div>}
      />

      <DataTable minWidth={720} className="mb-12" caption="Publicly reported superstar catalog transactions, with buyer, rights and value.">
          <thead><tr>
            <Th>Catalog</Th><Th>Buyer</Th><Th>Rights</Th>
            <Th sort={sort === 'date' ? 'desc' : 'none'} onSort={() => setSort('date')}>Date</Th>
            <Th align="right" sort={sort === 'value' ? 'desc' : 'none'} onSort={() => setSort('value')}>Value</Th>
          </tr></thead>
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
      </DataTable>

      <Eyebrow as="h2" className="mb-4">Terms and sources</Eyebrow>
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
