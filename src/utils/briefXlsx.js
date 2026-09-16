/**
 * briefXlsx.js — the block model as a workbook. Same input as briefText / briefDocx / briefPptx: a doc with
 * numbered sections of typed blocks. Nothing here knows what a document is about.
 *
 * Layout: a Summary sheet (what this is, plus every stats and facts block as label/value rows), one sheet per
 * table block, and a Sources sheet carrying the citations and every note — including the notices that say what a
 * score does and does not mean, so they travel with the numbers.
 *
 * Values are written exactly as the rest of the app formats them. A cell becomes a real number only when it is a
 * plain number; "$1,501K" stays text rather than being guessed at, because a wrong number is worse than a string.
 */
import JSZip from 'jszip'

// Strip the characters XML forbids — Excel refuses to open a file containing them.
const CONTROL = new RegExp('[' + [[0, 8], [11, 12], [14, 31]].map(([a, b]) => `\\u${a.toString(16).padStart(4, '0')}-\\u${b.toString(16).padStart(4, '0')}`).join('') + ']', 'g')
const esc = (s) => String(s ?? '').replace(CONTROL, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const col = (i) => { let s = ''; let n = i; while (n >= 0) { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1 } return s }
const NUMERIC = /^-?\d{1,3}(,\d{3})*(\.\d+)?$|^-?\d+(\.\d+)?$/

function cell(ref, value, style) {
  const s = style ? ` s="${style}"` : ''
  if (value === '' || value == null) return `<c r="${ref}"${s}/>`
  const text = String(value)
  if (NUMERIC.test(text.trim())) return `<c r="${ref}"${s}><v>${Number(text.replace(/,/g, ''))}</v></c>`
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(text)}</t></is></c>`
}

/** rows: array of arrays. headerRows: how many leading rows are headings. */
function sheetXml(rows, headerRows = 1) {
  const widths = []
  for (const r of rows) r.forEach((v, i) => { widths[i] = Math.min(60, Math.max(widths[i] || 10, String(v ?? '').length + 2)) })
  const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')
  const body = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => cell(`${col(ci)}${ri + 1}`, v, ri < headerRows ? 1 : 0)).join('')}</row>`).join('')
  const freeze = headerRows ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRows}" topLeftCell="A${headerRows + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` : ''
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${freeze}<cols>${cols}</cols><sheetData>${body}</sheetData></worksheet>`
}

const STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'

/** Excel sheet names: 31 characters, no []:*?/\, unique within the workbook. */
export function sheetName(title, taken = new Set()) {
  const base = String(title || 'Sheet').replace(/[[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Sheet'
  let name = base
  let i = 2
  while (taken.has(name.toLowerCase())) { const suffix = ` (${i++})`; name = base.slice(0, 31 - suffix.length) + suffix }
  taken.add(name.toLowerCase())
  return name
}

/** doc → [{ name, rows, headerRows }] — exported so tests can read the shape without unzipping. */
export function workbookSheets(doc) {
  const taken = new Set()
  const sheets = []
  const summary = [['Mainframe · Music'], [doc.title || ''], [doc.subtitle || ''], [`Generated ${String(doc.generatedAt || '').slice(0, 10)}${doc.asOf ? ` · record as of ${doc.asOf}` : ''}`], []]
  const notes = []
  for (const section of doc.sections || []) {
    const heading = `${section.num ? `${section.num}. ` : ''}${section.eyebrow || ''}${section.eyebrow && section.title ? ' — ' : ''}${section.title || ''}`
    let wroteHeading = false
    const head = () => { if (!wroteHeading) { summary.push([heading]); wroteHeading = true } }
    for (const b of section.blocks || []) {
      if (b.kind === 'stats') { head(); for (const it of b.items || []) summary.push([it.label, it.value]) }
      else if (b.kind === 'facts') { head(); for (const [k, v] of b.rows || []) summary.push([k, v]) }
      else if (b.kind === 'note') notes.push([heading, b.text])
      else if (b.kind === 'table') {
        sheets.push({ name: sheetName(section.title || section.eyebrow || `Table ${sheets.length + 1}`, taken), rows: [b.columns || [], ...(b.rows || [])], headerRows: 1 })
      }
    }
    if (wroteHeading) summary.push([])
  }
  const sources = [['Source', 'Where it comes from']]
  for (const c of doc.citations?.items || []) sources.push([c.label || c.title || '', c.url || ''])
  if (notes.length) { sources.push([]); sources.push(['Section', 'Note']); for (const n of notes) sources.push(n) }
  if (sources.length === 1) sources.push(['No citations attached to this document', ''])

  return [{ name: sheetName('Summary', taken), rows: summary, headerRows: 1 }, ...sheets, { name: sheetName('Sources & notes', taken), rows: sources, headerRows: 1 }]
}

function build(doc) {
  const sheets = workbookSheets(doc)
  const zip = new JSZip()
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`)
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`)
  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)
  zip.file('xl/styles.xml', STYLES)
  sheets.forEach((s, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s.rows, s.headerRows)))
  return zip
}

const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
export const briefXlsxBlob = (doc) => build(doc).generateAsync({ type: 'blob', mimeType: MIME, compression: 'DEFLATE' })
export const briefXlsxBuffer = (doc) => build(doc).generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
