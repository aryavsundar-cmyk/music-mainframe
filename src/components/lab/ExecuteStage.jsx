import { Card, Tag } from '../primitives/index.js'
import { fmtK, fmtM, fmtPct, fmtX, num, sum } from '../../utils/valuation.js'
import { EXEC_STEPS } from '../../utils/labState.js'
import { Exercise, Reviewer, Seg, NumField, Table, Money, Figure, Kpi, Verdict, ModelReview } from './LabUi.jsx'
import { Concepts } from '../reference/Concepts.jsx'


const pctCell = (v) => <Figure className="text-ink-2">{fmtPct(v)}</Figure>

export function ExecuteStage({ step, onStep, ...p }) {
  const cur = EXEC_STEPS.some((s) => s.id === step) ? step : 'inventory'
  const idx = EXEC_STEPS.findIndex((s) => s.id === cur)
  const Body = { inventory: Inventory, history: History, qoe: Qoe, forecast: Forecast, dcf: Dcf, multiples: Multiples, findings: Findings, price: Price, review: Review }[cur]
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)] gap-6 items-start">
      <nav className="flex flex-wrap gap-1 xl:block xl:space-y-1 xl:sticky xl:top-6" aria-label="Execution steps">
        {EXEC_STEPS.map((s, i) => (
          <button key={s.id} type="button" onClick={() => onStep(s.id)} aria-current={s.id === cur ? 'step' : undefined}
            className={['xl:w-full text-left flex items-center gap-2 rounded-md px-2.5 py-1.5 border cursor-pointer t-small xl:border-0', s.id === cur ? 'bg-ground-4 text-ink-1 border-line-3' : 'bg-transparent text-ink-2 border-line-1 hover:bg-ground-2 hover:text-ink-1'].join(' ')}>
            <span className="font-mono t-micro text-ink-4 xl:w-4">{i + 1}</span>{s.label}
          </button>
        ))}
        <div className="hidden xl:block pt-3 px-2.5 space-y-2 border-t border-line-1 mt-2">
          <Kpi label="Your normalised LTM" value={fmtK(p.r.normalized)} tone="money" hint={`draft ${fmtK(p.draft.normalized)}`} />
          <Kpi label="Your DCF" value={fmtM(p.r.dcf.ev, 2)} tone="money" hint={`draft (recomputed) ${fmtM(p.draft.dcf.ev, 2)}`} />
        </div>
      </nav>
      <div className="space-y-6 min-w-0">
        {cur === 'inventory' && (
          <Card pad="md" className="border-accent-line">
            <p className="t-body text-ink-1 m-0">You've inherited the junior team's draft model. Every input below starts on their numbers. Work through each step, correct what's wrong, and log what you find in <button type="button" onClick={() => onStep('review')} className="text-accent bg-transparent border-0 cursor-pointer px-0 underline">Model review</button>. Your figures recompute live.</p>
          </Card>
        )}
        <Body {...p} />
        <Concepts ids={EXEC_STEPS.find((s) => s.id === cur)?.terms} />
        <div className="flex justify-between">
          {idx > 0 ? <button type="button" onClick={() => onStep(EXEC_STEPS[idx - 1].id)} className="t-small text-ink-2 bg-transparent border-0 cursor-pointer px-0">← {EXEC_STEPS[idx - 1].label}</button> : <span />}
          {idx < EXEC_STEPS.length - 1 ? <button type="button" onClick={() => onStep(EXEC_STEPS[idx + 1].id)} className="t-small text-accent bg-transparent border-0 cursor-pointer px-0">{EXEC_STEPS[idx + 1].label} →</button> : <span />}
        </div>
      </div>
    </div>
  )
}

