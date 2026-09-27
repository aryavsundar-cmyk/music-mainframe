# UX strategy — making the information reachable

**Reviewed 27 Sep 2026, against Sprint 31.** Sources: *Universal Principles of UX* (Pereyra), *50 UX Best
Practices* (Above the Fold), *Consistency in UI Design* (UXPin). Every measurement below was taken from the
running app at 1280×800, the size of a 13" laptop.

---

## Situation

Thirty-one sprints have produced an unusually rigorous instrument. 188 companies, 61 transactions, five years of
SEC financials refreshed daily, an append-only news archive, a five-forces engine that refuses to tag without
evidence, a comparison view that will not rank money across currencies, a change feed that states what it could
not have seen, and an export on every page that carries its own filters and caveats.

The discipline is the moat. No competitor to this tool is going to be more careful with a number.

## Complication

The interface grew one sprint at a time, and each page was designed as its own small product. Four consequences,
and they compound:

1. **Nothing is findable except by remembering where it lives.** There is no search across the app. 188
   companies, 61 deals, 68 glossary terms and an 11,000-item archive are reachable only by choosing the right
   page first, then searching inside it.
2. **Pages open with their apparatus, not their answer.** Measured at 1280×800 (fold ≈ 800px):

   | Page | First data row | Controls before it |
   |---|---|---|
   | `/news` | **2,504px** — three screens down | 21 |
   | `/entities/map` | 770px | — |
   | `/entities` | 644px | 11 |
   | `/market/catalogs` | 642px | 5 |
   | `/prospecting` | 558px | 125 |
   | `/changes` | 578px | 14 |
   | `/pros` | 516px | 1 |
   | `/catalogs` | 414px | 0 |

   The two pages that open fastest (`/pros`, `/catalogs`) are the two that are most pleasant to use. That is not
   a coincidence, and it is the whole argument in one table.
3. **The same idea is built differently on each page**, so nothing learned on one page transfers to the next.
   Counted in the source:

   | Pattern | Implementations | Shape of the divergence |
   |---|---|---|
   | Filter chip | **20** (11 `const chip` declarations; one class string copied into 10 files) | 6 padding pairs, 2 radii, 3 different "selected" treatments |
   | Search input | **7** | 32px or 36px tall, `t-small` or `t-body`, 14px or 15px icon, `type="search"` on 8 of 11 |
   | Segmented control | **4** | one omits the transition, so `/changes` snaps where `/news` fades |
   | Table header | **9 copies, 3 visual treatments** | `/compare` uses an eyebrow; `Financials` drops the uppercase tracking |
   | Panel / boxed card | **19 hand-rolled** | because `Card` has no small-radius variant |
   | Stat tile | primitive exists, **4 pages re-type its markup** | `/market/catalogs`, `/market/buyers`, `/prospecting`, lab |
   | "Show more" | **3 buttons, 2 dead ends** | "Show more (N left)" vs "N more in the feed." vs nothing |
   | "Clear filters" | **9** | 4 labels, 3 colours, 2 sizes, icon optional |

   Plus two answers to the same sideways-scrolling problem (the map's custom scrubber, a native scrollbar on
   `/flows`), two tab designs, and three vocabularies for "this is selected".
4. **The density is uniform, so nothing is ranked for the eye.** The type scale is sound (36 / 26 / 17 / 15 / 13
   / 11), but **11px `t-micro` is used 424 times and the lede size 6** — periods, sources, freshness, caveats,
   "shown, not ranked" all live at 11px while 13px carries row text that matters less. The hierarchy is inverted
   exactly where the meaning is. One role has three sizes (`SectionHeader` is `t-h2`, the lab uses `h3.t-h2`,
   other sections are `t-body`), and detail panels title themselves `t-h3` on two pages and `t-h2` on two others.
5. **The app is hard to read aloud and hard to drive without a mouse.** About 40 section headings are
   `<div class="t-eyebrow">` rather than headings, so a screen-reader heading list for `/deals`, `/entities`,
   `/news`, `/compare` and `/entities/map` is one item long. Four detail panels have no Escape key and no focus
   return — the entity map does it correctly and is the only one. No table has a sticky header (13 tables, some
   900px wide and hundreds of rows). Nothing anywhere is announced when content loads or a filter changes.

Two more, small to fix and disproportionate in effect:

- **Every page has the same browser title** (`Mainframe · Music`). Tabs, bookmarks, history and shared links are
  therefore indistinguishable — the one place the app never says where you are.
- **There is no skip link**, so a keyboard user tabs through 24 navigation stops before reaching the content of
  every page.

Underneath all four: **the app explains itself before it shows itself.** Its honesty — the thing that makes it
trustworthy — is delivered as prose competing with the data, rather than attached to the figure it qualifies.

## Five defects, not design debates

These are broken rather than debatable, and all five are cheap. They belong at the top of the next sprint.

