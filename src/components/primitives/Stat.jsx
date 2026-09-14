import { Num } from './Num.jsx'

/**
 * Stat — label above a large number. The number keeps its Num treatment.
 * `hint` is a muted line under the value (as-of date, source, denominator).
 */
export function Stat({ label, value, kind = 'count', opts, hint, size = 'md', className = '' }) {
  const sizeCls = size === 'lg' ? 't-stat-lg' : size === 'sm' ? 't-data' : 't-stat'
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="t-micro text-ink-3 uppercase tracking-[0.08em]">{label}</div>
      {typeof value === 'number' || value == null
        ? <Num kind={kind} value={value} opts={opts} className={sizeCls} />
        : <div className={`${sizeCls} text-ink-1`}>{value}</div>}
      {hint && <div className="t-micro text-ink-4">{hint}</div>}
    </div>
  )
}
