import { RECORDED } from './recorded.js'
import { PUBLISHING } from './publishing.js'
import { DSPS } from './dsps.js'
import { LIVE } from './live.js'
import { CREATOR } from './creator.js'
import { FINANCE } from './finance.js'

/** Raw section arrays, in brief §4 order. entities.js normalises and exports the flat table. */
export const SECTIONS = [
  { key: 'recorded', label: 'Recorded music', rows: RECORDED },
  { key: 'publishing', label: 'Publishing, admin, PROs', rows: PUBLISHING },
  { key: 'dsps', label: 'DSPs', rows: DSPS },
  { key: 'live', label: 'Live', rows: LIVE },
  { key: 'creator', label: 'Creator infrastructure, data, AI, sync', rows: CREATOR },
  { key: 'finance', label: 'Financial layer', rows: FINANCE },
]
