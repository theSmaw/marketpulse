# Task 7.2.7 — The whole checklist, for real: first paint, layout, re-measurement, the sweep

**Status:** Complete — 2026-11-20, **with Done-when 2 explicitly NOT met and
routed rather than quietly shipped.** The checklist paints all six rows on
press and the browser spec is scoped per step, but the layout question turned
out to be structural: `Abnormal-move indicators` is **603 px before any press**
against a **613 px** scroll-padding box at 390×780, so the first row of
anything overflows it — Story 7.1's "4px of headroom" is, to the pixel, the
**unpressed** panel. Three progressively tighter row treatments were measured
and the region's tab stop stayed 69–88 px behind the masthead in all of them,
so the answer is a design decision (its own region / a collapsed summary /
withdrawing the budget) and the Product Owner's. The guard that would have
caught it goes **blind** above the viewport height, which is why nothing
noticed when the fifth tool landed.
**Story:** [7.2 The Five-Step Pipeline](STORY.md)
**Depends on:** 7.2.1, 7.2.2, 7.2.3, 7.2.4, 7.2.5, 7.2.6

## Objective

Close out this story's remaining acceptance criteria, which only make
sense once all five tools exist: the checklist's first paint, its fit at
narrow widths, the full-pipeline performance re-measurement, and the
sweep (task-file corrections, dated amendments, `docs/GAPS.md` entries).

## What the user can see when this lands

Pressing `Investigate` paints all five rows at once — not a
1-then-grows-to-5 sequence — each ticking from queued to running to
completed with a real tool name, status and duration, matching
`PRODUCT_SPEC.md` §14's own example shape. The panel fits at 390px
without landing a tab stop behind the sticky chrome (Story 7.1's own
measured trap, now with four more rows' worth of height to re-check).

## Work

- **First paint.** Seed all five known step rows client-side at press
  (`optimisticChecklist`), rather than growing from one placeholder as
  each `STEP_STARTED` arrives — the five tools are a fixed, known list,
  so this needs no wire-contract change.
- **Layout fit.** `pnpm probe /securities/NVDA --viewports
1440x780,390x780 --within "Abnormal-move indicators"` with the full
  five-row checklist showing, before writing any layout fix or
  assertion. Five rows will very likely push the panel back over the
  390×780 budget Story 7.1 landed at 601px with only 4px of headroom —
  expect to re-derive the fix, not just re-apply it.
- **Update the existing e2e spec.** `security-investigate.spec.ts`'s
  locators assume one step (`toHaveCount(1)`, a single `/^\d+ ms$/`
  match) and will break under strict mode with five completed rows.
  Scope the locators to the specific step rather than the whole region;
  keep the spec's existing, deliberate insensitivity to a tool's own
  ok/refused outcome.
- **Re-measure AC7** on a developer's own populated store (CI cannot
  produce a meaningful figure — four of five tools refuse there
  permanently, which would measure "how fast can we refuse five times").
  Reuse Story 7.1's paint-anchored, `requestAnimationFrame`-polled
  instrument for press→first-paint; add press→last-`STEP_COMPLETED`
  rendered as the figure that actually answers "how long does the whole
  investigation take," plus each step's own `durationMs` (free from the
  wire). Record the correlation tool's own cost broken out separately,
  since it is the one tool doing real I/O and will dominate the run.
- **Record AC3's reuse decision** in this task file (it's already
  recorded in `STORY.md`'s Gate 1 section — cross-reference rather than
  duplicate).
- **The sweep:**
  - `docs/GAPS.md` entries: no gated machine will ever draw an `ok`
    figure from price, peers, breadth or correlation (CI refuses all
    four permanently); the correlation tool's deployed-tier cost is
    unmeasured and named as a §28 breach candidate, condition-owned;
    no person has watched a five-step run against a real session
    (`LIVE-REHEARSAL.md` still has no Epic 7 row — Story 7.7 owns
    opening it, not this task).
  - `INVESTIGATIONS.md` amended with this story's account (what's now
    reachable, what still isn't, the shared-aggregate architecture
    change).
  - Confirm every other dated correction named across Tasks 7.2.1–7.2.6
    actually landed (`HOSTING.md`, ADR 0050, ADR 0038) — grep for
    `Story 7.2` across the docs this story touched.

