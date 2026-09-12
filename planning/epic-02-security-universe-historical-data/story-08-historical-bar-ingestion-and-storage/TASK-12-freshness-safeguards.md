# Task 2.8.12 — Freshness safeguards: a static contract, and a runtime answer

**Status:** Complete — 2026-09-12
**Story:** [2.8 Historical Bar Ingestion, Storage & Backfill](STORY.md)
**Depends on:** 2.8.11
**Added:** 2026-09-12, after the story closed

## Why this task exists

[Task 2.8.11](TASK-11-the-nightly-catch-up-fills-both-timeframes.md) repaired the
defect: the nightly catch-up now fills both timeframes. **This task is about the
defect being possible at all**, on the instruction that _"it is critical that we
have robust processes and testing in place so that this kind of bug cannot
occur"_.

## The class, stated precisely

> A **scheduled** process silently satisfied a _narrower_ contract than the
> application depends on, and every instrument that could have noticed was
> either inside the process itself or configured to look at the part that could
> not fail.

Three independent safeguards were absent. Any one of them would have caught it.

1. **The producer and the consumer disagreed about scope, and nothing compared
   them.** The backend reads `{1m, 1d}` — `REPORTED_TIMEFRAME` and
   `CLOSE_TIMEFRAME`, ten lines apart in `routes/securities.ts`. The scheduled
   job filled `{1m}`. **Both facts were files in this repository**, and a
   statically checkable contradiction survived eight days behind a green cron.

2. **The only report lived inside the thing it reported on.** `pnpm bars:check`
   runs in the backfill job's own summary, so it cannot report the backfill not
   running — and `backfill.yml` itself records that GitHub disables a
   `schedule:` after 60 days with no pushes. **Silence read as health.**

3. **The product could not express staleness.** A date-stamped close makes the
   reader do arithmetic against a calendar they do not have. Nothing in the
   domain model distinguished _current_ from _four sessions behind_.

The through-line: **freshness is a property of the deployment over time**, and
`pnpm verify` is designed to have no database, no network and no credentials. So
it sits outside the only gate that runs on every change, and the compensating
mechanism was a prose list re-read by humans.

## What was built

### 1. `pnpm coverage:check` — the contract, statically, in `verify`

`scripts/check-backfill-coverage.mjs`. Reads the scheduled passes out of
`backfill.yml` and every timeframe the system can store, and **fails when the
job does not cover them**. No network, no credentials, no database, so it lives
inside `verify`'s stated constraints rather than forking them.

**The anchor moved once, and the first attempt is the interesting part.** It
began by reading the `…TIMEFRAME: Timeframe = "…"` constants in the route —
the precise contract. Renaming `CLOSE_TIMEFRAME` to `closeTf` made it find one
constant instead of two **and pass**, which is the exact class of defect it
exists to prevent, one level up. Verified by doing it. It now anchors on
`TIMEFRAMES` in `packages/shared/src/bar.ts`: a single exported `as const` that
`Timeframe` derives from, which `tsc` protects from a rename.

The stricter rule is also the more honest one — a timeframe the store can hold
is one somebody can request — and a deliberate exception goes in
`DELIBERATELY_UNFILLED` **with its reason** rather than being silent.

Five breaks were run and all five go red: the 1d pass removed; the constant
renamed; a third timeframe added to `TIMEFRAMES`; `TIMEFRAMES` itself renamed;
the passes array emptied.

### 2. `GET /diagnostics/freshness` — the runtime answer

`store-freshness.ts` (the arithmetic, pure) and a route on the existing
diagnostics plugin. Per timeframe: the newest session covered, how many
completed sessions behind that is, **and the same for the worst security**.

Four decisions worth the reader's time:

- **Computed on request, never on a schedule.** The instrument that failed had
  no way to report its own absence. This has no schedule to miss and no state to
  go stale.
- **The ledger, not the bars.** `bar_coverage` is a few hundred rows however
  many bars exist; `max(observed_at) group by security_id` is ~345k rows at `1d`
  and **fifty million** at `1m`. §8.18 had already reached this conclusion from
  the other side: _"`bar_coverage.updated_at` is doing its job perfectly here.
  It is simply that nobody read it."_
