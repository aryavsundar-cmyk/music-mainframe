#!/usr/bin/env node
/** Prints a compact JSON summary of the engines in whichever edition this process was started in. */
import { buildAccounts, coverage, recommendedLine, triggerFeed } from '../src/utils/prospect.js'
import { draftOutreach } from '../src/utils/outreach.js'
import { matchBuyers } from '../src/utils/buyerMatch.js'
import { scanCatalogs, marketStats } from '../src/utils/catalogScan.js'
import { buildAccountBrief, buildTargetList } from '../src/utils/prospectDocs.js'
import { renderBriefText } from '../src/utils/briefText.js'
import { CLIENT_CATEGORIES } from '../src/data/consulting.js'

const today = new Date('2026-09-16T00:00:00Z')
const accounts = buildAccounts({ today })
const cov = coverage(accounts, {})
const rows = scanCatalogs({ today })
const buyers = matchBuyers({ asset: 'both', size: 400e6, goal: 'max-price' }, { today })
const a = accounts[0]
const draft = draftOutreach(a, { line: recommendedLine(a) })
const brief = buildAccountBrief(a, draft.unavailable ? null : draft, {})

console.log(JSON.stringify({
  edition: CLIENT_CATEGORIES.length ? 'full' : 'work',
  accounts: accounts.length,
  tiers: { A: cov.totals.A, B: cov.totals.B, C: cov.totals.C },
  top: accounts.slice(0, 10).map((x) => x.id),
  scores: Object.fromEntries(accounts.slice(0, 5).map((x) => [x.id, x.score.total])),
  bounded: accounts.every((x) => x.score.fit <= 40 && x.score.timing <= 40 && x.score.access <= 20 && x.score.total === x.score.fit + x.score.timing + x.score.access),
  withTrigger: accounts.filter((x) => x.score.timing > 0).length,
  feed: triggerFeed(accounts, { today }).length,
  market: { holdings: marketStats(rows).holdings, live: marketStats(rows).live, topBuyer: buyers[0].id, buyerScore: buyers[0].match.score },
  drafts: draft.unavailable ? 'unavailable' : 'available',
  docs: { brief: renderBriefText(brief).length, list: renderBriefText(buildTargetList(accounts, {}, { limit: 10 })).length },
}))
