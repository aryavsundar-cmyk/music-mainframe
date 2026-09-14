/**
 * flows.js — the two rights domains as data. Both exported here (Patterns §7: keep them together).
 *
 * A flow = nodes (stages) + edges. Edges have kind 'rights' (forward: what is licensed / delivered)
 * or 'money' (backward: who pays whom, and the split). Nodes sit on a grid (col, row) so the diagram
 * component can lay them out; recording is a single-row CHAIN, publishing is a FAN (out to collectors,
 * in to licensees, back to the writer).
 *
 * Economics are published, approximate, and dated. Anything not statutory carries verify: true.
 */
import { AS_OF, src } from './entities/_schema.js'

const N = (id, col, row, label, o = {}) => ({ id, col, row, label, sub: '', description: '', entityIds: [], entityRole: '', econ: [], notes: [], ...o })
const R = (from, to, label, o = {}) => ({ from, to, kind: 'rights', label, ...o })
const M = (from, to, label, o = {}) => ({ from, to, kind: 'money', label, ...o })

export const FLOWS = {
  recording: {
    id: 'recording',
    label: 'Recording income',
    shape: 'chain',
    cols: 5, rows: 2,
    lede: 'The master. One owner, one line: the label licenses the recording down the chain, the money comes back up it, and the artist is paid last from what the label keeps.',
    legend: 'Solid line = recording rights. Money returns beneath. Grey = statutory branch.',
    nodes: [
      N('artist', 1, 1, 'Artist / performer', {
        sub: 'creates the recording',
        description: 'Records the master. Under a traditional label deal the artist assigns or exclusively licenses the master in exchange for an advance and a royalty; under a distribution or services deal the artist keeps ownership and pays a fee or share.',
        econ: [
          { label: 'Major-label royalty', kind: 'pct', value: 20, note: 'typically 15–25% of net receipts, after recoupment of the advance', verify: true },
          { label: 'Indie / profit-share deal', kind: 'pct', value: 50, note: 'net profits split, often after costs', verify: true },
          { label: 'SoundExchange featured-artist share', kind: 'pct', value: 45, note: 'statutory; paid directly, not through the label' },
        ],
        notes: ['Re-recording ("Taylor\'s Version") is the artist-side lever when masters are sold.'],
      }),
      N('label', 2, 1, 'Label · master owner', {
        sub: 'owns or controls the master',
        entityRole: 'label', entityIds: ['umg', 'sony-music-entertainment', 'wmg', 'concord', 'bmg', 'beggars-group', 'empire'],
        description: 'Funds, markets, and controls the master. Majors distribute themselves; independents use a major-owned or independent distributor. This is where catalog buyers (Shamrock, Litmus, Concord) sit when they buy masters.',
        econ: [
          { label: 'Label share of DSP payout', kind: 'pct', value: 100, note: 'receives the full recording-side payment, then pays the artist royalty and any distribution fee', verify: true },
          { label: 'SoundExchange rights-owner share', kind: 'pct', value: 50, note: 'statutory split of non-interactive digital performance' },
        ],
      }),
      N('distributor', 3, 1, 'Distributor', {
        sub: 'delivers, licenses, collects',
        entityRole: 'distributor', entityIds: ['virgin-music-group', 'the-orchard', 'ada', 'distrokid', 'tunecore', 'believe', 'cd-baby'],
        description: 'Ingests metadata and audio, delivers to every DSP, collects and reports. Major-owned distributors (Virgin, The Orchard, ADA) bundle label services; DIY distributors charge a flat fee or a percentage.',
        econ: [
          { label: 'DIY distributor fee', kind: 'pct', value: 9, note: 'ranges from flat annual fee (DistroKid) to ~9–15% commission (CD Baby, Symphonic)', verify: true },
          { label: 'Label-services deal', kind: 'pct', value: 20, note: 'major-owned distributors take 15–30% depending on services bundled', verify: true },
        ],
      }),
      N('dsp', 4, 1, 'DSP · streaming service', {
        sub: 'licenses, streams, pays pro-rata',
        entityRole: 'dsp', entityIds: ['spotify', 'apple-music', 'amazon-music', 'youtube-music', 'tidal', 'deezer', 'tencent-music'],
        description: 'Takes a blanket licence from each label or distributor, pools subscription and ad revenue, and pays out pro-rata by share of streams (or, on Deezer, "artist-centric" weighting). Retains roughly 30%.',
        econ: [
          { label: 'Recording-side share of net revenue', kind: 'pct', value: 55, note: 'roughly 50–55% to recording rights holders; ~15% to publishing; DSP keeps ~30%', verify: true },
          { label: 'All-in per stream · Spotify', kind: 'rate', value: 0.004, note: 'commonly cited $0.003–0.005; varies by country and tier', verify: true },
          { label: 'All-in per stream · Apple Music', kind: 'rate', value: 0.008, note: 'commonly cited $0.007–0.010', verify: true },
          { label: 'All-in per stream · Qobuz', kind: 'rate', value: 0.02, note: 'self-reported ~$0.02 (2024)', verify: true },
        ],
      }),
      N('consumer', 5, 1, 'Listener', {
        sub: 'subscribes or hears ads',
        description: 'Pays a monthly subscription or sits through ads. Bundles (Amazon Prime, Spotify + audiobooks) and family plans dilute the per-user revenue that flows back.',
        econ: [{ label: 'Premium ARPU · Spotify', kind: 'money', value: 4.6, note: 'monthly, blended global, ~€4.6 (2024)', verify: true }],
      }),
      // Statutory branch: non-interactive digital performance (US) — bypasses the chain.
      N('noninteractive', 4, 2, 'Non-interactive radio', {
        sub: 'SiriusXM · Pandora · webcasters',
        entityRole: 'dsp', entityIds: ['siriusxm', 'pandora', 'iheartradio'],
        description: 'Services that don\'t let the listener pick the track pay a statutory rate set by the Copyright Royalty Board, collected by SoundExchange. Terrestrial AM/FM radio in the US pays performers nothing for recordings.',
        econ: [{ label: 'Statutory rate', kind: 'text', value: 'set by the CRB (Web V / SDARS III)', note: 'per-performance for webcasters; % of revenue for satellite', verify: true }],
        tone: 'muted',
      }),
      N('soundexchange', 3, 2, 'SoundExchange · PPL', {
        sub: 'collects and pays direct',
        entityRole: 'pro', entityIds: ['soundexchange', 'ppl'],
        description: 'Collects the statutory royalty and pays 50% to the rights owner, 45% to the featured artist, 5% to non-featured performers (AFM & SAG-AFTRA fund) — directly, not via the label. PPL plays the equivalent role in the UK for broadcast and public performance of recordings.',
        econ: [
          { label: 'Rights owner', kind: 'pct', value: 50 }, { label: 'Featured artist', kind: 'pct', value: 45 }, { label: 'Non-featured performers', kind: 'pct', value: 5 },
        ],
        tone: 'muted',
      }),
    ],
    edges: [
      R('artist', 'label', 'master assigned or exclusively licensed'),
      R('label', 'distributor', 'delivery + licence to distribute'),
      R('distributor', 'dsp', 'blanket licence, metadata, audio'),
      R('dsp', 'consumer', 'streams'),
      M('consumer', 'dsp', 'subscription + advertising'),
      M('dsp', 'distributor', 'recording share ≈ 50–55% of net, pro-rata', { econ: { kind: 'pct', value: 55 } }),
      M('distributor', 'label', 'less distribution fee or services share'),
      M('label', 'artist', 'artist royalty, after recoupment', { econ: { kind: 'pct', value: 20 } }),
      M('noninteractive', 'soundexchange', 'statutory royalty (CRB rate)', { tone: 'muted' }),
      M('soundexchange', 'label', 'rights-owner share', { econ: { kind: 'pct', value: 50 }, tone: 'muted' }),
      M('soundexchange', 'artist', 'featured-artist share, paid direct', { econ: { kind: 'pct', value: 45 }, tone: 'muted' }),
    ],
    sources: [src('SoundExchange — how royalties are split', 'https://www.soundexchange.com/'), src('Spotify — Loud & Clear', 'https://loudandclear.byspotify.com/')],
    asOf: AS_OF,
  },

  publishing: {
    id: 'publishing',
    label: 'Publishing income',
    shape: 'fan',
    cols: 4, rows: 3,
    lede: 'The composition. One song fans out to three collection routes — performance, mechanical, sync — and dozens of licensees, then the money collects back in, with the writer\'s share of performance paid direct.',
    legend: 'Dashed line = composition rights. Money returns along the fan. The PRO pays the writer directly.',
    nodes: [
      N('songwriter', 1, 2, 'Songwriter · composer', {
        sub: 'creates the work',
        description: 'Writes the composition (lyrics and melody) and registers it — with a PRO for performance, via a publisher or admin for everything else. Owns the copyright unless assigned. Superstar catalog sales (Dylan, Springsteen, Sting) are sales of this right.',
        econ: [
          { label: 'Writer share of performance', kind: 'pct', value: 50, note: 'paid directly by the PRO, never through the publisher' },
          { label: 'Admin deal', kind: 'pct', value: 85, note: 'writer keeps ~80–90% under an administration deal (Kobalt, Songtrust)', verify: true },
          { label: 'Traditional publishing deal', kind: 'pct', value: 75, note: 'writer typically keeps 75% of publisher-collected income (co-pub) or 50% (full)', verify: true },
        ],
      }),
      N('publisher', 2, 2, 'Publisher · administrator', {
        sub: 'registers, licenses, collects',
        entityRole: 'publisher', entityIds: ['sony-music-publishing', 'umpg', 'warner-chappell', 'kobalt', 'bmg', 'primary-wave', 'reservoir', 'songtrust'],
        description: 'Registers the work with every society worldwide, issues sync and mechanical licences, chases unmatched royalties, and pitches the song. Majors own catalogs; administrators (Kobalt, Songtrust) collect for a fee without owning.',
        econ: [
          { label: 'Publisher share of performance', kind: 'pct', value: 50, note: 'the half the PRO pays to the publisher' },
          { label: 'Admin fee', kind: 'pct', value: 12, note: '~10–20% of collected income', verify: true },
        ],
      }),
      N('pro', 3, 1, 'PRO · performing rights', {
        sub: 'ASCAP · BMI · PRS · SACEM · GEMA',
        entityRole: 'pro', entityIds: ['ascap', 'bmi', 'sesac', 'gmr', 'prs', 'sacem', 'gema', 'jasrac', 'socan'],
        description: 'Licenses the public performance of compositions — radio, TV, venues, restaurants, and the performance component of streaming — under blanket licences, then distributes by usage data. US societies operate under DOJ consent decrees (ASCAP, BMI) or outside them (SESAC, GMR).',
        econ: [
          { label: 'Society admin / overhead', kind: 'pct', value: 12, note: 'roughly 10–15% retained before distribution', verify: true },
          { label: 'Writer / publisher split', kind: 'pct', value: 50, note: '50/50, writer share paid direct' },
        ],
      }),
      N('mechanical', 3, 2, 'Mechanical · MLC · HFA', {
        sub: 'reproduction licences',
        entityRole: 'pro', entityIds: ['the-mlc', 'hfa', 'mri', 'prs'],
        description: 'Licenses the reproduction of the composition — streams, downloads, physical. In the US the MLC administers the blanket streaming licence created by the Music Modernization Act; HFA and MRI handle direct and legacy licences. Outside the US, mechanical usually sits inside the society (MCPS in the UK, GEMA, SACEM).',
        econ: [
          { label: 'US streaming mechanical (Phonorecords IV)', kind: 'pct', value: 15.35, note: 'headline all-in rate rising from 15.1% (2023) to 15.35% (2027) of service revenue', verify: true },
          { label: 'US physical / download', kind: 'rate', value: 0.124, note: '≈12.4¢ per track (2024, CPI-adjusted)', verify: true },
        ],
      }),
      N('sync', 3, 3, 'Sync licensing', {
        sub: 'direct, negotiated',
        entityRole: 'sync', entityIds: ['position-music', 'songtradr', 'bank-robber-music', 'riptide-music'],
        description: 'Film, TV, advertising, games, trailers. Licensed directly by the publisher (composition) and label (master), usually on most-favoured-nations terms so both sides get the same fee.',
        econ: [{ label: 'Typical fee', kind: 'text', value: 'negotiated — hundreds to seven figures', note: 'composition and master fees usually matched (MFN)' }],
      }),
      N('broadcast', 4, 1, 'Radio · TV · venues · live', {
        sub: 'performance licensees',
        entityRole: 'live', entityIds: ['iheartradio', 'live-nation', 'aeg-presents', 'msg-entertainment'],
        description: 'Blanket-licensed by the PROs. Live promoters pay a percentage of box office (PRS ~4% UK; ASCAP/BMI per-event tariffs in the US) for the compositions performed.',
        econ: [{ label: 'Live performance tariff · UK (PRS)', kind: 'pct', value: 4, note: 'of gross box office, since 2018', verify: true }],
        tone: 'muted',
      }),
      N('dsp', 4, 2, 'DSPs', {
        sub: 'perform + reproduce',
        entityRole: 'dsp', entityIds: ['spotify', 'apple-music', 'amazon-music', 'youtube-music', 'tiktok'],
        description: 'A stream is both a performance and a reproduction, so DSPs pay the PROs and the mechanical collectors. Their publishing payout is a fraction of the recording payout — the structural imbalance songwriters campaign against.',
        econ: [{ label: 'Publishing share of DSP net revenue', kind: 'pct', value: 15, note: 'roughly 12–15%, covering performance and mechanical together', verify: true }],
        tone: 'muted',
      }),
      N('filmtv', 4, 3, 'Film · TV · ads · games', {
        sub: 'sync licensees',
        description: 'Producers, studios, agencies, and publishers of games license compositions for a fee and, for broadcast uses, also trigger performance royalties through the PROs via cue sheets.',
        tone: 'muted',
      }),
    ],
    edges: [
      R('songwriter', 'publisher', 'copyright assigned (publishing deal) or administered (admin deal)'),
      R('publisher', 'pro', 'work registered; performance right licensed collectively'),
      R('publisher', 'mechanical', 'work registered; reproduction right licensed collectively'),
      R('publisher', 'sync', 'direct licence, per use'),
      R('pro', 'broadcast', 'blanket performance licence'),
      R('pro', 'dsp', 'blanket performance licence'),
      R('mechanical', 'dsp', 'blanket mechanical licence (US: MMA §115)'),
      R('sync', 'filmtv', 'synchronisation licence'),
      M('broadcast', 'pro', 'blanket fees, tariffs, % of box office'),
      M('dsp', 'pro', 'performance royalties'),
      M('dsp', 'mechanical', 'mechanical royalties', { econ: { kind: 'pct', value: 15.35 } }),
      M('filmtv', 'sync', 'sync fee'),
      M('pro', 'publisher', 'publisher share', { econ: { kind: 'pct', value: 50 } }),
      M('pro', 'songwriter', 'writer share, paid direct', { econ: { kind: 'pct', value: 50 } }),
      M('mechanical', 'publisher', 'mechanical royalties, matched by registration'),
      M('sync', 'publisher', 'sync fee, less agent commission'),
      M('publisher', 'songwriter', 'writer\'s contractual share, after admin fee or recoupment'),
    ],
    sources: [src('The MLC — how the blanket licence works', 'https://www.themlc.com/'), src('US Copyright Royalty Board — Phonorecords IV', 'https://www.crb.gov/'), src('ASCAP — how royalties work', 'https://www.ascap.com/help/royalties-and-payment')],
    asOf: AS_OF,
  },
}

export const FLOW_IDS = Object.keys(FLOWS)
export const getFlow = (id) => FLOWS[id] || null
export const getFlowNode = (flowId, nodeId) => getFlow(flowId)?.nodes.find((n) => n.id === nodeId) || null
export const edgesFor = (flow, nodeId) => ({
  rightsIn: flow.edges.filter((e) => e.kind === 'rights' && e.to === nodeId),
  rightsOut: flow.edges.filter((e) => e.kind === 'rights' && e.from === nodeId),
  moneyIn: flow.edges.filter((e) => e.kind === 'money' && e.to === nodeId),
  moneyOut: flow.edges.filter((e) => e.kind === 'money' && e.from === nodeId),
})
/** Every flow node an entity appears in, for entity pages. */
export const flowsForEntity = (entityId) =>
  FLOW_IDS.flatMap((fid) => FLOWS[fid].nodes.filter((n) => n.entityIds.includes(entityId)).map((n) => ({ flowId: fid, node: n })))
