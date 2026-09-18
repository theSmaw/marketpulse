# CLAUDE.md

Guidance for Claude Code working in this repository.

This file holds **rules, traps and pointers** — things that are true across
sessions and expensive to rediscover. It deliberately does **not** hold
measurements, task histories or figures: those live in `docs/adr/`, in the
subject documents listed under _Where the record lives_, and in the task files
under `planning/`. If you want a number, take it; do not cite one from here.

## What MarketPulse is

An AI-assisted situational-awareness tool for US equities. It detects statistically unusual market behaviour and lets a human or an AI agent investigate it against primary-source evidence. [`planning/PRODUCT_SPEC.md`](planning/PRODUCT_SPEC.md) is the authoritative product definition — read the relevant section before implementing a feature. Each `planning/epic-NN-*/EPIC.md` states that epic's goal, scope, exit criteria and the spec sections behind it; read the current epic's file before starting work on it.

It is explicitly **not** a trading system. It never predicts prices, recommends trades, or produces target prices.

## Non-negotiable architectural invariants

These are the load-bearing decisions. They are cheap to honour up front and very expensive to retrofit — treat a change to any of them as a design discussion, not an implementation detail.

**1. The LLM never calculates.** Every number a user sees comes from deterministic code (an analytical tool or service). The model chooses _what_ to investigate and explains results; it must not produce figures from its own reasoning. If a feature needs a number the tool layer can't produce, add the tool — don't let the model estimate it.

**2. The AI manipulates typed application state, never markup or code.** Agent-driven UI changes are schema-validated `WorkspaceCommand` objects (`focusSymbols`, `openPriceChart`, `compareSymbols`, `setTimeWindow`, `pinEvidence`, …) executed against trusted, pre-existing components. No LLM-generated HTML, JSX, or executable frontend code, ever. Validate → permission-check → execute → record in investigation history.

**3. The product works with the AI switched off.** Every analytical capability must be reachable through direct user interaction. AI accelerates investigation; it is never the only path to a feature.

**4. Temporal isolation is enforced in the data/tool layer, not the prompt.** In replay mode, no component may read data timestamped after the replay clock. This constraint belongs in the data-access and tool implementations so future-information leakage is structurally impossible — never rely on instructing the model to behave. Design data access with this in mind from the first query, even before replay exists.

**5. Confidence and provenance are part of the domain model, not prose.** Findings carry an explicit confidence level — `CONFIRMED` / `SUPPORTED` / `POSSIBLE` / `UNKNOWN`. Evidence records source, event timestamp, retrieval timestamp, calculation method, and a raw-data reference. "Not enough evidence to explain this move" is a correct, first-class outcome, not a failure.

**6. Market-data provenance is displayed, never implied.** The UI must label the feed and must not suggest coverage the plan does not have. (The free Alpaca plan is asymmetric: stored historical bars are consolidated SIP, the live stream is IEX only — so the honest label differs between the two, and Epic 3's live feed must not inherit Epic 2's word.)

**7. Provider abstractions at the edges.** Market data sits behind a provider interface; the LLM sits behind an `AgentProvider` interface (`runInvestigation` / `streamEvents` / `cancel`). No vendor SDK types leak into the domain model.

## Domain model

The core objects, in dependency order — `Investigation` → `Step` → `Finding` → `Evidence`. An **Investigation is a persisted, first-class, long-running object**, not a chat session: it outlives any single AI response and has explicit status (`running` / `awaiting user` / `completed` / `failed` / `cancelled`). Steps have observable status so the UI shows real progress rather than a generic spinner.

The frontend renders investigation state from an ordered stream of typed backend events (`STEP_STARTED`, `TOOL_CALL_COMPLETED`, `FINDING_CREATED`, `WORKSPACE_COMMAND`, `INVESTIGATION_COMPLETED`, …) — never by parsing unstructured model text. This is what makes streaming, cancellation, retries, replay and testing tractable.

Anomaly detection is deterministic and deliberately interpretable: price percentile, volume ratio, relative move vs. sector and market, and breadth, normalised into a 0–100 score. **Every score must carry its explanation.** The score measures "how unusual is this?" — never risk or opportunity.

## Current state

**Epic 1 (Application Foundation): complete, 13 stories.** A pnpm workspace with
three packages plus a browser-test package, a Fastify backend and a React/Vite
frontend that both run, build, deploy and are verified in CI, logging with a
correlation id, an error contract, configuration, testing at six levels, a CI
pipeline, and both halves deployed to Azure.

**Epic 2 (Security Universe & Historical Data): complete, 14 stories, closed
2026-09-15.** A managed PostgreSQL instance, a
migration mechanism, a curated universe of 518 securities, a trading calendar and
market-time module, a provider seam, a real Alpaca client, a bar store of roughly
48 million minute bars with a ledger and nightly backfill, the market-data wire
(2.9), the frontend's state and fetch layer (2.10), search and selection (2.11),
the price chart (2.12), the volume chart with time-window selection (2.13), and
the provenance surface, the partial states and the close (2.14).

### What a user can see today

Five routes, a **one-row masthead** carrying the navigation and the market
clock, a **sticky status bar** at the foot of the viewport reporting the market
feed and backend health, and a **Security Explorer** a person can use rather
than only read.
They can type `nv` and open NVDA; the address becomes `/securities/NVDA` and a
cold link works. **The field that does it is on the page's heading row since
2026-09-16**, opposite the title rather than under it, which is also what
retired the route description, the field's drawn label and the panel's
_"Showing a default security"_ notice — three sentences that existed because the
top of the screen was a column of prose beside a void. That screen is `PRODUCT_SPEC.md` §8.3's seven regions, of which
**three hold something**: the identity block, the **Price** region and the
**Volume** region. The other four are placeholders naming the epic that fills
them, and that is on purpose.

Both plots draw real minute or daily bars on **one shared time axis**, answer
**one reading** from one crosshair, and can be driven by pointer or keyboard from
a single tab stop. A segmented control — `1D 5D 1M 3M 1Y` — moves both together,
and the window lives in the query string (`?sessions=21`). Changing it never
blanks the page: the last answer stays on screen until a newer one replaces it,
and a wait longer than 160 ms is covered by a pulsing panel rather than left
looking current. Every failure has an honest sentence and one `Try again` per
screen.

**And the screen says where its numbers came from.** One source note at the foot
of the region group — not one per region — states the adjustment, when the bars
were retrieved, and that sector and industry are **curated** rather than market
data; it names the series' own feed when the chrome cannot, which on a
deployment with no provider configured is every time. A short answer says how far
it reaches, in full instants. And the two empty answers are different sentences:
_no history stored for NVDA yet_ (changing the window will not help) against _no
bars stored for this window_.

**What they still cannot do:** watch a price move — there is no live data yet.

### What is settled, and where the argument lives

These are decided, load-bearing, and expensive to rediscover. Each is summarised
in one line here and argued in full where the table below points:

- **This product draws with hand-built SVG, not a charting library** (ADR 0027).
  The constraint is a count rather than a taste: one element per bar at the
  9,750-bar cap is 9,790 plot elements and main-thread tasks of 137–254 ms. The
  axis is **session-ordinal**, and a mark derived from the window runs the full
  frame while a mark derived from the bars stops at the coverage edge.
- **Colour is never the sole encoding of anything.** The price palette differs by
  1.04:1 in greyscale, so hue is the entire difference; shape, sign, glyph or
  word must carry it. This has caught real defects, including one where four
  greyscale simulations passed against a chart that was wrong.
- **The window vocabulary, the per-bar mark and the answer that stays on screen**
  (ADR 0028). `1M` is twenty-one trading sessions, not a month; a count outside
  the five shows **no selection rather than snapping**. Amended 2026-09-14: a
  named window ends at the last session whose **bell has rung**, the in-flight
  rail sentence is withdrawn (it lived 3–68 ms, which nobody can read), and a
  wait over 160 ms draws a panel over the picture — never over a number.
