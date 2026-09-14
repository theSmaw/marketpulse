# Task 2.14.5 — Through when, and the pass over every string that could imply the whole market

**Status:** Done — 2026-09-15
**Story:** [2.14 Market-Data Provenance, Partial States & Epic Close](STORY.md)
**Depends on:** 2.14.1, 2.14.3

> **Amended 2026-09-14 by Task 2.14.1.** Decision 3 is settled narrowly — the
> sentence appears **only** when the answer is short of the window asked for, and
> it is **one function** feeding both the visible rendering and the spoken one
> ([`PROVENANCE.md`](PROVENANCE.md) §3). The document half of the coverage sweep
> has also already been done (§8.2), so the pass below is the **user-facing
> string** half and should not redo it. And the pass's own target moved: the live
> hazard is **acceptance criterion 2**, not this story's struck-through prose.

## Objective

Two halves of one claim.

**First**: say what period is on screen and **through when** the data runs —
§36's _"displaying data through 10:42:17"_ shape, static here and continuous in
Epic 3. Decision 3 settled it narrowly: **bound to `partial`, and not otherwise.**
Under a `loaded` chart the axis already ends where the data ends, so the sentence
would restate the picture — which is the padding ADR 0019 §3 rejected in a
neighbouring case. Under a `partial` one the picture says _something is missing_
and _it stops here_ and cannot say **when**, and the instants are exactly what a
session-ordinal axis cannot give back.

**Second**: the coverage-honesty pass. Read **every user-facing string this epic
added** and check that none of them states or implies full US-market coverage
where the product does not have it, and — since 2026-09-07 — that none of them
_understates_ it either, because stored bars are the consolidated tape and a
disclaimer on them is also a false claim. This is acceptance criterion 2, and it
says explicitly: _checked by reading every string, not by intent._

## What the user can see when this lands

**How current the numbers are, without working it out from an axis.** The
Security Explorer already says which window it is showing; after this it says
what that window actually contains and where it stops — which is the difference
between a chart and a chart an analyst will quote.

## What is already decided and must not be re-taken

- **The coverage rule is settled and it is geometric**, not textual: a mark
  derived from the **window** runs the full frame, a mark derived from the
  **bars** stops at the coverage edge (ADR 0027, `CHARTING.md`). This task adds
  words about coverage; it does not re-decide what the picture does.
- **A named window ends at the last session whose bell has rung** (ADR 0028,
  amended 2026-09-14). Any sentence about "through when" must agree with that,
  or the page contradicts its own axis before the open.
- **The store's lag is answerable and already answered.**
  `GET /diagnostics/freshness` computes _how many trading sessions behind_ on
  request — it has no schedule to miss — and `check-deployed.mjs` already fails
  on it after a merge. If a sentence needs to know whether the store is behind,
  that is the thing that knows.
- **Two stores photograph differently and both are correct.** The deployed store
  answers the default window in full; a developer's answers it short; **CI's has
  zero bars**. A sentence about recency reads differently in all three, which is
  the constraint on how it is asserted (`pnpm store:bare` reproduces the third).

## Work

- **Implement decision 3's form**, wherever 2.14.2 placed it, and make it read as
  a statement of fact rather than a warning. Nothing has gone wrong: a historical
  chart that ends yesterday is a correct historical chart. §36's sentence has an
  alarm in it because something disconnected; this one must not borrow the alarm.
- **One function, two readers, and this is the half worth more than the
  decision** (§3.2). The phrase lives in
  `apps/frontend/src/components/BarSeriesPanel/series-facts.ts` and is read by
  **both** the visible rendering and `series-announcement.ts`. That sentence is
  assembled inside the announcement module today; writing a visible copy beside it
  would be two vocabularies for one fact, which is the drift
  `MARKET_FEED_DESCRIPTIONS` exists to prevent one layer up.
