/**
 * pros.js — profile extension for every PRO / CMO / mechanical collective, keyed by entity id.
 * Base record (HQ, ownership, summary, sources) lives in entities.js; this adds the collection view:
 * scope (performance · mechanical · neighbouring), collections and distributions by year (native currency),
 * members, admin/overhead, payout policy, distribution methodology, reciprocal footprint, reform timeline.
 * getProProfile(id) returns typed defaults for any 'pro'-typed entity.
 *
 * Every figure is from the society's own report or a trade write-up of it (sourced 2026-09-14).
 * verify: true where a figure is an estimate or the society has stopped disclosing.
 */
import { ENTITIES, getEntity } from './entities.js'
import { src, mbw } from './entities/_schema.js'

export const SCOPES = {
  performance: { label: 'Performance', tone: 'publishing' },
  mechanical: { label: 'Mechanical', tone: 'publishing' },
  neighbouring: { label: 'Neighbouring rights', tone: 'recording' },
  'digital-performance': { label: 'Digital performance (statutory)', tone: 'recording' },
}
export const MODELS = {
  'member-owned': 'Member-owned, not-for-profit',
  'for-profit': 'For-profit, privately owned',
  statutory: 'Statutory collective / designated body',
}
export const REGIONS = ['US', 'UK', 'Europe', 'Asia-Pacific', 'Canada']

