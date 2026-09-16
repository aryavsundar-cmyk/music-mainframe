import { ExportBar } from './ExportBar.jsx'

/**
 * PageExport — the export bar as it appears at the foot of a page view.
 *
 * `build` is called on click, not on render, so the document is always the view as it stands at that moment:
 * current filters, current sort, current rows. Excel leads because these exports are tables; the other formats
 * carry the same content for people who want to read or present it instead.
 */
export function PageExport({ build, label = 'Export this view — filters and sort included', className = 'mt-8' }) {
  return <div className={className}><ExportBar title={label} build={build} primary="xlsx" /></div>
}
