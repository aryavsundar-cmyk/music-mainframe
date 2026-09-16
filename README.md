# Mainframe · Music

Intelligence platform for the modern music business. Sibling to the Mainframe Intelligence Hub and the Programmatic Ecosystem; different domain, different taxonomy, different financial vocabulary, own repo.

One canvas for three lenses:

- **Structure** — who owns what, who distributes what, who collects what (labels, publishers, distributors, PROs/CMOs, DSPs, live).
- **Money** — catalog PE, music-royalty ABS, superstar rights sales, credit and equity in the majors and DSPs.
- **Movement** — deals, litigation, PRO reform, DSP economics, AI-royalty flashpoints, live from the trades.

## Run

```bash
npm install
npm run dev        # Vite on :5190 (regenerates src/tokens.css first)
npm run build      # → dist/
npm start          # Express on :3002 serving dist/ + /api/health
npm run lint
```

Render deploys from `main` via `render.yaml` (build → `node server/index.js`).

## Stack

React 19 · Vite 7 · Tailwind 4 (CSS-first, no tailwind.config) · React Router 7 · Lucide · Express 5. Fonts are bundled with `@fontsource` — no CDN calls at runtime.

## Routes

| Route | Lens | Fills in |
|---|---|---|
| `/` | overview | Sprint 0 |
| `/entities` · `/entities/:id` | structure | live (Sprint 1) |
| `/flows` · `/flows/recording` · `/flows/publishing` | structure | live (Sprint 2) |
| `/deals` · `/pe` · `/pe/:id` · `/abs` · `/catalogs` | money | live (Sprint 3) |
| `/pros` · `/pros/:id` · `/dsps` | rights | live (Sprint 4) |
| `/news` | live | live (Sprint 5) |
| `/consulting` · `/consulting/:id` | overlay | live (Sprint 6) |
| `/deliverables` | overlay | live (Sprint 8) |
| `/lab` · `/lab/:caseId` | academy | live (Sprints 9–12) |
| `/prospecting` | pipeline | live (Sprint 13) |
| `/design` | reference | living style guide |

## Design system

**Source of truth: [`src/tokens.js`](src/tokens.js).** `scripts/build-tokens.mjs` emits `src/tokens.css` (committed, regenerated before every `dev`/`build`); Tailwind 4 reads it as `@theme`, so utilities like `bg-ground-1 text-ink-2 text-accent border-line-1` are the tokens. Never hard-code a hex in a component. [`/design`](src/pages/DesignSystem.jsx) renders every token and primitive live in both themes.

### Concept

Both accents are brass. **Polished → lacquer gold**: recording rights, money, the one primary CTA. **Oxidised → verdigris**: publishing rights, registries, song counts. The warm/cool split is the two-flow split. Ground is **shellac** (warm near-black, default) or **manuscript paper** (light). Not slate, not cream-and-terracotta, not the sibling apps' blue/purple.

| Role | Dark | Light | Carries |
|---|---|---|---|
| `accent` (lacquer gold) | `#D4A24C` | `#8A6420` | recording flow · money figures · primary CTA |
| `secondary` (verdigris) | `#5E9C8A` | `#2F6F62` | publishing flow · counts · secondary actions |
| `danger` (VU overdrive) | `#D2483A` | `#A8362B` | litigation · over-limit · destructive — never decorative |
| `ground-0` | `#141210` | `#F4F1EA` | page |

Contrast on dark ground: gold 8.1:1, verdigris 6.0:1 — both label data, not just decorate.

### Type

Instrument Serif (display: `t-display` `t-h1` `t-h2`) · IBM Plex Sans (UI: `t-h3` `t-lede` `t-body` `t-small` `t-micro` `t-eyebrow`) · IBM Plex Mono (`t-data` `t-stat` `t-stat-lg`, every number, every ID). Eyebrows are numbered (`§ 03 —`) only in exports where sequence carries meaning; on entity pages sections are peers.

