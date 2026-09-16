#!/usr/bin/env node
/**
 * test-pagedocs.mjs — page-level exports: what is on screen, and nothing it does not say.
 * `npm run test:pagedocs`
 *
 * The risk with a view export is not that it crashes. It is that it looks complete when it is not: a filtered
 * table of 13 entities, opened next week by someone who reads it as the whole industry. So most of these checks
 * are about what the document SAYS about itself — the filters, the counts, the truncation — rather than shape.
 */
import assert from 'node:assert/strict'
import { buildPageDoc, describeFilters, filterSentence, MAX_TABLE_ROWS } from '../src/utils/pageDocs.js'
import { renderBriefText } from '../src/utils/briefText.js'
import { renderBriefMarkdown } from '../src/utils/briefMarkdown.js'
import { briefXlsxBuffer, workbookSheets } from '../src/utils/briefXlsx.js'
import { briefDocxBuffer } from '../src/utils/briefDocx.js'
import { briefPptxBuffer } from '../src/utils/briefPptx.js'
import { RENDERERS } from '../src/utils/download.js'
import { EDITIONS } from '../src/editions.js'
import { ENTITIES, filterEntities, COUNTS } from '../src/data/entities.js'
import { TRANSACTIONS, filterTransactions, TX_TOTALS } from '../src/data/transactions.js'
import { GLOSSARY } from '../src/data/glossary.js'

let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }
const T = async (name, fn) => { await fn(); n++; console.log(`✓ ${name}`) }
const textOf = (doc) => renderBriefText(doc).replace(/\s+/g, ' ')
const rows = (count) => Array.from({ length: count }, (_, i) => [`Row ${i + 1}`, 'value'])

t('a filtered export states that it is filtered, and by what', () => {
  const doc = buildPageDoc({
    title: 'Entities',
    filters: describeFilters({ type: 'label', tier: 'a', q: '' }, { type: { label: 'Type', format: (v) => v.toUpperCase() }, tier: { label: 'Tier' } }),
    columns: ['Entity', 'Type'],
    rows: rows(13),
    total: 188,
  })
  const text = textOf(doc)
  assert.ok(text.includes('Type: LABEL'), 'the filter is named, in the reader’s words')
  assert.ok(text.includes('Tier: a'), 'every applied filter is named')
  assert.ok(!text.includes('Search'), 'an empty filter is not listed as applied')
  assert.ok(text.includes('13 of 188'), 'the record count says how much of the whole this is')
  assert.ok(/It is not the full table/.test(text), 'the document says plainly that it is a subset')
})

t('an unfiltered export does not pretend to be filtered, and says nothing alarming', () => {
  const doc = buildPageDoc({ title: 'Entities', filters: [], columns: ['Entity'], rows: rows(188), total: 188 })
  const text = textOf(doc)
  assert.ok(text.includes('None — the full table'), 'an unfiltered view says so')
  assert.ok(!/It is not the full table/.test(text), 'no subset warning when nothing was filtered')
})

t('a truncated table says where it stops and where the rest is', () => {
  const doc = buildPageDoc({ title: 'Deals', columns: ['Date', 'Deal'], rows: rows(MAX_TABLE_ROWS + 50), total: MAX_TABLE_ROWS + 50 })
  const table = doc.sections.find((s) => s.blocks.some((b) => b.kind === 'table')).blocks.find((b) => b.kind === 'table')
  assert.equal(table.rows.length, MAX_TABLE_ROWS, 'the table is capped')
  assert.ok(textOf(doc).includes(`stops at ${MAX_TABLE_ROWS} rows`), 'the cap is stated, not silent')
  assert.ok(textOf(doc).includes('Excel'), 'and it points at the format that holds the rest')
})

t('an empty view exports an empty result, not an empty file', () => {
  const doc = buildPageDoc({ title: 'Deals', filters: [{ label: 'Year', value: '1998' }], columns: ['Date', 'Deal'], rows: [], total: 61 })
  const text = textOf(doc)
  assert.ok(text.includes('No records match these filters'), 'the document states the empty result')
  assert.ok(text.includes('Year: 1998'), 'and still records which filters produced it')
  assert.ok(!doc.sections.some((s) => s.blocks.some((b) => b.kind === 'table')), 'no empty table block is emitted')
})

t('rows are exported in the order the page displayed them', () => {
  const ordered = [['C'], ['A'], ['B']]
  const doc = buildPageDoc({ title: 'Any', columns: ['Name'], rows: ordered })
  const table = doc.sections.find((s) => s.blocks.some((b) => b.kind === 'table')).blocks.find((b) => b.kind === 'table')
  assert.deepEqual(table.rows, [['C'], ['A'], ['B']], 'the builder must never re-sort what the screen sorted')
})

