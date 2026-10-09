# Task 4.8.10 — §28, the sweeps, and the close

**Status:** Not started
**Story:** [4.8 The Overview at Universe Scale](STORY.md)
**Depends on:** 4.8.2 … 4.8.9

## Objective

**A figure taken after the epic is called done is a figure nobody re-takes**,
and a measurement that falsifies a governing document is swept the same day
rather than at the close. This task is the close that does the sweeping.

## What the user can see when this lands

**Nothing.** The story is finished.

## Work

### §28, amended or explicitly not

AC 6. §28 names two exceptions today, both the universe table, both Epic 14's.
**A third entry is a published admission on the product's front door**; the
alternative is owning it in this epic. If it is not amended, say **where it was
checked** — §28's exception list is also quoted in `planning/EPICS.md`, Epic
14's `EPIC.md` and `CLAUDE.md`.

### The upward sweep, with what is already known to be owed

- Epic 14's **false `Intl` construction claim** (Task 4.8.7 carries it).
- `docs/GAPS.md`'s **stale owner clause** for the four-route re-render, whose
  condition fired on 2026-09-27 (Task 4.8.2).
- The **one-to-sixteen sentence** at three live sites (Task 4.8.2).
- ~~The **431-byte** frame size, and the `6.9 KiB/min` and `12% on top`
  arithmetic derived from it (Task 4.8.4).~~ — **done on 2026-10-09 by Task
  4.8.4**, at **three** live sites (`docs/GAPS.md`, this story's `STORY.md`, and
  a dated amendment beside ADR 0038's verbatim frame) with **one** historical
  site left standing by decision (Story 4.3's `STORY.md` frame-grain table,
  which is shaping text addressed to a story that has shipped). The figures to
  carry are **4,078 B** at the ceiling, **27.1 KiB/min** at 6.8 batches a
  minute and **64.1 KiB/min** at 16.1. What you still owe here is **the sweep
  of the `56.9 KiB`-a-minute family**, which is eleven places by Task 3.5.8's
  own count and was deliberately left: the 12% error came from dividing a
  per-batch figure by one of them.
- The hand-off's **_does not scale with connections_** claim (Task 4.8.3).
- Every inherited figure this story supersedes, with the old one left standing
  where it is a historical record and amended where it is a live claim.

### The sideways sweep — and run BOTH passes

Grep this story's documents for every `Story N.M` and `Owner:` line **and then
walk the epic's own story list asking _did 4.8 measure anything that story acts
on_**. **The second pass is what found three missing hand-offs in Story 4.6 and
two in 4.4, each after the grep found none.** Record the miss count.

Known candidates before you start: **Story 4.7** (its degraded grid runs on the
same instrument, and `/` re-renders on every batch in every degraded state);
**Story 4.9** (the flake characterisation, the code-free control, and the frame
composition); **Epic 5** (clause A and clause B, which Task 4.8.8 writes); and
**Epic 14** (what it still owns after this story, and what it does not).

### `docs/GAPS.md`

An entry for every claim this story leaves standing that nothing mechanical
guards — and **anything that can be made mechanical is made mechanical
instead**, as a `pnpm invariants` entry with a break. The strongest candidate,
already identified: **the cadence** — no offline feed reproduces ~16 batches a
minute, so every local per-tick figure on `/` is a sixteenth of the real render
count.

### And the frame composition, which the owner moved

**Frame composition goes to Story 4.9 with a named condition** — each `bars`
frame's symbol list, which **no replay or fixture can structurally produce** and
which three later stories were told to size against. It expires with every
session that passes. Write it into 4.9's own file.

### The close

`STORY.md`; `CLAUDE.md`'s _Current state_ and its _Where the record lives_ table
if this story added a subject; `LIVE-REHEARSAL.md` if it needs a person. Then
Gate 2.

## Done when

1. §28 amended, or explicitly not with where it was checked
2. Every falsified live claim corrected the same day, historical records left
   standing, and the count stated
3. Both sideways passes run and **the miss count recorded**
4. `docs/GAPS.md` entries written, with anything mechanisable made mechanical
5. Story 4.9 carries the frame composition and whatever 4.8.9 discharged
6. `pnpm verify` and `pnpm e2e` green, and Gate 2 put to the owner

## Handed here by Task 4.8.3 — 2026-10-09

**Three figures the sweep inherits, each measured rather than inherited.**

1. **The aggregate frame's ceiling is 4,078 bytes, not 1,650.** 4.8.2's
   1,648–1,654 is a frame from a store where most of the universe had not been
   heard from; with all 518 observed on the observed basis it is **4,078**, and
   on the session basis **3,142**. CI's shape — nothing observed, no closes — is
   **928**, measured off the wire and agreeing with 4.8.2 exactly. Anything sized
   against 1,650, or against ADR 0038's verbatim 431, is sized against a partial
   market.
2. **The backend leg per applied batch is 3.72 ms** (tight loop, n = 400 after
   300 warm-up, two runs, interleaved control reproducing 4.4.4's 3.497 ms to
   1.4%), of which the join is 3.44 and everything else is 0.22. The per-client
   fan-out beside it is **1.59 ms** at 518 subscribed and **0.67 ms** per
   additional client.
3. **Every absolute figure in this epic needs the tight-loop caveat beside it.**
   At a 250 ms-or-greater gap the same join reads **12.97–15.43 ms** on this
   machine, and a fixed-cost control with no ICU and no allocation inflates by
   the same factor — so the inflation is the machine waking from idle, it applies
   to every figure equally, and no figure taken this way is a production cost.
   §28's line is absolute; this caveat is not optional in a §28 sweep.

**And the claim the sweep must not re-introduce**: _"the backend cost does not
scale with connections"_ is **false of the join** and true of the broadcast
encode. Five live sites were corrected on 2026-10-09 and six historical ones left
standing — the table is in Task 4.8.3.

## Handed here by Task 4.8.4 — 2026-10-09

**Four things for §28 and the sweeps.**

1. **§28's routine 50 ms line is met on `/` with a factor of twenty to spare**,
   and the figures to quote are: **3.7–5.1 ms of main-thread work a batch** net
   of a quiet control at the same cadence, **25–82 ms a minute** at 6.8–16.1
   batches a minute, largest single task **4.5 ms**, `longtask` entries **0**
   in seven arms, worst rAF gap **17.7–17.8 ms** against a 16.7 ms quantum.
   Production build, 1440×900, furnished socket, local, **not deployed**.
2. **Do not carry 4.8.3's tight-loop caveat onto the browser figures.** Its
   own sentence — _no absolute figure in this epic is a measurement of
   production cost_ — is **true of the backend legs and false of the browser
   one**: the same fixed-cost calibrator reads ×2.4–3.5 at a gap in Node and
   **×1.00** in a visible renderer at gaps of 3.7 s and 8.8 s, five arms out of
   five. The sweep needs **two** caveats, not one.
3. **The byte sweep named in your list is done** for the aggregate — three live
   sites, one historical left standing, see Task 4.8.4's record and the entry
   above. What is **not** done and is yours is the **`56.9 KiB`-a-minute
   family, eleven places by Task 3.5.8's own count**: the withdrawn `12% on
top` figure was wrong precisely because it divided a per-**batch** aggregate
   by one of them.
4. **One candidate, recorded and not taken:** `changePercent` crosses the wire
   **unrounded**, so a figure carries `1.6244720133889459` where the screen
   draws `1.62`. That is **~13 bytes a figure, ~350 a frame, 9% of the
   aggregate**. Rounding it is a wire change and a product decision — a
   consumer that re-ranks needs the precision — so it is handed to Story 4.9
   beside the frame-composition question rather than taken here.