- **Newest and stalest, separately.** The newest catches a dead cron; **only the
  stalest catches a partial fill**, which a maximum hides completely.
- **Every timeframe appears, including one the ledger holds no row for.** The
  original defect was not a wrong number — it was an **absent** one, and a
  timeframe reported by omission is one nobody notices.

### 3. The deployed check fails on it

`check-deployed.mjs` gained a `store` probe with a **two-session ceiling**,
measured against the _stalest_ security. Post-merge only, so it gates nothing
and its output is a rollback decision — which is how this repository already
treats deployed checks, and the reason it is not in `verify`: a live store has
no business making an unrelated contributor's PR red, and `verify` has no
credentials by design.

**An empty store passes.** `null` means the ledger holds nothing, which is CI's
store exactly. Failing on it would make this red in the environment that runs it
most, which is how a check stops being read. A store with no bars is not a stale
store.

## Two things running it found

**The `null`-to-`0` coercion, on the one endpoint where it is worst.**
`CLAUDE.md` records that `fast-json-stringify` coerces a `null` under a bare
`"number"` to **`0`**. Here `null` means _we cannot tell_ and `0` means
_perfectly current_ — so the wrong schema would make an empty store report as a
healthy one **inside the diagnostic built to catch exactly that**. The schema
declares `["number", "null"]` and a test asserts it; breaking it produces
`expected +0 to be null`.

**A covered range does not have to end on a session.** Run against the real
ledger, the daily store reported `newestSession: "2026-09-07"` — **Labor Day**, a
session no store can hold. `sessionsBehind` was unaffected and is unaffected in
general (there are no sessions between a closed day and the one before it, which
is now itself a test), but a diagnostic naming a day the market did not trade
invites the doubt it exists to remove. It now snaps to the last session traded.

## Verified

- `pnpm verify` green, including the new step
- 15 unit tests on the arithmetic, 3 integration tests on the route
- **Run against a real database**, which is the one part `index.ts`'s wiring had
  no coverage for: it reported this machine's store as 4 sessions behind on both
  timeframes, which is true

## What is NOT built, and is specified rather than assumed

Two of the four safeguards agreed are not here, and the first is blocked on this
one rather than deferred by choice.

### 2.8.13 — staleness as a visible product state

**Depends on this task**, because the UI cannot render a figure the backend does
not compute. Now it does.

The work: the identity block says _"4 sessions behind"_ rather than leaving a
reader to compare a date against a calendar they do not have; the status strip
carries the same fact for the store as a whole. It is `PRODUCT_SPEC.md` §36 and
invariant 5 applied to data age — **a stale store becomes a product state rather
than a silently wrong number**.

It is genuinely story-sized rather than a copy change: it owes the design canvas
(ADR 0026), the four tests of the bar, a decision about what counts as stale
_on screen_ (the deployed check's two-session ceiling is an alerting threshold
and is not obviously the right thing to show a person), and the
`FRONTEND-STATE.md` §7 question of which live region owns the sentence.

### 2.8.14 — make the deferred-findings list executable

`CLAUDE.md`'s _What `pnpm verify` does not cover_ is a prose list whose
re-measure commands run only when somebody reads them. **This task is that
list's own failure mode**: §8.18 wrote a condition, nobody was watching for it,
and it fired in front of a user.

Not every entry is mechanisable — several are "delete X and confirm Y fails",
which is a break-verification a human runs. The work is to **separate the ones
that are** (greps, file-existence, `@media` absence, the fixture-leak checks)
into a script, and to give every remaining entry an owner rather than only a
condition.

## Notes

**What none of this makes impossible.** A backfill that runs, succeeds, and
writes a ledger row for data the vendor returned wrongly still passes every
check here — the ledger records what was asked for and answered, not whether the
answer was true. That is `bars:check`'s thinness half and the vendor's own
correctness, and it is a different problem from this one.

**The ceiling is a judgement and will be wrong eventually.** Two sessions
absorbs one missed night. If the schedule ever moves, or a second market is
added, it is a number to re-take rather than inherit.
