import { ENTITY_TYPES, TYPE_ORDER, OWNERSHIP, PARENTS, COUNTS } from '../../data/entities.js'
import { FORCES } from '../../data/forces.js'

const chip = (active) => [
  'inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 t-small transition-colors duration-100 cursor-pointer select-none',
  active ? 'bg-ground-4 border-line-3 text-ink-1' : 'bg-transparent border-line-1 text-ink-2 hover:bg-ground-2 hover:text-ink-1',
].join(' ')

const select = 'bg-ground-1 border border-line-2 rounded-md h-8 px-2 t-small text-ink-1 focus:border-accent'
const row = 'flex flex-wrap items-center gap-1.5'
const label = 't-micro text-ink-4 w-20 shrink-0'

/**
 * Every facet the entity table has, inside the FilterBar panel rather than stacked above the data.
 *
 * Search and the active-filter summary live in the bar itself; this is what opens when the reader asks for it.
 * Each group is labelled, so the panel reads as a list of questions rather than a field of controls.
 */
export function FacetControls({ params, set, picked, toggle, staleCount, forcesLoading, financials }) {
  const { type = '', tier = '', ownership = '', parent = '', verify = '' } = params
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <span className={`${label} pt-1.5`}>Type</span>
        <div className={row}>
          <button type="button" aria-pressed={!type} className={chip(!type)} onClick={() => set({ type: '' })}>All types</button>
          {TYPE_ORDER.map((t) => (
            <button key={t} type="button" aria-pressed={type === t} className={chip(type === t)} onClick={() => set({ type: type === t ? '' : t })}>
              {ENTITY_TYPES[t].label}<span className="t-micro font-mono text-ink-3">{COUNTS.byType[t]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2">
        <span className={`${label} pt-1.5`}>Profile</span>
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
          <label className="inline-flex items-center gap-2 t-small text-ink-2 cursor-pointer">
            <input type="checkbox" checked={!!verify} onChange={(e) => set({ verify: e.target.checked ? '1' : '' })} className="accent-[var(--mm-accent)]" />
            needs verification <span className="t-micro font-mono text-ink-3">{COUNTS.verify}</span>
          </label>
        </div>
      </div>

      <div className="flex items-start gap-2">
        <span className={`${label} pt-1.5`}>Exposed to</span>
        <div className={row}>
          {FORCES.map((f) => (
            <button key={f.id} type="button" aria-pressed={picked.includes(f.id)} className={chip(picked.includes(f.id))} onClick={() => toggle(f.id)}>
              <span className="font-mono t-micro text-ink-3">{f.number}</span>{f.short_title}
            </button>
          ))}
          <span className="t-micro text-ink-4">{forcesLoading ? 'reading the feed and archive…' : 'a party to a deal, or named in a headline tagged to the force'}</span>
        </div>
      </div>

      <div className="flex items-start gap-2">
        <span className={`${label} pt-1.5`}>Financials</span>
        <div className={row}>
          <button type="button" aria-pressed={params.fresh === 'stale'} className={chip(params.fresh === 'stale')} onClick={() => set({ fresh: params.fresh === 'stale' ? '' : 'stale' })}>
            Needs refresh <span className="font-mono t-micro text-ink-3">{staleCount}</span>
          </button>
          <span className="t-micro text-ink-4">
            {financials.state === 'ok'
              ? `SEC filers refreshed daily${financials.updatedAt ? ` · last change ${String(financials.updatedAt).slice(0, 10)}` : ''}; hand-entered figures are flagged once a newer result is due`
              : financials.state === 'loading' ? 'reading filings…' : 'filings unavailable — hand-entered figures only'}
          </span>
        </div>
      </div>
    </div>
  )
}
