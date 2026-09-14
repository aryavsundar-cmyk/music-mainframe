/**
 * Mainframe · Music — design tokens.
 *
 * SINGLE SOURCE OF TRUTH. Every colour, face, size, and radius in the app resolves here.
 *   - `npm run tokens` (auto-runs before dev/build) writes src/tokens.css from this file.
 *   - Tailwind 4 reads tokens.css (@theme) → utilities like `bg-ground-1 text-ink-2 text-accent`.
 *   - Components import this file directly when they need a value in JS (charts, SVG flows).
 *
 * Concept: both accents are brass. Polished → lacquer gold (recording rights, money).
 * Oxidised → verdigris (publishing rights, registries, counts). Warm/cool split = two flows.
 * Grounds are shellac (dark, default) and manuscript paper (light). Not slate. Not cream+terracotta.
 */

// ─── 1. Base palette (mode-stable hex) ────────────────────────────────────────
export const palette = {
  shellac: { 0: '#141210', 1: '#1B1815', 2: '#23201A', 3: '#2C2822', 4: '#37322A' },
  paper:   { 0: '#F4F1EA', 1: '#FAF8F3', 2: '#FFFFFF', 3: '#FFFFFF', 4: '#ECE8DF' },
  ink: {
    // warm neutrals, light → dark
    50: '#F4F1EA', 100: '#DED9CF', 200: '#B8B0A3', 300: '#9C958A', 400: '#7E776C',
    500: '#6E675C', 600: '#524C43', 700: '#3A352E', 800: '#26221D', 900: '#1A1714',
  },
  gold: {
    200: '#F0D89A', 300: '#E6C27A', 400: '#D4A24C', 500: '#B8862F',
    600: '#8A6420', 700: '#5E4414', 800: '#3A2A08', 900: '#241A04',
  },
  verdigris: {
    200: '#B4D8CD', 300: '#8FBFB1', 400: '#5E9C8A', 500: '#43836F',
    600: '#2F6F62', 700: '#1F4F45', 800: '#0E2A24', 900: '#081A16',
  },
  // VU-meter overdrive. Litigation, over-limit, destructive. Never decorative.
  vu: { 300: '#EE8A7E', 400: '#D2483A', 600: '#A8362B', 800: '#5C1A13' },
}

// ─── 2. Semantic roles, per mode ──────────────────────────────────────────────
// Components consume ONLY these (via Tailwind utilities or `theme.dark.x` in JS).
export const themes = {
  dark: {
    'ground-0': palette.shellac[0],   // page
    'ground-1': palette.shellac[1],   // card
    'ground-2': palette.shellac[2],   // panel / sidebar
    'ground-3': palette.shellac[3],   // popover / hover
    'ground-4': palette.shellac[4],   // pressed / selected
    'ink-1': palette.ink[50],         // primary text
    'ink-2': palette.ink[200],        // secondary
    'ink-3': palette.ink[400],        // muted / captions
    'ink-4': palette.ink[600],        // disabled / hairline labels
    'line-1': 'rgba(244, 241, 234, 0.08)',
    'line-2': 'rgba(244, 241, 234, 0.16)',
    'line-3': 'rgba(244, 241, 234, 0.32)',
    accent: palette.gold[400],
    'accent-hover': palette.gold[300],
    'accent-ink': palette.gold[800],                 // text ON accent fill
    'accent-soft': 'rgba(212, 162, 76, 0.12)',       // tinted surface
    'accent-line': 'rgba(212, 162, 76, 0.40)',
    secondary: palette.verdigris[400],
    'secondary-hover': palette.verdigris[300],
    'secondary-ink': palette.verdigris[800],
    'secondary-soft': 'rgba(94, 156, 138, 0.14)',
    'secondary-line': 'rgba(94, 156, 138, 0.40)',
    danger: palette.vu[400],
    'danger-soft': 'rgba(210, 72, 58, 0.14)',
    // Domain aliases — the two rights flows, by name, so flow code never says "gold"
    recording: palette.gold[400],
    publishing: palette.verdigris[400],
    // Numeric treatments (see `numeric` below)
    money: palette.gold[400],
    count: palette.verdigris[400],
    pct: palette.ink[50],
    rate: palette.ink[200],
  },
  light: {
    'ground-0': palette.paper[0],
    'ground-1': palette.paper[1],
    'ground-2': palette.paper[2],
    'ground-3': palette.paper[3],
    'ground-4': palette.paper[4],
    'ink-1': palette.ink[900],
    'ink-2': palette.ink[500],
    'ink-3': palette.ink[400],
    'ink-4': palette.ink[200],
    'line-1': 'rgba(26, 23, 20, 0.08)',
    'line-2': 'rgba(26, 23, 20, 0.16)',
    'line-3': 'rgba(26, 23, 20, 0.32)',
    accent: palette.gold[600],
    'accent-hover': palette.gold[700],
    'accent-ink': palette.paper[0],
    'accent-soft': 'rgba(138, 100, 32, 0.10)',
    'accent-line': 'rgba(138, 100, 32, 0.40)',
    secondary: palette.verdigris[600],
    'secondary-hover': palette.verdigris[700],
    'secondary-ink': palette.paper[0],
    'secondary-soft': 'rgba(47, 111, 98, 0.10)',
    'secondary-line': 'rgba(47, 111, 98, 0.40)',
    danger: palette.vu[600],
    'danger-soft': 'rgba(168, 54, 43, 0.10)',
    recording: palette.gold[600],
    publishing: palette.verdigris[600],
    money: palette.gold[600],
    count: palette.verdigris[600],
    pct: palette.ink[900],
    rate: palette.ink[500],
  },
}

