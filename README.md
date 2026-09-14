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
| `/entities` | structure | Sprint 1 |
| `/flows` · `/flows/recording` · `/flows/publishing` | structure | Sprint 2 |
| `/deals` · `/pe` · `/abs` · `/catalogs` | money | Sprint 3 |
| `/pros` · `/dsps` | rights | Sprint 4 |
| `/news` | live | Sprint 5 |
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

- `entities.js` — one flat table. `type` is the primary bucket (facet); `roles[]` holds the rest (Sony = label + publisher + distributor). `tier` = scale within type, never prestige.
- `transactions.js` — one table for catalog sales, PE rounds, ABS, debt, take-privates, M&A, differentiated by `type`. `/deals`, `/abs`, `/catalogs` are filtered views. Non-entity sellers use `counterparty { name, kind, entityId? }`.
- `flows.js` — exports both `recording` and `publishing`.
- `peFunds.js`, `pros.js`, `fundamentals.js` — profile extensions keyed by entity id, with typed empty defaults (never null).
- Every record: `asOf` (ISO date) + `sources: [{ label, url }]`.
- Relative imports carry `.js` so Node scripts (exports, batch generation) can import data files directly.

## Conventions

See [`CLAUDE.md`](CLAUDE.md).
