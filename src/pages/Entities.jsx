import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { Network } from 'lucide-react'
import { PageHeader, FilterBar, KeyFigures } from '../components/primitives/index.js'
import { FacetControls } from '../components/entities/Facets.jsx'
import { EntityTable } from '../components/entities/EntityTable.jsx'
import { filterEntities, COUNTS, TYPE_ORDER, headlineMetric, getEntity } from '../data/entities.js'
import { ENTITY_TYPES, OWNERSHIP } from '../data/entities/_schema.js'
import { PageExport } from '../components/export/PageExport.jsx'
import { buildPageDoc, describeFilters } from '../utils/pageDocs.js'
import { format, currencySymbol } from '../utils/format.js'
import { useForces } from '../hooks/useForces.js'
import { useFinancials } from '../hooks/useFinancials.js'
import { currentRevenue, freshnessOf } from '../utils/freshness.js'
import { exposureIndex } from '../utils/forces.js'
import { FORCE_BY_ID } from '../data/forces.js'

const KEYS = ['q', 'type', 'tier', 'ownership', 'parent', 'verify', 'force', 'fresh']
/** How each facet reads in an exported document — "type=label" means nothing to someone opening the file. */
const FILTER_LABELS = {
  q: { label: 'Search' },
  type: { label: 'Type', format: (v) => ENTITY_TYPES[v]?.label || v },
  tier: { label: 'Tier', format: (v) => v.toUpperCase() },
  ownership: { label: 'Ownership' },
  parent: { label: 'Parent' },
  verify: { label: 'Flagged to verify', format: () => 'yes' },
  fresh: { label: 'Financials', format: (v) => ({ due: 'due for refresh', pending: 'newer report filed', stale: 'due or pending' }[v] || v) },
  force: { label: 'Exposed to', format: (v) => v.split(',').map((id) => FORCE_BY_ID[id]?.short_title || id).join(' or ') },
}
const headline = (e) => {
  const m = headlineMetric(e)
  if (!m) return ''
  const value = m.kind === 'money' ? format.money(m.value, { currency: currencySymbol(m.currency) }) : format.count(m.value)
  return `${value} ${m.label}`
}

