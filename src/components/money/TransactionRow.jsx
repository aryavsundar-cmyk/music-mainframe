import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { Tag, Num, Bar } from '../primitives/index.js'
import { TX_TYPES, ASSETS, partyName } from '../../data/transactions.js'
import { formatDate } from '../../utils/format.js'
import { AbsStructure } from './AbsStructure.jsx'
import { ForceChips } from '../forces/ForceChip.jsx'
import { WhyThisMatters } from '../forces/WhyThisMatters.jsx'
import { classifyDeal } from '../../utils/forces.js'

const ASSET_TONE = { recording: 'recording', publishing: 'publishing', both: 'accent', equity: 'neutral', 'n/a': 'neutral' }

function Party({ p }) {
  return p.entityId
    ? <Link to={`/entities/${p.entityId}`} className="text-secondary no-underline hover:underline">{partyName(p)}</Link>
    : <span className="text-ink-2">{p.name}<span className="t-micro text-ink-4 ml-1">{p.kind}</span></span>
}

/**
 * TransactionRow — one deal, expandable. Used by /deals, /pe/:id, /entities/:id, /catalogs.
 * `dense` hides the type tag column (when the list is already filtered by type).
 *
 * `scale` is the largest value in the list this row is part of, so the bar under the figure says how big this deal
 * is against the others on screen. `TransactionList` works it out, and only when one currency covers the list —
 * without that, the bar would rank euros against dollars with nothing on screen to give it away.
 */
export function TransactionRow({ t, dense = false, defaultOpen = false, scale = 0 }) {
  const [open, setOpen] = useState(defaultOpen)
  const tt = TX_TYPES[t.type]
  const tag = classifyDeal(t)
  return (
    <div id={t.id} className="border-b border-line-1 scroll-mt-24">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full text-left grid grid-cols-[92px_minmax(0,1fr)_auto] gap-4 items-start py-3 bg-transparent border-0 cursor-pointer px-0 hover:bg-ground-1 transition-colors duration-100 -mx-2 px-2 rounded-md">
        <div className="t-data text-ink-3 pt-0.5">{formatDate(t.date)}</div>
        <div className="min-w-0">
          <div className="t-body text-ink-1">{t.title}</div>
          <div className="t-small text-ink-3 mt-0.5 flex flex-wrap gap-x-1.5 gap-y-0.5 items-center">
            {t.acquirers.map((p, i) => <span key={i}>{i > 0 && ', '}<Party p={p} /></span>)}
            {t.acquirers.length > 0 && t.sellers.length > 0 && <span className="text-ink-4">←</span>}
            {t.sellers.map((p, i) => <span key={i}>{i > 0 && ', '}<Party p={p} /></span>)}
            {t.status !== 'closed' && <Tag tone="neutral">{t.status}</Tag>}
            {t.verify && <Tag tone="danger">verify</Tag>}
          </div>
          <div className="mt-1.5"><ForceChips tag={tag} /></div>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center justify-end gap-2">
            <Num kind="money" value={t.value} className="t-data" />
            <ChevronDown size={14} className={`text-ink-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          </div>
          {scale > 0 && t.value > 0 && (
            <Bar share={t.value / scale} height="h-1" tone={ASSET_TONE[t.asset] === 'recording' ? 'recording' : ASSET_TONE[t.asset] === 'publishing' ? 'publishing' : 'accent'}
              className="mt-1 ml-auto w-[88px]" />
          )}
          <div className="mt-1 flex justify-end gap-1">
            {!dense && <Tag tone={tt?.tone || 'neutral'}>{tt?.label || t.type}</Tag>}
            <Tag tone={ASSET_TONE[t.asset] || 'neutral'}>{ASSETS[t.asset] || t.asset}</Tag>
          </div>
        </div>
      </button>
      {open && (
        <div className="pb-4 pl-[108px] pr-2 space-y-3">
          {t.valueNote && <div className="t-small text-ink-3 font-mono">{t.valueNote}</div>}
          {t.summary && <p className="t-body text-ink-2 m-0">{t.summary}</p>}
          {t.abs && <AbsStructure abs={t.abs} value={t.value} />}
          <WhyThisMatters tag={tag} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 t-micro">
            {t.sources.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="text-ink-3 no-underline hover:text-accent inline-flex items-center gap-1">{s.label} <ExternalLink size={10} aria-hidden="true" /></a>
            ))}
            <span className="text-ink-4">as of {t.asOf}</span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * A list of deals, each carrying a bar scaled to the largest DISCLOSED value in the list.
 *
 * The scale is dropped the moment more than one currency is present: a bar has no axis, so a €500M deal drawn
 * against a $2B maximum would read as a quarter of the biggest deal rather than as a figure in another currency.
 * Terminated deals are excluded from the maximum for the same reason the totals exclude them — the number was never
 * paid, and letting it set the scale would shrink every deal that was.
 */
export function TransactionList({ items, dense = false, empty = 'No transactions match.' }) {
  if (items.length === 0) return <div className="py-12 text-center t-body text-ink-3">{empty}</div>
  const priced = items.filter((t) => t.value > 0 && t.status !== 'terminated')
  const oneCurrency = new Set(priced.map((t) => t.currency || 'USD')).size <= 1
  const scale = oneCurrency && priced.length > 1 ? Math.max(...priced.map((t) => t.value)) : 0
  return <div className="border-t border-line-1">{items.map((t) => <TransactionRow key={t.id} t={t} dense={dense} scale={scale} />)}</div>
}
