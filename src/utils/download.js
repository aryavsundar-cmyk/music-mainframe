/**
 * download.js — browser-side export entry points for ANY doc built on the block model
 * (brief · account plan · proposal · sector deck). Renderers are lazy-imported so docx and pptxgenjs never
 * enter the core bundle. The Gamma path lives in its own module so an edition can exclude it entirely.
 */
import { buildBrief, briefFilename } from './brief.js'
import { fetchCitations } from './newsCitations.js'

function save(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** exportDoc(doc, format) — format: docx | pptx | txt | md | gamma-presentation | gamma-document */
export async function exportDoc(doc, format = 'docx') {
  const filename = briefFilename(doc, format.startsWith('gamma') ? 'gamma' : format)
  if (format === 'txt') { const { renderBriefText } = await import('./briefText.js'); save(new Blob([renderBriefText(doc)], { type: 'text/plain;charset=utf-8' }), filename) }
  else if (format === 'md') { const { renderBriefMarkdown } = await import('./briefMarkdown.js'); save(new Blob([renderBriefMarkdown(doc)], { type: 'text/markdown;charset=utf-8' }), filename) }
  else if (format === 'pptx') { const { briefPptxBlob } = await import('./briefPptx.js'); save(await briefPptxBlob(doc), filename) }
  else if (format.startsWith('gamma')) { const { exportToGamma } = await import('./gammaExport.js'); return exportToGamma(doc, format) }
  else { const { briefDocxBlob } = await import('./briefDocx.js'); save(await briefDocxBlob(doc), filename) }
  return { filename, citations: doc.citations?.source, sections: doc.sections.length }
}

/** Convenience for entity pages: fetch citations, build the brief, export. */
export async function exportBrief(entityId, { mode = 'full', format = 'docx' } = {}) {
  const citations = await fetchCitations({ entityId, limit: 8 })
  return exportDoc(buildBrief(entityId, { mode, citations }), format)
}

/** Build any deliverable kind with live citations. kind: brief | account-plan | proposal | category-deck */
export async function buildDeliverable(kind, { entityId, mode = 'full', categoryId = '', lines = [], rates, staffing, weeksOverride } = {}) {
  if (kind === 'category-deck') { const { buildCategoryDeck } = await import('./categoryDeck.js'); return buildCategoryDeck(categoryId) }
  const citations = await fetchCitations({ entityId, limit: 8 })
  if (kind === 'account-plan') { const { buildAccountPlan } = await import('./accountPlan.js'); return buildAccountPlan(entityId, { citations }) }
  if (kind === 'proposal') { const { buildProposal } = await import('./proposal.js'); return buildProposal(entityId, { categoryId, lines, rates, staffing, weeksOverride, citations }) }
  return buildBrief(entityId, { mode, citations })
}
