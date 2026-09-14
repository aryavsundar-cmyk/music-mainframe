# CLAUDE.md — Mainframe · Music

Working conventions for this repo. Mirrors how the sibling Mainframe apps run.

## Operator preferences
- **Terse responses.** No trailing recaps; the diff speaks.
- **Verify on preview before deploying.** Load the dev server (`.claude/launch.json` → `music-mainframe`, :5190), check console/network, check both themes, then push.
- **Comprehensive, multi-section commit messages** with a verification block.
- **Deploy = push to `main`.** Render auto-deploys from `render.yaml`. No other branches unless asked.
- Commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Design system is law
- `src/tokens.js` is the single source of truth. `src/tokens.css` is generated — never edit it.
- No hex values in components. Use the Tailwind utilities the tokens create (`bg-ground-1`, `text-ink-2`, `text-accent`, `border-line-1`, `text-money`…) or `var(--mm-*)`.
- Numbers go through `<Num kind>` / `utils/format.js`. Four kinds: money · count · pct · rate.
- One `primary` Button per view. Eyebrows numbered only in exports.
- Recording = gold, solid chain. Publishing = verdigris, dashed fan. Never "same diagram, different colour".
- Check `/design` after any token change; both themes.

## Code
- React 19 + Vite 7 + Tailwind 4 (CSS-first `@theme`; no `tailwind.config.js`) + React Router 7 + Lucide. JSX, not TS.
- Relative imports carry `.js` / `.jsx` extensions (Node ESM compatibility for scripts).
- Backend lives in `server/` at repo root, never under `src/`. `server/sources.json` (Sprint 5) stays JSON.
- Lazy-load heavy export renderers (`pptxgenjs`, `docx`) when they arrive; keep the core bundle small.
- Data files: typed empty defaults, never `null`. Every record carries `asOf` + `sources[]`. A fact from the brief or memory that isn't cited gets `verify: true` and a dated note; a verification pass sources it or drops it. Never silently overwrite a sourced figure with a remembered one.
- Sibling apps (`~/Desktop/A&M/Agencies/am-intelligence-hub`, `…/programmatic-ecosystem`) are convention reference only. Reuse shapes (`PATTERNS-FROM-SIBLINGS.md` in the kickoff packet), never content. Never edit them from this session.

## Non-goals (Sprints 0–3)
No royalty calculator · no artist tooling · no playback embeds · no sync marketplace · no song-level PRO lookup · no AI music generation.

## Sprint map
0 foundation · 1 entities · 2 flows · 3 deals/PE/ABS/catalogs · 4 PROs + DSPs (all shipped) · 5 live news · 6 consulting overlay · 7+ sibling cross-links.
