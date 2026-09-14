import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { Tag } from '../primitives/index.js'
import { getEntity, ENTITY_TYPES, LENS_TONE } from '../../data/entities.js'

const ago = (iso) => { const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000)); if (m < 60) return `${m}m`; const h = Math.round(m / 60); if (h < 48) return `${h}h`; return `${Math.round(h / 24)}d` }

/** One feed item. `compact` for rails (entity pages). `topics` map comes from /api/news/stats. */
export function NewsItem({ n, topics = {}, compact = false, hideEntity = '' }) {
  const ents = n.entities.filter((id) => id !== hideEntity).map(getEntity).filter(Boolean).slice(0, compact ? 2 : 5)
  return (
    <article className={`border-b border-line-1 ${compact ? 'py-2.5' : 'py-4'}`}>
      <div className="flex items-baseline gap-2 t-micro text-ink-3 mb-1">
        <span className={n.kind === 'filing' ? 'text-accent' : 'text-ink-2'}>{n.source}</span>
        <span className="font-mono text-ink-4">{ago(n.publishedAt)}</span>
        {!compact && n.priority === 'high' && <Tag tone="accent">high</Tag>}
      </div>
      <a href={n.url} target="_blank" rel="noreferrer" className={`${compact ? 't-small' : 't-h3'} text-ink-1 no-underline hover:underline inline-flex items-start gap-1.5`}>
        {n.title}<ExternalLink size={compact ? 11 : 13} className="text-ink-4 shrink-0 mt-1" aria-hidden="true" />
      </a>
      {!compact && n.summary && <p className="t-small text-ink-2 mt-1 mb-0 line-clamp-2">{n.summary}</p>}
      {(ents.length > 0 || (!compact && n.topics.length > 0)) && (
        <div className="flex flex-wrap gap-1 mt-2">
          {ents.map((e) => <Link key={e.id} to={`/entities/${e.id}`} className="no-underline"><Tag tone={LENS_TONE[ENTITY_TYPES[e.type]?.lens] || 'neutral'} className="hover:border-line-3">{e.short || e.name}</Tag></Link>)}
          {!compact && n.topics.map((t) => <Tag key={t} tone="neutral">{topics[t] || t}</Tag>)}
        </div>
      )}
    </article>
  )
}
