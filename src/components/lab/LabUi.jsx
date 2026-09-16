import { useState } from 'react'
import { ExportBar } from '../export/ExportBar.jsx'
import { ChevronDown, GraduationCap, Check, AlertTriangle } from 'lucide-react'
import { Card, Tag, Eyebrow } from '../primitives/index.js'

/** Exercise — a numbered task card: what to do, the working area, and optional reviewer notes. */
export function Exercise({ n, title, prompt, children, aside }) {
  return (
    <Card pad="lg">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <Eyebrow tone="accent" className="mb-1">Exercise {n}</Eyebrow>
          <h3 className="t-h2 text-ink-1 m-0">{title}</h3>
          {prompt && <p className="t-body text-ink-2 mt-2 mb-0 max-w-3xl">{prompt}</p>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  )
}

/** Reviewer — collapsible director's notes. Open by default in reviewer mode. */
export function Reviewer({ reviewer, label = 'Reviewer notes', children, onOpen }) {
  const [open, setOpen] = useState(false)
  const shown = open || reviewer
  return (
    <div className="mt-4 border-t border-line-1 pt-3">
      <button type="button" onClick={() => { setOpen((o) => !o); if (!open) onOpen?.() }} className="inline-flex items-center gap-1.5 t-small text-secondary bg-transparent border-0 cursor-pointer px-0" aria-expanded={shown}>
        <GraduationCap size={14} aria-hidden="true" />{label}<ChevronDown size={13} className={`transition-transform ${shown ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {shown && <div className="mt-2 rounded-md border border-secondary-line bg-secondary-soft px-4 py-3 t-small text-ink-1 space-y-2">{children}</div>}
    </div>
  )
}

/** Seg — segmented single choice. options: [[value, label, tone?]] */
export function Seg({ value, onChange, options, size = 'sm' }) {
  return (
    <div className="inline-flex rounded-md border border-line-2 overflow-hidden">
      {options.map(([v, label]) => (
        <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={value === v}
          className={['border-0 cursor-pointer whitespace-nowrap', size === 'sm' ? 't-micro px-2 py-1' : 't-small px-3 py-1.5', value === v ? 'bg-ground-4 text-ink-1' : 'bg-transparent text-ink-3 hover:bg-ground-2 hover:text-ink-1'].join(' ')}>
          {label}
        </button>
      ))}
    </div>
  )
}

export function NumField({ value, onChange, suffix, prefix, width = 'w-24', align = 'right', ariaLabel }) {
  return (
    <span className="inline-flex items-center gap-1">
      {prefix && <span className="t-micro text-ink-4">{prefix}</span>}
      <input type="text" inputMode="decimal" aria-label={ariaLabel} value={value ?? ''} onChange={(e) => onChange(e.target.value)}
        className={`${width} bg-ground-1 border border-line-2 rounded-sm h-7 px-1.5 t-data text-ink-1 focus:border-accent outline-none ${align === 'right' ? 'text-right' : ''}`} />
      {suffix && <span className="t-micro text-ink-4">{suffix}</span>}
    </span>
  )
}

export function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="w-full bg-ground-1 border border-line-2 rounded-md px-3 py-2 t-body text-ink-1 placeholder:text-ink-4 focus:border-accent outline-none resize-y" />
}

/** Table — dense bordered table. columns: [{ key, label, align, className }]; rows: objects; foot: object. */
export function Table({ columns, rows, foot, minWidth = 640, rowClass }) {
  const th = 'text-left t-micro uppercase tracking-[0.08em] text-ink-3 font-medium py-2 px-2.5 border-b border-line-2 whitespace-nowrap'
  const td = 'py-2 px-2.5 border-b border-line-1 align-top'
  const al = (c) => (c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : '')
  return (
    <div className="overflow-x-auto -mx-2.5">
      <table className="w-full border-collapse" style={{ minWidth }}>
        <thead><tr>{columns.map((c) => <th key={c.key} className={`${th} ${al(c)}`}>{c.label}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={r.key ?? i} className={rowClass?.(r) || ''}>{columns.map((c) => <td key={c.key} className={`${td} ${al(c)} ${c.className || ''}`}>{r[c.key]}</td>)}</tr>)}</tbody>
        {foot && <tfoot><tr>{columns.map((c) => <td key={c.key} className={`py-2 px-2.5 border-t border-line-3 ${al(c)} ${c.className || ''} font-medium`}>{foot[c.key]}</td>)}</tr></tfoot>}
      </table>
    </div>
  )
}

export const Money = ({ v, children, className = '' }) => <span className={`font-mono tabular text-money whitespace-nowrap ${className}`}>{children ?? v}</span>
export const Figure = ({ children, className = '' }) => <span className={`font-mono tabular whitespace-nowrap ${className}`}>{children}</span>

export function Verdict({ ok, children }) {
  return <span className={`inline-flex items-center gap-1 t-small ${ok ? 'text-secondary' : 'text-danger'}`}>{ok ? <Check size={13} aria-hidden="true" /> : <AlertTriangle size={13} aria-hidden="true" />}{children}</span>
}

export function Kpi({ label, value, hint, tone = 'ink' }) {
  const cls = tone === 'money' ? 'text-money' : tone === 'count' ? 'text-count' : tone === 'danger' ? 'text-danger' : 'text-ink-1'
  return (
    <div className="min-w-0">
      <div className="t-micro uppercase tracking-[0.08em] text-ink-3">{label}</div>
      <div className={`t-stat ${cls} whitespace-nowrap`}>{value}</div>
      {hint && <div className="t-micro text-ink-4">{hint}</div>}
    </div>
  )
}

export function StatusTag({ kind }) {
  return kind === 'error' ? <Tag tone="danger">error</Tag> : <Tag tone="secondary">judgement</Tag>
}

/** ModelReview — red-team checklist: call each area before revealing the recomputed answer. */
export function ModelReview({ n, c, state, update, checks, title = 'Red-team the draft', prompt = 'A reviewing director recomputes what they inherit. For each area, decide whether the draft has a problem before you reveal the answer.' }) {
  const found = c.checks.filter((k) => state.exec.checks[k.id]?.flaggedBeforeReveal && state.exec.checks[k.id]?.verdict !== 'revealed').length
  return (
    <Exercise n={n} title={title} prompt={prompt} aside={<Tag tone="neutral" mono>{found}/{c.checks.length} called</Tag>}>
      <div className="space-y-3">
        {checks.map((k, i) => {
          const s = state.exec.checks[k.id] || {}
          const reveal = () => update(['exec', 'checks', k.id], { ...s, revealed: true, flaggedBeforeReveal: !!s.verdict, verdict: s.verdict || 'revealed' })
          return (
            <div key={k.id} className="rounded-md border border-line-1 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0"><span className="font-mono t-micro text-ink-4">{String(i + 1).padStart(2, '0')}</span><span className="t-body text-ink-1">{k.area}</span>{s.revealed && <StatusTag kind={k.kind} />}</div>
                <div className="flex items-center gap-2">
                  {!s.revealed && <Seg value={s.verdict} onChange={(v) => update(['exec', 'checks', k.id, 'verdict'], v)} options={[['issue', 'Issue'], ['fine', 'Looks fine']]} />}
                  {!s.revealed ? <button type="button" onClick={reveal} className="t-small text-secondary bg-transparent border-0 cursor-pointer px-0">Reveal</button> : <span className={`t-micro ${s.flaggedBeforeReveal && (s.verdict === 'issue' || k.kind === 'judgement') ? 'text-secondary' : 'text-ink-4'}`}>{s.verdict === 'revealed' ? 'revealed without a call' : s.verdict === 'issue' || k.kind === 'judgement' ? 'you called it' : 'missed'}</span>}
                </div>
              </div>
              {s.revealed && (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-sm bg-ground-2 px-3 py-2"><div className="t-micro uppercase tracking-[0.08em] text-ink-4">Draft</div><div className="t-data text-ink-2">{k.stated}</div></div>
                    <div className="rounded-sm bg-ground-2 px-3 py-2"><div className="t-micro uppercase tracking-[0.08em] text-ink-4">Recomputed</div><div className="t-data text-money">{k.computed}</div></div>
                  </div>
                  <p className="t-small text-ink-2 m-0">{k.text}</p>
                  <p className="t-small text-secondary m-0">Lesson: {k.lesson}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Exercise>
  )
}

/** ScorecardCard — rows vs the reviewer benchmark. */
export function ScorecardCard({ sc }) {
  return (
    <Card pad="lg">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
        <div><div className="t-eyebrow text-accent mb-1">Scorecard</div><h3 className="t-h2 text-ink-1 m-0">How your engagement compares with the reviewer</h3></div>
        <Kpi label="Overall" value={`${Math.round(sc.pct * 100)}%`} hint={`${sc.score} / ${sc.max} points`} tone={sc.pct >= 0.8 ? 'count' : sc.pct >= 0.5 ? 'ink' : 'danger'} />
      </div>
      <div className="divide-y divide-line-1 border-y border-line-1">
        {sc.rows.map((row) => (
          <div key={row.area} className="py-2.5 grid grid-cols-[minmax(0,1fr)_120px] gap-4 items-start">
            <div className="min-w-0">
              <div className="t-body text-ink-1">{row.area}</div>
              {row.notes.slice(0, 3).map((n) => <div key={n} className="t-small text-ink-3 mt-0.5">{n}</div>)}
              {row.notes.length > 3 && <div className="t-micro text-ink-4 mt-0.5">+{row.notes.length - 3} more</div>}
            </div>
            <div>
              <div className="flex justify-end t-data font-mono text-ink-1">{row.score} / {row.max}</div>
              <div className="h-1.5 rounded-sm bg-ground-4 overflow-hidden mt-1"><div className={`h-full ${row.score === row.max ? 'bg-secondary' : 'bg-accent'}`} style={{ width: `${(row.score / row.max) * 100}%` }} /></div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function Takeaways({ items }) {
  return (
    <Card pad="lg">
      <div className="t-eyebrow text-ink-3 mb-3">Takeaways</div>
      <ol className="m-0 pl-5 t-body text-ink-2 space-y-1.5">{items.map((t) => <li key={t}>{t}</li>)}</ol>
    </Card>
  )
}

// re-exported so the lab stages keep one import; the component itself is edition-neutral
export { ExportBar }
