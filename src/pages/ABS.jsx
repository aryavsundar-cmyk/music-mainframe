import { Stub } from '../components/primitives/index.js'
export default function ABS() {
  return (
    <Stub
      eyebrow="Money · structured finance" sprint={3}
      title="Music-royalty ABS"
      lede="Every music-backed securitisation: issuer, arranger, size, tranche stack, coupon range, collateral, rating, close date."
      lands={[
        'Filtered view of transactions.js where type = abs',
        'Expandable tranche breakdowns using fixed-income conventions (senior → mezz → equity, coupon as rate treatment)',
        'Sources: Structured Credit Investor, Asset-Backed Alert, issuer press releases',
      ]}
      related={[['/deals', 'Deals'], ['/pe', 'PE funds']]}
    />
  )
}
