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
