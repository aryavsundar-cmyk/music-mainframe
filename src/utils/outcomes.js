/**
 * outcomes.js — what happened after the outreach, and what that does to the score.
 * Pure functions, Node-testable (scripts/test-outcomes.mjs). Outcomes live in the operator's own local records.
 */
import { num } from './valuation.js'

/** The stages worth recording. `stage` orders the funnel; `effect` is what it does to future scoring. */
export const OUTCOMES = [
  { id: 'contacted', label: 'Contacted', stage: 1, effect: 'none', note: 'Sent, no reply yet.' },
  { id: 'replied', label: 'Replied', stage: 2, effect: 'engaged', note: 'They wrote back — a relationship now exists.' },
  { id: 'meeting', label: 'Meeting held', stage: 3, effect: 'engaged', note: 'A conversation happened.' },
  { id: 'proposal', label: 'Proposal sent', stage: 4, effect: 'engaged', note: 'Scope and fee are with them.' },
  { id: 'won', label: 'Won', stage: 5, effect: 'won', note: 'Engaged. Stop prospecting and start delivering.' },
  { id: 'lost', label: 'Lost', stage: 5, effect: 'cool', note: 'They chose someone else or stopped the process.' },
  { id: 'no-reply', label: 'No reply', stage: 1, effect: 'cool', note: 'Nothing came back after the sequence.' },
  { id: 'not-now', label: 'Not now', stage: 2, effect: 'park', note: 'Interested in principle, wrong moment.' },
]
export const OUTCOME_BY_ID = Object.fromEntries(OUTCOMES.map((o) => [o.id, o]))

export const STALE_DAYS = 90
const days = (a, b) => Math.round((b - a) / 86400000)
const parse = (d) => { const t = Date.parse(`${d}T00:00:00Z`); return Number.isNaN(t) ? null : new Date(t) }

/** The most recent outcome on a record, if any. */
export function latest(record = {}) {
  const list = (record.outcomes || []).filter((o) => OUTCOME_BY_ID[o.kind])
  if (!list.length) return null
  return [...list].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0]
}

/**
 * What the record does to scoring. Engagement is evidence of access; a recent loss or silence cools timing;
 * "not now" parks the account until the date the operator set. Nothing here is permanent.
 */
export function outcomeEffect(record = {}, today = new Date()) {
  const last = latest(record)
  if (!last) return { accessBonus: 0, timingPenalty: 0, parked: false, stale: false, reasons: [], lastTouch: null, sinceDays: null }
  const when = parse(last.date) || today
  const since = Math.max(0, days(when, today))
  const o = OUTCOME_BY_ID[last.kind]
  const reasons = []
  let accessBonus = 0
  let timingPenalty = 0

  if (o.effect === 'engaged') {
    accessBonus = last.kind === 'proposal' ? 8 : last.kind === 'meeting' ? 6 : 4
    if (since > 180) { accessBonus = Math.round(accessBonus / 2); reasons.push(`${o.label} but ${Math.round(since / 30)} months ago — half credit (+${accessBonus})`) }
    else reasons.push(`${o.label} ${since === 0 ? 'today' : `${since} days ago`} (+${accessBonus})`)
  }
  if (o.effect === 'won') { accessBonus = 10; reasons.push(`Won — the strongest access there is (+10)`) }
  if (o.effect === 'cool') {
    timingPenalty = since <= 90 ? 12 : since <= 180 ? 6 : 0
    if (timingPenalty) reasons.push(`${o.label} ${since} days ago — timing cooled (−${timingPenalty})`)
    else reasons.push(`${o.label}, but that was ${Math.round(since / 30)} months ago — no longer held against it`)
  }
  const parkedUntil = last.kind === 'not-now' ? (record.parkedUntil || '') : ''
  const parked = !!parkedUntil && (parse(parkedUntil) || today) > today
  if (parked) reasons.push(`Parked until ${parkedUntil} at their request`)

  return { accessBonus, timingPenalty, parked, parkedUntil, stale: since >= STALE_DAYS && o.effect !== 'won', reasons, lastTouch: last, sinceDays: since }
}

/**
 * Counts across the book, by the furthest stage each account reached — an account that logged a proposal and
 * then a win is one account, not two.
 */
export function funnel(records = {}) {
  const counts = Object.fromEntries(OUTCOMES.map((o) => [o.id, 0]))
  let touched = 0
  const reached = { contacted: 0, replied: 0, meetings: 0, proposals: 0, won: 0, lost: 0 }
  for (const r of Object.values(records)) {
    const list = (r.outcomes || []).filter((o) => OUTCOME_BY_ID[o.kind])
    if (!list.length) continue
    touched += 1
    const kinds = new Set(list.map((o) => o.kind))
    for (const k of kinds) counts[k] += 1
    const won = kinds.has('won')
    const proposal = won || kinds.has('proposal')
    const meeting = proposal || kinds.has('meeting')
    const replied = meeting || kinds.has('replied')
    reached.contacted += 1
    if (replied) reached.replied += 1
    if (meeting) reached.meetings += 1
    if (proposal) reached.proposals += 1
    if (won) reached.won += 1
    if (kinds.has('lost')) reached.lost += 1
  }
  return {
    touched, counts, ...reached,
    replyRate: reached.contacted ? reached.replied / reached.contacted : null,
    meetingRate: reached.contacted ? reached.meetings / reached.contacted : null,
    winRate: reached.proposals ? reached.won / reached.proposals : null,
  }
}

/** Conversion by any grouping of accounts — segment, service line, tier. */
export function conversionBy(accounts, records = {}, key = 'segment') {
  const groups = {}
  for (const a of accounts) {
    const r = records[a.id]
    if (!r?.outcomes?.length) continue
    const k = typeof key === 'function' ? key(a) : a[key]
    const g = (groups[k] = groups[k] || { key: k, touched: 0, replied: 0, meetings: 0, won: 0 })
    g.touched += 1
    const kinds = new Set(r.outcomes.map((o) => o.kind))
    if (kinds.has('replied') || kinds.has('meeting') || kinds.has('proposal') || kinds.has('won')) g.replied += 1
    if (kinds.has('meeting') || kinds.has('proposal') || kinds.has('won')) g.meetings += 1
    if (kinds.has('won')) g.won += 1
  }
  return Object.values(groups).map((g) => ({ ...g, replyRate: g.touched ? g.replied / g.touched : 0 })).sort((a, b) => b.touched - a.touched)
}

/** Accounts that have gone quiet: worked once, nothing since, and not deliberately parked. */
export function staleAccounts(accounts, records = {}, today = new Date()) {
  return accounts
    .map((a) => ({ account: a, effect: outcomeEffect(records[a.id] || {}, today) }))
    .filter((x) => x.effect.stale && !x.effect.parked)
    .sort((a, b) => b.effect.sinceDays - a.effect.sinceDays)
}

export const outcomeDate = (d) => (d ? String(d).slice(0, 10) : new Date().toISOString().slice(0, 10))
export const asNumber = num
