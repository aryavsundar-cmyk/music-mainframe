/**
 * signals.js — entity and topic signals for the relevance scorer.
 * ENTITY_SIGNALS are GENERATED from src/data/entities.js (sibling anti-pattern #3: no hand-maintained second list).
 * Each entity contributes: its name, a short code when it is a real acronym, and any aliases below.
 * Matching is whole-word, case-insensitive for names/aliases, case-SENSITIVE for all-caps acronyms (ADA, PPL, GMR).
 */
import { ENTITIES } from '../src/data/entities.js'

// Extra spellings the trades use. Keep short; the generated name already matches.
const ALIASES = {
  umg: ['universal music', 'universal music group', 'lucian grainge'],
  'sony-music-group': ['sony music group', 'rob stringer'],
  'sony-music-entertainment': ['sony music', 'sony music entertainment'],
  'sony-music-publishing': ['sony music publishing', 'sony/atv', 'jon platt'],
  wmg: ['warner music', 'warner music group', 'robert kyncl'],
  'warner-chappell': ['warner chappell'],
  umpg: ['universal music publishing', 'umpg'],
  bmg: ['bmg rights', 'bmg music'],
  concord: ['concord music', 'concord label', 'bob valentine'],
  kobalt: ['kobalt music'],
  'primary-wave': ['primary wave', 'larry mestel'],
  'recognition-music-group': ['recognition music', 'hipgnosis'],
  'hipgnosis-songs-fund': ['hipgnosis songs fund', 'merck mercuriadis'],
  'chord-music-partners': ['chord music'],
  harbourview: ['harbourview', 'sherrese clarke'],
  'influence-media': ['influence media'],
  'iconic-artists': ['iconic artists group', 'irving azoff'],
  'shamrock-capital': ['shamrock capital', 'shamrock'],
  'litmus-music': ['litmus music'],
  'round-hill': ['round hill music', 'round hill'],
  spotify: ['spotify', 'daniel ek', 'loud & clear'],
  'apple-music': ['apple music'],
  'amazon-music': ['amazon music'],
  'youtube-music': ['youtube music', 'youtube premium', 'content id', 'lyor cohen'],
  tiktok: ['tiktok', 'bytedance', 'soundon'],
  'tencent-music': ['tencent music', 'tme'],
  'netease-cloud-music': ['netease cloud music', 'netease'],
  deezer: ['deezer', 'artist-centric'],
  siriusxm: ['siriusxm', 'sirius xm'],
  'live-nation': ['live nation', 'michael rapino'],
  ticketmaster: ['ticketmaster'],
  aeg: ['aeg', 'anschutz'],
  'aeg-presents': ['aeg presents'],
  'oak-view-group': ['oak view group', 'ovg'],
  ascap: ['ascap', 'paul williams', 'elizabeth matthews'],
  bmi: ['bmi', 'broadcast music inc', 'mike o\'neill'],
  sesac: ['sesac'],
  gmr: ['global music rights'],
  soundexchange: ['soundexchange'],
  'the-mlc': ['the mlc', 'mechanical licensing collective', 'kris ahrend'],
  prs: ['prs for music'],
  gema: ['gema'],
  sacem: ['sacem'],
  jasrac: ['jasrac'],
  socan: ['socan'],
  'apra-amcos': ['apra amcos', 'apra'],
  ppl: ['ppl'],
  merlin: ['merlin network', 'merlin'],
  distrokid: ['distrokid'],
  tunecore: ['tunecore'],
  believe: ['believe digital', 'believe music', 'denis ladegaillerie'],
  downtown: ['downtown music'],
  'virgin-music-group': ['virgin music'],
  'the-orchard': ['the orchard'],
  ada: ['ada worldwide'],
  suno: ['suno'],
  udio: ['udio'],
  elevenlabs: ['elevenlabs'],
  blackstone: ['blackstone'],
  kkr: ['kkr'],
  apollo: ['apollo global', 'apollo'],
  'bain-capital': ['bain capital'],
  carlyle: ['carlyle'],
  'new-mountain': ['new mountain capital'],
  'hellman-friedman': ['hellman & friedman', 'hellman and friedman'],
  'francisco-partners': ['francisco partners'],
  brookfield: ['brookfield'],
  'pershing-square': ['pershing square', 'bill ackman', 'ackman'],
  bollore: ['bolloré', 'bollore', 'vivendi'],
  reservoir: ['reservoir media'],
  riaa: ['riaa'],
  ifpi: ['ifpi'],
  cisac: ['cisac'],
  hybe: ['hybe'],
  weverse: ['weverse'],
  luminate: ['luminate'],
  chartmetric: ['chartmetric'],
  bandcamp: ['bandcamp'],
  songtradr: ['songtradr'],
  qobuz: ['qobuz'],
  tidal: ['tidal'],
  'cts-eventim': ['cts eventim', 'eventim'],
  'great-mountain-partners': ['great mountain partners'],
  cvc: ['cvc capital'],
  gic: ['gic'],
}

