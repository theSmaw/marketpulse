# Task 2.8.13 — The ceiling that cannot be met, and the instrument that stayed silent

**Status:** In progress — 2026-10-12
**Story:** [2.8 Historical Bar Ingestion and Storage](STORY.md)
**Depends on:** 2.8.12

## Why this task exists, and why it is dated after its story closed

**Added 2026-10-12, from a standing red post-merge check.** Every `deploy` run
since 2026-10-08 has ended with `check-deployed` red, and the scheduled
`probe-deployed` with it. The owner's decision was to **investigate properly
rather than mute the gate**, and then to **repair it before finishing the story
that was in flight** — because a check that is red for a non-defect is how the
one instrument that sees what nothing else can gets ignored, which
`check-deployed.mjs`' own header argues at length.

Story 2.8 owns the ledger, the backfill and this check, which is why the task
is here rather than in the epic that found it. Epic 4 inherits only the
obligation that **it cannot close against a standing red post-merge check.**

## What the user can see when this lands

**Nothing on any screen.** What changes is that a red `Actions` page means
something again.

## The diagnosis, so none of it is re-derived

**The metric cannot be satisfied.** The deployed store is as complete as the
vendor can make it:

- `GET /diagnostics/freshness` at 2026-10-12T00:52Z — `lastCompletedSession
2026-10-09`; **both** timeframes `newestSession 2026-10-09`,
  **`sessionsBehind: 0`**; `stalestSessionsBehind` **4** (`1m`) and **3**
  (`1d`); 518 securities.
- The `1m` ledger histogram over all 518 rows is
  **`{"2026-10-05": 2, "2026-10-09": 516}`** — two rows, no tail. The two are
  **`WBD`** (107,605 bars) and **`PSKY`** (107,556).
- `marketDateAt(end − 1 ms)` = `2026-10-05`, and the sessions after it through
  `lastCompletedSession` are 06, 07, 08, 09 = **4**, which is exactly the
  reported figure.

**The 3-against-4 difference is request granularity rather than data.**
`alpaca-mapping.ts` sets `covered` from **the requested window**, not the span
of the bars — _"coverage says how far an answer reaches rather than whether it
is dense"_ — and the `1m` pass fetches one session per request while the `1d`
pass fetches a block. Same two securities, same last print, two numbers: a
reason in itself not to rest a gate on this value.

**They did not trade, and this is not thinness.** Three independent witnesses:
the vendor was asked every session and answered empty (`2 symbols with
nothing`, 2 × 4 sessions on `1m` and 2 × 3 on `1d`, accounting for every empty
answer in the run with nothing left over); the **IEX live writer** has not moved
them either, so both tapes are silent; and `LIVE-DATA.md` §7.6 measured **every
one of 518 symbols producing at least one bar, none sitting still all day**,
with the worst name at 2.1% of minutes rather than zero. `bar-completeness.ts`
already states the rule: _"A security with **zero** bars across five
consecutive sessions the backfill asked for is not thin — it has no prints at
all, which is what a delisting looks like from here."_

**It is not a backfill coverage hole.** The small "already held" counts are the
skip window over a ten-session range, not per security: the `1m` pass reported
`0 bars stored, 0 corrected, 764705 unchanged`. Every security was in every
request. And `CLAUDE.md`'s `writeBatch` warning does **not** reproduce — the
ledger not moving on an empty answer is deliberate and documented in
`backfill.ts`: _"It extends the ledger by nothing, so the next session on the
far side of it is disjoint by one and will be refused below."_

**What the gate actually reads.** `store-freshness.ts` takes the **minimum**,
over every `bar_coverage` row, of the market date the covered range reaches. It
**cannot** exclude a security the vendor answered empty for — `CoverageRow` is
`{ timeframe, covered }`, and it never reads `bar_count` or `bar_attempts`. So
**it reads _the market had nothing for this symbol_ as _we are behind on this
symbol_** — the two states `bar_attempts` exists to tell apart — and the figure
**grows by one every session, without bound.**

## Work

### 1. Keep the maximum as a report; gate on a figure that can be defended

- **`stalestSessionsBehind` stays on the wire exactly as it is.** It is a true
  number and the only one that can see a partial fill.
- **The deployed check prints it always, and NAMES the securities** — which the
  current body cannot do, and which cost the investigation a second endpoint.
- **The gate moves to the stalest security whose trailing gap is not explained
  by a recorded empty answer.** That needs the freshness read to see the attempt
  log for the trailing window — sparse, a few hundred rows — which keeps
  `store-freshness.ts`'s design property that it reads the ledger and **not**
  `market_bars`.

**The wire contract widens, and ADR-level care applies**: `sessionsBehind` and
`stalestSessionsBehind` are declared `["number","null"]` **specifically
because** `fast-json-stringify` coerces a `null` under `"number"` to `0`, which
on this endpoint turns _we cannot tell_ into _perfectly current_. Any added
field needs the same treatment, the `satisfies Record<keyof …>` guard, and
`T | null` rather than optional under `exactOptionalPropertyTypes`.

### 2. Filter `status` on the freshness path only

