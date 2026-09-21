import { Info } from 'lucide-react'
import { Card } from '../primitives/index.js'
import { LIMITS } from '../../data/limits.js'

/**
 * What a score means, and what it does not. Permanent, not dismissible: these two sentences are the difference
 * between a research tool and a claim about someone else's intentions.
 */
export function LimitNote({ ids = ['match', 'availability'], title = 'What this score is, and is not', className = '' }) {
  const items = ids.map((id) => LIMITS[id]).filter(Boolean)
  return (
    <Card pad="md" className={`border-secondary-line ${className}`}>
      <div className="flex gap-3">
        <Info size={16} className="text-secondary shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-2 min-w-0">
          <div className="t-eyebrow text-secondary">{title}</div>
          {items.map((l) => (
            <p key={l.id} className="t-small text-ink-2 m-0">
              <span className="text-ink-1">{l.claim}</span> {l.detail} <span className="text-ink-3">{l.enforced}</span>
            </p>
          ))}
        </div>
      </div>
    </Card>
  )
}

/** One line of it, for places where the full note would crowd the page. */
export function LimitLine({ id }) {
  const l = LIMITS[id]
  if (!l) return null
  return <p className="t-micro text-ink-3 m-0">{l.claim}</p>
}
