import { useNavigate, Link } from 'react-router-dom'
import { Tag, Num } from '../primitives/index.js'
import { ENTITY_TYPES, LENS_TONE, OWNERSHIP, getEntity, headlineMetric } from '../../data/entities.js'
import { currencySymbol } from '../../utils/format.js'
import { currentRevenue, freshnessOf } from '../../utils/freshness.js'

/**
 * The headline figure: the freshest revenue (a filing beats a hand-entered number for the same or an earlier
 * period), or the entity's other headline metric. A figure that is due for replacement says so under it.
 */
function headline(e, fin) {
  const r = currentRevenue(e, fin)
  if (r) return { kind: 'money', value: r.value, currency: r.currency, label: r.label.replace('Revenue, year to', 'Revenue to'), f: freshnessOf(e, fin) }
  const hm = headlineMetric(e)
  return hm ? { ...hm, f: null } : null
}

const TH = 'text-left t-micro uppercase tracking-[0.08em] text-ink-3 font-medium py-2 px-3 border-b border-line-2 whitespace-nowrap'
const TD = 'py-2.5 px-3 border-b border-line-1 align-top'

function Row({ e, fin }) {
  const navigate = useNavigate()
  const parent = e.parentId ? getEntity(e.parentId) : null
  const hm = headline(e, fin)
  const t = ENTITY_TYPES[e.type]
  return (
    <tr
      className="cursor-pointer transition-colors duration-100 hover:bg-ground-2"
      onClick={() => navigate(`/entities/${e.id}`)}
      onKeyDown={(ev) => { if (ev.key === 'Enter') navigate(`/entities/${e.id}`) }}
      tabIndex={0}
    >
      <td className={TD}>
        <div className="flex items-center gap-2">
          <Link to={`/entities/${e.id}`} className="t-body text-ink-1 no-underline hover:underline" onClick={(ev) => ev.stopPropagation()}>{e.name}</Link>
          {e.short && e.short !== e.name && <span className="t-micro font-mono text-ink-4">{e.short}</span>}
          {e.status !== 'active' && <Tag tone="neutral">{e.status}</Tag>}
          {e.verify && <Tag tone="danger">verify</Tag>}
        </div>
        <div className="t-small text-ink-3">{e.subtype}</div>
      </td>
      <td className={TD}><Tag tone={LENS_TONE[t.lens]}>{t.label}</Tag></td>
      <td className={`${TD} t-data text-ink-2`}>{e.tier}</td>
      <td className={`${TD} t-small text-ink-2 whitespace-nowrap`}>{OWNERSHIP[e.ownership] || e.ownership}{e.ticker && <div className="t-micro font-mono text-ink-4">{e.ticker}</div>}</td>
      <td className={`${TD} t-small text-ink-3`}>{e.hq || '—'}</td>
      <td className={`${TD} t-small`}>
        {parent
          ? <Link to={`/entities/${parent.id}`} className="text-secondary no-underline hover:underline" onClick={(ev) => ev.stopPropagation()}>{parent.short || parent.name}</Link>
          : <span className="text-ink-4">—</span>}
      </td>
      <td className={`${TD} text-right whitespace-nowrap`}>
        {hm
          ? <><Num kind={hm.kind} value={hm.value} opts={hm.currency ? { currency: currencySymbol(hm.currency) } : undefined} className="t-data" /><div className="t-micro text-ink-4">{hm.label}</div>
              {hm.f?.status === 'due' && <div className="t-micro text-danger" title={hm.f.reason}>due for refresh</div>}
              {hm.f?.status === 'pending' && <div className="t-micro text-accent" title={hm.f.reason}>newer report filed</div>}
              {hm.f?.status === 'final' && <div className="t-micro text-ink-4" title={hm.f.reason}>last disclosed</div>}</>
          : <span className="t-data text-ink-4">—</span>}
      </td>
    </tr>
  )
}

/** Dense bordered table. Groups by type (with a group row) when `grouped`. */
export function EntityTable({ rows, grouped = true, financials = {} }) {
  if (rows.length === 0) {
    return <div className="py-16 text-center t-body text-ink-3">No entities match. Clear a facet or widen the search.</div>
  }
  const groups = grouped
    ? Object.entries(rows.reduce((acc, e) => ((acc[e.type] ||= []).push(e), acc), {}))
    : [['all', rows]]
  return (
    <div className="overflow-x-auto -mx-3">
      <table className="w-full border-collapse min-w-[760px]">
        <thead>
          <tr>
            <th className={TH}>Entity</th><th className={TH}>Type</th><th className={TH}>Tier</th><th className={TH}>Ownership</th>
            <th className={TH}>HQ</th><th className={TH}>Parent</th><th className={`${TH} text-right`}>Headline</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(([type, list]) => (
            <GroupRows key={type} type={type} list={list} showHeader={grouped && groups.length > 1} financials={financials} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GroupRows({ type, list, showHeader, financials }) {
  const t = ENTITY_TYPES[type]
  return (
    <>
      {showHeader && t && (
        <tr>
          <td colSpan={7} className="pt-6 pb-1.5 px-3">
            <div className="flex items-baseline gap-3">
              <span className={`t-eyebrow ${t.lens === 'money' ? 'text-accent' : t.lens === 'publishing' ? 'text-publishing' : t.lens === 'recording' ? 'text-recording' : 'text-ink-3'}`}>{t.label}</span>
              <span className="t-micro font-mono text-ink-4">{list.length}</span>
            </div>
          </td>
        </tr>
      )}
      {list.map((e) => <Row key={e.id} e={e} fin={financials[e.id]} />)}
    </>
  )
}
