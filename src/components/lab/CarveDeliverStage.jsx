import { Card } from '../primitives/index.js'
import { buildCarveMemo } from '../../utils/carveDocs.js'
import { scorecard } from '../../utils/labState.js'
import { fmtM, fmtPct, fmtX, num } from '../../utils/valuation.js'
import { Exercise, Reviewer, NumField, TextArea, Kpi, ExportBar, ScorecardCard, Takeaways } from './LabUi.jsx'

function ValueField({ bars, markers, lo, hi }) {
  const pos = (v) => `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))}%`
  const ticks = []
  for (let v = Math.ceil(lo / 50e6) * 50e6; v <= hi; v += 50e6) ticks.push(v)
  return (
    <div>
      <div className="space-y-3">
        {bars.map((b) => (
          <div key={b.label} className="grid grid-cols-[180px_minmax(0,1fr)] gap-3 items-center">
            <div><div className="t-small text-ink-1">{b.label}</div><div className="t-micro text-ink-4">{b.hint}</div></div>
            <div className="relative h-7 rounded-sm bg-ground-4">
              {b.low != null && b.high != null && b.high > b.low && <div className={`absolute top-1 bottom-1 rounded-sm ${b.tone}`} style={{ left: pos(b.low), width: `calc(${pos(b.high)} - ${pos(b.low)})` }} />}
              {b.mid != null && <div className="absolute top-0 bottom-0 w-0.5 bg-ink-1" style={{ left: pos(b.mid) }} title={fmtM(b.mid, 0)} />}
              {markers.map((m) => <div key={m.label} className={`absolute -top-1 -bottom-1 w-px ${m.tone}`} style={{ left: pos(m.value) }} />)}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-3 mt-2">
        <span />
        <div className="relative h-4">{ticks.map((t) => <span key={t} className="absolute -translate-x-1/2 t-micro font-mono text-ink-4" style={{ left: pos(t) }}>${t / 1e6}M</span>)}</div>
      </div>
      <div className="flex flex-wrap gap-4 mt-3 t-micro text-ink-3">{markers.map((m) => <span key={m.label} className="inline-flex items-center gap-1.5"><span className={`inline-block w-3 h-0.5 ${m.tone}`} />{m.label} {fmtM(m.value, 0)}</span>)}</div>
    </div>
  )
}

export function CarveDeliverStage({ c, state, update, r, b, draft, reviewer }) {
  const d = state.deliver
  const lo = num(d.low); const hi = num(d.high); const offer = num(d.offer)
  const sc = scorecard(c, state, r, b)
  const conds = d.conditions || []
  const toggle = (id) => update(['deliver', 'conditions'], conds.includes(id) ? conds.filter((x) => x !== id) : [...conds, id])
  const bars = [
    { label: 'Vendor pack', hint: `${fmtX(draft.multiple)} × ${fmtM(draft.vendorEbitda, 1)} pro forma`, low: draft.evRange[0], high: draft.evRange[2], mid: draft.ev, tone: 'bg-ground-3 border border-line-3' },
    { label: 'Standalone case', hint: `${fmtX(r.multiples[0])}–${fmtX(r.multiples[2])} × ${fmtM(r.standaloneEbitda, 1)} less ${fmtM(r.deductions, 1)}`, low: r.evRange[0], high: r.evRange[2], mid: r.ev, tone: 'bg-accent-soft border border-accent-line' },
    { label: 'Your recommendation', hint: lo && hi ? `${fmtM(lo, 0)}–${fmtM(hi, 0)}` : 'set below', low: lo || null, high: hi || null, mid: offer || null, tone: 'bg-accent' },
  ]
  const markers = [{ label: 'Vendor guide', value: c.asPresented.askEv, tone: 'bg-danger' }]
  const chartLo = Math.floor(Math.min(r.evRange[0], lo || Infinity) / 50e6) * 50e6
  const chartHi = Math.ceil(Math.max(draft.evRange[2], c.asPresented.askEv, hi || 0) / 50e6) * 50e6

  return (
    <div className="space-y-6">
      <Exercise n={14} title="Recommend an enterprise value and the conditions" prompt="Give the investment committee a range it can bid inside, the cheque it writes for the stake, and the conditions without which there is no deal.">
        <ValueField bars={bars} markers={markers} lo={chartLo} hi={chartHi} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div><div className="t-small text-ink-2 mb-1">Enterprise value — low</div><NumField prefix="$" width="w-36" value={d.low} onChange={(v) => update(['deliver', 'low'], v)} ariaLabel="EV low" /></div>
          <div><div className="t-small text-ink-2 mb-1">Enterprise value — high</div><NumField prefix="$" width="w-36" value={d.high} onChange={(v) => update(['deliver', 'high'], v)} ariaLabel="EV high" /></div>
          <div><div className="t-small text-ink-2 mb-1">Recommended enterprise value</div><NumField prefix="$" width="w-36" value={d.offer} onChange={(v) => update(['deliver', 'offer'], v)} ariaLabel="Recommended EV" /><div className="t-micro text-ink-4 mt-1">cheque for {r.stake * 100}%: {fmtM((offer || r.ev) * r.stake, 0)}</div></div>
        </div>
        <div className="mt-4">
          <div className="t-small text-ink-2 mb-2">Conditions to proceeding</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {c.protections.filter((p) => p.id !== 'price').map((p) => (
              <label key={p.id} className={['flex items-start gap-2 rounded-md border px-3 py-2 cursor-pointer t-small', conds.includes(p.id) ? 'border-line-3 bg-ground-2 text-ink-1' : 'border-line-1 text-ink-2 hover:bg-ground-2'].join(' ')}>
                <input type="checkbox" className="mt-0.5 accent-[var(--mm-accent)]" checked={conds.includes(p.id)} onChange={() => toggle(p.id)} />{p.label}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-4"><div className="t-small text-ink-2 mb-1">Rationale for the committee (three to five sentences)</div><TextArea rows={5} value={d.rationale} onChange={(v) => update(['deliver', 'rationale'], v)} placeholder="What the business earns standalone, why that differs from the vendor pack, what the separation costs, and the conditions that make the deal safe." /></div>
        <Reviewer reviewer={reviewer} label="Reviewer conclusion">
          <p className="m-0">Range {fmtM(b.evRange[0], 0)}–{fmtM(b.evRange[2], 0)}; recommended {fmtM(b.ev, 0)}; cheque {fmtM(b.cheque, 0)} for {b.stake * 100}%. That is {fmtPct(b.wmbt.gapPct, 0)} below the {fmtM(c.asPresented.askEv, 0)} guide, which needs {fmtX(b.wmbt.multiple)} of standalone EBITDA.</p>
          <p className="m-0">{c.benchmarkDeliver.rationale}</p>
        </Reviewer>
      </Exercise>

      <Card pad="lg">
        <div className="t-eyebrow text-ink-3 mb-1">Vendor guide</div>
        <h3 className="t-h2 text-ink-1 m-0 mb-4">What must be true for {fmtM(c.asPresented.askEv, 0)}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi label="Multiple of standalone EBITDA" value={fmtX(r.wmbt.multiple)} tone={r.wmbt.multiple > r.multiples[2] ? 'danger' : 'ink'} hint={`your range ${fmtX(r.multiples[0])}–${fmtX(r.multiples[2])}`} />
          <Kpi label="Or standalone EBITDA of" value={fmtM(r.wmbt.ebitda, 1)} hint={`you model ${fmtM(r.standaloneEbitda, 1)}`} />
          <Kpi label="Implied on the vendor's pro forma" value={fmtX(r.impliedOnVendor)} hint={`vendor asks ${fmtX(c.asPresented.askEv / c.asPresented.adjEbitda)}`} />
          <Kpi label="Gap to bridge" value={fmtM(r.wmbt.gap, 0)} tone="danger" hint={fmtPct(r.wmbt.gapPct, 0)} />
        </div>
        <p className="t-body text-ink-2 mt-4 mb-0">Most of the gap is not negotiable: the anchor contract resets whatever the buyer believes, and the corporate functions cost what they cost. Say which part of the gap is a price argument and which part is arithmetic.</p>
      </Card>

      <ScorecardCard sc={sc} />
      <Takeaways items={c.takeaways} />

      <ExportBar title="Export the IC carve-out memo" build={() => buildCarveMemo(c, state, r)} />
    </div>
  )
}
