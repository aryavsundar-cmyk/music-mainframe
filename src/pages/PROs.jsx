import { Stub } from '../components/primitives/index.js'
export default function PROs() {
  return (
    <Stub
      eyebrow="Rights" tone="secondary" sprint={4}
      title="PROs & CMOs"
      lede="Performance and mechanical rights organisations, US and international: membership, revenue, ownership, distribution methodology, reforms."
      lands={[
        'src/data/pros.js — profile extension keyed by entity id',
        'Comparative table across ASCAP · BMI · SESAC · GMR · SoundExchange · MLC · PRS · GEMA · SACEM · JASRAC · APRA · SOCAN…',
        'Per-PRO detail with reciprocal agreements and recent reform timeline',
      ]}
      related={[['/flows/publishing', 'Publishing flow'], ['/entities', 'Entities']]}
    />
  )
}
