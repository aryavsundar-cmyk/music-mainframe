/**
 * fundamentals.js — DSP economics, keyed by entity id, plus market context.
 * subscribers/mau in absolute numbers; price in USD/month (US individual plan); perStream in USD (all-in,
 * recording + publishing, commonly cited range — never a contractual rate); payoutModel names the split logic.
 * Sourced 2026-09-14. verify: true on estimates (undisclosed subscriber counts, per-stream ranges).
 */
import { ENTITIES, getEntity } from './entities.js'
import { src, mbw } from './entities/_schema.js'

export const TIERS = {
  interactive: 'Interactive (on-demand)',
  social: 'Social / short video',
  regional: 'Regional giant',
  noninteractive: 'Non-interactive / radio',
  hifi: 'HiFi / direct-to-fan',
}
export const PAYOUT_MODELS = {
  'pro-rata': 'Pro-rata: revenue pool ÷ total streams × your share',
  'artist-centric': 'Artist-centric: professional artists weighted up, fraud and noise down (UMG–Deezer, 2023)',
  'user-centric': 'User-centric: each subscriber\'s fee follows what they played',
  statutory: 'Statutory: CRB-set rate per performance or % of revenue, via SoundExchange',
  'lump-sum': 'Lump-sum licence: fixed fees for UGC use, not per stream',
  direct: 'Direct sales: artist sets the price, platform takes a cut',
}

