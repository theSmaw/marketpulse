# Task 3.11.10 — Every break this epic added, performed

**Status:** **Complete — 2026-09-25. All 77 unperformed entries run, 74 red, three findings — and the whole registry takes under three minutes rather than the hour this task was split out for.** One guard was **flaky rather than absent** (three reds in five runs, repaired and now 5/5); one break reports a **false all-clear against a running dev server**, which is a trap every CSS-module entry has; and one has been **disarmed by its own subject being finished** — it cannot go red until Story 3.11 is marked complete, which is Task 3.11.11's to arm.
**Story:** [3.11 Cost, Performance, the Sweep & the Epic Close](STORY.md)
**Depends on:** 3.11.7
**Added 2026-09-25 by Task 3.11.7's sweep**, and it is a split rather than new
work: the close carried this as one bullet, and the bullet is **61 breaks**.

## Objective

Criterion 10's other half. Task 3.11.7 took the five ADR 0030 mechanisms —
the ones where a missed check is a user being misled. **This is the rest of the
registry**, where a missed check is a defect shipping with `pnpm verify` green.

## What the user can see when this lands

**Nothing**, and what it protects is every other claim this epic made about
itself.

## Why this is a task rather than a bullet

**The count, taken by Task 3.11.7**: `scripts/breaks.mjs` holds **82** entries
today and held **16** on 2026-09-16, so **66 were added during Epic 3**. Five
were performed in 3.11.7. **61 remain.**

Most rebuild the workspace, several need a real PostgreSQL and a few need a
browser, so this is **well over an hour of wall time** — and Task 3.11.7 stated
plainly that its own criterion 3 could not be met because of it.

> **An hour of unattended machine time at the end of an epic, inside the task
> that also closes the epic, is how work gets dropped.** This repository has the
> record: the close sweeps what the story wrote and misses what was handed to
> it, five times over. The bullet is removed from Task 3.11.11 and given its own
> file so it can go red on its own.

## What this is actually testing, which is not what `pnpm invariants` tests

`pnpm invariants` carries **`every-break-can-still-land`**, added 2026-09-21
after four entries rotted silently. It asserts **the text is still there** —
that the `find` matches exactly once in the file it names.

**It cannot assert that the substitution still expresses the defect**, and that
is the half this task performs. A `find` that still matches can be a break that
no longer produces red, because the assertion moved, the test was renamed, or
the defect became unreachable by another route.

> **A break that does not go red is not evidence the check works** — it is
> equally evidence the break did not land. The harness refuses on a dirty
> target, checksums either side and restores on every signal, so the only cost
> of running one is time.

## Work

- **Every entry in `scripts/breaks.mjs` run**, minus the five Task 3.11.7
  performed. Run them **unattended and in sequence** — the harness takes the
  heavy-job lock and a second heavy job is refused
- **Every failure recorded rather than repaired silently**: which entry, what
  the harness said, and whether the fault is the break or the check
- **Any break whose substitution no longer expresses its defect repointed and
  re-run**, which is the only thing that proves the repair
- A note on **how long the whole registry takes**, because that figure is what
  decides whether this is repeatable or whether the registry needs a faster mode
- The `16 → 82` count re-taken at the end, in case the number moved while this
  ran

## Done when

1. Every entry in the registry has been performed at least once since it was
   written, or is named with why not
2. Every entry that did not go red is recorded, with a verdict on whether the
   break or the check is at fault
3. The registry's total wall time is written down

## The prediction, so it can be wrong in writing

**Some of these will not go red**, and the interesting ones will be the breaks
whose subject moved rather than the ones whose text moved — the text-movers are
already caught mechanically. Four rotted in a single day on 2026-09-21 with
every run green throughout, and 61 entries written across eleven stories is a
larger surface than that.

**If every one of them goes red, that is a finding too**, and a better one: it
would be the first evidence in this repository that the convention _a check you
add owes a break_ is being honoured rather than merely written down.

## Amended by Task 3.11.9 — 2026-09-25: three of these breaks are now load-bearing for an ADR, and should be run first

**`CLAUDE.md` gained a corollary on 2026-09-25**, decided by Task 3.11.9 and
earned twice in five days:

> **A claim about a mechanism reads identically whether the mechanism is there
> or not.** When you write that something is guarded, write the check in the
> same change.

**Two ADRs written the same day make exactly that kind of claim**, which puts
their guards inside this task's scope rather than beside it:

| The claim                                                                                    | Whose           | The break                                                            |
| -------------------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------- |
| `sentAt` is held out of `feed-liveness.ts` and both adapters, so no threshold reads the wire | ADR 0036        | `the-send-instant-becomes-a-clock`                                   |
| the gateway stamps every frame it sends                                                      | ADR 0033 / 0036 | `the-gateway-stamps-nothing`                                         |
| the deploy reads the configured provider and refuses to roll on the wrong one                | ADR 0030 §7b    | `the-deploy-stops-reading-the-provider` (already run by Task 3.11.7) |

**Run the first two at the front of the pass and record them separately**, not
because they are more likely to have rotted, but because an ADR published this
week asserts them — and this epic has twice found a published assertion standing
in front of nothing.

> **The rest of the pass is unchanged.** This is an ordering note and three
> named entries, not a narrowing: the point of the task is still every entry the
> epic added, and the interesting failures will be the ones nobody predicted.

---

## What was done — 2026-09-25

