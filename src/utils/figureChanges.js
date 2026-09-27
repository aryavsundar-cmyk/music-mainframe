/**
 * figureChanges.js — what moved between two refreshes of the SEC file.
 *
 * The daily job is the only thing that knows a figure changed, so the job records it. Comparing yesterday's file
 * with today's in the browser would mean shipping both; reading it out of git history would mean guessing at
 * what a commit meant. Here, one refresh writes one line per figure that actually moved, with the filing that
 * moved it.
 *
 * Only two things count as a change: a NEWER PERIOD arriving (the quarter to June replaces the quarter to March)
 * and a RESTATEMENT (the same period, refiled with a different value). A figure appearing for the first time is
 * not a change — the first refresh after a new concept is added would otherwise report every company at once.
 */

/** The parts of a metric a change can happen to: the annual figure, the quarter, or a point-in-time balance. */
const SLOTS = ['annual', 'quarter', 'latest']

const at = (f) => (f ? { value: f.value, currency: f.currency, end: f.end, form: f.form, filed: f.filed, accn: f.accn } : null)

/**
 * Every change between one company's previous record and its new one. `metric` is the concept key (revenue,
 * operatingCashFlow…), `slot` which figure inside it, and `kind` why it changed.
 */
export function diffCompany(before, after, { entityId, now = new Date().toISOString() } = {}) {
  const out = []
  if (!after?.metrics) return out
  // A company that was not in the file before has no history to compare against: its figures are not "changes".
  if (!before?.metrics) return out
  for (const [metric, m] of Object.entries(after.metrics)) {
    const was = before.metrics[metric]
    if (!was) continue
    for (const slot of SLOTS) {
      const a = m[slot]
      const b = was[slot]
      if (!a || !b) continue
      if (a.end > b.end) out.push({ at: now, entityId, metric, slot, kind: 'new-period', from: at(b), to: at(a) })
      else if (a.end === b.end && a.value !== b.value) out.push({ at: now, entityId, metric, slot, kind: 'restated', from: at(b), to: at(a) })
    }
  }
  return out
}

/** Every change across a refresh, newest company first is not meaningful — they are sorted by company id. */
export function diffAll(before = {}, after = {}, { now = new Date().toISOString() } = {}) {
  return Object.keys(after).sort().flatMap((id) => diffCompany(before[id], after[id], { entityId: id, now }))
}

/** How many entries the log keeps. Old entries fall off the end; the file states what it no longer holds. */
export const MAX_ENTRIES = 4000

/**
 * The log after a refresh: new entries first, capped. `startedAt` is the day the log began, so a reader can tell
 * "nothing changed" from "nothing was being watched yet".
 */
export function appendChanges(log, entries, { now = new Date().toISOString() } = {}) {
  const startedAt = log?.startedAt || now
  const kept = [...entries, ...(log?.entries || [])].slice(0, MAX_ENTRIES)
  return {
    startedAt,
    updatedAt: entries.length ? now : log?.updatedAt || now,
    source: 'Written by scripts/refresh-financials.mjs when a figure changes between refreshes.',
    entries: kept,
  }
}