## Done when

1. The checklist paints all five rows immediately on press.
2. `pnpm probe` confirms the panel fits at all four widths with no tab
   stop behind the sticky chrome; `pnpm e2e` (`search-keyboard.spec.ts`,
   `security-price-chart.spec.ts`) is green.
3. `security-investigate.spec.ts` passes against five real steps.
4. AC7's figure is taken on a populated store, reported with the
   warm/cold and loopback caveats this repository's own conventions
   require, with the correlation tool's cost broken out.
5. `docs/GAPS.md` and `INVESTIGATIONS.md` are updated; every dated
   correction named in Tasks 7.2.1–7.2.6 is confirmed present.
6. `pnpm verify`, `pnpm e2e` and `pnpm test:database` are all green.

## What was done — 2026-11-20

### 1. First paint: every row at once (Done-when 1)

`optimisticChecklist` seeds `INVESTIGATION_STEP_COUNT` rows in the same commit
as the press rather than one that grows. **The count is SIX, not five** — the
pipeline `index.ts` actually runs is the snapshot tool plus `EPIC.md`'s five
named steps, which `STORY.md` itself describes as "not one of the five steps"
while leaving it in `investigationTools` as the first row a reader sees. Six is
what the page draws and six is therefore what is seeded;
`security-investigate.spec.ts` has asserted six rows since Task 7.2.6.

**A count crosses the wire by hand; the sentences do not.** Each step's
description has exactly one home — the tool that declares it — and arrives on
that step's own `STEP_STARTED`, so a seeded row holds reserved room (the
`NBSP` idiom Task 7.1.4 already used for the single placeholder) rather than a
guessed label. What a client cannot learn from the wire in time to paint the
first frame is _how many_ rows there will be, so one number is duplicated and
one new check holds it:

- **`the-checklist-seeds-one-row-per-tool`** — `INVESTIGATION_STEP_COUNT`
  equals the number of `toRunnableTool(` calls inside `investigationTools`'
  own balanced brackets, with a "grep that matches nothing looks exactly like
  a grep that passes" refusal on each side. `pnpm invariants` now holds **93**.
- **`pnpm break a-seventh-tool-the-checklist-never-paints`** — plants the
  defect the NEXT story writes (a seventh tool appended to the pipeline,
  frontend untouched), keeping the found line so the registry's own `find`
  survives its own break. Verbatim:

  ```text
  ✓ apps/backend/src/index.ts broken → red → restored byte-identical.
    matched: the-checklist-seeds-one-row-per-tool
  ```

  The red is the clause the plant was written for, not another one. **The
  "nothing else sees it" half is verified rather than argued**: a grep for
  `investigationTools` across `apps`, `packages` and `e2e` returns the array's
  own declaration in `index.ts` and one comment in the frontend — no test at
  any level reads the pipeline's length, so the defect is invisible to
  `pnpm test` by construction.

**Two consequences of six rows that one row hid**, both in
`use-investigation.ts`, both with a new test:

- The live region was keyed on `steps[0]`, the only row there was. With six it
  would have announced the step that finished **first** as the run's outcome.
  It now reads the step the run is at — whichever is `running` while it runs,
  and the **last completed** step once the investigation is terminal (the last
  _completed_ rather than the last _row_, because a run that ends early leaves
  seeded rows holding room and keying on those answers with silence where
  something did happen).
- The 160 ms breathing latch asked whether `steps[0]` was running; it now asks
  whether **any** row is.

### 2. The layout, measured first — and Done-when 2 is NOT met

**Measured before writing anything, with a throwaway instrument that presses
the control** (`pnpm probe` cannot press a button, so it can only see the
unpressed panel; it was run too, and agrees: `header 53 + body 548 = 601px` at
both 1440×780 and 390×780). All four widths, the checklist showing, rows
completed:

```text
viewport   panel unpressed   with the checklist   scroll-padding box   region's own tab stop
1440x780        603 px            763 px                690 px         clearance   0 px
1024x780        603 px            763 px                690 px         clearance   0 px
 768x780        603 px            781 px                670 px         excluded (781 >= 780), top 61
 390x780        603 px            781 px                613 px         excluded (781 >= 780), top 10
```

