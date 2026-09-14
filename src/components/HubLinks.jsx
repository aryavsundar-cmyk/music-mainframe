import { ExternalLink } from 'lucide-react'
import { Card } from './primitives/index.js'
import { hubLinks } from '../data/siblings.js'

/** "Also in Intelligence Hub" rail: every Hub page that profiles this entity. Renders nothing when there are none. */
export function HubLinks({ entityId }) {
  const links = hubLinks(entityId)
  if (links.length === 0) return null
  return (
    <Card pad="md">
      <div className="t-eyebrow text-ink-3 mb-3">Also in Intelligence Hub</div>
      <ul className="m-0 p-0 list-none space-y-1.5">
        {links.map((l) => (
          <li key={l.url}>
            <a href={l.url} target="_blank" rel="noreferrer" className="t-small text-secondary no-underline hover:underline inline-flex items-center gap-1">{l.label} <ExternalLink size={11} aria-hidden="true" /></a>
          </li>
        ))}
      </ul>
      <div className="t-micro text-ink-4 mt-2">Sibling app · read-only from here</div>
    </Card>
  )
}
