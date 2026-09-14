/**
 * transactions.js — ONE table for every money event: catalog sales, PE rounds and fund raises, ABS,
 * debt, take-privates, M&A. /deals, /abs, /catalogs are filtered views of this table.
 *
 * party     = { entityId } | { name, kind: 'artist' | 'estate' | 'company' | 'fund' }
 * type      = catalog-sale · pe-round · abs · debt · take-private · m&a
 * asset     = recording · publishing · both · equity · n/a
 * structure = equity · debt · abs · wbs · royalty-stream · cash
 * status    = closed · pending · announced · terminated
 * abs       = { issuer, series, rating, arrangers[], collateral, catalogValue, advanceRate, ard, finalMaturity, notes }
 *
 * Every record carries sources[]. verify: true only where the figure is a press estimate the parties
 * have not confirmed. Sourced in the Sprint 3 verification pass (2026-09-14).
 */
import { mbw, src, AS_OF } from './entities/_schema.js'
import { getEntity } from './entities.js'

export const TX_TYPES = {
  'catalog-sale': { label: 'Catalog sale', tone: 'accent' },
  'pe-round': { label: 'Equity / fund raise', tone: 'accent' },
  abs: { label: 'ABS issuance', tone: 'accent' },
  debt: { label: 'Debt facility', tone: 'neutral' },
  'take-private': { label: 'Take-private', tone: 'accent' },
  'm&a': { label: 'M&A', tone: 'neutral' },
}
export const ASSETS = { recording: 'Recording', publishing: 'Publishing', both: 'Recording + publishing', equity: 'Company equity', 'n/a': 'Company / other' }
export const STRUCTURES = { equity: 'Equity', debt: 'Debt', abs: 'ABS', wbs: 'Whole-business securitisation', 'royalty-stream': 'Royalty stream', cash: 'Cash purchase' }

const E = (entityId) => ({ entityId })
const P = (name, kind) => ({ name, kind })

