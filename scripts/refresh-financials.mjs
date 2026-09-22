#!/usr/bin/env node
/**
 * refresh-financials.mjs — reads every SEC-filing company on the canvas from EDGAR's XBRL API and writes
 * data/financials/sec.json. Run daily by .github/workflows/financials.yml; `npm run financials` by hand.
 *
 * Needs SEC_USER_AGENT ("Name email"): SEC refuses anonymous requests. Without it the job says so and exits
 * cleanly, and the freshness audit then reports the figures as due — silence is never mistaken for current.
 *
 * A company whose fetch fails keeps its previous record (with the error beside it), so one bad day never blanks
 * a page. The file is only rewritten when a figure or filing actually changed; UPDATED=<n> is printed last.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ENTITIES } from '../src/data/entities.js'
import { fetchAllFinancials } from '../server/financials.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const file = path.join(root, 'data/financials/sec.json')
const ua = process.env.SEC_USER_AGENT || ''
const before = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { companies: {} }

if (!ua) {
  console.log('SEC_USER_AGENT is not set — SEC refuses anonymous requests, so nothing was refreshed.')
  console.log('UPDATED=0')
  process.exit(0)
}

const { companies, errors, unresolved } = await fetchAllFinancials(ENTITIES, { ua })
const merged = { ...before.companies }
const changed = []
for (const [id, rec] of Object.entries(companies)) {
  if (JSON.stringify(before.companies?.[id]) !== JSON.stringify(rec)) changed.push(id)
  merged[id] = rec
}
const sorted = Object.fromEntries(Object.keys(merged).sort().map((id) => [id, merged[id]]))
const errorsSorted = Object.fromEntries(Object.keys(errors).sort().map((id) => [id, errors[id]]))
const errorsChanged = JSON.stringify(before.errors || {}) !== JSON.stringify(errorsSorted)
if (changed.length || errorsChanged || !fs.existsSync(file)) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const out = { updatedAt: new Date().toISOString(), source: 'SEC EDGAR XBRL (data.sec.gov/api/xbrl/companyfacts)', companies: sorted, errors: errorsSorted, unresolved }
  fs.writeFileSync(file, `${JSON.stringify(out, null, 1)}\n`)
}

console.log(`read ${Object.keys(companies).length} companies · ${changed.length} changed · ${Object.keys(errors).length} errors · ${unresolved.length} US tickers with no SEC filer`)
for (const id of changed) { const c = companies[id]; const r = c.metrics.revenue?.annual; console.log(`  ~ ${id.padEnd(22)} latest filing ${c.latestFiling?.form} ${c.latestFiling?.filed}${r ? ` · revenue ${r.currency} ${(r.value / 1e9).toFixed(2)}B to ${r.end}` : ''}`) }
for (const [id, e] of Object.entries(errors)) console.log(`  ! ${id}: ${e}`)
if (unresolved.length) console.log(`  unresolved: ${unresolved.join(', ')}`)
console.log(`UPDATED=${changed.length}`)
process.exit(0)
