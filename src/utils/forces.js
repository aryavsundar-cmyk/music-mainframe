/**
 * forces.js — reads deals and market events against the Five Forces (data/forces.js).
 *
 * One rule governs everything here: no force is assigned without evidence in the record. Every assignment keeps
 * the evidence that produced it — the exact phrase from the title or summary, or the structured field (deal type,
 * structure, a party's entity type, where a party is based, a feed topic, an SEC form). `evidenceHolds` checks any
 * piece of evidence against its record, and the tests run it over every tag. It is the same rule that governs
 * genre tags in the catalog scan: a tag you cannot trace is a tag you cannot defend.
 *
 * The engine is deterministic and pure. It reads what a record says; it does not guess what a record means.
 * Where the words are not there, the tag is not there — a missed tag costs less than a wrong one, because a
 * wrong one gets quoted.
 */
import { FORCES, FORCE_BY_ID, FORCE_IDS, CLASSIFICATION } from '../data/forces.js'
import { ENTITIES, getEntity } from '../data/entities.js'
import { ENTITY_TYPES } from '../data/entities/_schema.js'
import { TX_TYPES, STRUCTURES, partyName } from '../data/transactions.js'

// ── Matching ────────────────────────────────────────────────────────────────────────────────────────────

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Compiles a taxonomy keyword into a matcher. Acronyms (DSCR, ISRC, FX, NIL) match case-sensitively, so "fx" in
 * a URL or "nil" in prose never counts. Spaces and hyphens are interchangeable ("sub-publishing", "royalty-backed
 * loan"), US and UK spellings both match ("securitization"/"securitisation", "catalog"/"catalogue"), and the
 * last word may be plural. Boundaries are letters, not \b, so "India" does not match "Indiana".
 */
export function compileKeyword(keyword) {
  const acronym = /^[A-Z0-9]+$/.test(keyword)
  let body = keyword.split(/[\s-]+/).map(esc).join('[\\s-]*')
  body = body.replace(/iz/g, 'i[sz]').replace(/catalog/gi, (m) => `${m}(?:ue)?`)
  if (acronym) body += 's?'
  else if (/[^aeiou]y$/i.test(keyword)) body = body.replace(/y$/i, '(?:y|ies)')
  else if (/[a-z]$/i.test(keyword)) body += '(?:s|es)?'
  return new RegExp(`(?<![A-Za-z0-9])${body}(?![A-Za-z0-9])`, acronym ? 'g' : 'gi')
}

/**
 * Additions made during calibration against the 61 transactions on record and the live feed (2026-09-21).
 * Each exists because a record that plainly belonged to a force used a word the taxonomy did not list.
 */
const EXTRA_TERMS = {
  capital_ownership: [
    // Broad words: they corroborate a capital reading but lose a tie to anything more specific.
    ['catalog', /(?<![A-Za-z])catalog(?:ue)?s?(?![A-Za-z])/gi, 'deals say "acquires X\'s catalog", not "catalog acquisition"', 'generic'],
    ['royalty', /(?<![A-Za-z])royalt(?:y|ies)(?![A-Za-z])/gi, 'royalty-backed deals rarely use the taxonomy phrase', 'generic'],
  ],
  discovery_distribution: [
    ['matching', /(?<![A-Za-z])(?:matching|reconciliation|unmatched)(?![A-Za-z])/gi, 'the work the thesis describes, named directly'],
    ['distribution', /(?<![A-Za-z])(?:distribution (?:deal|platform|company)|distributor)s?(?![A-Za-z])/gi, 'distribution platforms are named, not described'],
    ['algorithmic', /(?<![A-Za-z])(?:algorithmic|playlisting|recommendation(?:s)?)(?![A-Za-z])/gi, 'adjectival forms of listed keywords'],
  ],
  superfan_live: [
    ['touring', /(?<![A-Za-z])(?:touring|festivals?|live entertainment|live events?)(?![A-Za-z])/gi, 'live activity named without the listed nouns', 'topical'],
    ['ticket pricing', /(?<![A-Za-z])(?:tickets?|on-?sales?|resale|dynamic pricing|ticket (?:prices|fees)|ballot)(?![A-Za-z])/gi, 'the pricing and access mechanics the thesis is about'],
    ['likeness', /(?<![A-Za-z])name[,\s-]+(?:image[,\s-]+)?(?:and[\s-]+)?likeness(?![A-Za-z])/gi, 'catches "name-and-likeness", as in the Pink Floyd deal'],
    ['direct-to-fan', /(?<![A-Za-z])(?:direct[\s-]to[\s-]fan|fan(?:s|base)? (?:commerce|subscriptions?|tiers?))(?![A-Za-z])/gi, 'direct-to-fan commerce, per the evidence signals'],
  ],
  ai_rights_control: [
    ['AI', /(?<![A-Za-z])AI(?![A-Za-z])/g, 'bare "AI" in headlines — case-sensitive, so it cannot match inside words', 'topical'],
    ['voice cloning', /(?<![A-Za-z])(?:voice[\s-]clon(?:e|es|ing)|deepfakes?|synthetic (?:music|tracks?|songs?)|AI[\s-]generated)(?![A-Za-z])/gi, 'common variants of listed keywords'],
    ['AI developers', /(?<![A-Za-z])(?:Anthropic|OpenAI|Stability AI|Lyria|MusicGen|Mubert|Boomy)(?![A-Za-z])/g, 'model developers named in training-data disputes and licensing deals'],
  ],
  emerging_markets: [],
}

/**
 * Geography. Named regions are evidence for emerging markets when `emerging` is true. Adjectives are included
 * ("African artists", "the Chinese market") because the nouns alone miss most of them.
 */
const GEO_TERMS = [
  [/(?<![A-Za-z])(?:China|Chinese|Hong Kong|Tencent Music|NetEase)(?![A-Za-z])/g, 'China', true],
  [/(?<![A-Za-z])(?:India|Indian|Bollywood|Mumbai|Delhi|Bengaluru|Bangalore)(?![A-Za-z])/g, 'India', true],
  [/(?<![A-Za-z])(?:Latin America(?:n)?|LatAm|Latin music|reggaeton|Brazil(?:ian)?|São Paulo|Sao Paulo|Mexic(?:o|an)|Argentin(?:a|e|ian)|Colombia(?:n)?|Chile(?:an)?|Peru(?:vian)?)(?![A-Za-z])/g, 'Latin America', true],
  [/(?<![A-Za-z])(?:Africa(?:n)?|Afrobeats?|Amapiano|Nigeria(?:n)?|Kenya(?:n)?|Ghana(?:ian)?|Lagos)(?![A-Za-z])/g, 'Africa', true],
  [/(?<![A-Za-z])(?:Middle East(?:ern)?|MENA|Saudi(?: Arabia)?|UAE|Dubai|Abu Dhabi|Emirat(?:es|i)|Qatar|Egypt(?:ian)?)(?![A-Za-z])/g, 'Middle East', true],
  [/(?<![A-Za-z])(?:Southeast Asia(?:n)?|South-East Asia(?:n)?|Indonesia(?:n)?|Vietnam(?:ese)?|Philippines|Filipino|Thailand|Malaysia(?:n)?|Singapore)(?![A-Za-z])/g, 'Southeast Asia', true],
]

/**
 * Generic terms in the emerging-markets taxonomy — "collection society", "FX", "withholding tax". They describe
 * how cross-border money moves everywhere, so on their own they would tag BMI as an emerging-markets deal. They
 * count only when the record also names an emerging market.
 */
const GATED = new Set(['sub-publishing', 'collection society', 'foreign exchange', 'FX', 'withholding tax', 'repatriation', 'localized pricing'])
/**
 * Words that say an item is ABOUT live music without saying anything about its economics. A tour controversy
 * mentions "concert"; it is not evidence that premium access has pricing power. They still classify, but they
 * cannot earn high confidence on their own.
 */
const TOPICAL = new Set(['concert', 'tour', 'venue'])
const GEO_KEYWORDS = new Set(['China', 'Latin America', 'Africa', 'Middle East', 'MENA', 'Brazil', 'Mexico', 'India', 'Southeast Asia', 'Tencent Music', 'NetEase'])

/** City first: several country codes are also US state codes (IN is Indiana and India; IL is Illinois and Israel). */
const CITY_REGION = {
  Mumbai: ['India', true], Gurugram: ['India', true], 'New Delhi': ['India', true], Delhi: ['India', true], Bengaluru: ['India', true], Bangalore: ['India', true],
  'Tel Aviv': ['Middle East', false], 'Abu Dhabi': ['Middle East', true], Dubai: ['Middle East', true], Riyadh: ['Middle East', true],
  Berlin: ['Europe', false], Munich: ['Europe', false], Gütersloh: ['Europe', false], Hamburg: ['Europe', false],
  Toronto: ['North America', false], Montreal: ['North America', false], Vancouver: ['North America', false],
  Singapore: ['Southeast Asia', true], Jakarta: ['Southeast Asia', true], 'São Paulo': ['Latin America', true], 'Mexico City': ['Latin America', true],
  Lagos: ['Africa', true], Johannesburg: ['Africa', true], Nairobi: ['Africa', true], Moscow: ['Europe', false],
}
const US_STATES = new Set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split(' '))
const COUNTRY_REGION = {
  AE: ['Middle East', true], SA: ['Middle East', true], QA: ['Middle East', true], EG: ['Africa', true], ZA: ['Africa', true], NG: ['Africa', true], KE: ['Africa', true], GH: ['Africa', true],
  CN: ['China', true], HK: ['China', true], BR: ['Latin America', true], MX: ['Latin America', true], CL: ['Latin America', true], PE: ['Latin America', true],
  VN: ['Southeast Asia', true], PH: ['Southeast Asia', true], TH: ['Southeast Asia', true], MY: ['Southeast Asia', true], SG: ['Southeast Asia', true],
  UK: ['Europe', false], GB: ['Europe', false], FR: ['Europe', false], IT: ['Europe', false], NL: ['Europe', false], NO: ['Europe', false], SE: ['Europe', false], ES: ['Europe', false],
  IE: ['Europe', false], CH: ['Europe', false], BE: ['Europe', false], DK: ['Europe', false], FI: ['Europe', false], AT: ['Europe', false], PT: ['Europe', false], PL: ['Europe', false], LU: ['Europe', false], RU: ['Europe', false],
  JP: ['Asia-Pacific', false], KR: ['Asia-Pacific', false], AU: ['Asia-Pacific', false], NZ: ['Asia-Pacific', false], TW: ['Asia-Pacific', false],
}

