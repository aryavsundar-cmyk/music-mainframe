# Flows — where the dollar actually goes, on the structure the industry actually has

*Strategy for Sprint 43 and what follows. Written 2026-09-28.*

---

## Situation

`/flows` is the page that explains the industry's shape. It holds two diagrams — recording as a
chain, publishing as a fan — built from `src/data/flows.js`: nodes on a grid, edges typed `rights`
(forward) or `money` (backward), drawn by `FlowDiagram.jsx` with a detail rail in `FlowPanel.jsx`.
It is the only page on the canvas whose subject is *structure* rather than *records*, and the only
one a reader can hand to somebody who does not know how music is paid for.

It already does several things well. The two-domain split is real and is the right first cut:
a master and a composition genuinely move differently, and the gold-chain / verdigris-fan rhythm
carries that without a word of explanation. Every node carries a description, the companies that
occupy the role, and an `econ` array of published rates. Stage selection lives in `?node=`, so a
view is shareable. The diagram exports.

It also sits on top of a substrate that is better than the page uses. `data/fundamentals.js` already
holds, sourced and dated: `MARKET.splits` (55 recording / 15 publishing / 30 DSP), `MARKET.ifpi`
($31.7B recorded revenue, 2025), per-DSP `shareToRights`, `perStream` ranges, `payouts2025`, and a
`PAYOUT_MODELS` table that already names `lump-sum` (UGC), `statutory`, `artist-centric`,
`user-centric` and `direct`. TikTok, Meta and Snap already have profiles on the `social` tier.
Suno, Udio, ElevenLabs, Bandcamp, Merlin and Believe are already entities with pages.

---

## Complication

Three problems, and the blank space the user noticed is a symptom of all three rather than a
problem of its own.

**1. The page draws the plumbing and hides the water.** Every edge says *who pays whom* and almost
none says *how much of what*. `M('dsp', 'distributor', 'recording share ≈ 50–55% of net, pro-rata')`
carries an `econ` object that is rendered only in the rail, only after a click, only for the selected
node, and only as an isolated percentage. A reader can follow the arrows and still not know that of
the $12.99 they pay Spotify, something on the order of four dollars reaches a recording rights holder
and about a dollar reaches the composition — or that the artist's own share comes out of the first
number, after recoupment, and the writer's share of the second arrives by two different routes that
never meet. The economics exist in the data. They have no visual form.

**2. "Recording" and "publishing" are domains, not scenarios.** The two tabs answer *which right is
being exploited*. They cannot answer *how did this dollar arrive*, which is the question that
actually separates the industry's economics. A paid stream, an ad-supported stream, a TikTok post, a
sync in a trailer, a Saturday night at a 2,000-cap venue, a vinyl pressing and an AI training licence
are seven different money routes with seven different split structures, seven different collection
intermediaries and seven different answers to "who gets paid directly". The current page shows one
of them properly (interactive streaming), one partially (non-interactive statutory), and gestures at
sync. The rest are absent. And because the page is cut by domain, the reader can never see the
recording line and the publishing line of the *same event* beside each other — which is precisely
the comparison that makes the structure legible, and precisely what the user asked for.

**3. The structure drawn is the 2005 structure.** The recording chain is artist → label →
distributor → DSP → listener, with a statutory branch. That was a complete map twenty years ago.
It is now missing every route that has been built since:

- **UGC and short video.** TikTok, Reels and Shorts pay lump-sum pool licences, not per-stream
  royalties, and allocate from the pool by their own matching. Structurally this is a different
  animal from a DSP stream and the page does not draw it. YouTube's Content ID claim — where the
  rights holder monetises somebody *else's* upload — has no node at all, and it is one of the
  largest single lines in modern recorded income.
- **Social as discovery, not income.** The dominant reason a label spends on TikTok is conversion to
  DSP streams. That is a flow of attention with a money consequence, and drawing it as nothing is a
  misrepresentation of where label money goes.
- **AI.** Training licences (input side) and generated-output royalties (output side) are now real
  money — the Udio and Suno settlements, ElevenLabs' licensed model, the GEMA litigation. They have
  no node, and the honest position on most of their economics is "undisclosed", which the canvas has
  a vocabulary for and should use.
