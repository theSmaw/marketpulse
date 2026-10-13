# 0042 — Membership is a history, and it starts the day somebody writes it

**Status:** Accepted
**Date:** 2026-10-13
**Story:** [5.1 The Decisions, the Adjustment, & `Relative performance` Drawn](../../planning/epic-05-anomaly-detection/story-01-the-decisions-the-adjustment-and-relative-performance/STORY.md), Task 5.1.5

## Context

`CLAUDE.md`'s **invariant 4** promises that future-information leakage is
_structurally impossible_ in replay. Since 2026-10-12 it has carried a dated
qualification naming the one place that is not met: **an aggregate over the
tracked universe**. Nothing in a bar's own timestamp is the problem — the problem
is **membership**. `currentMarketState` and `trackedTickers()` filter on
`status = 'active'` against the universe **as it stands now**, and the store
recorded no point-in-time membership at all.

So a replayed breadth count, sector mean or anomaly score would compute over
**today's** roster while claiming to describe a past session. `UNIVERSE.md`
§12.2's rule is that a computation over the market we track _now_ filters on
`status` and a read of something we _stored_ does not; **a replayed aggregate is
the second kind and would behave like the first.**

**This is dated rather than hypothetical.** Task 2.3.9 untracked `PSKY` and `WBD`
on 2026-10-12 — the vendor had never heard of either — taking the tracked set
from 518 to 516 and the equity population from 503 to 501. A replay of any
session before that date must count 503 equities and will count 501 if it filters
on `status`. That is true of the store today, and for a **ranked list of scored
securities** it is worse than an off-by-two: it can show a security in a position
implying it was the most unusual thing in a market it was not part of.

And the data to fix it **cannot be reconstructed from anything this product
holds**. It can only be written from the day somebody starts writing it. The cost
of deferring is not effort; it is history that is never recoverable.

## Decision

**Membership is recorded as an append-only history, one row per transition, and
it begins on the day the table was written.**

`security_memberships` — migration `0012`, metadata-only at deploy time —
carries `security_id` (a real foreign key), `status`, `effective_from` and
`recorded_at`. `pnpm universe` writes it inside the transaction it already runs.

**Four decisions inside that one, each with its alternative.**

**A history, not `tracked_from` / `tracked_to` on `securities`.** Two columns
hold one interval, and one is not enough: `untrackAbsent` flips a re-added symbol
from `untracked` back to `active` **on its original `id`** (produced against a
real database, `UNIVERSE.md` §12.3), so the shape the fact actually has is a
sequence of intervals and two columns would have to lose the first or grow an
array. The lock profile is the second reason — `ALTER TABLE securities ADD
COLUMN` takes `ACCESS EXCLUSIVE` on the one table every route reads and every
`insert into market_bars` touches, and that writer runs once a minute for six and
a half hours a day **inside the deploy window**.

**The writer is a STATE DIFF against the history, not the transitions a run
performed.** The obvious implementation — write what this run changed, from the
`before` snapshot and `untrackAbsent`'s return — **would have shipped an empty
table**, because a run over an unchanged universe changes nothing and none of the
existing securities would ever have received an opening interval. A diff produces
the opening intervals, is self-healing, and makes the transition feed redundant.
Measured on a populated store: the first run after the migration wrote **518
rows** (516 `active`, 2 `untracked`), the second wrote **nothing**.

**`effective_from` has NO default and carries the curated file's own date.** A
`default now()` is the exact leak `0002`'s decision 3 forbids: it turns the
column a replay keys on into a record of when somebody ran a script, invisibly,
because every row looks plausible. The instant comes from the file's
`checkedOn` rather than the transaction clock, because membership is a fact about
the **list** and the deploy that picks an edit up is our latency.
**Reversal trigger:** the first universe edit that changes a security's `status`
without moving `profile.checkedOn`.

**The column is deliberately NOT named `observed_at`.** That name is reserved for
_when the thing was true in the market_ and is what a temporal plugin filters on;
a membership change is a fact about **us** (`UNIVERSE.md` §3), so `observed_at`
here would claim a market event that never happened. **The cost is real and is
Epic 13's**: a plugin filtering generically on `observed_at` does not cover this
table, so the membership read takes the replay clock **explicitly**.

## Consequences

**The history begins at 2026-10-12 and says nothing whatever about any earlier
session.** A replay of an earlier date must **refuse** — the universe basis is
unknown for that date — and must not fall back to today's roster, which is the
exact failure this table exists to remove. **A read that returns no rows for a
date is a refusal, never an empty set to filter on.** Written into Epic 13's own
`EPIC.md`.

**Nothing reads it yet**, so this ADR records a decision whose payoff is eight
epics away. That is the point: the alternative was to decide it then, with no
data to decide it from.

**No index beyond the primary key**, and no `unique (security_id,
effective_from)`. The first is `README.md`'s rule — an index chosen before there
is a query to serve is a guess with a write cost, and the table is hundreds of
rows; the condition for adding one is the first replayed aggregate that reads it
at a cadence, with the query written beside it. The second is a real decision
rather than a deferral: two membership changes for one security sharing a
`checkedOn` date are both legitimate and the constraint would fail the **deploy**,
on `pnpm universe`. Rows at an equal `effective_from` are ordered by `id`.

**The foreign key was taken rather than declined.** Three tables already carry
the real thing and `migrations/README.md` §1 fixes the column name, so a bare
`security_id` would be the first column in this schema that _looks_ like a
foreign key and is not. The consequence is load-bearing and surprising the first
time it fires: once a security has a membership row, `delete from securities` for
it is **refused**. Nothing in this repository deletes a security, so this makes
an already-refused operation structurally impossible.

**What a green check certifies.** `pnpm test:database` proves the shape, the
absent default, the key, and the full untrack-and-re-add cycle through
`loadUniverse()`. It does **not** prove that any replay honours the history, that
the opening intervals are correct about dates before them — they are not, and say
so — or that the lock profile holds on the deployed tier. The lock rehearsal was
performed on a developer's populated store: the migration's statement shape was
granted immediately at **5.324 ms** against an open transaction holding
`ROW SHARE` on `securities`, with an ordinary read behind it at **1.049 ms**.
Task 3.7.6's figures for an `ACCESS EXCLUSIVE` migration on `market_bars` were
**18.16 s** and **16.16 s**.

## Alternatives rejected

**State the universe basis on screen under replay** — _"counted over the 516
securities tracked today"_ — which is honest and costs nothing. Rejected because
it makes every replayed aggregate permanently wrong-but-labelled, and the window
to record the data was closing every day it was not recorded.

**Refuse the aggregate regions under replay entirely.** Rejected for the same
reason, and because it deletes the signature capability's best demonstration.

**Write the history in Epic 13, where it is read.** Rejected because by then the
answer for every session between 2026-10-13 and that date would be unrecoverable.
