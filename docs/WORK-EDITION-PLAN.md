# Work edition — strategy and execution plan

Status: Sprint 18 shipped 2026-09-16 (the split and its test). Sprints 19–21 outstanding. Drafted after Sprint 17.
Question it answers: what can be shared at work without giving away the part that is mine.

---

## 1. Situation, complication, resolution

**Situation.** Mainframe · Music now carries a sourced map of the industry — 188 entities, 61 transactions, 16
societies, 21 platforms, 67 funds — plus a live news feed, SEC filings, a demand-side catalog scan, a sell-side
buyer match, and a prospecting pipeline. Colleagues would use most of it tomorrow.

**Complication.** The same codebase also carries things that are not public and not shared: the PEPI overlay with
39 engagement hypotheses, indicative day rates, links into the internal Intelligence Hub, the outreach playbooks,
the four teaching cases, and my own relationship records. Some of that is firm material, some is my own working
edge. Today they are one build, and the private parts are not merely on screen — they are inside the JavaScript
bundle, readable by anyone who opens developer tools.

**Resolution.** One codebase, two editions. A work edition that contains only public-sourced records and the
modules built on them, produced by a build that physically excludes the private modules and is tested for their
absence. Exports become Word, PowerPoint, Excel and text; Gamma stays out.

---

## 2. What is actually public

Audited 2026-09-16 against the repository, not from memory.

| Class | What it is | Evidence | Work edition |
|---|---|---|---|
| **A — public, sourced** | Entities, transactions, societies, platforms, funds | 188/188 entities and 61/61 transactions carry `sources[]` with URLs and `asOf` dates; societies, platforms and funds the same | Ships |
| **B — derived from public** | Flow economics, availability and match scores, triggers, coverage, news signals, SEC filings | Computed by engines from Class A plus public feeds; every figure traces to an input | Ships, with the two limit notes |
| **C — authored IP** | PEPI overlay (7 categories × 5 lines, 39 hypotheses), indicative day rates, Hub cross-links, outreach personas and playbooks, four lab cases, the glossary | Written by me or mirrored from internal apps; no public source | Excluded, except the glossary (see §4) |
| **D — personal** | Relationship strength, status, notes, outcomes, sender name | Browser-local only; never leaves the machine and is not in any build | Never ships in any edition |

Two things follow. First, the data layer is already clean: everything a colleague would look at is sourced.
Second, the *judgement* layer is what is mine — which categories matter, what to say, what the work is worth —
and that is exactly what Class C holds.

---

## 3. The edition model

**One repository, two builds.** A second repository would diverge within a month. Instead:

- `src/editions.js` declares each edition: nav groups, routes, data modules, export formats, connectors.
- The work build excludes private modules at **build time** by aliasing them to stubs, so their contents never
  enter the bundle. Runtime hiding is not sufficient: a hidden route still ships its data.
- `npm run build:work` produces the work bundle; `npm run build` stays the full one.
- A test greps the built work bundle for known private strings — a day rate, a hypothesis sentence, a lab case
  name, a Hub URL — and fails the build if any appears. That test is the guarantee, not the intention.
- `npm run edition:work -- --out ../music-mainframe-work` writes a trimmed source tree if the code itself ever
  has to be handed over, with the private files removed rather than ignored.

**Hosting.** A second Render service from the same repository, same commit, `MM_EDITION=work`. Separate URL,
separate environment, no Gamma key. If the link needs to be private, add basic authentication behind an
environment variable; Render has no built-in access control.

---

## 4. What ships, and the one real coupling

| Section | Work edition | Notes |
|---|---|---|
| Canvas — overview, entities, flows | Ships | Class A and B throughout |
| Money — deals, PE funds, ABS, catalog sales | Ships | Sourced transactions |
| Rights — societies, platforms | Ships | Sourced |
| Live — news | Ships | Link out, attribute, cap stored summaries (§6) |
| Market — catalog scan, buyer match | Ships | The strongest colleague-facing modules |
| Pipeline — prospecting | Ships, reduced | See the coupling below |
| Overlay — consulting lens, deliverables | Excluded | PEPI overlay, rate card, proposals |
| Academy — lab, glossary | Excluded | Teaching cases are authored IP |

