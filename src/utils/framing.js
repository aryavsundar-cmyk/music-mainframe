/**
 * framing.js — what a document says about itself once it leaves the building.
 *
 * A file forwarded on has no screen around it: whoever opens the deck a colleague sent has never seen the
 * notice in the app. So the research edition appends its own framing as a final section — what this tool is,
 * what it is not, where the records come from, and what it holds no data of.
 *
 * The full edition adds nothing: those documents are the operator's own working material.
 */
import { EDITIONS, EDITION, FRAMING, IS_WORK } from '../editions.js'

export const FRAMING_TITLE = 'About this document'

/** The framing section, or null in the edition that doesn't need one. Exported so tests can read it directly. */
export function framingSection(num = 0) {
  if (!IS_WORK) return null
  return {
    num,
    eyebrow: 'Provenance',
    title: FRAMING_TITLE,
    blocks: [
      { kind: 'paragraph', text: FRAMING.what },
      { kind: 'note', text: `${FRAMING.notProduct} ${FRAMING.sources}` },
      { kind: 'note', text: FRAMING.data },
      { kind: 'facts', rows: [['Edition', FRAMING.title], ['Sections here', 'Every figure traces to the records and sources listed in this document'], ['Formats offered', EDITIONS[EDITION].exports.join(' · ')]] },
    ],
  }
}

/** doc → doc, with the framing section appended once. Never mutates the input. */
export function withFraming(doc) {
  const section = framingSection((doc?.sections?.length || 0) + 1)
  if (!doc || !section) return doc
  if (doc.sections?.some((s) => s.title === FRAMING_TITLE)) return doc
  return { ...doc, sections: [...(doc.sections || []), section] }
}
