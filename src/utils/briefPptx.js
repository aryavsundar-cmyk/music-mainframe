/**
 * briefPptx.js — the block model as an Alvarez & Marsal deck.
 *
 * Until Sprint 40 this drew the Mainframe's own identity with pptxgenjs: shellac cover, Georgia titles, gold
 * rules. Correct for the application and wrong for a document that leaves the building. pptxgenjs defines its own
 * masters, so no amount of recolouring would have made the output a real A&M deck — it would have been a
 * look-alike whose text is not editable through the firm's placeholders and which UpSlide does not recognise.
 *
 * So the deck is generated INTO the firm's template instead. `public/templates/am-shell.pptx` is the library with
 * its 400 example slides removed (87 MB → 0.23 MB, every layout and master intact, built by
 * `scripts/build-deck-shell.mjs`). Slides are appended to it as OOXML parts over JSZip — the same technique
 * `briefXlsx.js` already uses to write SpreadsheetML, and for the same reason: there is no library that does this
 * and the format is mechanical.
 *
 * Every piece of text lands in a real placeholder and inherits the A&M font, size, colour and position. Nothing
 * here sets a typeface. The two footers are the exception worth knowing about: the template's own footer reads
 * "CONFIDENTIAL: NOT FOR DISTRIBUTION", and this generator deliberately does NOT stamp that on its output —
 * marking an automatically generated research document as a firm work product is not this tool's call. The left
 * footer carries the application's own provenance instead, and the reader can apply the firm's marking if the
 * document becomes one.
 */
import JSZip from 'jszip'
import { LAYOUTS, SHELL } from '../data/deckLayouts.js'
import { slide, slideRels, placeholder, table, statRow, para } from './deckXml.js'

/** A slide holds about this many rows before the type is too small to read. */
const TABLE_ROWS = 13

async function shellBytes() {
  if (typeof document === 'undefined') {
    const { readFile } = await import(/* @vite-ignore */ 'node:fs/promises')
    const { fileURLToPath } = await import(/* @vite-ignore */ 'node:url')
    return readFile(fileURLToPath(new URL('../../public/templates/am-shell.pptx', import.meta.url)))
  }
  const res = await fetch(SHELL)
  if (!res.ok) throw new Error(`The A&M template could not be loaded (HTTP ${res.status}). A deck needs ${SHELL}.`)
  return new Uint8Array(await res.arrayBuffer())
}

const eyebrowOf = (s) => `${s.num ? `§ ${String(s.num).padStart(2, '0')} — ` : ''}${String(s.eyebrow || '').toUpperCase()}`
const footer = (doc) => `Mainframe · Music · ${doc.title}${doc.modeLabel ? ` · ${doc.modeLabel}` : ''} · generated ${String(doc.generatedAt || '').slice(0, 10)}`

/** Prose blocks flowed into one placeholder, in the order the builder emitted them. */
function proseParagraphs(blocks) {
  const out = []
  for (const b of blocks) {
    if (b.kind === 'paragraph') out.push(para(b.text))
    else if (b.kind === 'note') out.push(para(b.text, { italic: true }))
    else if (b.kind === 'bullets') for (const item of b.items) out.push(para(item, { bullet: true }))
  }
  return out
}

/**
 * The slides one section becomes.
 *
 * Prose goes on a `Top Title Content` slide. Anything tabular — a table, a fact list, a row of figures — gets a
 * `Top Title Only` slide and the full content area, because cramming a table under three paragraphs is how a
 * deck ends up with six-point type.
 */
function sectionSlides(section, doc, nextId) {
  const slides = []
  const prose = proseParagraphs(section.blocks || [])
  const tabular = (section.blocks || []).filter((b) => ['table', 'facts', 'stats'].includes(b.kind))

  if (prose.length) {
    const L = LAYOUTS.content
    slides.push({ layout: L, shapes: [
      placeholder(2, L.ph.eyebrow, [para(eyebrowOf(section))]),
      placeholder(3, L.ph.title, [para(section.title)]),
      placeholder(4, L.ph.body, prose),
      placeholder(5, L.ph.footer || { type: 'body', idx: '40' }, [para(footer(doc))]),
    ] })
  }

  for (const b of tabular) {
    const L = LAYOUTS['title-only']
    const area = L.area
    const shapes = [
      placeholder(2, L.ph.eyebrow, [para(eyebrowOf(section))]),
      placeholder(3, L.ph.title, [para(section.title)]),
    ]
    if (b.kind === 'table') {
      // Cutting at a slide's worth of rows is fine; cutting silently is not. A page export can carry hundreds of
      // rows, and a deck showing the first thirteen as though they were all of them would be a lie by omission.
      const over = b.rows.length - TABLE_ROWS
      const shown = over > 0 ? b.rows.slice(0, TABLE_ROWS - 1) : b.rows
      const rows = shown.map((r) => r.map((v) => String(v ?? '')))
      if (over > 0) rows.push([`… and ${over + 1} more rows — see the Word or Excel export`, ...Array(Math.max(0, b.columns.length - 1)).fill('')])
      shapes.push(table(nextId(), area, b.columns, rows))
    } else if (b.kind === 'facts') {
      shapes.push(table(nextId(), area, ['Field', 'Value'], b.rows.map(([k, v]) => [String(k), String(v)]), { widths: [1, 3] }))
    } else {
      shapes.push(statRow(nextId(), area, b.items.slice(0, 4)))
    }
    shapes.push(placeholder(4, L.ph.footer || { type: 'body', idx: '40' }, [para(footer(doc))]))
    slides.push({ layout: L, shapes })
  }

  // A section with nothing renderable still gets its heading, so the contents list never points at a missing slide.
  if (!slides.length) {
    const L = LAYOUTS['title-only']
    slides.push({ layout: L, shapes: [
      placeholder(2, L.ph.eyebrow, [para(eyebrowOf(section))]),
      placeholder(3, L.ph.title, [para(section.title)]),
    ] })
  }
  return slides
}

