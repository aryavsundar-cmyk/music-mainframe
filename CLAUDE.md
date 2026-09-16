# CLAUDE.md — Mainframe · Music

Working conventions for this repo. Mirrors how the sibling Mainframe apps run.

## Operator preferences
- **Terse responses.** No trailing recaps; the diff speaks.
- **Verify on preview before deploying.** Load the dev server (`.claude/launch.json` → `music-mainframe`, :5190), check console/network, check both themes, then push.
- **Comprehensive, multi-section commit messages** with a verification block.
- **Deploy = push to `main`.** Render auto-deploys from `render.yaml`. No other branches unless asked.
- Commits end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Design system is law
- `src/tokens.js` is the single source of truth. `src/tokens.css` is generated — never edit it.
- No hex values in components. Use the Tailwind utilities the tokens create (`bg-ground-1`, `text-ink-2`, `text-accent`, `border-line-1`, `text-money`…) or `var(--mm-*)`.
- Numbers go through `<Num kind>` / `utils/format.js`. Four kinds: money · count · pct · rate.
- One `primary` Button per view. Eyebrows numbered only in exports.
- Recording = gold, solid chain. Publishing = verdigris, dashed fan. Never "same diagram, different colour".
- Check `/design` after any token change; both themes. Every text role must clear 4.5:1 on ground-0…4 in both themes — `npm run test:contrast` enforces it, along with ink-ramp hierarchy, coloured text on its own tint, text on filled controls, and tokens.css being in sync. Never fix contrast in a component; fix the token.
- Lab explanations: plain-English definitions live in `data/glossary.js` (short · plain · worked example with real numbers · watch-out · related). Every execution step lists the terms it uses in its `terms` array, rendered by `components/lab/Concepts.jsx`; `/lab/glossary` is the searchable index. `npm run test:glossary` checks completeness, resolvable references, sentence length, and that no term is orphaned.

## Code
- React 19 + Vite 7 + Tailwind 4 (CSS-first `@theme`; no `tailwind.config.js`) + React Router 7 + Lucide. JSX, not TS.
- Relative imports carry `.js` / `.jsx` extensions (Node ESM compatibility for scripts).
- Backend lives in `server/` at repo root, never under `src/`. `server/sources.json` (Sprint 5) stays JSON.
- Exports: `utils/brief.js` is the ONLY data builder; renderers (`briefText/Docx/Pptx.js`) consume it and never hard-code a section list. Browser entry is `utils/download.js` (lazy-imports docx/pptxgenjs); Node entry is `scripts/generate-briefs.mjs`. Add a section to the builder, never to a renderer. Account plans, proposals, and sector decks (`utils/accountPlan.js`, `proposal.js`, `categoryDeck.js`) use the same block model; Gamma goes through `server/index.js` `/api/gamma/generate` (needs `GAMMA_API_KEY`). Rate card numbers in `data/rateCard.js` are indicative placeholders — never present them as A&M's actual rates.
- Data files: typed empty defaults, never `null`. Every record carries `asOf` + `sources[]`. A fact from the brief or memory that isn't cited gets `verify: true` and a dated note; a verification pass sources it or drops it. Never silently overwrite a sourced figure with a remembered one.
- Lab: numbers come only from the case's engine — `utils/valuation.js` (kind `valuation`), `utils/pmi.js` (kind `pmi`), `utils/abs.js` (kind `abs`), or `utils/carveout.js` (kind `carveout`); never hard-code a computed figure in UI or reviewer text — interpolate from the model. Run `npm test` after touching an engine or a case. New cases go in `src/data/cases/`, are registered in `cases/index.js`, declare `kind`, and carry `asPresented` (the flawed draft) and `benchmark` answers. Shared pitch/plan copy is case data (`copy`, `briefKpis`, `feeBase`, `weeks`, `question.test`), never literals in `PitchStage`/`PlanStage`. A new kind adds an engine, a `labEngines.js` entry, `*State.js` rows, Execute/Deliver stages, and a docs builder.
- Prospecting: scores come only from `utils/prospect.js` and drafts only from `utils/outreach.js` — never hard-code a score, a tier, or a message in the page. Hooks live in `data/playbooks.js` (versioned; retire with a note), roles in `data/personas.js`. The module NEVER stores a named contact, sends anything, or leaves the browser: status, relationship strength, and notes are localStorage only. Run `npm test` after touching the engine or the data.
- Uptime: `npm run health` checks a running instance (answers · news cache not empty · last fetch recent · no fetch error) and exits non-zero with the reason; `.github/workflows/health.yml` runs it every 30 minutes and opens one `health`-labelled issue on failure. Locally, `npm run server:watch` supervises `server/index.js` and restarts it with backoff, giving up after five fast crashes so a real fault stays visible. Render restarts the single web service itself against `healthCheckPath`.
- Sibling apps (`~/Desktop/A&M/Agencies/am-intelligence-hub`, `…/programmatic-ecosystem`) are convention reference only. Reuse shapes (`PATTERNS-FROM-SIBLINGS.md` in the kickoff packet), never content. Never edit them from this session.

## Non-goals (Sprints 0–3)
No royalty calculator · no artist tooling · no playback embeds · no sync marketplace · no song-level PRO lookup · no AI music generation.

## Sprint map
0 foundation · 1 entities · 2 flows · 3 deals/PE/ABS/catalogs · 4 PROs + DSPs · 5 live news · 6 consulting overlay · 7 exports + Hub cross-links · 8 deliverables (account plans, proposals, sector decks, Gamma) · 9 valuation lab · 10 publisher roll-up PMI case · 11 royalty ABS collateral review case · 12 PRO carve-out case · 13 prospecting & coverage module · 14 trigger feed, account pages, health watcher · 15 accessible contrast + lab glossary — all shipped.
