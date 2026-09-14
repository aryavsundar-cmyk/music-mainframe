/**
 * consulting.js — the A&M PEPI overlay for music. Mirrors the Intelligence Hub pattern (client categories ×
 * service lines) with music-specific instantiation. An entity can sit in several categories; membership is
 * computed from entity type/roles plus explicit ids, so it stays in sync with entities.js.
 *
 * SERVICE_LINES     the five PEPI lines, each with what it means in music.
 * CLIENT_CATEGORIES seven buckets: who, why now (thesis), what triggers an engagement, the engagement
 *                   hypotheses per service line, the KPIs a deal team would ask for, and the news topics to watch.
 */
import { ENTITIES, getEntity } from './entities.js'
import { getTransactionsForEntity, TRANSACTIONS, partyIds } from './transactions.js'

export const SERVICE_LINES = {
  diligence: { label: 'Diligence', short: 'DD', blurb: 'Commercial, operational, and financial diligence on rights, royalty pipelines, and operating companies.' },
  'carve-out': { label: 'Carve-out', short: 'CO', blurb: 'Separating a catalog, label, or services unit from a parent — TSAs, royalty accounting, systems, people.' },
  'value-creation': { label: 'Value creation', short: 'VC', blurb: 'Performance improvement in the hold period: royalty collection, cost, pricing, marketing ROI, data.' },
  pmi: { label: 'PMI', short: 'PMI', blurb: 'Post-merger integration of labels, publishers, distributors, or societies — two back offices becoming one.' },
  strategy: { label: 'Strategy', short: 'ST', blurb: 'Where to play and how to win as the rights, DSP, and capital markets shift.' },
}
export const SERVICE_ORDER = Object.keys(SERVICE_LINES)