function Inventory({ c, r, reviewer }) {
  return (
    <Exercise n={6} title="Rights inventory and concentration" prompt="Every row should trace to chain-of-title documents, registrations, and royalty statements. Before analysing concentration, check that the inventory ties to the cash.">
      <Table minWidth={980}
        columns={[{ key: 'id', label: 'ID' }, { key: 't', label: 'Work / recording' }, { key: 'y', label: 'Year', align: 'right' }, { key: 'rights', label: 'Rights' }, { key: 'own', label: 'Ownership' }, { key: 'g', label: 'LTM gross', align: 'right' }, { key: 'n', label: 'LTM net', align: 'right' }, { key: 'sh', label: '% of LTM', align: 'right' }, { key: 'f', label: 'Risk flag' }]}
        rows={c.inventory.map((x) => ({ key: x.id, id: <Figure className="t-micro text-ink-4">{x.id}</Figure>, t: <span className="t-small text-ink-1">{x.title}</span>, y: <Figure className="t-data text-ink-3">{x.year}</Figure>, rights: <span className="t-micro text-ink-3">{x.rights}</span>, own: <span className="t-micro text-ink-2">{x.own}</span>, g: <Figure className="t-data text-ink-3">{fmtK(x.gross)}</Figure>, n: <Money className="t-data">{fmtK(x.net)}</Money>, sh: pctCell(x.net / r.ltm), f: <span className="t-micro text-ink-3">{x.flag}</span> }))}
        foot={{ t: 'Inventory total', n: <Money>{fmtK(r.inventoryNet)}</Money>, sh: pctCell(r.inventoryNet / r.ltm), f: r.inventoryNet !== r.ltm ? <Verdict ok={false}>{fmtK(r.inventoryNet - r.ltm)} vs LTM net {fmtK(r.ltm)}</Verdict> : <Verdict ok>ties to LTM</Verdict> }} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        <Kpi label="Top title" value={fmtPct(r.top1Share)} hint='"Neon Valleys"' />
        <Kpi label="Top 10 titles" value={fmtPct(r.top10Share)} hint="profile says 43%" tone={Math.abs(r.top10Share - 0.43) > 0.02 ? 'danger' : 'ink'} />
        <Kpi label="Owned masters" value="96 / 142" hint="46 partial interests" tone="count" />
        <Kpi label="Weighted publishing" value="71%" hint="value only this share" />
      </div>
      <Reviewer reviewer={reviewer}>
        <p className="m-0">The rows sum to {fmtK(r.inventoryNet)}, {fmtK(r.inventoryNet - r.ltm)} more than LTM net receipts. That's a data-room reconciliation failure: either the long tail is overstated or title rows are on a different basis (accrued vs cash, pre- vs post-participation). Ask for the title-level ledger before trusting any concentration number.</p>
        <p className="m-0">Even so, the named titles are {fmtPct(r.top10Share)} of LTM, not 43%. Concentration is worse than the profile implies, which matters for the discount rate and the earn-out design.</p>
      </Reviewer>
    </Exercise>
  )
}

