import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, FileText, Presentation, FileType, FileCode, ExternalLink, Check, AlertTriangle } from 'lucide-react'
import { PageHeader, SectionHeader, Card, Tag, Button, Num, Stat } from '../components/primitives/index.js'
import { ENTITIES, getEntity, ENTITY_TYPES } from '../data/entities.js'
import { CLIENT_CATEGORIES, getConsultingContext, SERVICE_LINES, SERVICE_ORDER } from '../data/consulting.js'
import { ROLES, STAFFING } from '../data/rateCard.js'
import { MODES, modesFor } from '../utils/brief.js'
import { estimateCommercials } from '../utils/proposal.js'
import { buildDeliverable, exportDoc } from '../utils/download.js'
import { useUrlFilters } from '../hooks/useUrlFilters.js'
import { formatMoney } from '../utils/format.js'

const KINDS = [
  { id: 'brief', label: 'Entity brief', blurb: 'Profile, hierarchy, money, flows, PEPI lens, news — per mode' },
  { id: 'account-plan', label: 'Account plan', blurb: 'SCR summary, stakeholders, opportunity matrix, 30·60·90, KPIs' },
  { id: 'proposal', label: 'Proposal', blurb: 'SCR executive summary, scope, approach, team, indicative commercials' },
  { id: 'category-deck', label: 'Sector deck', blurb: 'One PEPI client category: thesis, market, who, deals, hypotheses' },
]
const FORMATS = [['docx', 'Word', FileText], ['pptx', 'Slides', Presentation], ['txt', 'Text', FileType], ['md', 'Markdown', FileCode]]
const select = 'bg-ground-1 border border-line-2 rounded-md h-9 px-2 t-small text-ink-1 focus:border-accent outline-none w-full'
const input = 'bg-ground-1 border border-line-2 rounded-md h-8 px-2 t-data text-ink-1 focus:border-accent outline-none w-full text-right'

