# Task 5.7.2 — The fifty-nine acceptance criteria, verdicted

**Status:** **Complete — 2026-10-29. Epic 5 has 59 acceptance criteria and 33 had no verdict** — 5.4, 5.5 and 5.6 each closed without the table 5.1–5.3 published, and they are the three most recent. Five could not be discharged by quoting. **5.6's AC 10 had no record anywhere** (`grep -n "AC 10"` across eight task files: zero) and is now amended and asserted. **And one premise I carried into Gate 1 was false**: a score has been drawn on a real route, not only in Storybook.
**Story:** [5.7 The Rehearsal, the Sweep, & Epic 5's Close](STORY.md)
**Depends on:** —

## Objective

**AC 1's premise is false and the task has to begin by saying so.** The story
says each of this epic's stories owes a per-criterion verdict "so the close can
quote rather than reconstruct". Measured at Gate 1: Epic 5 has **59 acceptance
criteria** and **33 have no per-criterion verdict** — Stories 5.1, 5.2 and 5.3
published `## Gate 2 — the acceptance criteria, verdicted` tables; **5.4 (13),
5.5 (8) and 5.6 (12) published none**, and all three are nevertheless marked
complete. Three of six, which is the same ratio Epic 4's close found.

So half the epic is reconstruction. Most of it is quoting; five are not.

## What the user can see when this lands

**Nothing.**

## Work

- **One table, 59 rows**, each with `AC / Verdict / Instrument / Kind`, keeping
  5.1–5.3's shape so the three existing tables are quoted rather than restated.
- **`Kind` is the column that earns this** — a **re-take** must be a runnable
  command from a clean clone; a **dated reading** is one a later reader cannot
  reproduce. The task Gates tables in 5.4–5.6 state numbers but never which, so
  this split is judgement and must be made per row rather than defaulted.
- **Say which STORE each verdict was taken on.** CI has zero bars, no provider
  and no composite generation, so "verified" for 5.2–5.6 frequently means
  _verified in the refusal arm_. A `Met` beside a `pnpm test` instrument against
  a criterion about a **drawn** figure is the pass-through failure this epic has
  already recorded three times. Where that is the case the honest `Kind` is
  "re-take of the refusal arm; the drawn arm is unverified".
- **The five that cannot be quoted**, each handled explicitly rather than
  glossed: 5.4's **AC 6** (the arrival disc keeps its shipped meaning) and
  **AC 13** (scoring over the 501 equities) are mentioned by number nowhere in
  their directory; 5.6's **AC 10** (a score is never silently re-based onto a
  newer minute while a reader is looking at it) has **no record in any task
  file** — the string `re-based` occurs only in its own `STORY.md`; 5.5's
  **AC 3** was recorded met and was not, by its own close, so it is re-verdicted
  against the current tree rather than quoted from either prior reading; and
  5.3's **AC 10** stands **NOT MET** and stays so.
- **Record the denominator with the command that produced it**, because a count
  of a phrase in this repository is invalidated by recording it.

## Done when

1. All 59 criteria carry a verdict, an instrument and a kind.
2. The five exceptions above are each resolved or carried as a gap with an owner
   and a condition — 5.6's AC 10 in particular is either asserted or recorded as
   unasserted, not implied.
3. The count, the command and the date are in the record.

---

## What was done — 2026-10-29

### The denominator, with the command that produced it

**Epic 5 has 59 acceptance criteria** — 5.1 **8**, 5.2 **8**, 5.3 **10**, 5.4
**13**, 5.5 **8**, 5.6 **12** — counted on 2026-10-29 by reading each
`STORY.md`'s `## Acceptance criteria` block. Quote the count with its date: a
figure that counts a phrase in this repository is invalidated by recording it.

**26 were already verdicted and 33 were not.** Stories 5.1, 5.2 and 5.3 each
published a `## Gate 2 — the acceptance criteria, verdicted` table; **5.4, 5.5
and 5.6 published none**, and all three are nevertheless marked complete. So
AC 1's premise — _this epic's stories each owe one, so the close can quote
rather than reconstruct_ — **is false, and the close reconstructs half the
epic.** Three of six is the same ratio Epic 4's close found (three of eight),
which is the useful part: the practice did not improve between the two epics,
and the stories that skipped it are the three most recent.

### A. Stories 5.1–5.3 — quoted, not restated

These three carry their own tables and the close **points at them** rather than
copying them, because a second copy of a verdict is a second thing to keep true:

