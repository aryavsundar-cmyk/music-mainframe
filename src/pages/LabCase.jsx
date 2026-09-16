import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, RotateCcw, GraduationCap, BookOpenCheck } from 'lucide-react'
import { PageHeader, Card, Button } from '../components/primitives/index.js'
import { CASES } from '../data/cases/index.js'
import { useLabState } from '../hooks/useLabState.js'
import { useUrlFilters } from '../hooks/useUrlFilters.js'
import { stagesFor, progress } from '../utils/labState.js'
import { engineFor } from '../utils/labEngines.js'
import { PitchStage } from '../components/lab/PitchStage.jsx'
import { PlanStage } from '../components/lab/PlanStage.jsx'
import { ExecuteStage } from '../components/lab/ExecuteStage.jsx'
import { DeliverStage } from '../components/lab/DeliverStage.jsx'
import { PmiExecuteStage } from '../components/lab/PmiExecuteStage.jsx'
import { PmiDeliverStage } from '../components/lab/PmiDeliverStage.jsx'
import { AbsExecuteStage } from '../components/lab/AbsExecuteStage.jsx'
import { AbsDeliverStage } from '../components/lab/AbsDeliverStage.jsx'
import { CarveExecuteStage } from '../components/lab/CarveExecuteStage.jsx'
import { CarveDeliverStage } from '../components/lab/CarveDeliverStage.jsx'

export default function LabCase() {
  const { caseId } = useParams()
  const c = CASES[caseId]
  if (!c) {
    return (<><PageHeader eyebrow="Valuation lab" tone="muted" title="No such case." lede={`Nothing is filed under "${caseId}".`} /><Link to="/lab" className="t-small text-accent no-underline inline-flex items-center gap-1"><ArrowLeft size={14} aria-hidden="true" /> All cases</Link></>)
  }
  return <CaseWorkspace key={c.id} c={c} />
}

function CaseWorkspace({ c }) {
  const { state, update, reset, loadBenchmark } = useLabState(c)
  const { params, set } = useUrlFilters(['stage', 'step'])
  const STAGES = useMemo(() => stagesFor(c), [c])
  const engine = useMemo(() => engineFor(c), [c])
  const stage = STAGES.some((s) => s.id === params.stage) ? params.stage : 'pitch'
  const r = useMemo(() => engine.compute(state.exec), [engine, state.exec])
  const b = useMemo(() => engine.benchmark(), [engine])
  const draft = useMemo(() => engine.draft(), [engine])
  const checks = useMemo(() => engine.checks(), [engine])
  const Execute = { pmi: PmiExecuteStage, abs: AbsExecuteStage, carveout: CarveExecuteStage }[c.kind] || ExecuteStage
  const Deliver = { pmi: PmiDeliverStage, abs: AbsDeliverStage, carveout: CarveDeliverStage }[c.kind] || DeliverStage
  const pr = progress(c, state)
  const reviewer = !!state.ui.reviewer
  const props = { c, state, update, reviewer, r, b, draft, checks }

  const goStage = (id) => { set({ stage: id, step: '' }); window.scrollTo({ top: 0 }) }

  return (
    <>
      <Link to="/lab" className="t-small text-ink-3 no-underline inline-flex items-center gap-1 hover:text-ink-1 mb-4"><ArrowLeft size={14} aria-hidden="true" /> Valuation lab</Link>
      <PageHeader eyebrow={`Mock engagement · ${c.engagementLabel}`} title={c.title} lede={c.tagline}
        actions={<div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Button size="sm" variant={reviewer ? 'primary' : 'secondary'} icon={GraduationCap} onClick={() => update(['ui', 'reviewer'], !reviewer)}>{reviewer ? 'Reviewer mode on' : 'Reviewer mode'}</Button>
            <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => { if (window.confirm('Reset this engagement to the draft case? Your work in this browser will be cleared.')) reset() }}>Reset</Button>
          </div>
          <button type="button" onClick={() => { if (window.confirm('Load the reviewer\'s complete answers? This replaces your work in this browser.')) loadBenchmark() }} className="t-micro text-ink-3 hover:text-ink-1 bg-transparent border-0 cursor-pointer inline-flex items-center gap-1"><BookOpenCheck size={12} aria-hidden="true" />Load reviewer answers</button>
        </div>} />

      <div className="-mt-6 mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <p className="t-micro text-ink-4 m-0 max-w-3xl">{c.disclaimer}</p>
        <Link to="/lab/glossary" className="t-small text-secondary no-underline whitespace-nowrap">Finance, explained →</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8" role="tablist" aria-label="Engagement stages">
        {STAGES.map((s, i) => (
          <button key={s.id} type="button" role="tab" aria-selected={stage === s.id} onClick={() => goStage(s.id)}
            className={['text-left rounded-md border px-3 py-2.5 cursor-pointer transition-colors', stage === s.id ? 'bg-ground-3 border-accent-line' : 'bg-ground-1 border-line-1 hover:bg-ground-2'].join(' ')}>
            <div className="flex items-baseline justify-between gap-2"><span className="t-small text-ink-1"><span className="font-mono text-ink-4 mr-1.5">{i + 1}</span>{s.label}</span><span className="t-micro font-mono text-ink-4">{Math.round(pr[s.id] * 100)}%</span></div>
            <div className="t-micro text-ink-4 mt-0.5 hidden md:block">{s.blurb}</div>
            <div className="h-1 rounded-sm bg-ground-4 overflow-hidden mt-2"><div className="h-full bg-accent" style={{ width: `${Math.round(pr[s.id] * 100)}%` }} /></div>
          </button>
        ))}
      </div>

      {stage === 'pitch' && <PitchStage {...props} />}
      {stage === 'plan' && <PlanStage {...props} />}
      {stage === 'execute' && <Execute {...props} step={params.step} onStep={(id) => { set({ step: id }); window.scrollTo({ top: 0 }) }} />}
      {stage === 'deliver' && <Deliver {...props} />}

      <Card pad="md" className="mt-8">
        <div className="flex items-center justify-between gap-4">
          {STAGES.findIndex((s) => s.id === stage) > 0 ? <button type="button" onClick={() => goStage(STAGES[STAGES.findIndex((s) => s.id === stage) - 1].id)} className="t-small text-ink-2 bg-transparent border-0 cursor-pointer px-0">← {STAGES[STAGES.findIndex((s) => s.id === stage) - 1].label}</button> : <span />}
          {STAGES.findIndex((s) => s.id === stage) < STAGES.length - 1 ? <button type="button" onClick={() => goStage(STAGES[STAGES.findIndex((s) => s.id === stage) + 1].id)} className="t-small text-accent bg-transparent border-0 cursor-pointer px-0">Next stage: {STAGES[STAGES.findIndex((s) => s.id === stage) + 1].label} →</button> : <span className="t-small text-ink-3">Final stage</span>}
        </div>
      </Card>
    </>
  )
}
