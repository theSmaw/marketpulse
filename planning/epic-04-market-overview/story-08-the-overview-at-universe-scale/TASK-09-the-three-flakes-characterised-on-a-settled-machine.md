# Task 4.8.9 — The three flakes characterised, on a settled machine

**Status:** **Complete — 2026-10-10.** Five subjects, 456 executions, n ≥ 24 per arm on one checkout, every arm gated on a load ratio under 0.75 before it started. **Two flakes, one margin family, one machine finding and one unreproduced.** `security-gap-fill` is 4.2% at one worker against **25%** at four — and all 13 failures are an assertion that **structurally cannot see** the panel it is written about: `ChartPending` has no text, `Fetching` exists nowhere in the product, and the two elements it does count are the **518-row Explorer shell's own first load**. `market-gateway.process.test.ts` runs **0 / 48 quiet to 19 / 24 under a stated plant**, confirming Task 4.8.11's hypothesis. `index.process.test.ts`'s ordering is **unreproduced at n = 96** and the arm that would reach it is named. The code-free control is **taken** (``dee73de`**on this task's branch — and that sha does not survive the squash-merge onto`main`, so it is a record of what was run rather than an address anybody can visit; the arm is reproducible from the description above and not from the hash**`) and behaved. And three settled full-suite runs were **0 of 3 clean**, which falsifies the reading Story 4.9 was handed: **the browser suite is its own plant**, 5.31 → 31.04 on one run.
**Story:** [4.8 The Overview at Universe Scale](STORY.md)
**Depends on:** 4.8.1

## Objective

**Owed since Story 4.5 and not taken, because it needs a settled machine — and
this story cannot produce a figure without one.** The owner asked for it here
at Gate 1.

## What the user can see when this lands

**Nothing.** It is the difference between _the suite is flaky_ and _this
machine could not execute it_, which look identical from a terminal.

## Work

### The three, with what is already known about each

- **`security-gap-fill.spec.ts:165`** — _the chart is never blanked or covered
  while the gap is filled_. **14 failures in 120 executions (~12%)** on `main`.
  Count failures per **execution**, never per run: at 12% per execution,
  `P(0 failures in 6) ≈ 0.46`, so **n = 6 cannot separate a 12% flake from a
  regression; n = 24 on one checkout can.** Its mechanism is labelled in
  `docs/GAPS.md` as _a hypothesis, not a measurement_, and its owner is a
  condition — _the first task that measures where the security page's refill
  spends its 160 ms_ — which this story's instrument satisfies.
- **`securities-route.spec.ts`** — 19.8–20.0 s against a **30 s** ceiling. Not
  a flake yet; a margin.
- **`market-gateway.process.test.ts`** — _leaves a HEALTHY client on the same
  process untouched_, `expected +0 to be 1`, inside `pnpm verify`. Seen twice
  in this session, green on an immediate re-run both times.

### The protocol, and the part that is not optional

`--repeat-each=24` **on one checkout**, with the load ceiling of Task 4.8.1
refusing above its stated figure, and the **calibrator** discarding windows
where the machine drifts. **Before attributing anything to a branch, run the
commit that contains no code** — Task 4.2.6 declared a regression on
`main` 12/12 against a branch 3/12, and the branch's first commit differed from
`main` by **one line in a planning Markdown file** with byte-identical runtime
trees, and failed **2 of 12**.

### And the control nobody has: a code-free commit

Story 4.9 owns _the code-free control commit_ and it also needs a settled
machine. **If this task has the machine, take it here and tell 4.9 it is
done** — in words 4.9 can act on, in its own file.

## Done when

1. Each of the three characterised at n ≥ 24 on one checkout, failures counted
   per **execution**, with the load and the discard count in the transcript
2. The code-free control run, or explicitly not, with the reason
3. `docs/GAPS.md` updated per flake: a measurement where there was a
   hypothesis, or the hypothesis restated as still unmeasured and why
4. Story 4.9's file amended with whatever this task discharged

## Handed here by Task 4.8.3 — 2026-10-09: a FOURTH flake, and it is not in the browser suite

`apps/backend/src/index.process.test.ts > the database pool > says goodbye to a
browser BEFORE closing its socket` failed once in **four** whole-gate
executions, on a machine warm from that task's own measurement work:

```text
AssertionError: expected 13 to be greater than 18
 ❯ src/index.process.test.ts:1004:21
    1004|     expect(drained).toBeGreaterThan(gateway);
