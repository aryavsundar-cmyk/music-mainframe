#!/usr/bin/env node
/**
 * test-fx.mjs — dollars first, the reported figure always beside them, one dated rate.
 * `npm run test:fx`
 *
 * Sprint 42 replaced a rule the application had lived by since Sprint 30 — *never convert money* — with a
 * different one. That old rule was protecting against something real: a converted figure presented as though the
 * company had reported it is a false statement, and silently ranking euros against yen is a category error.
 *
 * But it was protecting the reader at the cost of the thing the canvas is for. £315.3M beside ¥2.1T beside
 * ₩333.6T is exactly what each company published and collectively unreadable; a comparison table that refused to
 * rank the three majors against each other was principled and useless.
 *
 * So the protection moved rather than disappeared, and this file is where it lives:
 *
 * 1. a converted figure is **never shown alone** — the reported one follows it in parentheses;
 * 2. the rate is **dated and sourced**, and one table serves the whole application;
 * 3. an unknown currency is **shown as reported**, never converted at a guess.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { USD_PER, FX_ASOF, FX_SOURCE, FX_NOTE, FX_SHORT, toUsd, convertible, CURRENCIES } from '../src/data/fx.js'
import { formatMoneyUsd, format } from '../src/utils/format.js'
import { ENTITIES } from '../src/data/entities.js'
import { listPros } from '../src/data/pros.js'
import { buildComparison, cellText } from '../src/utils/compare.js'

let n = 0
const t = (name, fn) => { fn(); n++; console.log(`✓ ${name}`) }
const SEC = JSON.parse(fs.readFileSync(new URL('../data/financials/sec.json', import.meta.url), 'utf8')).companies

t('one rate table, dated and sourced, covering every currency the canvas reports in', () => {
  assert.match(FX_ASOF, /^\d{4}-\d{2}-\d{2}$/, 'the rates must say which day they are for')
  assert.ok(FX_SOURCE.url.startsWith('https://www.federalreserve.gov/'), 'the rate needs a primary source')
  assert.ok(FX_SOURCE.label.includes(String(new Date(FX_ASOF).getUTCFullYear())), 'the label must carry the date')
  assert.equal(USD_PER.USD, 1)
  // Every currency any figure on the canvas is reported in has to be convertible, or that figure is orphaned.
  const used = new Set(ENTITIES.filter((e) => e.metrics?.revenue).map((e) => e.metrics.revenueCurrency || 'USD'))
  for (const r of listPros()) if (r.latest) used.add(r.currency)
  for (const code of used) assert.ok(convertible(code), `${code} is reported on the canvas and has no rate`)
  // Sanity, not precision: a wildly wrong rate is a typo, and a typo here is wrong everywhere at once.
  for (const code of CURRENCIES) {
    const rate = USD_PER[code]
    assert.ok(rate > 0 && rate < 100, `${code}: ${rate} dollars per unit is not a plausible rate`)
  }
  assert.ok(Math.abs(USD_PER.GBP - 1.34) < 0.15, 'sterling is about a dollar and a third')
  assert.ok(Math.abs(USD_PER.EUR - 1.15) < 0.15, 'the euro is a little over a dollar')
  assert.ok(USD_PER.JPY < 0.02 && USD_PER.KRW < 0.01, 'yen and won are fractions of a cent')
})

t('a converted figure never appears without the figure that was reported', () => {
  assert.equal(formatMoneyUsd(315.3e6, 'GBP'), '$421.6M (£315.3M)')
  assert.equal(formatMoneyUsd(12.5e9, 'EUR'), '$14.3B (€12.5B)')
  assert.equal(formatMoneyUsd(333.6e12, 'KRW'), '$240.4B (₩333.6T)')
  // A dollar figure has nothing to disclose, and a parenthetical repeating it would be noise.
  assert.equal(formatMoneyUsd(6.43e9, 'USD'), '$6.4B')
  assert.equal(formatMoneyUsd(6.43e9), '$6.4B')
  // Every non-dollar figure carries both, in both the compact and the full form.
  for (const [value, code] of [[315.3e6, 'GBP'], [2.1e12, 'JPY'], [11.75919e12, 'INR']]) {
    for (const opts of [{}, { full: true }, { digits: 2 }]) {
      const out = formatMoneyUsd(value, code, opts)
      assert.match(out, /^\$/, `${code}: dollars must come first`)
      assert.match(out, /\(.+\)$/, `${code}: the reported figure must follow in parentheses`)
    }
  }
  assert.equal(formatMoneyUsd(null, 'GBP'), '—')
  assert.equal(format.usd, formatMoneyUsd, 'the formatter is reachable as format.usd')
})

t('an unknown currency is shown as reported, never converted at a guess', () => {
  // Falling back to a rate of 1 would turn a missing rate into a wrong number that looks right, which is the
  // failure mode this whole application is built against.
  assert.equal(toUsd(1e9, 'ZAR'), null)
  assert.equal(convertible('ZAR'), false)
  assert.equal(formatMoneyUsd(1e9, 'ZAR'), 'ZAR 1B', 'an unconvertible figure stands alone, undisguised')
  assert.equal(toUsd('not a number', 'GBP'), null)
  assert.equal(toUsd(100, 'gbp'), toUsd(100, 'GBP'), 'the code is matched case-insensitively')
})

t('the conversion is the same arithmetic everywhere it happens', () => {
  assert.equal(toUsd(100, 'GBP'), 100 * USD_PER.GBP)
  // One table: the societies page used to keep its own rounded rates, and two tables drift.
  const pros = fs.readFileSync(new URL('../src/data/pros.js', import.meta.url), 'utf8')
  assert.equal(/USD_RATE\s*=/.test(pros), false, 'pros.js has grown a second rate table')
  assert.match(pros, /from '\.\/fx\.js'/, 'pros.js must take its rate from the one table')
  // And no file may hand-roll a conversion of its own.
  for (const file of ['src/utils/compare.js', 'src/utils/format.js', 'src/utils/readings.js']) {
    const src = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
    assert.equal(/\*\s*1\.1[0-9]|\*\s*1\.3[0-9]|0\.0068|0\.00072/.test(src), false, `${file}: a rate written into the code`)
  }
})

t('a comparison ranks in dollars, and says that it converted', () => {
  const majors = buildComparison('umg,sony-music-group,wmg', { financials: SEC })
  const rev = majors.rows.find((r) => r.key === 'revenue')
  assert.equal(majors.currencies.length, 3)
  assert.equal(rev.rankable, true, 'the three majors must be comparable')
  assert.equal(typeof rev.best, 'number')
  // The best cell is the largest IN DOLLARS, not the largest number.
  const usd = rev.cells.map((c) => (c ? toUsd(c.value, c.currency) : null))
  assert.equal(rev.best, usd.indexOf(Math.max(...usd.filter((v) => v != null))))
  for (const c of rev.cells.filter(Boolean)) {
    const text = cellText(c)
    assert.match(text, /^\$/, 'every cell leads with dollars')
    if (c.currency !== 'USD') assert.match(text, /\(.+\)$/, 'and keeps the reported figure')
  }
  assert.match(majors.caveat, /converted to US dollars/)
  assert.match(majors.caveat, /Federal Reserve H\.10/, 'the reader must be told which rate, and when')
})

t('the rate is explained where a reader would look for it', () => {
  assert.match(FX_NOTE, /Federal Reserve/)
  assert.match(FX_NOTE, /parentheses/)
  // The caveat that matters most: one rate for every period, so a converted historical figure is not what the
  // money was worth at the time. Comparability is bought with that, and the app says so rather than hiding it.
  assert.match(FX_NOTE, /not what the money was worth at the time/)
  assert.match(FX_SHORT, new RegExp(FX_ASOF))
  const about = fs.readFileSync(new URL('../src/pages/About.jsx', import.meta.url), 'utf8')
  assert.match(about, /FX_NOTE|FX_SOURCE/, '/about must explain the conversion it applies to every figure')
})

console.log(`\n${n} currency checks passed.`)
