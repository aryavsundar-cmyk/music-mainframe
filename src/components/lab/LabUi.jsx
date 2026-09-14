import { useEffect, useState } from 'react'
import { ChevronDown, GraduationCap, Check, AlertTriangle, FileText, Presentation, FileType, FileCode, ExternalLink } from 'lucide-react'
import { Card, Tag, Button, Eyebrow } from '../primitives/index.js'
import { exportDoc } from '../../utils/download.js'

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

export const Money = ({ v, children, className = '' }) => <span className={`font-mono tabular text-money ${className}`}>{children ?? v}</span>
export const Figure = ({ children, className = '' }) => <span className={`font-mono tabular ${className}`}>{children}</span>

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

const FORMATS = [['docx', 'Word', FileText], ['pptx', 'Slides', Presentation], ['txt', 'Text', FileType], ['md', 'Markdown', FileCode]]

/** ExportBar — exports a block-model doc (built lazily on click) to Word, slides, text, Markdown, or Gamma. */
export function ExportBar({ title, build, primary = 'docx' }) {
  const [busy, setBusy] = useState('')
  const [last, setLast] = useState(null)
  const [gamma, setGamma] = useState(null)
  useEffect(() => { const t = setTimeout(() => fetch('/api/gamma/status').then((r) => r.json()).then(setGamma).catch(() => setGamma({ configured: false })), 0); return () => clearTimeout(t) }, [])
  const run = async (f) => {
    setBusy(f)
    try { setLast({ ok: true, ...(await exportDoc(build(), f)) }) } catch (err) { setLast({ ok: false, error: err.message }) } finally { setBusy('') }
  }
  return (
    <Card pad="md">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="t-eyebrow text-ink-3">{title}</div>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map(([f, label, Icon]) => <Button key={f} size="sm" variant={f === primary ? 'primary' : 'secondary'} icon={Icon} onClick={() => run(f)} disabled={!!busy}>{busy === f ? 'Building…' : label}</Button>)}
          <Button size="sm" variant="secondary" icon={ExternalLink} onClick={() => run('gamma-presentation')} disabled={!!busy || (gamma && !gamma.configured)}>{busy === 'gamma-presentation' ? 'Generating…' : 'Gamma'}</Button>
        </div>
      </div>
      {last && (
        <div className={`mt-2 t-micro ${last.ok ? 'text-ink-3' : 'text-danger'}`}>
          {last.ok ? (last.url ? <>Gamma ready: <a href={last.url} target="_blank" rel="noreferrer" className="text-secondary">{last.url}</a></> : `${last.filename} · ${last.sections} sections`) : last.error}
        </div>
      )}
    </Card>
  )
}

export function StatusTag({ kind }) {
  return kind === 'error' ? <Tag tone="danger">error</Tag> : <Tag tone="secondary">judgement</Tag>
}
