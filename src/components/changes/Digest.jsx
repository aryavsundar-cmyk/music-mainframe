import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { Card, Tag } from '../primitives/index.js'
import { useChanges } from '../../hooks/useChanges.js'
import { KINDS } from '../../utils/changes.js'
import { formatDate } from '../../utils/format.js'
import { readLists, getList, lastSeen } from '../../utils/watchlist.js'

const TONE = { figure: 'accent', deal: 'accent', filing: 'neutral', milestone: 'secondary', news: 'neutral' }

/**
 * "Since you last looked" for the Overview: the few changes worth opening the app for, from the reader's own
 * watchlist. Reading it never marks anything as seen — only the feed itself does that.
 */
export function Digest({ limit = 6 }) {
  // Read once on mount: the window must not move under the reader while the page is open.
  const [{ seen, list }] = useState(() => {
    const lists = readLists()
    return { seen: lastSeen(), list: getList(lists, lists[0]?.id) }
  })
  const [days] = useState(() => {
    const at = lastSeen()
    // At least a week, so a visit an hour after the last one still has something to show, and never so wide it
    // stops being news. What arrived since the last visit is marked rather than shown alone.
    return at ? Math.min(30, Math.max(7, Math.ceil((Date.now() - Date.parse(at)) / 86400000))) : 7
  })
  const ids = list?.ids.length ? list.ids : null
  const { items, state, coverage } = useChanges({ days, ids })
  const since = seen ? String(seen).slice(0, 10) : null
  const fresh = since ? items.filter((c) => c.at > since).length : 0
  const shown = items.slice(0, limit)

  return (
    <Card pad="lg" className="mb-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <div>
          <div className="t-eyebrow text-accent">{fresh > 0 ? `${fresh} since you last looked` : 'Changes on record'}</div>
          <p className="t-micro text-ink-3 m-0 mt-1">
            {seen ? `last opened ${formatDate(String(seen).slice(0, 10))} · showing ${days} days` : `the last ${days} days`}
            {ids ? ` · ${list.label}: ${ids.length} compan${ids.length === 1 ? 'y' : 'ies'}` : ' · every company on the canvas'}
          </p>
        </div>
        <Link to="/changes" className="t-small text-accent no-underline inline-flex items-center gap-1 hover:underline">What changed <ArrowRight size={14} aria-hidden="true" /></Link>
      </div>

      {state === 'loading' && <p className="t-small text-ink-3 m-0">Reading filings, figures and the archive…</p>}
      {state !== 'loading' && shown.length === 0 && (
        <p className="t-small text-ink-3 m-0">Nothing on record changed in this window. That is what the sources hold, not a claim that the market was quiet{coverage.complete ? '' : ' — some of this window predates the archive'}.</p>
      )}

      {shown.length > 0 && (
        <ul className="m-0 p-0 list-none flex flex-col">
          {shown.map((c) => (
            <li key={c.id} className="grid grid-cols-[5.5rem_6.5rem_minmax(0,1fr)] gap-3 items-baseline py-1.5 border-b border-line-1 last:border-0">
              <span className="t-micro font-mono text-ink-4 inline-flex items-center gap-1.5">
                {since && c.at > since && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" title="Since your last visit" />}
                {formatDate(c.at)}
              </span>
              <Tag tone={TONE[c.kind]}>{KINDS[c.kind].label}</Tag>
              <span className="min-w-0">
                {c.url?.startsWith('http')
                  ? <a href={c.url} target="_blank" rel="noreferrer" className="t-small text-ink-1 no-underline hover:text-accent inline-flex items-start gap-1">{c.title}<ExternalLink size={10} className="shrink-0 mt-1 text-ink-4" aria-hidden="true" /></a>
                  : c.url ? <Link to={c.url} className="t-small text-ink-1 no-underline hover:text-accent">{c.title}</Link>
                    : <span className="t-small text-ink-1">{c.title}</span>}
                {c.entityName && <span className="block t-micro text-ink-4 truncate">{c.entityName}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {items.length > shown.length && <p className="t-micro text-ink-4 m-0 mt-2">{items.length - shown.length} more in the feed.</p>}
    </Card>
  )
}

/** Add or remove one company from the first watchlist, from its own page. */
export function WatchButton({ entityId, lists, onToggle }) {
  const list = getList(lists, lists[0]?.id)
  const on = !!list?.ids.includes(entityId)
  return (
    <button type="button" onClick={() => onToggle(entityId)} aria-pressed={on}
      title={on ? `Remove from “${list.label}” — this browser only` : `Add to “${list.label}” to follow it on What changed`}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 t-small cursor-pointer transition-colors duration-100 ${on ? 'border-accent-line bg-accent-soft text-accent' : 'border-line-2 bg-transparent text-ink-2 hover:bg-ground-3 hover:text-ink-1'}`}>
      {on ? 'Watching' : 'Watch'}
    </button>
  )
}