```

`http drained` at log line 13 and `market gateway closed` at 18 — the shutdown's
two markers in the wrong order. Three scoped re-runs and three further
`pnpm verify` runs all passed.

Three things that make it worth your n rather than a shrug. It is in
**`test:process`**, so it is inside `pnpm verify` and inside a **required CI
check**, unlike the three browser flakes. The assertion is an **ordering** one
over log-line indices, which is the shape `CLAUDE.md` warns about by name — _a
marker travels with its step_ — so a genuine ordering change and a scheduling
flake fail identically. And **nothing in this repository had recorded it**:
`docs/GAPS.md` does not name either marker.

Your own method applies unchanged: **n = 6 cannot separate this from a
regression and n = 24 on one checkout can**, and the branch it was seen on
changes nothing executable at all — five docblocks and one string — which is
about as clean a control arm as a comparison ever gets.

## Handed here by Task 4.8.6 — 2026-10-09: two ways the harness leaves a machine dirty, both of which look like contention

**Before attributing anything to contention, check for these two — they were
both present on this machine today and both inflate a load average by a whole
core.**

1. **`startProductionPair()` leaks `vite preview` on an abnormal exit.** The
   preview is spawned as `pnpm exec vite preview`, so the process the harness
   holds is the `pnpm` wrapper and the listener is its grandchild;
   `child.kill()` reaps the wrapper only. Measured here after a crash inside a
   Playwright route handler: the backend on `:3100` was gone and
   `node …/vite/bin/vite.js preview --outDir …` was still listening on `:4273`
   with **PPID 1**. The next run refuses its own port and reads as a
   configuration fault rather than as a leak.
2. **A throwaway instrument's process outlives the file.**
   `node scripts/browser-leg.mjs` — Task 4.8.4's, deleted from the tree at that
   task's close — was found **spinning at 100% of a core for 58 minutes**, PPID
   1. `pgrep -f` by this story's script names is the check; `uptime` is not,
      because Task 4.8.1 already measured that a load average alone is not
      something a browser can feel, and this is the converse: a core's worth of
      load whose cause is not in the tree any more.

## Handed here by Task 4.8.8 — 2026-10-09: `security-gap-fill`'s stated mechanism now rests on a task nobody can observe

**The `docs/GAPS.md` entry you are about to characterise names a mechanism that
has moved under it, and the correction makes the hypothesis WEAKER rather than
wrong.** That entry says the ~12% flake is plausibly _"a 160 ms threshold
sitting on top of a documented 50–76 ms **task** that lands at a variable
moment"_. Task 4.8.6 re-measured the page it describes, 40 interleaved cold
loads with two 20-row control arms, and:

- the `longtask` channel reports **nothing at all** on `/securities` — **0 of
  10 loads**, where 2026-09-22 read 50–56 ms on 7 of 10;
- the cost is unchanged and is now **one frame over the line on 10 of 10
  loads, 62.8–77.4 ms**, of which **script is 26–31 ms** and **style, layout
  and paint 34–38 ms**.

**Two consequences for your characterisation.**

**1. The mechanism as written is unobservable with the instrument the entry
names.** A 34–38 ms render half spread across a frame has a different arrival
profile against a 160 ms threshold than a single 50–76 ms task does, and
nothing in this repository has measured where the 160 ms goes. The entry now
carries a dated amendment saying so; **the figure and the owner are handed to
you.** You are also the task its owner clause names — _the first task that
measures where the security page's refill spends its 160 ms_.

**2. Use all three channels and prove each with a plant, or an arm that
reports zero will look proved.** `longtask`, `long-animation-frame`, and the
rAF-gap recorder. **A channel going quiet and a cost going away produce the
same output**, and that is not a hypothetical here: it has already happened
once to this exact page's published figure. Task 4.8.6's plant was 120 ms,
caught by both observers on all 40 loads, taken **after each measurement
window on the page that produced the figure** — which is the only form of the
proof that certifies the arm it is on.

## Handed here by Task 4.8.11 — 2026-10-10: a FIFTH flake, in the PROCESS suite, on code behaviourally identical to `main`

**`market-gateway.process.test.ts > a slow browser is dropped rather than
tolerated (Task 3.5.7) > leaves a HEALTHY client on the same process
untouched`** failed once today, verbatim:

```text
 FAIL  src/market-gateway.process.test.ts > a slow browser is dropped rather than tolerated (Task 3.5.7) > leaves a HEALTHY client on the same process untouched
AssertionError: expected +0 to be 1 // Object.is equality
 ❯ src/market-gateway.process.test.ts:567:40
    567|     expect(slow.gateway.clientCount()).toBe(1);
 Test Files  1 failed (1)
      Tests  1 failed | 22 passed (23)
