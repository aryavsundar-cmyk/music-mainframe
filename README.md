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

## Consulting overlay (src/data/consulting.js)

The A&M PEPI lens, mirroring the Intelligence Hub's client-category × service-line pattern. Five service lines (Diligence · Carve-out · Value creation · PMI · Strategy) each described in music terms, and seven client categories (Catalog investors · Label PE sponsors · Publisher roll-ups · Independent distributors · PRO modernisation · Live entertainment operators · Music-AI investors). Category membership is COMPUTED from entity type/roles (`rule`) plus a short `explicit` list, so it tracks entities.js; deals and volume come from transactions.js; `topics` link to `/news?topic=`. Each category carries a thesis, engagement triggers, KPIs, and per-line engagement hypotheses (39 total). `getConsultingContext(entityId)` powers the "PEPI lens" rail on entity pages and biases the hypotheses toward the entity's recent deal types.

## Live news (server/)

`node server/index.js` (:3002 in dev, `$PORT` on Render) serves the build and the news layer. `server/sources.json` is the hot-editable source list (RSS feeds, Google News queries, SEC EDGAR CIKs, refresh interval); restart after editing. `server/signals.js` GENERATES entity signals from `src/data/entities.js` (name + acronym + a short alias list; generic parent names are blocklisted so "Apple" never tags Apple Inc. news) and hand-tunes 11 topic signals with whole-word matching. `server/relevanceScorer.js` tags each item with `entities[]`, `types[]`, `topics[]`, and a 0–100 score. REST: `/api/news?q=&entity=&type=&topic=&source=&kind=&limit=`, `/api/news/stats`, `/api/news/sources`, `POST /api/news/refresh`. WebSocket at `/ws` pushes new items. In-memory, restart-safe, no keys. The Vite dev server proxies `/api` and `/ws` to :3002. `useNewsStream` distinguishes **backend unreachable** from **no matches**; the `/news` page and the entity "In the news" rail say which.

## Verification discipline

Sprint 3 ran a sourced verification pass (web, 2026-09-14) over the facts transcribed from the kickoff brief. Corrections landed in the data with citations: Concord's owner was Michigan Retirement Systems / Great Mountain Partners (not Bain) and Concord combined with BMG on 1 Sep 2026; SESAC stayed with Blackstone (not Ares) and issued an $889M WBS; Hellman & Friedman's GMR deal was 2024 at $3.3B; AWAL/Sony was cleared, not blocked; See Tickets went to CTS Eventim; ASM Global to Legends; Live Nation lost the states' jury trial in April 2026 after the DOJ settled; UMG closed Downtown in Feb 2026; Sony Music Publishing bought Recognition (ex-Hipgnosis) in Jul 2026; Primary Wave bought Kobalt in Jul 2026. Remaining `verify` tags (38 entities) mark open questions with a date, not guesses.

## Conventions

See [`CLAUDE.md`](CLAUDE.md).
