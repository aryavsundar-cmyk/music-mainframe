import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, RotateCcw, Search, X } from 'lucide-react'
import { PageHeader, SectionHeader, Card, Tag, Button } from '../components/primitives/index.js'
import { ScoreBar, TierTag, selectClass } from '../components/prospecting/ProspectUi.jsx'
import { AccountHeader, OutreachComposer, RecordEditor, ScoreReasons, TriggerList } from '../components/prospecting/AccountParts.jsx'
import { ExportBar } from '../components/lab/LabUi.jsx'
import { buildTargetList } from '../utils/prospectDocs.js'
import { buildAccounts, coverage, triggerFeed, TRIGGER_KINDS, SEGMENTS, SEGMENT_BY_ID } from '../utils/prospect.js'
import { STATUSES, STATUS_LABEL, useProspectRecords } from '../hooks/useProspectRecords.js'
import { useEnrichment } from '../hooks/useEnrichment.js'
import { ConnectorStatus } from '../components/prospecting/ConnectorStatus.jsx'
import { LimitNote } from '../components/prospecting/LimitNote.jsx'
import { conversionBy, funnel, staleAccounts, OUTCOMES } from '../utils/outcomes.js'
import { useUrlFilters } from '../hooks/useUrlFilters.js'

const fmtDate = (d) => (d ? d : '—')

export default function Prospecting() {
  const { params, set, clear, any } = useUrlFilters(['view', 'side', 'segment', 'tier', 'status', 'kind', 'q', 'account'])
  const { records, update, logOutcome, removeOutcome, reset } = useProspectRecords()
  const { signals, filings, connectors, ready } = useEnrichment()
  const accounts = useMemo(() => buildAccounts({ records, signals, filings }), [records, signals, filings])
  const cov = useMemo(() => coverage(accounts, records), [accounts, records])
  const view = ['coverage', 'triggers', 'pipeline'].includes(params.view) ? params.view : 'targets'

  const filtered = accounts.filter((a) => {
    const r = records[a.id] || {}
    if (params.side && a.side !== params.side) return false
    if (params.segment && a.segment !== params.segment) return false
    if (params.tier && a.score.tier !== params.tier) return false
    if (params.status && (r.status || 'new') !== params.status) return false
    if (params.q && !`${a.name} ${a.short} ${a.type} ${a.region}`.toLowerCase().includes(params.q.toLowerCase())) return false
    return true
  })
  const selected = accounts.find((a) => a.id === params.account) || null

  return (
    <>
      <PageHeader eyebrow="Pipeline · coverage & prospecting" title="Prospecting"
        lede="Every account in the app scored on fit, timing and access, mapped to the buying role and the service line that fits, with LinkedIn and email drafts you can send yourself."
        actions={<div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Button size="sm" variant={view === 'targets' ? 'primary' : 'secondary'} onClick={() => set({ view: 'targets' })}>Targets</Button>
            <Button size="sm" variant={view === 'triggers' ? 'primary' : 'secondary'} onClick={() => set({ view: 'triggers' })}>Triggers</Button>
            <Button size="sm" variant={view === 'pipeline' ? 'primary' : 'secondary'} onClick={() => set({ view: 'pipeline' })}>Pipeline</Button>
            <Button size="sm" variant={view === 'coverage' ? 'primary' : 'secondary'} onClick={() => set({ view: 'coverage' })}>Coverage</Button>
          </div>
          <span className="t-micro text-ink-4">{!ready ? 'Loading enrichment…' : connectors.length ? `${connectors.filter((c) => c.live).length}/${connectors.length} connectors live` : 'Enrichment unreachable'}</span>
        </div>} />

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
        <Stat label="Accounts" value={cov.totals.accounts} />
        <Stat label="Tier A" value={cov.totals.A} tone="accent" />
        <Stat label="Tier B" value={cov.totals.B} tone="secondary" />
        <Stat label="Priority worked" value={`${cov.totals.worked}/${cov.totals.priority}`} hint="status beyond new" />
        <Stat label="With a live trigger" value={accounts.filter((a) => a.score.timing > 0).length} />
        <Stat label="Recorded relationships" value={Object.values(records).filter((r) => r.access && r.access !== 'none').length} />
      </div>

      {view === 'coverage' ? (
        <CoverageView cov={cov} onPick={(segment, tier) => set({ view: 'targets', segment, tier: tier || '', account: '' })} />
      ) : view === 'pipeline' ? (
        <PipelineView accounts={accounts} records={records} connectors={connectors} ready={ready} />
      ) : view === 'triggers' ? (
        <TriggersView accounts={accounts} params={params} set={set} records={records} update={update} />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-6 items-start">
          <div className="space-y-4 min-w-0">
            <Filters params={params} set={set} clear={clear} any={any} count={filtered.length} />
            <TargetTable accounts={filtered} records={records} selectedId={params.account} onSelect={(id) => set({ account: id === params.account ? '' : id })} onStatus={(id, status) => update(id, { status })} />
          </div>
          <div className="xl:sticky xl:top-6">
            {selected
              ? <AccountPanel account={selected} record={records[selected.id] || {}} update={update} logOutcome={logOutcome} removeOutcome={removeOutcome} onClose={() => set({ account: '' })} />
              : <Card pad="lg"><p className="t-body text-ink-3 m-0">Pick an account to see why it scores, what to lead with, and drafts for LinkedIn and email.</p></Card>}
          </div>
        </div>
      )}

      {view !== 'coverage' && (
        <div className="mt-6">
          <ExportBar title="Export the call sheet" build={() => buildTargetList(view === 'targets' ? filtered : accounts, records, { limit: 40, filterNote: any ? 'Filtered view' : 'Unfiltered, in score order' })} />
        </div>
      )}

      {view === 'targets' && (
        <div className="flex items-center justify-between gap-4 mt-8 pt-4 border-t border-line-1">
          <span className="t-micro text-ink-4">Status, relationship strength and notes are stored in this browser only. Nothing here is sent anywhere, and the module never contacts anyone for you.</span>
          <button type="button" onClick={() => { if (window.confirm('Clear every prospecting record in this browser?')) reset() }} className="t-small text-ink-3 hover:text-ink-1 bg-transparent border-0 cursor-pointer inline-flex items-center gap-1"><RotateCcw size={12} aria-hidden="true" />Clear records</button>
        </div>
      )}
    </>
  )
}

