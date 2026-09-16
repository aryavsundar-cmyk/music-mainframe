#!/usr/bin/env node
/**
 * test-contrast.mjs — every text colour in the design system must be readable on every surface it can sit on.
 * WCAG 2.1 contrast, both themes. `npm run test:contrast`
 *
 * Rules: text roles clear 4.5:1 on ground-0…4; the ink ramp stays monotonic so hierarchy survives; coloured text
 * clears 4.5:1 on its own tinted surface; text on a filled button clears 4.5:1; and tokens.css matches tokens.js.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { themes } from '../src/tokens.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }

const hex = (h) => { const s = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)) }
const rgba = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(Number); return { rgb: p.slice(0, 3), a: p[3] ?? 1 } }
const flatten = (c, bg) => { if (c.startsWith('#')) return hex(c); const r = rgba(c); return r.rgb.map((v, i) => v * r.a + bg[i] * (1 - r.a)) }
const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

const GROUNDS = ['ground-0', 'ground-1', 'ground-2', 'ground-3', 'ground-4']
const TEXT = ['ink-1', 'ink-2', 'ink-3', 'ink-4', 'accent', 'secondary', 'danger', 'money', 'count', 'pct', 'rate', 'recording', 'publishing']
const AA = 4.5

for (const mode of ['dark', 'light']) {
  const theme = themes[mode]
  t(`${mode}: every text role clears ${AA}:1 on every ground`, () => {
    for (const fg of TEXT) for (const g of GROUNDS) {
      const r = ratio(flatten(theme[fg], hex(theme[g])), hex(theme[g]))
      assert.ok(r >= AA, `${mode} ${fg} on ${g} is ${r.toFixed(2)}:1 (needs ${AA})`)
    }
  })
  t(`${mode}: the ink ramp keeps its hierarchy`, () => {
    const g = hex(theme['ground-1'])
    const rs = ['ink-1', 'ink-2', 'ink-3', 'ink-4'].map((k) => ratio(hex(theme[k]), g))
    for (let i = 1; i < rs.length; i++) assert.ok(rs[i] < rs[i - 1], `${mode} ink-${i + 1} (${rs[i].toFixed(2)}) must read quieter than ink-${i} (${rs[i - 1].toFixed(2)})`)
    assert.ok(rs[0] >= 10, `${mode} primary text should be emphatic, got ${rs[0].toFixed(2)}`)
  })
  t(`${mode}: coloured text clears ${AA}:1 on its own tinted surface`, () => {
    const card = hex(theme['ground-1'])
    for (const [fg, soft] of [['accent', 'accent-soft'], ['secondary', 'secondary-soft'], ['danger', 'danger-soft']]) {
      const surface = flatten(theme[soft], card)
      const r = ratio(flatten(theme[fg], surface), surface)
      assert.ok(r >= AA, `${mode} ${fg} on ${soft} is ${r.toFixed(2)}:1`)
    }
  })
  t(`${mode}: text on a filled control clears ${AA}:1`, () => {
    for (const [ink, fill] of [['accent-ink', 'accent'], ['secondary-ink', 'secondary']]) {
      const r = ratio(hex(theme[ink]), hex(theme[fill]))
      assert.ok(r >= AA, `${mode} ${ink} on ${fill} is ${r.toFixed(2)}:1`)
    }
  })
  t(`${mode}: hairlines stay visible against their surfaces`, () => {
    for (const line of ['line-1', 'line-2', 'line-3']) for (const g of ['ground-0', 'ground-1']) {
      const bg = hex(theme[g])
      const r = ratio(flatten(theme[line], bg), bg)
      assert.ok(r >= 1.08, `${mode} ${line} on ${g} is ${r.toFixed(3)}:1 — invisible`)
    }
  })
}

t('tokens.css is in sync with tokens.js', () => {
  const before = fs.readFileSync(path.join(root, 'src/tokens.css'), 'utf8')
  const gen = fs.readFileSync(path.join(root, 'scripts/build-tokens.mjs'), 'utf8')
  assert.ok(gen.includes('tokens.css'), 'the generator writes tokens.css')
  for (const mode of ['dark', 'light']) for (const k of ['ink-3', 'ink-4', 'accent', 'danger']) {
    const v = themes[mode][k]
    assert.ok(before.includes(v), `tokens.css is stale: ${mode} ${k} (${v}) is not in it — run npm run tokens`)
  }
})

console.log(`\n${n} checks passed`)
for (const mode of ['dark', 'light']) {
  const theme = themes[mode]; const worst = (k) => Math.min(...GROUNDS.map((g) => ratio(flatten(theme[k], hex(theme[g])), hex(theme[g]))))
  console.log(`${mode}: ink ${['ink-1', 'ink-2', 'ink-3', 'ink-4'].map((k) => worst(k).toFixed(1)).join(' / ')} · accent ${worst('accent').toFixed(1)} · secondary ${worst('secondary').toFixed(1)} · danger ${worst('danger').toFixed(1)} (worst ground, AA needs 4.5)`)
}
