# Task 3.8.1 — What a record is, decided before a row is written

**Status:** **Complete — 2026-09-23.** Both decisions settled: **both tapes are kept**, and a live-written session is **served to every reader with its label** ([ADR 0035](../../../docs/adr/0035-both-tapes-are-kept-and-what-a-record-is.md)). The figures are in [`LIVE-SESSION.md`](LIVE-SESSION.md) §1 — a real stored session is **190,483 rows**, a live one **~130,000**, and keeping both costs **+69% rows a year** and **41% of the storage runway**. Two findings the task did not expect: the coverage figure this task file was written on was **the wrong one**, and today's backfill **would never have seen the collision at all**.
**Story:** [3.8 Storing the Live Session](STORY.md)
**Depends on:** 3.7 (closed)

## Objective

Settle **both** of this story's open decisions, and settle the first one the way
Story 3.7 settled its own: **by measuring the shapes rather than arguing them.**

Open decision 1 is the three shapes for what happens tonight when the backfill
arrives with a SIP bar for a minute an IEX bar already occupies. Open decision 2
is whether a live-written session is served to everyone or only re-read by the
writer. Neither is a database detail: the first decides whether this product can
ever answer `PRODUCT_SPEC.md` §23's _what was knowable at 11:07_ **with the data
that was knowable at 11:07**, and the second decides how much this product
trusts a single venue's bars as history it serves to a reader.

## What the user can see when this lands

**Nothing.** A decision, its figures, and a subject document with them in it.

## Why this is a measurement and not a discussion

Story 3.7's first task took the same shape and it worked: the candidate the
argument favoured and the candidate the figures favoured turned out to be the
same one, and the figures are what stopped it being re-litigated three tasks
later. Here the arithmetic is small and nobody has taken it:

- **What shape 2 costs in rows.** Both bars kept means the unique key gains the
  tape. Measure it rather than assume it: §7.8 measured **0.36% of bars
  superseded** and §14.1 **0.064% revised**, but the overlap that matters is
  **how many of a session's 390 minutes are covered by both tapes** — IEX's
  median minute coverage is **82.8%** against SIP's 99.7% (`LIVE-DATA.md`), so
  the duplicate set is roughly 82.8% of the session per tracked security, not a
  fraction of a percent. At 518 securities that is **~167,000 extra rows a
  day**, which is the number the decision turns on and which nothing has
  written down.

  > **CORRECTED 2026-09-23 by this task's own measurement — the figure above is
  > the wrong one, and it is wrong in the direction that flatters the
  > decision.** **82.8% is the _stored SIP_ coverage** (`ALPACA.md` §5.2), not
  > IEX's. `LIVE-DATA.md`'s register **struck** it for the live feed on
  > 2026-09-16 in favour of a first-hand measurement over a full session:
  > **65.1% median per-symbol coverage**, 321 of 518 symbols producing a bar in
  > a given minute at the median — _"the live stream is materially thinner"_
  > (§7.6). So the live session is **~130,000 rows** rather than ~167,000,
  > against the **190,483** a real stored session holds (2026-09-11, measured
  > here). The bullet is left standing because it is what the split believed;
  > `LIVE-SESSION.md` §1 carries the corrected table, and this is
  > `CLAUDE.md`'s _measure rather than cite_ catching a citation one task after
  > it was written.

