/** Case registry for the lab. Each case declares `kind` ('valuation' | 'pmi'), which selects its engine and stages. */
import { NORTHSTAR } from './northstar.js'
import { HALCYON } from './halcyon.js'
import { CADENCE } from './cadence.js'

export const CASES = { northstar: NORTHSTAR, halcyon: HALCYON, cadence: CADENCE }
export const CASE_LIST = Object.values(CASES)
