# Prospecting & Coverage Module — Strategy

Status: Sprints 13–14 shipped 2026-09-16 (scoring engine, coverage and target views, LinkedIn and email drafts, local records). Sprints 15–16 outstanding. Owner: practice lead. Drafted 2026-09-15, after Sprint 12.
Scope: a research and prospecting capability inside Mainframe · Music that turns the app's corpus into a
targeted go-to-market for a PEPI-adjacent music practice.

---

## 1. Situation, complication, resolution

**Situation.** The app already holds the market: 188 entities across 15 types, 61 transactions, a 7-category ×
5-service-line PEPI overlay with 39 engagement hypotheses covering 116 entities, live news with per-entity signals,
four mock-engagement cases, and a document factory (account plan, proposal, sector deck, Gamma). The practice
needs deals, not more data.

**Complication.** Nothing in the app answers the four questions that decide a week's outreach: *who is worth
calling, why now, who exactly do I call, and what do I say that they can't dismiss.* Targeting today lives in a
spreadsheet tracker and in memory, so coverage is uneven, triggers are missed, and messaging restarts from
scratch each time.

**Resolution.** A coverage and prospecting module that scores every account on fit, timing, and access from data
already in the app; maps each account to named buyer personas and the service line that fits; drafts the message
with the evidence attached; and exports a target list, an account brief, and an outreach sequence through the
existing document builders.

---

## 2. The market, split the way we sell to it

Two sides, five buying centres. Every account in the app already carries the fields that place it.

### Buy side — who deploys capital into music rights and platforms

| Segment | In the app | What they buy from us | Primary trigger |
|---|---|---|---|
| PE and growth sponsors | 19 `pe-fund` entities, 12 PE rounds, 5 take-privates | Diligence, PMI, value creation, exit prep | Signed deal, 100-day window, hold-period underperformance, exit prep |
| Catalog funds and rights investors | 16 `catalog-fund` entities, 13 catalog sales | Valuation, QoE, royalty-ops diligence, post-close integration | Fund raise, catalog acquisition, administration change |
| Debt and structured investors | 5 `debt-investor` entities, 16 ABS transactions | Collateral review, servicer diligence, restructuring support | New issuance, ARD approaching, covenant pressure |
| Strategic acquirers | 21 `strategic` entities, 13 M&A transactions | Integration, synergy validation, carve-out separation | Announced deal, regulatory remedy, integration slippage |

### Sell side — who owns assets, operations, or obligations

| Segment | In the app | What they buy from us | Primary trigger |
|---|---|---|---|
| Labels and publishers | 13 labels, 8 publishers | Carve-out readiness, royalty transformation, margin work | Divestiture, systems migration, royalty restatement |
| Distributors and services | 14 distributors, 5 artist-services | Operating model, pricing, integration | Consolidation, platform replacement |
| PROs, CMOs and mechanical societies | 16 `pro` entities with a dated reform timeline | Modernisation, cost-to-collect, carve-out of services arms | Reform milestone, distribution-methodology change, board mandate |
| Live and venues | 19 `live` entities | Roll-up integration, commercial diligence | Consolidation, regulatory action |
| Music tech, data and DSPs | 11 music-tech, 10 data, 21 DSPs | Growth diligence, cost structure, partnership economics | Funding round, payout-model change, platform dispute |

Advisers — banks, law firms, lenders — are not targets; they are the referral layer. Track them as sources of
access, not as accounts.

---

## 3. How targets get tiered

Tier is a function of **size × market relevance × reachability**, not revenue alone. All three components are
computable from existing fields, which is what makes this a module rather than a spreadsheet.

**Fit (0–40).** Does a PEPI service line have a specific hypothesis for this entity's category?
`consulting.js` already carries 39 of them across 7 categories. Fit scores the strength of the match plus the
entity's `tier` (scale within type) and role breadth — a company that is label *and* publisher *and* distributor
has more surface area.

**Timing (0–40).** Trigger events, decayed by age:
- deal events from `transactions.js` (closed M&A inside 12 months, PE round, ABS issuance, take-private),
- ABS anticipated repayment dates approaching inside 24 months,
- PRO reform milestones from `pros.js`,
- DSP payout-model changes from `fundamentals.js`,
- news signals from the live feed, weighted by the existing relevance scorer.

