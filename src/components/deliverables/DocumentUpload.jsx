import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Upload, FileText, X, AlertTriangle, Check } from 'lucide-react'
import { Card, Eyebrow, Tag, Loading, Caveat } from '../primitives/index.js'
import { readFile, SUPPORTED, MAX_FILE_MB } from '../../utils/documentText.js'
import { readDocument, mergeReadings } from '../../utils/documentRead.js'

/**
 * Drop an RFP, a CIM, a management pack or last year's deck, and see what this canvas already knows about it.
 *
 * Every file is read in the browser — there is no upload endpoint, and the panel says so, because "we don't store
 * your files" is a promise and "there is nowhere to store them" is an architecture. Each file is parsed on its own
 * so one unreadable PDF costs that PDF and not the other four.
 *
 * What comes back is deliberately framed as *what the document says*, never as something the app now knows. The
 * comparison row is the sharpest example: it sets a figure from the document beside the figure on record and stops
 * there. Deciding which is right is the reader's job, and a tool that did it for them would be guessing.
 */
export function DocumentUpload({ financials = {}, onChange }) {
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(0)
  const [over, setOver] = useState(false)
  const input = useRef(null)

  // Findings are published in an effect, not from inside a state updater. React runs an updater DURING render, so
  // calling the parent's setter there is "cannot update a component while rendering a different component" — it
  // worked, and warned, and would eventually have dropped an update.
  useEffect(() => {
    const ok = files.filter((f) => f.reading)
    onChange?.(ok.length ? mergeReadings(ok.map((f) => f.reading)) : null)
  }, [files, onChange])

  const take = useCallback(async (list) => {
    const incoming = [...list]
    if (!incoming.length) return
    setBusy((n) => n + incoming.length)
    const results = await Promise.all(incoming.map(async (file) => {
      try {
        const parsed = await readFile(file)
        return { id: `${file.name}-${file.size}-${file.lastModified}`, filename: file.name, reading: readDocument(parsed, { financials }) }
      } catch (err) {
        return { id: `${file.name}-${Math.random()}`, filename: file.name, error: err.message }
      }
    }))
    setBusy((n) => Math.max(0, n - incoming.length))
    setFiles((current) => [...current.filter((c) => !results.some((r) => r.id === c.id)), ...results])
  }, [financials])

  const remove = (id) => setFiles((current) => current.filter((f) => f.id !== id))
  const found = files.filter((f) => f.reading)
  const merged = found.length ? mergeReadings(found.map((f) => f.reading)) : null

  return (
    <Card pad="md">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <Eyebrow as="h2" tone="muted">What you were given</Eyebrow>
        {merged && <Tag tone="accent">{merged.files.length} read</Tag>}
      </div>

      <label
        onDragOver={(ev) => { ev.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(ev) => { ev.preventDefault(); setOver(false); take(ev.dataTransfer.files) }}
        className={`flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-4 py-6 cursor-pointer transition-colors duration-100 ${over ? 'border-accent bg-ground-3' : 'border-line-2 hover:bg-ground-2'}`}
      >
        <Upload size={18} className="text-ink-3" aria-hidden="true" />
        <span className="t-small text-ink-2">Drop a file, or choose one</span>
        <span className="t-micro text-ink-4 text-center">{SUPPORTED.join(' · ')} — up to {MAX_FILE_MB} MB each</span>
        <input ref={input} type="file" multiple accept={SUPPORTED.join(',')} className="sr-only"
          onChange={(ev) => { take(ev.target.files); ev.target.value = '' }} />
      </label>

      {busy > 0 && <Loading what={`Reading ${busy} file${busy === 1 ? '' : 's'} — in this browser…`} lines={2} className="mt-3" />}

      {files.length > 0 && (
        <ul className="m-0 p-0 list-none flex flex-col mt-3">
          {files.map((f) => (
            <li key={f.id} className="flex items-start gap-2 py-1.5 border-b border-line-1 last:border-0">
              {f.error
                ? <AlertTriangle size={13} className="text-danger mt-0.5 shrink-0" aria-hidden="true" />
                : <FileText size={13} className="text-ink-4 mt-0.5 shrink-0" aria-hidden="true" />}
              <span className="min-w-0 flex-1">
                <span className="t-small text-ink-1 block truncate">{f.filename}</span>
                <span className={`t-micro block ${f.error ? 'text-danger' : 'text-ink-4'}`}>
                  {f.error || `${f.reading.words.toLocaleString()} words · ${f.reading.companies.length} companies · ${f.reading.figures.length} figures`}
                </span>
              </span>
              <button type="button" onClick={() => remove(f.id)} aria-label={`Remove ${f.filename}`}
                className="shrink-0 bg-transparent border-0 p-0 cursor-pointer text-ink-4 hover:text-ink-1">
                <X size={13} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {merged && (
        <div className="mt-3 flex flex-col gap-2">
          {merged.companies.length > 0 && (
            <div>
              <div className="t-micro text-ink-4 mb-1">Companies on this canvas that your document names</div>
              <div className="flex flex-wrap gap-1.5">
                {merged.companies.slice(0, 12).map((c) => (
                  <Link key={c.id} to={`/entities/${c.id}`}
                    className="inline-flex items-baseline gap-1 rounded-sm border border-line-2 px-2 py-0.5 t-micro text-ink-2 no-underline hover:border-accent hover:text-ink-1">
                    {c.name}<span className="font-mono text-ink-4">{c.hits}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {merged.checks.length > 0 && (
            <div>
              <div className="t-micro text-ink-4 mb-1">Figures worth looking at twice</div>
              <ul className="m-0 p-0 list-none flex flex-col gap-1">
                {merged.checks.slice(0, 6).map((c) => (
                  <li key={`${c.entityId}-${c.theirs.text}`} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-2 items-baseline">
                    <span className="t-micro text-ink-2 truncate">{c.name}</span>
                    <span className="t-micro text-ink-3">
                      your document <span className="font-mono text-ink-1">{c.theirs.text}</span>
                      {' · '}this record <span className="font-mono text-ink-1">{c.ours.text}</span>
                      {c.differs === false && <span className="text-secondary"> · they agree</span>}
                      {c.differs === true && <span className="text-accent"> · they differ</span>}
                      {c.differs === null && <span className="text-ink-4"> · different currencies</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Caveat more={(
            <>
              A company is listed because its name appears in the text, which is not the same as the document being
              about it. A figure is set beside the record because it sits next to that company&apos;s name — the
              document may be measuring a different period, a different company in the same group, or a different
              thing entirely. Nothing here is checked against a source, nothing is added to the records, and every
              line carries the file and page it came from into the exported document.
            </>
          )}>
            <Check size={11} className="inline mb-0.5 mr-1 text-secondary" aria-hidden="true" />
            Read in this browser; no file was uploaded anywhere.
          </Caveat>
        </div>
      )}
    </Card>
  )
}
