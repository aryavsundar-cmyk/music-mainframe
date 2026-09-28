import { useEffect, useRef } from 'react'
import { NavLink, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader, Card, FlowMark, Tag, SideScroller, Segmented, Bar, DataTable, Th, Caveat } from '../components/primitives/index.js'
import { FlowDiagram } from '../components/flows/FlowDiagram.jsx'
import { FlowPanel } from '../components/flows/FlowPanel.jsx'
import { Waterfall } from '../components/flows/Waterfall.jsx'
import { FLOWS, getFlowNode } from '../data/flows.js'
import { scenariosForFlow, getScenario } from '../data/scenarios.js'
import { buildWaterfall, landingTable } from '../utils/waterfall.js'
import { LIMITS } from '../data/limits.js'
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
  const diagram = useRef(null)
  // Which money route is being divided. Lives in ?money= alongside ?node=, so a waterfall is as shareable as a
  // stage — the two are independent: a reader can look at the mechanical stage while the sync dollar is on screen.
  const routes = scenariosForFlow(flowId)
  const money = getScenario(sp.get('money')) && routes.includes(sp.get('money')) ? sp.get('money') : routes[0]
  const setMoney = (id) => { const n = new URLSearchParams(sp); n.set('money', id); setSp(n, { replace: true }) }
  const waterfall = buildWaterfall(money)
  // A step can point at a stage in the OTHER domain — that is the whole point of a scenario — so selecting one
  // has to be able to change tab, not just the highlighted node.
  const navigate = useNavigate()
  const goToStage = (ref) => {
    if (ref.flow === flowId) select(ref.id)
    else navigate(`/flows/${ref.flow}?node=${ref.id}&money=${money}`)
  }
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
        {/* The diagram is 720px wide inside a column that is often narrower, and the scrollbar sits below the whole
            thing — so without this a reader never learns there is more to the right. */}
        <SideScroller target={diagram} label="Scroll the flow sideways" step={240} sticky={false} />
        <div ref={diagram} className="overflow-x-auto pb-2" role="region" aria-label={`${flow.title} — scroll sideways for the rest of the flow`} tabIndex={0}>
          <div className="min-w-[720px]">
            <FlowDiagram flow={flow} selected={selected} onSelect={select} />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1 t-micro text-ink-4">
          <span>as of {flow.asOf}</span>
          {flow.sources.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="text-ink-3 no-underline hover:text-accent">{s.label}</a>)}
        </div>

        {routes.length > 0 && (
          <div className="mt-10 pt-8 border-t border-line-1">
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
              <div>
                <div className="t-eyebrow text-ink-3 mb-1">The money, by route</div>
                <p className="t-small text-ink-3 m-0 max-w-2xl">The diagram above is the plumbing. These are the ways money actually enters, and each one divides differently — so the route is the question, not the rights domain.</p>
              </div>
              <Segmented label="Money route" options={routes.map((id) => ({ id, label: getScenario(id).short }))} value={money} onChange={setMoney} />
            </div>
            <Waterfall waterfall={waterfall} onSelectNode={goToStage} />
            {waterfall?.sources?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 t-micro text-ink-4">
                {waterfall.sources.map((x) => <a key={x.url} href={x.url} target="_blank" rel="noreferrer" className="text-ink-3 no-underline hover:text-accent">{x.label}</a>)}
              </div>
            )}
          </div>
        )}
      </div>
      <div ref={panelRef} className="xl:sticky xl:top-6 scroll-mt-6">
        <FlowPanel flow={flow} node={node} onClose={() => select(null)} onSelect={select} />
        <PageExport className="mt-6" label="Export this flow" build={() => flowDoc(flow, node, waterfall)} />
      </div>
    </div>
  )
}

/**
 * A diagram cannot be a table, so the export carries what the diagram encodes: the stages in order, what
 * happens at each, and the economics attached to it. A selected stage leads, because that is what the reader
 * was looking at when they pressed the button.
 */
