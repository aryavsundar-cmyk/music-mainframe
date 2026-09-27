#!/usr/bin/env node
/**
 * test-upload.mjs — a document you supplied never becomes a record.
 * `npm run test:upload`
 *
 * Sprints 36 to 39 went into making this application honest about where its figures come from: a gap names its
 * reason, a sponsor is measured by the right figure, a citation is what it looks like. Reading uploaded files is
 * the first feature that can undo all of that in one step, by letting a number out of somebody's PDF sit in a
 * document that reads as the record.
 *
 * So most of what follows is prohibition. The rest guards the one finding that is genuinely dangerous — setting a
 * document's figure beside the canvas's — which was wrong the first time it was written, in a way that looked
 * entirely plausible.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { readOoxml, kindOf, SUPPORTED, MAX_FILE_MB } from '../src/utils/documentText.js'
import { readDocument, mergeReadings, findFigures, findCompanies, nameIndex, compareFigures } from '../src/utils/documentRead.js'
import { uploadSection, withUploads, UPLOAD_TITLE } from '../src/utils/uploadSection.js'
import { buildBrief } from '../src/utils/brief.js'
import { briefXlsxBuffer } from '../src/utils/briefXlsx.js'
import { briefPptxBuffer } from '../src/utils/briefPptx.js'
import { renderBriefText } from '../src/utils/briefText.js'

let n = 0
const T = async (name, fn) => { await fn(); n++; console.log(`✓ ${name}`) }
const SEC = JSON.parse(fs.readFileSync(new URL('../data/financials/sec.json', import.meta.url), 'utf8')).companies
const read = (text, filename = 'pack.pdf', pages = ['a']) => readDocument({ text, filename, kind: 'pdf', pages }, { financials: SEC })

await T('this application can read the file formats it writes', async () => {
  // The OOXML readers are the same knowledge briefXlsx and briefPptx already carry, pointed the other way — which
  // is why mammoth and xlsx were not worth 1.3 MB of bundle. Round-tripping our own output proves the parsers.
  const doc = buildBrief('wmg', { mode: 'full' })
  const book = await readOoxml('xlsx', await briefXlsxBuffer(doc))
  assert.ok(book.text.includes('Warner'), 'the workbook reader lost the content')
  assert.match(book.text, /sheet 1/, 'sheets must be separated, or a figure loses its table')
  const deck = await readOoxml('pptx', await briefPptxBuffer(doc))
  assert.ok(deck.pages.length >= 5, `only ${deck.pages.length} slides read back`)
  assert.ok(deck.text.includes('Warner'), 'the deck reader lost the content')
  assert.match(deck.text, /slide 1/, 'slides must be numbered, so "p.4" means something')
  for (const ext of ['.pdf', '.docx', '.pptx', '.xlsx', '.csv', '.md']) assert.ok(SUPPORTED.includes(ext), `${ext} is not accepted`)
  assert.equal(kindOf('Seller Pack.PPTX'), 'pptx', 'extension matching must ignore case')
  assert.equal(kindOf('notes.rtf'), null, 'an unsupported file must be refused, not guessed at')
  assert.ok(MAX_FILE_MB >= 10)
})

await T('a figure belongs to the company it is written about, not every company nearby', () => {
  // The bug this exists for. "Warner Music Group reported revenue of $6.4 billion, while Universal Music Group
  // posted EUR 12.5B" — the first version asked "does the context window contain the name" and cheerfully gave
  // Warner's figure to Universal as well. Plausible, well-formatted and wrong.
  const text = 'Warner Music Group reported revenue of $6.4 billion for the year, while Universal Music Group posted €12.5B.'
  const r = read(text)
  const wmg = r.checks.find((c) => c.entityId === 'wmg')
  const umg = r.checks.find((c) => c.entityId === 'umg')
  assert.ok(wmg, 'Warner lost its own figure')
  assert.equal(wmg.theirs.text, '$6.4 billion')
  assert.ok(umg, 'Universal lost its own figure')
  assert.equal(umg.theirs.text, '€12.5B', 'Universal was given the figure written about Warner')
  // Direction: prose reads "X reported $N", so a name before the figure beats one after it at the same distance.
  const after = read('Revenue of $9.9 billion was reported by Sony Music Group.')
  assert.equal(after.checks.length <= 1, true)
  // And a figure far from any company name belongs to none of them.
  const far = findFigures('Warner Music Group is discussed at length. '.padEnd(400, 'x') + ' The total was $4.2 billion.')
  const none = compareFigures(findCompanies('Warner Music Group is discussed at length. '.padEnd(400, 'x') + ' The total was $4.2 billion.'), far, { financials: SEC })
  assert.deepEqual(none, [], 'a figure 400 characters from a name was attributed to it')
})

await T('a comparison reports two numbers and picks neither', () => {
  const r = read('Warner Music Group reported revenue of $6.4 billion in the period.')
  const c = r.checks.find((x) => x.entityId === 'wmg')
  assert.ok(c.theirs.text && c.ours.text, 'both sides must be named')
  assert.equal(typeof c.differs, 'boolean')
  assert.equal(c.verify, true, 'a finding from a document is always unverified')
  // Nothing in the finding says which one is right, and nothing writes back to the canvas.
  assert.equal('correct' in c, false)
  assert.equal('correctedValue' in c, false)
  const section = uploadSection(mergeReadings([r]))
  const words = JSON.stringify(section).toLowerCase()
  // Phrases that only ever appear in a sentence adjudicating between the two. "neither is corrected here" is the
  // sentence doing the right thing, so the bare word "corrected" cannot be the test.
  for (const banned of ['is wrong', 'is incorrect', 'should be', 'has been corrected', 'we corrected', 'the correct figure']) {
    assert.equal(words.includes(banned), false, `the section adjudicates: "${banned}"`)
  }
  assert.match(JSON.stringify(section), /neither is corrected here/, 'the section must say it is not adjudicating')
  // Two currencies cannot be compared at all, and the section says so rather than converting.
  const mixed = read('Universal Music Group reported $13.2 billion of revenue.')
  const um = mixed.checks.find((x) => x.entityId === 'umg')
  if (um) assert.equal(um.differs, null, 'a cross-currency pair must not be judged')
})

await T('short names only match when they are unambiguous', () => {
  const index = nameIndex()
  // PPL is three letters and a real society; it is allowed in because it is matched case-sensitively.
  const ppl = findCompanies('PPL collections were £310 million.', { index })
  assert.ok(ppl.some((c) => c.id === 'ppl'), 'PPL was not found')
  const chat = findCompanies('there were a lot of ppl at the show', { index })
  assert.equal(chat.some((c) => c.id === 'ppl'), false, 'lowercase "ppl" was read as a collecting society')
  // A longer name wins the span it covers: "Sony Music Publishing" must not also report "Sony Music".
  const sony = findCompanies('Sony Music Publishing completed the acquisition.', { index })
  const ids = sony.map((c) => c.id)
  assert.ok(ids.includes('sony-music-publishing'), 'the specific company was missed')
  assert.equal(ids.includes('sony-music-entertainment'), false, 'a shorter name double-counted the same words')
})

await T('money is read the way documents actually write it', () => {
  const cases = [
    ['£315.3 million', 315.3e6, 'GBP'], ['$3.5bn', 3.5e9, 'USD'], ['€1.2B', 1.2e9, 'EUR'],
    ['KRW 8.099 trillion', 8.099e12, 'KRW'], ['₹1,175,919 crore', 1175919e7, 'INR'], ['A$18.8m', 18.8e6, 'AUD'],
  ]
  for (const [text, value, currency] of cases) {
    const [hit] = findFigures(`The figure was ${text} for the year.`)
    assert.ok(hit, `${text} was not read as money`)
    assert.equal(hit.value, value, `${text} parsed as ${hit.value}`)
    assert.equal(hit.currency, currency)
  }
  // A page number, a year and a small bare count are not money.
  assert.deepEqual(findFigures('see page 12, in 2024, across 350 accounts'), [])
  for (const f of findFigures('Revenue of $6.4 billion.')) {
    assert.ok(f.context.includes('Revenue'), 'a figure must carry the words around it')
    assert.equal(f.verify, true)
  }
})

await T('every finding says which file and which page it came from', () => {
  const r = readDocument({
    text: '— page 1 —\nNothing here.\n\n— page 2 —\nWarner Music Group reported $6.4 billion.',
    filename: 'seller-pack.pdf', kind: 'pdf', pages: ['Nothing here.', 'Warner Music Group reported $6.4 billion.'],
  }, { financials: SEC })
  for (const f of r.figures) {
    assert.equal(f.from, 'seller-pack.pdf', 'a figure with no filename cannot be told from a figure off the record')
    assert.ok(f.page, 'a figure must name its page')
  }
  for (const c of r.companies) assert.ok(c.where.every((w) => w.from === 'seller-pack.pdf'))
  // And the provenance survives into the exported document.
  const text = renderBriefText(withUploads(buildBrief('wmg', { mode: 'full' }), mergeReadings([r])))
  assert.ok(text.includes('seller-pack.pdf'), 'the filename did not reach the export')
})

await T('supplied material is its own section, and never touches the canvas sections', () => {
  const plain = buildBrief('wmg', { mode: 'full' })
  const findings = mergeReadings([read('Warner Music Group reported $6.4 billion. PPL collected £310 million.', 'client-pack.pdf')])
  const merged = withUploads(plain, findings)

  // A deliverable with no uploads is exactly what it was before this feature existed.
  assert.deepEqual(withUploads(plain, null), plain)
  assert.deepEqual(withUploads(plain, { files: [] }), plain)
  // The original is never mutated, and the section is never added twice.
  assert.equal(plain.sections.length + 1, merged.sections.length)
  assert.equal(withUploads(merged, findings).sections.length, merged.sections.length)

  const supplied = merged.sections.at(-1)
  assert.equal(supplied.title, UPLOAD_TITLE)
  assert.match(supplied.title, /you provided/i, 'the title must say whose words these are')
  assert.match(JSON.stringify(supplied.blocks[0]), /not from this application's own records/)

  // The prohibition that matters: no canvas section mentions the file, and the supplied section is the only one
  // carrying material the records never saw.
  for (const s of merged.sections.slice(0, -1)) {
    assert.equal(JSON.stringify(s).includes('client-pack.pdf'), false, `"${s.title}" carries uploaded material`)
  }
})

await T('nothing is uploaded anywhere, and the code has nowhere to upload it to', () => {
  // The framing on /about says this tool holds no client data. Client-side parsing is what makes that structural
  // rather than a promise, so the absence of an endpoint is worth asserting rather than trusting.
  const server = fs.readFileSync(new URL('../server/index.js', import.meta.url), 'utf8')
  assert.equal(/multer|formidable|busboy|multipart/i.test(server), false, 'the server grew a file-upload route')
  const parse = fs.readFileSync(new URL('../src/utils/documentText.js', import.meta.url), 'utf8')
  assert.equal(/fetch\(|XMLHttpRequest|FormData/.test(parse), false, 'the parser sends the file somewhere')
  const reader = fs.readFileSync(new URL('../src/utils/documentRead.js', import.meta.url), 'utf8')
  assert.equal(/fetch\(|XMLHttpRequest/.test(reader), false, 'the reader sends findings somewhere')
  const panel = fs.readFileSync(new URL('../src/components/deliverables/DocumentUpload.jsx', import.meta.url), 'utf8')
  assert.match(panel, /no file was uploaded anywhere/i, 'the panel must say where the file went')
})

console.log(`\n${n} upload checks passed.`)
