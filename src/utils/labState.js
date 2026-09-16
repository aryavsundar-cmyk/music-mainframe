/**
 * labState.js — trainee state for a Valuation Lab case: defaults, the reviewer benchmark, immutable updates,
 * progress, and the scorecard. Persisted per case in localStorage by hooks/useLabState.js.
 */
import { asPresentedExec, benchmarkExec, computeCase, num } from './valuation.js'
import { asPresentedPmi, benchmarkPmi, benchmarkBoard } from './pmi.js'
import { pmiProgress, pmiScoreRows, pmiConclusionRow } from './pmiState.js'
import { asPresentedAbs, benchmarkAbs, benchmarkCredit } from './abs.js'
import { absProgress, absScoreRows, absConclusionRow } from './absState.js'
import { asPresentedCarve, benchmarkCarve, benchmarkOffer } from './carveout.js'
import { carveProgress, carveScoreRows, carveConclusionRow } from './carveState.js'

export const STAGES = [
  { id: 'pitch', label: 'Pitch', blurb: 'Frame the problem, set the perimeter, scope and price the work' },
  { id: 'plan', label: 'Plan', blurb: 'Workstreams, timeline, information request list' },
  { id: 'execute', label: 'Execute', blurb: 'Review the draft model, correct it, value the catalog' },
  { id: 'deliver', label: 'Deliver', blurb: 'Conclude, recommend an offer, export the IC memo' },
]

/** Stage list with case-specific blurbs (c.stageBlurbs). */
export const stagesFor = (c) => STAGES.map((s) => ({ ...s, blurb: c.stageBlurbs?.[s.id] || s.blurb }))

export const EXEC_STEPS = [
  { id: 'inventory', label: 'Perimeter & inventory' },
  { id: 'history', label: 'Earnings & mix' },
  { id: 'qoe', label: 'Quality of earnings' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'dcf', label: 'Discount rate & DCF' },
  { id: 'multiples', label: 'Multiples & sensitivity' },
  { id: 'findings', label: 'Findings & protections' },
  { id: 'price', label: 'Purchase price' },
  { id: 'review', label: 'Model review' },
]

export function defaultState(c) {
  return {
    v: 1,
    ui: { reviewer: false },
    pitch: { scr: { s: '', c: '', r: '' }, perimeter: {}, questions: [], team: { ...c.teamDefaults }, revealed: {} },
    plan: { irl: {}, revealed: false },
    exec: c.kind === 'pmi' ? asPresentedPmi(c) : c.kind === 'abs' ? asPresentedAbs(c) : c.kind === 'carveout' ? asPresentedCarve(c) : asPresentedExec(c),
    deliver: c.kind === 'pmi' ? { target: '', budget: '', rationale: '' } : c.kind === 'abs' ? { recommendation: '', maxA: '', conditions: [], rationale: '' } : c.kind === 'carveout' ? { low: '', high: '', offer: '', conditions: [], rationale: '' } : { low: '', high: '', offer: '', rationale: '' },
  }
}

export function benchmarkState(c) {
  const shared = sharedBenchmark(c)
  if (c.kind === 'pmi') return { ...shared, exec: benchmarkPmi(c), deliver: benchmarkBoard(c) }
  if (c.kind === 'abs') return { ...shared, exec: benchmarkAbs(c), deliver: benchmarkCredit(c) }
  if (c.kind === 'carveout') return { ...shared, exec: benchmarkCarve(c), deliver: benchmarkOffer(c) }
  const ex = benchmarkExec(c)
  const r = computeCase(c, ex)
  const low = Math.round(Math.min(r.scenarios[2]?.ev ?? r.dcf.ev, r.multipleValues[0]) / 50000) * 50000
  const high = Math.round(Math.max(r.dcf.ev, r.multipleValues[1]) / 50000) * 50000
  return { ...shared, exec: ex, deliver: { low, high, offer: ex.headline, rationale: c.benchmarkDeliver.rationale } }
}

function sharedBenchmark(c) {
  return {
    v: 1,
    ui: { reviewer: true },
    pitch: {
      scr: { ...c.benchmarkPitch.scr },
      perimeter: Object.fromEntries(c.perimeter.map((p) => [p.id, p.benchmark])),
      questions: c.questions.filter((q) => q.benchmark).map((q) => q.id),
      team: { ...c.teamDefaults },
      revealed: { scr: true, perimeter: true, questions: true, fee: true },
    },
    plan: { irl: Object.fromEntries(c.irl.map((i) => [i.id, { priority: i.benchmark, status: 'Requested' }])), revealed: true },
  }
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v)
export function merge(base, over) {
  if (!isObj(base) || !isObj(over)) return over === undefined ? base : over
  const out = { ...base }
  for (const k of Object.keys(over)) out[k] = isObj(base[k]) && isObj(over[k]) ? merge(base[k], over[k]) : over[k]
  return out
}

