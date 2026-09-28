/**
 * readings.js — what each page's numbers actually say, in a sentence the page computes about itself.
 *
 * The News page has done this since Sprint 26 (`readRange`) and it is the most useful line on the page: it reads
 * the data the reader is looking at and says what stands out, including when nothing does. Every other page left
 * that work to the reader.
 *
 * The rules are the same ones the rest of the app lives by:
 *
 * - **Cite the number.** Every claim carries the figure it rests on, so `cites` is the list of numbers in the
 *   sentence and `scripts/test-readings.mjs` checks each one against the data.
 * - **Never rank across currencies silently.** Since Sprint 42 every figure is converted to US dollars at one
 *   dated rate with the reported figure beside it, so a ranking IS a real comparison — and the sentence says it
 *   converted rather than leaving the reader to assume the figures were already alike.
 * - **Say what the record holds, not what the market did.** "The busiest year ON RECORD" — this table is a
 *   record of what has been filed here, not a census of the industry.
 * - **Too few to read is a reading.** Below five records a page says so rather than describing noise.
 */
import { format, formatDate } from './format.js'

const n = (v) => format.count(v, { full: true })
const money = (v, currency = 'USD') => format.usd(v, currency)

/**
 * A reading is a sentence plus the figures it rests on, so the claim can be checked against the data.
 *
 * A zero is never cited: a reading does not print "0 figures are past due", it drops the clause and says the
 * positive thing instead ("Every figure here is current"). A zero cite would therefore point at a number the
 * reader cannot see, which is the one thing `cites` exists to rule out.
 */
const reading = (parts, cites = []) => ({
  text: parts.filter(Boolean).join(' '),
  cites: cites.filter((c) => c && c.value != null && c.value !== 0),
})

/** Fewer than this and a page describes individual records rather than a pattern. */
export const TOO_FEW = 5

/**
 * Entities: how much of the canvas is public, how much of it refreshes itself, and how much is waiting on a
 * human. The last figure is the one that matters — it says how much of what you are reading could be stale.
 */
export function readEntities({ total, listed, secFilers, due, pending, withFigure, unresearched }) {
  if (!total) return reading(['Nothing on the canvas matches these filters.'])
  const auto = secFilers ? `${n(secFilers)} of them file with the SEC, and those figures refresh daily.` : ''
  const stale = due
    ? `${n(due)} ${due === 1 ? 'figure is' : 'figures are'} past the date a newer result was due.`
    : ''
  const waiting = pending ? `${n(pending)} ${pending === 1 ? 'company has' : 'companies have'} filed a newer report whose figures are not yet in structured form.` : ''
  // The coverage line is the one that changes how everything above it should be read, so it is said outright
  // rather than left for a reader to work out from a table of dashes.
  // "The figure that measures them", not "a financial figure": a sponsor with revenue on record but no AUM has a
  // figure and still cannot be compared with the other thirty-nine, and saying otherwise reads as a contradiction
  // next to the SEC-filer count in the same sentence.
  const covered = withFigure != null
    ? `${n(withFigure)} carry the figure that measures them${unresearched ? `, and ${n(unresearched)} have not been researched yet — work not done, not companies that disclose nothing` : ''}.`
    : ''
  return reading(
    [`${n(total)} companies on record, ${n(listed)} of them publicly listed.`, covered, auto, stale, waiting],
    [
      { label: 'total', value: total }, { label: 'listed', value: listed }, { label: 'withFigure', value: withFigure },
      { label: 'unresearched', value: unresearched }, { label: 'secFilers', value: secFilers },
      { label: 'due', value: due }, { label: 'pending', value: pending },
    ],
  )
}

/**
 * Deals: how much of the money is actually known. The undisclosed count is the point — a total that ignores it
 * reads as the size of the market rather than the size of what was published.
 */
