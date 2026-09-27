#!/usr/bin/env node
/**
 * build-deck-shell.mjs — turn the firm's slide library into a template this app can generate into.
 * `npm run deck:shell -- "<path to the library .pptx>"`
 *
 * The library (`General Slides Library as of 8.24.26.pptx`) is 87 MB: 400 example slides and 457 media files
 * wrapped around the thing we actually need, which is the masters, the layouts and the theme. Stripping the
 * examples leaves **0.40 MB** with all 61 layouts, 3 masters and 5 themes intact — small enough to commit and
 * to fetch in the browser before an export.
 *
 * The library itself is never committed. This script is how the shell is rebuilt when the firm reissues it, and
 * the diff on `public/templates/am-shell.pptx` is how anyone sees that the template changed.
 *
 * It also writes `src/data/deckLayouts.js`: the contract between a block of content and a placeholder in an A&M
 * layout. That mapping is DECLARED here, by name, and then VERIFIED against the file — so if the next library
 * renames "Top Title Content" or moves the section-header placeholder, this fails loudly at build time rather
 * than silently producing slides whose text lands in the wrong box.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const DEFAULT_LIBRARY = path.join(ROOT, '../../PPT Templates/General Slides Library as of 8.24.26.pptx')
const OUT_PPTX = path.join(ROOT, 'public/templates/am-shell.pptx')
const OUT_MANIFEST = path.join(ROOT, 'src/data/deckLayouts.js')
const EMU = 914400

/**
 * What each layout is FOR, in this application's terms.
 *
 * The A&M content layouts share one structure, and it happens to be the structure this app's block model already
 * has: a section header strip, a title, a one-line key takeaway, then the content area. `eyebrow` and `takeaway`
 * are not decoration — they are where a section's eyebrow and its computed reading belong.
 *
 * Every `ph` entry is asserted to exist in the real layout below. `area` is read from the file, never guessed,
 * because a drawn table has to land inside the placeholder box it replaces.
 */
const WANTED = [
  { id: 'cover', name: 'Cover Static - Dark', ph: { title: { type: 'ctrTitle' }, date: { type: 'body', idx: '11' } } },
  { id: 'divider', name: 'Divider', ph: { title: { type: 'body', idx: '12' } } },
  { id: 'content', name: 'Top Title Content', area: { type: 'body', idx: '10' },
    ph: { eyebrow: { type: 'body', idx: '35' }, title: { type: 'title' }, takeaway: { type: 'body', idx: '39' }, body: { type: 'body', idx: '10' }, footer: { type: 'body', idx: '40' } } },
  { id: 'two-column', name: '2 Column Content', area: { type: 'body', idx: '40' },
    ph: { eyebrow: { type: 'body', idx: '35' }, title: { type: 'title' }, takeaway: { type: 'body', idx: '39' }, left: { type: 'body', idx: '40' }, right: { type: 'body', idx: '41' }, footer: { type: 'body', idx: '42' } } },
  { id: 'three-column', name: '3 Column Content', area: { type: 'body', idx: '40' },
    ph: { eyebrow: { type: 'body', idx: '35' }, title: { type: 'title' } } },
  // The table layout deliberately has NO content placeholder: a table is drawn, and it needs the whole area.
  { id: 'title-only', name: 'Top Title Only', area: null,
    ph: { eyebrow: { type: 'body', idx: '35' }, title: { type: 'title' }, takeaway: { type: 'body', idx: '39' }, footer: { type: 'body', idx: '40' } } },
  { id: 'back', name: 'Back Cover - Dark', ph: {} },
]

/** The content region on a title-only slide: below the takeaway line, above the footer rule. In inches. */
const DRAWN_AREA = { x: 0.65, y: 1.84, w: 12.03, h: 4.96 }

const attr = (xml, name) => (xml.match(new RegExp(`${name}="([^"]*)"`)) || [])[1]

