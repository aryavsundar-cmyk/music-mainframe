#!/usr/bin/env node
/**
 * test-changes.mjs — the change feed, the figure log behind it, and the page guide.
 * `npm run test:changes`
 *
 * The feed's failure mode is not a wrong item: it is an empty day that reads as a quiet one. Most of these
 * checks are about coverage — what a window could not have shown — and about the log recording only what really
 * moved. The last ones hold the manual to the app: a page without a guide entry fails here.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { diffCompany, diffAll, appendChanges, MAX_ENTRIES } from '../src/utils/figureChanges.js'
import { collectChanges, byDay, countByKind, coverageOf, windowStart, KIND_LIST, WINDOWS, leadsFiling, DEFAULT_KINDS } from '../src/utils/changes.js'
import { readLists, toggleInList, addList, removeList, isWatched, DEFAULT_LIST } from '../src/utils/watchlist.js'
import { PAGE_GUIDE, guideFor, WORKFLOWS, CONVENTIONS } from '../src/data/pageGuide.js'
import { TRANSACTIONS } from '../src/data/transactions.js'
import { ENTITIES } from '../src/data/entities.js'
import { EDITIONS, EDITION, has } from '../src/editions.js'

let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }
const APP = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const fig = (end, value, filed, form = '10-Q') => ({ value, currency: 'USD', end, form, filed, accn: `000-${filed}` })
const rec = (metrics) => ({ metrics })

t('the log records a newer period and a restatement, and nothing else', () => {
  const before = rec({ revenue: { annual: fig('2025-12-31', 100, '2026-02-01', '10-K'), quarter: fig('2026-03-31', 25, '2026-05-01') } })
  const after = rec({ revenue: { annual: fig('2025-12-31', 100, '2026-02-01', '10-K'), quarter: fig('2026-06-30', 27, '2026-08-01') } })
  const moved = diffCompany(before, after, { entityId: 'x', now: '2026-08-02T06:47:00Z' })
  assert.equal(moved.length, 1)
  assert.deepEqual([moved[0].kind, moved[0].slot, moved[0].to.value], ['new-period', 'quarter', 27])
  const restated = diffCompany(before, rec({ revenue: { ...before.metrics.revenue, annual: fig('2025-12-31', 104, '2026-05-01', '10-K/A') } }), { entityId: 'x' })
  assert.equal(restated.length, 1)
  assert.deepEqual([restated[0].kind, restated[0].from.value, restated[0].to.value], ['restated', 100, 104])
  assert.deepEqual(diffCompany(before, before, { entityId: 'x' }), [], 'an unchanged refresh records nothing')
})

t('a figure appearing for the first time is not a change', () => {
  assert.deepEqual(diffCompany(null, rec({ revenue: { annual: fig('2025-12-31', 100, '2026-02-01') } }), { entityId: 'new' }), [], 'a company entering the file is not "a change" for every figure it has')
  const before = rec({ revenue: { annual: fig('2025-12-31', 100, '2026-02-01') } })
  const after = rec({ revenue: before.metrics.revenue, operatingCashFlow: { annual: fig('2025-12-31', 30, '2026-02-01') } })
  assert.deepEqual(diffCompany(before, after, { entityId: 'x' }), [], 'adding a new concept must not report every company at once')
})

t('the log is append-only, capped, and keeps the day it began', () => {
  const first = appendChanges(null, [{ at: '2026-01-01T00:00:00Z', entityId: 'a' }], { now: '2026-01-01T00:00:00Z' })
  assert.equal(first.startedAt, '2026-01-01T00:00:00Z')
  const second = appendChanges(first, [{ at: '2026-01-02T00:00:00Z', entityId: 'b' }], { now: '2026-01-02T00:00:00Z' })
  assert.equal(second.startedAt, '2026-01-01T00:00:00Z', 'the start date never moves')
  assert.deepEqual(second.entries.map((e) => e.entityId), ['b', 'a'], 'newest first')
  const many = appendChanges({ startedAt: 'x', entries: Array.from({ length: MAX_ENTRIES }, (_, i) => ({ i })) }, [{ i: 'new' }])
  assert.equal(many.entries.length, MAX_ENTRIES)
  assert.equal(many.entries[0].i, 'new', 'the newest survives the cap; the oldest falls off')
  const quiet = appendChanges(second, [], { now: '2026-01-03T00:00:00Z' })
  assert.equal(quiet.updatedAt, second.updatedAt, 'a refresh that moved nothing does not restamp the log')
})

t('diffAll walks every company in the new file', () => {
  const before = { a: rec({ revenue: { annual: fig('2024-12-31', 1, '2025-02-01') } }), b: rec({ revenue: { annual: fig('2024-12-31', 2, '2025-02-01') } }) }
  const after = { a: rec({ revenue: { annual: fig('2025-12-31', 3, '2026-02-01') } }), b: before.b }
  const moved = diffAll(before, after)
  assert.deepEqual(moved.map((m) => m.entityId), ['a'])
})

t('the feed holds the window, and every kind reaches it', () => {
  const deal = TRANSACTIONS.find((d) => d.date >= '2026-01-01')
  const { items } = collectChanges({
    since: '2026-09-01',
    until: '2026-09-30',
    deals: [deal],
    milestones: [],
    filings: [{ id: 'f1', entityId: 'wmg', company: 'Warner Music Group', form: '8-K', formLabel: 'Material event', weight: 8, filed: '2026-09-04', note: 'x', url: 'https://sec.gov/x' }],
    figures: [{ at: '2026-09-05T06:00:00Z', entityId: 'wmg', metric: 'revenue', slot: 'quarter', kind: 'new-period', from: fig('2026-03-31', 1, '2026-05-01'), to: fig('2026-06-30', 1.86e9, '2026-08-05') }],
    news: [{ id: 'n1', title: 'A story', publishedAt: '2026-09-10T08:00:00Z', entities: ['wmg'], url: 'https://x.test', source: 'MBW' }],
  })
  assert.deepEqual(new Set(items.map((i) => i.kind)), new Set(['deal', 'filing', 'figure', 'news']))
  assert.ok(items.every((i) => i.at >= '2026-09-01' && i.at <= '2026-09-30'), 'nothing outside the window')
  assert.deepEqual(items.map((i) => i.at), [...items.map((i) => i.at)].sort().reverse(), 'newest first')
  const figure = items.find((i) => i.kind === 'figure')
  assert.match(figure.title, /Revenue, quarter to 30 Jun 2026: \$1\.86B/)
  assert.match(figure.detail, /10-Q filed 5 Aug 2026/)
  const counts = countByKind(items)
  assert.equal(counts.figure, 1)
  assert.equal(counts.milestone, 0, 'a kind with nothing in it counts zero rather than disappearing')
  assert.equal(byDay(items).reduce((a, d) => a + d.items.length, 0), items.length)
})

t('a restatement says what it was and what it became', () => {
  const { items } = collectChanges({
    since: '2026-09-01',
    deals: [], milestones: [],
    figures: [{ at: '2026-09-05T06:00:00Z', entityId: 'wmg', metric: 'revenue', slot: 'annual', kind: 'restated', from: fig('2025-09-30', 6.7e9, '2025-11-20', '10-K'), to: fig('2025-09-30', 6.8e9, '2026-02-01', '10-K/A') }],
  })
  assert.match(items[0].title, /restated for the year to 30 Sep 2025: \$6\.70B → \$6\.80B/)
})

t('a watchlist narrows every kind, including deals by their parties', () => {
  const deal = TRANSACTIONS.find((d) => [...(d.acquirers || []), ...(d.sellers || [])].some((p) => p.entityId))
  const party = [...(deal.acquirers || []), ...(deal.sellers || [])].find((p) => p.entityId).entityId
  const args = { since: '2000-01-01', deals: [deal], milestones: [], news: [{ id: 'n', title: 'x', publishedAt: `${deal.date}T00:00:00Z`, entities: ['spotify'] }] }
  assert.equal(collectChanges({ ...args, ids: [party] }).items.length, 1, 'only the deal: the story names someone else')
  assert.equal(collectChanges({ ...args, ids: ['spotify'] }).items.length, 1, 'only the story')
  assert.equal(collectChanges({ ...args, ids: ['not-a-company'] }).items.length, 0)
  assert.equal(collectChanges(args).items.length, 2, 'no watchlist means everything')
})

t('routine filings stay out of the feed; reports and material events stay in', () => {
  assert.equal(leadsFiling({ form: '4', weight: 2 }), false)
  assert.equal(leadsFiling({ form: '10-Q', weight: 2 }), true, 'a quarterly report is why anyone reads a filing list')
  assert.equal(leadsFiling({ form: '8-K', weight: 8 }), true)
  assert.equal(leadsFiling({ form: 'SCHEDULE 13D', weight: 12 }), true)
  const { items } = collectChanges({ since: '2026-09-01', deals: [], milestones: [], filings: [{ id: 'a', entityId: 'wmg', form: '4', weight: 2, filed: '2026-09-03', note: 'Routine filing.' }] })
  assert.equal(items.length, 0)
})

t('coverage: a window reaching before a source began says so', () => {
  const partial = coverageOf({ from: '2026-01-01', archiveSince: '2026-09-21', figuresSince: '2026-09-27', filingsSince: '2026-07-01', today: '2026-09-27' })
  assert.equal(partial.complete, false)
  assert.equal(partial.gaps.length, 3)
  assert.match(partial.gaps[0], /archive only holds stories from 21 Sep 2026/)
  const full = coverageOf({ from: '2026-09-26', archiveSince: '2026-09-21', figuresSince: '2026-09-01', filingsSince: '2026-07-01', today: '2026-09-27' })
  assert.equal(full.complete, true, 'a window inside every source is complete')
  const down = coverageOf({ from: '2026-09-26', archiveSince: null, figuresSince: '2026-09-01' })
  assert.match(down.gaps[0], /not reachable/, 'a source that did not answer is named, not silently missing')
})

t('coverage never warns about a source the view has switched off', () => {
  // A company strip runs with news off (DEFAULT_KINDS). It used to print "the news archive only holds stories
  // from …" underneath a list that contained no news at all, which reads as a gap in what is on screen.
  const args = { from: '2026-01-01', archiveSince: '2026-09-21', figuresSince: '2026-01-01', filingsSince: '2026-01-01' }
  assert.equal(coverageOf(args).gaps.some((g) => /news archive/.test(g)), true, 'with news on, the late archive is a real gap')
  const off = coverageOf({ ...args, kinds: DEFAULT_KINDS })
  assert.equal(off.gaps.some((g) => /news archive/.test(g)), false, 'with news off, the archive is not a gap in this view')
  assert.equal(DEFAULT_KINDS.includes('news'), false, 'the feed is for changes to the record; news is opt-in')
  // A source that IS shown and cannot be reached still has to say so.
  assert.match(coverageOf({ ...args, kinds: ['figure'], figuresSince: null }).gaps[0], /not reachable/)
})

t('windows are whole days ending today', () => {
  assert.equal(windowStart(1, new Date('2026-09-27T12:00:00Z')), '2026-09-27')
  assert.equal(windowStart(7, new Date('2026-09-27T12:00:00Z')), '2026-09-21')
  assert.ok(WINDOWS.every((w) => w.days > 0 && w.label))
  assert.ok(KIND_LIST.every((k) => k.label && k.hint))
})

t('every keyed list in the manual has unique ids', () => {
  // React renders a duplicate key as a console warning and then silently drops or duplicates a child — so this is
  // caught in the browser, by someone looking, or not at all. Sprint 36 shipped two CONVENTIONS called 'coverage'.
  for (const [name, list] of [['CONVENTIONS', CONVENTIONS], ['WORKFLOWS', WORKFLOWS], ['PAGE_GUIDE', PAGE_GUIDE]]) {
    const ids = list.map((x) => x.id || x.path)
    assert.equal(new Set(ids).size, ids.length, `${name}: duplicate id — ${ids.filter((v, i) => ids.indexOf(v) !== i).join(', ')}`)
  }
})

t('watchlists live in this browser, hold entity ids, and always offer a list', () => {
  const store = new Map()
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) }
  assert.deepEqual(readLists(), [DEFAULT_LIST], 'a first visit gets the default list, not an error')
  let lists = toggleInList(readLists(), 'watching', 'wmg')
  assert.deepEqual(lists[0].ids, ['wmg'])
  assert.equal(isWatched(lists, 'wmg'), true)
  lists = toggleInList(lists, 'watching', 'wmg')
  assert.deepEqual(lists[0].ids, [], 'toggling twice removes it')
  const added = addList(lists, 'Majors', ['umg', 'wmg'])
  assert.equal(added.lists.length, 2)
  assert.deepEqual(removeList(added.lists, added.id).length, 1)
  assert.deepEqual(removeList(lists, 'watching'), [DEFAULT_LIST], 'deleting the last list leaves the default')
  // A browser with storage blocked must still return a usable list.
  globalThis.localStorage = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
  assert.deepEqual(readLists(), [DEFAULT_LIST])
  delete globalThis.localStorage
})

t('the guide describes every page this build routes to, and no page it does not', () => {
  // A route behind `has('feature')` is not in every build; this edition's manual covers this edition's routes.
  const routes = [...APP.matchAll(/(has\('(\w+)'\)\s*&&\s*)?<Route path="([^"]+)"/g)]
    .filter((m) => !m[2] || has(m[2]))
    .map((m) => m[3])
    .filter((p) => p !== '*')
  const guided = new Set(PAGE_GUIDE.map((p) => p.path))
  const skip = new Set(['/design', '/lab/glossary', '/flows/*', '/prospecting/:accountId', '/pe/:id', '/pros/:id', '/consulting', '/consulting/:id', '/deliverables', '/lab/:caseId'])
  for (const r of routes) {
    if (skip.has(r)) continue
    assert.ok(guided.has(r), `${r} has no entry in pageGuide.js — add one, or add it to the skip list with a reason`)
  }
  for (const p of PAGE_GUIDE) {
    // A route may be declared with a wildcard or a parameter ("/flows/*" serves "/flows").
    const base = (r) => r.replace(/\/(\*|:[^/]+)$/, '')
    const known = routes.some((r) => r === p.path || base(r) === p.path)
    assert.ok(known, `the guide describes ${p.path}, which the app does not route to`)
    assert.ok(p.title && p.what && p.use.length && p.not, `${p.path}: every entry says what it is for, how to use it, and what it will not tell you`)
    assert.ok(p.what.length > 40 && p.not.length > 30, `${p.path}: the guide must be useful, not a label`)
  }
  assert.ok(WORKFLOWS.length >= 3 && WORKFLOWS.every((w) => w.steps.length >= 2))
})

t('the research edition’s manual describes only the pages it contains', () => {
  const work = EDITIONS.work
  const shown = guideFor((f) => !!work.features[f]).flatMap((g) => g.pages)
  assert.equal(shown.some((p) => p.path === '/lab'), false, 'no valuation lab in the research edition')
  assert.ok(shown.some((p) => p.path === '/changes'), 'the change feed is in both editions')
  const groups = new Set(shown.map((p) => p.group))
  for (const g of groups) assert.ok(work.groups.includes(g), `the work manual names the ${g} group, which that edition does not ship`)
  const here = guideFor((f) => !!EDITIONS[EDITION].features[f])
  assert.ok(here.length > 0 && here.every((g) => g.pages.length > 0))
})

t('the guide’s claims match the app: entity and deal counts are measured, never asserted', () => {
  const text = JSON.stringify(PAGE_GUIDE)
  assert.equal(/\b\d{2,}\s+(companies|entities|deals|transactions)\b/.test(text), false, 'the guide must not hard-code a count that the data decides')
  assert.ok(ENTITIES.length > 0 && TRANSACTIONS.length > 0)
})

console.log(`\n${n} change-feed checks passed.`)
