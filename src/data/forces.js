/**
 * forces.js — the Music Market Five Forces: five strategic forces that deals and market events are read against.
 *
 * This file is the taxonomy, transcribed from the operator's feature spec (2026-09-21). It is the source of truth
 * for the theses AND for classification: utils/forces.js compiles `classification_keywords` into its matchers, so
 * editing a keyword here changes what gets tagged. Engineering additions made during calibration live in
 * utils/forces.js, beside the reason for each, never here.
 *
 * Direction is always read against the thesis as written below — "supports" means the event is evidence for the
 * thesis, "challenges" means it pushes against it.
 */

export const FORCES = [
  {
    id: 'capital_ownership',
    number: 1,
    title: 'Capital is reshaping music ownership',
    short_title: 'Capital and ownership',
    thesis: 'Capital now rewards durable cash flow, clean rights, and operating scale—not catalog fame alone.',
    summary: 'Music rights have become financeable assets. The market is shifting from broad catalog buying to selective, operations-led underwriting.',
    industry_force: [
      'Institutional capital has made music rights a financeable asset class.',
      'Consolidation favors scaled owners with stronger collection and administration capabilities.',
    ],
    evidence_signals: [
      'Catalog acquisition, merger, or platform consolidation',
      'Debt financing, securitization, royalty-backed lending, or warehouse facility',
      'Advance-rate, leverage, DSCR, or covenant disclosure',
      'Administration, royalty-processing, or collection-platform investment',
    ],
    implications: [
      'Trophy-catalog acquisition offers weaker risk-adjusted returns for financial buyers.',
      'Value creation depends on title-level diligence and post-close operating execution.',
    ],
    market_opportunities: [
      'Mid-market catalog aggregation',
      'Rights administration and data platforms',
      'Collection improvement and royalty operations',
      'Structured financing for durable royalty cash flow',
    ],
    classification_keywords: [
      'catalog acquisition', 'music rights financing', 'royalty-backed loan', 'securitization', 'warehouse facility',
      'advance rate', 'debt service coverage', 'DSCR', 'catalog consolidation', 'publishing acquisition',
      'master acquisition', 'royalty administration',
    ],
  },
  {
    id: 'discovery_distribution',
    number: 2,
    title: 'Discovery and distribution are fragmenting',
    short_title: 'Discovery and distribution',
    thesis: 'Platform-led discovery and fragmented data make rights administration a core source of value.',
    summary: 'Platforms control visibility and monetization; incomplete rights data creates collection leakage.',
    industry_force: [
      'Discovery has shifted from radio and labels to algorithms, social video, and creator platforms.',
      'Fragmented metadata, identifiers, and reporting delay or prevent collections.',
    ],
    evidence_signals: [
      'DSP algorithm, recommendation, playlist, or platform-policy change',
      'Metadata matching, ISRC, ISWC, DDEX, or rights-data initiative',
      'Unmatched-royalty, black-box income, claims, or royalty-reconciliation development',
      'Platform revenue concentration or distribution partnership',
    ],
    implications: [
      'Apparent platform diversification can conceal concentrated revenue exposure.',
      'Rights administration is a value-creation capability, not back-office overhead.',
    ],
    market_opportunities: [
      'Metadata and matching technology',
      'Royalty reconciliation and recovery services',
      'Rights-data standardization',
      'Platform-concentration underwriting',
    ],
    classification_keywords: [
      'metadata', 'ISRC', 'ISWC', 'DDEX', 'royalty matching', 'unmatched royalties', 'black box royalties', 'playlist',
      'algorithm', 'TikTok', 'YouTube', 'Spotify', 'Apple Music', 'DSP', 'Content ID', 'rights data',
    ],
  },
  {
    id: 'superfan_live',
    number: 3,
    title: 'Superfan and live monetization are scarce, premium inventory',
    short_title: 'Superfan and live',
    thesis: 'As streaming matures, growth shifts from more listeners to more spend per high-value fan.',
    summary: 'Live access, artist time, and premium experiences are fixed, perishable inventory with pricing power.',
    industry_force: [
      'VIP, ticketing, merchandise, sponsorship, and fan access sit outside traditional royalty systems.',
      'Premium access is finite: seat location, artist proximity, and backstage capacity cannot be replicated.',
    ],
    evidence_signals: [
      'Ticketing, venue, promoter, or live-entertainment transaction',
      'VIP, hospitality, premium-seat, or experiential-product launch',
      'Fan-club, membership, presale, or direct-to-fan-commerce initiative',
      'Ticketing regulation, antitrust action, fee policy, or resale-market development',
    ],
    implications: [
      'Live can sustain premium pricing but inventory expansion is constrained.',
      'Name, image, likeness, and brand upside should be valued separately from contracted royalties.',
    ],
    market_opportunities: [
      'Direct-to-fan data and CRM',
      'VIP and experience packaging',
      'Membership, fan-club, and recurring-commerce programs',
      'Transparent pricing and compliant resale infrastructure',
    ],
    classification_keywords: [
      'ticketing', 'concert', 'tour', 'venue', 'promoter', 'VIP', 'hospitality', 'meet and greet', 'backstage',
      'premium seating', 'fan club', 'membership', 'presale', 'merchandise', 'sponsorship', 'superfan', 'NIL',
      'name image likeness',
    ],
  },
  {
    id: 'ai_rights_control',
    number: 4,
    title: 'AI is both a revenue layer and a control problem',
    short_title: 'AI rights and control',
    thesis: 'AI expands music creation and licensing, but rights control and attribution determine who captures the value.',
    summary: 'Generative AI increases content supply and creates new licensing pathways, while exposing gaps in training-data, voice, and provenance rights.',
    industry_force: [
      'Generative tools lower music-production costs and increase content volume.',
      'Existing agreements often do not cover training, synthetic performances, voice, or likeness.',
    ],
    evidence_signals: [
      'AI-music investment, financing, partnership, or licensing deal',
      'Training-data, copyright, voice, likeness, or digital-replica lawsuit',
      'Fingerprinting, provenance, attribution, or content-identification initiative',
      'DSP policy change affecting AI-generated music',
    ],
    implications: [
      'Rights owners need fingerprinting, provenance, and claims-management infrastructure.',
      'Voice and likeness require separate contractual treatment from master and publishing rights.',
    ],
    market_opportunities: [
      'Opt-in training-data licensing',
      'Voice and likeness licensing',
      'Fingerprinting and provenance tools',
      'AI attribution, permissions, and royalty-allocation infrastructure',
    ],
    classification_keywords: [
      'generative AI', 'AI music', 'Suno', 'Udio', 'ElevenLabs', 'synthetic voice', 'voice clone', 'digital replica',
      'training data', 'copyright training', 'provenance', 'fingerprinting', 'content identification',
      'AI licensing', 'AI royalties',
    ],
  },
  {
    id: 'emerging_markets',
    number: 5,
    title: 'Growth is shifting to emerging markets',
    short_title: 'Emerging markets',
    thesis: 'The next listener-growth wave is outside mature Western markets, but realizing revenue requires local operating capability.',
    summary: 'Emerging markets expand audience and streaming demand; local collection, tax, FX, and data complexity determine net cash realization.',
    industry_force: [
      'New listener growth is concentrated in China, Latin America, Africa, and the Middle East.',
      'Local pricing, societies, currencies, and statutory rules vary materially by territory.',
    ],
    evidence_signals: [
      'Market-entry, local partnership, or territory-specific distribution deal',
      'Investment in a regional DSP, label, publisher, promoter, or collection platform',
      'Local collection-society, sub-publishing, licensing, or regulatory development',
      'FX, tax, repatriation, or royalty-reporting change affecting local cash conversion',
    ],
    implications: [
      'Global rights do not guarantee complete, timely, or economically efficient collections.',
      'Underwriting must focus on net realizable cash, not consumption growth alone.',
    ],
    market_opportunities: [
      'Local collection and sub-publishing partnerships',
      'Territory-level royalty, tax, and FX analytics',
      'Local-demand repertoire acquisition',
      'Market-specific distribution and administration infrastructure',
    ],
    classification_keywords: [
      'China', 'Latin America', 'Africa', 'Middle East', 'MENA', 'Brazil', 'Mexico', 'India', 'Southeast Asia',
      'Tencent Music', 'NetEase', 'sub-publishing', 'collection society', 'foreign exchange', 'FX',
      'withholding tax', 'repatriation', 'localized pricing',
    ],
  },
]

