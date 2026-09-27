import { Num, Bar } from '../primitives/index.js'

/** Horizontal bar with a native-currency value label. `share` is 0–1 of the row max, in one currency. */
export function MoneyBar({ value, currency = '$', share, tone = 'publishing', digits = 2 }) {
  return (
    <div className="flex items-center gap-3 min-w-[160px]">
      <Bar share={share} tone={tone} className="flex-1" />
      <Num kind="money" value={value} opts={{ currency, digits }} className="t-data w-[72px] text-right" />
    </div>
  )
}
