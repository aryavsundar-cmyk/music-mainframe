/**
 * pageGuide.js — what every page is for, how to use it, and what it will not tell you.
 *
 * This is the manual. It is data, not prose in a component, for two reasons: the About page and its export read
 * the same words, and `scripts/test-changes.mjs` checks the guide against the app's own routes — a page added
 * without a line here, or a line describing a page that no longer exists, fails the build.
 *
 * `feature` matches `editions.js`, so the research edition's manual describes only the pages it contains. Pages
 * that only exist in the full build are described in `pageGuidePrivate.js`, which the work build swaps for an
 * empty list — the manual must not name a section that edition does not ship, not even to exclude it.
 */
import { PRIVATE_GUIDE } from './pageGuidePrivate.js'

export const PAGE_GUIDE = [
  ...PRIVATE_GUIDE,
  {
    path: '/', group: 'Canvas', title: 'Overview',
    what: 'The front door: what changed since you last looked, and the three ways into the canvas — structure, money and movement.',
    use: ['Read the digest for filings, figure moves, deals and news since your last visit.', 'Follow a card into the entity table, the deals table or the news feed.'],
    not: 'The digest only reaches as far back as the sources hold; it says so when a window predates them.',
  },
  {
    path: '/entities', group: 'Canvas', title: 'Entities',
    what: 'Every company, society and platform on the canvas in one filterable table, with its type, tier, ownership, headline figure and freshness.',
    use: ['Read the line under the title first: it counts the rows on screen, how many file with the SEC, and how many figures are past due.', 'Filter by type, tier, ownership, region or role; the facets carry counts.', '“Needs refresh” finds every company whose figure is due a newer result; “Coverage” finds the ones the app cannot yet say anything about, and turns the table into a ranked list of what to research first.', 'The small line beside a figure is that company’s reported revenue over the years on file, in one currency; the coloured dot is its freshness.', 'Export the filtered view; the file states the filters and the counts.'],
    not: 'Tier is scale within a type, never prestige, and a headline figure is whatever the company last reported — not a valuation. Most companies here carry no figure at all; the table says which kind of missing that is rather than leaving the cell blank.',
  },
  {
    path: '/entities/map', group: 'Canvas', title: 'Entity map',
    what: 'The same companies placed in the value chain: capital, recorded music, publishing, collection, distribution, platforms, live and tech.',
    use: ['Switch between Capital-down (who owns what) and Fan-up (where the money comes from).', 'Filter by stage, tier or ownership, then select a company to see its detail and everyone it is connected to.', 'Close the panel to come back to the whole map; “Full profile” opens the company page.'],
    not: 'Connections are only what the record shows — parent, subsidiaries, backers and shared deals. A company with none says so rather than guessing.',
  },
  {
    path: '/entities/:id', group: 'Canvas', title: 'Company pages',
    what: 'One company in full: reported financials with five years of history, five-forces exposure, connections, profile, hierarchy, news, SEC filings and related transactions.',
    use: ['Read the headline strip for the freshest figure, the latest quarter, margins and free cash flow.', '“What changed here” is the last 90 days for this company alone — filings, figure moves, deals and milestones.', '“What the record holds” lists what this app has on the company, and where there is no figure, says whether it reports inside a parent, publishes nothing, or has simply not been researched.', 'Use “Watch” to follow the company on What changed, and “Compare with…” to put it beside others.', 'Export a brief in Word, PowerPoint, Excel or text — it carries the same figures and their sources.'],
    not: 'Figures are as reported. Nothing here is adjusted for accounting policy, acquisitions or one-off items, and a figure whose tag has gone stale is marked rather than shown as current.',
  },
  {
    path: '/compare', group: 'Canvas', title: 'Compare',
    what: 'Up to six companies side by side on reported figures, growth, margins, cash flow and operating metrics.',
    use: ['Pick companies by search, from a ready-made set, or from a company page.', 'Read the ratios first: they are unit-free, so they travel across currencies.', 'Share the URL — the picks are in it — or export the table with its caveats.'],
    not: 'Money is converted to US dollars at one dated rate so the columns can be ranked, with each company\u2019s reported figure beside it \u2014 a converted historical figure is not what that money was worth at the time. Fiscal years that end on different dates are stated, not lined up. A dash is a missing figure, never a zero.',
  },
  {
    path: '/flows', group: 'Canvas', title: 'Flows',
    what: 'How rights and money actually move: the recording chain and the publishing fan, with the splits and rates published at each step.',
    use: ['Click any node to see who plays that role and what the economics are.', 'Follow a node through to the companies that occupy it.'],
    not: 'Splits are published ranges and statutory rates, not the terms of any particular deal.',
  },
  {
    path: '/deals', group: 'Money', title: 'Deals',
    what: 'Every transaction on record — catalogue sales, M&A, credit and equity — with its value, structure, parties and sources, plus the Five Forces tracker.',
    use: ['Filter by type, asset, structure or force, then read the force board for what the market is doing.', 'Open a deal for its parties and its sources.'],
    not: 'A force tag says what an event is evidence of, not what happens next; press-estimate values are flagged as estimates.',
  },
  { path: '/pe', group: 'Money', title: 'PE funds', what: 'The sponsors active in music: what they have bought, when, and through which vehicle.', use: ['Open a fund for its music deals and its holdings on record.'], not: 'Only deals on record appear — an absence is not evidence a fund is inactive.' },
  { path: '/abs', group: 'Money', title: 'ABS', what: 'Music-royalty securitisations: issuers, sizes, coupons and ratings.', use: ['Compare deal structures and see which catalogues back them.'], not: 'Terms are as published at issue; nothing here tracks performance since.' },
  { path: '/catalogs', group: 'Money', title: 'Catalog sales', what: 'Catalogue transactions with what was bought, from whom, and the multiple where one was disclosed.', use: ['Use it as the comparable set behind the market pages.'], not: 'Multiples appear only where both the price and the income were disclosed.' },
  { path: '/pros', group: 'Rights', title: 'PROs & CMOs', what: 'Performing-rights organisations and collecting societies: collections, distributions, members and territory.', use: ['Open a society for its own figures and how it distributes.'], not: 'Collections and distributions are different measures — each is labelled as what it is.' },
  { path: '/dsps', group: 'Rights', title: 'DSPs', what: 'Streaming services and platforms: subscribers, users, payouts and royalty models.', use: ['Compare per-stream economics and the models behind them.'], not: 'Per-stream rates are derived from published totals, never a rate card.' },
  {
    path: '/changes', group: 'Live', title: 'What changed',
    what: 'One dated feed of everything the app watches on its own: SEC filings, figures that moved when a filing landed, deals and milestones on the record, and archived news.',
    use: ['Pick a window, or let it start from your last visit.', 'Build a watchlist so the feed and the Overview digest show only the companies you follow.', 'Filter by kind, then export the feed with its coverage statement.'],
    not: 'Each source holds only so much history, and the page lists what a window could not have seen. A quiet day is quiet for those sources, not for the market.',
  },
  {
    path: '/news', group: 'Live', title: 'News',
    what: 'The live trade feed plus the evidence archive, tagged by company, topic and force, with a period view of the five forces on top.',
    use: ['Search or filter, then use the force view to isolate a trend over a week, month, quarter, year, or a custom range back to 2018.', 'Open a company tag to jump to its page.'],
    not: 'The archive began on a stated date; any window reaching further back is a floor, drawn hatched rather than as zero.',
  },
  { path: '/market/catalogs', group: 'Market', title: 'Catalog scan', what: 'The demand side: catalogues on record, who owns them, and how available they look from owner behaviour.', use: ['Sort by availability and open the reasons behind each score.'], not: 'An availability score is a prompt to do work, never a claim that an asset is for sale.' },
  { path: '/market/buyers', group: 'Market', title: 'Buyer match', what: 'The sell side: which buyers have done deals like the one you describe.', use: ['Describe an asset and read the shortlist with the deals behind each match.'], not: 'A match means a buyer has done deals like yours, not that they are interested.' },
  { path: '/prospecting', group: 'Pipeline', title: 'Prospecting', what: 'Coverage planning: accounts scored on fit and timing, with drafted outreach and your own outcome record.', use: ['Work the tiers, log what happened, and let outcomes feed back into timing.'], not: 'Scores are computed from the record; status, notes and outcomes stay in your browser and are never uploaded.' },
  { path: '/glossary', group: 'Reference', title: 'Finance, explained', what: 'Every term the app uses, in plain English, with a worked example and what to watch out for.', use: ['Search it, or follow a term from wherever it appears.'], not: 'Definitions describe how the term is used here, not a standard.' },
  { path: '/about', group: 'Reference', title: 'About this tool', what: 'What this build is, where every figure comes from, what the scores do not mean, and this guide.', use: ['Open it first if you are reviewing the tool rather than using it.'], not: 'Every count on this page is measured from the data at render time, never asserted.' },
]