// ─── 3. Typography ────────────────────────────────────────────────────────────
// Editorial serif for display · technical sans for UI · mono for IDs and every number.
export const font = {
  display: "'Instrument Serif', 'Iowan Old Style', Georgia, 'Times New Roman', serif",
  sans: "'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace",
}

export const type = {
  eyebrow: { family: 'sans', size: '0.6875rem', weight: 500, tracking: '0.14em', transform: 'uppercase', line: 1.2 },
  display: { family: 'display', size: '3rem', weight: 400, tracking: '-0.01em', line: 1.02 },
  h1: { family: 'display', size: '2.25rem', weight: 400, tracking: '-0.01em', line: 1.08 },
  h2: { family: 'display', size: '1.625rem', weight: 400, tracking: '0', line: 1.18 },
  h3: { family: 'sans', size: '1.0625rem', weight: 500, tracking: '0', line: 1.3 },
  lede: { family: 'sans', size: '1.0625rem', weight: 400, tracking: '0', line: 1.55 },
  body: { family: 'sans', size: '0.9375rem', weight: 400, tracking: '0', line: 1.6 },
  small: { family: 'sans', size: '0.8125rem', weight: 400, tracking: '0', line: 1.5 },
  micro: { family: 'sans', size: '0.6875rem', weight: 400, tracking: '0.02em', line: 1.4 },
  data: { family: 'mono', size: '0.8125rem', weight: 400, tracking: '0', line: 1.5, tabular: true },
  stat: { family: 'mono', size: '1.75rem', weight: 400, tracking: '-0.01em', line: 1.1, tabular: true },
  statLg: { family: 'mono', size: '2.5rem', weight: 400, tracking: '-0.02em', line: 1.05, tabular: true },
}

// ─── 4. Numeric treatments ────────────────────────────────────────────────────
// Four kinds of number on every page; each is visually distinct without a legend.
//   money  — deal values, AUM, revenue      gold · mono · compact ($1.8B)
//   count  — songs, masters, subscribers    verdigris · mono · compact (62K)
//   pct    — splits, market share           ink-1 · mono · one decimal (5.4%)
//   rate   — per-stream payouts, coupons    ink-2 · mono · precise ($0.0032 · 5.40%)
export const numeric = {
  money: { color: 'money', font: 'mono', format: 'compact-currency' },
  count: { color: 'count', font: 'mono', format: 'compact-integer' },
  pct: { color: 'pct', font: 'mono', format: 'percent-1dp' },
  rate: { color: 'rate', font: 'mono', format: 'precise' },
}

// ─── 5. Space · radius · elevation · motion ───────────────────────────────────
export const space = { 0: '0', 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px', 8: '32px', 10: '40px', 12: '48px', 16: '64px', 20: '80px' }
export const radius = { sm: '4px', md: '8px', lg: '12px', xl: '16px', pill: '999px' }
export const layout = { sidebar: '232px', contentMax: '1280px', gutter: '32px' }
// Dark ground: elevation is expressed by lighter ground + hairline, not shadow.
export const shadow = {
  none: 'none',
  panel: '0 1px 0 rgba(0,0,0,0.20), 0 8px 24px rgba(0,0,0,0.28)',
  popover: '0 2px 6px rgba(0,0,0,0.22), 0 12px 32px rgba(0,0,0,0.36)',
}
export const motion = { fast: '120ms', base: '200ms', slow: '320ms', ease: 'cubic-bezier(0.2, 0, 0, 1)' }

// ─── 6. Flow language (Sprint 2 consumes) ─────────────────────────────────────
// Two rights domains, two rhythms. Recording is a chain; publishing fans out and collects in.
export const flows = {
  recording: { label: 'Recording', color: 'recording', shape: 'chain', stroke: 2, dash: 'none' },
  publishing: { label: 'Publishing', color: 'publishing', shape: 'fan', stroke: 2, dash: '6 4' },
}

export default { palette, themes, font, type, numeric, space, radius, layout, shadow, motion, flows }