**Access (0–20).** Warmth, not wishful thinking:
- shared sponsors and companies with the Intelligence Hub (`siblings.js`: 10 sponsors, 12 companies),
- prior deliverables produced for that account,
- relationships from the user's own LinkedIn export and the M&E relationship tracker,
- adviser overlap on past transactions.

**Tiers.** A = score ≥ 70 or any live trigger with access. B = 45–69. C = the rest, reviewed quarterly.
Cap Tier A at roughly 25 accounts: a tier that doesn't fit in a week of calls isn't a tier.

Every score renders with its components visible. A score you can't explain in a meeting is a score nobody uses.

---

## 4. Who to call: personas

Six personas cover the buying centres above. Each carries the pain, the proof we lead with, and the question
that earns the second meeting.

| Persona | Sits in | What keeps them up | Our proof | Opening question |
|---|---|---|---|---|
| Deal partner / principal | PE, growth, strategics | Paying the right price on an unfamiliar asset class | Northstar valuation case; catalog QoE method | "How much of that LTM is recurring, collectible, and transferable?" |
| Operating partner / portfolio ops | PE sponsors | Synergies committed to an IC that the business can't deliver | Halcyon PMI case; phased, risk-weighted synergy model | "What has the management team actually committed to, and by when?" |
| CFO / finance chief | Portfolio companies, labels, publishers, PROs | Royalty accounting, restatements, cost to collect | Royalty operations and QoE work; carve-out P&L rebuilds | "What would a restatement cost you, and how would you know early?" |
| Head of royalty operations / COO | Publishers, distributors, PROs | Matching rates, unmatched income, migration risk | Beacon carve-out case; Day-1 continuity playbook | "What share of income is unmatched, and who owns fixing it?" |
| Credit PM / risk | Debt and structured investors | Collateral quality behind a rated note | Cadence ABS case; break-even and waterfall model | "What haircut to collections causes your first loss?" |
| Society CEO / board | PROs, CMOs | Member pressure, reform deadlines, cost per dollar collected | PRO modernisation view; carve-out economics | "What is your cost to collect versus your peer group?" |

Contacts are never invented. The module holds roles and named individuals only where the user has entered them
or where a public source is cited; personal data stays local and is never sent to third-party services.

---

## 5. What we say, and why it works

Message = **trigger + number + offer**, in the client's own vocabulary. Three rules:

1. **Lead with their number, not our service.** "Your 2026-1 notes hit their anticipated repayment date in 14
   months" beats "we do structured finance advisory".
2. **One proof point, drawn from work we can show.** The four lab cases are the practice's method made visible:
   valuation, integration, collateral review, carve-out.
3. **Ask for a specific 30 minutes on a specific question.** No capability decks in a first message.

Per-segment hooks, which map to the service lines already in `consulting.js`:

- **Sponsor, post-close** → *PMI*: "Most publisher integrations book every synergy from Day 1. We re-base the
  case to what phasing, contracts, and systems allow, so the board commits to a number management can deliver."
- **Catalog fund, mid-acquisition** → *Diligence*: "Reported royalty income isn't buyer cash flow. We rebuild
  gross-to-net, normalise the one-offs, and tell you what the catalog actually earns."
- **Credit investor, pre-pricing** → *Diligence*: "We tie the tape to bank receipts, apply the eligibility and
  concentration tests the indenture already contains, and solve for the haircut that breaks your class."
- **Society or group, divesting** → *Carve-out*: "Allocations are what the parent charged itself. We build the
  standalone cost base function by function, then price separation and the TSA into the deal."
- **Portfolio company, underperforming** → *Value creation*: "Cost to collect, unmatched income, and admin
  leakage are usually worth more than the next acquisition."

Messaging assets are versioned in the module so a hook that works becomes the default, and a hook that doesn't
gets retired with evidence.

---

## 6. What gets built

Mirrors the lab's architecture: pure engine, typed data, one page, exports through the existing block model.

