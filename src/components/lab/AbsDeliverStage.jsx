import { Card } from '../primitives/index.js'
import { buildCreditMemo, REC_LABEL } from '../../utils/absDocs.js'
import { KEY_CONDITIONS } from '../../utils/absState.js'
import { scorecard } from '../../utils/labState.js'
import { fmtM, fmtPct, fmtX, num } from '../../utils/valuation.js'
import { Exercise, Reviewer, Seg, NumField, TextArea, Kpi, ExportBar, ScorecardCard, Takeaways } from './LabUi.jsx'

function Gauge({ label, hint, value, max, marks }) {
  const pos = (v) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`
  return (
    <div className="grid grid-cols-[170px_minmax(0,1fr)] gap-3 items-center">
      <div><div className="t-small text-ink-1">{label}</div><div className="t-micro text-ink-4">{hint}</div></div>
      <div className="relative h-7 rounded-sm bg-ground-4">
        <div className="absolute top-1 bottom-1 left-0 rounded-sm bg-accent-soft border border-accent-line" style={{ width: pos(value) }} />
        {marks.map((m) => <div key={m.label} className={`absolute -top-1 -bottom-1 w-px ${m.tone}`} style={{ left: pos(m.value) }} title={`${m.label} ${fmtM(m.value, 0)}`} />)}
      </div>
    </div>
  )
}

export function AbsDeliverStage({ c, state, update, r, b, draft, reviewer }) {
  const d = state.deliver
  const sc = scorecard(c, state, r, b)
  const conds = d.conditions || []
  const toggle = (id) => update(['deliver', 'conditions'], conds.includes(id) ? conds.filter((x) => x !== id) : [...conds, id])
  const maxA = num(d.maxA)
  const aSize = c.structure.notes.aSize
  const scale = Math.ceil(Math.max(c.asPresented.appraisal, r.value, aSize) / 50e6) * 50e6
  const marks = [{ label: 'Offered Class A', value: aSize, tone: 'bg-danger' }, { label: 'Model maximum', value: r.maxA, tone: 'bg-secondary' }, ...(maxA ? [{ label: 'Your maximum', value: maxA, tone: 'bg-ink-1' }] : [])]
  const sev = r.scenarios.find((x) => x.id === c.targets.stressScenario)

  return (
    <div className="space-y-6">
      <Exercise n={15} title="Make the credit recommendation" prompt="Tell the committee whether to invest, at what Class A size, on what conditions, and why the answer differs from the offering.">
        <div className="space-y-3">
          <Gauge label="Sponsor appraisal" hint={`Class A ${fmtPct(c.asPresented.ltvA, 0)} LTV as stated`} value={c.asPresented.appraisal} max={scale} marks={marks} />
          <Gauge label="Your collateral value" hint={`Class A ${fmtPct(r.ltvA, 0)} LTV at the offered size`} value={r.value} max={scale} marks={marks} />
          <div className="grid grid-cols-[170px_minmax(0,1fr)] gap-3"><span /><div className="flex flex-wrap gap-4 t-micro text-ink-3">{marks.map((m) => <span key={m.label} className="inline-flex items-center gap-1.5"><span className={`inline-block w-3 h-0.5 ${m.tone}`} />{m.label} {fmtM(m.value, 0)}</span>)}</div></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div><div className="t-small text-ink-2 mb-1">Recommendation</div><Seg size="md" value={d.recommendation} onChange={(v) => update(['deliver', 'recommendation'], v)} options={Object.entries(REC_LABEL)} /></div>
          <div><div className="t-small text-ink-2 mb-1">Maximum Class A size Lowell supports</div><NumField prefix="$" width="w-36" value={d.maxA} onChange={(v) => update(['deliver', 'maxA'], v)} ariaLabel="Maximum Class A" /><div className="t-micro text-ink-4 mt-1">your model: {fmtM(r.maxA, 0)} · offered {fmtM(aSize, 0)}</div></div>
        </div>
        <div className="mt-4">
          <div className="t-small text-ink-2 mb-2">Conditions to investing</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {c.protections.filter((p) => p.id !== 'price').map((p) => (
              <label key={p.id} className={['flex items-start gap-2 rounded-md border px-3 py-2 cursor-pointer t-small', conds.includes(p.id) ? 'border-line-3 bg-ground-2 text-ink-1' : 'border-line-1 text-ink-2 hover:bg-ground-2'].join(' ')}>
                <input type="checkbox" className="mt-0.5 accent-[var(--mm-accent)]" checked={conds.includes(p.id)} onChange={() => toggle(p.id)} />{p.label}
              </label>
            ))}
          </div>
        </div>
        <div className="mt-4"><div className="t-small text-ink-2 mb-1">Rationale for the committee (three to five sentences)</div><TextArea rows={5} value={d.rationale} onChange={(v) => update(['deliver', 'rationale'], v)} placeholder="What the collateral really supports, how it compares with the offering, what breaks Class A, and the size and conditions that make it investable." /></div>
        <Reviewer reviewer={reviewer} label="Reviewer recommendation">
          <p className="m-0">{REC_LABEL[c.benchmarkDeliver.recommendation]}; maximum Class A {fmtM(b.maxA, 0)} versus {fmtM(aSize, 0)} offered. Conditions: {c.benchmarkDeliver.conditions.map((id) => c.protections.find((p) => p.id === id)?.label.toLowerCase()).join('; ')}.</p>
          <p className="m-0">{c.benchmarkDeliver.rationale}</p>
        </Reviewer>
      </Exercise>

      <Card pad="lg">
        <div className="t-eyebrow text-ink-3 mb-1">Offering versus review</div>
        <h3 className="t-h2 text-ink-1 m-0 mb-4">What the offering needs to be true</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi label="Collections vs your base" value={fmtPct(c.asPresented.offeringNcf / r.borrowingBase - 1, 0)} hint="uplift the offering assumes" tone="danger" />
          <Kpi label="Year-1 DSCR" value={`${fmtX(r.base.dscr1, 2)}`} hint={`offering ${fmtX(draft.base.dscr1, 2)}`} tone={r.base.dscr1 < c.targets.dscr ? 'danger' : 'ink'} />
          <Kpi label="Haircut to Class A loss" value={r.breakeven.aLoss == null ? 'none' : `${r.breakeven.aLoss.toFixed(0)}%`} hint={`offering ${draft.breakeven.aLoss == null ? 'none' : `${draft.breakeven.aLoss.toFixed(0)}%`}`} />
          <Kpi label={sev.label} value={sev.aLoss > 1000 ? `A loss ${fmtM(sev.aLoss, 0)}` : 'A repaid'} tone={sev.aLoss > 1000 ? 'danger' : 'count'} />
        </div>
        <p className="t-body text-ink-2 mt-4 mb-0">Key conditions the reviewer would not invest without: {KEY_CONDITIONS.map((k) => c.protections.find((p) => p.id === k)?.label.toLowerCase()).join('; ')}.</p>
      </Card>

      <ScorecardCard sc={sc} />
      <Takeaways items={c.takeaways} />

      <ExportBar title="Export the credit memo" build={() => buildCreditMemo(c, state, r)} />
    </div>
  )
}