| # | Defect | Evidence |
|---|---|---|
| D1 | **No scroll reset between pages.** Scrolled 3,000px down `/entities`, clicked a company: arrived at `/entities/bmg` still at 1,869px — below the name, the back link and the headline figures. Every back link and page header in the app is undermined by this one omission. | `src/main.jsx` mounts a bare `BrowserRouter`; no `ScrollRestoration` anywhere |
| D2 | **Every route shares one browser title.** `index.html` sets `Mainframe · Music` and nothing ever changes it, so 30 routes are indistinguishable in tabs, bookmarks and history. | no `document.title` in `src/` |
| D3 | **Deal links from the map drawer and forces panel do nothing visible.** `/deals#<id>` — React Router does not scroll to a hash, so the reader lands at the top of a long page with the target 556px above the viewport, measured. | `MapDrawer.jsx:107`, `ForceExposure.jsx:34`; rows already carry `id` + `scroll-mt-24` |
| D4 | **Catalog scan → Buyer match loses its payload.** The handoff passes a raw `size` and a feed-derived `genre`; Buyer match's selects only hold six fixed sizes and genres computed without the feed, so the control shows "Any" while the engine filters on the value. | `CatalogScan.jsx:112` vs `BuyerMatch.jsx:24,44-47` |
| D5 | **Two tables cannot be operated from the keyboard at all.** The Prospecting target row and the Catalog-scan holding row are `<tr onClick>` with no `tabIndex`, no key handler and no role — and both drive the side panel that is the point of the page. The entity row is a fake button: `tabIndex` + Enter on a `<tr>`, no role, no Space, three tab stops per row. | `Prospecting.jsx:196`, `CatalogScan.jsx:75`, `EntityTable.jsx:27` |
| D6 | **Counts disagree with rows.** Catalog scan prints the unsliced count above a list capped at 80; Buyer match caps at 24 with no notice and renders nothing at all when a brief matches no buyer. | `CatalogScan.jsx:64,74`, `BuyerMatch.jsx:78` |

## Resolution

Four workstreams, in dependency order. Each is a sprint; each ends with a test in the existing suite so the gain
cannot decay.

---

### 1 — Findable · *Sprint 32*

> "An effective IA allows all users to easily meet their different goals through clear information hierarchy,
> labeling, categorization and classification." — *Universal Principles of UX*, 67
> "More than half of a website's visitors first land somewhere other than the homepage." — 70, *side doors matter*
> "Create a taxonomy! … ensuring that users can use different words to find what they're looking for." — *50 UX
> Best Practices*, 36, *supplement with synonyms*

- **One search across everything** (⌘K / `/`), returning companies, deals, societies, platforms, glossary terms,
  pages and saved comparisons, grouped by kind, keyboard-navigable, with the top hit actionable on Enter.
- **A synonym layer** so the vocabulary of the industry reaches the right record: *majors* → UMG/Sony/WMG,
  *PRO* → performing-rights organisation, *ASCAP* → the society, *sync* → the licence type, tickers → companies,
  *catalogue* and *catalog*, *Beggars* → Beggars Group. Aliases live in data, with a test that every alias
  resolves to a record that exists.
- **Fix D1–D3 first** — scroll restoration, per-route titles, working deal anchors. Half a day, and every other
  wayfinding cue in the app starts working.
- **A real page title per route** (`Warner Music Group · Mainframe · Music`) and a skip link, so tabs, history,
  shared links and the keyboard all tell the reader where they are.
- **Recently viewed** and **saved views** (the URL already carries the state; nothing new is needed underneath).
- Every page reachable from search, including deep ones — because most sessions will start at a company page or
  a shared link, not the Overview.

**Test:** `test:search` — every entity, deal, society, page and glossary term is reachable by its own name and by
at least one alias; no alias resolves to nothing; results are ranked deterministically.

**Also in this sprint — the connective tissue that is missing:**

- `/entities` has **no link to the map** (the map links back); `/news` has no link to `/changes`; `/abs` and
  `/catalogs` are terminal pages whose issuer and seller names are plain text rather than links to the companies
  they name; the glossary's "Related:" terms are not links, and nothing outside the Lab links *into* the glossary.
- **No way to build a comparison from a list** — six companies means six company pages, one at a time. Multi-select
  on the entity table and a *Compare* action in the map drawer.
- **The app's only site map — the page guide on `/about` — is not clickable**; its paths are `<code>` text.

---

### 2 — Readable · *Sprint 33*

