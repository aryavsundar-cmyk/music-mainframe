import { useId, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { SearchInput } from './SearchInput.jsx'

/**
 * FilterBar — search, then the data. Everything else waits until it is asked for.
 *
 * Before this, a page put every control it had between its title and its first row: the entity table opened with
 * four filter rows and the news page with a whole dashboard, so the reader met the apparatus before the answer.
 * "Set one primary goal for your users on each screen"; and Hick's law says a wall of choices is itself a cost.
 *
 * So one row is always visible — search, the count, and a Filters button carrying the number of active filters —
 * and the controls themselves live in a panel that opens on demand. Active filters stay visible as removable
 * chips whether the panel is open or not, because a filtered view must never look like the whole table.
 */
export function FilterBar({
  search,
  active = [],
  onClear,
  count,
  aside,
  panelLabel = 'Filters',
  defaultOpen = false,
  children,
  className = 'mb-5',
}) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()
  const hasPanel = !!children

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        {search && (
          <SearchInput
            value={search.value}
            onChange={search.onChange}
            placeholder={search.placeholder}
            label={search.label || search.placeholder}
            className="flex-1 min-w-[16rem] max-w-xl"
          />
        )}

        {hasPanel && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={panelId}
            className={`inline-flex items-center gap-1.5 h-9 rounded-md border px-3 t-small cursor-pointer transition-colors duration-100 ${open || active.length ? 'bg-ground-4 border-line-3 text-ink-1' : 'bg-transparent border-line-2 text-ink-2 hover:bg-ground-2 hover:text-ink-1'}`}
          >
            <SlidersHorizontal size={14} aria-hidden="true" />
            {panelLabel}
            {active.length > 0 && <span className="t-micro font-mono text-accent">{active.length}</span>}
          </button>
        )}

        {aside}

        {count && (
          <span className="t-small text-ink-3 tabular whitespace-nowrap ml-auto">
            {count.shown === count.total ? `${count.total} ${count.noun}` : `${count.shown} of ${count.total} ${count.noun}`}
          </span>
        )}
      </div>

      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <span className="t-micro text-ink-4">Filtered by</span>
          {active.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={f.onRemove}
              aria-label={`Remove filter ${f.label}`}
              className="inline-flex items-center gap-1 rounded-sm border border-line-2 bg-ground-2 px-2 py-0.5 t-micro text-ink-1 cursor-pointer hover:border-line-3"
            >
              {f.label}<X size={11} className="text-ink-4" aria-hidden="true" />
            </button>
          ))}
          {onClear && (
            <button type="button" onClick={onClear} className="t-micro text-ink-3 bg-transparent border-0 cursor-pointer hover:text-ink-1 px-1">
              Clear all
            </button>
          )}
        </div>
      )}

      {hasPanel && (
        <div id={panelId} hidden={!open} className="mt-3 rounded-md border border-line-1 bg-ground-1 p-3">
          {children}
        </div>
      )}
    </div>
  )
}
