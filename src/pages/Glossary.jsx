import { useMemo } from 'react'
import { Search } from 'lucide-react'
import { PageHeader, SectionHeader, Card } from '../components/primitives/index.js'
import { TermRow } from '../components/reference/Concepts.jsx'
import { GLOSSARY, TAGS } from '../data/glossary.js'
import { useUrlFilters } from '../hooks/useUrlFilters.js'

export default function Glossary() {
  const { params, set } = useUrlFilters(['q', 'tag'])
  const q = params.q.trim().toLowerCase()
  const matches = useMemo(() => GLOSSARY.filter((t) => {
    if (params.tag && !t.tags.includes(params.tag)) return false
    if (!q) return true
    return `${t.term} ${(t.aka || []).join(' ')} ${t.short} ${t.plain} ${t.worked} ${t.watch}`.toLowerCase().includes(q)
  }), [q, params.tag])
  const groups = Object.keys(TAGS).map((tag) => ({ tag, label: TAGS[tag], terms: matches.filter((t) => t.tags[0] === tag) })).filter((g) => g.terms.length)

  return (
    <>
      <PageHeader eyebrow="Reference · plain English" title="Finance, explained"
        lede="Every term the lab uses, written for someone who has never worked on a deal: what it is, an example with round numbers, and the mistake people actually make with it." />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-4" aria-hidden="true" />
          <input value={params.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search terms" aria-label="Search terms"
            className="bg-ground-1 border border-line-2 rounded-md h-8 pl-8 pr-2 t-small text-ink-1 placeholder:text-ink-4 focus:border-accent outline-none w-64" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => set({ tag: '' })} className={`t-micro rounded-md border px-2 py-1 cursor-pointer ${!params.tag ? 'border-accent-line bg-accent-soft text-accent' : 'border-line-2 bg-transparent text-ink-2 hover:text-ink-1'}`}>All</button>
          {Object.entries(TAGS).map(([tag, label]) => (
            <button key={tag} type="button" onClick={() => set({ tag: params.tag === tag ? '' : tag })}
              className={`t-micro rounded-md border px-2 py-1 cursor-pointer ${params.tag === tag ? 'border-accent-line bg-accent-soft text-accent' : 'border-line-2 bg-transparent text-ink-2 hover:text-ink-1'}`}>{label}</button>
          ))}
        </div>
        <span className="t-small text-ink-3 font-mono tabular">{matches.length}</span>
      </div>

      {groups.map((g) => (
        <div key={g.tag} className="mb-8">
          <SectionHeader eyebrow={`${g.terms.length} terms`} title={g.label} />
          <Card pad="lg"><div className="divide-y divide-line-1">{g.terms.map((t) => <TermRow key={t.id} id={t.id} open={!!q} />)}</div></Card>
        </div>
      ))}
      {!matches.length && <Card pad="lg"><p className="t-body text-ink-3 m-0">Nothing matches that search.</p></Card>}
    </>
  )
}
