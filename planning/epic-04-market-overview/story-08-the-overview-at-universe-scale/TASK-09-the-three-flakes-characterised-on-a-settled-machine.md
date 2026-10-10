# Task 4.8.9 — The three flakes characterised, on a settled machine

**Status:** Not started
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
