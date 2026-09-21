import { ExternalLink } from 'lucide-react'
import { Card } from '../primitives/index.js'
import { EXPOSURE_TYPES } from '../../data/forces.js'
import { LimitNote } from '../prospecting/LimitNote.jsx'
import { formatDate } from '../../utils/format.js'
import { ForceChips, Direction } from './ForceChip.jsx'

function Column({ title, items }) {
  return (
    <div>
      <div className="t-eyebrow text-ink-3 mb-1.5">{title}</div>
      <ul className="m-0 pl-4 space-y-1">{items.map((x) => <li key={x} className="t-small text-ink-2">{x}</li>)}</ul>
    </div>
  )
}

/**
 * One force in full: the thesis and its framework as written, what the evidence adds up to, and the newest items
 * behind it — deals on record and live-feed events together, in date order.
 */
export function ForcePanel({ activity }) {
  const { force: f } = activity
  const mix = Object.entries(activity.byExposure).sort((a, b) => b[1] - a[1])
  const max = Math.max(1, ...mix.map(([, v]) => v))
  return (
    <Card pad="lg" className="mb-8">
      <div className="t-eyebrow text-accent mb-1">Force {f.number}</div>
      <h2 className="t-h2 text-ink-1 m-0 mb-2 text-balance">{f.title}</h2>
      <p className="t-lede text-ink-1 m-0 mb-1 max-w-3xl">{f.thesis}</p>
      <p className="t-body text-ink-2 m-0 mb-6 max-w-3xl">{f.summary}</p>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 mb-8">
        <Column title="Industry force" items={f.industry_force} />
        <Column title="Evidence signals" items={f.evidence_signals} />
        <Column title="Implications" items={f.implications} />
        <Column title="Market opportunities" items={f.market_opportunities} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div>
          <div className="t-eyebrow text-ink-3 mb-2">Activity by exposure type</div>
          {mix.length ? (
            <div className="space-y-1.5">
              {mix.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[10rem_1fr_2rem] items-center gap-2">
                  <span className="t-micro text-ink-2 truncate">{EXPOSURE_TYPES[k]}</span>
                  <span className="h-1.5 rounded-full bg-ground-3 overflow-hidden"><span className="block h-full bg-accent rounded-full" style={{ width: `${(v / max) * 100}%` }} /></span>
                  <span className="t-micro text-ink-2 font-mono tabular text-right">{v}</span>
                </div>
              ))}
            </div>
          ) : <p className="t-small text-ink-3 m-0">Nothing in this view ties to this force.</p>}
          <LimitNote ids={['force']} title="What a force tag is, and is not" className="mt-6" />
        </div>
        <div>
          <div className="t-eyebrow text-ink-3 mb-2">Latest evidence · deals on record and the live feed</div>
          <div className="border-t border-line-1">
            {activity.feed.slice(0, 12).map((x) => (
              <div key={`${x.kind}-${x.id}`} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 py-2 border-b border-line-1">
                <span className="t-data text-ink-3">{formatDate(String(x.date).slice(0, 10))}</span>
                <div className="min-w-0">
                  <div className="flex items-start gap-2">
                    {x.kind === 'deal'
                      ? <a href={`#${x.id}`} className="t-small text-ink-1 no-underline hover:text-accent">{x.title}</a>
                      : <a href={x.source_url} target="_blank" rel="noreferrer" className="t-small text-ink-1 no-underline hover:text-accent inline-flex gap-1">{x.title}<ExternalLink size={10} className="shrink-0 mt-1 text-ink-4" aria-hidden="true" /></a>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="t-micro text-ink-4">{x.kind === 'deal' ? 'On record' : x.source_label || 'Live feed'}</span>
                    <ForceChips tag={x} />
                    <Direction d={x.force_impact_direction} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
