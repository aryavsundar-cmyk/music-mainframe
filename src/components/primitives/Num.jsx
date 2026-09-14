import { formatMoney, formatCount, formatPct, formatRate } from '../../utils/format.js'

const FMT = { money: formatMoney, count: formatCount, pct: formatPct, rate: formatRate }
const COLOR = { money: 'text-money', count: 'text-count', pct: 'text-pct', rate: 'text-rate' }
const FULL = { money: (v) => formatMoney(v, { full: true }), count: (v) => formatCount(v, { full: true }) }

/**
 * Num — an inline number with its treatment. Kind decides colour + formatter.
 *   <Num kind="money" value={1.8e9} />  → $1.8B in gold
 *   <Num kind="count" value={62000} />  → 62K in verdigris
 *   <Num kind="pct" value={5.4} />      → 5.4%
 *   <Num kind="rate" value={0.0032} />  → $0.0032
 */
export function Num({ kind = 'count', value, opts, className = '', ...rest }) {
  const fmt = FMT[kind] ?? formatCount
  const title = FULL[kind] && typeof value === 'number' ? FULL[kind](value) : undefined
  return (
    <span className={`font-mono tabular ${COLOR[kind] ?? ''} ${className}`} title={title} {...rest}>
      {fmt(value, opts)}
    </span>
  )
}
