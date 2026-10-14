# Task 5.3.2 — The Baseline, Computed & Persisted

**Status:** Complete — 2026-10-14 — the pass runs over the real store in **11.78 s**, not the 3.5 minutes this story was built around, because **516 index scans over a correlated heap is the bandwidth regime** and this task file argued the opposite. The split guard refused **5 of 516**, and four of the five sit on exact split factors
**Story:** [5.3 The Baseline, & the Price Percentile](STORY.md)
**Depends on:** 5.3.1

## Objective

**A baseline overwritten in place is not replayable**, and a baseline held only
in memory is overwritten in place by definition — so AC 2's _addressable as-of a
session_ forces the session into the storage **key**.

## What the user can see when this lands

**Nothing.** Task 5.3.3 draws the percentile.

## Work

- **A nightly runner, and it is a COPY rather than a new pattern.**
  `.github/workflows/backfill.yml` already carries two crons and
  `timeout-minutes: 330`, authenticating to the deployed store as
  `marketpulse-github-deploy`. The story's AC 1 note that _an in-process
  scheduler is a new pattern_ is **narrowly false** — `market-gateway.ts` runs a
  `setInterval` keepalive — and the accurate sentence is that **no timer in this
  process does database work, or work longer than a tick**, which is what
  carries the argument.
  - **It belongs in `backfill.yml` after the fill, not in `deploy.yml`.** AC 5
    ends the window at _the last session the backfill has completed_, which is a
    **data dependency on the fill**, not on a deploy. A cron of its own would
    race it; `deploy.yml`'s three sequenced steps are all latency-bounded and
    idempotent and a multi-minute read is neither.
  - **Why not in-process**, recorded rather than assumed: the container envelope
    is **0.25 vCPU / 0.5 GiB**, so the pass must stream; row deserialisation
    runs on the **same single thread** as `publishObservations` (~16×/min) and
    the deliberately synchronous join; an OOM or a long stall kills **the only
    replica** (`minReplicas: 1`, `Single` revision mode), taking the Alpaca
    socket and `live-bar-writer` with it and holing `market_bars`; it holds one
    of `POOL_MAX = 10` of **35 user connections** for minutes; and a deploy
    restarts it mid-pass with no record that it failed.
  - **Reversal trigger, a condition:** _the first reader that must score a
    session the nightly runner has not yet written_.
- **A table keyed on `(security_id, as_of_session)`**, additive, a catalogue
  write — `0012` is the precedent at **5.324 ms against a held lock**. **No
  `ALTER TABLE` on `market_bars` or `securities`**, ever, for ADR 0042's reason.
  - **It carries TWO sessions**: the one it was computed **for** (the window's
    end — the coordinate a replay keys on) and the instant it was computed
    **at**. The window-end column is named in the `observed_at` family
    **deliberately diverging from ADR 0042's decision 4**, because a window end
    **is** a market fact — it names a session of market data — and that naming is
    what makes the table **covered by Epic 13's temporal plugin** rather than
    needing an explicit clock. **No default on that column**, for `0002`'s
    decision 3 reason.
  - **Declared derived and recomputable**, in the ADR and in `schema.ts`'s
    comment, with the recompute command named — or Epic 13 will treat it as
    primary and a later story will refuse to drop it.
- **The read side copies `last-closes-cache.ts` and REPAIRS its recorded
  defect.** Loaded at startup off the hot path, refreshed on a **condition**
  rather than a schedule, a failed refresh never empties it — and **memoised on
  the `as_of_session` the row itself carries, never on the argument asked
  about**. That is the `loadedFor` defect, and a persisted table makes the
  repair free because the stored row **is** the session it is for.
- **The query, and the regime it must stay in.** Every predicate a Kysely
  builder predicate, no `sql` fragment, `feed = 'sip'` **by name** (never
  `SERVED_TAPE_ORDER`), and `window.end` taken from **`bar_coverage`'s covered
  end** rather than `lastCompletedSession(now)` — those two disagree between the
  bell and the nightly run, and the disagreement is the `loadedFor` defect one
  surface over.
  - **One ordered pass with the arithmetic in SQL, not 516 index scans.**
    Measured cold: ~538 blocks a security, **~45 rows a block**, so the heap is
    correlated — but 516 separate scans at the **120 provisioned IOPS** is the
    regime that turns ~3.5 minutes into tens of minutes. Money is `numeric` and
    aggregates belong in SQL, which points the same way.
  - **What `distinct on` would silently do**, recorded because it is the first
    thing a copier reaches for: without a tie-break the surviving row per instant
    is **arbitrary**, mixing consolidated and single-venue closes inside one
    series; even with a tape order it admits every **IEX-only** minute, so the
    baseline's tails move with **the hour it was built**; it removes the
    index-only option and adds a sort over millions of rows; and
    `distinct on (observed_at)` **collapses across securities**, returning one
    row per minute for the entire market — a well-formed answer that is 1/516th
    of the data.
