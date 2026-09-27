/**
 * DataTable — one table shell, with a header that stays.
 *
 * Nine copies of the column-header class string and three visual treatments of it existed across the app, and
 * not one of thirteen tables had a sticky header: on `/entities`, hundreds of rows scrolled under a header that
 * left the screen after the first few. The shell also owns the sideways-scroll container, so a wide table
 * scrolls instead of squashing its columns into unreadable wraps.
 *
 * `minWidth` is the width below which the table scrolls rather than compresses. `caption` is read by screen
 * readers and is the honest place to say what the table holds.
 *
 * `maxHeight` is what makes the sticky header real. A wrapper with `overflow-x` is already a scroll container,
 * so a header inside it sticks to a box that never scrolls vertically — which looks exactly like no stickiness
 * at all. Giving a long table its own bounded scroll area gives the header something to stick to, and keeps a
 * 188-row table from turning the page into a mile of rows.
 */
export function DataTable({ minWidth = 760, maxHeight, caption, children, className = '' }) {
  return (
    <div
      className={`overflow-auto -mx-3 px-3 ${className}`}
      style={maxHeight ? { maxHeight } : undefined}
      tabIndex={maxHeight ? 0 : undefined}
      role={maxHeight ? 'region' : undefined}
      aria-label={maxHeight ? caption : undefined}
    >
      <table className="w-full border-collapse" style={{ minWidth }}>
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  )
}

const BASE = 't-micro uppercase tracking-[0.08em] text-ink-3 font-medium py-2 px-3 border-b border-line-2 whitespace-nowrap bg-ground-0'

/**
 * Th — one column header. Sticky by default: the header is how a reader knows what a column means, and it is
 * needed most once they have scrolled away from it.
 *
 * `sort` makes it a sortable header: pass `'asc' | 'desc' | 'none'` and `onSort`, and it renders a real button
 * with `aria-sort` on the cell, which the app's one sortable table (catalog sales) previously lacked.
 */
export function Th({ children, align = 'left', sticky = true, sort, onSort, className = '' }) {
  const alignment = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
  const ariaSort = sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : sort ? 'none' : undefined
  return (
    <th scope="col" aria-sort={ariaSort}
      className={[BASE, alignment, sticky ? 'sticky top-0 z-10' : '', className].join(' ')}>
      {onSort
        ? <button type="button" onClick={onSort} className="inline-flex items-center gap-1 bg-transparent border-0 p-0 t-micro uppercase tracking-[0.08em] text-ink-3 cursor-pointer hover:text-ink-1">
            {children}<span aria-hidden="true" className="text-ink-4">{sort === 'asc' ? '▲' : sort === 'desc' ? '▼' : '↕'}</span>
          </button>
        : children}
    </th>
  )
}
