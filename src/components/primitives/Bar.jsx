/**
 * Bar — one proportion, drawn.
 *
 * Nine places in the app drew their own: four heights, two track colours, four ways of handling a value at or near
 * zero, and one that let a 0.3% bar vanish entirely so the row read as missing data rather than as a small number.
 * This is the only one now.
 *
 * `share` is 0–1 of whatever the caller is comparing against, and the caller owns that decision — a bar has no axis
 * and no scale printed on it, so a row measured against a different maximum from the row above it is a lie the
 * reader cannot catch. In particular: **never scale a money bar across currencies.** The figure beside the bar is
 * the fact; the bar is there so a column of figures has a shape.
 *
 * `segments` is the stacked form, for a whole that divides into named parts (an advance rate against its
 * overcollateralisation, a paid stream against its splits): `[{ share, tone }, …]`, shares summing to 1. One
 * segment may pass `rest: true` to take whatever is left.
 *
 * `label` is what a screen reader and a hover get. A bar that repeats the number next to it needs no label and
 * passes none: it is then `aria-hidden`, because reading "57%" twice is worse than reading it once.
 *
 * `as` exists because a bar is often a cell's second mark, sitting inside a `<span>`. A `<div>` there is invalid
 * nesting, and browsers silently reparent it, which breaks the layout in ways that look like a CSS bug.
 */
const TONE = {
  accent: 'bg-accent',
  secondary: 'bg-secondary',
  'secondary-soft': 'bg-secondary-soft',
  recording: 'bg-recording',
  publishing: 'bg-publishing',
  ink: 'bg-ink-3',
  danger: 'bg-danger',
}

const pct = (share) => Math.max(0, Math.min(1, Number(share) || 0)) * 100

export function Bar({
  share = 0, segments, tone = 'accent', height = 'h-2', track = 'bg-ground-3', label, as: Tag = 'div', className = '',
}) {
  const fill = Tag === 'span' ? 'block h-full' : 'h-full'
  // A real but tiny number still gets a visible sliver; a genuine zero gets nothing, so the two never look alike.
  const width = pct(share) > 0 ? Math.max(1.5, pct(share)) : 0
  return (
    <Tag className={`${height} rounded-sm ${track} overflow-hidden ${segments ? 'flex' : ''} ${className}`}
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'} title={label}>
      {segments
        ? segments.map((seg, i) => (
            <Tag key={i} className={`${fill} ${TONE[seg.tone] || TONE.accent} ${seg.rest ? 'flex-1' : ''}`}
              style={seg.rest ? undefined : { width: `${pct(seg.share)}%` }} />
          ))
        : width > 0 && <Tag className={`${fill} ${TONE[tone] || TONE.accent}`} style={{ width: `${width}%` }} />}
    </Tag>
  )
}
