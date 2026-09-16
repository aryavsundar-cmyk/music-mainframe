import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ExternalLink, RotateCcw, Search, X } from 'lucide-react'
import { PageHeader, SectionHeader, Card, Tag, Button } from '../components/primitives/index.js'
import { CopyButton, Draft, Field, ScoreBar, TierTag, selectClass, selectFull } from '../components/prospecting/ProspectUi.jsx'
import { buildAccounts, coverage, hypothesesFor, lineLabel, recommendedLine, SEGMENTS, SEGMENT_BY_ID } from '../utils/prospect.js'
import { LIMITS, briefText, draftOutreach } from '../utils/outreach.js'
import { PERSONAS, PERSONA_BY_ID } from '../data/personas.js'
import { SERVICE_LINES } from '../data/consulting.js'
import { hubLinks } from '../data/siblings.js'
import { STATUSES, STATUS_LABEL, useProspectRecords } from '../hooks/useProspectRecords.js'
import { useUrlFilters } from '../hooks/useUrlFilters.js'

const SENDER_KEY = 'mm-prospect-sender'
const fmtDate = (d) => (d ? d : '—')

/** Live news signals per entity, used by the timing score. Falls back to none when the feed is unreachable. */
function useSignals() {
  const [signals, setSignals] = useState({})
  const [state, setState] = useState('loading')
  useEffect(() => {
    let alive = true
    fetch('/api/news?limit=400').then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => { if (!alive) return; const map = {}; for (const it of j.items || []) for (const id of it.entities || []) map[id] = (map[id] || 0) + 1; setSignals(map); setState('live') })
      .catch(() => { if (alive) setState('unavailable') })
    return () => { alive = false }
  }, [])
  return { signals, state }
}

export default function Prospecting() {
  const { params, set, clear, any } = useUrlFilters(['view', 'side', 'segment', 'tier', 'status', 'q', 'account'])
  const { records, update, reset } = useProspectRecords()
  const { signals, state: feed } = useSignals()
  const accounts = useMemo(() => buildAccounts({ records, signals }), [records, signals])
  const cov = useMemo(() => coverage(accounts, records), [accounts, records])
  const view = params.view === 'coverage' ? 'coverage' : 'targets'

  const filtered = accounts.filter((a) => {
    const r = records[a.id] || {}
    if (params.side && a.side !== params.side) return false
    if (params.segment && a.segment !== params.segment) return false
    if (params.tier && a.score.tier !== params.tier) return false
    if (params.status && (r.status || 'new') !== params.status) return false
    if (params.q && !`${a.name} ${a.short} ${a.type} ${a.region}`.toLowerCase().includes(params.q.toLowerCase())) return false
    return true
  })
  const selected = accounts.find((a) => a.id === params.account) || null

  return (
    <>
      <PageHeader eyebrow="Pipeline · coverage & prospecting" title="Prospecting"
        lede="Every account in the app scored on fit, timing and access, mapped to the buying role and the service line that fits, with LinkedIn and email drafts you can send yourself."
        actions={<div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Button size="sm" variant={view === 'targets' ? 'primary' : 'secondary'} onClick={() => set({ view: 'targets' })}>Targets</Button>
            <Button size="sm" variant={view === 'coverage' ? 'primary' : 'secondary'} onClick={() => set({ view: 'coverage' })}>Coverage</Button>
          </div>
          <span className="t-micro text-ink-4">{feed === 'live' ? 'News signals live' : feed === 'loading' ? 'Loading signals…' : 'News feed unreachable — timing scores exclude signals'}</span>
        </div>} />

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
        <Stat label="Accounts" value={cov.totals.accounts} />
        <Stat label="Tier A" value={cov.totals.A} tone="accent" />
        <Stat label="Tier B" value={cov.totals.B} tone="secondary" />
        <Stat label="Priority worked" value={`${cov.totals.worked}/${cov.totals.priority}`} hint="status beyond new" />
        <Stat label="With a live trigger" value={accounts.filter((a) => a.score.timing > 0).length} />
        <Stat label="Recorded relationships" value={Object.values(records).filter((r) => r.access && r.access !== 'none').length} />
      </div>

      {view === 'coverage' ? (
        <CoverageView cov={cov} onPick={(segment, tier) => set({ view: 'targets', segment, tier: tier || '', account: '' })} />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <Filters params={params} set={set} clear={clear} any={any} count={filtered.length} />
            <TargetTable accounts={filtered} records={records} selectedId={params.account} onSelect={(id) => set({ account: id === params.account ? '' : id })} onStatus={(id, status) => update(id, { status })} />
          </div>
          <div className="xl:sticky xl:top-6">
            {selected
              ? <AccountPanel account={selected} record={records[selected.id] || {}} update={update} onClose={() => set({ account: '' })} />
              : <Card pad="lg"><p className="t-body text-ink-3 m-0">Pick an account to see why it scores, what to lead with, and drafts for LinkedIn and email.</p></Card>}
          </div>
        </div>
      )}

      {view === 'targets' && (
        <div className="flex items-center justify-between gap-4 mt-8 pt-4 border-t border-line-1">
          <span className="t-micro text-ink-4">Status, relationship strength and notes are stored in this browser only. Nothing here is sent anywhere, and the module never contacts anyone for you.</span>
          <button type="button" onClick={() => { if (window.confirm('Clear every prospecting record in this browser?')) reset() }} className="t-small text-ink-3 hover:text-ink-1 bg-transparent border-0 cursor-pointer inline-flex items-center gap-1"><RotateCcw size={12} aria-hidden="true" />Clear records</button>
        </div>
      )}
    </>
  )
}

