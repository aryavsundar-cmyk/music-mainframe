import { WifiOff } from 'lucide-react'

/**
 * ServiceDown — one way of saying a source could not be reached.
 *
 * The same failure was written four ways and coloured two: `text-danger` on the News page and the forces board,
 * muted `ink-4` in the company panels, so the identical outage read as an emergency in one place and as fine print
 * in another. Two of the four said what to do about it and two did not.
 *
 * The rule now: **the tone follows what the reader loses, not which component noticed.** A source the page is
 * built on is `page` level and reads in the danger tone, because a page quietly showing less than it claims to is
 * the worst outcome in this app. A source that fills one panel is `panel` level and stays quiet — the panel is
 * visibly empty, and shouting about it would pull the eye away from the figures that did load.
 *
 * `cost` is not optional. "Filings service unreachable" tells the reader nothing they can act on; "so this company's
 * filing history is missing, not empty" tells them how to read the rest of the page.
 */
const REMEDY = 'In development, start the server (npm run server); in production, check the Render service.'

export function ServiceDown({ service, cost, level = 'panel', remedy = true, className = '' }) {
  const page = level === 'page'
  return (
    <p className={`t-small m-0 ${page ? 'text-danger inline-flex items-start gap-2' : 'text-ink-3'} ${className}`}>
      {page && <WifiOff size={14} className="shrink-0 mt-0.5" aria-hidden="true" />}
      <span>
        {service} is unreachable{cost ? `, so ${cost}` : ''}.
        {remedy && <span className={page ? '' : 'text-ink-4'}> {REMEDY}</span>}
      </span>
    </p>
  )
}
