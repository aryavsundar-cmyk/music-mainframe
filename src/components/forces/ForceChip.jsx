import { Link } from 'react-router-dom'
import { ArrowUp, ArrowDown, ArrowUpDown, Minus } from 'lucide-react'
import { FORCE_BY_ID, DIRECTIONS } from '../../data/forces.js'

const BASE = 'inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-[1px] t-micro whitespace-nowrap'
const ROLE = {
  primary: 'bg-ground-3 text-ink-1 border-line-2 font-medium',
  secondary: 'bg-transparent text-ink-3 border-line-2 border-dashed',
}

/**
 * A force, as a chip. The number is the force's id in the taxonomy, so it carries meaning rather than colour —
 * five more hues on a page that already uses gold and verdigris for recording and publishing would say nothing.
 * Primary is solid, secondary is dashed. Pass `to` only outside a button (a link inside a button is invalid).
 */
export function ForceChip({ id, role = 'primary', to }) {
  const f = FORCE_BY_ID[id]
  if (!f) return null
  const body = <><span className="font-mono">{f.number}</span>{f.short_title}</>
  const cls = `${BASE} ${ROLE[role]}`
  const title = `${role === 'primary' ? 'Primary' : 'Secondary'} force — ${f.title}`
  return to
    ? <Link to={to} className={`${cls} no-underline hover:border-line-3`} title={title}>{body}</Link>
    : <span className={cls} title={title}>{body}</span>
}

/** One primary chip and up to `max` secondary chips, as the spec asks for a deal card. */
export function ForceChips({ tag, max = 2, link = false }) {
  if (!tag?.primary_force_id) return null
  const to = (id) => (link ? `/deals?force=${id}` : undefined)
  const more = tag.secondary_force_ids.length - max
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <ForceChip id={tag.primary_force_id} to={to(tag.primary_force_id)} />
      {tag.secondary_force_ids.slice(0, max).map((id) => <ForceChip key={id} id={id} role="secondary" to={to(id)} />)}
      {more > 0 && <span className="t-micro text-ink-4">+{more}</span>}
    </span>
  )
}

const DIR_ICON = { supports: ArrowUp, challenges: ArrowDown, mixed: ArrowUpDown, neutral: Minus }

/** Direction against the thesis. Only "challenges" takes a semantic colour; the rest stay in ink. */
export function Direction({ d, withLabel = true }) {
  if (!d) return null
  const Icon = DIR_ICON[d]
  return (
    <span className={`inline-flex items-center gap-1 t-micro ${d === 'challenges' ? 'text-danger' : 'text-ink-2'}`} title={`${DIRECTIONS[d]} the force thesis`}>
      <Icon size={11} aria-hidden="true" />{withLabel && DIRECTIONS[d]}
    </span>
  )
}
