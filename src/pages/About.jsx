import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, SectionHeader, Card, Stat, Bar } from '../components/primitives/index.js'
import { LimitNote } from '../components/prospecting/LimitNote.jsx'
import { ENTITIES, getEntity } from '../data/entities.js'
import { TRANSACTIONS } from '../data/transactions.js'
import { GLOSSARY } from '../data/glossary.js'
import { EDITION, EDITIONS, FRAMING, IS_WORK, has } from '../editions.js'
import { guideFor, WORKFLOWS, CONVENTIONS } from '../data/pageGuide.js'
import { canvasCoverage, GAPS, GAP_ORDER } from '../utils/coverage.js'
import { citationQuality } from '../utils/citations.js'
import { FX_NOTE, FX_SOURCE, FX_ASOF } from '../data/fx.js'
import { MILESTONES } from '../data/milestones.js'
import SOURCE_CHECK from '../../data/source-check.json'
import { useFinancials } from '../hooks/useFinancials.js'
import { LIMIT_LIST } from '../data/limits.js'
import { PageExport } from '../components/export/PageExport.jsx'
import { buildPageDoc } from '../utils/pageDocs.js'

/** Workflow steps name pages in **bold**; the guide is data, so the emphasis is rendered here. */
const bold = (text) => text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={part} className="text-ink-1 font-medium">{part}</strong> : part))

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
  // Counted, like every other figure on this page. The uncomfortable half is the point: a quarter of the app's
  // citations are publication searches rather than the article, and folding them into one "N sources" number
  // would hide exactly the thing a provenance page exists to disclose.
  const cites = useMemo(() => citationQuality([ENTITIES, TRANSACTIONS, MILESTONES]), [])
  const ed = EDITIONS[EDITION]
  const guide = useMemo(() => guideFor(has), [])
  // Coverage is measured here too, and it is the least flattering number on the page — which is why it is on it.
  const financials = useFinancials()
  const coverage = useMemo(
    () => canvasCoverage(ENTITIES, { getEntity, figuresFor: (id) => financials.companies[id] }),
    [financials.companies],
  )

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

      <SectionHeader title="How much of the canvas carries a figure" aside={`${coverage.pct}% answered`} />
      <Card pad="md" className="mb-8">
        <p className="t-small text-ink-2 m-0 mb-3 max-w-3xl">
          Every company on the canvas is a real company with sources and connections on record. Far fewer carry the
          figure that measures them, and this is the breakdown — counted from the data as this page renders, not
          asserted. A company with no figure is one of three things, and the app says which on its own page.
        </p>
        <p className="t-small text-ink-2 m-0 mb-3 max-w-3xl">
          The figure is not the same question for every kind of company. A private-equity sponsor&apos;s revenue is
          fee income and says nothing about the capital it can move, so the canvas asks it for assets under
          management instead; a platform that will never break out music revenue is asked for its paid base.
          &ldquo;Other figures only&rdquo; means the record holds something, but not the figure that measures a
          company of that kind — which is an open gap, not a pass.
        </p>
        <ul className="m-0 p-0 list-none flex flex-col gap-1.5 max-w-2xl">
          {GAP_ORDER.map((id) => (
            <li key={id} className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_3rem] gap-3 items-center">
              <span className="t-small text-ink-2">{GAPS[id].label}</span>
              <Bar share={coverage.byState[id] / coverage.total} tone={id === 'unresearched' ? 'ink' : 'accent'} height="h-2" />
              <span className="t-data text-ink-1 text-right tabular">{coverage.byState[id]}</span>
            </li>
          ))}
        </ul>
        <p className="t-micro text-ink-4 m-0 mt-3 max-w-3xl">
          &ldquo;Not researched yet&rdquo; is the honest default and the largest bar: it means nobody has established
          whether that company publishes a figure. It is never read as &ldquo;discloses nothing&rdquo; — being private
          does not mean being undisclosed, as Bertelsmann&apos;s full annual report and Merlin&apos;s statutory
          transparency report both show. <Link to="/entities?cover=unresearched" className="text-accent no-underline hover:underline">The open gaps are ranked</Link> by
          what closing each one would buy.
        </p>
      </Card>

      <SectionHeader title="Why every figure is in dollars" aside={`rates for ${FX_ASOF}`} />
      <Card pad="md" className="mb-8">
        <p className="t-small text-ink-2 m-0 mb-2 max-w-3xl">{FX_NOTE}</p>
        <p className="t-small text-ink-2 m-0 max-w-3xl">
          Companies on this canvas report in nine currencies. Each figure is exactly what that company published,
          and together they cannot be read: a trillion won and a billion euro do not compare by eye. So money is
          shown in dollars first with the reported figure beside it — and the reported figure never disappears,
          which is checked in the build.
        </p>
        <p className="t-micro text-ink-4 m-0 mt-2">
          <a href={FX_SOURCE.url} target="_blank" rel="noreferrer" className="text-ink-3 no-underline hover:text-accent">{FX_SOURCE.label}</a>
        </p>
      </Card>

      <SectionHeader title="How good the citations are" aside={`checked ${String(SOURCE_CHECK.checkedAt).slice(0, 10)}`} />
      <Card pad="md" className="mb-8">
        <p className="t-small text-ink-2 m-0 mb-3 max-w-3xl">
          Every record carries sources, and that was true before anything checked whether they open. Now something
          does: <span className="font-mono tabular text-ink-1">{SOURCE_CHECK.total}</span> cited links were
          requested on {SOURCE_CHECK.checkedAt.slice(0, 10)}, <span className="font-mono tabular text-ink-1">{SOURCE_CHECK.ok}</span> answered,
          and <span className="font-mono tabular text-ink-1">{SOURCE_CHECK.dead}</span> were gone. The
          other <span className="font-mono tabular text-ink-1">{SOURCE_CHECK.unverified}</span> could not be settled
          from a script — mostly publishers that refuse automated requests — which is reported as unsettled rather
          than as broken, because a robot being turned away says nothing about whether you can open the page.
        </p>
        <p className="t-small text-ink-2 m-0 mb-3 max-w-3xl">
          Opening is the low bar. What a link <em>is</em> matters more, and this is the honest split:
        </p>
        <ul className="m-0 p-0 list-none flex flex-col gap-1.5 max-w-2xl">
          {[
            ['A specific document', cites.documents, 'the page that reports the fact — what a citation should be'],
            ['A publication search', cites.searches, 'a query box with the words filled in: a lead, not a source'],
            ['A company or section front page', cites.homes, 'fine for “here is the company”, not evidence for a figure'],
          ].map(([label, count, why]) => (
            <li key={label} className="grid grid-cols-[minmax(0,14rem)_minmax(0,1fr)_3rem] gap-3 items-center">
              <span className="t-small text-ink-2">{label}</span>
              <span className="t-micro text-ink-4">{why}</span>
              <span className="t-data text-ink-1 text-right tabular">{count}</span>
            </li>
          ))}
        </ul>
        <p className="t-micro text-ink-4 m-0 mt-3 max-w-3xl">
          No figure in this application rests on a search or a front page; that is checked in the build. The
          searches sit on company and deal records, where they point at where the reporting is rather than at the
          reporting itself. Replacing them with the specific articles is outstanding work, and counting them here
          is how it stays outstanding rather than quietly becoming acceptable.
        </p>
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

      <SectionHeader title="How to use it" />
      <div className="grid gap-3 md:grid-cols-3 mb-8">
        {WORKFLOWS.map((w) => (
          <Card key={w.id} pad="md">
            <div className="t-eyebrow text-accent mb-2">{w.title}</div>
            <ol className="m-0 pl-4 t-small text-ink-2 space-y-1.5">
              {w.steps.map((step) => <li key={step}>{bold(step)}</li>)}
            </ol>
          </Card>
        ))}
      </div>

      <SectionHeader title="What the marks mean" aside="the same on every page" />
      <div className="grid gap-3 md:grid-cols-2 mb-8">
        {CONVENTIONS.map((c) => (
          <Card key={c.id} pad="md">
            <div className="t-eyebrow text-ink-3 mb-2">{c.title}</div>
            <p className="t-small text-ink-2 m-0">{c.text}</p>
          </Card>
        ))}
      </div>

      <SectionHeader title="Every page, and what it is for" aside={`${guide.reduce((n, g) => n + g.pages.length, 0)} pages in this build`} />
      <div className="flex flex-col gap-6 mb-8">
        {guide.map((g) => (
          <section key={g.group}>
            <div className="t-eyebrow text-ink-3 mb-2">{g.group}</div>
            <div className="grid gap-3 lg:grid-cols-2">
              {g.pages.map((p) => (
                <Card key={p.path} pad="md">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <h3 className="t-body font-semibold m-0"><Link to={p.path} className="text-ink-1 no-underline hover:text-accent">{p.title}</Link></h3>
                    <Link to={p.path} className="t-micro font-mono text-ink-4 no-underline hover:text-accent whitespace-nowrap">{p.path}</Link>
                  </div>
                  <p className="t-small text-ink-2 m-0">{p.what}</p>
                  <ul className="m-0 mt-2 pl-4 t-micro text-ink-3 space-y-1">{p.use.map((u) => <li key={u}>{u}</li>)}</ul>
                  <p className="t-micro text-ink-4 m-0 mt-2"><span className="text-ink-3">What it will not tell you: </span>{p.not}</p>
                </Card>
              ))}
            </div>
          </section>
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
        extra: [
          { eyebrow: 'Guide', title: 'How to use it', blocks: WORKFLOWS.map((w) => ({ kind: 'facts', rows: [[w.title, w.steps.map((s2) => s2.replace(/\*\*/g, '')).join(' → ')]] })) },
          { eyebrow: 'Guide', title: 'What the marks mean', blocks: [{ kind: 'facts', rows: CONVENTIONS.map((c) => [c.title, c.text]) }] },
          { eyebrow: 'Guide', title: 'Every page, and what it is for', blocks: [{
            kind: 'table',
            columns: ['Page', 'Path', 'What it is for', 'How to use it', 'What it will not tell you'],
            rows: guide.flatMap((g) => g.pages.map((p) => [p.title, p.path, p.what, p.use.join(' '), p.not])),
          }] },
        ],
        notes: [IS_WORK ? `${FRAMING.notProduct} ${FRAMING.data}` : 'This is a personal research tool. Nothing in it is advice, and no figure in it is a firm position.', ...LIMIT_LIST.map((l) => `${l.claim} ${l.detail}`)],
      })} />
    </>
  )
}
