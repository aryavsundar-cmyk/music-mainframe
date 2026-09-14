import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { PageHeader, SectionHeader, Card, Stat, Tag, Num, FlowMark } from '../components/primitives/index.js'
import { getEntityProfile } from '../data/entities.js'
import { getProProfile, SCOPES, MODELS } from '../data/pros.js'
import { currencySymbol, formatDate } from '../utils/format.js'

export default function PRODetail() {
  const { id } = useParams()
  const e = getEntityProfile(id)
  if (e.missing || e.type !== 'pro') {
    return (<><PageHeader eyebrow="PROs & CMOs" tone="muted" title="No such society." lede={`Nothing is filed under "${id}".`} /><Link to="/pros" className="t-small text-accent no-underline inline-flex items-center gap-1"><ArrowLeft size={14} aria-hidden="true" /> All societies</Link></>)
  }
  const p = getProProfile(id)
  const cur = currencySymbol(p.currency)
  const max = Math.max(...p.series.map((s) => s.collections || s.distributions || 0), 1)
  return (
    <>
      <Link to="/pros" className="t-small text-ink-3 no-underline inline-flex items-center gap-1 hover:text-ink-1 mb-4"><ArrowLeft size={14} aria-hidden="true" /> PROs & CMOs</Link>
      <PageHeader eyebrow={`${p.region} · ${e.subtype}`} tone="secondary" title={e.name} lede={e.summary}
        actions={<Link to={`/entities/${e.id}`} className="t-small text-ink-2 no-underline hover:text-ink-1 inline-flex items-center gap-1 border border-line-2 rounded-md h-9 px-3.5">Entity record <ExternalLink size={13} aria-hidden="true" /></Link>} />
      <div className="flex flex-wrap items-center gap-2 -mt-5 mb-8">
        {p.scopes.map((s) => <Tag key={s} tone={SCOPES[s].tone}>{SCOPES[s].label}</Tag>)}
        <Tag>{MODELS[p.model]}</Tag>
        {e.ticker && <Tag mono>{e.ticker}</Tag>}
        {p.verify && <Tag tone="danger">verify</Tag>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Stat label={`Collections ${p.latest?.year || ''}`} kind="money" value={p.latest?.collections} opts={{ currency: cur, digits: 2 }} hint={p.currency !== 'USD' ? `reported in ${p.currency}` : undefined} />
        <Stat label={`Distributions ${p.latestDist?.year || ''}`} kind="money" value={p.latestDist?.distributions} opts={{ currency: cur, digits: 2 }} />
        <Stat label="Growth (collections)" kind="pct" value={p.growth} hint={p.growth != null ? 'year on year' : 'insufficient series'} />
        <Stat label="Overhead" kind="rate" value={p.overhead} opts={{ kind: 'pct', digits: 1 }} hint={p.overheadNote} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-10">
        <div className="space-y-12 min-w-0">
          <section>
            <SectionHeader eyebrow="Collections" tone="secondary" title="Series" aside={p.seriesNote ? 'see note' : `${p.currency}`} />
            {p.series.length === 0 ? <p className="t-body text-ink-3 m-0">{p.seriesNote || 'No series on file.'}</p> : (
              <>
                <div className="space-y-2">
                  {p.series.map((s) => (
                    <div key={s.year} className="grid grid-cols-[48px_minmax(0,1fr)_88px_88px] gap-3 items-center">
                      <span className="t-data text-ink-3">{s.year}</span>
                      <div className="space-y-1">
                        <div className="h-2 rounded-sm bg-ground-3 overflow-hidden"><div className="h-full bg-publishing" style={{ width: `${((s.collections || 0) / max) * 100}%` }} /></div>
                        <div className="h-1.5 rounded-sm bg-ground-3 overflow-hidden"><div className="h-full bg-secondary-soft" style={{ width: `${((s.distributions || 0) / max) * 100}%` }} /></div>
                      </div>
                      <Num kind="money" value={s.collections} opts={{ currency: cur, digits: 2 }} className="t-data text-right" />
                      <Num kind="money" value={s.distributions} opts={{ currency: cur, digits: 2 }} className="t-data text-right text-ink-3" />
                    </div>
                  ))}
                  <div className="grid grid-cols-[48px_minmax(0,1fr)_88px_88px] gap-3 t-micro text-ink-4"><span /><span /><span className="text-right">collected</span><span className="text-right">paid out</span></div>
                </div>
                {p.seriesNote && <p className="t-small text-ink-3 mt-4 mb-0">{p.seriesNote}</p>}
                {(p.domestic2025 || p.international2025) && (
                  <div className="flex gap-8 mt-4">
                    {p.domestic2025 && <Stat label="Domestic 2025" kind="money" value={p.domestic2025} opts={{ currency: cur, digits: 2 }} size="sm" />}
                    {p.international2025 && <Stat label="International 2025" kind="money" value={p.international2025} opts={{ currency: cur, digits: 2 }} size="sm" />}
                  </div>
                )}
              </>
            )}
          </section>

          <section>
            <SectionHeader eyebrow="Methodology" tone="secondary" title="How the money moves" />
            <div className="space-y-5">
              <div><div className="t-micro uppercase tracking-[0.08em] text-ink-3 mb-1">Licensing and distribution</div><p className="t-body text-ink-2 m-0">{p.methodology || '—'}</p></div>
              <div><div className="t-micro uppercase tracking-[0.08em] text-ink-3 mb-1">Payout policy</div><p className="t-body text-ink-2 m-0">{p.payoutPolicy || '—'}</p></div>
              <div><div className="t-micro uppercase tracking-[0.08em] text-ink-3 mb-1">Reciprocal footprint</div><p className="t-body text-ink-2 m-0">{p.reciprocal || '—'}</p></div>
            </div>
          </section>

          <section>
            <SectionHeader eyebrow="Movement" tone="muted" title="Reforms and events" aside={`${p.reforms.length} on file`} />
            {p.reforms.length === 0 ? <p className="t-body text-ink-3 m-0">Nothing filed.</p> : (
              <div className="divide-y divide-line-1">
                {p.reforms.map((r) => <div key={r.date + r.text} className="py-3 grid grid-cols-[92px_minmax(0,1fr)] gap-4"><span className="t-data text-ink-3">{formatDate(r.date)}</span><span className="t-body text-ink-2">{r.text}</span></div>)}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-8">
          <Card pad="md">
            <div className="t-eyebrow text-ink-3 mb-3">At a glance</div>
            <dl className="m-0 space-y-2 t-small">
              <div className="flex justify-between gap-3"><dt className="text-ink-3">Founded</dt><dd className="m-0 font-mono text-ink-1">{p.founded || e.founded || '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-3">Members</dt><dd className="m-0 text-right text-ink-1">{p.members ? <Num kind="count" value={p.members} /> : '—'}<div className="t-micro text-ink-4">{p.membersNote}</div></dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-3">Reports in</dt><dd className="m-0 font-mono text-ink-1">{p.currency}</dd></div>
            </dl>
          </Card>
          <Card pad="md">
            <div className="t-eyebrow text-ink-3 mb-3">In the flow</div>
            <Link to={`/flows/publishing?node=${p.scopes.includes('mechanical') && !p.scopes.includes('performance') ? 'mechanical' : p.scopes.includes('neighbouring') || p.scopes.includes('digital-performance') ? 'soundexchange' : 'pro'}`} className="no-underline inline-flex items-center gap-2">
              <FlowMark flow={p.scopes.includes('neighbouring') || p.scopes.includes('digital-performance') ? 'recording' : 'publishing'} />
            </Link>
          </Card>
          <Card pad="md">
            <div className="t-eyebrow text-ink-3 mb-3">Sources</div>
            <ul className="m-0 p-0 list-none space-y-1.5">{[...p.sources, ...e.sources].map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="t-small text-ink-2 no-underline hover:text-accent inline-flex items-center gap-1">{s.label} <ExternalLink size={11} aria-hidden="true" /></a></li>)}</ul>
            <div className="t-micro font-mono text-ink-4 mt-3">as of {e.asOf}</div>
          </Card>
        </aside>
      </div>
    </>
  )
}
