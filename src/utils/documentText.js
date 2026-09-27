/**
 * documentText.js — a file the reader gives us, turned into plain text. Nothing more.
 *
 * Everything here runs in the browser. `editions.js` FRAMING says this tool holds no client data, and parsing
 * client-side is what makes that structurally true rather than a promise: there is no upload endpoint, so there is
 * nothing to audit, nothing to retain and nothing to leak. A dropped RFP never leaves the machine it was dropped on.
 *
 * Only one new dependency was worth taking. PDF text extraction genuinely needs a library (fonts, encodings,
 * content streams), so `pdfjs-dist` is lazy-imported and loads only when someone actually drops a PDF. Word,
 * PowerPoint and Excel are all OOXML — zips of XML — and this repository already reads and writes OOXML by hand
 * over JSZip in `briefXlsx.js` and `briefPptx.js`. Adding `mammoth` and `xlsx` to read what we already know how to
 * write would have cost ~1.3 MB of bundle to duplicate knowledge the codebase has.
 *
 * Reading a .pptx came free with that decision, and matters more than it sounds: an RFP is very often a deck.
 *
 * Every file is parsed independently. One corrupt PDF loses that PDF, never the other four.
 */

/** Big enough for a CIM, small enough that the tab survives it. */
export const MAX_FILE_MB = 25
/** Extraction stops here. A 400k-character document is past the point where more text tells you anything new. */
export const MAX_CHARS = 400_000

export const KINDS = {
  pdf: { ext: ['.pdf'], label: 'PDF' },
  docx: { ext: ['.docx'], label: 'Word' },
  pptx: { ext: ['.pptx'], label: 'PowerPoint' },
  xlsx: { ext: ['.xlsx', '.xlsm'], label: 'Excel' },
  csv: { ext: ['.csv', '.tsv'], label: 'CSV' },
  text: { ext: ['.txt', '.md', '.markdown', '.json'], label: 'Text' },
}

export const SUPPORTED = Object.values(KINDS).flatMap((k) => k.ext)

export function kindOf(filename) {
  const ext = (String(filename).toLowerCase().match(/\.[^.]+$/) || [''])[0]
  for (const [id, k] of Object.entries(KINDS)) if (k.ext.includes(ext)) return id
  return null
}