function flowDoc(flow, node, waterfall) {
  const econLine = (n) => (n.econ || []).map((e) => `${e.label} ${e.kind === 'pct' ? `${e.value}%` : e.value}${e.verify ? ' (unverified)' : ''}`).join(' · ')
  // The waterfall travels as a second table, in the same indented order the page draws it, with the basis of
  // every figure beside it — including the steps that have no figure, which are the point of that column.
  const money = waterfall ? {
    kind: 'table',
    columns: ['Step', `Share of ${waterfall.scenario.unit}`, 'On what basis'],
    rows: waterfall.rows.map((r) => [
      `${'— '.repeat(r.depth)}${r.label}${r.sub ? ` (${r.sub})` : ''}`,
      r.state === 'undisclosed' ? 'not disclosed'
        : r.state === 'split-unknown' ? 'share not published'
        : r.relative ? `${(r.share * 100).toFixed(1)}% of the route`
        : `${(r.share * 100).toFixed(1)}\u00a2${r.low != null && r.high != null && r.low !== r.high ? ` (${(r.low * 100).toFixed(1)}\u2013${(r.high * 100).toFixed(1)}\u00a2)` : ''}`,
      r.why || r.rate?.note || (r.rest ? 'the remainder of the line above' : ''),
    ]),
  } : null
  return buildPageDoc({
    slug: `flow-${flow.id}`,
    title: `${flow.label || flow.id} flow`,
    eyebrow: 'Structure · how the money moves',
    lede: flow.lede,
    filters: [waterfall ? { label: 'Money route', value: waterfall.scenario.label } : null, node ? { label: 'Stage selected', value: node.label } : null].filter(Boolean),
    sort: 'In flow order, left to right',
    stats: [{ label: 'Stages', value: String(flow.nodes.length) }, { label: 'Shape', value: flow.shape || '' }, { label: 'As of', value: flow.asOf || '' }],
    columns: ['Stage', 'Role', 'What happens', 'Economics on record'],
    rows: flow.nodes.map((n) => [n.label, n.sub || '', n.description || '', econLine(n)]),
    extra: money ? [{
      eyebrow: 'Economics · one money route',
      title: `Where the dollar goes — ${waterfall.scenario.label}`,
      blocks: [{ kind: 'paragraph', text: waterfall.scenario.lede }, money, waterfall.scenario.note ? { kind: 'note', text: waterfall.scenario.note } : null].filter(Boolean),
    }] : [],
    notes: [
      flow.legend,
      node ? `${node.label}: ${node.description}` : '',
      waterfall?.scenario.unitNote || '',
      waterfall?.undisclosed.length ? `${waterfall.undisclosed.length} step${waterfall.undisclosed.length === 1 ? '' : 's'} on this route have no published figure and are marked as such rather than estimated.` : '',
    ].filter(Boolean),
    limits: waterfall ? ['flow'] : [],
    citations: { items: [...(flow.sources || []), ...(waterfall?.sources || [])].map((s) => ({ label: s.label, url: s.url })), source: 'flow' },
    asOf: flow.asOf,
  })
}

const cents = (v) => `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}\u00A2`

/**
 * Where a dollar lands on every route at once — the one view that makes the routes comparable, and the reason
 * scenarios were worth building. A domain a route never touches shows a dash, not a zero: a live performance
 * pays the composition and pays the recording nothing, and those are different statements from "0%".
 */
function LandingTable() {
  const rows = landingTable()
  const cell = (v, tone, nothing) => (v == null
    ? (nothing
        ? <span className="t-small text-ink-3" title={nothing}>nothing</span>
        : <span className="text-ink-4" title="No figure on record for this route.">—</span>)
    : <span className="inline-flex flex-col items-end gap-1 w-full">
        <span className="t-data text-ink-1">{cents(v)}</span>
        <Bar share={v} tone={tone} height="h-1.5" className="w-full" label={`${cents(v)} in the dollar`} />
      </span>)
  return (
    <Card pad="lg">
      <div className="mb-4 max-w-2xl">
        <div className="t-eyebrow text-ink-3 mb-1">Where the dollar lands, by route</div>
        <p className="t-small text-ink-2 m-0">Each row is one dollar of a different thing, so the columns compare shape rather than size — a dollar of box office and a dollar of streaming revenue are not the same dollar. What they do compare is who is on the other end of it. <span className="text-ink-3">“Nothing” means the route genuinely pays that side nothing; a dash means this app holds no figure.</span></p>
      </div>
      <DataTable minWidth={720} caption="For each money route, the share of one dollar reaching the recording side, the composition side, and everyone else.">
        <thead>
          <tr>
            <Th>Route</Th><Th>One dollar of</Th>
            <Th align="right">Recording</Th><Th align="right">Composition</Th><Th align="right">Neither</Th><Th align="right">Not disclosed</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line-1 last:border-0">
              <td className="py-2 pr-3 t-small text-ink-1">{r.label}</td>
              <td className="py-2 px-3 t-micro text-ink-3">{r.unit.replace('one dollar of ', '')}</td>
              <td className="py-2 px-3 text-right w-[15%]">{cell(r.recording, 'recording', r.paysNothing.recording)}</td>
              <td className="py-2 px-3 text-right w-[15%]">{cell(r.publishing, 'publishing', r.paysNothing.publishing)}</td>
              <td className="py-2 px-3 text-right w-[15%]">{cell(r.other, 'ink')}</td>
              <td className="py-2 pl-3 text-right t-small text-ink-3">{r.undisclosed ? `${r.undisclosed} step${r.undisclosed === 1 ? '' : 's'}` : <span className="text-ink-4">none</span>}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      <Caveat className="mt-3" more={<>{LIMITS.flow.detail} {LIMITS.flow.enforced}</>}>{LIMITS.flow.claim}</Caveat>
    </Card>
  )
}

/** Overview: both flows compact, stacked, so the different rhythm reads at a glance. Click → full view. */
function Overview() {
  const navigate = useNavigate()
  return (
    <div className="space-y-6">
      <LandingTable />
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
