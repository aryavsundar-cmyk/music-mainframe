#!/usr/bin/env node
/**
 * test-forces.mjs — the Music Market Five Forces tracker.
 * `npm run test:forces`
 *
 * Three kinds of check. The taxonomy is whole. The classifier does what the spec says, including the spec's own
 * worked example. And — the one that matters most — no force is ever assigned without evidence that holds in the
 * record it came from. Every false positive found during calibration is pinned here so it cannot come back.
 */
import assert from 'node:assert/strict'
import { FORCES, FORCE_IDS, FORCE_BY_ID, CONFIDENCE, DIRECTIONS, EXPOSURE_TYPES, RIGHTS_TYPES, REVENUE_STREAMS, CLASSIFICATION } from '../src/data/forces.js'
import { classifyDeal, classifyEvent, classifyAll, evidenceHolds, filterTagged, forceActivity, forceBoard, placesOf, compileKeyword, dateMs, isMusic } from '../src/utils/forces.js'
import { buildForcesBrief, THIN_EVIDENCE } from '../src/utils/forcesDocs.js'
import { TRANSACTIONS } from '../src/data/transactions.js'
import { LIMITS } from '../src/data/limits.js'
import { renderBriefText } from '../src/utils/briefText.js'
import { briefXlsxBuffer, workbookSheets } from '../src/utils/briefXlsx.js'
import { briefDocxBuffer } from '../src/utils/briefDocx.js'
import { briefPptxBuffer } from '../src/utils/briefPptx.js'

let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }
const T = async (name, fn) => { await fn(); n++; console.log(`✓ ${name}`) }
const TODAY = new Date('2026-09-21T12:00:00Z')
const deal = (re) => { const d = TRANSACTIONS.find((x) => re.test(x.title)); assert.ok(d, `no deal matching ${re}`); return classifyDeal(d) }
let seq = 0
const ev = (title, summary = '', extra = {}) => classifyEvent({ id: `fixture-${++seq}`, kind: 'news', category: 'trade', source: 'Fixture', url: `https://example.com/${seq}`, publishedAt: '2026-09-15T10:00:00Z', title, summary, entities: [], topics: [], ...extra })

// Market events written like real trade-press items. Offline, so the suite never depends on the live feed.
const FIXTURES = [
  ev('Royalty-administration platform raises growth capital to automate cross-DSP matching', 'The platform matches publishing and recorded-music royalties across DSPs, covering mechanical, streaming and performance income, and reconciles unmatched claims.'),
  ev('UMG and Sony Music file new Suno complaint over v6 models', 'The labels say the models were trained on their recordings without a licence.', { entities: ['suno'], topics: ['ai', 'litigation'] }),
  ev('Judge rules AI training on lyrics is fair use', 'The court found the developer’s use of songwriters’ lyrics to train its model was fair use.'),
  ev('States’ antitrust lawsuit against Live Nation goes to trial', 'The DOJ and 40 states allege Ticketmaster monopolised primary ticketing.', { entities: ['live-nation', 'ticketmaster'], topics: ['live', 'litigation'] }),
  ev('Tencent Music expands into Southeast Asia with Indonesian label partnership', 'The Chinese streaming group signs a distribution partnership with a Jakarta label.'),
  ev('Nigerian naira devaluation cuts foreign royalty payouts', 'Afrobeats catalogs collect more streams but less in dollars as currency controls tighten repatriation.'),
  ev('Live Nation reports record concert attendance, revenue up 12%', 'Ticketing fees and premium seating drove growth.', { entities: ['live-nation'], topics: ['live', 'earnings'] }),
  ev('Precious Metals Royalty And Streaming Companies - August 2026 Report', 'Gold streamers outperformed producers.', { category: 'search' }),
  ev('Blackstone — 4 - Statement of changes in beneficial ownership', '', { kind: 'filing', category: 'filing' }),
  ev('Ed Sheeran addresses protest outside his concert', 'Fans shrugged off the controversy.'),
]
const [ROYALTY_PLATFORM, SUNO, FAIR_USE, ANTITRUST, TENCENT, NAIRA, LN_RESULTS, MINING, FORM4, GOSSIP] = FIXTURES

// ── The taxonomy ────────────────────────────────────────────────────────────────────────────────────────

t('five forces, numbered 1–5, each complete', () => {
  assert.equal(FORCES.length, 5)
  assert.deepEqual(FORCES.map((f) => f.number), [1, 2, 3, 4, 5])
  assert.equal(new Set(FORCE_IDS).size, 5)
  for (const f of FORCES) {
    for (const k of ['title', 'short_title', 'thesis', 'summary']) assert.ok(typeof f[k] === 'string' && f[k].length > 10, `${f.id}.${k}`)
    for (const k of ['industry_force', 'evidence_signals', 'implications', 'market_opportunities', 'classification_keywords']) assert.ok(Array.isArray(f[k]) && f[k].length >= 2, `${f.id}.${k}`)
  }
  assert.equal(CLASSIFICATION.maxSecondary, 3)
})

