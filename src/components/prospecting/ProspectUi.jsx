import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Tag } from '../primitives/index.js'

/** CopyButton — puts a draft on the clipboard, which is how outreach actually leaves this app. */
export function CopyButton({ text, label = 'Copy', size = 'sm' }) {
  const [done, setDone] = useState(false)
  useEffect(() => { if (!done) return undefined; const t = setTimeout(() => setDone(false), 1600); return () => clearTimeout(t) }, [done])
  const copy = async () => {
    try { await navigator.clipboard.writeText(text) } catch { /* clipboard unavailable */ }
    setDone(true)
  }
  return (
    <button type="button" onClick={copy}
      className={['inline-flex items-center gap-1.5 rounded-md border cursor-pointer transition-colors', size === 'sm' ? 't-micro px-2 py-1' : 't-small px-2.5 py-1.5',
        done ? 'border-secondary-line bg-secondary-soft text-secondary' : 'border-line-2 bg-ground-1 text-ink-2 hover:bg-ground-3 hover:text-ink-1'].join(' ')}>
      {done ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}{done ? 'Copied' : label}
    </button>
  )
}

export function TierTag({ tier }) {
  return <Tag tone={tier === 'A' ? 'accent' : tier === 'B' ? 'secondary' : 'neutral'} mono>{tier}</Tag>
}

/** ScoreBar — the three components, always visible, so a score can be defended in a meeting. */
export function ScoreBar({ score, width = 132 }) {
  const seg = [['fit', score.fit, 'bg-accent'], ['timing', score.timing, 'bg-secondary'], ['access', score.access, 'bg-ink-3']]
  return (
    <span className="inline-flex items-center gap-2" title={`fit ${score.fit}/40 · timing ${score.timing}/40 · access ${score.access}/20`}>
      <span className="inline-flex h-2 rounded-sm overflow-hidden bg-ground-4" style={{ width }}>
        {seg.map(([k, v, tone]) => <span key={k} className={tone} style={{ width: `${(v / 100) * width}px` }} />)}
        <span className="flex-1" />
      </span>
      <span className="font-mono tabular t-data text-ink-1">{score.total}</span>
    </span>
  )
}

export function Field({ label, children, hint }) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="t-micro uppercase tracking-[0.08em] text-ink-3">{label}</span>
      {children}
      {hint && <span className="t-micro text-ink-4">{hint}</span>}
    </label>
  )
}

export const selectClass = 'bg-ground-1 border border-line-2 rounded-md h-8 px-2 t-small text-ink-1 focus:border-accent outline-none'
export const selectFull = `${selectClass} w-full`

/** Draft — one channel's text with its length against the channel limit, and a copy button. */
export function Draft({ title, text, limit, length, hint }) {
  const over = limit && length > limit
  return (
    <div className="rounded-md border border-line-1 bg-ground-2">
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-line-1">
        <span className="t-small text-ink-1">{title}{hint && <span className="t-micro text-ink-4 ml-2">{hint}</span>}</span>
        <div className="flex items-center gap-2">
          {limit ? <span className={`t-micro font-mono tabular ${over ? 'text-danger' : 'text-ink-4'}`}>{length}/{limit}</span> : null}
          <CopyButton text={text} />
        </div>
      </div>
      <p className="t-small text-ink-2 whitespace-pre-wrap m-0 px-3 py-2.5">{text}</p>
    </div>
  )
}
