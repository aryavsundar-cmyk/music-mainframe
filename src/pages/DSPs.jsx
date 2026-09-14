import { Stub } from '../components/primitives/index.js'
export default function DSPs() {
  return (
    <Stub
      eyebrow="Rights · distribution economics" tone="secondary" sprint={4}
      title="DSPs"
      lede="Streaming economics by platform: per-stream payout ranges, splits, market share, subscriber counts, licensing posture."
      lands={[
        'src/data/fundamentals.js — payout ranges (rate treatment), share splits (pct), subscribers (count)',
        'Interactive · social/video · regional · non-interactive · HiFi tiers',
        'Published rate cards only — no royalty calculator (non-goal §8)',
      ]}
      related={[['/flows/recording', 'Recording flow'], ['/entities', 'Entities']]}
    />
  )
}
