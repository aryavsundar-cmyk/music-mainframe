/**
 * prospectDocs.js — prospecting deliverables on the shared block model, so the existing renderers export them to
 * Word, slides, text, Markdown and Gamma with no changes: target list · account brief · outreach sequence.
 * Everything is built from the scored accounts and the operator's own records — no figure is typed in here.
 */
import { finish, push } from './labDocs.js'
import { SEGMENT_BY_ID, lineLabel, hypothesesFor } from './prospect.js'
import { PERSONA_BY_ID } from '../data/personas.js'
import { STATUS_LABEL } from '../hooks/useProspectRecords.js'
import { fmtM, fmtPct } from './valuation.js'
import { LIMITS } from '../data/limits.js'

const NOTICE = `Prospecting figures are derived from the application's own sourced records, the live news feed and SEC filings. Relationship notes and outcomes are the operator's own and are held locally. ${LIMITS.match.claim}`
const asOf = () => new Date().toISOString().slice(0, 10)
const meta = { id: 'prospecting', title: 'Mainframe · Music', disclaimer: NOTICE, valuationDate: asOf() }

const scoreCell = (a) => `${a.score.total} (fit ${a.score.fit}, timing ${a.score.timing}, access ${a.score.access})`
const whyNow = (a) => (a.topTrigger ? `${a.topTrigger.date ? `${a.topTrigger.date} · ` : ''}${a.topTrigger.label}` : 'No dated trigger')

/** Target list — the week's call sheet, in priority order. */
export function buildTargetList(accounts, records = {}, opts = {}) {
  const S = []; const add = push(S)
  const rows = accounts.slice(0, opts.limit || 40)
  const tier = (t) => rows.filter((a) => a.score.tier === t)
  add('Summary', 'What this list covers', [
    { kind: 'stats', items: [
      { label: 'Accounts', value: String(rows.length) },
      { label: 'Tier A', value: String(tier('A').length) },
      { label: 'Tier B', value: String(tier('B').length) },
      { label: 'With a live trigger', value: String(rows.filter((a) => a.score.timing > 0).length) },
    ] },
    { kind: 'paragraph', text: `Accounts are scored out of 100 on fit (0–40), timing (0–40) and access (0–20). Tier A is 55 or above, or a live trigger with real access. ${opts.filterNote || 'Unfiltered, in score order.'}` },
  ])
  for (const t of ['A', 'B', 'C']) {
    const list = tier(t)
    if (!list.length) continue
    add(`Tier ${t}`, `${list.length} account${list.length === 1 ? '' : 's'}`, [
      { kind: 'table', columns: ['Account', 'Segment', 'Score', 'Why now', 'Status', 'Owner'], rows: list.map((a) => {
        const r = records[a.id] || {}
        return [a.name, SEGMENT_BY_ID[a.segment]?.label || a.segment, scoreCell(a), whyNow(a), STATUS_LABEL[r.status || 'new'], r.owner || '—']
      }) },
    ])
  }
  add('Notice', 'How to read this', [{ kind: 'note', text: NOTICE }])
  return finish(meta, 'target-list', 'Target list', S, `Prospecting · ${rows.length} accounts · ${asOf()}`)
}

/** Account brief — one page to read before the call. */
export function buildAccountBrief(account, draft, record = {}) {
  const S = []; const add = push(S)
  const drafted = draft && !draft.unavailable
  const persona = drafted ? PERSONA_BY_ID[draft.persona] : null
  add('Summary', account.name, [
    { kind: 'stats', items: [
      { label: 'Tier', value: account.score.tier },
      { label: 'Score', value: `${account.score.total}/100` },
      { label: 'Segment', value: SEGMENT_BY_ID[account.segment]?.label || account.segment },
      { label: 'Lead with', value: drafted ? `${draft.lineLabel} · ${persona?.role || '—'}` : draft?.lineLabel || '—' },
    ] },
    { kind: 'paragraph', text: account.summary || '' },
  ])
  add('Why it scores', 'Fit, timing and access', [
    { kind: 'facts', rows: [['Fit', `${account.score.fit}/40`], ['Timing', `${account.score.timing}/40`], ['Access', `${account.score.access}/20`]] },
    { kind: 'bullets', items: [...account.score.fitReasons, ...account.score.timingReasons.slice(0, 4), ...account.score.accessReasons] },
  ])
  if (account.triggers.length) add('Why now', 'Dated events worth opening on', [{ kind: 'table', columns: ['Date', 'Event'], rows: account.triggers.slice(0, 6).map((t) => [t.date || '—', t.label]) }])
  if (account.deals.length) add('Transactions', 'What they have done', [{ kind: 'table', columns: ['Date', 'Transaction', 'Type'], rows: account.deals.slice(0, 8).map((d) => [d.date, d.title, d.type]) }])
  const hyps = drafted ? hypothesesFor(account, draft.line).slice(0, 4) : []
  if (hyps.length) add('What we would do', lineLabel(draft.line), [{ kind: 'bullets', items: hyps.map((h) => h.text) }])
  if (drafted && persona) add('Opening', persona.role, [
    { kind: 'paragraph', text: `Opening question: ${persona.question}` },
    { kind: 'paragraph', text: `Proof point: ${persona.proof?.label || ''}` },
    { kind: 'paragraph', text: `Draft opening: ${draft.linkedinNote}` },
  ])
  if (record.note) add('Our record', `Status: ${STATUS_LABEL[record.status || 'new']}`, [{ kind: 'paragraph', text: record.note }])
  add('Notice', 'How to read this', [{ kind: 'note', text: NOTICE }])
  return finish(meta, 'account-brief', 'Account brief', S, `${account.name} · ${asOf()}`)
}

/** Outreach sequence — exactly what to send, and when. */
export function buildOutreachSequence(account, draft) {
  const S = []; const add = push(S)
  add('Plan', `${account.name} · ${draft.lineLabel}`, [
    { kind: 'table', columns: ['Day', 'Channel', 'Purpose'], rows: [['0', 'LinkedIn', 'Connection note referencing the trigger'], ['1', 'Email', 'The substantive note with the question'], ...draft.followUps.map((f) => [String(f.day), f.channel === 'email' ? 'Email' : 'LinkedIn', 'Follow-up'])] },
    { kind: 'paragraph', text: `Opening on: ${draft.triggerClause}.` },
  ])
  add('Day 0', 'LinkedIn connection note', [{ kind: 'paragraph', text: draft.linkedinNote }, { kind: 'note', text: `${draft.lengths.linkedinNote} characters — LinkedIn allows 300.` }])
  add('Day 1', `Email — ${draft.emailSubject}`, [{ kind: 'paragraph', text: draft.emailBody }])
  add('Also ready', 'LinkedIn message, if the connection is accepted', [{ kind: 'paragraph', text: draft.linkedinBody }])
  for (const f of draft.followUps) add(`Day ${f.day}`, f.channel === 'email' ? 'Email follow-up' : 'LinkedIn follow-up', [{ kind: 'paragraph', text: f.text }])
  add('Notice', 'How to use this', [{ kind: 'note', text: `${NOTICE} The module drafts; you send. Check every figure against the source before it goes out.` }])
  return finish(meta, 'outreach-sequence', 'Outreach sequence', S, `${account.name} · ${asOf()}`)
}

export const summaryLine = (accounts) => `${accounts.length} accounts · ${accounts.filter((a) => a.score.tier === 'A').length} Tier A · ${fmtPct(accounts.filter((a) => a.score.timing > 0).length / (accounts.length || 1), 0)} with a live trigger · top score ${accounts[0]?.score.total ?? 0}`
export const valueLine = (v) => fmtM(v, 0)
