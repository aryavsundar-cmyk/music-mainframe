#!/usr/bin/env node
/**
 * edition-allowlist.mjs — regenerate the list of modules allowed into the work bundle.
 * `npm run edition:allow`
 *
 * The work edition's secrecy was defended two ways before this, and both are blocklists: a list of private
 * STRINGS that may not appear, and a list of private MODULES that may not appear. A blocklist can only refuse
 * what it was told about, and the module one had a worse problem than that — it was derived from `WORK_SWAPS`,
 * so deleting a swap deleted its own test. Removing the `accountPlan.js` swap put that module straight into the
 * work bundle and the whole suite still passed, which is precisely the failure the check existed to prevent.
 *
 * So the list is inverted. `work-allowlist.json` records every module permitted in a work build, and
 * `test:edition` fails on anything present that is not on it. The properties that matters:
 *
 * - a swap that stops applying puts a module in the bundle that is not on the list → **fails**
 * - a new authored module that nobody remembered to swap → **fails**
 * - a new PUBLIC module → also fails, until this script is run and the diff is reviewed
 *
 * That last one is the cost, and it is the point. The allowlist is a reviewed artifact, like a lockfile: the
 * line "+ src/pages/Whatever.jsx" in a diff is somebody consciously saying this belongs in the build that gets
 * handed to other people. A test that never asks anything of you never protects you from anything either.
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MANIFEST, ALLOWLIST, WORK_SWAPS, WORK_PRIVATE_DIRS } from '../vite.config.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

console.log('building the work edition…')
execFileSync('npx', ['vite', 'build'], { cwd: root, env: { ...process.env, MM_EDITION: 'work' }, stdio: 'pipe' })
const { modules } = JSON.parse(fs.readFileSync(MANIFEST('work'), 'utf8'))

// Refuse to write a list that would bless a leak. Regenerating is how the allowlist is maintained, so it is also
// the easiest way to silence a real failure by accident — run it, see it pass, ship the leak. It will not write.
const swapped = new Set(WORK_SWAPS.map(([from]) => from))
const bad = modules.filter((m) => swapped.has(m) || WORK_PRIVATE_DIRS.some((d) => m.startsWith(d)))
if (bad.length) {
  console.error('\nRefusing to write the allowlist: authored modules are in the work bundle.')
  for (const m of bad) console.error(`  ${m}`)
  console.error('\nFix the swap first. Regenerating here would record the leak as permitted.')
  process.exit(1)
}

const before = fs.existsSync(ALLOWLIST) ? JSON.parse(fs.readFileSync(ALLOWLIST, 'utf8')).modules : []
fs.writeFileSync(ALLOWLIST, `${JSON.stringify({
  note: 'Modules permitted in a work build. Regenerate with `npm run edition:allow`; review every added line — this is the list of what gets handed to other people.',
  modules,
}, null, 2)}\n`)

const added = modules.filter((m) => !before.includes(m))
const removed = before.filter((m) => !modules.includes(m))
console.log(`\nwrote ${path.relative(root, ALLOWLIST)} — ${modules.length} modules`)
for (const m of added) console.log(`  + ${m}`)
for (const m of removed) console.log(`  - ${m}`)
if (!added.length && !removed.length) console.log('  (no change)')