const PROFILES = {
  ascap: {
    region: 'US', scopes: ['performance'], model: 'member-owned', founded: 1914,
    members: 1_000_000, membersNote: '1M+ writer and publisher members',
    currency: 'USD',
    series: [{ year: 2023, collections: 1.737e9, distributions: 1.592e9 }, { year: 2024, collections: 1.835e9, distributions: 1.696e9 }, { year: 2025, collections: 1.945e9, distributions: 1.759e9 }],
    domestic2025: 1.471e9, overhead: 9.6, overheadNote: '~9.6% (2025 distributions ÷ revenue)',
    payoutPolicy: 'Not-for-profit: everything after operating costs is distributed. Writer share paid direct.',
    methodology: 'Blanket licences (radio, TV, streaming, general licensing) allocated by census data where available and sample/survey elsewhere; "follow the dollar" so each licence category pays the works performed in it. Operates under the 1941 DOJ consent decree (amended 2001): must license any applicant, rate court for disputes.',
    reciprocal: 'Reciprocal agreements with every major society; international is ~24% of revenue.',
    reforms: [
      { date: '2026-02', text: 'Reports record $1.945B revenue and $1.759B distributions for 2025 (+6%).' },
      { date: '2024-11', text: 'Launches Songview enhancements with BMI; expands AI-detection and voluntary AI licensing framework.' },
      { date: '2021-01', text: 'DOJ closes its consent-decree review without changes — decrees stay.' },
    ],
    sources: [src('ASCAP — 2025 financial results (Feb 2026)', 'https://www.ascap.com/press/2026/02/02-12-financials-release'), src('ASCAP annual report 2025', 'https://www.ascap.com/about-us/annual-report-2025')],
  },
  bmi: {
    region: 'US', scopes: ['performance'], model: 'for-profit', founded: 1939,
    members: 1_400_000, membersNote: '1.4M+ affiliates',
    currency: 'USD',
    series: [{ year: 2021, collections: 1.335e9, distributions: 1.233e9 }, { year: 2022, collections: 1.573e9, distributions: 1.471e9 }],
    seriesNote: 'BMI stopped publishing full-year financials after FY2022 (June year-end). New Mountain-era policy: pay out ~85% of licensing revenue.',
    overhead: 15, overheadNote: 'target payout 85% of revenue (post-2024)',
    payoutPolicy: 'For-profit since 2022; owned by New Mountain Capital with CPP Investments (Feb 2024). Publicly committed to distributing ~85% of licensing revenue and to no cuts in payout as a result of the sale.',
    methodology: 'Blanket licences across radio, TV, streaming, live and general; distributions by census (digital) and sample (broadcast). Operates under its DOJ consent decree; BMI rate court sets contested fees.',
    reciprocal: 'Reciprocal agreements worldwide; international via the same network as ASCAP.',
    reforms: [
      { date: '2024-02', text: 'Sale to New Mountain Capital closes; ~$100M of proceeds shared with affiliates; first PE-owned US PRO.' },
      { date: '2022-10', text: 'Converts from not-for-profit to for-profit; explores sale.' },
      { date: '2022-09', text: 'Last full disclosure: $1.573B revenue, $1.471B distributed (FY to June 2022).' },
    ],
    verify: true,
    sources: [src('BMI — New Mountain investment', 'https://www.bmi.com/press/entry/589223'), src('BMI — FY2022 record revenue', 'https://www.bmi.com/news/entry/bmi-announces-record-breaking-revenue-and-royalty-distributions')],
  },
  sesac: {
    region: 'US', scopes: ['performance', 'mechanical'], model: 'for-profit', founded: 1930,
    members: 30_000, membersNote: 'invitation-only; ~30,000 affiliates (est.)',
    currency: 'USD',
    series: [], seriesNote: 'Private; does not disclose collections. Debt: $889M WBS (Jul 2025), ~$1.1B total outstanding.',
    overhead: null,
    payoutPolicy: 'For-profit, Blackstone-owned; negotiated affiliate terms rather than a published payout ratio.',
    methodology: 'Blanket and direct licences negotiated bilaterally; outside the DOJ consent decrees but bound by 2015 (RMLC) and 2019 (TV) antitrust settlements requiring arbitration of contested rates. Also owns HFA (mechanicals), Rumblefish, and a stake in Mint (with SUISA).',
    reciprocal: 'Reciprocal agreements with major societies; smaller international footprint than ASCAP/BMI.',
    reforms: [
      { date: '2025-07', text: '$889M whole-business securitisation — fourth ABS trip, largest rated music WBS.' },
      { date: '2025-01', text: 'Blackstone reported exploring a ~$3B sale.' },
      { date: '2017-01', text: 'Blackstone buys SESAC from Rizvi Traverse (~$1B).' },
    ],
    verify: true,
    sources: [mbw('SESAC raises $889m whole business securitization')],
  },
  gmr: {
    region: 'US', scopes: ['performance'], model: 'for-profit', founded: 2013,
    members: 150, membersNote: 'boutique; ~150 elite writers (Drake, Bruce Springsteen, Pharrell, John Lennon estate)',
    currency: 'USD',
    series: [], seriesNote: 'Private; does not disclose. Valued at $3.3B in the Hellman & Friedman buy-in (Oct 2024).',
    overhead: null,
    payoutPolicy: 'Negotiated, above-market per-play rates for a curated roster; no published ratio.',
    methodology: 'Direct negotiation with radio (RMLC settlement 2022 after six years of litigation), TV, and DSPs; no consent decree, no rate court.',
    reciprocal: 'Limited; relies on sub-publishers and member deals abroad.',
    reforms: [
      { date: '2024-10', text: 'Hellman & Friedman takes ~90% at a $3.3B valuation (biggest music deal of 2024).' },
      { date: '2022-01', text: 'Settles with the Radio Music License Committee, ending the antitrust fight over radio rates.' },
    ],
    sources: [src('Billboard — GMR ownership changes hands', 'https://www.billboard.com/pro/global-music-rights-majority-ownership-changes-hands/')],
  },
  soundexchange: {
    region: 'US', scopes: ['digital-performance'], model: 'statutory', founded: 2003,
    members: 700_000, membersNote: '700K+ registered artists and rights owners (est.)',
    currency: 'USD',
    series: [{ year: 2023, collections: 1.1e9, distributions: 1.02e9 }, { year: 2024, collections: 1.1e9, distributions: 1.054e9 }, { year: 2025, collections: null, distributions: 0.9915e9 }],
    seriesNote: '2025 distributions $991.5M (−5.9%): SiriusXM subscriber decline and the end of certain webcaster minimums. $13B+ distributed since 2003.',
    overhead: 5, overheadNote: '~4–5% admin rate',
    payoutPolicy: 'Statutory split fixed by law: 50% rights owner, 45% featured artist, 5% non-featured performers (AFM & SAG-AFTRA fund). Paid direct, not through labels.',
    methodology: 'Collects the compulsory licence royalty (17 U.S.C. §114) from non-interactive digital services — satellite, webcasters, cable radio — at rates set by the Copyright Royalty Board (Web V, SDARS III); distributes by census play logs.',
    reciprocal: '50+ international agreements for neighbouring-rights collection abroad.',
    reforms: [
      { date: '2026-01', text: '2025 distributions $991.5M; cumulative passes $13B.' },
      { date: '2025-04', text: 'Web VI proceeding under way to set 2026–30 webcaster rates.' },
      { date: '2024-06', text: 'American Music Fairness Act reintroduced — would create a terrestrial radio performance right.' },
    ],
    verify: true,
    sources: [src('SoundExchange — tops $13B distribution milestone', 'https://www.soundexchange.com/news/soundexchange-tops-13b-distribution-milestone/')],
  },
  'the-mlc': {
    region: 'US', scopes: ['mechanical'], model: 'statutory', founded: 2019,
    members: 50_000, membersNote: '50K+ member publishers, administrators, and self-administered writers (est.)',
    currency: 'USD',
    series: [{ year: 2023, collections: null, distributions: 0.8e9 }, { year: 2024, collections: null, distributions: 0.9e9 }, { year: 2025, collections: null, distributions: 1.0e9 }],
    seriesNote: '$3.47B distributed cumulatively through the 2025 distribution; $4.1B+ processed. Annual splits are approximate.',
    overhead: 0, overheadNote: 'funded by DSP assessment under the MMA, not deducted from royalties',
    payoutPolicy: 'Blanket streaming mechanicals passed through at the CRB rate; unmatched royalties held then distributed by market share after the statutory holding period.',
    methodology: 'Administers the §115 blanket licence created by the Music Modernization Act (2018): DSPs report usage and pay monthly; the MLC matches to the works database and pays rights holders. Rates set by the CRB (Phonorecords IV: 15.1% → 15.35% of service revenue, 2023–27).',
    reciprocal: 'US-only mandate; foreign works matched via publishers and societies.',
    reforms: [
      { date: '2026-07', text: 'Phonorecords V proposed settlement posted for comment (2028–32); objections filed on physical/download reset to 12¢.' },
      { date: '2025-10', text: 'Amended complaint against Spotify over bundle valuation after the January dismissal of the bundling claim.' },
      { date: '2025-07', text: 'Copyright Office redesignates the MLC for a further five years.' },
      { date: '2025-01', text: 'Court rules Spotify Premium is a bundle; MLC suit dismissed with prejudice.' },
    ],
    verify: true,
    sources: [src('The MLC — annual meeting, $3B+ distributed', 'https://www.musicconnection.com/the-mlc-holds-annual-membership-meeting-highlighting-more-than-3-billion-in-royalties-distributed/'), src('Federal Register — Phonorecords V', 'https://www.federalregister.gov/documents/2026/07/10/2026-13996/determination-of-rates-and-terms-for-making-and-distributing-phonorecords-phonorecords-v')],
  },
  hfa: {
    region: 'US', scopes: ['mechanical'], model: 'for-profit', founded: 1927,
    members: 48_000, membersNote: '48K+ represented publishers (est.)',
    currency: 'USD', series: [], seriesNote: 'SESAC subsidiary; no separate disclosure.',
    overhead: null,
    payoutPolicy: 'Agency commission on licences issued; vendor to The MLC for matching services.',
    methodology: 'Issues direct mechanical licences (physical, download, non-blanket), handles legacy pre-MMA streaming licences, and runs licensing/royalty back office for DSPs.',
    reciprocal: 'n/a',
    reforms: [{ date: '2015-07', text: 'Acquired by SESAC from the NMPA.' }],
    sources: [src('HFA', 'https://www.harryfox.com')],
  },
  prs: {
    region: 'UK', scopes: ['performance', 'mechanical'], model: 'member-owned', founded: 1914,
    members: 180_000, membersNote: '180K+ members (PRS + MCPS)',
    currency: 'GBP',
    series: [{ year: 2023, collections: 1.08e9, distributions: 0.943e9 }, { year: 2024, collections: 1.152e9, distributions: 1.02e9 }, { year: 2025, collections: 1.24e9, distributions: 1.07e9 }],
    international2025: 0.42e9,
    overhead: 9, overheadNote: '~9% cost-to-income',
    payoutPolicy: 'Not-for-profit; administration deducted then distributed; live royalties paid at 4% of gross box office (since 2018).',
    methodology: 'Performing (PRS) and mechanical (MCPS) rights under one roof; public performance licensed jointly with PPL through PPL PRS Ltd; digital licensed via ICE (with GEMA and STIM). Distributes by census for digital and broadcast, setlists for live.',
    reciprocal: 'Reciprocal agreements with 100+ societies; international is the largest single source (~£420M).',
    reforms: [
      { date: '2026-04', text: 'Record 2025: £1.24B collected (+7.7%), £1.07B paid; live passes £100M for the first time.' },
      { date: '2025-09', text: 'Independent review of the live tariff and small-venue exemptions after member pushback.' },
      { date: '2023-11', text: 'GEMA/PRS/STIM ICE hub adds Suno-era AI licensing framework.' },
    ],
    sources: [src('PRS for Music — financial results 2025', 'https://www.prsformusic.com/about-us/track-record/financial-results-2025')],
  },
  ppl: {
    region: 'UK', scopes: ['neighbouring'], model: 'member-owned', founded: 1934,
    members: 160_000, membersNote: '160K+ performers and rights holders (est.)',
    currency: 'GBP',
    series: [{ year: 2023, collections: 0.285e9, distributions: null }, { year: 2024, collections: 0.3e9, distributions: null }],
    seriesNote: '2025 figures not located in this pass; 2024 ~£300M (est.).',
    overhead: 14, overheadNote: '~14% cost-to-income (est.)',
    payoutPolicy: 'Not-for-profit; 50/50 performer / rights-holder split on UK broadcast and public performance income.',
    methodology: 'Licenses broadcast and public performance of sound recordings for labels and performers; public performance via PPL PRS Ltd JV; international via bilateral agreements.',
    reciprocal: '100+ agreements; international is the fastest-growing line.',
    reforms: [{ date: '2025-06', text: 'Appointed to collect neighbouring rights for the John Lennon and Yoko Ono estates.' }],
    verify: true,
    sources: [src('PPL — news', 'https://www.ppluk.com/about-us/news/')],
  },
  gema: {
    region: 'Europe', scopes: ['performance', 'mechanical'], model: 'member-owned', founded: 1933,
    members: 95_000, membersNote: '95K+ members',
    currency: 'EUR',
    series: [{ year: 2023, collections: 1.28e9, distributions: 1.09e9 }, { year: 2024, collections: 1.33e9, distributions: 1.13e9 }, { year: 2025, collections: 1.34e9, distributions: 1.15e9 }],
    overhead: 13, overheadNote: '~13% cost rate',
    payoutPolicy: 'Not-for-profit; distributions after costs and social/cultural deductions (~10%).',
    methodology: 'Performance and mechanical in one society; digital licensed via ICE; distribution by census and sample under a member-approved distribution plan.',
    reciprocal: 'Reciprocal with all major societies.',
    reforms: [
      { date: '2026-03', text: '2025: €1.34B revenue, €1.15B distributed — narrowly above 2024 in a flat market.' },
      { date: '2025-11', text: 'Munich court rules for GEMA against OpenAI on lyrics memorisation; Suno case continues.' },
      { date: '2025-01', text: 'Files the first CMO lawsuit against an AI-music company (Suno).' },
    ],
    sources: [src('GEMA — Geschäftsbericht 2025', 'https://www.gema.de/de/w/geschaeftsbericht-2025-pressemeldung')],
  },
  sacem: {
    region: 'Europe', scopes: ['performance', 'mechanical'], model: 'member-owned', founded: 1851,
    members: 240_000, membersNote: '240K+ members; 663K rights holders paid in 2025',
    currency: 'EUR',
    series: [{ year: 2023, collections: 1.41e9, distributions: 1.2e9 }, { year: 2024, collections: 1.5e9, distributions: 1.38e9 }, { year: 2025, collections: 1.704e9, distributions: 1.502e9 }],
    international2025: 0.845e9,
    overhead: 12, overheadNote: '~12% cost rate',
    payoutPolicy: 'Not-for-profit; distributions after costs and cultural action deductions.',
    methodology: 'Performance and mechanical; large international mandate portfolio (direct digital licensing for many foreign repertoires); artist-centric partnership with Deezer for publishing rights (2025).',
    reciprocal: 'International revenue (€845M) now nearly equals France (€859M).',
    reforms: [
      { date: '2026-05', text: 'Record 2025: €1.704B collected (+21%), €1.502B distributed; international +13%.' },
      { date: '2025-01', text: 'Partners with Deezer to apply the artist-centric model to publishing royalties.' },
    ],
    sources: [mbw('Sacem paid out $1.7bn 2025'), src('Sacem — 2025 results', 'https://www.recordoftheday.com/news-and-press/2025-results-with-663000-artists-and-publishers-receiving-royalties-worldwide-sacems-international-presence-continues-to-grow-as-it-marks-its-175th-anniversary')],
  },
  siae: {
    region: 'Europe', scopes: ['performance', 'mechanical'], model: 'member-owned', founded: 1882,
    members: 100_000, membersNote: '100K+ members across music, film, literature',
    currency: 'EUR',
    series: [{ year: 2024, collections: 0.8e9, distributions: null }],
    seriesNote: 'Multi-repertoire society; music share not separately disclosed in this pass. Live concert spend in Italy passed €1.16B in 2025 (+17.5%).',
    overhead: null,
    payoutPolicy: 'Not-for-profit; member-approved distribution rules.',
    methodology: 'Multi-repertoire CMO; music monopoly ended with the 2017 reform (Soundreef entry); digital via direct and hub licences.',
    reciprocal: 'Reciprocal with major societies.',
    reforms: [{ date: '2026-06', text: 'SIAE 2025 report: 67,890 concerts, 31.5M spectators, €1.16B spend.' }],
    verify: true,
    sources: [src('ANSA — SIAE 2025 live record', 'https://www.ansa.it/sito/notizie/cultura/musica/2026/06/26/siae-2025-da-record-per-la-musica-live-i-concerti-superano-il-miliardo-di-spesa_c48435d8-636d-4cf6-8fb2-27cd16ce56bb.html')],
  },
  jasrac: {
    region: 'Asia-Pacific', scopes: ['performance', 'mechanical'], model: 'member-owned', founded: 1939,
    members: 20_000, membersNote: '~20K members; 569K foreign creators paid in FY2024',
    currency: 'JPY',
    series: [{ year: 2023, collections: 137e9, distributions: 136e9 }, { year: 2024, collections: 146e9, distributions: 145e9 }, { year: 2025, collections: 152.32e9, distributions: 151.85e9 }],
    overhead: 8, overheadNote: '~8% commission (varies by category)',
    payoutPolicy: 'Not-for-profit; commission by licence category, remainder distributed.',
    methodology: 'Blanket and per-use licences; interactive transmissions (subscription and video) now the largest growth line; concerts strong. Fiscal year to March.',
    reciprocal: 'Reciprocal with major societies; pays foreign creators directly.',
    reforms: [{ date: '2026-05', text: 'FY2025 record: ¥152.32B collected, ¥151.85B distributed — first time over ¥150B.' }],
    sources: [src('JASRAC — Fiscal 2025 business affairs', 'https://www.jasrac.or.jp/en/information/release/26/260520.html')],
  },
  komca: {
    region: 'Asia-Pacific', scopes: ['performance', 'mechanical'], model: 'member-owned', founded: 1964,
    members: 60_000, membersNote: '60K+ members (est.)',
    currency: 'KRW',
    series: [{ year: 2024, collections: 436.5e9, distributions: null }, { year: 2025, collections: 445.3e9, distributions: null }],
    seriesNote: '2025 collections ~KRW 445B (~$300M), three times 2015; overseas ~KRW 38B.',
    overhead: null,
    payoutPolicy: 'Not-for-profit; member-approved rules.',
    methodology: 'Performance and mechanical; K-pop export drives overseas collections; governance reform debate over global collection capability.',
    reciprocal: 'Reciprocal with major societies; overseas ~9% of collections.',
    reforms: [{ date: '2026-02', text: 'Chair election fought on overhauling international collection for K-pop.' }],
    verify: true,
    sources: [src('Omdia — KOMCA record collections', 'https://omdia.tech.informa.com/om138095/digital-and-live-gains-boost-komca-collections-to-a-new-record-high')],
  },
  'apra-amcos': {
    region: 'Asia-Pacific', scopes: ['performance', 'mechanical'], model: 'member-owned', founded: 1926,
    members: 125_000, membersNote: '125K+ members',
    currency: 'AUD',
    series: [{ year: 2024, collections: 740e6, distributions: null }, { year: 2025, collections: 787.9e6, distributions: null }],
    seriesNote: 'FY to June 2025: APRA $500M+ (first time), AMCOS $266.6M; digital 51.3% of revenue.',
    overhead: 12, overheadNote: '~12% expense-to-revenue (est.)',
    payoutPolicy: 'Not-for-profit; performing (APRA) and mechanical (AMCOS) distributed under member rules.',
    methodology: 'Combined Australasian society; SVOD growth notable in FY25; ACCC re-authorisation conditions on licensing conduct.',
    reciprocal: 'Reciprocal with major societies; international earnings at a record.',
    reforms: [{ date: '2025-10', text: 'Record FY25 revenue $787.9M (+6.5%).' }],
    sources: [src('APRA AMCOS — Year in Review 2025', 'https://www.apraamcos.com.au/about-us/news-and-events/year-in-review-25')],
  },
  socan: {
    region: 'Canada', scopes: ['performance', 'mechanical'], model: 'member-owned', founded: 1990,
    members: 200_000, membersNote: '200K+ members',
    currency: 'CAD',
    series: [{ year: 2023, collections: 530e6, distributions: null }, { year: 2024, collections: 559e6, distributions: null }, { year: 2025, collections: 587e6, distributions: null }],
    domestic2025: 445.5e6,
    overhead: 12, overheadNote: '~12% (est.)',
    payoutPolicy: 'Not-for-profit; performing and reproduction rights distributed under member rules.',
    methodology: 'Performing and reproduction rights; digital (C$232.8M, +11.5%) is the largest domestic line; owns MediaNet and Dataclef for back-office services.',
    reciprocal: 'International C$126M paid to members in 2025.',
    reforms: [{ date: '2026-04', text: 'Record 2025 collections C$587M (+5%); warns on generative AI.' }],
    sources: [src('SOCAN — 2025 revenue record', 'https://www.socan.com/socan-2025-revenue-hits-record-587m/')],
  },
  mri: {
    region: 'US', scopes: ['mechanical'], model: 'for-profit', founded: 1995,
    members: null, membersNote: 'service provider, not a membership society',
    currency: 'USD', series: [], seriesNote: 'Private.',
    overhead: null, payoutPolicy: 'Administration fees from DSP and broadcaster clients.',
    methodology: 'Rights administration, cue sheets, direct mechanical licensing back office; maintains Songdex.',
    reciprocal: 'n/a', reforms: [],
    sources: [src('Music Reports', 'https://www.musicreports.com')],
  },
}

