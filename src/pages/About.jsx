import { useMemo } from 'react'
import { PageHeader, SectionHeader, Card, Stat } from '../components/primitives/index.js'
import { LimitNote } from '../components/prospecting/LimitNote.jsx'
import { ENTITIES } from '../data/entities.js'
import { TRANSACTIONS } from '../data/transactions.js'
import { GLOSSARY } from '../data/glossary.js'
import { EDITION, EDITIONS, FRAMING, IS_WORK } from '../editions.js'
import { LIMIT_LIST } from '../data/limits.js'
import { PageExport } from '../components/export/PageExport.jsx'
import { buildPageDoc } from '../utils/pageDocs.js'

/**
 * What this build is, what is in it, and where every number came from — the page a reviewer opens first.
 *
 * Every count here is measured from the data at render time. A provenance page that asserted its own
 * coverage in prose would be the one page in the app whose figures nobody checks.
 */
export default function About() {
  const facts = useMemo(() => {
    const sourced = (r) => Array.isArray(r.sources) && r.sources.length > 0
    const dates = [...ENTITIES, ...TRANSACTIONS].map((r) => r.asOf).filter(Boolean).sort()
    return {
      entities: ENTITIES.length,
      entitiesSourced: ENTITIES.filter(sourced).length,
      transactions: TRANSACTIONS.length,
      transactionsSourced: TRANSACTIONS.filter(sourced).length,
      estimates: TRANSACTIONS.filter((t) => t.verify).length,
      terms: GLOSSARY.length,
      checkedFrom: dates[0] || '—',
      checkedTo: dates[dates.length - 1] || '—',
    }
  }, [])
  const ed = EDITIONS[EDITION]

  return (
    <>
      <PageHeader eyebrow="Reference · provenance" title="About this tool"
        lede={IS_WORK ? FRAMING.what : 'Where every figure in this application comes from, how the scores are computed, and what the application does not claim.'} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Stat kind="count" label="Companies on record" value={facts.entities} hint={`${facts.entitiesSourced} carry sources`} />
        <Stat kind="count" label="Transactions on record" value={facts.transactions} hint={`${facts.transactionsSourced} carry sources`} />
        <Stat kind="count" label="Press-estimate values" value={facts.estimates} hint="flagged, never presented as confirmed" />
        <Stat kind="count" label="Terms explained" value={facts.terms} hint="plain English, with worked examples" />
      </div>

      <SectionHeader title="What it is" />
      <Card pad="md" className="mb-8">
        <div className="space-y-2 max-w-3xl">
          <p className="t-small text-ink-2 m-0">{IS_WORK ? FRAMING.notProduct : 'This is a personal research tool. Nothing in it is advice, and no figure in it is a firm position.'}</p>
          <p className="t-small text-ink-2 m-0">{FRAMING.sources}</p>
          <p className="t-small text-ink-2 m-0">{FRAMING.data}</p>
          <p className="t-small text-ink-2 m-0">Records were checked between <span className="font-mono tabular text-ink-1">{facts.checkedFrom}</span> and <span className="font-mono tabular text-ink-1">{facts.checkedTo}</span>. Each record carries the date it was last checked; an undated figure does not enter the application.</p>
        </div>
      </Card>

      <SectionHeader title="How the numbers are produced" />
      <div className="grid gap-3 md:grid-cols-3 mb-8">
        {[
          ['Recorded', 'Companies, transactions, societies and platforms are typed in from public filings, company statements and trade press, each with a source link and a date.'],
          ['Derived', 'Holdings, availability, buyer profiles, fit and timing are computed from those records by the engines in this build. Every score shows the reasons that produced it, and no score is typed in by hand.'],
          ['Yours alone', 'Status, notes and outcomes you enter stay in your own browser. They are never uploaded, and they leave with your browser data.'],
        ].map(([title, body]) => (
          <Card key={title} pad="md">
            <div className="t-eyebrow text-ink-3 mb-2">{title}</div>
            <p className="t-small text-ink-2 m-0">{body}</p>
          </Card>
        ))}
      </div>

      <SectionHeader title="What a score does not mean" />
      <LimitNote className="mb-8" />

      <SectionHeader title="What this build contains" />
      <Card pad="md">
        <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-[10rem_1fr] m-0">
          <dt className="t-small text-ink-3 m-0">Edition</dt>
          <dd className="t-small text-ink-1 m-0">{IS_WORK ? FRAMING.title : 'Mainframe · Music — full edition'}</dd>
          <dt className="t-small text-ink-3 m-0">Sections</dt>
          <dd className="t-small text-ink-1 m-0">{ed.groups.join(' · ')}</dd>
          <dt className="t-small text-ink-3 m-0">Exports</dt>
          <dd className="t-small text-ink-1 m-0">{ed.exports.map((f) => f.replace('gamma-', 'Gamma ')).join(' · ')}</dd>
        </dl>
        {IS_WORK && <p className="t-small text-ink-3 mt-3 mb-0">Sections outside this list are not hidden in this build — they are not compiled into it, so no part of them reaches the browser.</p>}
      </Card>

      <PageExport label="Export this provenance statement" build={() => buildPageDoc({
        slug: 'about-this-tool',
        title: 'About this tool',
        eyebrow: 'Reference · provenance',
        lede: IS_WORK ? FRAMING.what : 'Where every figure in this application comes from, how the scores are computed, and what the application does not claim.',
        stats: [
          { label: 'Companies on record', value: String(facts.entities) },
          { label: 'Transactions on record', value: String(facts.transactions) },
          { label: 'Press-estimate values', value: String(facts.estimates) },
          { label: 'Terms explained', value: String(facts.terms) },
        ],
        columns: ['Measure', 'Value', 'What it means'],
        rows: [
          ['Companies on record', String(facts.entities), `${facts.entitiesSourced} carry sources`],
          ['Transactions on record', String(facts.transactions), `${facts.transactionsSourced} carry sources`],
          ['Press-estimate values', String(facts.estimates), 'flagged in the app, never presented as confirmed'],
          ['Terms explained', String(facts.terms), 'plain English, with worked examples'],
          ['Records checked between', `${facts.checkedFrom} and ${facts.checkedTo}`, 'every record carries the date it was last checked'],
          ['Sections in this build', ed.groups.join(' · '), 'what this edition contains'],
          ['Export formats', ed.exports.join(' · '), 'what this edition can produce'],
        ],
        tableTitle: 'Provenance at a glance',
        notes: [IS_WORK ? `${FRAMING.notProduct} ${FRAMING.data}` : 'This is a personal research tool. Nothing in it is advice, and no figure in it is a firm position.', ...LIMIT_LIST.map((l) => `${l.claim} ${l.detail}`)],
      })} />
    </>
  )
}
