#!/usr/bin/env node
// Emits src/tokens.css from src/tokens.js. Runs automatically before `dev` and `build`.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { palette, themes, font, radius, layout, shadow, motion } from '../src/tokens.js'

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../src/tokens.css')
const lines = []
const push = (s = '') => lines.push(s)

push('/* GENERATED from src/tokens.js by scripts/build-tokens.mjs — do not edit. */')
push('/* Edit src/tokens.js, then `npm run tokens`. */')
push()

// Mode-stable ramps + fonts + radii → Tailwind @theme (utilities: bg-gold-400, font-display, rounded-lg…)
push('@theme {')
push('  --color-*: initial;')           // drop Tailwind's default palette; only ours exists
push('  --font-*: initial;')
push('  --radius-*: initial;')
push('  --shadow-*: initial;')
for (const [ramp, stops] of Object.entries(palette))
  for (const [stop, hex] of Object.entries(stops)) push(`  --color-${ramp}-${stop}: ${hex};`)
for (const [k, v] of Object.entries(font)) push(`  --font-${k}: ${v};`)
for (const [k, v] of Object.entries(radius)) push(`  --radius-${k}: ${v};`)
for (const [k, v] of Object.entries(shadow)) push(`  --shadow-${k}: ${v};`)
push(`  --ease-mm: ${motion.ease};`)
push('}')
push()

// Semantic roles, switched by [data-theme]. Dark is the default.
const emit = (selector, t) => {
  push(`${selector} {`)
  for (const [k, v] of Object.entries(t)) push(`  --mm-${k}: ${v};`)
  push('}')
}
emit(':root, [data-theme="dark"]', themes.dark)
emit('[data-theme="light"]', themes.light)
push()

// Expose semantic roles as Tailwind colour utilities (bg-ground-1, text-ink-2, border-line-1, text-accent…)
push('@theme inline {')
for (const k of Object.keys(themes.dark)) push(`  --color-${k}: var(--mm-${k});`)
push(`  --spacing-sidebar: ${layout.sidebar};`)
push(`  --spacing-content-max: ${layout.contentMax};`)
push(`  --spacing-gutter: ${layout.gutter};`)
push('}')
push()

writeFileSync(out, lines.join('\n') + '\n')
console.log(`tokens → ${out} (${lines.length} lines)`)