| Story | ACs | Table                     | Verdicts                                                        |
| ----- | --- | ------------------------- | --------------------------------------------------------------- |
| 5.1   | 8   | `story-01-…/STORY.md:304` | 8 Met, two **as amended** with the originals quoted beneath     |
| 5.2   | 8   | `story-02-…/STORY.md:232` | 8 Met, AC 8 **"Met, and arm 2 is reported as unusable"**        |
| 5.3   | 10  | `story-03-…/STORY.md:258` | 9 Met (three as amended), **AC 10 NOT MET and deliberately so** |

**5.3's AC 10 stands NOT MET and is carried forward unchanged.** Its instrument
line is the honest one: _"The local cold block count stands as the floor; the
deployed arm is **unreachable from the operator's own laptop**."_

### B. Story 5.4 — thirteen criteria, reconstructed

Gate 1 (2026-10-15) amended ACs 1, 2, 8, 9, 11 and 12 and **wins** where it
disagrees; the originals are quoted in that story.

| AC  | Verdict                                       | Instrument                                                                                                                                                                                                                                                                                     | Kind                                                                                   | Store                                                                                                       |
| --- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | **Half met**                                  | The row count was measured twice — `27 × 10 − 1 = 269` against a 302 px budget, chrome 189 / content 458 / slack 33. **The declaration was never made**                                                                                                                                        | reading; the declared half is **not discharged at all**                                | developer store + furnished                                                                                 |
| 2   | **Met**                                       | `scrollHeight === clientHeight` in **all 54** cells (8 states × 6 pairs), `1440×680` included — the pair the founding defect came from                                                                                                                                                         | re-take of the shape (`pnpm probe --viewports`); the 54-cell matrix is a dated reading | developer store, furnished through the shipped socket and decoder                                           |
| 3   | **Met**                                       | `the-cut-has-one-home-and-is-read-off-the-frame` (2 conjuncts) + break `the-cut-is-spelled-rather-than-read`; `pnpm e2e overview-unusual-denominator.spec.ts`                                                                                                                                  | re-take                                                                                | invariant needs none; the **non-zero** sentence is furnished — CI draws the zero form for ever              |
| 4   | **Met**                                       | `overview-unusual-keyboard.spec.ts`; `Unusual.test.tsx`; `one-home-for-imperative-navigation` over three trees                                                                                                                                                                                 | re-take of the **drawing**; the producer's arm is unverified                           | **furnished** — the spec's own header says the real producer answers `rows: []` for ever on every gated run |
| 5   | **Met, by inheritance**                       | `RankedList`'s **third** `layout`, with the dead-track hazard a **compile error** that fired on all five existing call sites when added                                                                                                                                                        | re-take                                                                                | furnished; the FLIP against a real re-ordering feed has never run                                           |
| 6   | **Met on a negative**                         | One call to the shared `arrivalKey`, keyed on the observation's content and never on the figure. **Nothing mechanical holds it**                                                                                                                                                               | re-take of a grep                                                                      | none needed — and the disc has **never fired on a row of this region on any machine**                       |
| 7   | **Met at the time, superseded by Task 5.6.7** | Declared tie-break on ticker ascending, never a `0`; now `compareByScore` preserving it, held by `one-comparator-for-the-order-of-a-composite-score`; reproducibility enforced at the **decoder**, which refused a mis-ordered furnishing                                                      | re-take                                                                                | unit + decoder, store-independent                                                                           |
| 8   | **Met as amended**                            | The section verbatim off this product's own gateway in CI's shape — **303 B** — and a populated row **232 B**; the ladder 370 / 232 / 1,534 / **2,699**, each **read rather than multiplied**                                                                                                  | re-take of the byte figures; the 3,559 B whole-frame reading is dated                  | no-provider local gateway, which is CI's shape                                                              |
| 9   | **Met as amended**                            | ADR 0040 **fired** with two of its three predicted consequences not happening; ADR 0038's frame-grain **evaluated twice, unfired**; Epic 14's backend condition fired and is priced                                                                                                            | reading — an evaluation in writing is not a command                                    | n/a                                                                                                         |
| 10  | **Met, and enlarged**                         | `overview-degraded-grid.spec.ts` — the region is the grid's **eighth** surface, 17 states × 4 widths, **136 PNGs**. Adding the surface **found six lying aggregates**, and the break was **green on the exact defect at HEAD** because the region was not yet a surface                        | re-take                                                                                | every state produced through the shipped socket from furnished frames                                       |
| 11  | **Met as amended, noun changed twice**        | Gate 1 moved it from bands to the ordinal; Task 5.4.3 found the noun stale and shipped `Nothing ranked yet.` / `Nothing ranked while the market is shut.`; Task 5.6.7 then re-based the region on the composite — **the amendment's own reversal condition firing**                            | re-take                                                                                | furnished; nobody has seen the ordinary state on a real feed                                                |
| 12  | **Met as amended**                            | The **only criterion in this epic verdicted against a real store**: the drawn sentence and ten real rows off the populated local store, `485` securities through `2026-09-11`; `0014`'s two tables; `pnpm test:database` 306 passed                                                            | re-take of the layers + dated reading of the drawn rows                                | **real developer store** (48,797,343 bars) + its own nightly pass. CI can never reach it                    |
| 13  | **Met**                                       | `each-overview-section-names-its-own-set` (the `unusual` row refuses a hand-rolled pass that loses the **window**) and `breadth-is-counted-over-the-equities-alone`, both break-verified; producer equality asserted **on the producer** by array identity and byte-identical `JSON.stringify` | re-take                                                                                | store-independent                                                                                           |

