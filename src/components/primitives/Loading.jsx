/**
 * Loading — what is being read, and the shape it will land in.
 *
 * Every panel that waits on a service said something different and said it as one line of grey text: "Loading…",
 * "Connecting…", "Reading filings, figures and the archive…", "Loading the feed…". One line gives no sense of how
 * much is coming, so a panel that will fill with eight rows looks, for a second, exactly like a panel that is
 * empty — and a reader who has already decided a panel is empty does not look at it again.
 *
 * So: the honest sentence, kept, plus placeholder rows at the height the real rows will be. The bars are
 * `aria-hidden`; the sentence is the accessible announcement, inside a polite live region so it is read once
 * without interrupting whatever the reader is doing elsewhere on the page.
 *
 * `what` is written the way the rest of the app writes: what the app is doing, not what the reader should feel
 * about it. "Reading the filings" — never "Please wait" or "Just a moment".
 */
export function Loading({ what = 'Reading…', lines = 3, className = '' }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-busy="true">
      <p className="t-small text-ink-3 m-0" aria-live="polite">{what}</p>
      <div className="flex flex-col gap-1.5" aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="h-3 rounded-sm bg-ground-2 animate-pulse motion-reduce:animate-none"
            style={{ width: `${[92, 78, 85, 64, 88][i % 5]}%`, animationDelay: `${i * 90}ms` }} />
        ))}
      </div>
    </div>
  )
}
