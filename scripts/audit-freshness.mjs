#!/usr/bin/env node
/**
 * audit-freshness.mjs — every financial figure on the canvas, judged: current, pending, final, or due.
 *
 *   npm run freshness                 # print the report
 *   npm run freshness -- --out f.md   # also write it as Markdown (the workflow's issue body)
 *
 * The daily financials workflow runs this after the SEC refresh and keeps one GitHub issue — the refresh queue —
 * open while anything is due, closing it when nothing is. That is the programmatic half of keeping hand-entered
 * figures current: they cannot be fetched, but they can never go stale without someone being told.
 * Prints DUE=<n> last.
 */
import fs from 'node:fs'
import { ENTITIES } from '../src/data/entities.js'
import { freshnessReport } from '../src/utils/freshness.js'

const args = process.argv.slice(2)
const out = args[args.indexOf('--out') + 1] && args.includes('--out') ? args[args.indexOf('--out') + 1] : ''
const secFile = new URL('../data/financials/sec.json', import.meta.url)
const sec = fs.existsSync(secFile) ? JSON.parse(fs.readFileSync(secFile, 'utf8')) : { companies: {} }
const report = freshnessReport(ENTITIES, sec.companies)
const by = (s) => report.filter((x) => x.f.status === s)
const due = by('due'); const pending = by('pending'); const final = by('final'); const current = by('current')

const line = ({ e, f }) => `- **${e.name}** (\`${e.id}\`) — ${f.label || ''}${f.dueSince ? ` · since ${f.dueSince}` : ''}. ${f.reason}${f.source ? ` [source](${f.source})` : ''}`
const md = [
  `# Data refresh queue`,
  ``,
  `Audited ${new Date().toISOString().slice(0, 10)}: ${report.length} companies with financial figures — ${due.length} due, ${pending.length} pending, ${final.length} last disclosed, ${current.length} current. SEC figures last changed ${sec.updatedAt?.slice(0, 10) || 'never'}.`,
  ``,
  `## Due — needs updating`,
  due.length ? due.map(line).join('\n') : '_Nothing is due._',
  ``,
  `For a hand-entered figure: find the newer result, update \`metrics\` in \`src/data/entities/*.js\` with \`revenueSource\` and \`revenuePublished\`, and run \`npm test\`. For an SEC filer, a "due" verdict usually means the daily refresh has stopped — check the workflow log and the \`SEC_USER_AGENT\` secret.`,
  ``,
  `## Pending — a newer report is filed, SEC has not structured its figures yet`,
  pending.length ? pending.map(line).join('\n') : '_None._',
  ``,
  `## Last disclosed — the company no longer publishes a newer figure`,
  final.length ? final.map(line).join('\n') : '_None._',
].join('\n')

console.log(md)
if (out) fs.writeFileSync(out, `${md}\n`)
console.log(`\nDUE=${due.length}`)
