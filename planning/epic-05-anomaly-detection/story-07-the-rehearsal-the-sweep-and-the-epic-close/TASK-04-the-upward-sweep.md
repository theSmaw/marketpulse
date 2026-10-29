# Task 5.7.4 — The upward sweep, run against the list and against a grep

**Status:** **Complete — 2026-10-29. Fifteen sites, and the largest was a false claim about a mechanism in SHIPPED CODE, in three copies.** Two reversal triggers had **fired** and said nothing (ADR 0029 §6, `PROVIDER.md` §3.6); one trigger is recorded **not fired** in writing so it can still fire (ADR 0017 §4); and `CLAUDE.md` carried two false claims, one of which it had already been corrected about in another file. The one user-visible change: `Anomaly history`'s placeholder names a **condition** rather than an epic.
**Story:** [5.7 The Rehearsal, the Sweep, & Epic 5's Close](STORY.md)
**Depends on:** —

## Objective

Epic 5 measured things that falsify claims in governing documents, and nothing
sweeps upward on its own. The story names five candidates; a grep at Gate 1
found **nine more**, and the largest is a false claim about a mechanism sitting
in **shipped code** in three places.

The rule that governs every judgement here: **amend live claims by date, leave
historical records standing.** A story or task file records what was true when
it was written and correcting it destroys the record.

## What the user can see when this lands

**One sentence changes.** `Anomaly history`'s placeholder on
`/securities/:symbol` stops telling readers that Epic 5 fills it.

## Work

**The named candidates.**

- **`PRODUCT_SPEC.md` §9's `Unusual Activity` sketch** (`:508-516`) — unswept
  entirely, no Epic 5 amendment anywhere in §9. Falsified four ways: three rows
  against ten; `91/84/79` **arithmetically unreachable** above the 75 ceiling; a
  bare integer with no band, population or cut; and `[Investigate]`, refused by
  name at Epic 5's Gate 1. Highest-value amendment in the sweep, because §9 is
  what a reader building this region works from. §12's `NVDA — anomaly 91`
  (`:939`) is the same figure in the section Epic 7's flow is written from.
- **`PRODUCT_SPEC.md` §11** — well swept already (five dated amendments). Two
  residues: `:840` says the shipped score is **three scored factors**, which the
  unconditional `no-distribution` arm falsifies (three slots, two scored), and
  the section contradicts its own later amendment's "34,318 **two-factor**
  scores". The quiet-day sentence is Task 5.7.3's.
- **`PROVIDER.md` §3.4** (`:359-362`) — "Epic 5, which is the stronger reader" of
  `split-adjusted`. **Epic 5 is not a reader of it at all** since 2026-10-14.
  §3.5 was amended; §3.4 was not, so the Decision clause and the Consequence
  clause now disagree and the Decision one is reached first (`:287`).
- **`PROVIDER.md` §3.6** (`:421-423`) — a reversal trigger that **has fired**:
  _the first split inside the stored window_. Four exact split factors found on
  the deployed store, named. Also `~86 large-cap equities` is stale (516), and
  the section's bounded-ness argument now **understates** Epic 5 in its favour —
  Epic 5 refuses the figure rather than drawing the cliff.
- **`market-bars.ts`'s `STORED_BAR_ADJUSTMENT` docblock** (`:535-551`) — says
  "the baseline fetches a `split-adjusted` series for its window". Verified:
  **zero provider calls** in `return-baseline.ts` or `compute-baselines.ts`. The
  awkward case — it is itself a dated correction, so it _looks_ historical, but
  it is a present-tense description of shipped code and is wrong. Amend by date;
  the struck clause above stays struck.
- **`UNIVERSE.md` §5's drift table** (`:338`) — the prediction is **confirmed and
  now an understatement**: a reclassification re-points a _stored_ 60-session
  baseline keyed to the benchmark, is invisible to the split guard, and feeds a
  scored ranked surface. Also correct this story's own mis-citation: the
  no-benchmark-for-an-industry-group claim is §1/§7/§16, not §5.

**What the grep found.**

- **`packages/shared/src/market-provenance.ts:316-320`** — the §3.4 sentence, in
  the package both sides of the wire share, immediately above the module's own
  rule that each vocabulary member needs a reader. Third copy of one claim; the
  fourth is `market-bars.ts`.
- **ADR 0029 §6** (`:218-223`) — a reversal trigger fired by its own named
  candidate on 2026-10-14. No Epic 5 amendment.
- **ADR 0017 §4** (`:125-143`) — the 2026-09-09 amendment withdrew the IEX
  argument on the premise that the volume baseline would rest on stored SIP.
  Story 5.5 built it on **`iex` deliberately**, so the withdrawn sentence is
  **correct again for this factor**, now with a figure: 3.54%–15.19% of volume.
  And the trigger itself is **unevaluated with Epic 5 as its only named owner** —
  it needs an explicit verdict in writing or it never fires.
- **ADR 0020** (`:405-407`) — misdescribes the inheritance: the volume baseline
  does **not** read "these rows", and the 93.4% density handed over is off by an
  order of magnitude against 99.990% of buckets refusing.
- **ADR 0041** (`:147-152`) — a future-tense prediction that came exactly true,
  including its stated risk. No Epic 5 amendment.
- **`planning/EPICS.md:199-200`** — Task 5.5.5's correction never arrived.
  Task 5.7.3 owns the rewrite; this task records why the copy diverged.
- **`SecurityExplorer.tsx:687`** — `filledBy="Epic 5 — Anomaly Detection"` on a
  region Epic 5 is closing without filling. **Decided at Gate 1: the placeholder
  names the CONDITION rather than the epic**, and the deferral condition is
  re-worded, because _the first surface that needs a score older than the
  process_ **has arguably already fired** — Task 5.6.7's session arm reads
  `session_composite_scores`, a nightly table. The new wording: _the first
  surface that needs more than one past session's score for one security._
  Blast radius: `SecurityExplorer.test.tsx:637` is a test named "names the epic
  that fills every empty region", and `:634` asserts the region count.
- **`CLAUDE.md`'s Current state** — `/securities/:symbol` draws **five** of
  §8.3's regions, not four; the sentence was written for Story 5.1 on 2026-10-13
  and went false on 2026-10-14. And the listening-pass open item has gained three
  Epic 5 candidates: a ledger column that sums to the figure above it, a band
  stated once for ten rows (a listener on row 7 has no band), and a six-refusal
  region.

## Done when

1. Every hit above is amended by date or explicitly judged a historical record,
   with the judgement recorded.
2. The false provider claim is corrected in **all three** live sites.
3. ADR 0017 §4's trigger carries a written verdict.
4. The placeholder names a condition and the re-worded deferral condition is
   recorded with its alternatives.
5. `pnpm verify` green, including the two tests the placeholder change touches.

---

## What was done — 2026-10-29

Fifteen sites. Every one amended **by date, beside the claim** — no ADR
decision rewritten, nothing renumbered, no struck text restored, and every
story and task file left standing as the record of what was true when written.

### The largest finding: a false claim about a mechanism, in shipped code, three times

Story 5.1's Gate 1 decision 1 said Epic 5's baseline would fetch a
`split-adjusted` series from the provider. **Story 5.3 reversed that on
2026-10-14** — the baseline reads the **raw** store and a split guard detects a
discontinuity and **refuses the security**. Verified rather than assumed:
`return-baseline.ts` and `compute-baselines.ts` contain **zero** occurrences of
`provider`. It refused **5 of 516** on the real store, four on exact split
factors (`CRWD` 0.2501, `APH` 0.5017, `MNST` 0.5084, `DD` 3.0639), **two above
1.0**, which is why the bound is a ratio and its reciprocal.

So **Epic 5 is not a reader of `split-adjusted` at all** — and three live sites
said it was:

- **`apps/backend/src/market-bars.ts`**, the `STORED_BAR_ADJUSTMENT` docblock.
  The awkward case: the false sentence **is itself a dated correction**
  (2026-10-13), so it reads as a historical record while being a present-tense
  description of shipped code. And **the clause it struck through is now closer
  to the truth than the correction that replaced it** — the strike was right
  about the _computation_ and wrong about the _fetch_. Amended; the strike
  stays.
- **`packages/shared/src/market-provenance.ts`** — the same sentence in the
  package both sides of the wire share, immediately above `ADJUSTMENTS` and
  immediately above that module's own rule that **each vocabulary member needs
  a reader**. With Epic 5 gone, `split-adjusted` has **one** reader left. The
  member is **not** removed and the vocabulary is unchanged — that is the
  architect's and the owner's call, and the amendment says so rather than
  taking it.
- **`PROVIDER.md` §3.1** — and this is the shape worth keeping. **§3.5 was
  amended on 2026-10-14 and §3.1 was not**, so for **fifteen days** the
  document's **Decision** subsection and its **Consequence** subsection
  disagreed about what Epic 5 does, with the Decision one being what a reader
  reaches first. The document that recorded the first correction is the one that
  missed the second.
- **`PROVIDER.md` §3.4** — the fourth copy, in the section whose own opening
  rule is _each member needs a reader_.

### Two reversal triggers had FIRED and said nothing

- **`PROVIDER.md` §3.6**: _the first split inside the stored window_, called
  _likely, not hypothetical_. **It fired, measured**, by the four split factors
  above. Two sub-corrections went with it: `~86 large-cap equities` is stale
  (the universe is **516**, and `UNIVERSE.md` §17 is the only place to take the
  count from), and the section's bounded-ness argument now **understates Epic 5
  in its favour** — Epic 5 does not draw the cliff, it **refuses the figure**,
  which is better than §3.6 predicted. One honest limit added rather than
  glossed: §3.6's subject is the **drawn chart** and Story 5.3 measured the
  **baseline**, so what `/securities/CRWD` shows today is still unestablished
  and stays that section's gap.
- **ADR 0029 §6**: _the first window this product offers that spans a corporate
  action in a security it tracks_, **with Epic 5's return percentiles named as
  the candidate**. It fired, by its own named candidate, on 2026-10-14. The ADR
  carried amendments dated 2026-10-09 and 2026-10-10 and **nothing from Epic
  5** — the same event reached from a second document, which is precisely the
  _nothing sweeps upward_ failure.

### One trigger recorded NOT FIRED, in writing, so that it still can

**ADR 0017 §4** needed amending in **two directions at once**, and both are
written:

Its **2026-09-09 amendment withdrew** the objection that _an Epic 5 volume
baseline built on IEX measures the venue rather than the market_, on the premise
that the baseline would rest on stored **SIP** bars. **That premise is
falsified**: Story 5.5 built it on **`iex` deliberately**, with the tape in the
key (`unique (security_id, observed_at, feed)`), ADR 0045 being the decision. So
the withdrawn sentence is **correct again for this factor**, and now has a
figure — IEX's share of **volume** is **3.54%–15.19%**, running inversely with
liquidity, against **81.6%** minute presence.

And its trigger — _Epic 5's measurement alone_ — was **unevaluated with Epic 5
as its only named owner**. Epic 5 measured the **adjacent** thing (the open is
the fattest-tailed bucket, pooled) and gave it a **different** condition. So the
amendment records an explicit written verdict that **it did not fire**, and why.
Without that it never fires at all: a trigger nobody reads at the moment it
would fire is this repository's own recorded failure mode.

### Two more that were right in direction and wrong in magnitude or tense

- **ADR 0020** misdescribes the inheritance twice. _"from these rows"_ is half
  true — the price and excess baselines read those SIP rows and the **volume**
  baseline deliberately does not. And the density handed over was **93.4%**
  (364.3/390) against the tape the volume baseline actually rests on, where
  `NVDA` — the universe's best case — has **80 samples a bucket at 10.65%
  relative standard error** and **39,924 of 39,928 buckets (99.990%)** refuse.
  Right in direction, **off by an order of magnitude in consequence**.
- **ADR 0041** predicted, in the future tense, that Epic 5's ranked region
  _"will get the travel, the hold, the symbol keys and the clamping by using
  `RankedList` — without anybody re-taking the argument."_ It came exactly true:
  `Unusual.tsx` imports it and calls itself _"the third use of `RankedList`, and
  the first one in the narrow column"_. **And the ADR's stated risk landed too**
  — _a region whose rows a reader compares over time rather than looks at now
  would want a different answer_ is exactly an anomaly list, and the routed
  `ORDER HELD` defect now reaches a second region. Future-tense staleness, the
  same class Story 5.1's own sweep named.

### `PRODUCT_SPEC.md` — §9 had received nothing from Epic 5 at all

**§9's `Unusual Activity` sketch is falsified four ways** and is the section a
reader building that region works from: three rows against **ten** (fixed, and
the region could not hold even one where it was reserved); `91`/`84`/`79`
**arithmetically unreachable** above the **75** ceiling; a bare integer with no
band, population or cut, against a shipped region that states three populations,
a cut **and** its cohort, with the band stated once in the heading; and
`[Investigate]`, **refused by name** at Epic 5's Gate 1 because a row has one
activatable thing.

**§11's own factor count was wrong and the section disagreed with itself.** It
said _the shipped score is **three** scored factors_; it is **three slots, two
scored** — `volumeFactorAnswer()` takes no parameters, the cohort is
`{price, excess}` on 485 of 485 rows with **0** single-factor scores — while its
own 2026-10-22 amendment three lines below already said **34,318 two-factor
scores**.

**§12** carries the same unreachable `91`, names `Investigate` on a list row,
and is the section Epic 7's flow is written from — so it also gained the thing
that section most needs to know: a `high` or `extreme` is available on **any**
day including a dead one, so a trigger of the form _the score is high_ selects
something every day.

### `CLAUDE.md` — two false claims, one of which it had already been corrected about

- **"the only place a score has ever been drawn is Storybook"** — false. Task
  5.6.5 read `score 35 · band elevated · max 35` off the **running backend** on
  `/securities/NVDA`, probed at four widths, frame quoted at **625 B**.
  `LIVE-REHEARSAL.md` already carried the correction and **this file did not**,
  which makes the governing file an instance of its own rule. What survives is
  the half that matters: no **ranked row** on `/` has been drawn by any machine
  or person, and the deployed common case `2 of 3 · max 75` has never been drawn
  anywhere.
- **"four [regions] do"** on `/securities/:symbol` — **five do**. The sentence
  was written for Story 5.1 on 2026-10-13 and went false the **next day** when
  Story 5.2 filled `Abnormal-move indicators`. Counted from the route:
  identity, `Price`, `Abnormal-move indicators`, `Volume`, `Relative
performance`.

### The one user-visible change

`Anomaly history`'s placeholder said **`Filled by Epic 5 — Anomaly Detection`**,
and Epic 5 is closing without filling it. So the shipped page told every reader
that the epic being marked complete fills a region it never will — ADR 0029's
defer rule pointing at a date that has passed, and the shape of the
`BarSeriesPanel` duplicate this product has already deleted once.

It now names a **condition**:
`Filled by the first story that needs a score for this security from more than
one past session.`

**And the original condition had to be re-worded, because it had fired without
filling anything.** It was _the first surface that needs a score older than the
process_ — which Task 5.6.7 satisfied by re-basing `/`'s `Unusual activity` onto
`session_composite_scores`, a **nightly** table read on ~80% of the week and
permanently on CI. Scores written before the process started, read by a shipped
surface. What this region actually needs is not _a_ stored score but **a series
of them for one security**, which no table holds: `0017` keys one row per
security per session.

`RegionPlaceholder`'s own rule is **widened rather than broken** — the label may
now name a condition as well as an epic, because an epic name is still a promise
with an identifier on it and goes stale the day that epic closes. The two things
the rule was written against are unchanged: **never a date, never a story
number.**

### Gates

```
pnpm build         exit 0
pnpm lint          exit 0  (eslint . --max-warnings 0, no output)
pnpm format:check  All matched files use Prettier code style!
pnpm links         600 documents, 1909 cross-file links, 39 anchor links, 0 broken.
pnpm --filter @marketpulse/frontend test SecurityExplorer RegionPlaceholder
                   Test Files  2 passed (2)
                        Tests  28 passed (28)
```

Load read **before** the heavy run: `4.99 7.96 7.62`. `pnpm verify`, `pnpm e2e`
and `pnpm test:database` are deliberately **not** run here — AC 7 wants them
once on the final tree.

## For a stakeholder — a status report, 2026-10-29

When a measurement proves a document wrong, the document has to be corrected the
same day, and nothing in this process does that by itself — a story's close
tidies up its own paperwork, not the paperwork it falsified somewhere else. This
task went looking for those, found **fifteen**, and corrected them all with a
date beside each so the original claim stays readable.

The biggest was in the code itself. A comment in three separate files described
how this product obtains share prices that have been adjusted for stock splits —
and described a mechanism that was **replaced two weeks ago**. What actually
happens now is better: rather than asking the data vendor for adjusted prices,
the product reads its own raw records and **refuses to produce a figure** when it
detects a price break it cannot explain, which it did for 5 securities out of 516. Three documents, including one in the shared code both halves of the
product use, said otherwise. One of them had been corrected in one section and
not in the section a reader reaches first — and those two sections contradicted
each other for fifteen days.

Two _"come back and reconsider this if X happens"_ notes were found where **X had
already happened** and nobody had come back. A third was recorded as _not_
triggered, deliberately and in writing, because a note nobody reads at the
moment it matters never fires at all.

And one thing changed on screen. The security page had a panel reading **"Filled
by Epic 5 — Anomaly Detection"**, and Epic 5 is finishing without filling it —
so the product was promising readers something from a piece of work that was
about to be declared finished. It now says what has to become true for that panel
to appear, which is a sentence that cannot go stale by the calendar.
