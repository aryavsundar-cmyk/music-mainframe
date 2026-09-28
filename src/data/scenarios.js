/**
 * scenarios.js — the ways money enters this industry, and how each one divides.
 *
 * `/flows` was cut by RIGHTS DOMAIN: recording in one tab, publishing in the other. That is the right first cut
 * of the structure and the wrong cut of the economics. It answers "which right is being exploited" and can never
 * answer "how did this dollar arrive", which is the question that actually separates a paid stream from a TikTok
 * post from a sync from a Saturday night at a 2,000-cap venue. Worse, cutting by domain means the recording line
 * and the publishing line of the SAME event are never on screen together — and that comparison is the whole
 * point of understanding how music is paid for.
 *
 * A scenario is one money route, carrying BOTH domains. Three rules keep it from becoming a second source of
 * truth, or a calculator:
 *
 * 1. **A scenario is a lens over the existing nodes, not a new graph.** It names stages that already exist in
 *    `flows.js` and says what happens to a dollar as it passes them. Every stage's description is written once.
 *
 * 2. **No rate is typed here.** A step points at a stage's `econ` entry with `rate(flow, node, label)`, and
 *    `utils/waterfall.js` resolves it at read time. Change the rate in `flows.js` and every scenario follows;
 *    rename the entry and `test:flows` fails rather than silently dropping the row. A number written into this
 *    file is a defect, and the test greps for one.
 *
 * 3. **The unit is one dollar of what the licensee pays, fixed and published — never entered by the reader.**
 *    This is where the Sprint 0 non-goal lives: *no royalty calculator, no artist tooling*. This file illustrates
 *    industry structure with published rates. It never takes somebody's own streams, catalogue or deal terms and
 *    returns what they would earn, and it must not grow an input box. See `LIMITS.flow` in `data/limits.js`.
 *
 * Where the division is genuinely not public, a step says so rather than carrying a plausible number. Two
 * vocabularies for that, and they mean different things:
 *
 * - `state: 'undisclosed'` — money certainly moves here and nobody publishes how much. The finding is the
 *   non-disclosure, and it is rendered as such.
 * - `basis: 'unknown'` — this branch's share of its parent is not published, but the splits INSIDE it are. Its
 *   children are then proportions of the branch, not of the dollar, and the waterfall says so rather than
 *   multiplying an unknown by a known and printing the result.
 */
import { src } from './entities/_schema.js'

/** A pointer at a stage's published economics. The number lives in flows.js; this is only its address. */
const rate = (flow, node, label) => ({ flow, node, label })
/** A step that keeps whatever its siblings did not take. Always explicit, so a tree cannot silently not add up. */
const REST = { rest: true }