t('keywords compile to careful matchers', () => {
  assert.ok(compileKeyword('securitization').test('closes $500M securitisation'), 'UK spelling matches')
  assert.ok(compileKeyword('sub-publishing').test('a new sub publishing deal'), 'hyphen and space are interchangeable')
  assert.ok(!compileKeyword('India').test('based in Indiana'), '"India" must not match "Indiana"')
  assert.ok(!compileKeyword('FX').test('the fx desk'), 'acronyms are case-sensitive')
  assert.ok(compileKeyword('royalty-backed loan').test('royalty-backed loans'), 'plurals match')
})

t('places resolve by city first, because country codes collide with US states', () => {
  assert.deepEqual(placesOf('Bloomington, IN').map((p) => p.region), ['North America'], 'IN is Indiana here')
  assert.deepEqual(placesOf('Mumbai, IN').map((p) => [p.region, p.emerging]), [['India', true]], 'and India here')
  assert.deepEqual(placesOf('Tel Aviv, IL · New York, NY').map((p) => [p.region, p.emerging]), [['Middle East', false], ['North America', false]], 'Israel is not an emerging market')
  assert.deepEqual(placesOf('Munich, DE').map((p) => p.region), ['Europe'], 'DE is Germany for Munich')
})

// ── The spec's own example ──────────────────────────────────────────────────────────────────────────────

t('the spec’s worked example classifies exactly as the spec says', () => {
  const x = ROYALTY_PLATFORM
  assert.equal(x.primary_force_id, 'discovery_distribution')
  assert.deepEqual(x.secondary_force_ids, ['capital_ownership'])
  assert.equal(x.force_confidence, 'high')
  assert.equal(x.force_impact_direction, 'supports')
  assert.equal(x.exposure_type, 'financing')
  assert.deepEqual(x.rights_type, ['publishing', 'recorded_music'])
  assert.deepEqual([...x.revenue_stream].sort(), ['mechanical', 'performance', 'streaming'])
  assert.ok(x.force_rationale.includes(FORCE_BY_ID.discovery_distribution.thesis), 'the rationale links to the thesis')
  assert.ok(x.force_rationale.includes('Capital and ownership'), 'and names the adjacent force')
})

// ── Every record, every tag ─────────────────────────────────────────────────────────────────────────────

const ALL_DEALS = TRANSACTIONS.map(classifyDeal)
const TAGGED = [...ALL_DEALS, ...FIXTURES.filter((x) => x.primary_force_id)]

t('every deal classifies: one primary, at most three secondaries, all distinct and valid', () => {
  assert.equal(ALL_DEALS.length, TRANSACTIONS.length)
  for (const x of TAGGED) {
    assert.ok(FORCE_IDS.includes(x.primary_force_id), `${x.id}: bad primary`)
    assert.ok(x.secondary_force_ids.length <= 3, `${x.id}: too many secondaries`)
    assert.ok(!x.secondary_force_ids.includes(x.primary_force_id), `${x.id}: primary repeated as secondary`)
    assert.equal(new Set(x.secondary_force_ids).size, x.secondary_force_ids.length)
    assert.ok(x.force_confidence in CONFIDENCE && x.force_impact_direction in DIRECTIONS && x.exposure_type in EXPOSURE_TYPES, `${x.id}: value outside the spec’s enums`)
    for (const r of x.rights_type) assert.ok(r in RIGHTS_TYPES, `${x.id}: rights ${r}`)
    for (const r of x.revenue_stream) assert.ok(r in REVENUE_STREAMS, `${x.id}: revenue ${r}`)
    assert.ok(x.source_url && x.source_date, `${x.id}: every tag carries its source`)
  }
})

t('no force without evidence — and every piece of evidence holds in its record', () => {
  let checked = 0
  for (const x of TAGGED) {
    for (const id of [x.primary_force_id, ...x.secondary_force_ids]) assert.ok(x.evidence.some((e) => e.force === id), `${x.id}: ${id} assigned with no evidence`)
    for (const e of x.evidence) { assert.ok(evidenceHolds(x.record, e), `${x.id}: evidence does not hold — ${e.label}`); checked++ }
  }
  assert.ok(checked > 150, `only ${checked} pieces of evidence checked`)
})

// ── Calibration: what the real deals should say ─────────────────────────────────────────────────────────

