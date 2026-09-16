/**
 * outreach.js — turns an account, a trigger and a hook into copy-ready drafts for the two channels the operator
 * actually sends from: LinkedIn and email. Pure and Node-tested (scripts/test-prospect.mjs).
 *
 * The module drafts; it never sends. Drafts carry no invented names, titles or figures: every number comes from a
 * sourced record in the app, and the persona is a role, not a person. Length limits are checked, not assumed.
 */
import { PERSONA_BY_ID } from '../data/personas.js'
import { HOOKS, hookFor } from '../data/playbooks.js'
import { SEGMENT_BY_ID, lineLabel } from './prospect.js'

/** Practical channel limits. LinkedIn rejects a connection note over 300 characters outright. */
export const LIMITS = { linkedinNote: 300, linkedinSubject: 200, linkedinBody: 1900, emailSubject: 78, emailBody: 2200 }

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export function whenPhrase(date) {
  if (!date) return ''
  const [y, m] = String(date).split('-')
  if (!m) return ` in ${y}`
  return ` in ${MONTHS[Number(m) - 1]}${Number(y) === new Date().getFullYear() ? '' : ` ${y}`}`
}

/** A short, factual clause naming why we are writing now. Falls back to the account's sector when nothing is live. */
export function triggerClause(account, trigger) {
  if (!trigger) return `your position in ${SEGMENT_BY_ID[account.segment]?.label.toLowerCase() || 'music rights'}`
  const when = whenPhrase(trigger.date)
  if (trigger.clause) return `${trigger.clause}${trigger.kind === 'reform' ? '' : when}`
  const strip = (t) => String(t).replace(/\.\s*$/, '').trim()
  // an event the account is party to reads as "your …", not as news about someone else
  const mine = (t) => {
    const names = [account.name, account.short].filter(Boolean)
    for (const n of names) {
      const re = new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[’']?s?\\s*`, 'i')
      if (re.test(t)) return `your ${t.replace(re, '')}`
    }
    return t
  }
  switch (trigger.kind) {
    case 'ard': return strip(trigger.label).replace(/^Anticipated repayment date (\S+) — /, (m, d) => `the anticipated repayment date in ${d} on `)
    case 'signal': return `what has been running in the trades about ${account.short || account.name}`
    case 'portfolio': return `${strip(trigger.label).replace(/^Portfolio activity at ([^:]+): /, (m, who) => `the transaction at ${who} — `)}${when}`
    case 'reform': return `${strip(trigger.label).replace(/^Reform milestone: /, '')}`
    default: return `${mine(strip(trigger.label).replace(/^[^:]+: /, ''))}${when}`
  }
}

const tidy = (s) => s.replace(/\s+/g, ' ').trim()
const fill = (s, account, clause) => tidy(String(s || '').replace(/\{name\}/g, account.short || account.name).replace(/\{trigger\}/g, clause))

/** Trim to a limit on a sentence boundary where possible, so nothing reads as cut off. */
/** Trim to a limit on a word boundary — for subjects, where a mid-word ellipsis looks careless. */
export function trimWords(text, limit) {
  if (text.length <= limit) return text
  const cut = text.slice(0, limit - 1)
  const sp = cut.lastIndexOf(' ')
  return `${(sp > limit * 0.5 ? cut.slice(0, sp) : cut).replace(/[\s,;:—-]+$/, '')}…`
}

export function trimTo(text, limit) {
  if (text.length <= limit) return text
  const cut = text.slice(0, limit - 1)
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '))
  return (stop > limit * 0.5 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`).trim()
}

/**
 * draftOutreach(account, opts) → drafts for LinkedIn and email plus two follow-ups.
 * opts: { line, persona, trigger, sender } — all optional; sensible defaults come from the account.
 */
export function draftOutreach(account, opts = {}) {
  // In an edition without the authored hooks and personas there is nothing honest to draft, so say so rather
  // than assembling sentences out of empty strings.
  if (!HOOKS.length && !Object.keys(PERSONA_BY_ID).length) {
    return {
      account: account.id, unavailable: true, line: opts.line || account.lines[0], lineLabel: lineLabel(opts.line || account.lines[0]),
      persona: null, personaRole: null, trigger: opts.trigger === undefined ? account.topTrigger : opts.trigger,
      triggerClause: triggerClause(account, opts.trigger === undefined ? account.topTrigger : opts.trigger), hookVersion: null,
      linkedinNote: '', linkedinSubject: '', linkedinBody: '', emailSubject: '', emailBody: '', followUps: [],
      warnings: ['Message drafting is not part of this edition — the personas and hooks it needs are authored material.'],
      lengths: { linkedinNote: 0, linkedinSubject: 0, linkedinBody: 0, emailSubject: 0, emailBody: 0 },
    }
  }
  const asked = opts.line || account.lines[0]
  const hook = hookFor(account.segment, asked)
  // fall back honestly: if no hook is written for the asked line, report the line the hook actually speaks to
  const line = hook?.line || asked
  const persona = PERSONA_BY_ID[opts.persona || hook?.persona || account.personas[0]]
  const trigger = opts.trigger === undefined ? account.topTrigger : opts.trigger
  const clause = triggerClause(account, trigger)
  const name = account.short || account.name
  const sender = opts.sender || ''

  const claim = fill(hook?.claim, account, clause)
  const evidence = fill(hook?.evidence, account, clause)
  const ask = fill(hook?.ask, account, clause)
  const question = persona?.question || ''
  const proof = persona?.proof ? `We have run this end to end — ${persona.proof.label}.` : ''

  const noteFull = tidy(`Following ${clause}. ${claim} ${ask}`)
  const linkedinNote = trimTo(noteFull, LIMITS.linkedinNote)

  const subject = hook?.subject || lineLabel(line).toLowerCase()
  const linkedinSubject = trimWords(`${name} — ${subject}`, LIMITS.linkedinSubject)
  const linkedinBody = trimTo(tidy([
    `I follow ${name} through our music-rights coverage, and I am writing because of ${clause}.`,
    claim,
    evidence,
    `The question I would put first: ${question}`,
    ask,
  ].join('\n\n')).replace(/ \n/g, '\n'), LIMITS.linkedinBody)

  const emailSubject = trimWords(`${name} — ${subject}`, LIMITS.emailSubject)
  const emailBody = trimTo([
    `Hello,`,
    `I lead music-rights work in our private-equity performance improvement practice, and I am writing because of ${clause}.`,
    `${claim} ${evidence}`,
    proof,
    `${ask} If it is easier, I can send a one-page view of how we would approach it at ${name} first.`,
    sender ? `Best regards,\n${sender}` : 'Best regards,',
  ].filter(Boolean).join('\n\n'), LIMITS.emailBody)

  const followUps = [
    { day: 4, channel: 'email', text: trimTo(tidy(`Following up on ${clause}. The single question worth thirty minutes: ${question} If the timing is wrong, tell me when to come back.`), 600) },
    { day: 11, channel: 'linkedin', text: trimTo(tidy(`Last note from me on this. ${claim} If ${name} is already on top of it, I would still value hearing how you are approaching it.`), 600) },
  ]

  const warnings = []
  if (!hook) warnings.push(`No hook written yet for ${account.segment} — drafts fall back to sector context.`)
  else if (line !== asked) warnings.push(`No hook written yet for ${lineLabel(asked)} in this segment; drafting the ${lineLabel(line)} hook instead.`)
  if (!trigger) warnings.push('No live trigger for this account: the opening leans on sector context, which reads weaker. Consider waiting for a signal.')
  if (noteFull.length > LIMITS.linkedinNote) warnings.push(`Connection note trimmed to LinkedIn's ${LIMITS.linkedinNote}-character limit — check it still reads as a whole thought.`)

  return {
    account: account.id, line, lineLabel: lineLabel(line), persona: persona?.id, personaRole: persona?.role,
    trigger, triggerClause: clause, hookVersion: hook?.version ?? null,
    linkedinNote, linkedinSubject, linkedinBody, emailSubject, emailBody, followUps, warnings,
    lengths: { linkedinNote: linkedinNote.length, linkedinSubject: linkedinSubject.length, linkedinBody: linkedinBody.length, emailSubject: emailSubject.length, emailBody: emailBody.length },
  }
}

/** Plain-text account brief for pasting into notes or a CRM. */
export function briefText(account, draft) {
  if (draft?.unavailable) return publicBrief(account)
  const L = []
  L.push(`${account.name} — ${SEGMENT_BY_ID[account.segment]?.label}`)
  L.push(`Score ${account.score.total}/100 (fit ${account.score.fit}, timing ${account.score.timing}, access ${account.score.access}) · Tier ${account.score.tier}`)
  L.push('')
  L.push('Why now')
  for (const t of account.triggers.slice(0, 4)) L.push(`- ${t.date ? `${t.date} · ` : ''}${t.label}`)
  if (!account.triggers.length) L.push('- No dated trigger on file')
  L.push('')
  L.push(`Lead with: ${draft.lineLabel} · ${draft.personaRole}`)
  L.push(`Opening question: ${PERSONA_BY_ID[draft.persona]?.question || ''}`)
  L.push('')
  L.push('LinkedIn note')
  L.push(draft.linkedinNote)
  L.push('')
  L.push('Email')
  L.push(`Subject: ${draft.emailSubject}`)
  L.push(draft.emailBody)
  return L.join('\n')
}

/** The same brief without any authored material: what the record says, and why it scores. */
export function publicBrief(account) {
  const L = []
  L.push(`${account.name} — ${SEGMENT_BY_ID[account.segment]?.label}`)
  L.push(`Score ${account.score.total}/100 (fit ${account.score.fit}, timing ${account.score.timing}, access ${account.score.access}) · Tier ${account.score.tier}`)
  L.push('')
  L.push('Why it scores')
  for (const r of [...account.score.fitReasons, ...account.score.timingReasons.slice(0, 4), ...account.score.accessReasons]) L.push(`- ${r}`)
  L.push('')
  L.push('Why now')
  for (const t of account.triggers.slice(0, 5)) L.push(`- ${t.date ? `${t.date} · ` : ''}${t.label}`)
  if (!account.triggers.length) L.push('- No dated trigger on file')
  return L.join('\n')
}
