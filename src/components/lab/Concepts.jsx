import { useState } from 'react'
import { BookOpen, ChevronDown } from 'lucide-react'
import { Card } from '../primitives/index.js'
import { GLOSSARY_BY_ID } from '../../data/glossary.js'

/** One term, collapsed to a plain-English line, expanding to the explanation, an example, and the usual mistake. */
export function TermRow({ id, open: initial = false }) {
  const [open, setOpen] = useState(initial)
  const t = GLOSSARY_BY_ID[id]
  if (!t) return null
  return (
    <div className="py-2.5">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full text-left bg-transparent border-0 cursor-pointer px-0 grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-baseline">
        <span className="min-w-0">
          <span className="t-body text-ink-1">{t.term}</span>
          {t.aka?.length ? <span className="t-micro text-ink-4 ml-2">{t.aka.join(' · ')}</span> : null}
          <span className="block t-small text-ink-2 mt-0.5">{t.short}</span>
        </span>
        <ChevronDown size={14} className={`text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="mt-2.5 space-y-2.5 pl-0 md:pl-3 md:border-l md:border-line-2">
          <p className="t-body text-ink-2 m-0 max-w-3xl">{t.plain}</p>
          <p className="t-small text-ink-2 m-0 rounded-md bg-ground-2 border border-line-1 px-3 py-2"><span className="t-micro uppercase tracking-[0.08em] text-ink-3 block mb-1">For example</span>{t.worked}</p>
          <p className="t-small text-ink-2 m-0"><span className="t-micro uppercase tracking-[0.08em] text-accent mr-2">Watch out</span>{t.watch}</p>
          {t.related?.length ? (
            <p className="t-micro text-ink-3 m-0">Related: {t.related.map((r) => GLOSSARY_BY_ID[r]?.term).filter(Boolean).join(' · ')}</p>
          ) : null}
        </div>
      )}
    </div>
  )
}

/** Concepts — the terms this step uses, explained for someone who has never done a deal. */
export function Concepts({ ids = [], title = 'The concepts on this step' }) {
  const [open, setOpen] = useState(false)
  const terms = ids.map((id) => GLOSSARY_BY_ID[id]).filter(Boolean)
  if (!terms.length) return null
  return (
    <Card pad="lg">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full text-left bg-transparent border-0 cursor-pointer px-0 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2">
          <BookOpen size={15} className="text-secondary" aria-hidden="true" />
          <span className="t-h3 text-ink-1">{title}</span>
          <span className="t-micro text-ink-3">{terms.length} terms, in plain English</span>
        </span>
        <ChevronDown size={16} className={`text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && <div className="mt-3 divide-y divide-line-1 border-t border-line-1">{terms.map((t) => <TermRow key={t.id} id={t.id} />)}</div>}
      {!open && <p className="t-small text-ink-3 m-0 mt-2">{terms.slice(0, 6).map((t) => t.term).join(' · ')}{terms.length > 6 ? ' …' : ''}</p>}
    </Card>
  )
}