- **The design language's source of truth is the design canvas**, not the
  document (ADR 0026): canvas → `VISUAL-LANGUAGE.md` → `tokens.css` →
  components, with one standing exception where a canvas value fails a measured
  accessibility floor.
- **A claim about data requires data, and a surface that owns nothing defers**
  (ADR 0029). Four rules that reach well past provenance: a fully-formed
  provenance record about **zero bars** is a false impression rather than a
  courtesy, so each clause renders only when its own data is present — and the
  rule governs _assertions_ too, which is why a deployed spec asserts structure
  and no figure; a surface may make the confident claim only when the thing that
  would license it has actually been read, which is why `StoredHistory` has three
  members and not two; the surface that owns the data owns the account of it and
  everything else points once and stops, never saying nothing; and **one fact has
  one home** — a drawn sentence and its spoken twin are one string with two
  renderings, and a second copy fails the build.

### What is open, with a named owner rather than a story number

- **A listening pass with a real screen reader.** The spoken bar sentence is 25
  words against a 1,500 ms pacing floor, and whether a region changing every
  477 ms queues or replaces is readable from neither the DOM nor a timing nor by
  an agent. The repair is designed and unshipped. Owner: a person with a screen
  reader, before Epic 11 hands this surface to an agent.
- ~~**The security page spends 50–66 ms of main thread on a cold load**~~ —
  **owned since 2026-09-15 rather than open.** The breach is real and unchanged:
  every cold load of `/securities` and `/securities/:symbol` spends one task of
  50–76 ms against `PRODUCT_SPEC.md` §28, and it is the 518-row universe table
  rather than the chart. Measured three times and attributed from both ends each
  time. Task 2.14.8 took the disposition the epic owed and **handed it to Epic 14
  by name**, beside the `Expand all` exception that is the same component and
  probably the same repair. The figures, the three candidate repairs and the
  re-measure are in `planning/epic-14-performance-scale-validation/EPIC.md`;
  `SEARCH-AND-SELECTION.md` §10 holds all three datings. **The trigger is
  unchanged and outranks the epic: the first time a second surface on this page
  renders per-row markup at universe scale.**
- **The fourth design test, _does it feel alive_, has now been answered "not yet"
  seven times**, the seventh at Epic 2's close. Seven deferrals of one criterion
  is not caution, it is the shape of a criterion that never gets met — and its
  trigger is the **calendar** rather than a condition, so nothing fires. It is
  deferred by name to Epic 3's motion vocabulary against real moving numbers, and
  Epic 3 is the first epic where the honest version of the question is even
  askable: the hard form is what happens when a **price** changes.
- **Two shipped sentences are correct today and become false the first time an
  IEX tail is stitched on. Owner: Epic 3, beside the two-feed ledger.** The
  ledger itself — each stretch, in contribution order, with its bar count — is
  the sentence invariant 6 exists for, and **no server this product runs can
  produce it**: all sixteen recorded bar-series bodies carry `sip`, so the state
  is reached through `twoFeedStitchView()`, the recorded stitch with one field
  changed. And `No shares changed hands anywhere in the window.` is the only
  shipped sentence claiming something about **the market** rather than about our
  store — true while every bar is the consolidated tape, a single venue's silence
  reported as the whole market's the moment it is not.
- **Nothing checks that a named region says something when its subject is
  missing.** A region whose content is legitimately conditional looks identical
  to one whose content silently disappeared; one screen is covered by one browser
  test. **Owner: the next story that adds a region.** Beside it, two smaller
  findings from the same pass. The first is **closed since 2026-09-16, by the
  sentence ceasing to exist**: the defaulted search note invited a reader to use
  a control that had just said it was unavailable, and its trigger — the second
  sentence in the product pointing at another surface's control — never fired,
  because the search field moved onto the page's heading row and the note was
  deleted as the thing it pointed at came into view. The trigger stands for the
  next such sentence. The second is **also closed on 2026-09-16**, by the owner
  clause doing exactly what it was written to do: **the masthead's primary
  navigation was clipped at 390**, reading `Market O` with no affordance saying
  so, owned by the first story to touch `AppHeader` — and the day's second
  design change was that. At 390 the navigation now takes a row of its own under
  the identity block and the clock, so it gets the full width: two whole tabs
  and the left edge of a third. Still a scroller; now one that visibly is one.
- **The weekday `1D` photograph**, which no address, fixture or pinned clock can
  produce, because the free plan's fifteen-minute embargo only exists during a
  session. **Narrower since 2026-09-14**: a named window now ends at the last
  session whose _bell has rung_, so `1D` before the open is a complete chart
  rather than an empty one, and the photograph that cannot be taken is only the
  one between the bell and that night's backfill.

**Two stores photograph differently and both are correct.** The deployed store is
backfilled nightly and answers the default window in full; a developer's answers
it short. **CI's store has 518 securities and zero bars**, so every chart there
is a correct `empty` — which is why a new browser assertion about a number is an
assertion about data the runner may not have. `pnpm store:bare` reproduces that
shape locally.

For anything more specific than this section — what was measured, what was
rejected, what a green check does and does not certify — read the record below
rather than asking here. The per-story narrative that used to live here moved
into those documents on 2026-09-14; nothing was lost, and every figure it carried
was checked for a surviving home first.

## Where the record lives

This repository documents itself thoroughly, and **that documentation is the source of truth, not this file**. Before designing anything in a subject below, read its document; before re-litigating a decision, read its ADR.

| Subject                                                                                                                                      | Read                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Every architectural decision, and what each green check certifies                                                                            | [`docs/adr/README.md`](docs/adr/README.md) — a current index, not an append log                                                                        |
| **What a green `pnpm verify` does NOT certify** — the claims nothing mechanical guards, each with a re-measure                               | [`docs/GAPS.md`](docs/GAPS.md)                                                                                                                         |
| Hosting, the deployed environment, Azure resources, the database's creation decisions, the credential path                                   | [`HOSTING.md`](planning/epic-01-application-foundation/story-11-deployment-pipeline-and-dev-environment/HOSTING.md)                                    |
| The design language, the visual bar, tokens and their rationale                                                                              | [`VISUAL-LANGUAGE.md`](planning/epic-01-application-foundation/story-04-ui-component-library-and-styling-conventions/VISUAL-LANGUAGE.md)               |
| **The source of truth for the design language**, the reconciliation and its one exception                                                    | [`ADR 0026`](docs/adr/0026-the-design-canvas-as-the-source-of-truth.md) — and the canvas itself, via `DesignSync`                                      |
| The browser-test tooling spike and what was rejected                                                                                         | [`BROWSER-TESTING.md`](planning/epic-01-application-foundation/story-13-end-to-end-browser-testing/BROWSER-TESTING.md)                                 |
| Browser-suite rules: what a spec must not assert, the axe decision, what a green run does not certify                                        | [`e2e/README.md`](e2e/README.md)                                                                                                                       |
| Migration and schema conventions, and how to recover from a failed migration                                                                 | [`apps/backend/migrations/README.md`](apps/backend/migrations/README.md)                                                                               |
| The query layer, the migration tool choice, the temporal seam                                                                                | [`DATA-LAYER.md`](planning/epic-02-security-universe-historical-data/story-02-database-schema-and-migrations/DATA-LAYER.md)                            |
| What a security is, how the universe is curated, the `status` predicate and its readers                                                      | [`UNIVERSE.md`](planning/epic-02-security-universe-historical-data/story-03-security-domain-model-and-tracked-universe/UNIVERSE.md)                    |
| The trading calendar, market time, the clock seam                                                                                            | [`CALENDAR.md`](planning/epic-02-security-universe-historical-data/story-05-trading-calendar-and-market-time/CALENDAR.md)                              |
| The market-data provider interface, the outcome taxonomy, provenance                                                                         | [`PROVIDER.md`](planning/epic-02-security-universe-historical-data/story-06-market-data-provider-abstraction/PROVIDER.md)                              |
| Alpaca's measured limits — **dated observations of a third party, re-measure rather than cite**                                              | [`ALPACA.md`](planning/epic-02-security-universe-historical-data/story-07-alpaca-historical-data-integration/ALPACA.md)                                |
| The bar store, sizing arithmetic, the backfill                                                                                               | [`BARS.md`](planning/epic-02-security-universe-historical-data/story-08-historical-bar-ingestion-and-storage/BARS.md)                                  |
| The market-data wire: the window, the cap, the stitch, provenance's grain, caching, compression                                              | [`MARKET-DATA-API.md`](planning/epic-02-security-universe-historical-data/story-09-market-data-api/MARKET-DATA-API.md)                                 |
| How the frontend holds state and fetches: the store, the cache, the URL, retryable, and what a page announces                                | [`FRONTEND-STATE.md`](planning/epic-02-security-universe-historical-data/story-10-frontend-market-data-layer/FRONTEND-STATE.md)                        |
| Search, selection, the URL rule, the input idiom, the Explorer shell, and the keyboard flow                                                  | [`SEARCH-AND-SELECTION.md`](planning/epic-02-security-universe-historical-data/story-11-security-search-and-selection/SEARCH-AND-SELECTION.md)         |
| **How this product draws**: the renderer, the series type, the session-ordinal axis, the coverage rule, the states, the walk and the figures | [`CHARTING.md`](planning/epic-02-security-universe-historical-data/story-12-price-chart/CHARTING.md) — and ADR 0027                                    |
| The time window, the second plot, and what stays on screen while a second request is in flight                                               | [`VOLUME-AND-WINDOW.md`](planning/epic-02-security-universe-historical-data/story-13-volume-chart-and-time-window/VOLUME-AND-WINDOW.md) — and ADR 0028 |
| **What this product claims about its own data**, in whose words, and the complete set of its failure and partial states                      | [`PROVENANCE.md`](planning/epic-02-security-universe-historical-data/story-14-provenance-partial-states-and-epic-close/PROVENANCE.md) — and ADR 0029   |
| **What the live market socket actually does** — every frame, the rates, the faults, and Epic 3's eight decisions                             | [`LIVE-DATA.md`](planning/epic-03-live-market-data/story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md) — read §0 first                  |
| Setup, commands and the running application, for humans                                                                                      | [`README.md`](README.md)                                                                                                                               |