// Names too generic to match on their own (parents, platforms). They only match via ALIASES.
const NAME_BLOCKLIST = new Set(['apple', 'amazon', 'alphabet', 'block', 'meta (instagram · facebook)', 'sony group', 'tencent', 'bertelsmann', 'harman international', 'reliance jio', 'kakao entertainment', 'snap (snap sounds)', 'empire', 'stem', 'amuse', 'legends', 'gamma.', 'position music', 'instrumental', 'roon', 'splice', 'vine alternative investments', 'dice', 'seatgeek', 'endeavor', 'tko group', 'hps investment partners', 'barings', 'pimco', 'goldman sachs', 'blackrock', 'sixth street', 'ares management', 'silver lake', 'insight partners', 'flexpoint ford', 'northleaf capital partners', 'bending spoons', 'superstruct entertainment', 'superfly', 'milk & honey', 'groove guild', 'bank robber music', 'riptide music group', 'medianet', 'songview', 'isni international agency', 'music data exchange', 'music reports', 'harry fox agency', 'pandora', 'gaana', 'melon', 'jiosaavn', 'yandex music', 'anghami', 'liveone', 'sphere entertainment', 'madison square garden entertainment', 'eventbrite', 'see tickets', 'asm global', 'another planet entertainment', 'goldenvoice', 'c3 presents', 'songkick', 'vinyl group', 'create music group', 'awal', 'revelator', 'onerpm', 'vydia', 'symphonic distribution', 'unitedmasters', 'cd baby', 'songtrust', 'tempo music investments', 'pophouse entertainment', 'seeker music group', 'goldstate music', 'dundee partners', 'kobalt capital', 'muso.ai', 'soundcharts', 'native instruments', 'izotope', 'bandlab technologies', 'the anschutz corporation', 'access industries', 'providence equity partners', 'state of michigan retirement systems', 'mri', 'siae', 'komca', 'hfa'])

const TYPE_WEIGHT = { label: 14, publisher: 14, pro: 16, dsp: 12, 'catalog-fund': 18, 'pe-fund': 12, 'debt-investor': 12, distributor: 10, live: 10, 'artist-services': 8, 'music-tech': 8, data: 6, sync: 6, strategic: 6, trade: 6 }

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
function toPattern(term) {
  const caps = /^[A-Z0-9&.-]{2,6}$/.test(term)
  return { re: new RegExp(`(^|[^a-z0-9])${escape(term.toLowerCase())}(?=$|[^a-z0-9])`, caps ? '' : 'i'), caps, term }
}

export const ENTITY_SIGNALS = ENTITIES.map((e) => {
  const terms = new Set()
  if (!NAME_BLOCKLIST.has(e.name.toLowerCase())) terms.add(e.name.toLowerCase())
  if (e.short && e.short.length >= 3 && e.short !== e.name && /^[A-Z]+$/.test(e.short)) terms.add(e.short)
  for (const a of ALIASES[e.id] || []) terms.add(a)
  return { id: e.id, name: e.name, type: e.type, roles: e.roles, weight: TYPE_WEIGHT[e.type] || 6, patterns: [...terms].map(toPattern) }
}).filter((s) => s.patterns.length)

export const TOPIC_SIGNALS = {
  'catalog-deal': { label: 'Catalog deal', keywords: ['catalog', 'catalogue', 'acquires the rights', 'sells his catalog', 'sells her catalog', 'song rights', 'master recordings', 'publishing rights', 'buys stake', 'acquires a stake'], weight: 12 },
  abs: { label: 'ABS / credit', keywords: ['securitization', 'securitisation', 'asset-backed', 'abs', 'kbra', 'bonds backed', 'royalty-backed', 'whole business', 'tranche', 'notes backed'], weight: 14 },
  'pe-capital': { label: 'PE / capital', keywords: ['private equity', 'fund closes', 'raises $', 'raises €', 'investment firm', 'take-private', 'takes private', 'buyout', 'majority stake', 'minority stake', 'valuation'], weight: 10 },
  'm&a': { label: 'M&A', keywords: ['acquisition', 'acquires', 'merger', 'merges', 'to acquire', 'agrees to buy', 'deal to buy', 'combination'], weight: 8 },
  'dsp-economics': { label: 'DSP economics', keywords: ['per-stream', 'per stream', 'royalty rate', 'payout', 'price increase', 'price hike', 'subscribers', 'arpu', 'bundle', 'superfan', 'pro-rata', 'artist-centric'], weight: 8 },
  'pro-reform': { label: 'PRO / licensing', keywords: ['consent decree', 'mechanical', 'performing rights', 'collecting society', 'copyright royalty board', 'crb', 'phonorecords', 'blanket licence', 'blanket license', 'rate court', 'distributions'], weight: 10 },
  litigation: { label: 'Litigation', keywords: ['lawsuit', 'sues', 'sued', 'settles', 'settlement', 'court', 'judge', 'antitrust', 'doj', 'verdict', 'appeal', 'complaint filed'], weight: 8 },
  ai: { label: 'AI', keywords: ['generative ai', 'ai-generated', 'ai music', 'training data', 'ai licensing', 'suno', 'udio', 'ai model', 'artificial intelligence'], weight: 8 },
  live: { label: 'Live / ticketing', keywords: ['tour', 'ticketing', 'ticket', 'venue', 'festival', 'box office', 'promoter', 'arena', 'residency'], weight: 5 },
  earnings: { label: 'Earnings / filings', keywords: ['quarterly', 'earnings', 'revenue rose', 'revenue fell', 'fiscal', 'annual report', 'results', '10-k', '10-q', '8-k', 'sec filing', 'guidance'], weight: 6 },
  'policy': { label: 'Policy', keywords: ['legislation', 'bill', 'congress', 'parliament', 'european commission', 'regulator', 'competition authority', 'cma', 'ftc'], weight: 6 },
}

/** Compiled whole-word matchers for topic keywords ('abs' must not match 'labs'). */
export const TOPIC_MATCHERS = Object.fromEntries(Object.entries(TOPIC_SIGNALS).map(([k, t]) => [k, t.keywords.map((kw) => new RegExp(`(^|[^a-z0-9])${escape(kw)}(?=$|[^a-z0-9])`))]))

export const SIGNAL_STATS = { entities: ENTITY_SIGNALS.length, patterns: ENTITY_SIGNALS.reduce((s, e) => s + e.patterns.length, 0), topics: Object.keys(TOPIC_SIGNALS).length }
