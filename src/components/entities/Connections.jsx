import { Link } from 'react-router-dom'
import { Network } from 'lucide-react'
import { Card } from '../primitives/index.js'
import { connectionsOf } from '../../utils/entityMap.js'

const REASON = { ownership: 'Ownership', backer: 'Backing', deal: 'Deal counterparties' }

/**
 * Who the record ties this company to — parent and subsidiaries, backers, and counterparties in the same deal —
 * the same graph the entity map draws. Nothing inferred: a company with none says so.
 */
export function Connections({ entityId, name }) {
  const links = connectionsOf(entityId)
  const groups = Object.keys(REASON).map((r) => ({ r, items: links.filter((l) => l.reasons.includes(r)) })).filter((g) => g.items.length)
  return (
    <Card pad="md">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <div className="t-eyebrow text-ink-3">Connections on record · {links.length}</div>
        <Link to={`/entities/map?e=${entityId}`} className="t-micro text-accent no-underline hover:underline inline-flex items-center gap-1"><Network size={11} aria-hidden="true" />On the map</Link>
      </div>
      {groups.length === 0
        ? <p className="t-small text-ink-4 m-0">No parent or subsidiary on the canvas, no backers, and no deal with another company here. That is what the record shows, not a claim that none exist.</p>
        : groups.map(({ r, items }) => (
          <div key={r} className="mb-2 last:mb-0">
            <div className="t-micro text-ink-4 mb-1">{REASON[r]}</div>
            <div className="flex flex-wrap gap-1">
              {items.map(({ entity }) => (
                <Link key={entity.id} to={`/entities/${entity.id}`} title={`${entity.name} — connected to ${name}`}
                  className="t-micro rounded-sm border border-line-2 text-ink-2 px-1.5 py-0.5 no-underline hover:bg-ground-3 hover:text-ink-1">{entity.name}</Link>
              ))}
            </div>
          </div>
        ))}
    </Card>
  )
}