function Stat({ label, value, hint, tone = 'ink' }) {
  const cls = tone === 'accent' ? 'text-accent' : tone === 'secondary' ? 'text-secondary' : 'text-ink-1'
  return (
    <Card pad="md">
      <div className="t-micro uppercase tracking-[0.08em] text-ink-3">{label}</div>
      <div className={`t-stat ${cls}`}>{value}</div>
      {hint && <div className="t-micro text-ink-4">{hint}</div>}
    </Card>
  )
}

function Filters({ params, set, clear, any, count }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-4" aria-hidden="true" />
        <input value={params.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search accounts" aria-label="Search accounts"
          className="bg-ground-1 border border-line-2 rounded-md h-8 pl-8 pr-2 t-small text-ink-1 placeholder:text-ink-4 focus:border-accent outline-none w-56" />
      </div>
      <select value={params.side} onChange={(e) => set({ side: e.target.value })} className={`${selectClass} w-36`} aria-label="Side">
        <option value="">Both sides</option><option value="buy">Buy side</option><option value="sell">Sell side</option>
      </select>
      <select value={params.segment} onChange={(e) => set({ segment: e.target.value })} className={`${selectClass} w-56`} aria-label="Segment">
        <option value="">All segments</option>
        {SEGMENTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      <select value={params.tier} onChange={(e) => set({ tier: e.target.value })} className={`${selectClass} w-28`} aria-label="Tier">
        <option value="">All tiers</option><option value="A">Tier A</option><option value="B">Tier B</option><option value="C">Tier C</option>
      </select>
      <select value={params.status} onChange={(e) => set({ status: e.target.value })} className={`${selectClass} w-36`} aria-label="Filter by status">
        <option value="">Any status</option>
        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
      </select>
      <span className="t-small text-ink-3 font-mono tabular">{count}</span>
      {any && <button type="button" onClick={clear} className="t-small text-secondary bg-transparent border-0 cursor-pointer px-0">Clear</button>}
    </div>
  )
}

function CoverageView({ cov, onPick }) {
  return (
    <>
      <SectionHeader eyebrow="Coverage" title="Where the priority accounts are, and how many we have worked" />
      <Card pad="lg">
        <div className="overflow-x-auto -mx-2.5">
          <table className="w-full border-collapse" style={{ minWidth: 760 }}>
            <thead>
              <tr>
                {['Segment', 'Side', 'Accounts', 'Tier A', 'Tier B', 'Tier C', 'Priority worked'].map((h, i) => (
                  <th key={h} className={`t-micro uppercase tracking-[0.08em] text-ink-3 font-medium py-2 px-2.5 border-b border-line-2 whitespace-nowrap ${i > 1 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cov.rows.map((r) => (
                <tr key={r.id} className="hover:bg-ground-2">
                  <td className="py-2 px-2.5 border-b border-line-1"><button type="button" onClick={() => onPick(r.id, '')} className="t-small text-ink-1 bg-transparent border-0 cursor-pointer px-0 text-left hover:text-accent">{r.label}</button></td>
                  <td className="py-2 px-2.5 border-b border-line-1"><Tag tone={r.side === 'buy' ? 'accent' : 'secondary'}>{r.side}</Tag></td>
                  <td className="py-2 px-2.5 border-b border-line-1 text-right font-mono tabular t-data text-ink-3">{r.accounts}</td>
                  {['A', 'B', 'C'].map((t) => (
                    <td key={t} className="py-2 px-2.5 border-b border-line-1 text-right">
                      <button type="button" onClick={() => onPick(r.id, t)} disabled={!r.byTier[t]}
                        className={`font-mono tabular t-data bg-transparent border-0 px-0 ${r.byTier[t] ? 'cursor-pointer text-ink-1 hover:text-accent' : 'text-ink-4'}`}>{r.byTier[t]}</button>
                    </td>
                  ))}
                  <td className="py-2 px-2.5 border-b border-line-1 text-right">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-1.5 w-16 rounded-sm bg-ground-4 overflow-hidden"><span className="block h-full bg-accent" style={{ width: `${Math.round((r.coverage || 0) * 100)}%` }} /></span>
                      <span className="font-mono tabular t-data text-ink-2">{r.worked}/{r.priority}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="t-small text-ink-3 mt-4 mb-0">Priority means Tier A and B. A segment with priority accounts and nothing worked is the gap worth filling this week.</p>
      </Card>
    </>
  )
}

function TargetTable({ accounts, records, selectedId, onSelect, onStatus }) {
  return (
    <Card pad="md">
      <div className="overflow-x-auto -mx-2.5">
        <table className="w-full border-collapse" style={{ minWidth: 760 }}>
          <thead>
            <tr>
              {['Account', 'Segment', 'Tier', 'Score', 'Why now', 'Status'].map((h) => (
                <th key={h} className="text-left t-micro uppercase tracking-[0.08em] text-ink-3 font-medium py-2 px-2.5 border-b border-line-2 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accounts.slice(0, 120).map((a) => {
              const r = records[a.id] || {}
              return (
                <tr key={a.id} className={`cursor-pointer ${a.id === selectedId ? 'bg-ground-3' : 'hover:bg-ground-2'}`} onClick={() => onSelect(a.id)}>
                  <td className="py-2 px-2.5 border-b border-line-1">
                    <span className="t-small text-ink-1 block">{a.name}</span>
                    <span className="t-micro text-ink-4">{a.type} · {a.region}</span>
                  </td>
                  <td className="py-2 px-2.5 border-b border-line-1"><span className="t-micro text-ink-3">{SEGMENT_BY_ID[a.segment]?.label}</span></td>
                  <td className="py-2 px-2.5 border-b border-line-1"><TierTag tier={a.score.tier} /></td>
                  <td className="py-2 px-2.5 border-b border-line-1"><ScoreBar score={a.score} /></td>
                  <td className="py-2 px-2.5 border-b border-line-1">
                    <span className="t-micro text-ink-2 block max-w-[280px] truncate">{a.topTrigger ? a.topTrigger.label : 'No dated trigger'}</span>
                    <span className="t-micro text-ink-4 font-mono">{fmtDate(a.topTrigger?.date)}</span>
                  </td>
                  <td className="py-2 px-2.5 border-b border-line-1" onClick={(e) => e.stopPropagation()}>
                    <select value={r.status || 'new'} onChange={(e) => onStatus(a.id, e.target.value)} className={`${selectClass} w-32`} aria-label={`Status for ${a.name}`}>
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {accounts.length > 120 && <p className="t-micro text-ink-4 mt-3 mb-0">Showing the top 120 by score. Filter to narrow.</p>}
      {!accounts.length && <p className="t-body text-ink-3 m-0 py-6 text-center">No accounts match these filters.</p>}
    </Card>
  )
}

function AccountPanel({ account, record, update, logOutcome, removeOutcome, onClose }) {
  return (
    <Card pad="lg" className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <AccountHeader account={account}>
            <h3 className="t-h2 text-ink-1 m-0">{account.name}</h3>
            <p className="t-small text-ink-3 m-0">{account.hq} · {account.ownership}</p>
          </AccountHeader>
        </div>
        <button type="button" onClick={onClose} className="text-ink-4 hover:text-ink-1 bg-transparent border-0 cursor-pointer p-1 shrink-0" aria-label="Close panel"><X size={16} /></button>
      </div>

      <Link to={`/prospecting/${account.id}`} className="t-small text-accent no-underline inline-flex items-center gap-1">Full account page <ArrowUpRight size={12} aria-hidden="true" /></Link>

      <div><div className="t-eyebrow text-ink-3 mb-2">Why it scores</div><ScoreReasons account={account} /></div>
      <div><div className="t-eyebrow text-ink-3 mb-2">Triggers</div><TriggerList triggers={account.triggers} limit={5} /></div>

      <OutreachComposer account={account} compact />

      <div className="pt-4 border-t border-line-1"><RecordEditor account={account} record={record} update={update} logOutcome={logOutcome} removeOutcome={removeOutcome} /></div>
      <LimitNote ids={['match']} />
    </Card>
  )
}

/** The trigger feed: every dated reason to call, deadlines ahead first, then the most recent events. */
function TriggersView({ accounts, params, set, records, update }) {
  const feed = triggerFeed(accounts, { segment: params.segment, tier: params.tier, kind: params.kind, limit: 80 })
  const kinds = Object.entries(TRIGGER_KINDS).filter(([id]) => id !== 'signal')
  return (
    <>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <select value={params.kind} onChange={(e) => set({ kind: e.target.value })} className={`${selectClass} w-52`} aria-label="Trigger kind">
          <option value="">All trigger kinds</option>
          {kinds.map(([id, k]) => <option key={id} value={id}>{k.label}</option>)}
        </select>
        <select value={params.segment} onChange={(e) => set({ segment: e.target.value })} className={`${selectClass} w-56`} aria-label="Segment">
          <option value="">All segments</option>
          {SEGMENTS.map((sg) => <option key={sg.id} value={sg.id}>{sg.label}</option>)}
        </select>
        <select value={params.tier} onChange={(e) => set({ tier: e.target.value })} className={`${selectClass} w-28`} aria-label="Tier">
          <option value="">All tiers</option><option value="A">Tier A</option><option value="B">Tier B</option><option value="C">Tier C</option>
        </select>
        <span className="t-small text-ink-3 font-mono tabular">{feed.length}</span>
      </div>
      <Card pad="md">
        <div className="divide-y divide-line-1">
          {feed.map((t) => {
            const r = records[t.account.id] || {}
            return (
              <div key={`${t.account.id}-${t.id}`} className="py-2.5 grid grid-cols-1 md:grid-cols-[92px_minmax(0,1fr)_auto] gap-3 items-start">
                <div className="flex flex-col">
                  <span className="t-micro font-mono text-ink-2">{fmtDate(t.date)}</span>
                  <span className={`t-micro ${t.when === 'ahead' ? 'text-accent' : 'text-ink-4'}`}>{t.when === 'ahead' ? 'ahead' : `${t.monthsAway}mo ago`}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/prospecting/${t.account.id}`} className="t-small text-ink-1 no-underline hover:text-accent">{t.account.name}</Link>
                    <TierTag tier={t.account.score.tier} />
                    <Tag tone="neutral">{TRIGGER_KINDS[t.kind]?.label || t.kind}</Tag>
                  </div>
                  <div className="t-small text-ink-3 mt-0.5">{t.label}{t.sources?.[0]?.url && <a href={t.sources[0].url} target="_blank" rel="noreferrer" className="text-secondary no-underline ml-1.5 t-micro">source</a>}</div>
                </div>
                <select value={r.status || 'new'} onChange={(e) => update(t.account.id, { status: e.target.value })} className={`${selectClass} w-32`} aria-label={`Status for ${t.account.name}`}>
                  {STATUSES.map((st) => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}
                </select>
              </div>
            )
          })}
        </div>
        {!feed.length && <p className="t-body text-ink-3 m-0 py-6 text-center">No live triggers match these filters. A trigger past its decay window drops off the feed.</p>}
      </Card>
      <p className="t-micro text-ink-4 mt-3">Deadlines still ahead come first, then the most recent events. News signals move the timing score but are not listed here: they are not a dated event to open on.</p>
    </>
  )
}

/** Pipeline — what happened after the outreach, and what it says about where to spend next week. */
function PipelineView({ accounts, records, connectors, ready }) {
  const f = funnel(records)
  const bySegment = conversionBy(accounts, records, 'segment')
  const stale = staleAccounts(accounts, records)
  const pct = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`)
  const steps = [['Touched', f.touched], ['Contacted', f.contacted], ['Replied', f.replied], ['Meetings', f.meetings], ['Proposals', f.proposals], ['Won', f.won]]
  const max = Math.max(1, ...steps.map(([, v]) => v))
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,360px)] gap-6 items-start">
        <Card pad="lg">
          <div className="t-eyebrow text-ink-3 mb-1">Funnel</div>
          <h3 className="t-h2 text-ink-1 m-0 mb-4">What came back</h3>
          {f.touched === 0 ? (
            <p className="t-body text-ink-3 m-0">Nothing logged yet. Record what happened on an account — contacted, replied, meeting, proposal, won, lost — and this fills in. Outcomes also feed the score: engagement raises access, a recent loss cools timing, and "not now" parks an account until the date they gave you.</p>
          ) : (
            <>
              <div className="space-y-2">
                {steps.map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[110px_minmax(0,1fr)_44px] gap-3 items-center">
                    <span className="t-small text-ink-2">{label}</span>
                    <span className="h-5 rounded-sm bg-ground-4 overflow-hidden"><span className="block h-full bg-accent" style={{ width: `${(value / max) * 100}%` }} /></span>
                    <span className="font-mono tabular t-data text-ink-1 text-right">{value}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-4 mt-5">
                <Stat label="Reply rate" value={pct(f.replyRate)} />
                <Stat label="Meeting rate" value={pct(f.meetingRate)} />
                <Stat label="Win rate" value={pct(f.winRate)} hint="of proposals sent" />
              </div>
            </>
          )}
        </Card>
        <div className="space-y-4">
          <ConnectorStatus connectors={connectors} ready={ready} />
          <LimitNote ids={['match']} />
        </div>
      </div>

      {bySegment.length > 0 && (
        <Card pad="lg">
          <div className="t-eyebrow text-ink-3 mb-3">Where it is working</div>
          <div className="overflow-x-auto -mx-2.5">
            <table className="w-full border-collapse" style={{ minWidth: 560 }}>
              <thead><tr>{['Segment', 'Worked', 'Replied', 'Meetings', 'Won', 'Reply rate'].map((h, i) => <th key={h} className={`t-micro uppercase tracking-[0.08em] text-ink-3 font-medium py-2 px-2.5 border-b border-line-2 whitespace-nowrap ${i ? 'text-right' : 'text-left'}`}>{h}</th>)}</tr></thead>
              <tbody>
                {bySegment.map((g) => (
                  <tr key={g.key}>
                    <td className="py-2 px-2.5 border-b border-line-1 t-small text-ink-1">{SEGMENT_BY_ID[g.key]?.label || g.key}</td>
                    {[g.touched, g.replied, g.meetings, g.won].map((v, i) => <td key={i} className="py-2 px-2.5 border-b border-line-1 text-right font-mono tabular t-data text-ink-2">{v}</td>)}
                    <td className="py-2 px-2.5 border-b border-line-1 text-right font-mono tabular t-data text-ink-1">{pct(g.replyRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card pad="lg">
        <div className="t-eyebrow text-ink-3 mb-1">Gone quiet</div>
        <h3 className="t-h3 text-ink-1 m-0 mb-3">{stale.length} account{stale.length === 1 ? '' : 's'} with nothing for 90 days</h3>
        {stale.length === 0 ? <p className="t-small text-ink-3 m-0">Nothing has aged out. An account goes stale 90 days after its last recorded outcome, unless it is parked.</p> : (
          <div className="divide-y divide-line-1">
            {stale.slice(0, 10).map(({ account, effect }) => (
              <div key={account.id} className="py-2 flex flex-wrap items-baseline justify-between gap-2">
                <Link to={`/prospecting/${account.id}`} className="t-small text-ink-1 no-underline hover:text-accent">{account.name}</Link>
                <span className="t-micro text-ink-3">{OUTCOMES.find((o) => o.id === effect.lastTouch?.kind)?.label} · {effect.sinceDays} days ago</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
