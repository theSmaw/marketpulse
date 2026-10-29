# Task 5.7.1 — Epic 5's sitting protocol, the drawable pairs, and the dry run before the bell

**Status:** **Complete — 2026-10-29. The most perishable item in the sitting is NOT the score — it is the open burst, which is a stated reversal condition and is gone ten minutes after the bell.** The pass now names the drawable pairs (cap 20; the deployed four are `NVDA bucket 31`, `AAPL bucket 0`, `AAPL bucket 11`, `ERIE bucket 77`). The shut-market dry run certified the **loop** as well as the wiring, which Epic 4's note says a shut-market run cannot do.
**Story:** [5.7 The Rehearsal, the Sweep, & Epic 5's Close](STORY.md)
**Depends on:** —

## Objective

**Six rehearsal rows are owed and the bell is at 21:30 the owner's time.** This
task exists to make the sitting possible rather than to take it: the protocol,
the instrument proved with the market shut, and the one change in the product
that decides whether row 5.5's figure is findable at all.

`THE-SITTING.md` (Epic 4's, `planning/epic-04-market-overview/THE-SITTING.md`)
is the template and it works. Two things from it are load-bearing. It is ordered
by **what expires soonest and what is cheapest**, not by story number. And its
**Step 0 freezes merges** — a deploy inside the session costs ~553 s and
destroys the evidence for anything being watched, so everything else in this
story lands before the bell or after the chair.

## What the user can see when this lands

**Nothing.** It is paid off by Task 5.7.7, which is the sitting itself and the
only task in this story a person can do.

## Work

- **Write `THE-SITTING-5.md`** in this story's directory, ordered by what
  expires soonest. Row **5.6** goes first: it is the only one of the six a
  sitting can clear on an ordinary laptop, because the excess factor needs only
  stored daily closes. Row **5.3** needs the owner with a public five-minute
  chart and a calculator, so it is budgeted rather than discovered in the chair.
  Rows **5.1, 5.2 and 5.4** are one deployed page between them.
- **Carry the four judgements AC 3 names** and 5.6's three, each as a question a
  person can answer in a sentence — not as a checklist of surfaces.
- **State which refusal the deployed reader actually meets.** `too-few-sessions`
  at 99.990% of buckets, **not** `no-same-tape-baseline`, which is the permanent
  state of CI and every laptop and reaches no reader of the deployment. Two
  documents called the second one the common case for a day; the protocol must
  not repeat it.
- **Take the drawable-pairs print** (approved at Gate 1). The nightly pass
  prints counts, so nothing in the product can answer _which four_ `(symbol,
bucket)` pairs draw — and at 0.010% a reader cannot find one by browsing. The
  tally site is `apps/backend/src/compute-baselines.ts:892` and the summary is
  `:431`; the symbol and the bucket are both in scope there. Print the pairs,
  bounded, with its own test.
- **Dry-run the instrument with the market shut**, as Task 4.9.1 did, and record
  what a shut-market run can and cannot prove.

## Done when

1. `THE-SITTING-5.md` exists, ordered by expiry, naming the row order and the
   per-row questions, and stating the deployed refusal correctly.
2. The nightly pass prints the drawable `(symbol, bucket)` pairs, bounded, with
   a test, and the summary line is quoted verbatim in this task's record.
3. The instrument has been run with the market shut and what that proves is
   written down.

---

## What was done — 2026-10-29

### `THE-SITTING-5.md`, and the ordering is the finding

Written beside this file, 240 lines, ordered by what expires soonest. **The
ordering did not come out as planned.** The task was written expecting row 5.6 —
the composite score, the epic's headline — to go first, because it is the only
row clearable on an ordinary laptop. It is **second**.

**First is the OPEN BURST, and it is the only item in the whole evening that is
gone if it is missed.** Story 5.1 decision 3 pooled the percentile across all
times of day with its cost written down: the first minutes of a session are the
fattest-tailed bucket, so `Unusual activity` may be the 09:30 burst and nothing
else, every day. That is a **stated reversal condition** rather than an
impression — and it is observable only between 21:30 and roughly 21:40 the
owner's time. Everything else in the file is a _state_ and survives being taken
late; this is a _moment_. Nothing in the story said so, and ordering by expiry
rather than by story number is what surfaced it.

The file also fixes the two refusal sentences the right way round, which two
documents got wrong for a day: the deployed reader meets **`too-few-sessions`**
at 99.990% of buckets, and **`no-same-tape-baseline`** is the permanent state of
CI and every laptop and reaches **no reader of the deployment**.

### The drawable pairs — the pass now answers _which_

`apps/backend/src/compute-baselines.ts` gained a sixth volume summary line. At
the deployed shape of four drawable buckets, verbatim:

```
drawable volume buckets — NVDA bucket 31 (open+155m), AAPL bucket 0 (open+0m), AAPL bucket 11 (open+55m), ERIE bucket 77 (open+385m)
```

Over the cap, verbatim:

```
drawable volume buckets — NVDA bucket 0 (open+0m), … and 37 more
```

And CI's and every laptop's permanent state:

```
drawable volume buckets — none
```

Four properties that are decisions rather than implementation. **The count stays
exact and the list is a sample** — `buckets.measured` is incremented
unconditionally and the remainder is computed _from it_, so a cap that elides
nothing prints no remainder and the exact figure keeps one home. **The cap is
`DRAWABLE_PAIRS_NAMED = 20`**, because the count is not bounded by anything: it
was 4 for session 2026-10-20 and its ceiling is the whole grid at **39,928**,
which arrives on its own as `iex` depth accumulates — an uncapped list would one
day print tens of thousands of lines into a nightly log. **The sample is
first-`n` in universe order rather than a reservoir**, so two passes over the
same store name the same pairs. And **there is no wall-clock time**: the bucket
renders as its index plus minutes from the open (`open+155m`), because
`Intl.DateTimeFormat` and the market timezone identifier are confined by lint to
`packages/shared/src/market-time.ts` and a hand-rolled offset is precisely the
conversion that rule exists to prevent. The clock conversion is stated once, in
the protocol.

`comparableVolumeBaseline` is untouched — it remains the single narrowing both
the pass and the reader go through, so the pass cannot drift into a second answer
to _is this bucket printable_. The sample is **not stored**: the pass-write row
shape and `0015`'s partition constraints are unchanged.

### The dry run — and it proves MORE than Epic 4's note allows

`node scripts/sitting-frames.mjs all --minutes 1 --drain 15000`, against the
deployed pair at 22:49 EDT with the market shut. Verbatim:

```
  population: 518 securities — 4 index proxies, 11 sector benchmarks, 503 equities
  drain 1 at 22:50:52 EDT: 33 rows, 6 frames, wrapper true
  drain 2 at 22:51:07 EDT: 4 rows, 1 frames, wrapper true
  drain 3 at 22:51:22 EDT: 4 rows, 1 frames, wrapper true
  drain 4 at 22:51:37 EDT: 0 rows, 0 frames, wrapper true
  nothing: no bars frame carried a sentAt, so no minute was formed
```

**Epic 4's rule is that a shut-market rehearsal certifies the wiring and not the
loop**, because with no frames arriving one drain and all drains look identical —
which is how a rehearsal was once recorded clean against an instrument whose
every drain after the first returned nothing. **This run certifies the loop too**:
three successive drains each returned a non-zero count before the fourth returned
zero, and an instrument with the rebinding defect cannot produce that sequence.
One socket, `"ours": true`. The feed frame, verbatim, at 120 bytes and **1.6 a
minute** against a pre-repair median of 332:

```
{"type":"feed","version":1,"sentAt":"2026-10-29T02:49:27.612Z","feed":{"status":"live","feed":"iex","marketOpen":false}}
```

The pair's own pre-bell reading, which is the protocol's first step:

```
  ✓ backend   /health  0.0.0, up 309.5s
  ✓ frontend  /        document and 2 assets served together
  ✓ series    1981 bars for NVDA 1m/5 sessions, 9 sources (sip+iex) · 8189 bars for NVDA 1m/21 sessions, 31 sources (sip+iex)
  ✓ store     1m=current; 1d=current
  ✓ feed      market closed; provider=alpaca status=live observedAt=null
```

`status=live` with `observedAt=null` **is correct before the open**. The source
note read **one** tape (`sip`, 390 bars) because the backfill has run, so the
two-feed state is invisible now and invisible again after tonight's backfill —
recorded in the protocol as the one arm that must be re-read mid-session.

### A defect found in review, and it is silent by construction

The implementation inserted `describeDrawableBuckets` **between an existing
docblock and the function it documented**, so `describeSets` lost its docblock
and the new function wore it — two docblocks stacked above one declaration. It
**typechecks, lints, builds and formats clean**, and nothing in `pnpm verify`
can see it; it is the same shape as this repository's CSS-module class-name typo.
Found by reading the diff rather than the verdict line. Repaired by moving the
new function above the orphaned block; `describeSets` carries its own docblock
again.

### One correction to this story's own `STORY.md`

Its line 30 cited `UNIVERSE.md` **§5** for _an industry group has no benchmark
ETF_. §5 is _Where sector and industry come from_ and holds the **drift table**
AC 4 names — a different claim this same story sweeps. The rule is **§1**
(industry _"has no benchmark attached"_) and **§7** (_"ETF and therefore no
benchmark; it is a coverage rule, not a comparison rule"_). Corrected here rather
than at the close because **Task 5.7.3 rewrites the exit criterion from that
paragraph**, so the mis-citation would have propagated into the rewrite.

### Gates

```
pnpm build         exit 0
pnpm lint          exit 0  (eslint . --max-warnings 0, no output)
pnpm format:check  All matched files use Prettier code style!
pnpm --filter @marketpulse/backend test src/compute-baselines.test.ts
                   Test Files  1 passed (1)
                        Tests  6 passed (6)
```

No `Unhandled Errors` block; the test-file count is 1 and the figure is 6 tests
rather than skips, so the glob bit. `pnpm verify`, `pnpm e2e` and
`pnpm test:database` are deliberately **not** run here — AC 7 requires them once
on the final tree, and a reading taken on an intermediate tree is not a reading
of the thing being closed.

## For a stakeholder — a status report, 2026-10-29

This task does not change what anybody sees. It makes tonight's sitting possible,
and it answers one question the product could not answer before.

Epic 5 put six figures on screen and **not one of them has ever been watched by a
person against a real market**. Tonight is that sitting. This task wrote the
running order for it — and the useful surprise was that the order is not the
obvious one: the single most perishable thing in the evening is not the headline
score but the **first ten minutes after the bell**, because one of this epic's
own recorded decisions predicted that the unusual-activity list might be nothing
but the opening burst, every day, and that is the only window in which anybody
can tell.

The second thing is smaller and more concrete. One of the six figures — the
volume multiple — draws on **four** of 39,936 possible `(security, time of day)`
combinations, about one in ten thousand. The nightly job knew _how many_ but not
_which_, so a person had no way to go and look at one short of opening thousands
of pages. It now names them. That is the difference between a figure that is
waiting for more data and a figure nobody can ever check.

Also recorded: the measuring instrument was proved against the live deployment
before being relied on, and it turned out to prove slightly more than this
repository's own rules claim such a run can — which matters, because a previous
rehearsal was once recorded as clean by an instrument that was silently returning
nothing. And a small defect introduced during the work was caught by reading the
change rather than trusting the green checks, which would not have caught it.