- **It is not a `SourceNote` clause**, and the distinction is worth stating
  positively: the note answers _whose numbers are these_, and a reader asking
  _how much of my window did you answer_ is asking about the **request**. §6.3's
  placement constraint applies instead — it is a statement about what the picture
  is of, so it may not come after the picture.
- **The threshold option was weighed and declined**, so do not reach for
  `GET /diagnostics/freshness` here. It answers _how many sessions behind is the
  store_ — a per-**store** fact — and putting it under a per-series chart answers a
  question nobody asked, at the cost of moving its type into `packages/shared`,
  adding a fetch and inventing a threshold nobody measured. The reversal trigger
  is Epic 3's: the first reader that must tell _we hold all of it_ from _all of it
  that exists so far_.
- **The sentence must survive the three stores.** Full, short and empty. The
  empty case belongs to `ChartVacancy` (2.14.6) and this sentence must not
  duplicate it — one absence explained twice in two voices is worse than either.
- **The document half of the sweep is already done — do not redo it.** §8.2
  grepped every Markdown file in the tree for `IEX` and found `CLAUDE.md`,
  `PRODUCT_SPEC.md` §7.1, `README.md`, `UNIVERSE.md` and `EPIC.md` all already
  correct about the asymmetry. What is owed here is the **user-facing string**
  half, which is a different corpus and has never been read.
- **Then the pass, and do it as a pass rather than as a memory.** Enumerate the
  strings mechanically: every user-facing literal added by Stories 2.3 through
  2.13, plus `MARKET_FEED_DESCRIPTIONS`, `SECTOR_LABELS`, the vacancy copy, the
  rail, the failure sentences, the announcements (which are strings a user
  _hears_ and are the ones most likely to be skipped), the page titles and
  `README.md`'s description of what the product shows.
- **And this story's own strings, which is the correction that matters most**
  (added 2026-09-14 by Task 2.14.3). The corpus above stops at Story 2.13, and
  **the strings most exposed to criterion 2 are the ones this story is adding** —
  a pass that read every sentence in the product except the new ones about
  coverage would be the wrong way round. Four additions to read, three of them
  already shipped:
  - `ADJUSTMENT_DESCRIPTIONS` — two labels and one sentence, in
    `packages/shared/src/market-provenance.ts`;
  - `SourceNote`'s own clause labels and the phrases around them — `Source` /
    `Sources`, `Prices`, `Retrieved …`, and the word `bars` in the ledger;
  - **`chart-alternative.ts`'s `feedClause`, whose wording changed**: it now says
    `Stitched: 60 bars from All US exchanges, then 90 from IEX.` where it said
    `Market feeds: …`. It is **spoken only**, which puts it squarely in the class
    this bullet calls the most likely to be skipped, and it is a sentence about
    coverage;
  - ~~Task 2.14.4's classification wording, if that task has landed first.~~
    **It landed 2026-09-14, and the conditional is resolved — four strings, and
    they are the most-seen additions in the epic.** `Classification` as a term,
    `Sector and industry are curated, not from the market feed.`,
    `Last checked 8 September 2026`, and — reachable from no server today —
    `When they were last checked is not recorded.` The reason they matter most to
    this pass is not their wording but **where they appear**: the clause reads
    the universe answer rather than the bars, so it draws on **every** security
    page including one holding no bars at all, which is every page CI renders.
    Judge them in the direction this corpus is most likely to get backwards: this
    is a **disclaimer**, and the second failure direction asks whether it
    disclaims coverage the product actually has. It does not — sector and
    industry genuinely are ours and genuinely are not from the market feed — but
    that is a judgement to make by reading rather than to inherit from this
    sentence.

  Note what this changes about the shape of the risk: **`All US exchanges` now
  appears on the page rather than only in the chrome**, on any deployment with no
  provider configured. That is the single most coverage-claiming string in the
  product, and criterion 2 is about exactly it — in both directions.

