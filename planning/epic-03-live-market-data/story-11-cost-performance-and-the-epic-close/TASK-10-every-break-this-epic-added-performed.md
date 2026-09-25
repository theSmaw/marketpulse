# Task 3.11.10 — Every break this epic added, performed

**Status:** Not started
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