- **What that costs in bytes and in headroom**, against `BARS.md` §8.3's
  measured **199 B/row** (amended by Story 3.7's close) and §8.4's ~2.4-year
  plan. State the answer as a fraction of the plan, not as a raw figure.
- **What shape 1 destroys**, priced the same way: the IEX bar is the only record
  of what was observable live, and overwriting it leaves **no trace that the
  observation was ever made**. Epic 13's replay is built on the premise that it
  can be reconstructed, and `planning/epic-13-market-replay/EPIC.md` now carries
  a section saying so in as many words.
- **What shape 3 forecloses.** Memory-only makes Story 3.9's chart impossible to
  draw from anywhere — `LIVE-DATA.md` §10.3 declined to hold today's bars in
  memory (55.6 MB, 10.9% of the replica) **precisely because this story would
  hold them durably**, so shape 3 is not a cheaper version of this story, it is
  a re-taking of §10.3.

## The second decision, which is smaller and has a trap in it

**Served to everyone, or re-read only by the writer.** The trap is that
`GET /market-data/bars` has no notion of a caller, so "only the writer" is not a
serving rule — it would have to be a **storage** rule (a column, or a separate
table), which is shape 2's uniqueness question wearing a different hat.

What makes it a real question rather than a formality: a single venue's minute
bars are **honest but thin** (82.8% median coverage), and a user reading today's
chart from IEX-only bars sees a sparser session than the same chart tomorrow.
`PRODUCT_SPEC.md` §7.1's rule is that a reader must not be misled about
coverage — which the source note already enforces per stretch, and which is the
argument for serving it **with its label** rather than withholding it.

## Work

- **Take the row-count and byte figures above** against the local store and the
  real universe, in a rolled-back transaction or by arithmetic over
  `LIVE-DATA.md`'s measured coverage — whichever is cheaper. One table.
- **Settle decision 1 with the user**, with the recommendation stated and the
  alternatives priced. The repository's own position is recorded and should be
  quoted rather than re-derived: _historical market-data persistence is a record
  of what was observed, not a cache._
- **Settle decision 2 with the user**, and say which of the two it collapses
  into if the answer is "only the writer".
- **Open `LIVE-SESSION.md`** as this story's subject document — the file
  `CLAUDE.md`'s _Where the record lives_ will point at when the story closes —
  with §0 (if you read one section), the figures, and both decisions.
- **An ADR if decision 1 chooses shape 2**, because it changes what
  `0004_market_bars.sql`'s `market_bars_unique_bar` means and that migration
  recorded its uniqueness deliberately. An ADR is the amendment; the migration
  is immutable.
- Write the answer into Story 3.9's and Epic 13's files **the same day**, in
  words they can act on — both are named above and both already carry a section
  from Story 3.7's close.

## Done when

1. Both open decisions are settled with the user, with figures beside them
2. `LIVE-SESSION.md` exists and carries the decision, the alternatives and what
   each costs
3. If shape 2 is chosen, an ADR records it against `0004`'s decision
4. `pnpm links` resolves every reference added

---

## What was done — 2026-09-23

### 1. The figures, and one of them was not what the task file said

**A real stored session**, 2026-09-11, on the local store (48,797,343 rows):
**190,483 rows** across 518 securities, mean **367.7 bars** a security. That is
the nightly backfill's own product and the thing a live session would be
duplicating.

**A live IEX session** — not re-measured, because a first-hand measurement
already exists over a session in which 390 of 390 bar minutes were observed
(`LIVE-DATA.md` §7.6): **321 of 518 symbols** produce a bar in a given minute at
the median, and per-symbol coverage over the session is **65.1%** at the
median. That is **~130,000 rows** a session.

**The task file's own premise was wrong, and wrong in the flattering
direction.** It said IEX's median minute coverage is 82.8%. **82.8% is the
_stored SIP_ figure** (`ALPACA.md` §5.2); `LIVE-DATA.md`'s register **struck**
it for the live feed on 2026-09-16 in favour of the first-hand 65.1%, recording
that _"the live stream is materially thinner"_. The estimate in the split was
~167,000 rows a day; the real figure is ~130,000. The bullet is left standing
with a correction beside it, because it is what the split believed.

**This is `CLAUDE.md`'s _measure rather than cite_ catching a citation one task
after it was written**, by the person who wrote it, which is the only reason it
was caught at all.

### 2. What keeping both costs, stated as a fraction of the plan

| Reading                             | Today    | With both tapes | Change       |
| ----------------------------------- | -------- | --------------- | ------------ |
| Minute rows a year, 518 securities  | 47.7M    | **80.5M**       | **+69%**     |
| Storage a year at 199 B/row         | 8.66 GiB | **14.7 GiB**    | **+6.1 GiB** |
| Years to read-only, 22.5 GiB usable | ~2.6     | **~1.5**        | **−41%**     |

**And the funder is already in the table**, which is why the figure is not read
in isolation: `market_bars` is 9,097 MB (5,081 heap, 4,016 indexes) and
`market_bars_pkey` — the surrogate `id`'s index — is **1,045 MB with zero
scans**, re-read here against `BARS.md` §8.5's figure. Dropping it recovers that
and ~21 B a row thereafter, taking ~1.5 years to **~1.7**. It is **Epic 14's**
and is named rather than done.

### 3. The decision, and who took it

**Both tapes are kept**, and **a live-written session is served to every reader
with its label.** The owner was asked with the figures in the room and asked for
the recommendation instead, so both were taken by the developer and recorded as
such, with a reversal trigger that is a condition rather than a date.

The argument in one line, quoted from the repository's own position rather than
re-derived: _historical market-data persistence is a record of what was
observed, not a cache._ `PRODUCT_SPEC.md` §23 is what that protects — an
overwritten IEX bar leaves **no trace the observation was ever made**, so _what
was knowable at 11:07_ stops being answerable rather than becoming expensive.

The second decision collapsed on inspection: **"only the writer" is not a
serving rule**, because `GET /market-data/bars` has no notion of a caller. It
would have had to be a storage rule, which is the first decision wearing a
different hat. What makes serving it safe is that the source note already
enforces §7.1 **per stretch** — it names the venue and gives `iex` the sentence
saying it is one exchange rather than the whole tape.

### 4. The finding that reframes the story, and it was nearly silent

**Today's backfill would never have seen the collision.** `planRequests` skips
any session wholly inside the covered window:

```ts
if (session.open >= common.start && session.close <= common.end) continue;
```

and `commonCoverage` takes the **intersection** of `covered` across symbols. The
live writer extends coverage through `recordSeries` as bars arrive. So a writer
that claims today's session stops the consolidated version ever being
fetched — **the store keeps the thin IEX session, permanently, with no
collision, no error and nothing on any screen to see it.**

That is worse than any of the three shapes the story named, and it is what
happens **by default if nobody decides**. It is not a shape of the decision; it
is a second half of it that belongs to the **writer**, and it is now written
into the two tasks that can act on it: **Task 3.8.3** decides what the writer
claims as `coverage.covered`, and **Task 3.8.7**'s rehearsal asserts the
backfill **asked at all** — because a run reporting `0 fetches, 1 already held`
looks identical to a run that reconciled perfectly.

### 5. What was written, and where

- **[ADR 0035](../../../docs/adr/0035-both-tapes-are-kept-and-what-a-record-is.md)**
  — the decision, the two rejected alternatives with their prices, what it does
  not decide, and the reversal trigger. It is the amendment to
  `0004_market_bars.sql`'s uniqueness decision, which is an applied migration
  and immutable. Indexed in `docs/adr/README.md`.
- **[`LIVE-SESSION.md`](LIVE-SESSION.md)** — this story's subject document,
  opened with §0, the figures, both decisions and §3's writer half.
- **Story 3.9 and Epic 13**, the same day, in words they can act on. Story 3.9's
  is the sharper one: its two-feed sentence may **already be on screen** once
  Task 3.8.3 lands, so its scope needs re-reading rather than assuming, and the
  question of which row a chart draws when a minute holds two is handed to it
  explicitly.

### 6. Gates

`pnpm links` 0 broken over 399 documents and 1,492 cross-file links. No code
changed, so nothing else is in scope — `pnpm verify` and `pnpm test:database`
are unaffected and were not re-run for a documents-only change.

## For a stakeholder — a status report, 2026-09-23

**Where the product is.** The database can record which exchange feed each
stored price came from, and hold two feeds for one security. The next step is to
actually write the live trading session down, so that reloading a page during
the day does not throw away everything that has arrived since it opened. Before
writing a single row, this task settled the question that decides what the
product is allowed to remember.

**The question.** Our live feed comes from one exchange, IEX. Overnight, a
separate job fetches the same trading day from the **consolidated tape** — every
US exchange at once — which is more complete and sometimes simply different. So
what should happen to the live price we already saved?

**The decision: we keep both.** A price is a record of something we observed,
not a cache of the best number available. The alternative — letting the
overnight version overwrite the live one — is cheaper and gives a better chart,
but it destroys the evidence that we ever saw the live price at all. The
flagship feature of this product asks _"what was knowable at 11:07?"_ and
answers it using only what was available at that moment. Overwriting makes that
question unanswerable rather than merely expensive, and nobody looking at the
data afterwards could tell.

**What it costs, in plain terms.** Keeping both roughly **doubles** what we
store each day: about 130,000 extra prices, which is 69% more rows a year and
six more gigabytes. The database has about two and a half years of room at
today's rate; this brings that down to about **one and a half**. That is a real
price and we did not hide it — and there is an obvious way to pay some of it
back, already measured: an unused internal index is sitting in the same table
taking up a gigabyte and has never once been read.

**A second decision, smaller.** A day built only from one exchange is honest but
thin — about two-thirds of the minutes, measured. We will still show it, because
the page already labels where each part of a chart came from and says plainly
that IEX is one exchange rather than the whole market. Hiding it would mean a
reader sees yesterday's data all day, which is exactly the problem this story
exists to fix.

**Two things we found that nobody was looking for.**

- **The number this decision was about to be made on was the wrong number.** The
  plan quoted 82.8% coverage for the live feed. That figure is real, but it
  describes the _overnight_ feed; our own earlier measurement of the live one
  found **65.1%**, and had explicitly crossed the other one out. Using the wrong
  one would have understated this decision's cost by about a fifth.
- **The overnight job would never have noticed the conflict at all.** It skips
  any day it believes it already has — and once the live writer saves today, it
  believes exactly that. So the complete version would never have been fetched,
  and we would have been left with the thin one-exchange day, permanently, with
  no error and nothing on screen to show it. That is worse than any of the three
  options on the table, and it is what would have happened by default. It is now
  written into the two tasks that can prevent it.

**What a user can see today: nothing.** This task produced a decision and two
documents. The visible payoff is two tasks away, and it is the one worth
waiting for: reload a page during the trading day and the chart still reaches
the moment you were looking at.
