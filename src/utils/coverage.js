/**
 * coverage.js — what the canvas knows about a company, and why it does not know the rest.
 *
 * 136 of 188 companies on the canvas carry no financial figure. Until now the app said nothing about that: the
 * Financials section simply did not render, so a company page was silent in exactly the same way whether the
 * company publishes nothing, reports inside a parent, or has never been researched. Three different facts, one
 * blank space — and a blank space reads as "nothing to know".
 *
 * That is the same failure the rest of the app refuses elsewhere. A force tag keeps its evidence; a deal with no
 * price says the total is a floor; a window reaching past the archive says so. A missing figure has to say which
 * kind of missing it is.
 *
 * **The reasons, and where each one comes from:**
 *
 * - `consolidated` — DERIVED, never declared. A subsidiary's results are reported inside its parent's; that is a
 *   fact about corporate structure the canvas already holds in `parentId`. The chain is walked past any ancestor
 *   that is itself silent, so the reader is sent to Sony Group rather than to Sony Music Entertainment's equally
 *   blank page — and where NO ancestor publishes, the sentence says that too instead of pretending to be a lead.
 * - `none` — DECLARED, and it needs a `figures.note` saying so. This is a claim about another company's
 *   behaviour, so it may not be guessed from ownership: plenty of private companies file accounts, and several
 *   member-owned societies publish more than the listed majors do.
 * - `partial` — DERIVED. The record holds a figure that is not revenue (catalog size, subscribers, AUM). Worth
 *   saying, because the page is not empty and the reader should know what the number is and is not.
 * - `unresearched` — the DEFAULT, and deliberately the honest one. Nobody has looked. It is a prompt to do work,
 *   never a claim that there is nothing to find, and it is counted on `/about` rather than quietly rounded away.
 *
 * Nothing here infers "does not publish" from "is private". That inference is exactly the kind of plausible
 * guess this app exists not to make.
 *
 * Sprint 37 added the question itself. `_schema.js` declares which figure measures each kind of company, and
 * `partial` now means "the record holds a scale figure, but not the one that measures a company of this kind" —
 * so Blackstone, which files revenue but publishes no AUM here, reads as an open gap that names what to go and
 * get. This is not a route for turning "we do not know" into "not applicable": a sponsor with no AUM is still an
 * open gap, and the only thing the model changed is which figure closes it.
 *
 * There is deliberately no "stopped disclosing" state. A company that stopped publishing still HAS a figure on
 * record, so coverage counts it as reported; whether that figure is still current is `freshness.js`'s question,
 * and two systems answering it would eventually answer it differently.
 */

import { figuresFor as figuresForType, FIGURE_LABEL, EXPECTED_FIGURE, DEFAULT_FIGURE } from '../data/entities/_schema.js'

/** Every figure the canvas can hold about scale, in the order a checklist should mention them. */
const ALL_FIGURES = [...new Set([...DEFAULT_FIGURE, ...Object.values(EXPECTED_FIGURE).flat()])]

/**
 * The figure a company of this kind is measured by, and whether the record holds it. Sprint 37: the canvas used to
 * ask every company for revenue, which for forty money-side actors is fee income rather than scale.
 */
const held = (e, fin, field) => {
  if (field === 'revenue') return !!(fin?.metrics?.revenue || e?.metrics?.revenue)
  return !!e?.metrics?.[field]
}

/** The states a figure can be in, in the order a reader should meet them. */
export const GAPS = {
  reported: { id: 'reported', label: 'Figure on record', rank: 0 },
  partial: { id: 'partial', label: 'Other figures only', rank: 1 },
  consolidated: { id: 'consolidated', label: 'Reported inside a parent', rank: 2 },
  none: { id: 'none', label: 'Does not publish', rank: 3 },
  unresearched: { id: 'unresearched', label: 'Not researched yet', rank: 4 },
}

export const GAP_ORDER = Object.values(GAPS).sort((a, b) => a.rank - b.rank).map((g) => g.id)

const capitalise = (t) => t.charAt(0).toUpperCase() + t.slice(1)

/** Whether the record holds any of the figures that measure this kind of company. */
const hasExpected = (e, fin) => figuresForType(e?.type).some((f) => held(e, fin, f))

/** Whether it holds a revenue figure specifically — still what a parent has to have for a link to be worth following. */
const hasRevenue = (e, fin) => !!(fin?.metrics?.revenue || e?.metrics?.revenue)

/**
 * The nearest ancestor whose results a subsidiary's are reported inside — and which has a figure to go and read.
 *
 * Walking the chain matters: The Orchard reports inside Sony Music Entertainment, which reports inside Sony Music
 * Group, which reports inside Sony Group. Naming the immediate parent would send the reader to another blank page.
 * `getEntity` and `figuresFor` are passed in so this file never imports the canvas and stays testable.
 */
function consolidatedInto(e, { getEntity, figuresFor }) {
  const seen = new Set([e.id])
  let cur = e
  let root = null
  while (cur?.parentId && !seen.has(cur.parentId)) {
    const parent = getEntity(cur.parentId)
    if (!parent) break
    seen.add(parent.id)
    root = parent
    if (hasRevenue(parent, figuresFor(parent.id))) return { parent, readable: true }
    cur = parent
  }
  // No ancestor publishes either — AEG Presents reports inside AEG, which reports inside Anschutz, which files
  // nothing. That is still a better answer than "not researched": it says where the figure would be if it existed.
  return root ? { parent: root, readable: false } : null
}

/**
 * Why this company has no revenue figure — or that it has one.
 *
 * Returns `{ state, label, note, via }`, where `via` is the ancestor a consolidated company's results sit inside.
 * `note` is the sentence the page shows; it is written here so the same words appear on the company page, in the
 * entity table's facet and in the export.
 */
