/**
 * transactions.js — ONE table for every money event: catalog sales, PE rounds, ABS, debt, take-privates, M&A.
 * /deals, /abs, /catalogs are filtered views of this table (Sprint 3 populates fully).
 * Sprint 1 ships a seed so entity pages have a related-deals surface.
 *
 * party = { entityId } | { name, kind: 'artist' | 'estate' | 'company' | 'fund' }
 * type   = catalog-sale · pe-round · abs · debt · take-private · m&a
 * asset  = recording · publishing · both · equity · n/a
 * structure = equity · debt · abs · royalty-stream · cash
 * status = closed · pending · announced · terminated
 */
import { mbw, AS_OF } from './entities/_schema.js'
import { getEntity } from './entities.js'

export const TX_TYPES = {
  'catalog-sale': { label: 'Catalog sale', tone: 'accent' },
  'pe-round': { label: 'PE / equity round', tone: 'accent' },
  abs: { label: 'ABS issuance', tone: 'accent' },
  debt: { label: 'Debt facility', tone: 'neutral' },
  'take-private': { label: 'Take-private', tone: 'accent' },
  'm&a': { label: 'M&A', tone: 'neutral' },
}

const E = (entityId) => ({ entityId })
const P = (name, kind) => ({ name, kind })

const RAW = [
  { id: 'dylan-umpg-2020', date: '2020-12', type: 'catalog-sale', asset: 'publishing', structure: 'cash',
    title: 'UMPG acquires Bob Dylan\'s songwriting catalog', acquirers: [E('umpg')], sellers: [P('Bob Dylan', 'artist')],
    value: 300e6, valueNote: 'reported $300M+ (some reports up to $400M)',
    summary: 'The deal that opened the superstar-catalog cycle: 600+ songs, entire songwriting catalog.',
    sources: [mbw('Bob Dylan Universal Music Publishing')], verify: true },
  { id: 'dylan-sony-2022', date: '2022-01', type: 'catalog-sale', asset: 'recording', structure: 'cash',
    title: 'Sony Music acquires Bob Dylan\'s recorded-music catalog', acquirers: [E('sony-music-entertainment')], sellers: [P('Bob Dylan', 'artist')],
    value: 200e6, valueNote: 'reported ~$200M',
    summary: 'Recordings sold separately from publishing, to Dylan\'s long-time label.',
    sources: [mbw('Bob Dylan Sony recorded catalog')], verify: true },
  { id: 'springsteen-sony-2021', date: '2021-12', type: 'catalog-sale', asset: 'both', structure: 'cash',
    title: 'Sony Music acquires Bruce Springsteen\'s recordings and publishing', acquirers: [E('sony-music-group')], sellers: [P('Bruce Springsteen', 'artist')],
    value: 500e6, valueNote: 'reported $500M+',
    summary: 'Largest single-artist transaction at the time; both rights domains in one deal.',
    sources: [mbw('Springsteen Sony 500 million')], verify: true },
  { id: 'sting-umpg-2022', date: '2022-02', type: 'catalog-sale', asset: 'publishing', structure: 'cash',
    title: 'UMPG acquires Sting\'s songwriting catalog', acquirers: [E('umpg')], sellers: [P('Sting', 'artist')],
    value: 300e6, valueNote: 'reported ~$300M', summary: 'Solo and Police compositions.',
    sources: [mbw('Sting Universal Music Publishing')], verify: true },
  { id: 'genesis-concord-2022', date: '2022-09', type: 'catalog-sale', asset: 'both', structure: 'cash',
    title: 'Concord acquires Genesis, Phil Collins, Tony Banks, Mike Rutherford catalog', acquirers: [E('concord')], sellers: [P('Genesis and members', 'artist')],
    value: 300e6, valueNote: 'reported ~$300M', summary: 'Publishing plus recorded-music royalty interests.',
    sources: [mbw('Genesis Concord catalog')], verify: true },
  { id: 'katy-perry-litmus-2023', date: '2023-09', type: 'catalog-sale', asset: 'both', structure: 'cash',
    title: 'Litmus Music acquires Katy Perry\'s catalog rights', acquirers: [E('litmus-music')], sellers: [P('Katy Perry', 'artist')],
    value: 225e6, summary: 'Master and publishing rights to five albums (2008–2020).',
    sources: [mbw('Katy Perry Litmus')] },
  { id: 'mj-estate-sony-2024', date: '2024-02', type: 'catalog-sale', asset: 'both', structure: 'cash',
    title: 'Sony Music acquires ~half of the Michael Jackson estate\'s music interests', acquirers: [E('sony-music-group')], sellers: [P('Michael Jackson estate', 'estate')],
    value: 600e6, valueNote: 'reported $600M+ for ~50%, implying $1.2B+ total',
    summary: 'Recordings and publishing interests, plus Mijac; the largest valuation of a single artist\'s catalog.',
    sources: [mbw('Michael Jackson estate Sony')], verify: true },
  { id: 'swift-masters-2025', date: '2025-05', type: 'catalog-sale', asset: 'recording', structure: 'cash',
    title: 'Taylor Swift buys back her first six masters from Shamrock Capital', acquirers: [P('Taylor Swift', 'artist')], sellers: [E('shamrock-capital')],
    value: 360e6, valueNote: 'reported ~$360M; not confirmed by either party',
    summary: 'Closes the loop on the 2019 Ithaca sale and 2020 Shamrock purchase; the "Taylor\'s Version" re-record strategy as leverage.',
    sources: [mbw('Taylor Swift masters Shamrock')], verify: true },

  { id: 'hipgnosis-blackstone-2024', date: '2024-07', type: 'take-private', asset: 'publishing', structure: 'equity',
    title: 'Blackstone takes Hipgnosis Songs Fund private', acquirers: [E('blackstone'), E('recognition-music-group')], sellers: [E('hipgnosis-songs-fund')],
    value: 1.6e9, valueNote: '$1.31 per share; ~$1.6B equity value',
    summary: 'Ends the listed-fund era after the 2023 continuation-vote revolt; combined with Hipgnosis Songs Capital into Recognition Music Group.',
    sources: [mbw('Hipgnosis Blackstone take private')], verify: true },
  { id: 'roundhill-concord-2023', date: '2023-11', type: 'take-private', asset: 'both', structure: 'equity',
    title: 'Concord acquires Round Hill Music Royalty Fund', acquirers: [E('concord')], sellers: [E('round-hill')],
    value: 469e6, valueNote: '$1.15 per share', summary: 'LSE-listed fund taken private by Concord (via Alchemy Copyrights).',
    sources: [mbw('Round Hill Music Royalty Fund Concord')] },
  { id: 'bmi-newmountain-2024', date: '2024-02', type: 'm&a', asset: 'equity', structure: 'equity',
    title: 'New Mountain Capital acquires BMI', acquirers: [E('new-mountain')], sellers: [P('BMI broadcaster shareholders', 'company')],
    value: 1.7e9, valueNote: 'undisclosed; reported ~$1.7B', summary: 'First PE ownership of a US PRO; CPP Investments co-invested.',
    sources: [mbw('BMI New Mountain Capital')], verify: true },
  { id: 'awal-sony-2021', date: '2021-05', type: 'm&a', asset: 'recording', structure: 'cash',
    title: 'Sony Music acquires AWAL and Kobalt Neighbouring Rights', acquirers: [E('sony-music-entertainment')], sellers: [E('kobalt')],
    value: 430e6, summary: 'Cleared by the UK CMA in March 2022 after a phase-2 review.',
    sources: [mbw('AWAL Sony CMA')] },
  { id: 'kobalt-fund-kkr-2021', date: '2021-10', type: 'pe-round', asset: 'both', structure: 'equity',
    title: 'KKR and Dundee Partners acquire Kobalt\'s KMR Music Royalties II', acquirers: [E('kkr'), E('dundee-partners')], sellers: [E('kobalt-capital')],
    value: 1.1e9, summary: 'The ~62,000-song portfolio became Chord Music Partners.',
    sources: [mbw('KKR Kobalt Music Royalties')], verify: true },
  { id: 'chord-umg-2024', date: '2024-05', type: 'pe-round', asset: 'both', structure: 'equity',
    title: 'UMG buys KKR\'s stake in Chord Music Partners', acquirers: [E('umg')], sellers: [E('kkr')],
    value: null, valueNote: 'undisclosed; 25.8% stake', summary: 'UMG joins Dundee as owner; Chord becomes a UMG-affiliated catalog vehicle.',
    sources: [mbw('Chord Music Universal KKR')], verify: true },
  { id: 'hipgnosis-capital-2021', date: '2021-10', type: 'pe-round', asset: 'both', structure: 'equity',
    title: 'Blackstone and Hipgnosis Song Management launch Hipgnosis Songs Capital', acquirers: [E('blackstone')], sellers: [],
    value: 1e9, valueNote: '$1B initial commitment', summary: 'Private vehicle alongside the listed fund; later the acquirer of it.',
    sources: [mbw('Hipgnosis Songs Capital Blackstone')] },
  { id: 'primary-wave-brookfield-2022', date: '2022-10', type: 'pe-round', asset: 'both', structure: 'equity',
    title: 'Brookfield commits $1.7B to Primary Wave and takes an equity stake', acquirers: [E('brookfield')], sellers: [E('primary-wave')],
    value: 1.7e9, summary: 'Permanent-capital partnership for legacy-catalog acquisitions.',
    sources: [mbw('Primary Wave Brookfield')] },
  { id: 'concord-abs-2022', date: '2022-11', type: 'abs', asset: 'both', structure: 'abs',
    title: 'Concord issues $1.8B music-royalty ABS', acquirers: [E('apollo')], sellers: [E('concord')],
    value: 1.8e9, summary: 'Largest music securitisation on record; Apollo-led, backed by ~1M songs\' royalties.',
    sources: [mbw('Concord 1.8 billion ABS Apollo')], verify: true },
  { id: 'downtown-umg-2024', date: '2024-12', type: 'm&a', asset: 'n/a', structure: 'cash', status: 'pending',
    title: 'UMG agrees to acquire Downtown Music Holdings', acquirers: [E('umg')], sellers: [E('downtown')],
    value: 775e6, summary: 'Virgin Music Group to absorb FUGA, CD Baby, Songtrust, Curve; in-depth European Commission review in 2025.',
    sources: [mbw('Universal Downtown 775 million')], verify: true },
  { id: 'bandcamp-songtradr-2023', date: '2023-09', type: 'm&a', asset: 'n/a', structure: 'cash',
    title: 'Songtradr acquires Bandcamp from Epic Games', acquirers: [E('songtradr')], sellers: [P('Epic Games', 'company')],
    value: null, valueNote: 'undisclosed', summary: 'Epic exited after 18 months; Songtradr cut roughly half of Bandcamp staff.',
    sources: [mbw('Bandcamp Songtradr')] },
  { id: 'pandora-siriusxm-2019', date: '2019-02', type: 'm&a', asset: 'n/a', structure: 'equity',
    title: 'SiriusXM acquires Pandora', acquirers: [E('siriusxm')], sellers: [E('pandora')],
    value: 3.5e9, summary: 'All-stock deal; created the largest US audio-entertainment company.',
    sources: [mbw('SiriusXM Pandora 3.5 billion')] },
  { id: 'asm-legends-2024', date: '2024-04', type: 'm&a', asset: 'n/a', structure: 'cash',
    title: 'Legends acquires ASM Global', acquirers: [E('legends'), E('sixth-street')], sellers: [E('aeg'), P('Onex', 'fund')],
    value: null, valueNote: 'undisclosed; reported ~$2.3B', summary: 'Combines venue management with premium hospitality.',
    sources: [mbw('Legends ASM Global')], verify: true },
]

const TX_DEFAULTS = { status: 'closed', value: null, valueNote: '', currency: 'USD', summary: '', sources: [], verify: false, asOf: AS_OF, acquirers: [], sellers: [] }

export const TRANSACTIONS = RAW.map((t) => ({ ...TX_DEFAULTS, ...t })).sort((a, b) => b.date.localeCompare(a.date))

export const partyName = (p) => (p.entityId ? (getEntity(p.entityId)?.name || p.entityId) : p.name)
export const partyIds = (t) => [...t.acquirers, ...t.sellers].map((p) => p.entityId).filter(Boolean)

export const getTransaction = (id) => TRANSACTIONS.find((t) => t.id === id) || null
export const getTransactionsForEntity = (id) => TRANSACTIONS.filter((t) => partyIds(t).includes(id))
export const transactionsByType = (type) => TRANSACTIONS.filter((t) => t.type === type)
