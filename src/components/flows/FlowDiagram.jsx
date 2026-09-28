import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flows as FLOW_TOKENS } from '../../tokens.js'

/**
 * FlowDiagram — nodes on a CSS grid, edges drawn in an SVG layer from measured node rects.
 * The rhythm comes from tokens.flows: recording = solid chain, publishing = dashed fan.
 * Money edges are ink-3, thinner, and return in the opposite direction.
 */
const GAP = 10       // px offset between the rights lane and the money lane on a node edge
const HANDLE = 0.45  // bezier handle as a fraction of the horizontal distance

function anchors(a, b, kind) {
  // a → b. Rights go left→right on the top lane; money goes right→left on the bottom lane.
  const dy = (b.cy - a.cy), dx = (b.cx - a.cx)
  const vertical = Math.abs(dy) > Math.abs(dx) * 1.2
  const lane = kind === 'money' ? GAP : -GAP
  if (vertical) {
    const down = dy > 0
    return { x1: a.cx + lane, y1: down ? a.bottom : a.top, x2: b.cx + lane, y2: down ? b.top : b.bottom, v: true }
  }
  const fwd = dx > 0
  return { x1: fwd ? a.right : a.left, y1: a.cy + lane, x2: fwd ? b.left : b.right, y2: b.cy + lane, v: false }
}

function path({ x1, y1, x2, y2, v }) {
  if (v) { const h = (y2 - y1) * HANDLE; return `M${x1},${y1} C${x1},${y1 + h} ${x2},${y2 - h} ${x2},${y2}` }
  const h = (x2 - x1) * HANDLE
  return `M${x1},${y1} C${x1 + h},${y1} ${x2 - h},${y2} ${x2},${y2}`
}

/**
 * How thick a money edge is drawn. An edge that declares a share carries it: 5% of a dollar and 55% of it are
 * different facts, and drawing them at the same weight said they were the same. Clamped at both ends so a small
 * share stays visible and a large one does not become a slab, and applied ONLY to money edges with a declared
 * share \u2014 a rights edge is a licence, which has no magnitude.
 */
const moneyWeight = (edge) => {
  const share = edge.econ?.kind === 'pct' ? edge.econ.value : null
  if (share == null) return 1.25
  return Math.max(1, Math.min(4, 1 + (share / 100) * 4))
}

export function FlowDiagram({ flow, selected, onSelect, compact = false }) {
  const ref = useRef(null)
  const [rects, setRects] = useState({})
  const tok = FLOW_TOKENS[flow.id] || FLOW_TOKENS.recording
  const color = `var(--mm-${flow.id})`

  const measure = useCallback(() => {
    const root = ref.current; if (!root) return
    const base = root.getBoundingClientRect()
    const next = {}
    root.querySelectorAll('[data-node]').forEach((el) => {
      const r = el.getBoundingClientRect()
      next[el.dataset.node] = { left: r.left - base.left, right: r.right - base.left, top: r.top - base.top, bottom: r.bottom - base.top, cx: r.left - base.left + r.width / 2, cy: r.top - base.top + r.height / 2 }
    })
    setRects(next)
  }, [])

  useLayoutEffect(measure, [measure, flow.id, compact])
  useEffect(() => {
    const ro = new ResizeObserver(measure); if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [measure])

  const related = new Set(selected ? flow.edges.filter((e) => e.from === selected || e.to === selected).flatMap((e) => [e.from, e.to]) : [])

  return (
    <div ref={ref} className="relative">
      <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
        <defs>
          <marker id={`arr-${flow.id}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0.5 L8,4 L0,7.5 Z" style={{ fill: color }} />
          </marker>
          <marker id={`arr-${flow.id}-money`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0.5 L8,4 L0,7.5 Z" style={{ fill: 'var(--mm-ink-3)' }} />
          </marker>
        </defs>
        {flow.edges.map((e, i) => {
          const a = rects[e.from], b = rects[e.to]; if (!a || !b) return null
          const money = e.kind === 'money'
          const touches = selected && (e.from === selected || e.to === selected)
          const dim = selected && !touches
          // A branch off the main line — the statutory route, the platform routes — is drawn back so the spine of
          // the flow stays readable. The data has carried `tone: 'muted'` since Sprint 2; nothing drew it until
          // the UGC and claiming edges arrived and swept across the diagram at full weight.
          const muted = e.tone === 'muted'
          return (
            <path
              key={i} d={path(anchors(a, b, e.kind))} fill="none"
              stroke={money ? 'var(--mm-ink-3)' : color}
              strokeWidth={money ? moneyWeight(e) + (touches ? 0.75 : 0) : (touches ? tok.stroke + 0.75 : tok.stroke) * (muted && !touches ? 0.6 : 1)}
              strokeDasharray={money ? '2 3' : (muted ? '3 4' : tok.dash === 'none' ? undefined : tok.dash)}
              strokeLinecap="round"
              opacity={dim ? 0.18 : touches ? 1 : muted ? 0.4 : money ? 0.7 : 1}
              markerEnd={`url(#arr-${flow.id}${money ? '-money' : ''})`}
              style={{ transition: 'opacity 160ms' }}
            />
          )
        })}
      </svg>

      <div className="relative grid" style={{ gridTemplateColumns: `repeat(${flow.cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${flow.rows}, auto)`, columnGap: compact ? 28 : 40, rowGap: compact ? 40 : 56 }}>
        {flow.nodes.map((n) => {
          const isSel = selected === n.id
          const dim = selected && !isSel && !related.has(n.id)
          const muted = n.tone === 'muted'
          return (
            <button
              key={n.id} type="button" data-node={n.id}
              onClick={() => onSelect?.(isSel ? null : n.id)}
              style={{ gridColumn: n.col, gridRow: n.row, opacity: dim ? 0.45 : 1, transition: 'opacity 160ms, border-color 120ms, background 120ms' }}
              className={[
                'relative z-10 text-left rounded-lg border cursor-pointer w-full', compact ? 'px-2.5 py-2' : 'px-3.5 py-3',
                'focus-visible:outline-2 focus-visible:outline-offset-2',
                isSel ? 'bg-ground-3 shadow-none' : 'bg-ground-1 hover:bg-ground-2',
                isSel ? (flow.id === 'publishing' ? 'border-publishing' : 'border-recording') : muted ? 'border-line-1 border-dashed' : 'border-line-2',
                compact ? 'min-h-[56px]' : 'min-h-[76px]',
              ].join(' ')}
              aria-pressed={isSel}
            >
              <div className={`${compact ? 't-small' : 't-h3'} ${muted ? 'text-ink-2' : 'text-ink-1'} leading-tight`}>{n.label}</div>
              {!compact && n.sub && <div className="t-micro text-ink-3 mt-1">{n.sub}</div>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
