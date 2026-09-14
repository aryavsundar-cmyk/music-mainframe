import { Link } from 'react-router-dom'
import { Card, Tag } from '../primitives/index.js'
import { getConsultingContext, SERVICE_LINES } from '../../data/consulting.js'
import { hubFundLink } from '../../data/siblings.js'

/** PEPI lens rail for entity pages: categories the entity sits in + up to three engagement hypotheses. */
export function PepiLens({ entityId }) {
  const { categories, hypotheses } = getConsultingContext(entityId)
  if (categories.length === 0) return null
  return (
    <Card pad="md" tone="accent">
      <div className="t-eyebrow text-accent mb-3">PEPI lens</div>
      <div className="flex flex-wrap gap-1.5 mb-3">{categories.map((c) => <Link key={c.id} to={`/consulting/${c.id}`} className="no-underline"><Tag tone="accent" className="hover:border-line-3">{c.label}</Tag></Link>)}</div>
      <ul className="m-0 p-0 list-none space-y-2">
        {hypotheses.map((h, i) => <li key={i} className="t-small text-ink-2"><span className="font-mono t-micro text-ink-4 mr-1.5">{SERVICE_LINES[h.line].short}</span>{h.text}</li>)}
      </ul>
      {hubFundLink(entityId) && <a href={hubFundLink(entityId).url} target="_blank" rel="noreferrer" className="t-micro text-secondary no-underline hover:underline mt-3 inline-block">{hubFundLink(entityId).label} ↗</a>}
    </Card>
  )
}
