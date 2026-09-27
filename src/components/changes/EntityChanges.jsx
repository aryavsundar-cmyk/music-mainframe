import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Card, Eyebrow, Loading } from '../primitives/index.js'
import { ChangeList } from './ChangeList.jsx'
import { useChanges } from '../../hooks/useChanges.js'
import { formatDate } from '../../utils/format.js'

/**
 * What changed here — the last quarter of this one company, on its own page.
 *
 * Everything on a company page is a current state: the freshest revenue, the exposure as it stands, the filings as
 * they are. None of it says what moved. The feed at `/changes` knew, but only if the reader thought to go there and
 * narrow it to one company, which is a question they would have to already have in mind.
 *
 * It is the same `useChanges` the feed uses, scoped with `ids: [entityId]`, so a change appears here and there with
 * the same wording and the same date. Two honesties carry over with it: an unreachable source costs its own kind and
 * nothing else, and a quiet window says the sources hold nothing rather than that nothing happened.
 */
export function EntityChanges({ entityId, name, days = 90 }) {
  // A fresh array each render would defeat the memo inside useChanges and re-collect the feed on every keystroke
  // elsewhere on the page.
  const ids = useMemo(() => [entityId], [entityId])
  const { items, state, coverage, sources } = useChanges({ days, ids })
  const down = Object.entries(sources).filter(([, s]) => s.state === 'unavailable').map(([k]) => k)

  return (
    <Card pad="md">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <Eyebrow as="h2" tone="muted">What changed here</Eyebrow>
        {/* The feed has no single-company filter — it narrows by watchlist — so this is the whole feed, said plainly. */}
        <Link to="/changes" className="t-micro text-ink-3 no-underline hover:text-accent inline-flex items-center gap-1">
          Every company <ArrowRight size={12} aria-hidden="true" />
        </Link>
      </div>

      {state === 'loading' && <Loading what="Reading filings, figures and the archive…" lines={4} />}

      {state !== 'loading' && items.length === 0 && (
        <p className="t-small text-ink-3 m-0">
          Nothing on record changed for {name} in the last {days} days. That is what these sources hold, not a claim
          that the company was quiet{coverage.complete ? '' : ' — part of this window predates the archive'}.
        </p>
      )}

      <ChangeList items={items.slice(0, 8)} layout="compact" />

      {items.length > 8 && <p className="t-micro text-ink-4 m-0 mt-2">{items.length - 8} more in the last {days} days.</p>}
      {state !== 'loading' && (
        <p className="t-micro text-ink-4 m-0 mt-2">
          Last {days} days · filings, figure moves, deals, milestones{down.length ? ` · ${down.join(' and ')} unreachable, so this window is short of them` : ''}
          {coverage.gaps.length ? ` · ${coverage.gaps[0]}` : ''}
          {items.length ? ` · newest ${formatDate(items[0].at)}` : ''}
        </p>
      )}
    </Card>
  )
}