export default function Entities() {
  const [sp, setSp] = useSearchParams()
  const params = Object.fromEntries(KEYS.map((k) => [k, sp.get(k) || '']))
  const set = (patch) => {
    const next = new URLSearchParams(sp)
    for (const [k, v] of Object.entries(patch)) v ? next.set(k, v) : next.delete(k)
    setSp(next, { replace: true })
  }
  const listed = useMemo(() => filterEntities(params), [sp]) // eslint-disable-line react-hooks/exhaustive-deps
  const { tagged, loading } = useForces()
  const exposed = useMemo(() => exposureIndex(tagged), [tagged])
  const picked = String(params.force || '').split(',').filter(Boolean)
  // OR across the chosen forces: "exposed to AI rights or Superfan". Exposure means a party to a deal or named in
  // a headline tagged to the force — never a passing mention.
  const financials = useFinancials()
  const fresh = (e) => freshnessOf(e, financials.companies[e.id]).status
  const byForce = picked.length ? listed.filter((e) => picked.some((f) => exposed.get(e.id)?.has(f))) : listed
  // "Needs refresh": figures past the date a newer result was due, or a newer report whose figures are pending.
  const rows = params.fresh ? byForce.filter((e) => (params.fresh === 'stale' ? ['due', 'pending'].includes(fresh(e)) : fresh(e) === params.fresh)) : byForce
  const staleCount = listed.filter((e) => ['due', 'pending'].includes(fresh(e))).length
  const forcesOf = (id) => [...(exposed.get(id) || [])].map((f) => FORCE_BY_ID[f]).sort((a, b) => a.number - b.number)
  const toggle = (id) => { const s = new Set(picked); if (s.has(id)) s.delete(id); else s.add(id); set({ force: [...s].join(',') }) }
  // What is on, in the reader's words, each one removable: a filtered table must never look like the whole table.
  const activeFilters = [
    params.q && { key: 'q', label: `“${params.q}”`, onRemove: () => set({ q: '' }) },
    params.type && { key: 'type', label: ENTITY_TYPES[params.type]?.label || params.type, onRemove: () => set({ type: '' }) },
    params.tier && { key: 'tier', label: `Tier ${params.tier}`, onRemove: () => set({ tier: '' }) },
    params.ownership && { key: 'ownership', label: OWNERSHIP[params.ownership] || params.ownership, onRemove: () => set({ ownership: '' }) },
    params.parent && { key: 'parent', label: `Parent: ${getEntity(params.parent)?.short || params.parent}`, onRemove: () => set({ parent: '' }) },
    params.verify && { key: 'verify', label: 'Flagged to verify', onRemove: () => set({ verify: '' }) },
    params.fresh && { key: 'fresh', label: 'Needs refresh', onRemove: () => set({ fresh: '' }) },
    ...picked.map((f) => ({ key: `force-${f}`, label: `Exposed to ${FORCE_BY_ID[f]?.short_title || f}`, onRemove: () => toggle(f) })),
  ].filter(Boolean)
  const clearAll = () => set({ q: '', type: '', tier: '', ownership: '', parent: '', verify: '', fresh: '', force: '' })

  return (
    <>
      <PageHeader
        eyebrow="Structure · who owns what" tone="secondary"
        title="Entities"
        answer={<KeyFigures items={[
          { value: format.count(COUNTS.total, { full: true }), label: 'companies on the canvas' },
          { value: format.count(TYPE_ORDER.length), label: 'types' },
          { value: format.count(COUNTS.public, { full: true }), label: 'publicly listed', to: '/entities?ownership=public' },
          staleCount ? { value: format.count(staleCount, { full: true }), label: 'need a refresh', to: '/entities?fresh=stale' } : null,
          COUNTS.verify ? { value: format.count(COUNTS.verify, { full: true }), label: 'flagged to verify', to: '/entities?verify=1' } : null,
        ]} />}
        lede="Every label, publisher, distributor, PRO, DSP, promoter, catalog fund, sponsor and registry on the canvas. Type is the primary bucket; roles carry the rest."
        actions={<Link to="/entities/map" className="inline-flex items-center gap-1.5 t-small text-ink-2 no-underline hover:text-ink-1"><Network size={14} aria-hidden="true" />Map view</Link>}
      />
      <FilterBar
        search={{ value: params.q, onChange: (v) => set({ q: v }), placeholder: 'Search name, HQ, ticker, summary' }}
        active={activeFilters}
        onClear={clearAll}
        count={{ shown: rows.length, total: COUNTS.total, noun: 'companies' }}
      >
        <FacetControls params={params} set={set} picked={picked} toggle={toggle} staleCount={staleCount} forcesLoading={loading} financials={financials} />
      </FilterBar>

      <EntityTable rows={rows} grouped={!params.type} financials={financials.companies} onClear={clearAll} />
      <PageExport build={() => buildPageDoc({
        slug: 'entities',
        title: 'Entities',
        eyebrow: 'Structure · who owns what',
        lede: 'Every label, publisher, distributor, PRO, DSP, promoter, catalog fund, sponsor and registry on the canvas, as this view filtered them.',
        filters: describeFilters(params, FILTER_LABELS),
        sort: params.type ? 'Name, within the selected type' : 'Grouped by type, then name',
        stats: [{ label: 'In this view', value: String(rows.length) }, { label: 'On record', value: String(COUNTS.total) }, { label: 'Publicly listed', value: String(rows.filter((e) => e.ownership === 'public').length) }, { label: 'Flagged to verify', value: String(rows.filter((e) => e.verify).length) }],
        columns: ['Entity', 'Type', 'Tier', 'Ownership', 'HQ', 'Parent', 'Headline', 'Figure status', 'Forces (evidence)'],
        rows: rows.map((e) => { const r = currentRevenue(e, financials.companies[e.id]); const f = freshnessOf(e, financials.companies[e.id]); return [e.name, ENTITY_TYPES[e.type]?.label || e.type, e.tier || '', e.ownership || '', e.hq || '', e.parentId || '', r ? `${format.money(r.value, { currency: currencySymbol(r.currency) })} ${r.label}` : headline(e), f.status === 'none' ? '' : `${f.status}${f.dueSince ? ` since ${f.dueSince}` : ''}`, forcesOf(e.id).map((x) => `${x.number} ${x.short_title}`).join(' · ')] }),
        limits: ['force'],
        total: COUNTS.total,
        notes: rows.some((e) => e.verify) ? ['Rows flagged to verify carry facts from the source brief that are not yet sourced. They are marked in the app and should not be quoted without checking.'] : [],
      })} />
    </>
  )
}
