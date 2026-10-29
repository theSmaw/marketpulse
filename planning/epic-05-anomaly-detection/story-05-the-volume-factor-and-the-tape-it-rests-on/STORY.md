# Story 5.5 — The Volume Factor, & the Tape It Rests On

**Status:** **Complete — 2026-10-21.** Accepted by the Product Owner at Gate 2.
All five tasks merged (#602, #603, #605, #606, #607). Gate 1 taken 2026-10-17.
**What the close found rather than what it shipped:** AC 3 was recorded met and
was not — the same-day sweep reached the design document only, leaving the
**epic's own exit criterion** carrying the wording AC 3 exists to fix; AC 8's
`?? 0` rule was violated **three times by this story's own code**, once on a
median and one of them reachable on the wire; and the sideways sweep was **3 of
3 missing**.

**Epic:** [Epic 5 — Anomaly Detection](../EPIC.md)
**Depends on:** 5.3
**Epic scope covered:** intraday volume baseline, volume-ratio calculation

## Description

**This story opens with a measurement, because the factor cannot be built
honestly without it and nobody has taken it.**

Every coverage figure in this repository is a **minute-presence** share — 65.1%
median per-symbol minutes on IEX, 82.8% median on the stored endpoint, 99.7% on
the consolidated tape, `CCI` at 43.1%. **There is no measurement anywhere of
IEX's share of VOLUME.** A security present in 65% of minutes may carry 2% of
the shares.

**The consequence is not noise, it is a large unknown multiplicative bias.** An
IEX numerator over a SIP baseline is **systematically far below 1 regardless of
how unusual the volume is**, so `4.1× typical` could honestly read `0.3×
typical` on a genuinely heavy day. §11's `Volume 3.8× normal` is uncomputable
until the share is known.

**And the measurement is cheap and available today**, because ADR 0035 keeps
both tapes: settled live-written sessions hold a `sip` row and an `iex` row for
the same minute, so a per-minute `sum(iex.volume) / sum(sip.volume)` over a
reconciled session — per security and in aggregate — is a query against data
already stored.

**§11's wording hides four decisions in one word.** _"the historical median
volume for the same **approximate** time of day"_ does not say the numerator's
interval, the bucket width, the lookback, or whether today is excluded. The
intraday volume curve is U-shaped and steep at the open, so the bucket width is
a real choice: minute-of-session is noisiest and most faithful, a 5-minute
bucket matches the window, a 30-minute bucket smooths the open away.

## What the user can see when this story lands

**A volume figure in `Abnormal-move indicators`** — _"volume 4.1× typical for
this time of day"_ — with **its baseline defined and its tape named**, beside
the return and the percentile.

**Corrected 2026-10-20 at the close, because the sentence above reads as though
a figure draws and on every machine that exists it does not.** What a reader
meets is the band, its label, its baseline's terms, its tape line, and **one of
six refusal sentences**. That is **correct delivery of the story and not
delivery of the promise as written**: the promise was falsified by Gate 1
decision 1, which the owner took with this consequence in writing.

**Corrected again 2026-10-21, from the first DEPLOYED nightly pass, and it moves
two claims in opposite directions.** This paragraph said the refusal was _most
often `No IEX volume history for this security`_ and the figure _drawn only in
Storybook_. The pass for session 2026-10-20 says:

```
volume baselines on iex for 2026-10-20 — measured 512, split-refused 4,
  no same-tape history 0 (no row written)
volume buckets — 4 drawable of 39928 with samples, 39924 too few sessions,
  0 zero volume, 8 empty; 2164895 minute samples, target 5% relative SE
```

**`no-same-tape-baseline` is 0.** Every tracked security has `iex` history,
because the live writer has been storing every security the socket carries since
2026-09-23 — so that refusal is the permanent state of **CI and every laptop**
and reaches **no** reader of the deployed product. The refusal they meet is
**`too-few-sessions`**, at **39,924 of 39,928 buckets — 99.990%**. And **4
buckets are drawable**, so the figure is reachable on the deployment today rather
than only in Storybook: **0.010%** of the time-of-day space, meetable only by
opening one of four `(security, 5-minute bucket)` pairs. **Nobody has seen one —
but it is no longer true that nobody can**, which is a different claim and the
one `LIVE-REHEARSAL.md` row 5.5 now has to make.

`512 × 78 = 39,936` confirms the shape, 78 being the five-minute buckets in a
390-minute session, with 8 of them empty.

**Why both were wrong is worth more than either figure**: they were written from
the local and CI stores, which hold **no `iex` tape at all** and can therefore
reach exactly one of the six refusals. A refusal taxonomy cannot be ranked from a
machine that can only produce one member of it. The figure still becomes _fully_
available on a **date nobody controls** — when `n` crosses the floor broadly
rather than in four buckets. Measured against the
deployment on 2026-10-20, `NVDA` — the best case in the universe — has **80
samples** a bucket, **10.65%** relative standard error, and needs **132
sessions**; on the _better_ tape at _full_ depth **38,448 of 40,248 buckets
refuse (95.5%)**. `LIVE-REHEARSAL.md` row 5.5 and two `docs/GAPS.md` entries
carry it, and that row's **first half — watching the refusals — is available
today**.

## Gate 1 — decisions taken 2026-10-17, and five false premises corrected

**Four roles shaped this story and between them found five false premises, four
of them in this file.** The criteria are left standing as the record of what was
specified; this section amends them and **wins** where it disagrees.

### The four decisions

1. **Same-tape `iex`, and the figure is ABSENT until depth accrues.** AC 2's
   first sentence stands and is the one thing not to move. Its **fallback is
   incoherent**: _"refuse during the live session and compute only on settled
   sessions"_ does not supply a missing **baseline** — it swaps the
   **numerator** to `sip`. And the gap is not per-security: it is a span of
   history (nothing before 2026-09-23, ever) and a class of deployments (CI and
   every laptop, **zero `iex` rows**, for ever). Measured on the deployed store
   over 60 sessions, `iex` depth runs **1.9% (`ERIE`) to 24.9% (`AAPL`)** of
   `sip` — and that ceiling is **the live writer's start date, not IEX's
   reach**: 18 sessions since 2026-09-23 caps any security at ~7,020 minutes,
   and `NVDA`'s 5,693 is **81.1%** of that. Alternatives rejected: a settled
   `sip`-over-`sip` figure (never moves intraday, and sits beside a return about
   _now_ — Story 5.1's comparability refusal pointed inward), and a `sip` ratio
   with the bias **applied** (computing an adjustment, which is the one place
   `PROVIDER.md` §3.5's objection does reach). **Reversal trigger: the first
   session on which the `iex` baseline's counted `n` meets the floor for FEWER
   securities than the previous session** — depth has stopped accruing, so the
   live writer is holing and this decision's premise has failed.
2. **Story 5.3's mislabelled window is repaired HERE, as the first task.**
   Shaping found a **live defect in shipped code**: `readCoveredEnd` is
   `max(covered_end)` with no feed predicate, `BarCoverage` has **no `feed`
   column** (dropped at Task 3.7.5), and the live IEX writer advances the ledger
   through `recordSeries`. So the nightly baseline can open a 60-session window
   whose newest session holds **no `sip` rows**, and stamp and label it 60 —
   the exact `loadedFor` defect `return-baseline-store.ts` says it was avoiding.
   It needs **no job to fail**: the backfill covers only regular-session minutes
   while the writer keeps extended hours, so `covered_end` sits past the last
   `sip` minute by design.
3. **A second BAND, +118 px, region 142 → 260.** A third cell on the return's
   row costs 0 px and was measured to fit with 23 px of slack at 390 — and is
   **wrong**: `▲ +0.42%  99th percentile  4.1× typical` under one label reading
   `5-minute return` asserts that the return is 4.1× typical, the exact
   misreading this story exists to prevent. `MARKET-OVERVIEW.md` §1.4's trigger
   fires a **third** time (after Task 5.1.4 on this route and Task 5.4.1 on
   `/`); the figure is **re-probed per width** after the change and the measured
   number recorded, never this derivation.
4. **5-minute buckets, sampled per MINUTE**, matching the return's span and the
   trailing window so one span serves both. The sample unit is the decision that
   makes the printed precision defensible: a median printed as `4.1×` has
   relative SE ≈ `1.253·CV/√n`, so at **n ≈ 18** session-sums `4.1×` is really
   **`2.9–5.3×`**, while minute-level sampling over 60 sessions puts n in the
   thousands. Memory ~322 KB at 78 buckets × 516, against **1.6 MB** for
   minute-of-session — larger than `trailing-window.ts`'s measured 1.02 MB, in a
   0.5 GiB container holding both. **AC 1 is widened** to capture per-bucket
   dispersion, without which AC 7's floor is **chosen rather than derived**,
   against hand-off item 4's own rule.

### The five false premises

5. **`§628` is a LINE NUMBER and `VISUAL-LANGUAGE.md` has no numbered sections
   at all** — 1,149 lines, headings only, and `grep -rn "§628"` returns nothing
   repository-wide. The passage is lines 626–644 and the multiple is at **631**.
   **Corrected 2026-10-17 by Task 5.5.1: the multiple is at line 632, and there
   is no table row beneath it that spells the phrase.** The second site is line
   **716**, in the deferred-work blockquote eighty-four lines further on; the
   row beneath the passage reads _"The reference rule — reserved for Epic 5's
   baseline"_ and carries no multiple at all. Both real sites now say
   `typical`. Which is premise 5 proving itself twice over — a line-keyed
   pointer was wrong by one line and a described neighbour was the wrong
   neighbour, inside the day the premise was written.
   **And it did not reason about drawing this figure**: it sized the volume
   **plot** (_"88 px against the price plot's 280 … a window whose peak is 3.8×
   its typical bar draws that typical bar at one 3.8th of the plot"_), which is a
   **domain** argument about a plot height and offers no treatment to inherit.
   Same number, different purpose.
6. **AC 3 falsifies a live sentence in a governing document**, so the
   upward-sweep rule applies the **same day** rather than at the close: line 631
   and the table row beneath it both spell **`Volume 3.8× normal`**, the word AC
   3 forbids. `PRODUCT_SPEC.md` §11 and the epic exit criterion are not the whole
   corpus.
7. **AC 1 is NOT a gate on the story.** AC 2's same-tape rule removes the
   multiplicative bias AC 1 exists to bound — a same-tape ratio has no cross-tape
   bias at all — so AC 1 survives as two narrower things: a bound on the
   fallback, and the product input on whether a live `iex/iex` figure is worth
   drawing. **"No volume figure is drawn before it exists" is not checkable** as
   written: it is a claim about a development sequence, not about the tree.
8. **`bar_coverage.covered_end` is not evidence of `sip` reconciliation**, so
   hand-off item 5 cannot carry AC 1's _reconciled session_ test. The ledger is
   **tape-blind**. Reconciled must be a per-tape count —
   `count(*) filter (where feed='sip')` over that security's session range, the
   index-only shape `tapeCounts` already uses.
9. **The split guard cannot be re-derived for volume.** It is a ratio over two
   **closes** at a session boundary; volume legitimately moves 10× day to day, so
   there is no analogous clean overnight ratio. The volume factor must **read**
   the price pass's `split-discontinuity` refusal for that
   `(security_id, observed_at)`.

### Two more things the roles settled

**`return_baselines` cannot be extended, and the hand-off's premise is false in
three ways.** It has **no `feed` column** — the tape is a serving-path constant,
`BASELINE_FEED = "sip"` — so extending means one row holding a `sip`
distribution and an `iex` distribution with nothing saying which. It would have
to weaken the shipped `return_baselines_one_answer` check and duplicate
`sample_count` and `refusal`, because a security can be price-refused (`CRWD`,
split) and volume-fine or the reverse. And **a second table does not imply a
second pass** — Story 5.4.5 already writes two tables from one pass, and adding
`volume` to `windowQuery`'s `select` costs **no extra I/O**: the same 538 blocks,
the same index scan, one more column deserialised.

**Epic 14's backend condition does NOT re-fire.** This story is scoped to
`Abnormal-move indicators`, one security per client focus, on the fifth frame
type — **O(clients)**, which is why 5.1, 5.2 and 5.3 were each evaluated unfired.
Epic 14's fired condition is a figure derived per security **over the universe**.
And because this story is out of scope for `/`, it does **not** owe Epic 14's
re-take of the per-batch arm — said explicitly so the next reader does not
assume it was skipped.

### Routed out of scope with a condition — the volume plot's reference rule

`VISUAL-LANGUAGE.md` line 637 reserves the volume plot's dashed
`--chart-reference` rule for **"Epic 5's baseline"** by name, with _"No new
token"_, and **this story is that baseline** — so the condition has been met and
this file's _Out of scope_ never mentioned it. It is routed out anyway, on a
reason better than scope: **a flat rule is the wrong mark for a time-of-day
bucket median.** The baseline varies by bucket, so the honest drawing is
**stepped**, not a rule. **Condition for building it: the first story that draws
the volume baseline on a time axis rather than as a figure.**

### One consequence of decision 1 to have in writing

The figure ships drawn on **no machine and by no person**, and becomes available
on a **date nobody controls** — so `LIVE-REHEARSAL.md` row 5.5 is
**unwatchable** rather than merely unwatched, which is new for that ledger.

## The sideways sweep at the close — 2026-10-20, and it was 3 of 3 MISSING

**Enumerated by grepping this story's documents for every `Story N.M`, `Epic N`
and `Owner:` line, then checking each against that story's own file** — which is
the procedure, because Story 5.3's close propagated a figure sideways and missed
it upward, and Story 5.4's was 1 of 4 missing. **This one was worse: every
obligation checked was absent.**

| owed to       | carried it?                                                | what was written                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Story 5.6** | **no** — its only reference was its own `Depends on:` line | the fourth factor is **absent for most securities**, so §11's four-factor composite has **three and a stated absence**; the figure is a **rate** and its label is load-bearing; six refusal kinds that must survive into the explanation; `typical` against the band name `normal`; the shipped cap and floor and the guard whose **plant is `composite-score.ts`** — its own file; and the region is **256 px** now, with the 58-character line budget |
| **Epic 14**   | **no** — no reference at all                               | the backend condition **did NOT re-fire** (O(clients) on the fifth frame type, not O(universe)), ADR 0038's grain trigger likewise, this story **does not owe** the `/` re-take because it is out of scope for `/`, and `baseline-cost` is now **~15× slower** (`elapsedMs` 59.86 → 922.34) because the volume sums touch the heap                                                                                                                      |
| **Epic 6**    | **no** — nothing about ADR 0045                            | **ADR 0045 decision 1 governs its factors**: an edge weighted by **traded value**, a node sized by **volume**, a threshold on **turnover** are all **levels across tapes** and are refused; a **correlation of returns** is fine; and if a derived graph is persisted, **the tape belongs in its key**                                                                                                                                                  |

**Why all three were missed, which is the part worth keeping**: this story's own
documents are dense with figures, and a close that sweeps _its own_ records feels
complete. **Nothing about writing a good record crosses into somebody else's
file** — which is `CLAUDE.md`'s own note that a hand-off sweeps **sideways** and
a close does not reach it. The count is recorded here so the next close expects
to find obligations rather than to confirm there are none.

## Acceptance criteria

1. **IEX's share of consolidated volume is measured first**, per security and
   in aggregate, over at least one reconciled session, and recorded as a dated
   observation. No volume figure is drawn before it exists.
2. **The tape rule is same-tape or refusal.** The baseline is built from the
   **same `feed`** as the numerator, or the figure is refused. The fallback,
   if the same-tape baseline is unavailable for a security, is to **refuse
   during the live session and compute only on settled sessions** — a composite
   with three factors and a stated absence beats a fourth factor with an
   unmeasured bias.
3. **The word is `typical`, not `normal`.** §11 contradicts itself inside one
   section — `4.1× typical` in the volume example, `Volume 3.8× normal` in the
   composite example — and `normal` is **also a band name**. The exit
   criterion's `3.8× normal` is the collision, not the model.
4. **An absent bar is not zero volume.** On IEX an absent bar is **ordinary**
   rather than a claim that nothing traded. `describeSilence` already carries
   this lesson: `No shares changed hands anywhere in the window` was the only
   shipped sentence claiming something about **the market** and had to be
   narrowed to name the venue.
5. **A zero-volume baseline is a refusal, not an `Infinity`** — a non-finite
   figure leaves the set, which is `directionOf`'s precedent.
6. The baseline's **bucket width, lookback and exclusion of the scored
   window** are stated on screen in the figure's own terms, and the baseline is
   a **median** rather than a mean — the one robust choice §11 does make.
7. A bucket with fewer than a stated floor of sessions is **refused**.

   **Amended 2026-10-21 at the close, on the UNIT rather than the criterion.**
   The shipped floor is in **samples per bucket**, not sessions:
   `n ≥ (√(π/2)·CV / target)²`, with `CV` **measured** per bucket and `√(π/2)`
   computed. The two are not interchangeable — a session contributes one sample
   to a bucket **only if the venue printed in it**, so on `iex` a 60-session
   lookback yields 80 samples for `NVDA` and fewer for everything else, and a
   floor counted in sessions would pass buckets the data cannot support. The
   refusal sentence states the sample count for the same reason:
   `Too little history — 80 IEX minutes at this time of day`. The criterion's
   intent is met; its unit was loose, and this is the correction rather than a
   change of substance.

8. The same purity, window-on-`startsAt`, and no-`?? 0` rules as every other
   factor.

## Design work

One more figure in a column whose idiom Story 5.1 set. The figure is a
**multiple** rather than a percentage, which is a different shape from
everything else on the page — and `VISUAL-LANGUAGE.md`'s **_The supporting
series_** heading already reasoned about exactly this multiple when it sized the
volume plot, so read it before choosing a treatment.

> **Pointer corrected 2026-10-17 by Task 5.5.1.** This read `§628`, which is a
> **line number**: that file has no numbered sections at all, and a line-keyed
> pointer rots on the next insertion — as this one did, because the same task's
> amendment moved the passage. Gate 1's premise 5 says the multiple is at line
> **631** and it is at **632**, which is the rot happening inside one story. The
> heading is the durable address. And premise 5's other half stands: the passage
> is a **domain** argument about a plot height — _"a window whose peak is 3.8×
> its typical bar draws that typical bar at one 3.8th of the plot"_ — and offers
> this story no treatment to inherit.

## Out of scope

The composite, the bands' boundaries, and anything on `/`.

## Handed here by Story 5.2's close — 2026-10-14: the window holds one tape, and the moment you read the store it holds two

**The in-memory trailing window cannot mix tapes, by construction.** Every bar in
it arrives from one `MarketDataStream` whose feed is `iex`, so anything computed
from it is `iex`-over-`iex` — which is why `Abnormal-move indicators` says
**`Measured on IEX`** and does not inherit the chart's `All US exchanges` a few
centimetres away (invariant 6).

**Your volume factor is the first thing in this epic that must read the store**,
and that is where the trap this epic opens with becomes real. `market_bars` holds
up to **two rows a minute** — `feed = 'iex'` and `feed = 'sip'` (ADR 0035) — and
the two reads behave differently: `readSeries` reduces a minute to one bar under
`SERVED_TAPE_RANK` preferring `sip`, while `readBars` **answers every row,
including two for one minute**, and its own docblock says it does not answer the
tape question for you.

So **a volume ratio with a live IEX numerator over a stored SIP baseline compares
two different tapes**, and since 2026-09-23 that can happen **entirely inside the
store**: the minutes in progress before the nightly backfill, and extended hours,
which the backfill never asks for and which are therefore the live tape's
permanently. IEX is one venue's prints and SIP is consolidated — on volume the
difference is not a rounding error, it is the whole quantity.

**Pick a tape explicitly, say which on screen, and do not let the two reads
choose for you.**

**One more thing you inherit**: the window is **six to seven minutes deep**, so
it is not your baseline. A median volume for the same time of day is a store read
of a different shape, and `one-home-for-the-observation-window` permits exactly
two minute-scaled cutoffs today — yours is a third quantity and owes its own
conjunct, constant and argument, the same as Story 5.3's lookback.

## Handed here by Story 5.3's close — 2026-10-14: the check that will refuse your lookback is new, and your file is literally the plant it was proved against

**1. `one-home-for-the-observation-window` has a FOURTH conjunct and it is
keyed on the session count.** Story 5.2's close told Story 5.3 that check would
refuse a 60-trading-session lookback; **it did not** — it matches a minute-scaled
subtraction from an instant's milliseconds, and a calendar walk has no
`getTime()` and no minute factor. The conjunct was written at Story 5.3's close
and **proved by planting `apps/backend/src/volume-baseline.ts` with its own
`VOLUME_LOOKBACK_SESSIONS = 40`** — your file, under its likely name. Before the
conjunct it passed with `59 invariants hold.`; after it, the run names both files
and routes the author.

So: **a lookback whose count is FIXED by the module is a policy and has one
home.** `backfill.ts`, `fetch-bars.ts` and `series-request.ts` pass
`wanted + 1`, `wanted` and `count` — a caller's quantity, not a second
definition — and that is the distinction the conjunct keys on. If your volume
baseline's window genuinely is not the price baseline's 60 sessions, it owns
**its own constant, its own argument and its own conjunct**, in the same change.
Break: `a-second-session-lookback`.

**2. The baseline table may be extended rather than duplicated.**
`return_baselines` is keyed `(security_id, observed_at)`, declared **derived and
recomputable**, and carries `sample_count`, `breakpoints` and `refusal`. ADR 0044
records why it exists and that it is a cache with a schema. **A second table for
volume is a second nightly pass over the same rows** — the price pass already
reads every 1m bar in the window, and it runs in **11.78 s warm**.

**3. The split guard is yours to inherit, and it is not optional.** It refused
**5 of 516** securities on the real store — `CRWD` 0.2501 (4:1), `APH` 0.5017,
`MNST` 0.5084 (2:1), `DD` 3.0639 (1:3 reverse), `MRNA` 1.8406. **A split breaks
volume harder than price**: the share count multiplies by exactly the factor the
price divides by, so an unadjusted 10:1 split is a **+900% volume figure** at the
100th percentile of every distribution it touches. `SPLIT_DISCONTINUITY_RATIO`
is a ratio **and its reciprocal** precisely because two of those five are above
1.0.

**4. The minimum sample is derived, not chosen, and yours must be too.**
`BASELINE_MINIMUM_SAMPLE = 2500` comes from the printed precision: an integer
ordinal means the last digit is one percentile point, and `50/√n ≤ 1` gives
`n ≥ 2500` exactly. It refuses **11 of 511** today. **If your volume factor
prints a different kind of number, its floor is a different arithmetic** — do
not reuse 2,500 because it is there.

**5. The tape rule, restated because it is the one that bites.** The baseline
reads **`feed = 'sip'` by name**, and `window.end` comes from **`bar_coverage`'s
covered end** rather than `lastCompletedSession(now)` — those two disagree
between the bell and the nightly run. A `distinct on` without a tie-break mixes
tapes **inside one series**, and even with a tape order it admits every IEX-only
minute, so the baseline's tails move with **the hour it was built**.

## Gate 2 — the acceptance criteria, verdicted — reconstructed 2026-10-29 at Epic 5's close

**This story closed without a per-criterion verdict table, and so did Stories
5.4 and 5.6.** Stories 5.1, 5.2 and 5.3 each published one; three of six did not,
and they are the three most recent — so the practice got **worse** across the
epic rather than better, which is the same thing Epic 4's close found (three of
eight) and wrote down.

**The table for this story's eight criteria is in
[Task 5.7.2's record](../story-07-the-rehearsal-the-sweep-and-the-epic-close/TASK-02-the-fifty-nine-criteria-verdicted.md).** It is there rather than here deliberately: it
was **reconstructed from this story's task files** rather than written at this
story's own close, and a verdict written weeks later by somebody re-reading the
record is a different artefact from one written by the people who did the work.
Putting it here would disguise that. Each row names its instrument, says whether
it is a **re-take** (a command a clean clone can run) or a **dated reading**, and
— new at this close — **which store the reading came from**, because "verified"
in this epic frequently means verified in the **refusal arm** on a machine with
no bars.
