#!/usr/bin/env node
/**
 * check-health.mjs — one deterministic check of a running Mainframe · Music instance.
 * Exits non-zero with a specific reason, so a scheduler (GitHub Actions, cron, a local supervisor) can act.
 *
 *   npm run health                      # the live service
 *   npm run health -- --url http://localhost:3002
 *   npm run health -- --max-age 45      # minutes since the last successful news fetch
 *
 * Checks, in order: the service answers; it reports ok; the news cache is not empty; the last fetch is recent;
 * the last fetch did not error. A cold start on a free plan can take a minute, so the fetch retries.
 */
const args = process.argv.slice(2)
const arg = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] ? args[i + 1] : fallback }
const URL_BASE = (arg('url', process.env.MM_URL || 'https://music-mainframe.onrender.com')).replace(/\/$/, '')
const MAX_AGE_MIN = Number(arg('max-age', 45))
const RETRIES = Number(arg('retries', 3))
const TIMEOUT_MS = Number(arg('timeout', 30000))

const fail = (msg, detail) => { console.error(`FAIL ${msg}${detail ? `\n     ${detail}` : ''}`); process.exit(1) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getHealth() {
  let last = ''
  for (let i = 1; i <= RETRIES; i++) {
    try {
      const res = await fetch(`${URL_BASE}/api/health`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (!res.ok) { last = `HTTP ${res.status}`; } else return await res.json()
    } catch (err) { last = err.message }
    if (i < RETRIES) await sleep(5000 * i)
  }
  fail(`${URL_BASE} did not answer /api/health after ${RETRIES} attempts`, last)
  return null
}

const h = await getHealth()
if (!h.ok) fail('service reports not ok', JSON.stringify(h))
const news = h.news || {}
if (!news.total) fail('the news cache is empty — the aggregator has not completed a fetch', JSON.stringify(news))
const ageMin = news.lastSuccess ? Math.round((Date.now() - Date.parse(news.lastSuccess)) / 60000) : Infinity
if (!Number.isFinite(ageMin)) fail('no successful news fetch recorded', JSON.stringify(news))
if (ageMin > MAX_AGE_MIN) fail(`last successful news fetch was ${ageMin} minutes ago (limit ${MAX_AGE_MIN})`, `lastSuccess ${news.lastSuccess}`)
if (news.lastError) fail('the last news fetch reported an error', String(news.lastError))

console.log(`OK ${URL_BASE} · sprint ${h.sprint} · up ${Math.round(h.uptimeSec / 60)}m · ${news.total} items · last fetch ${ageMin}m ago`)