export default function Deliverables() {
  const { params, set } = useUrlFilters(['entity', 'kind', 'mode', 'category'])
  const kind = KINDS.some((k) => k.id === params.kind) ? params.kind : 'brief'
  const entity = getEntity(params.entity) || null
  const [q, setQ] = useState('')
  const matches = useMemo(() => { const n = q.trim().toLowerCase(); return n ? ENTITIES.filter((e) => e.searchText.includes(n)).slice(0, 8) : [] }, [q])
  const ctx = entity ? getConsultingContext(entity.id) : { categories: [], hypotheses: [] }
  const categoryId = params.category || ctx.categories[0]?.id || CLIENT_CATEGORIES[0].id
  const category = CLIENT_CATEGORIES.find((c) => c.id === categoryId)
  const defaultLines = [...new Set(ctx.hypotheses.map((h) => h.line))].slice(0, 2)
  // Lines are stored with the entity they were chosen for; a new entity falls back to its defaults (no sync effect).
  const [linesFor, setLinesFor] = useState({ id: null, lines: [] })
  const lines = linesFor.id === (entity?.id || null) ? linesFor.lines : (defaultLines.length ? defaultLines : ['diligence'])
  const setLines = (fn) => setLinesFor({ id: entity?.id || null, lines: typeof fn === 'function' ? fn(lines) : fn })
  const [rates, setRates] = useState(ROLES)
  const [weeks, setWeeks] = useState('')
  const [busy, setBusy] = useState('')
  const [gamma, setGamma] = useState(null)
  useEffect(() => { const t = setTimeout(() => fetch('/api/gamma/status').then((r) => r.json()).then(setGamma).catch(() => setGamma({ configured: false })), 0); return () => clearTimeout(t) }, [])
  // Built doc and last result are keyed to the configuration that produced them; a config change simply hides them.
  const configKey = JSON.stringify([entity?.id, kind, params.mode, categoryId, lines, weeks, rates.map((r) => r.dayRate)])
  const [built, setBuilt] = useState(null)
  const doc = built && built.key === configKey ? built.doc : null
  const last = built && built.key === configKey ? built.last : null
  const setDoc = (d) => setBuilt((b) => ({ key: configKey, doc: d, last: b?.key === configKey ? b.last : null }))
  const setLast = (l) => setBuilt((b) => ({ key: configKey, doc: b?.key === configKey ? b.doc : null, last: l }))

  const comm = kind === 'proposal' ? estimateCommercials({ lines, rates, weeksOverride: weeks ? Number(weeks) : null }) : null
  const needsEntity = kind !== 'category-deck'
  const ready = needsEntity ? !!entity : !!category

  const build = async () => {
    setBusy('build')
    try { setDoc(await buildDeliverable(kind, { entityId: entity?.id, mode: params.mode || 'full', categoryId, lines, rates, weeksOverride: weeks ? Number(weeks) : null })) }
    catch (err) { setLast({ ok: false, error: err.message }) }
    finally { setBusy('') }
  }
  const run = async (format) => {
    setBusy(format)
    try {
      const d = doc || (await buildDeliverable(kind, { entityId: entity?.id, mode: params.mode || 'full', categoryId, lines, rates, weeksOverride: weeks ? Number(weeks) : null }))
      setDoc(d); setLast({ ok: true, format, ...(await exportDoc(d, format)) })
    } catch (err) { setLast({ ok: false, error: err.message, code: err.code }) }
    finally { setBusy('') }
  }

  return (
    <>
      <PageHeader eyebrow="Overlay · deliverables" title="Deliverables"
        lede="Account plans, proposals, sector decks, and briefs, built from the same entity, transaction, PRO, DSP, and news data — exported to Word, slides, text, Markdown, or straight into Gamma." />

      <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-8 items-start">
        <div className="space-y-6">
          <Card pad="md">
            <div className="t-eyebrow text-ink-3 mb-3">1 · Deliverable</div>
            <div className="space-y-1.5">
              {KINDS.map((k) => (
                <button key={k.id} type="button" onClick={() => set({ kind: k.id })} className={['w-full text-left rounded-md border px-3 py-2 cursor-pointer', kind === k.id ? 'bg-ground-4 border-line-3' : 'bg-transparent border-line-1 hover:bg-ground-2'].join(' ')}>
                  <div className="t-small text-ink-1">{k.label}</div><div className="t-micro text-ink-4">{k.blurb}</div>
                </button>
              ))}
            </div>
          </Card>

          {needsEntity ? (
            <Card pad="md">
              <div className="t-eyebrow text-ink-3 mb-3">2 · Entity</div>
              {entity ? (
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div><div className="t-body text-ink-1">{entity.name}</div><div className="t-micro text-ink-3">{ENTITY_TYPES[entity.type]?.label}{entity.subtype ? ` · ${entity.subtype}` : ''}</div></div>
                  <button type="button" onClick={() => set({ entity: '', category: '' })} className="t-micro text-ink-3 hover:text-ink-1 bg-transparent border-0 cursor-pointer">change</button>
                </div>
              ) : null}
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search entities" className={select} />
              {matches.length > 0 && (
                <div className="mt-1.5 rounded-md border border-line-1 bg-ground-2 divide-y divide-line-1">
                  {matches.map((e) => <button key={e.id} type="button" onClick={() => { set({ entity: e.id, category: '' }); setQ('') }} className="w-full text-left px-3 py-1.5 t-small text-ink-2 hover:bg-ground-3 hover:text-ink-1 bg-transparent border-0 cursor-pointer">{e.name} <span className="t-micro text-ink-4">{ENTITY_TYPES[e.type]?.label}</span></button>)}
                </div>
              )}
              {kind === 'brief' && entity && (
                <div className="mt-3"><div className="t-micro text-ink-3 mb-1">Mode</div>
                  <select className={select} value={params.mode || 'full'} onChange={(e) => set({ mode: e.target.value })}>{modesFor(entity).map((m) => <option key={m} value={m}>{MODES[m].label} — {MODES[m].blurb}</option>)}</select>
                </div>
              )}
            </Card>
          ) : (
            <Card pad="md">
              <div className="t-eyebrow text-ink-3 mb-3">2 · Category</div>
              <select className={select} value={categoryId} onChange={(e) => set({ category: e.target.value })}>{CLIENT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
            </Card>
          )}

          {kind === 'proposal' && entity && (
            <Card pad="md">
              <div className="t-eyebrow text-ink-3 mb-3">3 · Scope</div>
              <div className="t-micro text-ink-3 mb-1">Client category</div>
              <select className={select} value={categoryId} onChange={(e) => set({ category: e.target.value })}>{CLIENT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}{ctx.categories.some((x) => x.id === c.id) ? ' ·  matches entity' : ''}</option>)}</select>
              <div className="t-micro text-ink-3 mt-3 mb-1">Service lines</div>
              <div className="flex flex-wrap gap-1.5">
                {SERVICE_ORDER.map((l) => { const on = lines.includes(l); return <button key={l} type="button" onClick={() => setLines((xs) => (on ? xs.filter((x) => x !== l) : [...xs, l]))} className={['rounded-sm border px-2 py-1 t-small cursor-pointer', on ? 'bg-ground-4 border-line-3 text-ink-1' : 'bg-transparent border-line-1 text-ink-2 hover:bg-ground-2'].join(' ')}>{SERVICE_LINES[l].label} <span className="t-micro font-mono text-ink-4">{STAFFING[l].weeks}w</span></button> })}
              </div>
              <div className="grid grid-cols-[1fr_96px] gap-3 items-center mt-3"><div className="t-micro text-ink-3">Override duration (weeks)</div><input className={input} value={weeks} onChange={(e) => setWeeks(e.target.value.replace(/[^0-9]/g, ''))} placeholder="auto" /></div>
              <div className="t-micro text-ink-3 mt-4 mb-1">Day rates (indicative — edit before sending)</div>
              <div className="space-y-1">{rates.map((r, i) => <div key={r.id} className="grid grid-cols-[1fr_110px] gap-3 items-center"><span className="t-small text-ink-2">{r.label}</span><input className={input} value={r.dayRate} onChange={(e) => setRates((rs) => rs.map((x, j) => (j === i ? { ...x, dayRate: Number(e.target.value.replace(/[^0-9]/g, '')) || 0 } : x)))} /></div>)}</div>
            </Card>
          )}
        </div>

        <div className="space-y-6 min-w-0">
          {kind === 'proposal' && comm && entity && (
            <Card pad="md" className="grid grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-4">
              <Stat label="Indicative range" value={<span className="whitespace-nowrap">{formatMoney(comm.low)}–{formatMoney(comm.high)}</span>} size="sm" hint="±10–15% of base" />
              <Stat label="Base estimate" kind="money" value={comm.total} size="sm" />
              <Stat label="Duration" value={`${comm.weeks} wk`} size="sm" />
              <Stat label="Consultant days" kind="count" value={Math.round(comm.days)} opts={{ full: true }} size="sm" />
            </Card>
          )}

          <Card pad="lg">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="t-eyebrow text-accent mb-1">{KINDS.find((k) => k.id === kind).label}</div>
                <h2 className="t-h2 text-ink-1 m-0">{needsEntity ? (entity ? entity.name : 'Pick an entity') : category?.label}</h2>
                {kind === 'proposal' && category && <div className="t-small text-ink-3 mt-1">{category.label} · {lines.map((l) => SERVICE_LINES[l].label).join(' + ') || 'no lines selected'}</div>}
              </div>
              <Button variant="secondary" onClick={build} disabled={!ready || !!busy}>{busy === 'build' ? 'Building…' : doc ? 'Rebuild outline' : 'Preview outline'}</Button>
            </div>
            {!ready && <p className="t-body text-ink-3 m-0">{needsEntity ? 'Search for a label, fund, PRO, DSP, or any other entity on the left.' : 'Pick a category.'}</p>}
            {ready && !doc && <p className="t-body text-ink-3 m-0">Preview the outline, or export directly — the document is built on export with live citations.</p>}
            {doc && (
              <div className="divide-y divide-line-1">
                {doc.sections.map((s) => (
                  <div key={s.num} className="py-2.5 grid grid-cols-[52px_minmax(0,1fr)] gap-3 items-baseline">
                    <span className="t-data text-ink-4">§ {String(s.num).padStart(2, '0')}</span>
                    <div className="min-w-0">
                      <div className="t-eyebrow text-ink-3">{s.eyebrow}</div>
                      <div className="t-body text-ink-1">{s.title}</div>
                      <div className="t-micro font-mono text-ink-4 truncate">{s.blocks.map((b) => b.kind).join(' · ')}</div>
                    </div>
                  </div>
                ))}
                <div className="pt-3 t-micro text-ink-4">{doc.sections.length} sections · citations {doc.citations?.source || 'n/a'} · generated {doc.generatedAt.slice(11, 16)}Z</div>
              </div>
            )}
          </Card>

          <Card pad="lg">
            <SectionHeader eyebrow="Export" title="Formats" aside={gamma ? (gamma.configured ? 'Gamma connected' : 'Gamma: no key') : ''} className="mb-4" />
            <div className="flex flex-wrap gap-2">
              {FORMATS.map(([f, label, Icon]) => <Button key={f} variant={f === 'docx' ? 'primary' : 'secondary'} icon={f === 'docx' ? Sparkles : Icon} onClick={() => run(f)} disabled={!ready || !!busy}>{busy === f ? 'Building…' : label}</Button>)}
              <Button variant="secondary" icon={ExternalLink} onClick={() => run('gamma-presentation')} disabled={!ready || !!busy || (gamma && !gamma.configured)}>{busy === 'gamma-presentation' ? 'Generating in Gamma…' : 'Gamma deck'}</Button>
              <Button variant="ghost" onClick={() => run('gamma-document')} disabled={!ready || !!busy || (gamma && !gamma.configured)}>{busy === 'gamma-document' ? 'Generating…' : 'Gamma doc'}</Button>
            </div>
            {last && (
              <div className={`mt-3 t-small inline-flex items-start gap-1.5 ${last.ok ? 'text-ink-2' : 'text-danger'}`}>
                {last.ok ? <Check size={13} className="mt-0.5" aria-hidden="true" /> : <AlertTriangle size={13} className="mt-0.5" aria-hidden="true" />}
                <span>{last.ok ? (last.url ? <>Gamma ready: <a href={last.url} target="_blank" rel="noreferrer" className="text-secondary">{last.url}</a></> : `${last.filename} · ${last.sections} sections · citations ${last.citations}`) : last.error}</span>
              </div>
            )}
            {gamma && !gamma.configured && <p className="t-micro text-ink-4 mt-3 mb-0">To enable Gamma, set <span className="font-mono">GAMMA_API_KEY</span> on the Render service (or in a local .env) — key from gamma.app/settings/api. Until then, export Markdown and paste it into Gamma's "Paste in text" flow; sections map to cards.</p>}
          </Card>

          {entity && ctx.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 t-small text-ink-3">PEPI lens: {ctx.categories.map((c) => <Link key={c.id} to={`/consulting/${c.id}`} className="no-underline"><Tag tone="accent">{c.label}</Tag></Link>)}<Link to={`/entities/${entity.id}`} className="text-ink-3 no-underline hover:text-ink-1 ml-2">entity record →</Link></div>
          )}
        </div>
      </div>
      <div className="hidden"><Num kind="count" value={0} /></div>
    </>
  )
}
