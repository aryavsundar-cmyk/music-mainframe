/**
 * peFunds.js — profile extension for every money-side actor, keyed by entity id.
 * The base record (name, HQ, ownership, summary, sources) lives in entities.js; this adds the
 * investment view: thesis, structure preference, portfolio (entity ids + named catalogs), exits, LP base.
 * getFundProfile(id) always returns typed defaults, so /pe/:id renders for any money-lens entity.
 */
import { ENTITIES, getEntity } from './entities.js'
import { getTransactionsForEntity } from './transactions.js'

export const FUND_KINDS = {
  'catalog-fund': { label: 'Catalog investor', blurb: 'Buys rights directly — masters, compositions, royalty streams.' },
  'pe-fund': { label: 'Sponsor', blurb: 'Owns or backs music companies; capital comes from funds, pensions, or a balance sheet.' },
  'debt-investor': { label: 'Credit / ABS', blurb: 'Lends against, arranges, or buys securitised royalty cash flows.' },
  strategic: { label: 'Strategic holder', blurb: 'Corporate or sovereign capital with a stake in the majors, DSPs, or live.' },
}

const PROFILES = {
  blackstone: { thesis: 'Build a scaled catalog platform with permanent capital, securitise it, then exit to a strategic at a premium. Executed 2021 → 2026.', structure: ['equity (platform)', 'ABS (Lyra master trust)', 'WBS (SESAC)'], portfolio: ['sesac', 'hipgnosis-songs-fund', 'recognition-music-group'], catalogs: ['Fleetwood Mac', 'Shakira', 'Red Hot Chili Peppers', 'Journey', '50 Cent'], exits: ['Recognition Music Group catalog → Sony Music Publishing, Jul 2026 (~$3.5–4B reported)'], lpBase: 'Blackstone funds (BCP, Tactical Opportunities) and insurance balance sheets' },
  kkr: { thesis: 'Own the royalty vehicle early, securitise, sell control to a strategic; then move up the stack to lending and live.', structure: ['equity (Chord, BMG 2009–13)', 'ABS (Hi-Fi 2022)', 'private securitisation lending (HarbourView)'], portfolio: ['chord-music-partners', 'harbourview', 'superstruct'], catalogs: ['The Weeknd (via Chord)', 'OneRepublic', 'John Legend'], exits: ['Chord majority → UMG + Dundee consortium, Feb 2024 (~$1.85B EV)', 'BMG 51% → Bertelsmann, 2013'], lpBase: 'KKR funds and Global Atlantic insurance vehicles' },
  apollo: { thesis: 'Structured credit: arrange and anchor the largest music ABS, back operators (HarbourView), and put balance-sheet capital into a major (Sony).', structure: ['ABS structuring and anchor (Concord 2022)', 'platform anchor (HarbourView)', 'strategic capital (Sony Music Group, 2024)'], portfolio: ['harbourview', 'concord', 'sony-music-group'], catalogs: ['Concord catalog (as ABS collateral)'], exits: [], lpBase: 'Apollo funds, Athene insurance, Redding Ridge' },
  'bain-capital': { thesis: 'Co-invest with a major that already runs marketing, distribution, and admin — buy rights, let WMG operate them.', structure: ['JV equity with WMG (up to $1.2B, 2025)'], portfolio: ['wmg'], catalogs: ['WMG–Bain JV acquisitions (2025–)'], exits: [], lpBase: 'Bain Capital funds' },
  ares: { thesis: 'Credit into music-rights buyers rather than owning catalogs directly.', structure: ['structured capital facility (GoldState, 2025, with Northleaf)'], portfolio: ['goldstate-music'], catalogs: [], exits: [], lpBase: 'Ares credit funds' },
  carlyle: { thesis: 'Carlyle Global Credit seeds an operator (Litmus) and refinances via long-dated bonds.', structure: ['credit-backed platform ($500M launch)', 'ABS ($464M, 2025)'], portfolio: ['litmus-music'], catalogs: ['Katy Perry', 'Keith Urban', 'Benny Blanco'], exits: [], lpBase: 'Carlyle credit funds' },
  'hellman-friedman': { thesis: 'Own the toll booth: a boutique PRO outside the consent decrees, with pricing power on top writers.', structure: ['control equity (GMR, ~90%)'], portfolio: ['gmr'], catalogs: [], exits: [], lpBase: 'H&F Capital Partners funds' },
  'new-mountain': { thesis: 'Convert a member-style PRO into a for-profit growth business; keep the 85% payout promise.', structure: ['control equity (BMI, with CPP Investments)'], portfolio: ['bmi'], catalogs: [], exits: [], lpBase: 'New Mountain funds; CPP Investments co-invest' },
  'francisco-partners': { thesis: 'Technology-led music companies: buy, professionalise, sell in 3–4 years.', structure: ['control equity'], portfolio: ['native-instruments'], catalogs: [], exits: ['Kobalt → Primary Wave, Jul 2026 (~$1.5B reported vs ~$750M entry, 2022)'], lpBase: 'Francisco Partners funds' },
  'silver-lake': { thesis: 'Live entertainment and talent infrastructure at scale.', structure: ['control equity (Endeavor)', 'growth equity (Oak View Group)'], portfolio: ['endeavor', 'tko', 'oak-view-group'], catalogs: [], exits: [], lpBase: 'Silver Lake funds' },
  brookfield: { thesis: 'Permanent capital to a proven legacy-catalog operator.', structure: ['equity stake + $1.7B commitment (Primary Wave, 2022)'], portfolio: ['primary-wave'], catalogs: ['Bowie, Whitney Houston, James Brown, Bob Marley heirs (via Primary Wave)'], exits: [], lpBase: 'Brookfield alternatives' },
  blackrock: { thesis: 'Alternatives capital alongside a major (Warner) into contemporary catalogs; placement role in music ABS.', structure: ['co-investment vehicle (Influence Media, 2022)', 'ABS placement (Influence 2025)'], portfolio: ['influence-media', 'hps'], catalogs: ['Future, Enrique Iglesias, Blake Shelton (via Influence)'], exits: [], lpBase: 'BlackRock Alternatives' },
  'providence-equity': { thesis: 'Media assets built with strategic partners, sold to those partners or to larger sponsors.', structure: ['JV equity (Tempo, with WMG)', 'control equity (Superstruct)'], portfolio: ['tempo-music'], catalogs: [], exits: ['Superstruct → KKR, Jun 2024 (~$1.39B)', 'Tempo control → WMG, Feb 2025', 'SESAC → Blackstone, 2017'], lpBase: 'Providence funds' },
  'insight-partners': { thesis: 'Software-style growth equity in creator tools.', structure: ['majority → significant minority (DistroKid)'], portfolio: ['distrokid'], catalogs: [], exits: ['DistroKid majority → CVC, 2026 (pending)'], lpBase: 'Insight funds' },
  cvc: { thesis: 'Buy the creator-distribution toll booth at scale.', structure: ['majority equity (DistroKid, Fund IX)'], portfolio: ['distrokid'], catalogs: [], exits: [], lpBase: 'CVC Capital Partners IX' },
  'sixth-street': { thesis: 'Venue services and live infrastructure.', structure: ['control equity (Legends)'], portfolio: ['legends', 'asm-global'], catalogs: [], exits: [], lpBase: 'Sixth Street funds' },
  hps: { thesis: 'Private credit to catalog operators with senior debt alongside.', structure: ['strategic investment + senior debt (Iconic, 2024)', 'ABS investor (Influence 2025)'], portfolio: ['iconic-artists'], catalogs: ['Beach Boys, Rod Stewart, Linda Ronstadt (via Iconic)'], exits: [], lpBase: 'HPS credit funds (BlackRock-owned from 2025)' },
  'great-mountain-partners': { thesis: 'Long-hold media and entertainment assets for pension capital; realise through strategic combination.', structure: ['equity (Concord, for Michigan)', '33% of combined BMG'], portfolio: ['concord', 'bmg'], catalogs: ['Concord catalog (1.3M songs)'], exits: ['Concord → combination with BMG, Sep 2026 (~$1.16B cash + 33%)'], lpBase: 'State of Michigan Retirement Systems and GMP fund ($600M)' },
  'michigan-retirement': { thesis: 'A $25M 2010 stake in Concord that grew to ~$1.8B; realised in the 2026 BMG combination.', structure: ['direct equity via manager (Barings → GMP)'], portfolio: ['concord'], catalogs: [], exits: ['Concord → BMG combination, Sep 2026'], lpBase: 'Michigan public pensions' },
  northleaf: { thesis: 'Private-markets manager with a dedicated royalty strategy: lend to and co-invest with rights buyers.', structure: ['structured capital (GoldState, with Ares)'], portfolio: ['goldstate-music'], catalogs: [], exits: [], lpBase: 'Northleaf private credit and secondaries funds' },
  barings: { thesis: 'Historic manager of the Michigan/Concord position; music-royalty lending.', structure: ['managed equity (Concord, to ~2022)', 'private credit'], portfolio: ['concord'], catalogs: [], exits: [], lpBase: 'MassMutual' },
  pimco: { thesis: 'Allocator into esoteric ABS including music.', structure: ['ABS bonds'], portfolio: [], catalogs: [], exits: [], lpBase: 'PIMCO funds' },
  'goldman-sachs': { thesis: 'Arranger, placement agent, and lender across music ABS and JVs; growth equity in creator tools.', structure: ['ABS bookrunner (Lyra 24-2)', 'private placement (Influence 2025)', 'JV arranger (WMG–Bain)', 'growth equity (Splice)'], portfolio: ['splice'], catalogs: [], exits: [], lpBase: 'Balance sheet, Goldman Growth' },
  'shamrock-capital': { thesis: 'Content funds that buy rights across music, film, and TV; sell when the artist wants them back.', structure: ['closed-end content funds ($1.6B, 2024)'], portfolio: [], catalogs: ['Taylor Swift masters (2020–25)', 'Dr. Dre stake', 'The Chainsmokers'], exits: ['Swift masters → Taylor Swift, May 2025 (~$360M reported)'], lpBase: 'Institutional LPs' },
  'litmus-music': { thesis: 'Credit-backed buyer of both rights domains for contemporary superstars.', structure: ['Carlyle credit', 'ABS (2025)'], portfolio: [], catalogs: ['Katy Perry ($225M)', 'Keith Urban', 'Benny Blanco', 'Opetaia Foa\'i'], exits: [], lpBase: 'Carlyle Global Credit' },
  harbourview: { thesis: 'Diversified rights portfolio scaled with private securitisations.', structure: ['Apollo anchor equity', 'private ABS (KKR-led, 2024 and 2025)'], portfolio: [], catalogs: ['Slipknot (majority, 2025)', 'Fleetwood Mac (Christine McVie)', 'Wiz Khalifa'], exits: [], lpBase: 'Apollo, KKR insurance vehicles' },
  'influence-media': { thesis: 'Contemporary catalogs with a major (Warner) as operating partner.', structure: ['BlackRock + WMG vehicle (~$750M)', 'private ABS (2025)'], portfolio: [], catalogs: ['Future', 'Enrique Iglesias', 'Blake Shelton', 'Tainy', 'Julia Michaels'], exits: [], lpBase: 'BlackRock Alternatives, Warner Music' },
  'iconic-artists': { thesis: 'Legacy artists\' full IP (music, name, likeness) developed for new audiences.', structure: ['HPS strategic equity + senior debt ($1B access)'], portfolio: [], catalogs: ['Beach Boys', 'Rod Stewart', 'Linda Ronstadt', 'David Crosby', 'Graham Nash', 'Nat King Cole estate'], exits: [], lpBase: 'HPS, Azoff Company' },
  'primary-wave': { thesis: 'Buy stakes in legacy catalogs, then market them like a label; scale through funds and, from 2026, Kobalt\'s admin platform.', structure: ['closed-end funds (Fund 4, $2.225B)', 'Brookfield permanent capital ($1.7B)', 'M&A (Kobalt)'], portfolio: ['kobalt'], catalogs: ['Bowie', 'Whitney Houston', 'James Brown', 'Bob Marley heirs', 'Prince estate stake'], exits: [], lpBase: 'Brookfield; insurers, pensions, endowments, family offices' },
  'recognition-music-group': { thesis: 'The Hipgnosis catalog under Blackstone: securitise, then sell to a strategic.', structure: ['Lyra master-trust ABS'], portfolio: ['hipgnosis-songs-fund'], catalogs: ['Fleetwood Mac', 'Shakira', 'Journey', 'Neil Young (part)', 'Walter Afanasieff share of "All I Want for Christmas Is You"'], exits: ['Entire portfolio → Sony Music Publishing + GIC, Jul 2026'], lpBase: 'Blackstone (to Jul 2026)' },
  'chord-music-partners': { thesis: 'Contemporary hit catalogs run with a major (UMG) as partner; securitise repeatedly.', structure: ['UMG + Dundee consortium equity', 'ABS (Hi-Fi 2022, Canon 2026-1)'], portfolio: [], catalogs: ['The Weeknd', 'OneRepublic', 'John Legend', 'Morgan Wallen (part)', 'Suicideboys'], exits: [], lpBase: 'UMG, Dundee Partners, Searchlight Capital' },
  'round-hill': { thesis: 'Catalog owner and administrator; realised its listed fund to Concord.', structure: ['private funds', 'listed fund (to 2023)'], portfolio: [], catalogs: ['Round Hill Music Royalty Partners holdings'], exits: ['Round Hill Music Royalty Fund → Concord, Nov 2023 ($469M)'], lpBase: 'Institutional LPs' },
  'goldstate-music': { thesis: 'Music rights, growth capital, and music tech from one platform.', structure: ['structured capital (Northleaf, Ares) + leverage'], portfolio: [], catalogs: [], exits: [], lpBase: 'Northleaf, Ares' },
  'tempo-music': { thesis: 'Premium rights platform controlled by Warner.', structure: ['WMG 50.1% + option'], portfolio: [], catalogs: ['Bruno Mars (share)', 'Twenty One Pilots (share)', 'Adele (share)'], exits: [], lpBase: 'WMG, Providence (minority)' },
  pophouse: { thesis: 'Catalog + immersive experience (ABBA Voyage model).', structure: ['PE fund (~$1.3B, 2025)'], portfolio: [], catalogs: ['KISS', 'Cyndi Lauper', 'Avicii', 'Swedish House Mafia'], exits: [], lpBase: 'Institutional LPs' },
  'seeker-music': { thesis: 'Songwriter-founded catalog company financed through ABS.', structure: ['ABS ($267M, 2026)'], portfolio: [], catalogs: ['Beyoncé (shares)', 'Drake (shares)', 'Miley Cyrus', 'Joan Jett', 'One Direction'], exits: [], lpBase: 'ABS investors' },
  reservoir: { thesis: 'Listed pure-play catalog compounder; buy publishing and recorded rights with public equity and revolver.', structure: ['public equity (NASDAQ: RSVR)', 'senior credit facility'], portfolio: [], catalogs: ['Chrysalis Records', 'Tommy Boy', 'De La Soul'], exits: [], lpBase: 'Public shareholders' },
  'dundee-partners': { thesis: 'Family office as the long-hold partner in Chord.', structure: ['consortium equity (74.2% of Chord with partners)'], portfolio: ['chord-music-partners'], catalogs: [], exits: [], lpBase: 'Hendel family' },
  'kobalt-capital': { thesis: 'Royalty fund manager (wound down after the 2021 KKR sale).', structure: ['royalty funds'], portfolio: [], catalogs: [], exits: ['KMR Music Royalties II → KKR + Dundee, 2021 ($1.1B)'], lpBase: 'Institutional LPs' },
  'pershing-square': { thesis: 'Concentrated UMG position; force a US listing via a merger with its SPARC vehicle.', structure: ['public equity (~10%)', 'proposed merger (Apr 2026)'], portfolio: ['umg'], catalogs: [], exits: ['2.7% of UMG sold, Mar 2025 ($1.4B)'], lpBase: 'Pershing Square Holdings' },
  'access-industries': { thesis: 'Control of a major (Warner) plus adjacent media.', structure: ['control equity (WMG)', 'largest shareholder (Deezer)'], portfolio: ['wmg', 'deezer'], catalogs: [], exits: [], lpBase: 'Blavatnik family' },
  gic: { thesis: 'Sovereign co-investor with Sony Music Group for catalog acquisitions (2026 venture).', structure: ['investment venture with Sony Music Group'], portfolio: ['sony-music-publishing'], catalogs: ['Recognition Music Group portfolio (co-funded)'], exits: [], lpBase: 'Government of Singapore' },
  tencent: { thesis: 'Strategic stakes across the value chain (UMG consortium, Spotify cross-holding, TME control).', structure: ['consortium equity (UMG)', 'control (TME)'], portfolio: ['umg', 'tencent-music'], catalogs: [], exits: [], lpBase: 'Tencent balance sheet' },
  bollore: { thesis: 'Controlling holder of UMG through Bolloré and Vivendi.', structure: ['public equity (~28% incl. Vivendi)'], portfolio: ['umg', 'vivendi'], catalogs: [], exits: [], lpBase: 'Bolloré family' },
}

