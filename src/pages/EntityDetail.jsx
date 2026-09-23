import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ExternalLink, CornerDownRight, Network } from 'lucide-react'
import { PageHeader, SectionHeader, Card, Stat, Tag, FlowMark } from '../components/primitives/index.js'
import { ENTITY_TYPES, LENS_TONE, OWNERSHIP, TIERS, getEntityProfile, getEntity, getChildren, getParentChain, getBackers, getBackedBy } from '../data/entities.js'
import { getTransactionsForEntity } from '../data/transactions.js'
import { TransactionList } from '../components/money/TransactionRow.jsx'
import { flowsForEntity, FLOWS } from '../data/flows.js'
import { EntityNews } from '../components/news/EntityNews.jsx'
import { PepiLens } from '../components/consulting/PepiLens.jsx'
import { ExportButtons } from '../components/export/ExportButtons.jsx'
import { HubLinks } from '../components/HubLinks.jsx'
import { useMemo } from 'react'
import { useForces } from '../hooks/useForces.js'
import { entityExposure } from '../utils/forces.js'
import { ForceExposure } from '../components/forces/ForceExposure.jsx'
import { useFinancials } from '../hooks/useFinancials.js'
import { currentRevenue, freshnessOf, kindLabel } from '../utils/freshness.js'
import { Financials } from '../components/entities/Financials.jsx'
import { SecFilings } from '../components/entities/SecFilings.jsx'
import { Connections } from '../components/entities/Connections.jsx'
import { pctChange, operatingMargin, freeCashFlow } from '../utils/financialConcepts.js'
import { currencySymbol, formatDate as fmtDate } from '../utils/format.js'

function Fact({ label, children }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 py-2 border-b border-line-1 last:border-0">
      <div className="t-small text-ink-3">{label}</div>
      <div className="t-body text-ink-1">{children ?? <span className="text-ink-4">—</span>}</div>
    </div>
  )
}

/**
 * Each row pairs one long card (forces, news) with a stack of shorter ones, so neither column runs on alone.
 * A card that renders nothing (the consulting overlay in the research edition, SEC filings for a private company) just
 * leaves its stack shorter.
 */
const GRID = 'grid grid-cols-1 lg:grid-cols-2 gap-6 items-start'
const STACK = 'flex flex-col gap-6 min-w-0'

/**
 * The headline strip: the freshest revenue, then what the filings add (latest quarter, margin, free cash flow),
 * then the operating metrics on record, then the deal count. Each carries its period or source.
 */
function headlineStats({ m, fin, rev, deals }) {
  const out = []
  const cur = (c) => ({ currency: currencySymbol(c) })
  if (rev) out.push({ label: rev.label, kind: 'money', value: rev.value, opts: cur(rev.currency), hint: rev.source === 'sec' ? `${rev.form} filed ${fmtDate(rev.filed)}` : rev.published ? `published ${fmtDate(rev.published)}` : rev.currency !== 'USD' ? `reported in ${rev.currency}` : undefined })
  const r = fin?.metrics?.revenue
  if (r?.quarter && !(rev?.source === 'sec' && rev.end === r.quarter.end)) out.push({ label: `Quarter to ${fmtDate(r.quarter.end)}`, kind: 'money', value: r.quarter.value, opts: cur(r.quarter.currency), hint: `${pctChange(r.quarter, r.priorQuarter)} on the year · ${r.quarter.form}` })
  // A hand-entered interim result newer than the headline year (HYBE's Q2, Deezer's H1) belongs up here too.
  if (m.interim?.revenue && rev?.source === 'record' && (!rev.end || m.interim.end > rev.end)) out.push({ label: `${kindLabel(m)}, ${m.interim.period}`, kind: 'money', value: m.interim.revenue, opts: cur(m.interim.currency || m.revenueCurrency), hint: m.interim.published ? `published ${fmtDate(m.interim.published)}` : `to ${fmtDate(m.interim.end)}` })
  const om = operatingMargin(fin)
  if (om != null) out.push({ label: 'Operating margin', value: `${om.toFixed(1)}%`, hint: `year to ${fmtDate(r.annual.end)}` })
  const fcf = freeCashFlow(fin)
  if (fcf) out.push({ label: 'Free cash flow', kind: 'money', value: fcf.value, opts: cur(fcf.currency), hint: `year to ${fmtDate(fcf.end)} · OCF less capex` })
  if (m.aum) out.push({ label: 'AUM', kind: 'money', value: m.aum, hint: m.metricsAsOf })
  if (m.subscribers) out.push({ label: 'Paid subscribers', kind: 'count', value: m.subscribers, hint: m.metricsAsOf })
  if (m.mau) out.push({ label: 'Monthly active users', kind: 'count', value: m.mau, hint: m.metricsAsOf })
  if (m.catalogSize) out.push({ label: 'Catalog (songs)', kind: 'count', value: m.catalogSize })
  const latest = deals.map((d) => d.date).sort().at(-1)
  out.push({ label: 'Deals on record', kind: 'count', value: deals.length, hint: latest ? `latest ${fmtDate(String(latest).slice(0, 10))}` : 'none filed' })
  return out.slice(0, 6)
}

