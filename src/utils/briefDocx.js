/** briefDocx.js — .docx renderer over the brief object. Eyebrow + serif h2 + hairline (Patterns §4). Node- and browser-safe. */
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel, Footer, PageNumber } from 'docx'
import { palette } from '../tokens.js'

const GOLD = palette.gold[600].slice(1), VERD = palette.verdigris[600].slice(1), INK = palette.ink[900].slice(1), MUTED = palette.ink[500].slice(1), RULE = 'D9D4C7'
const SERIF = 'Georgia', SANS = 'Arial', MONO = 'Consolas'
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
const hair = { style: BorderStyle.SINGLE, size: 4, color: RULE }

const eyebrow = (t) => new Paragraph({ spacing: { before: 360, after: 60 }, children: [new TextRun({ text: t.toUpperCase(), font: SANS, size: 16, bold: true, color: GOLD, characterSpacing: 40 })] })
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { after: 80 }, border: { bottom: hair }, children: [new TextRun({ text: t, font: SERIF, size: 32, color: INK })] })
const para = (t, opts = {}) => new Paragraph({ spacing: { after: 140 }, children: [new TextRun({ text: t, font: SANS, size: 20, color: opts.muted ? MUTED : INK, italics: !!opts.italics })] })
const bullet = (t) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: t, font: SANS, size: 20, color: INK })] })

const cell = (text, { width, bold = false, mono = false, muted = false, header = false } = {}) => new TableCell({
  width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
  borders: { top: header ? none : hair, bottom: header ? hair : none, left: none, right: none },
  margins: { top: 60, bottom: 60, left: 80, right: 80 },
  children: [new Paragraph({ children: [new TextRun({ text: String(text ?? ''), font: mono ? MONO : SANS, size: header ? 16 : 18, bold: bold || header, color: muted || header ? MUTED : INK })] })],
})

function table(columns, rows, widths) {
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
    new TableRow({ tableHeader: true, children: columns.map((c, i) => cell(c.toUpperCase(), { width: widths?.[i], header: true })) }),
    ...rows.map((r) => new TableRow({ children: r.map((v, i) => cell(v, { width: widths?.[i], mono: i === 0 })) })),
  ] })
}

function block(b) {
  switch (b.kind) {
    case 'paragraph': return [para(b.text)]
    case 'note': return [para(b.text, { muted: true, italics: true })]
    case 'bullets': return b.items.map(bullet)
    case 'facts': return [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: b.rows.map(([k, v]) => new TableRow({ children: [cell(k, { width: 28, muted: true }), cell(v, { width: 72 })] })) })]
    case 'stats': return [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: b.items.map((s) => new TableCell({ borders: { top: none, bottom: none, left: none, right: none }, margins: { top: 80, bottom: 80, left: 80, right: 80 }, children: [
      new Paragraph({ children: [new TextRun({ text: s.label.toUpperCase(), font: SANS, size: 14, color: MUTED, characterSpacing: 20 })] }),
      new Paragraph({ children: [new TextRun({ text: s.value, font: MONO, size: 30, color: GOLD })] }),
      s.hint ? new Paragraph({ children: [new TextRun({ text: s.hint, font: SANS, size: 14, color: MUTED })] }) : new Paragraph({}),
    ] })) })] })]
    case 'table': { const n = b.columns.length; const w = n === 5 ? [12, 44, 16, 16, 12] : n === 3 ? [16, 24, 60] : n === 2 ? [16, 84] : undefined; return [table(b.columns, b.rows, w)] }
    default: return []
  }
}

export function buildBriefDocx(brief) {
  const children = [
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'MAINFRAME · MUSIC', font: SANS, size: 16, bold: true, color: VERD, characterSpacing: 60 })] }),
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: brief.title, font: SERIF, size: 56, color: INK })] }),
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: brief.subtitle, font: SANS, size: 22, color: MUTED })] }),
    new Paragraph({ spacing: { after: 240 }, border: { bottom: hair }, children: [new TextRun({ text: `Generated ${brief.generatedAt.slice(0, 16).replace('T', ' ')}Z · record as of ${brief.asOf}`, font: MONO, size: 16, color: MUTED })] }),
  ]
  for (const s of brief.sections) {
    children.push(eyebrow(`§ ${String(s.num).padStart(2, '0')} — ${s.eyebrow}`), h2(s.title))
    for (const b of s.blocks) children.push(...block(b))
  }
  return new Document({
    creator: 'Mainframe · Music', title: `${brief.title} — ${brief.modeLabel}`,
    styles: { default: { document: { run: { font: SANS, size: 20, color: INK } } } },
    sections: [{
      properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Mainframe · Music · ${brief.title} · `, font: SANS, size: 14, color: MUTED }), new TextRun({ children: [PageNumber.CURRENT], font: MONO, size: 14, color: MUTED })] })] }) },
      children,
    }],
  })
}

export const briefDocxBlob = (brief) => Packer.toBlob(buildBriefDocx(brief))
export const briefDocxBuffer = (brief) => Packer.toBuffer(buildBriefDocx(brief))
