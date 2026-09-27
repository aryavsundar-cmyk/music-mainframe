/**
 * Caveat — the qualification a figure carries, one line at a time.
 *
 * Some complexity cannot be reduced: a year-on-year change in a restated figure, a total that ignores undisclosed
 * prices, a balance the company stopped tagging. Every one of those needs saying. The mistake was saying all of
 * them at once, in a grey paragraph under a table, where a reader who wants one of them has to read all four and a
 * reader who wants none reads a wall.
 *
 * So the qualification leads with the sentence that changes how the figure is read, and everything the reader
 * needs only if they are about to quote it sits behind a disclosure — a real `<details>`, so it is keyboard
 * reachable, findable by the browser's own find-in-page when open, and works with no JavaScript at all.
 *
 * It is never a way to hide something inconvenient. The line on top has to be the one that matters most: if a
 * total is a floor, "this is a floor" is the line, and the arithmetic is what folds away.
 */
export function Caveat({ children, more, label = 'What this means', className = '' }) {
  if (!more) return <p className={`t-micro text-ink-4 m-0 ${className}`}>{children}</p>
  return (
    <details className={`group ${className}`}>
      <summary className="t-micro text-ink-4 cursor-pointer list-none marker:content-none hover:text-ink-3">
        {children}
        <span className="text-ink-3 ml-1.5 underline underline-offset-2 decoration-dotted">
          {label}<span aria-hidden="true" className="group-open:hidden"> ›</span><span aria-hidden="true" className="hidden group-open:inline"> ⌄</span>
        </span>
      </summary>
      <div className="t-micro text-ink-3 mt-1.5 max-w-2xl">{more}</div>
    </details>
  )
}
