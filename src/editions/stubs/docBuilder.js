/** Work-edition stub: the proposal, account-plan and sector-deck builders are authored material. */
const unavailable = (kind) => ({
  kind, entity: null, mode: kind, modeLabel: 'Not in this edition',
  title: 'Not in this edition', subtitle: '', slug: `${kind}-unavailable`,
  generatedAt: new Date().toISOString(), asOf: '',
  sections: [{ num: 1, eyebrow: 'Not in this edition', title: 'This document is not part of the research edition', blocks: [{ kind: 'note', text: 'It is built from authored material rather than public records.' }] }],
  citations: { items: [], source: 'empty' },
})
export const buildProposal = () => unavailable('proposal')
export const buildAccountPlan = () => unavailable('account-plan')
export const buildCategoryDeck = () => unavailable('category-deck')
export const estimateCommercials = () => ({ rows: [], days: 0, fees: 0 })
