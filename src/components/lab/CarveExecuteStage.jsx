import { Card, Tag } from '../primitives/index.js'
import { fmtK, fmtM, fmtPct, fmtX, num } from '../../utils/valuation.js'
import { CARVE_STEPS, bridgeMatches } from '../../utils/carveState.js'
import { Exercise, Reviewer, Seg, NumField, Table, Money, Figure, Kpi, Verdict, ModelReview } from './LabUi.jsx'
import { Concepts } from '../reference/Concepts.jsx'

const Row = ({ label, hint, children }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="t-small text-ink-2">{label}{hint && <span className="block t-micro text-ink-4">{hint}</span>}</span>
    {children}
  </div>
)

export function CarveExecuteStage({ step, onStep, ...p }) {
  const cur = CARVE_STEPS.some((s) => s.id === step) ? step : 'baseline'
  const idx = CARVE_STEPS.findIndex((s) => s.id === cur)
  const Body = { baseline: Baseline, revenue: RevenueQuality, standalone: Standalone, bridge: Bridge, separation: Separation, value: Value, findings: Findings, review: Review }[cur]
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)] gap-6 items-start">
      <nav className="flex flex-wrap gap-1 xl:block xl:space-y-1 xl:sticky xl:top-6" aria-label="Execution steps">
        {CARVE_STEPS.map((s, i) => (
          <button key={s.id} type="button" onClick={() => onStep(s.id)} aria-current={s.id === cur ? 'step' : undefined}
            className={['xl:w-full text-left flex items-center gap-2 rounded-md px-2.5 py-1.5 border cursor-pointer t-small xl:border-0', s.id === cur ? 'bg-ground-4 text-ink-1 border-line-3' : 'bg-transparent text-ink-2 border-line-1 hover:bg-ground-2 hover:text-ink-1'].join(' ')}>
            <span className="font-mono t-micro text-ink-4 xl:w-4">{i + 1}</span>{s.label}
          </button>
        ))}
        <div className="hidden xl:block pt-3 px-2.5 space-y-2 border-t border-line-1 mt-2">
          <Kpi label="Standalone EBITDA" value={fmtM(p.r.standaloneEbitda, 1)} tone="money" hint={`vendor ${fmtM(p.r.vendorEbitda, 1)}`} />
          <Kpi label="Enterprise value" value={fmtM(p.r.ev, 0)} tone="money" hint={`guide ${fmtM(p.c.asPresented.askEv, 0)}`} />
        </div>
      </nav>
      <div className="space-y-6 min-w-0">
        {cur === 'baseline' && (
          <Card pad="md" className="border-accent-line">
            <p className="t-body text-ink-1 m-0">You've inherited the vendor's carve-out pack and the deal team's first cut. Every input starts on their figures. Rebuild the business on a standalone basis, cost the separation, then price it. Log what you find in <button type="button" onClick={() => onStep('review')} className="text-accent bg-transparent border-0 cursor-pointer px-0 underline">Vendor pack review</button>. Figures recompute live.</p>
          </Card>
        )}
        <Body {...p} />
        <Concepts ids={CARVE_STEPS.find((s) => s.id === cur)?.terms} />
        <div className="flex justify-between">
          {idx > 0 ? <button type="button" onClick={() => onStep(CARVE_STEPS[idx - 1].id)} className="t-small text-ink-2 bg-transparent border-0 cursor-pointer px-0">← {CARVE_STEPS[idx - 1].label}</button> : <span />}
          {idx < CARVE_STEPS.length - 1 ? <button type="button" onClick={() => onStep(CARVE_STEPS[idx + 1].id)} className="t-small text-accent bg-transparent border-0 cursor-pointer px-0">{CARVE_STEPS[idx + 1].label} →</button> : <span />}
        </div>
      </div>
    </div>
  )
}

