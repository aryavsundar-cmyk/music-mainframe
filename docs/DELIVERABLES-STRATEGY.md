# Deliverables — reading what's given, sending what the firm sends

A strategy for custom presentation development on `/deliverables`, building on what is already there.
Written 2026-09-27. Companion to `UX-STRATEGY.md`.

---

## Situation

**What Deliverables does today.** Four fixed kinds — entity brief, account plan, proposal, sector deck — each
assembled by `utils/brief.js` and its siblings into one block model (`paragraph`, `bullets`, `table`, `facts`,
`stats`, `note`). Five file renderers hang off that model through the `RENDERERS` table, plus two Gamma outputs.
Every deliverable is built from the canvas: 191 companies, 61 transactions, the forces taxonomy, 56 financial
figures. Nothing else goes in.

**What the sibling does.** `am-intelligence-hub`'s Proposal Generator accepts multiple files — pdf, docx, xlsx,
csv, txt, md — parses each in the browser with `pdfjs-dist`, `mammoth` and `xlsx`, applies heuristic extraction
for client name, budget, timeline, metrics and scope, merges the results across files, and offers them to the
proposal form and to Gamma's business-context field. No backend, no keys, nothing uploaded.

**What the template is.** `General Slides Library as of 8.24.26.pptx`, measured rather than assumed:

| | |
|---|---|
| Size | 87 MB — 400 example slides and 457 media files |
| Layouts | 61 across 3 masters (≈21 distinct, duplicated per master) |
| Theme | named **"Alvarez & Marsal"** — navy `#002B49`, amber `#CF7F00`, blues `#0085CA` / `#5E8AB4`, Arial |
| Geometry | 13.333 × 7.5 in (16:9) |
| Special | `DO_NOT_DELETE_UpSlide *` layouts — the firm's PowerPoint add-in depends on them |

It is a slide **library**, not a thin template. That distinction drives everything below.

---

## Complication

Three gaps, and they are not the same kind of problem.

**1 — Nothing comes in.** A real engagement starts with the client's own material: an RFP, a CIM, a management
pack, last year's deck. The app cannot read a word of it. Every deliverable is the app talking about what it
already knows.

**2 — What goes out is not the firm's.** `briefPptx.js` draws the Mainframe's own identity — gold, Georgia,
shellac on paper. That is right for the application and wrong for a document that leaves the building. A deck
that does not open as an A&M deck cannot be sent, and cannot be picked up by whoever edits it next.

**3 — Nothing composes.** Four fixed shapes. "Custom presentation development" means choosing and ordering
sections, not choosing one of four.

These are not equal. **(2) gates the other two**: upload and composition both produce material that still cannot
be sent. So the template comes first, even though the upload is the headline ask.

---

## Resolution

### Workstream 1 — The A&M shell · *Sprint 40*

**Proven, not proposed.** Built and tested while writing this:

- 87 MB → **0.40 MB**, by removing the 400 example slides and the 433 media files nothing else references —
  keeping all 61 layouts, 3 masters and 5 themes intact.
- It opens. A slide generated into `Top Title Content` inherits **five real A&M placeholders**, and the file
  round-trips at 0.40 MB.

**How it works.**

- `scripts/build-deck-shell.mjs` takes a path to the library and writes `public/templates/am-shell.pptx`. The
  shell is committed (~400 KB); the 87 MB library never is. Re-run it when the firm reissues the library.
- Generation stays **client-side**: fetch the shell, open it with JSZip, append `<p:sld>` parts with their rels
  and content-type entries, save the Blob. This is not a new technique for this repo — `briefXlsx.js` already
  hand-writes SpreadsheetML over JSZip, for exactly this reason.
- The `DO_NOT_DELETE_UpSlide *` and `* Storage Layout` layouts are carried through untouched.

**Why not the two obvious alternatives.**

- *pptxgenjs with A&M colours* — i.e. a palette swap in `briefPptx.js`. pptxgenjs defines its own masters, so
  this produces a **look-alike**: nothing is editable through the firm's placeholders, applying the real template
  afterwards fights it, and UpSlide does not recognise it. Fine for the Mainframe's own look; wrong for the firm's.