### C. Story 5.5 — eight criteria, reconstructed

| AC  | Verdict                                                  | Instrument                                                                                                                                                                                                                                                         | Kind                                          | Store                                                                                                     |
| --- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | **Met**                                                  | `"shareOnTwoTapeMinutes": 0.0353982`, `"minutePresence": 0.815527`, identity `0.0353982 × 0.776074 = 0.0274716`; six securities **3.54% → 15.19%**, a 4.3× spread running inversely with liquidity                                                                 | reading (2026-10-20)                          | **Deployment** — the only machine holding both tapes for the same minute                                  |
| 2   | **Met as amended**                                       | `the-volume-baseline-reads-one-tape-by-name` (4 conjuncts) + break, **proved green on the defect first**: the plant typechecked and linted clean, then `AssertionError: expected 9000000 to be 100`                                                                | re-take                                       | mechanism laptop; refusal set confirmed on the deployment                                                 |
| 3   | **Met on screen; a FOURTH document site was still live** | `"Volume per minute / 4.1× typical"` asserted verbatim; `one-home-for-the-multiple-glyph`. But `planning/EPICS.md:199` still read `> Volume 3.8× normal` with **no amendment**                                                                                     | re-take: `git grep -n "× normal" -- planning` | laptop                                                                                                    |
| 4   | **Met**                                                  | _"**Absent, never `0`**: on IEX an absent bar is ordinary"_; the formatter floor draws `<0.1× typical` below 0.05 rather than `0.0×`                                                                                                                               | re-take                                       | laptop; the reachable arm is tape-independent                                                             |
| 5   | **Met**                                                  | _"refuses a zero-volume baseline rather than producing an `Infinity`"_, asking the precision question **first** because a thin bucket's median is routinely 0                                                                                                      | re-take                                       | laptop — and the deployed pass says `0 zero volume`, so the state **has never been reached on real data** |
| 6   | **Met**                                                  | The region as a screen reader is handed it: `"last 5 minutes · median minute of 60 sessions · same 5-minute bucket · today excluded / Measured on IEX · baseline on IEX"`; median not mean, from `MEDIAN_BREAKPOINT_RANK`                                          | re-take                                       | laptop (jsdom); numbers read off the frame                                                                |
| 7   | **Met as amended** — the unit, not the substance         | `n ≥ (√(π/2)·CV / target)²` in **samples**, CV measured per bucket, computing `√(π/2)` rather than carrying 1.253. Deployed: **39,924 of 39,928 — 99.990%** refuse                                                                                                 | re-take (formula) + reading (the rate)        | formula laptop; rate **deployment**                                                                       |
| 8   | **Met as amended**                                       | Violated **three times** when recorded, one reachable on every store; all three now repairs in the tree, and the `?? 0` half became mechanical **after** this story via `no-imputed-zero-in-a-figure`, whose own docblock names this story's defect as its trigger | re-take                                       | laptop/CI; the reachable instance was reachable everywhere                                                |

### D. Story 5.6 — twelve criteria, reconstructed