### Four kinds of number

| Kind | Treatment | Example | Helper |
|---|---|---|---|
| money | gold · mono · compact | `$1.8B` | `formatMoney` / `<Num kind="money">` |
| count | verdigris · mono · compact | `62K` | `formatCount` / `<Num kind="count">` |
| pct | ink-1 · mono · 1dp | `5.4%` | `formatPct` / `<Num kind="pct">` |
| rate | ink-2 · mono · precise | `$0.0032` | `formatRate` / `<Num kind="rate">` |

Every formatter returns `—` for null/undefined. Never `null`, never `NaN`.

### Two flows, two rhythms

`tokens.flows` — recording is a **solid chain** (label → distributor → DSP → consumer → payout back); publishing is a **dashed fan** (composition → publisher/admin → PROs/MLC → DSPs/venues → collected back). `<FlowMark flow>` is the glyph; `<Card tone="recording|publishing">` is the rule. Colour and line rhythm both differ, so it survives greyscale.

### Primitives (`src/components/primitives`)

`PageHeader` · `SectionHeader` · `Eyebrow` · `Card` · `Stat` · `Num` · `Tag` · `Button` · `FlowMark` · `Stub`. One `primary` Button per view. Elevation on dark ground is a lighter ground plus a hairline, not a shadow.

### Theme

Dark by default. `data-theme="light"` on `<html>` flips every `--mm-*` role; persisted in `localStorage` (`mm-theme`); toggle in the sidebar. `index.html` applies the stored theme before first paint.

## Data (Sprint 1+)

File-based, `src/data/*.js`, named exports plus small helpers. Conventions fixed in Sprint 0:

- `entities.js` — one flat table (`ENTITIES`) plus helpers (`getEntity`, `getEntityProfile`, `getParentChain`, `getChildren`, `filterEntities`, `headlineMetric`). Source rows live in `entities/*.js`, one file per brief §4 section, merged and normalised at load (typed defaults, duplicate-id guard). `type` is the primary bucket (facet); `roles[]` holds the rest (Sony = label + publisher + distributor). `tier` = scale within type, never prestige. `verify: true` marks a record carrying a fact from the brief that isn't yet sourced — it shows as a red tag in the UI and is a facet on `/entities`.
- `transactions.js` — one table (`TRANSACTIONS`, 60 deals 2019–2026) for catalog sales, equity/fund raises, ABS, debt, take-privates, M&A, differentiated by `type`. Parties are `{ entityId }` or `{ name, kind }` so artists and estates never enter the entity table; superstar deals carry `catalogOf` (drives `/catalogs`). ABS rows carry an `abs` object (issuer, series, rating, arrangers, collateral, catalog value, advance rate, anticipated repayment, legal final) rendered by `components/money/AbsStructure.jsx` in fixed-income conventions. Every row has `sources[]`; `verify: true` only where a figure is a press estimate the parties have not confirmed. `ABS_MARKET` holds the KBRA market totals. Helpers: `filterTransactions`, `getTransactionsForEntity`, `ABS_DEALS`, `CATALOG_SALES`, `TX_TOTALS`.
- `peFunds.js` — investment-view extension keyed by entity id for every money-lens actor (44 profiles): thesis, structure preference, portfolio (entity ids), named catalogs, exits, LP base. `getFundProfile(id)` always returns typed defaults plus the entity's transactions and ABS issued; `listFunds({ kind, q })` ranks by deal volume; `kindOf(e)` files multi-role entities under their first money role.
- `flows.js` — exports both flows (`FLOWS.recording`, `FLOWS.publishing`). A flow is nodes on a (col, row) grid plus edges of kind `rights` (forward) or `money` (backward), each with a label and optional `econ` split. Nodes carry `entityIds` (who plays the role → links to `/entities/:id`), `econ` (published splits and rates, `verify: true` unless statutory), and notes. `components/flows/FlowDiagram.jsx` lays nodes out on a CSS grid and draws edges in an SVG layer from measured rects; `FlowPanel.jsx` is the click-to-drill rail. Recording is a 5×2 chain with the SoundExchange statutory branch; publishing is a 4×3 fan (publisher → PRO / mechanical / sync → licensees → back to the writer).
- `pros.js` — collection-view extension for all 16 PRO/CMO/mechanical entities: scopes (performance · mechanical · neighbouring · statutory digital performance), ownership model, members, collections/distributions series in native currency, overhead, payout policy, distribution methodology, reciprocal footprint, dated reform timeline. `listPros` ranks by a USD-equivalent (`USD_RATE`, scale only — never shown as the primary figure). `GLOBAL_COLLECTIONS` carries the CISAC 2024 totals.
- `fundamentals.js` — DSP economics for all 21 DSP entities: tier, payout model (pro-rata · artist-centric · statutory · lump-sum · direct), US price and note, subscribers/MAU with as-of, ARPU, 2025 payouts, commonly cited all-in per-stream range (order of magnitude, never contractual), share to rights holders, MIDiA subscriber share, posture, dated shifts. `MARKET` holds IFPI 2025, MIDiA Q4 2025 shares, the stream-split rule of thumb, and the Phonorecords IV/V mechanical rate status.
- Every record: `asOf` (ISO date) + `sources: [{ label, url }]`.
- Relative imports carry `.js` so Node scripts (exports, batch generation) can import data files directly.

