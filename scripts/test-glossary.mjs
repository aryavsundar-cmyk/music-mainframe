#!/usr/bin/env node
/**
 * test-glossary.mjs — the plain-English explanations have to stay complete, linked, and actually plain.
 * `npm run test:glossary`
 */
import assert from 'node:assert/strict'
import { GLOSSARY, GLOSSARY_BY_ID, TAGS } from '../src/data/glossary.js'
import { EXEC_STEPS } from '../src/utils/labState.js'
import { PMI_STEPS } from '../src/utils/pmiState.js'
import { ABS_STEPS } from '../src/utils/absState.js'
import { CARVE_STEPS } from '../src/utils/carveState.js'

let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }
const STEPS = [['valuation', EXEC_STEPS], ['pmi', PMI_STEPS], ['abs', ABS_STEPS], ['carveout', CARVE_STEPS]]

t('every entry is complete', () => {
  for (const g of GLOSSARY) {
    for (const f of ['term', 'short', 'plain', 'worked', 'watch']) assert.ok(g[f]?.trim(), `${g.id} is missing ${f}`)
    assert.ok(g.tags?.length, `${g.id} has no tag`)
    for (const tag of g.tags) assert.ok(TAGS[tag], `${g.id} uses an unknown tag ${tag}`)
  }
})
t('ids are unique and cross-references resolve', () => {
  const seen = new Set()
  for (const g of GLOSSARY) { assert.ok(!seen.has(g.id), `duplicate id ${g.id}`); seen.add(g.id) }
  for (const g of GLOSSARY) for (const r of g.related || []) assert.ok(GLOSSARY_BY_ID[r], `${g.id} points at a missing term ${r}`)
})
t('explanations stay short and concrete', () => {
  for (const g of GLOSSARY) {
    assert.ok(g.short.length <= 110, `${g.id}: the one-liner is ${g.short.length} chars`)
    const sentences = g.plain.split(/(?<=[.!?])\s/).length
    assert.ok(sentences <= 5, `${g.id}: ${sentences} sentences in plain — trim it`)
    assert.ok(/\d/.test(g.worked), `${g.id}: the example needs real numbers`)
  }
})
t('every execution step points at terms that exist', () => {
  for (const [kind, steps] of STEPS) for (const s of steps) {
    assert.ok(s.terms?.length, `${kind} step "${s.id}" has no terms`)
    for (const id of s.terms) assert.ok(GLOSSARY_BY_ID[id], `${kind} step "${s.id}" points at a missing term ${id}`)
  }
})
t('each case kind covers its own vocabulary', () => {
  const used = (steps) => new Set(steps.flatMap((s) => s.terms))
  assert.ok(used(EXEC_STEPS).has('dcf') && used(EXEC_STEPS).has('discount-rate'), 'valuation explains discounting')
  assert.ok(used(PMI_STEPS).has('synergy') && used(PMI_STEPS).has('phasing'), 'integration explains synergies and phasing')
  assert.ok(used(ABS_STEPS).has('waterfall') && used(ABS_STEPS).has('dscr'), 'the ABS case explains the waterfall and coverage')
  assert.ok(used(CARVE_STEPS).has('allocation') && used(CARVE_STEPS).has('standalone-cost'), 'the carve-out explains allocations')
})
t('no term is written only for the glossary page', () => {
  const referenced = new Set(STEPS.flatMap(([, steps]) => steps.flatMap((s) => s.terms)))
  const related = new Set(GLOSSARY.flatMap((g) => g.related || []))
  const orphans = GLOSSARY.filter((g) => !referenced.has(g.id) && !related.has(g.id)).map((g) => g.id)
  assert.equal(orphans.length, 0, `unreachable terms: ${orphans.join(', ')}`)
})

const covered = new Set(STEPS.flatMap(([, steps]) => steps.flatMap((s) => s.terms)))
console.log(`\n${n} checks passed`)
console.log(`${GLOSSARY.length} terms across ${Object.keys(TAGS).length} groups · ${covered.size} attached to an execution step`)