- **What is stored per security.** **101 breakpoints rather than raw samples** —
  417 KB over 516 securities at `Float64`, about 2× `currentMarketState` —
  because raw magnitudes are 19 MB and buy exactness nothing can print. The
  story's `~84 KB` is ~21 breakpoints, a vigintile grid, which **cannot express
  a 99th percentile at all**, which is the single reason pooling was chosen.
- **`n` is COUNTED by the producer, never computed from a constant** — the
  story's `78 × 60 = 4,680` is wrong twice over: 78 grid anchors yield **77**
  increments (4,620), an early close yields **41**, and median stored coverage
  is **82.8%** so grid pairs are routinely absent. The test is
  `n === Σ(anchors(session) − 1)` with **one early-close session in the
  fixture**.
- **The split guard from Task 5.3.1**, implemented: a session-boundary
  discontinuity above the stated ceiling **refuses that security's percentile**.
- **No sample may cross a session boundary.** An overnight gap is the fattest
  "five-minute return" in any corpus, and a naive `lag(close, 5)` produces
  exactly that.

## Done when

1. The runner is a `backfill.yml` job ordered **after** the fill, with its
   mechanism in `apps/backend/src/`, a thin `scripts/` wrapper, and a pnpm
   script checked against `pnpm help -a`.
2. The table is keyed on `(security_id, as_of_session)`, carries **both**
   sessions, has **no default** on the window-end column, and is declared derived
   in `schema.ts` with its recompute command named.
3. The read side memoises on **the session the row carries**, and a database
   test drives the `loadedFor` case that defeated the precedent.
4. `n` is counted, with an early-close session in the fixture, and **no sample
   crosses a session boundary** — asserted.
5. A **database test seeds both tapes** for the same minute with grossly
   different closes and asserts the `sip`-only answer. **This is the only test
   that can catch a dropped `feed` predicate**, because no machine here holds an
   `iex` row.
6. The non-overlapping grid is asserted by **multiplicity** — an extreme close
   appears **once**, not five times — not by a count, because an overlapping grid
   gives a more plausible `n` and nearly the same breakpoints.
7. The split guard refuses on a seeded 4:1 discontinuity.
8. `pnpm verify` and `pnpm test:database` green.

## Amended by Task 5.3.1 — 2026-10-14: you also own a `/diagnostics/baseline-cost` route, because no local tool can reach the deployed store

**The two commands AC 10 called for were run and could not connect.** This
laptop's network **refuses outbound 5432** — a refusal, not the timeout
`HOSTING.md` warns about for a stale firewall rule — while the deployed backend
reads the same server perfectly. `HOSTING.md`'s operator path has a precondition
nobody wrote down, and it is not satisfiable here.

**So the owner chose, on 2026-10-14, to have the replica measure itself.** AC 1's
_not in a route_ is ruled to govern **computing the baseline for a reader**, not
measuring it.

**What the route does, and what it must not do:**

- `GET /diagnostics/baseline-cost` runs **`EXPLAIN (ANALYZE, BUFFERS)` on the
  same read this task builds** — one security, the real predicate — and returns
  the **plan node type**, the `shared hit`/`read` block counts, the row count and
  the elapsed time. **The plan node type is the most valuable field**: locally
  the planner under-estimates this read by **212×** (`rows=114` against 24,142
  actual), and whether the deployed planner picks `Index Scan` or `Seq Scan` is
  the difference between **~3.5 minutes** and **tens of minutes** for the pass.
- It also returns the **two-tape counts** — `count(*) filter (where feed = …)`
  over the window — which is **index-only, no heap touched**, and is the one
  measurement no machine outside Azure can take: every developer's store holds
  **zero `iex` rows**.
- **It never runs the pass.** An `EXPLAIN` of one security and two counts, not a
  baseline computation — otherwise AC 1's refusal of a route would be real
  rather than ruled around.
- **It declares a response schema with `500: apiErrorSchema`**, like every route,
  and **leaks no internal detail**: no connection string, no server version
  beyond what `/health` already gives, and no raw plan text if that text would
  carry a path or a credential.
- **It is bounded.** The freshness route's own precedent is that it is
  deliberately unbounded _because its answer is about the whole store_; this one
  is about one security and must say which, so the symbol is a parameter with a
  default and the work is O(one security).