/** hq "Munich, DE · New York, NY" → [{ city, region, emerging }]. Unknown or ambiguous places are skipped. */
export function placesOf(hq = '') {
  return String(hq).split('·').map((p) => p.trim()).filter(Boolean).flatMap((part) => {
    const [city, code] = part.split(',').map((s) => s.trim())
    if (CITY_REGION[city]) return [{ city, region: CITY_REGION[city][0], emerging: CITY_REGION[city][1] }]
    if (!code) return []
    if (US_STATES.has(code)) return [{ city, region: 'North America', emerging: false }]
    return COUNTRY_REGION[code] ? [{ city, region: COUNTRY_REGION[code][0], emerging: COUNTRY_REGION[code][1] }] : []
  })
}

/**
 * Entities a title names, as subjects. Only entities whose type or location can carry a force are indexed, names
 * shorter than four characters are ignored (too many false hits), and matching is case-sensitive on whole words.
 */
let NAME_INDEX = null
function namedIn(title = '') {
  if (!NAME_INDEX) {
    NAME_INDEX = []
    for (const e of ENTITIES) {
      if (MONEY_TYPES.has(e.type)) continue
      if (!PARTY_FORCE[e.type] && !placesOf(e.hq).some((p) => p.emerging)) continue
      // Headlines drop the corporate suffix: "Live Nation Entertainment" is "Live Nation" in every headline.
      const brand = e.name.replace(/(?:\s+(?:Entertainment|Group|Holdings|Inc\.?|Ltd\.?|LLC|plc|Corporation|Corp\.?|Company|SE|AG))+$/i, '')
      for (const n of new Set([e.name, brand, e.short].filter((x) => x && x.length >= 4))) NAME_INDEX.push([new RegExp(`(?<![A-Za-z0-9])${esc(n)}(?![A-Za-z0-9])`), e, n])
    }
  }
  const seen = new Set()
  const out = []
  for (const [re, e, n] of NAME_INDEX) if (!seen.has(e.id) && re.test(title)) { seen.add(e.id); out.push({ ...e, hit: n }) }
  return out
}

