#!/usr/bin/env node
/**
 * test-parity.mjs — the same engines, run in both editions, compared.
 * `npm run test:work` (the last step)
 *
 * The work edition loses the consulting overlay and the internal cross-links. It must still rank the market
 * sensibly, so this runs the engines in both shapes and checks that the answers stay comparable: the same
 * accounts near the top, tiers of a similar size, every score still bounded, and the market modules identical,
 * since they never depended on authored material in the first place.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PUBLIC_FIT_WEIGHT } from '../src/utils/prospect.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const run = (edition) => JSON.parse(execFileSync('node', edition === 'work'
  ? ['--import', './scripts/edition-loader.mjs', 'scripts/edition-summary.mjs']
  : ['scripts/edition-summary.mjs'], { cwd: root, env: { ...process.env, MM_EDITION: edition }, encoding: 'utf8' }))

let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }
const full = run('full')
const work = run('work')

t('both editions run the same engines over the same accounts', () => {
  assert.equal(full.edition, 'full'); assert.equal(work.edition, 'work')
  assert.equal(work.accounts, full.accounts, 'the account universe is public, so it cannot differ')
  assert.equal(work.feed, full.feed, 'the trigger feed is built from public records only')
  assert.equal(work.withTrigger, full.withTrigger, 'timing never used authored material')
})
t('every score stays bounded and adds up in both', () => { assert.ok(full.bounded); assert.ok(work.bounded) })
t('the priority tiers stay a comparable size', () => {
  assert.ok(Math.abs(work.tiers.A - full.tiers.A) <= 2, `Tier A: full ${full.tiers.A}, work ${work.tiers.A}`)
  assert.ok(work.tiers.A >= 3 && work.tiers.A <= 30, `Tier A in the work edition is ${work.tiers.A}`)
  assert.ok(Math.abs((work.tiers.A + work.tiers.B) - (full.tiers.A + full.tiers.B)) <= 8, 'the priority list stays a similar length')
})
t('the same names come out near the top', () => {
  const overlap = work.top.filter((id) => full.top.includes(id)).length
  assert.ok(overlap >= 7, `only ${overlap} of the top ten match: full ${full.top.join(',')} vs work ${work.top.join(',')}`)
  assert.equal(work.top[0], full.top[0], 'the strongest account should not change with the edition')
})
t('the market modules are identical — they never used authored material', () => {
  assert.deepEqual(work.market, full.market)
})
t('drafting is available in one edition and honestly absent in the other', () => {
  assert.equal(full.drafts, 'available')
  assert.equal(work.drafts, 'unavailable')
})
t('documents build in both, and the work brief is not empty', () => {
  assert.ok(full.docs.brief > 500 && work.docs.brief > 400, `brief sizes: full ${full.docs.brief}, work ${work.docs.brief}`)
  assert.ok(full.docs.list > 500 && work.docs.list > 500)
})
t('the public-fit weight is declared, not hidden in the arithmetic', () => {
  assert.ok(PUBLIC_FIT_WEIGHT > 1 && PUBLIC_FIT_WEIGHT < 2, `weight ${PUBLIC_FIT_WEIGHT}`)
})

console.log(`\n${n} checks passed`)
console.log(`full: A ${full.tiers.A} · B ${full.tiers.B} · top ${full.top.slice(0, 3).join(', ')}`)
console.log(`work: A ${work.tiers.A} · B ${work.tiers.B} · top ${work.top.slice(0, 3).join(', ')} · public-fit weight ${PUBLIC_FIT_WEIGHT}`)
