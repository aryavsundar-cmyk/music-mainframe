import { NavLink, Route, Routes } from 'react-router-dom'
import { PageHeader, Card, FlowMark, Tag } from '../components/primitives/index.js'

const TABS = [
  { to: '/flows/recording', flow: 'recording', label: 'Recording income' },
  { to: '/flows/publishing', flow: 'publishing', label: 'Publishing income' },
]

const CHAIN = {
  recording: ['Master owner (label)', 'Distributor', 'DSP', 'Consumer', '↩ payout to label → artist'],
  publishing: ['Composition (writer)', 'Publisher / admin', 'PRO · MLC · MRO', 'DSP · venue · broadcaster', '↩ payout to publisher → songwriter'],
}

function FlowStub({ flow }) {
  const tone = flow
  return (
    <Card tone={tone} pad="lg" className="max-w-3xl">
      <div className="flex items-center justify-between gap-4 mb-4">
        <FlowMark flow={flow} />
        <Tag tone="neutral" mono>SPRINT 2</Tag>
      </div>
      <ol className="m-0 pl-5 t-body text-ink-2 space-y-1.5">
        {CHAIN[flow].map((s) => <li key={s}>{s}</li>)}
      </ol>
      <p className="t-small text-ink-3 mt-5 mb-0">
        Interactive diagram lands in Sprint 2: click a node → detail panel (DetailPanel pattern from the ecosystem sibling).
        {flow === 'recording' ? ' Recording is drawn as a linear chain.' : ' Publishing is drawn as a fan-out that collects back in.'}
      </p>
    </Card>
  )
}

export default function Flows() {
  return (
    <>
      <PageHeader
        eyebrow="Structure · two rights domains"
        title="Flows"
        lede="Recording and publishing are structurally different. They get different diagrams, not the same diagram in two colours."
      />
      <nav className="flex gap-1 mb-6 border-b border-line-1">
        {TABS.map((t) => (
          <NavLink
            key={t.to} to={t.to}
            className={({ isActive }) => [
              'px-3 py-2 -mb-px t-small no-underline border-b-2 transition-colors duration-150',
              isActive ? 'text-ink-1 border-current' : 'text-ink-3 border-transparent hover:text-ink-1',
            ].join(' ')}
            style={({ isActive }) => (isActive ? { borderBottomColor: `var(--mm-${t.flow})` } : undefined)}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FlowStub flow="recording" />
            <FlowStub flow="publishing" />
          </div>
        } />
        <Route path="recording" element={<FlowStub flow="recording" />} />
        <Route path="publishing" element={<FlowStub flow="publishing" />} />
      </Routes>
    </>
  )
}
