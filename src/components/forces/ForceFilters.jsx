import { Chip } from '../primitives/index.js'
import { X } from 'lucide-react'
import { FORCES, DIRECTIONS, EXPOSURE_TYPES, RIGHTS_TYPES } from '../../data/forces.js'


const list = (v) => String(v || '').split(',').filter(Boolean)
const toggleIn = (v, x) => { const s = new Set(list(v)); if (s.has(x)) s.delete(x); else s.add(x); return [...s].join(',') }

function Facet({ label, keyName, options, params, set }) {
  const on = list(params[keyName])
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="t-micro text-ink-4 w-20 shrink-0">{label}</span>
      {options.map(([value, text]) => (
        <Chip pressed={on.includes(value)} key={value} onClick={() => set({ [keyName]: toggleIn(params[keyName], value) })}>{text}</Chip>
      ))}
    </div>
  )
}

/** The spec's multi-select facets: force, exposure type, impact direction, geography, rights type — plus reach. */
export function ForceFilters({ params, set, geographies }) {
  const any = ['force', 'exposure', 'dir', 'geo', 'rights'].some((k) => params[k])
  return (
    <div className="rounded-md border border-line-1 p-3 space-y-2 mb-6">
      <div className="flex items-center justify-between gap-3">
        <span className="t-eyebrow text-ink-3">Five forces filters · several values in a row match any of them</span>
        {any && <button type="button" className="inline-flex items-center gap-1 t-micro text-ink-3 bg-transparent border-0 cursor-pointer hover:text-ink-1" onClick={() => set({ force: '', reach: '', exposure: '', dir: '', geo: '', rights: '' })}><X size={12} aria-hidden="true" />Clear</button>}
      </div>
      <Facet label="Force" keyName="force" params={params} set={set} options={FORCES.map((f) => [f.id, `${f.number} ${f.short_title}`])} />
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="t-micro text-ink-4 w-20 shrink-0">Reach</span>
        <Chip pressed={params.reach !== 'direct'} onClick={() => set({ reach: '' })}>Direct and adjacent</Chip>
        <Chip pressed={params.reach === 'direct'} onClick={() => set({ reach: 'direct' })}>Direct only</Chip>
      </div>
      <Facet label="Exposure" keyName="exposure" params={params} set={set} options={Object.entries(EXPOSURE_TYPES)} />
      <Facet label="Direction" keyName="dir" params={params} set={set} options={Object.entries(DIRECTIONS)} />
      <Facet label="Geography" keyName="geo" params={params} set={set} options={geographies.map((g) => [g, g])} />
      <Facet label="Rights" keyName="rights" params={params} set={set} options={Object.entries(RIGHTS_TYPES)} />
    </div>
  )
}