## Exports (src/utils/brief*.js, scripts/generate-briefs.mjs)

One data builder, three renderers (Patterns §1/§3/§6/§8). `buildBrief(entityId, { mode, citations })` returns numbered sections of typed blocks (paragraph · facts · stats · bullets · table · note); `briefText.js`, `briefDocx.js` (docx), and `briefPptx.js` (pptxgenjs) render that object and nothing else, so a new section is added once. Modes are per entity type, not binary: labels/publishers/distributors get full · catalog · financial · distribution; funds full · financial; PROs full · methodology · membership; DSPs full · economics · rights. Citations come from `newsCitations.fetchCitations` and the brief prints a different fallback for *feed unreachable* vs *nothing tagged*. In the app, entity, fund, and PRO pages carry the two-tier export UX (primary "Export full brief" .docx + a mode × format menu); renderers are lazy-loaded so docx and pptxgenjs stay out of the core bundle. From Node: `npm run briefs -- --entity concord --entity blackstone --modes full,financial --formats docx,pptx,txt --out-dir ./exports --api http://localhost:3002`.

## Deliverables (src/utils/{accountPlan,proposal,categoryDeck}.js, /deliverables)

Three more document kinds share the brief's block model, so the same three renderers (plus `briefMarkdown.js`) produce them with no renderer changes. **Account plan** (`buildAccountPlan`): SCR summary, stakeholder map, category × service-line matrix, 30·60·90 roadmap, KPIs, deals, news. **Proposal** (`buildProposal`): SCR executive summary, understanding, objectives, workstreams per line (activities and deliverables from `data/rateCard.js` templates), phased timeline, staffing table, indicative commercials (`estimateCommercials`, day rates mirror the Hub's PricingCalculator defaults × 8 and are editable in the UI — every output labels them indicative), capabilities, risks, next steps, appendix. **Sector deck** (`buildCategoryDeck`): one PEPI client category with lens-specific market context. `/deliverables` is the builder (entity search, kind, mode, category, lines, duration, day rates, outline preview) and the export bar: Word · Slides · Text · Markdown · Gamma deck · Gamma doc. Entity pages' export menu also offers Account plan and Proposal directly. Node: `npm run briefs -- --kind account-plan|proposal|category-deck …`.

