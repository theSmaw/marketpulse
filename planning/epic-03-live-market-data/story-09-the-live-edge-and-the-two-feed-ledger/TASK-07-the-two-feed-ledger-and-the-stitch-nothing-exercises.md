# Task 3.9.7 — The two-feed ledger, and the stitch nothing exercises

**Status:** **Complete — 2026-09-24.** Criterion 1 was **already met at the route level for both paths** and is struck rather than rebuilt. What this task actually did is criterion 4: **`twoFeedStitchView()` is deleted and the two-feed state has a RECORDED body** — 60 `sip` minutes then 30 `iex`, read off this product's own server against its own store. And criterion 3's harder half is now a check with a break behind it: **`All US exchanges` has exactly one producer**, so no live stretch can be given Epic 2's word.
**Story:** [3.9 The Live Edge on the Chart & the Two-Feed Ledger](STORY.md)
**Depends on:** 3.9.1

## Objective

Criteria 2, 3 and 4. **Most of the drawing may already be done** — Task 3.8.3
photographed the two-feed source note from real stored rows and Task 3.8.8 read
it clause for clause against `VISUAL-LANGUAGE.md` and found it matched. What is
certainly **not** done is the obligation the re-order created.

## What the user can see when this lands

**A source note that tells the truth about a split series, on real data** —
the stretches in contribution order with their counts, the consolidated tape for
the stored part and a single named venue for the live part, with the sentence
saying what a single venue is. Possibly unchanged from what Story 3.8 already
drew, in which case this task says so and proves it rather than redrawing it.

## The obligation this story acquired when it moved behind the store

Written into this story's file at the re-order and worth restating, because it
is the whole content of this task:

> prove the read-time stitch **as well as** the stored path, because the stored
> path is now the one a user sees and the stitch is the one the provenance
> design was built for. If only one of them is exercised, the other is a claim
> nothing checks.

`mergeSeriesProvenance` now has **three** routes into it — the stitch, the
stored two-tape read (Task 3.7.5), and `twoFeedStitchView()`. The first is
exercised by nothing user-facing.

## And the narrowing Story 3.8's close found, which this task must honour

A served window's `sources` describe **the rows the answer contains**. The read
prefers `sip` where a minute holds both tapes and the nightly backfill covers
every regular-session minute — so on a deployed store the two-feed state is
**mid-session**, or extended hours, and collapses to one source overnight
(`LIVE-SESSION.md` §14). Every assertion, screenshot and rehearsal of it has a
window, and the window closes when the backfill runs.

## Criterion 4, which is a deletion

`twoFeedStitchView()` is the recorded stitch **with one field changed** — a
state somebody typed rather than one the system produced — and it has three
readers. It goes, replaced by a **real recorded body**, in the fixture idiom
`src/fixtures/alpaca/` already holds: raw, unformatted, excluded from Prettier
and from line-ending normalisation, **because both rewrite evidence**.

`scripts/session-watch.mjs` was taught to capture exactly this during Story
3.8's close: the first poll that sees more than one **tape** writes the raw
response byte for byte. Check `.capture/session/` before asking production for
another one — and note the trigger is distinct tapes rather than stretches,
because Epic 2's read-time stitch already produces two `sip` stretches and a
recording of _that_ would be the wrong state wearing the right shape.

## Work

- Establish what is already drawn, with a photograph, before changing anything
- A test that exercises the **read-time stitch** end to end and names its two
  stretches, so the path the provenance design was built for is not a claim
- `twoFeedStitchView()` deleted and its three readers pointed at the recorded
  body; `pnpm invariants` gains a grep that goes red if it comes back, with a
  `pnpm break` entry
- Criterion 3's harder half checked by walking the producers rather than by
  rendering a state: **`All US exchanges` appears nowhere on a live tail**

## Done when

1. A two-feed series names both stretches in contribution order with counts,
   from both the stored path and the stitch
2. `twoFeedStitchView()` is gone, with a check and a break behind its absence
3. Epic 2's word cannot reach a live stretch, proved by a check

