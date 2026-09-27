import { Link } from 'react-router-dom'
import { ArrowRight, Check, Minus } from 'lucide-react'
import { Card, Eyebrow, Tag } from '../primitives/index.js'

/**
 * What the record holds about this company — and, where there is no figure, which kind of nothing it is.
 *
 * The company page used to render the Financials section or render nothing, so a company with no figure looked
 * exactly like a company nobody had looked at, which looked exactly like a company that publishes nothing. This
 * block replaces that silence with the sentence `figureGap` computed, and a checklist of what else is on record.
 *
 * The tone is deliberately flat. "Not researched yet" is not an apology and not an error state: it is the true
 * status of 87 of 188 companies on this canvas, and hiding it would make the other 101 less trustworthy, not more.
 */
const TONE = {
  reported: 'neutral',
  partial: 'neutral',
  consolidated: 'secondary',
  none: 'neutral',
  unresearched: 'accent',
}

export function Coverage({ coverage, className = '' }) {
  const { gap, held } = coverage
  if (!gap) return null
  return (
    <Card pad="md" className={className}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <Eyebrow as="h2" tone="muted">What the record holds</Eyebrow>
        <Tag tone={TONE[gap.state] || 'neutral'}>{gap.label}</Tag>
      </div>

      {gap.note && <p className="t-small text-ink-2 m-0 mb-3 max-w-2xl">{gap.note}</p>}

      {/* The one case where the gap is also a route: the parent that does report. */}
      {gap.via && gap.readable && (
        <Link to={`/entities/${gap.via.id}`} className="t-small text-accent no-underline hover:underline inline-flex items-center gap-1 mb-3">
          {gap.via.short || gap.via.name}&apos;s figures <ArrowRight size={13} aria-hidden="true" />
        </Link>
      )}

      <ul className="m-0 p-0 list-none flex flex-col">
        {held.map((h) => (
          <li key={h.id} className="grid grid-cols-[1.25rem_minmax(0,8rem)_minmax(0,1fr)] gap-2 items-baseline py-1 border-b border-line-1 last:border-0">
            {h.has
              ? <Check size={13} className="text-secondary mt-0.5" aria-label="on record" />
              : <Minus size={13} className="text-ink-4 mt-0.5" aria-label="not on record" />}
            <span className={`t-small ${h.has ? 'text-ink-2' : 'text-ink-3'}`}>{h.label}</span>
            <span className="t-micro text-ink-4">{h.detail}</span>
          </li>
        ))}
      </ul>

      <p className="t-micro text-ink-4 m-0 mt-2">
        Counted from this app&apos;s own records: &ldquo;on record&rdquo; means the canvas holds it, never that nothing else exists.
      </p>
    </Card>
  )
}