**Gamma.** `POST /api/gamma/generate` proxies Gamma's public API (same shape as the Hub): submits Markdown with `textMode: preserve` and `cardSplit: inputTextBreaks` so each § section becomes a card, polls to completion, returns the gamma URL. Needs `GAMMA_API_KEY` (Render env var, `sync: false` in render.yaml; or a local `.env`, which the server reads without a dependency). Without a key the endpoint returns 503 with help text, the UI disables the Gamma buttons, and the Markdown export is the paste-into-Gamma path.

## Valuation lab (/lab)

A training environment for leading IP and music-catalog valuations through a full mock engagement: **Pitch** (SCR framing, economic perimeter, the five price-deciding questions, staffing and fees) → **Plan** (workstreams and timeline, prioritised information request list, hypotheses) → **Execute** (nine steps: rights inventory and concentration, gross-to-net and mix, quality of earnings, stream-level forecast, risk-built discount rate and DCF, multiples and sensitivity, findings to protections, price bridge, model review) → **Deliver** (football field, concluded range and offer, "what must be true" for the seller's ask, scorecard, IC memo export to Word, slides, text, Markdown, or Gamma).

- **Cases** live in `src/data/cases/` (first: `northstar.js`, adapted from the operator's Perplexity practice case). Each case carries the data room, the *draft model as a junior team presented it* (`asPresented`), and a reviewing director's benchmark. The trainee starts on the draft and has to find its problems.
- **Engine** `src/utils/valuation.js` is pure and Node-tested (`npm run test:valuation`, 18 assertions against hand calculations). Every figure is computed from inputs; normalisation adjustments land in exactly one stream, so the forecast base reconciles to normalised LTM by construction. `reviewChecks()` recomputes the draft and reports each discrepancy.
- **The Northstar draft's real errors** (verified by recomputation): inventory sums to $1,601K vs $1,501K LTM; top-10 share is 53.5% not 43%; 3-year CAGR is 9.3% not 8.5%; a $12K buyer synergy sits inside standalone earnings; the $34K viral adjustment is deducted twice and the gap relabelled "$43K leakage"; stated forecast totals exceed their own growth assumptions; the terminal PV is $5.22M not $5.9M, so the $11.0M DCF is really $10.3M and implies 7.3x — below the case's own 7.5x floor.
- **State** `src/utils/labState.js` (defaults, benchmark, progress, scorecard) persisted per case in localStorage by `hooks/useLabState.js`. Reviewer mode shows director notes everywhere; "Load reviewer answers" fills the full benchmark. **Documents** `src/utils/labDocs.js`: pitch memo, workplan, IC valuation memo on the shared block model.
- Lab pages are lazy chunks. All figures are fictional; multiples and discount rates are case assumptions, not market benchmarks.

### Cases and kinds

Cases live in `src/data/cases/` and are registered in `cases/index.js`. Each declares a `kind` that selects its engine (`utils/labEngines.js`), execution steps, deliver stage, and scorecard rows; Pitch and Plan are shared and read their copy, KPIs, fee base, timeline length, and hypothesis tests from the case.

| Case | Kind | Engine | Deliverable |
| --- | --- | --- | --- |
| Northstar Songs & Masters | `valuation` | `utils/valuation.js` · `npm run test:valuation` | IC valuation memo |
| Halcyon + Brightwater | `pmi` | `utils/pmi.js` · `npm run test:pmi` | 100-day integration board memo |
| Cadence Royalty Funding 2026-1 | `abs` | `utils/abs.js` · `npm run test:abs` | Investment committee credit memo |
| Beacon Rights Services | `carveout` | `utils/carveout.js` · `npm run test:carveout` | IC carve-out memo |

**Halcyon + Brightwater (Sprint 10)** is a publisher roll-up post-merger integration: a $540M acquisition carrying a $70M premium, approved on a banker synergy case of $20M run rate "worth $186M at 9.3x". **Execute** has eight steps: deal and cost baseline by function, synergy register (keep or reject; run rate, Y1–Y4 phasing, one-off cost, probability, one-time backlog), dis-synergies and one-off costs (TSA, retention, IMO, mandate working capital), synergy value (phased, risk-weighted NPV with optional perpetuity vs run rate × multiple; premium coverage, cash break-even, what must be true), Day 1 / Day 100 / Year 1 sequencing, organisation and retention (decisions drive retention cost and the writer-attrition dis-synergy), risks to mitigations, and a ten-point red-team of the banker case. **Deliver** commits a run-rate target and one-off budget against a downside / base / upside range, then scores the engagement.

- **Engine** `src/utils/pmi.js` is pure and Node-tested (`npm run test:pmi`, 24 checks including annuity and perpetuity hand calculations, TSA spill, people-driven attrition, a 100% reviewer score, and Word/slides renders). One-off costs are never probability-weighted.
- **The banker case's planted errors**: $0.5M double count between the system and royalty-ops levers; $0.3M of founder cost already out of the baseline; every lever at 100% from Day 1; $2.0M of one-offs against a realistic $16.3M (1.14x run rate); a one-time $3.0M unmatched backlog capitalised as run rate; sub-publishing savings gross of in-house cost and ahead of notice windows; admin-fee uplift with no renewal churn; a revenue multiple on uncosted savings; no year-1 cash trough. Re-based: $14.3M gross, $10.0M risk-weighted net, NPV $68.4M, 0.98x the premium, cash break-even in year 3.
- **State** `src/utils/pmiState.js` (steps, progress, scorecard rows); **documents** `src/utils/pmiDocs.js` (board memo).
- `npm test` runs all four engine suites.

**Cadence Royalty Funding 2026-1 (Sprint 11)** is an investor-side collateral review of a music-royalty ABS: $220M Class A (6.00%, 2% amortisation) and $40M Class B (8.50%) secured by 38,000 compositions and 6,400 masters, ARD year 6, legal final year 25, cash trap below 1.25x and rapid amortisation below 1.15x. The trainee reviews it for a $100M anchor Class A investor. **Execute** has nine steps: data tape tie-out and normalisation, eligibility screen, concentration limits on the eligible pool, collateral cash flow after servicing and senior expenses, collateral value and LTV (with a rate × trend grid), the annual note waterfall (A interest and principal, B interest subordinated under rapid amortisation and post-ARD, liquidity reserve draws and refills, cash trap and sweep), stress scenarios with break-even haircuts and the maximum Class A that passes DSCR, LTV, and severe-stress tests, findings to structural protections, and a ten-point offering review. **Deliver** is the credit recommendation: invest, invest with conditions, or decline; maximum Class A; conditions; credit memo export.

- **Engine** `src/utils/abs.js` is pure and Node-tested (`npm run test:abs`, 22 checks including cash conservation in every waterfall year, the closed-form cash-trap break-even, the 22-year appraisal annuity, and that the maximum Class A passes while $1M more fails). The scorecard tests the waterfall at the offered structure, so trainees can explore other sizes freely.
- **The offering's planted problems**: $0.8M of accrued, unreceived royalties on the tape; $1.8M of one-offs and $1.6M of pro-forma add-backs inside the $39.6M "pro forma LTM"; termination, consent, and litigation defects treated as eligible; concentration limits written into the indenture but not applied; DSCR of 1.89x measured before the servicing fee and senior expenses; a flat trend on a catalog declining about 1% a year; a 55% Class A LTV on a $400M appraisal of the unadjusted tape; a reserve equal to six months of Class A interest described as six months of debt service; and a 10% sponsor stress. Re-based: $30.6M borrowing base, 1.33x DSCR (6% haircut to trap), $264M collateral value, 83% Class A LTV, a Class A loss in the severe scenario, and a $145M maximum Class A.
- **State** `src/utils/absState.js`; **documents** `src/utils/absDocs.js` (credit memo).

**Beacon Rights Services (Sprint 12)** is buy-side carve-out diligence on a performing-rights society's licensing and data division: $128M of revenue, $35M of reported EBITDA on parent allocations, 62% of revenue billed to the parent, 70% being sold with a seven-year services agreement back, guided at about $340M on $38.0M of vendor "pro forma adjusted EBITDA". **Execute** has eight steps: read the carve-out P&L, test revenue quality and related-party pricing, build standalone corporate costs function by function, bridge reported EBITDA to standalone, cost separation and the TSA in both directions, price the business (multiple on standalone EBITDA less separation and TSA, cheque for the stake, what must be true for the guide), findings to protections, and a ten-point vendor-pack review. **Deliver** is an enterprise-value range, a recommended value, conditions, and the IC memo.

- **Engine** `src/utils/carveout.js` is pure and Node-tested (`npm run test:carveout`, 20 checks; the standalone bridge line is computed from the cost build, so editing a function cost flows straight through to EBITDA and value).
- **The vendor pack's planted traps**: parent allocations of $9.0M presented as a standalone cost base ($13.4M when built bottom-up); anchor revenue at cost plus 8% that resets $3.5M lower at arm's length; a completed implementation inside recurring revenue; society capitalisation policy flattering EBITDA by $2.0M; a retention add-back that recurs in substance; and no separation cost, TSA, or stranded cost anywhere in the price. Re-based: $25.1M standalone EBITDA (19.6% margin), $18.6M separation, $5.7M TSA present value, $202M enterprise value and a $141M cheque for 70% — 41% below the guide, which needs 14.5x standalone.
- **State** `src/utils/carveState.js`; **documents** `src/utils/carveDocs.js` (carve-out memo).

## Prospecting & coverage (/prospecting)

Sprint 13. Turns the corpus into a target list. `src/utils/prospect.js` places all 178 sellable entities into one of nine selling segments (four buy-side, five sell-side) and scores each out of 100, with the reasons visible:

- **Fit (0–40)** — tier within type, size band from the headline metric, PEPI categories with named hypotheses, role breadth.
- **Timing (0–40)** — dated triggers, each decayed across its own window: deals from `transactions.js`, ABS anticipated repayment dates still ahead, society reform milestones from `pros.js`, a sponsor's portfolio-company activity at reduced weight, and live news signals counted from `/api/news`.
- **Access (0–20)** — Intelligence Hub cross-links, sponsor overlap, and the operator's own recorded relationship. Nothing else moves it: the app holds no contact records.

Tier A is 55+ or a live trigger with real access, Tier B 40+, and the cuts are set against the live distribution so Tier A stays a week of calls (currently 5 without news signals, 8 with them).

`src/utils/outreach.js` drafts what the operator actually sends: a LinkedIn connection note inside the 300-character limit, a LinkedIn message, an email subject and body, and two follow-ups — built from the account's own trigger written from its side ("your $500M securitisation through Canon Music Issuer Trust in April"), the hook for that segment and service line (`data/playbooks.js`, versioned), and the buying role's opening question (`data/personas.js`, roles only, never people). Every draft is copy-to-clipboard; the module drafts and never sends.

The page has two views — a coverage matrix (segment × tier, with how many priority accounts have been worked) and a sortable target list with an account panel carrying the score breakdown, triggers with sources, the composer, the drafts, and a status/relationship/notes record. Records live in localStorage only (`mm-prospect-v1`). Engine and drafts are Node-tested: `npm run test:prospect`, 21 checks.

## Sibling cross-links (src/data/siblings.js)

Two kinds of Hub page are mapped. Sponsors profiled in both apps (Blackstone, KKR, Apollo, Silver Lake, Carlyle, Ares, Sixth Street, Bain, Francisco Partners, BlackRock) link to their PE Academy page from `/pe/:id`, the PEPI lens rail, and the financial brief. Companies in the Hub's Sports & Live Entertainment segment (Live Nation/Ticketmaster, Endeavor, TKO via WWE), its Studios & Streaming segment (UMG, WMG, SiriusXM, iHeartMedia, Spotify), and its Social & UGC segment (YouTube, TikTok, Meta) link to their `/company/:segment/:id` page from an "Also in Intelligence Hub" rail on `/entities/:id` and from every brief's Profile section. Ids were confirmed against the Hub's data files and the routes against its live host (am-intelligence-hub.onrender.com — the Hub README's `mainframe.onrender.com` is stale); read-only, the Hub is never edited from here.

## Consulting overlay (src/data/consulting.js)

The A&M PEPI lens, mirroring the Intelligence Hub's client-category × service-line pattern. Five service lines (Diligence · Carve-out · Value creation · PMI · Strategy) each described in music terms, and seven client categories (Catalog investors · Label PE sponsors · Publisher roll-ups · Independent distributors · PRO modernisation · Live entertainment operators · Music-AI investors). Category membership is COMPUTED from entity type/roles (`rule`) plus a short `explicit` list, so it tracks entities.js; deals and volume come from transactions.js; `topics` link to `/news?topic=`. Each category carries a thesis, engagement triggers, KPIs, and per-line engagement hypotheses (39 total). `getConsultingContext(entityId)` powers the "PEPI lens" rail on entity pages and biases the hypotheses toward the entity's recent deal types.

## Live news (server/)

`node server/index.js` (:3002 in dev, `$PORT` on Render) serves the build and the news layer. `server/sources.json` is the hot-editable source list (RSS feeds, Google News queries, SEC EDGAR CIKs, refresh interval); restart after editing. `server/signals.js` GENERATES entity signals from `src/data/entities.js` (name + acronym + a short alias list; generic parent names are blocklisted so "Apple" never tags Apple Inc. news) and hand-tunes 11 topic signals with whole-word matching. `server/relevanceScorer.js` tags each item with `entities[]`, `types[]`, `topics[]`, and a 0–100 score. REST: `/api/news?q=&entity=&type=&topic=&source=&kind=&limit=`, `/api/news/stats`, `/api/news/sources`, `POST /api/news/refresh`. WebSocket at `/ws` pushes new items. In-memory, restart-safe, no keys. The Vite dev server proxies `/api` and `/ws` to :3002. `useNewsStream` distinguishes **backend unreachable** from **no matches**; the `/news` page and the entity "In the news" rail say which.

## Verification discipline

Sprint 3 ran a sourced verification pass (web, 2026-09-14) over the facts transcribed from the kickoff brief. Corrections landed in the data with citations: Concord's owner was Michigan Retirement Systems / Great Mountain Partners (not Bain) and Concord combined with BMG on 1 Sep 2026; SESAC stayed with Blackstone (not Ares) and issued an $889M WBS; Hellman & Friedman's GMR deal was 2024 at $3.3B; AWAL/Sony was cleared, not blocked; See Tickets went to CTS Eventim; ASM Global to Legends; Live Nation lost the states' jury trial in April 2026 after the DOJ settled; UMG closed Downtown in Feb 2026; Sony Music Publishing bought Recognition (ex-Hipgnosis) in Jul 2026; Primary Wave bought Kobalt in Jul 2026. A second pass (same day) cleared the remaining 38 entity flags with sources: UMG's board rejected Pershing Square (29 May 2026); Legends closed ASM Global (Aug 2024, $2.3B); Leiweke left OVG after the Moody Center indictment (Jul 2025); Live Nation fully bought out Bonnaroo (2019); MDX is a SoundExchange portal, not a Nashville startup; Gaana went to ENIL for ₹25 lakh (Dec 2023); Great Mountain Partners is New Haven-based and closed a $600M single-investor fund (Dec 2025); Bending Spoons listed in July 2026; GEMA beat both OpenAI (Nov 2025) and Suno (Jul 2026) in Munich. `verify` now marks only transaction values that are press estimates.

## Conventions

See [`CLAUDE.md`](CLAUDE.md).