/** setIn(obj, ['exec','norm','viral','treatment'], 'reject') — immutable deep set. */
export function setIn(obj, path, value) {
  if (!path.length) return value
  const [k, ...rest] = path
  const cur = obj?.[k]
  const next = typeof value === 'function' && rest.length === 0 ? value(cur) : setIn(isObj(cur) || Array.isArray(cur) ? cur : {}, rest, value)
  return Array.isArray(obj) ? Object.assign([...obj], { [k]: next }) : { ...obj, [k]: next }
}

// ── progress & score ────────────────────────────────────────────────────────────
const filled = (t) => String(t || '').trim().length >= 40
const frac = (xs) => (xs.length ? xs.filter(Boolean).length / xs.length : 0)

export function progress(c, s) {
  const pitch = frac([filled(s.pitch.scr.s), filled(s.pitch.scr.c), filled(s.pitch.scr.r), ...c.perimeter.map((p) => !!s.pitch.perimeter[p.id]), s.pitch.questions.length === 5])
  const plan = frac(c.irl.map((i) => !!s.plan.irl[i.id]?.priority))
  if (c.kind !== 'valuation') {
    const k = c.kind === 'pmi' ? pmiProgress(c, s) : c.kind === 'abs' ? absProgress(c, s) : carveProgress(c, s)
    const execute = frac(k.execute); const deliver = frac(k.deliver)
    return { pitch, plan, execute, deliver, overall: (pitch + plan + execute + deliver) / 4 }
  }
  const execute = frac([
    ...c.normalization.map((n) => !!s.exec.norm[n.id]?.touched),
    ...c.findings.map((f) => !!(s.exec.findings[f.id]?.severity && s.exec.findings[f.id]?.protection)),
    ...c.checks.map((k) => !!s.exec.checks[k.id]?.verdict),
  ])
  const deliver = frac([num(s.deliver.low) > 0, num(s.deliver.high) > 0, num(s.deliver.offer) > 0, filled(s.deliver.rationale)])
  return { pitch, plan, execute, deliver, overall: (pitch + plan + execute + deliver) / 4 }
}