```

**Both clients were dropped, not one.** The test's own comment says why it
exists: _"we dropped everybody" also satisfies a naive reading of "the slow one
was dropped"_ — so the failing mode is exactly the one the test was written to
catch, which makes it the worst shape of flake to leave uncharacterised.

**Three things that narrow it for you.**

- **It was not this change.** The run that failed had Task 4.8.11's guard
  **removed** (the passing-wrongly step), so the gateway was behaviourally
  identical to `main`. It passed on the immediate re-run and on every run since —
  roughly **1 failure in 4 full-file runs** of that spec today, which is a rate
  worth pinning rather than a one-off worth ignoring. Per `CLAUDE.md`'s own rule,
  **n = 4 cannot separate anything**; this is a sighting, not a rate.
- **It is in the PROCESS suite, which your three are not.** Your brief's three
  are browser-suite flakes, and 4.8.3 handed you a fourth that is not in the
  browser suite either. This one is in `pnpm verify`'s own `test:process` step —
  so it is a **required check** that can go red with nothing wrong, on a gate
  whose whole value is that a red means something.
- **The mechanism is loopback backpressure and a shared process.** The test
  pauses one client's underlying socket and publishes up to 400 universe batches
  until the slow one is dropped. The healthy client is served from the same
  process over the same loopback; on a loaded machine its own `bufferedAmount`
  can plausibly cross `MAX_BUFFERED_BYTES` (1 MiB, ~18 universe payloads) before
  the loop notices the slow one has gone. That is a hypothesis, not a finding —
  but it predicts a **load dependence**, which is the one thing your settled
  machine can test and nobody else can.

## Handed here by Task 4.8.12 — 2026-10-10: a fourth browser spec exists, and it loads `/` five times in one test

`e2e/specs/overview-source-note.spec.ts` is new. It has two tests; the second
loads `/` **five times** against `page.routeWebSocket`, once per state in the
source note's grid, and took **7.5 s** on a settled machine beside 2.2 s for
the first.

Two things for your characterisation. It is **not** in your three flakes and
has no history yet, so if it appears in a run of yours it is a new observation
rather than a known one — and a new spec's first red is the one most likely to
be mistaken for a regression in whatever branch it lands beside. And its shape
is the one your load hypothesis predicts trouble for: five sequential
navigations in one test body, each waiting on `networkidle`, so a loaded
machine stretches it rather than failing it. If you are counting executions,
count this one as five page loads rather than as one test.

### And three disjoint failure sets, observed 2026-10-10, with the load reading beside them

Task 4.8.12 ran `pnpm e2e` three times in an hour on one checkout. Recorded
here because the sets are **disjoint**, which is the shape your
characterisation needs and which a single run cannot show.

| Run | Result                        | Failed                                                                                                                                             |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `4 failed, 228 passed (5.4m)` | `securities-route` axe 1280x560; `security-explorer-shell` axe 1440 and 1024; `security-holiday-week` listener — all four **30 s timeouts**        |
| 2   | `3 failed, 230 passed (6.2m)` | `securities-route` axe no-close; `security-price-chart` volume alt text — timeouts; `security-price-chart` two crosshairs — `element(s) not found` |
| 3   | `1 failed, 231 passed (4.8m)` | `security-window-control` readout at desktop — `element(s) not found`                                                                              |

Every one of them passed when re-run scoped minutes later on the same
checkout — the run-1 set at **7–12 s each against 37–50 s before timing out**.

**The figure your three flakes' entries do not carry and this one does:**
`uptime` read a load average of **34.28** during these runs, against
`overview-instrument.mjs`'s own `LOAD_CEILING = 1.0`, with a
Virtualization.framework VM at 86.7% CPU. If your characterisation wants to
separate contention from a spec's own fragility, these are three sets taken
at a known, extreme load — and note the **second** failure mode in runs 2 and
3 is not a timeout at all but `element(s) not found`, which is a different
hypothesis and may be the store-state skip condition racing rather than the
machine.

---

## Findings — 2026-10-10

### The machine, and what it was allowed to be

Every arm below was gated on `loadavg[0] / 8 < 0.75` — inside Task 4.8.1's
`LOAD_CEILING = 1.0` with margin — and the gate was a **wait loop**, so no arm
started on a machine that had not come down from the one before it. `pgrep -f`
for this story's script names returned nothing at the top of the session (Task
4.8.6's orphan check), and `pnpm ready` reported the pair up throughout.

The one process the sweep did find is **not** a leak: `vite` on `:5173`, PPID
15025, 0.0% CPU — the owner's own `pnpm dev`, which is the documented
prerequisite for `pnpm e2e`. The `Virtualization.framework` VM that read 86.7%
of a core in Task 4.8.12's window read **31.7%** here, which is most of the
difference between that task's load of 34.28 and this one's 4.5–5.9.

**The arms where the ceiling was deliberately exceeded are the planted ones**,
and they are labelled `LOADED`. A plant is not a ceiling breach, it is the
independent variable; no figure below is published from a planted arm except as
_the rate under a stated plant_.

### The plant, and what it can and cannot reach

Two plants, because Task 4.8.1 already measured that they are not
interchangeable:

- **Browser contention** — `--workers=4`, which is Playwright's own default on
  8 cores and therefore the condition the browser suite actually runs in. Four
  concurrent Chromium processes, which is the shape 4.8.1 found moves a
  renderer's calibrator (8 blocked renderers: max 1.5 → 9.7 ms) where 24 node
  spinners did not move it at all.
- **CPU contention** — 16 × `node` spinning on `Math.sqrt` with no I/O, two per
  core. Proved by its effect on the load average rather than argued: **4.5 →
  78.5–79.8** within 45 s of starting, measured before every arm that used it,
  and `pgrep -f spin.mjs | wc -l` read `0` after every teardown.

**Which plant matters is itself a finding.** The gateway flake needs the CPU
plant and reproduces at 79% under it; the `index.process.test.ts` ordering flake
is untouched by it at n = 96.

### Subject 1 — `security-gap-fill.spec.ts:165`

| arm                   | n   | failures/execution | rate      | load before   | load after |
| --------------------- | --- | ------------------ | --------- | ------------- | ---------- |
| `--workers=1`         | 24  | 1                  | **4.2%**  | 5.11 (r 0.64) | 8.67       |
| `--workers=4`, take 1 | 24  | 8                  | **33.3%** | 5.22 (r 0.65) | 15.25      |
| `--workers=4`, take 2 | 24  | 4                  | **16.7%** | 5.02 (r 0.63) | 6.88       |
| `--workers=4`, pooled | 48  | 12                 | **25.0%** | —             | —          |

**95% CI on the pooled contention arm: 13.6–39.6%** (Wilson, n = 48). On the
isolation arm: **0.7–20.2%** (n = 24) — which is the arithmetic this task exists
for. **n = 24 cannot separate 4.2% from 16.7%**; what it can separate is 4.2%
from 25%, and it does.

**So the flake is real and it is load-dependent**, at a 6× rate between one
worker and the four the suite runs with.

**And every one of the 13 failures in 96 executions is the SAME assertion, and
it is not the one the spec's own comment names.** Line **219**, 13 of 13;
line 220, **0** of 13; line 218, **0** of 13. Verbatim, identically on all 13:

```text
Error: expect(received).toHaveLength(expected)

