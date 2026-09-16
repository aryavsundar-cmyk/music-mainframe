#!/usr/bin/env node
/** test-prospect.mjs — asserts the prospecting engine and the outreach drafts. `npm run test:prospect` */
import assert from 'node:assert/strict'
import { buildAccounts, clauseForTransaction, coverage, hypothesesFor, recommendedLine, scoreAccount, segmentFor, sizeBand, triggerFeed, triggersFor, SEGMENTS, TIER_CUTS, TRIGGER_KINDS } from '../src/utils/prospect.js'
import { LIMITS, briefText, draftOutreach, trimWords, whenPhrase } from '../src/utils/outreach.js'
import { HOOKS, hookFor } from '../src/data/playbooks.js'
import { PERSONAS } from '../src/data/personas.js'
import { ENTITIES, getEntity } from '../src/data/entities.js'
import { TRANSACTIONS } from '../src/data/transactions.js'
import { SERVICE_LINES } from '../src/data/consulting.js'

const TODAY = new Date('2026-09-16T00:00:00Z')
let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }
const accounts = buildAccounts({ today: TODAY })
const byId = Object.fromEntries(accounts.map((a) => [a.id, a]))

t('every account lands in exactly one segment, and segments are exhaustive for sellable types', () => {
  for (const a of accounts) assert.equal(SEGMENTS.filter((s) => s.id === a.segment).length, 1, a.id)
  const uncovered = ENTITIES.filter((e) => e.status !== 'dissolved' && !segmentFor(e)).map((e) => e.type)
  assert.deepEqual([...new Set(uncovered)].sort(), ['sync', 'trade'], 'only trade bodies and sync agencies sit outside the selling map')
})
t('scores are bounded and components sum to the total', () => {
  for (const a of accounts) {
    const s = a.score
    assert.ok(s.fit >= 0 && s.fit <= 40, `fit ${a.id}`); assert.ok(s.timing >= 0 && s.timing <= 40, `timing ${a.id}`); assert.ok(s.access >= 0 && s.access <= 20, `access ${a.id}`)
    assert.equal(s.total, s.fit + s.timing + s.access, a.id)
    assert.ok(s.fitReasons.length, `${a.id} has no fit reasons`)
  }
})
t('tiering follows the published cuts', () => {
  for (const a of accounts) {
    const s = a.score
    const expected = s.total >= TIER_CUTS.a || (s.timing >= 20 && s.access >= 8) ? 'A' : s.total >= TIER_CUTS.b ? 'B' : 'C'
    assert.equal(s.tier, expected, a.id)
  }
  const A = accounts.filter((a) => a.score.tier === 'A').length
  assert.ok(A >= 1 && A <= 30, `Tier A should stay a week of calls, got ${A}`)
})
t('size bands read off the headline metric', () => {
  assert.equal(sizeBand({ metrics: { revenue: 2e9 } }).points, 8)
  assert.equal(sizeBand({ metrics: { revenue: 300e6 } }).points, 6)
  assert.equal(sizeBand({ metrics: { revenue: 60e6 } }).points, 4)
  assert.equal(sizeBand({ metrics: {} }).points, 0)
})
t('triggers decay: a deal inside six months scores full weight, one past its window scores none', () => {
  const fresh = triggersFor('umg', { today: new Date('2026-05-01T00:00:00Z') }).find((x) => x.kind === 'abs')
  assert.ok(fresh && fresh.weight > 11, 'recent ABS near full weight')
  const stale = triggersFor('umg', { today: new Date('2029-05-01T00:00:00Z') })
  assert.equal(stale.filter((x) => x.kind === 'abs').length, 0, 'nothing survives its window')
})
t('an anticipated repayment date in the future is a trigger; one in the past is not', () => {
  const near = triggersFor('umg', { today: new Date('2030-06-01T00:00:00Z') }).filter((x) => x.kind === 'ard')
  assert.ok(near.length, 'ARD inside 36 months counts')
  const after = triggersFor('umg', { today: new Date('2032-01-01T00:00:00Z') }).filter((x) => x.kind === 'ard')
  assert.equal(after.length, 0, 'a passed ARD is not a trigger')
})
t('a sponsor inherits its portfolio company\'s deal at reduced weight', () => {
  const pf = accounts.flatMap((a) => a.triggers).filter((x) => x.kind === 'portfolio')
  assert.ok(pf.length, 'portfolio triggers exist')
  for (const x of pf) assert.ok(x.weight <= 7, 'portfolio weight never exceeds a direct deal')
})
t('news signals raise timing and can promote a tier', () => {
  const quiet = buildAccounts({ today: TODAY })
  const loud = buildAccounts({ today: TODAY, signals: Object.fromEntries(quiet.map((a) => [a.id, 5])) })
  const a = quiet.find((x) => x.score.timing < 30)
  const b = loud.find((x) => x.id === a.id)
  assert.ok(b.score.timing > a.score.timing, 'signals add timing')
  assert.ok(loud.filter((x) => x.score.tier !== 'C').length > quiet.filter((x) => x.score.tier !== 'C').length)
})
t('recorded relationships are the only thing that moves access beyond coverage overlap', () => {
  const base = byId['primary-wave']
  assert.equal(base.score.access, 0, 'no relationship on file, no Hub overlap')
  const withRel = scoreAccount(base, { records: { 'primary-wave': { access: 'strong' } } })
  assert.equal(withRel.access, 12)
  assert.ok(withRel.accessReasons.some((r) => r.includes('strong')))
})
t('coverage totals reconcile to the account list', () => {
  const c = coverage(accounts, {})
  assert.equal(c.totals.accounts, accounts.length)
  assert.equal(c.totals.A + c.totals.B + c.totals.C, accounts.length)
  assert.equal(c.totals.priority, c.totals.A + c.totals.B)
  const worked = coverage(accounts, { umg: { status: 'contacted' } })
  assert.equal(worked.totals.worked, byId.umg.score.tier === 'C' ? 0 : 1)
})
t('transaction clauses are written from the account\'s side, not recycled headlines', () => {
  const kobalt = TRANSACTIONS.find((x) => x.title.includes('Kobalt'))
  assert.equal(clauseForTransaction(kobalt, 'primary-wave'), 'your acquisition of Kobalt Music Group')
  assert.equal(clauseForTransaction(kobalt, 'francisco-partners'), 'your sale to Primary Wave Music')
  const abs = TRANSACTIONS.find((x) => x.type === 'abs' && x.abs?.issuer)
  assert.match(clauseForTransaction(abs, abs.sellers[0].entityId), /^your \$\d+M securitisation/)
})
t('every segment and line pairing the recommender can produce has a hook', () => {
  for (const a of accounts) {
    const line = recommendedLine(a)
    assert.ok(hookFor(a.segment, line), `${a.segment} × ${line} (${a.id})`)
  }
})
t('hooks and personas are well formed', () => {
  for (const h of HOOKS) {
    assert.ok(SERVICE_LINES[h.line], h.line)
    assert.ok(SEGMENTS.some((s) => s.id === h.segment), h.segment)
    assert.ok(PERSONAS.some((p) => p.id === h.persona), h.persona)
    assert.ok(h.subject && h.subject.length <= 60, `subject too long: ${h.subject}`)
    assert.ok(h.claim && h.evidence && h.ask)
  }
  for (const p of PERSONAS) { assert.ok(p.question.endsWith('?')); assert.ok(p.proof.case && p.proof.label) }
})
t('drafts respect every channel limit', () => {
  for (const a of accounts) {
    const d = draftOutreach(a, { line: recommendedLine(a), sender: 'A. Operator' })
    assert.ok(d.lengths.linkedinNote <= LIMITS.linkedinNote, `${a.id} note ${d.lengths.linkedinNote}`)
    assert.ok(d.lengths.linkedinSubject <= LIMITS.linkedinSubject, a.id)
    assert.ok(d.lengths.emailSubject <= LIMITS.emailSubject, a.id)
    assert.ok(d.lengths.emailBody <= LIMITS.emailBody, a.id)
    assert.ok(d.followUps.length === 2)
  }
})
t('drafts never leak an unresolved token or an invented name', () => {
  for (const a of accounts) {
    const d = draftOutreach(a, { line: recommendedLine(a) })
    const all = [d.linkedinNote, d.linkedinBody, d.emailSubject, d.emailBody, ...d.followUps.map((f) => f.text)].join('\n')
    assert.ok(!/\{\w+\}/.test(all), `${a.id} has an unfilled token`)
    assert.ok(!/undefined|NaN|\[object/.test(all), `${a.id} has a broken value`)
    assert.ok(!/Dear [A-Z]/.test(all), `${a.id} addresses a person the app does not know`)
  }
})
t('an account with no trigger is drafted from sector context, with a warning', () => {
  const quiet = accounts.find((a) => !a.topTrigger)
  const d = draftOutreach(quiet, { line: recommendedLine(quiet) })
  assert.ok(d.warnings.some((w) => w.includes('No live trigger')))
  assert.ok(d.linkedinNote.includes('your position in'))
})
t('the trigger picked is the one the draft opens on', () => {
  const a = byId.umg
  const alt = a.triggers[1] || a.triggers[0]
  const d = draftOutreach(a, { line: recommendedLine(a), trigger: alt })
  assert.equal(d.trigger.id, alt.id)
  assert.ok(d.emailBody.includes(d.triggerClause.slice(0, 20)))
})
t('the recommended line follows the live trigger when the segment sells it', () => {
  const a = accounts.find((x) => x.topTrigger?.kind === 'm&a' && x.lines.includes('pmi') && hypothesesFor(x, 'pmi').length)
  if (a) assert.equal(recommendedLine(a), 'pmi', a.id)
})
t('dates read as words, and subjects trim on a word boundary', () => {
  assert.equal(whenPhrase('2026-04'), ' in April')
  assert.equal(whenPhrase('2025-07'), ' in July 2025')
  assert.equal(trimWords('Universal Music Group separation readiness', 20), 'Universal Music…')
})
t('the brief carries the score, the triggers, and both drafts', () => {
  const a = byId.umg
  const d = draftOutreach(a, { line: recommendedLine(a) })
  const b = briefText(a, d)
  assert.ok(b.includes(a.name) && b.includes('Why now') && b.includes('LinkedIn note') && b.includes('Subject:'))
  assert.ok(b.includes(String(a.score.total)))
})
t('the trigger feed lists dated events only, deadlines ahead first', () => {
  const feed = triggerFeed(accounts, { today: TODAY })
  assert.ok(feed.length > 50, `feed has ${feed.length} items`)
  assert.equal(feed.filter((f) => f.kind === 'signal').length, 0, 'news signals move the score but are not events')
  const firstRecent = feed.findIndex((f) => f.when === 'recent')
  assert.ok(feed.slice(0, firstRecent).every((f) => f.when === 'ahead'), 'deadlines ahead come first')
  const recent = feed.slice(firstRecent)
  for (let i = 1; i < recent.length; i++) assert.ok(recent[i].monthsAway >= recent[i - 1].monthsAway, 'recent events run newest first')
  for (const f of feed) assert.ok(f.account && f.account.id, 'every feed row carries its account')
})
t('the feed filters by kind, segment and tier, and honours a limit', () => {
  const abs = triggerFeed(accounts, { today: TODAY, kind: 'abs' })
  assert.ok(abs.length && abs.every((f) => f.kind === 'abs'))
  const societies = triggerFeed(accounts, { today: TODAY, segment: 'societies' })
  assert.ok(societies.every((f) => f.account.segment === 'societies'))
  const tierA = triggerFeed(accounts, { today: TODAY, tier: 'A' })
  assert.ok(tierA.every((f) => f.account.score.tier === 'A'))
  assert.equal(triggerFeed(accounts, { today: TODAY, limit: 7 }).length, 7)
})
t('a trigger past its decay window drops off the feed', () => {
  const now = triggerFeed(accounts, { today: TODAY }).filter((f) => f.kind === 'm&a').length
  const later = triggerFeed(buildAccounts({ today: new Date('2029-09-16T00:00:00Z') }), { today: new Date('2029-09-16T00:00:00Z') }).filter((f) => f.kind === 'm&a').length
  assert.ok(now > 0 && later === 0, `m&a triggers: ${now} today, ${later} three years on`)
})
t('an anticipated repayment date shows as a deadline ahead inside its window', () => {
  const ahead = triggerFeed(accounts, { today: TODAY, kind: 'ard' })
  assert.ok(ahead.length, 'ARDs inside the window are listed')
  assert.ok(ahead.every((f) => f.when === 'ahead'), 'a future date is never filed as recent')
  assert.ok(TRIGGER_KINDS.ard.window >= 36, 'refinancing conversations start years out')
})
t('scoring is deterministic for a fixed clock', () => {
  const again = buildAccounts({ today: TODAY })
  assert.deepEqual(again.map((a) => `${a.id}:${a.score.total}`), accounts.map((a) => `${a.id}:${a.score.total}`))
})

const cov = coverage(accounts, {})
console.log(`\n${n} checks passed`)
console.log(`${accounts.length} accounts · Tier A ${cov.totals.A} · Tier B ${cov.totals.B} · with a live trigger ${accounts.filter((a) => a.score.timing > 0).length}`)
console.log(`top five: ${accounts.slice(0, 5).map((a) => `${a.short || a.name} ${a.score.total}`).join(' · ')}`)
console.log(`trigger feed ${triggerFeed(accounts, { today: TODAY }).length} events · ${triggerFeed(accounts, { today: TODAY }).filter((f) => f.when === 'ahead').length} deadlines ahead`)
console.log(`hooks ${HOOKS.length} across ${new Set(HOOKS.map((h) => h.segment)).size} segments · personas ${PERSONAS.length} · entities out of scope: ${ENTITIES.filter((e) => !segmentFor(e)).length} (${[...new Set(ENTITIES.filter((e) => !segmentFor(e)).map((e) => e.type))].join(', ')})`)
console.log(`sample: ${getEntity('umg').name} → ${draftOutreach(byId.umg, { line: recommendedLine(byId.umg) }).emailSubject}`)