**The coupling.** `utils/prospect.js` scores *fit* from the PEPI overlay and *access* from Hub cross-links, and
the account page renders hypotheses and Hub links. Remove Class C and prospecting loses part of its scoring. The
fix is a public-fit substitute for the work edition:

- Fit from public facts only: tier within type, size band from the headline metric, role breadth, and deal
  activity. No engagement hypotheses.
- Access from public facts only: sponsor overlap and filing coverage. No Hub links, no recorded relationships.
- Timing unchanged: it already runs on transactions, repayment dates, reform milestones, filings and news.

That keeps coverage, targets, triggers and the pipeline funnel working on public data, and leaves the scoring
weights visible in the work edition rather than hidden.

**Recommendation on outreach.** Keep the drafts out of the work edition. The personas and hooks are the part
that took judgement to write, they are the least defensible to share, and the module is complete without them:
colleagues get who to look at and why now, not what to say. This is a decision for you, not a technical
constraint — flagged in §8.

**The glossary** is a judgement call the other way. It explains public concepts in plain English and gives away
no position. Cheap to include and useful to a junior team, but it belongs to Academy, so the default here is to
leave it out and revisit.

---

## 5. Exports

| Format | Full | Work | Build |
|---|---|---|---|
| Word (.docx) | ✅ | ✅ | Existing `briefDocx.js` |
| PowerPoint (.pptx) | ✅ | ✅ | Existing `briefPptx.js` |
| Text (.txt) | ✅ | ✅ | Existing `briefText.js` |
| Markdown (.md) | ✅ | Optional | Harmless; keep unless it clutters |
| **Excel (.xlsx)** | New | ✅ | New `briefXlsx.js` |
| Gamma | ✅ | ❌ | Needs a key and sends content to a third party |

Excel is the one build item. The block model already carries typed `table` blocks, so each table becomes a sheet,
`stats` and `facts` become a summary sheet, and every sheet gets a sources row. Add one dependency (`exceljs`),
lazy-loaded like the others so it stays out of the core bundle. The same builder serves both editions.

Dropping Gamma from the work edition removes the `/api/gamma/*` proxy from that service and, with it, the only
path by which content leaves the app to a third party. That is worth saying out loud when sharing it.

---

## 6. Compliance and framing

- **Not an A&M product.** The work edition needs a plain line on every page and every export: an internal
  research tool, built personally, not a firm system of record and not client advice.
- **Third-party feeds.** The app stores headline, short summary and link. In a shared tool, link out, keep
  summaries short, attribute every source by name, and respect any feed that asks not to be redistributed.
- **SEC.** Keep the declared user agent with contact details, and the polite rate limiting already in place.
- **No personal data.** The work edition should hold no contact records at all; relationship notes stay in the
  full edition, in the browser, on my machine.
- **The two limit notes** ship unchanged: a match score means a buyer has done deals like yours, not that they
  are interested; an availability score is a prompt to do work, not a claim that an asset is for sale.

---

## 7. Execution plan

| Sprint | Work | Done when |
|---|---|---|
| 18 | ✅ Shipped: `editions.js`, build-time module swapping by resolved path, `npm run build:work`, a ten-check secrecy test, nav and route gating, the framing notice, and server support for embedding and access control | The work bundle contains no authored string, and the test proves it |
| 19 | Public-fit scoring path, prospecting reduced for the work edition, Hub and hypothesis references made edition-aware | Both editions build and every engine test passes in both |
| 20 | Excel exporter on the block model, export menus per edition, Gamma removed from the work build and service | A table exports to a sheet with its sources in both editions |
| 21 | Second Render service, optional basic auth, framing copy and disclaimers, `edition:work` source export | A colleague opens the link and sees only public material |

Four sprints, and the order matters: the secrecy test lands first so nothing after it can quietly leak.

---

## 8. Decisions for you

1. **Outreach drafts in the work edition?** Recommendation: no. Coverage and triggers yes, personas and hooks no.
2. **Glossary?** Recommendation: leave it out with Academy for now; it is a two-line change to include later.
3. **Who hosts and who sees it?** A personal Render service with a shared link is fastest. Anything that becomes
   a firm system needs the firm's own review, and that changes the framing in §6.