export const SCENARIOS = {
  'paid-stream': {
    id: 'paid-stream',
    label: 'Paid stream',
    short: 'Streaming',
    domains: ['recording', 'publishing'],
    unit: 'one dollar of a streaming service’s net music revenue',
    unitNote: 'Net revenue is what the service reports for music after sales tax, payment processing and its own costs of sale. Services do not disclose those deductions separately, so the dollar below starts where the published splits start — not at the $12.99 on a card statement.',
    lede: 'The reference case, and the only route where both rights are paid for the same play. Roughly half the dollar reaches the recording and a seventh reaches the composition — and the two travel by completely different machinery to get to the people who made the record.',
    note: 'Ad-supported streaming divides the same way; what differs is the size of the pool, not the shape of the split. The published split is described for paid streaming, so the app does not restate it as an ad-supported rate.',
    tree: {
      children: [
        {
          id: 'recording-side', label: 'Recording rights', sub: 'the master', side: 'recording',
          rate: rate('recording', 'dsp', 'Recording-side share of net revenue'),
          node: { flow: 'recording', id: 'label' }, tone: 'recording',
          children: [
            { id: 'dist-fee', label: 'Distributor or label services', rate: rate('recording', 'distributor', 'Label-services deal'), node: { flow: 'recording', id: 'distributor' } },
            {
              id: 'label-receipts', label: 'The label’s net receipts', ...REST, node: { flow: 'recording', id: 'label' },
              children: [
                { id: 'artist-royalty', label: 'Artist royalty', sub: 'only after the advance is recouped', rate: rate('recording', 'artist', 'Major-label royalty'), node: { flow: 'recording', id: 'artist' } },
                { id: 'label-retains', label: 'The label retains', ...REST, node: { flow: 'recording', id: 'label' } },
              ],
            },
          ],
        },
        {
          id: 'publishing-side', label: 'Composition rights', sub: 'the song', side: 'publishing',
          rate: rate('publishing', 'dsp', 'Publishing share of DSP net revenue'),
          node: { flow: 'publishing', id: 'publisher' }, tone: 'publishing',
          note: 'A stream is both a performance and a reproduction, so this share is collected twice over by two different systems. How it divides between them is not separately published, which is why the two routes below are proportions of themselves rather than of the dollar.',
          children: [
            {
              id: 'performance', label: 'Performance route', sub: 'via the PRO', basis: 'unknown',
              why: 'Services and societies publish the combined publishing share, not how much of it is performance and how much is mechanical.',
              node: { flow: 'publishing', id: 'pro' },
              children: [
                { id: 'pro-admin', label: 'Society admin', rate: rate('publishing', 'pro', 'Society admin / overhead'), node: { flow: 'publishing', id: 'pro' } },
                {
                  id: 'pro-distributed', label: 'Distributed', ...REST, node: { flow: 'publishing', id: 'pro' },
                  children: [
                    { id: 'writer-direct', label: 'Writer’s share, paid direct', sub: 'never passes through the publisher', rate: rate('publishing', 'pro', 'Writer / publisher split'), node: { flow: 'publishing', id: 'songwriter' } },
                    {
                      id: 'publisher-share', label: 'Publisher’s share', ...REST, node: { flow: 'publishing', id: 'publisher' },
                      children: [
                        { id: 'writer-contract', label: 'Writer’s contractual share', rate: rate('publishing', 'songwriter', 'Traditional publishing deal'), node: { flow: 'publishing', id: 'songwriter' } },
                        { id: 'publisher-retains', label: 'The publisher retains', ...REST, node: { flow: 'publishing', id: 'publisher' } },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              id: 'mechanical', label: 'Mechanical route', sub: 'via the MLC or the society', basis: 'unknown',
              why: 'The same non-disclosure: the mechanical half of the publishing share is not reported separately from the performance half.',
              node: { flow: 'publishing', id: 'mechanical' },
              children: [
                {
                  id: 'mech-publisher', label: 'Collected by the publisher', sub: 'matched by registration',
                  ...REST, node: { flow: 'publishing', id: 'publisher' },
                  children: [
                    { id: 'mech-writer', label: 'Writer’s contractual share', rate: rate('publishing', 'songwriter', 'Traditional publishing deal'), node: { flow: 'publishing', id: 'songwriter' } },
                    { id: 'mech-publisher-retains', label: 'The publisher retains', ...REST, node: { flow: 'publishing', id: 'publisher' } },
                  ],
                },
              ],
              tail: { id: 'blackbox', label: 'Unmatched royalties never reach a writer at all', node: { flow: 'publishing', id: 'blackbox' } },
            },
          ],
        },
        { id: 'service', label: 'The service retains', side: 'other', ...REST, node: { flow: 'recording', id: 'dsp' }, tone: 'ink' },
      ],
    },
    sources: [
      src('Spotify — Loud & Clear', 'https://loudandclear.byspotify.com/'),
      src('US Copyright Royalty Board — Phonorecords IV', 'https://www.crb.gov/'),
    ],
  },

  'ugc': {
    id: 'ugc',
    label: 'UGC · short video',
    short: 'UGC',
    domains: ['recording', 'publishing'],
    unit: 'one dollar of a platform’s music licence pool',
    unitNote: 'Short-video and social platforms buy a negotiated pool, not a per-play licence. The pool is the unit because there is no per-use rate to start from.',
    lede: 'The largest structural change since this chain was drawn, and the one that resists being drawn at all. A post is licensed from a pool, the pool is allocated by the platform’s own matching, and neither the pool nor the method is published — so the honest answer for every step below the first is that nobody outside the negotiation knows.',
    note: 'Most of the value of a UGC licence is not the pool. It is conversion: a post drives plays on a service where the per-play economics apply. The route on this page is the money that arrives directly.',
    tree: {
      children: [
        {
          id: 'ugc-recording', label: 'Recording rights', sub: 'licensed to the platform', side: 'recording', tone: 'recording',
          state: 'undisclosed', why: 'Platforms publish neither the size of the pool nor how it divides between the recording and the composition.',
          node: { flow: 'recording', id: 'ugc' },
          children: [
            { id: 'ugc-label', label: 'Allocated to a label or distributor', state: 'undisclosed', why: 'Allocation runs on the platform’s own matching data, which is not disclosed and cannot be reconciled to a play count.', node: { flow: 'recording', id: 'label' } },
            { id: 'ugc-artist', label: 'Then to the artist under the recording contract', state: 'undisclosed', why: 'A UGC line reaches an artist statement as a share of a pool, so no published royalty rate describes it.', node: { flow: 'recording', id: 'artist' } },
          ],
        },
        {
          id: 'ugc-publishing', label: 'Composition rights', sub: 'licensed separately', side: 'publishing', tone: 'publishing',
          state: 'undisclosed', why: 'The composition needs its own licence, negotiated separately and equally confidential.',
          node: { flow: 'publishing', id: 'ugc' },
        },
        {
          id: 'ugc-claim', label: 'Claiming on third-party uploads', sub: 'Content ID and equivalents',
          state: 'undisclosed', why: 'A separate route, and a separate kind of money: a share of advertising on a video the rights holder did not make. The platform publishes that a split exists, not the rate.',
          node: { flow: 'recording', id: 'contentid' }, tone: 'ink',
        },
      ],
    },
    sources: [
      src('IFPI Global Music Report 2026', 'https://www.ifpi.org/'),
      src('Music Business Worldwide — search: “TikTok UMG licence”', 'https://www.musicbusinessworldwide.com/?s=TikTok%20UMG%20licence'),
    ],
  },

  'statutory-radio': {
    id: 'statutory-radio',
    label: 'Non-interactive radio',
    short: 'Statutory',
    domains: ['recording'],
    paysNothing: { publishing: 'SoundExchange collects for the recording only. The composition is licensed on the same broadcast by the PROs, on a separate route with its own rate.' },
    unit: 'one dollar of statutory royalty collected by SoundExchange',
    unitNote: 'Set by the Copyright Royalty Board, not negotiated. The one route on this page where every share is fixed in law rather than in a contract.',
    lede: 'Satellite radio and webcasters pay a rate nobody negotiates, and the split is statutory — which makes this the only route where the performer is paid directly, in a known proportion, without the label in between. It is also the route US terrestrial AM/FM radio does not pay at all.',
    note: 'The composition is licensed separately by the PROs on the same broadcast, so a radio play generates publishing income by a different route that this scenario does not divide.',
    tree: {
      children: [
        { id: 'se-owner', label: 'Rights owner', sub: 'usually the label', side: 'recording', rate: rate('recording', 'soundexchange', 'Rights owner'), node: { flow: 'recording', id: 'label' }, tone: 'recording' },
        { id: 'se-featured', label: 'Featured artist, paid direct', sub: 'not through the label, and not recoupable against the advance', side: 'recording', rate: rate('recording', 'soundexchange', 'Featured artist'), node: { flow: 'recording', id: 'artist' }, tone: 'accent' },
        { id: 'se-nonfeatured', label: 'Non-featured performers', sub: 'session players and singers, via the AFM & SAG-AFTRA fund', side: 'recording', rate: rate('recording', 'soundexchange', 'Non-featured performers'), node: { flow: 'recording', id: 'soundexchange' }, tone: 'ink' },
      ],
    },
    sources: [src('SoundExchange — how royalties are split', 'https://www.soundexchange.com/')],
  },

  'sync': {
    id: 'sync',
    label: 'Sync licence',
    short: 'Sync',
    domains: ['recording', 'publishing'],
    unit: 'one dollar of a sync budget',
    unitNote: 'There is no rate card for sync. The fee depends on the use, the term, the media and the song, so the unit is the budget rather than a price.',
    lede: 'The route where the two sides are deliberately equal. Most-favoured-nations terms mean the master and the composition are paid the same fee, so a sync budget splits in half before either side divides internally — the cleanest illustration on the page of why a song and a recording are two assets.',
    note: 'A broadcast sync also generates performance royalties downstream through the PROs, reported on a cue sheet. That is a second payment, on a different route, and it is not part of this dollar.',
    tree: {
      children: [
        {
          id: 'sync-composition', label: 'Composition side', sub: 'licensed by the publisher', side: 'publishing', tone: 'publishing',
          rate: rate('publishing', 'sync', 'Composition share under MFN'), node: { flow: 'publishing', id: 'sync' },
          children: [
            { id: 'sync-writer', label: 'Writer’s contractual share', rate: rate('publishing', 'songwriter', 'Traditional publishing deal'), node: { flow: 'publishing', id: 'songwriter' } },
            { id: 'sync-publisher', label: 'The publisher retains', ...REST, node: { flow: 'publishing', id: 'publisher' } },
          ],
        },
        {
          id: 'sync-master', label: 'Master side', sub: 'licensed by the label', side: 'recording', ...REST, tone: 'recording',
          node: { flow: 'recording', id: 'label' },
          children: [
            { id: 'sync-artist', label: 'Artist’s share of the fee', state: 'undisclosed', why: 'A sync fee is split under the recording contract, which is not a published rate and is commonly negotiated differently from the streaming royalty.', node: { flow: 'recording', id: 'artist' } },
          ],
        },
      ],
    },
    sources: [src('ASCAP — how royalties work', 'https://www.ascap.com/help/royalties-and-payment')],
  },

  'direct-to-fan': {
    id: 'direct-to-fan',
    label: 'Direct to fan',
    short: 'Direct',
    domains: ['recording'],
    unit: 'one dollar a fan pays for a download on an artist\u2019s store',
    unitNote: 'Bandcamp publishes its whole split, which is why this route can be drawn to the last cent while the two platform routes above it cannot. The digital share is used here; physical goods carry a 10% platform share instead of 15%.',
    lede: 'The shortest chain on the page, and the only one whose platform publishes the whole of it. No label, no distributor, no society, no pro-rata pool \u2014 the artist sets the price and keeps about four-fifths of it. Set beside a stream, this is the clearest statement of what the intermediaries in every other route are being paid for.',
    note: 'Four-fifths of a dollar is not four-fifths of a living: this route trades a high share of a small number of sales for a low share of a very large number of plays. The page divides the dollar and says nothing about how many there are.',
    tree: {
      children: [
        { id: 'd2f-platform', label: 'The platform\u2019s share', sub: 'digital items', side: 'other', tone: 'ink', rate: rate('recording', 'directfan', 'Platform share \u00b7 digital'), node: { flow: 'recording', id: 'directfan' } },
        { id: 'd2f-processing', label: 'Payment processing', sub: 'charged separately, and never a flat rate', side: 'other', tone: 'ink', rate: rate('recording', 'directfan', 'Payment processing'), node: { flow: 'recording', id: 'directfan' } },
        {
          id: 'd2f-artist', label: 'The artist', sub: 'or whoever owns the recording', side: 'recording', tone: 'recording', ...REST,
          node: { flow: 'recording', id: 'artist' },
          // Not a sibling: a mechanical is a fixed per-copy rate, not a share of the price, so it cannot divide
          // this dollar. Forcing it into the tree as a percentage would be a unit error dressed as a split.
          tail: { id: 'd2f-mechanical', label: 'if the song is somebody else\u2019s, a mechanical royalty is owed on every copy sold \u2014 a fixed per-copy rate set by the Copyright Royalty Board, not a share of the price, so it is not a slice of this dollar', node: { flow: 'publishing', id: 'mechanical' } },
        },
      ],
    },
    sources: [src('Bandcamp \u2014 Fair Trade Music Policy', 'https://bandcamp.com/fair_trade_music_policy')],
  },

  'ai': {
    id: 'ai',
    label: 'AI licensing',
    short: 'AI',
    domains: ['recording', 'publishing'],
    unit: 'one dollar an AI developer pays for music rights',
    unitNote: 'A dollar is already the wrong unit and the page says so: the announced settlements were paid in cash, equity and assets together, so no cash figure would be the whole consideration even if one were published.',
    lede: 'The newest route, and the one where drawing the pipes correctly is the entire contribution. The 2024 infringement suits became licences \u2014 Universal settled with Udio in October 2025, Warner with Suno in November 2025 \u2014 and not one party published a rate. What can be said is that there are two distinct routes, an input and an output, and that only the input has been settled at all.',
    note: 'The input side is a training licence on a catalogue. The output side \u2014 what is owed when a model generates something \u2014 has no settled model at all: the announced deals describe licensed platforms, not a royalty per generated track. GEMA is litigating the question in Europe rather than licensing it.',
    tree: {
      children: [
        {
          id: 'ai-input-recording', label: 'Training licence \u2014 recordings', sub: 'the input side', side: 'recording', tone: 'recording',
          state: 'undisclosed', why: 'Every announced settlement is confidential, and the consideration included equity and assets as well as cash.',
          node: { flow: 'recording', id: 'ai' },
          children: [
            { id: 'ai-artist', label: 'Then to the artist under the recording contract', state: 'undisclosed', why: 'No major has published how an AI licence fee is credited to an artist account, or whether it is recoupable.', node: { flow: 'recording', id: 'artist' } },
          ],
        },
        {
          id: 'ai-input-publishing', label: 'Training licence \u2014 compositions', sub: 'a separate licence on the songs inside the recordings', side: 'publishing', tone: 'publishing',
          state: 'undisclosed', why: 'Publishing catalogues are licensed separately and on equally confidential terms; some societies are litigating rather than licensing.',
          node: { flow: 'publishing', id: 'ai' },
        },
        {
          id: 'ai-output', label: 'Output royalties', sub: 'the unsettled side', side: 'other', tone: 'ink',
          state: 'undisclosed', why: 'There is no published model for what a generated track owes, to whom, or on what basis attribution would be measured. The announced deals licensed platforms, not outputs.',
          node: { flow: 'recording', id: 'ai' },
        },
      ],
    },
    sources: [
      src('UMG and Udio \u2014 strategic agreements for a licensed AI music platform (PR Newswire, Oct 2025)', 'https://www.prnewswire.com/news-releases/universal-music-group-and-udio-announce-udios-first-strategic-agreements-for-new-licensed-ai-music-creation-platform-302599129.html'),
      src('Variety \u2014 major labels sue Suno and Udio (Jun 2024)', 'https://variety.com/2024/music/news/record-labels-sue-ai-music-services-suno-and-udio-copyright-infringement-1236045366/'),
    ],
  },

  'live': {
    id: 'live',
    label: 'Live performance',
    short: 'Live',
    domains: ['publishing'],
    // The difference between "this route pays the recording nothing" and "we do not hold a figure for it" is the
    // whole point of the live row, and a dash says the second when the truth is the first.
    paysNothing: { recording: 'A live performance of a song is an exploitation of the composition, not of any recording, so no recording royalty arises at all. A recording used as playback or in a broadcast of the show is a separate licence.' },
    unit: 'one dollar of gross box office, UK',
    unitNote: 'The PRS tariff is a percentage of gross box office. The equivalent in the US is a per-event tariff rather than a percentage, so the unit is stated for one territory rather than blended into a worldwide figure that nobody publishes.',
    lede: 'The route that surprises people: when a song is performed live, the composition is paid and the recording earns nothing at all. And the music-rights payment is a few pence in the pound — almost all of a ticket is production, venue, promotion and the artist’s own fee, which is a performance payment, not a rights payment.',
    note: 'The artist is of course paid from a live show — as a guarantee or a share of the box office, negotiated with the promoter. That is a fee for performing, not income from a copyright, which is why it sits in the remainder below rather than on the rights line.',
    tree: {
      children: [
        {
          id: 'live-pro', label: 'Composition performance royalty', sub: 'PRS tariff on gross box office', side: 'publishing', tone: 'publishing',
          rate: rate('publishing', 'broadcast', 'Live performance tariff · UK (PRS)'), node: { flow: 'publishing', id: 'pro' },
          children: [
            { id: 'live-admin', label: 'Society admin', rate: rate('publishing', 'pro', 'Society admin / overhead'), node: { flow: 'publishing', id: 'pro' } },
            {
              id: 'live-distributed', label: 'Distributed', ...REST, node: { flow: 'publishing', id: 'pro' },
              children: [
                { id: 'live-writer', label: 'Writer’s share, paid direct', rate: rate('publishing', 'pro', 'Writer / publisher split'), node: { flow: 'publishing', id: 'songwriter' } },
                { id: 'live-publisher', label: 'Publisher’s share', ...REST, node: { flow: 'publishing', id: 'publisher' } },
              ],
            },
          ],
        },
        { id: 'live-rest', label: 'Everything else', sub: 'production, venue, promoter, and the artist’s own fee', side: 'other', ...REST, node: { flow: 'publishing', id: 'broadcast' }, tone: 'ink' },
      ],
    },
    sources: [src('ASCAP — how royalties work', 'https://www.ascap.com/help/royalties-and-payment')],
  },
}

export const SCENARIO_IDS = Object.keys(SCENARIOS)
export const getScenario = (id) => SCENARIOS[id] || null
/** The scenarios that divide a given rights domain, for the per-flow view. */
export const scenariosForFlow = (flowId) => SCENARIO_IDS.filter((id) => SCENARIOS[id].domains.includes(flowId))