- *Cloning slides out of the library* — highest visual fidelity, but those 400 slides carry 165 MB of media and
  arbitrary hand-placed shapes. Substituting text into someone else's composition fails in the worst way
  available: it produces a wrong-looking deck without erroring.

**The contract — block kind to layout.** The whole mapping, in one table, so it can be argued with:

| Block | A&M layout |
|---|---|
| cover | `Cover Static - Dark` |
| section break | `Divider` |
| `paragraph`, `bullets` | `Top Title Content` |
| `facts`, two-column `stats` | `2 Column Content` |
| three-column `stats` | `3 Column Content` |
| `table` | `Top Title Only` + a drawn table |
| limits, framing, sources | `Top Title Content` |
| close | `Back Cover - Dark` |

**Test — `test:deck`.** Every layout the map names exists in the committed shell; every block kind the builder
can emit has a mapping; the produced file unzips, parses, and carries its layout relationship. Sprint 20's lesson
governs: **verify the file, not the status line.**

---

### Workstream 2 — Read what is given · *Sprint 41*

Mirror the sibling's shape, because it works: `pdfjs-dist`, `mammoth`, `xlsx`, client-side, multi-file, merged,
each file independently parsed so one bad PDF does not lose the rest.

Two things this application must do that the sibling cannot.

**Resolve against the canvas.** An uploaded document should come back as *links*, not text. Company names
resolved through `utils/search.js` to entity ids. Figures set beside what the record already holds — "your pack
says £310M; PPL's own 2025 results say £315.3M". Deals matched to transactions on file. Forces suggested from
the evidence rules, never asserted. That is the difference between *we read your file* and *we read your file and
here is what we already know about it*, and it is the whole reason this belongs in this app rather than a generic
tool.

**Never launder an upload into a record.** Everything extracted carries its provenance — filename, page, sheet —
and `verify: true`. It may appear in an export labelled *from the document you provided*; it may never appear as
a sourced figure. This is the rule Sprints 36–39 built, pointed at input: **the canvas is sourced, an upload is
not**, and that difference has to survive into the file that leaves.

Two constraints follow directly:

- **Parsing stays in the browser.** `editions.js` FRAMING says this tool holds no client data. Parsing
  client-side makes that structurally true rather than a promise — there is no upload endpoint to audit.
- **Uploaded text is data, never instruction.** It can reach Gamma, which is a model. Extracted content is quoted
  into a named field, never concatenated into a prompt where it could read as direction.

---

### Workstream 3 — Compose · *Sprint 42*

- A section library over the existing block model. The four kinds become four **recipes** rather than four shapes:
  pick sections, order them, drop what does not apply, save the result under a name.
- `utils/brief.js` and its siblings stay the **only** data builders — the CLAUDE.md rule holds. Composition
  chooses and orders sections; it never authors one.
- Recipes live in localStorage, the pattern watchlists already use. Nothing about a client leaves the browser.

**And Gamma stops pretending to be a peer.** Gamma cannot take a .pptx template — it has its own themes. Today
the export row offers "Slides" and "Gamma deck" side by side as if they were alternatives; after Sprint 40 they
are not. The A&M path produces something sendable; Gamma produces a fast, differently-shaped draft for thinking
with. The UI should say which is which.

---

## What not to do

- **Do not commit the 87 MB library.** The shell is the artefact; the library is an input to a script.
- **Do not send an uploaded file to a server.** It would make the framing on `/about` false.
- **Do not let Gamma output wear A&M branding it does not have.**
- **Do not let an extracted figure into an export without its provenance.**
- **Do not touch the UpSlide layouts**, however unused they look.
- **Do not rebuild the A&M look in pptxgenjs.** A look-alike is worse than the Mainframe's own honest identity,
  because it invites everyone downstream to treat it as the real template.

---

## Sequence, and why

**40 — the shell.** It is the gate: it makes all four existing kinds sendable the day it ships, with no other
change. It is the hardest technical unknown, and it is now de-risked to a measured 400 KB and a working
round-trip. And it is independent of everything else.

**41 — upload and canvas resolution.** The headline ask, landing on a path that can already produce a real deck.

**42 — composition, and the Gamma split.** Worth least on its own and most once the other two exist.
