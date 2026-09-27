#!/usr/bin/env node
/**
 * test-search.mjs — the one index over everything, and the wayfinding that makes a result worth opening.
 * `npm run test:search`
 *
 * A search box fails in two directions. It can miss — a company that exists cannot be found by its own name —
 * and it can lie, by ranking a passing mention above the record someone asked for, or by offering a word that
 * points at nothing. Every check here is one of those, plus the alias file, which is the one place in this
 * feature where a human writes something that the data does not already say.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { search, buildIndex, groupResults, handoffs, MIN_SCORE, KIND_LIST } from '../src/utils/search.js'
import { ALIASES, SAVED_VIEWS } from '../src/data/aliases.js'
import { readRecents, pushRecent, clearRecents, MAX_RECENTS } from '../src/utils/recents.js'
import { ENTITIES, getEntity } from '../src/data/entities.js'
import { TRANSACTIONS } from '../src/data/transactions.js'
import { GLOSSARY } from '../src/data/glossary.js'
import { PAGE_GUIDE } from '../src/data/pageGuide.js'

let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }
const titles = (q, k) => search(q, { limit: 8 }).filter((r) => !k || r.kind === k).map((r) => r.title)
const top = (q) => search(q, { limit: 1 })[0]

t('every company on the canvas is findable by its own name', () => {
  const missed = ENTITIES.filter((e) => !search(e.name, { limit: 12 }).some((r) => r.id === `entity:${e.id}`))
  assert.deepEqual(missed.map((e) => e.name), [], 'a company that cannot be found by its own name is invisible')
})

t('the first result for a company name is that company', () => {
  // Tier 1 names are the ones typed most; a near-namesake must not outrank the company itself.
  for (const e of ENTITIES.filter((x) => x.tier === 1)) {
    const first = top(e.name)
    assert.equal(first.id, `entity:${e.id}`, `searching "${e.name}" put ${first.title} first`)
  }
})

t('short names and tickers find their company', () => {
  assert.equal(top('WMG').id, 'entity:wmg')
  assert.equal(top('SPOT').id, 'entity:spotify')
  assert.ok(titles('umg').includes('Universal Music Group'))
})

t('every glossary term and page is findable, and every deal by its title', () => {
  for (const g of GLOSSARY) assert.ok(search(g.term, { limit: 10 }).some((r) => r.id === `term:${g.id}`), `${g.term} is not findable`)
  for (const p of PAGE_GUIDE.filter((x) => !x.path.includes(':'))) {
    assert.ok(search(p.title, { limit: 10 }).some((r) => r.id === `page:${p.path}`), `the ${p.title} page is not findable`)
  }
  for (const d of TRANSACTIONS) assert.ok(search(d.title.slice(0, 30), { limit: 12 }).some((r) => r.id === `deal:${d.id}`), `${d.id} is not findable`)
})

t('glossary synonyms work: a term is findable by what else it is called', () => {
  const withAka = GLOSSARY.find((g) => (g.aka || []).length)
  assert.ok(search(withAka.aka[0], { limit: 10 }).some((r) => r.id === `term:${withAka.id}`), `"${withAka.aka[0]}" does not find ${withAka.term}`)
})

t('every alias points at something that exists', () => {
  for (const a of ALIASES) {
    assert.ok((a.ids || []).length || (a.paths || []).length, `alias "${a.term}" points at nothing`)
    for (const id of a.ids || []) assert.ok(getEntity(id), `alias "${a.term}" names ${id}, which is not on the canvas`)
    for (const path of a.paths || []) {
      const base = path.split('?')[0]
      assert.ok(PAGE_GUIDE.some((p) => p.path === base), `alias "${a.term}" points at ${base}, which is not a page`)
    }
    assert.equal(a.term, a.term.toLowerCase(), `alias "${a.term}" must be lower case`)
  }
  const terms = ALIASES.map((a) => a.term)
  assert.equal(new Set(terms).size, terms.length, 'an alias is declared twice')
  for (const v of SAVED_VIEWS) assert.ok(v.path.startsWith('/') && v.label && v.term, `saved view ${v.term} is incomplete`)
})

t('the industry’s words reach the right records', () => {
  const majors = titles('majors', 'entity')
  for (const name of ['Universal Music Group', 'Sony Music Group', 'Warner Music Group']) assert.ok(majors.includes(name), `"majors" did not find ${name}`)
  // A category word means the section, not one member of it.
  assert.equal(top('pro').id, 'page:/pros')
  assert.equal(top('dsp').id, 'page:/dsps')
  assert.equal(top('securitisation').id, 'page:/abs', 'the British spelling must reach the ABS page')
  assert.equal(top('catalogue').kind, 'page')
  assert.ok(search('ecosystem', { limit: 3 }).some((r) => r.id === 'page:/entities/map'))
})

t('ranking is deterministic and explains itself', () => {
  const a = search('music', { limit: 10 }).map((r) => r.id)
  const b = search('music', { limit: 10 }).map((r) => r.id)
  assert.deepEqual(a, b, 'the same query must return the same order')
  for (const r of search('warner', { limit: 6 })) {
    assert.ok(r.why, 'a result must say why it matched')
    assert.ok(r.score >= MIN_SCORE)
    assert.ok(r.to.startsWith('/'), 'every result goes somewhere in the app')
  }
  const exact = search('EBITDA', { limit: 3 })[0]
  assert.equal(exact.why, 'exact')
})

t('a passing mention never outranks the record itself', () => {
  assert.equal(top('spotify').id, 'entity:spotify')
  const kobalt = top('kobalt')
  assert.equal(kobalt.kind, 'entity')
  assert.match(kobalt.title, /^Kobalt/, 'a deal mentioning Kobalt must not outrank Kobalt itself')
  // "Music" appears in most company names; the pages named Music must not drown the companies.
  assert.ok(search('music', { limit: 5 }).some((r) => r.kind === 'entity'))
})

t('an empty query returns nothing, and nonsense returns nothing', () => {
  assert.deepEqual(search(''), [])
  assert.deepEqual(search('   '), [])
  assert.deepEqual(search('zzzzqqq'), [])
  assert.deepEqual(handoffs(''), [], 'nothing to hand off when nothing was asked')
  const hand = handoffs('zzzzqqq')
  assert.equal(hand.length, 2, 'the feed and the archive are searched on their own pages')
  assert.ok(hand.every((h) => h.to.includes(encodeURIComponent('zzzzqqq'))))
})

t('results group in a fixed order, and every group is a real kind', () => {
  const groups = groupResults(search('music', { limit: 24 }))
  const order = groups.map((g) => g.id)
  assert.deepEqual(order, KIND_LIST.map((k) => k.id).filter((k) => order.includes(k)))
  assert.ok(groups.every((g) => g.items.length))
})

t('the index is built from the records, so nothing can drift', () => {
  const small = buildIndex({ entities: [ENTITIES[0]], transactions: [], glossary: [], guide: [], aliases: [], views: [] })
  assert.equal(small.items.length, 1)
  assert.equal(search(ENTITIES[0].name, { index: small })[0].title, ENTITIES[0].name)
  assert.deepEqual(search('anything', { index: buildIndex({ entities: [], transactions: [], glossary: [], guide: [], aliases: [], views: [] }) }), [])
})

t('recent searches live in this browser, capped, newest first, and survive blocked storage', () => {
  const store = new Map()
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) }
  assert.deepEqual(readRecents(), [])
  const item = (i) => ({ id: `entity:e${i}`, kind: 'entity', title: `Company ${i}`, to: `/entities/e${i}` })
  for (let i = 0; i < MAX_RECENTS + 3; i++) pushRecent(item(i))
  const kept = readRecents()
  assert.equal(kept.length, MAX_RECENTS)
  assert.equal(kept[0].title, `Company ${MAX_RECENTS + 2}`, 'newest first')
  pushRecent(item(0))
  assert.equal(readRecents().filter((r) => r.id === 'entity:e0').length, 1, 'no duplicates')
  pushRecent({ id: 'handoff:news', kind: 'handoff', title: 'Search the news feed', to: '/news' })
  assert.equal(readRecents().some((r) => r.kind === 'handoff'), false, 'a hand-off is a search, not a destination')
  assert.deepEqual(clearRecents(), [])
  globalThis.localStorage = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => { throw new Error('blocked') } }
  assert.deepEqual(readRecents(), [], 'blocked storage costs the convenience, not the feature')
  assert.doesNotThrow(() => pushRecent(item(9)))
  delete globalThis.localStorage
})

t('wayfinding is wired: titles, arrival, skip link, and the site map is clickable', () => {
  const header = fs.readFileSync(new URL('../src/components/primitives/PageHeader.jsx', import.meta.url), 'utf8')
  assert.match(header, /document\.title/, 'PageHeader is the one place that can name every route in the tab')
  const arrival = fs.readFileSync(new URL('../src/hooks/useArrival.js', import.meta.url), 'utf8')
  assert.match(arrival, /scrollTo/, 'arriving on a page must start at the top')
  assert.match(arrival, /getElementById/, 'a link that names a row must reach that row')
  const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
  assert.match(app, /href="#main"/, 'a keyboard user must be able to skip 20+ nav links')
  assert.match(app, /id="main"/)
  assert.match(app, /useArrival\(\)/)
  assert.match(app, /CommandPalette/)
  const about = fs.readFileSync(new URL('../src/pages/About.jsx', import.meta.url), 'utf8')
  assert.match(about, /<Link to=\{p\.path\}/, 'the page guide is the app’s site map: its paths must be links')
})

console.log(`\n${n} search and wayfinding checks passed.`)
