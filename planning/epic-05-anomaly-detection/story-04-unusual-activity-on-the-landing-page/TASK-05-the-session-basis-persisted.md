# Task 5.4.5 — The session basis, persisted

**Status:** Complete — 2026-10-16 — out of hours `/` draws the last session's ranking from a nightly row; the migration is **9–14 ms** of catalogue work and the nightly pass's added cost is **below this machine's noise floor** (median 13.18 s against a 13.16 s control); it needed **two** tables rather than one, because a refused security gets no row and the footer still has to be honest; **`above_sample` is false on all 485 stored rows** where the live arm can reach `>99th`, which is an asymmetry worth knowing; and a measurement that read 458 where 5.4.4 recorded 491 was **proved to be the instrument** by a control, not the region
**Story:** [5.4 `Unusual activity` on the Landing Page](STORY.md)
**Depends on:** 5.4.4

## Objective

**The market is shut about 80% of the week, and a region blank in four of five
screenshots looks broken.** As written AC 12 was unsatisfiable: there is no
score table, and `trailing-window.ts` has no store-backed fill by Epic 5's own
Gate 1 decision 3 — so a restarted replica holds nothing, while a process that
was up at the bell would serve yesterday's 15:55→16:00 pair **for ever**,
because eviction is relative to `newest.bar.startsAt − retainMs` **inside
`record()`** and nothing arrives when the market is shut.

Gate 1 decision 2: persist the session's closing score nightly.

## What the user can see when this lands

**Out of hours `/` draws the last session's ranking, labelled with the session
it describes** rather than an empty region or a figure whose age depends on how
long the process has been up.

## Work

- **Migration `0014`, metadata-only at deploy time.** One row per security per
  session, keyed by the session it is **for** — ADR 0044's shape, which this
  epic has already proved. `observed_at` takes **no default**, because
  `default now()` silently turns the column replay keys on into the one that
  records when we wrote it. Measure it against the tier's **10 MiB/s** before
  writing it, and remember an `ALTER TABLE` takes `ACCESS EXCLUSIVE` whatever
  it costs, queueing every later request behind it.
- **Extend the nightly job rather than adding a second one.** It already reads
  60 sessions per security in **11.78 s warm / 20.67 s cold**, so the closing
  5-minute return is a by-product of a pass that is already running. It lands in
  `backfill.yml` after the fill, like the baseline.
- **The out-of-hours basis is `session`**, which is why this task dissolves the
  AC 3 ↔ AC 12 contradiction rather than trading it: `MeasuredQualifier`'s
  existing `session` member carries a date, so `describeMeasuredSet`'s second
  grammar renders the footer with **no third member and no widening**.
- **Two bases, one region, never both at once**, and the switch is read off the
  frame rather than off a clock — the screen must not grow a second clock, and
  `pnpm invariants` refuses one by name.
- **Never ship a held in-memory figure as a session score.** The two must be
  distinguishable on the wire, or a process with a stale window and a process
  with none draw the same thing for different reasons.

## Done when

1. `pnpm migrate` applies `0014` locally and in `pnpm test:database`, and its
   deployed cost is measured against the 120 s the deploy allows.
2. The nightly job writes the rows; the pass's total cost is **re-measured**
   rather than assumed to be unchanged.
3. Out of hours the region draws the last session's ranking with its session
   named, and in session it draws the observed basis — both asserted.
4. A fresh process with an empty trailing window and a store full of scores
   draws the **session** basis rather than nothing, asserted — this is the state
   every merge produces.
5. `pnpm verify`, `pnpm test:database` and `pnpm e2e` green.

## Shaped by Tasks 5.4.2–5.4.4 — 2026-10-16: the shape is settled, and `0013` is the pattern to mirror

**`0014` is the schema's SECOND derived table, and it must say so in three
places** — the migration, `schema.ts` and the ADR — exactly as `0013` does. Read
`0013_return_baselines.sql` §1 before writing a line: it states the cost of
omitting the label, which is that _"a later story that wants to change the
breakpoint grid, the lookback, the split ceiling or the sample rule would
believe it had to migrate the rows rather than delete and re-run them."_ The
same applies here to the row count and the ranking rule.