/** The pages this build contains, grouped as the navigation groups them. */
export function guideFor(has = () => true) {
  const shown = PAGE_GUIDE.filter((p) => !p.feature || has(p.feature))
  const groups = []
  for (const p of shown) {
    const g = groups.find((x) => x.group === p.group) || (groups.push({ group: p.group, pages: [] }), groups.at(-1))
    g.pages.push(p)
  }
  return groups
}

/**
 * The marks and lines that mean the same thing on every page. A reader who learns these once does not have to
 * re-learn a page; and every one of them is computed from the data at render time, never written into a page.
 */
export const CONVENTIONS = [
  {
    id: 'held',
    title: 'What the record holds',
    text: 'Fewer than a third of the companies on the canvas carry the figure that measures them, and the figure is not the same question for every kind: a private-equity sponsor is asked for assets under management, because its revenue is fee income; a platform that will never break out music revenue is asked for its paid base. Rather than leave a gap as a blank space, every company page says which kind of nothing it is — reported inside a named parent, does not publish, or not researched yet. “Not researched yet” is the honest default and the largest group; it means nobody has established whether the company publishes a figure, and it is never read as “discloses nothing”. Being private does not mean being undisclosed.',
  },
  {
    id: 'reading',
    title: 'The sentence under the title',
    text: 'Every table page states what its own rows add up to before you filter anything — how many of the total are on screen, how much of the money is actually disclosed, what the record does and does not cover. It is counted from the rows in front of you, so it narrows as you filter. Where there are fewer than five records it says so rather than describing noise.',
  },
  {
    id: 'bar',
    title: 'The bar beside a figure',
    text: 'A value against the largest value in the same list, measured in US dollars so bars in a column of mixed currencies are actually comparable. The figure is the fact; the bar is there so a column of figures has a shape.',
  },
  {
    id: 'sparkline',
    title: 'The line beside a company’s figure',
    text: 'A company’s reported revenue across the years on file, oldest to newest, in one currency and from annual reports only. It appears for SEC filers, who have a multi-year record; everyone else shows the figure alone. Fewer than three years and no line is drawn, because a two-point line is a direction one restatement could reverse.',
  },
  {
    id: 'freshness',
    title: 'The dot beside a figure',
    text: 'Whether the figure is still the latest: current, a newer report filed whose figures are not yet in structured form, past the date a newer result was due, or the last thing the company ever disclosed. The dot is never the only signal — the words are beside it.',
  },
  {
    id: 'coverage',
    title: '“On record” and “a floor”',
    text: 'These are not decoration. “On record” means this app holds it, not that the market contains nothing else. “A floor” means the real number is larger and the app cannot say by how much — usually because prices were undisclosed, or because a window reaches back past the day the archive started watching.',
  },
]

/** Three things this tool is actually for, and the path through the pages for each. */
export const WORKFLOWS = [
  {
    id: 'company',
    title: 'Understand a company',
    steps: [
      'Find it in **Entities**, or see where it sits in the chain on the **Entity map**.',
      'Open its page for reported financials, five years of history, its connections and its filings.',
      'Put it beside its peers in **Compare**, then export a brief.',
    ],
  },
  {
    id: 'market',
    title: 'Follow the market',
    steps: [
      'Start on **What changed** for filings, figure moves, deals and news since your last visit.',
      'Use **Deals** and its Five Forces tracker for what the transactions are evidence of.',
      '**News** holds the archive, with force trends over any period back to 2018.',
    ],
  },
  {
    id: 'thesis',
    title: 'Work a thesis',
    steps: [
      '**Catalog scan** for what exists and how available it looks; **Buyer match** for who has bought like this before.',
      '**Flows** and **PROs / DSPs** for where the money actually comes from.',
      '**Finance, explained** for any term you meet along the way.',
    ],
  },
]