const PROFILES = {
  spotify: {
    tier: 'interactive', model: 'pro-rata', priceUS: 12.99, priceNote: 'Premium individual $12.99 from Feb 2026 (was $11.99); Duo $18.99, Family $21.99, Student $6.99',
    subscribers: 300e6, mau: 777e6, metricsAsOf: 'Q2 2026', arpu: 4.89, arpuCurrency: 'EUR', arpuNote: 'Premium ARPU €4.89/month, +7.4% cc (Q2 2026)',
    payouts2025: 11e9, perStream: [0.003, 0.005], shareToRights: 66,
    marketShare: 31.4, marketShareAsOf: 'Q4 2025 (MIDiA)',
    posture: 'Largest payer ($11B in 2025, $70B lifetime). Runs the pro-rata pool with ~two-thirds of music revenue returned to rights holders. Won the "Premium is a bundle" ruling against the MLC (Jan 2025); the MLC now contests bundle valuation. Lossless added to Premium at no charge (Sep 2025) instead of a superfan tier.',
    shifts: [
      { date: '2026-07', text: 'Passes 300M Premium subscribers; Q2 revenue €4.78B; record 33.4% gross margin.' },
      { date: '2026-02', text: 'US Premium rises to $12.99.' },
      { date: '2025-10', text: 'MLC files amended complaint on bundle component valuation.' },
      { date: '2025-01', text: 'MLC bundling suit dismissed with prejudice.' },
    ],
    sources: [mbw('Spotify hits 300 million Premium subscribers Q2 2026'), src('Spotify — Loud & Clear', 'https://loudandclear.byspotify.com/'), src('Variety — Spotify US price increase', 'https://variety.com/2026/digital/news/spotify-price-increase-us-subscription-plans-1236632136/')],
  },
  'apple-music': {
    tier: 'interactive', model: 'pro-rata', priceUS: 10.99, priceNote: 'Individual $10.99; Family $16.99; no ad tier',
    subscribers: 116e6, mau: null, metricsAsOf: 'Q4 2025 (MIDiA est.)', subscribersNote: 'Apple stopped disclosing in 2023; MIDiA estimates 116.1M (12.6% share)',
    perStream: [0.007, 0.01], shareToRights: 70,
    marketShare: 12.6, marketShareAsOf: 'Q4 2025 (MIDiA)',
    posture: 'Pays roughly a cent per stream — about double Spotify — because there is no free tier and prices are held. Lost share in 2025; YouTube Music could overtake it for third place.',
    shifts: [{ date: '2025-12', text: 'Per-stream payouts still ~2× Spotify (DMN analysis).' }],
    verify: true,
    sources: [src('MIDiA — subscriber market shares Q4 2025', 'https://www.midiaresearch.com/blog/music-subscriber-market-shares-q4-2025-the-chess-board-is-set'), src('DMN — Apple Music per-stream (Dec 2025)', 'https://www.digitalmusicnews.com/2025/12/28/apple-music-per-stream-payouts-dec-2025/')],
  },
  'amazon-music': {
    tier: 'interactive', model: 'pro-rata', priceUS: 12.99, priceNote: 'Unlimited individual $12.99 ($11.99 Prime); Family $21.99 from Mar 2026; Prime-bundled catalog tier',
    subscribers: 78e6, mau: null, metricsAsOf: 'Q4 2025 (MIDiA est.)', subscribersNote: 'Undisclosed; MIDiA 78.3M (8.5%)',
    perStream: [0.004, 0.005], shareToRights: 65,
    marketShare: 8.5, marketShareAsOf: 'Q4 2025 (MIDiA)',
    posture: 'Bundle economics: the Prime tier pays on a bundle-allocated basis, a pressure point in mechanical accounting; Unlimited priced with Spotify but discounted for Prime members.',
    shifts: [{ date: '2026-03', text: 'Family plan raised to $21.99; individual to $12.99.' }],
    verify: true,
    sources: [src('DMN — Amazon Music price increase (Feb 2026)', 'https://www.digitalmusicnews.com/2026/02/08/amazon-music-raises-prices-2026/'), src('MIDiA — Q4 2025 shares', 'https://www.midiaresearch.com/blog/music-subscriber-market-shares-q4-2025-the-chess-board-is-set')],
  },
  'youtube-music': {
    tier: 'interactive', model: 'pro-rata', priceUS: 11.99, priceNote: 'YouTube Music $11.99 (from Jun 2026); Premium $15.99; Premium Lite $8.99',
    subscribers: 125e6, mau: 2e9, metricsAsOf: 'Mar 2025 (subs incl. trials) · MAU YouTube-wide', subscribersNote: '125M Music + Premium incl. trials (Mar 2025); MIDiA 114.3M paid (12.4%) at Q4 2025',
    perStream: [0.002, 0.008], shareToRights: 55,
    marketShare: 12.4, marketShareAsOf: 'Q4 2025 (MIDiA)',
    posture: 'Two economies in one: paid Music/Premium subscriptions (pro-rata) and ad-supported UGC (Content ID, ~55% ad-revenue share to rights holders). Fastest-growing major service (+1.5pt share in 2025, ~2M net adds a month).',
    shifts: [{ date: '2026-06', text: 'US price increases across Premium, Lite, and Music.' }, { date: '2025-03', text: '125M Music + Premium subscribers.' }],
    verify: true,
    sources: [mbw('YouTube Music hits 125m paid subscribers'), src('Variety — YouTube Premium price increase (2026)', 'https://variety.com/2026/digital/news/youtube-premium-pirce-increase-youtube-music-us-1236713223/')],
  },
  tidal: {
    tier: 'hifi', model: 'pro-rata', priceUS: 10.99, priceNote: 'Single tier $10.99 incl. HiRes since 2024',
    subscribers: null, mau: null, metricsAsOf: '', subscribersNote: 'Undisclosed; low single-digit millions (est.)',
    perStream: [0.008, 0.013], shareToRights: 70,
    marketShare: null,
    posture: 'Block-owned; ended the artist-direct payment programmes and cut staff in 2024–25; still cited among the higher per-stream payers.',
    shifts: [{ date: '2024-04', text: 'Collapses HiFi Plus into one $10.99 tier.' }],
    verify: true,
    sources: [src('TIDAL', 'https://tidal.com')],
  },
  deezer: {
    tier: 'interactive', model: 'artist-centric', priceUS: 11.99, priceNote: 'France €11.99; US $11.99',
    subscribers: 9.0e6, mau: null, metricsAsOf: 'Q3 2025', subscribersNote: 'Total subs 9.0M (Q3 2025), down from 9.7M; direct subscribers +10% LFL',
    perStream: [0.004, 0.0064], shareToRights: 70,
    marketShare: 1.0, marketShareAsOf: 'est.',
    posture: 'Home of the artist-centric model (UMG, 2023): professional artists (1,000+ streams/month from 500+ listeners) weighted 2×, non-artist noise demonetised; 85% of label partners on the model; extended to publishing with SACEM (2025). First annual profit in FY2025 on lower total subscribers.',
    shifts: [{ date: '2026-03', text: 'First-ever annual profit (FY2025).' }, { date: '2025-01', text: 'SACEM adopts artist-centric for publishing royalties.' }],
    sources: [src('Deezer — FY25 profitability', 'https://newsroom-deezer.com/2026/03/deezer-achieves-profitability-in-fy25-as-strategy-delivers-tangible-results/'), mbw('Deezer first-ever annual profit')],
  },
  anghami: {
    tier: 'regional', model: 'pro-rata', priceUS: 4.99, priceNote: 'MENA pricing; bundled with OSN+ since 2024',
    subscribers: 2.5e6, mau: null, metricsAsOf: '2025 (est.)', subscribersNote: 'Combined Anghami + OSN+ paid base ~2.5M (est.)',
    perStream: [0.001, 0.003], shareToRights: 60, marketShare: null,
    posture: 'MENA leader; merged with OSN+ (OSN majority) in 2024; low ARPU, telco bundles.',
    shifts: [{ date: '2024-04', text: 'OSN+ merger closes; OSN takes majority.' }],
    verify: true,
    sources: [src('Anghami IR', 'https://investor.anghami.com')],
  },
  tiktok: {
    tier: 'social', model: 'lump-sum', priceUS: null, priceNote: 'Free; music licensed via fixed-fee deals',
    subscribers: null, mau: 1.6e9, metricsAsOf: '2025 (est.)',
    perStream: null, shareToRights: null, marketShare: null,
    posture: 'Discovery engine paid for with lump-sum licences rather than per-stream royalties; the Jan–May 2024 UMG standoff showed both sides\' leverage. SoundOn distribution; TikTok Music shut (2024).',
    shifts: [{ date: '2024-05', text: 'New UMG licence ends the blackout.' }, { date: '2024-11', text: 'TikTok Music closes.' }],
    verify: true,
    sources: [mbw('TikTok UMG deal')],
  },
  meta: {
    tier: 'social', model: 'lump-sum', priceUS: null, priceNote: 'Free; Reels/Stories licensed on fixed fees',
    subscribers: null, mau: 3.4e9, metricsAsOf: 'family daily actives, 2025',
    perStream: null, shareToRights: null, marketShare: null,
    posture: 'One of the largest lump-sum music licensees outside the DSPs; no per-stream reporting.',
    shifts: [], verify: true, sources: [src('Meta IR', 'https://investor.atmeta.com')],
  },
  snap: {
    tier: 'social', model: 'lump-sum', priceUS: null, priceNote: 'Free; Sounds licensed on fixed fees',
    subscribers: null, mau: 900e6, metricsAsOf: '2025',
    perStream: null, shareToRights: null, marketShare: null,
    posture: 'Snap Sounds licensed from all three majors and indie licensors.', shifts: [], sources: [src('Snap IR', 'https://investor.snap.com')],
  },
  'tencent-music': {
    tier: 'regional', model: 'pro-rata', priceUS: 1.99, priceNote: 'Green Diamond ~RMB 15/month; Super VIP ~RMB 40',
    subscribers: 127.4e6, mau: 550e6, metricsAsOf: 'Q4 2025 (last disclosed)', subscribersNote: 'TME stopped disclosing subscriber counts after FY2025; 127.4M at Q4 2025',
    perStream: [0.0005, 0.0015], shareToRights: 50,
    marketShare: 13.8, marketShareAsOf: 'Q4 2025 (MIDiA)',
    posture: 'Second-largest subscriber base globally; growth now from Super VIP upsell, concerts, and the Ximalaya (podcast) acquisition rather than subscriber adds. Q2 2026 revenue $1.32B (+5.8%).',
    shifts: [{ date: '2026-08', text: 'Q2 2026 revenue RMB 8.93B; Ximalaya integrated.' }, { date: '2026-03', text: 'Stops reporting subscriber metrics.' }],
    verify: true,
    sources: [mbw('Tencent Music Q2 2026'), src('Billboard — TME Q2 2026', 'https://www.billboard.com/pro/tencent-music-q2-2026-revenue/')],
  },
  'netease-cloud-music': {
    tier: 'regional', model: 'pro-rata', priceUS: 1.5, priceNote: '~RMB 11/month',
    subscribers: 44e6, mau: 200e6, metricsAsOf: '2025 (est.)', subscribersNote: '44M+ paying users (est.); subscription revenue +13.3% in 2025',
    perStream: [0.0005, 0.0015], shareToRights: 50, marketShare: 4.8, marketShareAsOf: 'est.',
    posture: 'Community-led second Chinese DSP; 1M+ registered indie artists; profit up on subscription growth.',
    shifts: [{ date: '2026-02', text: 'FY2025: subscription revenue +13.3%.' }],
    verify: true,
    sources: [src('NetEase Cloud Music — FY2025 results', 'https://www.prnewswire.com/news-releases/netease-cloud-music-inc-reports-fiscal-year-2025-financial-results-302684933.html')],
  },
  'yandex-music': { tier: 'regional', model: 'pro-rata', priceUS: 3.5, priceNote: 'Yandex Plus bundle', subscribers: 30e6, mau: null, metricsAsOf: '2025 (Plus subscribers, est.)', perStream: [0.001, 0.002], shareToRights: 55, marketShare: null, posture: 'Dominant in Russia/CIS via the Yandex Plus bundle; majors withdrew new-release licensing after 2022.', shifts: [], verify: true, sources: [src('Yandex Music', 'https://music.yandex.ru')] },
  melon: { tier: 'regional', model: 'pro-rata', priceUS: 8, priceNote: '~KRW 10,900/month', subscribers: 5e6, mau: null, metricsAsOf: '2025 (est.)', perStream: [0.003, 0.005], shareToRights: 65, marketShare: null, posture: 'Korea\'s largest DSP under Kakao Entertainment; K-pop chart influence.', shifts: [], verify: true, sources: [src('Melon', 'https://www.melon.com')] },
  jiosaavn: { tier: 'regional', model: 'pro-rata', priceUS: 1.2, priceNote: '₹99/month', subscribers: null, mau: 100e6, metricsAsOf: '2025 (est.)', perStream: [0.0003, 0.001], shareToRights: 50, marketShare: null, posture: 'Ad-supported scale, very low ARPU; India is Spotify\'s fastest-growing market, and JioSaavn competes on bundles.', shifts: [], verify: true, sources: [src('JioSaavn', 'https://www.jiosaavn.com')] },
  gaana: { tier: 'regional', model: 'pro-rata', priceUS: 1.2, priceNote: 'paid-only since 2022', subscribers: null, mau: null, metricsAsOf: '', perStream: [0.0003, 0.001], shareToRights: 50, marketShare: null, posture: 'Paid-only pivot in 2022; ownership has changed since.', shifts: [], verify: true, sources: [src('Gaana', 'https://gaana.com')] },
  siriusxm: {
    tier: 'noninteractive', model: 'statutory', priceUS: 9.99, priceNote: 'Satellite plans $9.99–$23.99; Pandora Plus $5.99 / Premium $10.99',
    subscribers: 31.3e6, mau: null, metricsAsOf: 'Q4 2025', subscribersNote: '31.3M paid (33M total) at end-2025; slow decline',
    perStream: null, shareToRights: null, marketShare: null,
    posture: 'Largest payer into SoundExchange under SDARS III; the 2025 distribution dip at SoundExchange tracks SiriusXM\'s subscriber decline. Revenue fell in 2025; podcasting the growth line.',
    shifts: [{ date: '2026-02', text: 'Ends 2025 at ~33M subscribers; revenue down.' }],
    sources: [src('SiriusXM — Q4 2025 earnings release', 'https://www.sec.gov/Archives/edgar/data/908937/000090893726000003/siriq42025earningsrelease.htm')],
  },
  pandora: { tier: 'noninteractive', model: 'statutory', priceUS: 5.99, priceNote: 'Plus $5.99; Premium $10.99 (interactive, direct licences)', subscribers: 6e6, mau: 42e6, metricsAsOf: '2025 (est.)', perStream: [0.0013, 0.0025], shareToRights: null, marketShare: null, posture: 'Free tier pays the statutory webcaster rate via SoundExchange; Premium is directly licensed.', shifts: [], verify: true, sources: [src('SiriusXM IR', 'https://investor.siriusxm.com')] },
  iheartradio: { tier: 'noninteractive', model: 'statutory', priceUS: 0, priceNote: 'Free (ads); iHeart Plus / All Access', subscribers: null, mau: 150e6, metricsAsOf: '2025 (est.)', perStream: null, shareToRights: null, marketShare: null, posture: 'Terrestrial simulcast pays statutory webcaster rates for recordings online, nothing on air (no US terrestrial performance right).', shifts: [], verify: true, sources: [src('iHeartMedia IR', 'https://investors.iheartmedia.com')] },
  qobuz: { tier: 'hifi', model: 'pro-rata', priceUS: 12.99, priceNote: 'Studio $12.99; Sublime $16.66 with download discounts', subscribers: 0.5e6, mau: null, metricsAsOf: '2025 (est.)', perStream: [0.018, 0.02], shareToRights: 70, marketShare: null, posture: 'Publishes its per-stream payout (~$0.02, 2024) — the highest disclosed — on a small audiophile base.', shifts: [{ date: '2024-11', text: 'Discloses average payout of $0.01873 per stream.' }], verify: true, sources: [src('Qobuz', 'https://www.qobuz.com')] },
  bandcamp: { tier: 'hifi', model: 'direct', priceUS: null, priceNote: 'Artist-set prices; Bandcamp takes 10–15%', subscribers: null, mau: null, metricsAsOf: '', perStream: null, shareToRights: 85, marketShare: null, posture: 'Direct-to-fan sales, ~85% to artists/labels; Songtradr-owned since 2023.', shifts: [{ date: '2023-10', text: 'Songtradr cuts ~half of staff after acquisition.' }], sources: [src('Bandcamp', 'https://bandcamp.com')] },
}