**Keyed by the session it is FOR**, not by when it was written —
[ADR 0044](../../../docs/adr/0044-a-derived-aggregate-is-computed-nightly-and-keyed-by-the-session-it-is-for.md)'s
shape, which this epic has already proved. `observed_at` takes **no default**,
because `default now()` silently turns the column replay keys on into the one
recording when we wrote it (`0002`'s decision 3).

**Metadata-only at deploy time, and measure it against 10 MiB/s before writing
it.** `deploy.yml` gives `pnpm migrate` a `timeout 120`, an `ALTER TABLE` takes
`ACCESS EXCLUSIVE` whatever it costs, and Postgres queues every later request
**behind a waiting exclusive one** — rehearsed at **18.16 s** behind one open
write transaction, with an ordinary chart read waiting **16.16 s** behind _that_
against a 0.09 s baseline. A new table is cheap; adding anything to
`market_bars` is not.

**What the row holds**, settled by what 5.4.2 ships and 5.4.4 draws: the
security, the session, the ordinal, `aboveSample`, the counted `sampleCount`,
the signed `percent` (needed for the **direction glyph** 5.4.3 ships — the
percentile is a magnitude, so the sign is not recoverable from the ordinal), the
two endpoint instants with their tape, and the generation it was ranked against.
A refused security gets **no row**, and the three population counts plus the
**five refusal counts** are stored for the session too — otherwise 5.4.4's
footer cannot be honest out of hours, and it is the same sentence either way.

**The basis switch is read off the frame, never a clock.** `MeasuredQualifier`'s
`session` member already carries a date and `describeMeasuredSet`'s second
grammar already renders it, so **no widening** — that is the whole reason Gate 1
chose persistence over a refusal. The screen must not grow a second clock;
`pnpm invariants` refuses one by name.

**Never ship a held in-memory figure as a session score.** The two must be
distinguishable on the wire, or a process with a stale trailing window and one
with none draw the same thing for different reasons. Note 5.4.2 gates on
`basis === "observed"` precisely so that the in-memory path **cannot** leak out
of hours — do not relax that gate; add the session path beside it.

**Extend the nightly job rather than adding a second one.** It already reads 60
sessions per security in **11.78 s warm / 20.67 s cold**, so the session's
closing figures are a by-product of a pass already running, and it lands in
`backfill.yml` after the fill like the baseline. **Re-measure the pass's total
afterwards rather than assuming it is unchanged** — the epic file's own `4–13
minutes` was a projection that was wrong by 20–66×.

**And this is the task that could fire ADR 0038's frame-grain trigger**, which
Task 5.4.2 recorded **unfired**. It stays unfired only while the session figure
is an **input read on the batch's cadence from a table** — like `lastCloses`. If
it ever becomes a figure the gateway withholds and refreshes on its own clock,
**the trigger fires and the ADR needs amending in the same change**.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-10-16

**Out of hours `/` draws the last completed session's ranking, labelled with the
session it describes** — verified on the real local store with the market shut
and `provider=none`, ten real rows out of `session_return_percentiles`.

### Five things this task corrected in its own brief

**1. It is the schema's second AND third derived table.** A refused security
gets **no row**, so a session where nothing was rankable has no rows at all —
and that is exactly the session whose footer must stay honest. The three
populations and five refusal counts therefore need their own per-session row:
`session_return_percentile_passes`. Both are labelled derived and recomputable
in the migration §1, in `schema.ts` and in ADR 0044's amendment.

**2. The generation is identified by the shared key, not copied.** The pass
ranks each closing move against the generation whose window **ends at the
session being scored**, so `(security_id, observed_at)` **is**
`return_baselines`' own key. A second `timestamptz` holding a copy of
`observed_at` would be one fact with two homes. `baseline_lookback_sessions` is
stored; the instant is not.

**3. A consequence nothing anticipated, and it is a genuine asymmetry.** Because
that window _contains_ the sample being ranked, **`above_sample` is `false` on
every stored row — measured, 0 of 485** — while the live arm can reach
`>99th percentile`. So **out of hours the region can never say `>99th`**, and
mid-session it can. The alternative — ranking against the previous night's
generation — costs a dependency on a generation that does not exist on a fresh
store, so **no rows at all for the first night**. The self-inclusive option was
taken and the difference written into `0014` §5 rather than left to be noticed.

**4. "The grammar already renders it, so no widening" is narrowly false.**
`MeasuredQualifier` is untouched at two members and the invariant holds it
there — but the shipped session grammar says `had a close-to-close move on
2026-10-15`, which is **`Market breadth`'s measurement and not this region's**.
These rows are a five-minute move into the close. Reusing breadth's phrase would
be **two measurements under one phrase**, which is the trap this repository has
already recorded for `band` and for the two fives. An optional closed union
`move` (`close-to-close` | `closing-span`) was added to `MeasuredSet`, with the
**words owned by `measured-set.ts` rather than by the caller** — still one
builder, still no new qualifier member.

**5. It is eight states and 54 cells, not seven and 42.**

### The drawn sentence, verbatim from the real page

Real store, real producer, market shut, read out of the live DOM at 1440×900:

```
Of the 501 companies we track, 500 had a measurable 5-minute move into the close on 2026-09-11 and 485 have a long enough history to rank. 10 have too short a baseline and 5 cross an unadjusted price break.
```

No age line, **correctly** — the local aggregate holds no observation. Rows
drawn: `1 D … ▼ 99th`, `2 KHC … ▲ 99th`, `3 MGM … ▼ 99th`, `4 MMM … ▲ 99th`,
`5 ADBE … ▼ 98th`. The empty session arm draws
`Nothing ranked while the market is shut.` beside
`Of the 501 companies we track, none had a measurable 5-minute move into the
close on 2026-10-14.`

### The migration's cost

`pnpm migrate` against the populated store (48,797,343 bars): **0.610 s** wall
for the whole command. Catalogue-only, re-measured four times in a throwaway
schema inside a rolled-back transaction on the same database:

| statement                                            | run 1    | run 2    | run 3    | run 4    |
| ---------------------------------------------------- | -------- | -------- | -------- | -------- |
| `create table session_return_percentiles` (incl. FK) | 8.379 ms | 6.911 ms | 5.590 ms | 6.168 ms |
| `create table session_return_percentile_passes`      | 5.395 ms | 4.349 ms | 4.754 ms | 3.366 ms |

**≈ 9–14 ms of SQL against `deploy.yml`'s `timeout 120`.** No `ALTER TABLE` on
`market_bars`, `securities` or `return_baselines`. The FK takes
`SHARE ROW EXCLUSIVE` on `securities`, which conflicts with neither a read's
`ACCESS SHARE` nor a child insert's `ROW SHARE`.

### The nightly pass, re-measured rather than assumed

- **With the ranking (n = 9):** 19.95, 16.93, 12.99, 14.50, 13.18, 13.06,
  13.48, 11.63, 11.82 s — **median 13.18, range 11.6–20.0**
- **Control, session scoring removed and rebuilt (n = 3):** 13.16, 12.44,
  13.31 s — **median 13.16**

**The added cost is below this machine's noise floor** — the second new-code
block was faster than the control block. Caveats: one laptop, warm store, blocks
rather than alternating samples, load 2.6–6.6 throughout. **The first control
attempt was discarded** and saying so is the point: `if (false && …)` broke the
narrowing, `tsc` failed, and the three runs used the previous `dist` — not a
control at all.

What the pass wrote, verbatim:

```
return baselines for 2026-09-11 — 60 sessions, 516 tracked securities
measured 511, refused 5, no samples 0 (no row written)
samples 2193087 total, 4292 mean n
closing ranking for 2026-09-11 — tracked 501, eligible 500, scored 485
```

### A measurement that disagreed with Task 5.4.4, and the CONTROL that settled it

The furnished instrument read **458** at 1440×900 where Task 5.4.4 recorded
**491**. That is the **instrument, not the region**, and it was proved rather
than assumed: with a minimal furnished frame the **whole grid row collapses
together** — `Sector performance`, `Movers` and `Market breadth` all measure 458
beside it — while the **reservation row reproduces 5.4.4's figures exactly** and
**the real page reproduces 491 / 491 / 458 / 458 / 491 / 491 exactly**. Eight
states × six pairs, `scrollHeight === clientHeight` in **all 54**, and the
**session state is pixel-identical to the observed state at every pair**, which
is the claim this task owed.

### Two browser specs were failing for REAL reasons, and one was a latent hole

**`overview-frame-sections.spec.ts`: `everyNamedSymbol` omitted `unusual.rows`**,
so _nothing is subscribed that no frame named_ has been **vacuous for this
section since Task 5.4.3** — it only went red when the session arm first put ten
stored tickers into a legitimate subscription. That is a guard gap Task 5.4.3
shipped, found by a later task using it.

**`overview-unusual-ranking.spec.ts`'s out-of-frame claim became false.** _No
provider ⟹ no rows_ does not hold once a provider-less deployment can hold a
**stored** ranking. It was **split by basis rather than weakened**: the observed
arm keeps the original assertion verbatim, and the session arm asserts **every
endpoint is `sip`** (an `iex` endpoint on a provider-less deployment is an
observation that cannot exist) **and** every endpoint's market date equals the
session named. Both arms ran against the real store.

### The guard, green on its own defect first

**`the-counted-basis-is-read-off-the-frame`**, two conjuncts plus two anchors.
Green on the plant against HEAD's checker: `62 invariants hold.` Red with the
new one:

```
✗ the-counted-basis-is-read-off-the-frame
  1 shipped frontend file(s) spell a counted basis rather than reading the section's own:
    apps/frontend/src/market/unusual-activity.ts
1 of 63 invariants failed.
```

Conjunct two proved separately with a ternary-built qualifier. The break's
`find` **survives its own substitution** (a spread override) — which is the
2026-10-16 amendment to `CLAUDE.md` being applied the same day it was written.
Checksums: `f56d88c353b99e` → planted `2db304b8a71ff2` → restored
**`f56d88c353b99e`**, identical.

### Gates

`pnpm verify` **exit 0**, **`63 invariants hold.`**, `509 / 1178 / 1629 / 60`
tests passed, `Unhandled Errors` block grepped for rather than inferred. Two
earlier runs were red and are reported rather than tidied: once on
`format:check`, once on **`lint`, which caught two real things** — an
`Intl.DateTimeFormat` with `"America/New_York"` written into a browser spec
(repaired to `marketDateAt`) and five `async` arrows with no `await`.

**`pnpm test:database` — 9 files, 306 tests passed**, the new file alone **47**.

A backend started against the real store logged
`session ranking loaded for unusual activity {securities: 485, through:
"2026-09-11"}` — store → cache → process proved on real data.

`pnpm e2e "specs/overview-"` — **96 passed, 1 skipped, 0 failed (1.8 min)** after
the two repairs above, the kept degraded grid at four widths included.

### Evaluated and not fired

**ADR 0038's frame-grain trigger did NOT fire.** The session ranking is an input
read on the batch's cadence from a table — `lastCloses`' shape. **Epic 14's
backend condition does not fire either**: the session arm reads one map and
builds ≤10 rows, strictly **less** per-batch work than the observed arm it
replaces — and that is **reasoned rather than measured**, which is the weaker
claim and is recorded as such.

## For a stakeholder — a status report, 2026-10-16

**The region is no longer empty when the market is shut**, which is most of the
week. It now shows the last completed session's ranking, labelled with the
session it describes, computed once a night as a by-product of a job that was
already reading the same data.

**It cost essentially nothing to run.** The database change is **9 to 14
thousandths of a second** against a two-minute budget, and the nightly job's
extra work is **too small to measure on this machine** — a run with the new code
came out faster than the control run without it. The honest reading of that is
"below the noise floor", not "free", and the control itself had to be redone
because the first attempt silently tested the old build.

**Two tables were needed rather than one, for a reason worth stating.** A company
that cannot be ranked gets no row at all — so on a day when nothing could be
ranked there would be no rows, and that is precisely the day the page still has
to explain itself. The counts therefore live in a row of their own.

**One asymmetry you should know about.** Out of hours the region can never say
_above the 99th percentile_, where during a session it can. That is because the
stored ranking compares each move against a history that **includes that move**,
while the live figure compares a brand-new move against the past. The
alternative would have meant no rows at all on the first night after a fresh
install. It is written into the migration rather than left to be discovered.

**And the wording was corrected before shipping.** The obvious reuse of a
neighbouring region's sentence would have described a _close-to-close_ move,
which is not what these rows measure — they are a five-minute move into the
close. Two different measurements under one phrase is a mistake this product has
made before and now has a rule against.

**Two existing browser tests were found to be wrong rather than made to pass.**
One had been **silently checking nothing** about this region since it was built
three days ago, and only spoke up when real data finally reached it. The other
made a claim that stopped being true the moment stored rankings existed; it was
**split in two** so each half asserts something true, rather than loosened.

**Honest limits.** No automated test machine and no person has seen this working
from a real nightly job anywhere but this laptop; the test environment has no
such job, so it will show the empty state for ever, and the deployed store gets
rows only after the first nightly run following the deploy.
