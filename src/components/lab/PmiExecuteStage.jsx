import { Card, Tag } from '../primitives/index.js'
import { fmtK, fmtM, fmtPct, fmtX, num, sum } from '../../utils/valuation.js'
import { leverMatches } from '../../utils/pmi.js'
import { PMI_STEPS } from '../../utils/pmiState.js'
import { Exercise, Reviewer, Seg, NumField, Table, Money, Figure, Kpi, Verdict, ModelReview } from './LabUi.jsx'
import { Concepts } from './Concepts.jsx'

const Row = ({ label, hint, children }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="t-small text-ink-2">{label}{hint && <span className="block t-micro text-ink-4">{hint}</span>}</span>
    {children}
  </div>
)
const WHEN = [['day1', 'Day 1'], ['day100', 'Day 100'], ['year1', 'Year 1']]
const WHEN_LABEL = Object.fromEntries(WHEN)

export function PmiExecuteStage({ step, onStep, ...p }) {
  const cur = PMI_STEPS.some((s) => s.id === step) ? step : 'baseline'
  const idx = PMI_STEPS.findIndex((s) => s.id === cur)
  const Body = { baseline: Baseline, register: Register, costs: Costs, value: Value, day1: DayOne, people: People, risks: Risks, review: Review }[cur]
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)] gap-6 items-start">
      <nav className="flex flex-wrap gap-1 xl:block xl:space-y-1 xl:sticky xl:top-6" aria-label="Execution steps">
        {PMI_STEPS.map((s, i) => (
          <button key={s.id} type="button" onClick={() => onStep(s.id)} aria-current={s.id === cur ? 'step' : undefined}
            className={['xl:w-full text-left flex items-center gap-2 rounded-md px-2.5 py-1.5 border cursor-pointer t-small xl:border-0', s.id === cur ? 'bg-ground-4 text-ink-1 border-line-3' : 'bg-transparent text-ink-2 border-line-1 hover:bg-ground-2 hover:text-ink-1'].join(' ')}>
            <span className="font-mono t-micro text-ink-4 xl:w-4">{i + 1}</span>{s.label}
          </button>
        ))}
        <div className="hidden xl:block pt-3 px-2.5 space-y-2 border-t border-line-1 mt-2">
          <Kpi label={p.r.method === 'npv' ? 'Your synergy NPV' : 'Your capitalised value'} value={fmtM(p.r.value)} tone="money" hint={`banker ${fmtM(p.draft.capitalised, 0)}`} />
          <Kpi label="Premium coverage" value={fmtX(p.r.coverage, 2)} tone={p.r.coverage < 1 ? 'danger' : 'ink'} hint={`of ${fmtM(p.c.deal.premium, 0)}`} />
        </div>
      </nav>
      <div className="space-y-6 min-w-0">
        {cur === 'baseline' && (
          <Card pad="md" className="border-accent-line">
            <p className="t-body text-ink-1 m-0">You've inherited the banker's synergy case the board approved. Every input starts on their numbers. Rebuild the register, add what they left out, value it properly, then plan Day 1, people, and risks. Log what you find in <button type="button" onClick={() => onStep('review')} className="text-accent bg-transparent border-0 cursor-pointer px-0 underline">Synergy case review</button>. Figures recompute live.</p>
          </Card>
        )}
        <Body {...p} />
        <Concepts ids={PMI_STEPS.find((s) => s.id === cur)?.terms} />
        <div className="flex justify-between">
          {idx > 0 ? <button type="button" onClick={() => onStep(PMI_STEPS[idx - 1].id)} className="t-small text-ink-2 bg-transparent border-0 cursor-pointer px-0">← {PMI_STEPS[idx - 1].label}</button> : <span />}
          {idx < PMI_STEPS.length - 1 ? <button type="button" onClick={() => onStep(PMI_STEPS[idx + 1].id)} className="t-small text-accent bg-transparent border-0 cursor-pointer px-0">{PMI_STEPS[idx + 1].label} →</button> : <span />}
        </div>
      </div>
    </div>
  )
}

