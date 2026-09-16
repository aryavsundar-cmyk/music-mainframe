/**
 * marketDocs.js — market deliverables on the shared block model: a catalog scan and a buyer shortlist.
 * Every figure comes from the engines; sources travel with the rows so a reader can check them.
 */
import { finish, push } from './labDocs.js'
import { BUYER_KINDS, GOALS, buyerNarrative } from './buyerMatch.js'
import { OWNER_BEHAVIOUR } from './catalogScan.js'
import { fmtM } from './valuation.js'
import { LIMITS } from '../data/limits.js'

const asOf = () => new Date().toISOString().slice(0, 10)
const NOTICE = `Derived from the application's own sourced transaction and entity records, the live news feed, and SEC filings. ${LIMITS.availability.claim} ${LIMITS.match.claim} ${LIMITS.availability.enforced} ${LIMITS.match.enforced}`
const meta = { id: 'market', title: 'Mainframe · Music', disclaimer: NOTICE, valuationDate: asOf() }
const money = (v) => (!v ? '—' : v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : fmtM(v, 0))

export function buildCatalogScan(rows, filterNote = 'All tracked holdings') {
  const S = []; const add = push(S)
  const live = rows.filter((r) => r.availability.band === 'live')
  const watch = rows.filter((r) => r.availability.band === 'watch')
  add('Summary', 'What the scan covers', [
    { kind: 'stats', items: [
      { label: 'Holdings tracked', value: String(rows.length) },
      { label: 'Live signal', value: String(live.length) },
      { label: 'Worth watching', value: String(watch.length) },
      { label: 'Disclosed value', value: money(rows.reduce((a, r) => a + (r.value || 0), 0)) },
    ] },
    { kind: 'paragraph', text: `${filterNote}. Availability is scored from how the owner behaves, how long they have held the asset, any securitisation repayment date ahead, whether they have sold before, and sale-intent language in the live feed.` },
  ])
  for (const [band, label] of [['live', 'Live signal'], ['watch', 'Worth watching'], ['quiet', 'Quiet']]) {
    const list = rows.filter((r) => r.availability.band === band)
    if (!list.length) continue
    add(label, `${list.length} holding${list.length === 1 ? '' : 's'}`, [
      { kind: 'table', columns: ['Holding', 'Owner', 'Type', 'Asset', 'Value', 'Acquired', 'Score'], rows: list.slice(0, 40).map((r) => [r.label, r.owner, OWNER_BEHAVIOUR[r.ownerKind].label, r.asset, money(r.value), r.acquired || '—', String(r.availability.score)]) },
    ])
  }
  const top = rows.slice(0, 8)
  if (top.length) add('Why these', 'The reasoning behind the top scores', [
    { kind: 'table', columns: ['Holding', 'Reasons'], rows: top.map((r) => [`${r.owner} — ${r.label}`, r.availability.reasons.join('; ')]) },
  ])
  add('Sources', 'Where each row comes from', [
    { kind: 'bullets', items: [...new Set(rows.flatMap((r) => (r.sources || []).map((s) => `${s.label} — ${s.url}`)))].slice(0, 30) },
    { kind: 'note', text: NOTICE },
  ])
  return finish(meta, 'catalog-scan', 'Catalog scan', S, `Demand-side scan · ${rows.length} holdings · ${asOf()}`)
}

export function buildBuyerShortlist(matches, brief) {
  const S = []; const add = push(S)
  const strong = matches.filter((b) => b.match.band === 'strong')
  add('The brief', 'What we are selling and why', [
    { kind: 'facts', rows: [
      ['Asset', brief.asset === 'both' ? 'Recording and publishing' : brief.asset || 'Not specified'],
      ['Indicative size', brief.size ? money(Number(brief.size)) : 'Not specified'],
      ['Genre', brief.genre || 'Not specified'],
      ['Region', brief.region || 'Any'],
      ['Seller objective', GOALS[brief.goal]?.label || 'Not specified'],
    ] },
    brief.goal ? { kind: 'paragraph', text: GOALS[brief.goal].note } : null,
  ])
  add('Shortlist', `${strong.length} strong fit${strong.length === 1 ? '' : 's'} of ${matches.length} buyers on record`, [
    { kind: 'table', columns: ['Buyer', 'Kind', 'Match', 'Deals', 'Median cheque', 'Last deal'], rows: matches.slice(0, 15).map((b) => [b.name, BUYER_KINDS[b.kind], `${b.match.score} (${b.match.band})`, String(b.dealCount), money(b.medianValue), b.lastDeal ? b.lastDeal.date : '—']) },
  ])
  for (const b of matches.slice(0, 6)) {
    add(b.name, BUYER_KINDS[b.kind], [
      { kind: 'paragraph', text: buyerNarrative(b) },
      { kind: 'bullets', items: b.match.reasons },
      b.deals.length ? { kind: 'table', columns: ['Date', 'Transaction', 'Value'], rows: b.deals.slice(0, 5).map((d) => [d.date, d.title, money(d.value)]) } : null,
    ])
  }
  add('Notice', 'How to read this', [{ kind: 'note', text: NOTICE }])
  return finish(meta, 'buyer-shortlist', 'Buyer shortlist', S, `Sell-side match · ${matches.length} buyers · ${asOf()}`)
}
