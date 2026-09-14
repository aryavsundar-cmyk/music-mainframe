import { Card, Tag } from '../primitives/index.js'
import { buildWorkplan } from '../../utils/labDocs.js'
import { Exercise, Reviewer, Seg, Table, ExportBar } from './LabUi.jsx'

const WEEKS = [1, 2, 3, 4, 5]

export function PlanStage({ c, state, update, reviewer }) {
  const irl = state.plan.irl
  const show = reviewer || state.plan.revealed
  const set = c.irl.filter((i) => irl[i.id]?.priority).length
  const p1 = c.irl.filter((i) => i.benchmark === 'P1')
  const p1ok = p1.filter((i) => irl[i.id]?.priority === 'P1').length
  const chosenQs = c.questions.filter((q) => state.pitch.questions.includes(q.id))

  return (
    <div className="space-y-6">
      <Card pad="lg">
        <div className="t-eyebrow text-accent mb-1">Workplan</div>
        <h3 className="t-h2 text-ink-1 m-0 mb-4">Five weeks to investment committee</h3>
        <div className="overflow-x-auto -mx-2">
          <div className="min-w-[720px] px-2">
            <div className="grid grid-cols-[220px_repeat(5,minmax(0,1fr))] gap-1 t-micro uppercase tracking-[0.08em] text-ink-3 mb-2">
              <span>Workstream</span>{WEEKS.map((w) => <span key={w} className="text-center">Week {w}</span>)}
            </div>
            {c.workstreams.map((w) => (
              <div key={w.id} className="grid grid-cols-[220px_repeat(5,minmax(0,1fr))] gap-1 items-center py-1.5 border-t border-line-1">
                <span><span className="t-small text-ink-1 block">{w.label}</span><span className="t-micro text-ink-4">{w.lead}</span></span>
                {WEEKS.map((wk) => <span key={wk} className={`h-5 rounded-sm ${wk >= w.weeks[0] && wk <= w.weeks[1] ? (w.id === 'valuation' || w.id === 'spa' ? 'bg-accent' : 'bg-secondary') : 'bg-ground-4'}`} />)}
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
          {c.workstreams.map((w) => (
            <div key={w.id} className="rounded-md border border-line-1 p-3">
              <div className="t-small text-ink-1 mb-1">{w.label}</div>
              <ul className="m-0 pl-4 t-micro text-ink-3 space-y-0.5">{w.analyses.map((a) => <li key={a}>{a}</li>)}</ul>
            </div>
          ))}
        </div>
      </Card>

      <Exercise n={5} title="Prioritise the information request list" prompt="You get one shot at the first data request. P1 means you can't start the core analysis without it; P3 means nice to have." aside={<Tag tone="neutral" mono>{set}/{c.irl.length}</Tag>}>
        <Table minWidth={820}
          columns={[{ key: 'req', label: 'Request' }, { key: 'ws', label: 'Workstream' }, { key: 'p', label: 'Priority' }, { key: 'st', label: 'Status' }]}
          rows={c.irl.map((i) => {
            const cur = irl[i.id] || {}
            const wrong = show && cur.priority && cur.priority !== i.benchmark
            return {
              key: i.id,
              req: <span><span className="t-body text-ink-1">{i.text}</span>{show && <span className={`block t-micro ${wrong ? 'text-danger' : 'text-secondary'}`}>Reviewer: {i.benchmark}</span>}</span>,
              ws: <span className="t-small text-ink-3">{c.workstreams.find((w) => w.id === i.ws)?.label}</span>,
              p: <Seg value={cur.priority} onChange={(v) => update(['plan', 'irl', i.id, 'priority'], v)} options={[['P1', 'P1'], ['P2', 'P2'], ['P3', 'P3']]} />,
              st: <Seg value={cur.status} onChange={(v) => update(['plan', 'irl', i.id, 'status'], v)} options={[['Requested', 'Req'], ['Received', 'Rec'], ['Gap', 'Gap']]} />,
            }
          })} />
        <div className="flex items-center justify-between mt-3">
          <button type="button" onClick={() => update(['plan', 'revealed'], true)} className="t-small text-secondary bg-transparent border-0 cursor-pointer px-0">Check my priorities</button>
          {show && <span className="t-small font-mono text-ink-2">{p1ok}/{p1.length} critical requests marked P1</span>}
        </div>
        <Reviewer reviewer={reviewer}>
          <p className="m-0">Everything that proves <em>cash</em> and <em>ownership</em> is P1: title-level royalty statements, bank receipts, distributor and PRO statements, chain of title, participation agreements, reversion schedule, liens, and the receivables/reserves/payables ledger. You cannot normalise earnings or build a perimeter without them.</p>
          <p className="m-0">Tax returns, the admin fee schedule, sync log, and metadata audit matter but can land in week 2. Artist pipeline is colour for the commercial view.</p>
        </Reviewer>
      </Exercise>

      <Card pad="lg">
        <div className="t-eyebrow text-ink-3 mb-2">Hypotheses to test</div>
        {chosenQs.length === 0 ? <p className="t-body text-ink-3 m-0">Pick your five questions in the Pitch stage; they carry through here and into the memo.</p> : (
          <Table minWidth={680} columns={[{ key: 'q', label: 'Question' }, { key: 'how', label: 'How we test it' }]}
            rows={chosenQs.map((q) => ({ key: q.id, q: <span className="t-body text-ink-1">{q.text}</span>, how: <span className="t-small text-ink-3">{TESTS[q.id] || 'Scope into the relevant workstream; agree evidence required with the client.'}</span> }))} />
        )}
      </Card>

      <ExportBar title="Export the workplan" build={() => buildWorkplan(c, state)} />
    </div>
  )
}

const TESTS = {
  'q-nps': 'Rebuild gross-to-net from statements; tie to bank receipts; recompute participations and fees by agreement.',
  'q-recurring': 'Bridge LTM to prior year by stream and title; license-log review for sync; streaming curves for spikes.',
  'q-title': 'Chain-of-title review against registrations; consent and reversion schedule; lien search.',
  'q-concentration': 'Title and platform concentration; top-title decay curves; playlist and territory dependency.',
  'q-closing': 'Receivables aging, reserve release pattern, payables; draft the SPA collection waterfall.',
  'q-social': 'Commercial workstream colour only.',
  'q-synergy': 'Buyer returns model, outside the standalone price.',
  'q-comps': 'Multiple cross-check after normalisation.',
  'q-payout': 'Downside sensitivity in the forecast.',
  'q-banker': 'Reconcile to our own risk build-up; don\'t anchor.',
}
