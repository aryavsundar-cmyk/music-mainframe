import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { PageHeader, Card, Eyebrow, Tag, FlowMark } from '../components/primitives/index.js'

const LENSES = [
  { eyebrow: 'Structure', tone: 'secondary', title: 'Who owns what', body: 'Labels, publishers, distributors, PROs, DSPs — one flat entity table with parent links and roles.', to: '/entities', cta: 'Entities' },
  { eyebrow: 'Money', tone: 'accent', title: 'Who is buying', body: 'Catalog PE, music-royalty ABS, superstar rights sales, credit and equity in the majors and DSPs.', to: '/deals', cta: 'Deals' },
  { eyebrow: 'Movement', tone: 'muted', title: 'What just changed', body: 'Deals, litigation, PRO reform, DSP economics, AI-royalty flashpoints — live from the trades.', to: '/news', cta: 'News' },
]

export default function Home() {
  return (
    <>
      <PageHeader
        eyebrow="Intelligence platform · modern music business"
        title="One canvas for structure, money, and movement."
        lede="Built for operators — deal teams, catalog investors, label BD, artist management. Two rights flows, one financial overlay, live signal."
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {LENSES.map((l) => (
          <Card key={l.to} pad="lg" className="flex flex-col">
            <Eyebrow tone={l.tone} className="mb-3">{l.eyebrow}</Eyebrow>
            <h2 className="t-h2 text-ink-1 m-0 mb-2">{l.title}</h2>
            <p className="t-body text-ink-2 m-0 flex-1">{l.body}</p>
            <Link to={l.to} className="mt-5 t-small text-accent no-underline inline-flex items-center gap-1 hover:underline">
              {l.cta} <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </Card>
        ))}
      </div>
      <Card pad="lg" className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <span className="t-small text-ink-3">Two rights domains, two rhythms:</span>
        <FlowMark flow="recording" />
        <FlowMark flow="publishing" />
        <span className="ml-auto flex gap-2"><Tag tone="neutral" mono>SPRINT 0</Tag><Tag tone="neutral">foundation</Tag></span>
      </Card>
    </>
  )
}
