import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { PageHeader } from './PageHeader.jsx'
import { Card } from './Card.jsx'
import { Tag } from './Tag.jsx'

/** Route placeholder. Names the sprint that fills it and what will land there. Removed as routes populate. */
export function Stub({ eyebrow, title, lede, sprint, tone = 'accent', lands = [], related = [] }) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} lede={lede} tone={tone} />
      <Card pad="lg" className="max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Tag tone="neutral" mono>SPRINT {sprint}</Tag>
          <span className="t-small text-ink-3">not yet populated</span>
        </div>
        <ul className="m-0 pl-5 t-body text-ink-2 space-y-1.5">
          {lands.map((l) => <li key={l}>{l}</li>)}
        </ul>
        {related.length > 0 && (
          <div className="mt-6 pt-4 border-t border-line-1 flex flex-wrap gap-x-5 gap-y-1">
            {related.map(([to, label]) => (
              <Link key={to} to={to} className="t-small text-accent inline-flex items-center gap-1 no-underline hover:underline">
                {label} <ArrowRight size={13} aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}