export const FORCE_BY_ID = Object.fromEntries(FORCES.map((f) => [f.id, f]))
export const FORCE_IDS = FORCES.map((f) => f.id)

/** event_classification, from the spec. */
export const CLASSIFICATION = {
  primaryRule: 'Assign the force most directly affected by the transaction, announcement, policy event, litigation, financing, or operating development.',
  secondaryRule: 'Assign zero to three secondary forces when the event has a material, evidenced relationship to another force.',
  maxSecondary: 3,
}

export const CONFIDENCE = {
  high: 'Explicit, direct relationship to the force',
  medium: 'Material but indirect relationship',
  low: 'Contextual or emerging relationship',
}

export const DIRECTIONS = {
  supports: 'Supports',
  challenges: 'Challenges',
  mixed: 'Mixed',
  neutral: 'Neutral',
}

export const EXPOSURE_TYPES = {
  transaction: 'Transaction',
  financing: 'Financing',
  'operating initiative': 'Operating initiative',
  'technology launch': 'Technology launch',
  'commercial partnership': 'Commercial partnership',
  'regulatory or legal event': 'Regulatory or legal event',
  'market data point': 'Market data point',
}

export const RIGHTS_TYPES = { publishing: 'Publishing', recorded_music: 'Recorded music' }

export const REVENUE_STREAMS = {
  streaming: 'Streaming',
  performance: 'Performance',
  mechanical: 'Mechanical',
  sync: 'Sync',
  neighbouring: 'Neighbouring rights',
  live: 'Live and ticketing',
  merchandise: 'Merchandise',
  sponsorship: 'Sponsorship',
  likeness: 'Name, image and likeness',
  physical: 'Physical',
}