## What was done — 2026-09-24

### Criterion 1 was already met, at the route level, for BOTH paths

Checked before building anything, which is this story's habit by now:

- **The stored path** — `market-data.test.ts`: _serves a stored window spanning
  two tapes as two sources in order_, through `app.inject()`, asserting
  `["alpaca","sip",…]` then `["alpaca","iex",1]`.
- **The stitch** — the same file, a few tests down: a provider that _declares
  `iex` where the store holds `sip`_, merged by `serveSeries`. And
  `serve-series.test.ts`'s _returns one series spanning both halves, with both
  feeds and summing counts_ asserts `["sip","iex"]` with `[2, 2]`.

So the sentence this task was built around — _the stitch is exercised by
nothing_ — was about the **product**, not the tests, and Task 3.9.1 had already
answered the product half: the stitch runs mid-session for a **thin** security,
whose last stored bar is older than the vendor's sixteen-minute clamp. Criterion
1 is struck as met, with the tests named.

### Criterion 4 — the deletion, and the body that replaces it

`twoFeedStitchView()` took `stitched.json` — **two `sip` stretches**, both
halves from Alpaca's historical API — and changed the second's `feed` to `iex`.
It was admissible when it was written, and it asserted something **by
construction**: that a two-**tape** record looks exactly like a two-`sip` one
with a different letter in it. Nothing checked that, and five files drew their
split-series states from it.

**There is a real one now.** `apps/frontend/src/fixtures/bar-series/two-feed.json`,
recorded from this product's own `GET /market-data/bars`:

```text
sources: [ alpaca/sip  ×60  retrieved 2026-09-14T00:17:09.674Z ]
         [ alpaca/iex  ×30  retrieved 2026-09-14T13:31:07.412Z ]
bars:      90, 2026-09-11T19:00Z → 2026-09-14T13:59Z
```

**How it was produced, because a fixture's provenance is part of the fixture.**
Thirty `iex` rows were written into a developer's store for a session the
backfill had not reached, the running server was asked for a window spanning
both, and the rows were removed again — the shape Task 3.8.3 used, for the same
reason, and the store was confirmed back to `covered_end 2026-09-11 20:00`,
`bar_count 99090`, **zero `iex` rows**. Every byte of the provenance is the read
path's own work: `toStoredSeries` walked the rows, started a new stretch where
the tape changed, and joined the two through `mergeSeriesProvenance`.

**A deliberate deviation from this task's own instruction.** It says the
recorded body goes in `src/fixtures/alpaca/`'s idiom — raw, unformatted,
excluded from Prettier. That idiom is for **vendor** bodies, where formatting
would rewrite evidence of what a third party sent. This is **our own API's**
response, and the frontend's `bar-series/` directory formats those, by a
decision `.prettierignore` records. Consistency with its sixteen siblings wins;
the recording is no less real for being pretty-printed, because we are the
party that sent it.

**Two tests changed their numbers, which is the point rather than a cost.**
`source-note.test.ts` asserted `[60, 90]` and `SourceNote.test.tsx` expected
`90 bars IEX`. Ninety was the count of a **consolidated tail** wearing an `iex`
label. The real body says **30**.

### The check behind the absence, and one it caught about itself

`pnpm invariants` gains `the-two-feed-state-comes-from-a-recorded-body`, with
`pnpm break the-two-feed-state-is-typed-again`.

**Its first draft grepped for the name and went red on the fixture's own
comment explaining why the function is gone** — the paragraph most worth
keeping. It greps for the **declaration** now. A check that forbids its own
explanation is a check that gets deleted.

### Criterion 3's harder half — one producer, walked rather than rendered

> `All US exchanges` appears nowhere on a live tail

**Rendering a state cannot prove an absence**: it proves that _one_ state does
not say it. What can be proved is that the string has a **single producer** and
every consumer reads through it — so `the-consolidated-word-has-one-producer`
asserts the literal appears in exactly one place that produces a value, `sip`'s
`label` in `MARKET_FEED_DESCRIPTIONS`, with comments read out first because the
argument for the words is worth keeping and is not a producer.

