/** labEngines.js — selects the computation engine for a lab case by `c.kind`. */
import { computeCase, benchmarkExec, asPresentedExec, reviewChecks } from './valuation.js'
import { computePmi, benchmarkPmi, asPresentedPmi, reviewPmiChecks } from './pmi.js'

export function engineFor(c) {
  if (c.kind === 'pmi') {
    return {
      compute: (exec) => computePmi(c, exec),
      benchmark: () => computePmi(c, benchmarkPmi(c)),
      draft: () => computePmi(c, asPresentedPmi(c)),
      checks: () => reviewPmiChecks(c),
    }
  }
  return {
    compute: (exec) => computeCase(c, exec),
    benchmark: () => { const ex = benchmarkExec(c); return { ...computeCase(c, ex), headline: ex.headline } },
    draft: () => computeCase(c, asPresentedExec(c)),
    checks: () => reviewChecks(c),
  }
}