| AC  | Verdict                                                            | Instrument                                                                                                                                                                                                                                                                                                                                                                                                                                 | Kind                                                          | Store                                   |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | --------------------------------------- |
| 1   | **Met**                                                            | `elevated p50 32 · high p90 63 · extreme p99 73` over **34,318 two-factor scores**; the selector `elevated ≤ 40 < high` rejecting p75 = 49, which _"would make **every** reduced-factor score `normal` for ever"_; tiles 0–100 exhaustively with no gap or overlap                                                                                                                                                                         | re-take of the tests + dated reading of the derivation        | local (derivation); none (tests)        |
| 2   | **Met**                                                            | `publishes every weight and one row per factor, in every state` — `[["Price","40"],["Relative move","35"],["Volume","25"],["Breadth","","stated as context"]]`                                                                                                                                                                                                                                                                             | re-take                                                       | none                                    |
| 3   | **Met as amended**                                                 | Imputes nothing; **independent of an absent factor's adversarial slot values**; `score(P) ≤ score(P ∪ {j})`; reports the maximum as Σw over **present** factors, never 100. Plant B (`renormalise round(100 × score / max)`) **red on all three layers**                                                                                                                                                                                   | re-take                                                       | none                                    |
| 4   | **Met**                                                            | No signed input at all, so `score(+x) === score(−x)` is **structural** rather than tested                                                                                                                                                                                                                                                                                                                                                  | re-take                                                       | none                                    |
| 5   | **Met**                                                            | A **compile error** naming which module minted the value (the brand's symbol unexported, both halves `@ts-expect-error` so they fail the build if they stop erroring); `contributing: [T, ...T[]]` makes a score with no clause **untypeable**; and across the wire `readAnomalyScore` **re-adds the published contributions and refuses the explanation when the sum is not the score it was sent**                                       | re-take                                                       | none                                    |
| 6   | **Met, distributed** — no single nine-element audit exists         | Seven elements asserted; elements 3–5 carried by the region's **sibling bands** rather than the score band; `checkedOn` by the route's source note. **`no causal language` is guarded by nothing mechanical**                                                                                                                                                                                                                              | re-take for seven; reading for the rest                       | none                                    |
| 7   | **Met**                                                            | Three of four of §11's example lines differ from what ships, each because the shipped version states a **figure** where the example stated a **word**; the ledger draws reasons (`no history to rank it`), not adjectives; the band word appears **only** in the chip                                                                                                                                                                      | dated reading (a document sweep) + re-take of the drawn cells | none                                    |
| 8   | **Met**                                                            | `SecurityRow` **deleted**, and the disposition is a refusal on §11's own grounds rather than a tidy-up — it wrapped `AnomalyBadge` in a `Popover` so a reader could **ask** for an explanation, and §11 requires a score to **carry** one. `compact` shipped for an afternoon and was deleted, leaving two files byte-identical to HEAD                                                                                                    | dated reading, verifiable by `git log`                        | n/a                                     |
| 9   | **Met, and one half discharged by repairing a live defect**        | The reference **in the key** — `(security_id, observed_at, reference_kind, reference_symbol)` — because a reference-blind key would _"rewrite what every stored breakpoint array means with nothing recording that the meaning changed"_; `one-home-for-the-cap-weighting-clause` + break. The **quantity** half is the defect below                                                                                                       | re-take + dated reading                                       | local                                   |
| 10  | **Met as amended — 2026-10-29**                                    | The naming clause is amended (score and return ride **one atomic per-symbol frame**, so `WireAnomalyScore` carries no instant of its own by design); the in-place clause is **now asserted** by this task. Before today: no test, spec or invariant mentioned it under any wording, and `grep -n "AC 10"` across all eight task files returned **zero**                                                                                    | re-take                                                       | none                                    |
| 11  | **Met**                                                            | Two channels — _"a reader meets the denial in the same glance as the figure, and again as a sentence at the foot of the band"_. `SCORE_LABEL` and `SCORE_DISCLAIMER` have **one consumer**, `AbnormalMove`; no invariant guards the _once_                                                                                                                                                                                                 | re-take + grep reading                                        | none                                    |
| 12  | **Met in a different form on monotonicity; met on the other four** | _"**Monotonicity over \|return\| is false of the pipeline**"_ — `\|return\|` feeds **both** factors, so a larger move in the sector's direction raises the price percentile and **lowers** the excess. What ships is monotonicity **per factor** plus the one-directional `score(P) ≤ score(P ∪ {j})`. Purity is **half**-mechanical: a lint error for the factor sited in `packages/shared/src`, prose for the five in `apps/backend/src` | re-take                                                       | bare (the state the criterion is about) |

### The defect AC 9 discharges, with the independent corroboration

The excess factor shipped ranking a **session-to-date** excess against a
**five-minute** distribution. Measured on the local store: mean rank **91.37**
with **58.8%** of samples at the 99th, against **46.08** for the correct
numerator over the same **34,622** samples — the factor paying its full 35 of
100 for the majority of the universe, worsening through each session.

**The corroboration is the part that makes it a measurement rather than a
story.** Task 5.6.3's band-floor derivation, taken **before** the defect was
known and by a different instrument with no stake in it, printed `mean price
rank 45.41, mean excess rank 46.09` — so the repaired factor's 46.08 reproduces
it to **0.01**. And the repair was proved **persisted** rather than merely
fixed, with the control that settles it: the stored `price_rank` agrees with
`session_return_percentiles.rank`, written by code predating the task, on **all
485 rows with 0 disagreements**.

### What could not be discharged by quoting — and the premise of my own Gate 1 that was false

**Five criteria, as Gate 1 predicted, and the list is slightly different.**
5.4's **AC 6** (no mechanical holder — a grep over one file, for a criterion
whose subject is this repository's most-repeated defect, and the figure it must
not be re-pointed at is now the row's **only** figure — made mechanical by Task
5.7.6); 5.4's **AC 1** (the declaration half, routed to tonight's sitting,
which now reads `window.innerHeight` off a real phone); 5.6's **AC 10** (no
record at all; amended and asserted today); 5.5's **AC 3** (re-verdicted, and
it found a fourth live site); and 5.3's **AC 10**, still NOT MET.

