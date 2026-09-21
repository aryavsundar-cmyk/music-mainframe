import { useMemo } from 'react'
import { useNewsStream } from './useNewsStream.js'
import { TRANSACTIONS } from '../data/transactions.js'
import { classifyAll } from '../utils/forces.js'

/**
 * useForces — every deal on record and every item in the live feed, read against the Five Forces.
 *
 * The feed is optional: when the backend is down the tracker still works on deals alone, and `feed.state` lets
 * the page say so. A board that silently lost its live half would understate AI, live and discovery activity,
 * which is where most of the market events are.
 */
export function useForces() {
  const { items, total, state } = useNewsStream({ limit: 300 })
  const today = useMemo(() => new Date(), [])
  const { tagged, unclassified } = useMemo(() => classifyAll({ deals: TRANSACTIONS, events: items }), [items])
  return { tagged, unclassified, today, feed: { state, total, read: items.length } }
}
