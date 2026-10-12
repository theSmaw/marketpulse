# Task 4.9.7 — The suites verdict

**Status:** Complete — 2026-10-12 — **both answers are true and they are separable**: `security-gap-fill` is a 5.6% flake whose residual is a PRODUCT defect, `market-gateway.process.test.ts` is a machine finding with a confirmed mechanism, and the verdict has one hole — `pnpm verify` ×24, unreached by the owner's decision
**Story:** [4.9 The Rehearsal, the Sweep, & Epic 4's Close](STORY.md)
**Depends on:** nothing

## Objective

`EPIC.md` hands this story one verdict to return — **are this epic's own suites
trustworthy** — with a named owner outside this epic if the answer is no. The
question arrived because three characterised flakes compound across every merge
and one of them failed `verify` on `main`, causing a `deploy` to be **skipped**
on 2026-10-07. That is a real engineering problem and it is **not
market-overview scope**.

**Almost all of the evidence is already taken** — Tasks 4.8.9 and 4.8.13
discharged the characterisation at n ≥ 24 per subject over 456 executions, the
code-free control commit, and the `pnpm e2e` ×3 arm. This task writes the
verdict and does **not** re-measure what is measured.

## What the user can see when this lands

**Nothing.** A written answer to a question `EPIC.md` has been holding open
since 2026-10-07.

## Work

- **Write the verdict per subject**, in the words the story asked for: _the
  suite is flaky_ and _the machine cannot execute the suite_ are **both** true
  and they are separable, which is what a settled machine bought.
  - **`security-gap-fill` is 5.6% pooled over 144 executions at four workers**
    (Wilson 95% CI 2.8–10.6%), non-overlapping with the 25.0% (CI 13.6–39.6%)
    before the predicate was repaired, and **0 / 24** at one worker. **Do not
    write _this spec is flaky_ without the next sentence**: every residual
    failure is `sample 0: ChartPending over Price` **and** `over Volume` — a
    real cover drawn over both plots during a refill nobody asked for, which is
    the defect the test exists to catch and which the old predicate read
    **zero** against on a deliberately covered page. It is a **product** defect,
    routed in `docs/GAPS.md`, and **must not be counted in a flake rate**.
  - **`market-gateway.process.test.ts` is a MACHINE finding with a confirmed
    mechanism** — 0 / 48 quiet, 19 / 24 under a stated CPU plant.
  - **`securities-route` is a MARGIN, and the family is smaller rather than
    gone** — 0 / 48, median 8.0 s quiet and 13.5 s at four workers against 30 s.
    Nine axe passes over 518 rows now take a 27-row sample: 68.0 s → 13.5 s and
    the two files 1.2 m → 35.3 s. **The second half of the repair is not
    taken** — the suite's own per-test ceiling — and Playwright still reports
    durations longer than the 30 s it enforces, so a duration cannot be read as
    a percentage of the ceiling.
  - **`index.process.test.ts`'s shutdown ordering is UNREPRODUCED at n = 96.**
- **The `pnpm verify` ×24 arm is recorded as UNREACHED with an owner and a
  condition**, taken as the owner's decision at Gate 1 on 2026-10-12: 72 minutes
  to probe one unreproduced ordering is poor value against what it could reveal,
  and the verdict is already well-evidenced without it. **State plainly that it
  is the one hole in the verdict** — do not present the verdict as complete.
- **Quote the control commit** `dee73de` on `story-4-8-task-9`: one planning
  Markdown file, a byte-identical runtime tree, with the arm either side of it
  **8 / 24 and 4 / 24 on the parent and 4 / 24 on the control** — the control's
  draw sitting inside the parent's spread, which is what a control exists to
  show and the second time this repository has shown it. **Quote this the next
  time a figure on a branch is read as a regression.**
- **Three readings not to repeat**, each already somebody's cost:
  - **The browser suite is its own plant.** A full `pnpm e2e` begun at a load
    average of **5.3** left the machine at **31.0**, so a load average read
    _during_ a run cannot be attributed to anything else. **Read the load
    before the run, never during it.**
  - **`n = 3` separates nothing.** `2 of 3 clean` is not a rate.
  - **n = 6 cannot separate a 12% flake from a regression**, and at 5.6%
    `P(0 failures in 6) ≈ 0.71` — so the rarer the flake, the more often a clean
    `main` beside a failing branch is one pair of draws from one distribution.
- **Name the owner outside this epic**, since the answer is not an unqualified
  yes, and give it a condition rather than an epic number.
- **Do not re-run the measured arms.** Everything above is taken. The one thing
  this task may usefully run is a single `pnpm verify` and a single `pnpm e2e`
  for Task 4.9.9's gate numbers, and that is 4.9.9's job rather than this one's.

## Done when

1. A verdict exists per subject, in the story's own terms, with the figures and
   their conditions.
2. The `pnpm verify` ×24 arm is recorded as unreached with an owner and a
   condition, and named as the verdict's one hole.
3. The control commit and its three readings are quoted.
4. An owner outside Epic 4 is named, with a condition.
5. Nothing already measured was re-measured, and the task says so.

---

## What was done — 2026-10-12

**Nothing was re-measured.** Tasks 4.8.9 and 4.8.13 discharged the
characterisation at n ≥ 24 per subject over 456 executions, the code-free
control commit and the `pnpm e2e` ×3 arm. This task writes the verdict
`EPIC.md` has been holding open since 2026-10-07 and runs no arm of its own —
which is the correct shape for a close, because a figure re-taken here would
not be comparable with the ones it is meant to settle.

### The verdict, in the words the story asked for

**_The suite is flaky_ and _the machine cannot execute the suite_ are BOTH
true, and they are separable.** That separation is the whole of what a settled
machine bought, and on 2026-10-08 — load 23–33 on 8 cores, ~37 MB free, two
processes killed for memory, three whole-suite runs failing 3 / 5 / 7 purely on
30 s timeouts while CI passed all three required checks on the same commit —
they were indistinguishable from a terminal.

**Per subject:**

| Subject                                   | Verdict                                                  | The figures, with their conditions                                                                                                                                                                              |
| ----------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `security-gap-fill`                       | **A FLAKE — and its residual is not one**                | **5.6%** pooled over 144 executions at four workers (Wilson 95% CI **2.8–10.6%**), against **25.0%** (CI 13.6–39.6%) before the predicate was repaired — **non-overlapping** — and **0 / 24** at one worker     |
| `market-gateway.process.test.ts`          | **A MACHINE finding, mechanism confirmed**               | **0 / 48** quiet; **19 / 24** under a stated CPU plant                                                                                                                                                          |
| `securities-route`                        | **A MARGIN, and the family is smaller rather than gone** | **0 / 48**; median **8.0 s** quiet and **13.5 s** at four workers against a 30 s ceiling. Nine axe passes over all 518 rows now take a 27-row sample: **68.0 s → 13.5 s**, and the two files **1.2 m → 35.3 s** |
| `index.process.test.ts` shutdown ordering | **UNREPRODUCED at n = 96**                               | Reachable only by `pnpm verify` ×24, which is the hole below                                                                                                                                                    |

**Do not write _`security-gap-fill` is flaky_ without the next sentence.**
Every one of its residual failures is `sample 0: ChartPending over Price` **and**
`over Volume` — a **real cover drawn over both plots during a refill nobody
asked for**, which is the defect the test exists to catch and which the old
predicate read **zero** against on a deliberately covered page. It is a
**product** defect, it is routed in `docs/GAPS.md`, and **it must not be
counted in a flake rate**. A red there now means something.

**The second half of the margin family's repair is not taken** — the suite's own
per-test ceiling. Playwright still reports durations longer than the 30 s it
enforces, so **a duration cannot be read as a percentage of the ceiling**.

### The one hole, stated rather than hidden

**`pnpm verify` ×24 is UNREACHED.** The owner's decision at Gate 1 on
2026-10-12: ~72 minutes of machine time to probe one ordering that is
unreproduced at n = 96 is poor value against what it could reveal, and the
verdict is well-evidenced without it. **This verdict is therefore not
complete**, and the incompleteness is exactly one subject: `index.process.test.ts`'s
shutdown ordering. Nothing cheaper reaches it, and `pnpm verify` ×24 is the only
arm that can.

**Owner and condition**, since the answer is not an unqualified yes and
`EPIC.md` asked for an owner outside this epic: **the first `main` merge whose
`verify` job fails with no code change between it and a green run** — which is
the event that cost a skipped `deploy` on 2026-10-07 and is the only condition
under which 72 minutes is cheap. Owner: whoever is holding the pipeline at that
moment, not an epic.

### The control commit, quoted — because the next reader will need it

`dee73de` on `story-4-8-task-9`: **one planning Markdown file**, and
`git diff --stat HEAD~1 HEAD -- . ':(exclude)planning' ':(exclude)docs'` is
**empty** — a byte-identical runtime tree, which is the whole of its value. The
arm either side of it was `security-gap-fill` at `--repeat-each=24 --workers=4`:

> **8 / 24 and 4 / 24 on the parent, 4 / 24 on the control.**

**The control's draw sits inside the parent's spread**, which is exactly what a
control exists to show and is the **second** time this repository has shown it —
Task 4.2.6 was the first, and was wrong before it did. **Quote this the next
time a figure on a branch is read as a regression.** No further control is
owed.

### Three readings not to repeat, each already somebody's cost

1. **The browser suite is its own plant.** A full `pnpm e2e` begun at a load
   average of **5.3** left the machine at **31.0**. So the 34.28 Task 4.8.12
   recorded _during_ its runs is largely the suite, and **a load average read
   while a suite is executing cannot be attributed to anything else on the
   machine**. Read the load **before** the run, never during it.
2. **`n = 3` separates nothing.** `2 of 3 clean` is not a rate, and this task
   does not quote it as one.
3. **`n = 6` cannot separate a flake from a regression at any of the three rates
   this epic has measured.** At 12% `P(0 in 6) ≈ 0.46`; at 25% `≈ 0.18`; at
   5.6% `≈ 0.71`. **The rarer the flake, the more often a clean `main` beside a
   failing branch is one pair of draws from one distribution** — so the
   conclusion runs the opposite way to the intuition, and `n = 24` on one
   checkout is the floor.

### Gates

Nothing was run. This task is a verdict over evidence taken by Tasks 4.8.9 and
4.8.13, and it says so above. The four gates with their numbers are Task
4.9.9's, deliberately, so that one task holds one set of readings taken at one
time on one machine.

## For a stakeholder — a status report, 2026-10-12

`EPIC.md` asked this story one question in October: **can we trust this epic's
own test suites?** Three intermittent failures were compounding across every
merge and one of them had caused a deployment to be skipped.

**The answer is yes, with one named exception, and the useful part is that we
can now tell two different problems apart.** Earlier in October the suites and
the machine they run on were indistinguishable — the laptop was saturated,
whole runs failed on timeouts, and the same commit passed every check on CI. On
a quiet machine the picture separates cleanly: one test is genuinely
intermittent at about 6% and only when four run in parallel; one fails only
when the machine is deliberately loaded, with the mechanism confirmed; one is
merely close to its time limit, and is now four times faster because nine
accessibility passes were reading all 516 securities when 27 would do.

**One finding is worth more than the rest.** The intermittent test's remaining
failures are not noise — they are a real defect in the product: a loading cover
briefly drawn over both charts during a refresh the reader never asked for. The
old version of the test could not see it. So a red result there now means
something, and it must not be counted as flakiness.

**What we did not do, and why.** Reaching the last unexplained failure needs
roughly 72 minutes of repeated full verification runs. The owner decided that
is poor value for one ordering problem nobody has reproduced in 96 attempts, so
it is recorded as the single hole in this verdict, with a named condition for
when it becomes worth buying: the first time a merge fails verification with no
code change behind it.