const clamp = (text) => (text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS)}\n…[truncated at ${MAX_CHARS.toLocaleString()} characters]` : text)

/** Unescape the five XML entities and drop tags. OOXML text runs carry no markup of their own. */
const unxml = (s) => s
  .replace(/<[^>]*>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&amp;/g, '&')

const runs = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => unxml(m[1]))

/** Parts named part1, part2 … part10 sort as 1,2,…,10 rather than 1,10,2. */
const numeric = (a, b) => (Number((a.match(/(\d+)\.xml$/) || [])[1] || 0) - Number((b.match(/(\d+)\.xml$/) || [])[1] || 0))

/**
 * Word: paragraphs are `<w:p>`, text is `<w:t>`. A tab is `<w:tab/>` and a break is `<w:br/>`, both of which
 * matter because a table of figures read without them becomes one unreadable line.
 */
export async function readDocx(zip) {
  const part = zip.file('word/document.xml')
  if (!part) throw new Error('Not a Word document (no word/document.xml).')
  const xml = await part.async('string')
  return xml
    .split(/<w:p[ >]/)
    .map((p) => unxml(p
      // Field codes are instructions to Word, not text a reader ever sees.
      .replace(/<w:instrText[^>]*>[\s\S]*?<\/w:instrText>/g, '')
      // Tabs and line breaks live BETWEEN runs, so they become real whitespace before the tags are stripped —
      // without this, a table of figures collapses into one unreadable line.
      .replace(/<w:tab\/>/g, '\t')
      .replace(/<w:br\s*\/>/g, '\n')))
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

/** PowerPoint: one block of text per slide, in slide order, so "page 4" means something. */
export async function readPptx(zip) {
  const parts = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort(numeric)
  if (!parts.length) throw new Error('Not a PowerPoint file (no slides).')
  const pages = []
  for (const name of parts) {
    const xml = await zip.file(name).async('string')
    pages.push(runs(xml, 'a:t').join(' ').replace(/\s+/g, ' ').trim())
  }
  return { text: pages.map((p, i) => `— slide ${i + 1} —\n${p}`).join('\n\n'), pages }
}

/**
 * Excel: cells are either an index into the shared-string table (`t="s"`) or inline. Rows become lines and cells
 * become tab-separated, which is enough for a figure to be found next to its label.
 */
export async function readXlsx(zip) {
  const sharedPart = zip.file('xl/sharedStrings.xml')
  const shared = sharedPart ? runs(await sharedPart.async('string'), 'si') : []
  const sheets = Object.keys(zip.files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort(numeric)
  if (!sheets.length) throw new Error('Not an Excel workbook (no worksheets).')
  const out = []
  for (const [i, name] of sheets.entries()) {
    const xml = await zip.file(name).async('string')
    const rows = [...xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((r) => {
      const cells = [...r[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)].map(([, attrs, body]) => {
        const v = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1]
        if (/t="s"/.test(attrs)) return shared[Number(v)] ?? ''
        if (/t="inlineStr"/.test(attrs)) return unxml((body.match(/<is>([\s\S]*?)<\/is>/) || [])[1] || '')
        return v == null ? '' : unxml(v)
      })
      return cells.join('\t').trim()
    }).filter(Boolean)
    if (rows.length) out.push(`— sheet ${i + 1} —\n${rows.join('\n')}`)
  }
  return out.join('\n\n')
}

/** PDF, the one format that needs a library. Lazy so nobody pays for it until they drop a PDF. */
async function readPdf(bytes) {
  const pdfjs = await import('pdfjs-dist')
  // The worker is a separate bundle; without this, pdf.js tries to fetch a path that does not exist in the build.
  const worker = await import('pdfjs-dist/build/pdf.worker.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const doc = await pdfjs.getDocument({ data: bytes, isEvalSupported: false, useSystemFonts: true }).promise
  const pages = []
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    pages.push(content.items.map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim())
    if (pages.join('').length > MAX_CHARS) break
  }
  await doc.destroy()
  return { text: pages.map((p, i) => `— page ${i + 1} —\n${p}`).join('\n\n'), pages }
}

/** A zip-backed OOXML file. Exported so the tests can feed it bytes this application produced itself. */
export async function readOoxml(kind, bytes) {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(bytes)
  if (kind === 'docx') return { text: await readDocx(zip), pages: [] }
  if (kind === 'pptx') return readPptx(zip)
  return { text: await readXlsx(zip), pages: [] }
}

/**
 * One file in, `{ filename, kind, label, text, pages, chars }` out — or a thrown error naming the file, because a
 * failure the reader cannot attribute to a file is a failure they cannot act on.
 */
export async function readFile(file) {
  const kind = kindOf(file.name)
  if (!kind) throw new Error(`${file.name}: ${SUPPORTED.join(', ')} only.`)
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`${file.name} is ${(file.size / 1e6).toFixed(0)} MB — the limit is ${MAX_FILE_MB} MB.`)

  let result
  if (kind === 'text' || kind === 'csv') result = { text: await file.text(), pages: [] }
  else if (kind === 'pdf') result = await readPdf(new Uint8Array(await file.arrayBuffer()))
  else result = await readOoxml(kind, await file.arrayBuffer())

  const text = clamp((result.text || '').replace(/\r\n/g, '\n').trim())
  if (!text) throw new Error(`${file.name} has no text in it — a scanned PDF or an image-only deck cannot be read here.`)
  return { filename: file.name, kind, label: KINDS[kind].label, text, pages: result.pages || [], chars: text.length }
}
