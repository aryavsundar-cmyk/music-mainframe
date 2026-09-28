/**
 * waterfall.js — a scenario resolved into where the dollar lands.
 *
 * `data/scenarios.js` declares the SHAPE of a split and points at the rates; this file resolves those pointers
 * against `data/flows.js` and works out what each party ends up with. Keeping the two apart is what stops a rate
 * being written down twice: a scenario never holds a number, so a rate can only ever change in one place.
 *
 * Four rules, each of which exists because the alternative would be a chart that states something false:
 *
 * 1. **A branch's children sum to the branch.** Exactly one child may be `rest`, and it takes the remainder. A
 *    tree that does not add up is a defect, not a rounding question — `problems` records it and `test:flows`
 *    fails on it. Nothing is normalised to make a picture look tidy.
 *
 * 2. **A range stays a range.** Where the published figure is "15–25%", the row carries `low` and `high` and the
 *    renderer draws a band. A midpoint presented as a rate is the single easiest way to turn sourced work into a
 *    confident fiction, so `value` is only ever the figure the record actually holds.
 *
 * 3. **Unknown shares do not propagate as numbers.** A step marked `basis: 'unknown'` has no share of the dollar,
 *    and neither do its descendants: `share` is null and `local` — the proportion of that branch — carries the
 *    part that IS known. Multiplying a known split by an unknown base and printing the product would be inventing
 *    the base.
 *
 * 4. **A missing rate is loud, not silent.** If a scenario points at an `econ` entry that `flows.js` no longer
 *    has — renamed, edited, deleted — the row resolves to nothing and the address is pushed onto `problems`. The
 *    page still renders; the test suite does not pass.
 */
import { getFlow, getFlowNode } from '../data/flows.js'
import { getScenario, SCENARIO_IDS } from '../data/scenarios.js'

/** Floating-point slack when checking that a branch's children add up. Percentages, so this is a hair. */
const EPSILON = 0.001

/**
 * The published economics a scenario step points at: the value, the range if one is published, and whether the
 * record flags it as unverified. Returns null when the address no longer resolves, which the caller must record.
 */
export function resolveRate(ref) {
  if (!ref) return null
  const node = getFlowNode(ref.flow, ref.node)
  const entry = node?.econ?.find((e) => e.label === ref.label)
  if (!entry || typeof entry.value !== 'number') return null
  return {
    value: entry.value,
    low: typeof entry.low === 'number' ? entry.low : null,
    high: typeof entry.high === 'number' ? entry.high : null,
    label: entry.label,
    note: entry.note || '',
    verify: !!entry.verify,
    stage: node.label,
    flow: ref.flow,
    // A rate's source is the source of the flow that publishes it. Stage economics are cited at flow level in
    // flows.js, which is where a reader is sent to check them.
    sources: getFlow(ref.flow)?.sources || [],
  }
}

/**
 * Resolve one scenario into flat rows, depth-first, in the order money moves.
 *
 * Each row: `{ id, label, sub, depth, share, low, high, local, localLow, localHigh, state, why, rate, node,
 * tone, note, rest, basis }`. `share` is the proportion of the whole unit (0–1) or null when it cannot be known;
 * `local` is the proportion of the row's own parent, which is always known where a rate resolved.
 */