/** Scorecard vs the reviewer benchmark. Each row: { area, score, max, notes[] }. */
export function scorecard(c, s, r, b) {
  const rows = []
  const add = (area, score, max, notes) => rows.push({ area, score: Math.max(0, Math.min(max, score)), max, notes })

  const scrOk = ['s', 'c', 'r'].filter((k) => filled(s.pitch.scr[k])).length
  add('Pitch framing (SCR)', scrOk, 3, scrOk < 3 ? ['Write all three parts; each should stand alone in one or two sentences.'] : ['Complete. Compare against the reviewer example for sharpness.'])

  const per = c.perimeter.filter((p) => s.pitch.perimeter[p.id] === p.benchmark)
  add({ pmi: 'Integration perimeter', abs: 'Review perimeter', carveout: 'Carve-out perimeter' }[c.kind] || 'Economic perimeter', per.length, c.perimeter.length, c.perimeter.filter((p) => s.pitch.perimeter[p.id] && s.pitch.perimeter[p.id] !== p.benchmark).map((p) => `${p.text}: ${p.why}`))

  const q = s.pitch.questions.filter((id) => c.questions.find((x) => x.id === id)?.benchmark)
  add({ pmi: 'Key integration questions', abs: 'Key credit questions', carveout: 'Key diligence questions' }[c.kind] || 'Key diligence questions', q.length, 5, s.pitch.questions.filter((id) => !c.questions.find((x) => x.id === id)?.benchmark).map((id) => { const x = c.questions.find((y) => y.id === id); return `${x.text} — ${x.why}` }))

  const p1 = c.irl.filter((i) => i.benchmark === 'P1')
  const p1ok = p1.filter((i) => s.plan.irl[i.id]?.priority === 'P1')
  add('Information request priorities', p1ok.length, p1.length, p1.filter((i) => s.plan.irl[i.id]?.priority !== 'P1').map((i) => `Should be P1: ${i.text}`))

  if (c.kind === 'carveout') {
    carveScoreRows(c, s, r, b, add)
    carveConclusionRow(c, s, r, b, add)
    return totals(rows)
  }
  if (c.kind === 'abs') {
    absScoreRows(c, s, r, b, add)
    absConclusionRow(c, s, r, b, add)
    return totals(rows)
  }
  if (c.kind === 'pmi') {
    pmiScoreRows(c, s, r, b, add)
    pmiConclusionRow(c, s, r, b, add)
    return totals(rows)
  }

  const nOk = c.normalization.filter((n) => (s.exec.norm[n.id]?.treatment || 'accept') === n.benchmark)
  add('Quality-of-earnings calls', nOk.length, c.normalization.length, c.normalization.filter((n) => (s.exec.norm[n.id]?.treatment || 'accept') !== n.benchmark).map((n) => `${n.label}: ${n.why}`))

  const leakOk = num(s.exec.leakage) === 0 ? 1 : 0
  add('Forecast base reconciles (no unevidenced plug)', leakOk, 1, leakOk ? [] : [`A ${Math.round(num(s.exec.leakage) / 1000)}K leakage plug remains. Model leakage explicitly with evidence, or remove it.`])

  const rateOk = r.ratePct >= c.rateBand[0] && r.ratePct <= c.rateBand[1] ? 1 : 0
  const termFirst = num(s.exec.terminal?.firstCf)
  const termOk = s.exec.terminal?.method === 'finite' && (!termFirst || Math.abs(termFirst - r.totals[4] * (1 + num(s.exec.terminal.g) / 100)) < 5000) ? 1 : 0
  const dcfOk = Math.abs(r.dcf.ev / b.dcf.ev - 1) <= 0.05 ? 1 : 0
  add('DCF discipline', rateOk + termOk + dcfOk, 3, [
    !rateOk && `Discount rate ${r.ratePct.toFixed(2)}% sits outside the ${c.rateBand[0]}–${c.rateBand[1]}% band this risk profile supports.`,
    !termOk && 'Use a finite-life declining terminal whose first year follows from the 2031 forecast, not a typed-in figure.',
    !dcfOk && `DCF ${(r.dcf.ev / 1e6).toFixed(2)}M is more than 5% from the reviewer's ${(b.dcf.ev / 1e6).toFixed(2)}M — check normalisation, allocation, and terminal inputs.`,
  ].filter(Boolean))

  const fOk = c.findings.filter((f) => { const x = s.exec.findings[f.id] || {}; return x.severity === f.benchmark.severity && x.protection === f.benchmark.protection })
  add('Findings → protections', fOk.length, c.findings.length, c.findings.filter((f) => { const x = s.exec.findings[f.id] || {}; return (x.severity || x.protection) && !(x.severity === f.benchmark.severity && x.protection === f.benchmark.protection) }).map((f) => `${f.finding}: reviewer rates ${f.benchmark.severity}, protection "${c.protections.find((p) => p.id === f.benchmark.protection)?.label}".`))

  const kOk = c.checks.filter((k) => { const v = s.exec.checks[k.id]; return (v?.verdict === 'issue' || (v?.verdict === 'fine' && k.kind === 'judgement')) && v.flaggedBeforeReveal !== false })
  add('Model review — issues found before reveal', kOk.length, c.checks.length, c.checks.filter((k) => s.exec.checks[k.id]?.revealed && s.exec.checks[k.id]?.flaggedBeforeReveal === false).map((k) => `Revealed without flagging: ${k.area}`))

  const bridgeOk = c.bridge.filter((x) => !!s.exec.bridge[x.id]?.include === x.benchmark)
  add('Purchase-price bridge', bridgeOk.length, c.bridge.length, c.bridge.filter((x) => !!s.exec.bridge[x.id]?.include !== x.benchmark).map((x) => `${x.label}: ${x.why}`))

  const lo = num(s.deliver.low); const hi = num(s.deliver.high); const offer = num(s.deliver.offer)
  const concl = [lo > 0 && hi > lo, offer > 0 && offer <= hi && offer >= lo * 0.95, offer > 0 && offer < c.sellerAsk * 0.9].filter(Boolean).length
  add('Conclusion & offer', concl, 3, [
    !(lo > 0 && hi > lo) && 'Set a concluded range with low < high.',
    !(offer > 0 && offer <= hi && offer >= lo * 0.95) && 'Recommend an offer inside (or just below) your concluded range.',
    !(offer > 0 && offer < c.sellerAsk * 0.9) && 'An offer near the ask needs the "what must be true" assumptions evidenced first.',
  ].filter(Boolean))

  return totals(rows)
}

function totals(rows) {
  const score = rows.reduce((a, x) => a + x.score, 0); const max = rows.reduce((a, x) => a + x.max, 0)
  return { rows, score, max, pct: max ? score / max : 0 }
}