**The 4px of headroom Story 7.1 recorded was never headroom for a row.** Its
601px is, to the pixel, today's **unpressed** panel — so the figure that
cleared the 605px budget was the panel _before_ any press, and the first row of
anything (26px, plus a 12px separator) was always going to overflow 613px at 390. With six rows the panel is 168px over that box, and the region's own
ADR-0039 tab stop lands **88px behind the masthead** at 390 (top 10px against a
94px chrome).

**No row treatment reaches it, measured rather than assumed.** Three
progressively tighter arms, injected as CSS against the running page: no row
padding → **781px**, plus a 4px gap → **761px**, plus micro type → **743px**,
with the clearance at −88, −78 and **−69px**. Negative in every arm, because
the browser does not scroll a target it already considers in view and the panel
is taller than the scroll-padding box however tight the rows are. Fitting a
checklist at 390 needs the panel under ~613px, which is 150+px out of a region
that was 603px before this epic touched it.

**And the guard went blind as the panel got worse.**
`search-keyboard.spec.ts`' `focusIsObscured` excludes an element at least as
tall as the viewport — deliberately, argued in its own docblock — and the panel
crossed 780px at 768 and 390 when the fifth tool landed. At 1440/1024 it is
763px, inside the predicate's reach, clearing by **exactly 0px**. So the wide
arms pass by nothing at all and the narrow arms pass by exclusion. By that
predicate the walk **is** clean: **13 stops at each of the four widths, 0
obscured**, every button and field clear by 13–606px, which is the second half
of Done-when 2 and it holds.

