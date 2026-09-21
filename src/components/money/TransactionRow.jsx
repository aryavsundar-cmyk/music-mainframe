import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { Tag, Num } from '../primitives/index.js'
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
 */
export function TransactionRow({ t, dense = false, defaultOpen = false }) {
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

export function TransactionList({ items, dense = false, empty = 'No transactions match.' }) {
  if (items.length === 0) return <div className="py-12 text-center t-body text-ink-3">{empty}</div>
  return <div className="border-t border-line-1">{items.map((t) => <TransactionRow key={t.id} t={t} dense={dense} />)}</div>
}
