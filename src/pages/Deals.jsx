import { Stub } from '../components/primitives/index.js'
export default function Deals() {
  return (
    <Stub
      eyebrow="Money" sprint={3}
      title="Deals"
      lede="Chronological feed of catalog acquisitions, PE rounds, ABS issuances, take-privates, and superstar rights sales."
      lands={[
        'src/data/transactions.js — one table; type: catalog-sale · pe-round · abs · debt · take-private · m&a',
        'counterparty { name, kind: artist | estate | company | fund, entityId? } for non-entity sellers',
        'Filter by type · asset (recording | publishing | both) · structure (equity | debt | ABS | royalty stream) · year',
        '/abs and /catalogs are filtered views of the same table',
      ]}
      related={[['/abs', 'ABS'], ['/catalogs', 'Catalog sales'], ['/pe', 'PE funds']]}
    />
  )
}
