/**
 * download.js — browser-side export entry points. Renderers are lazy-imported so pptxgenjs (400 KB+)
 * and docx never enter the core bundle (sibling anti-pattern #1).
 */
import { buildBrief, briefFilename } from './brief.js'
import { fetchCitations } from './newsCitations.js'

function save(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** exportBrief(entityId, { mode, format }) → { filename, citations: 'live' | 'empty' | 'unavailable' } */
export async function exportBrief(entityId, { mode = 'full', format = 'docx' } = {}) {
  const citations = await fetchCitations({ entityId, limit: 8 })
  const brief = buildBrief(entityId, { mode, citations })
  let blob
  if (format === 'txt') {
    const { renderBriefText } = await import('./briefText.js')
    blob = new Blob([renderBriefText(brief)], { type: 'text/plain;charset=utf-8' })
  } else if (format === 'pptx') {
    const { briefPptxBlob } = await import('./briefPptx.js')
    blob = await briefPptxBlob(brief)
  } else {
    const { briefDocxBlob } = await import('./briefDocx.js')
    blob = await briefDocxBlob(brief)
  }
  const filename = briefFilename(brief, format)
  save(blob, filename)
  return { filename, citations: citations.source, sections: brief.sections.length }
}