**And the caveat that travels with whatever the tape counts return:** the live
bar writer started **2026-09-23**, so a 90-day window today exposes only ~15 of
~62 sessions. Any inflation figure is **~25% of steady state** and must be
recorded as a dated, partially-exposed measurement rather than as ADR 0035's
+69% projection confirmed or refuted.

---

## What was done — 2026-10-14

<!-- written at completion -->

## What was done — 2026-10-14

### It runs, over the real store

```
return baselines for 2026-09-11 — 60 sessions, 516 tracked securities
window 2026-06-17T13:30:00.000Z … 2026-09-11T20:00:00.000Z
measured 511, refused 5, no samples 0 (no row written)
samples 2193087 total, 4292 mean n
20.67 s first run; 11.78 s and 11.73 s warm
```

**`min(sample_count) = 737`, `max = 4,620`** — which confirms Gate 1 decision
2's per-security variation **by measurement** rather than by derivation: the
nominal 4,620 is a ceiling almost nobody reaches, and the floor is a sixth of
it. AC 3's counted `n` and AC 6's refusal floor are doing real work.

### The cost finding, and it contradicts this task file

**This file said _one ordered pass with the arithmetic in SQL, not 516 index
scans_, and that was an argument rather than a measurement — with its own
evidence pointing the other way.** The same paragraph records **~45 rows a
block**, i.e. a well-correlated heap, so a per-security range scan reads ~538
**adjacent** blocks: that is the **bandwidth** regime, not the 120-IOPS regime,
which prices _uncorrelated_ fetches. Built as 516 index scans with the
arithmetic in Node, the whole pass is **11.78 s warm, 20.67 s cold** on a store
of 48.8 M bars. ADR 0044 carries a dated amendment with the measurement.

**And the first implementation was three times slower for a reason the
`EXPLAIN` had to say out loud.** Reached through
`innerJoin("securities") … where("securities.symbol", …)` the top plan node is a
**`Sort` over 23,400 rows, 516 times a pass**, because `security_id` is not a
constant to the planner until the join has produced one. Keyed on the row id the
pass already holds, it is an `Index Scan` and nothing else: **20.67 s → 11.78 s**.
A code comment claiming the index supplied the order for free was deleted and
replaced by the measurement.

### The split guard — argued, then validated

`SPLIT_DISCONTINUITY_RATIO = 0.6`, applied to the overnight ratio and **its
reciprocal**, because the bound has to be **multiplicatively symmetric**: a 1:2
reverse split is `+100%`, which no percentage ceiling below 100 can separate
from a genuine doubling. It must catch 2:1 (`0.5`) and admit the largest
ordinary overnight gap in a universe of S&P constituents (±20–35% on earnings);
`0.6` sits between with headroom both ways.

**It refused 5 of 516 — about 1% — and four of the five sit on exact split
factors**, measured from the store afterwards rather than assumed:

| Symbol | Overnight ratio | What it is                                               |
| ------ | --------------- | -------------------------------------------------------- |
| `CRWD` | **0.2501**      | 4:1, to four decimal places                              |
| `APH`  | **0.5017**      | 2:1                                                      |
| `MNST` | **0.5084**      | 2:1                                                      |
| `DD`   | **3.0639**      | a **1:3 reverse** split                                  |
| `MRNA` | **1.8406**      | a reverse split with an ~8% move, **or a genuine event** |

**Two of the five are above 1.0**, which is the empirical case for the
reciprocal: a `±40%` bound would have caught the forward splits and missed both
reverse ones. `MRNA` is the ambiguous one and is exactly what the recorded
reversal trigger is for — _the first refusal traced to a market move rather than
a corporate action_, at which point the guard needs **a second signal, not a
wider number**.

**And it quantifies `PROVIDER.md` §3.6's claim** that a split inside the window
is _"likely, not hypothetical, at any realistic history depth"_: **five in 60
sessions across 516 names**, measured.

### The diagnostics route answers, cold

```json
{
  "symbol": "NVDA",
  "planNodeType": "Index Scan",
  "scanNodeType": "Index Scan",
  "planRows": 105,
  "actualRows": 23400,
  "sharedHitBlocks": 68,
  "sharedReadBlocks": 581,
  "elapsedMs": 20.2,
  "sipRows": 23400,
  "iexRows": 0
}
```

**581 blocks read from disk** corroborates the 538 measured independently on a
different security and window. **`105` against `23,400` is a 223× planner
under-estimate**, corroborating the 212× recorded from another window — so that
misestimate is a property of this query shape rather than of one sample, and it
is the thing that could flip the deployed planner to a sequential scan. `iexRows:
0` is the local store confirming it has never held a two-tape minute.

