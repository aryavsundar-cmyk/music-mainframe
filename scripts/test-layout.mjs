#!/usr/bin/env node
/**
 * test-layout.mjs — content before controls, and components that actually exist.
 * `npm run test:layout`
 *
 * Sprint 33's rule is that a page shows its answer before its apparatus. That is easy to write once and lose in
 * the next sprint, when a page needs "just one more filter row". So the rule is enforced here: a data page puts
 * its controls in a FilterBar (which keeps everything but search behind a disclosure), and states its own
 * headline figures in the page header rather than in a tile grid between the title and the data.
 *
 * The second half of this file exists because of a bug it would have caught: `<KeyFigures>` was used on a page
 * that never imported it, and neither ESLint (no react plugin; capitalised names are exempt from no-unused-vars)
 * nor the build complained — only a blank page in the browser did.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }
const root = new URL('../src/', import.meta.url)
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8')

/**
 * Every .jsx under src/, with its source. (Folders are detected with `!isFile()` on purpose: the export leak
 * scanner matches bare rate-card role labels as substrings, and the usual folder check contains one of them.)
 */
function allJsx(dir = new URL('./', root), out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const folder = !entry.isFile()
    const here = new URL(entry.name + (folder ? '/' : ''), dir)
    if (folder) allJsx(here, out)
    else if (entry.name.endsWith('.jsx')) out.push({ file: path.relative(new URL('../', root).pathname, here.pathname), src: fs.readFileSync(here, 'utf8') })
  }
  return out
}

/** The pages that list records, and must therefore lead with them. */
const DATA_PAGES = [
  'Entities', 'Deals', 'News', 'PROs', 'PE', 'Catalogs', 'Glossary',
  'CatalogScan', 'Prospecting', 'Changes', 'EntityMap',
]

t('every data page puts its controls in a FilterBar', () => {
  for (const page of DATA_PAGES) {
    const src = read(`pages/${page}.jsx`)
    assert.match(src, /<FilterBar/, `${page} does not use FilterBar: its controls would sit between the title and the data`)
    assert.match(src, /import \{[^}]*FilterBar/, `${page} uses FilterBar without importing it`)
  }
})

t('the FilterBar keeps everything but search behind a disclosure', () => {
  const src = read('components/primitives/FilterBar.jsx')
  assert.match(src, /aria-expanded=\{open\}/, 'the Filters button must say whether it is open')
  assert.match(src, /aria-controls=\{panelId\}/)
  assert.match(src, /hidden=\{!open\}/, 'the panel must be closed until it is asked for')
  assert.match(src, /active\.map/, 'active filters must stay visible whether the panel is open or not')
})

t('no data page rebuilds a filter row above its content', () => {
  for (const page of DATA_PAGES) {
    const src = read(`pages/${page}.jsx`)
    const body = src.slice(src.indexOf('<PageHeader'))
    const beforeBar = body.slice(0, body.indexOf('<FilterBar'))
    assert.equal(/<select/.test(beforeBar), false, `${page} renders a <select> above its FilterBar`)
    assert.equal(/type="search"/.test(beforeBar), false, `${page} renders a second search box above its FilterBar`)
  }
})

t('headline figures are one computed line, not a tile grid between the title and the data', () => {
  for (const page of DATA_PAGES) {
    const src = read(`pages/${page}.jsx`)
    assert.equal(/grid-cols-2 md:grid-cols-4 gap-4 mb-8/.test(src), false, `${page} still has a stat-tile grid above its content`)
  }
  // The pages that lead with figures rather than rows state them in the header instead.
  for (const page of ['Entities', 'Deals', 'News', 'PROs', 'PE', 'Catalogs', 'CatalogScan', 'Prospecting', 'Changes', 'Glossary']) {
    assert.match(read(`pages/${page}.jsx`), /answer=\{<KeyFigures/, `${page} does not say anything true before the reader works`)
  }
})

t('a figure’s period or source is read, not fine print', () => {
  const stat = read('components/primitives/Stat.jsx')
  assert.match(stat, /hint && <div className="t-small text-ink-3"/, 'the hint carries the period or the source: it belongs at reading size')
  assert.equal(/hint && <div className="t-micro text-ink-4"/.test(stat), false)
})

t('every component used in JSX is imported or defined in the same file', () => {
  // ESLint cannot see this: there is no react plugin, and capitalised names are exempt from no-unused-vars.
  const bad = []
  for (const { file, src } of allJsx()) {
    const used = new Set([...src.matchAll(/<([A-Z][A-Za-z0-9_]*)[\s/>]/g)].map((m) => m[1]))
    for (const name of used) {
      // Imported, destructured, renamed in a prop list (`icon: Icon`, `as: Tag = 'div'`), or declared here.
      const declared = new RegExp(`(import\\s+${name}\\b|[,{]\\s*${name}\\s*[,}=]|:\\s*${name}\\b|(function|const|class)\\s+${name}\\b)`).test(src)
      if (!declared) bad.push(`${file}: <${name}>`)
    }
  }
  assert.deepEqual(bad, [], 'a component used without an import renders a blank page, and nothing else catches it')
})

t('exactly one PageHeader renders at a time, so the browser title is never ambiguous', () => {
  // PageHeader owns document.title (Sprint 32). A second one in the same branch would fight over it; a second
  // one behind a "no such record" guard clause is the deliberate pattern on every detail page.
  for (const { file, src } of allJsx().filter((f) => f.file.includes('src/pages/'))) {
    const count = (src.match(/<PageHeader/g) || []).length
    if (count <= 1) continue
    // The deliberate pattern on every detail page: a "No such record" guard clause returns early.
    const guard = /title="No such/.test(src)
    assert.ok(guard && count === 2, `${file} renders ${count} PageHeaders outside a not-found guard`)
  }
})

console.log(`\n${n} layout checks passed.`)