export function figureGap(e, fin, { getEntity, figuresFor = () => null } = {}) {
  const expected = figuresForType(e?.type)
  const wanted = expected.map((f) => FIGURE_LABEL[f] || f).join(' or ')
  if (hasExpected(e, fin)) return { state: 'reported', label: GAPS.reported.label, note: '', via: null, expected }

  // Consolidation answers a REVENUE question and only a revenue question. A sponsor's AUM is its own regulatory
  // disclosure, not a line in a parent's consolidated accounts — so wiring PIMCO to Allianz must not quietly mark
  // PIMCO's missing AUM as answered. That would be the same laundering Sprint 37 closed, arriving sideways.
  //
  // The gate is the PARENT LINK, not the ownership label. `ownership` says who owns a company; `parentId` says
  // where it reports, and the two disagree more often than they look like they should — AEG is filed as "private"
  // and reports into Anschutz, Superstruct is "pe-backed" and reports into KKR. Keying off the label left both of
  // them reading as "nobody has looked". A separately listed subsidiary like Tencent Music is unaffected, because
  // a company that files its own figures is answered before this is reached.
  const consolidates = expected.includes('revenue')
  const up = consolidates && e?.parentId && getEntity ? consolidatedInto(e, { getEntity, figuresFor }) : null
  if (up) {
    return {
      state: 'consolidated',
      label: GAPS.consolidated.label,
      note: up.readable
        ? `${e.name} does not report separately. Its results are consolidated into ${up.parent.name}, whose figure is on record.`
        : `${e.name} does not report separately. Its results are consolidated into ${up.parent.name}, which does not publish them either.`,
      via: up.parent,
      readable: up.readable,
      expected,
    }
  }

  // A reporting parent that is not a music company and so is not on this canvas. The question still has an
  // answer — this company does not report separately — but there is no page to send the reader to.
  if (consolidates && e?.parentName) {
    return {
      state: 'consolidated',
      label: GAPS.consolidated.label,
      note: `${e.name} does not report separately. Its results are consolidated into ${e.parentName}, which is not on this canvas — it is not a music company.`,
      via: null,
      readable: false,
      expected,
    }
  }

  if (e?.figures?.state === 'none') {
    return {
      state: 'none',
      label: GAPS.none.label,
      // A claim about another company's behaviour carries the sentence that was established, not a generic one.
      note: e.figures.note,
      via: null,
      expected,
    }
  }

  // Something is here, but not the figure that measures this kind of company — which is worth saying precisely,
  // because it tells the reader exactly which number to go and find.
  const other = ALL_FIGURES.filter((f) => !expected.includes(f) && held(e, fin, f)).map((f) => FIGURE_LABEL[f] || f)
  if (other.length) {
    return {
      state: 'partial',
      label: GAPS.partial.label,
      note: `${e.name} has ${other.join(' and ')} on record, but not ${wanted} — which is what measures a company of this kind.`,
      via: null,
      expected,
    }
  }

  return {
    state: 'unresearched',
    label: GAPS.unresearched.label,
    note: `No ${wanted} on record for ${e.name}, and no finding yet on whether it publishes ${expected.length > 1 ? 'either' : 'one'}. This is work not done, not a company that discloses nothing.`,
    via: null,
    expected,
  }
}

/**
 * Everything the canvas holds about one company, as a checklist.
 *
 * This is deliberately about the RECORD rather than the market: "3 deals on record" means this app files three,
 * not that the company did three. The company page prints it so a reader can see the shape of what they are
 * working with before they start quoting from it.
 */
export function coverageOf(e, { fin, deals = 0, links = 0, gap } = {}) {
  const sources = e?.sources?.length || 0
  const filed = !!fin?.metrics
  // Every US-listed company on the canvas has its filings read from EDGAR whether or not structured figures came
  // back; anything else genuinely has none to read, which is a fact about the company rather than about the app.
  const listed = /NASDAQ|NYSE/i.test(e?.ticker || '')
  return {
    gap,
    held: [
      {
        id: 'figure',
        // Named, not generic: this row is the whole point on a page whose figure is AUM rather than revenue.
        label: capitalise((gap?.expected || DEFAULT_FIGURE).map((f) => FIGURE_LABEL[f] || f).join(' or ')),
        has: gap?.state === 'reported',
        detail: gap?.state === 'reported'
          ? (filed ? 'read from EDGAR, refreshed daily' : 'entered by hand from a cited source')
          : gap?.label,
      },
      {
        id: 'filings',
        label: 'SEC filings',
        has: filed || listed,
        detail: filed ? 'read from EDGAR every six hours' : listed ? 'US-listed, so EDGAR is read for it' : 'not an SEC filer',
      },
      { id: 'deals', label: 'Transactions', has: deals > 0, detail: deals > 0 ? `${deals} on record` : 'none on record' },
      { id: 'links', label: 'Connections', has: links > 0, detail: links > 0 ? `${links} on record` : 'none on record' },
      { id: 'sources', label: 'Sources', has: sources > 0, detail: sources > 0 ? `${sources} cited` : 'none cited' },
    ],
  }
}

/**
 * How much of the canvas the app can actually say something about. Measured, never asserted — `/about` prints
 * these counts and `test:coverage` recomputes them, so the claim cannot drift from the data.
 */
export function canvasCoverage(entities, { getEntity, figuresFor }) {
  const byState = Object.fromEntries(GAP_ORDER.map((id) => [id, 0]))
  for (const e of entities) byState[figureGap(e, figuresFor(e.id), { getEntity, figuresFor }).state]++
  const total = entities.length
  const known = total - byState.unresearched
  return { total, byState, known, pct: total ? Math.round((known / total) * 100) : 0 }
}