### Seven things that turned out to be false, five of them in my own instructions

1. **My brief's column-naming instruction was self-contradictory** — it asked for
   a key named `as_of_session` _and_ for that column to be _"named in the
   `observed_at` family"_. `migrations/README.md` §2 is explicit that
   `observed_at` is a **reserved name, not a family**: the plugin's predicate is
   literally `where "observed_at" <= $2`, so anything else _"is a table the seam
   cannot cover"_. Named `observed_at`, which is what ADR 0044's stated purpose
   requires; `asOfSession` survives as domain vocabulary.
2. **The ordered-pass instruction**, above.
3. **A `` word boundary was defeated by a FILENAME.**
   `one-home-for-the-live-change`'s barrel exemption requires
   `!/\breturn\b/.test(file.text)`; `\b` treats the hyphen in
   `./return-baseline.js` as a word boundary, so **merely adding a module named
   for a return baseline** made `packages/shared/src/index.ts` — the exemption's
   one intended beneficiary — look like a file with a statement body, and the run
   went red on a correct tree. Narrowed to `/\breturn(?=[\s;({])/u`, which is
   the clause's actual intent, with the existing break re-proved red.
4. **`stored-sources-only-through-the-merge` refused the obvious
   implementation, correctly.** `bar_coverage` has exactly one querier, and that
   premise is what lets the check scope its grep to one file. The store's own
   `selectFrom("bar_coverage")` was a second. Repaired by adding
   `readCoveredEnd(timeframe)` to the repository — a new question is a new
   function — rather than by widening the check.
5. **`migrate.database.test.ts` refused `sample_count integer`**, because
   `README.md` §4 says a count is a `bigint` and that is enforced on every
   `_count` column.
6. **A database test passed for the wrong reason first**: a two-element
   breakpoint array was refused by the breakpoint-count check before the
   one-answer check could fire. Now `array_fill(1.0::double precision,
array[101])`, with the trap written down beside it.
7. **`pnpm help -a` lists no `baselines`**, and the detection was validated
   against a known built-in (`clean`) in the same run rather than trusted.

### Deliberate scope decisions

- **AC 6's minimum sample is NOT implemented here.** `sample_count` is stored;
  which `n` is too small to print is **presentation policy** and belongs to
  5.3.3, which draws the figure. The migration carries `0003`'s
  drop-check/add-check widening shape for the day a second refusal kind arrives.
- **A security with no grid pairs gets no row at all**, because _the pass has not
  reached this security_ and _the pass reached it and will not answer_ are
  different facts and only the second is safe to stop retrying. **On CI's bare
  store that is every security, for ever.**
- **The cache's floor is 15 minutes rather than the precedent's one**, because
  the `loadedFor` repair makes the condition stay true while tonight's
  generation is unwritten. A baseline appears once a night; a quarter hour is
  unobservable and it bounds a weekend at four small reads an hour.
- **No new `pnpm invariants` check, so no break is owed.** The session-count
  conjunct is Task 5.3.5's, per Gate 1's false premise 6 — and that check is
  **correctly silent** on this lookback, which is session-scaled through the
  calendar with no `getTime()` and no minute factor anywhere.

### Gates

- `pnpm verify` — **exit 0** at load 3.54, `58 invariants hold.`, **3,113 tests**.
- `pnpm test:database` — **8 files, 259 tests**.
- `pnpm migrate` + `pnpm baselines` end-to-end against the real local store, and
  `GET /diagnostics/baseline-cost` answering from the running pair.
- `pnpm break the-proxies-do-their-own-arithmetic` re-proved red after the regex
  narrowing.

## For a stakeholder — a status report, 2026-10-14

**The baseline exists and it is far cheaper than the story assumed.** Computing
sixty sessions of five-minute return history for all 516 securities takes
**twelve seconds**, not the four-to-thirteen minutes this story was planned
around. The estimate was arithmetic over the wrong kind of read; the measurement
is of the real one.

**The split guard works, and we now know it was needed.** Five securities in the
current window carry price breaks that are not market moves — and four of them
land on exact split ratios (a four-for-one, two two-for-ones, and a one-for-three
reverse). Without the guard, each of those would have produced a confident,
permanently wrong "most unusual move in this security's history" for sixty
trading days. That is no longer hypothetical: it is five names, today, measured.
The fifth is ambiguous and is flagged as such rather than assumed.

Five of the seven things that turned out to be wrong were **in my own
instructions** to the implementer, including one where simply adding a file whose
name contains the word "return" broke an unrelated build check, because a regular
expression treated a hyphen as a word boundary. All are corrected and recorded.

**What a reader can see: still nothing.** The next task draws the percentile.
