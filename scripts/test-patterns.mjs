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

t('one search box: no page builds its own', () => {
  // Five of them existed, at three heights, two with the magnifier and one without `outline-none` — so the browser
  // drew its own focus ring inside a border that already had a focus colour.
  const rogue = app.filter((f) => /type="search"/.test(f.src)).map((f) => f.file)
  assert.deepEqual(rogue, [], 'use <SearchInput> from primitives')
  const input = fs.readFileSync(new URL('components/primitives/SearchInput.jsx', root), 'utf8')
  assert.match(input, /aria-label=\{label \|\| placeholder\}/, 'a box with no visible label must name itself')
  assert.match(input, /outline-none focus:border-accent/, 'one focus treatment, not two rings')
})

t('one proportion bar, and a real but tiny value never reads as missing', () => {
  const rogue = app.filter((f) => /rounded-sm bg-ground-[34] overflow-hidden/.test(f.src)).map((f) => f.file)
  assert.deepEqual(rogue, [], 'use <Bar> from primitives — seven files drew their own track')
  const bar = fs.readFileSync(new URL('components/primitives/Bar.jsx', root), 'utf8')
  assert.match(bar, /Math\.max\(1\.5, pct\(share\)\)/, 'a 0.3% bar must still be visible, or the row reads as no data')
  assert.match(bar, /width > 0 &&/, 'and a genuine zero must draw nothing, so the two never look alike')
})

t('one way of saying a source is unreachable, and it says what was lost', () => {
  const down = fs.readFileSync(new URL('components/primitives/ServiceDown.jsx', root), 'utf8')
  assert.match(down, /is unreachable/, 'one phrasing')
  assert.match(down, /cost \?/, 'the component exists to carry what the reader loses, not just the fact')
  // The four hand-written variants, in two different tones for the same outage. Only what renders: a hook's doc
  // comment is allowed to describe the state it returns.
  for (const { file, src } of app.filter((f) => f.file.endsWith('.jsx'))) {
    assert.equal(/backend unreachable/.test(src), false, `${file}: a hand-written unreachable message`)
    assert.equal(/service unreachable —/.test(src), false, `${file}: a hand-written unreachable message`)
  }
  const users = app.filter((f) => /<ServiceDown/.test(f.src)).map((f) => f.file)
  assert.ok(users.length >= 4, `only ${users.length} places use the shared failure state`)
})

t('a waiting panel shows the shape of what is coming, not one line of grey text', () => {
  const load = fs.readFileSync(new URL('components/primitives/Loading.jsx', root), 'utf8')
  assert.match(load, /aria-busy="true"/)
  assert.match(load, /aria-live="polite"/, 'the sentence is the accessible announcement; the bars are decoration')
  assert.match(load, /motion-reduce:animate-none/, 'a pulse must stop for anyone who asked motion to stop')
  for (const { file, src } of app) {
    assert.equal(/>Loading…</.test(src), false, `${file}: a bare "Loading…" with no shape`)
    assert.equal(/>Connecting…</.test(src), false, `${file}: a bare "Connecting…"`)
  }
  const users = app.filter((f) => /<Loading/.test(f.src)).map((f) => f.file)
  assert.ok(users.length >= 5, `only ${users.length} waiting panels use the shared loading state`)
})

t('one sideways scrubber, shared by the map and the flow diagrams', () => {
  const side = fs.readFileSync(new URL('components/primitives/SideScroller.jsx', root), 'utf8')
  assert.match(side, /role="scrollbar"/)
  assert.match(side, /aria-valuenow/, 'a scrollbar must report where it is')
  assert.match(side, /ArrowLeft: -STEP/, 'arrow keys move it')
  const users = app.filter((f) => /<SideScroller/.test(f.src)).map((f) => f.file)
  for (const expected of ['src/pages/EntityMap.jsx', 'src/pages/Flows.jsx']) {
    assert.ok(users.includes(expected), `${expected} does not use the shared scrubber`)
  }
})

t('a page states what its own numbers say, and the sentence comes from one place', () => {
  const readings = fs.readFileSync(new URL('utils/readings.js', root), 'utf8')
  assert.match(readings, /export const TOO_FEW/, 'the "too few to read" threshold is declared once')
  const users = app.filter((f) => /<Reading /.test(f.src)).map((f) => f.file)
  assert.ok(users.length >= 8, `only ${users.length} pages say what their numbers say`)
  // A reading is computed, never written into the page: a sentence with a number typed into it goes stale silently.
  for (const { file, src } of app) {
    assert.equal(/<Reading reading=\{\{/.test(src), false, `${file}: a literal reading — it must come from utils/readings.js`)
  }
})

t('a qualification leads with the line that changes the reading', () => {
  const caveat = fs.readFileSync(new URL('components/primitives/Caveat.jsx', root), 'utf8')
  assert.match(caveat, /<details/, 'a real disclosure: keyboard reachable, and findable by find-in-page when open')
  assert.match(caveat, /if \(!more\) return/, 'a one-line caveat stays one line rather than becoming an empty toggle')
  const users = app.filter((f) => /<Caveat/.test(f.src)).map((f) => f.file)
  assert.ok(users.length >= 2, `only ${users.length} places fold their fine print`)
})

t('section labels are headings, so a page has an outline', () => {
  // A heading list of one item is what /deals, /entities and /news used to offer.
  const headed = app.filter((f) => /Eyebrow as="h2"/.test(f.src)).map((f) => f.file)
  assert.ok(headed.length >= 8, `only ${headed.length} section labels are headings`)
  const eyebrow = fs.readFileSync(new URL('components/primitives/Eyebrow.jsx', root), 'utf8')
  assert.match(eyebrow, /as: Tag = 'div'/, 'Eyebrow renders whatever element the section needs')
})

console.log(`\n${n} pattern checks passed.`)