`listCoverage()` joins `bar_coverage` to `securities` with **no `where
status`**, and by `UNIVERSE.md` §12.2's rule this reader computes over **the
market we track now** and therefore should filter `active`. It buys nothing
today — all 518 rows are `active` — but it means **hand-editing `universe.ts`
would not clear the gate as the code stands**. The `/securities` path must keep
showing untracked rows and is not touched.

### 3. The instrument that stayed silent, repaired in the same change

**This is arguably the more important half.** `no-recent-bars` counts
**covered** sessions after the newest bar — and because the ledger stops
advancing on an empty answer, **`WBD` scores 0 at `1m` and 1 at `1d` against a
`STALE_SESSION_THRESHOLD` of 5.** The instrument built to say _this security
has stopped printing_ is silent on the clearest case this store has ever held,
while the gate built to say _the backfill stopped running_ says it loudly and
in the wrong words.

Same root cause, same data: an empty answer extends coverage by nothing, so
**both readers need the attempt log to tell _we asked and got nothing_ from _we
never asked_.**

### 4. Four false sentences, and one entry firing a second time

- **`check-deployed.mjs`'s `BARS.md §8.18` citation is false** — §8.18 is about
  the nightly job filling one timeframe of two and contains no discussion of the
  ceiling. The only record is the constant's own comment.
- **That comment is internally inconsistent**: its sizing argument is about
  **the schedule** (_"two absorbs a single missed night"_, an aggregate
  property) and its subject is **the worst security** (a market property). Each
  half is reasonable; the pairing is the defect.
- **The failure message is a misdiagnosis**: _"The nightly backfill has not run,
  or has not covered every security"_ — it has run eight consecutive times and
  covered all 518 in every session — followed by a dispatch that would spend
  metered quota to re-fetch **764,705 bars that are already `unchanged`**. It
  should offer _"or a security in the universe has stopped printing"_ and name
  the instrument that says so.
- **`docs/GAPS.md`'s tolerance entry is firing a second time, from the other
  end**: _"a tolerance sized for a transient absorbs a permanent offset of the
  same size, for ever, and nothing tells the two apart."_ Its own re-measure
  **cannot see this instance**, because `newestSession` is dead level with
  `lastCompletedSession` on every day of the outage. Dated amendment.
- **`UNIVERSE.md` §12.2's table has no row for `/diagnostics/freshness`**, which
  is a reader of the `status` predicate and does not filter.

### 5. The forward hazard, recorded rather than repaired

**If either symbol ever prints again**, `recordSeries`' contiguity check raises
`CoverageGapError`, the symbol is dropped into `blocked`, and it is
**permanently behind with nothing but a `coverage-gap` attempt row saying why** —
recoverable only by an explicit `--from/--to` dispatch. `backfill.ts`'s own
comment predicted it. It is the same question from the other end — what an empty
answer should do to the ledger — and may deserve an amendment beside ADR 0035.

### Boundaries

**The curation decision is not this task's.** Whether `WBD` and `PSKY` leave
the tracked universe is the owner's, pending `pnpm universe:check` against the
vendor's asset catalogue, and it changes the breadth and movers denominators on
the landing page. Nothing here edits `universe.ts`.

**Reversal trigger, a condition:** _the first time `/diagnostics/freshness`
reports a security behind the ceiling that **has** a bar inside the sessions it
is behind on_ — a lag that is ours rather than the market's. That is the state
the maximum was bought to catch, and the only condition under which excluding
empty-answered series could hide something.

## Done when

1. The gate fires on a figure a backfill can actually move, with
   `stalestSessionsBehind` still reported and the securities **named**
2. The freshness path filters `status`; `/securities` is unchanged
3. `no-recent-bars` finds `WBD` and `PSKY` — asserted against the real shape,
   not a furnished one
4. The four false sentences are corrected and the GAPS entry amended
5. Any check added owes a break, with the transcript of it passing wrongly
6. `pnpm verify` and `pnpm test:database` green, and the deployed check's new
   output quoted verbatim from a run against the real endpoint

---

## What was done — 2026-10-12

**Status: complete.** `BARS.md` §8.21 is the record; this section is what the
change consists of and what was found while making it.

### 1. Two figures on the wire, and the gate reads the second

`store-freshness.ts` now takes the attempt log beside the ledger and reports
five new fields per timeframe:

| Field                       | What it is                                                       |
| --------------------------- | ---------------------------------------------------------------- |
| `stalestSessionsBehind`     | **unchanged** — every trailing session, whatever the reason      |
| `stalestSecurities`         | which securities are at that figure, ten at most, alphabetically |
| `stalestSecurityCount`      | how many are, so a reader can tell a sample from the whole set   |
| `unexplainedSessionsBehind` | **the gate** — only sessions with no recorded empty answer       |
| `unexplainedSecurities`     | which securities are at that figure, capped the same way         |
| `unexplainedSecurityCount`  | and how many                                                     |

`CoverageRow` gained `symbol`, which is what makes any of the naming possible.
The explained set is keyed on `(symbol, timeframe, session)` and on `outcome ===
"ok"` only — `ok` in this log means _the vendor answered and left no bars_, and
a `timeout` is not an answer.