Every story has a `STORY.md` with acceptance criteria and open decisions, and every task a `TASK-NN-*.md` with what was done and what was found. **Read the STORY.md before starting a story**: several carry open decisions that are deliberately unresolved and should be settled with the user rather than assumed.

## How we work

Work descends epic → story → task, in small iterations. **Do not scaffold ahead of the current step**: build the thin slice asked for, keep it working, then move on. Do not add infrastructure (databases, workers, WebSockets, agent plumbing) before the iteration that needs it.

**Prefer a vertical slice to a layer** wherever the dependency graph allows. A run of stories with no visible change is how a product stops being demonstrable; Story 2.4 was inserted for exactly that reason.

### The working loop

Written down on 2026-09-14, after a layout change took 52 minutes of which nine
were the edit. Each of these cost real time that session.

- **Look at the page before you run a suite.** `pnpm probe` is thirty seconds
  and the browser suite is five minutes. This repository's record says the same
  thing five times over — `VOLUME-AND-WINDOW.md` §69, §71 and §72 each open with
  a defect "found by a person opening the page" and invisible to everything
  mechanical, and the change that added `probe` found two more the same way.
  Both were plain in its output and in nothing else.
- **Run the specs your change touches first**, the whole suite once at the end.
  A scoped run is seconds.
- **Never start a second heavy job while one is running** — the lock now refuses,
  and the reason it had to be mechanical is that the failure is deceptive rather
  than loud. See the entry in [`docs/GAPS.md`](docs/GAPS.md).
- **A tolerance is measured, never argued.** Take the number from `pnpm probe`,
  then write the assertion around it. A plot-gap ceiling written from argument
  was 180; the figure is 190, and learning that cost a full suite run.
- **Do not idle while a background job runs.** Write the record, amend the
  documents, prepare the commit. Polling a log is the one thing that is never
  the next piece of work.