- **Judge each against two failure directions, not one**: implying coverage the
  plan does not have, and disclaiming coverage the plan does have. ~~This story's
  own scope prose fails the second test in two places~~ — refined by §8.1: that
  prose is **struck through in place and is a historical record**, and correcting
  it would destroy the record. The live hazard is **acceptance criterion 2**,
  which reads _"No screen states or implies full US-market coverage"_ and which
  the measurement **inverts** — stored bars _are_ the consolidated tape, so read
  literally it asks us to delete the true label. Read it as _coverage claimed
  wrongly in either direction_, and say so in the record so the next reader does
  not apply it as written.
- **Every phrase containing the word "market"** gets read individually. It is
  the word that does the implying, it is in the product's name, and it is in at
  least four component vocabularies.
- **Make what can be mechanical, mechanical.** If the pass produces a claim of
  the form _"no shipped string says X"_, that is a single grep and belongs in
  `pnpm invariants` with a `pnpm break` entry beside it — `CLAUDE.md`'s rule is
  that an entry that can be made mechanical should be, and this epic has already
  moved two batches out of prose that way. A check you add owes a break.
- **What cannot be mechanical goes in `docs/GAPS.md`** with a `Re-measure:` line
  that names a file that exists — one of the seven had already rotted by naming
  a file whose constants had moved, and it looked exactly like a pass.

## Done when

- Recency renders in the settled form — **`partial` only** — agrees with the axis
  and with ADR 0028's bell rule, and the visible and spoken sentences come from
  **one** function.
- Under a `loaded` chart there is **no** through-when sentence, and that is
  recorded as deliberate rather than missing.
- The string pass is **recorded as a list** in `PROVENANCE.md` — what was read,
  what was changed, what was left and why — not summarised as "checked".
- Any claim that could become a grep is a `pnpm invariants` step with a
  `pnpm break` entry, and `pnpm break <name>` was run and went red.
- `pnpm verify` passes; the page was looked at at 1440 and 390 before any suite.

## Notes

The most likely thing to go wrong here is tone. Every sentence this task writes
is about something being incomplete, and five of them together will make a
working product read as a broken one. That is a design finding, and it belongs
back on 2.14.2's canvas rather than in a CSS file.

---

## What was done

### The sentence

`Holding 1,560 bars, through 2026-09-11 16:00:00 EDT, of a window running to
2026-09-14 16:00:00 EDT.` — in the rail, above the picture, beside the four
prices it qualifies, and **only under a `partial` answer**.

It is produced by `coveragePhrase` in
`apps/frontend/src/components/BarSeriesPanel/series-facts.ts` and read by
**both** the visible rendering and `series-announcement.ts`, which is the half
of decision 3 worth more than the decision. The spoken sentence is byte-for-byte
what it was; what moved is where it is written. `sentenceCase` moved there too —
its third consumer — and is the only difference between the two readings.

Under a `loaded` chart there is **no** sentence, and that is now recorded in
three places rather than being an absence somebody could read as an oversight:
the `Complete` story's docstring (which asserted the opposite and has been
corrected in place, with the old sentence quoted), a component test that asserts
it, and `PROVENANCE.md` §3.

### The rail

Three occupants, one slot, a stated priority, and a reservation that is measured
rather than argued — recorded in full in
[`VOLUME-AND-WINDOW.md`](../story-13-volume-chart-and-time-window/VOLUME-AND-WINDOW.md)
§82. Three figures from it:

- **48px → 66px**, at 1440 and at 390 alike, on every answer that has a series.
  `?sessions=1` on this store is `empty` and is unchanged at 48px.
- The reservation is **two hidden copies in one grid cell** rather than the
  longer of two strings. The two are not commensurable — one worst case is
  picked from five window phrases, the other is a property of an answer — and
  comparing them would have been the argued tolerance this repository has
  already paid a full suite run for.
- `.heldWindow` → `.railBlock`. A bare `RailSentence` resolves to `.refreshing`,
  whose hairline **travels**; a travelling rule under a settled sentence says
  work is in progress under an answer that has arrived. The notes at the foot of
  this task predicted tone as the likeliest failure, and it very nearly arrived
  through a stylesheet.

