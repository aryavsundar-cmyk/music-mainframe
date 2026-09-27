/**
 * uploadSection.js — what a document you supplied becomes, once it reaches a deliverable.
 *
 * This is the one place where material that did NOT come from the canvas enters a document the canvas produces,
 * and the whole file exists to keep those two things apart on the page. Four sprints went into making this
 * application honest about where its figures come from; an upload that quietly joined the record would undo all
 * of it in one section.
 *
 * So the rules, and they are not stylistic:
 *
 * - **The section says whose words these are, in its title and again in its first line.** Not "Market context" —
 *   *From the documents you provided*. Someone reading the exported deck three weeks later has no upload panel in
 *   front of them.
 * - **Every figure names its file and page.** A number with no filename beside it is indistinguishable from a
 *   number off the record, which is exactly the confusion being prevented.
 * - **A comparison reports two numbers. It never picks one.** The document may be measuring a different period,
 *   a different entity in the group, or a different thing entirely. Saying "these differ, go and look" is useful;
 *   saying "the document is wrong" would be inventing a fact.
 * - **It is always the last content section**, before the framing. It is context, not evidence, and it reads as
 *   an appendix because that is what it is.
 *
 * `utils/brief.js` and its siblings remain the only builders of CANVAS sections. This builds the one section they
 * are not allowed to build, and `buildDeliverable` appends it.
 */
import { format } from './format.js'

export const UPLOAD_TITLE = 'From the documents you provided'

const at = (f) => `${f.from}${f.page ? `, p.${f.page}` : ''}`
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/**
 * The section, or null when nothing was uploaded — a deliverable with no uploads must be byte-for-byte what it
 * was before this feature existed.
 */
export function uploadSection(findings, num = 0) {
  if (!findings || !findings.files?.length) return null
  const { files, companies, checks, figures, terms, words } = findings
  const blocks = []

  blocks.push({
    kind: 'paragraph',
    text: `Everything in this section comes from ${files.length === 1 ? 'a file' : `${files.length} files`} supplied for this piece of work, not from this application's own records. It is reproduced here so the two can be read side by side, and none of it has been verified against a source.`,
  })

  blocks.push({
    kind: 'facts',
    rows: files.map((f) => [f.filename, `${f.kind.toUpperCase()} · ${format.count(f.words, { full: true })} words · ${plural(f.companies, 'company', 'companies')} and ${plural(f.figures, 'figure')} found`]),
  })

  if (companies.length) {
    blocks.push({
      kind: 'table',
      columns: ['Company named', 'On this canvas as', 'Mentions', 'Seen in'],
      rows: companies.slice(0, 20).map((c) => [c.matched?.[0] || c.name, c.name, String(c.hits), c.files.join(', ')]),
    })
    blocks.push({ kind: 'note', text: 'A company is listed here because its name appears in the text, which is not the same as the document being about it.' })
  }

  if (checks.length) {
    blocks.push({
      kind: 'table',
      columns: ['Company', 'In your document', 'On this record', 'Same?'],
      rows: checks.map((c) => [
        c.name,
        `${c.theirs.text} (${at(c.theirs)})`,
        `${c.ours.text} — ${c.ours.label}`,
        c.differs === null ? 'different currencies, not compared' : c.differs ? 'they differ' : 'they agree',
      ]),
    })
    blocks.push({
      kind: 'note',
      text: 'Where the two differ, neither is corrected here. A document may be measuring a different period, a different company in the same group, or a different thing entirely — this only says the numbers are not the same, so that somebody looks.',
    })
  }

  const unmatched = figures.filter((f) => !checks.some((c) => c.theirs.text === f.text && c.theirs.from === f.from))
  if (unmatched.length) {
    blocks.push({
      kind: 'table',
      columns: ['Figure', 'Where', 'In context'],
      rows: unmatched.slice(0, 14).map((f) => [f.text, at(f), f.context.length > 150 ? `${f.context.slice(0, 150)}…` : f.context]),
    })
  }

  if (terms.length) {
    blocks.push({ kind: 'bullets', items: terms.slice(0, 12).map((t) => `${t.term} — ${t.short}`) })
    blocks.push({ kind: 'note', text: 'Terms the document uses that this application explains; the full definitions are in the glossary.' })
  }

  blocks.push({
    kind: 'note',
    text: `Read from ${format.count(words, { full: true })} words of supplied material in the browser. No uploaded file left this machine, and none of it was added to the records behind this document.`,
  })

  return { num, eyebrow: 'Supplied material', title: UPLOAD_TITLE, blocks }
}

/**
 * doc → doc with the supplied-material section appended. Never mutates the input, and never runs twice.
 *
 * It lands before the framing section for the same reason the framing is last: the last thing a reader should see
 * is what the document is, and the second-to-last is what in it did not come from the record.
 */
export function withUploads(doc, findings) {
  const section = uploadSection(findings)
  if (!section) return doc
  if (doc.sections?.some((s) => s.title === UPLOAD_TITLE)) return doc
  const sections = [...(doc.sections || []), { ...section, num: (doc.sections?.length || 0) + 1 }]
  return { ...doc, sections, uploads: findings.files.map((f) => f.filename) }
}
