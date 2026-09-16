/** briefPptx.js — .pptx renderer over the brief object. Dark shellac cover, paper body, eyebrow + serif title + hairline per slide. */
import PptxGenJS from 'pptxgenjs'
import { palette } from '../tokens.js'

const W = 13.333, H = 7.5, M = 0.6
const SHELLAC = palette.shellac[0].slice(1), PAPER = palette.paper[0].slice(1), INK = palette.ink[900].slice(1), MUTED = palette.ink[500].slice(1), FAINT = palette.ink[300].slice(1)
const GOLD = palette.gold[600].slice(1), GOLD_D = palette.gold[400].slice(1), VERD = palette.verdigris[600].slice(1), VERD_D = palette.verdigris[400].slice(1), RULE = 'D9D4C7'
const SERIF = 'Georgia', SANS = 'Arial', MONO = 'Consolas'

function header(slide, s, brief) {
  slide.background = { color: PAPER }
  slide.addText(`§ ${String(s.num).padStart(2, '0')} — ${s.eyebrow.toUpperCase()}`, { x: M, y: 0.35, w: W - M * 2, h: 0.3, fontSize: 10, fontFace: SANS, bold: true, color: GOLD, charSpacing: 3 })
  slide.addText(s.title, { x: M, y: 0.62, w: W - M * 2, h: 0.7, fontSize: 26, fontFace: SERIF, color: INK })
  slide.addShape('rect', { x: M, y: 1.38, w: W - M * 2, h: 0.01, fill: { color: RULE }, line: { color: RULE, width: 0 } })
  slide.addShape('rect', { x: 0, y: H - 0.42, w: W, h: 0.01, fill: { color: RULE }, line: { color: RULE, width: 0 } })
  slide.addText(`Mainframe · Music · ${brief.title} · ${brief.modeLabel}`, { x: M, y: H - 0.38, w: 9, h: 0.3, fontSize: 8, fontFace: SANS, color: MUTED })
}

function body(slide, blocks) {
  let y = 1.55
  const room = () => H - 0.6 - y
  for (const b of blocks) {
    if (room() < 0.5) break
    if (b.kind === 'paragraph' || b.kind === 'note') {
      const h = Math.min(room(), 0.28 + Math.ceil(b.text.length / 150) * 0.24)
      slide.addText(b.text, { x: M, y, w: W - M * 2, h, fontSize: b.kind === 'note' ? 10 : 12, fontFace: SANS, color: b.kind === 'note' ? MUTED : INK, italic: b.kind === 'note', valign: 'top' })
      y += h + 0.1
    } else if (b.kind === 'bullets') {
      const items = b.items.slice(0, 10)
      const h = Math.min(room(), items.reduce((s, t) => s + 0.22 + Math.floor(t.length / 160) * 0.2, 0) + 0.1)
      slide.addText(items.map((t) => ({ text: t, options: { bullet: { code: '2022' }, breakLine: true } })), { x: M, y, w: W - M * 2, h, fontSize: 11, fontFace: SANS, color: INK, valign: 'top', paraSpaceAfter: 4 })
      y += h + 0.1
    } else if (b.kind === 'facts') {
      const rows = b.rows.map(([k, v]) => [{ text: k, options: { color: MUTED, fontFace: SANS, fontSize: 9 } }, { text: v, options: { color: INK, fontFace: SANS, fontSize: 10 } }])
      const h = Math.min(room(), rows.length * 0.3)
      slide.addTable(rows, { x: M, y, w: W - M * 2, colW: [2.6, W - M * 2 - 2.6], rowH: 0.28, border: { type: 'solid', color: RULE, pt: 0.5 }, margin: 0.05 })
      y += h + 0.15
    } else if (b.kind === 'stats') {
      const items = b.items.slice(0, 4); const cw = (W - M * 2) / items.length
      items.forEach((s, i) => {
        slide.addText(s.label.toUpperCase(), { x: M + i * cw, y, w: cw - 0.2, h: 0.25, fontSize: 8, fontFace: SANS, color: MUTED, charSpacing: 1.5 })
        slide.addText(s.value, { x: M + i * cw, y: y + 0.25, w: cw - 0.2, h: 0.55, fontSize: 24, fontFace: MONO, color: GOLD })
        if (s.hint) slide.addText(s.hint, { x: M + i * cw, y: y + 0.8, w: cw - 0.2, h: 0.25, fontSize: 8, fontFace: SANS, color: FAINT })
      })
      y += 1.2
    } else if (b.kind === 'table') {
      // A slide holds about fourteen rows. Cutting there is fine; cutting silently is not — a page export can
      // carry hundreds of rows, and a deck that showed the first fourteen as though they were all of them would
      // be a lie by omission. The last row says what is missing and where to find it.
      const SLIDE_ROWS = 14
      const over = b.rows.length - SLIDE_ROWS
      const shown = over > 0 ? b.rows.slice(0, SLIDE_ROWS - 1) : b.rows
      const more = over > 0 ? [[`… and ${over + 1} more rows — see the Word or Excel export`, ...Array(Math.max(0, b.columns.length - 1)).fill('')]] : []
      const rows = [b.columns.map((c) => ({ text: c.toUpperCase(), options: { bold: true, color: MUTED, fontFace: SANS, fontSize: 8, fill: { color: 'ECE8DF' } } })), ...[...shown, ...more].map((r) => r.map((v, i) => ({ text: String(v ?? ''), options: { color: i === 0 && over > 0 && r === more[0] ? MUTED : INK, fontFace: i === 0 ? MONO : SANS, fontSize: 9, italic: r === more[0] } })))]
      const n = b.columns.length; const colW = n === 5 ? [1.4, 5.4, 1.8, 1.9, 1.6] : n === 3 ? [1.4, 2.6, 8.1] : n === 2 ? [1.6, 10.5] : undefined
      const h = Math.min(room(), rows.length * 0.3)
      slide.addTable(rows, { x: M, y, w: W - M * 2, colW, rowH: 0.28, border: { type: 'solid', color: RULE, pt: 0.5 }, margin: 0.04, autoPage: false })
      y += h + 0.15
    }
  }
}

