import { Link } from 'react-router-dom'

/**
 * KeyFigures — the one line a page can say about itself before the reader does any work.
 *
 * "188 companies · 39 listed · 3 need a refresh". Every figure is computed from the data at render time, and a
 * figure that names a subset links to the filtered view that shows it, so the summary is also the way in.
 *
 * It replaces the four-tile strip that used to sit between the title and the content on list pages: the same
 * facts, a tenth of the height, and no longer pushing the table below the fold.
 */
export function KeyFigures({ items = [], className = '' }) {
  const shown = items.filter((i) => i && i.value !== null && i.value !== undefined && i.value !== '')
  if (!shown.length) return null
  return (
    <p className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 m-0 ${className}`}>
      {shown.map((i, n) => (
        <span key={i.label} className="inline-flex items-baseline gap-1.5">
          {n > 0 && <span className="t-small text-ink-4" aria-hidden="true">·</span>}
          <span className="t-body font-mono tabular text-ink-1">{i.value}</span>
          {i.to
            ? <Link to={i.to} className="t-small text-ink-2 no-underline hover:text-accent underline-offset-2 hover:underline">{i.label}</Link>
            : <span className="t-small text-ink-3">{i.label}</span>}
        </span>
      ))}
    </p>
  )
}
