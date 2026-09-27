/**
 * pageGuidePrivate.js — guide entries for the authored modules. Swapped for an empty list in the work build, so
 * its manual never names a section that build does not contain.
 */
export const PRIVATE_GUIDE = [
  { path: '/lab', group: 'Academy', title: 'Valuation lab', what: 'Four worked cases — valuation, publisher PMI, royalty ABS and a PRO carve-out — where every number comes from the case\'s own engine.', use: ['Work a case end to end, then compare your answer with the benchmark.', 'Follow any term into Finance, explained.'], not: 'Cases are teaching material with invented parties, not client work.', feature: 'lab' },
  { path: '/consulting', group: 'Overlay', title: 'Consulting lens', what: 'The client categories this market maps to, and the engagement hypotheses behind each one.', use: ['Open a category for its hypotheses and the companies in it.'], not: 'Hypotheses are starting points for a conversation, never a scope.', feature: 'consulting' },
  { path: '/deliverables', group: 'Overlay', title: 'Deliverables', what: 'Account plans, proposals and sector decks built from the same records, in Word, PowerPoint, Excel or text.', use: ['Pick a company or category, choose a document, and export it.'], not: 'Fee ranges are indicative placeholders, never the firm\'s rates.', feature: 'deliverables' },
]