const RAW = [
  // ── 2026 ─────────────────────────────────────────────────────────────────
  { id: 'bmg-concord-2026', date: '2026-09-01', type: 'm&a', asset: 'both', structure: 'equity',
    title: 'Bertelsmann combines BMG and Concord', acquirers: [E('bertelsmann'), E('bmg')], sellers: [E('great-mountain-partners'), E('michigan-retirement'), E('concord')],
    value: 7e9, valueNote: 'up to ~$7B reported (Bloomberg, Jan 2026); Bertelsmann 67% / Concord owners 33% + ~$1.16B cash',
    summary: 'Creates the fourth-largest music company: pro forma 2026 revenue $2.2B, adjusted EBITDA $730M, HQ Nashville, CEO Bob Valentine. Talks reported 29 Jan, agreement Apr, closed 1 Sep 2026.',
    sources: [src('Bertelsmann — completion (Sep 2026)', 'https://www.bertelsmann.com/en/media/news/bertelsmann-and-great-mountain-partners-complete-combination-of-bmg-and-concord.html'), mbw('BMG Concord merger complete')], verify: true },
  { id: 'recognition-smp-2026', date: '2026-07-15', type: 'catalog-sale', asset: 'both', structure: 'cash',
    title: 'Sony Music Publishing (with GIC venture) acquires the Recognition Music Group portfolio from Blackstone', acquirers: [E('sony-music-publishing'), E('gic')], sellers: [E('blackstone'), E('recognition-music-group')],
    value: 3.75e9, valueNote: 'undisclosed; Bloomberg reported $3.5–4B', summary: '45,000+ songs across 145 catalogs (Fleetwood Mac, Shakira, Red Hot Chili Peppers, Journey, 50 Cent); the largest catalog transaction on record. Announced 11 May, closed 15 Jul 2026.',
    sources: [mbw('Sony Music Publishing completes acquisition of Recognition Music Group'), src('Variety — Sony Publishing to acquire Recognition', 'https://variety.com/2026/music/news/sony-publishing-acquire-recognition-fleetwood-mac-beyonce-1236744574/')], verify: true },
  { id: 'kobalt-primarywave-2026', date: '2026-07-07', type: 'm&a', asset: 'publishing', structure: 'cash',
    title: 'Primary Wave acquires Kobalt (and AMRA) from Francisco Partners', acquirers: [E('primary-wave')], sellers: [E('francisco-partners'), E('kobalt')],
    value: 1.5e9, valueNote: 'undisclosed; ~$1.5B reported (double FP\'s 2022 entry)', summary: 'Worldwide publishing operations, owned copyrights, and the AMRA digital collection society; Kobalt kept stand-alone under Laurent Hubert. Creates a ~$7B independent.',
    sources: [mbw('Primary Wave acquisition of Kobalt has closed'), src('Billboard — Primary Wave closes Kobalt', 'https://www.billboard.com/pro/primary-wave-closes-kobalt-acquisition/')], verify: true },
  { id: 'distrokid-cvc-2026', date: '2026-07-06', type: 'pe-round', asset: 'equity', structure: 'equity', status: 'pending',
    title: 'CVC Capital Partners agrees to take a majority stake in DistroKid', acquirers: [E('cvc')], sellers: [E('insight-partners'), E('distrokid')],
    value: null, valueNote: 'undisclosed; ~$2B valuation reported as sought', summary: 'CVC Fund IX; Insight Partners keeps a significant minority; close expected Q3 2026.',
    sources: [src('CVC — DistroKid (Jul 2026)', 'https://www.cvc.com/media/news/2026/cvc-capital-partners-to-make-majority-investment-in-distrokid/'), mbw('CVC DistroKid')] },
  { id: 'primarywave-fund4-2026', date: '2026-04', type: 'pe-round', asset: 'both', structure: 'equity',
    title: 'Primary Wave closes Fund 4 at $2.225B', acquirers: [P('Insurers, pensions, endowments, family offices', 'fund')], sellers: [E('primary-wave')],
    value: 2.225e9, summary: 'Largest closed-end music royalty fund raised to date.',
    sources: [mbw('Primary Wave Fund 4 $2.225 billion')], verify: true },
  { id: 'chord-canon-abs-2026', date: '2026-04-20', type: 'abs', asset: 'both', structure: 'abs',
    title: 'Canon Music Issuer Trust 2026-1 — $500M ABS linked to Chord Music Partners', acquirers: [P('ABS investors', 'fund')], sellers: [E('chord-music-partners'), E('umg')],
    value: 500e6, summary: '3,750+ works (Suicideboys, Morgan Wallen, Ryan Tedder, Diplo, Twenty One Pilots). Universal Music Investments as transaction manager; Redding Ridge (Apollo) backup manager.',
    abs: { issuer: 'Canon Music Issuer Trust', series: '2026-1', rating: 'KBRA A (sf) preliminary', arrangers: [], collateral: '3,750+ compositions and masters', catalogValue: 830e6, advanceRate: 60.2, ard: '2031-05', finalMaturity: '2076-05', notes: 'Overcollateralisation 39.8%; catalog valued by Virtu Global Advisors at 8.0% discount rate (Sep 2025).' },
    sources: [mbw('Chord Music-linked ABS vehicle plans $500M')] },
  { id: 'wmg-revelator-2026', date: '2026-04-01', type: 'm&a', asset: 'n/a', structure: 'cash', status: 'pending',
    title: 'Warner Music Group agrees to acquire Revelator', acquirers: [E('wmg')], sellers: [E('revelator')],
    value: null, valueNote: 'undisclosed', summary: 'B2B distribution and rights-tech platform to upgrade ADA; close expected the following quarter.',
    sources: [src('WMG — Revelator (Apr 2026)', 'https://www.prnewswire.com/news-releases/warner-music-group-agrees-to-acquire-revelator-state-of-the-art-independent-music-platform-302731480.html')] },
  { id: 'umg-pershing-proposal-2026', date: '2026-04-07', type: 'take-private', asset: 'equity', structure: 'equity', status: 'announced',
    title: 'Pershing Square proposes $64.4B merger of UMG into NYSE-listed "New UMG"', acquirers: [E('pershing-square')], sellers: [E('umg')],
    value: 64.4e9, valueNote: '€55.8B; €5.05 cash + 0.77 New UMG shares per share; 78% premium', summary: 'Non-binding; needs two-thirds shareholder vote; Michael Ovitz proposed as chair; targeted close end-2026. Outcome not confirmed as of 2026-09-14.',
    sources: [src('Pershing Square — proposal (Apr 2026)', 'https://www.businesswire.com/news/home/20260406138476/en/Pershing-Square-Announces-Proposal-to-Universal-Music-Group-N.V.'), src('CNBC (7 Apr 2026)', 'https://www.cnbc.com/2026/04/07/umg-pershing-square-merger-bil-ackman-universal-music.html')], verify: true },
  { id: 'seeker-abs-2026', date: '2026-03-24', type: 'abs', asset: 'both', structure: 'abs',
    title: 'Seeker Music Group closes inaugural $267M ABS', acquirers: [P('ABS investors', 'fund')], sellers: [E('seeker-music')],
    value: 267e6, summary: '19,000+ copyrights and masters; arranged by M&G structured finance; rated by Fitch, KBRA, and S&P.',
    abs: { issuer: 'Seeker Music', series: '2026-1', rating: 'Fitch / KBRA / S&P (levels not disclosed)', arrangers: ['M&G'], collateral: '19,000+ copyrights and master recordings' },
    sources: [mbw('Seeker Music Group closes $267M ABS')] },
  { id: 'eventbrite-bendingspoons-2026', date: '2026-03-10', type: 'take-private', asset: 'equity', structure: 'cash',
    title: 'Bending Spoons takes Eventbrite private', acquirers: [E('bending-spoons')], sellers: [E('eventbrite')],
    value: 500e6, valueNote: '$4.50 per share', summary: 'LOI Aug 2025, merger agreement Dec 2025, closed 10 Mar 2026; delisted from NYSE.',
    sources: [src('TicketNews — closing (Mar 2026)', 'https://www.ticketnews.com/2026/03/bending-spoons-finalizes-purchase-of-eventbrite/')] },
  { id: 'downtown-umg-2026', date: '2026-02-20', type: 'm&a', asset: 'n/a', structure: 'cash',
    title: 'UMG / Virgin Music Group completes $775M acquisition of Downtown Music Holdings', acquirers: [E('umg'), E('virgin-music-group')], sellers: [E('downtown')],
    value: 775e6, summary: 'Announced Dec 2024; EU phase-2 review from Jul 2025, statement of objections Nov 2025, conditional clearance Feb 2026 requiring divestiture of Curve Royalty Systems (sold to Jamen Capital and Merlin, closed Aug 2026).',
    sources: [src('Variety — completion (Feb 2026)', 'https://variety.com/2026/music/news/universal-virgin-music-complete-775-million-acquisition-downtown-1236668336/'), src('European Commission — conditional approval', 'https://ec.europa.eu/commission/presscorner/detail/en/ip_26_385')] },

  // ── 2025 ─────────────────────────────────────────────────────────────────
  { id: 'suno-seriesc-2025', date: '2025-11', type: 'pe-round', asset: 'equity', structure: 'equity',
    title: 'Suno raises $250M Series C led by Menlo Ventures', acquirers: [P('Menlo Ventures and others', 'fund')], sellers: [E('suno')],
    value: 250e6, summary: 'Raised while litigating with UMG and Sony; days before the Warner settlement.',
    sources: [mbw('Suno Series C Menlo')], verify: true },
  { id: 'liveNation-ocesa-2025', date: '2025-08-19', type: 'm&a', asset: 'equity', structure: 'cash',
    title: 'Live Nation raises OCESA stake to 75%', acquirers: [E('live-nation')], sellers: [P('Grupo CIE', 'company')],
    value: 646e6, summary: 'Additional 24% of Mexico\'s dominant promoter (initial 51% for $444M, Dec 2021); CIE keeps 25% with a put to 2032.',
    sources: [mbw('Live Nation $646 million OCESA'), src('Live Nation 8-K (Aug 2025)', 'https://www.sec.gov/Archives/edgar/data/1335258/000133525825000132/lyv-20250819.htm')] },
  { id: 'sesac-wbs-2025', date: '2025-07-31', type: 'abs', asset: 'n/a', structure: 'wbs',
    title: 'SESAC Music Group closes $889M whole-business securitisation', acquirers: [P('ABS investors', 'fund')], sellers: [E('sesac'), E('blackstone')],
    value: 889e6, summary: 'Five-year senior notes backed by substantially all of SESAC\'s assets and revenues; fourth ABS trip; three times oversubscribed; ~$1.1B total debt.',
    abs: { issuer: 'SESAC Music Group', series: '2025 WBS', rating: '144A rated (levels not disclosed)', arrangers: [], collateral: 'Performing Rights and Music Services divisions — whole business', notes: 'Largest rated music-sector WBS.' },
    sources: [mbw('SESAC raises $889m whole business securitization')] },
  { id: 'concord-abs-2025', date: '2025-07-22', type: 'abs', asset: 'both', structure: 'abs',
    title: 'Concord closes $1.765B ABS', acquirers: [P('ABS investors', 'fund')], sellers: [E('concord')],
    value: 1.765e9, summary: 'Described as the largest and longest-tenured asset-backed term securitisation of music rights; funds continued acquisitions ahead of the BMG combination.',
    abs: { issuer: 'Concord Music Royalties, LLC', series: '2025-1', rating: 'not disclosed in press', arrangers: [], collateral: '1M+ compositions and masters' },
    sources: [src('BusinessWire — Concord closes $1.765B ABS (Jul 2025)', 'https://www.businesswire.com/news/home/20250722826534/en/Concord-Closes-%241.765-Billion-ABS-to-Fuel-Continued-Growth')] },
  { id: 'recognition-abs-2025', date: '2025-07-23', type: 'abs', asset: 'both', structure: 'abs',
    title: 'Recognition Music Group prices $372M ABS', acquirers: [P('ABS investors', 'fund')], sellers: [E('recognition-music-group'), E('blackstone')],
    value: 372e6, summary: 'Follow-on to Lyra 24-2 under the Blackstone-era master trust.',
    abs: { issuer: 'Lyra Music Assets (Delaware) L.P.', series: '2025 tap', rating: 'KBRA (level not disclosed)', arrangers: [], collateral: 'Recognition (ex-Hipgnosis) catalog' },
    sources: [src('Billboard — Recognition $372M ABS', 'https://www.billboard.com/pro/recognition-music-group-raising-372-million-abs/')] },
  { id: 'wmg-bain-jv-2025', date: '2025-07-01', type: 'pe-round', asset: 'both', structure: 'equity',
    title: 'Warner Music Group and Bain Capital launch $1.2B catalog joint venture', acquirers: [E('wmg'), E('bain-capital')], sellers: [],
    value: 1.2e9, summary: 'Equal equity commitments; WMG runs marketing, distribution, administration; Goldman Sachs and Fifth Third joint lead arrangers.',
    sources: [src('Bain Capital — WMG JV', 'https://www.baincapital.com/news/warner-music-group-and-bain-capital-announce-launch-joint-venture-invest-12-billion-iconic')] },
  { id: 'harbourview-abs-2025', date: '2025-06', type: 'abs', asset: 'both', structure: 'abs',
    title: 'HarbourView closes second $500M private securitisation (KKR)', acquirers: [E('kkr')], sellers: [E('harbourview')],
    value: 500e6, summary: 'KKR insurance vehicles participated; Barclays and KKR Capital Markets placement agents, Fifth Third passive placement agent.',
    abs: { issuer: 'HarbourView (private)', series: '2025', rating: 'private', arrangers: ['Barclays', 'KKR Capital Markets'], collateral: 'Diversified music royalty portfolio' },
    sources: [mbw('HarbourView secures $500m additional debt financing KKR')] },
  { id: 'swift-masters-2025', catalogOf: 'Taylor Swift', date: '2025-05-30', type: 'catalog-sale', asset: 'recording', structure: 'cash',
    title: 'Taylor Swift buys back her first six masters from Shamrock Capital', acquirers: [P('Taylor Swift', 'artist')], sellers: [E('shamrock-capital')],
    value: 360e6, valueNote: '~$360M reported by Billboard; not confirmed by either party. Shamrock paid a reported ~$300–405M in 2020.',
    summary: 'Includes videos, concert films, unreleased songs, and artwork; the re-recording strategy had eroded the original catalog\'s value.',
    sources: [src('Billboard — Swift regains masters', 'https://www.billboard.com/pro/taylor-swift-regains-control-master-recordings-shamrock/')], verify: true },
  { id: 'litmus-abs-2025', date: '2025-05', type: 'abs', asset: 'both', structure: 'abs',
    title: 'Litmus Music (Carlyle) issues $464M music-royalty bonds', acquirers: [P('Insurers and asset managers', 'fund')], sellers: [E('litmus-music'), E('carlyle')],
    value: 464e6, summary: 'Katy Perry, Keith Urban, Benny Blanco rights; three times oversubscribed.',
    abs: { issuer: 'Litmus Music', series: '2025-1', rating: 'not disclosed in press', arrangers: [], collateral: 'Litmus catalog', catalogValue: 750e6, ard: '2030', finalMaturity: '2065', notes: '40-year final, 5-year anticipated repayment.' },
    sources: [mbw('Carlyle nears $464m bond sale Litmus')], verify: true },
  { id: 'goldstate-2025', date: '2025-04-17', type: 'debt', asset: 'both', structure: 'debt',
    title: 'GoldState Music raises $500M in strategic capital (Northleaf, Ares)', acquirers: [E('northleaf'), E('ares')], sellers: [E('goldstate-music')],
    value: 500e6, summary: 'Structured capital facility co-led by Northleaf and Ares plus separately raised leverage, to buy music rights.',
    sources: [src('BusinessWire — GoldState (Apr 2025)', 'https://www.businesswire.com/news/home/20250417165307/en/')] },
  { id: 'pershing-umg-sale-2025', date: '2025-03', type: 'pe-round', asset: 'equity', structure: 'equity',
    title: 'Pershing Square sells 2.7% of UMG', acquirers: [P('Institutional investors', 'fund')], sellers: [E('pershing-square')],
    value: 1.4e9, summary: 'Partial exit ahead of pushing for a US listing.',
    sources: [mbw('Pershing Square sells UMG stake 2025')], verify: true },
  { id: 'wmg-tempo-2025', date: '2025-02-06', type: 'm&a', asset: 'both', structure: 'cash',
    title: 'Warner Music Group acquires 50.1% of Tempo Music Investments from Providence', acquirers: [E('wmg')], sellers: [E('providence-equity')],
    value: 76e6, valueNote: '~$76M for 50.1%; option on the remaining 49.9% for ~$73M by Nov 2027', summary: 'Tempo launched by Providence and WMG in 2019 (Bruno Mars, Twenty One Pilots, Adele shares).',
    sources: [src('WMG — Tempo (Feb 2025)', 'https://www.prnewswire.com/news-releases/warner-music-group-acquires-controlling-stake-in-tempo-music-302370052.html')] },
  { id: 'influence-abs-2025', date: '2025-01-30', type: 'abs', asset: 'both', structure: 'abs',
    title: 'Influence Media Partners raises ~$360M in inaugural private securitisation', acquirers: [P('Nuveen, PPM America, Aflac, Pacific Life, HPS accounts', 'fund')], sellers: [E('influence-media')],
    value: 360e6, summary: 'Goldman Sachs and Truist co-structuring and joint placement agents; BlackRock joint placement agent.',
    abs: { issuer: 'Influence Media Partners (private)', series: '2025-1', rating: 'private', arrangers: ['Goldman Sachs', 'Truist', 'BlackRock'], collateral: 'Portion of the Influence portfolio (Future, Enrique Iglesias, Blake Shelton)' },
    sources: [src('BusinessWire — Influence Media (Jan 2025)', 'https://www.businesswire.com/news/home/20250130732128/en/')] },

  // ── 2024 ─────────────────────────────────────────────────────────────────
  { id: 'shamrock-funds-2024', date: '2024-11', type: 'pe-round', asset: 'both', structure: 'equity',
    title: 'Shamrock Capital closes two content funds totalling $1.6B', acquirers: [P('Limited partners', 'fund')], sellers: [E('shamrock-capital')],
    value: 1.6e9, summary: 'Content fund capital for music, film, and TV rights.',
    sources: [mbw('biggest music business deals of 2024')] },
  { id: 'lyra-24-2-abs-2024', date: '2024-11-11', type: 'abs', asset: 'both', structure: 'abs',
    title: 'Hipgnosis / Blackstone prices $1.47B master-trust ABS (Lyra 24-2)', acquirers: [P('25 ABS investors', 'fund')], sellers: [E('recognition-music-group'), E('blackstone')],
    value: 1.47e9, summary: 'Backed by the $2.36B portfolio (138 catalogs, 45,000+ songs); one of the largest music ABS ever.',
    abs: { issuer: 'Lyra Music Assets (Delaware) L.P.', series: '24-2', rating: 'KBRA A-', arrangers: ['MUFG (structuring)', 'Barclays', 'Goldman Sachs', 'Fifth Third', 'SMBC Nikko'], collateral: '45,000+ songs, 138 catalogs', catalogValue: 2.36e9 },
    sources: [src('Blackstone — landmark music ABS for Hipgnosis', 'https://www.blackstone.com/news/press/blackstone-leads-landmark-music-abs-transaction-hipgnosis/'), mbw('Hipgnosis $1.47bn ABS')] },
  { id: 'hf-gmr-2024', date: '2024-10-05', type: 'pe-round', asset: 'equity', structure: 'equity',
    title: 'Hellman & Friedman buys control of Global Music Rights', acquirers: [E('hellman-friedman')], sellers: [P('TPG and the Azoff Company (part)', 'fund')],
    value: 3.3e9, valueNote: '$3.3B valuation; H&F now ~90%', summary: 'Largest music deal of 2024.',
    sources: [src('Billboard — GMR ownership changes hands', 'https://www.billboard.com/pro/global-music-rights-majority-ownership-changes-hands/'), mbw('Hellman Friedman GMR')] },
  { id: 'concord-abs-2024', date: '2024-10', type: 'abs', asset: 'both', structure: 'abs',
    title: 'Concord Music Royalties Series 2024-1 — $850M', acquirers: [P('ABS investors', 'fund')], sellers: [E('concord')],
    value: 850e6, summary: 'Refinanced the $500M Series 2023-1 in full and funded ~$217M of new collateral (a Latin catalog); 1M+ songs incl. Beatles, Rolling Stones, R.E.M., Genesis shares.',
    abs: { issuer: 'Concord Music Royalties, LLC', series: '2024-1', rating: 'KBRA A+ / Moody\'s A2', arrangers: [], collateral: '1M+ compositions and masters' },
    sources: [src('KBRA — Concord Series 2024-1 pre-sale (Oct 2024)', 'https://www.kbra.com/publications/brgykpLc/kbra-assigns-a-preliminary-rating-to-concord-music-royalties-llc-series-2024-1'), mbw('Concord $850m ABS')] },
  { id: 'pinkfloyd-sony-2024', catalogOf: 'Pink Floyd', date: '2024-10', type: 'catalog-sale', asset: 'recording', structure: 'cash',
    title: 'Sony Music acquires Pink Floyd\'s recorded music and name-and-likeness rights', acquirers: [E('sony-music-entertainment')], sellers: [P('Pink Floyd members and estates', 'artist')],
    value: 400e6, valueNote: '~$400M reported', summary: 'Recordings, merchandise, theatrical, and artwork rights; songwriting excluded (retained by the writers).',
    sources: [src('Variety — Pink Floyd $400M', 'https://variety.com/2024/music/news/pink-floyd-sells-music-rights-to-sony-400-million-1236165925/'), mbw('Pink Floyd Sony')], verify: true },
  { id: 'hipgnosis-blackstone-2024', date: '2024-07-29', type: 'take-private', asset: 'both', structure: 'equity',
    title: 'Blackstone takes Hipgnosis Songs Fund private', acquirers: [E('blackstone')], sellers: [E('hipgnosis-songs-fund')],
    value: 1.584e9, valueNote: '$1.31 per share; 99.97% approval', summary: 'Won a contest with Concord after the 2023 continuation-vote revolt; effective 29 Jul 2024. Combined with Hipgnosis Songs Capital → Recognition Music Group (Mar 2025).',
    sources: [mbw('Done deal Blackstone Hipgnosis Songs Fund'), src('Digital Music News — $1.31 offer', 'https://www.digitalmusicnews.com/2024/06/03/hipgnosis-songs-fund-blackstone-revised-offer/')] },
  { id: 'apollo-sony-2024', date: '2024-07', type: 'pe-round', asset: 'equity', structure: 'equity',
    title: 'Apollo makes ~$700M capital investment into Sony Music Group', acquirers: [E('apollo')], sellers: [E('sony-music-group')],
    value: 700e6, summary: 'Reported capital investment to fund catalog acquisitions.',
    sources: [mbw('Apollo Sony Music Group $700 million')], verify: true },
  { id: 'queen-sony-2024', catalogOf: 'Queen', date: '2024-06', type: 'catalog-sale', asset: 'both', structure: 'cash',
    title: 'Sony Music acquires Queen\'s catalog', acquirers: [E('sony-music-entertainment')], sellers: [P('Queen (Brian May, Roger Taylor, John Deacon, Mercury estate)', 'artist')],
    value: 1.27e9, valueNote: '~$1.27B reported', summary: 'Recordings, publishing, and name-and-likeness; live income excluded. Disney/UMG keep North American distribution permanently; rest-of-world distribution moves from UMG in 2026–27.',
    sources: [mbw('Queen catalog Sony 1.27bn'), src('Variety — Queen catalog', 'https://variety.com/2024/music/news/queen-catalog-acquired-by-sony-music-1-billion-1236042619')], verify: true },
  { id: 'superstruct-kkr-2024', date: '2024-06', type: 'm&a', asset: 'equity', structure: 'equity',
    title: 'KKR acquires Superstruct Entertainment from Providence', acquirers: [E('kkr')], sellers: [E('providence-equity')],
    value: 1.39e9, summary: '80+ festivals (Sziget, Wacken, Sónar).',
    sources: [mbw('KKR Superstruct')], verify: true },
  { id: 'seetickets-cts-2024', date: '2024-06-06', type: 'm&a', asset: 'n/a', structure: 'cash',
    title: 'CTS Eventim acquires Vivendi\'s See Tickets and festivals', acquirers: [E('cts-eventim')], sellers: [E('vivendi')],
    value: 323e6, valueNote: '~€300M enterprise value', summary: 'See Tickets (UK, Europe, US) plus Kite, Love Supreme, Junction 2; L\'Olympia and See Tickets France excluded.',
    sources: [src('Vivendi — completion', 'https://www.vivendi.com/en/press-release/completion-of-the-sale-of-vivendis-festival-and-international-ticketing-activities-to-cts-eventim/'), mbw('CTS Eventim completes $323M acquisition')] },
  { id: 'believe-consortium-2024', date: '2024-06', type: 'take-private', asset: 'equity', structure: 'equity',
    title: 'Ladegaillerie / EQT / TCV consortium takes control of Believe', acquirers: [P('Upbeat BidCo (Ladegaillerie, EQT, TCV)', 'fund')], sellers: [E('believe')],
    value: 1.54e9, valueNote: '€1.54B valuation at €15.30; squeeze-out at €17.20 (~€1.73B) completed Jul 2025', summary: '71.9% block then tender offer; delisted from Euronext Paris 22 Jul 2025.',
    sources: [mbw('Believe consortium squeeze-out'), src('Euronext — offer increase (Jun 2025)', 'https://live.euronext.com/en/products/equities/company-news/2025-06-04-increase-price-public-buyout-offer-followed-squeeze-out')] },
  { id: 'kobalt-abs-2024', date: '2024-03', type: 'abs', asset: 'publishing', structure: 'abs',
    title: 'Kobalt debuts in the ABS market with $266.5M', acquirers: [P('ABS investors', 'fund')], sellers: [E('kobalt')],
    value: 266.5e6, summary: '5,000+ works from 66 writers; single class A-2 tranche rated A- by KBRA; expected final maturity April 2064.',
    abs: { issuer: 'Kobalt Music Group', series: '2024-1', rating: 'KBRA A- (class A-2)', arrangers: [], collateral: '5,000+ works, 66 writers', catalogValue: 410e6, finalMaturity: '2064-04', notes: 'Catalog valued at $410M as of 30 Sep 2023.' },
    sources: [src('Asset Securitization Report — Kobalt debuts', 'https://asreport.americanbanker.com/news/kobalt-debuts-on-the-abs-market-selling-266-5-million')] },
  { id: 'harbourview-abs-2024', date: '2024-03-12', type: 'abs', asset: 'both', structure: 'abs',
    title: 'HarbourView secures ~$500M via private securitisation led by KKR', acquirers: [E('kkr')], sellers: [E('harbourview')],
    value: 500e6, summary: 'KKR insurance vehicles led; Kuvare Asset Management accounts participated.',
    abs: { issuer: 'HarbourView (private)', series: '2024', rating: 'private', arrangers: [], collateral: 'Diversified music royalty catalog' },
    sources: [src('BusinessWire — HarbourView (Mar 2024)', 'https://www.businesswire.com/news/home/20240312879600/en/')] },
  { id: 'chord-umg-2024', date: '2024-02-20', type: 'pe-round', asset: 'both', structure: 'equity',
    title: 'UMG buys 25.8% of Chord Music Partners as KKR exits', acquirers: [E('umg'), E('dundee-partners')], sellers: [E('kkr')],
    value: 240e6, valueNote: '$240M for 25.8%; ~$1.85B enterprise value incl. debt', summary: 'Dundee-led consortium took the other 74.2%; UMG–Dundee strategic partnership to manage and acquire music IP. Searchlight Capital joined later.',
    sources: [src('UMG — minority stake in Chord', 'https://www.prnewswire.com/news-releases/universal-music-group-acquires-minority-stake-in-chord-music-partners-302066313.html'), src('Latham — KKR sale', 'https://www.lw.com/en/news/2024/02/latham-watkins-advises-kkr-in-sale-of-majority-stake-in-chord-music-partners')] },
  { id: 'bmi-newmountain-2024', date: '2024-02', type: 'm&a', asset: 'equity', structure: 'equity',
    title: 'New Mountain Capital acquires BMI (with CPP Investments)', acquirers: [E('new-mountain')], sellers: [P('BMI broadcaster shareholders', 'company')],
    value: 1.4e9, valueNote: 'undisclosed; ~$1.4B reported; $100M of proceeds shared with affiliates', summary: 'First PE ownership of a US PRO.',
    sources: [src('BMI — New Mountain investment', 'https://www.bmi.com/press/entry/589223'), mbw('biggest music business deals of 2024')], verify: true },
  { id: 'iconic-hps-2024', date: '2024-02-15', type: 'debt', asset: 'both', structure: 'debt',
    title: 'Iconic Artists Group secures access to $1B (HPS strategic investment + senior debt)', acquirers: [E('hps')], sellers: [E('iconic-artists')],
    value: 1e9, summary: 'Announced alongside the Rod Stewart catalog deal (~$100M).',
    sources: [mbw('Iconic Artists Group raises $1bn Rod Stewart')] },
  { id: 'rodstewart-iconic-2024', catalogOf: 'Rod Stewart', date: '2024-02', type: 'catalog-sale', asset: 'both', structure: 'cash',
    title: 'Iconic Artists Group acquires Rod Stewart\'s catalog interests', acquirers: [E('iconic-artists')], sellers: [P('Rod Stewart', 'artist')],
    value: 100e6, valueNote: '~$100M reported', summary: 'Cross-media partnership across six decades of recordings and songs.',
    sources: [mbw('Rod Stewart Iconic Artists Group')], verify: true },
  { id: 'mj-estate-sony-2024', catalogOf: 'Michael Jackson estate', date: '2024-02', type: 'catalog-sale', asset: 'both', structure: 'cash',
    title: 'Sony Music acquires ~half of the Michael Jackson estate\'s music interests', acquirers: [E('sony-music-group')], sellers: [P('Michael Jackson estate', 'estate')],
    value: 600e6, valueNote: '$600M+ reported (Feb 2024); MBW\'s 2024 list cites $750M', summary: 'Recordings and publishing interests plus Mijac; values the catalog at $1.2B+.',
    sources: [mbw('Michael Jackson estate Sony'), src('Rolling Stone — Queen sale context', 'https://www.rollingstone.com/music/music-news/queen-catalog-sony-billion-dollars-1235043145/')], verify: true },

  // ── 2019–2023 ────────────────────────────────────────────────────────────
  { id: 'roundhill-concord-2023', date: '2023-11', type: 'take-private', asset: 'both', structure: 'equity',
    title: 'Concord acquires Round Hill Music Royalty Fund', acquirers: [E('concord')], sellers: [E('round-hill')],
    value: 469e6, valueNote: '$1.15 per share', summary: 'LSE-listed fund taken private via Alchemy Copyrights.',
    sources: [mbw('Round Hill Music Royalty Fund Concord')] },
  { id: 'concord-abs-2023', date: '2023-10-24', type: 'abs', asset: 'both', structure: 'abs',
    title: 'Concord Music Royalties Series 2023-1 — $500M', acquirers: [P('ABS investors', 'fund')], sellers: [E('concord')],
    value: 500e6, summary: 'Second series under the 2022 master issuer; fully redeemed by Series 2024-1.',
    abs: { issuer: 'Concord Music Royalties, LLC', series: '2023-1', rating: 'KBRA (withdrawn on redemption)', arrangers: [], collateral: '1M+ compositions and masters', notes: 'Repaid in full Oct 2024.' },
    sources: [src('KBRA — Concord Series 2023-1 rating report', 'https://www.kbra.com/publications/PvzpWHYn')] },
  { id: 'katy-perry-litmus-2023', catalogOf: 'Katy Perry', date: '2023-09', type: 'catalog-sale', asset: 'both', structure: 'cash',
    title: 'Litmus Music acquires Katy Perry\'s catalog rights', acquirers: [E('litmus-music')], sellers: [P('Katy Perry', 'artist')],
    value: 225e6, summary: 'Master and publishing rights to five albums (2008–2020).',
    sources: [mbw('Katy Perry Litmus')] },
  { id: 'bandcamp-songtradr-2023', date: '2023-09', type: 'm&a', asset: 'n/a', structure: 'cash',
    title: 'Songtradr acquires Bandcamp from Epic Games', acquirers: [E('songtradr')], sellers: [P('Epic Games', 'company')],
    value: null, valueNote: 'undisclosed', summary: 'Epic exited after 18 months; Songtradr cut roughly half of Bandcamp staff.',
    sources: [mbw('Bandcamp Songtradr')] },
  { id: 'concord-abs-2022', date: '2022-12-08', type: 'abs', asset: 'both', structure: 'abs',
    title: 'Concord prices $1.8B music-royalty ABS (Apollo-led)', acquirers: [E('apollo')], sellers: [E('concord')],
    value: 1.8e9, summary: 'Largest music securitisation at the time: 1M+ copyrights (Genesis, R.E.M., Rodgers & Hammerstein). Apollo Capital Solutions structured and led the syndicate; JP Morgan co-structuring agent.',
    abs: { issuer: 'Concord Music Royalties, LLC', series: '2022-1', rating: 'KBRA (senior notes)', arrangers: ['Apollo Capital Solutions', 'JP Morgan'], collateral: '1M+ compositions and masters' },
    sources: [src('Apollo — Concord prices $1.8B ABS (Dec 2022)', 'https://www.apollo.com/media/press-releases/2022/12-08-2022')] },
  { id: 'genesis-concord-2022', catalogOf: 'Genesis · Phil Collins', date: '2022-09', type: 'catalog-sale', asset: 'both', structure: 'cash',
    title: 'Concord acquires Genesis, Phil Collins, Tony Banks, Mike Rutherford catalog', acquirers: [E('concord')], sellers: [P('Genesis and members', 'artist')],
    value: 300e6, valueNote: '~$300M reported', summary: 'Publishing plus recorded-music royalty interests.',
    sources: [mbw('Genesis Concord catalog')], verify: true },
  { id: 'primary-wave-brookfield-2022', date: '2022-10', type: 'pe-round', asset: 'both', structure: 'equity',
    title: 'Brookfield commits $1.7B to Primary Wave and takes an equity stake', acquirers: [E('brookfield')], sellers: [E('primary-wave')],
    value: 1.7e9, summary: 'Permanent-capital partnership for legacy-catalog acquisitions; still being deployed in 2026.',
    sources: [mbw('Primary Wave Brookfield')] },
  { id: 'hipgnosis-abs-2022', date: '2022-08', type: 'abs', asset: 'publishing', structure: 'abs',
    title: 'Hipgnosis Music Assets 2022-1 — $221.65M', acquirers: [P('ABS investors', 'fund')], sellers: [E('recognition-music-group'), E('blackstone')],
    value: 221.65e6, summary: 'First Hipgnosis securitisation: 950+ songs across five sub-catalogs (Justin Timberlake, Nelly Furtado, Leonard Cohen).',
    abs: { issuer: 'Hipgnosis Music Assets 2022-1 L.P.', series: '2022-1', rating: 'KBRA (affirmed)', arrangers: [], collateral: '950+ songs, 5 sub-catalogs' },
    sources: [src('KBRA — Hipgnosis Music Assets 2022-1', 'https://www.kbra.com/publications/DTmpBSgB/kbra-affirms-rating-for-hipgnosis-music-assets-2022-1-l-p')] },
  { id: 'sting-umpg-2022', catalogOf: 'Sting', date: '2022-02', type: 'catalog-sale', asset: 'publishing', structure: 'cash',
    title: 'UMPG acquires Sting\'s songwriting catalog', acquirers: [E('umpg')], sellers: [P('Sting', 'artist')],
    value: 300e6, valueNote: '~$300M reported', summary: 'Solo and Police compositions.',
    sources: [mbw('Sting Universal Music Publishing')], verify: true },
  { id: 'chord-hifi-abs-2022', date: '2022-02', type: 'abs', asset: 'both', structure: 'abs',
    title: 'Chord Music Partners issues $732.5M ABS (Hi-Fi Music IP Issuer)', acquirers: [P('ABS investors', 'fund')], sellers: [E('chord-music-partners'), E('kkr')],
    value: 732.5e6, summary: '65,000+ compositions and masters (The Weeknd, Maroon 5, Childish Gambino, Dua Lipa); issued while KKR held the majority.',
    abs: { issuer: 'Hi-Fi Music IP Issuer', series: '2022-1', rating: 'KBRA', arrangers: [], collateral: '65,000+ compositions and masters' },
    sources: [src('Asset Securitization Report — Chord $500M / Hi-Fi background', 'https://asreport.americanbanker.com/news/music-royalty-revenue-supports-chord-musics-500-million-in-abs')] },
  { id: 'dylan-sony-2022', catalogOf: 'Bob Dylan', date: '2022-01', type: 'catalog-sale', asset: 'recording', structure: 'cash',
    title: 'Sony Music acquires Bob Dylan\'s recorded-music catalog', acquirers: [E('sony-music-entertainment')], sellers: [P('Bob Dylan', 'artist')],
    value: 200e6, valueNote: '~$200M reported', summary: 'Recordings sold separately from publishing, to Dylan\'s long-time label.',
    sources: [mbw('Bob Dylan Sony recorded catalog')], verify: true },
  { id: 'springsteen-sony-2021', catalogOf: 'Bruce Springsteen', date: '2021-12', type: 'catalog-sale', asset: 'both', structure: 'cash',
    title: 'Sony Music acquires Bruce Springsteen\'s recordings and publishing', acquirers: [E('sony-music-group')], sellers: [P('Bruce Springsteen', 'artist')],
    value: 500e6, valueNote: '$500M+ reported', summary: 'Largest single-artist transaction at the time.',
    sources: [mbw('Springsteen Sony 500 million')], verify: true },
  { id: 'kobalt-fund-kkr-2021', date: '2021-10', type: 'pe-round', asset: 'both', structure: 'equity',
    title: 'KKR and Dundee Partners acquire Kobalt\'s KMR Music Royalties II', acquirers: [E('kkr'), E('dundee-partners')], sellers: [E('kobalt-capital')],
    value: 1.1e9, summary: 'Became Chord Music Partners.',
    sources: [mbw('KKR Kobalt Music Royalties')], verify: true },
  { id: 'hipgnosis-capital-2021', date: '2021-10', type: 'pe-round', asset: 'both', structure: 'equity',
    title: 'Blackstone and Hipgnosis Song Management launch Hipgnosis Songs Capital', acquirers: [E('blackstone')], sellers: [],
    value: 1e9, valueNote: '$1B initial commitment; $700M+ deployed by 2024', summary: 'Private vehicle alongside the listed fund; later the acquirer of it.',
    sources: [mbw('Hipgnosis Songs Capital Blackstone')] },
  { id: 'awal-sony-2021', date: '2021-05', type: 'm&a', asset: 'recording', structure: 'cash',
    title: 'Sony Music acquires AWAL and Kobalt Neighbouring Rights', acquirers: [E('sony-music-entertainment')], sellers: [E('kobalt')],
    value: 430e6, summary: 'Cleared by the UK CMA in March 2022 after a phase-2 review.',
    sources: [mbw('AWAL Sony CMA')] },
  { id: 'dylan-umpg-2020', catalogOf: 'Bob Dylan', date: '2020-12', type: 'catalog-sale', asset: 'publishing', structure: 'cash',
    title: 'UMPG acquires Bob Dylan\'s songwriting catalog', acquirers: [E('umpg')], sellers: [P('Bob Dylan', 'artist')],
    value: 300e6, valueNote: '$300M+ reported (some reports up to $400M)', summary: 'The deal that opened the superstar-catalog cycle: 600+ songs.',
    sources: [mbw('Bob Dylan Universal Music Publishing')], verify: true },
  { id: 'swift-shamrock-2020', catalogOf: 'Taylor Swift', date: '2020-11', type: 'catalog-sale', asset: 'recording', structure: 'cash',
    title: 'Shamrock Capital buys Taylor Swift\'s first six masters from Ithaca Holdings', acquirers: [E('shamrock-capital')], sellers: [P('Ithaca Holdings (Scooter Braun)', 'company')],
    value: 405e6, valueNote: 'reported ~$300–405M', summary: 'Ithaca had bought Big Machine (with the masters) in 2019 for ~$300M; Swift bought them back in 2025.',
    sources: [src('Axios — Scooter Braun sells Swift masters to Shamrock', 'https://www.axios.com/scoop-scooter-braun-sells-taylor-swift-masters-to-shamrock-capital-bc95f814-4411-4dcc-9922-13e94ff10472.html')], verify: true },
  { id: 'pandora-siriusxm-2019', date: '2019-02', type: 'm&a', asset: 'n/a', structure: 'equity',
    title: 'SiriusXM acquires Pandora', acquirers: [E('siriusxm')], sellers: [E('pandora')],
    value: 3.5e9, summary: 'All-stock; created the largest US audio-entertainment company.',
    sources: [mbw('SiriusXM Pandora 3.5 billion')] },
]

