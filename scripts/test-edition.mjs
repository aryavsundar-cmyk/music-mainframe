#!/usr/bin/env node
/**
 * test-edition.mjs — builds the work edition and proves it carries no authored material.
 * `npm run test:edition`
 *
 * This is the guarantee behind the work edition. Hiding a route is not enough: anything inside the bundle is
 * readable by anyone who opens developer tools.
 *
 * Two different tests run here, and they fail in different directions on purpose.
 *
 * 1. **A string blocklist.** The built output is grepped for strings that exist only in the private modules. It
 *    catches a private VALUE that reached a public file — a rate hard-coded into a component, say — which no
 *    amount of module bookkeeping would see. What it cannot do is catch what it was not told to look for, and it
 *    is useless against a module with no distinctive literal: `navPrivate.js` and `gammaExport.js` have none at
 *    all, so no grep could ever protect them.
 *
 * 2. **A module allowlist.** The build writes `.edition-modules.work.json` — every module rollup actually put
 *    in the bundle — and `src/editions/work-allowlist.json` records what is permitted to be there. Anything
 *    present and not permitted fails.
 *
 *    It is an ALLOWLIST because the obvious alternative does not work. Deriving the prohibition from
 *    `WORK_SWAPS` — "no swapped module may appear" — is self-defeating against the very failure it is for:
 *    delete a swap and you delete its test. Removing the `accountPlan.js` swap put that module into the work
 *    bundle with every check in this file still passing. Asking instead "may this module be here at all" is a
 *    question nothing a developer deletes can answer yes.
 *
 * It also checks the public material is still there, so a bundle that excludes everything cannot pass by being
 * empty — and, for the same reason, the manifest is checked for liveness before anything is asserted about it:
 * an empty or stale inventory would make every prohibition below pass without testing anything.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { EDITIONS } from '../src/editions.js'
import { WORK_SWAPS, WORK_PRIVATE_DIRS, MANIFEST, ALLOWLIST } from '../vite.config.js'
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
// ── The module inventory ──────────────────────────────────────────────────────────────────────────
// Read after the build above, which is what writes it.
const manifest = JSON.parse(fs.readFileSync(MANIFEST('work'), 'utf8'))
const shipped = new Set(manifest.modules)

t('the module inventory describes this build, so nothing below passes vacuously', () => {
  // Every prohibition after this one is of the form "X is not in the list". An empty, stale or wrongly-named
  // list would satisfy all of them while testing nothing, so the list has to prove itself first.
  assert.equal(manifest.edition, 'work', 'the manifest is not from a work build')
  assert.ok(Date.now() - Date.parse(manifest.builtAt) < 10 * 60 * 1000, 'the manifest is stale — it was not written by the build just run')
  assert.ok(shipped.size > 100, `only ${shipped.size} modules recorded; the manifest plugin is not seeing the bundle`)
  for (const pub of ['src/App.jsx', 'src/data/entities.js', 'src/pages/Flows.jsx', 'src/utils/prospect.js']) {
    assert.ok(shipped.has(pub), `${pub} is missing from the inventory — it is not recording what was built`)
  }
  assert.ok([...shipped].some((m) => m.startsWith('src/editions/stubs/')), 'no stub is in the bundle, so the swap never fired')
})

t('every module in the work bundle is on the reviewed allowlist', () => {
  // THE check, and the reason it is an allowlist rather than a list of what is forbidden.
  //
  // The first version of this derived the prohibition from WORK_SWAPS — "no swapped module may be present" —
  // which is self-defeating against the exact failure it was written for: deleting a swap deletes its own test.
  // Removing the accountPlan.js swap put that module in the work bundle and every check here still passed.
  //
  // Inverted, the question is "may this module be here at all", and nothing a developer deletes can make the
  // answer yes. A new public module fails too, until `npm run edition:allow` is run and the added line is
  // reviewed — which is the gate, not an inconvenience around it.
  const allowed = new Set(JSON.parse(fs.readFileSync(ALLOWLIST, 'utf8')).modules)
  const uninvited = [...shipped].filter((m) => !allowed.has(m)).sort()
  assert.deepEqual(uninvited, [], `modules in the work bundle that are not on the allowlist:\n    ${uninvited.join('\n    ')}\n  If these are public, run: npm run edition:allow — and read the added lines.`)
  assert.ok(allowed.size >= shipped.size, 'the allowlist is smaller than the bundle it is meant to govern')
})

t('a swap that is still declared still fires', () => {
  // Kept alongside the allowlist, because it fails differently: this one catches a swap that EXISTS and did not
  // apply — an importer spelling the path another way — and names the module, where the allowlist would only
  // say something uninvited arrived.
  const leaked = [...new Set(WORK_SWAPS.map(([from]) => from))].filter((from) => shipped.has(from))
  assert.deepEqual(leaked, [], `declared swaps did not fire: ${leaked.join(', ')}`)
})

t('nothing under a private directory is in the work bundle, swapped or not', () => {
  // `cases/index.js` is swapped, but a page importing `cases/halcyon.js` directly would route around that swap
  // and the swap list would still look complete. This is the check that notices.
  const leaked = [...shipped].filter((m) => WORK_PRIVATE_DIRS.some((d) => m.startsWith(d)))
  assert.deepEqual(leaked, [], `private-directory modules reached the work bundle: ${leaked.join(', ')}`)
  assert.ok(WORK_PRIVATE_DIRS.length > 0 && WORK_PRIVATE_DIRS.every((d) => d.endsWith('/')), 'a private directory must be a directory prefix')
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
console.log(`inventory: ${shipped.size} modules shipped, all on the allowlist · ${new Set(WORK_SWAPS.map(([f]) => f)).size} swaps and ${WORK_PRIVATE_DIRS.length} private directories checked against it`)
console.log(`excluded: ${CLIENT_CATEGORIES.length} PEPI categories · ${ROLES.length} rate-card roles · ${PERSONAS.length} personas · ${HOOKS.length} hooks · ${CASE_LIST.length} lab cases`)
