#!/usr/bin/env node
/**
 * test-entitymap.mjs — the entity map places every company once, in the right stage, and every connection it
 * draws is on the record.
 * `npm run test:entitymap`
 *
 * A map that quietly drops a company reads as "not in this market". A connection that isn't on record reads as a
 * relationship. So the checks are about completeness and provenance, not layout.
 */
import assert from 'node:assert/strict'
import { ENTITIES, getEntity } from '../src/data/entities.js'
import { TRANSACTIONS } from '../src/data/transactions.js'
import { COLUMNS, DIRECTIONS, MARKET_STRIP, buildMap, filterEntitiesForMap, connections, connectionsOf, dealsOf, columnOf, initials } from '../src/utils/entityMap.js'

let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }
const ids = (map) => map.flatMap((c) => c.groups.flatMap((g) => g.items.map((e) => e.id)))

t('every entity type belongs to exactly one column', () => {
  const types = COLUMNS.flatMap((c) => c.types)
  assert.equal(new Set(types).size, types.length, 'a type is claimed by two columns')
  for (const e of ENTITIES) assert.ok(columnOf(e), `${e.id} (${e.type}) has no column`)
})

t(`all ${ENTITIES.length} entities are placed exactly once`, () => {
  const placed = ids(buildMap(ENTITIES))
  assert.equal(placed.length, ENTITIES.length)
  assert.equal(new Set(placed).size, ENTITIES.length)
  const counted = buildMap(ENTITIES).reduce((s, c) => s + c.count, 0)
  assert.equal(counted, ENTITIES.length, 'column counts do not add up to the canvas')
})

t('groups are non-empty and ordered by tier then name', () => {
  for (const c of buildMap(ENTITIES)) for (const g of c.groups) {
    assert.ok(g.items.length, `${c.id}/${g.id} is empty`)
    const sorted = [...g.items].sort((a, b) => (a.tier - b.tier) || a.name.localeCompare(b.name))
    assert.deepEqual(g.items.map((e) => e.id), sorted.map((e) => e.id), `${c.id}/${g.id} out of order`)
  }
})

t('Fan-up reverses the stages and keeps the same placements', () => {
  const down = buildMap(ENTITIES, { direction: 'down' })
  const up = buildMap(ENTITIES, { direction: 'up' })
  assert.deepEqual(up.map((c) => c.id), [...down.map((c) => c.id)].reverse())
  assert.deepEqual(new Set(ids(up)), new Set(ids(down)))
  assert.ok(DIRECTIONS.down.flow && DIRECTIONS.up.flow)
})

t('filters: search, stage, tier and ownership each narrow; empty matches all', () => {
  assert.equal(filterEntitiesForMap(ENTITIES, {}).length, ENTITIES.length)
  const wmg = filterEntitiesForMap(ENTITIES, { q: 'warner music' })
  assert.ok(wmg.some((e) => e.id === 'wmg'), 'search misses Warner Music Group')
  const recorded = filterEntitiesForMap(ENTITIES, { columns: ['recorded'] })
  assert.ok(recorded.length && recorded.every((e) => columnOf(e) === 'recorded'))
  const t1 = filterEntitiesForMap(ENTITIES, { tiers: ['1'] })
  assert.ok(t1.length && t1.every((e) => String(e.tier) === '1'))
  const pub = filterEntitiesForMap(ENTITIES, { ownership: ['public'] })
  assert.ok(pub.length && pub.every((e) => e.ownership === 'public'))
  const both = filterEntitiesForMap(ENTITIES, { columns: ['recorded'], tiers: ['1'] })
  assert.ok(both.every((e) => columnOf(e) === 'recorded' && String(e.tier) === '1'))
  assert.equal(filterEntitiesForMap(ENTITIES, { q: 'zzzz-no-such-company' }).length, 0)
})

t('a filtered map keeps every column (empty ones say so) and only the matches', () => {
  const only = filterEntitiesForMap(ENTITIES, { columns: ['live'] })
  const map = buildMap(only)
  assert.equal(map.length, COLUMNS.length)
  assert.deepEqual(new Set(ids(map)), new Set(only.map((e) => e.id)))
  assert.ok(map.filter((c) => c.id !== 'live').every((c) => c.count === 0 && c.groups.length === 0))
})

t('connections are symmetric, between real entities, and never to self', () => {
  const g = connections()
  let edges = 0
  for (const [a, m] of g) for (const [b, why] of m) {
    edges++
    assert.ok(getEntity(a) && getEntity(b), `unknown id in ${a}–${b}`)
    assert.notEqual(a, b)
    assert.ok(g.get(b)?.has(a), `${a}→${b} has no way back`)
    assert.deepEqual([...why].sort(), [...g.get(b).get(a)].sort(), `${a}–${b} reasons differ by direction`)
  }
  assert.ok(edges > 0)
})

t('every connection is evidenced: parent, backer, or a deal both took part in', () => {
  for (const e of ENTITIES) for (const { entity, reasons } of connectionsOf(e.id)) {
    for (const r of reasons) {
      if (r === 'ownership') assert.ok(e.parentId === entity.id || entity.parentId === e.id, `${e.id}–${entity.id} ownership`)
      else if (r === 'backer') assert.ok((e.backers || []).includes(entity.id) || (entity.backers || []).includes(e.id), `${e.id}–${entity.id} backing`)
      else if (r === 'deal') assert.ok(dealsOf(e.id).some((d) => dealsOf(entity.id).includes(d)), `${e.id}–${entity.id} deal`)
      else assert.fail(`unknown reason ${r}`)
    }
  }
})

t('children show their parent (e.g. a label under its group)', () => {
  const child = ENTITIES.find((e) => e.parentId && getEntity(e.parentId))
  assert.ok(child, 'no parented entity on the canvas')
  assert.ok(connectionsOf(child.id).some((l) => l.entity.id === child.parentId && l.reasons.includes('ownership')))
  assert.ok(connectionsOf(child.parentId).some((l) => l.entity.id === child.id))
})

t('deals on record resolve to the entity as a party', () => {
  const party = TRANSACTIONS.flatMap((d) => [...(d.acquirers || []), ...(d.sellers || [])]).find((p) => p.entityId && getEntity(p.entityId))
  assert.ok(party)
  assert.ok(dealsOf(party.entityId).length > 0)
})

t('market figures are sourced; no figure without a source', () => {
  for (const c of COLUMNS) if (c.market) {
    assert.ok(Number.isFinite(c.market.value) && c.market.value > 0, `${c.id} market value`)
    assert.ok(c.market.source && c.market.label, `${c.id} market is unsourced`)
    assert.ok(c.market.currency, `${c.id} market has no currency`)
  }
  for (const m of MARKET_STRIP) {
    assert.ok(Number.isFinite(m.value ?? m.count), `${m.label} has no number`)
    assert.ok(m.source && m.url, `${m.label} has no source link`)
  }
})

t('initials are two letters and skip stopwords', () => {
  for (const e of ENTITIES) assert.match(initials(e), /^[A-Z0-9&]{2,3}$/, `${e.id} → ${initials(e)}`)
  assert.equal(initials({ name: 'Live Nation Entertainment' }), 'LN')
  assert.equal(initials({ name: 'The Orchard' }), 'OR')
})

console.log(`\n${n} entity map checks passed.`)
