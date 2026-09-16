#!/usr/bin/env node
/** test-outcomes.mjs — outcome tracking, its effect on scoring, and the limits the app must state. `npm run test:outcomes` */
import assert from 'node:assert/strict'
import { OUTCOMES, OUTCOME_BY_ID, conversionBy, funnel, latest, outcomeEffect, staleAccounts, STALE_DAYS } from '../src/utils/outcomes.js'
import { buildAccounts, scoreAccount } from '../src/utils/prospect.js'
import { LIMITS, LIMIT_LIST, limitNotice } from '../src/data/limits.js'
import { buildTargetList } from '../src/utils/prospectDocs.js'
import { buildBuyerShortlist, buildCatalogScan } from '../src/utils/marketDocs.js'
import { matchBuyers } from '../src/utils/buyerMatch.js'
import { scanCatalogs } from '../src/utils/catalogScan.js'
import { renderBriefText } from '../src/utils/briefText.js'
import fs from 'node:fs'

const TODAY = new Date('2026-09-16T00:00:00Z')
const day = (n) => new Date(+TODAY - n * 86400000).toISOString().slice(0, 10)
let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }
const accounts = buildAccounts({ today: TODAY })
const A = accounts[0].id

t('outcomes are well formed and ordered through the funnel', () => {
  for (const o of OUTCOMES) { assert.ok(o.label && o.note && o.stage >= 1); assert.ok(['none', 'engaged', 'won', 'cool', 'park'].includes(o.effect)) }
  assert.ok(OUTCOME_BY_ID.won.stage > OUTCOME_BY_ID.replied.stage)
})
t('the latest outcome is the one that counts', () => {
  const r = { outcomes: [{ kind: 'contacted', date: day(40) }, { kind: 'replied', date: day(10) }, { kind: 'no-reply', date: day(30) }] }
  assert.equal(latest(r).kind, 'replied')
})
t('engagement raises access; a recent loss cools timing', () => {
  const engaged = outcomeEffect({ outcomes: [{ kind: 'meeting', date: day(5) }] }, TODAY)
  assert.equal(engaged.accessBonus, 6)
  assert.equal(engaged.timingPenalty, 0)
  const lost = outcomeEffect({ outcomes: [{ kind: 'lost', date: day(20) }] }, TODAY)
  assert.equal(lost.timingPenalty, 12)
  assert.equal(lost.accessBonus, 0)
  const oldLoss = outcomeEffect({ outcomes: [{ kind: 'lost', date: day(300) }] }, TODAY)
  assert.equal(oldLoss.timingPenalty, 0, 'an old loss is not held against an account forever')
})
t('engagement decays: the same meeting counts for less a year later', () => {
  const fresh = outcomeEffect({ outcomes: [{ kind: 'proposal', date: day(10) }] }, TODAY).accessBonus
  const old = outcomeEffect({ outcomes: [{ kind: 'proposal', date: day(400) }] }, TODAY).accessBonus
  assert.ok(old < fresh && old > 0, `${old} should be positive but below ${fresh}`)
})
t('an account goes stale after 90 quiet days, unless it is parked', () => {
  assert.equal(outcomeEffect({ outcomes: [{ kind: 'contacted', date: day(STALE_DAYS + 1) }] }, TODAY).stale, true)
  assert.equal(outcomeEffect({ outcomes: [{ kind: 'contacted', date: day(10) }] }, TODAY).stale, false)
  assert.equal(outcomeEffect({ outcomes: [{ kind: 'won', date: day(300) }] }, TODAY).stale, false, 'a win is not staleness')
  const parked = outcomeEffect({ outcomes: [{ kind: 'not-now', date: day(120) }], parkedUntil: '2027-01-01' }, TODAY)
  assert.equal(parked.parked, true)
})
t('outcomes move the score and can park an account out of the priority tiers', () => {
  const base = accounts.find((a) => a.score.tier !== 'C')
  const engaged = scoreAccount(base, { today: TODAY, records: { [base.id]: { outcomes: [{ kind: 'meeting', date: day(7) }] } } })
  assert.ok(engaged.access > base.score.access, 'a meeting is evidence of access')
  const cooled = scoreAccount(base, { today: TODAY, records: { [base.id]: { outcomes: [{ kind: 'lost', date: day(14) }] } } })
  assert.ok(cooled.timing < base.score.timing, 'a fresh loss cools timing')
  const parked = scoreAccount(base, { today: TODAY, records: { [base.id]: { outcomes: [{ kind: 'not-now', date: day(5) }], parkedUntil: '2027-06-01' } } })
  assert.equal(parked.tier, 'C', 'a parked account leaves the priority tiers')
  assert.ok(parked.accessReasons.some((r) => r.includes('Parked')))
})
t('the funnel and conversion read the records', () => {
  const records = {
    [accounts[0].id]: { outcomes: [{ kind: 'contacted', date: day(30) }, { kind: 'replied', date: day(20) }, { kind: 'meeting', date: day(10) }] },
    [accounts[1].id]: { outcomes: [{ kind: 'contacted', date: day(25) }, { kind: 'no-reply', date: day(5) }] },
    [accounts[2].id]: { outcomes: [{ kind: 'proposal', date: day(15) }, { kind: 'won', date: day(2) }] },
  }
  const f = funnel(records)
  assert.equal(f.touched, 3)
  assert.equal(f.meetings, 2, 'a meeting, and a win that passed through one')
  assert.equal(f.won, 1)
  assert.ok(f.replyRate > 0 && f.replyRate <= 1)
  const by = conversionBy(accounts, records, 'segment')
  assert.equal(by.reduce((a, g) => a + g.touched, 0), 3)
  assert.equal(staleAccounts(accounts, records, TODAY).length, 0, 'everything here was touched recently')
})
t('the two limits exist once, and every screen and document carries them', () => {
  assert.equal(LIMIT_LIST.length, 2)
  assert.match(LIMITS.match.claim, /has done deals like yours, not that they are interested/)
  assert.match(LIMITS.availability.claim, /prompt to do work, not a claim that an asset is for sale/)
  assert.match(LIMITS.match.enforced, /credited with a deal they did not make/)
  assert.match(LIMITS.availability.enforced, /without the word appearing in the source/)
  assert.ok(limitNotice('match').includes(LIMITS.match.claim))

  const rows = scanCatalogs({ today: TODAY })
  const docs = [buildCatalogScan(rows.slice(0, 5)), buildBuyerShortlist(matchBuyers({ asset: 'both' }, { today: TODAY }).slice(0, 3), { asset: 'both' }), buildTargetList(accounts, {}, { limit: 5 })]
  for (const doc of docs) {
    const text = renderBriefText(doc).replace(/\s+/g, ' ')
    const needed = doc.slug.includes('target') ? [LIMITS.match.claim] : [LIMITS.match.claim, LIMITS.availability.claim]
    for (const claim of needed) assert.ok(text.includes(claim), `${doc.slug} does not state: ${claim}`)
  }
  // and the screens: the shared component is the only place the UI states them
  const note = fs.readFileSync(new URL('../src/components/prospecting/LimitNote.jsx', import.meta.url), 'utf8')
  assert.ok(note.includes("from '../../data/limits.js'"), 'the UI reads the limits from the single source')
  for (const page of ['BuyerMatch', 'CatalogScan', 'Prospecting', 'ProspectAccount']) {
    const src = fs.readFileSync(new URL(`../src/pages/${page}.jsx`, import.meta.url), 'utf8')
    assert.ok(/<LimitNote/.test(src), `${page} does not show the limits`)
  }
})

console.log(`\n${n} checks passed`)
console.log(`${OUTCOMES.length} outcomes · stale after ${STALE_DAYS} days · limits stated on 4 screens and in every export`)