function History({ c, r, reviewer }) {
  return (
    <>
      <Exercise n={7} title="Gross to net: what the buyer actually acquires" prompt="Reported royalty income is not buyer-acquired cash flow. Separate participations, fees, and reserves.">
        <Table minWidth={760}
          columns={[{ key: 'p', label: 'Period' }, { key: 'g', label: 'Gross', align: 'right' }, { key: 'pa', label: 'Participations', align: 'right' }, { key: 'f', label: 'Admin / dist. fees', align: 'right' }, { key: 'rs', label: 'Reserves / recoup', align: 'right' }, { key: 'n', label: 'Net cash', align: 'right' }, { key: 'm', label: 'Net / gross', align: 'right' }, { key: 'gr', label: 'Growth', align: 'right' }]}
          rows={r.wf.map((y) => ({ key: y.period, p: <span className="t-small text-ink-1">{y.period}</span>, g: <Figure className="t-data text-ink-3">{fmtK(y.gross)}</Figure>, pa: <Figure className="t-data text-ink-3">{fmtK(-y.participations)}</Figure>, f: <Figure className="t-data text-ink-3">{fmtK(-y.fees)}</Figure>, rs: <Figure className="t-data text-ink-3">{fmtK(-y.reserves)}</Figure>, n: <Money className="t-data">{fmtK(y.net)}</Money>, m: pctCell(y.netMargin), gr: y.growth == null ? '—' : pctCell(y.growth) }))} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <Kpi label="3-year net CAGR" value={fmtPct(r.cagr3)} hint="profile says 8.5%" tone={Math.abs(r.cagr3 - 0.085) > 0.003 ? 'danger' : 'ink'} />
          <Kpi label="LTM vs 2025A" value={fmtPct(r.wf[3].growth)} />
          <Kpi label="Reported gross" value={fmtK(r.wf[3].gross)} hint="overstates acquired cash" />
          <Kpi label="LTM net cash" value={fmtK(r.ltm)} tone="money" />
        </div>
        <Reviewer reviewer={reviewer}>
          <p className="m-0">Net / gross edged from {fmtPct(r.wf[0].netMargin)} to {fmtPct(r.wf[3].netMargin)} while reserves grew {fmtPct(r.wf[3].reserves / r.wf[0].reserves - 1, 0)} against {fmtPct(r.wf[3].gross / r.wf[0].gross - 1, 0)} for gross. Ask why: a higher distributor reserve, new co-writers on recent titles, or recoupment starting to bite.</p>
          <p className="m-0">Growth rates need a stated basis. 2023A→LTM 2026 is three years: {fmtPct(r.cagr3)}. The profile's 8.5% doesn't match any obvious period.</p>
        </Reviewer>
      </Exercise>

      <Card pad="lg">
        <div className="t-eyebrow text-ink-3 mb-3">Revenue by stream</div>
        <Table minWidth={900}
          columns={[{ key: 's', label: 'Stream' }, ...c.periods.map((per, i) => ({ key: `h${i}`, label: per, align: 'right' })), { key: 'sh', label: 'LTM share', align: 'right' }, { key: 'q', label: 'Quality' }]}
          rows={c.streams.map((x) => ({ key: x.id, s: <span className="t-small text-ink-1">{x.label}</span>, ...Object.fromEntries(x.hist.map((v, i) => [`h${i}`, <Figure key={i} className={`t-data ${i === 3 ? 'text-money' : 'text-ink-3'}`}>{fmtK(v)}</Figure>])), sh: pctCell(x.hist[3] / r.ltm), q: <span className="t-micro text-ink-3">{x.quality}</span> }))}
          foot={{ s: 'Total net cash', ...Object.fromEntries(c.periods.map((_, i) => [`h${i}`, <Money key={i}>{fmtK(sum(c.streams.map((x) => x.hist[i])))}</Money>])), sh: pctCell(1) }} />
        <div className="t-eyebrow text-ink-3 mt-6 mb-3">Platform and counterparty concentration</div>
        <Table minWidth={680}
          columns={[{ key: 's', label: 'Source' }, { key: 'n', label: 'LTM net', align: 'right' }, { key: 'sh', label: 'Share', align: 'right' }, { key: 't', label: 'What to test' }]}
          rows={c.counterparties.map((x) => ({ key: x.source, s: <span className="t-small text-ink-1">{x.source}</span>, n: <Money className="t-data">{fmtK(x.net)}</Money>, sh: pctCell(x.net / r.ltm), t: <span className="t-micro text-ink-3">{x.test}</span> }))} />
        <div className="t-eyebrow text-ink-3 mt-6 mb-3">Working capital and cash conversion</div>
        <Table minWidth={680}
          columns={[{ key: 'm', label: 'Metric' }, { key: 'v', label: 'Result', align: 'right' }, { key: 'i', label: 'Implication' }]}
          rows={c.workingCapital.map((x) => ({ key: x.metric, m: <span className="t-small text-ink-1">{x.metric}</span>, v: <Figure className="t-data text-ink-1">{x.value}</Figure>, i: <span className="t-micro text-ink-3">{x.implication}</span> }))} />
      </Card>
    </>
  )
}