/** Party entity types that put the SUBJECT of a deal inside a force. Money-side types add nothing here. */
const PARTY_FORCE = {
  dsp: ['discovery_distribution', 3],
  distributor: ['discovery_distribution', 3],
  data: ['discovery_distribution', 3],
  'artist-services': ['discovery_distribution', 2],
  live: ['superfan_live', 3],
  pro: ['discovery_distribution', 1],
}
const MONEY_TYPES = new Set(['catalog-fund', 'pe-fund', 'debt-investor', 'strategic'])

/**
 * A tier-1 company's headquarters says nothing about where an event happens. TikTok is registered in Singapore;
 * a TikTok how-to is not a Southeast Asian event. So only regional companies (tiers 2 and 3) contribute place,
 * and a deal among global companies is tagged "Global" rather than wherever their head offices sit.
 */
const isGlobal = (e) => Number(e?.tier) === 1
const placesFor = (e) => (isGlobal(e) ? [] : placesOf(e?.hq))

/** Feed topics from server/signals.js, read as structured evidence. */
const TOPIC_FORCE = { ai: 'ai_rights_control', live: 'superfan_live', abs: 'capital_ownership', 'catalog-deal': 'capital_ownership', 'pe-capital': 'capital_ownership', 'm&a': 'capital_ownership', 'pro-reform': 'discovery_distribution' }

/** SEC forms. Routine forms (insider trades, 144s, quarterlies) are not evidence of anything strategic. */
const FORM_SIGNIFICANT = { 'S-4': 'transaction', '425': 'transaction', DEFM14A: 'transaction', 'SC 14D9': 'transaction', 'SC 13D': 'transaction', 'ABS-15G': 'financing', '8-K': 'operating initiative' }

const FINANCE_VERBS = /(?<![A-Za-z])(?:raises?|raised|funding|financing|series [A-F](?![A-Za-z])|growth capital|capital (?:raise|solution|investment)|invests?|investment|securiti[sz]ations?|bonds?|notes offering|credit facility|loans?)(?![A-Za-z])/i
const DEAL_VERBS = /(?<![A-Za-z])(?:acquires?|acquired|acquisition|merger|merges?|buys|bought|takes? (?:a )?(?:majority |minority |controlling )?stake|take-private|takeover)(?![A-Za-z])/i

const MATCHERS = FORCES.map((f) => ({
  id: f.id,
  terms: [
    ...f.classification_keywords.map((k) => ({ term: k, re: compileKeyword(k), gated: f.id === 'emerging_markets' && GATED.has(k), geo: GEO_KEYWORDS.has(k), topical: TOPICAL.has(k) })),
    ...(EXTRA_TERMS[f.id] || []).map(([term, re, , kind]) => ({ term, re, gated: false, geo: false, generic: kind === 'generic', topical: kind === 'topical' })),
  ],
}))

// ── Evidence ────────────────────────────────────────────────────────────────────────────────────────────

const WEIGHT = { title: 3, summary: 1, valueNote: 1 }
const fieldLabel = { title: 'title', summary: 'summary', valueNote: 'value note' }

/**
 * `placeWeight` is what a place named in a summary is worth. Deal summaries are written for the record, so a
 * place there is where the deal is (2). News summaries are often roundups — "…pulled out of a concert in Abu
 * Dhabi" in a piece about something else — so there a place is a mention (1) and cannot carry a force alone.
 */
function textEvidence(record, fields, geoFound, placeWeight = 2) {
  const out = []
  for (const field of fields) {
    const text = record[field]
    if (!text) continue
    for (const m of MATCHERS) {
      for (const t of m.terms) {
        if (t.gated && !geoFound) continue
        t.re.lastIndex = 0
        const hit = t.re.exec(text)
        if (!hit) continue
        const weight = t.geo && field !== 'title' ? placeWeight : t.topical && field === 'title' ? 2 : WEIGHT[field]
        out.push({ force: m.id, via: 'text', field, term: t.term, match: hit[0], at: hit.index, weight, generic: !!t.generic, topical: !!t.topical, label: `“${hit[0]}” in the ${fieldLabel[field]}` })
      }
    }
    for (const [re, region, emerging] of GEO_TERMS) {
      re.lastIndex = 0
      const hit = re.exec(text)
      if (hit && emerging) out.push({ force: 'emerging_markets', via: 'text', field, term: region, match: hit[0], at: hit.index, weight: field === 'title' ? 3 : placeWeight, label: `“${hit[0]}” in the ${fieldLabel[field]}`, region })
    }
  }
  return out
}

function geoInText(record, fields) {
  const regions = new Set()
  for (const field of fields) {
    const text = record[field]
    if (!text) continue
    for (const [re, region, emerging] of GEO_TERMS) { re.lastIndex = 0; if (emerging && re.test(text)) regions.add(region) }
  }
  return regions
}

/**
 * Collapse repeats: one piece of evidence per force and matched text. "Spotify" found as a keyword and "Spotify"
 * found as a named entity are the same fact, so the stronger one is kept and it counts once.
 */
function dedupe(list) {
  const best = new Map()
  for (const e of list) {
    const k = `${e.force}|${e.field === 'named' ? 'title' : e.field}|${String(e.match || e.value).toLowerCase()}`
    const cur = best.get(k)
    if (!cur || e.weight > cur.weight) best.set(k, e)
  }
  const kept = list.filter((e) => best.get(`${e.force}|${e.field === 'named' ? 'title' : e.field}|${String(e.match || e.value).toLowerCase()}`) === e)
  // Overlapping words are one fact: "Royalty-administration" contains "Royalty", and counting both would let a
  // single hyphenated phrase outvote two separate ones. Within a field, a match inside a longer match drops out.
  const inside = (a, b) => a !== b && a.via === 'text' && b.via === 'text' && a.force === b.force && a.field === b.field
    && a.at != null && b.at != null && a.at >= b.at && a.at + a.match.length <= b.at + b.match.length && b.match.length > a.match.length
  // A mentioned entity whose name was already found as a keyword is the same fact twice ("Spotify").
  const repeated = (a) => a.field === 'entity' && kept.some((b) => b.via === 'text' && b.force === a.force && (a.names || []).includes(b.match.toLowerCase()))
  return kept.filter((a) => !kept.some((b) => inside(a, b)) && !repeated(a))
}