function Baseline({ c, r, reviewer }) {
  return (
    <Exercise n={6} title="Read the carve-out P&L for what it is" prompt="These accounts describe a division inside a society, not a company. Before adjusting anything, see where the revenue comes from and what the cost base actually contains.">
      <Table minWidth={760}
        columns={[{ key: 'l', label: 'Revenue line' }, { key: 'c', label: 'Customer' }, { key: 'v', label: 'LTM', align: 'right' }, { key: 's', label: 'Share', align: 'right' }, { key: 'p', label: 'Pricing' }]}
        rows={c.revenue.map((x) => ({ key: x.id, l: <span className="t-small text-ink-1">{x.label}</span>, c: <Tag tone={x.customer === 'parent' ? 'accent' : 'neutral'}>{x.customer === 'parent' ? 'parent' : 'third party'}</Tag>, v: <Money className="t-data">{fmtK(x.ltm)}</Money>, s: <Figure className="t-data text-ink-2">{fmtPct(x.ltm / r.revenueTotal, 0)}</Figure>, p: <span className="t-micro text-ink-3">{x.pricing}</span> }))}
        foot={{ l: 'Total revenue', v: <Money>{fmtK(r.revenueTotal)}</Money>, s: '100%' }} />
      <div className="mt-6">
        <Table minWidth={620}
          columns={[{ key: 'l', label: 'Cost line' }, { key: 'f', label: 'FTE', align: 'right' }, { key: 'v', label: 'LTM', align: 'right' }, { key: 'b', label: 'Basis' }]}
          rows={c.costs.map((x) => ({ key: x.id, l: <span className="t-small text-ink-1">{x.label}</span>, f: <Figure className="t-data text-ink-4">{x.fte || '—'}</Figure>, v: <Figure className={`t-data ${x.id === 'alloc' ? 'text-danger' : 'text-ink-3'}`}>{fmtK(x.ltm)}</Figure>, b: <span className="t-micro text-ink-3">{x.basis}</span> }))}
          foot={{ l: 'Reported EBITDA', v: <Money>{fmtK(r.reported)}</Money>, b: fmtPct(r.reportedMargin, 1) }} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        <Kpi label="Revenue" value={fmtM(r.revenueTotal, 0)} tone="money" />
        <Kpi label="Parent share" value={fmtPct(r.parentShare, 0)} tone="danger" hint="related-party pricing" />
        <Kpi label="Reported EBITDA" value={fmtM(r.reported, 1)} hint={fmtPct(r.reportedMargin, 1)} />
        <Kpi label="Vendor adjusted EBITDA" value={fmtM(r.vendorEbitda, 1)} hint={`guide ${fmtX(c.asPresented.askEv / c.asPresented.adjEbitda)}`} />
      </div>
      <Reviewer reviewer={reviewer}>
        <p className="m-0">Two lines decide this deal: the {fmtPct(r.parentShare, 0)} of revenue billed to the parent at a rate set inside the group, and the {fmtK(c.costs.find((x) => x.id === 'alloc').ltm)} of allocations standing in for every corporate function the business doesn't have. Neither survives contact with a standalone company.</p>
      </Reviewer>
    </Exercise>
  )
}