export function readDeals({ rows, total, disclosed, undisclosed, byYear, estimates }) {
  if (rows < TOO_FEW) {
    return reading([rows ? `Only ${n(rows)} ${rows === 1 ? 'deal matches' : 'deals match'} these filters — too few to read a pattern; treat them as individual records.` : 'No deal on record matches these filters.'],
      [{ label: 'rows', value: rows }])
  }
  const years = Object.entries(byYear || {}).sort((a, b) => b[1] - a[1])
  const busiest = years[0]
  const tie = years.filter(([, count]) => count === busiest?.[1]).length > 1
  return reading([
    `${n(rows)} of ${n(total)} deals on record, carrying ${money(disclosed)} of disclosed value.`,
    undisclosed ? `${n(undisclosed)} disclosed no price, so the total is a floor, not the size of the market.` : '',
    busiest && !tie ? `The busiest year on record is ${busiest[0]}, with ${n(busiest[1])}.` : '',
    estimates ? `${n(estimates)} ${estimates === 1 ? 'value is' : 'values are'} press estimates rather than filed figures, and carry a verify tag.` : '',
  ], [{ label: 'rows', value: rows }, { label: 'disclosed', value: disclosed }, { label: 'undisclosed', value: undisclosed }, { label: 'estimates', value: estimates }])
}

/**
 * Catalog sales: the same caution about estimates, plus who has been buying. "The largest" is a ranking, and it is
 * made in dollars — so where the rows span more than one currency the sentence says the ordering was converted
 * rather than implying the figures were already comparable.
 */
export function readCatalogs({ rows, total, largest, buyers, estimates, currencies = 1 }) {
  if (!rows) return reading(['No catalog sale on file matches this view.'])
  const top = largest
  return reading([
    `${n(rows)} superstar catalog sales on file, worth ${money(total)} as reported.`,
    top ? `The largest is ${top.catalogOf || top.title} at ${money(top.value, top.currency)}${currencies > 1 ? ', ordered in US dollars because the sales are not all in one currency' : ''}.` : '',
    `${n(buyers)} buyers appear across them.`,
    estimates ? `${n(estimates)} of the values are press estimates, not filed figures.` : '',
  ], [{ label: 'rows', value: rows }, { label: 'total', value: total }, { label: 'buyers', value: buyers }, { label: 'estimates', value: estimates }])
}

/**
 * ABS: this table is explicitly a floor. KBRA rates more than the app holds, and saying so is the honest frame
 * for every number above it.
 */
export function readAbs({ deals, issued, issuers, ratedSince2020, ratedIssuers }) {
  if (!deals) return reading(['No securitisation on file.'])
  const gap = ratedSince2020 && issued < ratedSince2020
    ? `KBRA counts ${money(ratedSince2020)} rated across ${n(ratedIssuers)} issuers since 2020, so this table is a floor rather than the whole market.`
    : ''
  return reading([
    `${n(deals)} securitisations on file from ${n(issuers)} issuers, ${money(issued)} issued.`,
    gap,
  ], [{ label: 'deals', value: deals }, { label: 'issued', value: issued }, { label: 'issuers', value: issuers }])
}

/**
 * Societies: the reading has to name the conversion, because this page is the one place in the app that ranks
 * across currencies. Each society reports in its own, the table shows it that way, and the ordering uses the
 * rounded USD rates in `data/pros.js` — indicative, and stated as such rather than left for the reader to infer.
 */
export function readPros({ rows, total, disclosing, currencies, latestYear }) {
  if (!rows) return reading(['No society matches these filters.'])
  return reading([
    `${n(rows)} of ${n(total)} societies on file, ${n(disclosing)} of which disclose what they collect.`,
    currencies > 1
      ? `They report in ${n(currencies)} currencies; every figure is shown in US dollars with the society's own beside it, converted at one dated rate, so the ordering is a real comparison rather than a coincidence of denomination.`
      : '',
    latestYear ? `The most recent reporting year on file is ${latestYear}.` : '',
  ], [{ label: 'rows', value: rows }, { label: 'disclosing', value: disclosing }, { label: 'currencies', value: currencies }])
}

/**
 * Platforms: how much of the payout picture exists at all. `withRate` counts the platforms carrying a per-stream
 * range, and the sentence repeats what that range is — an all-in figure commonly cited by the trade press, never a
 * contractual rate. Subscriber counts are deliberately not summed: each platform reports as of its own date, and
 * adding figures from different quarters would produce a number no source states.
 */
