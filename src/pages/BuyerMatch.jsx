import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { PageHeader, Card, Tag } from '../components/primitives/index.js'
import { ExportBar } from '../components/lab/LabUi.jsx'
import { Field, selectFull } from '../components/prospecting/ProspectUi.jsx'
import { BUYER_KINDS, GOALS, buyerNarrative, matchBuyers } from '../utils/buyerMatch.js'
import { buildBuyerShortlist } from '../utils/marketDocs.js'
import { marketStats, scanCatalogs } from '../utils/catalogScan.js'
import { ASSETS } from '../data/transactions.js'
import { fmtM } from '../utils/valuation.js'
import { useUrlFilters } from '../hooks/useUrlFilters.js'

const money = (v) => (!v ? '—' : v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : fmtM(v, 0))
const BANDS = { strong: { label: 'Strong fit', tone: 'accent' }, possible: { label: 'Possible', tone: 'secondary' }, weak: { label: 'Weak', tone: 'neutral' } }
const REGIONS = ['Global', 'North America', 'Europe', 'United Kingdom', 'Asia', 'Latin America']

export default function BuyerMatch() {
  const { params, set } = useUrlFilters(['asset', 'size', 'genre', 'region', 'goal'])
  const brief = { asset: params.asset, size: params.size, genre: params.genre, region: params.region, goal: params.goal }
  const matches = useMemo(() => matchBuyers(brief, {}), [params.asset, params.size, params.genre, params.region, params.goal]) // eslint-disable-line react-hooks/exhaustive-deps
  const genres = useMemo(() => marketStats(scanCatalogs({})).genres, [])
  const strong = matches.filter((b) => b.match.band === 'strong')

  return (
    <>
      <PageHeader eyebrow="Market · sell side" title="Buyer match"
        lede="Who actually buys catalogs, what each one has bought, and which of them fit the asset you are selling. Profiles are built only from transactions on record — nothing is assumed about appetite that a deal does not evidence." />

      <Card pad="lg" className="mb-6">
        <div className="t-eyebrow text-ink-3 mb-3">The brief</div>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <Field label="Asset">
            <select value={params.asset} onChange={(e) => set({ asset: e.target.value })} className={selectFull} aria-label="Asset">
              <option value="">Any</option>
              {Object.entries(ASSETS).filter(([id]) => ['recording', 'publishing', 'both'].includes(id)).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </Field>
          <Field label="Indicative size" hint="what you think it is worth">
            <select value={params.size} onChange={(e) => set({ size: e.target.value })} className={selectFull} aria-label="Size">
              <option value="">Any</option>
              {[10e6, 50e6, 150e6, 400e6, 1e9, 3e9].map((v) => <option key={v} value={v}>{money(v)}</option>)}
            </select>
          </Field>
          <Field label="Genre" hint="from the sourced text">
            <select value={params.genre} onChange={(e) => set({ genre: e.target.value })} className={selectFull} aria-label="Genre">
              <option value="">Any</option>
              {genres.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Region">
            <select value={params.region} onChange={(e) => set({ region: e.target.value })} className={selectFull} aria-label="Region">
              <option value="">Any</option>
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="What the seller wants">
            <select value={params.goal} onChange={(e) => set({ goal: e.target.value })} className={selectFull} aria-label="Seller objective">
              <option value="">Not specified</option>
              {Object.entries(GOALS).map(([id, g]) => <option key={id} value={id}>{g.label}</option>)}
            </select>
          </Field>
        </div>
        {params.goal && <p className="t-small text-ink-2 m-0 mt-3">{GOALS[params.goal].note}</p>}
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[['Buyers on record', matches.length], ['Strong fits', strong.length], ['Bought in the last year', matches.filter((b) => b.lastMonths != null && b.lastMonths <= 12).length], ['Finance with securitisation', matches.filter((b) => b.usesAbs).length]].map(([label, value]) => (
          <Card key={label} pad="md"><div className="t-micro uppercase tracking-[0.08em] text-ink-3">{label}</div><div className="t-stat text-ink-1">{value}</div></Card>
        ))}
      </div>

      <div className="space-y-2 mb-6">
        {matches.slice(0, 24).map((b) => <BuyerRow key={b.id} buyer={b} />)}
      </div>

      <ExportBar title="Export the shortlist" build={() => buildBuyerShortlist(matches.slice(0, 15), brief)} />
      <p className="t-micro text-ink-4 mt-4">A match score says a buyer has done deals like this one, not that they are interested. Approach is still a conversation.</p>
    </>
  )
}

function BuyerRow({ buyer }) {
  const [open, setOpen] = useState(false)
  const b = buyer
  return (
    <Card pad="md">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full text-left bg-transparent border-0 cursor-pointer px-0 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="t-body text-ink-1">{b.name}</span>
            <Tag tone={BANDS[b.match.band].tone}>{BANDS[b.match.band].label}</Tag>
            <span className="t-micro text-ink-3">{BUYER_KINDS[b.kind]}</span>
          </span>
          <span className="block t-small text-ink-2 mt-1">{buyerNarrative(b)}</span>
        </span>
        <span className="flex items-center gap-3 shrink-0">
          <span className="font-mono tabular t-stat text-ink-1">{b.match.score}</span>
          <ChevronDown size={16} className={`text-ink-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <div className="mt-3 pt-3 border-t border-line-1 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <div className="t-eyebrow text-ink-3 mb-2">Why it matches</div>
            <ul className="m-0 pl-4 t-small text-ink-2 space-y-1">{b.match.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            <Link to={`/prospecting/${b.id}`} className="t-small text-accent no-underline inline-flex items-center gap-1 mt-3">Account page <ArrowUpRight size={12} aria-hidden="true" /></Link>
          </div>
          <div>
            <div className="t-eyebrow text-ink-3 mb-2">What they have bought</div>
            {b.deals.length ? (
              <div className="space-y-1.5">
                {b.deals.slice(0, 5).map((d) => (
                  <div key={d.id} className="flex items-baseline gap-2">
                    <span className="t-micro font-mono text-ink-4 shrink-0 w-20">{d.date}</span>
                    <span className="t-small text-ink-2 min-w-0">{d.title}<span className="text-money font-mono ml-2">{money(d.value)}</span></span>
                  </div>
                ))}
              </div>
            ) : <p className="t-small text-ink-3 m-0">No acquisitions on record.</p>}
            {b.partners.length > 0 && <p className="t-micro text-ink-3 mt-2 mb-0">Co-invests with: {b.partners.slice(0, 4).join(' · ')}</p>}
          </div>
        </div>
      )}
    </Card>
  )
}