const TX_DEFAULTS = { catalogOf: '', status: 'closed', value: null, valueNote: '', currency: 'USD', summary: '', sources: [], verify: false, asOf: AS_OF, acquirers: [], sellers: [], abs: null }

export const TRANSACTIONS = RAW.map((t) => ({ ...TX_DEFAULTS, ...t })).sort((a, b) => b.date.localeCompare(a.date))

const seen = new Set(); const dupes = TRANSACTIONS.map((t) => t.id).filter((id) => seen.has(id) || !seen.add(id))
if (dupes.length) throw new Error(`transactions.js: duplicate ids → ${dupes.join(', ')}`)

export const partyName = (p) => (p.entityId ? (getEntity(p.entityId)?.name || p.entityId) : p.name)
export const partyIds = (t) => [...t.acquirers, ...t.sellers].map((p) => p.entityId).filter(Boolean)
export const year = (t) => Number(t.date.slice(0, 4))

export const getTransaction = (id) => TRANSACTIONS.find((t) => t.id === id) || null
export const getTransactionsForEntity = (id) => TRANSACTIONS.filter((t) => partyIds(t).includes(id))
export const transactionsByType = (type) => TRANSACTIONS.filter((t) => t.type === type)
export const ABS_DEALS = TRANSACTIONS.filter((t) => t.type === 'abs')
/** Superstar catalog sales: catalog-sale deals tagged with the artist or estate (`catalogOf`). Corporate catalog M&A stays in /deals. */
export const CATALOG_SALES = TRANSACTIONS.filter((t) => t.type === 'catalog-sale' && t.catalogOf)
export const YEARS = [...new Set(TRANSACTIONS.map(year))].sort((a, b) => b - a)