`pnpm break a-live-stretch-gets-epic-2s-word` introduces a second producer in
`source-note.ts` and goes red on `is produced in 2 place(s)`.

**25 invariants now**, two added here.

### The canvas

`Provenance and the empty answers.dc.html` carried an honest caveat — one branch
of the note had **never executed against a recorded body**. It named the
**synthetic** feed, which is unchanged and still cannot be honestly faked. What
is closed is the neighbouring one, and the canvas now says so: the two-feed
branch was drawn from an **edited** body for two epics and is drawn from a
recorded one now.

### What is still owed, and it is not this task's

**A photograph from a DEPLOYED store.** Everything above is a developer's store
and the product's own code. `LIVE-REHEARSAL.md`'s 3.8 row still owes the
mid-session photograph, and Story 3.8's close established the window is narrow:
after the nightly backfill a regular-session window collapses to one `sip`
source, so the picture has to be taken while the market is open.

## For a stakeholder — a status report, 2026-09-24

### What this was

**Our charts tell you where their numbers came from. Until today, the picture we
had been designing that against was partly made up.**

When a chart is built from two different data sources — the full market tape for
the history, our own live feed for today — it lists both, in order, with how
many minutes each contributed. That is a trust feature, and it is the one thing
our own product rules most insist on: never imply we have coverage we do not.

The problem was quiet. **We had never had a real example of that split to design
and test against**, because until three weeks ago this product had no live feed
at all. So we built one: we took a genuine recording of a chart with two
_identical_ sources and changed one word in it, to make it look like a split.

### Why that mattered more than it sounds

That stand-in **assumed the answer to the question it was there to check**. It
asserted, by its very construction, that a real two-source record looks exactly
like a same-source one with a different label. Nobody had ever verified that,
and five different tests and design examples were built on top of it.

**Today we replaced it with the real thing.** We wrote thirty minutes of
live-feed data into a developer's database for a day our overnight job had not
yet reached, asked our own server for a chart spanning both days, and kept
exactly what it sent back: sixty minutes from the full market tape, then thirty
from the single-exchange live feed, in order, with their counts. Then we removed
the temporary data and confirmed the database was back to precisely where it
started.

**Two of our tests changed their expected numbers as a result** — one of them
had been expecting "90 minutes from the live feed" when the real answer is 30.
Ninety was the count of a _market-tape_ stretch wearing a live-feed label. That
is the stand-in's assumption showing up as a number, and it is exactly what we
wanted to flush out.

### And a guard so it cannot come back

The fake is deleted, and an automated check now refuses to let it return —
together with a test that deliberately re-introduces it to prove the check
works.

**That check caught something about itself first.** Our first version searched
for the old name anywhere in the file, and it went red on our own _explanation
of why the thing is gone_ — which is the paragraph most worth keeping. A rule
that forbids its own explanation is a rule somebody deletes. It now looks for
the code rather than the words.

### A second guard, for the claim that matters most

Our rules forbid labelling one exchange's data as the whole market. Proving that
by looking at a screen only proves that _one_ screen does not do it.

So instead we check the **source**: the phrase "All US exchanges" may be
produced in exactly **one** place in the entire codebase. A second one is how a
single venue's data comes to be labelled as the whole market — in the one place
a reader would never think to check. There is a test that adds a second one on
purpose and confirms the alarm sounds.

### What we had already done without realising

Before building anything we checked what was already covered, and found that
**both data paths were already fully tested** — the stored one and the
stitched-together one. That half of the task was struck rather than rebuilt.
This is the fourth task in this story where looking first removed work.

### Where the product stands

**Six of nine tasks done.** What you can see: charts that extend live, readable
by mouse and keyboard, that tell you truthfully where each part of their data
came from — and, as of today, that claim is tested against something a server
actually sent rather than something we typed.

**What is still owed:** a photograph of that split chart from the _live_ site
during trading hours. Our data is honest about this: the split only exists while
the market is open, and disappears overnight when our full-market job fills in
the gaps.
