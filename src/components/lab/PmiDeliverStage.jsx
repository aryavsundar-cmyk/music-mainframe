import { Card } from '../primitives/index.js'
import { buildBoardMemo } from '../../utils/pmiDocs.js'
import { scorecard } from '../../utils/labState.js'
import { fmtM, fmtPct, fmtX, num } from '../../utils/valuation.js'
import { Exercise, Reviewer, NumField, TextArea, Kpi, ExportBar, ScorecardCard, Takeaways } from './LabUi.jsx'

function RangeChart({ bars, markers, max }) {
  const pos = (v) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`
  const step = max > 150e6 ? 50e6 : 25e6
  const ticks = []
  for (let v = 0; v <= max; v += step) ticks.push(v)
  return (
    <div>
      <div className="space-y-3">
        {bars.map((b) => (
          <div key={b.label} className="grid grid-cols-[180px_minmax(0,1fr)] gap-3 items-center">
            <div><div className="t-small text-ink-1">{b.label}</div><div className="t-micro text-ink-4">{b.hint}</div></div>
            <div className="relative h-7 rounded-sm bg-ground-4">
              {b.high > b.low && <div className={`absolute top-1 bottom-1 rounded-sm ${b.tone}`} style={{ left: pos(b.low), width: `calc(${pos(b.high)} - ${pos(b.low)})` }} />}
              {b.mid != null && <div className="absolute top-0 bottom-0 w-0.5 bg-ink-1" style={{ left: pos(b.mid) }} title={fmtM(b.mid)} />}
              {markers.map((m) => <div key={m.label} className={`absolute -top-1 -bottom-1 w-px ${m.tone}`} style={{ left: pos(m.value) }} />)}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-3 mt-2">
        <span />
        <div className="relative h-4">{ticks.map((t) => <span key={t} className="absolute -translate-x-1/2 t-micro font-mono text-ink-4" style={{ left: pos(t) }}>${t / 1e6}M</span>)}</div>
      </div>
      <div className="flex flex-wrap gap-4 mt-3 t-micro text-ink-3">{markers.map((m) => <span key={m.label} className="inline-flex items-center gap-1.5"><span className={`inline-block w-3 h-0.5 ${m.tone}`} />{m.label} {fmtM(m.value)}</span>)}</div>
    </div>
  )
}

export function PmiDeliverStage({ c, state, update, r, b, draft, reviewer }) {
  const d = state.deliver
  const target = num(d.target); const budget = num(d.budget)
  const sc = scorecard(c, state, r, b)
  const bars = [
    { label: 'Banker case', hint: `${fmtM(c.asPresented.runRate)} × ${fmtX(c.asPresented.capMultiple)}`, low: 0, high: draft.capitalised, mid: draft.capitalised, tone: 'bg-ground-3 border border-line-3' },
    { label: 'Your synergy NPV', hint: 'downside · base · unweighted', low: Math.min(r.downside, r.npv), high: Math.max(r.upside, r.npv), mid: r.npv, tone: 'bg-accent-soft border border-accent-line' },
    { label: 'Reviewer synergy NPV', hint: 'downside · base · unweighted', low: b.downside, high: b.upside, mid: b.npv, tone: 'bg-secondary-soft border border-secondary-line' },
  ]
  const max = Math.ceil(Math.max(draft.capitalised, r.upside, b.upside, c.deal.premium) / 25e6) * 25e6
  const reviewerTarget = Math.round(b.netRunRate / 1e5) * 1e5
  const reviewerBudget = Math.round(b.oneOffBudget / 1e5) * 1e5

  return (
    <div className="space-y-6">
      <Exercise n={14} title="Make the board recommendation" prompt="Commit to a run-rate synergy target management can be held to, a one-off budget that funds it, and the reason the number differs from the case the board approved.">
        <RangeChart bars={bars} markers={[{ label: 'Premium paid', value: c.deal.premium, tone: 'bg-danger' }]} max={max} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div><div className="t-small text-ink-2 mb-1">Committed run-rate synergy target</div><NumField prefix="$" width="w-36" value={d.target} onChange={(v) => update(['deliver', 'target'], v)} ariaLabel="Run-rate target" /><div className="t-micro text-ink-4 mt-1">your register: {fmtM(r.runRate)} gross · {fmtM(r.netRunRate)} risk-weighted net</div></div>
          <div><div className="t-small text-ink-2 mb-1">One-off integration budget</div><NumField prefix="$" width="w-36" value={d.budget} onChange={(v) => update(['deliver', 'budget'], v)} ariaLabel="One-off budget" /><div className="t-micro text-ink-4 mt-1">your model: {fmtM(r.oneOffBudget)}</div></div>
        </div>
        <div className="mt-4"><div className="t-small text-ink-2 mb-1">Rationale for the board (three to five sentences)</div><TextArea rows={5} value={d.rationale} onChange={(v) => update(['deliver', 'rationale'], v)} placeholder="The number you commit to, why it differs from the approved case, how much of the premium it earns, and what protects delivery." /></div>
        {target > 0 && budget > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
            <Kpi label="Target vs banker case" value={fmtPct(target / c.asPresented.runRate, 0)} />
            <Kpi label="Target vs your gross register" value={r.runRate ? fmtPct(target / r.runRate, 0) : '—'} tone={target > r.runRate ? 'danger' : 'ink'} />
            <Kpi label="Budget vs your model" value={r.oneOffBudget ? fmtPct(budget / r.oneOffBudget, 0) : '—'} tone={budget < r.oneOffBudget * 0.9 ? 'danger' : 'ink'} />
            <Kpi label="Budget ÷ target" value={fmtX(budget / target, 2)} />
          </div>
        )}
        <Reviewer reviewer={reviewer} label="Reviewer recommendation">
          <p className="m-0">Commit {fmtM(reviewerTarget)} of run-rate synergies (risk-weighted, net of dis-synergies) against a gross register of {fmtM(b.runRate)}; fund {fmtM(reviewerBudget)} of one-off costs; synergy NPV {fmtM(b.npv)}, {fmtX(b.npvCoverage, 2)} the premium; downside {fmtM(b.downside)}, upside {fmtM(b.upside)}; cash break-even in year {b.breakEven}.</p>
          <p className="m-0">{c.benchmarkDeliver.rationale}</p>
        </Reviewer>
      </Exercise>

      <Card pad="lg">
        <div className="t-eyebrow text-ink-3 mb-1">Premium</div>
        <h3 className="t-h2 text-ink-1 m-0 mb-4">What must be true to earn {fmtM(c.deal.premium, 0)}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi label="Share of register delivered" value={r.wmbt.scale != null ? fmtPct(r.wmbt.scale, 0) : 'n/a'} hint="at your phasing and probabilities" tone={r.wmbt.scale != null && r.wmbt.scale > 1 ? 'danger' : 'ink'} />
          <Kpi label="Or discount rate" value={r.wmbt.rate != null ? fmtPct(r.wmbt.rate) : 'n/a'} hint={`modelled ${r.ratePct}%`} />
          <Kpi label="Banker case needs" value={fmtX(c.deal.premium / c.asPresented.value, 2)} hint="of its capitalised value" />
          <Kpi label="Cash break-even" value={r.breakEven ? `Year ${r.breakEven}` : 'n/a'} hint={`year-1 cash ${fmtM(r.annual[0].net)}`} />
        </div>
        <p className="t-body text-ink-2 mt-4 mb-0">If covering the premium needs more than the whole register delivered on time, say so. The board would rather hear it at Day 100 than at the Year-2 impairment test.</p>
      </Card>

      <ScorecardCard sc={sc} />
      <Takeaways items={c.takeaways} />

      <ExportBar title="Export the 100-day board memo" build={() => buildBoardMemo(c, state, r)} />
    </div>
  )
}
