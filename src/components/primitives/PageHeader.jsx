import { Eyebrow } from './Eyebrow.jsx'

/** Top of every route: eyebrow, serif h1, optional lede, actions slot (primary CTA + secondary menu). */
export function PageHeader({ eyebrow, title, lede, tone = 'accent', actions, className = '' }) {
  return (
    <header className={`mb-10 ${className}`}>
      <div className="flex items-start justify-between gap-8">
        <div className="max-w-3xl">
          {eyebrow && <Eyebrow tone={tone} className="mb-3">{eyebrow}</Eyebrow>}
          <h1 className="t-h1 text-ink-1 m-0">{title}</h1>
          {lede && <p className="t-lede text-ink-2 mt-4 mb-0">{lede}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0 pt-1">{actions}</div>}
      </div>
    </header>
  )
}