### The pass: 77 entries, 74 red, 170 seconds

**Every entry in `scripts/breaks.mjs` that Task 3.11.7 had not already
performed** — 77 of the registry's 82 — run unattended in sequence, each with
its own log.

**The first finding is the wall time.** This task exists because 3.11.7
estimated _well over an hour_ and split the work out of the close rather than
risk it being dropped. **The real figure is 170 seconds**, of which 155 s is
command time:

| Shape                                                   | n   | Typical    |
| ------------------------------------------------------- | --- | ---------- |
| `node scripts/check-invariants.mjs` / `pnpm invariants` | 34  | **0–1 s**  |
| a scoped unit test (`--filter … test <path>`)           | 29  | **1–3 s**  |
| a database test                                         | 11  | **1–3 s**  |
| a browser spec                                          | 5   | **2–12 s** |

> **The estimate was wrong by about 20×, and it was wrong for a reason worth
> keeping.** It assumed the breaks were dominated by the workspace rebuild, and
> **only five of 82 entries rebuild at all** — the rest substitute one file and
> run one scoped command. **The registry is cheap enough to run on every close**,
> which is a different planning fact from the one the split was made on. The
> split was still right: the alternative was a bullet nobody ran.

**And the prediction was half right.** It said _some of these will not go red,
and the interesting ones will be the breaks whose subject moved rather than the
ones whose text moved._ Three did not go red, and **not one of them is a rotted
`find`** — `every-break-can-still-land` had already swept that class. All three
are different, and two are defects in the checking apparatus rather than in a
break.

### Finding 1 — a guard that catches a regression three times in five

**`a-failed-refill-wipes-the-chart` did not go red. Run by hand, it did.**

That is the worst possible shape for a check, so it was run five times against
the same break: **three red, two green.** The guard it proves — _a refill that
fails changes nothing_, `PRODUCT_SPEC.md` §36 arriving locally — was protected
by a **non-deterministic** test.

**The race**: the test waits for `calls` to reach 2, and `calls` grows when the
**request goes out**, not when its answer is handled. The discarded guard's
`setState` lands in a microtask that the assertion sometimes beat.

**Repaired in the test, not the product** — the product was right all along:
one `await act(async () => …)` draining the microtasks the refill's answer sits
in. Measured after: **five reds in five runs** against the break, **three greens
in three** on a healthy tree, and `pnpm break` now reports ✓.

> **This is the failure mode the whole task exists for, and it is worse than a
> rotted break.** A rotted `find` is loud the moment anybody runs it.
> A check that fails 60% of the time is green on the run that matters, and the
> repository's own rule — _tests must pass, always; never hand a flaky suite to
> CI as the arbiter_ — has a mirror image nobody had written down: **a check
> that goes red only sometimes is not a guard.**

### Finding 2 — a false all-clear, and every CSS-module break has it

**`the-mark-does-not-outlive-its-motion` reported _did NOT go red_** against a
dev server that had been up for two hours. **With the break applied and the dev
server restarted, it went red on the first run.**

The cause is already in `CLAUDE.md`: _a `composes` change does not reliably
hot-reload_. `motion.module.css` is the shared layer the mark's `opacity: 0`
moved into, so the browser was asserting against CSS the server had cached
before the substitution existed.

**What was missing is that the rule applies to `pnpm break`, where the symptom
inverts.** In ordinary work a stale `composes` change looks like _my edit did
nothing_ — annoying, obvious. Under the harness it looks like **a guard
reported as absent when it is there**, which is the one direction that spends a
repair on working code.

**Recorded in two places**: a `RESTART pnpm dev BEFORE RUNNING THIS` comment on
the entry, and a new bullet in `CLAUDE.md`'s break rules, because **every entry
whose `file` is a CSS module has this** and there is more than one.

### Finding 3 — a check disarmed by its own subject being finished

**`the-close-outruns-the-rehearsal` cannot go red today**, and it is nobody's
mistake.

The invariant needs **two** conditions at once: Story 3.11 marked **complete**,
and a row in `LIVE-REHEARSAL.md` still **empty**. **Task 3.11.8 filled the last
three empty rows yesterday**, so the break's substitution — marking the story
complete — now makes nothing fail. A break is one file; no single substitution
can restore both halves.

> **The check that exists because a document claimed a mechanism that did not
> exist is now, itself, a mechanism that provably cannot fire.** It is the same
> shape wearing the check's own clothes, and it would have shipped inside the
> commit that closes the epic it guards.

**Handed to Task 3.11.11 with the repair written out**, because that task marks
the story complete and therefore supplies the first condition for free:
repoint the entry at `LIVE-REHEARSAL.md`, empty one row's cells, run it. Two
minutes, and the entry carries the instruction.

**And `every-break-can-still-land` will not notice**, because the `find` text is
still there. That invariant asserts the cheap half by design — which is the
sentence this task was written under, now with a third worked example.

### The count, re-taken

**82 entries** in the registry at the end, unchanged from the start — nothing
was added or removed while this ran. **77 performed here**, 5 by Task 3.11.7,
so **every entry in the registry has now been performed at least once since it
was written**, with the single named exception of finding 3, which is armed by
the next task.

### Gates

`pnpm invariants` green at 27. `pnpm links` green — 435 documents, 1,595 links.
The repaired test green three times on a healthy tree and red five times against
its break. One source file changed: a test, plus two comments and a `CLAUDE.md`
rule.
