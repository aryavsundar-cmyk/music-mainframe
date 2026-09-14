import { Card, Tag } from '../primitives/index.js'
import { buildWorkplan } from '../../utils/labDocs.js'
import { Exercise, Reviewer, Seg, Table, ExportBar } from './LabUi.jsx'

export function PlanStage({ c, state, update, reviewer }) {
  const irl = state.plan.irl
  const show = reviewer || state.plan.revealed
  const set = c.irl.filter((i) => irl[i.id]?.priority).length
  const p1 = c.irl.filter((i) => i.benchmark === 'P1')
  const p1ok = p1.filter((i) => irl[i.id]?.priority === 'P1').length
  const chosenQs = c.questions.filter((q) => state.pitch.questions.includes(q.id))
  const WEEKS = Array.from({ length: c.weeks }, (_, i) => i + 1)
  const cols = { gridTemplateColumns: `200px repeat(${c.weeks}, minmax(0, 1fr))` }

  return (
    <div className="space-y-6">
      <Card pad="lg">
        <div className="t-eyebrow text-accent mb-1">Workplan</div>
        <h3 className="t-h2 text-ink-1 m-0 mb-4">{c.copy.planTitle}</h3>
        <div className="overflow-x-auto -mx-2">
          <div className="min-w-[720px] px-2">
            <div className="grid gap-1 t-micro uppercase tracking-[0.08em] text-ink-3 mb-2" style={cols}>
              <span>Workstream</span>{WEEKS.map((w) => <span key={w} className="text-center">{c.weeks > 6 ? `W${w}` : `Week ${w}`}</span>)}
            </div>
            {c.workstreams.map((w) => (
              <div key={w.id} className="grid gap-1 items-center py-1.5 border-t border-line-1" style={cols}>
                <span><span className="t-small text-ink-1 block">{w.label}</span><span className="t-micro text-ink-4">{w.lead}</span></span>
                {WEEKS.map((wk) => <span key={wk} className={`h-5 rounded-sm ${wk >= w.weeks[0] && wk <= w.weeks[1] ? (c.criticalWorkstreams.includes(w.id) ? 'bg-accent' : 'bg-secondary') : 'bg-ground-4'}`} />)}
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
          {c.copy.irlReviewer.map((t) => <p key={t} className="m-0">{t}</p>)}
        </Reviewer>
      </Exercise>

      <Card pad="lg">
        <div className="t-eyebrow text-ink-3 mb-2">Hypotheses to test</div>
        {chosenQs.length === 0 ? <p className="t-body text-ink-3 m-0">Pick your five questions in the Pitch stage; they carry through here and into the memo.</p> : (
          <Table minWidth={680} columns={[{ key: 'q', label: 'Question' }, { key: 'how', label: 'How we test it' }]}
            rows={chosenQs.map((q) => ({ key: q.id, q: <span className="t-body text-ink-1">{q.text}</span>, how: <span className="t-small text-ink-3">{q.test || 'Scope into the relevant workstream; agree evidence required with the client.'}</span> }))} />
        )}
      </Card>

      <ExportBar title="Export the workplan" build={() => buildWorkplan(c, state)} />
    </div>
  )
}