const DEFAULT = { tier: 'interactive', model: 'pro-rata', priceUS: null, priceNote: '', subscribers: null, mau: null, metricsAsOf: '', subscribersNote: '', arpu: null, arpuCurrency: 'USD', arpuNote: '', payouts2025: null, perStream: null, shareToRights: null, marketShare: null, marketShareAsOf: '', posture: '', shifts: [], verify: false, sources: [] }

export const DSP_ENTITIES = ENTITIES.filter((e) => e.type === 'dsp')
export const TIER_ORDER = Object.keys(TIERS)

export function getDspProfile(id) {
  const e = getEntity(id)
  const p = { ...DEFAULT, ...(PROFILES[id] || {}) }
  return { ...p, entity: e, hasProfile: !!PROFILES[id], shifts: [...p.shifts].sort((a, b) => b.date.localeCompare(a.date)) }
}

export function listDsps({ tier = '', model = '', q = '' } = {}) {
  const needle = q.trim().toLowerCase()
  return DSP_ENTITIES
    .map((e) => ({ e, ...getDspProfile(e.id) }))
    .filter((r) => (!tier || r.tier === tier) && (!model || r.model === model) && (!needle || r.e.searchText.includes(needle)))
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) || (b.subscribers || 0) - (a.subscribers || 0) || a.e.name.localeCompare(b.e.name))
}