> "Set one primary goal for your users on each screen." — *50 UX Best Practices*, 19
> "Too much choice stresses us out and prolongs our decision-making process." (Hick's law) — *UPUX*, 24
> "People much prefer scrolling over clicking … Scrolling means 'I am interested in more.'" — *UPUX*, 76

- **Content first, controls second, on every page.** Search stays; the rest of the filters collapse into a
  single *Filters* control that opens a panel and shows what is active as a removable summary. Target: **first
  data row above 400px on every page**, measured by a test.
- **A one-line answer under every page title, generated from the data** — "188 companies · 39 listed · 3 need a
  refresh" — so the page says something true before the reader does any work.
- **Fix the hierarchy inversion**: a figure's period and source are part of the figure, not footnotes. Promote
  them to 13px beside the number; demote decoration.
- **`/news` and `/deals` get their order back**: the feed and the deal table lead; the forces view becomes a
  summary strip that expands. Nothing is removed — the sequence changes.

**Test:** extend `test:pagedocs` with a layout contract: every page declares its primary content region, and the
test fails if a page renders more than N interactive controls above it.

---

### 3 — Consistent · *Sprint 34*

> "Internal consistency is a thankless feature. Only its absence is noticed." — *Consistency in UI Design*
> Their checklist: colour · typography · language · general visuals · layout and location · interactions.
> "When you build a UI widget that you may want to reuse, put it somewhere that everyone can find it." — *50 UX
> Best Practices*, 24

`/design` documents the tokens beautifully and stops there — it has no filter bar, chip, stat strip, table,
empty state, drawer or scroller. Every page therefore re-invents them.

- **Promote the composites to primitives**: `FilterBar`, `Chip`, `SegmentedControl`, `StatStrip`, `DataTable`,
  `EmptyState`, `Drawer`, `SideScroller`. One implementation each, all on `/design` with live examples.
- **One vocabulary in the URL too.** `tier` currently means four different things across pages, `kind` five;
  ownership is `ownership` on the table and `own` on the map, so filters do not survive the switch between them;
  the selected record is `e`, `row`, `account`, `node` or `ids` depending on the page. One name per concept, and
  `/catalogs`' sort (local state today) joins the URL like every other view-defining control.
- **One empty state.** Of **32** empty states, **6 offer a next action**. `/entities` says "No entities match.
  Clear a facet or widen the search."; `/pe`, `/dsps` and `/glossary` say "Nothing matches." with no way out, and
  `/market/buyers` renders nothing at all. One shape everywhere: what is missing · why · what to do next. The
  same applies to loading (**8 phrasings**, two verbs, one silent) and to failure — the same dead news service is
  announced four different ways, in `text-danger` on two pages and muted `ink-4` on three, where a hard failure
  reads as chrome.
- **One language**: a single placeholder pattern ("Search companies, tickers, cities"), one empty-state shape
  (what is missing · why · what to do next), one word per concept everywhere.
- **One answer per interaction**: the map's scrubber becomes the app's sideways-scroll component and `/flows`
  adopts it; one tab style wins.
- Deviate only where the content differs — the books are explicit that consistency is not uniformity.

**Also in this sprint — the accessibility work, which is the same work:** a skip link, headings that are
headings (`Eyebrow as="h2"`), one `useDismissable` hook for all four panels (the map's is already correct),
`role="menu"` either finished or dropped on the export menu, `aria-pressed` on the two filter rows that lack it
and `aria-current`/radio semantics where the choice is single-select, and sticky table headers.

**Test:** `test:patterns` — no page may define its own chip/segmented/empty-state class strings; a grep-based
check in the spirit of the existing edition leak scan. Plus a heading-order and keyboard-reachability check over
the built DOM.

---

### 4 — Informative · *Sprint 35*

> "Many data visualizations do the opposite of making big numbers comprehensible." — *UPUX*, 78, *make data lovable*
> "Some complexity cannot be reduced." (Tesler's law) — *UPUX*, 46
> "Detailed and appropriate copy helps the user move forward." — *50 UX Best Practices*, 40

- **Encode in the table, not beside it**: `/pros` already shows a bar inside the collections column and is the
  most readable table in the app. Give every table one visual column — a share bar, a five-year sparkline, a
  freshness dot.
- **Say what the numbers say.** Each data page gets one computed sentence — the same discipline as the News
  page's `readRange` reading, applied to entities, deals, ABS, catalogs and compare.
- **Progressive honesty.** The caveats stay, but attach to the figure: one line, expandable to the full
  statement. The irreducible complexity is real (Tesler); it should sit next to the number it qualifies, not in
  a paragraph above the data.
- **Company page**: a "what changed here" strip, and the five-year record as a chart rather than only a table.

**Test:** extend `test:outcomes` so that every computed sentence cites a number that exists in the data.

---

## What not to do

- **Don't remove the caveats.** They are the product. Sequence them; don't delete them.
- **Don't flatten the density everywhere.** *Less is a bore* (UPUX 12): an analyst's tool earns its density. The
  fix is hierarchy, not air.
- **Don't redesign the dark palette.** It passes AA on every role in both themes and is tested.
- **Don't build onboarding tours.** Design for learnability in place (UPUX 22) and for the returning expert
  (UPUX 23): shortcuts, saved views, keyboard paths.

## Sequence and why

Search first, because it is the only change that helps on every page at once and it de-risks the rest: once
anything can be found from anywhere, a page is allowed to show less. Readability second, because it is where the
value is felt. Consistency third, because by then the patterns worth standardising are known. Data expression
last, because it is the most expensive and benefits from the other three.
