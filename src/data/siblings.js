/**
 * siblings.js — cross-links to the Intelligence Hub (brief §9, Sprint 7+).
 * Two kinds of Hub page are mapped, both read-only from here:
 *   pe-fund   → /pe-fund/:fundId          (PE Academy profiles; ten sponsors appear in both apps)
 *   company   → /company/:segmentId/:id   (ecosystem company pages; sports & live, studios/audio, social)
 * The Hub is deployed at am-intelligence-hub.onrender.com (its README's `mainframe.onrender.com` returns 404 —
 * checked 2026-09-14; both /pe-fund/:id and /company/:segment/:id resolve on the real host).
 * Ids are the Hub's own — confirmed against am-intelligence-hub/src/data/{peFunds,ecosystem}.js on 2026-09-14.
 */
export const HUB_URL = 'https://am-intelligence-hub.onrender.com'

const HUB_FUND_IDS = {
  blackstone: 'blackstone', kkr: 'kkr', apollo: 'apollo', 'silver-lake': 'silver-lake', carlyle: 'carlyle', ares: 'ares',
  'sixth-street': 'sixth-street', 'bain-capital': 'bain-capital', 'francisco-partners': 'francisco', blackrock: 'blackrock',
}

/** music entity id → [hubSegmentId, hubCompanyId, hubSegmentLabel] */
const HUB_COMPANY_IDS = {
  // Sports & Live Entertainment
  'live-nation': ['sports', 'live-nation', 'Sports & Live Entertainment'],
  ticketmaster: ['sports', 'live-nation', 'Sports & Live Entertainment'],
  endeavor: ['sports', 'endeavor', 'Sports & Live Entertainment'],
  tko: ['sports', 'wwe', 'Sports & Live Entertainment'],
  // Studios & Streaming (audio)
  wmg: ['studios', 'warner-music', 'Studios & Streaming'],
  umg: ['studios', 'universal-music', 'Studios & Streaming'],
  siriusxm: ['studios', 'siriusxm', 'Studios & Streaming'],
  iheartradio: ['studios', 'iheartmedia', 'Studios & Streaming'],
  spotify: ['studios', 'spotify-content', 'Studios & Streaming'],
  // Social & UGC Platforms
  'youtube-music': ['socialMedia', 'youtube', 'Social & UGC Platforms'],
  tiktok: ['socialMedia', 'tiktok', 'Social & UGC Platforms'],
  meta: ['socialMedia', 'meta', 'Social & UGC Platforms'],
}

/** Hub PE Academy link for a music entity id, or null. */
export function hubFundLink(entityId) {
  const hubId = HUB_FUND_IDS[entityId]
  return hubId ? { kind: 'pe-fund', label: 'PE Academy profile · Intelligence Hub', url: `${HUB_URL}/pe-fund/${hubId}` } : null
}

/** Hub ecosystem company link for a music entity id, or null. */
export function hubCompanyLink(entityId) {
  const m = HUB_COMPANY_IDS[entityId]
  return m ? { kind: 'company', label: `${m[2]} · Intelligence Hub`, url: `${HUB_URL}/company/${m[0]}/${m[1]}` } : null
}

/** Every Hub link for an entity (0–2). */
export const hubLinks = (entityId) => [hubFundLink(entityId), hubCompanyLink(entityId)].filter(Boolean)

export const SHARED_SPONSOR_IDS = Object.keys(HUB_FUND_IDS)
export const SHARED_COMPANY_IDS = Object.keys(HUB_COMPANY_IDS)
