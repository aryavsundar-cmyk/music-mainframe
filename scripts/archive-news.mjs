#!/usr/bin/env node
/**
 * archive-news.mjs — appends today's music-relevant feed items to the evidence archive (data/archive).
 *
 *   npm run archive                          # run the aggregator now and archive what it finds
 *   npm run archive -- --from snapshot.json  # also merge a saved /api/news response (repeatable; file or URL)
 *   npm run archive -- --no-fetch --from …   # merge snapshots only
 *
 * Runs the real aggregator in-process rather than asking the live service, which may be asleep on a free plan
 * or freshly restarted with an empty cache. Keeps only what could ever be evidence: items about music, and SEC
 * filings that are not routine. What is kept is never rewritten — the archive records what was seen, when.
 * Prints ADDED=<n> last, so the scheduled workflow knows whether there is anything to commit.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { aggregate } from '../server/newsAggregator.js'
import { scoreAll } from '../server/relevanceScorer.js'
import { loadLocalArchive, mergeArchive, writeArchive } from '../server/archive.js'
import { isMusic, isRoutineFiling } from '../src/utils/forces.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const all = (name) => args.flatMap((a, i) => (a === `--${name}` && args[i + 1] ? [args[i + 1]] : []))
const dir = path.resolve(root, all('dir')[0] || 'data/archive')
const fetchNow = !args.includes('--no-fetch')

const incoming = []
const report = []
if (fetchNow) {
  const sources = JSON.parse(fs.readFileSync(path.join(root, 'server/sources.json'), 'utf8'))
  const { items, errors, sourceCount } = await aggregate(sources)
  incoming.push(...scoreAll(items))
  report.push(`aggregator: ${items.length} items from ${sourceCount - errors.length}/${sourceCount} sources`)
  if (errors.length) report.push(`  ${errors.length} source errors (a dead feed only means fewer items today): ${errors.slice(0, 4).map((e) => e.source).join(', ')}${errors.length > 4 ? '…' : ''}`)
}
for (const from of all('from')) {
  const body = /^https?:/.test(from) ? await (await fetch(from)).json() : JSON.parse(fs.readFileSync(path.resolve(from), 'utf8'))
  const items = Array.isArray(body) ? body : body.items || []
  incoming.push(...items)
  report.push(`snapshot ${path.basename(from)}: ${items.length} items`)
}

const keep = incoming.filter((n) => isMusic(n) && !isRoutineFiling(n))
const before = loadLocalArchive(dir)
const { items, added } = mergeArchive(before.items, keep)
const { written, index } = writeArchive(dir, items, { changed: added.length > 0, previousIndex: before.index })

console.log(report.join('\n'))
console.log(`kept ${keep.length} of ${incoming.length} (the rest were not about music, or routine filings)`)
console.log(`added ${added.length} · archive now ${index.count} items · watching since ${index.coverageSince} · months written: ${written.join(', ') || 'none'}`)
for (const x of added.slice(0, 8)) console.log(`  + ${String(x.publishedAt).slice(0, 10)}  ${x.title.slice(0, 90)}`)
if (added.length > 8) console.log(`  … and ${added.length - 8} more`)
console.log(`ADDED=${added.length}`)
// The aggregator's HTTP clients keep sockets and timers alive after the work is done; in a scheduled workflow that
// is a job that hangs until the runner kills it. The archive is written, so leave.
process.exit(0)
