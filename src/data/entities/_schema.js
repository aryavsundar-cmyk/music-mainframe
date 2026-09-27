/**
 * Entity schema — shared vocabulary for every entity file in this folder.
 *
 * type      primary bucket (drives the /entities facet). One per entity.
 * roles[]   every bucket the entity plays in (Sony = label + publisher + distributor). Includes `type`.
 * tier      SCALE within type, never prestige. 1 = global/major · 2 = major-indie/regional leader · 3 = niche/boutique.
 * ownership public · private · pe-backed · subsidiary · member-owned · nonprofit · pension · state
 * status    active · merged (absorbed into parent; kept for history) · defunct
 * verify    true when a fact in the record is from the kickoff brief or memory and not yet confirmed
 *           against a primary source. Surfaces as a "verify" tag in the UI. Sprint 1 discipline:
 *           transcribe nothing you can't cite.
 */

export const ENTITY_TYPES = {
  label:            { label: 'Label',              lens: 'recording',  order: 1 },
  distributor:      { label: 'Distributor',        lens: 'recording',  order: 2 },
  publisher:        { label: 'Publisher / admin',  lens: 'publishing', order: 3 },
  pro:              { label: 'PRO / CMO',          lens: 'publishing', order: 4 },
  dsp:              { label: 'DSP',                lens: 'recording',  order: 5 },
  live:             { label: 'Live',               lens: 'structure',  order: 6 },
  'artist-services':{ label: 'Artist services',    lens: 'recording',  order: 7 },
  'music-tech':     { label: 'Music tech / AI',    lens: 'structure',  order: 8 },
  data:             { label: 'Data / registry',    lens: 'publishing', order: 9 },
  sync:             { label: 'Sync',               lens: 'publishing', order: 10 },
  'catalog-fund':   { label: 'Catalog investor',   lens: 'money',      order: 11 },
  'pe-fund':        { label: 'PE / sponsor',       lens: 'money',      order: 12 },
  'debt-investor':  { label: 'Credit / ABS',       lens: 'money',      order: 13 },
  strategic:        { label: 'Strategic holder',   lens: 'money',      order: 14 },
  trade:            { label: 'Trade body',         lens: 'structure',  order: 15 },
}

/**
 * The figure that measures a company of this kind — the question the canvas should be asking it.
 *
 * For most of the canvas that is revenue. For a third of it, revenue is the wrong question and always was. Asking
 * a private-equity sponsor for revenue gets you fee income, which says nothing about the capital it can move;
 * every one of these firms publishes assets under management instead, and that is the figure that compares across
 * all forty money-side actors on the canvas. Asking Apple Music for revenue gets you silence for ever, because
 * Apple has never broken it out — but the paid base is published.
 *
 * A type may name more than one: either answers the question. Anything not listed here is measured by revenue.
 * `utils/coverage.js` reads this, and `test:coverage` fails if a type is added without a decision being made.
 *
 * This is NOT a way to turn "we do not know" into "not applicable". A sponsor with no AUM on record is still an
 * open gap; the model only changes which figure closes it, and which one the page asks for.
 */
export const EXPECTED_FIGURE = {
  'pe-fund': ['aum'],
  'debt-investor': ['aum'],
  'catalog-fund': ['aum', 'catalogSize'],
  dsp: ['revenue', 'subscribers'],
}
export const DEFAULT_FIGURE = ['revenue']

/** What each figure is called where a page has to name the one it is missing. */
export const FIGURE_LABEL = {
  revenue: 'revenue',
  aum: 'assets under management',
  subscribers: 'subscribers',
  catalogSize: 'catalog size',
}

export const figuresFor = (type) => EXPECTED_FIGURE[type] || DEFAULT_FIGURE

export const TIERS = { 1: 'Tier 1 · global', 2: 'Tier 2 · major indie / regional', 3: 'Tier 3 · niche' }

export const OWNERSHIP = {
  public: 'Public', private: 'Private', 'pe-backed': 'PE-backed', subsidiary: 'Subsidiary',
  'member-owned': 'Member-owned', nonprofit: 'Nonprofit', pension: 'Pension-backed', state: 'State-linked',
}

/** Tone for a type: which flow/lens colour it carries in the UI. */
export const LENS_TONE = { recording: 'recording', publishing: 'publishing', money: 'accent', structure: 'neutral' }

export const AS_OF = '2026-09-14'

/** Source helpers — keep provenance one-liners consistent. */
export const src = (label, url) => ({ label, url })
export const site = (url) => src('Company site', url)
export const ir = (url) => src('Investor relations', url)
export const edgar = (ticker) => src(`SEC EDGAR · ${ticker}`, `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=10-K`)
export const mbw = (q) => src('Music Business Worldwide', `https://www.musicbusinessworldwide.com/?s=${encodeURIComponent(q)}`)
