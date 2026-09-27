import { formatMoney, formatMoneyUsd, formatCount, formatPct, formatRate } from '../../utils/format.js'

const FMT = { money: formatMoney, count: formatCount, pct: formatPct, rate: formatRate }
const COLOR = { money: 'text-money', count: 'text-count', pct: 'text-pct', rate: 'text-rate' }

/**
 * Num — an inline number with its treatment. Kind decides colour + formatter.
 *   <Num kind="money" value={1.8e9} />                  → $1.8B in gold
 *   <Num kind="money" value={315.3e6} opts={{ code: 'GBP' }} /> → $421.6M (£315.3M)
 *   <Num kind="count" value={62000} />                  → 62K in verdigris
 *   <Num kind="pct" value={5.4} />                      → 5.4%
 *   <Num kind="rate" value={0.0032} />                  → $0.0032
 *
 * A money figure that knows its currency CODE is converted to dollars with the reported figure in parentheses;
 * this is the single place the application's USD-first rule is applied to a rendered number, so nothing can
 * quietly opt out of it. The hover title spells both out in full.
 */
export function Num({ kind = 'count', value, opts, className = '', ...rest }) {
  const code = kind === 'money' ? opts?.code : undefined
  const fmt = code !== undefined ? (v) => formatMoneyUsd(v, code, opts) : (FMT[kind] ?? formatCount)
  const title = typeof value === 'number'
    ? (code !== undefined ? formatMoneyUsd(value, code, { ...opts, full: true })
      : kind === 'money' ? formatMoney(value, { ...opts, full: true })
        : kind === 'count' ? formatCount(value, { full: true }) : undefined)
    : undefined
  return (
    <span className={`font-mono tabular ${COLOR[kind] ?? ''} ${className}`} title={title} {...rest}>
      {fmt(value, opts)}
    </span>
  )
}
