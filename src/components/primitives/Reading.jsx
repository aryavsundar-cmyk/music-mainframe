/**
 * Reading — the sentence a page computes about its own numbers.
 *
 * Every data page in this app could tell the reader what its rows add up to, and until Sprint 35 only the News
 * page did. This renders the output of `src/utils/readings.js`: one paragraph, at reading size, sitting with the
 * headline figures rather than below the table, because the point is to say something true before the reader
 * starts filtering.
 *
 * It renders nothing when there is nothing to say, so a page can pass a reading unconditionally.
 */
export function Reading({ reading, className = '' }) {
  if (!reading?.text) return null
  return <p className={`t-small text-ink-2 m-0 max-w-3xl ${className}`}>{reading.text}</p>
}
