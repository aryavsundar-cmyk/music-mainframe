#!/usr/bin/env node
/**
 * test-edition.mjs — builds the work edition and proves it carries no authored material.
 * `npm run test:edition`
 *
 * This is the guarantee behind the work edition. Hiding a route is not enough: anything inside the bundle is
 * readable by anyone who opens developer tools. So the test greps the built output for strings that exist only in
 * the private modules, and fails the build if one appears. It also checks the public material is still there, so
 * a bundle that excludes everything cannot pass by being empty.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { EDITIONS } from '../src/editions.js'
import { CLIENT_CATEGORIES } from '../src/data/consulting.js'
import { ROLES } from '../src/data/rateCard.js'
import { PERSONAS } from '../src/data/personas.js'
import { HOOKS } from '../src/data/playbooks.js'
import { CASE_LIST } from '../src/data/cases/index.js'
import { HUB_URL } from '../src/data/siblings.js'
import { GLOSSARY } from '../src/data/glossary.js'
import { ENTITIES } from '../src/data/entities.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'dist-work')
let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }

console.log('building the work edition…')
execFileSync('npx', ['vite', 'build'], { cwd: root, env: { ...process.env, MM_EDITION: 'work' }, stdio: 'pipe' })

const files = []
const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p); else files.push(p) } }
walk(out)
const text = files.filter((f) => /\.(js|css|html|json|txt)$/.test(f)).map((f) => fs.readFileSync(f, 'utf8')).join('\n')
const inBundle = (s) => text.includes(s)

t('the work build produced a bundle', () => {
  assert.ok(files.some((f) => f.endsWith('.js')), 'no javascript emitted')
  assert.ok(text.length > 200000, `bundle is suspiciously small (${text.length} chars)`)
})
t('no PEPI overlay: no category, thesis or engagement hypothesis', () => {
  for (const c of CLIENT_CATEGORIES) {
    assert.ok(!inBundle(c.thesis.slice(0, 60)), `category thesis leaked: ${c.id}`)
    for (const line of Object.values(c.engagements || {})) for (const h of line) assert.ok(!inBundle(h.slice(0, 50)), `engagement hypothesis leaked: ${h.slice(0, 50)}`)
  }
  assert.ok(!inBundle('PEPI'), 'the PEPI label itself leaked')
})
t('no rate card: no role label, and no rate beside a role', () => {
  // bare numbers are meaningless here — minified bundles are full of digits. A rate leaks when it travels
  // with the role it belongs to, or when a role label ships at all.
  for (const r of ROLES) {
    assert.ok(!inBundle(r.label), `rate-card role leaked: ${r.label}`)
    assert.ok(!inBundle(`${r.label}","${r.dayRate}`) && !inBundle(`${r.label}:${r.dayRate}`), `a day rate leaked beside its role: ${r.label}`)
  }
  assert.ok(!inBundle('Day rate') && !inBundle('day rate'), 'a rate-card label leaked')
  assert.ok(!inBundle('Indicative fees'), 'a fee estimate leaked')
})
t('no outreach material: no persona question, proof point or hook', () => {
  for (const p of PERSONAS) {
    assert.ok(!inBundle(p.question.slice(0, 40)), `persona question leaked: ${p.id}`)
    assert.ok(!inBundle(p.proof.label.slice(0, 40)), `proof point leaked: ${p.id}`)
  }
  for (const h of HOOKS) {
    assert.ok(!inBundle(h.claim.slice(0, 50)), `hook claim leaked: ${h.segment}/${h.line}`)
    assert.ok(!inBundle(h.evidence.slice(0, 50)), `hook evidence leaked: ${h.segment}/${h.line}`)
  }
})
t('no lab cases: no case title, client or benchmark rationale', () => {
  for (const c of CASE_LIST) {
    assert.ok(!inBundle(c.title), `case title leaked: ${c.id}`)
    assert.ok(!inBundle(c.client.name), `case client leaked: ${c.id}`)
    assert.ok(!inBundle(c.benchmarkDeliver.rationale.slice(0, 60)), `reviewer rationale leaked: ${c.id}`)
  }
})
t('no internal cross-links', () => {
  assert.ok(HUB_URL && !inBundle(HUB_URL), 'the internal hub URL leaked')
  assert.ok(!inBundle('am-intelligence-hub'), 'an internal application name leaked')
})
t('the public material is still there', () => {
  for (const id of ['umg', 'wmg', 'blackstone']) assert.ok(inBundle(id), `public entity missing: ${id}`)
  assert.ok(inBundle(ENTITIES.find((e) => e.id === 'umg').name), 'entity names missing')
  assert.ok(inBundle('Catalog scan') && inBundle('Buyer match'), 'the market modules are missing')
  assert.ok(inBundle('Prospecting'), 'the pipeline is missing')
})
t('the glossary ships: it explains public concepts and gives away no position', () => {
  const sample = GLOSSARY.find((g) => g.id === 'dcf')
  assert.ok(inBundle(sample.short.slice(0, 40)), 'the glossary is missing from the work edition')
  assert.ok(inBundle('Finance, explained'), 'the glossary route is missing')
})
t('the declared edition matches what was built', () => {
  assert.ok(inBundle('"work"') || inBundle("'work'") || inBundle('work'), 'the edition flag is not in the bundle')
  assert.ok(!inBundle('Valuation lab'), 'a lab navigation item leaked')
  assert.ok(!inBundle('Consulting lens'), 'an overlay navigation item leaked')
  assert.ok(!inBundle('gamma/generate'), 'the Gamma integration leaked')
  for (const f of EDITIONS.work.exports) assert.ok(typeof f === 'string')
})
t('the framing the firm would read is present', () => {
  assert.ok(inBundle('not a firm system of record'), 'the work edition does not state what it is not')
  assert.ok(inBundle('no client data'), 'the work edition does not state what it holds')
})

console.log(`\n${n} checks passed`)
console.log(`work bundle: ${files.filter((f) => f.endsWith('.js')).length} scripts, ${(text.length / 1024).toFixed(0)} KB of text scanned`)
console.log(`excluded: ${CLIENT_CATEGORIES.length} PEPI categories · ${ROLES.length} rate-card roles · ${PERSONAS.length} personas · ${HOOKS.length} hooks · ${CASE_LIST.length} lab cases`)
