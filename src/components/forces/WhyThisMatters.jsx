import { FORCE_BY_ID, CONFIDENCE, EXPOSURE_TYPES, RIGHTS_TYPES, REVENUE_STREAMS } from '../../data/forces.js'
import { ForceChips, Direction } from './ForceChip.jsx'

/**
 * "Why this matters" for one deal or event: the rationale, the thesis it links to, and the evidence the tag was
 * built from. The evidence list is the point — a reader can check every tag against the record in front of them.
 */
export function WhyThisMatters({ tag }) {
  if (!tag?.primary_force_id) return null
  const f = FORCE_BY_ID[tag.primary_force_id]
  const facts = [
    ['Confidence', `${tag.force_confidence} — ${CONFIDENCE[tag.force_confidence].toLowerCase()}`],
    ['Exposure', EXPOSURE_TYPES[tag.exposure_type]],
    tag.geography.length ? ['Geography', tag.geography.join(' · ')] : null,
    tag.rights_type.length ? ['Rights', tag.rights_type.map((r) => RIGHTS_TYPES[r]).join(' · ')] : null,
    tag.revenue_stream.length ? ['Revenue', tag.revenue_stream.map((r) => REVENUE_STREAMS[r]).join(' · ')] : null,
  ].filter(Boolean)
  return (
    <div className="rounded-md border border-line-1 bg-ground-1 p-3 space-y-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="t-eyebrow text-ink-3">Why this matters</span>
        <ForceChips tag={tag} max={3} link />
        <Direction d={tag.force_impact_direction} />
      </div>
      <p className="t-small text-ink-2 m-0 max-w-3xl">
        <span className="text-ink-1">{f.title}.</span> {f.thesis}
      </p>
      <p className="t-small text-ink-3 m-0 max-w-3xl">{tag.direction_reason}</p>
      <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-0.5 m-0">
        {facts.map(([k, v]) => <div key={k} className="contents"><dt className="t-micro text-ink-4">{k}</dt><dd className="t-micro text-ink-2 m-0">{v}</dd></div>)}
      </dl>
      <div>
        <div className="t-micro text-ink-4 mb-1">Evidence in the record</div>
        <ul className="m-0 pl-4 space-y-0.5">
          {tag.evidence.map((e, i) => <li key={i} className="t-micro text-ink-2"><span className="text-ink-4 font-mono mr-1.5">{FORCE_BY_ID[e.force].number}</span>{e.label}</li>)}
        </ul>
      </div>
    </div>
  )
}
