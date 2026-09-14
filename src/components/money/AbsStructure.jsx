import { Num } from '../primitives/index.js'
import { formatDate } from '../../utils/format.js'

/**
 * AbsStructure — the fixed-income view of a securitisation: rating, size against collateral
 * (advance rate / overcollateralisation bar), tenor line (close → anticipated repayment → legal final),
 * arrangers, collateral. Conventions borrowed from ABS pre-sale reports, not invented.
 */
function Cell({ label, children }) {
  return (
    <div className="min-w-0">
      <div className="t-micro uppercase tracking-[0.08em] text-ink-4 mb-0.5">{label}</div>
      <div className="t-small text-ink-1 break-words">{children || <span className="text-ink-4">—</span>}</div>
    </div>
  )
}

export function AbsStructure({ abs, value }) {
  const adv = abs.advanceRate ?? (abs.catalogValue && value ? (value / abs.catalogValue) * 100 : null)
  return (
    <div className="rounded-md border border-line-1 bg-ground-1 p-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
        <Cell label="Issuer">{abs.issuer}</Cell>
        <Cell label="Series">{abs.series}</Cell>
        <Cell label="Rating">{abs.rating}</Cell>
        <Cell label="Arrangers / agents">{abs.arrangers?.length ? abs.arrangers.join(' · ') : null}</Cell>
      </div>

      {adv != null && (
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="t-micro uppercase tracking-[0.08em] text-ink-4">Advance rate against collateral value</span>
            <span className="t-data text-ink-2"><Num kind="money" value={value} /> / <Num kind="money" value={abs.catalogValue} /></span>
          </div>
          <div className="h-2.5 rounded-sm bg-ground-3 overflow-hidden flex" title={`${adv.toFixed(1)}% advance · ${(100 - adv).toFixed(1)}% overcollateralisation`}>
            <div className="h-full bg-accent" style={{ width: `${Math.min(adv, 100)}%` }} />
            <div className="h-full bg-secondary-soft flex-1" />
          </div>
          <div className="flex justify-between mt-1 t-micro font-mono">
            <span className="text-accent">notes <Num kind="pct" value={adv} className="text-accent" /></span>
            <span className="text-secondary">overcollateralisation <Num kind="pct" value={100 - adv} className="text-secondary" /></span>
          </div>
        </div>
      )}

      {(abs.ard || abs.finalMaturity) && (
        <div>
          <div className="t-micro uppercase tracking-[0.08em] text-ink-4 mb-1.5">Tenor</div>
          <div className="relative h-6">
            <div className="absolute left-0 right-0 top-1/2 h-px bg-line-2" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-ink-2" />
            {abs.ard && <div className="absolute left-1/3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent" />}
            {abs.finalMaturity && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-ink-3 bg-ground-1" />}
          </div>
          <div className="flex justify-between t-micro font-mono text-ink-3">
            <span>close</span>
            {abs.ard && <span className="text-accent">ARD {formatDate(abs.ard)}</span>}
            {abs.finalMaturity && <span>legal final {formatDate(abs.finalMaturity)}</span>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        <Cell label="Collateral">{abs.collateral}</Cell>
        <Cell label="Notes">{abs.notes}</Cell>
      </div>
    </div>
  )
}