### The canvas

`Provenance and the empty answers.dc.html` §05 drew the sentence as _"through
15:42, of a window running to 16:00"_. The first partial answer on a running
pair reads **through 2026-09-11 16:00:00 EDT, of a window running to 2026-09-14
16:00:00 EDT** — two different days, which the short form renders as "through
16:00, of a window running to 16:00": a sentence saying a window was missed by
nothing at all. **The canvas was redrawn to the shipped form**, which is ADR
0026's chain run in the direction it is meant to run rather than the tree being
left to diverge.

### The pass

Recorded as a list in [`PROVENANCE.md`](PROVENANCE.md) §11 — what was read, what
was decided, what was left and why — rather than summarised as "checked". Four
things about it are worth surfacing here:

- **Criterion 2 inverts as written**, and §11.1 says so and says how to read it
  instead. _"No screen states or implies full US-market coverage"_ read literally
  asks us to delete `All US exchanges`, which is an exact statement of what is in
  a stored bar. Every string was judged against **both** directions.
- **Nothing was changed by the pass**, and that is the honest outcome stated as
  one. The vocabulary was decided in one module in Story 2.6 and every surface
  since has read it — which is what a pass over three stories' strings is
  supposed to find.
- **One string was read, left, and given a trigger.**
  `No shares changed hands anywhere in the window.` is the only shipped sentence
  claiming something about **the market** rather than about our store. It is true
  while every bar is the consolidated tape and becomes a single venue's silence
  reported as the whole market's the moment Epic 3 stitches an IEX tail.
- **The corpus was enumerated mechanically**, not from memory — every non-test
  `.ts`/`.tsx` under `apps/frontend/src` with comments stripped, reduced to its
  literals and JSX text nodes, plus the backend's refusals, `README.md`'s
  description and the one page title. Every phrase containing the word _market_
  was then read individually.

### What became mechanical, and the break each owes

Two new `pnpm invariants` steps, both run red through `pnpm break`:

| Invariant                          | Claim                                                             | Break                      |
| ---------------------------------- | ----------------------------------------------------------------- | -------------------------- |
| `one-home-for-the-feed-words`      | `All US exchanges` and the IEX sentence are written in one module | `feed-words-in-a-renderer` |
| `one-home-for-the-coverage-phrase` | The coverage sentence is written in one source file               | `coverage-sentence-twice`  |

**Both read their sources with comments stripped, and that was forced.** The
first version of the coverage check went red on `chart-alternative.ts`'s doc
comment, which quotes the sentence in prose to explain why its own clause says
something different — a check a correct comment can trip is a check nobody can
keep green. The stripper removes block comments and whole-line `//` comments and
never truncates a line of code, which is the safe direction: the worst it can do
is report a match a reader then reads.

**And the check found something before it was even finished.** The `pnpm
invariants` table in `docs/GAPS.md` read _seven_ while the list had been eight
since 2026-09-14 — `one-home-for-the-empty-explanation` shipped and nothing
brought the sentence above it along. Corrected, and the count is now the table.

### What could not be made mechanical

Three entries in [`docs/GAPS.md`](../../../docs/GAPS.md), each with a
`Re-measure:` naming a file that exists: the rail's reservation against the
coverage sentence at four widths (and the one digit of bar count it does not
reserve); that the sentence and the coverage edge never disagree about where the
data stops; and the `No shares changed hands anywhere` trigger.

### What was verified

`pnpm verify`, and the two browser specs the change touches —
`security-price-chart.spec.ts` and `security-series.spec.ts`, 31 passing — run
before the full suite rather than after it. The page was looked at with `pnpm
probe` at 1440 and 390 **before** any suite, which is how the travelling-rule
defect was caught.

## What the user can see

**How current the numbers are, without working it out from an axis.** Where the
store answered part of the window, the line above the chart says how many bars
are held, through which instant, of a window running to which instant — and
where it answered all of it, that line is silent, because the axis already says
so.

