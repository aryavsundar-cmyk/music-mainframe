import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader, Stat } from '../components/primitives/index.js'
import { Facets } from '../components/entities/Facets.jsx'
import { EntityTable } from '../components/entities/EntityTable.jsx'
import { filterEntities, COUNTS, TYPE_ORDER } from '../data/entities.js'

const KEYS = ['q', 'type', 'tier', 'ownership', 'parent', 'verify']

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
    </>
  )
}
