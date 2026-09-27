/**
 * deckXml.js — the OOXML a generated slide is made of.
 *
 * Pure string builders, no files and no zip: everything here can be asserted in Node, which matters because the
 * failure mode of a malformed slide is a deck PowerPoint refuses to open with no useful message.
 *
 * Two rules run through all of it:
 *
 * **Inherit, never restyle.** A shape that carries `<p:ph>` takes its font, size, colour and position from the
 * A&M layout. We supply text and nothing else. The moment this file starts setting `sz` or `srgbClr` on body
 * copy, the output stops being the firm's template and becomes a drawing that resembles it — which is the whole
 * thing Sprint 40 exists to avoid. The only places a colour appears below are the two drawn shapes (a table's
 * header text and a stat's label), where there is no placeholder to inherit from.
 *
 * **Escape everything.** Company names in this canvas contain `&` (Alvarez & Marsal, Hellman & Friedman) and
 * quotes. One unescaped ampersand makes the whole part unparseable.
 */
import { THEME } from '../data/deckLayouts.js'

export const EMU = 914400
export const inches = (n) => Math.round(n * EMU)

/**
 * XML-escape, and drop the characters XML 1.0 does not permit AT ALL — not even escaped.
 *
 * Both halves are load-bearing. This canvas is full of ampersands (Alvarez & Marsal, Hellman & Friedman) and one
 * unescaped `&` makes the part unparseable. And scraped headlines carry stray control bytes, which are not legal
 * in an XML document under any encoding; a single one produces a deck PowerPoint refuses to open with no useful
 * message. Tab, newline and carriage return are the three that ARE legal, and they are kept.
 *
 * Written as a code-point filter rather than a regex on purpose: a character class of literal control bytes is
 * invisible in an editor and impossible to review.
 */
export function esc(value) {
  let out = ''
  for (const ch of String(value ?? '')) {
    const code = ch.codePointAt(0)
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) continue
    out += ch === '&' ? '&amp;'
      : ch === '<' ? '&lt;'
        : ch === '>' ? '&gt;'
          : ch === '"' ? '&quot;'
            : ch === "'" ? '&apos;'
              : ch
  }
  return out
}

export const TABLE_STYLE = '{8799B23B-EC83-4686-B30A-512413B5E67A}'

/**
 * One paragraph. `bullet` turns on the layout's own bullet; `level` indents. Size and colour are only ever passed
 * by the drawn shapes — placeholder text leaves both undefined and inherits.
 */
export function para(text, { bullet = false, level = 0, size = null, colour = null, bold = false, italic = false } = {}) {
  const props = [
    level ? ` lvl="${level}"` : '',
    bullet ? '' : '',
  ].join('')
  const runProps = [
    ' lang="en-US"',
    size ? ` sz="${Math.round(size * 100)}"` : '',
    bold ? ' b="1"' : '',
    italic ? ' i="1"' : '',
    ' dirty="0"',
  ].join('')
  const fill = colour ? `<a:solidFill><a:srgbClr val="${colour}"/></a:solidFill>` : ''
  const bu = bullet ? '' : '<a:buNone/>'
  return `<a:p><a:pPr${props}>${bu}</a:pPr><a:r><a:rPr${runProps}>${fill}</a:rPr><a:t>${esc(text)}</a:t></a:r></a:p>`
}

/** An empty paragraph — the only way to get vertical space inside a placeholder without inventing geometry. */
export const blank = () => '<a:p><a:pPr><a:buNone/></a:pPr><a:endParaRPr lang="en-US"/></a:p>'

/**
 * A shape that fills one of the layout's placeholders.
 *
 * `<p:spPr/>` is deliberately empty: no `<a:xfrm>`, so the box stays exactly where the A&M layout puts it. Giving
 * it geometry here is the single easiest way to produce a deck that looks almost right and is unusable, because
 * every slide would then ignore the master.
 */
export function placeholder(id, ph, paragraphs) {
  const type = ph.type ? ` type="${ph.type}"` : ''
  const idx = ph.idx ? ` idx="${ph.idx}"` : ''
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${esc(ph.type || 'Body')} ${id}"/>`
    + `<p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph${type}${idx}/></p:nvPr></p:nvSpPr>`
    + `<p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>${paragraphs.join('') || blank()}</p:txBody></p:sp>`
}

