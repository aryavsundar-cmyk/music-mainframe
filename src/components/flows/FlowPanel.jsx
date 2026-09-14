import { Link } from 'react-router-dom'
import { X, ArrowRight, ArrowLeft, ChevronRight } from 'lucide-react'
import { Card, Tag, Num, FlowMark } from '../primitives/index.js'
import { edgesFor } from '../../data/flows.js'
import { getEntity } from '../../data/entities.js'

function EdgeList({ title, edges, flow, dir }) {
  if (edges.length === 0) return null
  return (
    <div>
      <div className="t-micro uppercase tracking-[0.08em] text-ink-3 mb-1.5">{title}</div>
      <ul className="m-0 p-0 list-none space-y-1.5">
        {edges.map((e, i) => {
          const otherId = dir === 'in' ? e.from : e.to
          const other = flow.nodes.find((n) => n.id === otherId)
          return (
            <li key={i} className="t-small text-ink-2 flex gap-2 items-start">
              <span className="text-ink-4 mt-[3px] shrink-0">{dir === 'in' ? <ArrowLeft size={12} aria-hidden="true" /> : <ArrowRight size={12} aria-hidden="true" />}</span>
              <span className="min-w-0">
                <span className="text-ink-1">{other?.label}</span> — {e.label}
                {e.econ && <> <Num kind={e.econ.kind} value={e.econ.value} className="t-data ml-1" /></>}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Right rail for a selected flow node: description, rights/money in and out, who plays the role, economics. */
export function FlowPanel({ flow, node, onClose, onSelect }) {
  if (!node) {
    return (
      <Card pad="lg" className="h-full">
        <FlowMark flow={flow.id} className="mb-3" />
        <p className="t-body text-ink-2 m-0">{flow.lede}</p>
        <p className="t-small text-ink-3 mt-4 mb-0">{flow.legend} Click a stage to see what flows in, what flows out, who plays the role, and the splits.</p>
        <div className="mt-5 pt-4 border-t border-line-1 space-y-1">
          <div className="t-micro uppercase tracking-[0.08em] text-ink-3 mb-1.5">Stages</div>
          {flow.nodes.map((n) => (
            <button key={n.id} type="button" onClick={() => onSelect(n.id)} className="w-full text-left t-small text-ink-2 hover:text-ink-1 bg-transparent border-0 cursor-pointer px-0 py-0.5 inline-flex items-center gap-1.5">
              <ChevronRight size={12} className="text-ink-4" aria-hidden="true" />{n.label}
            </button>
          ))}
        </div>
      </Card>
    )
  }
  const { rightsIn, rightsOut, moneyIn, moneyOut } = edgesFor(flow, node.id)
  const entities = node.entityIds.map(getEntity).filter(Boolean)
  const idx = flow.nodes.findIndex((n) => n.id === node.id)
  const prev = flow.nodes[idx - 1], next = flow.nodes[idx + 1]
  return (
    <Card pad="lg" tone={flow.id} className="h-full">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <FlowMark flow={flow.id} className="mb-2" />
          <h3 className="t-h2 text-ink-1 m-0">{node.label}</h3>
          {node.sub && <div className="t-small text-ink-3 mt-0.5">{node.sub}</div>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="p-1 rounded-sm text-ink-3 hover:text-ink-1 hover:bg-ground-3 bg-transparent border-0 cursor-pointer"><X size={16} /></button>
      </div>
      <p className="t-body text-ink-2 m-0 mb-5">{node.description}</p>

      <div className="space-y-4 mb-5">
        <EdgeList title="Rights in" edges={rightsIn} flow={flow} dir="in" />
        <EdgeList title="Rights out" edges={rightsOut} flow={flow} dir="out" />
        <EdgeList title="Money in" edges={moneyIn} flow={flow} dir="in" />
        <EdgeList title="Money out" edges={moneyOut} flow={flow} dir="out" />
      </div>

      {node.econ.length > 0 && (
        <div className="mb-5 pt-4 border-t border-line-1">
          <div className="t-micro uppercase tracking-[0.08em] text-ink-3 mb-2">Economics</div>
          <div className="space-y-2">
            {node.econ.map((x) => (
              <div key={x.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-baseline">
                <div className="min-w-0">
                  <div className="t-small text-ink-1">{x.label}{x.verify && <Tag tone="danger" className="ml-2">verify</Tag>}</div>
                  {x.note && <div className="t-micro text-ink-4">{x.note}</div>}
                </div>
                {x.kind === 'text' ? <span className="t-small text-ink-2 text-right max-w-[160px]">{x.value}</span> : <Num kind={x.kind} value={x.value} className="t-data" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {entities.length > 0 && (
        <div className="mb-5 pt-4 border-t border-line-1">
          <div className="t-micro uppercase tracking-[0.08em] text-ink-3 mb-2">Who plays this role</div>
          <div className="flex flex-wrap gap-1.5">
            {entities.map((e) => (
              <Link key={e.id} to={`/entities/${e.id}`} className="no-underline">
                <Tag tone="neutral" className="hover:border-line-3">{e.short || e.name}</Tag>
              </Link>
            ))}
          </div>
        </div>
      )}

      {node.notes.length > 0 && (
        <ul className="m-0 pl-4 t-small text-ink-3 space-y-1 mb-5">{node.notes.map((n) => <li key={n}>{n}</li>)}</ul>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-line-1">
        {prev ? <button type="button" onClick={() => onSelect(prev.id)} className="t-small text-ink-2 hover:text-ink-1 bg-transparent border-0 cursor-pointer inline-flex items-center gap-1 px-0"><ArrowLeft size={13} aria-hidden="true" />{prev.label}</button> : <span />}
        {next ? <button type="button" onClick={() => onSelect(next.id)} className="t-small text-ink-2 hover:text-ink-1 bg-transparent border-0 cursor-pointer inline-flex items-center gap-1 px-0">{next.label}<ArrowRight size={13} aria-hidden="true" /></button> : <span />}
      </div>
    </Card>
  )
}