t('securitisations and catalog sales are capital; the direction of a terminated deal says so', () => {
  for (const x of ALL_DEALS.filter((d) => d.record.type === 'abs')) assert.equal(x.primary_force_id, 'capital_ownership', x.title)
  assert.equal(deal(/Queen's catalog/).primary_force_id, 'capital_ownership')
  const pershing = deal(/Pershing Square proposes/)
  assert.equal(pershing.force_impact_direction, 'challenges', 'a terminated deal pushes against the thesis')
})

t('deals whose subject sits in another force land there, with capital adjacent', () => {
  assert.equal(deal(/Suno raises/).primary_force_id, 'ai_rights_control')
  assert.equal(deal(/acquire Revelator/).primary_force_id, 'discovery_distribution')
  assert.equal(deal(/SiriusXM acquires Pandora/).primary_force_id, 'discovery_distribution')
  assert.equal(deal(/See Tickets/).primary_force_id, 'superfan_live')
  assert.equal(deal(/Superstruct/).primary_force_id, 'superfan_live', 'a target named only in the title still counts')
  assert.equal(deal(/Bandcamp/).primary_force_id, 'discovery_distribution', 'likewise')
  for (const re of [/Suno raises/, /acquire Revelator/, /See Tickets/]) assert.ok(deal(re).secondary_force_ids.includes('capital_ownership'), `${re}: capital should be adjacent`)
  const floyd = deal(/Pink Floyd/)
  assert.deepEqual([floyd.primary_force_id, ...floyd.secondary_force_ids].sort(), ['capital_ownership', 'superfan_live'], 'name-and-likeness ties the Pink Floyd sale to superfan monetisation')
  const ocesa = deal(/OCESA/)
  assert.equal(ocesa.primary_force_id, 'superfan_live')
  assert.ok(ocesa.secondary_force_ids.includes('emerging_markets') && ocesa.geography.includes('Latin America'), 'Mexico’s dominant promoter is an emerging-markets exposure')
})

t('false positives found in calibration stay fixed', () => {
  const recognition = deal(/Recognition Music Group portfolio/)
  assert.ok(![recognition.primary_force_id, ...recognition.secondary_force_ids].includes('emerging_markets'), 'GIC’s Singapore domicile does not make a US catalog an emerging-markets deal')
  const bmi = deal(/acquires BMI/)
  assert.ok(![bmi.primary_force_id, ...bmi.secondary_force_ids].includes('emerging_markets'), '"collection society" alone does not make BMI emerging-markets')
  assert.notEqual(deal(/Legends completes acquisition of ASM/).force_impact_direction, 'challenges', '"closed after DOJ review" is a cleared deal, not an antitrust action')
  const tiktok = ev('How to get paid for your music on TikTok', '', { entities: ['tiktok'] })
  assert.ok(!tiktok.secondary_force_ids.includes('emerging_markets') && tiktok.primary_force_id !== 'emerging_markets', 'TikTok’s registered office is not where its users are')
  assert.ok(tiktok.geography.includes('Global'))
  const roundup = ev('Ed Sheeran discusses Macklemore axing controversy as his tour resumes', 'Elsewhere, an artist pulled out of a concert in Abu Dhabi and a band returned to Spotify.', { entities: ['spotify'] })
  assert.ok(!roundup.secondary_force_ids.includes('emerging_markets'), 'a place in a news roundup is a mention, not a market')
  assert.ok(!roundup.secondary_force_ids.includes('discovery_distribution'), 'Spotify mentioned once is one piece of evidence, not two')
})

// ── Market events ───────────────────────────────────────────────────────────────────────────────────────

t('events that are not about music, or not evidence of anything, are declined — with a reason', () => {
  assert.equal(MINING.primary_force_id, null)
  assert.match(MINING.unclassified, /Not about the music business/)
  assert.equal(isMusic({ title: 'KBRA Releases Research – Auto Loan ABS', summary: '', category: 'search', entities: [] }), false)
  assert.equal(FORM4.primary_force_id, null)
  assert.match(FORM4.unclassified, /Routine SEC filing/)
  const { tagged, unclassified } = classifyAll({ deals: [], events: FIXTURES.map((x) => x.record) })
  assert.equal(tagged.length + unclassified.length, FIXTURES.length, 'nothing is dropped silently')
})

t('direction is read against the thesis as written', () => {
  assert.equal(SUNO.primary_force_id, 'ai_rights_control')
  assert.equal(SUNO.force_impact_direction, 'supports', 'a training-data lawsuit is evidence that AI is a control problem')
  assert.equal(SUNO.exposure_type, 'regulatory or legal event')
  assert.equal(FAIR_USE.force_impact_direction, 'challenges', 'a fair-use ruling weakens rights owners’ control')
  assert.equal(ANTITRUST.primary_force_id, 'superfan_live')
  assert.equal(ANTITRUST.force_impact_direction, 'challenges', 'an antitrust suit pushes against pricing power')
  assert.equal(NAIRA.primary_force_id, 'emerging_markets')
  assert.equal(NAIRA.force_impact_direction, 'mixed', 'currency controls strain realisation without reversing the growth shift')
  assert.equal(TENCENT.primary_force_id, 'emerging_markets')
  assert.equal(LN_RESULTS.force_impact_direction, 'supports', 'record results move the way the thesis expects')
  const settled = ev('Live Nation, DOJ strike deal settling antitrust case and avoiding Ticketmaster breakup', '', { entities: ['live-nation'] })
  assert.equal(settled.force_impact_direction, 'mixed', 'a settlement that avoids a break-up cuts both ways — and "settling" drops the e')
})

t('topical words classify but cannot claim high confidence on their own', () => {
  assert.equal(GOSSIP.primary_force_id, 'superfan_live')
  assert.notEqual(GOSSIP.force_confidence, 'high', 'a concert controversy is not strong evidence about live pricing power')
})

// ── Views ───────────────────────────────────────────────────────────────────────────────────────────────

t('dates: month precision counts from the first, and the future is not "recent"', () => {
  assert.equal(dateMs('2026-04'), Date.parse('2026-04-01T00:00:00Z'))
  assert.equal(dateMs('not a date'), null)
  const items = [
    { ...ROYALTY_PLATFORM, date: '2026-09-10' },
    { ...ROYALTY_PLATFORM, date: '2026-07' },
    { ...ROYALTY_PLATFORM, date: '2025-11-01' },
    { ...ROYALTY_PLATFORM, date: '2027-01-01' },
  ]
  const a = forceActivity(items, 'discovery_distribution', { today: TODAY })
  assert.deepEqual(a.trailing, { 30: 1, 90: 2, 365: 3 }, 'the future-dated item is counted in no window')
  assert.equal(a.direct, 4)
})

t('filters: OR within a facet, AND across facets, and direct versus adjacent', () => {
  const any = filterTagged(TAGGED, { force: ['capital_ownership'] })
  const direct = filterTagged(TAGGED, { force: ['capital_ownership'], reach: 'direct' })
  assert.ok(any.length > direct.length, 'including adjacent exposure widens the set')
  assert.ok(direct.every((x) => x.primary_force_id === 'capital_ownership'))
  const either = filterTagged(TAGGED, { force: 'ai_rights_control,superfan_live', reach: 'direct' })
  assert.ok(either.some((x) => x.primary_force_id === 'ai_rights_control') && either.some((x) => x.primary_force_id === 'superfan_live'), 'OR within the facet')
  const both = filterTagged(TAGGED, { force: ['capital_ownership'], exposure: ['financing'] })
  assert.ok(both.length && both.every((x) => x.exposure_type === 'financing'), 'AND across facets')
  assert.equal(filterTagged(TAGGED, {}).length, TAGGED.length, 'no filters, no change')
})

await T('the brief: all five theses, the method, the limit, thin evidence flagged — in every format', async () => {
  const { tagged, unclassified } = classifyAll({ deals: TRANSACTIONS, events: FIXTURES.map((x) => x.record) })
  const doc = buildForcesBrief(tagged, { today: TODAY, unclassified })
  const text = renderBriefText(doc).replace(/\s+/g, ' ')
  for (const f of FORCES) assert.ok(text.includes(f.thesis), `missing thesis: ${f.id}`)
  assert.ok(text.includes(LIMITS.force.claim), 'the force limit travels with the file')
  assert.ok(/Items declined/.test(text) && /not about the music business/i.test(text), 'declined items are reported with their reasons')
  const board = forceBoard(tagged, { today: TODAY })
  const thin = board.filter((b) => b.total < THIN_EVIDENCE)
  for (const b of thin) assert.ok(text.includes(`Only ${b.total} item`), `${b.force.id} is thin and must say so`)
  assert.ok(workbookSheets(doc).length >= 4, 'the workbook has a sheet per evidence table')
  assert.ok((await briefXlsxBuffer(doc)).length > 3000 && (await briefDocxBuffer(doc)).length > 5000 && (await briefPptxBuffer(doc)).length > 5000)
  const one = buildForcesBrief(tagged, { today: TODAY, unclassified, forces: ['ai_rights_control'] })
  assert.equal(one.sections.filter((s) => /^Force /.test(s.eyebrow)).length, 1, 'a selected force exports just that force')
})

console.log(`\n${n} checks passed`)
const board = forceBoard(ALL_DEALS, { today: TODAY })
console.log(`deals by primary force: ${board.map((b) => `${b.force.number}·${b.direct}`).join('  ')}`)
