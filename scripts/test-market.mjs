#!/usr/bin/env node
/** test-market.mjs — the demand-side catalog scan and the sell-side buyer match. `npm run test:market` */
import assert from 'node:assert/strict'
import { availability, filterCatalogs, genreTags, holdings, marketStats, saleIntent, scanCatalogs, OWNER_BEHAVIOUR } from '../src/utils/catalogScan.js'
import { BUYER_KINDS, GOALS, buyerNarrative, buyerProfile, buyers, matchBuyers } from '../src/utils/buyerMatch.js'
import { buildBuyerShortlist, buildCatalogScan } from '../src/utils/marketDocs.js'
import { buildAccountBrief, buildOutreachSequence, buildTargetList } from '../src/utils/prospectDocs.js'
import { buildAccounts, recommendedLine } from '../src/utils/prospect.js'
import { draftOutreach } from '../src/utils/outreach.js'
import { renderBriefMarkdown } from '../src/utils/briefMarkdown.js'
import { renderBriefText } from '../src/utils/briefText.js'
import { briefDocxBuffer } from '../src/utils/briefDocx.js'
import { briefPptxBuffer } from '../src/utils/briefPptx.js'
import { TRANSACTIONS } from '../src/data/transactions.js'
import { getEntity } from '../src/data/entities.js'

const TODAY = new Date('2026-09-16T00:00:00Z')
let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }
const rows = scanCatalogs({ today: TODAY })

// ── catalog scan ────────────────────────────────────────────────────────────
t('every holding traces to a sourced record', () => {
  assert.ok(rows.length > 30, `${rows.length} holdings`)
  for (const r of rows) {
    assert.ok(r.ownerId && getEntity(r.ownerId), `${r.id} has no resolvable owner`)
    assert.ok(r.label && r.owner, r.id)
    assert.ok(r.kind === 'portfolio' || r.transactionId, `${r.id} has no transaction behind it`)
    assert.ok(OWNER_BEHAVIOUR[r.ownerKind], `${r.id} has an unknown owner kind`)
  }
})
t('genre tags only ever come from words in the sourced text', () => {
  for (const r of rows) for (const g of r.genres) {
    const text = `${r.label} ${r.summary} ${r.asset}`.toLowerCase()
    assert.ok(text.includes(g.matched.toLowerCase()), `${r.id} claims ${g.tag} but "${g.matched}" is not in its text`)
  }
  assert.deepEqual(genreTags('Acquires a country catalog out of Nashville').map((g) => g.tag), ['country'])
  assert.deepEqual(genreTags('No genre words here at all'), [])
})
t('availability is explainable and bounded', () => {
  for (const r of rows) {
    const a = r.availability
    assert.ok(a.score >= 0 && a.score <= 100, `${r.id} scored ${a.score}`)
    assert.ok(a.reasons.length >= 1, `${r.id} has no reasons`)
    assert.ok(['live', 'watch', 'quiet'].includes(a.band))
  }
})
t('hold period scores highest inside the owner\'s usual window', () => {
  const h = { ownerId: 'blackstone', ownerKind: 'sponsor', acquired: '2021-09' }
  const inWindow = availability(h, { today: TODAY }).score
  const early = availability({ ...h, acquired: '2026-06' }, { today: TODAY }).score
  const late = availability({ ...h, acquired: '2010-01' }, { today: TODAY }).score
  assert.ok(inWindow > early, 'five years in beats five months in')
  assert.ok(inWindow > late, 'the peak window beats a very long hold')
})
t('sale-intent language in the feed lifts a holding into the live band', () => {
  const h = holdings().find((x) => x.ownerKind === 'fund' || x.ownerKind === 'sponsor')
  const quiet = availability(h, { today: TODAY })
  const loud = availability(h, { today: TODAY, news: { [h.ownerId]: [{ title: 'Owner explores sale of its music catalog', summary: '', url: 'https://example.com', publishedAt: '2026-09-01' }] } })
  assert.ok(loud.score >= quiet.score + 30, 'a live process is the strongest signal')
  assert.ok(loud.reasons.some((r) => r.includes('explores sale')))
})
t('sale intent matches only real phrases', () => {
  assert.equal(saleIntent([{ title: 'Company reports quarterly results' }]).length, 0)
  assert.equal(saleIntent([{ title: 'Fund hires adviser for catalog auction' }])[0].kind, 'process')
  assert.equal(saleIntent([{ title: 'Estate of the late writer settles dispute' }])[0].kind, 'succession')
})
t('filters narrow the scan without losing rows', () => {
  const pub = filterCatalogs(rows, { asset: 'publishing' })
  assert.ok(pub.every((r) => r.asset === 'publishing'))
  const funds = filterCatalogs(rows, { owner: 'sponsor' })
  assert.ok(funds.every((r) => r.ownerKind === 'sponsor'))
  assert.ok(filterCatalogs(rows, { q: 'zzzznothing' }).length === 0)
  const stats = marketStats(rows)
  assert.equal(stats.holdings, rows.length)
  assert.equal(stats.live + stats.watch + rows.filter((r) => r.availability.band === 'quiet').length, rows.length)
})

