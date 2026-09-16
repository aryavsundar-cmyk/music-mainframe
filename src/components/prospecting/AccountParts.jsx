import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ExternalLink } from 'lucide-react'
import { Card, Tag } from '../primitives/index.js'
import { CopyButton, Draft, Field, ScoreBar, TierTag, selectFull } from './ProspectUi.jsx'
import { LIMITS, briefText, draftOutreach } from '../../utils/outreach.js'
import { hypothesesFor, lineLabel, recommendedLine, SEGMENT_BY_ID } from '../../utils/prospect.js'
import { PERSONAS, PERSONA_BY_ID } from '../../data/personas.js'
import { SERVICE_LINES } from '../../data/consulting.js'
import { hubLinks } from '../../data/siblings.js'
import { STATUSES, STATUS_LABEL } from '../../hooks/useProspectRecords.js'

const SENDER_KEY = 'mm-prospect-sender'
const fmtDate = (d) => d || '—'

export function AccountHeader({ account, children }) {
  const hub = hubLinks(account.id)
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2"><TierTag tier={account.score.tier} /><span className="t-micro text-ink-3">{SEGMENT_BY_ID[account.segment]?.label}</span><Tag tone={account.side === 'buy' ? 'accent' : 'secondary'}>{account.side} side</Tag></div>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <ScoreBar score={account.score} width={160} />
        <Link to={`/entities/${account.id}`} className="t-small text-accent no-underline inline-flex items-center gap-1">Entity record <ArrowUpRight size={12} aria-hidden="true" /></Link>
        {(hub || []).map((h) => <a key={h.url} href={h.url} target="_blank" rel="noreferrer" className="t-small text-secondary no-underline inline-flex items-center gap-1">{h.label} <ExternalLink size={11} aria-hidden="true" /></a>)}
      </div>
    </div>
  )
}

export function ScoreReasons({ account }) {
  const rows = [['Fit', account.score.fit, 40, account.score.fitReasons], ['Timing', account.score.timing, 40, account.score.timingReasons], ['Access', account.score.access, 20, account.score.accessReasons]]
  return (
    <div className="space-y-3">
      {rows.map(([label, value, max, reasons]) => (
        <div key={label}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="t-small text-ink-1">{label}</span>
            <span className="font-mono tabular t-data text-ink-2">{value}<span className="text-ink-4">/{max}</span></span>
          </div>
          <ul className="m-0 pl-4 t-small text-ink-3 space-y-0.5 mt-1">
            {reasons.slice(0, 4).map((r) => <li key={r}>{r}</li>)}
            {!reasons.length && <li className="text-ink-4">{label === 'Access' ? 'Nothing recorded — set the relationship below if you know someone here.' : 'Nothing scored yet.'}</li>}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function TriggerList({ triggers, limit = 6 }) {
  if (!triggers.length) return <p className="t-small text-ink-3 m-0">No dated trigger on file. The opening will lean on sector context, which reads weaker.</p>
  return (
    <div className="space-y-1.5">
      {triggers.slice(0, limit).map((t) => (
        <div key={t.id} className="flex items-baseline gap-2">
          <span className="t-micro font-mono text-ink-4 shrink-0 w-16">{fmtDate(t.date)}</span>
          <span className="t-small text-ink-2 min-w-0">
            {t.label}
            {t.sources?.[0]?.url && <a href={t.sources[0].url} target="_blank" rel="noreferrer" className="text-secondary no-underline ml-1.5 t-micro">source</a>}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Composer + drafts. The only place outreach text is produced, so panel and page can never drift. */
export function OutreachComposer({ account, compact = false }) {
  const fresh = (a) => ({ key: a.id, line: recommendedLine(a), personaId: '', triggerId: '' })
  const [composer, setComposer] = useState(() => fresh(account))
  const c = composer.key === account.id ? composer : fresh(account)
  const [sender, setSender] = useState(() => { try { return localStorage.getItem(SENDER_KEY) || '' } catch { return '' } })
  useEffect(() => { try { localStorage.setItem(SENDER_KEY, sender) } catch { /* storage unavailable */ } }, [sender])

  const trigger = c.triggerId ? account.triggers.find((t) => t.id === c.triggerId) : account.topTrigger
  const draft = draftOutreach(account, { line: c.line, persona: c.personaId || undefined, trigger, sender })
  const hyps = hypothesesFor(account, draft.line).slice(0, 3)

  return (
    <div className="space-y-4">
      <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
        <Field label="Service line">
          <select value={c.line} onChange={(e) => setComposer({ ...c, line: e.target.value })} className={selectFull} aria-label="Service line">
            {account.lines.map((l) => <option key={l} value={l}>{SERVICE_LINES[l]?.label || l}</option>)}
          </select>
        </Field>
        <Field label="Buying role">
          <select value={c.personaId || draft.persona || ''} onChange={(e) => setComposer({ ...c, personaId: e.target.value })} className={selectFull} aria-label="Buying role">
            {PERSONAS.map((p) => <option key={p.id} value={p.id}>{p.role}</option>)}
          </select>
        </Field>
        <Field label="Open on">
          <select value={c.triggerId} onChange={(e) => setComposer({ ...c, triggerId: e.target.value })} className={selectFull} aria-label="Trigger">
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
    </div>
  )
}

export function RecordEditor({ account, record, update }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
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
    </div>
  )
}

/** News items mentioning this account, straight from the live feed. */
export function AccountNews({ accountId }) {
  const [state, setState] = useState({ key: accountId, items: [], status: 'loading' })
  useEffect(() => {
    let alive = true
    fetch(`/api/news?entity=${encodeURIComponent(accountId)}&limit=8`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => { if (alive) setState({ key: accountId, items: j.items || [], status: 'ok' }) })
      .catch(() => { if (alive) setState({ key: accountId, items: [], status: 'unavailable' }) })
    return () => { alive = false }
  }, [accountId])
  if (state.key !== accountId || state.status === 'loading') return <p className="t-small text-ink-4 m-0">Loading the feed…</p>
  if (state.status === 'unavailable') return <p className="t-small text-ink-4 m-0">News feed unreachable.</p>
  if (!state.items.length) return <p className="t-small text-ink-4 m-0">Nothing in the feed mentions this account yet.</p>
  return (
    <div className="space-y-2">
      {state.items.map((n) => (
        <div key={n.id} className="flex items-baseline gap-2">
          <span className="t-micro font-mono text-ink-4 shrink-0 w-16">{String(n.publishedAt).slice(0, 10)}</span>
          <span className="min-w-0">
            <a href={n.url} target="_blank" rel="noreferrer" className="t-small text-ink-1 no-underline hover:text-accent">{n.title}</a>
            <span className="t-micro text-ink-4 ml-2">{n.source}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

export function Panel({ title, children, actions }) {
  return (
    <Card pad="lg">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="t-eyebrow text-ink-3">{title}</div>
        {actions}
      </div>
      {children}
    </Card>
  )
}
