/**
 * Numeric formatters — one per treatment in tokens.numeric.
 * All return strings; all accept null/undefined and return '—' (never 'null', never NaN).
 */
import { toUsd } from '../data/fx.js'

const DASH = '—'
export const CURRENCY_SYMBOL = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', KRW: '₩', CAD: 'C$', AUD: 'A$', CNY: 'CN¥', INR: '₹' }
export const currencySymbol = (code) => CURRENCY_SYMBOL[code] || (code ? code + ' ' : '$')
const isNum = (n) => typeof n === 'number' && Number.isFinite(n)

function compact(n, digits = 1) {
  const abs = Math.abs(n)
  const f = (v, s) => {
    const r = v.toFixed(digits)
    return (r.endsWith('.0') ? r.slice(0, -2) : r) + s
  }
  if (abs >= 1e12) return f(n / 1e12, 'T')
  if (abs >= 1e9) return f(n / 1e9, 'B')
  if (abs >= 1e6) return f(n / 1e6, 'M')
  if (abs >= 1e4) return f(n / 1e3, 'K')
  return n.toLocaleString('en-US')
}

/** money: $1.8B · $300M · $62K. Pass { full: true } for $1,800,000,000. */
export function formatMoney(n, { currency = '$', full = false, digits = 1 } = {}) {
  if (!isNum(n)) return DASH
  const sign = n < 0 ? '−' : ''
  const abs = Math.abs(n)
  return sign + currency + (full ? abs.toLocaleString('en-US') : compact(abs, digits))
}

/**
 * money, in one currency: US dollars first, with the reported figure in parentheses — `$415M (£315.3M)`.
 *
 * This is the formatter every figure in the application goes through, because the alternative is what this
 * replaced: a canvas showing £315.3M beside ¥2.1T beside ₩333.6T, each exactly what the company reported and
 * collectively impossible to read.
 *
 * Two things it will not do. It never drops the reported figure — what the company published is always on the
 * page, and `test:fx` fails if a converted number is ever shown alone. And it never invents a rate: a currency
 * missing from the table is shown as reported, by itself, rather than converted at a guess.
 *
 * `native: false` asks for the dollar figure alone, for the few places with no room for both — a bar label, an
 * axis. Those callers own the job of saying elsewhere that the figure is converted.
 */
export function formatMoneyUsd(n, code = 'USD', { full = false, digits = 1, native = true } = {}) {
  if (!isNum(n)) return DASH
  const currency = String(code || 'USD').toUpperCase()
  const usd = toUsd(n, currency)
  // An unknown currency is reported as it stands. Converting it at 1:1 would turn a missing rate into a wrong
  // number, which is worse than an unconverted one.
  if (usd == null) return formatMoney(n, { currency: currencySymbol(currency), full, digits })
  const dollars = formatMoney(usd, { currency: '$', full, digits })
  if (currency === 'USD' || !native) return dollars
  return `${dollars} (${formatMoney(n, { currency: currencySymbol(currency), full, digits })})`
}

/** count: 62K · 1.2M · 4,300. Pass { full: true } for 1,200,000. */
export function formatCount(n, { full = false, digits = 1 } = {}) {
  if (!isNum(n)) return DASH
  return full ? n.toLocaleString('en-US') : compact(n, digits)
}

/** pct: 5.4% — input is 0–100 (not 0–1). */
export function formatPct(n, { digits = 1 } = {}) {
  if (!isNum(n)) return DASH
  return n.toFixed(digits) + '%'
}

/** rate: per-stream payouts ($0.0032) and coupons (5.40%). */
export function formatRate(n, { kind = 'currency', currency = '$', digits = kind === 'currency' ? 4 : 2 } = {}) {
  if (!isNum(n)) return DASH
  return kind === 'currency' ? currency + n.toFixed(digits) : n.toFixed(digits) + '%'
}

/** date: 2024-03 → "Mar 2024"; 2024-03-14 → "14 Mar 2024". */
export function formatDate(iso) {
  if (!iso) return DASH
  const [y, m, d] = String(iso).split('-').map(Number)
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][(m || 1) - 1]
  return d ? `${d} ${month} ${y}` : m ? `${month} ${y}` : String(y)
}

export const format = { money: formatMoney, usd: formatMoneyUsd, count: formatCount, pct: formatPct, rate: formatRate, date: formatDate }
