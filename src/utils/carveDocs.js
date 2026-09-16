/**
 * carveDocs.js — carve-out case deliverable on the shared block model: the investment committee memo.
 * Built from the trainee's own state and the computed carve-out model.
 */
import { finish, push, disclaimer } from './labDocs.js'
import { reviewCarveChecks } from './carveout.js'
import { fmtK, fmtM, fmtPct, fmtX, num } from './valuation.js'

export function buildCarveMemo(c, s, r) {
  const S = []; const add = push(S)
  const d = s.deliver
  const lo = num(d.low); const hi = num(d.high); const offer = num(d.offer)
  add('Executive summary', 'Recommendation', [
    { kind: 'stats', items: [
      { label: 'Enterprise value range', value: lo && hi ? `${fmtM(lo, 0)}–${fmtM(hi, 0)}` : '—' },
      { label: 'Recommended enterprise value', value: offer ? fmtM(offer, 0) : '—' },
      { label: `Equity cheque for ${r.stake * 100}%`, value: offer ? fmtM(offer * r.stake, 0) : fmtM(r.cheque, 0) },
      { label: 'Vendor guide', value: `${fmtM(c.asPresented.askEv, 0)} · ${fmtX(r.wmbt.multiple)} of standalone` },
    ] },
    { kind: 'paragraph', text: d.rationale || 'Rationale not yet written.' },
    (d.conditions || []).length ? { kind: 'bullets', items: d.conditions.map((id) => c.protections.find((p) => p.id === id)?.label).filter(Boolean) } : null,
  ])
  add('Transaction', c.title, [{ kind: 'bullets', items: c.scope }, { kind: 'table', columns: ['Attribute', 'Fact', 'Implication'], rows: c.profile }])
  add('Carve-out P&L', `${fmtM(r.revenueTotal, 1)} revenue · ${fmtM(r.reported, 1)} reported EBITDA`, [
    { kind: 'table', columns: ['Revenue line', 'Customer', 'LTM', 'Share', 'Pricing'], rows: c.revenue.map((x) => [x.label, x.customer === 'parent' ? 'Parent' : 'Third party', fmtK(x.ltm), fmtPct(x.ltm / r.revenueTotal, 0), x.pricing]) },
    { kind: 'table', columns: ['Cost line', 'FTE', 'LTM', 'Basis'], rows: c.costs.map((x) => [x.label, x.fte ? String(x.fte) : '—', fmtK(x.ltm), x.basis]) },
    { kind: 'stats', items: [{ label: 'Parent share of revenue', value: fmtPct(r.parentShare, 0) }, { label: 'Reported EBITDA margin', value: fmtPct(r.reportedMargin, 1) }, { label: 'Vendor adjusted EBITDA', value: fmtM(r.vendorEbitda, 1) }, { label: 'Standalone EBITDA', value: fmtM(r.standaloneEbitda, 1) }] },
  ])
  add('Standalone costs', `${fmtM(r.allocationTotal, 1)} allocated → ${fmtM(r.standaloneCostTotal, 1)} standalone`, [
    { kind: 'table', columns: ['Function', 'Parent allocation', 'Standalone', 'Delta', 'FTE'], rows: r.functions.map((f) => [f.label, fmtK(f.allocation), fmtK(f.standalone), fmtK(f.delta), f.fte ? String(f.fte) : '—']) },
  ])
  add('EBITDA bridge', `${fmtM(r.reported, 1)} reported → ${fmtM(r.standaloneEbitda, 1)} standalone`, [
    { kind: 'table', columns: ['Step', 'Amount', 'Treatment', 'Applied'], rows: [['Reported carve-out EBITDA', '', '', fmtK(r.reported)], ...r.bridge.map((x) => [x.label, fmtK(x.amount), x.treatment, fmtK(x.applied)]), ['Standalone EBITDA', '', '', fmtK(r.standaloneEbitda)]] },
    { kind: 'note', text: `Standalone margin ${fmtPct(r.standaloneMargin, 1)} versus ${fmtPct(r.reportedMargin, 1)} as reported.` },
  ])
  add('Separation', `${fmtM(r.separationTotal, 1)} one-off · ${fmtM(r.tsaPv, 1)} transitional services`, [
    { kind: 'table', columns: ['Separation cost', 'Amount', 'In the price'], rows: r.separation.map((x) => [x.label, fmtK(x.amount), x.include ? 'Yes' : 'No']) },
    { kind: 'table', columns: ['Transitional service', 'Direction', 'Months', 'Monthly', 'Total'], rows: r.tsa.map((x) => [x.label, x.direction === 'in' ? 'From the society' : 'To the society', String(x.months), fmtK(x.monthly), fmtK(x.total)]) },
    { kind: 'note', text: c.stranded.why },
  ])
  add('Value', `${fmtM(r.ev, 0)} enterprise value`, [
    { kind: 'table', columns: ['Case', 'Multiple', 'Gross EV', 'Less separation & TSA', 'Enterprise value'], rows: r.multiples.map((m, i) => [['Downside', 'Base', 'Upside'][i], fmtX(m), fmtM(m * r.standaloneEbitda, 0), fmtM(-r.deductions, 1), fmtM(r.evRange[i], 0)]) },
    { kind: 'stats', items: [{ label: 'Standalone EBITDA', value: fmtM(r.standaloneEbitda, 1) }, { label: 'Enterprise value', value: fmtM(r.ev, 0) }, { label: `Cheque for ${r.stake * 100}%`, value: fmtM(r.cheque, 0) }, { label: 'Gap to guide', value: `${fmtM(r.wmbt.gap, 0)} (${fmtPct(r.wmbt.gapPct, 0)})` }] },
    { kind: 'bullets', items: [
      `The ${fmtM(c.asPresented.askEv, 0)} guide needs ${fmtX(r.wmbt.multiple)} of standalone EBITDA, or standalone EBITDA of ${fmtM(r.wmbt.ebitda, 1)} at ${fmtX(r.multiple)}.`,
      `At the vendor's own ${fmtM(c.asPresented.adjEbitda, 1)} pro forma figure, our enterprise value implies ${fmtX(r.impliedOnVendor)}.`,
    ] },
  ])
  const findings = c.findings.filter((f) => s.exec.findings[f.id]?.severity)
  if (findings.length) add('Findings', 'Findings and deal protections', [{ kind: 'table', columns: ['Finding', 'Severity', 'Protection'], rows: findings.map((f) => [f.finding, s.exec.findings[f.id].severity, c.protections.find((p) => p.id === s.exec.findings[f.id].protection)?.label || '—']) }])
  const reviewed = reviewCarveChecks(c).filter((k) => s.exec.checks[k.id]?.revealed)
  if (reviewed.length) add('Vendor pack review', 'Corrections to the vendor pack', [{ kind: 'table', columns: ['Area', 'Vendor pack', 'Standalone view'], rows: reviewed.map((k) => [k.area, k.stated, k.computed]) }])
  add('Appendix', 'Method', [{ kind: 'bullets', items: c.takeaways }, disclaimer(c)])
  return finish(c, 'carveout-memo', 'IC carve-out memo', S, `${c.client.name} · signing target ${c.signingTarget}`)
}