// ── Direction, exposure, rights, revenue ────────────────────────────────────────────────────────────────

const GENERIC_CHALLENGE = /(?<![A-Za-z])(?:terminat\w*|withdr[ae]wn?|abandon\w*|collaps\w*|called off|scrapped|blocked|rejected)(?![A-Za-z])/i
const COUNTER = {
  capital_ownership: [[/(?<![A-Za-z])(?:write[\s-]?downs?|impairments?|defaults?|downgrad\w*|below target)(?![A-Za-z])/i, 'a write-down, default or downgrade']],
  discovery_distribution: [],
  superfan_live: [
    // "Closed after DOJ review" is a cleared deal, not an action against pricing power — so a regulator's name
    // counts only beside a suit, trial, probe or break-up.
    [/(?:antitrust|monopol\w*|DOJ|FTC|Justice Department|attorneys? general)\W+(?:\w+\W+){0,4}?(?:lawsuits?|suits?|sues|sued|actions?|case|trial|probe|investigation|complaint|break[\s-]?up)|(?:lawsuits?|suits?|trial|case|probe)\W+(?:\w+\W+){0,3}?(?:antitrust|monopol\w*)|break[\s-]?up of/i, 'antitrust action against pricing power'],
    [/(?<![A-Za-z])(?:junk fees?|fee (?:caps?|bans?|limits?)|price caps?|all-in pricing|resale (?:bans?|caps?))(?![A-Za-z])/i, 'fee or price regulation'],
    [/(?<![A-Za-z])(?:jury|verdict)(?![A-Za-z])/i, 'a court verdict'],
  ],
  ai_rights_control: [[/(?<![A-Za-z])fair use(?![A-Za-z])/i, 'a fair-use argument or ruling for AI training']],
  emerging_markets: [[/(?<![A-Za-z])(?:devalu\w*|currency (?:crisis|controls?)|capital controls?|sanctions?)(?![A-Za-z])/i, 'a currency or capital constraint']],
}
const EXPLICIT_SUPPORT = /(?<![A-Za-z])(?:licens\w* (?:deal|agreement|partnership)|settl\w*|partnership|record (?:revenue|high|year|quarter)|all-time high)(?![A-Za-z])/i
const DATA_UP = /(?<![A-Za-z])(?:record|grew|growth|up \d+(?:\.\d+)?%|rose|rises|surge\w*|beats?|jump\w*)(?![A-Za-z])/i
const DATA_DOWN = /(?<![A-Za-z])(?:declin\w*|fell|falls|down \d+(?:\.\d+)?%|miss(?:es|ed)?|drops?|slump\w*|shrank|contract\w*)(?![A-Za-z])/i

function directionFor(force, record, exposure, text, kind) {
  const reasons = []
  // "Withdrew" and "scrapped" say a DEAL did not proceed. In a news item they are too ambiguous to read — a
  // society withdrawing plans to register AI music is not evidence against the AI thesis.
  if (record.status === 'terminated') reasons.push('the deal was terminated')
  else if (kind === 'deal' && GENERIC_CHALLENGE.test(text)) reasons.push(`“${text.match(GENERIC_CHALLENGE)[0]}” — the deal did not proceed`)
  for (const [re, why] of COUNTER[force] || []) if (re.test(text)) reasons.push(why)
  const isData = exposure === 'market data point'
  const up = isData ? DATA_UP.test(text) : EXPLICIT_SUPPORT.test(text)
  const down = isData && DATA_DOWN.test(text)
  if (down) reasons.push('the figures moved down')
  // Emerging-market constraints are the thesis's own caveat — local realisation is hard — so they read as
  // mixed rather than as evidence against the growth shift itself.
  if (reasons.length && force === 'emerging_markets' && !down) return { direction: 'mixed', reason: `Growth thesis intact, realisation harder: ${reasons.join('; ')}.` }
  if (reasons.length && up) return { direction: 'mixed', reason: `Evidence both ways: ${reasons.join('; ')}.` }
  if (reasons.length) return { direction: 'challenges', reason: `Pushes against the thesis: ${reasons.join('; ')}.` }
  if (isData && !up) return { direction: 'neutral', reason: 'A data point with no clear movement either way.' }
  return { direction: 'supports', reason: isData ? 'The figures moved in the direction the thesis expects.' : 'An instance of the force as the thesis describes it.' }
}

function exposureForDeal(t) {
  if (/joint venture/i.test(t.title)) return 'commercial partnership'
  if (t.type === 'abs' || t.type === 'debt') return 'financing'
  if (t.type === 'pe-round') return /(?<![A-Za-z])(?:stake|control|acquir\w*|buys|bought|sells|sold)(?![A-Za-z])/i.test(t.title) ? 'transaction' : 'financing'
  return 'transaction'
}

const EXPOSURE_RULES = [
  ['regulatory or legal event', /(?<![A-Za-z])(?:lawsuits?|sues|sued|complaints?|court|ruling|judge|antitrust|DOJ|FTC|regulat\w*|legislat\w*|bill|senate|congress|copyright office|AI Act|inquiry|settle\w*|verdict|jury)(?![A-Za-z])/i],
  ['financing', FINANCE_VERBS],
  ['transaction', DEAL_VERBS],
  ['commercial partnership', /(?<![A-Za-z])(?:partner\w*|teams up|joint venture|licens\w* (?:deal|agreement)|signs (?:a )?deal|agreement with|alliance|renew\w* (?:deal|agreement))(?![A-Za-z])/i],
  ['technology launch', /(?<![A-Za-z])(?:launch\w*|rolls? out|unveil\w*|debut\w*|introduc\w*)(?![A-Za-z]).*(?<![A-Za-z])(?:app|feature|tool|model|platform|AI|API|product)(?![A-Za-z])/i],
  ['operating initiative', /(?<![A-Za-z])(?:launch\w*|expands?|expansion|opens?|hires?|appoints?|names|restructur\w*|layoffs?|cuts|program\w*|initiative)(?![A-Za-z])/i],
  ['market data point', /(?<![A-Za-z])(?:report\w*|survey|data|revenues?|earnings|results|quarter\w*|Q[1-4]|IFPI|RIAA|MIDiA|Luminate|grew|growth)(?![A-Za-z])/i],
]

