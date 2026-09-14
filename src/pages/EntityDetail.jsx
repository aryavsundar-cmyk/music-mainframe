import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, CornerDownRight } from 'lucide-react'
import { PageHeader, SectionHeader, Card, Stat, Tag, Num, FlowMark } from '../components/primitives/index.js'
import { ENTITY_TYPES, LENS_TONE, OWNERSHIP, TIERS, getEntityProfile, getEntity, getChildren, getParentChain, getBackers, getBackedBy } from '../data/entities.js'
import { getTransactionsForEntity, TX_TYPES, partyName } from '../data/transactions.js'
import { flowsForEntity, FLOWS } from '../data/flows.js'
import { currencySymbol, formatDate } from '../utils/format.js'

function Fact({ label, children }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 py-2 border-b border-line-1 last:border-0">
      <div className="t-small text-ink-3">{label}</div>
      <div className="t-body text-ink-1">{children ?? <span className="text-ink-4">—</span>}</div>
    </div>
  )
}

const ELink = ({ e, className = '' }) => (
  <Link to={`/entities/${e.id}`} className={`text-secondary no-underline hover:underline ${className}`}>{e.name}</Link>
)

export default function EntityDetail() {
  const { id } = useParams()
  const e = getEntityProfile(id)
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
  const cur = currencySymbol(m.revenueCurrency)

  return (
    <>
      <Link to="/entities" className="t-small text-ink-3 no-underline inline-flex items-center gap-1 hover:text-ink-1 mb-4"><ArrowLeft size={14} aria-hidden="true" /> Entities</Link>
      <PageHeader eyebrow={`${t.label}${e.subtype ? ` · ${e.subtype}` : ''}`} tone={tone === 'neutral' ? 'muted' : tone} title={e.name} lede={e.summary} />

      <div className="flex flex-wrap items-center gap-2 -mt-5 mb-8">
        {e.roles.map((r) => <Tag key={r} tone={LENS_TONE[ENTITY_TYPES[r]?.lens] === 'neutral' ? 'neutral' : LENS_TONE[ENTITY_TYPES[r]?.lens]}>{ENTITY_TYPES[r]?.label || r}</Tag>)}
        <Tag>{TIERS[e.tier]}</Tag>
        <Tag>{OWNERSHIP[e.ownership] || e.ownership}</Tag>
        {e.ticker && <Tag mono>{e.ticker}</Tag>}
        {e.status !== 'active' && <Tag tone="neutral">{e.status}</Tag>}
        {e.verify && <Tag tone="danger">verify</Tag>}
      </div>

      {(m.revenue || m.aum || m.subscribers || m.mau || m.catalogSize) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {m.revenue && <Stat label={`Revenue ${m.revenueYear || ''}`} kind="money" value={m.revenue} opts={{ currency: cur }} hint={m.revenueCurrency && m.revenueCurrency !== 'USD' ? `reported in ${m.revenueCurrency}` : undefined} />}
          {m.aum && <Stat label="AUM" kind="money" value={m.aum} />}
          {m.subscribers && <Stat label="Paid subscribers" kind="count" value={m.subscribers} hint={m.metricsAsOf} />}
          {m.mau && <Stat label="Monthly active users" kind="count" value={m.mau} hint={m.metricsAsOf} />}
          {m.catalogSize && <Stat label="Catalog (songs)" kind="count" value={m.catalogSize} />}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-10">
        <div className="space-y-12 min-w-0">
          <section>
            <SectionHeader eyebrow="Profile" tone={tone === 'neutral' ? 'muted' : tone} title="Facts" />
            <Fact label="Headquarters">{e.hq || null}</Fact>
            <Fact label="Founded">{e.founded ? <span className="font-mono tabular">{e.founded}</span> : null}</Fact>
            <Fact label="Region">{e.region || null}</Fact>
            <Fact label="Ownership">{OWNERSHIP[e.ownership] || e.ownership}{e.ticker ? <span className="t-data text-ink-3 ml-2">{e.ticker}</span> : null}</Fact>
            <Fact label="Parent">{e.parentId ? <ELink e={getEntity(e.parentId) || { id: e.parentId, name: e.parentId }} /> : null}</Fact>
            <Fact label="Backers">{backers.length ? backers.map((b, i) => <span key={b.id}>{i > 0 && ', '}{b.missing ? b.name : <ELink e={b} />}</span>) : null}</Fact>
            <Fact label="Backs">{backs.length ? backs.map((b, i) => <span key={b.id}>{i > 0 && ', '}<ELink e={b} /></span>) : null}</Fact>
          </section>

          {e.notes.length > 0 && (
            <section>
              <SectionHeader eyebrow="Notes" tone="muted" title="Operator notes" />
              <ul className="m-0 pl-5 t-body text-ink-2 space-y-2">{e.notes.map((n) => <li key={n}>{n}</li>)}</ul>
            </section>
          )}

          <section>
            <SectionHeader eyebrow="Money" title="Related transactions" aside={`${deals.length} on file · Sprint 3 expands`} />
            {deals.length === 0
              ? <p className="t-body text-ink-3 m-0">No transactions filed against this entity yet.</p>
              : (
                <div className="divide-y divide-line-1">
                  {deals.map((d) => (
                    <div key={d.id} className="py-3 grid grid-cols-[88px_minmax(0,1fr)_auto] gap-4 items-start">
                      <div className="t-data text-ink-3">{formatDate(d.date)}</div>
                      <div className="min-w-0">
                        <div className="t-body text-ink-1">{d.title}</div>
                        <div className="t-small text-ink-3 mt-0.5">
                          {d.acquirers.map(partyName).join(', ') || '—'} ← {d.sellers.map(partyName).join(', ') || '—'}
                          {d.status !== 'closed' && <Tag tone="neutral" className="ml-2">{d.status}</Tag>}
                          {d.verify && <Tag tone="danger" className="ml-2">verify</Tag>}
                        </div>
                      </div>
                      <div className="text-right">
                        <Num kind="money" value={d.value} className="t-data" />
                        <div className="mt-1"><Tag tone={TX_TYPES[d.type]?.tone || 'neutral'}>{TX_TYPES[d.type]?.label || d.type}</Tag></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </section>
        </div>

        <aside className="space-y-8">
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
          </Card>

          {flowRoles.length > 0 && (
            <Card pad="md">
              <div className="t-eyebrow text-ink-3 mb-3">Appears in flows</div>
              <div className="space-y-2">
                {flowRoles.map(({ flowId, node }) => (
                  <Link key={`${flowId}-${node.id}`} to={`/flows/${flowId}?node=${node.id}`} className="flex items-center justify-between gap-3 no-underline group">
                    <FlowMark flow={flowId} label={false} />
                    <span className="t-small text-ink-2 group-hover:text-ink-1 flex-1">{node.label}</span>
                    <span className="t-micro text-ink-4">{FLOWS[flowId].label.split(' ')[0]}</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}

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
                </ul>}
            <div className="t-micro font-mono text-ink-4 mt-3">as of {e.asOf}{e.verify ? ' · contains unverified facts' : ''}</div>
          </Card>
        </aside>
      </div>
    </>
  )
}
