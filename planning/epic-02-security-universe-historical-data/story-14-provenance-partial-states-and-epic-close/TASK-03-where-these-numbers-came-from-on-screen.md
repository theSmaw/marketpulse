# Task 2.14.3 — Where these numbers came from, on screen, per series

**Status:** Complete — 2026-09-14
**Story:** [2.14 Market-Data Provenance, Partial States & Epic Close](STORY.md)
**Depends on:** 2.14.1, 2.14.2

> **Amended 2026-09-14 by Task 2.14.1.** Three things this task left open came
> back decided, and one of them moves the surface:
> [`PROVENANCE.md`](PROVENANCE.md) §1.3 puts the provenance on a **new
> `SourceNote` component at the foot of the Security Explorer**, not under the
> plots and not on `BarSeriesPanel`. `BarSeriesPanel`'s existing two-feed
> condition is **confirmed and untouched**. Retrieval time and the adjustment are
> **in**, and both are `SourceNote`'s. The task below is edited in place; the
> shape of the work is the same size, in a different file.

## Objective

Make the Security Explorer's numbers carry their own provenance: which feed each
source is, whether the prices have been adjusted, and — decided — when they were
retrieved. Ship the sentence for a series whose sources disagree about feed, even
though nothing can produce one yet.

**The vehicle is a new component, `SourceNote`**, one per screen, at the foot of
the region group, governed by §1.3's rule: **it states what the chrome cannot,
and never repeats what the chrome can.** That rule is what keeps it one line
instead of five, and it is the thing to check this task against — a clause that
restates the masthead does not belong in it.

This is the task acceptance criterion 1 turns on: _a user looking at any market
number can see which feed it came from, without hovering._

## What the user can see when this lands

**At the foot of the Security Explorer, the product says what has been done to
these prices and when they were fetched** — in words rather than an acronym, for
the first time on a screen that holds actual figures rather than a status strip.
The chrome has claimed a feed since Task 2.6.7; from here the **page** says the
three things the chrome can never say about a particular answer.

**Be accurate about the screenshot claim when reporting this**, because the
original phrasing overstates it and §1.2 says why: nothing short of a mark inside
the plot frame survives a crop, and that mark is refused. What lands is _on the
page with the number_, which is the form of the argument that survives.

## What is already decided and must not be re-taken

- **`MARKET_FEED_DESCRIPTIONS` owns the words.** Read them; do not re-word them
  here. A renderer deriving a user-facing sentence from a slug plus a table of
  its own is the copy that drifts, and the `Record<MarketFeed, …>` annotation on
  that record is the thing that makes a feed added without words a compile error.
  (It was `as const satisfies` until `sentence` became optional; the guard is
  unchanged, the spelling is not.)
- **A feed gets a sentence when its label cannot stand alone** (ADR 0019 §3).
  `IEX` does; `All US exchanges` does not. Inherited, not re-argued.
- **Provenance rides on the series and names a list of sources.** The existing
  code takes the **distinct feeds** from `series.provenance.sources`, which is
  the right shape: two sources naming one feed is one fact, not two.
- **Nothing here is red or green**, and `synthetic` keeps its amber, its square
  and its sentence.

## Work

- **Do not touch `BarSeriesPanel`'s condition.** It renders its feed line only
  when `feeds.length >= 2`, and §1.3 **confirmed** that: the panel is the right
  place to draw a mixed series when the series is mixed, and it correctly draws
  nothing when one page-level label is already true. Deleting it would leave
  `SourceNote` as the only reader of a fact the panel is better placed to show.
- **Build `SourceNote`** — `apps/frontend/src/components/SourceNote/`, with the
  assembly in `source-note.ts` as a pure function over the two views, so it is
  unit-testable with no DOM. Its clauses, in §1.3's table: the series' feeds
  (**only** when they number more than one, or when the one feed is not what
  `useMarketFeed` reports configured — both unreachable today and both true from
  Epic 3); the adjustment, always; the retrieval, always. Task 2.14.4 adds the
  fourth clause to this same component.
- **It renders nothing when `bars.length === 0`** — §0.1, and it is the rule that
  caught itself: `SOURCE_OF_NOTHING` hands a renderer a complete, truthful
  provenance record describing **zero bars**, and printing it under an empty frame
  is four accurate words making a false impression. This is a real state; it needs
  a story, not just an early return.
- **The two shared vocabularies go in `packages/shared/src/market-provenance.ts`
  in this task.** `ADJUSTMENT_DESCRIPTIONS` as a `Record<Adjustment,
ProvenanceDescription>` — `raw` → **Unadjusted** with _"Prices as they printed.
  Not restated for stock splits."_, `split-adjusted` → **Split-adjusted** with
  **no sentence**, which is ADR 0019 §3's rule doing work rather than being
  applied uniformly. `MarketFeedDescription` generalises to
  `ProvenanceDescription`; the feed name stays as an alias so the sentence rule is
  stated once rather than twice.
