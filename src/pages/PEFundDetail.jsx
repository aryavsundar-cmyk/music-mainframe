import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { PageHeader, SectionHeader, Card, Stat, Tag } from '../components/primitives/index.js'
import { TransactionList } from '../components/money/TransactionRow.jsx'
import { getEntityProfile, OWNERSHIP, TIERS, ENTITY_TYPES } from '../data/entities.js'
import { getFundProfile, FUND_KINDS, kindOf } from '../data/peFunds.js'
import { hubFundLink } from '../data/siblings.js'
import { ExportButtons } from '../components/export/ExportButtons.jsx'

function Block({ title, children }) {
  return (
    <div>
      <div className="t-micro uppercase tracking-[0.08em] text-ink-3 mb-1.5">{title}</div>
      {children}
    </div>
  )
}

export default function PEFundDetail() {
  const { id } = useParams()
  const e = getEntityProfile(id)
  if (e.missing) {
    return (<><PageHeader eyebrow="PE funds" tone="muted" title="No such fund." lede={`Nothing is filed under "${id}".`} /><Link to="/pe" className="t-small text-accent no-underline inline-flex items-center gap-1"><ArrowLeft size={14} aria-hidden="true" /> All funds</Link></>)
  }
  const p = getFundProfile(e.id)
  const kind = kindOf(e)
  return (
    <>
      <Link to="/pe" className="t-small text-ink-3 no-underline inline-flex items-center gap-1 hover:text-ink-1 mb-4"><ArrowLeft size={14} aria-hidden="true" /> PE funds & capital</Link>
      <PageHeader eyebrow={`${FUND_KINDS[kind]?.label || 'Capital'}${e.subtype ? ` · ${e.subtype}` : ''}`} title={e.name} lede={e.summary}
        actions={<div className="flex flex-col items-end gap-2">
          <ExportButtons entity={e} />
          <div className="flex items-center gap-4">
            <Link to={`/entities/${e.id}`} className="t-small text-ink-2 no-underline hover:text-ink-1 inline-flex items-center gap-1">Entity record</Link>
            {hubFundLink(e.id) && <a href={hubFundLink(e.id).url} target="_blank" rel="noreferrer" className="t-small text-secondary no-underline hover:underline inline-flex items-center gap-1">{hubFundLink(e.id).label} <ExternalLink size={12} aria-hidden="true" /></a>}
          </div>
        </div>} />
      <div className="flex flex-wrap items-center gap-2 -mt-5 mb-8">
        {e.roles.map((r) => <Tag key={r} tone={['catalog-fund', 'pe-fund', 'debt-investor'].includes(r) ? 'accent' : 'neutral'}>{ENTITY_TYPES[r]?.label || r}</Tag>)}
        <Tag>{TIERS[e.tier]}</Tag><Tag>{OWNERSHIP[e.ownership] || e.ownership}</Tag>
        {e.ticker && <Tag mono>{e.ticker}</Tag>}
        {e.status !== 'active' && <Tag tone="neutral">{e.status}</Tag>}
        {e.verify && <Tag tone="danger">verify</Tag>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Stat label="Deal volume on file" kind="money" value={p.dealVolume || null} hint="as acquirer or seller" />
        <Stat label="Transactions" kind="count" value={p.deals.length} opts={{ full: true }} />
        <Stat label="ABS issued / arranged" kind="count" value={p.absIssued.length} opts={{ full: true }} />
        <Stat label="Portfolio entities" kind="count" value={p.portfolio.length} opts={{ full: true }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-10">
        <div className="space-y-12 min-w-0">
          <section>
            <SectionHeader eyebrow="Investment view" title="Thesis and structure" aside={p.hasProfile ? '' : 'base record — no profile yet'} />
            {p.thesis ? <p className="t-lede text-ink-1 mt-0 mb-6">{p.thesis}</p> : <p className="t-body text-ink-3">No thesis on file. The entity record above carries what is known.</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Block title="Structure preference">{p.structure.length ? <ul className="m-0 pl-4 t-body text-ink-2 space-y-1">{p.structure.map((s) => <li key={s}>{s}</li>)}</ul> : <span className="t-small text-ink-4">—</span>}</Block>
              <Block title="LP base / capital source"><div className="t-body text-ink-2">{p.lpBase || <span className="t-small text-ink-4">—</span>}</div></Block>
            </div>
          </section>

          <section>
            <SectionHeader eyebrow="Portfolio" title="Holdings and catalogs" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Block title="Entities">{p.portfolio.length ? <div className="flex flex-wrap gap-1.5">{p.portfolio.map((x) => <Link key={x.id} to={`/entities/${x.id}`} className="no-underline"><Tag tone="secondary" className="hover:border-line-3">{x.short || x.name}</Tag></Link>)}</div> : <span className="t-small text-ink-4">—</span>}</Block>
              <Block title="Named catalogs">{p.catalogs.length ? <ul className="m-0 pl-4 t-body text-ink-2 space-y-1">{p.catalogs.map((c) => <li key={c}>{c}</li>)}</ul> : <span className="t-small text-ink-4">—</span>}</Block>
            </div>
            {p.exits.length > 0 && <div className="mt-6"><Block title="Exits"><ul className="m-0 pl-4 t-body text-ink-2 space-y-1">{p.exits.map((x) => <li key={x}>{x}</li>)}</ul></Block></div>}
          </section>

        </div>

        <aside className="space-y-8">
          {e.notes.length > 0 && <Card pad="md"><div className="t-eyebrow text-ink-3 mb-3">Operator notes</div><ul className="m-0 pl-4 t-small text-ink-2 space-y-1.5">{e.notes.map((n) => <li key={n}>{n}</li>)}</ul></Card>}
          <Card pad="md">
            <div className="t-eyebrow text-ink-3 mb-3">Sources</div>
            <ul className="m-0 p-0 list-none space-y-1.5">{e.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="t-small text-ink-2 no-underline hover:text-accent inline-flex items-center gap-1">{s.label} <ExternalLink size={11} aria-hidden="true" /></a></li>)}</ul>
            <div className="t-micro font-mono text-ink-4 mt-3">as of {e.asOf}</div>
          </Card>
        </aside>
      </div>
      <section className="mt-12">
        <SectionHeader eyebrow="Money" title="Transactions" aside={`${p.deals.length} on file`} />
        <TransactionList items={p.deals} empty="No transactions filed against this fund yet." />
      </section>
    </>
  )
}