const CATEGORIES = [
  {
    id: 'catalog-investors', label: 'Catalog investors', lens: 'money',
    description: 'Funds and platforms that own recorded or publishing rights as a financial asset — from listed compounders to private royalty funds and their ABS vehicles.',
    thesis: 'The asset class matured in 2024–26: the largest platform (Hipgnosis → Recognition) exited to a strategic at a premium, Primary Wave and Concord scaled into $7B independents, and securitisation ($12.9B rated since 2020) became the standard refinancing. The next cycle is about operating the rights, not just owning them.',
    triggers: ['Fund close or continuation vehicle', 'ABS issuance or refinancing (KBRA advance-rate review)', 'Catalog portfolio acquisition or exit to a strategic', 'Royalty leakage or unmatched-income remediation'],
    rule: (e) => e.type === 'catalog-fund' || e.roles.includes('catalog-fund'),
    engagements: {
      diligence: ['Royalty-stream quality of earnings on a target catalog: decay curves by release year, DSP mix, publishing vs master split, matching rates', 'ABS collateral review: advance rate vs independent valuation (Canon 2026-1 at 60.2%), coupon and ARD sensitivity'],
      'carve-out': ['Standing up a catalog vehicle out of a label or publisher (Tempo, Chord) with its own royalty accounting and admin agreements'],
      'value-creation': ['Collection uplift: neighbouring rights, sync pitching, unmatched-royalty recovery at the MLC and foreign societies', 'Marketing ROI on legacy catalogs (the Primary Wave model) measured against streaming lift'],
      pmi: ['Integrating an acquired platform into a strategic owner (Recognition into Sony Music Publishing; Round Hill fund into Concord)'],
      strategy: ['Exit path design: strategic sale vs continued securitisation vs listing (Reservoir as the public comp)'],
    },
    kpis: ['Catalog decay by vintage', 'Advance rate and overcollateralisation', 'Matching rate at societies', 'Sync income share', 'Admin fee as % of collections'],
    topics: ['catalog-deal', 'abs', 'pe-capital'],
    explicit: ['reservoir', 'bmg', 'concord'],
  },
  {
    id: 'label-sponsors', label: 'Label PE sponsors', lens: 'money',
    description: 'Sponsors that own or back labels, publishers, and rights platforms — Blackstone, KKR, Apollo, Bain, Carlyle, Brookfield, and the family offices and pensions behind the independents.',
    thesis: 'Sponsors have moved from owning catalogs to backing operators and lending against rights: Apollo anchors Concord and HarbourView, Bain co-invests with Warner, KKR lends to HarbourView, Blackstone sold Recognition. The work is credit-shaped and strategic-partner-shaped.',
    triggers: ['New platform commitment (WMG–Bain $1.2B)', 'Exit of a rights platform to a strategic', 'Private securitisation or structured facility', 'Control change at a PRO or distributor'],
    rule: (e) => e.type === 'pe-fund' || e.type === 'debt-investor' || (e.type === 'strategic' && e.roles.includes('pe-fund')),
    engagements: {
      diligence: ['Platform diligence on an operator (HarbourView, Litmus, GoldState): pipeline, pricing discipline, admin capability, key-person risk', 'Lender-side diligence on a music ABS or structured facility'],
      'carve-out': ['Separating a rights platform from a sponsor at exit (Recognition out of Blackstone) — data rooms, royalty systems, TSAs'],
      'value-creation': ['100-day plan for a newly backed operator: collections, cost, acquisition process', 'Portfolio-level royalty operations across several holdings'],
      pmi: ['Combining sponsor-backed independents (BMG + Concord) — the largest music PMI to date'],
      strategy: ['Where the next durable cash flow is: distribution, admin platforms, live infrastructure, or AI licensing'],
    },
    kpis: ['Deal volume and dry powder', 'Loan-to-value on rights lending', 'Hold-period collections growth', 'Exit multiple vs entry'],
    topics: ['pe-capital', 'm&a', 'abs'],
    explicit: ['michigan-retirement', 'great-mountain-partners', 'gic'],
  },
  {
    id: 'publisher-rollups', label: 'Publisher roll-ups', lens: 'publishing',
    description: "Publishers and administrators built by acquisition — the majors' publishing arms, Primary Wave + Kobalt, BMG, Reservoir, Concord Music Publishing, and the admin platforms underneath them.",
    thesis: 'Publishing is where consolidation is fastest: Primary Wave bought Kobalt, Sony Music Publishing bought Recognition, BMG absorbed Concord. Every roll-up has the same integration problem — registrations, splits, society mandates, and royalty systems that never match.',
    triggers: ['Acquisition of a publisher or administrator', 'Society mandate change or direct-licensing move', 'Mechanical-rate reset (Phonorecords V, 2028)', 'Unmatched royalties above tolerance'],
    rule: (e) => e.type === 'publisher' || (e.roles.includes('publisher') && e.roles.includes('catalog-fund')),
    engagements: {
      diligence: ['Publishing catalog diligence: writer share vs publisher share, admin term expiries, registration completeness across CISAC societies'],
      'carve-out': ['Lifting an admin business out of a group (Curve out of Downtown for the EC remedy; AMRA with Kobalt)'],
      'value-creation': ['Royalty-pipeline transformation: registration automation, ISWC/ISRC hygiene, society claim rates, sync pitching'],
      pmi: ['Integrating a bought publisher into a major (Recognition into SMP; Kobalt under Primary Wave): systems, writer relations, admin fee harmonisation'],
      strategy: ['Direct licensing vs society licensing for digital; artist-centric publishing terms (SACEM–Deezer)'],
    },
    kpis: ['Registration rate within 30 days', 'Unmatched royalties as % of collections', 'Admin fee', 'Sync income per work', 'Writer retention at term end'],
    topics: ['catalog-deal', 'pro-reform', 'm&a'],
    explicit: ['kobalt', 'downtown', 'songtrust', 'primary-wave', 'reservoir', 'bmg', 'concord'],
  },
  {
    id: 'independent-distributors', label: 'Independent distributors', lens: 'recording',
    description: "Distribution and label-services platforms outside the majors' own arms — DistroKid, Believe, TuneCore, CD Baby, Symphonic, ONErpm, EMPIRE, Create Music Group, Revelator — and the major-owned arms buying them.",
    thesis: 'Distribution is being bought at both ends: majors absorb platforms (UMG–Downtown, WMG–Revelator) while sponsors take the DIY leaders (CVC–DistroKid). Margins depend on fraud control, payment rails, and the services stack on top of delivery.',
    triggers: ['Sponsor buyout of a DIY platform', 'Major acquisition of a B2B distributor', 'DSP fraud or bundling rule changes hitting payout economics', 'Take-private of a listed distributor (Believe)'],
    rule: (e) => e.type === 'distributor' || e.type === 'artist-services',
    engagements: {
      diligence: ['Platform diligence: upload share, churn, fraud exposure, DSP concentration, take rate vs subscription mix'],
      'carve-out': ["Separating a distribution unit from a group (Downtown's FUGA/CD Baby into Virgin; regulatory remedies)"],
      'value-creation': ['Payment-rail and royalty-statement automation; fraud detection; services upsell (publishing admin, neighbouring rights)'],
      pmi: ["Folding an acquired distributor into a major's services arm (Ingrooves → Virgin; Revelator → ADA)"],
      strategy: ['Pricing model (flat fee vs commission), international expansion, superfan and D2C services'],
    },
    kpis: ['Share of new uploads', 'Take rate', 'Fraud-flagged streams %', 'Statement cycle time', 'Services attach rate'],
    topics: ['m&a', 'dsp-economics', 'pe-capital'],
    explicit: ['virgin-music-group', 'the-orchard', 'ada'],
  },
  {
    id: 'pro-modernisation', label: 'PRO modernisation', lens: 'publishing',
    description: 'Performing and mechanical rights organisations under new ownership or new mandates — BMI (New Mountain), SESAC (Blackstone), GMR (H&F), The MLC, and the member-owned societies competing on cost and speed.',
    thesis: 'US PROs became PE assets (BMI, SESAC, GMR) with published payout targets and securitised balance sheets; member-owned societies answer with record collections and AI-licensing frameworks. Both sides need modern matching, faster distribution, and a defensible cost rate.',
    triggers: ['Change of control at a PRO', 'Payout-ratio commitment to affiliates', 'CRB rate proceeding (Web VI, Phonorecords V)', 'Redesignation or governance review (MLC)', 'AI licensing framework launch'],
    rule: (e) => e.type === 'pro',
    engagements: {
      diligence: ['Buy-side diligence on a PRO: licence renewal cliffs, rate-court exposure, distribution methodology risk, member attrition'],
      'carve-out': ['Separating services units (HFA, Rumblefish, Mint) from a PRO for sale or JV'],
      'value-creation': ['Cost-to-income reduction and distribution-cycle compression; matching automation; international reciprocal optimisation'],
      pmi: ['Integrating acquired data/services businesses (MediaNet into SOCAN; ICE hub participants)'],
      strategy: ['For-profit conversion playbook; AI licensing products; direct-licensing defence against DSPs and publishers'],
    },
    kpis: ['Overhead / cost-to-income', 'Distribution lag (quarters)', 'Matching rate', 'Collections growth vs market', 'International share'],
    topics: ['pro-reform', 'policy', 'litigation'],
    explicit: ['merlin'],
  },
  {
    id: 'live-operators', label: 'Live entertainment operators', lens: 'structure',
    description: 'Promoters, ticketers, venue operators, and festival groups — Live Nation, AEG, CTS Eventim, OVG, Legends/ASM, Superstruct — and the sponsors behind them.',
    thesis: "Live is the fastest-growing rights-adjacent cash flow (PRS live > £100M; SIAE concerts > €1.16B) and the most regulated: the states' jury verdict against Live Nation (Apr 2026) and the DOJ behavioural settlement reset ticketing economics. Venue capital (OVG, Legends) and European consolidation (CTS Eventim) continue.",
    triggers: ['Antitrust remedy implementation', 'Venue development financing', 'Festival group M&A', 'Ticketing platform sale or take-private'],
    rule: (e) => e.type === 'live',
    engagements: {
      diligence: ['Promoter or festival diligence: artist guarantee exposure, sponsorship yield, ticketing fee mix, venue lease terms'],
      'carve-out': ['Ticketing separation or multi-vendor implementation under an antitrust remedy'],
      'value-creation': ['Ticketing fee and pricing optimisation within regulatory limits; premium and hospitality yield; venue utilisation'],
      pmi: ['Integrating a ticketing acquisition (CTS–See Tickets) or venue manager (Legends–ASM)'],
      strategy: ['Post-verdict operating model for a promoter–ticketer; superfan and residency economics (Sphere)'],
    },
    kpis: ['Fee per ticket', 'Sponsorship per attendee', 'Venue utilisation', 'Guarantee coverage ratio', 'Secondary-market leakage'],
    topics: ['live', 'litigation', 'm&a'],
    explicit: ['silver-lake', 'sixth-street'],
  },
  {
    id: 'music-ai-investors', label: 'Music-AI investors', lens: 'structure',
    description: "Generative-music companies, the labels licensing to them, and the investors on both sides — Suno, Udio, ElevenLabs, and the majors' settlement-and-licence strategy.",
    thesis: 'The 2024 lawsuits turned into licences: Warner and UMG settled with Udio and Suno on walled-garden terms; ElevenLabs raised at $11B with a licensed music model; GEMA litigates in Europe. Value now sits in licensed training data, attribution tech, and the rate card for AI outputs.',
    triggers: ['Settlement or licence between a major and an AI company', 'AI funding round', 'Court ruling on training-data use (GEMA v OpenAI/Suno)', 'AI policy (EU AI Act, US Copyright Office)'],
    rule: (e) => e.type === 'music-tech' && /\bai\b|generative/i.test(`${e.subtype} ${e.summary}`),
    engagements: {
      diligence: ['Diligence on an AI-music company: licence coverage of training data, litigation exposure, output-attribution capability, revenue model'],
      'carve-out': ['Standing up an AI licensing unit inside a label or society (rate cards, opt-out registries)'],
      'value-creation': ['Monetising catalog as training data and reference material; attribution-based royalty flows'],
      pmi: ["Integrating an acquired AI tool into a label's creator services stack"],
      strategy: ['Licence vs litigate; equity-for-licence structures; policy positioning in the EU and US'],
    },
    kpis: ['Licensed share of training corpus', 'Attribution accuracy', 'AI-output revenue per work', 'Litigation reserve'],
    topics: ['ai', 'litigation', 'policy'],
    explicit: ['umg', 'wmg', 'sony-music-group', 'gema', 'riaa', 'merlin'],
  },
]

