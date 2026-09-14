#!/usr/bin/env node
/**
 * generate-briefs.mjs — batch exports from Node, same renderers as the app (Patterns §8).
 *
 *   node scripts/generate-briefs.mjs --entity concord [--entity blackstone …] [--kind brief|account-plan|proposal|category-deck]
 *                                    [--modes full,financial] [--category publisher-rollups] [--lines diligence,pmi]
 *                                    [--formats docx,pptx,txt,md] [--out-dir ./exports] [--api http://localhost:3002]
 *
 * Citations come from the running news server at --api; if it is unreachable the briefs still generate and
 * say so in § In the news. Also the smoke test that the renderers work outside the browser.
 */
import fs from 'node:fs'
import path from 'node:path'
import { buildBrief, briefFilename, modesFor } from '../src/utils/brief.js'
import { getEntity } from '../src/data/entities.js'
import { fetchCitations } from '../src/utils/newsCitations.js'
import { renderBriefText } from '../src/utils/briefText.js'
import { briefDocxBuffer } from '../src/utils/briefDocx.js'
import { briefPptxBuffer } from '../src/utils/briefPptx.js'
import { renderBriefMarkdown } from '../src/utils/briefMarkdown.js'
import { buildAccountPlan } from '../src/utils/accountPlan.js'
import { buildProposal } from '../src/utils/proposal.js'
import { buildCategoryDeck } from '../src/utils/categoryDeck.js'

const args = process.argv.slice(2)
const get = (flag) => args.flatMap((a, i) => (a === flag ? [args[i + 1]] : a.startsWith(`${flag}=`) ? [a.slice(flag.length + 1)] : []))
const entities = get('--entity')
const formats = (get('--formats')[0] || 'docx,pptx,txt').split(',')
const modesArg = get('--modes')[0]
const kind = get('--kind')[0] || 'brief'
const categoryId = get('--category')[0] || ''
const linesArg = get('--lines')[0]
const outDir = path.resolve(get('--out-dir')[0] || './exports')
const api = get('--api')[0] || 'http://localhost:3002'

if (kind === 'category-deck') {
  const doc = buildCategoryDeck(categoryId)
  if (!doc) { console.error(`no category "${categoryId}"`); process.exit(1) }
  fs.mkdirSync(outDir, { recursive: true })
  for (const f of formats) { const file = path.join(outDir, briefFilename(doc, f)); fs.writeFileSync(file, f === 'txt' ? renderBriefText(doc) : f === 'md' ? renderBriefMarkdown(doc) : f === 'docx' ? await briefDocxBuffer(doc) : await briefPptxBuffer(doc)); console.log(path.basename(file), fs.statSync(file).size, 'B') }
  console.log(`→ ${outDir}`); process.exit(0)
}
if (!entities.length) { console.error('usage: --entity <id> [--entity <id>] [--modes full,financial] [--formats docx,pptx,txt] [--out-dir dir] [--api url]'); process.exit(1) }
fs.mkdirSync(outDir, { recursive: true })

for (const id of entities) {
  const e = getEntity(id)
  if (!e) { console.error(`skip: no entity "${id}"`); continue }
  const citations = await fetchCitations({ entityId: id, limit: 8, base: api })
  const modes = kind === 'brief' ? (modesArg ? modesArg.split(',') : modesFor(e)) : [kind]
  for (const mode of modes) {
    const brief = kind === 'account-plan' ? buildAccountPlan(id, { citations }) : kind === 'proposal' ? buildProposal(id, { categoryId, lines: linesArg ? linesArg.split(',') : [], citations }) : buildBrief(id, { mode, citations })
    for (const f of formats) {
      const file = path.join(outDir, briefFilename(brief, f))
      if (f === 'txt') fs.writeFileSync(file, renderBriefText(brief))
      else if (f === 'md') fs.writeFileSync(file, renderBriefMarkdown(brief))
      else if (f === 'docx') fs.writeFileSync(file, await briefDocxBuffer(brief))
      else if (f === 'pptx') fs.writeFileSync(file, await briefPptxBuffer(brief))
      console.log(`${path.basename(file).padEnd(56)} ${String(fs.statSync(file).size).padStart(8)} B  citations:${citations.source}`)
    }
  }
}
console.log(`→ ${outDir}`)
