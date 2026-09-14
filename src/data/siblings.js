/**
 * siblings.js — cross-links to the Intelligence Hub (brief §9, Sprint 7+).
 * Only sponsors that have a PE Academy profile in am-intelligence-hub are mapped; ids differ in one case.
 * The Hub's Render service is named `mainframe`, so its URL is mainframe.onrender.com (per its README).
 */
export const HUB_URL = 'https://mainframe.onrender.com'

const HUB_FUND_IDS = {
  blackstone: 'blackstone', kkr: 'kkr', apollo: 'apollo', 'silver-lake': 'silver-lake', carlyle: 'carlyle', ares: 'ares',
  'sixth-street': 'sixth-street', 'bain-capital': 'bain-capital', 'francisco-partners': 'francisco', blackrock: 'blackrock',
}

/** Hub PE Academy link for a music entity id, or null. */
export function hubFundLink(entityId) {
  const hubId = HUB_FUND_IDS[entityId]
  return hubId ? { label: 'PE Academy profile · Intelligence Hub', url: `${HUB_URL}/pe-fund/${hubId}` } : null
}

export const SHARED_SPONSOR_IDS = Object.keys(HUB_FUND_IDS)