/** Market context for /dsps. */
export const MARKET = {
  ifpi: { year: 2025, recordedRevenue: 31.7e9, growth: 6.4, streamingRevenue: 22e9, streamingShare: 69.6, subscriptionShare: 52.4, subscriptionGrowth: 8.8, paidUsers: 837e6,
    note: 'IFPI Global Music Report 2026: recorded-music revenue $31.7B in 2025 (+6.4%, eleventh consecutive year of growth); streaming $22B+ (69.6%), paid subscription 52.4% of revenue (+8.8%); 837M paid-subscription users. Fastest regions: Latin America +17.1%, MENA +15.2%, Sub-Saharan Africa +15.2%, Asia +10.9%.',
    source: mbw('IFPI global recorded music revenues hit $31.7B in 2025') },
  midia: { asOf: 'Q4 2025', subscribers: 921.6e6, growth: 10.1,
    shares: [['spotify', 31.4], ['tencent-music', 13.8], ['apple-music', 12.6], ['youtube-music', 12.4], ['amazon-music', 8.5]],
    note: 'MIDiA: 921.6M music subscribers at end-2025 (+10.1%). Spotify 31.4%, Tencent Music 13.8%, Apple Music 12.6%, YouTube Music 12.4%, Amazon 8.5%. YouTube Music gained 1.5 points; Apple, Amazon, and Tencent lost share.',
    source: src('MIDiA — subscriber market shares Q4 2025', 'https://www.midiaresearch.com/blog/music-subscriber-market-shares-q4-2025-the-chess-board-is-set') },
  splits: { recording: 55, publishing: 15, dsp: 30, note: 'Rule of thumb for a paid stream\'s net revenue: ~50–55% to recording rights, ~12–15% to publishing (performance + mechanical), ~30% retained by the DSP. Spotify says ~two-thirds of music revenue goes back to rights holders.' },
  mechanicalRate: { current: '15.1% → 15.35% of service revenue (Phonorecords IV, 2023–27)', next: 'Phonorecords V (2028–32) proposed settlement posted Jul 2026; objections filed Aug 2026', source: src('Federal Register — Phonorecords V', 'https://www.federalregister.gov/documents/2026/07/10/2026-13996/determination-of-rates-and-terms-for-making-and-distributing-phonorecords-phonorecords-v') },
}