// ── buyer match ─────────────────────────────────────────────────────────────
t('buyer profiles are built only from deals on record', () => {
  const list = buyers({ today: TODAY })
  assert.ok(list.length > 15, `${list.length} buyers`)
  for (const b of list) {
    assert.ok(b.dealCount > 0, `${b.id} has no deals but is listed as a buyer`)
    assert.ok(BUYER_KINDS[b.kind], `${b.id} has an unknown kind`)
    assert.ok(b.totalValue >= 0 && b.medianValue >= 0)
    for (const d of b.deals) assert.ok(d.acquirers.some((p) => p.entityId === b.id), `${b.id} credited with a deal it did not make`)
  }
})
t('a profile reflects the record: KKR', () => {
  const kkr = buyerProfile('kkr', { today: TODAY })
  assert.equal(kkr.dealCount, TRANSACTIONS.filter((x) => x.acquirers.some((p) => p.entityId === 'kkr')).length)
  assert.ok(kkr.medianValue > 0 && kkr.largest >= kkr.medianValue)
  assert.ok(buyerNarrative(kkr).includes('acquisitions on record'))
})
t('matching is bounded, sorted and explained', () => {
  const m = matchBuyers({ asset: 'both', size: 400e6, goal: 'max-price' }, { today: TODAY })
  for (let i = 1; i < m.length; i++) assert.ok(m[i].match.score <= m[i - 1].match.score, 'sorted by score')
  for (const b of m) { assert.ok(b.match.score >= 0 && b.match.score <= 100); assert.ok(b.match.reasons.length) }
  assert.ok(m[0].match.band === 'strong')
})
t('asset type drives the match', () => {
  const pub = matchBuyers({ asset: 'publishing' }, { today: TODAY })
  const top = pub[0]
  assert.ok(top.assets.publishing || top.assets.both, 'the best publishing match has bought publishing')
  const none = matchBuyers({ asset: 'publishing' }, { today: TODAY }).find((b) => !b.assets.publishing && !b.assets.both)
  if (none) assert.ok(none.match.reasons.some((r) => r.includes('unproven')), 'an unproven fit says so')
})
t('the seller\'s objective changes the shortlist', () => {
  const price = matchBuyers({ asset: 'both', size: 400e6, goal: 'max-price' }, { today: TODAY })
  const legacy = matchBuyers({ asset: 'both', size: 400e6, goal: 'legacy' }, { today: TODAY })
  assert.notEqual(price[0].id, legacy[0].id, 'different goals should not always produce the same first name')
  assert.ok(legacy.slice(0, 3).some((b) => b.kind === 'major' || b.kind === 'independent'), 'legacy favours strategic owners')
  assert.ok(price.slice(0, 5).some((b) => b.usesAbs), 'price favours buyers who can finance')
  for (const g of Object.keys(GOALS)) assert.ok(matchBuyers({ asset: 'both', goal: g }, { today: TODAY }).length, `${g} returns a list`)
})
t('size fit reflects the cheques a buyer actually writes', () => {
  const big = matchBuyers({ asset: 'both', size: 3e9 }, { today: TODAY })
  const small = matchBuyers({ asset: 'both', size: 10e6 }, { today: TODAY })
  assert.notEqual(big[0].id, small[0].id, 'a $3B asset and a $10M asset should not head the same list')
})

// ── documents ───────────────────────────────────────────────────────────────
t('market and prospecting documents build and render everywhere', () => {
  const accounts = buildAccounts({ today: TODAY })
  const a = accounts[0]
  const draft = draftOutreach(a, { line: recommendedLine(a) })
  const docs = [
    buildCatalogScan(rows.slice(0, 20), 'Filtered view'),
    buildBuyerShortlist(matchBuyers({ asset: 'both', size: 400e6, goal: 'max-price' }, { today: TODAY }).slice(0, 10), { asset: 'both', size: 400e6, goal: 'max-price' }),
    buildTargetList(accounts, {}, { limit: 20 }),
    buildAccountBrief(a, draft, { status: 'contacted', note: 'Spoke to the team.' }),
    buildOutreachSequence(a, draft),
  ]
  for (const doc of docs) {
    assert.ok(doc.sections.length >= 3, doc.slug)
    for (const s of doc.sections) assert.ok(s.blocks.length, `${doc.slug}: ${s.title} is empty`)
    assert.ok(renderBriefText(doc).length > 400 && renderBriefMarkdown(doc).length > 400, doc.slug)
  }
})
const bins = await Promise.all([buildCatalogScan(rows.slice(0, 10)), buildBuyerShortlist(matchBuyers({ asset: 'both' }, { today: TODAY }).slice(0, 6), { asset: 'both' })].flatMap((d) => [briefDocxBuffer(d), briefPptxBuffer(d)]))
assert.ok(bins.every((b) => b.length > 5000)); n++
console.log('✓ the scan and the shortlist render to Word and slides')

const stats = marketStats(rows)
console.log(`\n${n} checks passed`)
console.log(`${stats.holdings} holdings · ${stats.owners} owners · ${stats.live} live / ${stats.watch} watch · ${(stats.tracked / 1e9).toFixed(1)}B disclosed · tags: ${stats.genres.join(', ') || 'none'}`)
const m = matchBuyers({ asset: 'both', size: 400e6, goal: 'max-price' }, { today: TODAY })
console.log(`${buyers({ today: TODAY }).length} buyers on record · top match for a $400M recording+publishing catalog: ${m.slice(0, 3).map((b) => `${b.short || b.name} ${b.match.score}`).join(' · ')}`)