const ELink = ({ e, className = '' }) => (
  <Link to={`/entities/${e.id}`} className={`text-secondary no-underline hover:underline ${className}`}>{e.name}</Link>
)

export default function EntityDetail() {
  const { id } = useParams()
  const e = getEntityProfile(id)
  const { tagged, loading } = useForces()
  const exposure = useMemo(() => entityExposure(tagged, id), [tagged, id])
  const financials = useFinancials()
  const fin = financials.companies[id]
  if (e.missing) {
    return (
      <>
        <PageHeader eyebrow="Entities" tone="muted" title="No such entity." lede={`Nothing is filed under "${id}".`} />
        <Link to="/entities" className="t-small text-accent no-underline inline-flex items-center gap-1"><ArrowLeft size={14} aria-hidden="true" /> All entities</Link>
      </>
    )
  }
  const t = ENTITY_TYPES[e.type]
  const tone = LENS_TONE[t.lens]
  const chain = getParentChain(e.id)
  const children = getChildren(e.id)
  const backers = getBackers(e.id)
  const backs = getBackedBy(e.id)
  const deals = getTransactionsForEntity(e.id)
  const flowRoles = flowsForEntity(e.id)
  const m = e.metrics
  // The freshest figure: a filing beats a hand-entered number for the same or an earlier period.
  const rev = currentRevenue(e, fin)
  const stats = headlineStats({ m, fin, rev, deals })

  return (
    <>
      <Link to="/entities" className="t-small text-ink-3 no-underline inline-flex items-center gap-1 hover:text-ink-1 mb-4"><ArrowLeft size={14} aria-hidden="true" /> Entities</Link>
      <PageHeader eyebrow={`${t.label}${e.subtype ? ` · ${e.subtype}` : ''}`} tone={tone === 'neutral' ? 'muted' : tone} title={e.name} lede={e.summary}
        actions={<div className="flex flex-col items-end gap-2">
          <ExportButtons entity={e} forceItems={loading ? null : tagged} financials={fin || null} />
          <Link to={`/compare?ids=${e.id}`} className="t-small text-ink-2 no-underline hover:text-ink-1 inline-flex items-center gap-1">Compare with… <ArrowRight size={13} aria-hidden="true" /></Link>
          {e.roles.some((r) => ['catalog-fund', 'pe-fund', 'debt-investor', 'strategic'].includes(r)) && <Link to={`/pe/${e.id}`} className="t-small text-ink-2 no-underline hover:text-ink-1 inline-flex items-center gap-1">Investment view <ArrowRight size={13} aria-hidden="true" /></Link>}
        </div>} />

      <div className="flex flex-wrap items-center gap-2 -mt-5 mb-8">
        {e.roles.map((r) => <Tag key={r} tone={LENS_TONE[ENTITY_TYPES[r]?.lens] === 'neutral' ? 'neutral' : LENS_TONE[ENTITY_TYPES[r]?.lens]}>{ENTITY_TYPES[r]?.label || r}</Tag>)}
        <Tag>{TIERS[e.tier]}</Tag>
        <Tag>{OWNERSHIP[e.ownership] || e.ownership}</Tag>
        {e.ticker && <Tag mono>{e.ticker}</Tag>}
        {e.status !== 'active' && <Tag tone="neutral">{e.status}</Tag>}
        {e.verify && <Tag tone="danger">verify</Tag>}
      </div>

      {(stats.length > 1 || deals.length > 0) && (
        <div className="flex flex-wrap w-fit max-w-full gap-x-12 gap-y-5 mb-10 rounded-md border border-line-1 bg-ground-1 px-5 py-4">
          {stats.map((st) => <Stat key={st.label} size="sm" className="min-w-[9rem]" {...st} />)}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
        <div className="min-w-0 flex flex-col gap-8">
          <Financials e={e} fin={fin} freshness={freshnessOf(e, fin)} />

          <div className={GRID}>
            <ForceExposure exposure={exposure} name={e.name} loading={loading} />
            <div className={STACK}>
              <PepiLens entityId={e.id} />
              <Connections entityId={e.id} name={e.name} />
            </div>
          </div>

          <div className={GRID}>
            <EntityNews entityId={e.id} />
            <div className={STACK}>
              <SecFilings entityId={e.id} />
              <Card pad="md">
                <div className="t-eyebrow text-ink-3 mb-1">Profile</div>
                <Fact label="Headquarters">{e.hq || null}</Fact>
                <Fact label="Founded">{e.founded ? <span className="font-mono tabular">{e.founded}</span> : null}</Fact>
                <Fact label="Region">{e.region || null}</Fact>
                <Fact label="Ownership">{OWNERSHIP[e.ownership] || e.ownership}{e.ticker ? <span className="t-data text-ink-3 ml-2">{e.ticker}</span> : null}</Fact>
                <Fact label="Parent">{e.parentId ? <ELink e={getEntity(e.parentId) || { id: e.parentId, name: e.parentId }} /> : null}</Fact>
                <Fact label="Backers">{backers.length ? backers.map((b, i) => <span key={b.id}>{i > 0 && ', '}{b.missing ? b.name : <ELink e={b} />}</span>) : null}</Fact>
                <Fact label="Backs">{backs.length ? backs.map((b, i) => <span key={b.id}>{i > 0 && ', '}<ELink e={b} /></span>) : null}</Fact>
              </Card>

              <Card pad="md">
                <div className="t-eyebrow text-ink-3 mb-3">Corporate hierarchy</div>
                <div className="space-y-1">
                  {[...chain].reverse().map((p, i) => (
                    <div key={p.id} className="flex items-center gap-1.5 t-small" style={{ paddingLeft: i * 12 }}>
                      {i > 0 && <CornerDownRight size={12} className="text-ink-4" aria-hidden="true" />}<ELink e={p} />
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 t-small text-ink-1 font-medium" style={{ paddingLeft: chain.length * 12 }}>
                    {chain.length > 0 && <CornerDownRight size={12} className="text-ink-4" aria-hidden="true" />}{e.name}
                  </div>
                  {children.map((c) => (
                    <div key={c.id} className="flex items-center gap-1.5 t-small" style={{ paddingLeft: (chain.length + 1) * 12 }}>
                      <CornerDownRight size={12} className="text-ink-4" aria-hidden="true" /><ELink e={c} />
                      {c.status !== 'active' && <span className="t-micro text-ink-4">({c.status})</span>}
                    </div>
                  ))}
                </div>
                {chain.length === 0 && children.length === 0 && <div className="t-small text-ink-4 mt-1">Independent — no parent or subsidiaries on file.</div>}
                {flowRoles.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-line-1">
                    <div className="t-eyebrow text-ink-3 mb-2">Appears in flows</div>
                    <div className="space-y-2">
                      {flowRoles.map(({ flowId, node }) => (
                        <Link key={`${flowId}-${node.id}`} to={`/flows/${flowId}?node=${node.id}`} className="flex items-center justify-between gap-3 no-underline group">
                          <FlowMark flow={flowId} label={false} />
                          <span className="t-small text-ink-2 group-hover:text-ink-1 flex-1">{node.label}</span>
                          <span className="t-micro text-ink-4">{FLOWS[flowId].label.split(' ')[0]}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>

          <section>
            <SectionHeader eyebrow="Money" title="Related transactions" aside={`${deals.length} on file`} />
            <TransactionList items={deals} empty="No transactions filed against this entity yet." />
          </section>
        </div>

        <aside className="flex flex-col gap-6 xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">
          <Card pad="md">
            <div className="t-eyebrow text-ink-3 mb-3">Operator notes</div>
            {e.notes.length
              ? <ul className="m-0 pl-4 t-small text-ink-2 space-y-2">{e.notes.map((n) => <li key={n}>{n}</li>)}</ul>
              : <p className="t-small text-ink-4 m-0">No operator notes on file.</p>}
          </Card>

          <Card pad="md">
            <div className="t-eyebrow text-ink-3 mb-3">Sources</div>
            {e.sources.length === 0
              ? <div className="t-small text-ink-4">None filed.</div>
              : <ul className="m-0 p-0 list-none space-y-1.5">
                  {e.sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noreferrer" className="t-small text-ink-2 no-underline hover:text-accent inline-flex items-center gap-1">{s.label} <ExternalLink size={11} aria-hidden="true" /></a>
                    </li>
                  ))}
                  {fin?.source && <li><a href={fin.source} target="_blank" rel="noreferrer" className="t-small text-ink-2 no-underline hover:text-accent inline-flex items-center gap-1">SEC structured financial data <ExternalLink size={11} aria-hidden="true" /></a></li>}
                </ul>}
            <div className="t-micro font-mono text-ink-4 mt-3">profile as of {e.asOf}{e.verify ? ' · contains unverified facts' : ''}</div>
            {financials.updatedAt && fin && <div className="t-micro font-mono text-ink-4">SEC figures read {fmtDate(String(financials.updatedAt).slice(0, 10))}</div>}
          </Card>

          <HubLinks entityId={e.id} />

          <Link to={`/entities/map?e=${e.id}`} className="t-small text-ink-2 no-underline hover:text-ink-1 inline-flex items-center gap-1.5 px-1"><Network size={14} aria-hidden="true" />See {e.short || e.name} on the entity map</Link>
        </aside>
      </div>
    </>
  )
}
