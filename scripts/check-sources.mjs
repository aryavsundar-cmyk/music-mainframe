#!/usr/bin/env node
/**
 * check-sources.mjs — can the reader actually open what this app cites?
 * `npm run sources` · `npm run sources -- --json` · `npm run sources -- --only sec.gov`
 *
 * Every record in this application carries `sources[]`, and `/about` says so. That promise is only as good as the
 * links: a citation that 404s is worse than no citation, because it looks like provenance and is not. Nothing has
 * ever checked them, and the oldest are eighteen months old.
 *
 * This is deliberately NOT part of `npm test`. It depends on 300-odd third-party hosts being up and willing to
 * answer a robot, so a green build must never depend on it — a flaky CDN would block a deploy that has nothing to
 * do with it. It runs on its own, like `npm run health`, and its findings are acted on by a person.
 *
 * Being a polite client matters here: this walks other people's servers. One request at a time per host, a real
 * User-Agent naming the tool, HEAD before GET (and GET only when HEAD is refused, which many CDNs do), and a hard
 * cap on concurrency. The User-Agent is honest and never pretends to be a browser.
 *
 * **Only a server saying "gone" counts as a defect.** The first run of this reported twenty broken links, and ten
 * of them were fine: `harman.com` serves 200 to curl using this exact User-Agent, and fails in Node with
 * UNABLE_TO_VERIFY_LEAF_SIGNATURE because the host ships an incomplete certificate chain that curl and browsers
 * resolve and Node does not. A 403 is the same story from the other direction — it says the host dislikes robots,
 * not that the page is gone. So the outcomes are split by CAUSE, and anything the checker could not settle is
 * reported as `unverified` with its reason rather than as a broken citation. Acting on those would have deleted
 * nine working sources.
 *
 * That is the same rule the application itself lives by (see `utils/coverage.js`): not knowing is a state, and it
 * is never rounded up into a claim.
 *
 * The second version was wrong in the other direction: it trusted a 404 from a HEAD request. TikTok's newsroom
 * answers HEAD with 404 and GET with 200 for the same article, so a live citation was condemned. Every failing
 * HEAD is now confirmed with a GET before any verdict is recorded.
 */
import fs from 'node:fs'
import path from 'node:path'

const UA = 'Mainframe-Music source checker (research tool; contact via repository)'
const CONCURRENCY = 6
const TIMEOUT_MS = 15000
const args = process.argv.slice(2)
const asJson = args.includes('--json')
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null

/** Every `{ label, url }` the data files hold, with the records that cite each one. */
export async function collectSources() {
  const mods = [
    '../src/data/entities.js', '../src/data/transactions.js', '../src/data/pros.js',
    '../src/data/fundamentals.js', '../src/data/peFunds.js', '../src/data/milestones.js',
    '../src/data/glossary.js', '../src/data/flows.js',
  ]
  const found = new Map()
  const walk = (node, from, depth = 0) => {
    if (!node || depth > 10) return
    if (Array.isArray(node)) return node.forEach((x) => walk(x, from, depth + 1))
    if (typeof node !== 'object') return
    if (typeof node.url === 'string' && /^https?:/i.test(node.url)) {
      const hit = found.get(node.url) || { url: node.url, labels: new Set(), from: new Set() }
      if (node.label) hit.labels.add(node.label)
      hit.from.add(from)
      found.set(node.url, hit)
    }
    // An id or name on the way down is the most useful thing to report a dead link against.
    const named = node.id || node.name || from
    for (const value of Object.values(node)) walk(value, named, depth + 1)
  }
  for (const rel of mods) {
    const mod = await import(new URL(rel, import.meta.url).href)
    for (const [key, value] of Object.entries(mod)) walk(value, key, 0)
  }
  return [...found.values()].map((h) => ({ url: h.url, labels: [...h.labels], from: [...h.from].slice(0, 4) }))
}

const host = (url) => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '?' } }

/**
 * One link. `blocked` is its own outcome on purpose: a 403 or 429 from a bot-hostile host says nothing about
 * whether a person can open the page, and filing it as a broken citation would waste someone's afternoon.
 */