function Stat({ label, value, hint, tone = 'ink' }) {
  const cls = tone === 'accent' ? 'text-accent' : tone === 'secondary' ? 'text-secondary' : 'text-ink-1'
  return (
    <Card pad="md">
      <div className="t-micro uppercase tracking-[0.08em] text-ink-3">{label}</div>
      <div className={`t-stat ${cls}`}>{value}</div>
      {hint && <div className="t-micro text-ink-4">{hint}</div>}
    </Card>
  )
}

function Filters({ params, set, clear, any, count }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-4" aria-hidden="true" />
        <input value={params.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search accounts" aria-label="Search accounts"
          className="bg-ground-1 border border-line-2 rounded-md h-8 pl-8 pr-2 t-small text-ink-1 placeholder:text-ink-4 focus:border-accent outline-none w-56" />
      </div>
      <select value={params.side} onChange={(e) => set({ side: e.target.value })} className={`${selectClass} w-36`} aria-label="Side">
        <option value="">Both sides</option><option value="buy">Buy side</option><option value="sell">Sell side</option>
      </select>
      <select value={params.segment} onChange={(e) => set({ segment: e.target.value })} className={`${selectClass} w-56`} aria-label="Segment">
        <option value="">All segments</option>
        {SEGMENTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      <select value={params.tier} onChange={(e) => set({ tier: e.target.value })} className={`${selectClass} w-28`} aria-label="Tier">
        <option value="">All tiers</option><option value="A">Tier A</option><option value="B">Tier B</option><option value="C">Tier C</option>
      </select>
      <select value={params.status} onChange={(e) => set({ status: e.target.value })} className={`${selectClass} w-36`} aria-label="Filter by status">
        <option value="">Any status</option>
        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
      </select>
      <span className="t-small text-ink-3 font-mono tabular">{count}</span>
      {any && <button type="button" onClick={clear} className="t-small text-secondary bg-transparent border-0 cursor-pointer px-0">Clear</button>}
    </div>
  )
}

function CoverageView({ cov, onPick }) {
  return (
    <>
      <SectionHeader eyebrow="Coverage" title="Where the priority accounts are, and how many we have worked" />
      <Card pad="lg">
        <div className="overflow-x-auto -mx-2.5">
          <table className="w-full border-collapse" style={{ minWidth: 760 }}>
            <thead>
              <tr>
                {['Segment', 'Side', 'Accounts', 'Tier A', 'Tier B', 'Tier C', 'Priority worked'].map((h, i) => (
                  <th key={h} className={`t-micro uppercase tracking-[0.08em] text-ink-3 font-medium py-2 px-2.5 border-b border-line-2 whitespace-nowrap ${i > 1 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cov.rows.map((r) => (
                <tr key={r.id} className="hover:bg-ground-2">
                  <td className="py-2 px-2.5 border-b border-line-1"><button type="button" onClick={() => onPick(r.id, '')} className="t-small text-ink-1 bg-transparent border-0 cursor-pointer px-0 text-left hover:text-accent">{r.label}</button></td>
                  <td className="py-2 px-2.5 border-b border-line-1"><Tag tone={r.side === 'buy' ? 'accent' : 'secondary'}>{r.side}</Tag></td>
                  <td className="py-2 px-2.5 border-b border-line-1 text-right font-mono tabular t-data text-ink-3">{r.accounts}</td>
                  {['A', 'B', 'C'].map((t) => (
                    <td key={t} className="py-2 px-2.5 border-b border-line-1 text-right">
                      <button type="button" onClick={() => onPick(r.id, t)} disabled={!r.byTier[t]}
                        className={`font-mono tabular t-data bg-transparent border-0 px-0 ${r.byTier[t] ? 'cursor-pointer text-ink-1 hover:text-accent' : 'text-ink-4'}`}>{r.byTier[t]}</button>
                    </td>
                  ))}
                  <td className="py-2 px-2.5 border-b border-line-1 text-right">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-1.5 w-16 rounded-sm bg-ground-4 overflow-hidden"><span className="block h-full bg-accent" style={{ width: `${Math.round((r.coverage || 0) * 100)}%` }} /></span>
                      <span className="font-mono tabular t-data text-ink-2">{r.worked}/{r.priority}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="t-small text-ink-3 mt-4 mb-0">Priority means Tier A and B. A segment with priority accounts and nothing worked is the gap worth filling this week.</p>
      </Card>
    </>
  )
}

function TargetTable({ accounts, records, selectedId, onSelect, onStatus }) {
  return (
    <Card pad="md">
      <div className="overflow-x-auto -mx-2.5">
        <table className="w-full border-collapse" style={{ minWidth: 760 }}>
          <thead>
            <tr>
              {['Account', 'Segment', 'Tier', 'Score', 'Why now', 'Status'].map((h) => (
                <th key={h} className="text-left t-micro uppercase tracking-[0.08em] text-ink-3 font-medium py-2 px-2.5 border-b border-line-2 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accounts.slice(0, 120).map((a) => {
              const r = records[a.id] || {}
              return (
                <tr key={a.id} className={`cursor-pointer ${a.id === selectedId ? 'bg-ground-3' : 'hover:bg-ground-2'}`} onClick={() => onSelect(a.id)}>
                  <td className="py-2 px-2.5 border-b border-line-1">
                    <span className="t-small text-ink-1 block">{a.name}</span>
                    <span className="t-micro text-ink-4">{a.type} · {a.region}</span>
                  </td>
                  <td className="py-2 px-2.5 border-b border-line-1"><span className="t-micro text-ink-3">{SEGMENT_BY_ID[a.segment]?.label}</span></td>
                  <td className="py-2 px-2.5 border-b border-line-1"><TierTag tier={a.score.tier} /></td>
                  <td className="py-2 px-2.5 border-b border-line-1"><ScoreBar score={a.score} /></td>
                  <td className="py-2 px-2.5 border-b border-line-1">
                    <span className="t-micro text-ink-2 block max-w-[280px] truncate">{a.topTrigger ? a.topTrigger.label : 'No dated trigger'}</span>
                    <span className="t-micro text-ink-4 font-mono">{fmtDate(a.topTrigger?.date)}</span>
                  </td>
                  <td className="py-2 px-2.5 border-b border-line-1" onClick={(e) => e.stopPropagation()}>
                    <select value={r.status || 'new'} onChange={(e) => onStatus(a.id, e.target.value)} className={`${selectClass} w-32`} aria-label={`Status for ${a.name}`}>
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {accounts.length > 120 && <p className="t-micro text-ink-4 mt-3 mb-0">Showing the top 120 by score. Filter to narrow.</p>}
      {!accounts.length && <p className="t-body text-ink-3 m-0 py-6 text-center">No accounts match these filters.</p>}
    </Card>
  )
}

function AccountPanel({ account, record, update, onClose }) {
  // derived state keyed by account: switching accounts resets the composer without an effect
  const fresh = (a) => ({ key: a.id, line: recommendedLine(a), personaId: '', triggerId: '' })
  const [composer, setComposer] = useState(() => fresh(account))
  const c = composer.key === account.id ? composer : fresh(account)
  const { line, personaId, triggerId } = c
  const setLine = (v) => setComposer({ ...c, line: v })
  const setPersonaId = (v) => setComposer({ ...c, personaId: v })
  const setTriggerId = (v) => setComposer({ ...c, triggerId: v })
  const [sender, setSender] = useState(() => { try { return localStorage.getItem(SENDER_KEY) || '' } catch { return '' } })
  useEffect(() => { try { localStorage.setItem(SENDER_KEY, sender) } catch { /* storage unavailable */ } }, [sender])

  const trigger = triggerId ? account.triggers.find((t) => t.id === triggerId) : account.topTrigger
  const draft = draftOutreach(account, { line, persona: personaId || undefined, trigger, sender })
  const hyps = hypothesesFor(account, draft.line).slice(0, 3)
  const hub = hubLinks(account.id)

  return (
    <Card pad="lg" className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1"><TierTag tier={account.score.tier} /><span className="t-micro text-ink-3">{SEGMENT_BY_ID[account.segment]?.label}</span></div>
          <h3 className="t-h2 text-ink-1 m-0">{account.name}</h3>
          <p className="t-small text-ink-3 m-0 mt-1">{account.hq} · {account.ownership}</p>
        </div>
        <button type="button" onClick={onClose} className="text-ink-4 hover:text-ink-1 bg-transparent border-0 cursor-pointer p-1" aria-label="Close panel"><X size={16} /></button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ScoreBar score={account.score} width={160} />
        <Link to={`/entities/${account.id}`} className="t-small text-accent no-underline inline-flex items-center gap-1">Entity <ArrowUpRight size={12} aria-hidden="true" /></Link>
        {hub?.length ? hub.map((h) => <a key={h.url} href={h.url} target="_blank" rel="noreferrer" className="t-small text-secondary no-underline inline-flex items-center gap-1">{h.label} <ExternalLink size={11} aria-hidden="true" /></a>) : null}
      </div>

      <div>
        <div className="t-eyebrow text-ink-3 mb-2">Why it scores</div>
        <ul className="m-0 pl-4 t-small text-ink-2 space-y-1">
          {[...account.score.fitReasons, ...account.score.timingReasons.slice(0, 3), ...account.score.accessReasons].map((r) => <li key={r}>{r}</li>)}
          {!account.score.accessReasons.length && <li className="text-ink-4">No access recorded — set the relationship below if you know someone.</li>}
        </ul>
      </div>

      {account.triggers.length > 0 && (
        <div>
          <div className="t-eyebrow text-ink-3 mb-2">Triggers</div>
          <div className="space-y-1.5">
            {account.triggers.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-baseline gap-2">
                <span className="t-micro font-mono text-ink-4 shrink-0 w-16">{fmtDate(t.date)}</span>
                <span className="t-small text-ink-2 min-w-0">{t.label}{t.sources?.[0]?.url && <a href={t.sources[0].url} target="_blank" rel="noreferrer" className="text-secondary no-underline ml-1.5 t-micro">source</a>}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Service line">
          <select value={line} onChange={(e) => setLine(e.target.value)} className={selectFull} aria-label="Service line">
            {account.lines.map((l) => <option key={l} value={l}>{SERVICE_LINES[l]?.label || l}</option>)}
          </select>
        </Field>
        <Field label="Buying role">
          <select value={personaId || draft.persona || ''} onChange={(e) => setPersonaId(e.target.value)} className={selectFull} aria-label="Buying role">
            {PERSONAS.map((p) => <option key={p.id} value={p.id}>{p.role}</option>)}
          </select>
        </Field>
        <Field label="Trigger to open on">
          <select value={triggerId} onChange={(e) => setTriggerId(e.target.value)} className={selectFull} aria-label="Trigger">
            <option value="">{account.topTrigger ? 'Strongest trigger' : 'No trigger — sector context'}</option>
            {account.triggers.map((t) => <option key={t.id} value={t.id}>{t.date ? `${t.date} · ` : ''}{t.label.slice(0, 60)}</option>)}
          </select>
        </Field>
        <Field label="Sign as" hint="stored in this browser">
          <input value={sender} onChange={(e) => setSender(e.target.value)} placeholder="Your name" aria-label="Sign as"
            className="bg-ground-1 border border-line-2 rounded-md h-8 px-2 t-small text-ink-1 placeholder:text-ink-4 focus:border-accent outline-none w-full" />
        </Field>
      </div>

      {hyps.length > 0 && (
        <div>
          <div className="t-eyebrow text-ink-3 mb-2">What we would actually do · {lineLabel(draft.line)}</div>
          <ul className="m-0 pl-4 t-small text-ink-3 space-y-1">{hyps.map((h) => <li key={h.text}>{h.text}</li>)}</ul>
        </div>
      )}

      {draft.warnings.map((w) => <p key={w} className="t-small text-danger m-0">{w}</p>)}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="t-eyebrow text-ink-3">Drafts · {PERSONA_BY_ID[draft.persona]?.role}</div>
          <CopyButton text={briefText(account, draft)} label="Copy brief" />
        </div>
        <Draft title="LinkedIn connection note" text={draft.linkedinNote} limit={LIMITS.linkedinNote} length={draft.lengths.linkedinNote} />
        <Draft title="LinkedIn message" hint={draft.linkedinSubject} text={draft.linkedinBody} length={draft.lengths.linkedinBody} />
        <Draft title="Email subject" text={draft.emailSubject} limit={LIMITS.emailSubject} length={draft.lengths.emailSubject} />
        <Draft title="Email" text={draft.emailBody} length={draft.lengths.emailBody} />
        {draft.followUps.map((f) => <Draft key={f.day} title={`Follow-up · day ${f.day} · ${f.channel === 'email' ? 'email' : 'LinkedIn'}`} text={f.text} length={f.text.length} />)}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-line-1">
        <Field label="Status">
          <select value={record.status || 'new'} onChange={(e) => update(account.id, { status: e.target.value })} className={selectFull} aria-label={`Status for ${account.name}`}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </Field>
        <Field label="Relationship" hint="raises the access score">
          <select value={record.access || 'none'} onChange={(e) => update(account.id, { access: e.target.value })} className={selectFull} aria-label="Relationship strength">
            <option value="none">None</option><option value="warm">Warm — an introduction exists</option><option value="strong">Strong — I know someone here</option>
          </select>
        </Field>
      </div>
      <Field label="Note" hint={record.updated ? `Last updated ${record.updated}` : 'Private to this browser'}>
        <textarea value={record.note || ''} onChange={(e) => update(account.id, { note: e.target.value })} rows={3} placeholder="Who you spoke to, what they said, when to come back."
          className="w-full bg-ground-1 border border-line-2 rounded-md px-3 py-2 t-small text-ink-1 placeholder:text-ink-4 focus:border-accent outline-none resize-y" />
      </Field>
    </Card>
  )
}
