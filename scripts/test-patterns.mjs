#!/usr/bin/env node
/**
 * test-patterns.mjs — one implementation per pattern, and the keyboard can reach all of it.
 * `npm run test:patterns`
 *
 * The UX review counted twenty chip implementations, seven search inputs, four segmented controls, nine copies
 * of the table-header string and thirty-two empty states of which six offered a way out. None of that was a
 * decision; it accumulated one sprint at a time, because nothing stopped it. This does.
 *
 * "Internal consistency is a thankless feature. Only its absence is noticed."
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }
const root = new URL('../src/', import.meta.url)

function allSource(dir = new URL('./', root), out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const folder = !entry.isFile()
    const here = new URL(entry.name + (folder ? '/' : ''), dir)
    if (folder) allSource(here, out)
    else if (/\.jsx?$/.test(entry.name)) out.push({ file: path.relative(new URL('../', root).pathname, here.pathname), src: fs.readFileSync(here, 'utf8') })
  }
  return out
}
const FILES = allSource()
const PRIMITIVES = 'src/components/primitives/'
const app = FILES.filter((f) => !f.file.startsWith(PRIMITIVES))

t('one chip: no page declares its own', () => {
  const rogue = app.filter((f) => /const chip\s*=/.test(f.src)).map((f) => f.file)
  assert.deepEqual(rogue, [], 'use <Chip> from primitives — eleven files used to declare this')
  const classy = app.filter((f) => /rounded-sm border px-2 py-1 t-small/.test(f.src)).map((f) => f.file)
  assert.deepEqual(classy, [], 'the chip class string belongs in primitives/Chip.jsx only')
})

t('one segmented control, and it announces a single choice', () => {
  // A class-string helper, not any variable called `seg` (one page names its score-bar segments that).
  const rogue = app.filter((f) => /const seg\s*=\s*\([^)]*\)\s*=>/.test(f.src)).map((f) => f.file)
  assert.deepEqual(rogue, [], 'use <Segmented> from primitives')
  const seg = fs.readFileSync(new URL('components/primitives/Segmented.jsx', root), 'utf8')
  assert.match(seg, /role="radiogroup"/, 'a one-of-several choice is a radio group, not a row of toggles')
  assert.match(seg, /aria-checked=\{on\}/)
  assert.match(seg, /tabIndex=\{on \? 0 : -1\}/, 'roving focus: the group is one tab stop')
  assert.match(seg, /ArrowRight/, 'arrow keys move between options')
})

t('one table shell, with a header that stays', () => {
  const rogue = app.filter((f) => /const TH\s*=/.test(f.src) && !f.file.includes('utils/')).map((f) => f.file)
  assert.deepEqual(rogue, [], 'use <DataTable> and <Th> — the header string had nine copies')
  const table = fs.readFileSync(new URL('components/primitives/DataTable.jsx', root), 'utf8')
  assert.match(table, /sticky top-0/, 'a column header is needed most once the reader has scrolled past it')
  assert.match(table, /scope="col"/)
  assert.match(table, /aria-sort/, 'a sortable header must say which way it is sorted')
})

t('every empty state offers a way out, or says why there is none', () => {
  const empty = fs.readFileSync(new URL('components/primitives/EmptyState.jsx', root), 'utf8')
  assert.match(empty, /action/, 'the action slot is the point of this component')
  // The bare dead ends the review found.
  for (const { file, src } of app) {
    assert.equal(/>Nothing matches\.</.test(src), false, `${file}: "Nothing matches." with no way out`)
    assert.equal(/>Nothing matches that search\.</.test(src), false, `${file}: dead-end empty state`)
  }
  const users = app.filter((f) => /<EmptyState/.test(f.src)).map((f) => f.file)
  assert.ok(users.length >= 6, `only ${users.length} places use the shared empty state`)
})

t('nothing is clickable that a keyboard cannot reach', () => {
  for (const { file, src } of app) {
    // A <tr>/<div> with onClick and no role, tabIndex or nested control is unreachable.
    for (const m of src.matchAll(/<tr\b([^>]*)>/g)) {
      const attrs = m[1]
      if (!/onClick/.test(attrs)) continue
      assert.equal(/tabIndex/.test(attrs), false, `${file}: a <tr> is not a button — put the control in the first cell`)
    }
    assert.equal(/<div[^>]*onClick[^>]*>\s*\{?\s*<\/div>/.test(src), false, `${file}: a bare clickable div`)
  }
})

t('panels close on Escape and give focus back', () => {
  const hook = fs.readFileSync(new URL('hooks/useDismissable.js', root), 'utf8')
  assert.match(hook, /ev\.key === 'Escape'/)
  assert.match(hook, /back\.focus/, 'focus returns to whatever opened the panel')
  const users = app.filter((f) => /useDismissable\(/.test(f.src)).map((f) => f.file)
  for (const expected of ['src/components/flows/FlowPanel.jsx', 'src/pages/CatalogScan.jsx', 'src/pages/Prospecting.jsx', 'src/components/export/ExportButtons.jsx']) {
    assert.ok(users.includes(expected), `${expected} does not use useDismissable`)
  }
})

t('no ARIA role is claimed without its keyboard contract', () => {
  for (const { file, src } of app) {
    if (/role="menu"/.test(src)) assert.match(src, /ArrowDown/, `${file}: claims role="menu" without arrow-key navigation`)
    if (/role="tablist"/.test(src)) assert.match(src, /aria-controls/, `${file}: claims role="tablist" without pointing at its panels`)
  }
})

t('section labels are headings, so a page has an outline', () => {
  // A heading list of one item is what /deals, /entities and /news used to offer.
  const headed = app.filter((f) => /Eyebrow as="h2"/.test(f.src)).map((f) => f.file)
  assert.ok(headed.length >= 8, `only ${headed.length} section labels are headings`)
  const eyebrow = fs.readFileSync(new URL('components/primitives/Eyebrow.jsx', root), 'utf8')
  assert.match(eyebrow, /as: Tag = 'div'/, 'Eyebrow renders whatever element the section needs')
})

console.log(`\n${n} pattern checks passed.`)
