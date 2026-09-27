import { FIGURE_LABEL } from '../data/entities/_schema.js'

/**
 * researchQueue.js — which gap to close first.
 *
 * Sprint 36 made the canvas honest about what it does not know, and the honest answer was 87 companies. An
 * admission that large is not actionable: it reads as "this app is incomplete" rather than "here is the next
 * hour's work". The same problem the availability score solves on the market pages — a long list of things that
 * might matter is worth less than a short list ranked by why.
 *
 * So each open gap is scored by what closing it would BUY, and every point carries the reason that earned it. The
 * reasons are all facts the canvas already holds; nothing here is a guess about how easy the research would be.
 *
 * **This is a prompt to do work, never a claim about the company.** A firm high in this queue is not more secretive
 * or more important than one below it; it is one whose silence costs this app more. That distinction is the same
 * one `data/limits.js` draws for every other score in the app, and it is stated on screen.
 */

/** What each signal is worth, and why. Weights are declared here so a ranking can be argued with. */
export const SIGNALS = {
  blocks: {
    points: 14,
    why: (n) => `${n} ${n === 1 ? 'company reports' : 'companies report'} inside it, so ${n === 1 ? 'that page is' : 'those pages are'} blank until this one is answered`,
  },
  deals: {
    points: 8,
    why: (n) => `party to ${n} ${n === 1 ? 'transaction' : 'transactions'} on record, and the app cannot say how big the buyer is`,
  },
  tier1: { points: 10, why: () => 'tier 1 — global scale, so the gap shows on every view it appears in' },
  tier2: { points: 4, why: () => 'tier 2 — a regional leader' },
  backs: {
    points: 5,
    why: (n) => `backs ${n} ${n === 1 ? 'company' : 'companies'} on the canvas`,
  },
  parent: {
    points: 3,
    why: (n) => `parent of ${n} ${n === 1 ? 'company' : 'companies'} on the canvas`,
  },
  watched: { points: 20, why: () => 'on your watchlist' },
}

/** The bands, so a long list reads as three short ones. */
export const BANDS = [
  { id: 'first', label: 'Answer first', min: 20 },
  { id: 'next', label: 'Worth doing next', min: 8 },
  { id: 'later', label: 'Lower cost to leave open', min: 0 },
]

export const bandOf = (score) => BANDS.find((b) => score >= b.min) || BANDS[BANDS.length - 1]

/**
 * One row of the queue.
 *
 * `blocks` is the signal that only exists because of Sprint 36's consolidation walk: when a subsidiary's results
 * are reported inside a parent that publishes nothing, the subsidiary's page is blank too. Researching Anschutz
 * once answers AEG and AEG Presents as well, and nothing else in the canvas makes that visible.
 */
export function scoreGap(e, { gap, deals = 0, children = 0, backs = 0, blocks = 0, watched = false }) {
  const reasons = []
  const add = (key, n) => {
    const s = SIGNALS[key]
    reasons.push({ key, points: s.points, text: s.why(n) })
  }
  if (watched) add('watched')
  if (blocks) add('blocks', blocks)
  if (deals) add('deals', deals)
  if (e.tier === 1) add('tier1')
  else if (e.tier === 2) add('tier2')
  if (backs) add('backs', backs)
  if (children) add('parent', children)
  const score = reasons.reduce((sum, r) => sum + r.points, 0)
  return {
    id: e.id,
    name: e.name,
    type: e.type,
    tier: e.tier,
    state: gap.state,
    // What to actually go and find, in the words the rest of the app uses.
    wanted: (gap.expected || ['revenue']).map((f) => FIGURE_LABEL[f] || f).join(' or '),
    score,
    band: bandOf(score).id,
    reasons,
  }
}

/**
 * The open gaps, worst-cost first.
 *
 * `partial` counts as open: a sponsor whose revenue is on record but whose AUM is not still cannot be compared
 * with the other thirty-nine. `consolidated` and `none` are closed — the question has an answer, and the answer is
 * that this company does not have its own figure.
 */
export const OPEN = ['unresearched', 'partial']

export function buildQueue(entities, ctx) {
  const rows = []
  for (const e of entities) {
    const gap = ctx.gapOf(e)
    if (!OPEN.includes(gap.state)) continue
    rows.push(scoreGap(e, {
      gap,
      deals: ctx.dealsOf(e.id),
      children: ctx.childrenOf(e.id),
      backs: ctx.backsOf(e.id),
      blocks: ctx.blocksOf(e.id),
      watched: ctx.isWatched?.(e.id) || false,
    }))
  }
  // Deterministic: score, then the count of reasons, then name — never insertion order.
  return rows.sort((a, b) => b.score - a.score || b.reasons.length - a.reasons.length || a.name.localeCompare(b.name))
}

/**
 * How many companies each silent parent is blocking.
 *
 * Only counts the ones whose parent chain ends in a company that publishes nothing — a subsidiary consolidated
 * into a parent that DOES report is already answered, and researching that parent buys nothing.
 */
export function blockedBy(entities, gapOf) {
  const counts = new Map()
  for (const e of entities) {
    const g = gapOf(e)
    if (g.state !== 'consolidated' || g.readable || !g.via) continue
    counts.set(g.via.id, (counts.get(g.via.id) || 0) + 1)
  }
  return counts
}

/** The queue in one line, for the page that shows it. */
export function queueSummary(rows) {
  const byBand = Object.fromEntries(BANDS.map((b) => [b.id, rows.filter((r) => r.band === b.id).length]))
  return { total: rows.length, byBand, blocked: rows.reduce((sum, r) => sum + (r.reasons.find((x) => x.key === 'blocks') ? 1 : 0), 0) }
}
