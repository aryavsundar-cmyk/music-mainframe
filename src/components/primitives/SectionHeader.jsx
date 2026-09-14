import { Eyebrow } from './Eyebrow.jsx'

/** Eyebrow + serif h2 + hairline. `aside` sits right-aligned on the h2 line (counts, actions). */
export function SectionHeader({ eyebrow, title, number, tone = 'accent', aside, className = '' }) {
  return (
    <header className={`mb-6 ${className}`}>
      {eyebrow && <Eyebrow tone={tone} number={number} className="mb-2">{eyebrow}</Eyebrow>}
      <div className="flex items-end justify-between gap-6 pb-3 border-b border-line-1">
        <h2 className="t-h2 text-ink-1 m-0">{title}</h2>
        {aside && <div className="t-small text-ink-3 shrink-0">{aside}</div>}
      </div>
    </header>
  )
}
