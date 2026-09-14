import { Stub } from '../components/primitives/index.js'
export default function Catalogs() {
  return (
    <Stub
      eyebrow="Money · superstar rights" sprint={3}
      title="Catalog sales"
      lede="Publicly reported superstar catalog transactions: buyer, price, asset scope, structure."
      lands={[
        'Filtered view of transactions.js where type = catalog-sale',
        'Asset scope tagged recording · publishing · both, so each sale reads against its flow',
        'Seller modelled as counterparty (artist or estate), not forced into the entity table',
      ]}
      related={[['/deals', 'Deals'], ['/pe', 'PE funds']]}
    />
  )
}
