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
 * There is deliberately no "stopped disclosing" state. A company that stopped publishing still HAS a figure on
 * record, so coverage counts it as reported; whether that figure is still current is `freshness.js`'s question,
 * and two systems answering it would eventually answer it differently.
 */

/** The states a figure can be in, in the order a reader should meet them. */
export const GAPS = {
  reported: { id: 'reported', label: 'Figure on record', rank: 0 },
  partial: { id: 'partial', label: 'Other figures only', rank: 1 },
  consolidated: { id: 'consolidated', label: 'Reported inside a parent', rank: 2 },
  none: { id: 'none', label: 'Does not publish', rank: 3 },
  unresearched: { id: 'unresearched', label: 'Not researched yet', rank: 4 },
}

export const GAP_ORDER = Object.values(GAPS).sort((a, b) => a.rank - b.rank).map((g) => g.id)

/** Where a figure would come from if the company had one. Used by the company page and the /about counts. */
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
  const m = e?.metrics || {}
  if (hasRevenue(e, fin)) return { state: 'reported', label: GAPS.reported.label, note: '', via: null }

  const up = e?.ownership === 'subsidiary' && getEntity ? consolidatedInto(e, { getEntity, figuresFor }) : null
  if (up) {
    return {
      state: 'consolidated',
      label: GAPS.consolidated.label,
      note: up.readable
        ? `${e.name} does not report separately. Its results are consolidated into ${up.parent.name}, whose figure is on record.`
        : `${e.name} does not report separately. Its results are consolidated into ${up.parent.name}, which does not publish them either.`,
      via: up.parent,
      readable: up.readable,
    }
  }

  if (e?.figures?.state === 'none') {
    return {
      state: 'none',
      label: GAPS.none.label,
      // A claim about another company's behaviour carries the sentence that was established, not a generic one.
      note: e.figures.note,
      via: null,
    }
  }

  const other = [m.aum && 'assets under management', m.subscribers && 'subscribers', m.catalogSize && 'catalog size']
    .filter(Boolean)
  if (other.length) {
    return {
      state: 'partial',
      label: GAPS.partial.label,
      note: `No revenue figure on record for ${e.name}. What is here is ${other.join(' and ')} — scale, not income.`,
      via: null,
    }
  }

  return {
    state: 'unresearched',
    label: GAPS.unresearched.label,
    note: `No figure on record for ${e.name}, and no finding yet on whether it publishes one. This is work not done, not a company that discloses nothing.`,
    via: null,
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
        label: 'Financial figure',
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