/** A free text box, for the few things no placeholder covers. Geometry in EMU. */
export function textBox(id, box, paragraphs, { anchor = 't' } = {}) {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Text ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>`
    + `<p:spPr><a:xfrm><a:off x="${box.x}" y="${box.y}"/><a:ext cx="${box.w}" cy="${box.h}"/></a:xfrm>`
    + `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>`
    + `<p:txBody><a:bodyPr wrap="square" anchor="${anchor}"><a:normAutofit/></a:bodyPr><a:lstStyle/>`
    + `${paragraphs.join('') || blank()}</p:txBody></p:sp>`
}

const cell = (text, { bold = false, size = 9, colour = null } = {}) =>
  `<a:tc><a:txBody><a:bodyPr/><a:lstStyle/>${para(text, { size, bold, colour })}</a:txBody><a:tcPr marL="45720" marR="45720" marT="27432" marB="27432" anchor="ctr"/></a:tc>`

/**
 * A real PowerPoint table — a `<p:graphicFrame>`, not a grid of text boxes, so it stays editable and sortable in
 * PowerPoint and inherits the template's table style.
 *
 * `widths` are relative weights, normalised to the frame. A table with no rows still renders its header, because
 * an empty table that says what its columns were is more useful than a blank slide.
 */
export function table(id, box, columns, rows, { widths = null, rowHeight = inches(0.3) } = {}) {
  const n = columns.length
  const weights = widths && widths.length === n ? widths : Array(n).fill(1)
  const sum = weights.reduce((a, b) => a + b, 0)
  const grid = weights.map((w) => `<a:gridCol w="${Math.round((w / sum) * box.w)}"/>`).join('')
  const head = `<a:tr h="${rowHeight}">${columns.map((c) => cell(String(c).toUpperCase(), { bold: true, size: 9, colour: THEME.dark })).join('')}</a:tr>`
  const body = rows.map((r) => `<a:tr h="${rowHeight}">${
    Array.from({ length: n }, (_, i) => cell(r[i] ?? '', { size: 9 })).join('')
  }</a:tr>`).join('')
  return `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${id}" name="Table ${id}"/>`
    + `<p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr>`
    + `<p:xfrm><a:off x="${box.x}" y="${box.y}"/><a:ext cx="${box.w}" cy="${box.h}"/></p:xfrm>`
    + `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl>`
    + `<a:tblPr firstRow="1" bandRow="1"><a:tableStyleId>${TABLE_STYLE}</a:tableStyleId></a:tblPr>`
    + `<a:tblGrid>${grid}</a:tblGrid>${head}${body}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`
}

/** A row of figures across the content area: label above, value below, source note under that. */
export function statRow(startId, box, stats) {
  const n = Math.max(1, stats.length)
  const gap = inches(0.25)
  const w = Math.floor((box.w - gap * (n - 1)) / n)
  return stats.map((s, i) => {
    const x = box.x + i * (w + gap)
    return textBox(startId + i, { x, y: box.y, w, h: inches(1.3) }, [
      para(String(s.label || '').toUpperCase(), { size: 9, colour: THEME.grey, bold: true }),
      para(String(s.value ?? '—'), { size: 26, colour: THEME.dark, bold: true }),
      ...(s.hint ? [para(s.hint, { size: 9, colour: THEME.grey, italic: true })] : []),
    ])
  }).join('')
}

/** The slide part. `<p:clrMapOvr>` is what tells PowerPoint to take its colour mapping from the master. */
export function slide(shapes) {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
    + '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'
    + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
    + ' xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
    + '<p:cSld><p:spTree>'
    + '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
    + '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
    + shapes.join('')
    + '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>'
}

/** The slide's one relationship: the A&M layout it inherits from. */
export function slideRels(layoutPart) {
  const target = `../${layoutPart.replace(/^ppt\//, '')}`
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="${target}"/>`
    + '</Relationships>'
}
