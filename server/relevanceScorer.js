/**
 * relevanceScorer.js — tags each item with entities[] (ids), types[], topics[], and a 0–100 score.
 * Signals come from signals.js (entities generated from the data file; topics hand-tuned).
 */
import { ENTITY_SIGNALS, TOPIC_SIGNALS, TOPIC_MATCHERS } from './signals.js'

function recency(publishedAt) {
  const h = (Date.now() - new Date(publishedAt).getTime()) / 36e5
  if (h < 6) return 15; if (h < 24) return 10; if (h < 72) return 5; if (h < 168) return 2; return 0
}

export function scoreItem(item) {
  const raw = `${item.title} ${item.summary}`
  const lower = raw.toLowerCase()
  const entities = []; const types = new Set(); let score = 0
  for (const sig of ENTITY_SIGNALS) {
    const hit = sig.patterns.some((p) => p.re.test(p.caps ? raw : lower))
    if (hit) { entities.push(sig.id); types.add(sig.type); score += sig.weight }
  }
  for (const id of item.seedEntities || []) if (!entities.includes(id)) { entities.push(id); score += 10 }
  const topics = []
  for (const [key, t] of Object.entries(TOPIC_SIGNALS)) {
    if (TOPIC_MATCHERS[key].some((re) => re.test(lower))) { topics.push(key); score += t.weight }
  }
  if (entities.length >= 2) score += 8
  if (item.sourceId === 'sec_edgar') score += 5
  score = Math.min(100, score + recency(item.publishedAt))
  return { ...item, entities, types: [...types], topics, score, priority: score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low' }
}

export const scoreAll = (items) => items.map(scoreItem).sort((a, b) => b.score - a.score || b.publishedAt.localeCompare(a.publishedAt))
