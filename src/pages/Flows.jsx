import { useEffect, useRef } from 'react'
import { NavLink, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader, Card, FlowMark, Tag } from '../components/primitives/index.js'
import { FlowDiagram } from '../components/flows/FlowDiagram.jsx'
import { FlowPanel } from '../components/flows/FlowPanel.jsx'
import { FLOWS, getFlowNode } from '../data/flows.js'
import { PageExport } from '../components/export/PageExport.jsx'
import { buildPageDoc } from '../utils/pageDocs.js'

const TABS = [
  { to: '/flows', flow: null, label: 'Both', end: true },
  { to: '/flows/recording', flow: 'recording', label: 'Recording income' },
  { to: '/flows/publishing', flow: 'publishing', label: 'Publishing income' },
]

/** One flow, full size, with the detail rail. Selected stage lives in ?node= so a view is shareable. */
function FlowView({ flowId }) {
  const flow = FLOWS[flowId]
  const [sp, setSp] = useSearchParams()
  const selected = sp.get('node') && getFlowNode(flowId, sp.get('node')) ? sp.get('node') : null
  const select = (id) => { const n = new URLSearchParams(sp); id ? n.set('node', id) : n.delete('node'); setSp(n, { replace: true }) }
  const node = selected ? getFlowNode(flowId, selected) : null
  const panelRef = useRef(null)
  // Below xl the rail stacks under the diagram; bring it into view when a stage is picked.
  useEffect(() => {
    if (selected && window.innerWidth < 1280) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selected])
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-8 items-start">
      <div className="min-w-0">
        <div className="flex items-center justify-between gap-4 mb-5">
          <FlowMark flow={flowId} />
          <span className="t-small text-ink-3">{flow.legend}</span>
        </div>
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[720px]">
            <FlowDiagram flow={flow} selected={selected} onSelect={select} />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1 t-micro text-ink-4">
          <span>as of {flow.asOf}</span>
          {flow.sources.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="text-ink-3 no-underline hover:text-accent">{s.label}</a>)}
        </div>
      </div>
      <div ref={panelRef} className="xl:sticky xl:top-6 scroll-mt-6">
        <FlowPanel flow={flow} node={node} onClose={() => select(null)} onSelect={select} />
        <PageExport className="mt-6" label="Export this flow" build={() => flowDoc(flow, node)} />
      </div>
    </div>
  )
}

/**
 * A diagram cannot be a table, so the export carries what the diagram encodes: the stages in order, what
 * happens at each, and the economics attached to it. A selected stage leads, because that is what the reader
 * was looking at when they pressed the button.
 */
function flowDoc(flow, node) {
  const econLine = (n) => (n.econ || []).map((e) => `${e.label} ${e.kind === 'pct' ? `${e.value}%` : e.value}${e.verify ? ' (unverified)' : ''}`).join(' · ')
  return buildPageDoc({
    slug: `flow-${flow.id}`,
    title: `${flow.label || flow.id} flow`,
    eyebrow: 'Structure · how the money moves',
    lede: flow.lede,
    filters: node ? [{ label: 'Stage selected', value: node.label }] : [],
    sort: 'In flow order, left to right',
    stats: [{ label: 'Stages', value: String(flow.nodes.length) }, { label: 'Shape', value: flow.shape || '' }, { label: 'As of', value: flow.asOf || '' }],
    columns: ['Stage', 'Role', 'What happens', 'Economics on record'],
    rows: flow.nodes.map((n) => [n.label, n.sub || '', n.description || '', econLine(n)]),
    notes: [flow.legend, node ? `${node.label}: ${node.description}` : ''].filter(Boolean),
    citations: { items: (flow.sources || []).map((s) => ({ label: s.label, url: s.url })), source: 'flow' },
    asOf: flow.asOf,
  })
}

/** Overview: both flows compact, stacked, so the different rhythm reads at a glance. Click → full view. */
function Overview() {
  const navigate = useNavigate()
  return (
    <div className="space-y-6">
      {Object.values(FLOWS).map((flow) => (
        <Card key={flow.id} tone={flow.id} pad="lg">
          <div className="flex items-start justify-between gap-6 mb-5">
            <div className="max-w-2xl">
              <FlowMark flow={flow.id} className="mb-2" />
              <p className="t-body text-ink-2 m-0">{flow.lede}</p>
            </div>
            <Tag tone="neutral" mono>{flow.shape.toUpperCase()}</Tag>
          </div>
          <div className="overflow-x-auto pb-1">
            <div className="min-w-[700px]">
              <FlowDiagram flow={flow} compact selected={null} onSelect={(id) => navigate(`/flows/${flow.id}${id ? `?node=${id}` : ''}`)} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

export default function Flows() {
  return (
    <>
      <PageHeader
        eyebrow="Structure · two rights domains"
        title="Flows"
        lede="Recording and publishing are structurally different. The master runs down a chain and the money runs back up it. The composition fans out to three collection routes and dozens of licensees, and the money collects back in."
      />
      <nav className="flex gap-1 mb-6 border-b border-line-1">
        {TABS.map((t) => (
          <NavLink
            key={t.to} to={t.to} end={t.end}
            className={({ isActive }) => [
              'px-3 py-2 -mb-px t-small no-underline border-b-2 transition-colors duration-150',
              isActive ? 'text-ink-1' : 'text-ink-3 border-transparent hover:text-ink-1',
            ].join(' ')}
            style={({ isActive }) => (isActive ? { borderBottomColor: t.flow ? `var(--mm-${t.flow})` : 'var(--mm-ink-1)' } : undefined)}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="recording" element={<FlowView flowId="recording" />} />
        <Route path="publishing" element={<FlowView flowId="publishing" />} />
      </Routes>
    </>
  )
}