const DEFAULT = { region: '', scopes: [], model: 'member-owned', members: null, membersNote: '', currency: 'USD', series: [], seriesNote: '', domestic2025: null, international2025: null, overhead: null, overheadNote: '', payoutPolicy: '', methodology: '', reciprocal: '', reforms: [], verify: false, sources: [] }

export const PRO_ENTITIES = ENTITIES.filter((e) => e.type === 'pro')

export function getProProfile(id) {
  const e = getEntity(id)
  const p = { ...DEFAULT, ...(PROFILES[id] || {}) }
  const latest = [...p.series].reverse().find((s) => s.collections) || null
  const latestDist = [...p.series].reverse().find((s) => s.distributions) || null
  const prev = latest ? p.series.find((s) => s.year === latest.year - 1) : null
  const growth = latest && prev && prev.collections ? ((latest.collections - prev.collections) / prev.collections) * 100 : null
  return { ...p, entity: e, latest, latestDist, growth, hasProfile: !!PROFILES[id], reforms: [...p.reforms].sort((a, b) => b.date.localeCompare(a.date)) }
}

/** Approximate USD conversion for cross-society ranking only (rates as of 2026-09, rounded). Never shown as the primary figure. */
export const USD_RATE = { USD: 1, GBP: 1.32, EUR: 1.17, JPY: 0.0068, KRW: 0.00072, AUD: 0.66, CAD: 0.73 }
export const toUsd = (v, cur) => (v == null ? null : v * (USD_RATE[cur] || 1))

export function listPros({ region = '', scope = '', q = '' } = {}) {
  const needle = q.trim().toLowerCase()
  return PRO_ENTITIES
    .map((e) => ({ e, ...getProProfile(e.id) }))
    .filter((r) => (!region || r.region === region) && (!scope || r.scopes.includes(scope)) && (!needle || r.e.searchText.includes(needle)))
    .sort((a, b) => (toUsd(b.latest?.collections, b.currency) || 0) - (toUsd(a.latest?.collections, a.currency) || 0) || a.e.name.localeCompare(b.e.name))
}

/** CISAC global context for the /pros header. */
export const GLOBAL_COLLECTIONS = {
  year: 2024, total: 13.97e9, music: 12.59e9, musicGrowth: 7.2, digital: 5.0e9, digitalShare: 39.8, currency: 'EUR',
  note: 'CISAC Global Collections Report 2025: creators\' royalties €13.97B in 2024 (+6.6%); music €12.59B (+7.2%), 90% of the total; digital passed €5B (+10.8%), 39.8% of music income; TV/radio 28%, live and background 26%.',
  source: src('CISAC — Global Collections Report 2025', 'https://www.cisac.org/Newsroom/news-releases/cisac-global-collections-report-2025'),
}
