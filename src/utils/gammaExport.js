/**
 * gammaExport.js — the Gamma integration, isolated so the work edition can exclude it entirely.
 * It is the only path by which document content leaves the application, which is why it lives on its own.
 */
import { renderBriefMarkdown } from './briefMarkdown.js'

export async function exportToGamma(doc, format) {
  const r = await fetch('/api/gamma/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: renderBriefMarkdown(doc),
      title: `${doc.title} — ${doc.modeLabel}`,
      format: format === 'gamma-document' ? 'document' : 'presentation',
      numCards: Math.min(20, doc.sections.length + 2),
    }),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) { const err = new Error(j.help || j.error || `Gamma HTTP ${r.status}`); err.code = r.status; throw err }
  window.open(j.url, '_blank', 'noopener')
  return { filename: j.url, citations: doc.citations?.source, sections: doc.sections.length, url: j.url }
}