**What a user still cannot do:** watch a price move. There is no live data.

---

## For the stakeholder — what this actually was, in plain words

Until today, when MarketPulse could only answer part of the period you asked
for, the chart told you so with a picture: the line stopped, and the rest of the
frame was drawn as empty ground. That is enough to know **something is missing**
and **it stops about here**. It is not enough to know **when** — and _when_ is
the thing an analyst needs before they will quote a number off a screen.

The reason the picture cannot tell you is a deliberate design decision taken
three weeks ago. Our charts do not plot time evenly, because markets do not
trade evenly: a weekend would be two-sevenths of a week-long chart spent drawing
nothing. So the horizontal axis counts _trading sessions_, not hours — which
makes the picture far more readable and makes a clock time unrecoverable from
it. What we added is the one sentence that fills exactly that gap:

> Holding 1,560 bars, through 2026-09-11 16:00:00 EDT, of a window running to
> 2026-09-14 16:00:00 EDT.

Three decisions inside that sentence are worth a stakeholder's minute.

**It appears only when there is something to say.** Under a chart that answered
your whole period, it says nothing at all — the line already ends where the data
ends, so the sentence would be restating the picture. That sounds like a small
economy and it is not: small print that repeats what is already on screen is how
you teach people that your small print is not worth reading. The day we need
them to read it, they will not.

**It is written once and used twice.** The same sentence is read aloud to
someone using a screen reader and drawn on screen for everyone else. That is one
function with two readers rather than two copies — because two copies agree on
the day they are written and quietly diverge the first time somebody rewords
one, and nobody would ever notice, since no one person sees both. We added an
automated check that fails the build if a second copy of it ever appears.

**It does not sound like something went wrong.** Nothing did. A historical chart
that ends where our stored history ends is a correct historical chart, and the
gap fills overnight. So there is no red, no warning box, no _only_ and no
_unfortunately_ — and, after looking at the real page, no moving line underneath
it either: our "we are fetching something" marker is a hairline that travels,
and putting it under a finished sentence would have said work was in progress
when none was. That was caught by opening the page, thirty seconds in, and by
nothing else.

The second half of the task was a **coverage-honesty audit**, and it is the kind
of work that is easy to fake and worth doing properly. Our data plan is
lopsided: the historical prices we store come from the full US consolidated
tape — every exchange — while the live stream we get in the next epic comes from
a single exchange, IEX. Saying the wrong one of those in the wrong place is a
false statement about the market, so we read **every single sentence the product
shows or speaks** — mechanically listed rather than recalled — and judged each
one twice: does it claim more coverage than we have, and does it disclaim
coverage we _do_ have. Both are lies; the second is the one a cautious reviewer
introduces by accident.

**We changed nothing.** That is the result, and it is a good one: three stories
of screens all take their wording from a single vocabulary written once, which
is exactly what that arrangement was for. What the audit produced instead was
two automated checks — one that fails the build if any screen invents its own
words for a data feed, one for the sentence above — and three honest notes about
things a machine cannot check, each with the command to re-check it by hand.

One of those notes is worth naming, because it is a real bug we have scheduled
rather than a hypothetical. When a chart shows a period in which nothing traded,
we currently say _"No shares changed hands anywhere in the window."_ Today that
is true, because every stored price comes from every exchange. The moment we
plug in the live single-exchange feed next epic, that same sentence becomes one
venue's quiet afternoon reported as the whole market standing still. It is
written down, with the trigger, in the place the next engineer will read.

We also found that our own index of automated checks said "seven" when there
were eight. Corrected — and it is a small illustration of why this repository
keeps turning written promises into checks that run.

**Where the product stands:** Epic 2 has one task-set left. A user can search 518
US securities, open one, and read its price and volume on a shared time axis
across five time windows — and the screen now accounts for itself: where the
prices came from, whether they have been restated for splits, when we fetched
them, that the sector label is our own research rather than a market fact, and
how far the answer reaches. What they still cannot do is watch a price move.
That is Epic 3.