t('describeFilters drops empties and formats values for a reader', () => {
  const out = describeFilters({ q: '', type: 'dsp', verify: false, tier: 'a' }, { type: { label: 'Type', format: () => 'DSP' }, tier: { label: 'Tier' } })
  assert.deepEqual(out, [{ label: 'Type', value: 'DSP' }, { label: 'Tier', value: 'a' }])
  assert.equal(filterSentence([]), 'Unfiltered')
  assert.ok(filterSentence(out, { shown: 5, total: 40 }).includes('5 of 40 records'))
})

t('every value reaches the document as text, whatever the page passed', () => {
  const doc = buildPageDoc({ title: 'Mixed', columns: ['A', 'B', 'C'], rows: [[1, null, undefined], [0, false, 'x']] })
  const table = doc.sections.find((s) => s.blocks.some((b) => b.kind === 'table')).blocks.find((b) => b.kind === 'table')
  assert.deepEqual(table.rows, [['1', '', ''], ['0', 'false', 'x']], 'null and undefined become empty cells, not "null"')
})

await T('real views export: entities, deals and the glossary, in every format', async () => {
  const views = [
    buildPageDoc({ slug: 'entities', title: 'Entities', filters: describeFilters({ type: 'label' }, { type: { label: 'Type' } }), columns: ['Entity', 'Type', 'HQ'], rows: filterEntities({ type: 'label' }).map((e) => [e.name, e.type, e.hq || '']), total: COUNTS.total }),
    buildPageDoc({ slug: 'deals', title: 'Deals', columns: ['Date', 'Transaction', 'Value'], rows: filterTransactions({}).map((x) => [x.date, x.title, x.value ? String(x.value) : 'undisclosed']), total: TX_TOTALS.count }),
    buildPageDoc({ slug: 'finance-explained', title: 'Finance, explained', columns: ['Term', 'What it is'], rows: GLOSSARY.map((g) => [g.term, g.plain || g.short]), total: GLOSSARY.length }),
  ]
  for (const doc of views) {
    assert.ok(doc.sections.length >= 2 && doc.sections.every((s) => s.num), `${doc.slug} sections are numbered`)
    assert.ok(renderBriefText(doc).length > 300 && renderBriefMarkdown(doc).length > 300, `${doc.slug} renders as text`)
    const sheets = workbookSheets(doc)
    assert.ok(sheets.length >= 3, `${doc.slug} produced ${sheets.length} sheets — expected a table sheet of its own`)
    assert.ok((await briefXlsxBuffer(doc)).length > 2000, `${doc.slug} workbook is too small to be real`)
    assert.ok((await briefDocxBuffer(doc)).length > 4000, `${doc.slug} Word file is too small to be real`)
    assert.ok((await briefPptxBuffer(doc)).length > 4000, `${doc.slug} deck is too small to be real`)
  }
})

await T('a deck cuts a long table, and says so on the slide', async () => {
  // pptxgenjs writes the slide XML into the package, so the marker is findable in the raw bytes.
  const doc = buildPageDoc({ title: 'Entities', columns: ['Entity', 'Type'], rows: ENTITIES.slice(0, 60).map((e) => [e.name, e.type]), total: COUNTS.total })
  const buf = await briefPptxBuffer(doc)
  assert.ok(buf.toString('latin1').includes('more rows'), 'a truncated slide table must say how many rows it dropped')
})

t('every page export is available in every format the edition offers', () => {
  for (const [name, ed] of Object.entries(EDITIONS)) {
    for (const f of ed.exports.filter((x) => !x.startsWith('gamma'))) {
      assert.ok(typeof RENDERERS[f] === 'function', `${name} edition offers "${f}" with no renderer — page exports would fall back silently`)
    }
  }
})

t('score pages can carry their limits, and the limits are the shared ones', () => {
  const doc = buildPageDoc({ title: 'Buyer match', columns: ['Buyer'], rows: [['Someone']], limits: ['match', 'availability'] })
  const text = textOf(doc)
  assert.ok(text.includes('not that they are interested'), 'the match limit travels with the file')
  assert.ok(text.includes('not a claim that an asset is for sale'), 'the availability limit travels with the file')
})

console.log(`\n${n} checks passed`)
console.log(`entities ${ENTITIES.length} · transactions ${TRANSACTIONS.length} · glossary ${GLOSSARY.length} · table cap ${MAX_TABLE_ROWS}`)
