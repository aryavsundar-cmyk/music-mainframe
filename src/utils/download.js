/**
 * download.js — browser-side export entry points for ANY doc built on the block model
 * (brief · account plan · proposal · sector deck). Renderers are lazy-imported so docx, pptxgenjs and jszip
 * never enter the core bundle. The Gamma path lives in its own module so an edition can exclude it entirely.
 *
 * RENDERERS is the whole format table, and exportDoc throws on a format that isn't in it. An `else` branch
 * that quietly rendered anything unknown as Word is exactly how Sprint 20 shipped Word bytes named .xlsx:
 * the call returned a filename and a section count, so it looked verified. scripts/test-xlsx.mjs now asserts
 * every format each edition advertises has an entry here.
 */
import { buildBrief, briefFilename } from './brief.js'
import { withFraming } from './framing.js'
import { fetchCitations } from './newsCitations.js'

function save(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** format → the blob it produces. One entry per format any edition advertises; nothing falls through. */
export const RENDERERS = {
  docx: async (doc) => (await import('./briefDocx.js')).briefDocxBlob(doc),
  pptx: async (doc) => (await import('./briefPptx.js')).briefPptxBlob(doc),
  xlsx: async (doc) => (await import('./briefXlsx.js')).briefXlsxBlob(doc),
  txt: async (doc) => new Blob([(await import('./briefText.js')).renderBriefText(doc)], { type: 'text/plain;charset=utf-8' }),
  md: async (doc) => new Blob([(await import('./briefMarkdown.js')).renderBriefMarkdown(doc)], { type: 'text/markdown;charset=utf-8' }),
}

/** exportDoc(doc, format) — format: any key of RENDERERS, or gamma-presentation | gamma-document */
export async function exportDoc(doc, format = 'docx') {
  const framed = withFraming(doc)
  if (format.startsWith('gamma')) { const { exportToGamma } = await import('./gammaExport.js'); return exportToGamma(framed, format) }
  const render = RENDERERS[format]
  if (!render) throw new Error(`No renderer for format "${format}" — add one to RENDERERS or drop it from the edition manifest.`)
  const filename = briefFilename(framed, format)
  save(await render(framed), filename)
  return { filename, citations: framed.citations?.source, sections: framed.sections.length }
}

/** Convenience for entity pages: fetch citations, build the brief, export. `forceItems` = the page's tagged evidence. */
export async function exportBrief(entityId, { mode = 'full', format = 'docx', forceItems = null, financials = null } = {}) {
  const citations = await fetchCitations({ entityId, limit: 8 })
  return exportDoc(buildBrief(entityId, { mode, citations, forceItems, financials }), format)
}

/** Build any deliverable kind with live citations. kind: brief | account-plan | proposal | category-deck */
export async function buildDeliverable(kind, { entityId, mode = 'full', categoryId = '', lines = [], rates, staffing, weeksOverride } = {}) {
  if (kind === 'category-deck') { const { buildCategoryDeck } = await import('./categoryDeck.js'); return buildCategoryDeck(categoryId) }
  const citations = await fetchCitations({ entityId, limit: 8 })
  if (kind === 'account-plan') { const { buildAccountPlan } = await import('./accountPlan.js'); return buildAccountPlan(entityId, { citations }) }
  if (kind === 'proposal') { const { buildProposal } = await import('./proposal.js'); return buildProposal(entityId, { categoryId, lines, rates, staffing, weeksOverride, citations }) }
  return buildBrief(entityId, { mode, citations })
}