Expected length: 0
Received length: 1
Received array:  [2]

  217 |   // "it never disappeared" is also true of a chart that never changed.
  218 |   expect(seen.filter((d) => d === "")).toHaveLength(0);
> 219 |   expect(panels.filter((count) => count > 0)).toHaveLength(0);
      |                                               ^
  220 |   expect(seen.at(-1)).not.toBe(before);
```

#### The mechanism, measured rather than hypothesised

The entry in `docs/GAPS.md` reads that assertion as _no pending panel appears
while the refill runs … against ADR 0028's measured 160 ms cover threshold_.
**It cannot be that, and the reason is structural.**

1. **`Fetching` does not exist.** `grep -rn "Fetching" apps/frontend/src
apps/backend/src packages/shared/src` excluding tests and stories exits **1**.
   Half the regex has never matched anything in this product.
2. **ADR 0028's cover has no text to match.** `ChartPending` is, in full,
   `<div aria-hidden="true" className={styles.pending} />` — the panel the
   assertion is believed to be watching for is a **text-less, `aria-hidden`
   div**, and `page.getByText()` is structurally incapable of seeing it. The
   chart's other pending state, `BarSeriesPanel`'s `LoadingState`, says
   **`Reading the series…`** — which matches neither `Fetching` nor `Loading`.
3. **What it does match is the Explorer shell's first load, and there are
   exactly two of them** — which is why every failure reads `[2]` and never
   `[1]` or `[3]`. Measured directly against the running pair by a throwaway
   instrument polling the same predicate every 25 ms on
   `/securities/NVDA?sessions=5`, verbatim:

```text
t=150ms n=2
    p[-] "Loading securities. Anything typed is kept and will match as soon as they arrive."
    p[-] "Loading the tracked universe…"
