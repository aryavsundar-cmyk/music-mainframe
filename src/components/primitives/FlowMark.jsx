import { flows } from '../../tokens.js'

/**
 * FlowMark — the glyph that says "recording" or "publishing" wherever a flow is referenced.
 * Recording: solid chain. Publishing: dashed fan. Colour AND line rhythm differ, so it survives greyscale.
 */
export function FlowMark({ flow = 'recording', label = true, className = '' }) {
  const f = flows[flow] ?? flows.recording
  const color = flow === 'publishing' ? 'text-publishing' : 'text-recording'
  return (
    <span className={`inline-flex items-center gap-2 ${color} ${className}`}>
      <svg width="28" height="10" viewBox="0 0 28 10" aria-hidden="true">
        <line x1="1" y1="5" x2="27" y2="5" stroke="currentColor" strokeWidth={f.stroke} strokeDasharray={f.dash === 'none' ? undefined : f.dash} strokeLinecap="round" />
        {flow === 'recording'
          ? <><circle cx="4" cy="5" r="2.2" fill="currentColor" /><circle cx="14" cy="5" r="2.2" fill="currentColor" /><circle cx="24" cy="5" r="2.2" fill="currentColor" /></>
          : <><circle cx="4" cy="5" r="2.2" fill="currentColor" /><circle cx="24" cy="2" r="1.6" fill="currentColor" /><circle cx="24" cy="8" r="1.6" fill="currentColor" /></>}
      </svg>
      {label && <span className="t-eyebrow">{f.label}</span>}
    </span>
  )
}