function exposureForEvent(n, form) {
  if (form) return FORM_SIGNIFICANT[form]
  const text = `${n.title} ${n.summary || ''}`
  // The title says what happened. A summary mentions money incidentally ("…as Ek's investment in…"), so it may
  // only supply the kinds of event that are not about money changing hands.
  const hit = EXPOSURE_RULES.find(([, re]) => re.test(n.title)) || EXPOSURE_RULES.find(([k, re]) => k !== 'financing' && k !== 'transaction' && re.test(text))
  return hit ? hit[0] : 'market data point'
}

const RIGHTS_TEXT = [
  ['publishing', /(?<![A-Za-z])(?:publishing|songwriters?|compositions?|song rights)(?![A-Za-z])/i],
  ['recorded_music', /(?<![A-Za-z])(?:masters?|recorded[\s-]music|recordings?|sound recordings?)(?![A-Za-z])/i],
]
const REVENUE_TEXT = [
  ['streaming', /(?<![A-Za-z])stream(?:s|ing|ed)?(?![A-Za-z])/i],
  ['performance', /(?<![A-Za-z])(?:performance (?:rights?|royalt(?:y|ies)|income)|public performance)(?![A-Za-z])/i],
  ['mechanical', /(?<![A-Za-z])mechanicals?(?![A-Za-z])/i],
  ['sync', /(?<![A-Za-z])(?:sync|synchroni[sz]ation)(?![A-Za-z])/i],
  ['neighbouring', /(?<![A-Za-z])neighbou?ring rights?(?![A-Za-z])/i],
  ['live', /(?<![A-Za-z])(?:ticket\w*|concerts?|tours?|touring|festivals?)(?![A-Za-z])/i],
  ['merchandise', /(?<![A-Za-z])(?:merch|merchandise|merchandising)(?![A-Za-z])/i],
  ['sponsorship', /(?<![A-Za-z])sponsor\w*(?![A-Za-z])/i],
  ['likeness', /(?<![A-Za-z])(?:likeness|NIL)(?![A-Za-z])/],
  ['physical', /(?<![A-Za-z])(?:vinyl|physical (?:sales|formats?)|CDs?)(?![A-Za-z])/],
]

const pick = (rules, text) => rules.filter(([, re]) => re.test(text)).map(([id]) => id)

// ── Classification ──────────────────────────────────────────────────────────────────────────────────────

function score(evidence) {
  const by = Object.fromEntries(FORCE_IDS.map((id) => [id, { total: 0, specific: 0, strong: false, list: [] }]))
  for (const e of evidence) {
    const s = by[e.force]
    s.total += e.weight
    if (!e.generic) s.specific += e.weight
    // Strong = the record states it: a structured field about the deal, or a specific word in the title. A
    // mention elsewhere in an article, a feed topic, or a broad word corroborates but never sets confidence.
    if ((e.via !== 'text' || e.field === 'title') && !e.topical && !e.generic && e.field !== 'topic' && e.field !== 'entity') s.strong = true
    s.list.push(e)
  }
  return by
}

const rank = (by) => FORCE_IDS
  .filter((id) => by[id].total > 0)
  .sort((a, b) => by[b].total - by[a].total || by[b].specific - by[a].specific || FORCE_BY_ID[a].number - FORCE_BY_ID[b].number)

function confidenceOf(s) {
  if (s.total >= 3 && s.strong) return 'high'
  if (s.total >= 2) return 'medium'
  return 'low'
}