t=175ms n=2
    p[-] "Loading securities. Anything typed is kept and will match as soon as they arrive."
    p[-] "Loading the tracked universe…"
t=200ms n=2
    p[-] "Loading securities. Anything typed is kept and will match as soon as they arrive."
    p[-] "Loading the tracked universe…"
... 3 sampled windows with a match
```

Those two strings are `SecuritySearch`'s unavailable-state sentence and
`UniverseTable`'s `LoadingState`. **Both belong to the 518-row universe list,
and neither has anything to do with the chart, the refill, or ADR 0028.**

**So the test fails when `GET /securities` has not finished arriving by the
time its own sampling loop opens** — ~75 ms of window on a warm dev build,
stretched past the loop's start by four concurrent Chromium processes.

**`docs/GAPS.md` named the right culprit through the wrong route.** It already
said _it is the table rather than the chart_, and that is correct — but not
because a 50–76 ms main-thread task delays the refill past a 160 ms threshold.
It is because the table's **own** pending sentence is counted by an assertion
written about the chart's. Task 4.8.8's amendment — that the task the hypothesis
rests on is no longer observable — is therefore true **and beside the point**:
the hypothesis was never testable, because the thing it predicts could not have
been detected by the assertion that fails.

#### And the repair at Task 4.3.8 addressed the other assertion

The spec's comment at line 165 states that the 14/120 failures were _"every one
of them the final assertion — the line never grew within the window"_, and on
that basis `f2463d3` (4.3.8, 2026-10-07) raised the sampling loop from
60 × 250 ms to **120 × 250 ms** and the per-test timeout to 60 s. **13 of 13
failures measured today are not that assertion.** Either the mode changed when
the window doubled — the plausible reading, and the raise then did exactly what
it was for — or the comment was wrong when it was written. **What is certain is
that the rate did not fall**: 12% published, **25%** on this machine under the
suite's own worker count after the raise. A longer window cannot help an
assertion about a different surface's first paint.

### Subject 2 — `securities-route.spec.ts:883`, the margin

| arm           | n   | failures | durations         | ceiling | load before   | load after |
| ------------- | --- | -------- | ----------------- | ------- | ------------- | ---------- |
| `--workers=1` | 24  | **0**    | **7.2 – 10.9 s**  | 30 s    | 5.87 (r 0.73) | 11.00      |
| `--workers=4` | 24  | **0**    | **11.2 – 14.5 s** | 30 s    | 4.50 (r 0.56) | 16.25      |

`--workers=1`, all 24 in order:
`8.0 7.6 7.6 10.9 8.4 7.9 9.8 7.7 7.8 9.5 8.8 10.6 7.4 8.2 9.7 8.1 7.5 8.2 7.3 7.6 7.2 7.7 9.4 7.3`

`--workers=4`, all 24 in order:
`13.5 13.6 13.7 13.7 11.2 11.4 11.4 11.5 12.5 12.7 12.7 12.6 13.7 13.7 13.8 13.4 14.3 14.4 14.1 14.5 13.9 14.0 14.0 14.1`

**Still a margin, and a wider one than the record carries.** `docs/GAPS.md`
publishes **19.8 / 19.9 / 19.9 / 20.0 / 11.3 / 11.6 s** from 4.3.7 (2026-09-28)
and calls it _two-thirds of its own timeout_. Today it is **8.0 s median
quiet** and **13.5 s median at four workers** — a **27% / 45%** of ceiling
rather than 66%.

**Two things that matter more than the improvement.** The **bimodality 4.3.7
recorded does not reproduce**: 24 samples spanning 7.2–10.9 s with no second
cluster, where 4.3.7's six split four at ~20 s and two at ~11.5 s. And the
**load sensitivity is confirmed and is the mechanism**: 1 → 4 workers costs a
**1.7×** stretch, so the entry's account of _a test that has nothing left when
the machine is not quiet_ is right about the shape. Crossing 30 s from 13.5 s
needs a further 2.2×, which is roughly the ratio between this machine today and
the one Task 4.8.12 ran on.

**The spec has changed since the published figure** — `aa6f88b` (4.6.6, _the
guard axe can no longer give_) is the most recent commit to touch it — so the
halving is not attributable here and is not attributed.

### Subject 3 — `market-gateway.process.test.ts:567`

| arm                                   | n   | failures/execution | rate      | load during  |
| ------------------------------------- | --- | ------------------ | --------- | ------------ |
| scoped `-t`, quiet                    | 24  | **0**              | 0%        | 5.13 → 4.26  |
| whole `test:process` step, quiet      | 24  | **0**              | 0%        | 4.54 → 5.65  |
| scoped `-t`, **LOADED** (16 spinners) | 24  | **5**              | **20.8%** | 46.5 → 135.3 |
| whole `test:process` step, **LOADED** | 24  | **19**             | **79.2%** | 78.5 → 129.3 |

**Monotone in load across four arms and 96 executions, from 0% to 79%** — and
every one of the 24 failures is the sighting verbatim, the same line, the same
value:

```text
 FAIL  src/market-gateway.process.test.ts > a slow browser is dropped rather than tolerated (Task 3.5.7) > leaves a HEALTHY client on the same process untouched
