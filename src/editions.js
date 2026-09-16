/**
 * editions.js — which build this is, and therefore what exists in it.
 *
 * `full` is the personal build: everything. `work` is the shareable build: public-sourced records and the modules
 * built on them, with the authored material excluded. Exclusion happens at BUILD time in vite.config.js, where the
 * private modules are aliased to stubs — hiding a route at runtime would still ship its data in the bundle.
 * scripts/test-edition.mjs builds the work bundle and greps it for private strings, so this file is a declaration
 * of intent and that test is the proof.
 */
const raw = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MM_EDITION) || (typeof process !== 'undefined' && process.env?.MM_EDITION) || 'full'
export const EDITION = raw === 'work' ? 'work' : 'full'
export const IS_WORK = EDITION === 'work'

export const EDITIONS = {
  full: {
    id: 'full',
    label: 'Full edition',
    groups: ['Canvas', 'Money', 'Rights', 'Live', 'Market', 'Pipeline', 'Overlay', 'Reference', 'Academy'],
    features: { consulting: true, deliverables: true, lab: true, glossary: true, outreach: true, hubLinks: true, rateCard: true, records: true },
    exports: ['docx', 'pptx', 'xlsx', 'txt', 'md', 'gamma-presentation', 'gamma-document'],
  },
  work: {
    id: 'work',
    label: 'Work edition',
    groups: ['Canvas', 'Money', 'Rights', 'Live', 'Market', 'Pipeline', 'Reference'],
    // outreach drafts stay out: the personas and hooks are authored judgement, not public record.
    features: { consulting: false, deliverables: false, lab: false, glossary: true, outreach: false, hubLinks: false, rateCard: false, records: true },
    exports: ['docx', 'pptx', 'xlsx', 'txt'],
  },
}

export const CURRENT = EDITIONS[EDITION]
export const EXPORT_FORMATS = CURRENT.exports
export const has = (feature) => !!CURRENT.features[feature]
export const showsGroup = (group) => CURRENT.groups.includes(group)

/** What the work edition says about itself, on screen and in every export. */
export const FRAMING = {
  title: 'Mainframe · Music — research edition',
  what: 'An independent research tool that organises public information about the music industry: companies, transactions, societies, platforms, filings and trade press.',
  notProduct: 'It is not a firm system of record, not a client deliverable, and nothing in it is advice.',
  sources: 'Every record carries its sources and the date it was checked. Scores are computed from those records and show their reasoning.',
  data: 'It holds no client data, no contact records and no personal data. Anything you type — status, notes, outcomes — stays in your own browser.',
}