- **Before asserting on a NUMBER in a browser spec, ask whether CI has the
  data.** CI's store is 518 securities and **zero bars**, so every chart there is
  a correct `empty` and every figure on the security page is absent. This has
  cost a six-minute round trip once (#314, `no Close label in the region`).
  `pnpm store:bare` answers it locally in seconds.
- **A check you add owes a break.** Add the entry to `scripts/breaks.mjs` in the
  same change and run `pnpm break <name>`. A check that has never failed has
  never been tested, and the harness restores the tree so there is no reason not
  to.

**Every story and task states what the user will be able to see**, and the honest answer is often "nothing". Three rules: say "nothing visible" plainly and name the story that pays it off; describe what is _on the screen_ rather than what was built; and say what the user still cannot do.

**Decisions are recorded with their alternatives and a reversal trigger.** A trigger is a _condition_ ("the first check that fails without a database", "a fifth pinned action"), never a story number — story numbers move, and a trigger written against something that has already happened will never fire.

**Measure rather than cite.** A stated invariant that nothing checks quietly stops being true; re-take a figure rather than carrying one forward, especially one from this file. Corollaries learned the hard way:

- **A break that does not go red is not evidence the check works** — it is equally evidence the break did not land. Verify the substitution.
- **A figure that has moved looks exactly like a figure that was mis-recorded.** Only rebuilding the old commit tells them apart.
- **A throwaway instrument's findings section must quote at least one frame, body or row VERBATIM.** _Run it, record the findings, delete it_ is the established shape (`ALPACA.md` §11) and it works — measured on 2026-09-18, a fortnight after Epic 3's harness was deleted, at **12 of the 14 frames a downstream story needed**. The two it missed came from the one section that recorded a **behaviour** without quoting the bytes that carried it, and the failure is invisible at the time: the finding is complete and the argument sound **until somebody needs the evidence rather than the conclusion**, by which point the instrument is gone. Cost: a fixture with an inferred shape, and a `docs/GAPS.md` entry to retire it.
- **A sentence duplicated for legibility must be counted with a grep before it is corrected**, and a live claim must be told apart from a historical record. Story files record what was true when they were written; correcting those destroys the record. Amend live claims, leave historical ones.
- **ADRs are never renumbered and their decisions are never rewritten**; a present-tense description of the tree that has become false gets a dated amendment beside it.
- **An applied migration is immutable.** The checksum hashes the whole file, comments included, so editing one — even a comment — makes the next deploy refuse. Applied migrations therefore contain historical claims that are wrong today, and that is the correct state.

**A measurement that falsifies a governing document is swept the same day, not at the story close.** Falsification travels **upward**: a task measures a vendor or the tree, and what it invalidates is a premise in an ADR, an invariant in this file, or `PRODUCT_SPEC.md` — and nothing sweeps upward, because a story close sweeps that story's own documents. Note also that **recording a correction and propagating it are two obligations**, and the mechanism that defers the first — "Task N is the deadline" — routinely covers only the product decision the measurement forces, not the document that was wrong. Grep for the claim, correct the live sites, give an ADR a dated amendment rather than a rewrite, and leave the historical records standing. This has happened: for a day, `ALPACA.md` and ADR 0019 both recorded that `PRODUCT_SPEC.md` §7.1's feed claim was false while §7.1 itself, `README.md`, two other ADRs and invariant 6 here went on asserting it.

**A hand-off sweeps SIDEWAYS, and a story close does not reach it.** The same
blind spot with the arrow turned: a close sweeps the documents the story
**wrote**, and a constraint one story measured for another lives in a document
the **owning** story does not own. Nothing about a close naturally crosses that
boundary. So a story that measures something for a sibling must write the
constraint **into the sibling's `STORY.md`, in words that story can act on** —
never a link back, because a pointer is what a reader follows when they already
know to look, and the whole failure is that they do not. **Enumerate by grepping
the subject document for every `Story N.M` and `Owner:` line, then check each
against that story's own file, and record the count that were missing.** This has
happened: Epic 3's spike close gathered five constraints for one story, the
canvas answer for another and two more besides — and missed a story its own
findings document named in as many words, having written down, in that same
close, that this is _"exactly how a measured constraint gets lost"_. It was found
two stories later, by accident, by somebody implementing an unrelated mapper.

**Renumbering a story means remapping every reference in the same change.** A sequence whose numbers do not reflect its order is a trap for every future reader. The technique matters, because the obvious implementation corrupts data: replace only where a `Story`/`Stories` prefix puts it beyond doubt (allowing for the prefix being separated by a newline and a comment marker), **exclude every applied migration**, then read the residue by hand. A blind substitution turns `jiti@2.7.0` into a version that does not exist and `eastus2.5.azurestaticapps.net` into a different hostname.

## The UI bar

**The UI has to be outstanding, and that is a standing instruction rather than a preference.** It must excite the people who see it and must never read as old-fashioned, basic, or like a default admin panel.

This is not in conflict with "dense, sober, institutional" — that describes a category, and the best products in it are exciting because of how well they are made. **Restraint is not the same as plain.** Four tests a stranger can apply to a screenshot: would they believe it is a real funded product; does it look designed rather than defaulted; is there a moment in it worth showing somebody; does it feel alive.

**Visual quality is an acceptance criterion on the story that builds the screen, not polish deferred to a later epic** — polish deferred is polish never, and there is no design-review epic. Correct and accessible is the floor, not the goal.

`VISUAL-LANGUAGE.md` holds the design language and its open questions; it was **rewritten by the 2026 design refresh** (ADR 0022), which gave the product self-hosted typefaces, a crimson identity accent scoped to four positions in the chrome, a cool ground and square corners.

**Since 2026-09-11 that file is no longer the origin of the language** (ADR 0026). The `Component library for MarketPulse` design canvas is the source of truth, reached with the `DesignSync` tool, and the chain is **canvas → `VISUAL-LANGUAGE.md` → `tokens.css` → components**. Where the document and the canvas disagree, the document is wrong; downstream the old rule is unchanged, and a component still may not diverge from the document. There is **one standing exception**: where a canvas value fails a measured accessibility floor, the intent is adopted and the value is not, with the measurement recorded beside the token. It has fired four times — the input boundary, the placeholder ink, a validated tick the canvas drew in the green this product spends on price-up, and the source note's micro ink, measured at 4.26:1 on the page ground on 2026-09-14. Two things from it that are settled and load-bearing: **colour is never the sole encoding of anything** (the price palette differs by 1.04:1 in greyscale, so hue is the entire difference — shape, sign, glyph or word must carry it), and **standing out, like receding, is a job for weight and hierarchy, never for ink outside the contrast floor**. Both have caught real defects.

## Commands

```
corepack enable    # once per machine — pnpm comes from the repo pin, not a global install
pnpm install

pnpm verify        # build → lint → format:check → stories → env:check → links → invariants →
                   # coverage:check → test → test:process
                   # This is what CI runs, BY NAME. CI defines no step of its own, which is
                   # what keeps one definition of "verified". Runs with no servers, no
                   # database, no network and no credentials — keep it that way.

pnpm build         # tsc -b, THEN the frontend bundle, THEN Storybook. Hardcodes the frontend
                   # package name TWICE — read it whenever a package is added.
pnpm typecheck     # the tsc -b half only; no bundle
pnpm lint          # eslint . over the whole workspace in one process; also lint:fix
pnpm stories       # fails if a component under src/components/ has no stories file
pnpm env:check     # fails if .env.example and CONFIG_VARIABLES have drifted apart
pnpm invariants    # the claims that used to be prose in docs/GAPS.md, each a single grep.
                   # The run prints its own count; no prose here repeats it, because two
                   # copies of that number have gone stale already.
                   # Runs AFTER build — one of them reads apps/frontend/dist/. Every one is
                   # break-verified by a `pnpm break` entry.
pnpm break         # perform a documented break, prove the check goes red, put the tree back.
                   #   pnpm break                       # list what it knows how to prove
                   #   pnpm break ceiling-spelled-twice
                   # Refuses on a dirty target, restores on every signal, and checksums the
                   # file either side. scripts/breaks.mjs is the registry — add to it with
                   # any check you add.
pnpm links         # fails if a relative Markdown link points at nothing. Skips http(s)://
                   # deliberately, so verify never needs the network.
pnpm test          # all packages. Fast by contract: no build, no socket, no database, no network
pnpm test:process  # the backend's process half — spawns dist/index.js. A verify step. ~5s of it
                   # IS the shutdown ceiling elapsing.
pnpm test:database # against a real PostgreSQL server. NOT in verify, NOT in `pnpm test`.
                   # Creates its own database, migrates it, reads it, drops it.
pnpm coverage      # the same tests with --coverage. Not in test, not in verify, gates nothing.

pnpm dev           # all three packages in parallel; all three are real watch loops
pnpm ready         # is the running pair actually up? Three checks. NOT a verify step.
pnpm db            # the local PostgreSQL container. Arguments forwarded: `pnpm db down`,
                   # `pnpm db logs -f`, `pnpm db exec postgres psql …`. `down -v` drops data.
pnpm migrate       # apply pending migrations. Forward-only; REFUSES arguments.
pnpm universe      # load the tracked universe. A seed, not a migration: it converges on the file.
pnpm universe:check # compare the curated universe against the vendor. Changes nothing. Needs network.
pnpm bars          # fetch and print one symbol's bars. Read-only, stores nothing. Metered request.
pnpm backfill      # fetch and STORE bars. Metered, paced, sequential.
pnpm bars:check    # what is missing from the store, and why.
pnpm store:bare    # build `marketpulse_bare` — CI's store, 518 securities and ZERO bars —
                   # beside your own, with CI's own two commands. Then:
                   #   DATABASE_NAME=marketpulse_bare pnpm dev
                   # and run a spec against it. Your own store is untouched.
pnpm e2e           # the browser suite against a pair YOU started with `pnpm dev`. ~5 min.
                   # EVERY argument is forwarded to Playwright, so scope it while iterating:
                   #   pnpm e2e security-price-chart.spec.ts
                   #   pnpm e2e security-price-chart.spec.ts -g "one axis"    # 2.6s, not 4.9m
                   # Takes the heavy-job lock; `--anyway` overrides and is not forwarded.
pnpm e2e:deployed  # the same browser against the LIVE environment. Needs both deployed addresses.
pnpm probe         # LOOK at a layout, against the pair you started. NOT a test and NOT a gate.
                   #   pnpm probe /securities/NVDA --within Price
                   # Per viewport (1440/1024/768/390): every element with a module class, its
                   # box, its computed `flex` and its RESOLVED grid tracks, plus a screenshot in
                   # .probe/ and any page error. Thirty seconds, and it is where a tolerance's
                   # number comes from. `--widths 1440,390`, `--all`, `--story <id>`.
pnpm image         # build the backend container image. Pushes nothing.
pnpm clean         # tsc -b --clean, plus the frontend's dist/ and storybook-static/
pnpm format        # prettier --write .   (also format:check)

# Working on one package — the same six verbs mean the same thing in each:
pnpm --filter @marketpulse/shared build      # or typecheck / lint / lint:fix / test / dev
pnpm --filter @marketpulse/shared run clean  # `run` is REQUIRED here — see below
pnpm --filter @marketpulse/backend start     # runs the BUILT output; build first
pnpm --filter @marketpulse/frontend preview  # serves dist/ on :4173; build first
pnpm --filter @marketpulse/frontend storybook       # the workshop — :6006
pnpm --filter @marketpulse/frontend storybook:build

# Running less than everything. The path is relative to the PACKAGE, and nothing needs a `--`:
pnpm --filter @marketpulse/backend test src/config.test.ts    # one file
pnpm --filter @marketpulse/frontend test PriceChange          # any path substring
pnpm --filter @marketpulse/backend test -t "freezes what it returns"  # one test by name
pnpm --filter @marketpulse/frontend exec vitest --watch       # watch mode; --watch is REQUIRED
```

**First run of a clean clone is five steps** — `pnpm install` → `pnpm build` → `pnpm db` → `pnpm migrate` → `pnpm universe` — and **the last two have no symptom if skipped**: an unmigrated or empty database ticks in `pnpm ready`, passes `pnpm verify` and serves `pnpm dev`.

Every package exposes `dev`, `build`, `test`, `lint`, `typecheck`, `clean` and they mean the same thing in each. `lint:fix`, `start`, `preview`, `storybook`, `coverage` and the extra test configs are extras, not part of that convention — a package added tomorrow owes the six.

Docker is a prerequisite for `pnpm db` and `pnpm image` and **nothing else**; install, verify, dev and e2e all run without it. The Playwright browser is a separate explicit command, `pnpm exec playwright install chromium`, once per machine — `pnpm install` fetches no browser.

## Repository map

```
.github/workflows/verify.yml   the pipeline: THREE jobs — verify, e2e, database —
                               all three required checks on `main`
.github/workflows/deploy.yml   migrate → load universe → deploy backend → deploy frontend →
                               check-deployed. Separate workflow, keyed on workflow_run.
apps/backend/                  Fastify server
  Dockerfile, ../.dockerignore read by no tool in `pnpm verify`
  migrations/*.sql             forward-only, sequence-numbered, checksummed, immutable once applied
  scripts/dev.sh               the dev loop; read by no tool in `pnpm verify`
  src/index.ts                 the process: listen, signals, crash handlers, the pool, the only exit
  src/config.ts                one of TWO files reading process.env; CONFIG_VARIABLES lives here
  src/entra-token.ts           the other one — deliberately, so a credential never reaches Config
  src/server.ts                buildServer() — the app, without listening
  src/database.ts              the pool; the only place shipped serving code constructs one
  src/migrate.ts               the migration mechanism (the runner script is a thin wrapper)
  src/schema.ts                the database as Kysely sees it; hand-written, not generated
  src/universe.ts              the tracked universe as typechecked data
  src/market-data-provider.ts  the provider seam; deliberately NOT in packages/shared
  src/alpaca-*.ts              the vendor client: mapping (pure) split from transport
  src/fixtures/alpaca/         RAW recorded vendor bodies. Excluded from Prettier and from
                               line-ending normalisation ON PURPOSE — both would rewrite evidence.
  src/routes/                  health, securities, market-data, diagnostics
apps/frontend/                 React + Vite
  .storybook/                  reuses vite.config.ts; both files sit outside every tsconfig
  public/staticwebapp.config.json   the DEPLOYED host's configuration — part of the artefact
  src/api-client.ts            the ONLY file in the application that calls fetch
  src/use-*.ts                 four hooks; three make network requests, one reads the clock
  src/market/                  the FIRST feature module (§26); its index.ts is its API, and a
                               lint rule forbids importing anything else under it
  src/fixtures/                RECORDED bodies of BOTH requests this application makes —
                               GET /market-data/bars and GET /securities — plus the one shared
                               `fetch` stub. Each has a module collapsing its bodies through the
                               REAL transition, so a story holds a state the app can reach rather
                               than one somebody typed. Formatted, unlike the backend's vendor
                               fixtures — .prettierignore says why. Outside src/market/ on purpose
  src/components/<Name>/       <Name>.tsx + .module.css + .stories.tsx, one component per file
  src/styles/                  fonts.css (three self-hosted faces) → tokens.css (achromatic)
                               → brand.css (the identity accent, chrome only) → market.css
                               (market meaning) → base.css, in that order at the mount;
                               plus type/a11y module layers reached only through `composes:`
  src/routes/paths.ts          every path, once
packages/shared/               domain types shared by both apps; consumed as BUILT OUTPUT
  src/market-time.ts           the ONE module converting UTC ↔ market time (enforced by lint)
  src/market-calendar.ts       a checked-in table of exceptions, 2024–2028; refuses outside it
e2e/                           the browser suite — a fourth workspace package, see its README
scripts/*.mjs                  every root script's mechanism, or a thin wrapper over one in src/
docs/adr/                      the decision record
planning/                      PRODUCT_SPEC.md, EPICS.md, epics, stories, tasks
compose.yaml                   the local database; every value required with no default, so a
                               bare `docker compose up` refuses and names `pnpm db`
```

Files not listed are either obvious or documented where they live.

## Conventions and traps

### Workspace and toolchain

- **Node 24.x is required, not recommended.** `engineStrict` is on, so pnpm refuses to install under another major. Node 23 cannot bootstrap the repo at all — its bundled Corepack has a stale npm signing keyset.
- pnpm settings live in `pnpm-workspace.yaml`, **not `.npmrc`** — pnpm 11 silently ignores workspace settings left there.
- **Install scripts are denied unless named in `allowBuilds`.** When it fires, allowlist the specific package; never disable the check. Note it is keyed on a package **name, not a version**, so one entry can admit any number of scripts.
- **Shared tooling lives at the root; packages declare only what they import.** "Does the package's source `import` it?" is the whole test. ESLint, Prettier, TypeScript, Vite and Vitest are root-only; React and `@types/node` are not.
- **TypeScript is pinned below npm's `latest`** because typescript-eslint's peer range has not caught up and this repo relies on type-aware linting. Check the range before raising it. `@eslint/js` does not share a version line with `eslint`.
- **`pnpm clean` is a pnpm built-in** that removes `node_modules`; the root script shadows it. `pnpm --filter <pkg> clean` dispatches to the built-in and fails — **`pnpm --filter <pkg> run clean`** works. Before claiming any new script name, check it against `pnpm help -a`, and validate the detection against a known built-in in the same run.
- Most root scripts do **not** fan out — the reference graph already orders the work. Only `test`, `dev` and `coverage` use `pnpm -r`.
- `.claude/worktrees/` is in both the ESLint ignores and `.prettierignore`. Anything else nesting a checkout here needs the same two entries.

### TypeScript

- Packages are consumed as **project references with built output**, so build before you typecheck.
- **Typecheck with `tsc -b`, never `tsc --noEmit`.** Against a _stale_ `dist`, `--noEmit` reports success while the code is broken. Every `typecheck` script is `tsc -b` for this reason.
- **Relative imports carry `.js` extensions** from `.ts` files (`./ticker.js`, `./App.js` for an `App.tsx`), and every package needs `"type": "module"`. `nodenext` requires the _emitted_ filename. **`tsc` is the only enforcer** — Vite, Rolldown and Vitest all resolve happily without it, so a green build or a green test suite is not evidence the convention was followed.
- **`tsc -b --clean` deletes the output of the sources that _currently_ exist.** Delete a source by hand and its `dist/` files survive every subsequent clean, forever. Clean _before_ deleting. The mirror: deleting `dist/` by hand while leaving `tsconfig.tsbuildinfo` makes `tsc -b` emit **nothing**, because it still believes the output is current — `pnpm clean` is what is needed.
- `tsconfig.base.json` deliberately omits `noUnusedLocals`/`noUnusedParameters`; `@typescript-eslint/no-unused-vars` owns that. Don't add them back. Every option in that file carries a comment saying why — change one, change the comment.
- `apps/frontend` sets `noEmit`, which is what resolves the `dist/` collision between `tsc` and Vite. Safe **only** because it is referenced by nothing; it would be actively wrong for `packages/shared`.
- **`exactOptionalPropertyTypes` is on**, so "absent" and "present as `undefined`" are different types. A constructor with an optional parameter has to branch and build the object two ways. This is the setting behaving correctly, not friction to route around.

### Lint and format

- One `eslint.config.mjs`, and **the block order is load-bearing**: ignores → recommended → type-aware TS → per-package globals → React → Storybook → `disableTypeChecked` **last**. Seven-plus config files depend on that trailing block; without it they are a hard parsing error, not a silent skip.
- Linting is **type-aware**, so `packages/shared` must be built for it to mean anything, and `no-undef` is off for `.ts` (undefined-global errors come from tsc). It _is_ an error in `scripts/*.mjs`, which is why those have a globals block.
- **`--max-warnings 0` is in every lint script.** Plugin rules at `warn` severity would otherwise pass CI with real findings in them.
- Take a plugin's config from **`configs.flat`** / **`configs["flat/recommended"]`**, not the unprefixed one — both exist, the unprefixed is eslintrc-shaped, and ESLint 10 rejects it outright.
- **`eslint-config-prettier` is deliberately not installed** — measured, zero formatting rules are enabled. If a real conflict appears it goes last.
- Every Prettier option is explicit even where it restates a default, so an upgrade cannot quietly restyle the tree. LF is stated in three places (`prettier.config.mjs`, `.editorconfig`, `.gitattributes`) and all three must agree.
- **Four `no-restricted-syntax` rules hold acceptance criteria that used to be prose**: constructing an `Intl.DateTimeFormat` or spelling the market's timezone identifier anywhere but `packages/shared/src/market-time.ts`, and `Date.now()` or a **zero-argument** `new Date()` anywhere in `packages/shared/src`. What they cannot see is a conversion that hard-codes an offset and names no timezone.

### Frontend

- **The browser boundary is a lint rule, not the tsconfig `types` array.** The array stops auto-discovery but cannot stop a `/// <reference types="node" />` inside a declaration file the stories drag in — so `process` typechecks in browser code. `no-restricted-globals` and `no-restricted-imports` over `apps/frontend/src/**` are the only thing standing there. Both things downstream of tsc are silent: `process.env.X` compiles to `{}.X`, and `import "node:path"` **builds at exit 0**.
- **CSS Modules have one idiom: `cx(styles.a, styles.b)`.** Template interpolation is a lint error under `noUncheckedIndexedAccess`, and bracket access is a `dot-notation` error. A single class handed to a component whose `className` accepts a function needs `cx()` too — that is a hard `TS2375`, not a redundancy.
- **A CSS Module class-name typo is completely silent.** It typechecks, lints, builds and renders unstyled. Nothing in `pnpm verify` catches it.
- **Nothing below `pnpm e2e` can see a layout.** jsdom applies no stylesheet and computes no layout, so a grid whose column count or spans are wrong renders identically to a correct one in every unit, component and integration test. The specific trap, measured in Chromium on 2026-09-11: **a `span N` item wider than the explicit grid is not clamped to it — it grows implicit columns.** A `span 3` region in a two-track grid produced `134px 134px 676px`, a visibly broken page at every width under 1184px, with `pnpm verify` and all 54 browser tests green. Every breakpoint that narrows a grid must restate its spans.
- **`composes:` is legal only in a rule whose selector is a single class**, and it fails the _build_ rather than doing nothing. It emits each composed rule exactly once, so never import a `composes:` target from `main.tsx`. **A `composes` change does not reliably hot-reload** — restart the dev server before believing any measurement of a break in one.
- **CSS is the source of truth for design tokens**; `styles/tokens.ts` is a typed cached reader over `getComputedStyle`. Everything reads back as a _string_. It throws at startup if a declared token is missing from the stylesheet — which is the point.
- **No stylesheet is applied in the test environment**, so `getTokens()` throws there and "do not assert on colour" is structural rather than a discipline. A browser is the only level that can see contrast.
- **Focus is the token layer's job**, one global `:focus-visible` rule. A component declaring its own is answering a question already answered.
- The workshop line: a `.tsx` under `src/components/` owes stories, anywhere else does not. The test is _does it have states worth reviewing side by side?_ The rule is enforced in **one direction only** — a stateful component dropped into `src/routes/` escapes silently.
- **axe's scope changes the answer.** The Storybook addon scopes to `#storybook-root`; a whole-document run adds page-level rules a story fragment structurally cannot satisfy. Never compare the two. A permutation grid conflicts with landmark uniqueness only for landmarks with **no accessible name**.
- **Frontend configuration is substituted at build time**, so one artefact cannot be promoted across environments — pointing the app at a different backend is a _rebuild_, not a setting. A `VITE_` prefix is a boundary against accidents, not a permission: prefixing a credential puts it in a file every visitor downloads.
- `base` and `basename` are one input with two readers. Setting only Vite's `base` gives an app that loads perfectly and renders the not-found route at its own address, with every link pointing off the deployment.
- **`vite preview` is not a static host** and neither is the deployed one — three hosts, three behaviours for an unmatched path: `python3 -m http.server` 404s, `vite preview` splits on the `Accept` header, Azure Static Web Apps splits on path. Never write "the SPA fallback" without saying which host you mean.
- **A sticky edge occludes focus, and the browser's own scroll-into-view does not know it.** **There are two of them since 2026-09-16** — the masthead and `AppFooter`'s status bar — answered by `scroll-padding-top` and `scroll-padding-bottom` reading `--sticky-chrome-height` and `--sticky-footer-height`, each published by the component that measures itself. The figures below are the top edge's, taken against the two-row chrome that has since become one row; the mechanism is what matters and it is unchanged. Sequential focus navigation — every press of Tab — scrolls the target to the top of the scrollport and stops, which parks it behind the chrome. Measured 2026-09-11 on `/securities/NVDA`: **one** occluded stop at 1440×900, **four** at 768×800 and **two** at 390×780, and it **worsens as the viewport narrows** because the status strip wraps — so a development machine shows the least of it. jsdom has no layout and axe reads zero violations throughout, because this is a fact about where a scroller stopped rather than about a DOM. The one repair is `scroll-padding-top` on the scroll container, and it cannot be a token: `--app-header-height` is the masthead only and the chrome's real height exists at three values, so `AppHeader` measures the element and publishes `--sticky-chrome-height`. **It does not help a target taller than the viewport** — the browser does not scroll something it already considers in view.
- **A natively `disabled` control is not focusable, so anything `aria-describedby` hangs off it is unreachable.** A description is read when a control is _reached_. This shipped for two tasks: search's unavailable states carried a correct, attached, visible sentence that no key press could get to. `TextField` therefore renders `aria-disabled` + `readOnly` rather than `disabled`, product-wide — **and the consequence has to be followed**: the state stops being inactive, so WCAG 1.4.11's and 1.4.3's exemptions stop covering its border and its ink.
- The React Compiler rules (17 of them, all effectively at error) **first fired on 2026-09-11**, on Story 2.11's combobox — the first component in the tree with real interactive state. Until then they had never fired, which was evidence that nothing had yet written the shape they dislike rather than that the tree satisfied them. Both catches were correct and both repairs were _simpler_ than the code they replaced: `refs` rejected a value written to a ref during render that never needed to survive one, and `set-state-in-effect` rejected clearing a live region from an effect body when the empty state was derivable. Expect them on anything holding state; treat a firing as a design note rather than a rule to route around.

### Backend

- **`config.ts` throws and never exits**, validates on call rather than on import, and reports _every_ bad key rather than the first. `index.ts` is the only thing that exits.
- **The resolved configuration is never logged.** `redact` was rejected as a denylist whose failure mode is the key nobody added.
- **There is no `NODE_ENV` and nothing branches on which environment it is in.** What differs is where _values_ come from. The reversal trigger is the first thing that must _behave_ differently rather than be _configured_ differently.
- **Every route that can fail must declare `500: apiErrorSchema`**, and nothing in `pnpm verify` checks that you did — a test walking the route table does.
- **`fast-json-stringify` strips every property the schema does not declare.** That is the mechanism behind "no internal detail reaches a client", and it means **a leak test that passes may be testing the schema rather than the handler**: adding a field to a handler's response leaves the test green until the field is declared in the schema too.
- Declare a response schema's properties `satisfies Record<keyof TheType, JsonSchemaProperty>`. A field on the interface and not in the schema is then `TS1360` rather than a value that silently vanishes on the wire. **Copy this idiom for every new route.** Two gaps remain: a declared JSON type disagreeing with the TypeScript one is coerced silently — produced twice, and the pair is what makes it land: a `null` under `"string"` reaches the wire as `""`, and a `null` under `"number"` reaches it as **`0`**, a plausible price rather than a visibly empty string, and a `required` property the handler omits is a runtime 500.
- **A 5xx never carries the thrown message.** A message written for a developer is internal detail too.
- **Fastify writes one listening line per bound interface, loopback first**, so the first line reads `127.0.0.1` whatever you set. Check the socket, not the log. At `warn` and above a healthy server is completely **silent** — anything waiting on a startup line hangs rather than fails.
- **CORS is not access control.** With a string origin the server asserts the allowed origin unconditionally and answers 200; the _browser_ compares and refuses. So a wrong allowlist is invisible to `curl` in the status, the body and the log — the one readable trace is that `access-control-allow-origin` echoes the configured value, which an instrument _told the frontend's origin_ can compare. Note `methods` defaults to `GET,HEAD,POST`.
- **`pg` has two dangerous defaults, both absences.** A `Pool` is an `EventEmitter`, and one with no `error` listener _throws_ — so a dropped idle connection becomes an uncaught exception and a crash loop on a liveness-probed platform. And `connectionTimeoutMillis` defaults to **0, meaning wait forever**.
- The database credential is a **function**, not a value, because `pg` calls it once per _connection_ — which is what makes a per-connection minted token work.
- **An `onSend` hook cannot remove `Content-Length`.** Fastify computes it from the payload after every `onSend` hook has run, so a hook that deletes the header gets it back. Measured against a running server, attempted and reverted — it is the sort of thing the next person reaching for a response hook otherwise spends an hour on.
- **`@fastify/compress` attaches its `onSend` per route via `onRoute`, so Fastify runs it after every instance-level hook.** Which means the hook-ordering trap — a compressor registered ahead of a validator strips every `ETag`, with nothing on screen wrong and every `app.inject()` test green — is not reachable through that plugin at all. Worth knowing before designing around it: the order is decided by the attachment mechanism rather than by registration order.
- **An ordering assertion needs a marker on each side of the step it is about, and the marker must travel with the step.** A log line further down the function does not move when the step does, so the break passes.

### Data layer

- **Migrations are forward-only. There is no `down`.** A `down` that has never been executed is a claim rather than a mechanism.
- **Filenames are a four-digit sequence, not a timestamp.** Two branches adding `0002_*` is a merge conflict a human resolves; two timestamps merge cleanly and then apply in an order neither author tested.
- **Never edit a migration that has been applied.** The checksum hashes the whole file including comments, and the deploy refuses.
- **Kysely wraps the whole run in one transaction**, not one per migration — a run of three whose third fails rolls back all three. Its advisory lock is session-level with a one-hour timeout, so a runner that _hangs_ holds it; anything driving `pnpm migrate` needs its own deadline.
- **`migrateToLatest()` resolves rather than throwing.** A runner that does not read `error` and exit non-zero itself is a green migration step that applied nothing.
- **The temporal seam is an arrangement, not a mechanism yet.** Five modules build their own Kysely handle and none exports it, so a call site cannot bypass the seam by importing the raw handle — but Epic 13's plugin that would make invariant 4 _structural_ is still unwritten. See ADR 0015's gap 4. Do not export a handle.
- **Story 2.3's `status` column is this schema's one invisible predicate.** Filter on it when computing over the market we track _now_; never when showing or replaying something we _stored_. Epic 13's replay must not filter.
- **Seed data is not a migration.** A migration runs once and is refused if edited; the universe loader converges on the file, so an edited row is picked up.
- A row and a domain object are different types. What maps between them lives beside the query, **one function per domain type, never a generic mapper** — the mapping is exactly where a nullable column becomes an explicit domain answer, and a generic mapper is where that decision gets skipped.
- **Money is `numeric`, never a float**, and prices are aggregated in SQL rather than in JavaScript. Float addition is not associative, so a sum can disagree with itself between two renders because a query plan changed the order.
- **`timestamptz` always.** A row carries `observed_at` (when it was true in the market) and `recorded_at` (when we wrote it); `observed_at` **never** has a default, because `default now()` silently turns one into the other on the column replay keys on.

### Tests

- **Six levels: unit, integration (`app.inject()`), component (jsdom), process (spawned child), database (real server), browser (real Chromium).** `pnpm test` runs three of them.
- **Tests live in `src/` beside their subject**, `<subject>.test.ts(x)`. This is forced: ESLint's project service only discovers a `tsconfig.json`, so a test outside the package's `include` loses the whole type-aware pass. The price is that two packages emit compiled tests into `dist/` (unreachable through the `exports` map, and subject to the `--clean` orphan rule).
- **One `vitest.config.ts` per package and no root config.** `apps/backend` has three, and their globs are **one decision**: nothing enforces the naming, so a process-style test named `foo.test.ts` runs in the fast suite and a `foo.database.test.ts` in another package runs **nowhere at all**.
- **Scope `test.include` to `src`** — Vitest's default exclude is only `node_modules` and `.git`, so with `dist/` populated every test runs twice, the second copy from the last build.
- **`apps/frontend` needs `setupFiles` calling `afterEach(cleanup)`** because `globals` is off, so Testing Library cannot register its own. The symptom lands in a _later_ test as "found multiple elements".
- **`renderWithContext` passes the router as Testing Library's `wrapper`, and that is load-bearing rather than stylistic.** `rerender(next)` replaces the **root** it was given, so a provider written around `ui` at the call site is thrown away by the second render — the component then throws `Cannot destructure property 'basename'`, from the rerender, several assertions after the one that read correctly. Any provider added there goes in the wrapper for the same reason.
- **The frontend's globs must admit `.tsx`.** A component test under a `.ts`-only glob is silently skipped; a wholly-empty run is loud, a partial one is not.
- **`coverage.include` must be explicit**, or the denominator is "files some test happened to load" and a package reports 100% with an empty table. A single-file coverage run is not that file's coverage.
- **Two 0% entrypoints are in the denominator deliberately.** `index.ts` at 0% means "no runner instruments a spawned child", not "untested" — it is the best-tested file in the backend by behaviour. There is no coverage threshold, and that is argued rather than omitted.
- **What a test must not assert**: colour (structurally impossible); a single element's text where a component splits it (assert the concatenation a screen reader is handed); a `useId()` value or a DOM snapshot containing one; a boundary reset recovering state that lives _above_ the boundary; a throw escaping `fireEvent` from an event handler; the `.js`-extension convention; a CORS rejection through `app.inject()`; an axe pass as accessibility coverage; latency without a large n.
- **Two ways to run tests fail green.** A non-matching `-t` reports skips and exits **0** — read the skipped count, not the exit code. And `pnpm test -- -t "x"` forwards the `--` literally, so the filter is ignored and the _whole_ suite runs, reporting success. Only a non-matching path is loud.
- **A green run certifies internal consistency, not a vendor.** Every fixture-backed test passes against a corpus we wrote.

### CI and deployment

- **The pipeline runs `pnpm verify` by name and defines nothing of its own.** The moment a workflow re-lists the tools, the reversal cost of the CI provider becomes the definition of "verified". `verify.yml` holds three jobs — `verify`, `e2e`, `database`.
- **Three required status checks on `main`: `verify`, `e2e`, `database`.** They live in a repository ruleset, which is invisible in a diff and readable by no tool here — **this file and ADR 0010 are the only durable record**. A reader finding fewer than three should read that as a gate having been removed rather than never set. They key on **job names**, so renaming a job un-requires it silently.
- **The badge keys on the workflow FILE name and the required check on the JOB name.** Renaming the file without moving the badge leaves it frozen green for a window and then a broken image — the wrong signal arrives first.
- **Only the pnpm store is cached. No build output, ever.** A restored `dist/` can carry orphans from a branch where a source was deleted, and the measured prize is smaller than the runner-to-runner spread.
- **`continue-on-error` makes a step's `conclusion` read `success` however it exited** — the real result is `outcome`. Never write a later step's `if:` against a marked step's conclusion, and never read the absence of one as "it was fine". This is what makes "the green tick certifies the chain and not coverage" structural.
- **Actions are pinned to commit SHAs**, which means they do not follow security releases; Dependabot watches `github-actions` only.
- **`deploy.yml` is a separate workflow** keyed on `workflow_run` of `verify`, for three reasons that are all properties of a workflow: the badge must not report a deployment, a cancelled deploy is a half-done rollout, and the required check keys on the job name. It builds nothing of its own — `pnpm build` and `pnpm image` by name.
- **There is no repository secret.** GitHub authenticates to Azure with a federated OIDC credential, and the Static Web Apps token is fetched at the moment of use.
- **The deploy migrates the database and loads the universe before either half of the code rolls.** A deploy that fails afterwards leaves the schema **ahead of** the code, which is survivable only while migrations are additive — a destructive change is two deploys, expand then contract, enforced by nothing.
- **Rollback is asymmetric.** The backend rolls back in seconds by pinning a previous image digest, and is **silently undone by the next merge**; the frontend has no revision history at all, so its rollback is a revert commit through the whole pipeline. `workflow_dispatch` is a re-deploy, not a rollback.
- **The frontend's upload is not atomic.** For roughly two seconds around a deploy that changes the artefact, a cold load can be broken — in two distinct ways, and the window _opens_ at the second the deploy step reports success. Anything checking the deployed page must poll for coherence rather than check once.
- **A deployed check runs after a merge, so it gates nothing** — its output is a rollback decision. Which is also why the axe rule is asymmetric: a **gate** before the merge, a **report** after it.
- **A check that runs from one machine over one link cannot tell its own network from the environment.** Probe more than one host before calling something an outage.

## What `pnpm verify` does not cover

A green tick means every **check** passed. It does not mean every **claim** in
this repository holds. The claims that are true, matter, and are guarded by
nothing mechanical live in **[`docs/GAPS.md`](docs/GAPS.md)** — roughly sixty
entries, each with a `Re-measure:` line. Read it before asserting that something
is covered, and add to it when a story leaves a claim standing.

Three rules govern it, and they are rules rather than reference, so they stay
here:

- **An entry that can be made mechanical should be.** Two batches have left the
  list that way: the backfill's timeframe coverage became `pnpm coverage:check`,
  and seven single-grep entries became **`pnpm invariants`**. A prose entry with
  a re-measure command is a check nobody runs; a `verify` step is one that cannot
  be skipped. What stays in the list is the residue that genuinely cannot be —
  the breaks a human has to perform, and the claims only a browser, a live store
  or a person can see.
- **A prose re-measure rots silently.** One of those seven had already gone bad:
  it named `apps/backend/src/http-cache.ts` for constants that had moved to
  `series-cache.ts`, so the grep returned nothing and looked exactly like a pass.
  When you touch a file an entry names, check the entry.
- **Every check owes a break.** `pnpm break` performs the documented breaks,
  proves the check goes red, and restores the tree; `scripts/breaks.mjs` is the
  registry. Add an entry there with any check you add.

Its runtime half is deliberately **neither** in the list nor in `verify`:
`GET /diagnostics/freshness` answers _how many trading sessions behind is the
store_, computed on request so it has no schedule to miss, and
`check-deployed.mjs` fails on it after a merge. `verify` has no credentials and
no database by design, and pointing it at a live store would fork the definition
of "verified".

Treat the list as live: it has caught real defects — a stated invariant quietly
stopped being true for two stories, and a broken link shipped.

## Intended stack

React + TypeScript, Redux for domain state, RxJS for streaming pipelines and cancellation. Node + TypeScript backend (Fastify). PostgreSQL, optionally TimescaleDB. Sigma.js/WebGL for the market topology, with the graph model kept separate from the renderer.

**There are TWO rendering decisions and the first does not govern the second.** Sigma.js/WebGL is the **topology's** renderer, chosen against 500 nodes and 5,000 edges at 60 FPS. The **2-D chart layer** — price, volume, comparison, and whatever Epics 5 and 9 hang on a time axis — is **hand-built SVG behind a wrapper, with no charting library** (ADR 0027, `CHARTING.md` §1). What constrains it is a count rather than a library: one element per bar at the 9,750-bar cap produces 9,790 plot elements and main-thread tasks of 137–254 ms, and none at the default window. A reader who assumes the topology's renderer is the product's renderer will reach for the wrong tool.

WebSocket for continuous market data; SSE/streaming HTTP for agent investigation events. These two streams have different semantics and stay separate. Note two ceilings already measured: the inbound HTTP idle timeout means **Epic 10's SSE stream must emit something at least every four minutes**, and the outbound market socket is only safe because the backend runs at a minimum replica count of one — that is a required setting, not a tuning knob.

There is **no state library and no store**, and since Story 2.10 that is a decision with a reversal trigger rather than a deferral (ADR 0023, `FRONTEND-STATE.md` §1): the URL holds the selection, a bounded cache holds parsed series, and state lives in a module as a plain discriminated union whose transition is a pure function — a reducer that has not been told it is one, which is what keeps a later move to a store a re-wiring. The trigger is **the first piece of state two features must agree about that neither owns**. Resist adding libraries before complexity demonstrates the need, and don't introduce a second database in V1 without a measurement justifying it.

## Frontend structure

Feature modules under `app/`: `market`, `topology`, `charts`, `anomalies`, `investigations`, `replay`, `filings`, `shared`. Modules expose domain-level APIs; they do not reach into each other's stores. Create a module when the iteration needs it, not before.

## Delivery order

Fifteen epics, delivered in sequence — see [`planning/EPICS.md`](planning/EPICS.md). Condensed: foundation → historical data → live data → overview → anomaly detection → topology → **deterministic investigations** → evidence workspace → SEC evidence → AI investigations → generative workspace → persistence → replay → performance → portfolio release.

Checkpoints: by end of Epic 8 MarketPulse is a credible non-AI product; Epic 10 makes it agentic; Epic 11 delivers the AI/frontend interaction the portfolio is built around; Epic 13 delivers its signature capability.

**Do not start with the AI.** The investigation engine, its analytical tools, and its event stream must work end-to-end without an LLM first. Only once the Investigation model feels correct should a model be allowed to drive it. This ordering exists specifically to prevent the architecture collapsing into `chat box → LLM → miscellaneous API calls`.

## Failure handling

Agentic failures are normal product states, not exceptions. Degrade incrementally and locally — a failed SEC lookup, analytical tool, or dropped market socket must leave the rest of the workspace and any already-gathered evidence intact and clearly labelled (e.g. "Live feed disconnected — displaying data through 10:42:17"). Never collapse to a global error screen.

## Performance targets

Measured, and published in the repo. Event → application state <250 ms p95 (excluding provider latency); 60 FPS at 500 nodes / 5k edges; >45 FPS in synthetic mode at 5k nodes / 25k edges; no routine main-thread task >50 ms; visible investigation feedback <500 ms after user action, streaming incrementally.

## Out of scope for V1

Brokerage integration, trade execution, portfolios, options, crypto, price predictions, buy/sell recommendations, social sentiment, news aggregation, real authentication, mobile UX, tick-level replay. Don't build toward these.
