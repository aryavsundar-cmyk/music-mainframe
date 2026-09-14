/**
 * rateCard.js — INDICATIVE staffing and day rates for proposal commercials.
 * Roles and rates mirror the Intelligence Hub's PricingCalculator defaults (hourly × 8 → day rate) so the two
 * apps quote the same way; every number is labelled "indicative" in the output and is editable in /deliverables
 * before export. Replace with the engagement rate card before sending.
 */
export const ROLES = [
  { id: 'md', label: 'Managing Director', dayRate: 6000 },
  { id: 'sd', label: 'Senior Director', dayRate: 4800 },
  { id: 'dir', label: 'Director', dayRate: 4000 },
  { id: 'mgr', label: 'Manager', dayRate: 3200 },
  { id: 'an', label: 'Analyst', dayRate: 2200 },
  { id: 'assoc', label: 'Associate', dayRate: 1600 },
]

/** Default engagement shape per service line: duration and days-per-week by role. */
export const STAFFING = {
  diligence:        { weeks: 4,  team: { md: 0.5, sd: 1, dir: 2, mgr: 4, an: 5, assoc: 5 } },
  'carve-out':      { weeks: 14, team: { md: 0.5, sd: 1.5, dir: 3, mgr: 5, an: 5, assoc: 0 } },
  'value-creation': { weeks: 16, team: { md: 0.5, sd: 1, dir: 3, mgr: 5, an: 5, assoc: 5 } },
  pmi:              { weeks: 16, team: { md: 0.5, sd: 2, dir: 4, mgr: 5, an: 5, assoc: 0 } },
  strategy:         { weeks: 8,  team: { md: 1, sd: 2, dir: 3, mgr: 4, an: 5, assoc: 0 } },
}

/** Phases scaled to total weeks. */
export const PHASES = [
  { id: 'mobilise', label: 'Mobilise', share: 0.1, text: 'Kick-off, data request, stakeholder interviews, hypothesis alignment' },
  { id: 'diagnose', label: 'Diagnose', share: 0.3, text: 'Royalty, rights, and operating baselines; issue tree; quantified opportunity' },
  { id: 'design', label: 'Design', share: 0.3, text: 'Target operating model, integration or separation plan, business case' },
  { id: 'deliver', label: 'Deliver', share: 0.3, text: 'Execution support, PMO, weekly steering, benefits tracking' },
]

/** Generic activities and deliverables per line; proposals combine these with the category's hypotheses. */
export const WORKSTREAM_TEMPLATES = {
  diligence: {
    activities: ['Royalty-stream analysis by rights type, DSP, and territory', 'Contract and catalog term review (admin, sub-publishing, distribution)', 'Quality of earnings on collections and unmatched income', 'Management and key-person assessment', 'Red-flag and value-bridge synthesis'],
    deliverables: ['Diligence report with value bridge', 'Data book (rights, royalties, contracts)', 'Red-flag memo and SPA inputs'],
  },
  'carve-out': {
    activities: ['Perimeter definition (rights, contracts, people, systems, data)', 'Royalty-accounting and society-registration separation plan', 'TSA design and costing', 'Day-1 readiness and stranded-cost analysis', 'Standalone operating model'],
    deliverables: ['Separation blueprint', 'TSA schedules', 'Day-1 plan and stranded-cost view'],
  },
  'value-creation': {
    activities: ['Collections diagnostic: registrations, matching, unmatched, neighbouring rights, sync', 'Cost and organisation baseline', 'Pricing and terms review (admin fees, take rates, DSP deals)', 'Data and royalty-systems assessment', 'Initiative sizing and sequencing'],
    deliverables: ['100-day plan', 'Value-creation roadmap with owners and KPIs', 'Benefits tracker'],
  },
  pmi: {
    activities: ['Integration management office set-up', 'Royalty systems, catalog, and registration consolidation plan', 'Organisation design and retention', 'Synergy validation and tracking', 'Writer, artist, and partner communications'],
    deliverables: ['Integration blueprint and IMO cadence', 'Synergy tracker', 'Systems consolidation plan'],
  },
  strategy: {
    activities: ['Market and competitor map (rights, DSP, capital)', 'Portfolio and growth options', 'Business case and scenario modelling', 'Capital-structure and exit options', 'Board-ready recommendation'],
    deliverables: ['Strategy paper', 'Scenario model', 'Board deck'],
  },
}

export const roleById = (id) => ROLES.find((r) => r.id === id)