export function buildBriefPptx(brief) {
  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: 'MM', width: W, height: H }); pptx.layout = 'MM'
  pptx.author = 'Mainframe · Music'; pptx.title = `${brief.title} — ${brief.modeLabel}`

  const cover = pptx.addSlide(); cover.background = { color: SHELLAC }
  cover.addText('MAINFRAME · MUSIC', { x: M, y: 0.6, w: 8, h: 0.3, fontSize: 10, fontFace: SANS, bold: true, color: VERD_D, charSpacing: 6 })
  cover.addText(brief.title, { x: M, y: 2.2, w: W - M * 2, h: 1.4, fontSize: 48, fontFace: SERIF, color: 'F4F1EA' })
  cover.addText(brief.subtitle, { x: M, y: 3.6, w: W - M * 2, h: 0.5, fontSize: 16, fontFace: SANS, color: GOLD_D })
  cover.addText(`Generated ${brief.generatedAt.slice(0, 10)} · record as of ${brief.asOf} · ${brief.sections.length} sections`, { x: M, y: H - 0.9, w: W - M * 2, h: 0.3, fontSize: 9, fontFace: MONO, color: FAINT })
  cover.addShape('rect', { x: M, y: 4.25, w: 1.2, h: 0.03, fill: { color: GOLD_D }, line: { color: GOLD_D, width: 0 } })
  cover.addShape('rect', { x: M + 1.3, y: 4.25, w: 0.6, h: 0.03, fill: { color: VERD_D }, line: { color: VERD_D, width: 0 } })

  const toc = pptx.addSlide(); header(toc, { num: 0, eyebrow: 'Contents', title: 'Sections' }, brief)
  toc.addText(brief.sections.map((s) => ({ text: `§ ${String(s.num).padStart(2, '0')}  ${s.eyebrow} — ${s.title}`, options: { breakLine: true } })), { x: M, y: 1.6, w: W - M * 2, h: H - 2.4, fontSize: 13, fontFace: SANS, color: INK, valign: 'top', paraSpaceAfter: 6 })

  for (const s of brief.sections) { const slide = pptx.addSlide(); header(slide, s, brief); body(slide, s.blocks) }
  return pptx
}

export const briefPptxBlob = (brief) => buildBriefPptx(brief).write({ outputType: 'blob' })
export const briefPptxBuffer = (brief) => buildBriefPptx(brief).write({ outputType: 'nodebuffer' })
