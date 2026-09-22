import { format, currencySymbol } from '../../../utils/format.js'
import { currentRevenue } from '../../../utils/freshness.js'

/** Lens → token classes. Gold is money and recording, verdigris is publishing: the app's fixed meanings. */
export const LENS = {
  money: { title: 'text-accent', avatar: 'bg-accent-soft text-accent border-accent-line', rail: 'bg-accent' },
  recording: { title: 'text-recording', avatar: 'bg-accent-soft text-recording border-accent-line', rail: 'bg-recording' },
  publishing: { title: 'text-publishing', avatar: 'bg-secondary-soft text-publishing border-secondary-line', rail: 'bg-publishing' },
  structure: { title: 'text-ink-1', avatar: 'bg-ground-3 text-ink-2 border-line-2', rail: 'bg-ink-4' },
}

export const money = (v, cur) => format.money(v, { currency: currencySymbol(cur) })

/** The one figure a card can carry: the freshest revenue, else AUM, subscribers, users or catalog size. */
export function cardMetric(e, fin) {
  const r = currentRevenue(e, fin)
  if (r) return { text: `${money(r.value, r.currency)}`, label: r.label.replace(/^Revenue, /, '').replace(/^Revenue /, ''), kind: r.label.startsWith('Revenue') ? 'Rev' : r.label.split(',')[0] }
  const m = e.metrics || {}
  if (m.aum) return { text: money(m.aum), label: 'AUM', kind: 'AUM' }
  if (m.subscribers) return { text: format.count(m.subscribers), label: 'subscribers', kind: 'Subs' }
  if (m.mau) return { text: format.count(m.mau), label: 'monthly users', kind: 'MAU' }
  if (m.catalogSize) return { text: format.count(m.catalogSize), label: 'songs', kind: 'Catalog' }
  return null
}