function Baseline({ c, draft, reviewer }) {
  const [hal, bw] = c.companies
  const tot = (k) => sum(c.functions.map((f) => f[k].cost))
  const fte = (k) => sum(c.functions.map((f) => f[k].fte))
  const fnCost = Object.fromEntries(c.functions.map((f) => [f.id, f.brightwater.cost]))
  return (
    <>
      <Exercise n={6} title="Deal and cost baseline" prompt="Synergies come off a baseline. Before testing any lever, lay the two cost bases side by side and see where the overlap really is.">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <Kpi label="Price" value={fmtM(c.deal.price, 0)} tone="money" hint={`${fmtX(c.deal.dealMultiple)} ${bw.label.split(' ')[0]} NPS`} />
          <Kpi label="Standalone value" value={fmtM(c.deal.standalone, 0)} tone="money" />
          <Kpi label="Premium to earn" value={fmtM(c.deal.premium, 0)} tone="danger" />
          <Kpi label="Banker synergy value" value={fmtM(draft.capitalised, 0)} hint={`${fmtM(c.asPresented.runRate)} × ${fmtX(c.asPresented.capMultiple)} · ${fmtX(draft.coverage)} premium`} />
        </div>
        <Table minWidth={860}
          columns={[{ key: 'f', label: 'Function' }, { key: 'hc', label: 'Halcyon cost', align: 'right' }, { key: 'hf', label: 'FTE', align: 'right' }, { key: 'bc', label: 'Brightwater cost', align: 'right' }, { key: 'bf', label: 'FTE', align: 'right' }, { key: 'cc', label: 'Combined', align: 'right' }, { key: 'o', label: 'Overlap' }]}
          rows={c.functions.map((f) => ({ key: f.id, f: <span className="t-small text-ink-1">{f.label}</span>, hc: <Figure className="t-data text-ink-3">{fmtM(f.halcyon.cost)}</Figure>, hf: <Figure className="t-data text-ink-4">{f.halcyon.fte || '—'}</Figure>, bc: <Money className="t-data">{fmtM(f.brightwater.cost)}</Money>, bf: <Figure className="t-data text-ink-4">{f.brightwater.fte || '—'}</Figure>, cc: <Figure className="t-data text-ink-1">{fmtM(f.halcyon.cost + f.brightwater.cost)}</Figure>, o: <span className="t-micro text-ink-3">{f.overlap}</span> }))}
          foot={{ f: 'Total', hc: fmtM(tot('halcyon')), hf: fte('halcyon'), bc: <Money>{fmtM(tot('brightwater'))}</Money>, bf: fte('brightwater'), cc: fmtM(tot('halcyon') + tot('brightwater')), o: '' }} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <Kpi label={`${hal.label.split(' ')[0]} cost / NPS`} value={fmtPct(tot('halcyon') / hal.nps, 0)} />
          <Kpi label={`${bw.label.split(' ')[0]} cost / NPS`} value={fmtPct(tot('brightwater') / bw.nps, 0)} />
          <Kpi label="Draft synergies / target cost" value={fmtPct(c.asPresented.runRate / tot('brightwater'), 0)} tone="danger" hint="of the whole Brightwater cost base" />
          <Kpi label="Combined NPS" value={fmtM(hal.nps + bw.nps, 0)} tone="money" />
        </div>
      </Exercise>
      <Card pad="lg">
        <div className="t-eyebrow text-ink-3 mb-3">Banker levers against the cost they come from</div>
        <Table minWidth={760}
          columns={[{ key: 'l', label: 'Lever' }, { key: 't', label: 'Type' }, { key: 'rr', label: 'Draft run rate', align: 'right' }, { key: 'sh', label: 'Share of target function cost', align: 'right' }, { key: 'b', label: 'Stated basis' }]}
          rows={c.levers.map((l) => {
            const share = l.type === 'cost' ? l.draft.rr / fnCost[l.fn] : null
            return { key: l.id, l: <span className="t-small text-ink-1">{l.label}</span>, t: <Tag tone={l.type === 'cost' ? 'neutral' : 'secondary'}>{l.type}</Tag>, rr: <Money className="t-data">{fmtM(l.draft.rr)}</Money>, sh: share == null ? <span className="t-micro text-ink-4">revenue</span> : <Figure className={`t-data ${share >= 0.9 ? 'text-danger' : 'text-ink-2'}`}>{fmtPct(share, 0)}</Figure>, b: <span className="t-micro text-ink-3">{l.basis}</span> }
          })} />
        <Reviewer reviewer={reviewer}>
          <p className="m-0">The banker case removes {fmtPct(c.asPresented.runRate / tot('brightwater'), 0)} of Brightwater's entire cost base while promising to grow its revenue. Cost-to-NPS says the scale gap is real, but a gap is not a plan: each lever needs named cost lines, and any lever at or near 100% of its function (sub-publishing) needs the contracts checked.</p>
          <p className="m-0">Revenue levers carry more than a third of the run rate. They land later and less reliably than cost savings, and none shows churn.</p>
        </Reviewer>
      </Card>
    </>
  )
}

