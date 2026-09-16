/**
 * personas.js — the six buying roles this practice sells to. Roles, never named individuals: the app holds no
 * contact records, and any real person's details stay in the operator's own tools.
 * `proof` points at a lab case, so every claim in outreach has something behind it we can show.
 */
export const PERSONAS = [
  {
    id: 'deal-partner',
    role: 'Deal partner / principal',
    sits: 'PE and growth sponsors, catalog funds, strategic corporate development',
    pains: ['Pricing an unfamiliar asset class under exclusivity', 'A seller\'s adviser pack that cannot be taken at face value', 'Committee questions on what the earnings really are'],
    question: 'How much of that reported income is recurring, collectible, and transferable?',
    proof: { case: 'northstar', label: 'catalog valuation: gross-to-net rebuild, normalisation, finite-life DCF' },
    channel: 'LinkedIn first; email once there is a specific deal to reference',
  },
  {
    id: 'operating-partner',
    role: 'Operating partner / portfolio operations',
    sits: 'PE sponsors, holdco operating teams',
    pains: ['Synergy numbers committed to an investment committee that operations cannot deliver', 'Integrations that slip while the value case ages', 'No independent view of what management is really tracking'],
    question: 'What has management actually committed to, and what are they tracking against it?',
    proof: { case: 'halcyon', label: 'publisher integration: phased, risk-weighted synergies against the premium' },
    channel: 'LinkedIn; they read messages that name a specific deal and a specific number',
  },
  {
    id: 'cfo',
    role: 'Chief financial officer / finance director',
    sits: 'Portfolio companies, labels, publishers, distributors, live operators',
    pains: ['Royalty accounting that cannot close on time', 'Restatement risk nobody has quantified', 'Cost to collect drifting while volumes grow'],
    question: 'What would a royalty restatement cost you, and how early would you know?',
    proof: { case: 'beacon', label: 'carve-out P&L rebuild: allocations to a standalone cost base' },
    channel: 'Email; CFOs reply to written detail more than to social messages',
  },
  {
    id: 'royalty-ops',
    role: 'Head of royalty operations / chief operating officer',
    sits: 'Publishers, distributors, societies, administrators',
    pains: ['Unmatched and black-box income', 'Migration risk across royalty systems', 'Statement cycles that slip during change'],
    question: 'What share of income is unmatched today, and who owns getting it down?',
    proof: { case: 'beacon', label: 'separation and Day-1 continuity: statements, mandates, registrations' },
    channel: 'LinkedIn; operators respond to operational specifics, not capability decks',
  },
  {
    id: 'credit-pm',
    role: 'Credit portfolio manager / risk',
    sits: 'Debt funds, insurance credit, structured-finance investors',
    pains: ['Collateral quality behind a rated note', 'Servicer dependency and reporting quality', 'Refinancing risk at the anticipated repayment date'],
    question: 'What haircut to collections causes your first loss, on your own model?',
    proof: { case: 'cadence', label: 'ABS collateral review: eligibility, waterfall, break-even haircuts' },
    channel: 'Email ahead of pricing; LinkedIn for the introduction',
  },
  {
    id: 'society-ceo',
    role: 'Society chief executive / board member',
    sits: 'PROs, CMOs, mechanical societies',
    pains: ['Member pressure on distributions and overhead', 'Reform deadlines with fixed dates', 'Deciding what to run and what to outsource'],
    question: 'What is your cost to collect against comparable societies, and where does the gap sit?',
    proof: { case: 'beacon', label: 'services carve-out economics and standalone operating model' },
    channel: 'Email, with a board-ready one-pager attached',
  },
]
export const PERSONA_BY_ID = Object.fromEntries(PERSONAS.map((p) => [p.id, p]))
