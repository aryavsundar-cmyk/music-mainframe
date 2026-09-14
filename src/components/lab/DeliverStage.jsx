import { Card } from '../primitives/index.js'
import { buildValuationMemo } from '../../utils/labDocs.js'
import { scorecard } from '../../utils/labState.js'
import { fmtK, fmtM, fmtPct, fmtX, num } from '../../utils/valuation.js'
import { Exercise, Reviewer, NumField, TextArea, Kpi, ExportBar, ScorecardCard, Takeaways } from './LabUi.jsx'

function FootballField({ bars, markers, lo, hi }) {
  const pos = (v) => `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))}%`
  const ticks = []
  for (let v = Math.ceil(lo / 1e6); v <= Math.floor(hi / 1e6); v++) ticks.push(v * 1e6)
  return (
    <div>
      <div className="space-y-3">
        {bars.map((b) => (
          <div key={b.label} className="grid grid-cols-[180px_minmax(0,1fr)] gap-3 items-center">
            <div><div className="t-small text-ink-1">{b.label}</div><div className="t-micro text-ink-4">{b.hint}</div></div>
            <div className="relative h-7 rounded-sm bg-ground-4">
              {b.low != null && b.high != null && b.high > b.low && <div className={`absolute top-1 bottom-1 rounded-sm ${b.tone}`} style={{ left: pos(b.low), width: `calc(${pos(b.high)} - ${pos(b.low)})` }} />}
              {b.mid != null && <div className="absolute top-0 bottom-0 w-0.5 bg-ink-1" style={{ left: pos(b.mid) }} title={fmtM(b.mid, 2)} />}
              {markers.map((m) => <div key={m.label} className={`absolute -top-1 -bottom-1 w-px ${m.tone}`} style={{ left: pos(m.value) }} />)}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-3 mt-2">
        <span />
        <div className="relative h-4">{ticks.map((t) => <span key={t} className="absolute -translate-x-1/2 t-micro font-mono text-ink-4" style={{ left: pos(t) }}>${t / 1e6}M</span>)}</div>
      </div>
      <div className="flex flex-wrap gap-4 mt-3 t-micro text-ink-3">{markers.map((m) => <span key={m.label} className="inline-flex items-center gap-1.5"><span className={`inline-block w-3 h-0.5 ${m.tone}`} />{m.label} {fmtM(m.value, 2)}</span>)}</div>
    </div>
  )
}

export function DeliverStage({ c, state, update, r, b, reviewer }) {
  const d = state.deliver
  const low = num(d.low); const high = num(d.high); const offer = num(d.offer)
  const sc = scorecard(c, state, r, b)
  const dcfLow = Math.min(...r.scenarios.map((x) => x.ev)); const dcfHigh = Math.max(...r.scenarios.map((x) => x.ev))
  const bars = [
    { label: 'DCF', hint: 'recomputed draft scenarios', low: r.scenarios[2]?.ev, high: r.scenarios[0]?.ev, mid: r.dcf.ev, tone: 'bg-accent-soft border border-accent-line' },
    { label: 'Normalised LTM multiple', hint: `${fmtX(r.mults[0])}–${fmtX(r.mults[2])} × ${fmtK(r.normalized)}`, low: r.multipleValues[0], high: r.multipleValues[2], mid: r.multipleValues[1], tone: 'bg-secondary-soft border border-secondary-line' },
    { label: 'Your concluded range', hint: low && high ? `${fmtM(low)}–${fmtM(high)}` : 'set below', low: low || null, high: high || null, mid: offer || null, tone: 'bg-accent' },
  ]
  const markers = [{ label: 'Seller ask', value: c.sellerAsk, tone: 'bg-danger' }, ...(offer ? [{ label: 'Your offer', value: offer, tone: 'bg-secondary' }] : [])]
  const lo = Math.floor(Math.min(dcfLow, r.multipleValues[0], low || Infinity, offer || Infinity) / 1e6) * 1e6 - 5e5
  const hi = Math.ceil(Math.max(dcfHigh, r.multipleValues[2], high || 0, c.sellerAsk) / 1e6) * 1e6 + 5e5
  const w = r.wmbt

  return (
    <div className="space-y-6">
      <Exercise n={15} title="Conclude and recommend" prompt="Triangulate. State a range you can defend at IC, an offer, and why — including why you won't pay the ask.">
        <FootballField bars={bars} markers={markers} lo={lo} hi={hi} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div><div className="t-small text-ink-2 mb-1">Concluded range — low</div><NumField prefix="$" width="w-36" value={d.low} onChange={(v) => update(['deliver', 'low'], v)} ariaLabel="Range low" /></div>
          <div><div className="t-small text-ink-2 mb-1">Concluded range — high</div><NumField prefix="$" width="w-36" value={d.high} onChange={(v) => update(['deliver', 'high'], v)} ariaLabel="Range high" /></div>
          <div><div className="t-small text-ink-2 mb-1">Recommended headline offer</div><NumField prefix="$" width="w-36" value={d.offer} onChange={(v) => update(['deliver', 'offer'], v)} ariaLabel="Offer" /></div>
        </div>
        <div className="mt-4"><div className="t-small text-ink-2 mb-1">Rationale for IC (three to five sentences)</div><TextArea rows={5} value={d.rationale} onChange={(v) => update(['deliver', 'rationale'], v)} placeholder="Anchor, cross-check, what closes the gap to the ask, and the protections that make the offer safe." /></div>
        <Reviewer reviewer={reviewer} label="Reviewer conclusion">
          <p className="m-0">Range {fmtM(b.scenarios[2]?.ev ?? b.dcf.ev, 1)}–{fmtM(Math.max(b.dcf.ev, b.multipleValues[1]), 1)}; headline offer {fmtM(b.headline, 2)}; price after bridge {fmtM(b.price, 2)}; {fmtM(b.cashAtClose, 2)} at close.</p>
          <p className="m-0">{c.benchmarkDeliver.rationale}</p>
        </Reviewer>
      </Exercise>

      <Card pad="lg">
        <div className="t-eyebrow text-ink-3 mb-1">Seller ask</div>
        <h3 className="t-h2 text-ink-1 m-0 mb-4">What must be true for {fmtM(c.sellerAsk)}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi label="Multiple of normalised LTM" value={fmtX(w.multiple)} hint={`your range ${fmtX(r.mults[0])}–${fmtX(r.mults[2])}`} tone={w.multiple > r.mults[2] ? 'danger' : 'ink'} />
          <Kpi label="Or discount rate" value={w.rate != null ? fmtPct(w.rate) : 'n/a'} hint={`your build ${r.ratePct.toFixed(2)}%`} tone={w.rate != null && w.rate * 100 < c.rateBand[0] ? 'danger' : 'ink'} />
          <Kpi label="Or long-run trend" value={w.trend != null ? `${w.trend > 0 ? '+' : ''}${w.trend.toFixed(1)}%` : 'n/a'} hint={`modelled ${state.exec.terminal.g}% / yr`} />
          <Kpi label="Or every year's cash flow" value={w.uplift != null ? `+${fmtPct(w.uplift - 1, 0)}` : 'n/a'} hint="above your forecast" />
        </div>
        <p className="t-body text-ink-2 mt-4 mb-0">Isolate which assumption bridges the gap and ask whether any evidence supports it. If none does, the ask is a negotiating position, not a value.</p>
      </Card>

      <ScorecardCard sc={sc} />
      <Takeaways items={c.takeaways} />

      <ExportBar title="Export the IC valuation memo" build={() => buildValuationMemo(c, state, r)} />
    </div>
  )
}