- **Direct-to-fan and superfan.** Bandcamp, artist-direct, vinyl, Patreon-shaped subscription. The
  defining feature is that the chain is *short* — often artist → platform → fan with no label and no
  collection society — and that is exactly the contrast the diagram should be able to make.
- **The deduction layer.** Streaming fraud removal, sub-threshold demonetisation (Spotify's 1,000-
  stream floor), noise and functional-audio dilution, unmatched/black-box income. Money that leaves
  the pool before anybody's split applies.

The page is therefore both under-used (half a screen of nothing below a 370px diagram on a 1440×900
desktop) and under-true. Filling the space with decoration would fix neither.

---

## Resolution

Four workstreams. The first three are Sprint 43; the fourth is the sprint after, and is named here so
the data model is built once rather than twice.

### Workstream 1 — Scenarios: cut the page by money route, not by rights domain · *Sprint 43* ✅ shipped — 5 routes, 37 steps, no rate written twice

A new top-level object in `flows.js`: `SCENARIOS`. Each scenario is one way money enters the
industry, and carries **both** the recording line and the publishing line for the same event, so the
comparison the user asked for is the default view rather than something the reader assembles across
two tabs.

The proposed set, each chosen because its split structure genuinely differs from the others:

| Scenario | What is being paid for | Why it is structurally distinct |
|---|---|---|
| **Paid stream** | a subscription month | pro-rata pool; both rights paid; the reference case |
| **Ad-supported stream** | an ad impression | same routes, far smaller pool, different ARPU |
| **UGC / short video** | a lump-sum platform licence | pool not per-use; platform-side matching; Content ID claims on third-party uploads |
| **Non-interactive radio** | a statutory performance | CRB rate; SoundExchange pays the performer *direct*, bypassing the label |
| **Sync** | one negotiated use | one-off fee, MFN-matched across both sides, plus downstream performance via cue sheet |
| **Live** | a ticket | box-office percentage to the PRO for the composition; the recording earns nothing |
| **Direct-to-fan** | a sale | shortest chain on the canvas; no society, often no label |
| **AI licensing** | training data and outputs | newest, least disclosed; the honest answer is mostly "undisclosed" |

Sprint 43 ships the first five plus Live; direct-to-fan and AI land with Workstream 3.

Two rules make this safe rather than a second source of truth:

- **A scenario is a view over the existing nodes, not a new graph.** It names which nodes and edges
  are lit, in which order, with which rates. `recording` and `publishing` remain the two domains and
  keep their diagrams; the scenario layer sits above them. A node's description is written once.
- **Every rate in a scenario is a reference into data that already exists**, resolved at read time —
  `MARKET.splits`, a DSP profile's `shareToRights`, a node's `econ` entry, a PRO's published admin
  rate. The scenario declares *which* rate applies at each step, never the number itself. If
  `fundamentals.js` changes, the waterfall changes. A rate typed into a scenario is a test failure.

### Workstream 2 — The waterfall: make the dollar visible · *Sprint 43* ✅ shipped — nested bars, bands not midpoints, 6 undisclosed steps named

The new visual, rendered below the diagram in the space that is currently empty.

**Form: a split tree drawn as nested proportional bars, not a Sankey.** One unit of money enters at
the top; each row is one party; each bar's width is that party's share of the unit; indentation shows
who is paid out of whose share. A Sankey was considered and rejected: it implies conservation and
precision that published *ranges* cannot support, it is hard to make accessible, and it draws a
network where the truth is a tree of splits. The nested-bar form reuses the existing `<Bar>`
primitive (the only proportion bar in the app, per Sprint 35), degrades to a table for the export and
for screen readers, and can honestly render a range as a band rather than a point.

**The unit is fixed and published, never entered by the reader.** Each scenario declares its own:
"$12.99, one US Premium subscription month", "1,000,000 streams at published all-in rates",
"one $50,000 sync fee", "$100 of box office". The reader switches scenarios; they never type a
number.

This is deliberate and it is where the **non-goal in CLAUDE.md is respected**: *no royalty
calculator, no artist tooling*. The distinction that keeps this on the right side of that line is
that the page illustrates **industry structure with published rates**, and never takes a user's own
streams, catalogue or deal terms and returns what they would earn. No input box, no per-artist
output, no "estimate your royalties". If that line is ever crossed the page has become the thing
Sprint 0 said this app would not be. It is worth stating in `limits.js` and enforcing in the tests.

