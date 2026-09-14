import { Link } from 'react-router-dom'
import { Card } from '../primitives/index.js'
import { useNewsStream } from '../../hooks/useNewsStream.js'
import { NewsItem } from './NewsItem.jsx'

/** "In the news" rail for entity pages. Degrades to a one-line status; never blocks the page. */
export function EntityNews({ entityId }) {
  const { items, state } = useNewsStream({ entity: entityId, limit: 6 })
  return (
    <Card pad="md">
      <div className="flex items-baseline justify-between mb-2">
        <div className="t-eyebrow text-ink-3">In the news</div>
        <Link to={`/news?entity=${entityId}`} className="t-micro text-accent no-underline hover:underline">all</Link>
      </div>
      {state === 'unavailable' && <div className="t-small text-ink-4">News backend unreachable — start the server or check the deploy.</div>}
      {state === 'loading' && <div className="t-small text-ink-4">Loading…</div>}
      {(state === 'live' || state === 'polling') && items.length === 0 && <div className="t-small text-ink-4">No matches in the current window. Widen the feed in server/sources.json.</div>}
      {items.length > 0 && <div className="-mb-2.5">{items.map((n) => <NewsItem key={n.id} n={n} compact hideEntity={entityId} />)}</div>}
    </Card>
  )
}