function Register({ c, state, update, r, reviewer }) {
  return (
    <Exercise n={7} title="Rebuild the synergy register" prompt="For each lever, keep or reject it, then set a run rate you can evidence, phasing tied to a real constraint, the one-off cost to achieve it, and a probability of delivery. A one-time recovery goes in backlog, not run rate.">
      <div className="space-y-3">
        {r.levers.map((l) => {
          const x = state.exec.levers[l.id] || {}
          const set = (patch) => update(['exec', 'levers', l.id], { ...x, ...patch, touched: true })
          const show = reviewer || x.revealed
          const ok = leverMatches(l, x)
          const ph = x.phasing || l.draft.phasing
          return (
            <div key={l.id} className={`rounded-md border p-4 ${l.status === 'reject' ? 'border-line-1 opacity-70' : 'border-line-2'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><span className="t-body text-ink-1">{l.label}</span><Tag tone={l.type === 'cost' ? 'neutral' : 'secondary'}>{l.type}</Tag></div>
                  <div className="t-micro text-ink-4 mt-0.5">{l.basis}</div>
                  <div className="t-micro text-ink-4">Banker: {fmtK(l.draft.rr)} · {l.draft.phasing.join('/')}% · one-off {fmtK(l.draft.oneOff)} · {l.draft.prob}%</div>
                </div>
                <div className="flex items-center gap-3">
                  <Seg value={l.status} onChange={(v) => set({ status: v })} options={[['keep', 'Keep'], ['reject', 'Reject']]} />
                  <button type="button" onClick={() => set({ revealed: true })} className="t-micro text-secondary bg-transparent border-0 cursor-pointer px-0">check</button>
                </div>
              </div>
              {l.status !== 'reject' && (
                <div className="flex flex-wrap items-end gap-x-5 gap-y-3 mt-3">
                  <label className="block"><span className="block t-micro text-ink-3 mb-1">Run rate</span><NumField prefix="$" width="w-28" value={x.rr} onChange={(v) => set({ rr: v })} ariaLabel={`${l.label} run rate`} /></label>
                  <div><span className="block t-micro text-ink-3 mb-1">Phasing Y1 · Y2 · Y3 · Y4+</span>
                    <span className="inline-flex gap-1">{[0, 1, 2, 3].map((i) => <NumField key={i} width="w-12" value={ph[i]} onChange={(v) => set({ phasing: Object.assign([...ph], { [i]: v }) })} ariaLabel={`${l.label} phasing year ${i + 1}`} />)}<span className="t-micro text-ink-4 self-center">%</span></span>
                  </div>
                  <label className="block"><span className="block t-micro text-ink-3 mb-1">One-off cost</span><NumField prefix="$" width="w-24" value={x.oneOff} onChange={(v) => set({ oneOff: v })} ariaLabel={`${l.label} one-off`} /></label>
                  <label className="block"><span className="block t-micro text-ink-3 mb-1">Probability</span><NumField width="w-14" suffix="%" value={x.prob} onChange={(v) => set({ prob: v })} ariaLabel={`${l.label} probability`} /></label>
                  {l.benchmark.backlog != null && <label className="block"><span className="block t-micro text-ink-3 mb-1">One-time backlog</span><NumField prefix="$" width="w-24" value={x.backlog} onChange={(v) => set({ backlog: v })} ariaLabel={`${l.label} backlog`} /></label>}
                  <div className="ml-auto text-right"><span className="block t-micro text-ink-3">Risk-weighted</span><Money className="t-data">{fmtK(l.rrWeighted)}</Money></div>
                </div>
              )}
              {show && (
                <div className={`t-small mt-3 ${ok ? 'text-secondary' : 'text-danger'}`}>
                  {ok ? '✓ Close to the reviewer. ' : `✗ Reviewer: ${fmtK(l.benchmark.rr)} · ${l.benchmark.phasing.join('/')}% · one-off ${fmtK(l.benchmark.oneOff)} · ${l.benchmark.prob}%${l.benchmark.backlog ? ` · backlog ${fmtK(l.benchmark.backlog)}` : ''}. `}{l.why}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        <Kpi label="Gross run rate" value={fmtM(r.runRate)} tone="money" hint={`banker ${fmtM(c.asPresented.runRate)}`} />
        <Kpi label="Risk-weighted run rate" value={fmtM(r.runRateWeighted)} tone="money" />
        <Kpi label="Achieved in year 1" value={fmtM(r.year1Run)} hint={r.runRate ? `${fmtPct(r.year1Run / r.runRate, 0)} of run rate` : ''} />
        <Kpi label="Lever one-offs" value={fmtM(sum(r.levers.map((l) => l.oneOff)))} />
      </div>
      <Reviewer reviewer={reviewer}>
        <p className="m-0">Three tests for every lever: is the saving off a cost the combined company would otherwise pay (baseline), is it counted once (overlap), and what stops it landing on Day 1 (phasing)? Then ask what it costs, and how sure you are.</p>
        <p className="m-0">Probabilities apply to synergies, never to one-off costs: you pay the migration bill whether or not the saving arrives.</p>
      </Reviewer>
    </Exercise>
  )
}

function Costs({ c, state, update, r, reviewer }) {
  return (
    <Exercise n={8} title="Add the dis-synergies and costs the banker left out" prompt="Integrations lose some revenue and cost money to run. Decide what belongs in the case and size it.">
      <div className="t-eyebrow text-ink-3 mb-2">Dis-synergies</div>
      <div className="divide-y divide-line-1 border-y border-line-1">
        {r.dis.map((d) => (
          <div key={d.id} className="py-2.5 grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 items-start">
            <input type="checkbox" className="mt-1 accent-[var(--mm-accent)]" checked={d.include} onChange={(e) => update(['exec', 'dis', d.id, 'include'], e.target.checked)} aria-label={`Include ${d.label}`} />
            <div className="min-w-0">
              <div className="t-body text-ink-1">{d.label}</div>
              <div className="t-micro text-ink-4">Phasing {d.phasing.join('/')}%{d.computed === 'attrition' ? ` · from your people decisions: ${fmtM(r.npsAtRisk, 2)} NPS at risk × ${fmtPct(c.attritionContribution, 0)} contribution` : ''}</div>
              {reviewer && <div className={`t-small mt-0.5 ${d.include === d.benchmark ? 'text-secondary' : 'text-danger'}`}>{d.include === d.benchmark ? '✓ ' : '✗ Reviewer includes it. '}{d.why}</div>}
            </div>
            <Money className="t-data">{fmtK(d.rr)}</Money>
          </div>
        ))}
      </div>
      <div className="t-eyebrow text-ink-3 mt-6 mb-2">One-off costs and cash timing</div>
      <div className="divide-y divide-line-1 border-y border-line-1">
        {r.oneOffs.map((o) => (
          <div key={o.id} className="py-2.5 grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 items-start">
            <input type="checkbox" className="mt-1 accent-[var(--mm-accent)]" checked={o.include} onChange={(e) => update(['exec', 'oneOffs', o.id, 'include'], e.target.checked)} aria-label={`Include ${o.label}`} />
            <div className="min-w-0">
              <div className="t-body text-ink-1">{o.label}</div>
              <div className="t-micro text-ink-4">{o.kind === 'tsa' ? `${fmtK(o.monthly)} a month` : o.kind === 'wc' ? 'Cash out in year 1, back in year 2' : o.kind === 'retention' ? `Key-person bonuses ${fmtK(r.keyBonus)} (from your people decisions) + ${fmtK(o.pool)} pool` : `Phased ${o.phase.join('/')}%`}</div>
              {reviewer && <div className={`t-small mt-0.5 ${o.include === o.benchmark ? 'text-secondary' : 'text-danger'}`}>{o.include === o.benchmark ? '✓ ' : '✗ Reviewer includes it. '}{o.why}</div>}
            </div>
            <div className="text-right">
              {o.kind === 'tsa' ? <NumField width="w-14" suffix="months" value={state.exec.oneOffs[o.id]?.months} onChange={(v) => update(['exec', 'oneOffs', o.id, 'months'], v)} ariaLabel="TSA months" />
                : o.kind === 'retention' ? <Money className="t-data">{fmtK(o.amount)}</Money>
                  : <NumField prefix="$" width="w-24" value={state.exec.oneOffs[o.id]?.amount} onChange={(v) => update(['exec', 'oneOffs', o.id, 'amount'], v)} ariaLabel={`${o.label} amount`} />}
              {o.kind === 'tsa' && <div className="t-micro text-ink-4 mt-1">{fmtK(o.amount)}</div>}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        <Kpi label="One-off budget" value={fmtM(r.oneOffBudget)} tone="money" hint={`banker ${fmtM(c.asPresented.oneOffTotal)}`} />
        <Kpi label="Cost to achieve" value={r.costToAchieve == null ? '—' : fmtX(r.costToAchieve, 2)} hint="one-offs ÷ gross run rate" tone={r.costToAchieve != null && r.costToAchieve < 0.5 ? 'danger' : 'ink'} />
        <Kpi label="Steady dis-synergies" value={fmtM(r.disSteady)} />
        <Kpi label="Net risk-weighted run rate" value={fmtM(r.netRunRate)} tone="money" />
      </div>
      <Reviewer reviewer={reviewer}>
        <p className="m-0">The TSA runs until the royalty migration completes, so its length should match your system lever's phasing, not the banker's Day-1 assumption. Mandate transition isn't a cost, but it is a real year-1 cash need the board must fund.</p>
      </Reviewer>
    </Exercise>
  )
}

function Value({ c, state, update, r, b, draft, reviewer }) {
  const v = state.exec.valuation
  const set = (k) => (val) => update(['exec', 'valuation', k], val)
  const max = Math.max(draft.capitalised, r.value, r.upside, c.deal.premium) * 1.05
  const bar = (label, val, tone, hint) => (
    <div key={label} className="grid grid-cols-[150px_minmax(0,1fr)_76px] gap-3 items-center">
      <span className="t-small text-ink-2">{label}{hint && <span className="block t-micro text-ink-4">{hint}</span>}</span>
      <div className="relative h-5 rounded-sm bg-ground-4">
        <div className={`absolute inset-y-0 left-0 rounded-sm ${tone}`} style={{ width: `${Math.max(0, (val / max) * 100)}%` }} />
        <div className="absolute -top-1 -bottom-1 w-px bg-danger" style={{ left: `${(c.deal.premium / max) * 100}%` }} title="Premium" />
      </div>
      <Money className="t-data text-right">{fmtM(val)}</Money>
    </div>
  )
  return (
    <Exercise n={9} title="Value the synergies against the premium" prompt="Decide how to value the case. Then compare with the banker's run rate × deal multiple and see how much of the premium the integration really earns.">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-6">
        <div className="space-y-3">
          <Row label="Method"><Seg value={v.method} onChange={set('method')} options={[['npv', 'Discounted cash flow'], ['multiple', 'Run rate × multiple']]} /></Row>
          {v.method === 'multiple' && <Row label="Capitalisation multiple"><NumField width="w-16" suffix="x" value={v.capMultiple} onChange={set('capMultiple')} ariaLabel="Capitalisation multiple" /></Row>}
          <Row label="Risk-weight synergies"><Seg value={v.riskWeight ? 'on' : 'off'} onChange={(x) => update(['exec', 'valuation', 'riskWeight'], x === 'on')} options={[['on', 'By probability'], ['off', 'At 100%']]} /></Row>
          <Row label="Discount rate"><NumField width="w-16" suffix="%" value={v.rate} onChange={set('rate')} ariaLabel="Discount rate" /></Row>
          <Row label="Explicit horizon"><NumField width="w-16" suffix="years" value={v.horizon} onChange={set('horizon')} ariaLabel="Horizon" /></Row>
          <Row label="Terminal value"><Seg value={v.terminal} onChange={set('terminal')} options={[['none', 'None'], ['perpetuity', 'Perpetuity']]} /></Row>
          {v.terminal === 'perpetuity' && <Row label="Long-run synergy trend" hint="erosion as the business re-invests"><NumField width="w-16" suffix="% / yr" value={v.g} onChange={set('g')} ariaLabel="Terminal trend" /></Row>}
          {v.method === 'multiple' && <Verdict ok={false}>A revenue multiple on unphased, uncosted savings isn't a value</Verdict>}
          {!v.riskWeight && v.method === 'npv' && <Verdict ok={false}>Every lever at 100% probability</Verdict>}
        </div>
        <div className="space-y-3">
          <div className="t-eyebrow text-ink-3">Against the {fmtM(c.deal.premium, 0)} premium</div>
          {bar('Banker case', draft.capitalised, 'bg-ground-3 border border-line-3', `${fmtM(c.asPresented.runRate)} × ${fmtX(c.asPresented.capMultiple)}`)}
          {bar('Your NPV, unweighted', r.upside, 'bg-secondary-soft border border-secondary-line')}
          {bar('Your NPV', r.npv, 'bg-accent', r.riskWeight ? 'risk-weighted' : 'not risk-weighted')}
          {bar('Downside', r.downside, 'bg-accent-soft border border-accent-line', '75% delivery, 125% costs')}
          <div className="t-micro text-ink-4 inline-flex items-center gap-1.5"><span className="inline-block w-3 h-0.5 bg-danger" />Premium paid</div>
        </div>
      </div>
      <div className="mt-6">
        <Table minWidth={820}
          columns={[{ key: 'k', label: '$M' }, ...r.annual.map((a) => ({ key: `y${a.t}`, label: `Y${a.t}`, align: 'right' }))]}
          rows={[
            ['Synergies', 'recurring'], ['Backlog recovery', 'backlog'], ['Dis-synergies', 'dis'], ['One-off costs', 'costs'], ['Working capital', 'wc'], ['Net cash flow', 'net'], ['Cumulative', 'cumulative'], ['Present value', 'pv'],
          ].map(([label, k]) => ({ key: k, k: <span className={`t-small whitespace-nowrap ${k === 'net' ? 'text-ink-1' : 'text-ink-2'}`}>{label}</span>, ...Object.fromEntries(r.annual.map((a) => [`y${a.t}`, <Figure key={a.t} className={`t-data ${a[k] < -1 ? 'text-danger' : k === 'net' || k === 'pv' ? 'text-money' : 'text-ink-3'}`}>{Math.abs(a[k]) < 1 ? '—' : fmtM(a[k])}</Figure>])) }))} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        <Kpi label="Synergy NPV" value={fmtM(r.npv)} tone="money" hint={`terminal ${fmtM(r.pvTerminal)}`} />
        <Kpi label="Premium coverage" value={fmtX(r.coverage, 2)} tone={r.coverage < 1 ? 'danger' : 'count'} hint={r.method === 'npv' ? 'NPV ÷ premium' : 'capitalised ÷ premium'} />
        <Kpi label="Cash break-even" value={r.breakEven ? `Year ${r.breakEven}` : '—'} />
        <Kpi label="To cover the premium" value={r.wmbt.scale != null ? fmtPct(r.wmbt.scale, 0) : '—'} hint="of the register must deliver" />
      </div>
      <Reviewer reviewer={reviewer}>
        <p className="m-0">Reviewer: phased, risk-weighted, net of one-offs and dis-synergies, {b.ratePct}% with a {b.g}% perpetuity. That gives {fmtM(b.npv)}, {fmtX(b.npvCoverage, 2)} the premium, with cash break-even in year {b.breakEven} and a year-1 trough of {fmtM(b.annual[0].net)}.</p>
        <p className="m-0">The banker's {fmtM(draft.capitalised, 0)} applies a revenue multiple to pre-tax savings with no ramp, no costs, and no risk. The honest message is that the premium is covered about once, with little margin for execution error.</p>
      </Reviewer>
    </Exercise>
  )
}

function DayOne({ c, state, update, r, reviewer }) {
  const show = reviewer || state.exec.day1Revealed
  const set = c.day1.filter((d) => state.exec.day1[d.id]).length
  const right = c.day1.filter((d) => state.exec.day1[d.id] === d.benchmark).length
  const tsa = r.oneOffs.find((o) => o.kind === 'tsa')
  const sys = r.levers.find((l) => l.id === 'system')
  return (
    <Exercise n={10} title="Sequence Day 1, Day 100, and Year 1" prompt="Day 1 is about continuity. Put each action where it belongs; anything that risks a missed statement waits until it is safe." aside={<Tag tone="neutral" mono>{set}/{c.day1.length}</Tag>}>
      <div className="divide-y divide-line-1 border-y border-line-1">
        {c.day1.map((d) => {
          const pick = state.exec.day1[d.id]
          return (
            <div key={d.id} className="py-2.5 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-2 items-start">
              <div>
                <div className="t-body text-ink-1">{d.text}</div>
                {show && <div className={`t-small mt-0.5 ${pick === d.benchmark ? 'text-secondary' : pick ? 'text-danger' : 'text-ink-3'}`}>{pick === d.benchmark ? '✓ ' : ''}Reviewer: {WHEN_LABEL[d.benchmark]}</div>}
              </div>
              <Seg value={pick} onChange={(v) => update(['exec', 'day1', d.id], v)} options={WHEN} />
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-between mt-3">
        <button type="button" onClick={() => update(['exec', 'day1Revealed'], true)} className="t-small text-secondary bg-transparent border-0 cursor-pointer px-0">Check my sequencing</button>
        {show && <span className="t-small font-mono text-ink-2">{right}/{c.day1.length} match the reviewer</span>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-5">
        <Kpi label="TSA length" value={`${tsa.months} months`} hint={tsa.include ? 'in your costs' : 'not in your costs'} tone={tsa.include ? 'ink' : 'danger'} />
        <Kpi label="TSA cost" value={fmtM(tsa.amount, 2)} tone="money" />
        <Kpi label="System saving in year 1" value={fmtPct(num(sys.phasing[0]) / 100, 0)} hint="of run rate, per your register" tone={num(sys.phasing[0]) >= 100 && tsa.months > 0 ? 'danger' : 'ink'} />
      </div>
      {num(sys.phasing[0]) >= 100 && tsa.months > 0 && <div className="mt-3"><Verdict ok={false}>You pay a {tsa.months}-month TSA but book the full system saving in year 1</Verdict></div>}
      <Reviewer reviewer={reviewer}>
        <p className="m-0">Day 1 is letters, mandates, money, and the next statement run — plus the retention agreements, because offers go out before rumours do. Notices and re-validation fit the first 100 days. Migration, lease exit, fee changes, and rebrand are Year 1, after two clean parallel statement cycles.</p>
      </Reviewer>
    </Exercise>
  )
}

function People({ c, state, update, r, reviewer }) {
  const show = reviewer || state.exec.peopleRevealed
  const contribution = c.attritionContribution
  return (
    <Exercise n={11} title="Design the organisation and retention plan" prompt="Decide who to retain, who to transition over time, and whose role exits. Each choice changes retention cost and the relationship NPS at risk.">
      <Table minWidth={920}
        columns={[{ key: 'r', label: 'Role' }, { key: 'h', label: 'Holds' }, { key: 'n', label: 'Relationship NPS', align: 'right' }, { key: 'd', label: 'Decision' }, { key: 'b', label: 'Bonus paid', align: 'right' }, { key: 'l', label: 'Expected NPS lost', align: 'right' }]}
        rows={r.people.map((p) => ({
          key: p.id,
          r: <span><span className="t-small text-ink-1 block">{p.role}</span>{show && <span className={`block t-micro mt-0.5 ${p.decision === p.benchmark ? 'text-secondary' : 'text-danger'}`}>{p.decision === p.benchmark ? '✓ ' : `Reviewer: ${p.benchmark}. `}{p.why}</span>}</span>,
          h: <span className="t-micro text-ink-3">{p.holds}</span>,
          n: <Figure className="t-data text-ink-2">{p.nps ? fmtM(p.nps) : '—'}</Figure>,
          d: <Seg value={p.decision} onChange={(v) => update(['exec', 'people', p.id], v)} options={[['retain', 'Retain'], ['transition', 'Transition'], ['exit', 'Exit']]} />,
          b: <Money className="t-data">{fmtK(p.bonusPaid)}</Money>,
          l: <Figure className={`t-data ${p.npsAtRisk > 1e6 ? 'text-danger' : 'text-ink-2'}`}>{p.nps ? fmtK(p.npsAtRisk) : '—'}</Figure>,
        }))}
        foot={{ r: 'Total', b: <Money>{fmtK(r.keyBonus)}</Money>, l: fmtK(r.npsAtRisk) }} />
      <div className="flex items-center justify-between mt-3">
        <button type="button" onClick={() => update(['exec', 'peopleRevealed'], true)} className="t-small text-secondary bg-transparent border-0 cursor-pointer px-0">Check my decisions</button>
        <span className="t-micro text-ink-4">Expected loss: retain {fmtPct(c.peopleRules.retain.loss, 0)} · transition {fmtPct(c.peopleRules.transition.loss, 0)} · exit {fmtPct(c.peopleRules.exit.loss, 0)} · undecided {fmtPct(c.peopleRules.unmanaged.loss, 0)}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-5">
        <Kpi label="Key-person retention" value={fmtM(r.keyBonus, 2)} tone="money" hint="flows into one-off costs" />
        <Kpi label="Relationship NPS at risk" value={fmtM(r.npsAtRisk, 2)} tone={r.npsAtRisk > 3e6 ? 'danger' : 'ink'} />
        <Kpi label="Attrition dis-synergy" value={fmtM(-r.npsAtRisk * contribution, 2)} hint={`at ${fmtPct(contribution, 0)} contribution`} />
      </div>
      <Reviewer reviewer={reviewer}>
        <p className="m-0">Retain the relationship holders and the person who knows the royalty data model. Transition duplicates whose knowledge you still need for renewals, the TSA, or the first audit. Exit only roles with no unique relationships. Exits don't add savings here: those roles are already inside the G&A and creative levers, so counting them again would double count.</p>
      </Reviewer>
    </Exercise>
  )
}

function Risks({ c, state, update, reviewer }) {
  return (
    <Exercise n={12} title="Rate the integration risks and assign mitigations" prompt="Every risk needs a severity and a specific mitigation with an owner — not a general promise to monitor.">
      <div className="space-y-2">
        {c.risks.map((k) => {
          const x = state.exec.risks[k.id] || {}
          const ok = x.severity === k.benchmark.severity && x.mitigation === k.benchmark.mitigation
          return (
            <div key={k.id} className="rounded-md border border-line-1 p-3 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,300px)] gap-3 items-center">
              <div className="min-w-0">
                <div className="t-body text-ink-1">{k.risk}</div>
                {reviewer && <div className={`t-small mt-0.5 ${ok ? 'text-secondary' : 'text-danger'}`}>{ok ? '✓ ' : '✗ '}Reviewer: {k.benchmark.severity} · {c.mitigations.find((m) => m.id === k.benchmark.mitigation)?.label}</div>}
              </div>
              <Seg value={x.severity} onChange={(v) => update(['exec', 'risks', k.id, 'severity'], v)} options={[['High', 'High'], ['Medium', 'Medium'], ['Low', 'Low']]} />
              <select value={x.mitigation || ''} onChange={(e) => update(['exec', 'risks', k.id, 'mitigation'], e.target.value)} className="bg-ground-1 border border-line-2 rounded-md h-8 px-2 t-small text-ink-1 focus:border-accent outline-none w-full" aria-label="Mitigation">
                <option value="">Choose a mitigation…</option>
                {c.mitigations.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
          )
        })}
      </div>
      <Reviewer reviewer={reviewer}>
        <p className="m-0">The high risks are the ones that destroy the asset rather than the synergy: missed statements, lost registrations, and writers following their creatives. Each has a gate (parallel running, re-validation) or a contract (retention). "Accept and monitor" fits none of them.</p>
      </Reviewer>
    </Exercise>
  )
}

function Review(p) {
  return <ModelReview n={13} title="Red-team the banker synergy case" prompt="For each area, decide whether the banker case has a problem before you reveal the re-based answer." {...p} />
}