**And one premise I carried into Gate 1 was false.** It said _the only place a
score has ever been drawn is Storybook_. **It is not.** Task 5.6.5 drew a real
one on this laptop against the running backend — `score 35 · band elevated ·
max 35`, **625 B** on the wire, `1 of 3 factors contributing · max 35`, probed
on the route at four widths — and the orchestrator re-ran that probe
independently at the time. `LIVE-REHEARSAL.md` already carries the correction;
**`CLAUDE.md:821` does not**, which is Story 5.6's close correcting the ledger
and not the governing file. Task 5.7.4 owns it. What remains true in that
paragraph is the other half: **no ranked row on `/` has ever been drawn by any
machine or person.**

So the honest kinds for the drawn arm are three, not one: **verified once on a
real route** (local store, 2026-10-23, the **session** basis, `1 of 3 · max
35`) — a dated reading, not a re-take, because it needs ~48.8 M stored bars and
a generation; **furnished by the shipped scorer** for every `2 of 3 · max 75`
figure in the tests, which proves the arithmetic and not the data; and **never
produced by any machine** for `high`, `extreme` and any three-factor score,
the last being structurally unreachable while `0015` stores a median and a
dispersion rather than a distribution.

### The store finding, stated once for the whole epic

**"Verified" for 5.2–5.6 frequently means verified in the refusal arm**, and a
`Met` beside a `pnpm test` instrument against a criterion about a drawn figure
is the pass-through failure this epic has recorded three times. The sharpest
demonstration is 5.4's own: against a producer planted to invent an `NVDA` row,
_"the two frame-derived arms are **GREEN** on the fabricated row. Only the
out-of-frame arm sees it."_ `docs/GAPS.md` carries the general form — **no
independent recompute of this ranking has ever executed against data,
anywhere** — with the condition _the first deployment or developer store that
holds both bars and a baseline generation_.

### AC 10's assertion, and the proof that it can fail

Two tests at the foot of `AbnormalMove.test.tsx`'s score-band block, with every
payload minted through the shipped `toWireAnomalyScore(scoreAnomaly(…))` rather
than hand-typed — a hand-built wire object would prove a shape nobody ships:

- `replaces the score on a revision, leaving the instants where they were`
- `moves the instants when the frame advances to NEW endpoints`

The scores were chosen so the figure cannot collide with the ledger's own cells
— **61** and **70** appear nowhere among the weights (40/35/25) or the
contributions (38/23, 38/32) — and that was **verified against the built
package before the assertion was written** rather than argued:

```
95 66 {"scored":true,"score":61,"band":"elevated","max":75,...}
95 90 {"scored":true,"score":70,"band":"high","max":75,...}
```

**The mirror is not decoration.** Without _an advance to new endpoints does move
them_, a component that ignored the frame entirely would pass the first test.

**And both halves were proved red before being trusted**, which is the step this
repository has recorded itself skipping four times in one story. Plant 1 made
the component append a stale band on revision:

```
× replaces the score on a revision, leaving the instants where they were 11ms
AssertionError: expected <span class="_score_c56a2c"></span> to be null
+ Received: <span class="_score_c56a2c">61</span>
 Tests  1 failed | 40 passed (41)
```

Plant 2 made `Indicator` latch its qualifier at first render — the _component
ignores the frame_ defect the mirror exists for:

```
× moves the instants when the frame advances to NEW endpoints 7ms
AssertionError: expected <p class="_qualifier_c56a2c"></p> to be null
+ Received: <p class="_qualifier_c56a2c">Oct 14 · 14:01 EDT → Oct 14 · 14:06 EDT · observed 3 of 5 minutes</p>
 Tests  1 failed | 40 passed (41)
```

Both are **assertion failures on the intended line with the other 40 tests
still collecting** — not parse errors, not a different clause. That is the only
red that proves a check works.

**Plant 1 is itself the evidence for the amendment.** To produce the defect at
all it had to **add a `useRef`**: the figure and the instants are derived from
the same single `symbolReturn` prop in adjacent lines, with no state, no ref and
no memo of a prior value anywhere in the component, so a stale pairing is
**unrepresentable** rather than unlikely. The component is byte-identical to
HEAD; only the test file changed.

### Gates

```
pnpm build         exit 0  (Storybook build completed successfully)
pnpm lint          exit 0  (eslint . --max-warnings 0, clean)
pnpm format:check  All matched files use Prettier code style!
pnpm --filter @marketpulse/frontend test AbnormalMove
                   Test Files  1 passed (1)
                        Tests  41 passed (41)     ← 39 before, +2
```

No `Unhandled Errors` block and no skips in any run. `pnpm verify`, `pnpm e2e`
and `pnpm test:database` are deliberately **not** run here — AC 7 wants them
once on the final tree.

**And one of those deliberate omissions cost a CI cycle, which is a finding
about the gate set rather than about this task.** This task's first push went
red on `pnpm links`, from a line in **this file**: the re-measure command for
AC 3 was written as

a `git grep -nE` with a digit class, an optional **parenthesised** decimal
group, and `× ?normal` — and a bracketed class followed immediately by a
parenthesised group **is a Markdown link**. `check-links.mjs` resolved the
group's contents as a relative path and correctly reported `no such file`.

**This paragraph cannot quote the regex, for the same reason.** The first
attempt at writing the lesson reproduced the pattern inside a fenced code block
and `pnpm links` went red a second time — the checker scans fences too, which is
right, because a broken link in an example is still a broken link a reader
follows. The check was right; the regex was the defect. It is
now the simpler and equivalent `git grep -n "× normal" -- planning`.

**The lesson is which gates a documentation-heavy task owes.** AC 7's _once on
the final tree_ rule is about the **heavy** gates — `verify`'s test legs, `e2e`,
`test:database` — and `pnpm links` is none of those: it is a pure read of
checked-in Markdown, needs no network by design, and takes seconds. A task that
edits Markdown should run it per-task even though `verify` will run it again at
the close, because the alternative is finding out from CI. Adopted for the rest
of this story. The irony is worth keeping: a regex written **as evidence for a
sweep** was itself the thing that broke the sweep's own checker.

## For a stakeholder — a status report, 2026-10-29

Epic 5 made 59 promises across six stories. This task went through all of them
and wrote down, for each, whether it was kept, what proves it, and whether that
proof is something anybody can re-run or a one-off reading nobody can reproduce.

Two things are worth a stakeholder's attention. **Half the epic had never been
checked off.** Three of the six stories published a criterion-by-criterion
verdict when they closed and three did not — and the three that did not are the
three most recent, so the practice got worse rather than better over the epic.
That is now repaired, but it had to be reconstructed from task records rather
than quoted, and five promises could not be settled by reading at all.

**And the most common honest answer is "it works, and nobody has seen it work on
real data."** Most of these figures are proved against data the tests supply
themselves. That proves the arithmetic and the drawing; it does not prove the
thing that computes the numbers is right, and this epic has now been caught
three times by that distinction — most recently by a deliberate experiment in
which the number-producing code was sabotaged to invent a security, and every
check that reads the page agreed with it. Only a check grounded outside the page
noticed.

One promise was found never to have been addressed at all, and is now both
amended and tested. One figure this close had been repeating — that the score
had only ever been drawn in a design workshop — turned out to be false: it was
drawn against a real running backend six days ago, and the correction had been
written into one file and not the other. Finding that by going to use the claim,
rather than by reading it, is the only way that class is ever found.