**Every step shows its range and its source.** Where the published figure is a range (a 15–25% major
royalty, a $0.003–0.005 per stream), the bar shows the band and the label shows the range — never a
midpoint presented as a rate. Where a figure is a rule of thumb it says so. Where nobody discloses —
most of UGC allocation, most of AI — the row is drawn as *undisclosed*, which is a finding, not a
gap: the canvas already distinguishes those (`coverage.js`).

### Workstream 3 — The modern layer, on top of the legacy structure · *Sprints 43–44* ✅ shipped in full — UGC, platform claiming, black box, direct-to-fan and AI

New nodes and edges, added to the existing two flows rather than a third diagram, each carrying real
`entityIds` so every one links to a company page that already exists:

**Recording flow gains:**
- `ugc` — UGC / short-video platforms (TikTok, Meta, Snap, YouTube Shorts). Pays a lump-sum pool;
  edge label says *pool, not per-use*. Its outbound edge to the label is thick in dollars and
  untraceable per-track, and the diagram should say that rather than drawing a clean percentage.
- `contentid` — platform claiming (YouTube Content ID and equivalents), the route by which a rights
  holder earns from a third party's upload. Sits between `ugc` and `label`.
- `directfan` — Bandcamp, artist stores, vinyl, superfan tiers. Draws as a *short* edge straight
  from `artist`, which is the visual point.
- `ai` — AI training and generated output. Two edges: an input licence (model developer → rights
  holder, lump sum and equity, mostly undisclosed) and an output route (per-generation or
  attribution-based, largely unsettled). Entities exist: Suno, Udio, ElevenLabs.
- `deductions` — a muted lane naming what leaves the pool before any split: fraud removal,
  sub-threshold demonetisation, unmatched income. Not a party; a leak, drawn as one.

**Publishing flow gains:**
- the same `ugc` and `ai` licensees on the composition side, which is where the asymmetry shows:
  the composition is licensed for UGC too, usually by a separate deal, and AI training licences on
  compositions are the subject of the GEMA case.
- `blackbox` — unmatched and unclaimed royalties held by societies and the MLC, and how they are
  eventually distributed by market share. This is a genuinely large number and has no home on the
  page today.

**What must not happen here:** no node gets invented economics. Where the money is real but the
rate is not public — UGC pool allocation, every AI settlement — the node says *undisclosed* and
cites the reporting that establishes the deal exists. The app's whole posture is that a plausible
number is worse than an honest absence.

### Workstream 4 — The page, and the honesty infrastructure · *Sprints 43–44* ✅ shipped in full — comparator, `LIMITS.flow`, weighted edges, the computed reading, `test:flows` (14 checks), 8 glossary terms

- **Scenario comparator**: one table, every scenario as a row, "where $1 lands" as columns
  (recording side / publishing side / intermediary / platform). This is the single most useful
  artifact on the page and the one most likely to end up in a deck. It exports through `pageDocs.js`
  like every other page view.
- **Edge weight in the diagram**: money edges drawn with thickness proportional to share, so the
  existing diagram carries magnitude without a redesign.
- **A computed reading** (`utils/readings.js`, per Sprint 35): a sentence counted off the scenario on
  screen, citing its own figures — never a sentence with a number typed into the page.
- **`limits.js` entry**: what a flow waterfall is and is not — published rates and statutory
  schedules, not the terms of any deal; a structure illustration, not an earnings estimate.
- **`test:flows`**: the new suite. Every scenario's shares sum to its unit; no rate is typed into a
  scenario that `fundamentals.js` or a node's `econ` already holds; every non-statutory rate carries
  a source; a range is never rendered as a point; every `entityId` resolves; no scenario claims a
  figure for a step the record marks undisclosed; the page carries the limit.
- **Glossary + page guide**: new terms (pro-rata, lump-sum licence, Content ID claim, black box,
  MFN, cue sheet, artist-centric) into `data/glossary.js`; `pageGuide.js` entry rewritten to describe
  the scenario layer and its limits.

---

## What not to do

- **Do not build a royalty calculator.** No user input for streams, catalogue or deal terms; no
  per-artist output. Fixed published scenario units only. This is a Sprint 0 non-goal and the most
  likely way this work goes wrong.
