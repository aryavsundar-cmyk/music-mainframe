import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader, Stat } from '../components/primitives/index.js'
import { Facets } from '../components/entities/Facets.jsx'
import { EntityTable } from '../components/entities/EntityTable.jsx'
import { filterEntities, COUNTS, TYPE_ORDER, headlineMetric } from '../data/entities.js'
import { ENTITY_TYPES } from '../data/entities/_schema.js'
import { PageExport } from '../components/export/PageExport.jsx'
import { buildPageDoc, describeFilters } from '../utils/pageDocs.js'
import { format, currencySymbol } from '../utils/format.js'
import { useForces } from '../hooks/useForces.js'
import { useFinancials } from '../hooks/useFinancials.js'
import { currentRevenue, freshnessOf } from '../utils/freshness.js'
import { exposureIndex } from '../utils/forces.js'
import { FORCES, FORCE_BY_ID } from '../data/forces.js'

const KEYS = ['q', 'type', 'tier', 'ownership', 'parent', 'verify', 'force', 'fresh']
const forceChip = (a) => ['inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 t-small cursor-pointer select-none transition-colors duration-100',
  a ? 'bg-ground-4 border-line-3 text-ink-1' : 'bg-transparent border-line-1 text-ink-2 hover:bg-ground-2 hover:text-ink-1'].join(' ')
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

  return (
    <>
      <PageHeader
        eyebrow="Structure · who owns what" tone="secondary"
        title="Entities"
        lede="Every label, publisher, distributor, PRO, DSP, promoter, catalog fund, sponsor, and registry on the canvas — one flat table. Type is the primary bucket; roles carry the rest."
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Entities" kind="count" value={COUNTS.total} opts={{ full: true }} />
        <Stat label="Types" kind="count" value={TYPE_ORDER.length} opts={{ full: true }} />
        <Stat label="Publicly listed" kind="count" value={COUNTS.public} opts={{ full: true }} />
        <Stat label="Flagged to verify" kind="count" value={COUNTS.verify} opts={{ full: true }} hint="facts from the brief not yet sourced" />
      </div>
      <Facets params={params} set={set} resultCount={rows.length} />
      <div className="flex flex-wrap items-center gap-1.5 -mt-2 mb-6">
        <span className="t-micro text-ink-4 mr-1">Exposed to</span>
        {FORCES.map((f) => (
          <button key={f.id} type="button" aria-pressed={picked.includes(f.id)} className={forceChip(picked.includes(f.id))} onClick={() => toggle(f.id)}>
            <span className="font-mono t-micro text-ink-3">{f.number}</span>{f.short_title}
          </button>
        ))}
        <span className="t-micro text-ink-4 ml-1">{loading ? 'reading the feed and archive…' : 'a party to a deal, or named in a headline, tagged to the force'}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 -mt-3 mb-6">
        <span className="t-micro text-ink-4 mr-1">Financials</span>
        <button type="button" aria-pressed={params.fresh === 'stale'} className={forceChip(params.fresh === 'stale')} onClick={() => set({ fresh: params.fresh === 'stale' ? '' : 'stale' })}>Needs refresh <span className="font-mono t-micro text-ink-3">{staleCount}</span></button>
        <span className="t-micro text-ink-4 ml-1">{financials.state === 'ok' ? `SEC filers refreshed daily${financials.updatedAt ? ` · last change ${financials.updatedAt.slice(0, 10)}` : ''}; hand-entered figures flagged once a newer result is due` : financials.state === 'loading' ? 'reading filings…' : 'filings unavailable — hand-entered figures only'}</span>
      </div>
      <EntityTable rows={rows} grouped={!params.type} financials={financials.companies} />
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
