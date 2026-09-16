/**
 * playbooks.js — what we say, by segment and service line. Each hook is trigger + number + offer:
 * `claim` is the thing that is usually wrong in this situation, `evidence` is what we would show,
 * `ask` is the specific thirty minutes requested. Tokens {name} and {trigger} are filled by utils/outreach.js.
 * Hooks are versioned here so one that works becomes the default and one that fails is retired with a note.
 */
export const HOOKS = [
  {
    segment: 'sponsors', line: 'pmi', subject: 'the synergy case after close', persona: 'operating-partner', version: 1,
    claim: 'Most music integration cases book every synergy from Day 1 and leave the cost to achieve out of the plan.',
    evidence: 'We re-base the synergy register bottom-up, phase it against systems and contract windows, risk-weight it, and net off separation cost, so the number the board holds management to is one operations can deliver.',
    ask: 'Worth thirty minutes on what {name} has committed to post-close, and what is actually tracking?',
  },
  {
    segment: 'sponsors', line: 'diligence', subject: 'earnings quality on rights deals', persona: 'deal-partner', version: 1,
    claim: 'Reported royalty income is not buyer cash flow, and seller packs rarely separate the two.',
    evidence: 'We rebuild gross-to-net from statements to bank receipts, normalise one-offs, and value only the rights that transfer, so the committee sees what the asset earns rather than what it reports.',
    ask: 'Thirty minutes on how {name} is testing earnings quality on rights deals?',
  },
  {
    segment: 'sponsors', line: 'value-creation', subject: 'operating upside in music assets', persona: 'operating-partner', version: 1,
    claim: 'In rights businesses the value usually sits in collection, matching and admin leakage, not in the next acquisition.',
    evidence: 'We size unmatched income, cost to collect, and administration leakage against peers, then put owners and dates against the recovery.',
    ask: 'Thirty minutes on where the operating upside sits across {name}\'s music assets?',
  },
  {
    segment: 'catalog-funds', line: 'diligence', subject: 'what the catalog really earns', persona: 'deal-partner', version: 1,
    claim: 'Catalog packs lead with reported royalty income; the price should follow net receipts after participations, fees and reserves.',
    evidence: 'We rebuild the earnings waterfall title by title, strip one-offs and viral spikes, and test what survives a change of ownership.',
    ask: 'Thirty minutes on how {name} normalises earnings before bidding?',
  },
  {
    segment: 'catalog-funds', line: 'value-creation', subject: 'unmatched income and collection performance', persona: 'royalty-ops', version: 1,
    claim: 'Acquired catalogs usually carry unmatched income and administration leakage nobody has quantified.',
    evidence: 'We measure matching rates and collection performance by society and platform, then build the recovery plan with owners and dates.',
    ask: 'Thirty minutes on what share of {name}\'s collections are still unmatched?',
  },
  {
    segment: 'debt', line: 'diligence', subject: 'before pricing: what the collateral supports', persona: 'credit-pm', version: 1,
    claim: 'Royalty ABS offerings are sized on pro forma tapes that include accruals, one-offs and pro-forma add-backs.',
    evidence: 'We tie the tape to bank receipts, apply the eligibility and concentration tests the indenture already contains, rebuild the waterfall, and solve for the haircut that breaks each class.',
    ask: 'Thirty minutes before pricing on what the collateral supports on your own model?',
  },
  {
    segment: 'strategics', line: 'pmi', subject: 'the first hundred days', persona: 'deal-partner', version: 1,
    claim: 'Music integrations fail on statements and registrations long before they fail on synergies.',
    evidence: 'We run Day 1 for continuity — statements, mandates, registrations, letters of direction — and re-base the synergy case against contract and system constraints.',
    ask: 'Thirty minutes on the first hundred days of {trigger}?',
  },
  {
    segment: 'strategics', line: 'carve-out', subject: 'what the unit earns standalone', persona: 'cfo', version: 1,
    claim: 'Carve-out packs present parent allocations as if they were a standalone cost base.',
    evidence: 'We build standalone costs function by function with headcount, reprice related-party revenue to arm\'s length, and put separation and transitional services into the price.',
    ask: 'Thirty minutes on what the unit really earns on its own feet?',
  },
  {
    segment: 'labels-publishers', line: 'carve-out', subject: 'separation readiness and standalone economics', persona: 'cfo', version: 1,
    claim: 'A division inside a group has no standalone P&L, and the first buyer question is what it costs to run alone.',
    evidence: 'We rebuild the carve-out P&L, cost the separation and the transitional services both ways, and stand up a Day-1 operating model that keeps statements running.',
    ask: 'Thirty minutes on separation readiness at {name}?',
  },
  {
    segment: 'labels-publishers', line: 'diligence', subject: 'earnings quality on the rights you are trading', persona: 'cfo', version: 1,
    claim: 'Whether you are buying rights, selling them, or financing them, the number everyone argues about is what the catalog actually earns after participations, fees and reserves.',
    evidence: 'We rebuild the earnings waterfall from statements to bank receipts, separate recurring income from one-offs, and test what survives a change of ownership or an administration change.',
    ask: 'Thirty minutes on how {name} evidences earnings quality to counterparties?',
  },
  {
    segment: 'platforms', line: 'diligence', subject: 'the economics behind the licence', persona: 'deal-partner', version: 1,
    claim: 'Licensing and payout terms move faster than the models built around them, and diligence packs rarely show the unit economics by rights type.',
    evidence: 'We rebuild contribution by rights type and territory, and test what happens to it when payout models, licences or platform terms change.',
    ask: 'Thirty minutes on the unit economics behind {name}\'s licensing?',
  },
  {
    segment: 'labels-publishers', line: 'value-creation', subject: 'matching rates and cost to collect', persona: 'royalty-ops', version: 1,
    claim: 'Royalty operations usually carry recoverable income and avoidable cost in the same place: matching, claims and statements.',
    evidence: 'We quantify unmatched income, statement cycle time, and cost to collect, then sequence the fixes that pay first.',
    ask: 'Thirty minutes on {name}\'s matching rates and statement cycle?',
  },
  {
    segment: 'labels-publishers', line: 'pmi', subject: 'integrating what you just bought', persona: 'royalty-ops', version: 1,
    claim: 'Music acquisitions are integrated on two clocks: the org chart moves in weeks, the royalty systems and registrations in quarters.',
    evidence: 'We sequence the integration around statement continuity and registration integrity, then re-base the synergy case against what systems and contracts allow.',
    ask: 'Thirty minutes on the integration plan for {trigger}?',
  },
  {
    segment: 'distributors', line: 'value-creation', subject: 'contribution by client cohort', persona: 'cfo', version: 1,
    claim: 'Distribution margins move on pricing tiers, service levels and royalty processing cost, not on volume alone.',
    evidence: 'We rebuild contribution by client cohort and service tier, and separate the cost to serve from the cost to process.',
    ask: 'Thirty minutes on contribution by cohort at {name}?',
  },
  {
    segment: 'distributors', line: 'pmi', subject: 'integrating a distribution platform', persona: 'royalty-ops', version: 1,
    claim: 'Distribution integrations are judged on whether clients keep getting paid correctly, not on the org chart.',
    evidence: 'We sequence the integration around royalty processing and statement cycles, keep client reporting continuous, and separate real cost savings from claimed revenue upside.',
    ask: 'Thirty minutes on how {name} is sequencing the platform integration?',
  },
  {
    segment: 'platforms', line: 'value-creation', subject: 'margin behind the growth', persona: 'cfo', version: 1,
    claim: 'Fast-growing music platforms usually know their revenue line far better than their cost to serve.',
    evidence: 'We rebuild contribution by product and rights type, size the licensing and processing cost behind each, and show where scale actually improves margin.',
    ask: 'Thirty minutes on contribution by product at {name}?',
  },
  {
    segment: 'societies', line: 'value-creation', subject: 'cost to collect against peer societies', persona: 'society-ceo', version: 1,
    claim: 'Cost to collect is the number members judge a society on, and it is rarely comparable across peers as reported.',
    evidence: 'We rebuild cost to collect on a like-for-like basis, benchmark it, and show where the gap sits between operations, technology and distribution policy.',
    ask: 'Thirty minutes on how {name}\'s cost to collect compares with peer societies?',
  },
  {
    segment: 'societies', line: 'carve-out', subject: 'a separated services unit', persona: 'society-ceo', version: 1,
    claim: 'Societies increasingly separate licensing and data operations from the member mandate, and the economics are not obvious from the inside.',
    evidence: 'We model the standalone unit — costs, arm\'s-length pricing back to the society, separation and transitional services — so the board sees the real trade.',
    ask: 'Thirty minutes on what a separated services unit would look like at {name}?',
  },
  {
    segment: 'live', line: 'pmi', subject: 'the integration sequence', persona: 'cfo', version: 1,
    claim: 'Live roll-ups integrate ticketing, promoter economics and venue operations on different clocks, and the synergy case rarely says which.',
    evidence: 'We phase the integration against real constraints — systems, on-sale calendars, contracts — and separate the savings from the revenue claims.',
    ask: 'Thirty minutes on the integration sequence after {trigger}?',
  },
  {
    segment: 'platforms', line: 'strategy', subject: 'unit economics when payouts change', persona: 'cfo', version: 1,
    claim: 'Payout, licensing and partnership economics move faster than the models built around them.',
    evidence: 'We rebuild unit economics by rights type and territory, and test what changes when payout models or licences change.',
    ask: 'Thirty minutes on how payout changes flow through {name}\'s economics?',
  },
]

/** The hook for a segment and line, falling back to the segment's first hook. */
export function hookFor(segment, line) {
  return HOOKS.find((h) => h.segment === segment && h.line === line) || HOOKS.find((h) => h.segment === segment) || null
}
