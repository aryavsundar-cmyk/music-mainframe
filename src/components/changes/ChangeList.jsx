import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { Tag } from '../primitives/index.js'
import { KINDS } from '../../utils/changes.js'
import { formatDate } from '../../utils/format.js'

/**
 * ChangeList — one change, rendered the same way everywhere a change appears.
 *
 * Three places listed changes and each did it slightly differently: the feed led with the kind, the Overview digest
 * led with the date, and one of them showed `detail` while the other showed the company name. A reader moving
 * between them had to re-learn the row. This is the one row now; what varies is which columns a caller asks for.
 *
 * The blue dot means "since your last visit" and only appears when the caller passes `seen`. It is never the only
 * signal — the date is right beside it — because a coloured dot on its own tells a colourblind reader nothing.
 */
const TONE = { figure: 'accent', deal: 'accent', filing: 'neutral', milestone: 'secondary', news: 'neutral' }

/** The columns a change row can carry, in the order they always appear. */
const GRIDS = {
  // date · kind · what happened (the digest, and a single company's own strip)
  dated: 'grid-cols-[5.5rem_6.5rem_minmax(0,1fr)]',
  // kind · company · what happened (the feed, which groups by day already)
  grouped: 'grid-cols-[6.5rem_minmax(0,11rem)_minmax(0,1fr)]',
  // date · kind · what happened, with no company column: one company's page
  compact: 'grid-cols-[5.5rem_5.5rem_minmax(0,1fr)]',
}

function Title({ c }) {
  if (c.url?.startsWith('http')) {
    return (
      <a href={c.url} target="_blank" rel="noreferrer" className="t-small text-ink-1 no-underline hover:text-accent inline-flex items-start gap-1">
        {c.title}<ExternalLink size={10} className="shrink-0 mt-1 text-ink-4" aria-hidden="true" />
      </a>
    )
  }
  if (c.url) return <Link to={c.url} className="t-small text-ink-1 no-underline hover:text-accent">{c.title}</Link>
  return <span className="t-small text-ink-1">{c.title}</span>
}

/** A fresh-since-last-visit marker, or nothing. `seen` is an ISO day; a change on the same day is not "new". */
const isNew = (c, seen) => !!seen && c.at > String(seen).slice(0, 10)

export function ChangeRow({ c, layout = 'dated', seen = null, secondary = 'detail' }) {
  const dot = isNew(c, seen) && <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" title="Since your last visit" aria-label="new since your last visit" />
  const note = secondary === 'entity' ? c.entityName : c.detail
  return (
    <li className={`grid ${GRIDS[layout] || GRIDS.dated} gap-3 items-baseline py-1.5 border-b border-line-1 last:border-0`}>
      {layout === 'grouped' ? (
        <span className="inline-flex items-center gap-1.5">{dot}<Tag tone={TONE[c.kind]}>{KINDS[c.kind].label}</Tag></span>
      ) : (
        <span className="t-micro font-mono text-ink-4 inline-flex items-center gap-1.5">{dot}{formatDate(c.at)}</span>
      )}
      {layout === 'grouped' ? (
        <span className="t-small text-ink-2 truncate" title={c.entityName}>
          {c.entityId ? <Link to={`/entities/${c.entityId}`} className="text-ink-2 no-underline hover:text-accent">{c.entityName}</Link> : c.entityName}
        </span>
      ) : (
        <Tag tone={TONE[c.kind]}>{KINDS[c.kind].label}</Tag>
      )}
      <span className="min-w-0">
        <Title c={c} />
        {note && <span className="block t-micro text-ink-4 truncate">{note}</span>}
      </span>
    </li>
  )
}

export function ChangeList({ items, layout = 'dated', seen = null, secondary = 'detail', className = '' }) {
  if (!items.length) return null
  return (
    <ul className={`m-0 p-0 list-none flex flex-col ${className}`}>
      {items.map((c) => <ChangeRow key={c.id} c={c} layout={layout} seen={seen} secondary={secondary} />)}
    </ul>
  )
}
