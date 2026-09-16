import { useEffect, useState } from 'react'
import { FileText, Presentation, FileType, FileCode, Sheet, ExternalLink } from 'lucide-react'
import { Card, Button } from '../primitives/index.js'
import { exportDoc } from '../../utils/download.js'
import { EXPORT_FORMATS } from '../../editions.js'

const ALL = {
  docx: ['Word', FileText],
  pptx: ['Slides', Presentation],
  xlsx: ['Excel', Sheet],
  txt: ['Text', FileType],
  md: ['Markdown', FileCode],
}

/** ExportBar — exports a block-model doc (built lazily on click) in whatever formats this edition allows. */
export function ExportBar({ title, build, primary = 'docx' }) {
  const [busy, setBusy] = useState('')
  const [last, setLast] = useState(null)
  const [gamma, setGamma] = useState(null)
  const formats = EXPORT_FORMATS.filter((f) => ALL[f])
  const gammaAllowed = EXPORT_FORMATS.includes('gamma-presentation')
  useEffect(() => {
    if (!gammaAllowed) return undefined
    const t = setTimeout(() => fetch('/api/gamma/status').then((r) => r.json()).then(setGamma).catch(() => setGamma({ configured: false })), 0)
    return () => clearTimeout(t)
  }, [gammaAllowed])
  const run = async (f) => {
    setBusy(f)
    try { setLast({ ok: true, ...(await exportDoc(build(), f)) }) } catch (err) { setLast({ ok: false, error: err.message }) } finally { setBusy('') }
  }
  return (
    <Card pad="md">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="t-eyebrow text-ink-3">{title}</div>
        <div className="flex flex-wrap gap-2">
          {formats.map((f) => {
            const [label, Icon] = ALL[f]
            return <Button key={f} size="sm" variant={f === primary ? 'primary' : 'secondary'} icon={Icon} onClick={() => run(f)} disabled={!!busy}>{busy === f ? 'Building…' : label}</Button>
          })}
          {gammaAllowed && <Button size="sm" variant="secondary" icon={ExternalLink} onClick={() => run('gamma-presentation')} disabled={!!busy || (gamma && !gamma.configured)}>{busy === 'gamma-presentation' ? 'Generating…' : 'Gamma'}</Button>}
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
