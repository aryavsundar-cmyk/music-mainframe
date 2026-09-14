import { useEffect, useRef, useState } from 'react'
import { Sparkles, Download, ChevronDown, Check, AlertTriangle } from 'lucide-react'
import { Button } from '../primitives/index.js'
import { MODES, modesFor } from '../../utils/brief.js'
import { exportBrief } from '../../utils/download.js'

const FORMATS = [['docx', 'Word'], ['pptx', 'Slides'], ['txt', 'Text']]

/**
 * Two-tier export UX (Patterns §3): one primary gradient-free CTA "Export full brief" (.docx) and one quieter
 * dropdown for mode × format. Status line under the buttons reports citations state so a quiet feed is never
 * mistaken for a broken one.
 */
export function ExportButtons({ entity }) {
  const [busy, setBusy] = useState('')
  const [last, setLast] = useState(null)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const modes = modesFor(entity)

  useEffect(() => {
    if (!open) return
    const onDoc = (ev) => { if (ref.current && !ref.current.contains(ev.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc); return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const run = async (mode, format) => {
    setBusy(`${mode}/${format}`); setOpen(false)
    try { setLast({ ok: true, ...(await exportBrief(entity.id, { mode, format })) }) }
    catch (err) { setLast({ ok: false, error: err.message }) }
    finally { setBusy('') }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2" ref={ref}>
        <Button variant="primary" icon={Sparkles} onClick={() => run('full', 'docx')} disabled={!!busy}>{busy === 'full/docx' ? 'Building…' : 'Export full brief'}</Button>
        <div className="relative">
          <Button variant="secondary" icon={Download} onClick={() => setOpen((o) => !o)} disabled={!!busy} aria-haspopup="menu" aria-expanded={open}>Export <ChevronDown size={13} aria-hidden="true" /></Button>
          {open && (
            <div role="menu" className="absolute right-0 mt-1 w-[300px] rounded-lg border border-line-2 bg-ground-2 shadow-[var(--shadow-popover)] p-1.5 z-20">
              {modes.map((m) => (
                <div key={m} className="px-2 py-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <div><div className="t-small text-ink-1">{MODES[m].label}</div><div className="t-micro text-ink-4">{MODES[m].blurb}</div></div>
                    <div className="flex gap-1 shrink-0">
                      {FORMATS.map(([f, label]) => <button key={f} type="button" role="menuitem" onClick={() => run(m, f)} className="t-micro font-mono rounded-sm border border-line-1 px-1.5 py-0.5 text-ink-2 hover:bg-ground-3 hover:text-ink-1 bg-transparent cursor-pointer">{label}</button>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {last && (
        <div className={`t-micro inline-flex items-center gap-1 ${last.ok ? 'text-ink-3' : 'text-danger'}`}>
          {last.ok ? <Check size={11} aria-hidden="true" /> : <AlertTriangle size={11} aria-hidden="true" />}
          {last.ok ? `${last.filename} · ${last.sections} sections · citations ${last.citations}` : `Export failed: ${last.error}`}
        </div>
      )}
    </div>
  )
}
