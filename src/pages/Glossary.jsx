import { useMemo } from 'react'
import { format } from '../utils/format.js'
import { PageHeader, FilterBar, KeyFigures, SectionHeader, Card } from '../components/primitives/index.js'
import { TermRow } from '../components/reference/Concepts.jsx'
import { GLOSSARY, TAGS } from '../data/glossary.js'
import { useUrlFilters } from '../hooks/useUrlFilters.js'
import { PageExport } from '../components/export/PageExport.jsx'
import { buildPageDoc, describeFilters } from '../utils/pageDocs.js'

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
        answer={<KeyFigures items={[
          { value: format.count(GLOSSARY.length, { full: true }), label: 'terms explained' },
          { value: format.count(Object.keys(TAGS).length), label: 'topics' },
        ]} />}
        lede="Every term the app uses, written for someone who has never worked on a deal: what it is, an example with round numbers, and the mistake people actually make with it." />

      <FilterBar
        search={{ value: params.q, onChange: (v) => set({ q: v }), placeholder: 'Search terms, synonyms and examples' }}
        active={[
          params.q && { key: 'q', label: `“${params.q}”`, onRemove: () => set({ q: '' }) },
          params.tag && { key: 'tag', label: TAGS[params.tag] || params.tag, onRemove: () => set({ tag: '' }) },
        ].filter(Boolean)}
        onClear={() => set({ q: '', tag: '' })}
        count={{ shown: matches.length, total: GLOSSARY.length, noun: 'terms' }}
      >
        <div className="flex items-start gap-2">
          <span className="t-micro text-ink-4 w-16 shrink-0 pt-1.5">Topic</span>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" aria-pressed={!params.tag} onClick={() => set({ tag: '' })} className={`t-small rounded-sm border px-2 py-1 cursor-pointer ${!params.tag ? 'bg-ground-4 border-line-3 text-ink-1' : 'border-line-1 bg-transparent text-ink-2 hover:bg-ground-2 hover:text-ink-1'}`}>All</button>
            {Object.entries(TAGS).map(([tag, label]) => (
              <button key={tag} type="button" aria-pressed={params.tag === tag} onClick={() => set({ tag: params.tag === tag ? '' : tag })}
                className={`t-small rounded-sm border px-2 py-1 cursor-pointer ${params.tag === tag ? 'bg-ground-4 border-line-3 text-ink-1' : 'border-line-1 bg-transparent text-ink-2 hover:bg-ground-2 hover:text-ink-1'}`}>{label}</button>
            ))}
          </div>
        </div>
      </FilterBar>

      {groups.map((g) => (
        <div key={g.tag} className="mb-8">
          <SectionHeader eyebrow={`${g.terms.length} terms`} title={g.label} />
          <Card pad="lg"><div className="divide-y divide-line-1">{g.terms.map((t) => <TermRow key={t.id} id={t.id} open={!!q} />)}</div></Card>
        </div>
      ))}
      {!matches.length && <Card pad="lg"><p className="t-body text-ink-3 m-0">Nothing matches that search.</p></Card>}
      <PageExport build={() => buildPageDoc({
        slug: 'finance-explained',
        title: 'Finance, explained',
        eyebrow: 'Reference · plain English',
        lede: 'Every term the app uses, written for someone who has never worked on a deal: what it is, an example with round numbers, and the mistake people actually make with it.',
        filters: describeFilters({ q: params.q, tag: params.tag }, { q: { label: 'Search' }, tag: { label: 'Group', format: (v) => TAGS[v] || v } }),
        sort: 'Grouped by topic',
        stats: [{ label: 'Terms in this view', value: String(matches.length) }, { label: 'Terms on record', value: String(GLOSSARY.length) }],
        columns: ['Term', 'Also known as', 'What it is', 'Worked example', 'Watch out for'],
        rows: matches.map((t) => [t.term, (t.aka || []).join(' · '), t.plain || t.short, t.worked || '', t.watch || '']),
        total: GLOSSARY.length,
      })} />
    </>
  )
}