function Qoe({ c, state, update, r, b, draft, reviewer }) {
  return (
    <Exercise n={8} title="Normalise LTM earnings" prompt="Decide each adjustment. Accept, reject, or take a partial amount — and be consistent: a one-off removed on one side means a one-off can't be added on the other.">
      <div className="divide-y divide-line-1 border-y border-line-1">
        {r.norm.map((n) => {
          const ch = state.exec.norm[n.id] || {}
          const set = (patch) => update(['exec', 'norm', n.id], { ...ch, ...patch, touched: true })
          return (
            <div key={n.id} className="py-3 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_110px] gap-3 items-start">
              <div className="min-w-0">
                <div className="t-body text-ink-1">{n.label}</div>
                <div className="t-micro text-ink-4">Proposed {fmtK(n.amount)} · evidence: {n.evidence} · lands in {n.stream === 'pro-rata' ? 'all streams pro rata' : c.streams.find((s) => s.id === n.stream)?.label}</div>
                {(reviewer || ch.revealed) && <div className={`t-small mt-1 ${n.treatment === n.benchmark ? 'text-secondary' : 'text-danger'}`}>{n.treatment === n.benchmark ? '✓ ' : `✗ Reviewer: ${n.benchmark}. `}{n.why}</div>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Seg value={n.treatment} onChange={(v) => set({ treatment: v, amount: v === 'partial' ? (ch.amount ?? n.amount / 2) : ch.amount })} options={[['accept', 'Accept'], ['partial', 'Partial'], ['reject', 'Reject']]} />
                {n.treatment === 'partial' && <NumField prefix="$" value={ch.amount} onChange={(v) => set({ amount: v })} ariaLabel="Partial amount" />}
                <button type="button" onClick={() => set({ revealed: true })} className="t-micro text-secondary bg-transparent border-0 cursor-pointer px-0">check</button>
              </div>
              <Money className="t-data text-right">{fmtK(n.applied)}</Money>
            </div>
          )
        })}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        <Kpi label="Reported LTM" value={fmtK(r.ltm)} tone="money" />
        <Kpi label="Your normalised LTM" value={fmtK(r.normalized)} tone="money" hint={`${fmtPct(r.normalized / r.ltm - 1)} vs reported`} />
        <Kpi label="Draft normalised" value={fmtK(draft.normalized)} />
        <Kpi label="Reviewer normalised" value={reviewer ? fmtK(b.normalized) : '—'} hint={reviewer ? 'standalone, excl. synergy' : 'reviewer mode to show'} />
      </div>
      <Reviewer reviewer={reviewer}>
        <p className="m-0">The test for every adjustment: is it recurring, collectible, and transferable to the buyer? The film sync fee, PRO catch-up, and viral spike fail "recurring", so they come out. The unmatched foreign royalties pass if the leakage is fixed going forward.</p>
        <p className="m-0">The admin-rate benefit fails "transferable to the seller's price": it only exists under Meridian's ownership. Leaving it in capitalises a buyer synergy at the full multiple.</p>
      </Reviewer>
    </Exercise>
  )
}

function Forecast({ c, state, update, r, reviewer }) {
  const years = r.years
  return (
    <Exercise n={9} title="Forecast by stream" prompt="Each normalisation lands in exactly one stream, so the forecast base reconciles to normalised LTM by construction. Set growth by stream; question any plug.">
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <span className="t-small text-ink-2">Collection-leakage deduction (pro rata)</span>
        <NumField prefix="$" width="w-28" value={state.exec.leakage} onChange={(v) => update(['exec', 'leakage'], v)} ariaLabel="Leakage" />
        {num(state.exec.leakage) ? <Verdict ok={false}>Draft plug — evidence it or remove it</Verdict> : <Verdict ok>Base reconciles to normalised LTM</Verdict>}
      </div>
      <Table minWidth={1040}
        columns={[{ key: 's', label: 'Stream' }, { key: 'ltm', label: 'LTM', align: 'right' }, { key: 'base', label: 'Base', align: 'right' }, ...years.map((y, i) => ({ key: `g${i}`, label: `${y} g%`, align: 'right' })), { key: 'last', label: `${years[4]} CF`, align: 'right' }]}
        rows={r.forecast.map((f) => ({
          key: f.id, s: <span className="t-small text-ink-1">{f.label}</span>,
          ltm: <Figure className="t-data text-ink-3">{fmtK(r.streamLtm[f.id])}</Figure>,
          base: <Money className="t-data">{fmtK(f.base)}</Money>,
          ...Object.fromEntries(years.map((_, i) => [`g${i}`, <NumField key={i} width="w-14" value={state.exec.growth[f.id]?.[i]} onChange={(v) => update(['exec', 'growth', f.id, i], v)} ariaLabel={`${f.label} ${years[i]} growth`} />])),
          last: <Money className="t-data">{fmtK(f.vals[4])}</Money>,
        }))}
        foot={{ s: 'Total', ltm: <Figure>{fmtK(r.ltm)}</Figure>, base: <Money>{fmtK(r.baseTotal)}</Money>, last: <Money>{fmtK(r.totals[4])}</Money> }} />
      <div className="mt-5">
        <Table minWidth={620}
          columns={[{ key: 'k', label: '' }, ...years.map((y, i) => ({ key: `y${i}`, label: String(y), align: 'right' }))]}
          rows={[
            { key: 'you', k: <span className="t-small text-ink-1">Your forecast</span>, ...Object.fromEntries(r.totals.map((t, i) => [`y${i}`, <Money key={i} className="t-data">{fmtK(t)}</Money>])) },
            { key: 'draft', k: <span className="t-small text-ink-3">Draft as stated</span>, ...Object.fromEntries(c.asPresented.forecastTotals.map((t, i) => [`y${i}`, <Figure key={i} className="t-data text-ink-3">{fmtK(t)}</Figure>])) },
          ]} />
      </div>
      <Reviewer reviewer={reviewer}>
        <p className="m-0">The draft's base ({fmtK(sum(Object.values(c.asPresented.forecastBase)))}) cut the $34K viral spike from UGC <em>and</em> from master streaming, left performance at $244K despite −$21K and +$18K adjustments, and dropped the +$12K. Then it labelled the gap "$43K cash-timing leakage". Set leakage to zero unless you have evidence; the structural allocation above does the rest.</p>
        <p className="m-0">Growth: mature master streaming decaying to −1% by 2031 is reasonable for 2012–2025 vintages with 64% dollar age above five years. Holding sync flat at the normalised run rate avoids paying for speculative placements.</p>
      </Reviewer>
    </Exercise>
  )
}

function Dcf({ c, state, update, r, reviewer }) {
  const t = state.exec.terminal
  const derivedFirst = r.totals[4] * (1 + num(t.g) / 100)
  return (
    <Exercise n={10} title="Build the discount rate and value the cash flows" prompt="The rate prices asset-specific risk. The terminal period is usually half the answer, so make its assumptions explicit and finite.">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="t-eyebrow text-ink-3 mb-2">Discount-rate build-up (illustrative)</div>
          <Table minWidth={380} columns={[{ key: 'l', label: 'Component' }, { key: 'p', label: '%', align: 'right' }]}
            rows={r.rateRows.map((x) => ({ key: x.id, l: <span className="t-small text-ink-2">{x.label}</span>, p: <NumField width="w-16" suffix="%" value={state.exec.rateBuild[x.id]} onChange={(v) => update(['exec', 'rateBuild', x.id], v)} ariaLabel={x.label} /> }))}
            foot={{ l: 'Blended discount rate', p: <Figure className={r.ratePct < c.rateBand[0] || r.ratePct > c.rateBand[1] ? 'text-danger' : 'text-ink-1'}>{r.ratePct.toFixed(2)}%</Figure> }} />
        </div>
        <div className="space-y-4">
          <div className="t-eyebrow text-ink-3">Timing and terminal</div>
          <div className="flex items-center justify-between gap-3"><span className="t-small text-ink-2">Discounting</span><Seg value={state.exec.midYear ? 'mid' : 'end'} onChange={(v) => update(['exec', 'midYear'], v === 'mid')} options={[['end', 'End-year'], ['mid', 'Mid-year']]} /></div>
          <div className="flex items-center justify-between gap-3"><span className="t-small text-ink-2">Terminal method</span><Seg value={t.method} onChange={(v) => update(['exec', 'terminal', 'method'], v)} options={[['finite', 'Finite decline'], ['gordon', 'Perpetuity'], ['none', 'None']]} /></div>
          {t.method === 'finite' && <div className="flex items-center justify-between gap-3"><span className="t-small text-ink-2">Terminal years</span><NumField width="w-16" value={t.years} onChange={(v) => update(['exec', 'terminal', 'years'], v)} ariaLabel="Terminal years" /></div>}
          {t.method !== 'none' && <div className="flex items-center justify-between gap-3"><span className="t-small text-ink-2">Long-run trend</span><NumField width="w-16" suffix="% / yr" value={t.g} onChange={(v) => update(['exec', 'terminal', 'g'], v)} ariaLabel="Long-run trend" /></div>}
          {t.method !== 'none' && (
            <div className="flex items-center justify-between gap-3">
              <span className="t-small text-ink-2">First terminal cash flow<span className="block t-micro text-ink-4">blank = derived {fmtK(derivedFirst)}</span></span>
              <NumField prefix="$" width="w-28" value={t.firstCf} onChange={(v) => update(['exec', 'terminal', 'firstCf'], v)} ariaLabel="First terminal cash flow" />
            </div>
          )}
          {num(t.firstCf) > 0 && Math.abs(num(t.firstCf) - derivedFirst) > 5000 && <Verdict ok={false}>Typed-in {fmtK(num(t.firstCf))} doesn't follow from your 2031 forecast</Verdict>}
          {t.method === 'gordon' && <Verdict ok={false}>A perpetuity assumes rights and relevance forever; justify it</Verdict>}
        </div>
      </div>
      <div className="mt-6">
        <Table minWidth={560} columns={[{ key: 'y', label: 'Year' }, { key: 'cf', label: 'Cash flow', align: 'right' }, { key: 'df', label: 'Discount factor', align: 'right' }, { key: 'pv', label: 'Present value', align: 'right' }]}
          rows={r.dcf.explicit.map((x) => ({ key: x.year, y: <Figure className="t-data">{x.year}</Figure>, cf: <Money className="t-data">{fmtK(x.cf)}</Money>, df: <Figure className="t-data text-ink-3">{x.df.toFixed(3)}</Figure>, pv: <Money className="t-data">{fmtK(x.pv)}</Money> }))}
          foot={{ y: 'Explicit period', pv: <Money>{fmtK(r.dcf.pvExplicit)}</Money> }} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        <Kpi label="PV explicit" value={fmtM(r.dcf.pvExplicit, 2)} tone="money" />
        <Kpi label="PV terminal" value={fmtM(r.dcf.pvTerminal, 2)} tone="money" hint={`${fmtPct(r.dcf.terminalShare)} of value · draft said $5.9M`} />
        <Kpi label="DCF rights value" value={fmtM(r.dcf.ev, 2)} tone="money" hint={`horizon ${Number.isFinite(r.dcf.horizon) ? `${r.dcf.horizon} yrs` : 'perpetual'}`} />
        <Kpi label="Implied multiple" value={fmtX(r.impliedMultiple)} hint="of normalised LTM" />
      </div>
      <Reviewer reviewer={reviewer}>
        <p className="m-0">The build-up is a teaching device, not a market benchmark: a base rate plus an illiquidity premium, then explicit premia for the risks this catalog actually has — title and platform concentration, rights clarity, international collection, reversions. Within {c.rateBand[0]}–{c.rateBand[1]}% is defensible for this profile; outside it you need a reason.</p>
        <p className="m-0">Recompute the draft's terminal: a 20-year, −1.5% annuity from $1.415M discounted at 12.5% is $5.22M, not $5.9M. Clear the typed-in first cash flow so it follows from your 2031 forecast, and check how much of the answer the terminal period carries.</p>
      </Reviewer>
    </Exercise>
  )
}

function Multiples({ state, update, r, reviewer }) {
  const base = r.grid.find((x) => x.rate === 12.5)
  return (
    <>
      <Exercise n={11} title="Cross-check against multiples" prompt="A multiple is shorthand for the market's view of duration, risk, and growth. Use it to triangulate the DCF, not replace it.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['Downside', 'Base', 'Upside'].map((k, i) => (
            <div key={k} className="rounded-md border border-line-1 p-4">
              <div className="t-eyebrow text-ink-3 mb-2">{k}</div>
              <NumField width="w-16" suffix="x" value={state.exec.multiples[i]} onChange={(v) => update(['exec', 'multiples', i], v)} ariaLabel={`${k} multiple`} />
              <div className="t-stat text-money mt-2">{fmtM(r.multipleValues[i], 2)}</div>
              <div className="t-micro text-ink-4">× {fmtK(r.normalized)} normalised LTM</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-6 items-center">
          <Kpi label="DCF implied multiple" value={fmtX(r.impliedMultiple)} />
          {r.impliedMultiple < r.mults[0] ? <Verdict ok={false}>DCF sits below the multiple floor — explain the gap before averaging across it</Verdict> : r.impliedMultiple > r.mults[2] ? <Verdict ok={false}>DCF sits above the multiple ceiling</Verdict> : <Verdict ok>DCF sits inside the multiple range</Verdict>}
        </div>
        <Reviewer reviewer={reviewer}>
          <p className="m-0">The 7.5–9.5x range is a case assumption for practice. The point of the exercise is the reconciliation: if your DCF implies {fmtX(r.impliedMultiple)}, either the market is pricing lower risk or longer duration than you believe, or the multiple is being applied to an earnings base that isn't comparable. Say which in the memo.</p>
        </Reviewer>
      </Exercise>

      <Card pad="lg">
        <div className="t-eyebrow text-ink-3 mb-3">Sensitivity — DCF value by discount rate and long-run trend</div>
        <Table minWidth={620}
          columns={[{ key: 'rate', label: 'Rate \\ trend' }, ...r.gridTrends.map((g, i) => ({ key: `t${i}`, label: `${g > 0 ? '+' : ''}${g}%`, align: 'right' }))]}
          rows={r.grid.map((row) => ({ key: row.rate, rate: <Figure className="t-data">{row.rate}%</Figure>, ...Object.fromEntries(row.cells.map((cell, i) => [`t${i}`, <Money key={i} className={`t-data ${row === base && cell.g === -1.5 ? 'underline' : ''}`}>{fmtM(cell.ev)}</Money>])) }))} />
        <div className="t-eyebrow text-ink-3 mt-6 mb-3">Draft scenarios, recomputed</div>
        <Table minWidth={620}
          columns={[{ key: 'l', label: 'Scenario' }, { key: 'r', label: 'Rate', align: 'right' }, { key: 'g', label: 'Trend', align: 'right' }, { key: 's', label: 'Draft stated', align: 'right' }, { key: 'v', label: 'Your model', align: 'right' }, { key: 'd', label: 'vs base', align: 'right' }]}
          rows={r.scenarios.map((x) => ({ key: x.label, l: <span className="t-small text-ink-1">{x.label}</span>, r: <Figure className="t-data">{x.rate}%</Figure>, g: <Figure className="t-data">{x.g}%</Figure>, s: <Figure className="t-data text-ink-3">{fmtM(x.stated)}</Figure>, v: <Money className="t-data">{fmtM(x.ev)}</Money>, d: pctCell(x.ev / r.scenarios[1].ev - 1) }))} />
      </Card>
    </>
  )
}

function Findings({ c, state, update, reviewer }) {
  return (
    <Exercise n={12} title="Turn findings into protection" prompt="A finding that doesn't change price, structure, or the purchase agreement is a footnote. Rate each and choose the protection.">
      <div className="divide-y divide-line-1 border-y border-line-1">
        {c.findings.map((f) => {
          const x = state.exec.findings[f.id] || {}
          const ok = x.severity === f.benchmark.severity && x.protection === f.benchmark.protection
          return (
            <div key={f.id} className="py-3 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_280px] gap-3 items-start">
              <div className="min-w-0">
                <div className="t-body text-ink-1">{f.finding}</div>
                <div className="t-micro text-ink-4">{c.workstreams.find((w) => w.id === f.ws)?.label}</div>
                {reviewer && (x.severity || x.protection) && <div className={`t-small mt-1 ${ok ? 'text-secondary' : 'text-danger'}`}>{ok ? '✓ Matches reviewer' : `Reviewer: ${f.benchmark.severity} · ${c.protections.find((p) => p.id === f.benchmark.protection)?.label}`}</div>}
              </div>
              <Seg value={x.severity} onChange={(v) => update(['exec', 'findings', f.id, 'severity'], v)} options={[['High', 'High'], ['Medium', 'Med'], ['Low', 'Low']]} />
              <select value={x.protection || ''} onChange={(e) => update(['exec', 'findings', f.id, 'protection'], e.target.value)} className="bg-ground-1 border border-line-2 rounded-md h-8 px-2 t-small text-ink-1 focus:border-accent outline-none w-full" aria-label="Protection">
                <option value="">Choose protection…</option>
                {c.protections.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          )
        })}
      </div>
      <Reviewer reviewer={reviewer}>
        <p className="m-0">Ownership and consent problems are binary risks, so they get escrow and special indemnities rather than a higher discount rate. Earnings durability risks (top title) suit an earn-out. Structural concentration (Spotify, UGC policy) can't be contracted away — it goes into price.</p>
      </Reviewer>
    </Exercise>
  )
}

function Price({ c, state, update, r, b, reviewer }) {
  return (
    <Exercise n={13} title="Bridge rights value to the purchase price" prompt="Start from your rights value, decide which balance-sheet items move with the deal, then design the structure.">
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <span className="t-small text-ink-2">Headline rights value</span>
        <NumField prefix="$" width="w-32" value={state.exec.headline} onChange={(v) => update(['exec', 'headline'], v)} ariaLabel="Headline rights value" />
        <span className="t-micro text-ink-4">your DCF {fmtM(r.dcf.ev, 2)} · multiples {fmtM(r.multipleValues[0])}–{fmtM(r.multipleValues[2])}</span>
      </div>
      <div className="divide-y divide-line-1 border-y border-line-1">
        {r.bridge.map((x) => (
          <div key={x.id} className="py-2.5 grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 items-start">
            <input type="checkbox" className="mt-1 accent-[var(--mm-accent)]" checked={x.include} onChange={(e) => update(['exec', 'bridge', x.id, 'include'], e.target.checked)} aria-label={`Include ${x.label}`} />
            <div className="min-w-0">
              <div className="t-body text-ink-1">{x.label}</div>
              {reviewer && <div className={`t-small mt-0.5 ${x.include === x.benchmark ? 'text-secondary' : 'text-danger'}`}>{x.include === x.benchmark ? '✓ ' : `✗ Reviewer ${x.benchmark ? 'includes' : 'excludes'} it. `}{x.why}</div>}
            </div>
            <NumField prefix="$" width="w-28" value={state.exec.bridge[x.id]?.amount} onChange={(v) => update(['exec', 'bridge', x.id, 'amount'], v)} ariaLabel={`${x.label} amount`} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="flex items-center justify-between gap-3"><span className="t-small text-ink-2">Escrow / holdback</span><NumField width="w-16" suffix="% of fixed price" value={state.exec.structure.escrowPct} onChange={(v) => update(['exec', 'structure', 'escrowPct'], v)} ariaLabel="Escrow percent" /></div>
        <div className="flex items-center justify-between gap-3"><span className="t-small text-ink-2">Earn-out (contingent, top titles)</span><NumField prefix="$" width="w-28" value={state.exec.structure.earnout} onChange={(v) => update(['exec', 'structure', 'earnout'], v)} ariaLabel="Earn-out" /></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        <Kpi label="Purchase price" value={fmtM(r.price, 2)} tone="money" />
        <Kpi label="Contingent" value={fmtM(r.earnout, 2)} />
        <Kpi label="Escrow" value={fmtM(r.escrow, 2)} />
        <Kpi label="Cash at close" value={fmtM(r.cashAtClose, 2)} tone="money" />
      </div>
      <Reviewer reviewer={reviewer}>
        <p className="m-0">Royalty payables are debt-like: the buyer pays them after closing. Pre-close receivables are the seller's by default; schedule them with a collection waterfall rather than paying for them up front. Reserves and recoupment count only at their expected recovery.</p>
        <p className="m-0">Reviewer structure: {c.structureBenchmark.escrowPct}% escrow against chain of title and co-writer consent, and a {fmtM(c.structureBenchmark.earnout, 2)} earn-out on top-title collections. On a {fmtM(b.headline, 2)} headline that gives {fmtM(b.price, 2)} of price and {fmtM(b.cashAtClose, 2)} at close.</p>
      </Reviewer>
    </Exercise>
  )
}

function Review(p) {
  return <ModelReview n={14} {...p} />
}