/** filterTransactions({ q, type, asset, structure, year, status, entity }) — AND-ed, newest first. */
export function filterTransactions({ q = '', type = '', asset = '', structure = '', year: y = '', status = '', entity = '' } = {}) {
  const needle = q.trim().toLowerCase()
  return TRANSACTIONS.filter((t) =>
    (!needle || [t.title, t.summary, ...t.acquirers.map(partyName), ...t.sellers.map(partyName)].join(' ').toLowerCase().includes(needle)) &&
    (!type || t.type === type) && (!asset || t.asset === asset) && (!structure || t.structure === structure) &&
    (!y || String(year(t)) === String(y)) && (!status || t.status === status) && (!entity || partyIds(t).includes(entity)))
}

export const TX_TOTALS = {
  count: TRANSACTIONS.length,
  disclosed: TRANSACTIONS.filter((t) => t.value).reduce((s, t) => s + t.value, 0),
  abs: ABS_DEALS.reduce((s, t) => s + (t.value || 0), 0),
  catalog: CATALOG_SALES.reduce((s, t) => s + (t.value || 0), 0),
  byYear: Object.fromEntries(YEARS.map((yy) => [yy, TRANSACTIONS.filter((t) => year(t) === yy).length])),
}

/** Market facts for /abs — KBRA, as reported by MBW on 18 May 2026. */
export const ABS_MARKET = {
  asOf: '2026-05-18',
  ratedSince2020: 12.9e9, ratings: 81, issuers: 18,
  issuance2024: 3.3e9, issuance2025: 3.3e9, forecast2026: 2.5e9,
  note: 'KBRA has rated $12.9B of music-royalty bonds across 81 ratings and 18 issuers since 2020, and expects 2026 issuance to fall ~25% to ~$2.5B from over $3.3B in each of 2024 and 2025. Issuer count rose from 9 (2023) to 18 (2026). Precedent: the $55M David Bowie bond (1997).',
  source: mbw('KBRA rated $12.9B music royalty-backed bonds'),
}