/** Every placeholder in a layout part: its type, idx and box, read from the XML rather than assumed. */
function placeholders(xml) {
  const out = []
  for (const sp of xml.split('<p:sp>').slice(1)) {
    const ph = (sp.match(/<p:ph\b[^>]*\/?>/) || [])[0]
    if (!ph) continue
    const off = (sp.match(/<a:off x="(-?\d+)" y="(-?\d+)"\/>/) || [])
    const ext = (sp.match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/) || [])
    out.push({
      type: attr(ph, 'type') || 'body',
      idx: attr(ph, 'idx') || null,
      box: off[1] && ext[1] ? { x: +off[1], y: +off[2], w: +ext[1], h: +ext[2] } : null,
    })
  }
  return out
}

async function main() {
  const library = process.argv[2] || DEFAULT_LIBRARY
  if (!fs.existsSync(library)) {
    console.error(`No library at ${library}\nUsage: npm run deck:shell -- "<path to the .pptx>"`)
    process.exit(2)
  }
  const src = await JSZip.loadAsync(fs.readFileSync(library))
  const before = fs.statSync(library).size

  // 1 — Drop everything that is an EXAMPLE rather than a template: slides, their notes, embedded workbooks and
  //     the revision/tag chatter PowerPoint leaves behind.
  const drop = /^ppt\/(slides|notesSlides|embeddings|changesInfos|tags)\//
  const names = Object.keys(src.files).filter((n) => !src.files[n].dir)
  const kept = names.filter((n) => !drop.test(n))

  const zip = new JSZip()
  const text = {}
  for (const name of kept) {
    if (/\.(xml|rels)$/.test(name)) text[name] = await src.file(name).async('string')
    else zip.file(name, await src.file(name).async('uint8array'))
  }

  // 2 — Empty the slide list, and cut the presentation's relationships to the slides that no longer exist.
  text['ppt/presentation.xml'] = text['ppt/presentation.xml']
    .replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, '<p:sldIdLst/>')
  text['ppt/_rels/presentation.xml.rels'] = text['ppt/_rels/presentation.xml.rels']
    .replace(/<Relationship\b[^>]*Target="(slides|notesSlides)\/[^"]*"[^>]*\/>/g, '')

  // 3 — Drop media nothing references any more. 433 of the 457 files were only ever used by the example slides.
  const rels = Object.entries(text).filter(([n]) => n.endsWith('.rels')).map(([, v]) => v).join('')
  const used = new Set([...rels.matchAll(/Target="[^"]*media\/([^"]+)"/g)].map((m) => m[1]))
  for (const name of Object.keys(zip.files)) {
    if (name.startsWith('ppt/media/') && !used.has(path.basename(name))) zip.remove(name)
  }

  // 4 — A content type that names a part which is gone makes the file unopenable in some readers. Prune them.
  const present = new Set([...Object.keys(zip.files), ...Object.keys(text)])
  text['[Content_Types].xml'] = text['[Content_Types].xml'].replace(
    /<Override\b[^>]*PartName="\/([^"]+)"[^>]*\/>/g,
    (whole, part) => (present.has(part) ? whole : ''),
  )
  for (const [name, value] of Object.entries(text)) zip.file(name, value)

  // 5 — Resolve the declared layout map against what the file actually contains.
  const layoutParts = Object.keys(zip.files).filter((n) => /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(n))
  // The library carries each layout three times, once per master, and the three masters have DIFFERENT themes —
  // only master 1's is the one named "Alvarez & Marsal". Resolving by name over the zip's entry order picked
  // master 3's copies of "Top Title Content" and "Top Title Only", which would have generated slides against the
  // wrong palette while looking completely correct in the build output. So the master is read explicitly.
  const masterRels = text['ppt/slideMasters/_rels/slideMaster1.xml.rels'] || ''
  const master1 = [...masterRels.matchAll(/Target="\.\.\/slideLayouts\/(slideLayout\d+\.xml)"/g)].map((m) => `ppt/slideLayouts/${m[1]}`)
  if (master1.length < 10) throw new Error('Could not read master 1\'s layouts — the library\'s shape changed.')
  const byName = new Map()
  for (const part of master1) {
    const xml = text[part]
    if (!xml) continue
    const name = (xml.match(/<p:cSld[^>]*\bname="([^"]*)"/) || [])[1]
    if (name && !byName.has(name)) byName.set(name, { part, phs: placeholders(xml) })
  }

  const layouts = WANTED.map((want) => {
    const hit = byName.get(want.name)
    if (!hit) throw new Error(`The library no longer has a layout called "${want.name}". The block map in ${path.basename(OUT_MANIFEST)} is out of date.`)
    const ph = {}
    for (const [role, spec] of Object.entries(want.ph)) {
      const found = hit.phs.find((p) => p.type === spec.type && (spec.idx ? p.idx === spec.idx : !p.idx))
      if (!found) throw new Error(`"${want.name}" has no ${spec.type}${spec.idx ? `/${spec.idx}` : ''} placeholder for "${role}" — the template changed shape.`)
      ph[role] = { type: found.type, idx: found.idx }
    }
    const area = want.area
      ? (() => { const f = hit.phs.find((p) => p.type === want.area.type && p.idx === want.area.idx); return f?.box || null })()
      : { x: Math.round(DRAWN_AREA.x * EMU), y: Math.round(DRAWN_AREA.y * EMU), w: Math.round(DRAWN_AREA.w * EMU), h: Math.round(DRAWN_AREA.h * EMU) }
    return { id: want.id, name: want.name, part: hit.part, ph, area }
  })

  fs.mkdirSync(path.dirname(OUT_PPTX), { recursive: true })
  const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } })
  fs.writeFileSync(OUT_PPTX, bytes)

  // Master 1's theme, resolved through its own relationship rather than assumed to be theme1.xml.
  const themePart = ((masterRels.match(/Target="\.\.\/(theme\/theme\d+\.xml)"/) || [])[1]) || 'theme/theme1.xml'
  const theme = text[`ppt/${themePart}`] || ''
  const colour = (slot) => ((theme.match(new RegExp(`<a:${slot}>\\s*<a:srgbClr val="([0-9A-Fa-f]{6})"`)) || [])[1] || '').toUpperCase()
  const size = text['ppt/presentation.xml'].match(/<p:sldSz cx="(\d+)" cy="(\d+)"/)

  fs.writeFileSync(OUT_MANIFEST, `/**
 * deckLayouts.js — GENERATED by scripts/build-deck-shell.mjs. Do not edit by hand.
 *
 * The contract between a block of content and a placeholder in an A&M layout, resolved against
 * public/templates/am-shell.pptx. Rebuild both together:
 *
 *   npm run deck:shell -- "<path to the slide library .pptx>"
 */
export const SHELL = '/templates/am-shell.pptx'
export const SLIDE = { cx: ${size[1]}, cy: ${size[2]} }
export const THEME = { dark: '${colour('accent1')}', accent: '${colour('lt2')}', blue: '${colour('accent2')}', grey: '${colour('dk1')}', font: 'Arial' }
export const LAYOUTS = ${JSON.stringify(Object.fromEntries(layouts.map((l) => [l.id, l])), null, 2)}
`)

  const after = fs.statSync(OUT_PPTX).size
  console.log(`${path.basename(library)}  ${(before / 1e6).toFixed(1)} MB`)
  console.log(`→ public/templates/am-shell.pptx  ${(after / 1e6).toFixed(2)} MB  (${Math.round(before / after)}× smaller)`)
  console.log(`   ${layoutParts.length} layouts kept · ${[...used].length} media referenced · ${layouts.length} mapped for generation`)
  console.log(`   master 1 (${(theme.match(/name="([^"]*)"/) || [])[1] || '?'}) · ${master1.length} layouts`)
  for (const l of layouts) console.log(`   ${l.id.padEnd(13)} ${l.name.padEnd(22)} ${path.basename(l.part)}`)
}

main().catch((err) => { console.error(err.message); process.exit(1) })