- **Do not invent a number to complete a picture.** A waterfall with one undisclosed step is honest;
  a waterfall with a plausible midpoint in that step is a false statement wearing a chart.
- **Do not present a range as a rate.** Bands and ranges, everywhere the published figure is one.
- **Do not build a third diagram.** Scenarios are a lens over the two flows. Three graphs is three
  places for the same fact to drift.
- **Do not restate a rate that `fundamentals.js` holds.** Reference it; let one change propagate.
- **Do not fill the space with decoration.** Every pixel added should be a figure, a route or a
  stated limit.

---

## Sequence, and why

**Sprint 43** — Workstreams 1 and 2, plus the UGC/Content ID/deductions half of Workstream 3.
The scenario model and the waterfall have to land together, because a scenario with nothing to
render is an abstraction and a waterfall with one scenario is a chart. UGC comes with them because
it is the largest structural omission and because `fundamentals.js` already holds its profiles, so
it costs data plumbing rather than research.

**Sprint 44** — the AI and direct-to-fan nodes, the comparator table, edge weighting, the reading,
the glossary terms and `test:flows` in full. AI is deliberately second: most of its economics are
undisclosed, so the value is in drawing the *routes* correctly, and that is easier once the scenario
model is proven on routes where the numbers exist.


---

## What Sprint 43 actually shipped, and what it changed on the way

Two things were decided differently from the plan above, both in the direction of holding a line rather than
completing a picture:

- **Ad-supported streaming was dropped as its own route.** `MARKET.splits` describes *a paid stream's* net
  revenue. Applying it to advertising revenue would have been an extrapolation dressed as a sourced split, for a
  route whose shape is identical anyway. It is a sentence on the paid-stream route instead, and the app says why.
- **The deduction layer is not a numeric step.** Fraud removal and sub-threshold demonetisation are real and
  nobody publishes the amounts. Rather than assert a threshold this app cannot cite, every route states what its
  unit already has taken out of it and that services do not disclose those deductions separately.

Two things turned out better than planned:

- **`basis: 'unknown'` earned its complexity.** The publishing share of a stream is published; its division into
  performance and mechanical is not. Modelling that honestly — a branch whose own share is unknown but whose
  internal splits are known, rendered as proportions of itself — is the most useful thing on the page, because it
  shows a reader exactly where the public record stops.
- **`tone: 'muted'` had been in the edge data since Sprint 2 and nothing drew it.** The new UGC and claiming
  edges swept across the diagram at full weight, which is what surfaced it. The statutory branch has read better
  ever since.


---

## Sprint 44, and the rule it added

The two routes left over from 43 turned out to be the two ends of the same spectrum, which is why they were
worth shipping together.

**Direct to fan** is the only route on the page whose platform publishes the whole split. Bandcamp's own Fair
Trade Music Policy states 15% on digital, 10% on physical, payment processing of 4–7% charged separately, and
the artist keeping the rest. Having one fully-disclosed route is what makes the others legible: the reader now
has something to read a 55¢ recording share *against*.

**AI** is the opposite, and the contribution is the pipes rather than the prices. Two distinct routes exist — a
training licence on the input side and, in principle, a royalty on the output side — and only the input has
been settled at all. The 2024 suits became licences (Universal/Udio, October 2025; Warner/Suno, November 2025)
and no party published a rate. The route cites the deals and prices nothing. Its unit note says the further
thing that matters: consideration included equity and assets, so even a disclosed cash figure would not be the
whole payment.

**The rule they forced.** Bandcamp publishes payment processing as "4–7%" and names no typical figure, and the
engine had no way to hold that: every rate needed a point. Inventing a midpoint would have been the easiest
thing in the sprint and would have made every figure below it false by an amount nobody could check. So a rate
may now be a band with no point, a remainder computed from ranged siblings is itself a range, and a band-only
row draws solid to its low with the uncertain part in a soft tone.

That change improved routes nobody was looking at. The paid stream's "service retains" had been stated as a
flat 30¢ when its inputs were ranges; it is now 30–38¢, which is what the published figures actually imply.
A range cannot be divided further — a share of a range is not a figure — and the engine now says so rather than
quietly multiplying.

**Deferred, and named:** ad-supported streaming (needs a split published for advertising revenue rather than
extrapolated from the paid one) and a numeric deduction layer (needs a citable threshold this app does not yet
hold).
