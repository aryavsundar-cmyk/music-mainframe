/**
 * Eyebrow — small-caps label above a heading.
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
