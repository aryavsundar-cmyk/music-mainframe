/**
 * Eyebrow — small-caps label above a heading, or the heading itself.
 *
 * Roughly forty section labels in this app were plain <div>s, so a screen-reader heading list for /deals or
 * /entities was one item long. `as="h2"` keeps the look and gives the page an outline.
 * `number` renders the export-style "§ 03 — " prefix; leave it off on entity pages (sections are peers).
 */
const TONES = {
  accent: 'text-accent',
  secondary: 'text-secondary',
  muted: 'text-ink-3',
  danger: 'text-danger',
}

export function Eyebrow({ children, tone = 'accent', number, className = '', as: Tag = 'div' }) {
  return (
    <Tag className={`t-eyebrow ${TONES[tone] ?? TONES.accent} ${className}`}>
      {number != null && <span className="tabular">§ {String(number).padStart(2, '0')} — </span>}
      {children}
    </Tag>
  )
}
