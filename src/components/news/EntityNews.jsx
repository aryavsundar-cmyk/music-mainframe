import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../primitives/index.js'
import { useNewsStream } from '../../hooks/useNewsStream.js'
import { useArchive } from '../../hooks/useForces.js'
import { mergeUnique } from '../../utils/eventKeys.js'
import { NewsItem } from './NewsItem.jsx'
import { formatDate } from '../../utils/format.js'

const STEP = 6

/**
 * "In the news" rail for entity pages: the live feed AND the evidence archive, merged, newest first. The live
 * feed alone forgets on every restart and only holds a few weeks, so a company page read from it would lose its
 * coverage overnight. Degrades to a one-line status; never blocks the page.
 */
export function EntityNews({ entityId }) {
  const { items: live, state } = useNewsStream({ entity: entityId, limit: 30 })
  const archive = useArchive({ entity: entityId })
  const [shown, setShown] = useState(STEP)
  const items = useMemo(() => mergeUnique(live, archive.items).sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt))), [live, archive.items])
  const since = archive.coverage?.since
  const bothDown = state === 'unavailable' && archive.state === 'unavailable'
  return (
    <Card pad="md">
      <div className="flex items-baseline justify-between mb-2">
        <div className="t-eyebrow text-ink-3">In the news</div>
        <Link to={`/news?entity=${entityId}`} className="t-micro text-accent no-underline hover:underline">all</Link>
      </div>
      {bothDown && <div className="t-small text-ink-4">News backend unreachable — start the server or check the deploy.</div>}
      {!bothDown && state === 'loading' && archive.state === 'loading' && <div className="t-small text-ink-4">Loading…</div>}
      {!bothDown && state !== 'loading' && archive.state !== 'loading' && items.length === 0 && <div className="t-small text-ink-4">No coverage {since ? `since ${formatDate(since)}` : 'in the current window'}.</div>}
      {items.length > 0 && <div className="-mb-2.5">{items.slice(0, shown).map((n) => <NewsItem key={n.id} n={n} compact hideEntity={entityId} />)}</div>}
      {items.length > shown && <button type="button" onClick={() => setShown((s) => s + STEP * 2)} className="mt-3 t-micro text-accent bg-transparent border-0 cursor-pointer p-0">Show more ({items.length - shown} left)</button>}
      {items.length > 0 && since && <p className="t-micro text-ink-4 m-0 mt-2">{items.length} item{items.length === 1 ? '' : 's'} · live feed plus the archive since {formatDate(since)}</p>}
    </Card>
  )
}