**The serialiser's trap was taken twice.** `unexplainedSessionsBehind` is
declared `["number","null"]` for `sessionsBehind`'s reason, and the two counts
are bare `"number"` because a count of zero is the true answer rather than an
absence. The timeframe entry also **gained a `satisfies Record<keyof …>` guard
of its own**: it was inline, so the existing guard covered the three top-level
keys and nothing inside the array — which is every field on this endpoint that
has ever needed the treatment. `json-schema.ts` says in as many words that the
guard does not reach into a nested object and that nothing forces it.

The ledger read is unchanged in cost: a few hundred rows plus a sparse table
that is empty when everything is well, and **not** `market_bars`.

### 2. `status` on the freshness path only

A second repository read, `listTrackedCoverage`, filtering `securities.status =
'active'`, sharing one query builder with `listCoverage` so the two cannot
select different columns. `/securities` keeps the unfiltered read.
`UNIVERSE.md` §12.2 has the row it was missing.

**Produced rather than observed, because there is no instance of it**: the test
had to set a security to a non-`active` status by hand — and found that
`delisted` is **not** a `SECURITY_STATUSES` member, so the check constraint
refuses it. `untracked` is the one that exists. That is `UNIVERSE.md` §15.3's
own decision arriving from the other side.

### 3. `no-recent-bars`, which could not fire

`trailingSessionsWithoutBars` now counts the covered sessions **and** the
empty-answered ones, deduplicated — a session can legitimately be both
(`BARS.md` §8.20.4's 61 `FDXF` rows), and counting it twice would invent a
silence.

Asserted in `bar-attempts.database.test.ts` against **the real shape**, read
back through the shipped repositories: one ledger row covering the five sessions
that produced bars, an `ok` attempt for each of the five that produced none, and
`lastBarAt` at the last session traded. Three tests — the finding fires on `WBD`
and `PSKY` with `sessionsSince: 5`; it stays silent on a security still sending
bars (the control, without which the first test is equally evidence that it now
fires on everything); and a `upstream-unavailable` run does **not** read as the
market's silence.

### 4. The four false sentences

All four corrected, as §8.21.3 lists them. Note what the repair of the third
one revealed: `reportDeployed` printed _"What failed is the AGE of the data
behind it"_ whenever both halves were up and the store probe failed — which is
wrong on the one run this change guarantees, where the deployed revision has no
`unexplainedSessionsBehind` and the gate **cannot be evaluated**. That now has
its own branch and its own paragraph, which is this file's own lesson about a
message naming the wrong subject arriving a third time.

### 5. What was found and not repaired

- **A trailing run of empty-answered sessions is reported as
  `listed-mid-window`** — _"the window opens before this security did"_ — because
  the default window is the ledger's span across the whole universe. The label
  is false for a trailing gap. `BARS.md` §8.21.5; it is §8.20.4's residue with a
  second instance, and telling the two ends apart needs a first-bar date the
  report does not carry.
- **The gate's own verdict logic has no test level.** `scripts/` has no runner,
  so `describeTimeframe`, the cap-and-count printing and the missing-field
  branch are exercised only by running the check. Added to `docs/GAPS.md`'s
  amended entry rather than left implicit, and all three were produced by hand
  against two real servers (below).
- **The forward hazard** — a symbol that prints again meets `CoverageGapError`
  — is recorded in §8.21.4 and unrepaired, as the brief directed.

### 6. What was run

`pnpm verify` green (54 invariants, 2,898 tests across three packages, no
`Unhandled Errors` block) and `pnpm test:database` green (6 files, 215 tests).

**Both breaks go red for the right reason**, performed by hand because
`break-verify.mjs` refuses on an uncommitted target:

- `a-failed-fetch-explains-a-gap` → `1 failed | 20 passed`, on
  _treats a FAILED attempt as no answer at all_.
- `the-silence-is-measured-over-covered-sessions-only` → `1 failed | 15 passed`,
  `AssertionError: expected [] to deeply equal [ 'PSKY', 'WBD' ]`.

A third defect was tried for the same reason — dropping `timeframe` from the
explained set's key, which is what somebody writes who has not read why the
attempt log is keyed on three columns — and it goes red too, on _does not let a
daily empty answer explain a minute gap_: `expected 4, received 0`.

**The deployed check was run against production and against two local pairs**,
and all four outputs are in the hand-off. Production is **red**, correctly: the
live revision predates the field the gate reads. The end state was produced on a
local backend pointed at a scratch database seeded with production's own shape —
518 ledger rows current through 2026-10-09 except `WBD` and `PSKY` through
2026-10-05, with `ok` attempts for the four sessions since — which reads:

```
  ✓ store  …/diagnostics/freshness  1m=4 behind (PSKY, WBD), 0 unexplained; 1d=4 behind (PSKY, WBD), 0 unexplained
```

and, with three of those attempt rows deleted so the sessions are genuinely
unasked:

```
  ✗ store  …  1m=4 behind (PSKY, WBD), 3 unexplained (WBD); 1d=4 behind (PSKY, WBD), 3 unexplained (WBD) — over the 2-session ceiling.
```

Both directions, on a real server, through the shipped read.