/** The whole deck as a list of `{ layout, shapes }`, before any of it becomes a file. */
export function planDeck(doc) {
  let id = 100
  const nextId = () => ++id
  const sections = doc.sections || []
  const cover = LAYOUTS.cover
  const contents = LAYOUTS.content

  const slides = [
    { layout: cover, shapes: [
      placeholder(2, cover.ph.title, [para(doc.title)]),
      placeholder(3, cover.ph.date, [para(`${doc.subtitle || ''}${doc.subtitle ? ' · ' : ''}${String(doc.generatedAt || '').slice(0, 10)}`.toUpperCase())]),
    ] },
  ]

  if (sections.length > 1) {
    slides.push({ layout: contents, shapes: [
      placeholder(2, contents.ph.eyebrow, [para('CONTENTS')]),
      placeholder(3, contents.ph.title, [para('Sections')]),
      placeholder(4, contents.ph.body, sections.map((s) => para(`${s.num ? `${String(s.num).padStart(2, '0')}  ` : ''}${s.eyebrow} — ${s.title}`, { bullet: false }))),
      placeholder(5, contents.ph.footer || { type: 'body', idx: '40' }, [para(footer(doc))]),
    ] })
  }

  for (const s of sections) slides.push(...sectionSlides(s, doc, nextId))
  slides.push({ layout: LAYOUTS.back, shapes: [] })
  return slides
}

/**
 * Append the planned slides to the shell.
 *
 * Five parts of the package have to agree or PowerPoint refuses the file: the slide, its relationship to a layout,
 * the content-type override, the presentation's relationship to the slide, and the slide id list. Getting four of
 * five right produces a file that opens on some readers and not others, which is worse than one that never opens.
 */
export async function buildBriefPptx(doc) {
  const zip = await JSZip.loadAsync(await shellBytes())
  const plan = planDeck(doc)

  let types = await zip.file('[Content_Types].xml').async('string')
  let rels = await zip.file('ppt/_rels/presentation.xml.rels').async('string')
  let pres = await zip.file('ppt/presentation.xml').async('string')

  // Never reuse an id the shell already spent on a master, a theme or the table styles.
  const usedRel = [...rels.matchAll(/Id="rId(\d+)"/g)].map((m) => +m[1])
  let rid = Math.max(0, ...usedRel)
  const entries = []

  plan.forEach((s, i) => {
    const n = i + 1
    const part = `ppt/slides/slide${n}.xml`
    zip.file(part, slide(s.shapes))
    zip.file(`ppt/slides/_rels/slide${n}.xml.rels`, slideRels(s.layout.part))
    types = types.replace('</Types>', `<Override PartName="/${part}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`)
    rid += 1
    rels = rels.replace('</Relationships>', `<Relationship Id="rId${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${n}.xml"/></Relationships>`)
    entries.push(`<p:sldId id="${255 + n}" r:id="rId${rid}"/>`)
  })

  zip.file('[Content_Types].xml', types)
  zip.file('ppt/_rels/presentation.xml.rels', rels)
  // The shell ships with an empty list; a deck with slides needs it populated and in order.
  pres = pres.replace(/<p:sldIdLst\s*\/>|<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${entries.join('')}</p:sldIdLst>`)
  zip.file('ppt/presentation.xml', pres)

  return zip
}

const OPTS = { compression: 'DEFLATE', compressionOptions: { level: 6 }, mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }

export const briefPptxBlob = async (doc) => (await buildBriefPptx(doc)).generateAsync({ type: 'blob', ...OPTS })
export const briefPptxBuffer = async (doc) => (await buildBriefPptx(doc)).generateAsync({ type: 'nodebuffer', ...OPTS })
