import { useNavigate, Link } from 'react-router-dom'
import { Tag, Num, DataTable, Th, EmptyState, EmptyAction, Sparkline } from '../primitives/index.js'
import { ENTITY_TYPES, LENS_TONE, OWNERSHIP, getEntity, headlineMetric } from '../../data/entities.js'
import { format } from '../../utils/format.js'
import { currentRevenue, freshnessOf } from '../../utils/freshness.js'
import { revenueTrend } from '../../utils/financialConcepts.js'
import { BANDS } from '../../utils/researchQueue.js'

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

const TD = 'py-2.5 px-3 border-b border-line-1 align-top'

/**
 * How a figure's status reads at a glance. The words stayed — a dot alone is colour-only, and this table is read by
 * people who need to know a number is stale before they quote it — but the dot is what a skimming eye finds, and it
 * puts the four verdicts in one column of the row instead of three different phrases in small text.
 */
const STATUS = {
  due: { dot: 'bg-danger', text: 'text-danger', label: 'due for refresh' },
  pending: { dot: 'bg-accent', text: 'text-accent', label: 'newer report filed' },
  final: { dot: 'bg-ink-4', text: 'text-ink-4', label: 'last disclosed' },
  current: { dot: 'bg-ink-4', text: 'text-ink-4', label: '' },
}

/** The trend a sparkline draws, said in words for anyone who cannot see the line. */
function trendLabel(trend, currency) {
  const { points } = trend
  const first = points[0]
  const last = points[points.length - 1]
  const money = (v) => format.usd(v, currency)
  return `Reported revenue ${first.year} to ${last.year}: ${money(first.value)} to ${money(last.value)}, ${points.length} years on file.`
}

/**
 * What closing this gap would buy, in the column that has nothing else to say.
 *
 * For a company with no figure the Headline cell is a dash — so on the coverage views it carries the research
 * queue's reasons instead. The score is deliberately not shown: it is an internal ordering, and a number beside a
 * company name invites being read as a judgement about the company rather than about this app's own record.
 */
function WhyResearch({ row }) {
  if (!row) return <span className="t-data text-ink-4">—</span>
  const band = BANDS.find((b) => b.id === row.band)
  return (
    <div className="text-right">
      <div className="t-small text-ink-2">{band?.label}</div>
      <div className="t-micro text-ink-4 max-w-[18rem] ml-auto">
        Needs {row.wanted} · {row.reasons[0]?.text || 'no signal beyond being on the canvas'}
        {row.reasons.length > 1 && ` · +${row.reasons.length - 1} more`}
      </div>
    </div>
  )
}

/**
 * One company. The row used to be a fake button — tabIndex on a <tr>, Enter but no Space, no role, wrapping two
 * real links — so every row was three tab stops that announced as "row". The name link is the control now; the
 * row itself only follows the pointer.
 */
function Row({ e, fin, queueRow }) {
  const navigate = useNavigate()
  const parent = e.parentId ? getEntity(e.parentId) : null
  const hm = headline(e, fin)
  const t = ENTITY_TYPES[e.type]
  // Only SEC filers have a multi-year record in one currency; everyone else shows the figure alone.
  const trend = revenueTrend(fin)
  const status = STATUS[hm?.f?.status]
  return (
    <tr className="group cursor-pointer transition-colors duration-100 hover:bg-ground-2" onClick={() => navigate(`/entities/${e.id}`)}>
      <td className={TD}>
        <div className="flex items-center gap-2">
          <Link to={`/entities/${e.id}`} className="t-body text-ink-1 no-underline group-hover:underline" onClick={(ev) => ev.stopPropagation()}>{e.name}</Link>
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
      <td className={`${TD} text-right ${queueRow ? '' : 'whitespace-nowrap'}`}>
        {queueRow ? <WhyResearch row={queueRow} /> : hm
          ? <>
              <div className="flex items-center justify-end gap-2">
                {trend && <Sparkline points={trend.points} label={trendLabel(trend, trend.currency)} className="text-ink-3" />}
                <Num kind={hm.kind} value={hm.value} opts={hm.currency ? { code: hm.currency } : undefined} className="t-data" />
              </div>
              <div className="t-micro text-ink-4">{hm.label}</div>
              {status?.label && (
                <div className={`t-micro ${status.text} inline-flex items-center gap-1.5`} title={hm.f.reason}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} aria-hidden="true" />{status.label}
                </div>
              )}
            </>
          : <span className="t-data text-ink-4">—</span>}
      </td>
    </tr>
  )
}

/** Dense bordered table. Groups by type (with a group row) when `grouped`. */
export function EntityTable({ rows, grouped = true, financials = {}, onClear, queue = null }) {
  if (rows.length === 0) {
    return <EmptyState title="No company matches these filters." why="The table holds every company on the canvas; the filters have narrowed it to none." action={onClear && <EmptyAction onClick={onClear}>Clear the filters</EmptyAction>} />
  }
  const groups = grouped
    ? Object.entries(rows.reduce((acc, e) => ((acc[e.type] ||= []).push(e), acc), {}))
    : [['all', rows]]
  return (
    <DataTable minWidth={760} maxHeight={rows.length > 24 ? 'calc(100vh - 14rem)' : undefined}
      caption={queue
        ? 'Companies whose figures are not on record, ordered by what answering them would buy.'
        : 'Every company on the canvas, with its type, tier, ownership, home and headline figure.'}>
        <thead>
          <tr>
            <Th>Entity</Th><Th>Type</Th><Th>Tier</Th><Th>Ownership</Th>
            <Th>HQ</Th><Th>Parent</Th><Th align="right">{queue ? 'Why answer this' : 'Headline'}</Th>
          </tr>
        </thead>
        <tbody>
          {groups.map(([type, list]) => (
            <GroupRows key={type} type={type} list={list} showHeader={grouped && groups.length > 1} financials={financials} queue={queue} />
          ))}
        </tbody>
    </DataTable>
  )
}

function GroupRows({ type, list, showHeader, financials, queue }) {
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
      {list.map((e) => <Row key={e.id} e={e} fin={financials[e.id]} queueRow={queue?.get(e.id)} />)}
    </>
  )
}