export function buildWaterfall(scenarioId) {
  const scenario = getScenario(scenarioId)
  if (!scenario) return null
  const rows = []
  const problems = []

  // `rel` says whether shares at this level are proportions of the DOLLAR or of a branch whose own share of the
  // dollar is not published. It is set once, when an unknown-basis branch is entered, and never unset: everything
  // below such a branch is relative to it, however many known splits sit in between.
  const walk = (children, depth, parentShare, parentKnown, rel) => {
    // Resolve every child's rate first: the `rest` child cannot be worked out until its siblings are.
    const resolved = children.map((step) => {
      const rate = step.rate ? resolveRate(step.rate) : null
      if (step.rate && !rate) problems.push(`${scenarioId}/${step.id}: no published rate at ${step.rate.flow}/${step.rate.node} → "${step.rate.label}"`)
      return { step, rate }
    })
    const unknown = (st) => st.state === 'undisclosed' || st.basis === 'unknown'
    const taken = resolved.reduce((sum, r) => sum + (r.step.rest || unknown(r.step) ? 0 : (r.rate?.value ?? 0)), 0)
    const restCount = resolved.filter((r) => r.step.rest).length
    if (restCount > 1) problems.push(`${scenarioId}: ${restCount} steps claim the remainder of the same branch; at most one may`)
    const checkable = resolved.length > 0 && resolved.every((r) => r.step.rest || r.rate)
    if (checkable && restCount === 0 && Math.abs(taken - 100) > EPSILON) {
      problems.push(`${scenarioId}: a branch's children come to ${taken}%, not 100% — a split that does not add up is a defect, not a rounding question`)
    }
    if (checkable && taken > 100 + EPSILON) problems.push(`${scenarioId}: children take ${taken}% of their branch, leaving the remainder negative`)

    for (const { step, rate } of resolved) {
      // A branch holding an undisclosed sibling cannot also hold a meaningful remainder: the remainder is
      // whatever is left of an unknown subtraction, which is unknown.
      const siblingUnknown = resolved.some((r) => r.step !== step && unknown(r.step))
      const local = step.rest
        ? (siblingUnknown ? null : Math.max(0, 100 - taken))
        : (unknown(step) ? null : rate?.value ?? null)
      const localLow = step.rest || !rate ? null : rate.low
      const localHigh = step.rest || !rate ? null : rate.high
      const known = parentKnown && local != null
      const share = known ? (parentShare * local) / 100 : null
      const band = (b) => (known && b != null ? (parentShare * b) / 100 : null)

      rows.push({
        id: step.id,
        label: step.label,
        sub: step.sub || '',
        depth,
        share,
        low: band(localLow),
        high: band(localHigh),
        local,
        localLow,
        localHigh,
        relative: rel,
        leaf: !step.children?.length,
        // Three different kinds of "no number", kept apart because they mean different things to a reader:
        // nobody publishes it; the split inside is published but the base is not; it is simply reported.
        state: step.state || (step.basis === 'unknown' ? 'split-unknown' : (local == null && !step.rest ? 'undisclosed' : 'reported')),
        why: step.why || '',
        note: step.note || '',
        rest: !!step.rest,
        tone: step.tone || '',
        side: step.side || '',
        rate,
        node: step.node || null,
        tail: step.tail || null,
      })

      if (step.children?.length) {
        // An unknown-basis branch restarts the arithmetic at 100% of ITSELF, and everything under it is flagged
        // relative. Multiplying a known split by an unpublished base and printing the product would be inventing
        // the base, which is the one thing this page must never do.
        const opens = step.basis === 'unknown'
        walk(step.children, depth + 1, opens ? 1 : (share ?? 0), opens ? true : known, rel || opens)
      }
    }
  }

  walk(scenario.tree.children, 0, 1, true, false)

  const leaves = rows.filter((r) => r.leaf)
  return {
    scenario,
    rows,
    /** The ends of the tree: who actually keeps the money, for the comparison table. */
    leaves,
    /** Every step the record cannot put a number on, so the page can state the non-disclosure as a finding. */
    undisclosed: rows.filter((r) => r.state === 'undisclosed'),
    /** Rates on the page that the record flags as unverified, so the caveat can count them rather than assert. */
    unverified: rows.filter((r) => r.rate?.verify),
    problems,
    sources: scenario.sources || [],
  }
}

/** Every scenario resolved, for the comparison table and for the tests. */
export const allWaterfalls = () => SCENARIO_IDS.map((id) => buildWaterfall(id))

/**
 * Where a dollar lands on each route, as one row per scenario — the artifact this page exists to produce.
 * A side is summed from the LEAVES only, so a parent and its children are never double-counted.
 */
export function landingTable() {
  return allWaterfalls().map((w) => {
    // Summed from the steps that DECLARE a side, which are the top of each branch — so a parent and its children
    // are never added together, and a route that does not touch a domain reports null rather than zero.
    const sum = (side) => {
      const hit = w.rows.filter((r) => r.side === side && !r.relative && r.share != null)
      return hit.length ? hit.reduce((a, r) => a + r.share, 0) : null
    }
    return {
      id: w.scenario.id,
      label: w.scenario.label,
      unit: w.scenario.unit,
      recording: sum('recording'),
      publishing: sum('publishing'),
      other: sum('other'),
      // Declared, never inferred from a null: "pays nothing" and "no figure on record" look identical in a table
      // of dashes and are completely different claims.
      paysNothing: w.scenario.paysNothing || {},
      undisclosed: w.undisclosed.length,
      domains: w.scenario.domains,
    }
  })
}
