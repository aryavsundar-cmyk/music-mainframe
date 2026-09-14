/**
 * northstar.js — "Northstar Songs & Masters", an ILLUSTRATIVE music-catalog valuation case. Every figure is fictional.
 * Adapted from a practice case the operator drafted with Perplexity (supplied 2026-09-14). Not an appraisal, market
 * quote, or investment recommendation.
 *
 * Teaching design: the case arrives "as a junior team drafted it". `asPresented` reproduces the draft's own choices
 * (including its arithmetic and judgement errors, verified by recomputation); `benchmark` is the reviewing director's
 * corrected position. The lab starts the trainee on the draft and asks them to review, correct, and carry the
 * engagement from pitch to an IC-ready deliverable.
 */

export const NORTHSTAR = {
  id: 'northstar',
  title: 'Northstar Songs & Masters',
  tagline: 'Buy-side diligence and valuation of an independent songwriter-producer catalog',
  difficulty: 'Core',
  hours: '4–6 hours',
  valuationDate: '2026-12-31',
  sellerAsk: 14000000,
  disclaimer: 'Illustrative practice case. Fictional target, buyer, and figures. Not an appraisal, market quote, or investment recommendation. Multiples and discount rates are case assumptions, not market benchmarks.',
  sources: [
    { label: 'EPGD Law — How to strike a music catalog deal (cited in source case)', url: 'https://www.epgdlaw.com/how-to-strike-a-music-catalog-deal/' },
    { label: 'OPAG — Musical works and compositions IP valuation (cited in source case)', url: 'https://opag.io/insights/musical-works-compositions-ip-valuation' },
  ],

  // ── PITCH ────────────────────────────────────────────────────────────────────
  client: {
    name: 'Meridian Rights Partners (mock)',
    profile: 'Mid-market music-rights fund; $600M committed; two prior catalog acquisitions. Its lender requires third-party diligence for any acquisition above $10M.',
    situation: 'Meridian signed a six-week exclusivity letter on 1 November 2026 to acquire 100% of the seller\'s economic interest in Northstar. The seller\'s adviser guides to $14.0M — about 9.3x reported LTM net royalty receipts of $1.501M. Investment committee meets in five weeks.',
    ask: 'Scope and price a buy-side engagement: quality of earnings, rights and chain of title, commercial durability, a triangulated valuation range, and purchase-agreement protections — ending in an offer recommendation.',
  },
  seller: 'Independent songwriter/producer and affiliated label entity',
  scope: [
    '225 musical compositions; 142 master recordings',
    '71% weighted-average publishing ownership interest',
    '100% master ownership for 96 recordings; partial master interests for the remaining 46',
    'Worldwide rights, subject to existing administration, distribution, producer, artist, and co-writer agreements',
    'Existing contracts: weighted-average remaining term of 12 years; some publishing rights revert or become terminable earlier',
  ],
  profile: [
    ['LTM net royalty cash receipts', '$1.50M', 'Primary headline earnings metric'],
    ['Three-year revenue CAGR', '8.5% (as stated)', 'Positive, but needs stream-level verification'],
    ['Streaming concentration', '47% from Spotify', 'Platform / playlisting risk'],
    ['Top 10 compositions', '43% of LTM NPS (as stated)', 'Material concentration risk'],
    ['Top composition', '10.2% of LTM NPS', 'Requires title-specific diligence'],
    ['Sync revenue', '11% of LTM NPS', 'Attractive upside but volatile / non-recurring'],
    ['Catalog age', '2012–2025 vintages', 'Mix of established and newer works'],
    ['Dollar age', '64% of LTM earnings from works older than five years', 'Supports durability; does not eliminate decline risk'],
    ['International receipts', '28% of LTM NPS/NLS', 'Diversification, plus collection / FX / withholding complexity'],
    ['Control', 'Majority ownership, not 100% across all rights', 'Value only the acquired economics'],
  ],
  centralQuestion: 'How much of recent earnings is recurring, collectible, transferable, contractually retained, and likely to persist after ownership changes?',

  perimeter: [
    { id: 'pub-share', text: 'The seller\'s 71% weighted publishing share of the 225 compositions', benchmark: 'in', why: 'This is the acquired publishing economic interest — value it at the owned percentage, title by title.' },
    { id: 'cowriter', text: 'Co-writers\' shares of the same compositions', benchmark: 'out', why: 'Not owned, not transferred. Popularity of the song is irrelevant to the part the seller doesn\'t own.' },
    { id: 'partial-masters', text: 'Partial master interests in 46 recordings', benchmark: 'in', why: 'In perimeter at the owned percentage only; confirm the co-owners\' consent and waterfall.' },
    { id: 'receivables', text: '$186K of uncollected pre-close royalties', benchmark: 'diligence', why: 'Belongs to seller or buyer only by SPA definition. Schedule it and agree a collection waterfall; don\'t capitalise it.' },
    { id: 'synergy', text: 'Meridian\'s lower administration rate after closing', benchmark: 'out', why: 'A buyer synergy, not an acquired asset. Model it in buyer returns, not in the standalone price.' },
    { id: 'future-works', text: 'Songs the seller writes after closing', benchmark: 'out', why: 'Not in a catalog acquisition unless a separate co-publishing or first-look deal is negotiated.' },
    { id: 'sync-approval', text: 'Approval rights over sync licenses', benchmark: 'diligence', why: 'Often shared with co-writers or retained by the artist; missing approvals cap sync upside.' },
    { id: 'reversions', text: 'Publishing rights that revert before 2040', benchmark: 'diligence', why: 'In perimeter only until the reversion date. Forecast title-level cut-offs rather than a blanket horizon.' },
    { id: 'reserve', text: '$72K distributor reserve balance', benchmark: 'diligence', why: 'Depends on release pattern and whether the distributor agreement assigns reserves to the buyer.' },
    { id: 'neighbouring', text: 'Neighbouring-rights income on the masters', benchmark: 'in', why: 'Rights-owner share follows the masters; confirm the performer share is excluded or separately assigned.' },
  ],

  questions: [
    { id: 'q-nps', text: 'What is buyer-acquired net cash flow (NPS/NLS) after participations, fees, reserves, and recoupment?', benchmark: true },
    { id: 'q-recurring', text: 'How much of LTM growth is recurring versus one-off (sync, viral spikes, catch-up payments)?', benchmark: true },
    { id: 'q-title', text: 'Does the seller own the rights and can it transfer them (chain of title, consents, reversions)?', benchmark: true },
    { id: 'q-concentration', text: 'How concentrated is income by title and platform, and how durable are the top titles?', benchmark: true },
    { id: 'q-closing', text: 'Who owns pre-close receivables, reserves, and payables at closing?', benchmark: true },
    { id: 'q-social', text: 'How large is the seller\'s social-media following?', benchmark: false, why: 'Useful commercial colour; not a value driver on its own.' },
    { id: 'q-synergy', text: 'How much can Meridian cut administration fees post-close?', benchmark: false, why: 'Buyer upside — relevant to returns, not to what Meridian should pay.' },
    { id: 'q-comps', text: 'What multiple did the last comparable catalog sale achieve?', benchmark: false, why: 'Secondary: a cross-check that means little until earnings are normalised and risks are comparable.' },
    { id: 'q-payout', text: 'What happens if Spotify changes its payout model?', benchmark: false, why: 'A sensitivity case, answered inside the forecast rather than as a scoping question.' },
    { id: 'q-banker', text: 'What discount rate did the seller\'s adviser use?', benchmark: false, why: 'Anchoring. Build your own rate from asset-specific risks.' },
  ],

  workstreams: [
    { id: 'qoe', label: 'Quality of earnings', lead: 'Director', weeks: [1, 4], analyses: ['Reconcile royalty statements to bank receipts, GL, distributor and PRO/CMO statements, and tax filings', 'Separate cash receipts from accrued royalties; isolate catch-up collections', 'Test whether growth is broad-based across titles and territories', 'Normalise non-recurring sync, viral spikes, audit settlements, retroactive PRO payments, advances, reserve releases', 'Analyse income by title, cohort, source, territory, counterparty'] },
    { id: 'commercial', label: 'Commercial & operational', lead: 'Manager', weeks: [1, 4], analyses: ['Listener, streaming, playlist, social, and territory trends for top titles', 'Artist activity: releases, touring, media, anniversaries, re-recording risk', 'Administration and collection effectiveness; unmatched works; foreign recovery', 'Benchmark buyer ability to improve collection, licensing, metadata, sync', 'Downside cases: DSP payout changes, playlist loss, disputes, title decay'] },
    { id: 'legal', label: 'Legal, rights & tax', lead: 'Senior Director + counsel', weeks: [1, 5], analyses: ['Chain of title, split sheets, assignments, copyright and PRO/CMO registrations', 'Transferability, consents, termination rights, reversions, security interests', 'Unpaid co-writer, producer, artist, sample, or participant obligations', 'Administration, distribution, label, and sync agreements', 'Tax basis, amortisation, withholding; asset vs entity vs assignment structure'] },
    { id: 'valuation', label: 'Valuation', lead: 'Director', weeks: [2, 5], analyses: ['Normalised LTM NPS/NLS base', 'Stream- and cohort-level forecast', 'Risk-built discount rate and finite-life DCF', 'Multiple cross-check and triangulation', 'Sensitivities and "what must be true" for the ask'] },
    { id: 'spa', label: 'Value protection / SPA', lead: 'Managing Director', weeks: [4, 5], analyses: ['Map each finding to price, structure, or contractual protection', 'Receivables schedule and collection waterfall', 'Escrow, holdback, earn-out, and indemnity design', 'EV-to-price bridge for the offer letter'] },
  ],
  teamDefaults: { md: 5, sd: 12, dir: 20, mgr: 25, an: 25, assoc: 10 },

  irl: [
    { id: 'statements', text: 'Royalty statements by source, 36 months, title-level', ws: 'qoe', benchmark: 'P1' },
    { id: 'bank', text: 'Bank statements and cash-receipts reconciliation', ws: 'qoe', benchmark: 'P1' },
    { id: 'gl-tax', text: 'General ledger and tax returns, three years', ws: 'qoe', benchmark: 'P2' },
    { id: 'distributor', text: 'Distributor agreements and reserve statements', ws: 'qoe', benchmark: 'P1' },
    { id: 'pro', text: 'PRO/CMO registrations and statements, incl. foreign societies', ws: 'qoe', benchmark: 'P1' },
    { id: 'chain', text: 'Chain of title: assignments, split sheets, copyright registrations', ws: 'legal', benchmark: 'P1' },
    { id: 'participations', text: 'Co-writer, producer, and artist agreements; participation schedules', ws: 'legal', benchmark: 'P1' },
    { id: 'admin', text: 'Administration agreement and fee schedule', ws: 'legal', benchmark: 'P2' },
    { id: 'sync-log', text: 'Sync license log: fees, terms, recurrence, approvals', ws: 'commercial', benchmark: 'P2' },
    { id: 'dsp', text: 'DSP analytics: streams by title, territory, playlist, 36 months', ws: 'commercial', benchmark: 'P1' },
    { id: 'ugc', text: 'YouTube Content ID / UGC claims report', ws: 'commercial', benchmark: 'P2' },
    { id: 'metadata', text: 'Metadata audit sample and exception log', ws: 'commercial', benchmark: 'P2' },
    { id: 'wc', text: 'Receivables aging, reserves, recoupment ledger, royalty payables', ws: 'spa', benchmark: 'P1' },
    { id: 'reversion', text: 'Reversion and termination schedule, with notices served', ws: 'legal', benchmark: 'P1' },
    { id: 'liens', text: 'Liens, security interests, pending disputes and claims', ws: 'legal', benchmark: 'P1' },
    { id: 'artist', text: 'Artist activity pipeline: releases, touring, re-record intentions', ws: 'commercial', benchmark: 'P3' },
  ],

  // ── EXECUTE: DATA ROOM ──────────────────────────────────────────────────────
  inventory: [
    { id: 'C-001', title: 'Neon Valleys', year: 2015, rights: 'Composition + master', own: '75% pub / 100% master', gross: 355000, net: 153000, source: 'DSP streaming', flag: 'High title concentration' },
    { id: 'C-002', title: 'Still Electric', year: 2018, rights: 'Composition + master', own: '50% pub / 100% master', gross: 241000, net: 106000, source: 'DSP streaming', flag: 'Co-writer consent' },
    { id: 'C-003', title: 'Night Ferry', year: 2013, rights: 'Composition', own: '67% publishing', gross: 181000, net: 91000, source: 'Performance / streaming', flag: 'PRO matching review' },
    { id: 'C-004', title: 'Parallel Lines', year: 2020, rights: 'Master', own: '100% master', gross: 178000, net: 89000, source: 'UGC / social audio', flag: 'Platform policy exposure' },
    { id: 'C-005', title: 'Silver Static', year: 2016, rights: 'Composition + master', own: '50% pub / 50% master', gross: 170000, net: 66000, source: 'Sync / streaming', flag: 'One-time sync component' },
    { id: 'C-006', title: 'Late Transmission', year: 2017, rights: 'Composition + master', own: '100% pub / 100% master', gross: 142000, net: 79000, source: 'Streaming', flag: 'Moderate' },
    { id: 'C-007', title: 'Paper Satellites', year: 2014, rights: 'Composition', own: '50% publishing', gross: 129000, net: 49000, source: 'Performance', flag: 'Foreign collection lag' },
    { id: 'C-008', title: 'Tidal Room', year: 2021, rights: 'Composition + master', own: '75% pub / 100% master', gross: 118000, net: 62000, source: 'Streaming', flag: 'Newer-title decay' },
    { id: 'C-009', title: 'After the Signal', year: 2019, rights: 'Composition + master', own: '50% pub / 100% master', gross: 104000, net: 52000, source: 'Streaming', flag: 'Moderate' },
    { id: 'C-010', title: 'Wildglass', year: 2012, rights: 'Composition + master', own: '100% pub / 100% master', gross: 93000, net: 56000, source: 'Performance / sync', flag: 'Moderate' },
    { id: 'TAIL', title: 'Long tail — 215 compositions / 132 masters', year: '2012–25', rights: 'Mixed', own: '25%–100%', gross: 1153000, net: 798000, source: 'Diversified', flag: 'Metadata completeness', longTail: true },
  ],

  periods: ['2023A', '2024A', '2025A', 'LTM 2026'],
  history: [
    { period: '2023A', gross: 1764000, participations: 401000, fees: 176000, reserves: 39000 },
    { period: '2024A', gross: 1903000, participations: 429000, fees: 187000, reserves: 41000 },
    { period: '2025A', gross: 2144000, participations: 487000, fees: 207000, reserves: 53000 },
    { period: 'LTM 2026', gross: 2317000, participations: 529000, fees: 225000, reserves: 62000 },
  ],

  streams: [
    { id: 'masterStreaming', label: 'Master streaming', right: 'master', hist: [396000, 438000, 497000, 555000], quality: 'Recurring, but platform and playlist dependent' },
    { id: 'pubMech', label: 'Publishing mechanical / streaming', right: 'publishing', hist: [205000, 227000, 255000, 284000], quality: 'Generally recurring; subject to ownership and split accuracy' },
    { id: 'performance', label: 'Performance royalties', right: 'publishing', hist: [211000, 221000, 235000, 244000], quality: 'Durable, but foreign lag and matching issues' },
    { id: 'ugc', label: 'UGC / social / short-form', right: 'both', hist: [86000, 104000, 143000, 159000], quality: 'Growing but platform-policy-sensitive' },
    { id: 'sync', label: 'Synchronization', right: 'both', hist: [152000, 141000, 166000, 164000], quality: 'High margin, episodic; needs a normalised run rate' },
    { id: 'neighbouring', label: 'Neighbouring rights', right: 'master', hist: [45000, 49000, 52000, 56000], quality: 'Moderate recurring profile' },
    { id: 'physical', label: 'Physical / downloads', right: 'master', hist: [38000, 29000, 22000, 18000], quality: 'Structural decline' },
    { id: 'other', label: 'Other', right: 'both', hist: [15000, 37000, 27000, 21000], quality: 'Review individually' },
  ],

  counterparties: [
    { source: 'Spotify', net: 704000, test: 'Playlist exposure, territory trends, distributor economics' },
    { source: 'Apple Music', net: 173000, test: 'Consumption trends and reporting completeness' },
    { source: 'YouTube / Content ID', net: 159000, test: 'Claims, policy changes, monetisation rate' },
    { source: 'PROs / CMOs', net: 244000, test: 'Matching, black-box income, statement lags' },
    { source: 'Sync licensees', net: 164000, test: 'Recurrence versus one-time events' },
    { source: 'Other DSPs / physical / direct', net: 57000, test: 'Reconciliation and materiality' },
  ],

  workingCapital: [
    { metric: 'Average royalty-reporting lag', value: '3.5 months', implication: 'Forecast should reflect lagged cash conversion' },
    { metric: 'Foreign-society lag', value: '6–12 months', implication: 'Timing and true-up analysis' },
    { metric: 'Historical uncollected receivables', value: '$186K', implication: 'Aging and collectability; seller or buyer by SPA' },
    { metric: 'Distributor reserve balance', value: '$72K', implication: 'Release pattern and buyer entitlement' },
    { metric: 'Recoupment balance against artist', value: '$41K', implication: 'Whether the buyer assumes or benefits' },
    { metric: 'Royalty-payable balance', value: '$133K', implication: 'Debt-like item in the price bridge' },
    { metric: 'Metadata exception rate (audit sample)', value: '4.8% of sampled works', implication: 'Collection leakage and remediation cost' },
  ],

  normalization: [
    { id: 'sync-film', label: 'Non-recurring feature-film sync fee', amount: -68000, stream: 'sync', evidence: 'License not evidenced as recurring', benchmark: 'accept', why: 'Correct to remove a one-off license from run-rate earnings. Note the result is conservative: sync averaged $156K over four years, so test the license log for one-offs in prior years too before settling on a $96K run rate.' },
    { id: 'pro-catchup', label: 'Catch-up payment from prior PRO underpayment', amount: -21000, stream: 'performance', evidence: 'Historical correction, not ongoing', benchmark: 'accept', why: 'A retroactive correction belongs to the past. Remove it from the run rate — and allocate it to performance income in the forecast base.' },
    { id: 'viral', label: 'Viral short-form spike on one 2025 release', amount: -34000, stream: 'ugc', evidence: 'Conservatively normalise partially', benchmark: 'accept', why: 'Reasonable. Allocate it once, to UGC. The draft deducted it from both UGC and master streaming when building the forecast base.' },
    { id: 'unmatched', label: 'Identified unmatched foreign performance royalties', amount: 18000, stream: 'performance', evidence: 'Supported by statements / claim evidence', benchmark: 'accept', why: 'Accept the annual run-rate uplift if evidence shows the leakage is fixed going forward. Any historical backlog recovered belongs in the price bridge as a receivable, not in the multiple.' },
    { id: 'admin-synergy', label: 'Annualised benefit from lower admin rate under buyer platform', amount: 12000, stream: 'pro-rata', evidence: 'Only if realisable and transferable', benchmark: 'reject', why: 'A buyer synergy. The case\'s own takeaway says don\'t pay the seller for unproven buyer gains — yet the draft capitalised it into standalone earnings (worth about $0.1M at 8.5x). Model it in Meridian\'s returns instead.' },
  ],

  growthAsPresented: {
    masterStreaming: [3, 2, 1, 0, -1], pubMech: [2.5, 2, 1, 0.5, 0], performance: [1.5, 1, 1, 0.5, 0], ugc: [5, 3, 2, 1, 0],
    sync: [0, 0, 0, 0, 0], neighbouring: [1, 1, 0.5, 0.5, 0], physical: [-10, -10, -10, -10, -10], other: [0, 0, 0, 0, 0],
  },
  forecastYears: [2027, 2028, 2029, 2030, 2031],

  rateBuild: [
    { id: 'base', label: 'Base rate (illustrative)', pct: 4.5 },
    { id: 'illiquidity', label: 'Private-asset and illiquidity premium', pct: 5.0 },
    { id: 'title', label: 'Title concentration — top title 10.2% of LTM', pct: 1.0 },
    { id: 'platform', label: 'Platform concentration — Spotify 46.9%', pct: 0.75 },
    { id: 'rights', label: 'Rights clarity — 4.8% metadata exceptions', pct: 0.5 },
    { id: 'intl', label: 'International collection, FX, withholding — 28%', pct: 0.5 },
    { id: 'term', label: 'Contract term and reversion risk', pct: 0.25 },
  ],
  rateBand: [11.5, 14.0],

  // The draft's own figures, used by the model-review checks.
  asPresented: {
    inventoryTotal: 1501000, top10Share: 0.43, cagr3: 0.085, normalizedLtm: 1408000, leakage: 43000,
    forecastBase: { masterStreaming: 521000, pubMech: 284000, performance: 244000, ugc: 125000, sync: 96000, neighbouring: 56000, physical: 18000, other: 21000 },
    forecastTotals: [1398000, 1424000, 1441000, 1449000, 1444000],
    terminal: { method: 'finite', years: 20, g: -1.5, firstCf: 1415000 },
    terminalPv: 5900000, dcfEv: 11000000, contractTerm: 12,
    multiples: [7.5, 8.5, 9.5],
    triangulation: { dcf: [9600000, 11000000, 12800000], multiple: [10600000, 12000000, 13400000], buyer: [9500000, 10800000, 12000000], concluded: [10500000, 12000000] },
    sensitivity: [
      { label: 'Upside', rate: 11.0, g: 0.5, stated: 13000000 },
      { label: 'Base', rate: 12.5, g: -1.5, stated: 11000000 },
      { label: 'Moderate downside', rate: 14.0, g: -2.5, stated: 9500000 },
      { label: 'Severe downside', rate: 16.0, g: -4.0, stated: 7800000 },
    ],
    headline: 10800000,
  },

  findings: [
    { id: 'chain', finding: 'Chain-of-title gaps in split sheets and assignments', ws: 'legal', benchmark: { severity: 'High', protection: 'escrow' } },
    { id: 'top-title', finding: 'Top-title income uncertainty — "Neon Valleys" is 10.2% of LTM', ws: 'commercial', benchmark: { severity: 'High', protection: 'earnout' } },
    { id: 'receivables', finding: '$186K of uncollected pre-close royalties', ws: 'qoe', benchmark: { severity: 'Medium', protection: 'waterfall' } },
    { id: 'metadata', finding: '4.8% metadata exception rate in audit sample', ws: 'commercial', benchmark: { severity: 'Medium', protection: 'remediation' } },
    { id: 'one-off', finding: 'Non-recurring sync and viral income inside LTM', ws: 'qoe', benchmark: { severity: 'Medium', protection: 'exclude' } },
    { id: 'cowriter', finding: 'Co-writer consent required on "Still Electric"', ws: 'legal', benchmark: { severity: 'High', protection: 'special-indemnity' } },
    { id: 'reversion', finding: 'Publishing rights reverting or terminable before end of horizon', ws: 'legal', benchmark: { severity: 'High', protection: 'title-adjustment' } },
    { id: 'spotify', finding: 'Spotify is 46.9% of net cash flow', ws: 'commercial', benchmark: { severity: 'Medium', protection: 'price' } },
    { id: 'ugc-policy', finding: 'UGC platform-policy exposure on "Parallel Lines"', ws: 'commercial', benchmark: { severity: 'Low', protection: 'price' } },
    { id: 'foreign-lag', finding: '6–12 month foreign-society collection lag', ws: 'qoe', benchmark: { severity: 'Low', protection: 'true-up' } },
  ],
  protections: [
    { id: 'escrow', label: 'Specific indemnity + escrow / holdback' },
    { id: 'earnout', label: 'Earn-out on post-close verified collections' },
    { id: 'waterfall', label: 'Receivables schedule + collection waterfall' },
    { id: 'remediation', label: 'Seller-funded remediation / price adjustment' },
    { id: 'exclude', label: 'Exclude from headline multiple / contingent value right' },
    { id: 'special-indemnity', label: 'Special indemnity + capped escrow + claims procedure' },
    { id: 'title-adjustment', label: 'Title-level price adjustment or excluded asset' },
    { id: 'price', label: 'Reflect in price (discount rate / multiple)' },
    { id: 'true-up', label: 'Post-close true-up mechanism' },
  ],

  bridge: [
    { id: 'payables', label: 'Royalty payables assumed by buyer', amount: -133000, benchmark: true, why: 'Debt-like: cash already owed to participants that the buyer will pay after closing.' },
    { id: 'receivables', label: 'Pre-close uncollected receivables (70% collectible)', amount: 130000, benchmark: false, why: 'Belongs to the seller unless the SPA says otherwise. Schedule it and use a collection waterfall; don\'t add it to price by default.' },
    { id: 'reserve', label: 'Distributor reserve release to buyer (80%)', amount: 58000, benchmark: true, why: 'Add only if the distributor agreement assigns reserves with the rights and the release pattern is evidenced.' },
    { id: 'recoup', label: 'Artist recoupment benefit (50% expected)', amount: 20000, benchmark: true, why: 'Unrecouped balances reduce future payables to the artist; value only the expected recovery.' },
    { id: 'remediation', label: 'Metadata remediation cost', amount: -45000, benchmark: true, why: 'One-off cost to fix the 4.8% exceptions; ongoing leakage belongs in the forecast.' },
  ],
  structureBenchmark: { escrowPct: 5, earnout: 750000 },

  checks: [
    { id: 'inventory', area: 'Rights inventory ties to the royalty ledger', kind: 'error' },
    { id: 'top10', area: 'Top-10 title concentration', kind: 'error' },
    { id: 'cagr', area: 'Three-year growth rate', kind: 'error' },
    { id: 'synergy', area: 'What is inside normalised LTM earnings', kind: 'error' },
    { id: 'allocation', area: 'Forecast base versus normalised LTM', kind: 'error' },
    { id: 'forecast', area: 'Forecast arithmetic', kind: 'error' },
    { id: 'terminal', area: 'Terminal value', kind: 'error' },
    { id: 'dcf-vs-multiple', area: 'DCF versus the multiple range', kind: 'error' },
    { id: 'horizon', area: 'Cash-flow horizon versus rights term', kind: 'judgement' },
    { id: 'sync-run-rate', area: 'Sync run rate', kind: 'judgement' },
  ],

  benchmarkPitch: {
    scr: {
      s: 'Meridian has exclusivity on Northstar — 225 compositions and 142 masters with $1.50M of reported LTM net royalty receipts growing about 9% a year. The seller guides to $14.0M.',
      c: 'Reported earnings include one-off sync, a viral spike, and a buyer synergy; 47% of cash depends on Spotify and 10% on one title; ownership is partial and some publishing reverts; and $0.4M of receivables, reserves, and payables sits between seller and buyer. The $14.0M ask rests on assumptions nobody has tested.',
      r: 'A five-week buy-side diligence — QoE, rights, commercial, valuation, SPA protection — that turns every finding into price, structure, or contractual protection, and delivers a triangulated value range with an offer recommendation for IC.',
    },
  },
  benchmarkDeliver: {
    rationale: 'Anchor on the corrected DCF, cross-checked against 7.5–9.5x of standalone normalised earnings. The gap to the $14.0M ask requires a multiple above the case range or a discount rate below the risk-built floor — neither is supported. Offer inside the corrected range, protect the top title with an earn-out, and hold back escrow against chain-of-title and co-writer consent.',
  },

  takeaways: [
    'Start with the legal and economic perimeter. A song\'s popularity is irrelevant to value if the seller does not own — or cannot transfer — the cash flows.',
    'Use net cash flow, not gross royalties: reduce for splits, participations, fees, reserves, recoupment, and collection leakage.',
    'Normalise aggressively but consistently. Never capitalise a one-time sync, retroactive collection, or viral spike as if it recurs.',
    'Forecast by stream and by title concentration; streaming, performance, sync, UGC, and physical carry different risks.',
    'Use DCF and multiples together. The multiple frames the market; the DCF forces explicit thinking about duration, decline, and risk.',
    'Treat diligence findings as value drivers: they change price, structure, or contractual protection — not just footnotes.',
    'Separate standalone value from buyer synergies. Don\'t pay the seller for gains the buyer hasn\'t proven.',
    'Recompute what you inherit. A draft model that looks internally consistent can still overstate value by 5–10%.',
  ],
}

export const CASES = { northstar: NORTHSTAR }
export const CASE_LIST = Object.values(CASES)
