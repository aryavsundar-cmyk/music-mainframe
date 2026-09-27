/**
 * fx.js — one dated, sourced rate table, so every figure in this application can be read in one currency.
 *
 * Until now the canvas showed each company in whatever currency it reports: £315.3M beside ¥2.1T beside ₩333.6T.
 * Every one of those is exactly what the company said, and together they are unreadable — nobody compares a
 * trillion won to a billion euro by eye. So money is now shown in **US dollars first, with the reported figure in
 * parentheses**: `$415M (£315.3M)`.
 *
 * That replaces an older rule — "never convert" — with a stricter one rather than a looser one. The old rule
 * protected against SILENT conversion, and it was right to. What replaces it:
 *
 * - **The reported figure never disappears.** It follows every converted figure in parentheses. What the company
 *   actually published is always on the page, and `test:fx` fails if a converted figure is ever shown alone.
 * - **The rate is dated and sourced.** Not "approximately", not a rounded guess: the Federal Reserve's H.10
 *   release for a stated day, linked from `/about`.
 * - **One rate for every period.** A 2021 figure and a 2025 figure are both converted at the same day's rate, so
 *   the dollar figures are comparable WITH EACH OTHER — which is the entire point. It also means a converted
 *   historical figure is not what that money was worth at the time, and the application says so rather than
 *   letting anyone assume otherwise.
 *
 * When the rates are refreshed, change all three of `FX_ASOF`, `FX_SOURCE` and `USD_PER` together. A rate table
 * whose date does not match its numbers is worse than no table.
 */

/** The day these rates are for. Shown wherever a converted figure is explained. */
export const FX_ASOF = '2026-09-18'

export const FX_SOURCE = {
  label: 'Federal Reserve H.10 — foreign exchange rates, 18 September 2026',
  url: 'https://www.federalreserve.gov/releases/h10/current/',
}

/**
 * US dollars per one unit of each currency.
 *
 * The H.10 quotes most currencies as units per dollar and a few (euro, sterling, Australian dollar) as dollars
 * per unit. Everything is normalised to dollars-per-unit here so there is exactly one direction to reason about,
 * and the comment on each line records what the release actually printed.
 */
export const USD_PER = {
  USD: 1,
  EUR: 1.1464, // H.10: 1.1464 USD per EUR
  GBP: 1.3372, // H.10: 1.3372 USD per GBP
  AUD: 0.7111, // H.10: 0.7111 USD per AUD
  JPY: 1 / 156.87, // H.10: 156.87 JPY per USD
  KRW: 1 / 1387.97, // H.10: 1387.97 KRW per USD
  INR: 1 / 95.87, // H.10: 95.87 INR per USD
  CAD: 1 / 1.4008, // H.10: 1.4008 CAD per USD
  CNY: 1 / 6.6975, // H.10: 6.6975 CNY per USD
  CHF: 1 / 0.8242, // H.10: 0.8242 CHF per USD
  SEK: 1 / 9.8628, // H.10: 9.8628 SEK per USD
}

export const CURRENCIES = Object.keys(USD_PER)

/** Whether a figure in this currency can be converted at all. An unknown currency is shown as reported, alone. */
export const convertible = (code) => !!USD_PER[String(code || 'USD').toUpperCase()]

/**
 * A figure in US dollars, or null when the currency is not in the table.
 *
 * Null rather than a fallback of 1: quietly treating an unknown currency as dollars would turn a missing rate
 * into a wrong number, and a wrong number that looks right is the failure this whole application is built against.
 */
export function toUsd(value, code = 'USD') {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const rate = USD_PER[String(code || 'USD').toUpperCase()]
  return rate == null ? null : value * rate
}

/** The sentence that has to accompany converted figures wherever they are explained. */
export const FX_NOTE = `Figures are converted to US dollars at the ${FX_SOURCE.label}, and the reported currency follows in parentheses. Every period is converted at that one day's rate, so dollar figures are comparable with each other but a converted historical figure is not what the money was worth at the time.`

/** The short form, for a footnote under a table. */
export const FX_SHORT = `USD converted at the Federal Reserve H.10 rate for ${FX_ASOF}; reported currency in parentheses.`
