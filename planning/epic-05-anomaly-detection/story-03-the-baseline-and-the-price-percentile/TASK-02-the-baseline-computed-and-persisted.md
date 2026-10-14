# Task 5.3.2 — The Baseline, Computed & Persisted

**Status:** Not started
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

---

## What was done — 2026-10-14

<!-- written at completion -->
