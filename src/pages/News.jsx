import { Stub } from '../components/primitives/index.js'
export default function News() {
  return (
    <Stub
      eyebrow="Live" tone="muted" sprint={5}
      title="News"
      lede="Live intelligence from the trades, Google News queries, SEC EDGAR, and podcast feeds — tagged to entities by type."
      lands={[
        'server/ aggregator adapted from the Intelligence Hub pattern (Express + WebSocket, in-memory, restart-safe)',
        'Sources: MBW · Billboard Pro · CMU · Water & Music · Music Ally · Hits · Pollstar · Variety Music · Music Week · SCI',
        'Signals namespaced by entity type and generated from entities.js, not hand-maintained',
        'Graceful degradation: "backend unreachable" vs "no matches" are distinct states',
      ]}
      related={[['/entities', 'Entities']]}
    />
  )
}
