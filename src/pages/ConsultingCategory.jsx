import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Rss } from 'lucide-react'
import { PageHeader, SectionHeader, Stat, Card, Tag, Num } from '../components/primitives/index.js'
import { TransactionList } from '../components/money/TransactionRow.jsx'
import { getCategory, SERVICE_LINES, SERVICE_ORDER } from '../data/consulting.js'
import { ENTITY_TYPES, LENS_TONE } from '../data/entities.js'

const TOPIC_LABELS = { 'catalog-deal': 'Catalog deal', abs: 'ABS / credit', 'pe-capital': 'PE / capital', 'm&a': 'M&A', 'dsp-economics': 'DSP economics', 'pro-reform': 'PRO / licensing', litigation: 'Litigation', ai: 'AI', live: 'Live / ticketing', earnings: 'Earnings', policy: 'Policy' }

export default function ConsultingCategory() {
  const { id } = useParams()
  const c = getCategory(id)
  if (!c) {
    return (
      <>
        <PageHeader eyebrow="Consulting lens" tone="muted" title="No such category." lede={`Nothing is filed under "${id}".`} />
        <Link to="/consulting" className="t-small text-accent no-underline inline-flex items-center gap-1"><ArrowLeft size={14} aria-hidden="true" /> All categories</Link>
      </>
    )
  }
  const tone = LENS_TONE[c.lens] === 'neutral' ? 'muted' : LENS_TONE[c.lens]
  const byType = Object.entries(c.members.reduce((m, e) => ((m[e.type] ||= []).push(e), m), {}))
  return (
    <>
      <Link to="/consulting" className="t-small text-ink-3 no-underline inline-flex items-center gap-1 hover:text-ink-1 mb-4"><ArrowLeft size={14} aria-hidden="true" /> Consulting lens</Link>
      <PageHeader eyebrow={`Client category · ${c.lens}`} tone={tone} title={c.label} lede={c.description} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Stat label="Entities" kind="count" value={c.members.length} opts={{ full: true }} />
        <Stat label="Deals on file" kind="count" value={c.deals.length} opts={{ full: true }} />
        <Stat label="Deal volume" kind="money" value={c.dealVolume || null} hint="disclosed, both sides" />
        <Stat label="Engagement hypotheses" kind="count" value={Object.values(c.engagements).flat().length} opts={{ full: true }} />
      </div>

      <section className="mb-12">
        <SectionHeader eyebrow="Why now" tone={tone} title="Thesis" />
        <p className="t-lede text-ink-1 mt-0 mb-6 max-w-3xl">{c.thesis}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div><div className="t-micro uppercase tracking-[0.08em] text-ink-3 mb-1.5">Engagement triggers</div><ul className="m-0 pl-4 t-body text-ink-2 space-y-1">{c.triggers.map((t) => <li key={t}>{t}</li>)}</ul></div>
          <div><div className="t-micro uppercase tracking-[0.08em] text-ink-3 mb-1.5">KPIs a deal team asks for</div><ul className="m-0 pl-4 t-body text-ink-2 space-y-1">{c.kpis.map((k) => <li key={k}>{k}</li>)}</ul></div>
        </div>
      </section>

      <section className="mb-12">
        <SectionHeader eyebrow="Service lines" tone={tone} title="Engagement hypotheses" aside="one row per line" />
        <div className="space-y-4">
          {SERVICE_ORDER.map((line) => (
            <Card key={line} pad="md" className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] gap-4">
              <div><div className="t-h3 text-ink-1">{SERVICE_LINES[line].label}</div><div className="t-micro text-ink-3 mt-0.5">{SERVICE_LINES[line].blurb}</div></div>
              <ul className="m-0 pl-4 t-body text-ink-2 space-y-1.5">{(c.engagements[line] || []).map((h) => <li key={h}>{h}</li>)}</ul>
            </Card>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <SectionHeader eyebrow="Who" tone={tone} title="Entities in this category" aside={`${c.members.length} · computed from type/roles + explicit`} />
        <div className="space-y-4">
          {byType.map(([type, list]) => (
            <div key={type}>
              <div className="t-micro uppercase tracking-[0.08em] text-ink-4 mb-1.5">{ENTITY_TYPES[type]?.label}</div>
              <div className="flex flex-wrap gap-1.5">{list.map((e) => <Link key={e.id} to={`/entities/${e.id}`} className="no-underline"><Tag tone="neutral" className="hover:border-line-3">{e.short || e.name}</Tag></Link>)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <SectionHeader eyebrow="Movement" tone="muted" title="Watch" />
        <div className="flex flex-wrap gap-2">
          {c.topics.map((t) => <Link key={t} to={`/news?topic=${t}`} className="no-underline inline-flex items-center gap-1.5 rounded-sm border border-line-2 px-2.5 py-1.5 t-small text-ink-2 hover:bg-ground-2 hover:text-ink-1"><Rss size={12} className="text-ink-4" aria-hidden="true" />{TOPIC_LABELS[t] || t}</Link>)}
        </div>
      </section>

      <section>
        <SectionHeader eyebrow="Money" title="Transactions touching this category" aside={<><Num kind="money" value={c.dealVolume || null} className="t-small" /> · {c.deals.length} on file</>} />
        <TransactionList items={c.deals.slice(0, 25)} empty="No transactions on file for this category." />
      </section>
    </>
  )
}
