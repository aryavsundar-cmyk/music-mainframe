import { Num } from '../primitives/index.js'

/** Horizontal bar with a native-currency value label. `share` is 0–1 of the row max. */
export function MoneyBar({ value, currency = '$', share, tone = 'publishing', digits = 2 }) {
  const cls = tone === 'recording' ? 'bg-recording' : tone === 'accent' ? 'bg-accent' : 'bg-publishing'
  return (
    <div className="flex items-center gap-3 min-w-[160px]">
      <div className="h-2 flex-1 rounded-sm bg-ground-3 overflow-hidden"><div className={`h-full ${cls}`} style={{ width: `${Math.max(2, (share || 0) * 100)}%` }} /></div>
      <Num kind="money" value={value} opts={{ currency, digits }} className="t-data w-[72px] text-right" />
    </div>
  )
}