const DEFAULT = { thesis: '', structure: [], portfolio: [], catalogs: [], exits: [], lpBase: '' }

export const MONEY_TYPES = ['catalog-fund', 'pe-fund', 'debt-investor', 'strategic']
export const MONEY_ENTITIES = ENTITIES.filter((e) => MONEY_TYPES.includes(e.type) || e.roles.some((r) => ['catalog-fund', 'pe-fund', 'debt-investor'].includes(r)))

export function getFundProfile(id) {
  const e = getEntity(id)
  const p = { ...DEFAULT, ...(PROFILES[id] || {}) }
  const portfolio = p.portfolio.map(getEntity).filter(Boolean)
  const deals = e ? getTransactionsForEntity(id) : []
  return { ...p, portfolio, deals, dealVolume: deals.reduce((s, t) => s + (t.value || 0), 0), absIssued: deals.filter((t) => t.type === 'abs'), hasProfile: !!PROFILES[id] }
}

/** Money-lens entities sorted: kind order, then deal volume desc, then name. */
export function listFunds({ kind = '', q = '' } = {}) {
  const needle = q.trim().toLowerCase()
  return MONEY_ENTITIES
    .filter((e) => (!kind || e.type === kind || e.roles.includes(kind)) && (!needle || e.searchText.includes(needle)))
    .map((e) => ({ e, ...getFundProfile(e.id) }))
    .sort((a, b) => MONEY_TYPES.indexOf(kindOf(a.e)) - MONEY_TYPES.indexOf(kindOf(b.e)) || b.dealVolume - a.dealVolume || a.e.name.localeCompare(b.e.name))
}

/** The money-lens kind an entity is filed under: its type if money-typed, else its first money role. */
export const kindOf = (e) => (MONEY_TYPES.includes(e.type) ? e.type : MONEY_TYPES.find((t) => e.roles.includes(t)) || 'strategic')
