/**
 * EmptyState — what is missing, why, and what to do next.
 *
 * Of the app's thirty-two empty states, six offered a next action; the rest said "Nothing matches." and stopped.
 * The `action` slot is the point of this component: an empty result is a moment where the reader needs a way
 * out, and this app's own voice is to say what the record holds rather than imply the market is empty.
 */
export function EmptyState({ title, why, action, className = '' }) {
  return (
    <div className={`py-10 px-4 text-center ${className}`}>
      <p className="t-body text-ink-2 m-0">{title}</p>
      {why && <p className="t-small text-ink-3 m-0 mt-1.5 max-w-xl mx-auto">{why}</p>}
      {action && <div className="mt-3 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  )
}

/** The button an empty state offers — plain, and never the page's primary action. */
export function EmptyAction({ onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-line-2 bg-transparent px-2.5 py-1 t-small text-ink-2 cursor-pointer hover:bg-ground-3 hover:text-ink-1">
      {children}
    </button>
  )
}