**Data** — `src/data/prospects.js` (accounts derived from `entities.js`, `peFunds.js`, `pros.js`, `fundamentals.js`,
with an explicit overlay for coverage status and owner), `src/data/personas.js`, `src/data/playbooks.js`
(hooks, sequences, proof points per segment × service line).

**Engine** — `src/utils/prospect.js`: `scoreAccount(account, ctx)` returning fit, timing, access, total, tier, and
the reasons for each; `triggersFor(entityId)` reading transactions, PRO timelines, ABS dates, and news signals;
`coverage(accounts)` for the matrix. Pure, Node-tested (`npm run test:prospect`), same rule as the lab: no figure
in the UI that the engine can't derive.

**Page** — `/prospecting`, four views: **Coverage** (category × tier matrix, gaps highlighted), **Targets**
(sortable account list with score breakdown and owner), **Triggers** (a dated feed of events worth a call, newest
first), **Account** (one page per account: profile, signals, personas, recommended line, drafted message, prior
deliverables, Hub cross-links).

**Exports** — three new builders on the shared block model: target list, account brief, outreach sequence. They
flow into Word, slides, text, Markdown, and Gamma with no renderer changes, and reuse `accountPlan.js` and
`proposal.js` for the follow-on documents.

**Enrichment, in priority order.** The existing news aggregator first; then public filings (SEC EDGAR full-text,
Companies House) for ownership and financials; then GitHub-hosted open datasets where they add rights context
(MusicBrainz dumps, open identifier registries); then the sibling repos for shared sponsors and companies. The
user's own LinkedIn export and relationship tracker supply the access layer locally. Every enrichment writes
`asOf` and `sources[]` like every other record, and anything unsourced carries `verify: true`.

---

## 7. Phasing

| Sprint | Deliverable | Done when |
|---|---|---|
| 13 | ✅ Shipped: scoring engine, personas, playbooks, `/prospecting` Coverage and Targets views, LinkedIn and email drafts, local status records | Every account scores with visible components; coverage matrix shows gaps; 21 engine and draft tests pass |
| 14 | ✅ Shipped: trigger feed (deadlines ahead first, decay enforced), account pages with live news, shared composer components, plus a health watcher for the news backend | A trigger older than its decay window drops off; account pages render signals, triggers, deals and drafts |
| 15 | Personas, playbooks, message composer, three exports | A target list, account brief, and outreach sequence export to Word and Gamma |
| 16 | Enrichment connectors (filings first), saved lists and owner assignment, outcome tracking | Outreach outcomes feed back into scoring; stale accounts age out |

---

## 8. Guardrails

- **Provenance.** Same discipline as the rest of the app: `asOf` and `sources[]` on every record, `verify: true`
  where a figure is an estimate. Prospecting data decays faster than market data; show the date on every trigger.
- **People data.** Named contacts only from the user's own sources or cited public ones, stored locally, never
  sent to a third-party service and never published to an artifact.
- **No fabrication.** No invented contacts, titles, or relationships. An empty access score is a finding, not a
  gap to fill with a guess.
- **Rates.** `rateCard.js` numbers stay labelled indicative, in outreach as everywhere else.
- **Scope.** The module recommends and drafts. It does not send: outreach leaves the app as a document or a
  drafted message the user sends.

---

## 9. How we know it works

Coverage of Tier A and B accounts with a named owner; triggers actioned within 14 days; first meetings booked;
proposals generated from the module; and win rate by segment and service line. All five are countable inside
the app once outcome tracking lands in Sprint 16.

---

## Appendix — backlog at the time of writing

| Item | State |
|---|---|
| Lab: valuation, PMI, ABS, carve-out cases | Shipped, Sprints 9–12 |
| Lab: next case ideas (label distribution renegotiation, live roll-up, AI licensing dispute) | Open, unscheduled |
| `verify: true` records (67) | Closed as convention, not debt: press-estimate deal values, illustrative flow economics, DSP and PRO estimates, each with a note and sources |
| Kickoff brief Sprints 0–7 | All shipped, including Hub cross-links |
| PE Academy-style `/pe` overview | Open, low priority; superseded in value by this module |
| Gamma export | Live in production |