AssertionError: expected +0 to be 1 // Object.is equality
 ❯ src/market-gateway.process.test.ts:567:40
      Tests  1 failed | 43 passed (44)
```

**`+0`, so both clients were dropped every time** — which is the mode the test's
own comment says it exists to catch, and the reason this one was worth the n.

**Task 4.8.11's hypothesis is confirmed and promoted to a measurement.** It
predicted a load dependence from loopback backpressure in a shared process: the
healthy client is served over the same loopback as the slow one, and on a
machine that cannot drain it, its own `bufferedAmount` crosses
`MAX_BUFFERED_BYTES` (1 MiB, ~18 universe payloads) before the publish loop
notices the slow one has gone. **The prediction was a load dependence and the
load dependence is there, 0 → 79%.** The scoped test body is self-contained —
`attach()` per `it`, no fixture shared with the sibling test — so the two quiet
arms are not passing for a scoping reason.

**Note what the quiet whole-step arm cost and bought**: 24 executions of the
real `verify` step, 12.5 s each, **44 passed every time**. That is the number to
quote when somebody asks whether `test:process` is trustworthy on a settled
machine. It is. It is not trustworthy on a saturated one, and the failure it
produces there is a red on a required check with nothing wrong.

### Subject 4 — `index.process.test.ts`, the shutdown ordering

| arm                                   | n   | failures | rate |
| ------------------------------------- | --- | -------- | ---- |
| scoped `-t`, quiet                    | 24  | **0**    | 0%   |
| scoped `-t`, **LOADED** (16 spinners) | 24  | **0**    | 0%   |
| whole `test:process` step, quiet      | 24  | **0**    | 0%   |
| whole `test:process` step, **LOADED** | 24  | **0**    | 0%   |

**0 failures in 96 executions, 48 of them under a plant that took the load
average to 130.** `expected 13 to be greater than 18` did not recur once.

**Reported as unreproduced rather than as absent, and the plant is the reason.**
The assertion is over two **log-line indices** — `market gateway closed` before
`http drained` — in a spawned child's records, and what reorders them is a
scheduling difference inside that child's shutdown, not CPU starvation of the
runner. A CPU plant starves the runner and the child alike and may simply scale
both; Task 4.8.3's sighting came from a **whole-gate** execution, where the
plant is other spawned servers, other sockets and other ports. **The arm that
would reach it is `pnpm verify` repeated, not `test:process` repeated**, and at
~3 minutes an execution that is 72 minutes for n = 24 — which this task did not
spend, and says so rather than reporting 0/96 as a rate.

**95% CI on 0/96 is 0–3.8%.** So whatever it is, it is under 4% in the
conditions tested, and `CLAUDE.md`'s rule applies to this task as much as to
anybody: a figure that was never allowed to be taken cannot be quoted.

### The code-free control — TAKEN, and it behaved

`dee73de`, on this branch, **one planning Markdown file and nothing else**:

```text
$ git diff --stat HEAD~1 HEAD -- . ':(exclude)planning' ':(exclude)docs'
$
```

Empty, so the runtime tree is byte-identical to its parent. The arm either side
of it is `security-gap-fill` at `--repeat-each=24 --workers=4`:

| commit                      | n   | failures | rate  |
| --------------------------- | --- | -------- | ----- |
| `3bb8649` (parent) — take 1 | 24  | 8        | 33.3% |
| `3bb8649` (parent) — take 2 | 24  | 4        | 16.7% |
| `dee73de` (**control**)     | 24  | 4        | 16.7% |

**The control's draw sits inside its parent's own spread**, and the parent's two
takes differ from each other by as much as either differs from the control —
which is the whole claim. All four of the control arm's failures are line 219,
`Received array: [2]`, like the other twelve.

**The useful form of the finding is the second take, not the control.** Two
arms on the **same commit**, minutes apart, gave 33.3% and 16.7%. **Anybody
comparing one `--repeat-each=24` on a branch against one on `main` is drawing
from that.** The control proves the method; the repeated parent proves the
method was necessary.

### Subject 5 — Task 4.8.12's disjoint sets, and the finding is bigger than the three

Three `pnpm e2e` runs, each gated on the load ratio before it:

| run | load before           | result                 | failed                                                                                                                   |
| --- | --------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | **5.31** (ratio 0.66) | `1 failed, 231 passed` | `securities-route:232` axe 1280x480 — **timeout**                                                                        |
| 2   | **5.74** (ratio 0.72) | `1 failed, 231 passed` | `security-holiday-week:217` listener — **timeout**                                                                       |
| 3   | **4.35** (ratio 0.54) | `3 failed, 229 passed` | `securities-route:281` and `:310` axe — **timeouts**; `security-gap-fill:165` — **assertion**, subject 1 appearing again |

Loads after: **31.04, 31.86, 22.44**.

**Disjoint again, and 0 of 3 runs clean.** Five failures on a settled machine
against Task 4.8.12's eight on a saturated one — fewer, same order. **So
Story 4.9's reading, _on this evidence it is the machine_, is falsified: it is
both, and settling the machine is not the cure.**

**The reason is the single most reusable thing this task measured. The browser
suite is its own plant.** Run 1 began at **5.31** and ended at **31.04**; run 2
began at 5.74 and ended at 31.86. Four Chromium workers on 8 cores **is** the
load, so settling beforehand buys the first minute of a five-minute run. Which
means Task 4.8.12's `uptime` of **34.28, read during its runs**, is mostly its
own suite rather than the VM beside it — and that reading cannot carry the
weight it was given. **Read the load before the run, never during it.**

**And the margin is a FAMILY rather than a spec**, which is what finally
explains the disjointness. `docs/GAPS.md` nominates `securities-route:883`; it
ran at **8.5 / 13.4 / < 12 s** here and is nowhere near the front. Ranked by
worst reported duration across the three runs:

| test                                                 | run 1      | run 2      | run 3      |
| ---------------------------------------------------- | ---------- | ---------- | ---------- |
| `securities-route:281` open result surface, axe      | 23.2 s     | 26.7 s     | **48.7 s** |
| `security-holiday-week:217` what a listener is told  | 16.1 s     | **47.4 s** | 29.8 s     |
| `securities-route:232` loaded universe axe, 1280x480 | **45.7 s** | 30.4 s     | 25.0 s     |
| `securities-route:310` nothing has a close, axe      | 22.2 s     | 36.2 s     | **1.0 m**  |
| `security-explorer-shell:175` shell axe, 640px       | 15.1 s     | **37.8 s** | < 12 s     |
| `securities-route:232` loaded universe axe, 1280x560 | 17.4 s     | **35.2 s** | 23.6 s     |
| `security-price-chart:909` volume plot, alt text     | 24.5 s     | **31.1 s** | 14.1 s     |
| `securities-route:106` universe from the real pair   | 16.7 s     | 16.9 s     | **24.9 s** |

**Six of the eight are axe runs over a surface holding the 518-row universe.**
Every disjoint set anybody has recorded — 4.8.12's three, these three — is a
draw from this family, and **which member crosses depends on which worker was
busiest.** That is why it reads as random, why the set is never the same twice,
and why re-running one scoped always passes: scoped, it has the machine to
itself.

**And one instrument caveat that bounds every headroom figure in this
repository, this task's included.** Playwright reported **35.2 s, 36.2 s and
37.8 s for tests it marked PASSED**, against a default per-test timeout of 30 s
that `playwright.config.ts` does not raise, while every timeout failure reads
`Test timeout of 30000ms exceeded`. **So a reported duration is not the
quantity the ceiling governs.** Fixture setup and teardown outside the timed
body is the obvious candidate and is **unverified**. Reported durations are
comparable with each other — which is what makes subject 2's halving a real
comparison — and **must not be turned into a percentage of 30 s**. That
retires `docs/GAPS.md`'s _two-thirds of its own timeout_ as a framing, and the
amendment there says so.

**One honesty note about the arm.** Runs 1 and 2 ran on `dee73de`'s tree; by
run 3 the tree carried **one amended comment** in
`e2e/specs/security-gap-fill.spec.ts` (the dated correction of a claim this
task falsified, swept the same day per `CLAUDE.md`). It is a comment, no
behaviour and no assertion changed — but it is not literally one checkout
across all three runs, and saying so is cheaper than someone else finding it.

## Done when — the verdicts

1. **Met, and widened from three to five.** n = 24 per subject per arm on one
   checkout, 456 executions in total, every arm's load recorded either side and
   gated by a wait loop. **No window was discarded, because the gate refused to
   start rather than discarding after the fact** — which is the ceiling's own
   design (4.8.1: _it exits non-zero rather than warning_), and it is the
   honest answer to _the discard count_: the discard happened before the arm,
   `0` windows were thrown away inside one.
2. **Met.** `dee73de`, with the arm run either side of it.
3. **Met.** Three `docs/GAPS.md` entries amended with a measurement where there
   was a hypothesis, one new entry for the fourth flake (recorded as
   **unreproduced at n = 96** with the reason, rather than as a rate), and one
   new entry for the suite-wide ceiling family.
4. **Met.** Story 4.9's `STORY.md` carries the discharge in two places — the
   owed-and-not-taken list and the Gate 2 assignment — with the per-subject
   verdict and the one outstanding arm (`pnpm verify` ×24) named.

### The five, each labelled

| subject                              | verdict                            | what separates it                                                                                                                    |
| ------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `security-gap-fill:165`              | **FLAKE, and a wrong predicate**   | 4.2% at 1 worker vs 25% at 4; and 13/13 failures an assertion that cannot see the panel it names                                     |
| `securities-route:883`               | **MARGIN, wider than published**   | 0/48, 8.0 s → 13.5 s from 1 → 4 workers; and it is **not** the front of its family                                                   |
| `market-gateway.process.test.ts:567` | **MACHINE, mechanism confirmed**   | 0/48 quiet → 19/24 under a stated plant, monotone; `+0` every time, so both clients dropped as 4.8.11 predicted                      |
| `index.process.test.ts:1004`         | **UNREPRODUCED at n = 96**         | 0 failures, half the arms planted to load 130; the plant that would reach it is `pnpm verify`, not CPU                               |
| 4.8.12's disjoint sets               | **MARGIN FAMILY, not the machine** | 0 of 3 settled runs clean, sets disjoint, eight tests at 15–49 s of which six are axe over 518 rows — and the suite is its own plant |

## Gates

`pnpm verify` — **exit 0**, every step, no `Unhandled Errors` block:

```text
$ node scripts/check-quiet.mjs && pnpm run build && pnpm run lint && pnpm run format:check && pnpm run stories && pnpm run env:check && pnpm run links && pnpm run invariants && pnpm run coverage:check && pnpm run test && pnpm run test:process
$ tsc -b && pnpm --filter @marketpulse/frontend exec vite build && pnpm --filter @marketpulse/frontend exec storybook build
$ eslint . --max-warnings 0
$ prettier --check .
$ node scripts/check-stories.mjs
42 components, 42 stories files.
$ node scripts/check-env-example.mjs
16 backend variables documented, frontend example clean.
$ node scripts/check-links.mjs
515 documents, 1706 cross-file links, 39 anchor links, 0 broken.
$ node scripts/check-invariants.mjs
52 invariants hold.
$ pnpm -r run test
packages/shared test:       Tests  440 passed (440)
apps/backend test:          Tests  1031 passed (1031)
apps/frontend test:         Tests  1396 passed (1396)
$ pnpm -r run test:process
apps/backend test:process:  Tests  44 passed (44)
VERIFY EXIT CODE: 0
```

**The first run of it was reported through a pipe to `tail`, so the `exited with
code 0` it printed was `tail`'s.** It was re-run without the pipe for the code
above — which is the same family of error this whole task is about, and is noted
rather than quietly fixed.

**`pnpm e2e` is NOT green and is reported rather than re-run to green**: three
runs, 1 / 1 / 3 failures, every one of them in the two characterised families
and none of them reachable by this task's only non-Markdown change (a comment).
The verbatim sets are in the subject-5 table above. **A green full suite was not
achieved and no amount of re-running would make the failure count mean
anything** — which is the finding, not a dodge.

**`pnpm test:database` was not run.** Nothing here touches the schema, a query,
a migration or `apps/backend/src/schema.ts`; `pnpm test:process` was run 96 times
instead, which is the suite this task's subjects live in.

**`pnpm break` was not run**: this task adds no check. Three `docs/GAPS.md`
entries moved from hypothesis to measurement and one new entry records an
unreproduced flake — none of them is a single grep, so none belongs in
`pnpm invariants`.
