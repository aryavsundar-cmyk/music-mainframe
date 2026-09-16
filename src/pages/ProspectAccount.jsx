import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageHeader, Card, Tag } from '../components/primitives/index.js'
import { AccountFilings, AccountHeader, AccountNews, OutreachComposer, Panel, RecordEditor, ScoreReasons, TriggerList } from '../components/prospecting/AccountParts.jsx'
import { LimitNote } from '../components/prospecting/LimitNote.jsx'
import { ExportBar } from '../components/export/ExportBar.jsx'
import { buildAccountBrief, buildOutreachSequence } from '../utils/prospectDocs.js'
import { has } from '../editions.js'
import { draftOutreach } from '../utils/outreach.js'
import { buildAccounts, lineLabel, recommendedLine, SEGMENT_BY_ID } from '../utils/prospect.js'
import { CLIENT_CATEGORIES, OVERLAY_LABEL } from '../data/consulting.js'
import { partyName } from '../data/transactions.js'
import { useProspectRecords } from '../hooks/useProspectRecords.js'
import { useEnrichment } from '../hooks/useEnrichment.js'
import { currencySymbol, formatMoney } from '../utils/format.js'

export default function ProspectAccount() {
  const { accountId } = useParams()
  const { records, update, logOutcome, removeOutcome } = useProspectRecords()
  const { signals, filings } = useEnrichment()
  const accounts = useMemo(() => buildAccounts({ records, signals, filings }), [records, signals, filings])
  const account = accounts.find((a) => a.id === accountId)
  const record = records[accountId] || {}

  if (!account) {
    return (<><PageHeader eyebrow="Prospecting" tone="muted" title="No such account." lede={`Nothing is filed under "${accountId}".`} /><Link to="/prospecting" className="t-small text-accent no-underline inline-flex items-center gap-1"><ArrowLeft size={14} aria-hidden="true" /> All targets</Link></>)
  }

  const cats = CLIENT_CATEGORIES.filter((c) => account.categories.includes(c.id))
  const line = recommendedLine(account)
  const metric = account.metrics.revenue || account.metrics.collections || 0

  return (
    <>
      <Link to="/prospecting" className="t-small text-ink-3 no-underline inline-flex items-center gap-1 hover:text-ink-1 mb-4"><ArrowLeft size={14} aria-hidden="true" /> Targets</Link>
      <PageHeader eyebrow={`Prospecting · ${SEGMENT_BY_ID[account.segment]?.label}`} title={account.name} lede={account.summary} />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <Card pad="lg">
            <AccountHeader account={account}>
              <div className="flex flex-wrap gap-x-6 gap-y-1 t-small text-ink-2">
                <span>{account.hq}</span>
                <span>{account.ownership}</span>
                {metric > 0 && <span>{formatMoney(metric, { currency: currencySymbol(account.metrics.revenueCurrency) })}{account.metrics.revenueYear ? ` (${account.metrics.revenueYear})` : ''}</span>}
                <span>Lead with {lineLabel(line)}</span>
              </div>
            </AccountHeader>
            <div className="flex flex-wrap gap-1.5 mt-4">
              {account.roles.map((r) => <Tag key={r} tone="neutral">{r}</Tag>)}
              {cats.map((c) => <Tag key={c.id} tone="accent">{c.label}</Tag>)}
            </div>
          </Card>

          <Panel title="Why it scores"><ScoreReasons account={account} /></Panel>

          <Panel title={`Triggers · ${account.triggers.length}`}><TriggerList triggers={account.triggers} limit={10} /></Panel>

          {account.deals.length > 0 && (
            <Panel title={`Transactions on file · ${account.deals.length}`}>
              <div className="overflow-x-auto -mx-2.5">
                <table className="w-full border-collapse" style={{ minWidth: 620 }}>
                  <thead><tr>{['Date', 'Transaction', 'Type', 'Counterparties'].map((h) => <th key={h} className="text-left t-micro uppercase tracking-[0.08em] text-ink-3 font-medium py-2 px-2.5 border-b border-line-2 whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody>
                    {account.deals.map((d) => (
                      <tr key={d.id}>
                        <td className="py-2 px-2.5 border-b border-line-1 font-mono tabular t-data text-ink-3 whitespace-nowrap">{d.date}</td>
                        <td className="py-2 px-2.5 border-b border-line-1"><span className="t-small text-ink-1">{d.title}</span></td>
                        <td className="py-2 px-2.5 border-b border-line-1"><Tag tone="neutral">{d.type}</Tag></td>
                        <td className="py-2 px-2.5 border-b border-line-1"><span className="t-micro text-ink-3">{[...d.acquirers, ...d.sellers].map(partyName).join(' · ')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          <Panel title="Outreach"><OutreachComposer account={account} /></Panel>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ExportBar title="Export the account brief" build={() => buildAccountBrief(account, draftOutreach(account, { line }), record)} />
            {has('outreach') && <ExportBar title="Export the outreach sequence" build={() => buildOutreachSequence(account, draftOutreach(account, { line }))} />}
          </div>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6">
          <Panel title="Your record"><RecordEditor account={account} record={record} update={update} logOutcome={logOutcome} removeOutcome={removeOutcome} /></Panel>
          <Panel title="In the news"><AccountNews accountId={account.id} /></Panel>
          <Panel title="Filings"><AccountFilings filings={filings[account.id] || []} /></Panel>
          <LimitNote ids={['match']} />
          {cats.length > 0 && (
            <Panel title={OVERLAY_LABEL || 'Sector context'}>
              {cats.map((c) => (
                <div key={c.id} className="mb-3 last:mb-0">
                  <div className="t-small text-ink-1">{c.label}</div>
                  <p className="t-micro text-ink-3 m-0 mt-0.5">{c.thesis.slice(0, 220)}…</p>
                </div>
              ))}
            </Panel>
          )}
        </div>
      </div>
    </>
  )
}