const top = (list, n = 3) => [...list].sort((a, b) => b.weight - a.weight).slice(0, n).map((e) => e.label)
const joinList = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`)

function rationaleFor(primary, secondary, by) {
  const f = FORCE_BY_ID[primary]
  const why = `${f.short_title}: ${joinList(top(by[primary].list))}. ${f.thesis}`
  if (!secondary.length) return why
  return `${why} Also touches ${secondary.map((id) => `${FORCE_BY_ID[id].short_title} (${top(by[id].list, 1)[0]})`).join('; ')}.`
}

function assemble(record, { kind, evidence, exposure, geography, rights, revenue, url, date, sourceLabel, minPrimary }) {
  const clean = dedupe(evidence)
  const by = score(clean)
  const order = rank(by)
  const text = [record.title, record.summary, record.valueNote].filter(Boolean).join(' ')
  const base = { id: record.id, kind, date, title: record.title, exposure_type: exposure, geography, rights_type: rights, revenue_stream: revenue, source_url: url, source_date: date, source_label: sourceLabel, record }
  if (!order.length || by[order[0]].total < minPrimary) {
    return { ...base, primary_force_id: null, secondary_force_ids: [], force_confidence: null, force_impact_direction: null, force_rationale: '', evidence: clean, unclassified: order.length ? 'Only a passing mention — not enough to tie this to a force.' : 'No force evidence in the record.' }
  }
  const primary = order[0]
  const secondary = order.slice(1).filter((id) => by[id].total >= 2).slice(0, CLASSIFICATION.maxSecondary)
  const dir = directionFor(primary, record, exposure, text, kind)
  return {
    ...base,
    primary_force_id: primary,
    secondary_force_ids: secondary,
    force_confidence: confidenceOf(by[primary]),
    force_impact_direction: dir.direction,
    direction_reason: dir.reason,
    secondary_confidence: Object.fromEntries(secondary.map((id) => [id, confidenceOf(by[id])])),
    force_rationale: rationaleFor(primary, secondary, by),
    evidence: clean.filter((e) => e.force === primary || secondary.includes(e.force)),
    scores: Object.fromEntries(order.map((id) => [id, by[id].total])),
  }
}

const cache = new WeakMap()
const memo = (fn) => (r, ...rest) => { if (rest.length || !r || typeof r !== 'object') return fn(r, ...rest); if (!cache.has(r)) cache.set(r, fn(r)); return cache.get(r) }

/** A transaction on record. Deals are capital events by construction, so every deal classifies. */
export const classifyDeal = memo((t) => {
  const parties = [...(t.sellers || []).map((p) => ['seller', p]), ...(t.acquirers || []).map((p) => ['acquirer', p])]
  const ev = []
  // A catalog sale is the taxonomy's first capital signal by name, so it is specific evidence. Other deal types
  // are capital events too, but generically — they lose a tie to a force the deal is more specifically about.
  const catalog = t.type === 'catalog-sale'
  ev.push({ force: 'capital_ownership', via: 'field', field: 'type', value: t.type, weight: catalog ? 3 : 2, generic: !catalog, label: `deal type: ${TX_TYPES[t.type]?.label || t.type}` })
  if (['abs', 'wbs', 'debt', 'royalty-stream'].includes(t.structure)) ev.push({ force: 'capital_ownership', via: 'field', field: 'structure', value: t.structure, weight: 1, label: `structure: ${STRUCTURES[t.structure] || t.structure}` })
  if (t.abs && (t.abs.advanceRate != null || /DSCR|coverage/i.test(t.abs.notes || ''))) ev.push({ force: 'capital_ownership', via: 'field', field: 'abs', value: t.abs.advanceRate != null ? 'advanceRate' : 'notes', weight: 1, label: 'advance rate or coverage disclosed' })

  // Where a deal happens is where its SUBJECT is. An investor's domicile says nothing about the asset: GIC being
  // in Singapore does not make a US catalog an emerging-markets deal. Money-side parties are left out of place.
  const places = []
  const partyIds = new Set()
  const subjects = []
  for (const [role, p] of parties) {
    const e = p.entityId ? getEntity(p.entityId) : null
    if (!e) continue
    partyIds.add(e.id)
    const rule = PARTY_FORCE[e.type]
    if (rule && !(role === 'acquirer' && MONEY_TYPES.has(e.type))) ev.push({ force: rule[0], via: 'field', field: 'party', value: e.id, entityType: e.type, weight: rule[1], label: `${role} ${e.short || e.name} is a ${ENTITY_TYPES[e.type]?.label || e.type}` })
    if (!MONEY_TYPES.has(e.type)) subjects.push(e)
  }
  // The target is often not a party at all — "KKR acquires Superstruct" records Providence as the seller. A company
  // named in the title is the subject, so its type counts as if it were a party.
  for (const e of namedIn(t.title)) {
    if (partyIds.has(e.id)) continue
    subjects.push(e)
    const rule = PARTY_FORCE[e.type]
    if (rule) ev.push({ force: rule[0], via: 'field', field: 'named', value: e.id, entityType: e.type, match: e.hit, weight: rule[1], label: `the title names ${e.short || e.name}, a ${ENTITY_TYPES[e.type]?.label || e.type}` })
  }
  for (const e of subjects) {
    for (const pl of placesFor(e)) {
      places.push(pl.region)
      if (pl.emerging) ev.push({ force: 'emerging_markets', via: 'field', field: 'hq', value: e.id, match: pl.city, weight: 3, label: `${e.short || e.name} is based in ${pl.city} (${pl.region})` })
    }
  }
  // A deal between money-side parties still happens somewhere, so the geography facet falls back to them — but
  // only for filtering. It never becomes emerging-markets evidence.
  if (!places.length) for (const [, p] of parties) for (const pl of placesFor(getEntity(p.entityId))) places.push(pl.region)
  if (!places.length && parties.some(([, p]) => isGlobal(getEntity(p.entityId)))) places.push('Global')
  const textFields = ['title', 'summary', 'valueNote']
  const geoText = geoInText(t, textFields)
  const emergingHere = geoText.size > 0 || ev.some((e) => e.field === 'hq')
  ev.push(...textEvidence(t, textFields, emergingHere))

  const text = `${t.title} ${t.summary || ''}`
  const rights = t.asset === 'both' ? ['publishing', 'recorded_music'] : t.asset === 'publishing' ? ['publishing'] : t.asset === 'recording' ? ['recorded_music'] : pick(RIGHTS_TEXT, text)
  return assemble(t, {
    kind: 'deal',
    evidence: ev,
    exposure: exposureForDeal(t),
    geography: [...new Set([...places, ...geoText])],
    rights,
    revenue: pick(REVENUE_TEXT, text),
    url: t.sources?.[0]?.url || '',
    sourceLabel: t.sources?.[0]?.label || '',
    date: t.date,
    minPrimary: 1,
  })
})

/**
 * Search feeds pick up anything sharing a word with music: auto-loan ABS research, mining "royalty streamers",
 * an airline's bankruptcy. An event must be tied to a music-native entity or say something about music before
 * it can be evidence for a music-market force. Money-side firms (Blackstone, Apollo) do not count: they appear
 * in plenty of news that has nothing to do with music.
 */
const MUSIC_WORDS = /(?<![A-Za-z])(?:music\w*|musicians?|songs?|songbooks?|songwriters?|singers?|rappers?|bands?|albums?|record labels?|labels?|recordings?|masters|concerts?|tours?|touring|festivals?|gigs?|tickets?|ticketing|Ticketmaster|Spotify|Apple Music|Amazon Music|YouTube Music|TikTok|SoundCloud|Deezer|Tidal|ASCAP|BMI|SESAC|SoundExchange|MLC|IFPI|RIAA|Billboard|Grammys?|K-pop|Afrobeats?|reggaeton|artists?|vinyl|stadium shows?|arena tours?|live music|promoters?)(?![A-Za-z])/i
export function isMusic(n) {
  // The server labels its sources: music trade press and live-industry feeds are music by construction. Only
  // general search results have to prove it.
  if (n.category === 'trade' || n.category === 'live') return true
  if ((n.entities || []).some((id) => { const e = getEntity(id); return e && !MONEY_TYPES.has(e.type) })) return true
  return MUSIC_WORDS.test(`${n.title} ${n.summary || ''}`)
}

/** SEC form from a feed title such as "Blackstone — 8-K - Current report". */
export const formOf = (n) => (n.kind === 'filing' ? (String(n.title).match(/—\s*([A-Z0-9][A-Z0-9 -]*?)\s+-\s/)?.[1] || '').trim() : '')

/**
 * A market event from the live feed. Mentions count for less than subjects here: an article tagged to Spotify is
 * often about something else, so a tagged entity alone is never enough to classify.
 */
export const classifyEvent = memo((n) => {
  const form = formOf(n)
  const base = { id: n.id, kind: 'event', date: n.publishedAt || '', title: n.title, record: n, source_url: n.url || '', source_date: n.publishedAt || '', source_label: n.source || '' }
  if (n.kind === 'filing' && !FORM_SIGNIFICANT[form]) {
    return { ...base, primary_force_id: null, secondary_force_ids: [], evidence: [], unclassified: `Routine SEC filing${form ? ` (form ${form})` : ''} — not evidence of a force.` }
  }
  if (!isMusic(n)) {
    return { ...base, primary_force_id: null, secondary_force_ids: [], evidence: [], unclassified: 'Not about the music business — the feed picked it up on a shared word such as "royalty" or "ABS".' }
  }
  const ev = []
  // Feed topics are themselves keyword-derived on the server, so they corroborate rather than prove.
  for (const topic of n.topics || []) if (TOPIC_FORCE[topic]) ev.push({ force: TOPIC_FORCE[topic], via: 'field', field: 'topic', value: topic, weight: 1, label: `feed topic: ${topic}` })
  if (form === 'ABS-15G') ev.push({ force: 'capital_ownership', via: 'field', field: 'form', value: form, match: form, weight: 3, label: `SEC form ${form} — securitisation reporting` })
  else if (form && form !== '8-K') ev.push({ force: 'capital_ownership', via: 'field', field: 'form', value: form, match: form, weight: 2, generic: true, label: `SEC form ${form} — a deal in progress` })
  const finance = n.title.match(FINANCE_VERBS)
  const deal = n.title.match(DEAL_VERBS)
  if (finance) ev.push({ force: 'capital_ownership', via: 'text', field: 'title', term: 'financing', match: finance[0], weight: 2, generic: true, label: `“${finance[0]}” in the title` })
  else if (deal) ev.push({ force: 'capital_ownership', via: 'text', field: 'title', term: 'transaction', match: deal[0], weight: 2, generic: true, label: `“${deal[0]}” in the title` })

  const places = []
  const named = namedIn(n.title)
  const namedIds = new Set(named.map((e) => e.id))
  for (const e of named) {
    const rule = PARTY_FORCE[e.type]
    if (rule) ev.push({ force: rule[0], via: 'field', field: 'named', value: e.id, entityType: e.type, match: e.hit, weight: rule[1], label: `the title names ${e.short || e.name}, a ${ENTITY_TYPES[e.type]?.label || e.type}` })
    for (const pl of placesFor(e)) {
      places.push(pl.region)
      if (pl.emerging) ev.push({ force: 'emerging_markets', via: 'field', field: 'hq', value: e.id, match: pl.city, weight: 3, label: `${e.short || e.name} is based in ${pl.city} (${pl.region})` })
    }
  }
  for (const id of n.entities || []) {
    const e = getEntity(id)
    if (!e || namedIds.has(e.id)) continue
    const rule = PARTY_FORCE[e.type]
    if (rule) ev.push({ force: rule[0], via: 'field', field: 'entity', value: e.id, entityType: e.type, weight: 1, names: [e.name, e.short].filter(Boolean).map((x) => x.toLowerCase()), label: `mentions ${e.short || e.name}, a ${ENTITY_TYPES[e.type]?.label || e.type}` })
    for (const pl of placesFor(e)) {
      places.push(pl.region)
      if (pl.emerging) ev.push({ force: 'emerging_markets', via: 'field', field: 'hq', value: e.id, match: pl.city, weight: 1, label: `mentions ${e.short || e.name}, based in ${pl.city}` })
    }
  }
  const textFields = ['title', 'summary']
  const geoText = geoInText(n, textFields)
  ev.push(...textEvidence(n, textFields, geoText.size > 0 || ev.some((e) => e.field === 'hq'), 1))

  if (!places.length && [...named, ...(n.entities || []).map(getEntity)].some(isGlobal)) places.push('Global')
  const text = `${n.title} ${n.summary || ''}`
  return assemble(n, {
    kind: 'event',
    evidence: ev,
    exposure: exposureForEvent(n, form),
    geography: [...new Set([...places, ...geoText])],
    rights: pick(RIGHTS_TEXT, text),
    revenue: pick(REVENUE_TEXT, text),
    url: n.url || '',
    sourceLabel: n.source || '',
    date: n.publishedAt || '',
    minPrimary: 2,
  })
})

/** An SEC filing that is routine — insider trades, 144s, quarterlies — and so evidence of nothing strategic. */
export const isRoutineFiling = (n) => n.kind === 'filing' && !FORM_SIGNIFICANT[formOf(n)]

/** Does this piece of evidence actually hold for this record? The tests run this over every tag. */
export function evidenceHolds(record, e) {
  if (e.via === 'text') return typeof record[e.field] === 'string' && record[e.field].includes(e.match)
  if (e.field === 'type' || e.field === 'structure') return record[e.field] === e.value
  if (e.field === 'abs') return !!record.abs && (e.value === 'advanceRate' ? record.abs.advanceRate != null : /DSCR|coverage/i.test(record.abs.notes || ''))
  if (e.field === 'party') return [...(record.sellers || []), ...(record.acquirers || [])].some((p) => p.entityId === e.value) && getEntity(e.value)?.type === e.entityType
  if (e.field === 'entity') return (record.entities || []).includes(e.value) && getEntity(e.value)?.type === e.entityType
  if (e.field === 'named') return String(record.title).includes(e.match) && getEntity(e.value)?.type === e.entityType
  if (e.field === 'hq') return String(getEntity(e.value)?.hq || '').includes(e.match)
  if (e.field === 'topic') return (record.topics || []).includes(e.value)
  if (e.field === 'form') return String(record.title).includes(e.match)
  return false
}

// ── Views ───────────────────────────────────────────────────────────────────────────────────────────────

/** "2026-04" and "2026-04-07" and full timestamps → ms. Month-precision dates count from the first of the month. */
export function dateMs(d) {
  const s = String(d || '')
  if (/^\d{4}$/.test(s)) return Date.parse(`${s}-01-01T00:00:00Z`)
  if (/^\d{4}-\d{2}$/.test(s)) return Date.parse(`${s}-01T00:00:00Z`)
  const ms = Date.parse(s.length === 10 ? `${s}T00:00:00Z` : s)
  return Number.isNaN(ms) ? null : ms
}

/** Deals and events, classified, newest first. Unclassified items are kept separately, not dropped silently. */
export function classifyAll({ deals = [], events = [] } = {}) {
  const all = [...deals.map(classifyDeal), ...events.map(classifyEvent)]
  const sorted = (xs) => xs.sort((a, b) => (dateMs(b.date) || 0) - (dateMs(a.date) || 0))
  return { tagged: sorted(all.filter((x) => x.primary_force_id)), unclassified: sorted(all.filter((x) => !x.primary_force_id)) }
}

const csv = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map((s) => s.trim()).filter(Boolean)

/**
 * Filters: OR within a facet, AND across facets. `reach` decides whether a force filter matches the primary force
 * only ('direct') or secondary forces too ('any') — the difference between direct and adjacent exposure.
 */
export function filterTagged(items, { force = [], reach = 'any', exposure = [], direction = [], geography = [], rights = [] } = {}) {
  const F = csv(force); const X = csv(exposure); const D = csv(direction); const G = csv(geography); const R = csv(rights)
  return items.filter((x) => {
    if (F.length && !F.some((id) => x.primary_force_id === id || (reach !== 'direct' && x.secondary_force_ids.includes(id)))) return false
    if (X.length && !X.includes(x.exposure_type)) return false
    if (D.length && !D.includes(x.force_impact_direction)) return false
    if (G.length && !G.some((g) => x.geography.includes(g))) return false
    if (R.length && !R.some((r) => x.rights_type.includes(r))) return false
    return true
  })
}

const DAY = 86400000
const startOfDay = (ms) => ms - (ms % DAY)

/**
 * Is a window complete? Deals on record reach back years, but market events only exist from the day the
 * evidence archive started watching (`coverageSince`). A window reaching further back than that holds every
 * deal but only some of the events, so its count is a floor, not a total. With no archive at all
 * (`coverageSince` null) every window that includes live events is a floor.
 */
export function windowComplete(days, { today = new Date(), coverageSince = null } = {}) {
  if (!coverageSince) return false
  const now = (today instanceof Date ? today : new Date(today)).getTime()
  return startOfDay(now) - (days - 1) * DAY >= dateMs(coverageSince)
}

/** Activity for one force: totals, trailing windows, mix, and the evidence feed. `today` is injectable for tests. */
export function forceActivity(items, forceId, { today = new Date(), feed = 20, coverageSince = null } = {}) {
  const now = (today instanceof Date ? today : new Date(today)).getTime()
  const direct = items.filter((x) => x.primary_force_id === forceId)
  const adjacent = items.filter((x) => x.secondary_force_ids.includes(forceId))
  const touching = [...direct, ...adjacent]
  const within = (days) => touching.filter((x) => { const ms = dateMs(x.date); return ms != null && ms <= now && now - ms <= days * 86400000 }).length
  const count = (key) => touching.reduce((acc, x) => { acc[x[key]] = (acc[x[key]] || 0) + 1; return acc }, {})
  return {
    force: FORCE_BY_ID[forceId],
    direct: direct.length,
    adjacent: adjacent.length,
    total: touching.length,
    deals: touching.filter((x) => x.kind === 'deal').length,
    events: touching.filter((x) => x.kind === 'event').length,
    trailing: { 30: within(30), 90: within(90), 365: within(365) },
    complete: Object.fromEntries([30, 90, 365].map((d) => [d, windowComplete(d, { today, coverageSince })])),
    series: forceSeries(touching, { today, coverageSince }),
    byExposure: count('exposure_type'),
    byDirection: count('force_impact_direction'),
    feed: touching.sort((a, b) => (dateMs(b.date) || 0) - (dateMs(a.date) || 0)).slice(0, feed),
  }
}

/**
 * Weekly counts (Monday-start, UTC) for the last `weeks` weeks, oldest first. A week before the archive started
 * is marked uncovered: its count includes deals but not the events nobody was recording yet, so a chart must
 * draw it differently rather than as a quiet week.
 */
export function forceSeries(touching, { today = new Date(), weeks = 12, coverageSince = null } = {}) {
  const now = startOfDay((today instanceof Date ? today : new Date(today)).getTime())
  const dow = (new Date(now).getUTCDay() + 6) % 7
  const thisWeek = now - dow * DAY
  const since = coverageSince ? dateMs(coverageSince) : null
  return Array.from({ length: weeks }, (_, i) => {
    const start = thisWeek - (weeks - 1 - i) * 7 * DAY
    const end = start + 7 * DAY
    const inWeek = touching.filter((x) => { const ms = dateMs(x.date); return ms != null && ms >= start && ms < end && ms <= now + DAY })
    return {
      start: new Date(start).toISOString().slice(0, 10),
      count: inWeek.length,
      deals: inWeek.filter((x) => x.kind === 'deal').length,
      events: inWeek.filter((x) => x.kind === 'event').length,
      covered: since != null && start >= since,
      current: i === weeks - 1,
    }
  })
}

/** Every force at once, in taxonomy order. */
export const forceBoard = (items, opts) => FORCES.map((f) => forceActivity(items, f.id, opts))

/** Geography values present in a set, for the filter. */
export const geographiesIn = (items) => [...new Set(items.flatMap((x) => x.geography))].sort()

/** Party names for display, re-exported so the page does not reach into transactions.js for one helper. */
export { partyName }
