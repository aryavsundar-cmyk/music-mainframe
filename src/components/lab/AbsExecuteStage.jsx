import { Card, Tag } from '../primitives/index.js'
import { fmtK, fmtM, fmtPct, fmtX, num } from '../../utils/valuation.js'
import { collateral, collateralValue } from '../../utils/abs.js'
import { ABS_STEPS } from '../../utils/absState.js'
import { Exercise, Reviewer, Seg, NumField, Table, Money, Figure, Kpi, Verdict, ModelReview } from './LabUi.jsx'
import { Concepts } from '../reference/Concepts.jsx'

const Row = ({ label, hint, children }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="t-small text-ink-2">{label}{hint && <span className="block t-micro text-ink-4">{hint}</span>}</span>
    {children}
  </div>
)
const pct = (v) => <Figure className="t-data text-ink-2">{fmtPct(v)}</Figure>
const yr = (t) => (t == null ? '—' : `Y${t}`)
const STATUS_TONE = { normal: 'text-ink-3', 'cash trap': 'text-accent', 'rapid amortisation': 'text-danger', 'post-ARD sweep': 'text-secondary', repaid: 'text-ink-4' }

export function AbsExecuteStage({ step, onStep, ...p }) {
  const cur = ABS_STEPS.some((s) => s.id === step) ? step : 'tape'
  const idx = ABS_STEPS.findIndex((s) => s.id === cur)
  const Body = { tape: Tape, eligibility: Eligibility, concentration: Concentration, cashflow: CashFlow, value: Value, waterfall: Waterfall, stress: Stress, findings: Findings, review: Review }[cur]
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)] gap-6 items-start">
      <nav className="flex flex-wrap gap-1 xl:block xl:space-y-1 xl:sticky xl:top-6" aria-label="Execution steps">
        {ABS_STEPS.map((s, i) => (
          <button key={s.id} type="button" onClick={() => onStep(s.id)} aria-current={s.id === cur ? 'step' : undefined}
            className={['xl:w-full text-left flex items-center gap-2 rounded-md px-2.5 py-1.5 border cursor-pointer t-small xl:border-0', s.id === cur ? 'bg-ground-4 text-ink-1 border-line-3' : 'bg-transparent text-ink-2 border-line-1 hover:bg-ground-2 hover:text-ink-1'].join(' ')}>
            <span className="font-mono t-micro text-ink-4 xl:w-4">{i + 1}</span>{s.label}
          </button>
        ))}
        <div className="hidden xl:block pt-3 px-2.5 space-y-2 border-t border-line-1 mt-2">
          <Kpi label="Borrowing base" value={fmtM(p.r.borrowingBase)} tone="money" hint={`offering ${fmtM(p.draft.borrowingBase)}`} />
          <Kpi label="Year-1 DSCR" value={fmtX(p.r.base.dscr1, 2)} tone={p.r.base.dscr1 < p.c.structure.triggers.trap ? 'danger' : 'ink'} hint={`stated ${fmtX(p.c.asPresented.dscr, 2)}`} />
          <Kpi label="Class A LTV" value={fmtPct(p.r.ltvA, 0)} tone={p.r.ltvA > p.c.targets.ltvA / 100 ? 'danger' : 'ink'} hint={`stated ${fmtPct(p.c.asPresented.ltvA, 0)}`} />
        </div>
      </nav>
      <div className="space-y-6 min-w-0">
        {cur === 'tape' && (
          <Card pad="md" className="border-accent-line">
            <p className="t-body text-ink-1 m-0">You're reviewing the sponsor's offering on behalf of the anchor investor. Every input starts on the sponsor's figures. Tie out the tape, screen the collateral, rebuild the waterfall from the indenture terms, and stress it. Log what you find in <button type="button" onClick={() => onStep('review')} className="text-accent bg-transparent border-0 cursor-pointer px-0 underline">Offering review</button>. Figures recompute live.</p>
          </Card>
        )}
        <Body {...p} />
        <Concepts ids={ABS_STEPS.find((s) => s.id === cur)?.terms} />
        <div className="flex justify-between">
          {idx > 0 ? <button type="button" onClick={() => onStep(ABS_STEPS[idx - 1].id)} className="t-small text-ink-2 bg-transparent border-0 cursor-pointer px-0">← {ABS_STEPS[idx - 1].label}</button> : <span />}
          {idx < ABS_STEPS.length - 1 ? <button type="button" onClick={() => onStep(ABS_STEPS[idx + 1].id)} className="t-small text-accent bg-transparent border-0 cursor-pointer px-0">{ABS_STEPS[idx + 1].label} →</button> : <span />}
        </div>
      </div>
    </div>
  )
}