export function readDsps({ rows, total, reporting, withRate }) {
  if (!rows) return reading(['No platform matches these filters.'])
  const silent = rows - withRate
  return reading([
    `${n(rows)} of ${n(total)} platforms on record, ${n(reporting)} of which report a subscriber count.`,
    withRate
      ? `${n(withRate)} carry a per-stream range — all-in figures as commonly cited, never a contractual rate, so they read as order of magnitude only.`
      : 'None of these carry a per-stream figure.',
    silent > 0 ? `${n(silent)} publish nothing a rate can be read from.` : '',
  ], [{ label: 'rows', value: rows }, { label: 'reporting', value: reporting }, { label: 'withRate', value: withRate }])
}

/**
 * Flows: what the routes on screen actually say about who is paid, and how much of the picture is missing.
 *
 * The last clause is the one that matters and the one a slide would drop: the routes whose economics nobody
 * publishes. A page that divided five dollars and said nothing about the two it could not divide would be
 * describing the disclosed half of the industry as though it were the whole of it.
 *
 * The middle clause names the reference route rather than the extremes. A "widest and narrowest" reading picked
 * statutory radio at 100%, which is true and meaningless: a SoundExchange dollar is a recording royalty by
 * definition, so the recording side keeping all of it is a restatement of the unit, not a finding.
 */
export function readFlows({ routes, priced, undisclosed, reference }) {
  if (!routes) return reading(['No money route is on screen.'])
  const split = reference?.recording != null && reference?.publishing != null
    ? `On ${/^[aeiou]/i.test(reference.label) ? 'an' : 'a'} ${reference.label.toLowerCase()}, ${format.pct(reference.recording * 100, { digits: 0 })} of the dollar reaches the recording and ${format.pct(reference.publishing * 100, { digits: 0 })} the composition; the service keeps the rest.`
    : ''
  return reading([
    `${n(routes)} ways money reaches this industry, ${priced ? `${n(priced)} of which divide at published rates` : 'none of which divides at a published rate'}.`,
    split,
    undisclosed
      ? `${n(undisclosed)} steps across these routes have no published figure at all — platform pools and AI licences, where the non-disclosure is the finding rather than a gap in this record.`
      : 'Every step on these routes carries a published figure.',
  ], [
    { label: 'routes', value: routes },
    { label: 'priced', value: priced },
    { label: 'undisclosed', value: undisclosed },
    { label: 'reference recording share', value: reference?.recording != null ? reference.recording * 100 : null },
    { label: 'reference publishing share', value: reference?.publishing != null ? reference.publishing * 100 : null },
  ])
}

/** Money-side actors: how much of the capital side is profiled rather than merely listed. */
export function readPe({ rows, total, profiled, absIssuers, volume }) {
  if (!rows) return reading(['No fund or sponsor matches these filters.'])
  return reading([
    `${n(rows)} of ${n(total)} money-side actors, ${n(profiled)} with an investment profile on file.`,
    absIssuers ? `${n(absIssuers)} have issued securitisations.` : '',
    volume ? `Deal volume on record totals ${money(volume)}, which double-counts both sides of a transaction and is only useful for ranking.` : '',
  ], [{ label: 'rows', value: rows }, { label: 'profiled', value: profiled }, { label: 'absIssuers', value: absIssuers }])
}

/**
 * The market pages already carry their limit note; the reading says how much of the list is worth opening.
 *
 * `live` and `watch` are the two availability bands above quiet — a score, not a fact about a sale process. The
 * sentence repeats the limit in its own words rather than leaving the band names to speak for themselves.
 */
export function readCatalogScan({ rows, total, watch, live, owners }) {
  if (!rows) return reading(['No holding matches these filters.'])
  const scoring = live + watch
  return reading([
    `${n(rows)} of ${n(total)} holdings, held by ${n(owners)} owners.`,
    scoring
      ? `${n(scoring)} score above quiet${live ? `, ${n(live)} of them in the top band` : ''} — a prompt to do work, never a claim that anything is for sale.`
      : 'None score above quiet today, so there is nothing here to chase.',
  ], [{ label: 'rows', value: rows }, { label: 'scoring', value: scoring }, { label: 'live', value: live }, { label: 'owners', value: owners }])
}

/** Dates are formatted the same way everywhere a reading mentions one. */
export const readingDate = (iso) => formatDate(String(iso).slice(0, 10))
