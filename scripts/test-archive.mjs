#!/usr/bin/env node
/**
 * test-archive.mjs — the evidence archive (server/archive.js, data/archive).
 * `npm run test:archive`
 *
 * An archive is only worth having if it is append-only in practice: an item is recorded once, never rewritten,
 * and re-running the job on the same feed changes nothing — otherwise every day produces a diff and the
 * history stops meaning anything. And coverage must be counted from when the archive started watching, not
 * from the oldest story it happened to catch.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeItem, mergeArchive, partitionByMonth, buildIndex, loadLocalArchive, writeArchive, SUMMARY_MAX } from '../server/archive.js'
import { mergeUnique, titleKey, urlKey } from '../src/utils/eventKeys.js'
import { isMusic, isRoutineFiling } from '../src/utils/forces.js'

let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const item = (id, extra = {}) => ({ id, title: `Story ${id}`, url: `https://example.com/story-${id}`, summary: 'A label signs a distribution deal.', source: 'Fixture', category: 'trade', kind: 'news', publishedAt: '2026-09-10T08:00:00Z', entities: ['b', 'a'], topics: [], ...extra })

t('items are normalised: summaries trimmed, lists sorted, the source URL kept', () => {
  const x = normalizeItem(item('1', { summary: 'x'.repeat(1000) }), { now: '2026-09-21T00:00:00Z' })
  assert.ok(x.summary.length <= SUMMARY_MAX, 'the archive keeps enough to classify, not a copy of the article')
  assert.deepEqual(x.entities, ['a', 'b'], 'sorted, so the same item always serialises the same way')
  assert.equal(x.url, 'https://example.com/story-1')
  assert.equal(x.firstSeen, '2026-09-21T00:00:00Z')
})

t('one story is recorded once — by id, by URL, or by headline', () => {
  const base = mergeArchive([], [item('1')], { now: '2026-09-21T00:00:00Z' }).items
  const again = mergeArchive(base, [
    item('1'),
    item('2', { url: 'https://www.example.com/story-1/?utm_source=x#top' }),
    item('3', { title: 'STORY 1', url: 'https://other.example/elsewhere' }),
    item('4'),
  ], { now: '2026-09-22T00:00:00Z' })
  assert.deepEqual(again.added.map((x) => x.id), ['4'], 'the same id, the same page, and the same headline are all the same story')
  assert.equal(urlKey('https://www.example.com/a/?q=1#x'), urlKey('http://example.com/a'))
  assert.equal(titleKey('Story 1!'), titleKey('story 1'))
})

t('what is recorded is never rewritten, and re-running changes nothing', () => {
  const first = mergeArchive([], [item('1')], { now: '2026-09-21T00:00:00Z' }).items
  const later = mergeArchive(first, [item('1', { summary: 'An edited summary.', topics: ['ai'] })], { now: '2026-10-01T00:00:00Z' })
  assert.equal(later.added.length, 0)
  assert.equal(later.items[0].summary, 'A label signs a distribution deal.', 'the first record stands')
  assert.equal(later.items[0].firstSeen, '2026-09-21T00:00:00Z', 'and so does the day it was first seen')
  assert.deepEqual(mergeArchive(later.items, later.items).added, [], 'merging the archive into itself adds nothing')
})

t('coverage counts from when the archive started watching, not from its oldest story', () => {
  const items = mergeArchive([], [item('old', { publishedAt: '2026-08-01T00:00:00Z' }), item('new')], { now: '2026-09-21T09:00:00Z' }).items
  const index = buildIndex(items)
  assert.equal(index.coverageSince, '2026-09-21', 'the first run caught an August story, but it was not watching in August')
  assert.equal(index.oldestItem, '2026-08-01')
  assert.deepEqual(index.months, [{ month: '2026-08', count: 1 }, { month: '2026-09', count: 1 }])
  assert.deepEqual(Object.keys(partitionByMonth(items)).sort(), ['2026-08', '2026-09'])
})

t('writing: only changed months are touched, and a quiet day leaves the files exactly as they were', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-archive-'))
  try {
    const items = mergeArchive([], [item('1'), item('2', { publishedAt: '2026-08-15T00:00:00Z' })]).items
    const one = writeArchive(dir, items)
    assert.deepEqual(one.written.sort(), ['2026-08', '2026-09'])
    const before = fs.readFileSync(path.join(dir, 'index.json'), 'utf8')
    const loaded = loadLocalArchive(dir)
    const two = writeArchive(dir, mergeArchive(loaded.items, [item('1')]).items, { changed: false, previousIndex: loaded.index })
    assert.deepEqual(two.written, [], 'no month rewritten')
    assert.equal(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'), before, 'the index — timestamp included — is unchanged, so there is nothing to commit')
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
})

t('the page merges archive and live feed the same way the job does', () => {
  const live = [item('1'), item('9')]
  const archived = [item('1'), item('2', { url: 'https://example.com/story-9' }), item('3')]
  assert.deepEqual(mergeUnique(live, archived).map((x) => x.id), ['1', '9', '3'], 'overlap counted once, by id and by URL')
})

t('the committed archive is sound', () => {
  const dir = path.join(root, 'data/archive')
  const { items, index } = loadLocalArchive(dir)
  assert.ok(items.length > 100 && index, 'the archive has been seeded')
  assert.equal(index.count, items.length, 'the index counts what the months hold')
  for (const f of fs.readdirSync(dir).filter((x) => /^\d{4}-\d{2}\.json$/.test(x))) {
    const month = f.slice(0, 7)
    for (const x of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))) assert.equal(String(x.publishedAt).slice(0, 7), month, `${x.id} is filed in the wrong month`)
  }
  const keys = new Set()
  for (const x of items) {
    for (const k of ['id', 'title', 'url', 'publishedAt', 'firstSeen']) assert.ok(x[k], `${x.id}: missing ${k}`)
    assert.ok(x.summary.length <= SUMMARY_MAX, `${x.id}: summary too long`)
    assert.ok(isMusic(x), `${x.id}: archived but not about music — "${x.title}"`)
    assert.ok(!isRoutineFiling(x), `${x.id}: a routine filing was archived`)
    const k = titleKey(x.title)
    assert.ok(!keys.has(k), `duplicate story in the archive: ${x.title}`)
    keys.add(k)
  }
  assert.ok(index.coverageSince >= '2026-09-21', 'coverage cannot predate the first run')
})

console.log(`\n${n} checks passed`)
const { index } = loadLocalArchive(path.join(root, 'data/archive'))
console.log(`archive: ${index.count} items · watching since ${index.coverageSince} · ${index.months.map((m) => `${m.month} ${m.count}`).join(' · ')}`)