**Nothing was changed for it, on purpose.** The three candidate answers — the
checklist moves into its own region (a second tab stop, and a collision with
Story 7.6's `Current investigations`), it collapses to a summary line below some
width (the topology legend's precedent), or the budget is withdrawn as a target
in favour of the predicate's viewport rule — are all product/design decisions,
and the next thing to land in this region (Story 7.3's findings) is taller than
a checklist row. Recorded in `docs/GAPS.md` with the figures, the three
candidates and an owner, with a dated amendment on
`InvestigationChecklist.tsx`'s own placement paragraph so the stale arithmetic
cannot be read as current. **Routed to the Product Owner rather than taken.**

### 3. The browser spec, scoped per step (Done-when 3)

`security-investigate.spec.ts` gained the assertion only a browser can make —
**every row painted in the same frame as the press**, before any response — and
its duration assertions are now **scoped to the row carrying that step's own
sentence** rather than counted over the region, so a step left queued names
itself instead of reporting "5 of 6". The rendered order is asserted against
the pipeline's order, and the second test now also asserts that three presses
leave `STEPS.length` rows rather than two seeded sets.

The hook it needed: each row publishes its own status as **`data-step`**
(`queued`/`running`/`completed`/`dropped`) — a row is three `<p>`s in a flex
line with no role and no accessible name, so there was nothing semantic to
count. Read by no stylesheet; asserted at the component level too, so a rename
goes red in a second rather than in a five-minute browser run. The spec's
existing, deliberate insensitivity to which arm a tool reaches is unchanged.

### 4. AC 7, re-measured — and the step that matters is missing from it

Story 7.1's method, reused: paint-anchored, `requestAnimationFrame`-polled, 20
presses each after a reload, 1440×900, against the real dev backend.

```text
press → all six rows seeded (first paint)    p50 13.5 ms   p95 15.7 ms   max 15.9 ms   min 11.1 ms   n=20
press → first duration rendered              p50 32.0 ms   p95 39.4 ms   max 42.1 ms   min 25.1 ms   n=20
press → 1 rows completed                     p50 32.0 ms   p95 39.4 ms   max 42.1 ms   min 25.1 ms   n=20
press → 2 rows completed                     p50 32.0 ms   p95 39.4 ms   max 42.1 ms   min 25.1 ms   n=20
press → 3 rows completed                     p50 32.0 ms   p95 39.4 ms   max 42.1 ms   min 25.1 ms   n=20
press → 4 rows completed                     p50 32.0 ms   p95 39.4 ms   max 42.1 ms   min 25.1 ms   n=20
press → 5 rows completed                     p50 32.0 ms   p95 39.4 ms   max 42.1 ms   min 25.1 ms   n=20
completed-row counts: 5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5
step 1 durationMs: p50 0.0 ms   p95 1.0 ms   max 1.0 ms   min 0.0 ms   n=20
step 2 durationMs: p50 0.0 ms   p95 1.0 ms   max 1.0 ms   min 0.0 ms   n=20
step 3 durationMs: p50 0.0 ms   p95 0.0 ms   max 1.0 ms   min 0.0 ms   n=20
step 4 durationMs: p50 0.0 ms   p95 0.0 ms   max 0.0 ms   min 0.0 ms   n=20
step 5 durationMs: p50 0.0 ms   p95 0.0 ms   max 0.0 ms   min 0.0 ms   n=20
```

Load average **before** the run (never during it): `1.80 2.64 3.07`.

**Read the identical per-k quantiles rather than the p50.** Rows 1 through 5
complete at the same instant to the frame: the whole backend run plus its SSE
delivery lands inside **one `requestAnimationFrame` tick**, so a six-step
pipeline is not five times a one-step one in any observable way, and the
`press → last STEP_COMPLETED` figure this task asked for is the same number as
`press → first`.

**The caveats, and the third is fatal to the figure's own purpose.** (a)
Loopback — server and browser on one machine, no network, the caveat §28's
market-updates figure already carries. (b) The first paint is a **six-row**
paint, which is the whole of 8.6 → 13.5 ms against Story 7.1's figure. (c)
**It is five steps, not six, and not for the reason the task anticipated.**
Docker is not available in this worktree and no PostgreSQL server listens on
5432, so `calculate_rolling_correlation` — the one tool that reads the database
— **threw** rather than refusing, the orchestrator's Task 7.2.1 net wrote
`INVESTIGATION_FAILED`, and the sixth row drew the connection-lost sentence on
all 20 presses. So this is a **floor** (_how fast can five in-memory tools
answer_), it is strictly weaker than the zero-bar CI store the task warned
against, and **the correlation tool's cost with rows in it remains unmeasured
on every machine** — now a named `docs/GAPS.md` entry with its own owner and a
thirty-second re-measure, rather than a sentence in a task file.

### 5. AC 3's reuse decision

Recorded at Gate 1 and **not restated here**: `STORY.md`'s "Resolved at Gate 1"
section carries it at the code level — which four modules of Story 6.5's
nightly pipeline the tool reuses unchanged, which two
(`selectStrongestCorrelations`, `accumulateCorrelationInput`) are actively wrong
for a single pair and why the stored table structurally cannot answer this
question, and the two constraints the tool inherits (re-run the split guard per
leg, derive the window from `context.asOf`). Task 7.2.6 is where the
implementation found that the second of those needed more than clamping an
instant.

### 6. The sweep

**`docs/GAPS.md`** — three new entries, and one existing entry widened rather
than copied:

- _Four of the pipeline's six steps can never draw a figure on a gated
  machine, and the fifth draws an `ok` whose every count is zero_ — the
  step-by-step table. The correction worth knowing: **breadth reaches `ok` on
  CI**, because a browser attaching makes the gateway compute a pass, so the
  tool reads a real aggregate whose every count is zero. It is the only `ok`
  any gated machine has ever produced in this pipeline.
- _The correlation tool's two database reads have never been timed, on any
  machine_ — a named §28 breach candidate on the deployed tier, owned by the
  first task that presses `Investigate` against a store with bars.
- _`Abnormal-move indicators` is taller than the 390×780 scroll-padding box
  with ANY checklist in it, and the guard that would have caught it goes blind
  above the viewport height_ — §2's figures, the three injected arms, the three
  candidate answers.
- _Story 7.1's two <500 ms figures are loopback-only…_ — **widened in place**
  to a six-step run, because it is one fact with one home. It also records that
  `LIVE-REHEARSAL.md` still carries **no row for Epic 7** and that this task
  deliberately did not open one: Story 7.7 owns that ledger, and a row opened
  by a task that cannot produce a sitting is a row that looks taken.

**`INVESTIGATIONS.md`** — §0 amended (_one tool_ is now six, with the six
sentences in pipeline order, and the now-weaker claim about being proved
against a live-data store named as such), §7 carries the AC 7 re-take, §8
widened with the gated-machine table, §9 gained the two new open items, and a
new **§10** holds this story's own account: the shared-aggregate holder (ADR
0038's trigger firing, one writer, the honest `no-aggregate-yet` refusal), the
seeded first paint and the one number that crosses the wire by hand, the two
live-region consequences, and the `data-step` hook.

**`PRODUCT_SPEC.md` §28** — a dated amendment beside Story 7.1's, carrying the
re-take, the one-frame reading and all three caveats.

**Every dated correction named across Tasks 7.2.1–7.2.6 is present** — grepped
rather than assumed, over `HOSTING.md`, `docs/adr/0050-*.md` and
`docs/adr/0038-*.md`:

- `HOSTING.md:167` — _"Corrected 2026-11-18 by Story 7.2 (Task 7.2.1) — the
  keepalive is …"_, replacing the "(Story 7.5 or later)" guess.
- `0050-…md:108` — the keepalive amendment; `:150` — the concurrency
  alternative Gate 1 considered and rejected; `:167` — the failure condition
  firing early.
- `0038-…md:189` — _"Amended 2026-11-19 (Task 7.2.5): the last broadcast pass
  becomes the …"_; `:648` — the named trigger recorded as **fired**, with the
  note that two of its own three predicted consequences did not happen.

## Gates

- **`pnpm verify` — green.** `93 invariants hold.` (92 before this task). Read
  the run's own output rather than the exit code: no `Unhandled Errors` block
  anywhere in it.
- **`pnpm break a-seventh-tool-the-checklist-never-paints` — red for the right
  clause, then restored byte-identical.** Transcript quoted in §1.
- **`pnpm probe /securities/NVDA --viewports 1440x780,390x780 --within
"Abnormal-move indicators"` — run, and quoted in §2.** It can only see the
  unpressed panel (it presses nothing), which is why the four-width pressed
  measurement came from a throwaway instrument instead.
- **`pnpm e2e` — NOT RUN, and this is a gap in the evidence rather than a
  judgement.** Docker is unavailable in this worktree and no PostgreSQL server
  is listening on 5432, so `GET /securities` fails on every page and the
  universe table never appears: `search-keyboard.spec.ts`,
  `security-price-chart.spec.ts` and `security-investigate.spec.ts` would each
  fail on the store rather than on this change. The full-suite regression this
  task's own Done-when 6 asks for is **owed**, and it is the one gate that can
  see the two things only a browser can: the six-row first paint and the
  per-step scoping. The spec was exercised by hand instead — the throwaway
  instrument drove the same press, the same `[data-step]` rows and the same
  per-row durations through a real Chromium against the real backend, 20 times,
  which is what §2 and §4's figures are.
- **`pnpm test:database` — NOT RUN**, same cause. Nothing in this task touches
  the data layer.
- **The real AC 7 arm — NOT RUN**, same cause: there is no store to populate,
  so the correlation step throws instead of reading bars. §4 says what that
  makes the figure.

## For a stakeholder

Pressing `Investigate` on a security now draws **the whole checklist at once** —
all six steps, every one of them named, queued, and ticking over to complete
with its own measured duration as the pipeline runs. Before today the list
started as one blank row and grew a row at a time as each step reported in,
which moved everything beneath it five times during a run that finishes in
about a thirtieth of a second.

**It is fast, and we can say how fast.** From the press to the whole list on
screen is **13.5 ms**, and the five steps that can answer on this machine are
all complete **32 ms** after the press — inside a single frame, against a
product target of 500 ms. Those figures are taken on one developer's laptop
with no network between the browser and the server, so they are a best case
rather than what a user on a phone will see.

**Two honest shortfalls, both written down with an owner rather than smoothed
over.** The sixth step is the one that reads the database, and this machine had
no database at all — so what a real investigation costs, with real history
being read, is still **unmeasured anywhere**, and it is the one step that could
plausibly make a reader wait. And the panel this checklist lives in is now
**taller than a phone screen**: at 390px wide the region overflows the room
between the fixed header and the fixed status bar by 168px, which means a
keyboard user tabbing to it has its top edge hidden behind the header. That is
**not** fixable by making the rows smaller — measured three ways — because the
panel was already within 10px of the limit before this epic added anything to
it. The next piece of work to land in that region (findings, Story 7.3) will
have to answer it, and the choice between the three ways of answering it is the
Product Owner's.