async function check(url) {
  const attempt = async (method) => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(url, { method, redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': UA, Accept: '*/*' } })
      return { status: res.status, finalUrl: res.url }
    } finally {
      clearTimeout(timer)
    }
  }
  try {
    let res = await attempt('HEAD')
    // A failing HEAD is never the last word. Plenty of servers refuse the method outright, and some answer it
    // wrongly: TikTok's newsroom returns 404 to HEAD and 200 to GET for the same article, which had this checker
    // condemning a live citation. Anything short of success gets confirmed with a GET before a verdict is given.
    if (res.status >= 400) res = await attempt('GET')
    if (res.status < 400) return { state: 'ok', status: res.status, finalUrl: res.finalUrl }
    // A host that refuses robots has told us nothing about the page.
    if (res.status === 403 || res.status === 429) return { state: 'unverified', status: res.status, why: 'the host refuses automated requests' }
    if (res.status >= 500) return { state: 'unverified', status: res.status, why: 'the host returned a server error' }
    return { state: 'dead', status: res.status, finalUrl: res.finalUrl }
  } catch (err) {
    const code = err.cause?.code || err.code || err.name
    // A certificate chain Node will not complete is a fact about this client, not about the link. curl and every
    // browser fetch the missing intermediate; Node does not.
    const tls = /CERT|SIGNATURE|SELF_SIGNED|ALT_NAME/i.test(String(code))
    if (tls) {
      const viaCurl = await curlStatus(url)
      if (viaCurl && viaCurl < 400) return { state: 'ok', status: viaCurl, via: 'curl' }
      if (viaCurl >= 400 && viaCurl !== 403 && viaCurl !== 429) return { state: 'dead', status: viaCurl, via: 'curl' }
      return { state: 'unverified', status: 0, why: `this client could not complete the TLS chain (${code})` }
    }
    // A host that does not resolve is as definite as a 404, but only once the resolver confirms it: a single
    // failed lookup inside a fetch can be a transient or filtered result, and deleting a citation over one would
    // be the same mistake as trusting a HEAD.
    if (code === 'ENOTFOUND' && !(await resolves(host(url)))) {
      return { state: 'dead', status: 0, why: 'the domain no longer resolves' }
    }
    return {
      state: 'unverified',
      status: 0,
      why: err.name === 'AbortError' ? `no answer within ${TIMEOUT_MS / 1000}s` : `could not connect (${code})`,
    }
  }
}

/** Does this hostname have any record at all? Anything other than a clean NXDOMAIN counts as "cannot tell". */
async function resolves(hostname) {
  const dns = await import('node:dns/promises')
  for (const fn of ['resolve4', 'resolve6', 'resolveCname']) {
    try {
      const records = await dns[fn](hostname)
      if (records?.length) return true
    } catch (err) {
      if (err.code !== 'ENOTFOUND' && err.code !== 'ENODATA') return true // a resolver problem, not a missing domain
    }
  }
  return false
}

/**
 * A second opinion from curl, with the SAME User-Agent — not a disguise, a client whose trust store completes a
 * chain Node leaves hanging. Absent curl the answer stays unverified, which is the honest outcome.
 */
async function curlStatus(url) {
  try {
    const { execFile } = await import('node:child_process')
    const { promisify } = await import('node:util')
    const { stdout } = await promisify(execFile)('curl', [
      '-s', '-o', '/dev/null', '-L', '--max-time', String(TIMEOUT_MS / 1000), '-A', UA, '-w', '%{http_code}', url,
    ], { timeout: TIMEOUT_MS + 5000 })
    const code = Number(stdout.trim())
    return Number.isFinite(code) && code > 0 ? code : null
  } catch {
    return null
  }
}

/** One request at a time per host, `CONCURRENCY` hosts at once. */
async function run(items) {
  const byHost = new Map()
  for (const item of items) {
    const key = host(item.url)
    if (!byHost.has(key)) byHost.set(key, [])
    byHost.get(key).push(item)
  }
  const queues = [...byHost.values()]
  const out = []
  let next = 0
  const worker = async () => {
    for (;;) {
      const i = next++
      if (i >= queues.length) return
      for (const item of queues[i]) {
        out.push({ ...item, ...(await check(item.url)) })
        if (!asJson) process.stderr.write('.')
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queues.length) }, worker))
  return out
}

const sources = (await collectSources()).filter((s) => !only || host(s.url).includes(only))
if (!asJson) console.log(`Checking ${sources.length} cited links across ${new Set(sources.map((s) => host(s.url))).size} hosts…`)
const results = await run(sources)
if (!asJson) process.stderr.write('\n')

const by = (state) => results.filter((r) => r.state === state)
// Only a server that answered "gone". Everything else is `unverified` and is NOT a defect.
const broken = by('dead')
const report = {
  checkedAt: new Date().toISOString(),
  total: results.length,
  ok: by('ok').length,
  dead: broken.length,
  unverified: by('unverified').length,
  broken: broken.map((r) => ({ url: r.url, status: r.status, labels: r.labels, from: r.from })),
  unverifiedLinks: by('unverified').map((r) => ({ url: r.url, why: r.why || `status ${r.status}`, from: r.from })),
}

// Written whatever the outcome, so /about can state when the links were last checked.
const outPath = new URL('../data/source-check.json', import.meta.url)
fs.mkdirSync(path.dirname(outPath.pathname), { recursive: true })
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`)

if (asJson) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log(`\n${report.ok}/${report.total} open · ${report.dead} gone · ${report.unverified} could not be checked from here`)
  if (broken.length) {
    console.log(`\n${broken.length} the server says are gone:`)
    for (const r of broken.sort((a, b) => a.url.localeCompare(b.url))) {
      console.log(`  ${String(r.status).padEnd(5)} ${r.url}`)
      console.log(`  ${''.padEnd(5)} cited by ${r.from.join(', ')} — "${r.labels[0] || ''}"`)
    }
  }
  if (report.unverified) {
    console.log(`\n${report.unverified} could not be settled from here (NOT a defect — see the file for reasons).`)
  }
  console.log(`\nWritten to data/source-check.json`)
}

// A dead citation is a real defect; anything this client could not settle is not. Only the first fails.
process.exit(broken.length ? 1 : 0)