- **The adjustment is per series and the type already enforces it.** §4.1: it
  sits on `SeriesProvenance` and not on `BarSource`, and `mergeSeriesProvenance`
  refuses to join two. The trap the original bullet warned about — one fact
  repeated per source — has no day on which it is not. Do not render it per
  source.
- **Retrieval time, and the original warning is narrower than it was written.**
  It is stamped at fetch and **never re-stamped on read**, so for a fully-stored
  series it does not move between requests; it moves when a tail is fetched. Two
  consequences to honour anyway: it stays out of `Figures`' `settleSignature`,
  which deliberately excludes it so a refetch does not flash the panel, and
  `SourceNote` is **outside the panel's live region**, so a moved timestamp
  never announces a page as changed.
- **Write the two-feed sentence, and reach it honestly.** It goes in the module
  2.14.1 named. It is reachable from a **story** built on a body the fixtures can
  justify, and the story says in its own text that no server has yet sent one and
  why (Epic 3's IEX socket is the first). Do not hand-edit a recorded fixture
  into claiming a pairing no server produces — `stitched.json` names two sources
  that both name `sip`, and that is a fact about this plan rather than a gap in
  the corpus.
- **Invariant 6's fence.** With two feeds on screen the reader must not be able
  to conclude that one venue is the whole tape. That is a wording requirement on
  the _stitched_ sentence specifically, and it is the reason 2.14.1 forbade
  collapsing to whichever feed is first.
- **Stories for every permutation**, in a `SourceNote.stories.tsx` grid built the
  way `BarSeriesPanel`'s `AllPermutations` is — one grid, every state side by
  side, because a state outside the grid is a state nobody looks at twice. The
  states: one feed, two feeds, a feed that is not the configured one, both
  adjustments, and the **no-bars** case that renders nothing.
- **Component tests assert the concatenation a screen reader is handed**, not a
  single element's text: this panel splits its sentences across elements, and
  `CLAUDE.md`'s rule exists because of exactly that shape.

## Done when

- Every market number on `/securities/:symbol` has visible provenance without
  hovering, at the placement §1.3 settled and 2.14.2's canvas drew.
- **`SourceNote` repeats nothing the masthead says.** This is the acceptance test
  for §1.3's rule and it is read rather than asserted: put the two on one
  screenshot and check no fact appears twice.
- The two-feed sentence exists, names the split in contribution order with the
  bar counts, is reachable from a story, and its story says what cannot produce
  it yet.
- The no-bars case renders **nothing** and is in the grid as a state.
- `ADJUSTMENT_DESCRIPTIONS` exists with its `Record<…>` guard; adding a member to
  `ADJUSTMENTS` without words is a compile error.
- The grid covers every new state; `pnpm stories` passes.
- `pnpm probe /securities/NVDA --within Price` was run and **looked at** before
  any suite — the panel is the most crowded surface in the product and this task
  adds to it.
- `pnpm verify` passes and the frontend suite is green.

## Notes

The failure mode to watch for is not a bug. It is a screen that is now correct,
complete, honest and unreadable. If the probe screenshot shows four grey
sentences stacked at the foot of the page, the fix is in 2.14.2's canvas, not in
a `font-size`.

The second failure mode is subtler and §1.3's rule exists for it: a note that
restates the masthead. `Market feed: All US exchanges` appearing twice on one
screen is not redundancy a reader forgives — it teaches them that the small type
is not worth reading, which is the harm ADR 0019 §3 turned on.

---

## What was done

**`SourceNote` exists and the Security Explorer draws one**, at the foot of the
region group and above the tracked universe, on the page ground, in the micro
type. Two clauses today — what has been done to these prices, and when they were
fetched — plus the feed, on the two conditions §1.3 settled.
[Task 2.14.4](TASK-04-the-curated-files-age-and-what-alpaca-did-not-tell-us.md)
adds the third clause to the same component and changes one field in one record.

### Where every string ended up, against §9's table

| What                                     | Where                                                            |
| ---------------------------------------- | ---------------------------------------------------------------- |
| `ADJUSTMENT_DESCRIPTIONS`                | `packages/shared/src/market-provenance.ts`, with its `Record<…>` |
| `describeSeriesFeeds` (the §2 structure) | the same file, beside `MARKET_FEED_DESCRIPTIONS`                 |
| `distinctSeriesFeeds`                    | the same file — extracted, see below                             |
| the note's assembly                      | `components/SourceNote/source-note.ts`, pure, no DOM             |

`MarketFeedDescription` generalised to `ProvenanceDescription` and stayed as an
alias, so _a sentence appears when the label cannot stand alone_ is stated once
for both vocabularies rather than twice. `split-adjusted` has no sentence and a
test asserts that it does not, because that is the rule doing work rather than
being applied uniformly.

**`distinctSeriesFeeds` was extracted rather than written a fourth time.**
`BarSeriesPanel`, `chart-alternative.ts` and the note each computed
`[...new Set(sources.map(s => s.feed))]` separately. `feedClause` now reads the
same structure the note does, so the spoken claim and the visible one are the
same facts in two media — which is §9's guard for that row, and was the one part
of it that had no reader yet.

### `BarSeriesPanel` untouched, as instructed

Its `Provenance` still renders only at two distinct feeds, and §74.1's argument
is unchanged. The one edit to that file is the shared helper replacing its own
`Set`.

### Three decisions this task took, each found by building it

1. **Suppression requires a positive match.** §1.3's table said neither feed
   condition could fire today; the second one fires on the **default**
   deployment, because `MARKET_DATA_PROVIDER` defaults to `none` and the store
   serves bars anyway. Suppressing there would leave a screen of prices with no
   feed claim anywhere, which is §35 reached by the rule meant to prevent
   duplication. Amended in [`PROVENANCE.md`](PROVENANCE.md) §1.3 with the two
   consequences, the second of which is the better outcome: **the duplication the
   rule exists to prevent is now structural** — the note's condition is the
   negation of the chrome's, so the two cannot both print `All US exchanges`.
   `checking` is the one state that suppresses without a match, to avoid a row
   that appears on the first frame and is taken away.
2. **The retrieval date is a range when the stretches were fetched on different
   days.** Naming only the newer date claims the whole picture is that fresh;
   naming only the older claims it is that stale. The recorded stitch produces
   one — `8–10 September 2026` — so this is the ordinary multi-source shape
   rather than a hypothetical.
3. **The bar count is drawn only where there is a split to measure.** The count
   exists to make _whichever feed is first_ visibly wrong; one stretch has no
   split, and the panel above already says how many bars are held. Drawing it
   anyway was the note repeating a fact another surface owns — §1.3's rule broken
   in the direction hardest to notice.

### What looking at the page found, and nothing else could

`pnpm probe` and a screenshot of the foot of the page, before any suite, as the
working loop says. Two defects, both invisible to every test that was green
around them:

- **`Unadjusted · Retrieved 8 September 2026 Prices as they printed.`** set as
  one run collides a date with the capital letter of the sentence after it. The
  sentence now hangs under its line. jsdom applies no stylesheet, so every
  component test read the same correct strings against the unreadable layout.
- **The one-row ledger's label sat eight pixels right of the value below it**,
  because the row still paid the count column's gap after the count came off.

A third was found by the **test** rather than the page, and is worth recording
because it is the shape `CLAUDE.md` warns about: asserting the ledger's `dd`
whole produced `All US exchanges90 bars`. That is what `textContent` does at an
element boundary and is not what a listener gets — a list item is its own
announcement. So the helper in `SourceNote.test.tsx` walks the tree the way the
accessibility layer does, skipping `aria-hidden` subtrees and spacing element
boundaries, and the ledger is asserted row by row. A separator added to satisfy
the naive concatenation would have been punctuation on screen for a test's
benefit.

### The two-feed case, reached honestly

`twoFeedStitchView()` in `fixtures/bar-series.ts` — the recorded stitch with its
tail's `feed` set to `iex`, through the real transition. It is named as the one
derivation in a module of recorded bodies, it carries why a hand-edited
`stitched.json` was refused, and it says what deletes it: the day Epic 3 records
a real two-feed body. `BarSeriesPanel.test.tsx` had the same one-field edit
inline and now reads the shared one, so there is one spelling rather than three.

### Gates

`pnpm verify` green — 34 components, 34 stories files; 902 frontend tests, 255
shared, 684 backend; `pnpm links` 311 documents, 1,090 links, 0 broken. Four
browser specs run scoped and green at 41 passed, 2 skipped, including
`security-explorer-shell.spec.ts`'s **axe run at 640px**, which is the
accessibility gate over the surface this task added. The full suite was not run
locally; the required `e2e` check runs it on the pull request, and CI's store is
518 securities and zero bars, where this component correctly renders nothing.

**Two entries added to [`docs/GAPS.md`](../../../docs/GAPS.md)**: that the
two-feed ledger's claim is correct and unproducible, and that a fifth clause
restating another surface is caught by a reader applying the grain table and by
nothing else.

**What the user can see:** at the foot of `/securities/NVDA`, in words rather
than an acronym, what has been done to these prices and when they were fetched —
the first time a screen holding actual figures has said either. **What they
still cannot do:** watch a price move. There is no live data, and the two-feed
sentence has no producer until there is.

---

## For the stakeholder — what this actually was, in plain words

Until today, MarketPulse showed you a price chart and told you nothing about
where the numbers in it came from. There is a small strip at the top of the
window saying which market feed the _application_ is wired to — but that is a
fact about the installation, not about the chart you are looking at. It cannot
tell you whether these particular prices have been restated for stock splits, or
when we last went and fetched them. Neither could anything else. Three of the
four things worth knowing about a number on that screen were either spoken only
to screen-reader users or simply absent.

**Now there is one line at the foot of the page that says them.** It reads, in
full: _Prices — Unadjusted · Retrieved 8 September 2026. Prices as they printed.
Not restated for stock splits._

That last sentence is the part worth explaining, because it is the one that will
matter. A "stock split" is when a company turns one share into ten; the price
drops by 90% overnight and nobody has lost anything. Most data providers quietly
rewrite their history so the chart looks smooth. We do not — we store what
actually printed. That is the right choice for a product whose job is to
reconstruct what was knowable at a moment in time, and it is completely invisible
and completely harmless right up until the day somebody looks at a window that
contains a split, sees a cliff in the chart, and has no way to know whether it
was a real event or an artefact of our storage. One line of small print is the
difference between a user who understands what they are looking at and one who
doesn't. It costs us almost nothing to say it now, and it cannot be retrofitted
into a screenshot somebody has already taken.

**The harder half of the work was deciding what _not_ to say.** This is a screen
with a chart, a volume plot, four prices, a time-window control and an identity
block on it. Five separate true statements about provenance were queued to land
here over the next few tasks. Added one at a time, by different people on
different days, they become a stack of grey footnotes — and a stack of grey
footnotes teaches people that the small print is not worth reading, which is
worse than saying nothing. So the rule, which was drawn on a design canvas before
any of it was built: **the note says what the top strip cannot, and never repeats
what it can.** On the live site every price comes from the feed the strip already
names, so the note says nothing at all about feeds. It is one line, not five.

Three things changed while building it that are worth reporting, because each was
a small wrongness that only showed up on the actual screen:

- **The rule needed a correction on day one.** We had written that the note would
  never need to name a feed today. It does — on any installation where no live
  data provider is configured, which is the default and is how the product runs
  on a developer's machine. There, the top strip says "not configured" and says
  nothing about a feed, while the stored prices are perfectly real. If the note
  had stayed quiet too, a page full of prices would have carried no statement
  anywhere about where they came from, which is precisely the thing this product
  promises not to do. The rule is now: stay quiet only when the strip is naming
  _this_ feed correctly. A pleasant side effect is that the two surfaces are now
  structurally incapable of printing the same fact twice — the note's condition
  is the exact opposite of the strip's — so the thing we were guarding against by
  eye is now guarded against by construction.
- **"When we fetched this" is sometimes two answers.** A chart can be built from
  bars we stored last week plus a few we fetched this morning. Saying "retrieved
  this morning" would make the older half look fresher than it is; saying "last
  week" would make the newer half look staler. It now says a range when they
  differ, which is the only spelling that is true of every number on the screen.
- **Two things we wrote were unreadable, and only looking at the page found
  them.** A date running straight into the next sentence, and a line eight pixels
  out of alignment with the one below it. Every automated test was green across
  both, and always would have been — the test environment draws no layout at all.
  Thirty seconds with a screenshot found both. That is now the second time this
  month that habit has paid for itself.

**Where this leaves the product.** Epic 2 has been about making one security's
history real — the data, the charts, the windows. This task is part of making it
_checkable_, which is the foundation the whole of MarketPulse rests on: the
premise is that an AI investigates a market move and a human can audit its
evidence, and evidence you cannot trace is not evidence. There is also a piece of
deliberate forward work in here. The note already knows how to describe a chart
built from two different data feeds, naming each stretch with how many bars it
contributed — a shape no part of our system can currently produce, because we
only have one historical feed. It becomes real the moment the live market
connection lands in Epic 3, when a chart genuinely becomes "yesterday's official
consolidated tape, plus the last twenty minutes from a single exchange". A
reader must not be allowed to mistake that for full market coverage. The wording
that prevents it is written, drawn, tested and on screen ahead of the thing it
describes — which is cheaper than discovering the problem with a live feed
already running.
