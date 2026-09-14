import { Search, X } from 'lucide-react'
import { ENTITY_TYPES, TYPE_ORDER, OWNERSHIP, PARENTS, COUNTS } from '../../data/entities.js'

const chip = (active) => [
  'inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 t-small transition-colors duration-100 cursor-pointer select-none',
  active ? 'bg-ground-4 border-line-3 text-ink-1' : 'bg-transparent border-line-1 text-ink-2 hover:bg-ground-2 hover:text-ink-1',
].join(' ')

const select = 'bg-ground-1 border border-line-2 rounded-md h-8 px-2 t-small text-ink-1 focus:border-accent outline-none'

/** Search + facet controls. State lives in the URL (useSearchParams) so views are shareable. */
export function Facets({ params, set, resultCount }) {
  const { q = '', type = '', tier = '', ownership = '', parent = '', verify = '' } = params
  const any = q || type || tier || ownership || parent || verify
  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center gap-3">
        <label className="relative flex-1 max-w-xl">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true" />
          <input
            type="search" value={q} onChange={(e) => set({ q: e.target.value })}
            placeholder="Search name, HQ, ticker, summary"
            className="w-full h-9 pl-9 pr-3 bg-ground-1 border border-line-2 rounded-md t-body text-ink-1 placeholder:text-ink-4 outline-none focus:border-accent"
          />
        </label>
        <span className="t-small text-ink-3 tabular whitespace-nowrap">{resultCount} of {COUNTS.total}</span>
        {any && (
          <button type="button" onClick={() => set({ q: '', type: '', tier: '', ownership: '', parent: '', verify: '' })}
            className="inline-flex items-center gap-1 t-small text-ink-3 hover:text-ink-1 bg-transparent border-0 cursor-pointer">
            <X size={13} aria-hidden="true" /> Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={chip(!type)} onClick={() => set({ type: '' })}>All types</button>
        {TYPE_ORDER.map((t) => (
          <button key={t} type="button" className={chip(type === t)} onClick={() => set({ type: type === t ? '' : t })}>
            {ENTITY_TYPES[t].label}<span className="t-micro font-mono text-ink-4">{COUNTS.byType[t]}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select className={select} value={tier} onChange={(e) => set({ tier: e.target.value })} aria-label="Tier">
          <option value="">Any tier</option><option value="1">Tier 1 · global</option><option value="2">Tier 2 · major indie / regional</option><option value="3">Tier 3 · niche</option>
        </select>
        <select className={select} value={ownership} onChange={(e) => set({ ownership: e.target.value })} aria-label="Ownership">
          <option value="">Any ownership</option>
          {Object.entries(OWNERSHIP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className={select} value={parent} onChange={(e) => set({ parent: e.target.value })} aria-label="Parent">
          <option value="">Any parent</option>
          {PARENTS.map((p) => <option key={p.id} value={p.id}>{p.short || p.name}</option>)}
        </select>
        <label className="inline-flex items-center gap-2 t-small text-ink-2 cursor-pointer ml-1">
          <input type="checkbox" checked={!!verify} onChange={(e) => set({ verify: e.target.checked ? '1' : '' })} className="accent-[var(--mm-accent)]" />
          needs verification <span className="t-micro font-mono text-ink-4">{COUNTS.verify}</span>
        </label>
      </div>
    </div>
  )
}