function Tape({ c, state, update, r, reviewer }) {
  return (
    <>
      <Exercise n={6} title="Tie the data tape to cash and normalise LTM" prompt="Noteholders are paid from recurring cash. Decide each adjustment: accept it, reject it, or take a partial amount.">
        <div className="divide-y divide-line-1 border-y border-line-1">
          {r.norm.map((n) => {
            const ch = state.exec.norm[n.id] || {}
            const set = (patch) => update(['exec', 'norm', n.id], { ...ch, ...patch, touched: true })
            return (
              <div key={n.id} className="py-3 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><span className="t-body text-ink-1">{n.label}</span><Tag tone={n.kind === 'pro-forma' ? 'secondary' : 'neutral'}>{n.kind}</Tag></div>
                  <div className="t-micro text-ink-4">{n.amount > 0 ? '+' : ''}{fmtK(n.amount)} · {c.tape.find((t) => t.id === n.row)?.label} · evidence: {n.evidence} · sponsor: {n.draft === 'accept' ? 'included' : 'not adjusted'}</div>
                  {(reviewer || ch.revealed) && <div className={`t-small mt-1 ${n.treatment === n.benchmark ? 'text-secondary' : 'text-danger'}`}>{n.treatment === n.benchmark ? '✓ ' : `✗ Reviewer: ${n.benchmark}. `}{n.why}</div>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Seg value={n.treatment} onChange={(v) => set({ treatment: v, amount: v === 'partial' ? (ch.amount ?? n.amount / 2) : ch.amount })} options={[['accept', 'Accept'], ['partial', 'Partial'], ['reject', 'Reject']]} />
                  {n.treatment === 'partial' && <NumField prefix="$" value={ch.amount} onChange={(v) => set({ amount: v })} ariaLabel="Partial amount" />}
                  <button type="button" onClick={() => set({ revealed: true })} className="t-micro text-secondary bg-transparent border-0 cursor-pointer px-0">check</button>
                </div>
              </div>
            )
          })}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <Kpi label="Tape LTM" value={fmtM(r.tapeTotal)} />
          <Kpi label="Offering pro forma" value={fmtM(c.asPresented.offeringNcf)} hint="sponsor's figure" />
          <Kpi label="Your normalised LTM" value={fmtM(r.normalized)} tone="money" />
          <Kpi label="Change vs offering" value={fmtPct(r.normalized / c.asPresented.offeringNcf - 1)} tone={r.normalized < c.asPresented.offeringNcf ? 'danger' : 'ink'} />
        </div>
      </Exercise>
      <Card pad="lg">
        <div className="t-eyebrow text-ink-3 mb-3">Data tape</div>
        <Table minWidth={820}
          columns={[{ key: 'l', label: 'Line' }, { key: 'v', label: 'Vintage' }, { key: 'cur', label: 'Currency' }, { key: 't', label: 'Tape LTM', align: 'right' }, { key: 'a', label: 'Adjustments', align: 'right' }, { key: 'n', label: 'Normalised', align: 'right' }]}
          rows={r.rows.map((x) => ({ key: x.id, l: <span className="t-small text-ink-1">{x.label}</span>, v: <span className="t-micro text-ink-3">{x.vintage}</span>, cur: <span className="t-micro text-ink-3">{x.currency}</span>, t: <Figure className="t-data text-ink-3">{fmtK(x.ltm)}</Figure>, a: <Figure className={`t-data ${x.normAdj < 0 ? 'text-danger' : 'text-ink-3'}`}>{x.normAdj ? fmtK(x.normAdj) : '—'}</Figure>, n: <Money className="t-data">{fmtK(x.normalized)}</Money> }))}
          foot={{ l: 'Total', t: fmtK(r.tapeTotal), a: fmtK(r.normalized - r.tapeTotal), n: <Money>{fmtK(r.normalized)}</Money> }} />
        <div className="t-eyebrow text-ink-3 mt-6 mb-3">Collection history</div>
        <Table minWidth={560}
          columns={[{ key: 'p', label: 'Period' }, { key: 'c', label: 'Collections (bank)', align: 'right' }, { key: 'o', label: 'One-offs', align: 'right' }, { key: 'n', label: 'Normalised', align: 'right' }, { key: 'g', label: 'Change', align: 'right' }]}
          rows={c.history.map((h, i) => { const nrm = h.collections - h.oneOffs; const prev = i ? c.history[i - 1].collections - c.history[i - 1].oneOffs : null; return { key: h.period, p: <span className="t-small text-ink-1">{h.period}</span>, c: <Figure className="t-data text-ink-3">{fmtK(h.collections)}</Figure>, o: <Figure className="t-data text-ink-3">{fmtK(-h.oneOffs)}</Figure>, n: <Money className="t-data">{fmtK(nrm)}</Money>, g: prev ? pct(nrm / prev - 1) : '—' } })} />
        <Reviewer reviewer={reviewer}>
          <p className="m-0">The LTM bank figure is {fmtM(c.history[c.history.length - 1].collections)}, {fmtM(r.tapeTotal - c.history[c.history.length - 1].collections, 2)} below the tape: that is the accrual. Strip one-offs from every period and the pool has declined steadily, which matters for the trend you set later.</p>
        </Reviewer>
      </Card>
    </>
  )
}

function Eligibility({ c, state, update, r, reviewer }) {
  const show = reviewer || state.exec.eligRevealed
  return (
    <Exercise n={7} title="Screen the pool against the eligibility criteria" prompt="The indenture only credits assets the issuer owns outright, can transfer, and can collect until legal final maturity. Decide whether each flagged share is eligible." aside={<Tag tone="neutral" mono>{c.eligibility.filter((x) => state.exec.elig[x.id]).length}/{c.eligibility.length}</Tag>}>
      <div className="divide-y divide-line-1 border-y border-line-1">
        {c.eligibility.map((x) => {
          const row = r.rows.find((y) => y.id === x.row)
          const pick = state.exec.elig[x.id]
          return (
            <div key={x.id} className="py-3 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
              <div className="min-w-0">
                <div className="t-body text-ink-1">{row.label}</div>
                <div className="t-small text-ink-3">{x.issue}</div>
                <div className="t-micro text-ink-4">Flagged share {fmtPct(x.share, 0)} of normalised {fmtK(row.normalized)} = {fmtK(row.normalized * x.share)}</div>
                {show && <div className={`t-small mt-1 ${(pick || 'eligible') === x.benchmark ? 'text-secondary' : 'text-danger'}`}>{(pick || 'eligible') === x.benchmark ? '✓ ' : `✗ Reviewer: ${x.benchmark}. `}{x.why}</div>}
              </div>
              <Seg value={pick} onChange={(v) => update(['exec', 'elig', x.id], v)} options={[['eligible', 'Eligible'], ['exclude', 'Exclude share']]} />
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-between mt-3">
        <button type="button" onClick={() => update(['exec', 'eligRevealed'], true)} className="t-small text-secondary bg-transparent border-0 cursor-pointer px-0">Check my screen</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-5">
        <Kpi label="Normalised pool" value={fmtM(r.normalized)} />
        <Kpi label="Excluded" value={fmtM(r.normalized - r.eligible, 2)} tone={r.normalized > r.eligible ? 'danger' : 'ink'} />
        <Kpi label="Eligible pool" value={fmtM(r.eligible)} tone="money" />
      </div>
      <Reviewer reviewer={reviewer}>
        <p className="m-0">Exclusion isn't removal: the assets stay in the trust and their cash still flows through the waterfall. They just get no credit when sizing the notes. A defect that will be cured at closing, like a lien with a payoff letter, is a condition precedent rather than an exclusion.</p>
      </Reviewer>
    </Exercise>
  )
}

function Concentration({ c, state, update, r, b, reviewer }) {
  const L = state.exec.limits
  const set = (k) => (v) => update(['exec', 'limits', k], v)
  return (
    <Exercise n={8} title="Apply the concentration limits" prompt="Limits stop a few assets from carrying the notes. Apply them to the eligible pool; anything above a limit gets no credit.">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
        <Table minWidth={620}
          columns={[{ key: 'l', label: 'Asset' }, { key: 'e', label: 'Eligible', align: 'right' }, { key: 's', label: 'Share of eligible', align: 'right' }, { key: 'x', label: 'Single-asset excess', align: 'right' }, { key: 't', label: 'Tags' }]}
          rows={r.rows.map((x) => ({ key: x.id, l: <span className="t-small text-ink-1">{x.label}</span>, e: <Money className="t-data">{fmtK(x.eligible)}</Money>, s: x.pool ? <span className="t-micro text-ink-4">pool</span> : <Figure className={`t-data ${x.eligible / r.eligible > num(L.single) / 100 ? 'text-danger' : 'text-ink-2'}`}>{fmtPct(x.eligible / r.eligible)}</Figure>, x: <Figure className="t-data text-ink-3">{x.singleExcess ? fmtK(x.singleExcess) : '—'}</Figure>, t: <span className="flex gap-1">{x.sync && <Tag tone="secondary">sync</Tag>}{x.nonUsd ? <Tag tone="neutral">{x.nonUsd === 1 ? x.currency : `${fmtPct(x.nonUsd, 0)} non-USD`}</Tag> : null}</span> }))} />
        <div className="space-y-3">
          <Row label="Apply limits"><Seg value={L.apply ? 'on' : 'off'} onChange={(v) => update(['exec', 'limits', 'apply'], v === 'on')} options={[['on', 'Apply'], ['off', 'Ignore']]} /></Row>
          <Row label="Single asset" hint={`largest ${fmtPct(r.shares.topAsset)}`}><NumField width="w-14" suffix="%" value={L.single} onChange={set('single')} ariaLabel="Single-asset limit" /></Row>
          <Row label="Sync-dependent" hint={`pool ${fmtPct(r.shares.sync)}`}><NumField width="w-14" suffix="%" value={L.sync} onChange={set('sync')} ariaLabel="Sync limit" /></Row>
          <Row label="Non-USD" hint={`pool ${fmtPct(r.shares.nonUsd)}`}><NumField width="w-14" suffix="%" value={L.nonUsd} onChange={set('nonUsd')} ariaLabel="Non-USD limit" /></Row>
          {!L.apply && <Verdict ok={false}>Limits in the indenture but not in the borrowing base</Verdict>}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        <Kpi label="Single-asset excess" value={fmtM(r.singleExcess, 2)} />
        <Kpi label="Sync excess" value={fmtM(r.syncExcess, 2)} />
        <Kpi label="Non-USD excess" value={fmtM(r.nonUsdExcess, 2)} />
        <Kpi label="Borrowing base" value={fmtM(r.borrowingBase)} tone="money" hint={`offering ${fmtM(c.asPresented.offeringNcf)}`} />
      </div>
      <Reviewer reviewer={reviewer}>
        <p className="m-0">Measured on the whole tape, Anthem is just over {c.structure.limits.single}%. Measured correctly on the eligible pool, it is {fmtPct(b.shares.topAsset)}, because exclusions shrink the denominator. Sync-dependent income also breaches its limit. The limits were written into the indenture; the offering simply didn't apply them.</p>
      </Reviewer>
    </Exercise>
  )
}

function CashFlow({ c, state, update, r, draft, reviewer }) {
  const cf = state.exec.cf
  const set = (k) => (v) => update(['exec', 'cf', k], v)
  const hist = c.history.map((h) => h.collections - h.oneOffs)
  const histTrend = (hist[hist.length - 1] / hist[0]) ** (1 / (hist.length - 1)) - 1
  return (
    <Exercise n={9} title="Project collateral cash available for noteholders" prompt="The servicer and senior expenses are paid before noteholders. Set the collateral trend from evidence, then see what is actually available for debt service.">
      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6 items-start">
        <div className="space-y-3">
          <Row label="Collateral trend" hint={`normalised history ${fmtPct(histTrend)} / yr`}><NumField width="w-16" suffix="% / yr" value={cf.trend} onChange={set('trend')} ariaLabel="Trend" /></Row>
          <Row label="Servicing fee" hint="% of collections"><NumField width="w-16" suffix="%" value={cf.servicing} onChange={set('servicing')} ariaLabel="Servicing fee" /></Row>
          <Row label="Senior expenses" hint="trustee, backup servicer, surveillance"><NumField prefix="$" width="w-24" value={cf.expenses} onChange={set('expenses')} ariaLabel="Senior expenses" /></Row>
          {num(cf.servicing) === 0 && <Verdict ok={false}>No servicing fee: the indenture pays one</Verdict>}
          {num(cf.trend) > histTrend * 100 + 0.5 && <Verdict ok={false}>Trend above normalised history</Verdict>}
        </div>
        <Table minWidth={560}
          columns={[{ key: 't', label: 'Year' }, { key: 'c', label: 'Collections', align: 'right' }, { key: 's', label: 'Servicing', align: 'right' }, { key: 'e', label: 'Expenses', align: 'right' }, { key: 'a', label: 'Available', align: 'right' }]}
          rows={r.base.rows.slice(0, 8).map((x) => ({ key: x.t, t: <Figure className="t-data">{x.t}</Figure>, c: <Figure className="t-data text-ink-3">{fmtK(x.collections)}</Figure>, s: <Figure className="t-data text-ink-3">{fmtK(-x.collections * num(cf.servicing) / 100)}</Figure>, e: <Figure className="t-data text-ink-3">{fmtK(-num(cf.expenses))}</Figure>, a: <Money className="t-data">{fmtK(x.available)}</Money> }))} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        <Kpi label="Year-1 available" value={fmtM(r.base.rows[0].available)} tone="money" hint={`offering ${fmtM(draft.base.rows[0].available)}`} />
        <Kpi label="Year-6 available (ARD)" value={fmtM(r.base.rows[c.structure.ard - 1].available)} />
        <Kpi label="Senior costs, year 1" value={fmtM(r.base.rows[0].collections - r.base.rows[0].available, 2)} />
        <Kpi label="Available vs offering" value={fmtPct(r.base.rows[0].available / draft.base.rows[0].available - 1)} tone="danger" />
      </div>
      <Reviewer reviewer={reviewer}>
        <p className="m-0">Reviewer: {c.benchmarkModel.cf.trend}% a year, a {c.benchmarkModel.cf.servicing}% servicing fee, and {fmtM(c.benchmarkModel.cf.expenses, 2)} of senior expenses. A seasoned catalog can be very durable, but durable isn't growing: normalised collections fell about {fmtPct(-histTrend, 1)} a year, and a 25-year note compounds that.</p>
      </Reviewer>
    </Exercise>
  )
}

function Value({ c, state, update, r, b, reviewer }) {
  const v = state.exec.value
  const set = (k) => (x) => update(['exec', 'value', k], x)
  const col = collateral(c, state.exec)
  const rates = [7, 8, 9, 10]; const trends = [0, -1, -2]
  return (
    <Exercise n={10} title="Value the collateral and recompute loan-to-value" prompt="An appraisal is an input. Value the borrowing base yourself, after senior costs, and see how much equity really sits under Class A.">
      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6 items-start">
        <div className="space-y-3">
          <Row label="Discount rate"><NumField width="w-16" suffix="%" value={v.rate} onChange={set('rate')} ariaLabel="Discount rate" /></Row>
          <Row label="Cash-flow life"><NumField width="w-16" suffix="years" value={v.life} onChange={set('life')} ariaLabel="Life" /></Row>
          <div className="t-micro text-ink-4">Uses your borrowing base, trend, servicing fee, and expenses.</div>
        </div>
        <div>
          <div className="t-eyebrow text-ink-3 mb-2">Value by discount rate and trend</div>
          <Table minWidth={420}
            columns={[{ key: 'r', label: 'Rate \\ trend' }, ...trends.map((g) => ({ key: `g${g}`, label: `${g}%`, align: 'right' }))]}
            rows={rates.map((rt) => ({ key: rt, r: <Figure className="t-data">{rt}%</Figure>, ...Object.fromEntries(trends.map((g) => [`g${g}`, <Money key={g} className="t-data">{fmtM(collateralValue(c, { ...state.exec, cf: { ...state.exec.cf, trend: g } }, col, rt), 0)}</Money>])) }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        <Kpi label="Collateral value" value={fmtM(r.value, 0)} tone="money" hint={`sponsor appraisal ${fmtM(c.asPresented.appraisal, 0)}`} />
        <Kpi label="Multiple of borrowing base" value={fmtX(r.multipleOfBase)} />
        <Kpi label="Class A LTV" value={fmtPct(r.ltvA, 0)} tone={r.ltvA > c.targets.ltvA / 100 ? 'danger' : 'ink'} hint={`stated ${fmtPct(c.asPresented.ltvA, 0)} · test ≤ ${c.targets.ltvA}%`} />
        <Kpi label="All notes LTV" value={fmtPct(r.ltvTotal, 0)} tone={r.ltvTotal > 0.8 ? 'danger' : 'ink'} />
      </div>
      <Reviewer reviewer={reviewer}>
        <p className="m-0">The reviewer uses the appraiser's own {c.benchmarkModel.value.rate}% rate and {c.benchmarkModel.value.life}-year life. Value falls from {fmtM(c.asPresented.appraisal, 0)} to about {fmtM(b.value, 0)} purely because the cash flow is corrected: normalised, eligible, limit-compliant, net of senior costs, and declining. You don't need a harsher rate to reach a different answer.</p>
      </Reviewer>
    </Exercise>
  )
}

function Waterfall({ c, state, update, r, b, reviewer }) {
  const n = state.exec.notes; const tr = state.exec.triggers
  const setN = (k) => (v) => update(['exec', 'notes', k], v)
  return (
    <Exercise n={11} title="Rebuild the note waterfall and triggers" prompt="Model the offered structure from the draft indenture: Class A interest and scheduled principal, then Class B interest, the reserve, and the triggers that trap or sweep cash. After the ARD, all cash sweeps.">
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-x-8 gap-y-3">
        <Row label="Class A size"><NumField prefix="$" width="w-28" value={n.aSize} onChange={setN('aSize')} ariaLabel="Class A size" /></Row>
        <Row label="Class A coupon"><NumField width="w-14" suffix="%" value={n.aRate} onChange={setN('aRate')} ariaLabel="Class A coupon" /></Row>
        <Row label="Class A amortisation"><NumField width="w-14" suffix="% / yr" value={n.aAmort} onChange={setN('aAmort')} ariaLabel="Class A amortisation" /></Row>
        <Row label="Class B size"><NumField prefix="$" width="w-28" value={n.bSize} onChange={setN('bSize')} ariaLabel="Class B size" /></Row>
        <Row label="Class B coupon"><NumField width="w-14" suffix="%" value={n.bRate} onChange={setN('bRate')} ariaLabel="Class B coupon" /></Row>
        <Row label="Liquidity reserve"><NumField prefix="$" width="w-24" value={n.reserve} onChange={setN('reserve')} ariaLabel="Reserve" /></Row>
        <Row label="Cash trap below"><NumField width="w-14" suffix="x" value={tr.trap} onChange={(v) => update(['exec', 'triggers', 'trap'], v)} ariaLabel="Cash trap trigger" /></Row>
        <Row label="Rapid amortisation below"><NumField width="w-14" suffix="x" value={tr.rapid} onChange={(v) => update(['exec', 'triggers', 'rapid'], v)} ariaLabel="Rapid amortisation trigger" /></Row>
        <Row label="ARD · legal final"><span className="t-data font-mono text-ink-2">Y{c.structure.ard} · Y{c.structure.legalFinal}</span></Row>
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-3">
        <button type="button" onClick={() => { update(['exec', 'notes'], { ...c.structure.notes }); update(['exec', 'triggers'], { ...c.structure.triggers }) }} className="t-small text-secondary bg-transparent border-0 cursor-pointer px-0">Reset to offered structure</button>
        <span className="t-micro text-ink-4">Try other sizes freely; the scorecard tests the offered notes.</span>
      </div>
      <div className="mt-6">
        <Table minWidth={980}
          columns={[{ key: 't', label: 'Yr' }, { key: 'a', label: 'Available', align: 'right' }, { key: 'ai', label: 'A interest', align: 'right' }, { key: 'ap', label: 'A principal', align: 'right' }, { key: 'bi', label: 'B interest', align: 'right' }, { key: 'd', label: 'DSCR', align: 'right' }, { key: 's', label: 'Status' }, { key: 'rl', label: 'Released', align: 'right' }, { key: 'ab', label: 'A balance', align: 'right' }, { key: 'bb', label: 'B balance', align: 'right' }]}
          rows={r.base.rows.filter((x) => x.t <= 12 || x.t === c.structure.legalFinal).map((x) => ({ key: x.t, t: <Figure className="t-data">{x.t}</Figure>, a: <Money className="t-data">{fmtM(x.available)}</Money>, ai: <Figure className="t-data text-ink-3">{fmtM(x.aIntPaid)}</Figure>, ap: <Figure className="t-data text-ink-3">{fmtM(x.aSchedPaid + x.aSweep)}</Figure>, bi: <Figure className="t-data text-ink-3">{fmtM(x.bIntPaid)}</Figure>, d: <Figure className={`t-data ${x.dscr != null && x.dscr < num(tr.trap) ? 'text-danger' : 'text-ink-1'}`}>{x.dscr == null ? '—' : fmtX(x.dscr, 2)}</Figure>, s: <span className={`t-micro whitespace-nowrap ${STATUS_TONE[x.status]}`}>{x.status}</span>, rl: <Figure className="t-data text-ink-3">{fmtM(x.released)}</Figure>, ab: <Figure className="t-data text-ink-2">{fmtM(x.aBal)}</Figure>, bb: <Figure className="t-data text-ink-2">{fmtM(x.bBal)}</Figure> }))} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-5 gap-4 mt-5">
        <Kpi label="Year-1 DSCR" value={fmtX(r.base.dscr1, 2)} tone={r.base.dscr1 < num(tr.trap) ? 'danger' : 'ink'} hint={`trap at ${fmtX(num(tr.trap), 2)}`} />
        <Kpi label="Headroom to trap" value={fmtPct(r.base.dscr1 / num(tr.trap) - 1)} tone={r.base.dscr1 / num(tr.trap) - 1 < 0.1 ? 'danger' : 'ink'} />
        <Kpi label="Class A at ARD" value={fmtM(r.base.aAtArd)} />
        <Kpi label="Class A repaid" value={yr(r.base.aRepaidYear)} />
        <Kpi label="Reserve coverage" value={`${r.reserveMonths.toFixed(1)} mo`} hint="of scheduled debt service" tone={r.reserveMonths < 6 ? 'danger' : 'ink'} />
      </div>
      <Reviewer reviewer={reviewer}>
        <p className="m-0">On the reviewer's corrected collateral the offered structure pays, but year-1 DSCR is {fmtX(b.base.dscr1, 2)} against a {fmtX(c.structure.triggers.trap, 2)} trap: a {b.breakeven.trapYear1 == null ? '—' : `${b.breakeven.trapYear1.toFixed(0)}%`} fall in collections traps cash from year 1. Class A still has {fmtM(b.base.aAtArd)} outstanding at the ARD, so repayment depends on refinancing or a long sweep. The reserve covers {b.reserveMonths.toFixed(1)} months of scheduled debt service, not the six the offering implies.</p>
      </Reviewer>
    </Exercise>
  )
}

function Stress({ c, state, update, r, b, reviewer }) {
  const st = state.exec.stress
  const set = (k) => (v) => update(['exec', 'stress', k], v)
  const rows = [{ id: 'base', label: 'Base', shock: 0, trendDelta: 0, fx: 0, ...r.base }, ...r.scenarios, { id: 'custom', label: 'Your scenario', shock: num(st.shock), trendDelta: num(st.trendDelta), fx: num(st.fx), ...r.custom }]
  const be = (v) => (v == null ? 'none' : `${v.toFixed(0)}%`)
  return (
    <Exercise n={12} title="Stress the notes and solve for break-evens" prompt="Run the scenarios, build your own, and find the haircut to collections that first breaks each layer of protection.">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 mb-4">
        <label><span className="block t-micro text-ink-3 mb-1">Level haircut</span><NumField width="w-14" suffix="%" value={st.shock} onChange={set('shock')} ariaLabel="Haircut" /></label>
        <label><span className="block t-micro text-ink-3 mb-1">Trend change</span><NumField width="w-14" suffix="pts" value={st.trendDelta} onChange={set('trendDelta')} ariaLabel="Trend change" /></label>
        <label><span className="block t-micro text-ink-3 mb-1">FX haircut on non-USD</span><NumField width="w-14" suffix="%" value={st.fx} onChange={set('fx')} ariaLabel="FX haircut" /></label>
      </div>
      <Table minWidth={720}
        columns={[{ key: 'l', label: 'Scenario' }, { key: 'in', label: 'Haircut · trend · FX' }, { key: 'd', label: 'Y1 DSCR', align: 'right' }, { key: 'tr', label: 'Trap · rapid', align: 'right' }, { key: 'rd', label: 'Reserve draws', align: 'right' }, { key: 'ar', label: 'A repaid', align: 'right' }, { key: 'al', label: 'A loss', align: 'right' }, { key: 'bl', label: 'B shortfall', align: 'right' }]}
        rows={rows.map((x) => ({ key: x.id, l: <span className="t-small text-ink-1 whitespace-nowrap">{x.label}</span>, in: <span className="t-micro text-ink-3">{x.shock}% · {x.trendDelta} pts · {x.fx}%</span>, d: <Figure className="t-data">{fmtX(x.dscr1, 2)}</Figure>, tr: <Figure className="t-data text-ink-3">{yr(x.firstTrap)} · {yr(x.firstRapid)}</Figure>, rd: <Figure className="t-data text-ink-3">{fmtM(x.reserveDraws)}</Figure>, ar: <Figure className="t-data text-ink-2">{yr(x.aRepaidYear)}</Figure>, al: <Figure className={`t-data ${x.aLoss > 1000 ? 'text-danger' : 'text-ink-3'}`}>{fmtM(x.aLoss)}</Figure>, bl: <Figure className={`t-data ${x.bLoss > 1000 ? 'text-danger' : 'text-ink-3'}`}>{fmtM(x.bLoss)}</Figure> }))} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        <Kpi label="Haircut to trap in year 1" value={be(r.breakeven.trapYear1)} tone={r.breakeven.trapYear1 != null && r.breakeven.trapYear1 < 10 ? 'danger' : 'ink'} />
        <Kpi label="Haircut to Class B shortfall" value={be(r.breakeven.bLoss)} />
        <Kpi label="Haircut to Class A loss" value={be(r.breakeven.aLoss)} tone={r.breakeven.aLoss != null && r.breakeven.aLoss < 35 ? 'danger' : 'count'} />
        <Kpi label="Maximum Class A" value={fmtM(r.maxA, 0)} tone="money" hint={`DSCR ≥ ${fmtX(c.targets.dscr, 2)} · LTV ≤ ${c.targets.ltvA}% · no severe loss`} />
      </div>
      <Reviewer reviewer={reviewer}>
        <p className="m-0">Break-evens hold the base trend and apply a permanent level haircut. The sponsor's {c.scenarios[0].shock}% stress is inside normal volatility for a catalog. On the reviewer's model the offered Class A {b.scenarios.find((x) => x.id === c.targets.stressScenario).aLoss > 1000 ? 'loses money' : 'is repaid'} in the severe scenario; the maximum size that passes all three tests is {fmtM(b.maxA, 0)}.</p>
        <p className="m-0">Judgement: whether a {be(b.breakeven.aLoss)} Class A break-even is enough depends on the rating Lowell needs and its appetite for a first-time asset class. Say which you'd accept and why.</p>
      </Reviewer>
    </Exercise>
  )
}

function Findings({ c, state, update, reviewer }) {
  return (
    <Exercise n={13} title="Map each finding to a structural protection" prompt="An investor can't renegotiate the collateral, but it can change size, eligibility, reserves, conditions, and servicing. Rate each finding and choose the protection.">
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
        <p className="m-0">Cash-flow shortfalls go to size. Title and consent defects go to eligibility, or to conditions precedent when a cure is certain at closing. Structural weaknesses go to the reserve, triggers, and servicing provisions. "Reflect in spread" suits only exposures the structure can't address.</p>
      </Reviewer>
    </Exercise>
  )
}

function Review(p) {
  return <ModelReview n={14} title="Red-team the offering figures" prompt="For each area, decide whether the offering has a problem before you reveal the recomputed answer." {...p} />
}
