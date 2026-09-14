import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { PageHeader, SectionHeader, Stat, Card, Tag, Num } from '../components/primitives/index.js'
import { CLIENT_CATEGORIES, SERVICE_LINES, SERVICE_ORDER, OVERLAY_TOTALS } from '../data/consulting.js'
import { LENS_TONE } from '../data/entities.js'

const CARD_TONE = { money: 'accent', publishing: 'publishing', recording: 'recording' }

export default function Consulting() {
  return (
    <>
      <PageHeader eyebrow="Overlay · A&M PEPI" title="Consulting lens"
        lede="Seven client categories and five service lines, instantiated for the music business. Membership is computed from the entity table, deals come from the transactions table, and each cell is an engagement hypothesis a deal team could open with." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Stat label="Client categories" kind="count" value={OVERLAY_TOTALS.categories} opts={{ full: true }} />
        <Stat label="Entities covered" kind="count" value={OVERLAY_TOTALS.entitiesCovered} opts={{ full: true }} hint="an entity can sit in several" />
        <Stat label="Engagement hypotheses" kind="count" value={OVERLAY_TOTALS.engagements} opts={{ full: true }} />
        <Stat label="Service lines" kind="count" value={SERVICE_ORDER.length} opts={{ full: true }} hint="Diligence · Carve-out · Value creation · PMI · Strategy" />
      </div>

      <SectionHeader eyebrow="Service lines" title="What each line means in music" />
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-12">
        {SERVICE_ORDER.map((k) => <Card key={k} pad="sm"><div className="t-h3 text-ink-1 mb-1">{SERVICE_LINES[k].label}</div><p className="t-small text-ink-3 m-0">{SERVICE_LINES[k].blurb}</p></Card>)}
      </div>

      <SectionHeader eyebrow="Client categories" title="Where the work is" aside="ranked by deal volume on file" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...CLIENT_CATEGORIES].sort((a, b) => b.dealVolume - a.dealVolume).map((c) => (
          <Link key={c.id} to={`/consulting/${c.id}`} className="no-underline">
            <Card interactive tone={CARD_TONE[c.lens]} pad="lg" className="h-full flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="t-h2 text-ink-1 m-0">{c.label}</h3>
                <Tag tone={LENS_TONE[c.lens] === 'neutral' ? 'neutral' : LENS_TONE[c.lens]}>{c.lens}</Tag>
              </div>
              <p className="t-body text-ink-2 m-0 flex-1">{c.thesis}</p>
              <div className="flex flex-wrap items-end justify-between gap-3 mt-4 pt-3 border-t border-line-1">
                <div className="flex gap-4 t-micro text-ink-4">
                  <span><span className="font-mono text-ink-2">{c.members.length}</span> entities</span>
                  <span><span className="font-mono text-ink-2">{c.deals.length}</span> deals</span>
                  <span><span className="font-mono text-ink-2">{Object.values(c.engagements).flat().length}</span> hypotheses</span>
                </div>
                <span className="inline-flex items-center gap-1"><Num kind="money" value={c.dealVolume || null} className="t-data" /><ArrowRight size={13} className="text-ink-4" aria-hidden="true" /></span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}