export const CLIENT_CATEGORIES = CATEGORIES.map((c) => {
  const memberIds = new Set([...ENTITIES.filter(c.rule).map((e) => e.id), ...c.explicit.filter((id) => getEntity(id))])
  const members = [...memberIds].map(getEntity).filter((e) => e.status === 'active').sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name))
  const deals = TRANSACTIONS.filter((t) => partyIds(t).some((id) => memberIds.has(id)))
  return { ...c, members, memberIds, deals, dealVolume: deals.reduce((s, t) => s + (t.value || 0), 0) }
})

export const getCategory = (id) => CLIENT_CATEGORIES.find((c) => c.id === id) || null

/** Categories an entity belongs to, plus the three most relevant engagement hypotheses for it. */
export function getConsultingContext(entityId) {
  const cats = CLIENT_CATEGORIES.filter((c) => c.memberIds.has(entityId))
  const deals = getTransactionsForEntity(entityId)
  // Bias lines toward the entity's recent deal activity: ABS → DD/VC; M&A → PMI; take-private → CO/VC; catalog sale → DD.
  const bias = new Set(deals.flatMap((t) => (t.type === 'abs' ? ['diligence', 'value-creation'] : t.type === 'm&a' ? ['pmi'] : t.type === 'take-private' ? ['carve-out', 'value-creation'] : t.type === 'catalog-sale' ? ['diligence'] : [])))
  const order = [...SERVICE_ORDER].sort((a, b) => (bias.has(b) ? 1 : 0) - (bias.has(a) ? 1 : 0))
  const hypotheses = []
  for (const c of cats) for (const line of order) for (const h of c.engagements[line] || []) hypotheses.push({ category: c, line, text: h })
  return { categories: cats, hypotheses: hypotheses.slice(0, 3) }
}

export const OVERLAY_TOTALS = {
  categories: CLIENT_CATEGORIES.length,
  entitiesCovered: new Set(CLIENT_CATEGORIES.flatMap((c) => [...c.memberIds])).size,
  engagements: CLIENT_CATEGORIES.reduce((s, c) => s + Object.values(c.engagements).flat().length, 0),
}
