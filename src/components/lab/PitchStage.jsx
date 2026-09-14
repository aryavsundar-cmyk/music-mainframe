import { Card, Tag } from '../primitives/index.js'
import { ROLES } from '../../data/rateCard.js'
import { teamFee, buildPitchMemo } from '../../utils/labDocs.js'
import { fmtK, fmtM, fmtPct, num } from '../../utils/valuation.js'
import { Exercise, Reviewer, Seg, NumField, TextArea, Table, Money, ExportBar, Kpi } from './LabUi.jsx'

const PER_OPTS = [['in', 'In'], ['out', 'Out'], ['diligence', 'Depends']]
const PER_LABEL = { in: 'In perimeter', out: 'Out of perimeter', diligence: 'Depends on diligence / SPA' }

export function PitchStage({ c, state, update, reviewer }) {
  const p = state.pitch
  const fee = teamFee(p.team)
  const perimeterDone = c.perimeter.filter((x) => p.perimeter[x.id]).length
  const perimeterRight = c.perimeter.filter((x) => p.perimeter[x.id] === x.benchmark).length
  const qRight = p.questions.filter((id) => c.questions.find((q) => q.id === id)?.benchmark).length

  return (
    <div className="space-y-6">
      <Card pad="lg">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-8">
          <div>
            <div className="t-eyebrow text-accent mb-1">The brief</div>
            <h3 className="t-h2 text-ink-1 m-0 mb-2">{c.client.name}</h3>
            <p className="t-small text-ink-3 m-0 mb-3">{c.client.profile}</p>
            <p className="t-body text-ink-2 m-0 mb-3">{c.client.situation}</p>
            <p className="t-body text-ink-1 m-0"><span className="text-ink-3">The ask. </span>{c.client.ask}</p>
          </div>
          <div>
            <div className="t-eyebrow text-ink-3 mb-2">Transaction scope</div>
            <ul className="m-0 pl-4 t-small text-ink-2 space-y-1">{c.scope.map((x) => <li key={x}>{x}</li>)}</ul>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Kpi label="Seller ask" value={fmtM(c.sellerAsk)} tone="money" />
              <Kpi label="Reported LTM net" value="$1.50M" hint="≈ 9.3x at the ask" tone="money" />
            </div>
          </div>
        </div>
        <div className="mt-6">
          <Table minWidth={720} columns={[{ key: 'a', label: 'Attribute' }, { key: 'f', label: 'Fact pattern', className: 'font-mono t-data text-ink-1' }, { key: 'i', label: 'Implication', className: 't-small text-ink-3' }]}
            rows={c.profile.map(([a, f, i]) => ({ a: <span className="t-small text-ink-2">{a}</span>, f, i }))} />
        </div>
        <p className="t-body text-ink-1 mt-4 mb-0"><span className="t-eyebrow text-secondary mr-2">Central question</span>{c.centralQuestion}</p>
      </Card>

      <Exercise n={1} title="Frame the pitch in SCR" prompt="Write the situation, complication, and resolution you would open the pitch with. One or two sentences each; each should stand on its own.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[['s', 'Situation', 'What is true today, uncontroversially'], ['c', 'Complication', 'Why the obvious answer (pay the ask) is risky'], ['r', 'Resolution', 'What the engagement delivers, and by when']].map(([k, label, hint]) => (
            <div key={k}>
              <div className="t-small text-ink-1 mb-1">{label}</div>
              <TextArea rows={5} value={p.scr[k]} onChange={(v) => update(['pitch', 'scr', k], v)} placeholder={hint} />
              <div className="t-micro text-ink-4 mt-1">{String(p.scr[k] || '').trim().length} chars</div>
            </div>
          ))}
        </div>
        <Reviewer reviewer={reviewer} label="Reviewer example">
          {['s', 'c', 'r'].map((k) => <p key={k} className="m-0"><span className="t-eyebrow text-secondary mr-2">{{ s: 'S', c: 'C', r: 'R' }[k]}</span>{c.benchmarkPitch.scr[k]}</p>)}
          <p className="m-0 text-ink-3">Notice the complication names specific, testable risks with numbers. A complication that just says "there are risks" doesn't earn the engagement.</p>
        </Reviewer>
      </Exercise>

      <Exercise n={2} title="Set the economic perimeter" prompt="A catalog's value is the present value of the specific contractual interests transferred. Classify each item." aside={<Tag tone="neutral" mono>{perimeterDone}/{c.perimeter.length}</Tag>}>
        <div className="divide-y divide-line-1 border-y border-line-1">
          {c.perimeter.map((x) => {
            const pick = p.perimeter[x.id]
            const show = reviewer || p.revealed?.perimeter
            return (
              <div key={x.id} className="py-2.5 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-2 items-start">
                <div>
                  <div className="t-body text-ink-1">{x.text}</div>
                  {show && pick && <div className={`t-small mt-1 ${pick === x.benchmark ? 'text-secondary' : 'text-danger'}`}>{pick === x.benchmark ? '✓ ' : `✗ Reviewer: ${PER_LABEL[x.benchmark]}. `}{x.why}</div>}
                  {show && !pick && <div className="t-small mt-1 text-ink-3">Reviewer: {PER_LABEL[x.benchmark]}. {x.why}</div>}
                </div>
                <Seg value={pick} onChange={(v) => update(['pitch', 'perimeter', x.id], v)} options={PER_OPTS} />
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-between mt-3">
          <button type="button" onClick={() => update(['pitch', 'revealed', 'perimeter'], true)} className="t-small text-secondary bg-transparent border-0 cursor-pointer px-0">Check my answers</button>
          {(reviewer || p.revealed?.perimeter) && <span className="t-small text-ink-2 font-mono">{perimeterRight}/{c.perimeter.length} match the reviewer</span>}
        </div>
      </Exercise>

      <Exercise n={3} title="Pick the five questions that decide the price" prompt="A pitch that answers everything answers nothing. Choose the five questions the engagement must answer." aside={<Tag tone="neutral" mono>{p.questions.length}/5</Tag>}>
        <div className="space-y-1.5">
          {c.questions.map((q) => {
            const on = p.questions.includes(q.id)
            const show = reviewer || p.revealed?.questions
            return (
              <label key={q.id} className={['flex items-start gap-3 rounded-md border px-3 py-2 cursor-pointer', on ? 'border-line-3 bg-ground-2' : 'border-line-1 hover:bg-ground-2'].join(' ')}>
                <input type="checkbox" checked={on} className="mt-1 accent-[var(--mm-accent)]" onChange={() => update(['pitch', 'questions'], on ? p.questions.filter((x) => x !== q.id) : p.questions.length < 5 ? [...p.questions, q.id] : p.questions)} />
                <span className="min-w-0">
                  <span className="t-body text-ink-1">{q.text}</span>
                  {show && <span className={`block t-small mt-0.5 ${q.benchmark ? 'text-secondary' : 'text-ink-3'}`}>{q.benchmark ? '★ Reviewer top five' : q.why}</span>}
                </span>
              </label>
            )
          })}
        </div>
        <div className="flex items-center justify-between mt-3">
          <button type="button" onClick={() => update(['pitch', 'revealed', 'questions'], true)} className="t-small text-secondary bg-transparent border-0 cursor-pointer px-0">Check my picks</button>
          {(reviewer || p.revealed?.questions) && <span className="t-small text-ink-2 font-mono">{qRight}/5 match the reviewer</span>}
        </div>
      </Exercise>

      <Exercise n={4} title="Scope and price the engagement" prompt="Five workstreams over five weeks. Staff it, then sanity-check the fee against the deal.">
        <Table minWidth={760} columns={[{ key: 'w', label: 'Workstream' }, { key: 'l', label: 'Lead' }, { key: 'wk', label: 'Weeks', align: 'center' }, { key: 'a', label: 'Core analyses' }]}
          rows={c.workstreams.map((w) => ({ key: w.id, w: <span className="t-body text-ink-1">{w.label}</span>, l: <span className="t-small text-ink-2">{w.lead}</span>, wk: <span className="font-mono t-data">{w.weeks[0]}–{w.weeks[1]}</span>, a: <span className="t-small text-ink-3">{w.analyses.slice(0, 3).join(' · ')}</span> }))} />
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6 mt-5 items-start">
          <Table minWidth={420} columns={[{ key: 'r', label: 'Role' }, { key: 'd', label: 'Days', align: 'right' }, { key: 'rate', label: 'Day rate', align: 'right' }, { key: 'f', label: 'Fees', align: 'right' }]}
            rows={ROLES.map((r) => ({ key: r.id, r: <span className="t-small text-ink-2">{r.label}</span>, d: <NumField width="w-16" value={p.team[r.id]} onChange={(v) => update(['pitch', 'team', r.id], v)} ariaLabel={`${r.label} days`} />, rate: <span className="t-data text-ink-3">{fmtK(r.dayRate)}</span>, f: <Money>{fmtK(num(p.team[r.id]) * r.dayRate)}</Money> }))}
            foot={{ r: 'Total', d: <span className="font-mono">{fee.days}</span>, rate: '', f: <Money>{fmtK(fee.fees)}</Money> }} />
          <div className="space-y-4">
            <Kpi label="Indicative fees" value={fmtK(fee.fees)} tone="money" hint="rates are placeholders" />
            <Kpi label="Fee as % of ask" value={fmtPct(fee.fees / c.sellerAsk)} />
            <Kpi label="Fee per diligence week" value={fmtK(fee.fees / 5)} />
          </div>
        </div>
        <Reviewer reviewer={reviewer}>
          <p className="m-0">Default staffing lands around {fmtK(teamFee(c.teamDefaults).fees)}, about {fmtPct(teamFee(c.teamDefaults).fees / c.sellerAsk)} of the ask. For a $10–14M catalog, a buyer will push back hard on anything above roughly 3–4% of deal value, so expect to defend scope: legal chain-of-title review often sits with counsel, which lets you trim Senior Director days.</p>
          <p className="m-0">Front-load Analyst and Manager days in weeks 1–2 (data reconciliation), and hold MD time for the IC readout and SPA protection in week 5.</p>
        </Reviewer>
      </Exercise>

      <ExportBar title="Export the pitch memo" build={() => buildPitchMemo(c, state)} />
    </div>
  )
}