function RevenueQuality({ c, state, update, r, reviewer }) {
  const items = r.bridge.filter((b) => b.kind === 'revenue')
  return (
    <Exercise n={7} title="Test revenue quality and related-party pricing" prompt="Decide what the revenue base really is: at arm's-length prices, and stripped of work that doesn't repeat.">
      <Table minWidth={720}
        columns={[{ key: 'l', label: 'Revenue line' }, { key: 'v', label: 'LTM', align: 'right' }, { key: 'q', label: 'Quality' }]}
        rows={c.revenue.map((x) => ({ key: x.id, l: <span className="t-small text-ink-1">{x.label}</span>, v: <Money className="t-data">{fmtK(x.ltm)}</Money>, q: <span className="t-micro text-ink-3">{x.quality}</span> }))} />
      <div className="divide-y divide-line-1 border-y border-line-1 mt-6">
        {items.map((b) => {
          const ch = state.exec.bridge[b.id] || {}
          const set = (patch) => update(['exec', 'bridge', b.id], { ...ch, ...patch, touched: true })
          const show = reviewer || ch.revealed
          return (
            <div key={b.id} className="py-3 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
              <div className="min-w-0">
                <div className="t-body text-ink-1">{b.label}</div>
                <div className="t-micro text-ink-4">{fmtK(b.amount)} · evidence: {b.evidence} · vendor: {b.draft === 'accept' ? 'applied' : 'not applied'}</div>
                {show && <div className={`t-small mt-1 ${bridgeMatches(b, ch, b.amount) ? 'text-secondary' : 'text-danger'}`}>{bridgeMatches(b, ch, b.amount) ? '✓ ' : `✗ Reviewer: ${b.benchmark}. `}{b.why}</div>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Seg value={b.treatment} onChange={(v) => set({ treatment: v, amount: v === 'partial' ? (ch.amount ?? b.amount / 2) : ch.amount })} options={[['accept', 'Apply'], ['partial', 'Partial'], ['reject', 'Ignore']]} />
                {b.treatment === 'partial' && <NumField prefix="$" value={ch.amount} onChange={(v) => set({ amount: v })} ariaLabel="Partial amount" />}
                <button type="button" onClick={() => set({ revealed: true })} className="t-micro text-secondary bg-transparent border-0 cursor-pointer px-0">check</button>
              </div>
            </div>
          )
        })}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-5">
        <Kpi label="Revenue as reported" value={fmtM(r.revenueTotal, 0)} />
        <Kpi label="Revenue adjustments applied" value={fmtM(sumApplied(items), 1)} tone={sumApplied(items) < 0 ? 'danger' : 'ink'} />
        <Kpi label="Adjusted revenue base" value={fmtM(r.revenueTotal + sumApplied(items), 1)} tone="money" />
      </div>
      <Reviewer reviewer={reviewer}>
        <p className="m-0">Ask what a third party pays for the same service. The society pays cost plus 8%; the benchmark rate card sits about 4.5% lower, and the agreement is signed at closing — so the reset is the base case, not a risk factor. The completed implementation is the other half: real cash, but it does not repeat at that scale.</p>
      </Reviewer>
    </Exercise>
  )
}
const sumApplied = (items) => items.reduce((a, b) => a + b.applied, 0)

function Standalone({ c, state, update, r, reviewer }) {
  return (
    <Exercise n={8} title="Build the standalone cost base" prompt="The business has no executive team, finance, HR, legal, or corporate IT of its own. Estimate what each function costs once it has to exist.">
      <Table minWidth={820}
        columns={[{ key: 'f', label: 'Function' }, { key: 'a', label: 'Parent allocation', align: 'right' }, { key: 's', label: 'Your standalone estimate', align: 'right' }, { key: 'd', label: 'Delta', align: 'right' }, { key: 'n', label: 'FTE', align: 'right' }]}
        rows={r.functions.map((f) => ({
          key: f.id,
          f: <span><span className="t-small text-ink-1 block">{f.label}</span>{reviewer && <span className="block t-micro text-ink-3 mt-0.5">Reviewer {fmtK(c.functions.find((x) => x.id === f.id).standalone)} — {f.why}</span>}</span>,
          a: <Figure className="t-data text-ink-3">{fmtK(f.allocation)}</Figure>,
          s: <NumField prefix="$" width="w-24" value={state.exec.functions[f.id]} onChange={(v) => update(['exec', 'functions', f.id], v)} ariaLabel={`${f.label} standalone cost`} />,
          d: <Figure className={`t-data ${f.delta > 0 ? 'text-danger' : 'text-ink-3'}`}>{fmtK(f.delta)}</Figure>,
          n: <Figure className="t-data text-ink-4">{f.fte || '—'}</Figure>,
        }))}
        foot={{ f: 'Total corporate cost', a: fmtK(r.allocationTotal), s: <Money>{fmtK(r.standaloneCostTotal)}</Money>, d: <Figure className="text-danger">{fmtK(r.standaloneDelta)}</Figure> }} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        <Kpi label="Parent allocation" value={fmtM(r.allocationTotal, 1)} />
        <Kpi label="Standalone cost" value={fmtM(r.standaloneCostTotal, 1)} tone="money" />
        <Kpi label="Annual gap" value={fmtM(r.standaloneDelta, 1)} tone={r.standaloneDelta > 0 ? 'danger' : 'ink'} hint="flows into the bridge" />
        <Kpi label="Gap as % of reported EBITDA" value={fmtPct(r.standaloneDelta / r.reported, 0)} />
      </div>
      {r.standaloneDelta === 0 && <div className="mt-3"><Verdict ok={false}>Standalone costs still equal the parent's allocation</Verdict></div>}
      <Reviewer reviewer={reviewer}>
        <p className="m-0">Build each line from headcount and market salaries, then sanity-check the total against comparable standalone companies: corporate functions usually run {fmtPct(c.functions.reduce((a, f) => a + f.standalone, 0) / r.revenueTotal, 0)} of revenue at this scale. The executive team is the line people forget — a chief executive, a finance chief, a technology chief, and a board did not exist inside the society.</p>
      </Reviewer>
    </Exercise>
  )
}

function Bridge({ state, update, r, b, reviewer }) {
  const steps = [{ label: 'Reported carve-out EBITDA', amount: r.reported, total: r.reported }]
  let run = r.reported
  for (const x of r.bridge) { run += x.applied; steps.push({ label: x.label, amount: x.applied, total: run, item: x }) }
  return (
    <Exercise n={9} title="Bridge reported EBITDA to standalone EBITDA" prompt="Work through every adjustment. Apply it, take part of it, or ignore it — the standalone-cost line carries straight through from your cost build.">
      <div className="divide-y divide-line-1 border-y border-line-1">
        {r.bridge.map((x) => {
          const ch = state.exec.bridge[x.id] || {}
          const set = (patch) => update(['exec', 'bridge', x.id], { ...ch, ...patch, touched: true })
          const show = reviewer || ch.revealed
          const computed = x.kind === 'standalone'
          return (
            <div key={x.id} className="py-3 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_100px] gap-3 items-start">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><span className="t-body text-ink-1">{x.label}</span><Tag tone="neutral">{x.kind}</Tag></div>
                <div className="t-micro text-ink-4">{fmtK(x.amount)}{computed ? ' — from your cost build' : ''} · evidence: {x.evidence}</div>
                {show && <div className={`t-small mt-1 ${bridgeMatches(x, ch, x.amount) ? 'text-secondary' : 'text-danger'}`}>{bridgeMatches(x, ch, x.amount) ? '✓ ' : `✗ Reviewer: ${x.benchmark}${x.benchmark === 'partial' ? ` (${fmtK(x.amount / 2)})` : ''}. `}{x.why}</div>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Seg value={x.treatment} onChange={(v) => set({ treatment: v, amount: v === 'partial' ? (ch.amount ?? x.amount / 2) : ch.amount })} options={[['accept', 'Apply'], ['partial', 'Partial'], ['reject', 'Ignore']]} />
                {x.treatment === 'partial' && <NumField prefix="$" value={ch.amount} onChange={(v) => set({ amount: v })} ariaLabel="Partial amount" />}
                <button type="button" onClick={() => set({ revealed: true })} className="t-micro text-secondary bg-transparent border-0 cursor-pointer px-0">check</button>
              </div>
              <Money className="t-data text-right">{fmtK(x.applied)}</Money>
            </div>
          )
        })}
      </div>
      <div className="mt-6">
        <Table minWidth={520}
          columns={[{ key: 'l', label: 'Bridge' }, { key: 'a', label: 'Adjustment', align: 'right' }, { key: 't', label: 'Running EBITDA', align: 'right' }]}
          rows={steps.map((s, i) => ({ key: i, l: <span className={`t-small ${i === 0 ? 'text-ink-1' : 'text-ink-2'}`}>{s.label}</span>, a: i === 0 ? '' : <Figure className={`t-data ${s.amount < 0 ? 'text-danger' : 'text-ink-3'}`}>{s.amount ? fmtK(s.amount) : '—'}</Figure>, t: <Money className="t-data">{fmtK(s.total)}</Money> }))}
          foot={{ l: 'Standalone EBITDA', t: <Money>{fmtK(r.standaloneEbitda)}</Money>, a: fmtPct(r.standaloneMargin, 1) }} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        <Kpi label="Vendor adjusted EBITDA" value={fmtM(r.vendorEbitda, 1)} />
        <Kpi label="Your standalone EBITDA" value={fmtM(r.standaloneEbitda, 1)} tone="money" />
        <Kpi label="Difference" value={fmtPct(r.standaloneEbitda / r.vendorEbitda - 1)} tone="danger" />
        <Kpi label="Standalone margin" value={fmtPct(r.standaloneMargin, 1)} hint={`reported ${fmtPct(r.reportedMargin, 1)}`} />
      </div>
      <Reviewer reviewer={reviewer}>
        <p className="m-0">Reviewer standalone EBITDA is {fmtM(b.standaloneEbitda, 1)}, a {fmtPct(1 - b.standaloneEbitda / b.vendorEbitda, 0)} haircut to the vendor's pro forma figure. Nothing here is aggressive: it is the anchor contract at market, corporate functions that have to exist, one accounting policy, and one completed project.</p>
      </Reviewer>
    </Exercise>
  )
}

function Separation({ c, state, update, r, reviewer }) {
  return (
    <Exercise n={10} title="Cost the separation and the transitional services" prompt="Decide which separation costs the buyer carries, and how long the business depends on the society. Both belong in the price.">
      <div className="t-eyebrow text-ink-3 mb-2">Separation costs</div>
      <div className="divide-y divide-line-1 border-y border-line-1">
        {r.separation.map((x) => (
          <div key={x.id} className="py-2.5 grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 items-start">
            <input type="checkbox" className="mt-1 accent-[var(--mm-accent)]" checked={x.include} onChange={(e) => update(['exec', 'separation', x.id, 'include'], e.target.checked)} aria-label={`Include ${x.label}`} />
            <div className="min-w-0">
              <div className="t-body text-ink-1">{x.label}</div>
              {reviewer && <div className={`t-small mt-0.5 ${x.include === x.benchmark ? 'text-secondary' : 'text-danger'}`}>{x.include === x.benchmark ? '✓ ' : '✗ Reviewer includes it. '}{x.why}</div>}
            </div>
            <NumField prefix="$" width="w-24" value={state.exec.separation[x.id]?.amount} onChange={(v) => update(['exec', 'separation', x.id, 'amount'], v)} ariaLabel={`${x.label} amount`} />
          </div>
        ))}
      </div>
      <div className="t-eyebrow text-ink-3 mt-6 mb-2">Transitional services</div>
      <Table minWidth={760}
        columns={[{ key: 'l', label: 'Service' }, { key: 'd', label: 'Direction' }, { key: 'm', label: 'Months' }, { key: 'r', label: 'Monthly', align: 'right' }, { key: 'y1', label: 'Year 1', align: 'right' }, { key: 'y2', label: 'Year 2', align: 'right' }, { key: 't', label: 'Total', align: 'right' }]}
        rows={r.tsa.map((x) => ({
          key: x.id,
          l: <span><span className="t-small text-ink-1 block">{x.label}</span>{reviewer && <span className="block t-micro text-ink-3">{x.why}</span>}</span>,
          d: <Tag tone={x.direction === 'in' ? 'neutral' : 'secondary'}>{x.direction === 'in' ? 'from parent' : 'to parent'}</Tag>,
          m: <NumField width="w-14" value={state.exec.tsa[x.id]?.months} onChange={(v) => update(['exec', 'tsa', x.id, 'months'], v)} ariaLabel={`${x.label} months`} />,
          r: <Figure className="t-data text-ink-3">{fmtK(x.monthly)}</Figure>,
          y1: <Figure className="t-data text-ink-3">{fmtK(x.years[0])}</Figure>,
          y2: <Figure className="t-data text-ink-3">{fmtK(x.years[1])}</Figure>,
          t: <Money className="t-data">{fmtK(x.total)}</Money>,
        }))}
        foot={{ l: 'Net transitional cost', y1: fmtK(r.tsaYears[0]), y2: fmtK(r.tsaYears[1]), t: <Money>{fmtK(r.tsaTotal)}</Money> }} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        <Kpi label="Separation cost" value={fmtM(r.separationTotal, 1)} tone={r.separationTotal ? 'money' : 'danger'} />
        <Kpi label="Net TSA cost" value={fmtM(r.tsaTotal, 1)} hint={`present value ${fmtM(r.tsaPv, 1)}`} />
        <Kpi label="Stranded at the society" value={fmtM(c.stranded.amount, 1)} hint="negotiation, not your base" />
        <Kpi label="Total off enterprise value" value={fmtM(r.deductions, 1)} tone="money" />
      </div>
      <Reviewer reviewer={reviewer}>
        <p className="m-0">{c.stranded.why}</p>
        <p className="m-0">Reverse-TSA income is real cash for a year, which is exactly why it cannot sit in run-rate EBITDA. Net it inside the separation case instead, where it belongs.</p>
      </Reviewer>
    </Exercise>
  )
}

function Value({ c, state, update, r, b, draft, reviewer }) {
  const v = state.exec.valuation
  const set = (k) => (x) => update(['exec', 'valuation', k], x)
  const max = Math.max(c.asPresented.askEv, draft.ev, r.evRange[2]) * 1.05
  const bar = (label, val, tone, hint) => (
    <div key={label} className="grid grid-cols-[150px_minmax(0,1fr)_80px] gap-3 items-center">
      <span className="t-small text-ink-2">{label}{hint && <span className="block t-micro text-ink-4">{hint}</span>}</span>
      <div className="relative h-5 rounded-sm bg-ground-4">
        <div className={`absolute inset-y-0 left-0 rounded-sm ${tone}`} style={{ width: `${Math.max(0, (val / max) * 100)}%` }} />
        <div className="absolute -top-1 -bottom-1 w-px bg-danger" style={{ left: `${(c.asPresented.askEv / max) * 100}%` }} title="Vendor guide" />
      </div>
      <Money className="t-data text-right">{fmtM(val, 0)}</Money>
    </div>
  )
  return (
    <Exercise n={11} title="Price the standalone business" prompt="Apply the multiple to what the business earns alone, then take off what it costs to own it on Day 1.">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
        <div className="space-y-3">
          <Row label="Multiple" hint={`range ${fmtX(num(v.multiples[0]))}–${fmtX(num(v.multiples[2]))}`}><NumField width="w-16" suffix="x" value={v.multiple} onChange={set('multiple')} ariaLabel="Multiple" /></Row>
          <Row label="Deduct separation cost"><Seg value={v.deductSeparation ? 'on' : 'off'} onChange={(x) => update(['exec', 'valuation', 'deductSeparation'], x === 'on')} options={[['on', 'Yes'], ['off', 'No']]} /></Row>
          <Row label="Deduct TSA (present value)"><Seg value={v.deductTsa ? 'on' : 'off'} onChange={(x) => update(['exec', 'valuation', 'deductTsa'], x === 'on')} options={[['on', 'Yes'], ['off', 'No']]} /></Row>
          <Row label="Stake acquired"><NumField width="w-14" suffix="%" value={v.stake} onChange={set('stake')} ariaLabel="Stake" /></Row>
          <Row label="Discount rate (TSA)"><NumField width="w-14" suffix="%" value={v.rate} onChange={set('rate')} ariaLabel="Discount rate" /></Row>
          {!v.deductSeparation && <Verdict ok={false}>Separation cost not in the price</Verdict>}
        </div>
        <div className="space-y-3">
          <div className="t-eyebrow text-ink-3">Against the {fmtM(c.asPresented.askEv, 0)} vendor guide</div>
          {bar('Vendor pack', draft.ev, 'bg-ground-3 border border-line-3', `${fmtX(draft.multiple)} × ${fmtM(draft.vendorEbitda, 1)}`)}
          {bar('Your upside', r.evRange[2], 'bg-secondary-soft border border-secondary-line', `${fmtX(num(v.multiples[2]))} × ${fmtM(r.standaloneEbitda, 1)}`)}
          {bar('Your base', r.ev, 'bg-accent', `${fmtX(r.multiple)} × ${fmtM(r.standaloneEbitda, 1)} less ${fmtM(r.deductions, 1)}`)}
          {bar('Your downside', r.evRange[0], 'bg-accent-soft border border-accent-line', `${fmtX(num(v.multiples[0]))} × ${fmtM(r.standaloneEbitda, 1)}`)}
          <div className="t-micro text-ink-4 inline-flex items-center gap-1.5"><span className="inline-block w-3 h-0.5 bg-danger" />Vendor guide</div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        <Kpi label="Enterprise value" value={fmtM(r.ev, 0)} tone="money" />
        <Kpi label={`Cheque for ${num(v.stake)}%`} value={fmtM(r.cheque, 0)} tone="money" />
        <Kpi label="Gap to guide" value={fmtPct(r.wmbt.gapPct, 0)} tone="danger" hint={fmtM(r.wmbt.gap, 0)} />
        <Kpi label="Guide needs" value={fmtX(r.wmbt.multiple)} hint={`or standalone EBITDA of ${fmtM(r.wmbt.ebitda, 1)}`} />
      </div>
      <Reviewer reviewer={reviewer}>
        <p className="m-0">Reviewer: {fmtX(b.multiple)} on {fmtM(b.standaloneEbitda, 1)} of standalone EBITDA, less {fmtM(b.deductions, 1)} of separation and transitional services, gives {fmtM(b.ev, 0)} and a {fmtM(b.cheque, 0)} cheque for {b.stake * 100}%. The vendor guide needs {fmtX(b.wmbt.multiple)} on the same base.</p>
        <p className="m-0">Do not fight about the multiple. A full turn either way moves the answer far less than the base you apply it to.</p>
      </Reviewer>
    </Exercise>
  )
}

function Findings({ c, state, update, reviewer }) {
  return (
    <Exercise n={12} title="Turn findings into deal protections" prompt="A carve-out is a set of contracts that must exist on Day 1. Rate each finding and choose what protects the buyer.">
      <div className="space-y-2">
        {c.findings.map((f) => {
          const x = state.exec.findings[f.id] || {}
          const ok = x.severity === f.benchmark.severity && x.protection === f.benchmark.protection
          return (
            <div key={f.id} className="rounded-md border border-line-1 p-3 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,300px)] gap-3 items-center">
              <div className="min-w-0">
                <div className="t-body text-ink-1">{f.finding}</div>
                {reviewer && <div className={`t-small mt-0.5 ${ok ? 'text-secondary' : 'text-danger'}`}>{ok ? '✓ ' : '✗ '}Reviewer: {f.benchmark.severity} · {c.protections.find((p) => p.id === f.benchmark.protection)?.label}</div>}
              </div>
              <Seg value={x.severity} onChange={(v) => update(['exec', 'findings', f.id, 'severity'], v)} options={[['High', 'High'], ['Medium', 'Medium'], ['Low', 'Low']]} />
              <select value={x.protection || ''} onChange={(e) => update(['exec', 'findings', f.id, 'protection'], e.target.value)} className="bg-ground-1 border border-line-2 rounded-md h-8 px-2 t-small text-ink-1 focus:border-accent outline-none w-full" aria-label="Protection">
                <option value="">Choose a protection…</option>
                {c.protections.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          )
        })}
      </div>
      <Reviewer reviewer={reviewer}>
        <p className="m-0">In a carve-out the highest-severity findings are the ones that decide whether the business can operate at all: the anchor agreement, the data licence, and the consents. Those become conditions precedent, not indemnities. Economic findings — standalone costs, capitalisation, separation — belong in the price.</p>
      </Reviewer>
    </Exercise>
  )
}

function Review(p) {
  return <ModelReview n={13} title="Red-team the vendor pack" prompt="For each area, decide whether the vendor pack has a problem before you reveal the standalone view." {...p} />
}
