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

const KEYS = ['q', 'type', 'tier', 'ownership', 'parent', 'verify']
/** How each facet reads in an exported document — "type=label" means nothing to someone opening the file. */
const FILTER_LABELS = {
  q: { label: 'Search' },
  type: { label: 'Type', format: (v) => ENTITY_TYPES[v]?.label || v },
  tier: { label: 'Tier', format: (v) => v.toUpperCase() },
  ownership: { label: 'Ownership' },
  parent: { label: 'Parent' },
  verify: { label: 'Flagged to verify', format: () => 'yes' },
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
  const rows = useMemo(() => filterEntities(params), [sp]) // eslint-disable-line react-hooks/exhaustive-deps

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
      <EntityTable rows={rows} grouped={!params.type} />
      <PageExport build={() => buildPageDoc({
        slug: 'entities',
        title: 'Entities',
        eyebrow: 'Structure · who owns what',
        lede: 'Every label, publisher, distributor, PRO, DSP, promoter, catalog fund, sponsor and registry on the canvas, as this view filtered them.',
        filters: describeFilters(params, FILTER_LABELS),
        sort: params.type ? 'Name, within the selected type' : 'Grouped by type, then name',
        stats: [{ label: 'In this view', value: String(rows.length) }, { label: 'On record', value: String(COUNTS.total) }, { label: 'Publicly listed', value: String(rows.filter((e) => e.ownership === 'public').length) }, { label: 'Flagged to verify', value: String(rows.filter((e) => e.verify).length) }],
        columns: ['Entity', 'Type', 'Tier', 'Ownership', 'HQ', 'Parent', 'Headline'],
        rows: rows.map((e) => [e.name, ENTITY_TYPES[e.type]?.label || e.type, e.tier || '', e.ownership || '', e.hq || '', e.parentId || '', headline(e)]),
        total: COUNTS.total,
        notes: rows.some((e) => e.verify) ? ['Rows flagged to verify carry facts from the source brief that are not yet sourced. They are marked in the app and should not be quoted without checking.'] : [],
      })} />
    </>
  )
}
