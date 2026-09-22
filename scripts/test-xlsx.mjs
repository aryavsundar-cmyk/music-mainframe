#!/usr/bin/env node
/**
 * test-xlsx.mjs — the Excel exporter, against the same block model every other renderer consumes.
 * `npm run test:xlsx`
 *
 * Checks the workbook is structurally valid (every part parses, every sheet is declared and related), that a
 * table becomes a sheet with its header row, that notes and citations travel to the Sources sheet, that sheet
 * names obey Excel's rules, and that only genuinely numeric cells become numbers.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import JSZip from 'jszip'
import { xml2js } from 'xml-js'
import { briefXlsxBuffer, sheetName, workbookSheets } from '../src/utils/briefXlsx.js'
import { buildTargetList } from '../src/utils/prospectDocs.js'
import { buildCatalogScan } from '../src/utils/marketDocs.js'
import { buildAccounts } from '../src/utils/prospect.js'
import { scanCatalogs } from '../src/utils/catalogScan.js'
import { LIMITS } from '../src/data/limits.js'
import { EDITIONS, IS_WORK } from '../src/editions.js'
import { RENDERERS, exportDoc } from '../src/utils/download.js'
import { withFraming, FRAMING_TITLE } from '../src/utils/framing.js'
import { renderBriefText } from '../src/utils/briefText.js'

const TODAY = new Date('2026-09-16T00:00:00Z')
let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }
const T = async (name, fn) => { await fn(); n++; console.log(`✓ ${name}`) }

const doc = {
  title: 'Demo', subtitle: 'sub', generatedAt: '2026-09-16T00:00:00.000Z', asOf: '2026-09-16',
  sections: [{ num: 1, eyebrow: 'A', title: 'Numbers', blocks: [
    { kind: 'stats', items: [{ label: 'Count', value: '42' }, { label: 'Money', value: '$1,501K' }] },
    { kind: 'table', columns: ['Name', 'Value'], rows: [['Alpha', '1,234'], ['Beta', '$12M'], ['Gamma & Co <test>', '-7.5']] },
    { kind: 'note', text: LIMITS.match.claim },
  ] }],
  citations: { items: [{ label: 'Source A', url: 'https://example.com' }], source: 'live' },
}

t('a table becomes a sheet, with the header row first', () => {
  const sheets = workbookSheets(doc)
  assert.deepEqual(sheets.map((s) => s.name), ['Summary', 'Numbers', 'Sources & notes'])
  const table = sheets[1]
  assert.deepEqual(table.rows[0], ['Name', 'Value'])
  assert.equal(table.rows.length, 4)
  assert.equal(table.headerRows, 1)
})
t('stats and facts land on the summary; notes and citations land on sources', () => {
  const [summary, , sources] = workbookSheets(doc)
  assert.ok(summary.rows.some((r) => r[0] === 'Count' && r[1] === '42'))
  assert.ok(sources.rows.some((r) => r[0] === 'Source A' && r[1] === 'https://example.com'))
  assert.ok(sources.rows.some((r) => String(r[1]).includes(LIMITS.match.claim)), 'the limit note travels with the numbers')
})
t('sheet names obey Excel: 31 characters, no forbidden punctuation, unique', () => {
  assert.equal(sheetName('Bad:Name/With*Chars', new Set()), 'Bad Name With Chars')
  assert.ok(sheetName('A'.repeat(60), new Set()).length <= 31)
  const taken = new Set()
  assert.equal(sheetName('Deals', taken), 'Deals')
  assert.equal(sheetName('Deals', taken), 'Deals (2)')
  assert.equal(sheetName('', taken), 'Sheet')
})
await T('the workbook is a valid package: every part parses and every sheet is related', async () => {
  const zip = await JSZip.loadAsync(await briefXlsxBuffer(doc))
  const names = Object.keys(zip.files)
  for (const required of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/worksheets/sheet1.xml']) {
    assert.ok(names.includes(required), `missing part: ${required}`)
  }
  for (const name of names.filter((f) => f.endsWith('.xml'))) {
    const xml = await zip.file(name).async('string')
    assert.doesNotThrow(() => xml2js(xml, { compact: false }), `part does not parse: ${name}`)
  }
  const wb = xml2js(await zip.file('xl/workbook.xml').async('string'), { compact: true })
  const declared = [].concat(wb.workbook.sheets.sheet)
  assert.equal(declared.length, 3)
  const rels = xml2js(await zip.file('xl/_rels/workbook.xml.rels').async('string'), { compact: true })
  const ids = new Set([].concat(rels.Relationships.Relationship).map((r) => r._attributes.Id))
  for (const s of declared) assert.ok(ids.has(s._attributes['r:id']), `sheet without a relationship: ${s._attributes.name}`)
})
await T('only genuinely numeric cells become numbers, and markup is escaped', async () => {
  const zip = await JSZip.loadAsync(await briefXlsxBuffer(doc))
  const sheet = await zip.file('xl/worksheets/sheet2.xml').async('string')
  assert.ok(sheet.includes('<v>1234</v>'), '"1,234" should be a number')
  assert.ok(sheet.includes('<v>-7.5</v>'), '"-7.5" should be a number')
  assert.ok(!sheet.includes('<v>12</v>'), '"$12M" must not be reduced to 12')
  assert.ok(sheet.includes('$12M'), '"$12M" stays exactly as formatted')
  assert.ok(sheet.includes('Gamma &amp; Co &lt;test&gt;'), 'markup is escaped')
  assert.ok(sheet.includes('state="frozen"'), 'the header row is frozen')
})
await T('real documents export: a target list and a catalog scan', async () => {
  const accounts = buildAccounts({ today: TODAY })
  for (const d of [buildTargetList(accounts, {}, { limit: 10 }), buildCatalogScan(scanCatalogs({ today: TODAY }).slice(0, 10))]) {
    const sheets = workbookSheets(d)
    assert.ok(sheets.length >= 3, `${d.slug} produced ${sheets.length} sheets`)
    assert.equal(new Set(sheets.map((s) => s.name.toLowerCase())).size, sheets.length, 'sheet names are unique')
    for (const s of sheets) assert.ok(s.name.length <= 31 && s.rows.length, `bad sheet in ${d.slug}: ${s.name}`)
    const buf = await briefXlsxBuffer(d)
    assert.ok(buf.length > 2000, `${d.slug} workbook is ${buf.length} bytes`)
  }
})
t('both editions offer Excel, and only the full edition offers Gamma', () => {
  assert.ok(EDITIONS.full.exports.includes('xlsx') && EDITIONS.work.exports.includes('xlsx'))
  assert.ok(EDITIONS.full.exports.some((f) => f.startsWith('gamma')))
  assert.ok(!EDITIONS.work.exports.some((f) => f.startsWith('gamma')), 'the work edition must not offer Gamma')
})

await T('a document carries its edition framing out of the building', async () => {
  const doc = buildTargetList(buildAccounts({ today: TODAY }), {}, { limit: 5 })
  const framed = withFraming(doc)
  if (IS_WORK) {
    const section = framed.sections.at(-1)
    assert.equal(section.title, FRAMING_TITLE, 'the research edition must append its framing section')
    assert.ok(renderBriefText(framed).includes('not a firm system of record'), 'the text render drops the framing')
    const sources = workbookSheets(framed).at(-1).rows.flat().join(' ')
    assert.ok(sources.includes('not a firm system of record'), 'the workbook drops the framing')
    assert.equal(withFraming(framed).sections.length, framed.sections.length, 'framing must not be appended twice')
  } else {
    assert.equal(framed.sections.length, doc.sections.length, 'the full edition adds no framing section')
  }
})
t('every format an edition advertises has its own renderer — no silent fallback', () => {
  // Sprint 20 shipped Word bytes named .xlsx: download.js had no xlsx branch and its `else` rendered docx,
  // while the return value still reported a filename and a section count. Absence is the thing to assert.
  for (const [name, ed] of Object.entries(EDITIONS)) {
    for (const f of ed.exports.filter((x) => !x.startsWith('gamma'))) {
      assert.ok(typeof RENDERERS[f] === 'function', `${name} edition advertises "${f}" with no renderer in download.js`)
    }
  }
  const fns = Object.values(RENDERERS)
  assert.equal(new Set(fns).size, fns.length, 'two formats share one renderer — one of them writes the wrong file type')
  assert.rejects(() => exportDoc({ sections: [], slug: 'x' }, 'pdf'), /No renderer/, 'an unknown format must throw, not produce a mislabelled file')
})
t('every export menu takes its formats from the edition manifest', () => {
  // ExportButtons once hard-coded Word/Slides/Text/MD: no Excel anywhere, and Markdown in the work edition,
  // whose manifest excludes it. A literal format list in a menu is how that happens.
  const src = fs.readFileSync(new URL('../src/components/export/ExportButtons.jsx', import.meta.url), 'utf8')
  assert.ok(src.includes('EXPORT_FORMATS'), 'ExportButtons must read the manifest')
  assert.ok(!/\[\s*\[\s*'docx'/.test(src), 'ExportButtons must not carry its own format list')
})

console.log(`\n${n} checks passed`)
console.log(`formats — full: ${EDITIONS.full.exports.join(', ')}`)
console.log(`formats — work: ${EDITIONS.work.exports.join(', ')}`)
