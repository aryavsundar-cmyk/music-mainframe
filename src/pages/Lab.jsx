import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { PageHeader, SectionHeader, Card, Tag } from '../components/primitives/index.js'
import { CASE_LIST } from '../data/cases/index.js'
import { readLabState } from '../hooks/useLabState.js'
import { progress, STAGES } from '../utils/labState.js'

const KIND = { valuation: 'Catalog valuation', pmi: 'Post-merger integration' }

const PMI_METHOD = [
  ['Governance', 'An IMO with decision rights, a weekly cadence, and one synergy register the board can audit.'],
  ['Synergy register', 'Every lever bottom-up: cost lines, headcount, owner, evidence. No line in two levers.'],
  ['Phasing', 'Tied to real constraints: system cut-over, contract notice windows, statement cycles, renewals.'],
  ['Cost to achieve', 'Line-by-line one-offs, TSA, severance, retention, working capital. Never risk-weight costs.'],
  ['Value', 'Phased, risk-weighted, net cash flows discounted against the premium — not run rate × deal multiple.'],
  ['Day 1', 'Continuity first: statements, payments, mandates, and letters of direction. Writers should notice nothing.'],
  ['People', 'Relationships and data knowledge are the asset. Retain before you cut; price the attrition.'],
  ['Board commitment', 'A target management can deliver, a funded budget, and the gap to the banker case explained.'],
]

const METHOD = [
  ['Perimeter', 'Define exactly which contractual economic interests transfer — rights type, ownership %, territory, term, reversions, participations, liens.'],
  ['Earnings', 'Start from net cash (NPS/NLS) after participations, fees, reserves, and recoupment — never gross royalties.'],
  ['Quality of earnings', 'Normalise one-offs consistently; keep buyer synergies out of the seller\'s price.'],
  ['Forecast', 'By stream and title cohort; each adjustment lands once; no plugs.'],
  ['DCF', 'Risk-built discount rate; finite-life terminal; recompute it every time.'],
  ['Multiples', 'Cross-check against normalised LTM; when methods disagree, the reason is the finding.'],
  ['Protection', 'Every finding changes price, structure, or the purchase agreement.'],
  ['Price', 'Bridge rights value to cash at close; test what must be true for the ask.'],
]

export default function Lab() {
  return (
    <>
      <PageHeader eyebrow="Academy · mock engagements" title="Valuation lab"
        lede="Train on leading music-rights engagements by running them end to end: pitch it, plan it, review and correct an inherited model, reach a conclusion, and deliver the memo — scored against a reviewing director." />
      <SectionHeader eyebrow="Cases" title="Choose an engagement" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-12">
        {CASE_LIST.map((c) => {
          const s = readLabState(c)
          const pr = s ? progress(c, s) : null
          return (
            <Link key={c.id} to={`/lab/${c.id}`} className="no-underline">
              <Card interactive pad="lg" tone="accent" className="h-full flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="t-h2 text-ink-1 m-0">{c.title}</h3>
                  <div className="flex flex-wrap justify-end gap-1.5"><Tag tone="accent">{KIND[c.kind]}</Tag><Tag tone="neutral">{c.difficulty}</Tag><Tag tone="neutral" mono>{c.hours}</Tag></div>
                </div>
                <p className="t-body text-ink-2 m-0 mb-3">{c.tagline}</p>
                <p className="t-small text-ink-3 m-0 flex-1">{c.client.situation}</p>
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {STAGES.map((st) => (
                    <div key={st.id}>
                      <div className="t-micro text-ink-3">{st.label}</div>
                      <div className="h-1.5 rounded-sm bg-ground-4 overflow-hidden mt-1"><div className="h-full bg-accent" style={{ width: `${Math.round((pr?.[st.id] || 0) * 100)}%` }} /></div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-line-1">
                  <span className="t-micro text-ink-4">{c.disclaimer.split('.')[0]}.</span>
                  <span className="t-small text-accent inline-flex items-center gap-1">{pr && pr.overall > 0 ? `Continue · ${Math.round(pr.overall * 100)}%` : 'Start'} <ArrowRight size={13} aria-hidden="true" /></span>
                </div>
              </Card>
            </Link>
          )
        })}
        <Card pad="lg" className="flex flex-col justify-center">
          <div className="t-eyebrow text-ink-3 mb-1">Next cases</div>
          <p className="t-body text-ink-2 m-0">The lab is case-driven: add a file under <span className="font-mono">src/data/cases/</span> with a perimeter, data room, a draft model with planted issues, and a reviewer benchmark. Each case declares a kind (valuation or integration), which selects its engine and execution steps. Candidates: a music-royalty ABS collateral review, a PRO carve-out.</p>
        </Card>
      </div>
      <SectionHeader eyebrow="Method" title="What every catalog valuation has to get right" />
      <MethodGrid items={METHOD} />
      <div className="h-12" />
      <SectionHeader eyebrow="Method" title="What every publisher integration has to get right" />
      <MethodGrid items={PMI_METHOD} />
    </>
  )
}

function MethodGrid({ items }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      {items.map(([t, d], i) => <Card key={t} pad="md"><div className="t-micro font-mono text-ink-4 mb-1">{String(i + 1).padStart(2, '0')}</div><div className="t-h3 text-ink-1 mb-1">{t}</div><p className="t-small text-ink-3 m-0">{d}</p></Card>)}
    </div>
  )
}
