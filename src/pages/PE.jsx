import { Stub } from '../components/primitives/index.js'
export default function PE() {
  return (
    <Stub
      eyebrow="Money" sprint={3}
      title="PE funds"
      lede="Catalog PE, royalty investors, and the credit and infrastructure platforms with music exposure."
      lands={[
        'src/data/peFunds.js — profile extension keyed by entity id: portfolio, thesis, LP base, structure preferences, exits',
        '/pe/:fundId detail (mirrors the Intelligence Hub PEFundDetail shape, not its content)',
        'Sprint 7+: cross-link to Intelligence Hub PE Academy where a sponsor appears in both',
      ]}
      related={[['/deals', 'Deals'], ['/abs', 'ABS']]}
    />
  )
}
