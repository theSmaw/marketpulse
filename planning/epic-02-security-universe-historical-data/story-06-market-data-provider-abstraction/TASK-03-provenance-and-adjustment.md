# Task 2.6.3 — Provenance and adjustment: a series that cannot exist without saying where it came from

**Status:** Complete
**Story:** [2.6 Market-Data Provider Abstraction](STORY.md)
**Depends on:** Tasks 2.6.1, 2.6.2

## Objective

Build the provenance record and the adjustment vocabulary, and make acceptance criterion 3
structural: **there is no code path that produces a bar without provenance.** This is the
task with product weight rather than engineering weight, and it is the one Story 2.14
renders.

## What the user can see when this lands

**Nothing on screen yet — Task 2.6.7 is what puts it there.** What lands here is the
vocabulary: the words for which feed, which provider, whether a value is adjusted and when it
was retrieved. Those words are what a user eventually reads, so they are chosen here and not
paraphrased later.

## Why this is not a caption

Invariant 6 and §7.1 are unusually blunt: Alpaca's free tier is **IEX, not consolidated
SIP**, MarketPulse must display the feed, and must not imply full US-market coverage. §35
lists "hide data provenance" and "manufacture missing observations" among the things this
product must not do.

A caption on a chart component satisfies none of that, for a reason that is mechanical rather
than moral: **a caption is true of the component, and provenance is a fact about the data.**
The moment Story 2.8 stitches stored bars onto fresh ones, or Story 2.13 changes the window
so half the series comes from a different fetch, the caption is unchanged and wrong. So
provenance rides on the data, at the granularity Task 2.6.1 decided.

## Work

> **Amended 2026-09-07 by Task 2.6.1.** The granularity, the record's shape, the adjustment
> vocabulary and the coverage question are all settled in `PROVIDER.md` §2, §3.4 and §4.
> Three things this task no longer chooses:
>
> - **Coverage has an owner and it is this task.** It goes on the **series**, beside
>   provenance, not on Task 2.6.4's response envelope — because a series outlives one HTTP
>   exchange, and an envelope-level coverage field is gone the moment anything passes a
>   `BarSeries` alone into a chart or a store (§2.5). Note what it does **not** answer:
>   how far the answer reaches, not whether it is dense. Density is Story 2.8's gap handling.
> - **The stitched case has a two-part answer, and each half has its own reason** (§2.4):
>   sources may disagree about **feed** and that is reported truthfully, and they are
>   **refused** if they disagree about **adjustment**, because two price scales in one array
>   is not a series. That is the concrete form of this file's "either truthful or refused".
> - **`Adjustment` has exactly two members** — `raw` and `split-adjusted` — with `dividend`
>   declined against a named trigger (§3.4). Epic 5 is the stronger reader for the second,
>   not the chart: an unadjusted 10-for-1 split is a **−90% return** sitting at the 100th
>   percentile of every distribution it touches.

### The record's fields, each with a reader

Task 2.6.1 settled the granularity; this task settles the content. Four fields are named by
the story and each needs a stated meaning rather than a name:

- **Which provider.** Ours, not the vendor's marketing name — `alpaca`, `fixture`. A closed
  union, for `Timeframe`'s reason.
- **Which feed.** This is the invariant-6 field and it is not the same as the provider:
  Alpaca serves IEX on the free tier and SIP on a paid one, so provider and feed vary
  independently. Whatever this field holds must be renderable as "one venue, not the
  consolidated tape" without the renderer knowing anything about Alpaca.
- **Whether the value is adjusted**, which is Task 2.6.1's decision arriving as a field.
- **When it was retrieved** — §16 requires evidence to record both an event timestamp and a
  retrieval timestamp, and this is the retrieval half. Note the trap the codebase has already
  met once: Task 2.3.5 found that defaulting a provenance date to `now()` makes it always
  today and therefore permanently silent. Retrieval time is genuinely `now()` at fetch; it
  must not be re-stamped on read.

~~Consider a fifth, and decide it rather than leaving it:~~ **There is a fifth and it is
settled — `PROVIDER.md` §2.5, restated here because this paragraph is what a reader jumping
to this section actually reads.** **Coverage** — whether this series is everything the range
asked for. Story 2.14's "we have data through 15:42" is a partial answer rendered as an
answer, and a consumer can only say that if something on the response says so. ~~It may
belong here or in Task 2.6.4's response shape; either is defensible, but it must have an
owner before Story 2.14 needs it.~~ **It goes on the SERIES, beside provenance, and the owner
is this task** — not Task 2.6.4's response envelope, because a series outlives one HTTP
exchange and an envelope-level field is gone the moment anything passes a `BarSeries` alone
into a chart or a store. Note what it does **not** answer: how far the answer reaches, not
whether it is dense. Density is Story 2.8's gap handling.

### Make it structurally unavoidable, and prove it

Criterion 3 is the interesting claim in this story and it is easy to satisfy on paper and not
in code. The mechanism is a constructor, not a convention: the series type is only
constructible through a function that requires provenance, and the raw shape is not exported.
That is Task 2.4.1's unexported-handle move and `apiError()`'s four-slot move, applied to
data.

**Then produce the failure.** Try to build a series without provenance and confirm it does
not compile. A convention that has never been made to fail is a convention nobody has tested
— this repository has recorded that lesson twice, most sharply in Task 2.5.3, where a break
that did not land looked exactly like a check that worked.

There is a second failure worth producing, because it is the one that will actually happen:
**a stitched series**. Build one from two sources and check that what comes out is either
truthful or refused. If Task 2.6.1 chose a single per-series record, this is the moment to
confirm the stitcher is structurally prevented from producing one, rather than merely
instructed not to.

### Adjustment is explicit at the call site — criterion 5

The criterion's own wording is the design: **no default that silently means "whatever the
provider does".** So the request type requires it, and the vocabulary is ours rather than the
vendor's.

~~Two members is likely enough — raw and split-and-dividend adjusted — but decide it against
what Story 2.8 stores and what Story 2.12 draws~~ — **the members are settled and they are
`raw` and `split-adjusted`, with `dividend` DECLINED against a named trigger
(`PROVIDER.md` §3.4).** The struck wording named the wrong second member, which matters
because it is the one a reader jumping straight to this section would implement: a
dividend-adjusted price **is not a price anybody saw**, a dividend gap is typically well
under 1% and is not a cliff, and nothing in V1 computes total return. The reversal trigger is
the first reader that compares two securities' _total_ return rather than their price return.

What stands unchanged is the argument, and it is why this is not a flag: an unadjusted series
through a split has a **cliff in it that is not a market event**, and a chart that draws that
cliff is making a false claim about a price. The stronger reader for `split-adjusted` is
**Epic 5** rather than the chart — §11 computes return percentiles over ~60 trading days, and
an unadjusted 10-for-1 split is a **−90% return** sitting at the 100th percentile of every
distribution it touches, producing a permanent, confident and entirely false anomaly.

**And write down what happens to a series that spans no corporate action at all**, which is
almost all of them: the two modes return identical numbers, so a wrong default is invisible
in testing and wrong exactly once, on the name and the week somebody is looking at.

### One thing that is deliberately not built here

No renderer, no component, no formatting. Task 2.6.7 owns presentation and Story 2.14 owns
the full treatment. What this task owes them is a record they can render without inventing
anything — if Task 2.6.7 finds itself deriving a user-facing sentence from three fields and a
lookup table, this task under-delivered.

## Done when

- The provenance record and the adjustment vocabulary exist in `packages/shared`, with no
  vendor name in a type, an identifier or a shipped value — grepped **over code rather than
  text**, since Task 2.6.2 measured that a naive text grep over `packages/shared/src` returns
  seven false positives, all of them comments explaining why a decision was taken.
  `PROVIDER.md` §9.5 carries the command. Note this task's vocabulary is the one most likely
  to leak for real: a `feed` field whose value is a vendor's spelling is a leak that a grep
  over comments would never separate from the prose around it
- A series cannot be constructed without provenance, and the attempt was **seen to fail**
- The stitched-series case is either truthful or refused, demonstrated either way
- Adjustment is a required part of the request, with no default
- Tests beside the types, and each one seen to fail against a deliberate break
- `pnpm verify` is exit 0 with no database and no network

## Notes

This is the task in the story a reviewer would call over-engineered, and the answer is in
§35: a product that shows one venue's volume as though it were the market's volume is making
a false claim about a number, which is the precise thing MarketPulse exists not to do. The
cheap version of this task is a `feed: string` on a response object, and it survives until
the first stitch.

---

## What was built (2026-09-07)

Two modules in `packages/shared`, with their tests, and nothing else. No dependency, no
lockfile change, no new `verify` step, no change to either application.

- **`packages/shared/src/market-provenance.ts`** — the vocabulary. `PROVIDER_IDS` (one
  member, `fixture`), `MARKET_FEEDS` (`iex` / `sip` / `synthetic`),
  `MARKET_FEED_DESCRIPTIONS` (§4.4's label and sentence per feed), `ADJUSTMENTS` (`raw` /
  `split-adjusted`), `BarSource`, `SeriesProvenance`, and the two constructors
  `toSeriesProvenance` and `mergeSeriesProvenance`.
- **`packages/shared/src/bar-series.ts`** — `SeriesCoverage`, `BarSeries`, `BarSeriesInput`
  and `toBarSeries`.

### Three decisions taken here, recorded back into `PROVIDER.md` §2.1

**Both `SeriesProvenance` and `BarSeries` are branded**, `TimeRange`'s precedent one task
old. A required `provenance` field alone already makes a series without provenance
uncompilable, so criterion 3 was never the hard half. The hard half is that a hand-written
object literal skips every _coherence_ check, and the coherence checks are where the real
failures live. The brand is erased at runtime, so the wire and the bundle are unaffected; the
stated cost is that a series parsed out of JSON is not a `BarSeries` and has to be
re-validated, which is correct behaviour rather than friction.

**A multi-source record is obtainable only by merging, and that is what turns §2.4's refusal
from an instruction into a mechanism.** `toSeriesProvenance` takes exactly one source;
`mergeSeriesProvenance` takes two or more and refuses an adjustment disagreement. Without
that pair, §2.4's "unrepresentable" is true of the _result_ and says nothing about how the
result was chosen — a Story 2.8 stitcher would write a literal, pick one of two adjustment
values, and nothing would ever notice.

**`retrievedAt` is checked rather than merely typed** — it must end in `Z` and parse. It is
the one field here whose wrongness is silent _and_ reaches a user: an offset spelling is how
a local-time stamp gets into a provenance record and makes a stale series look current, which
is §4.3's trap arriving through a different door.

### What was deliberately not built

- **No `BarsRequest`.** §1.1 puts the request type in `apps/backend` and Task 2.6.4 owns it.
  What this task can hold of criterion 5 is that there is **no default anywhere in the
  module** — asserted, by sweeping the module's own export names for `/default/i`, so the
  criterion is checked rather than described. 2.6.4 makes `adjustment` a required field on
  the request.
- **No bar-array stitcher.** Story 2.8 owns joining bars, and doing it needs gap decisions
  this story does not own. What is built is the part whose absence is the gap: the provenance
  merge, which is where the refusal has to live.
- **No `isBarSeries` predicate.** Task 1.7.3's rule — a validator ships with its first
  reader, which is Story 2.9's wire boundary.
- **No renderer, no component, no formatting.** Task 2.6.7 owns presentation. What it
  inherits is `MARKET_FEED_DESCRIPTIONS`, so it renders a label and a sentence rather than
  deriving one from three fields and a lookup table of its own.

### Seen to fail

Six runtime breaks, each reverted, each taking one or two tests red by name:

| Break                                             | Result                 |
| ------------------------------------------------- | ---------------------- |
| `mergeSeriesProvenance` stops refusing a mismatch | 2 failed \| 196 passed |
| `retrievedAt` no longer has to be UTC             | 1 failed \| 197 passed |
| source bar counts no longer have to add up        | 1 failed \| 197 passed |
| bars no longer have to ascend                     | 2 failed \| 196 passed |
| a bar may fall outside the covered range          | 2 failed \| 196 passed |
| a `DEFAULT_ADJUSTMENT` is exported                | 1 failed \| 197 passed |

And **two compile-time breaks**, which are the ones criterion 3 actually rests on:

- Making `provenance` optional on `BarSeriesInput` fails `tsc -b` with **`TS2578: Unused
'@ts-expect-error' directive`** in `bar-series.test.ts`. That directive is the criterion
  written as an assertion the build enforces: it errors today, and it fails the build the
  moment it stops erroring.
- A hand-written `BarSeries` literal skipping the constructor fails with **`TS2741: Property
'[brand]' is missing`**, which is the brand doing the job a required field cannot.

### Figures

- `pnpm test` is **507** (198 + 146 + 163), up from 481; `packages/shared` is 198 across 13
  files. `pnpm test:process` 14, `pnpm test:database` 61.
- `pnpm verify` is **exit 0 in 32.25 s**, and **exit 0 with the database stopped** — this
  task touches nothing that needs one, and nothing in it reaches the network.
- **The frontend artefact did not move, and that is the check rather than a coincidence.**
  `PROVIDER.md` §11 predicts zero bytes for Tasks 2.6.2–2.6.6 and says explicitly it is a
  check: 369,437 B `4f17aff3…` of JavaScript, 17,317 B `eb223e53…` of CSS, `index.html`
  1,101 B `898733b0…`, 300 B, **388,155 B over four files**, identical at every hash.
  `MARKET_FEED_DESCRIPTIONS` was the one to watch, being an object rather than an array, and
  it is tree-shaken completely for the same reason everything else is — a plain literal, not
  built by calling anything.
- The **vendor grep over code** (`PROVIDER.md` §9.5) returns nothing. One thing worth
  recording, because it nearly went the other way: a first draft asserted the absence of
  vendor names _in a test_, which made that grep report the test's own needle list as a hit
  — and would additionally have gone red in Story 2.7, which legitimately adds a vendor
  member to `PROVIDER_IDS`. §9.5 had already settled that check as prose plus a measured
  grep, with a structural reason; the test was removed rather than the grep amended.
- **The NAIVE text grep moved from seven occurrences to eight**, and the new one is correct:
  `market-provenance.ts`'s module comment quotes §7.1's own wording — that the free tier is
  IEX and not consolidated SIP — which is the invariant the module exists to serve. Task
  2.6.8's criterion 1 is amended to say eight and to say the figure will keep moving, since
  every module that explains why it did not copy the vendor adds one.

---

## For the stakeholder: what this actually does

**Nothing appears on screen from this task**, and the story says so plainly. Task 2.6.7,
four tasks from now, is where a user sees the result — and what it will show is decided
here.

### The problem, in one sentence

The market data we can afford covers **one exchange, not all of them**. If we show a volume
figure from that one exchange as though it were the whole US market's volume, we have not
made a design mistake — we have told the user something false about a number. Our product
spec (§35) lists _"hide data provenance"_ among the things MarketPulse must never do, and
the whole reason this product exists is to be the thing you can trust the numbers in.

### What we built, and why it is not a caption

The obvious way to solve that is a caption under the chart: _"Market feed: IEX"_. We did not
do that, for a reason that is mechanical rather than principled.

**A caption is true of the chart. Where the data came from is true of the data.** Those come
apart sooner than you would think. Two stories from now, a chart showing three months of
prices will be built from two places at once: most of it from our own database, and the last
few minutes fetched live. The caption is unchanged and is now wrong about half the picture.

So instead, **every run of prices in this system carries its own record of where it came
from** — who supplied it, which exchange it covers, when we asked for it, and whether the
numbers have been adjusted. And because a run of prices can be assembled from several
sources, that record holds a _list_ rather than a single answer, so it can honestly say
"most of this is from our store, retrieved three weeks ago; the last twelve minutes are
live".

### The part we made impossible rather than discouraged

We could have written a rule in a document saying "always attach this record". Rules in
documents get forgotten, and this one's failure is silent — you get a plausible-looking
chart making a false claim.

So it is enforced by the code's own shape instead. **There is no way to construct a price
series in this codebase without supplying its provenance**, and we proved it by trying: the
compiler refuses. Beyond that, the constructor checks that the record and the data actually
agree — that the "these 390 bars came from here, these 12 from there" adds up to the number
of bars actually present. That is the check that catches the realistic mistake, which is
somebody joining two lists of prices and keeping only one of the two source records.

### The one thing we refuse rather than report

There is a difference between two sources disagreeing about **which exchange** they cover —
which is fine, and we say so — and two sources disagreeing about **whether the prices have
been adjusted for stock splits**.

The second is not a chart with a caveat; it is a chart that is wrong. When a company does a
10-for-1 split, its share price divides by ten overnight and nothing has actually happened to
the company. Adjusted prices smooth that out; raw prices show the cliff. Put the two kinds
side by side in one line and you get a 90% "crash" on a day the market did nothing — and
every percentage change calculated across that join is wrong.

That matters far beyond charts. Epic 5's job is spotting unusual behaviour, by comparing
today's move against the last sixty days. An unadjusted split looks like the largest one-day
fall in the security's history: a permanent, confident, completely false alarm sitting at the
top of the "unusual activity" list. So the code **refuses** to join two price runs that
disagree about adjustment, rather than joining them and adding a footnote.

### The decision that costs us nothing today and would have cost a lot later

Whether prices are adjusted has to be **asked for explicitly**, every time. There is no
default.

That looks like unnecessary ceremony, and the reason it is not is the most uncomfortable fact
in this task: **for almost every security, in almost every window, the two answers are
identical numbers.** Splits are rare. So a wrong default would sail through every test we
could write, and be wrong exactly once — on the one company and the one week somebody is
actually looking at, which is precisely when they care. There is no safe default here, only
one whose wrongness is postponed.

### One quietly useful side effect

When we later build a demo or run the product offline, it uses generated test data rather
than the real market. Because that generated data carries the same provenance record — feed
_"Simulated"_, described as _"Generated test data. Not a market feed."_ — **a screenshot of a
demo chart announces itself as a demo**, structurally, without anybody remembering to add a
"SAMPLE DATA" banner. We got that for free from the design above.

### Where this sits in the plan

The words a user reads are already written down here — _"Trades reported by the IEX exchange
only — not the full US consolidated tape"_ — rather than being invented later by whoever
builds the screen. That is deliberate: the header has been showing a hard-coded
`DISCONNECTED` since Story 1.5, and Task 2.6.7 replaces it with the truth. After that, when
we connect the real data provider in Story 2.7, **one configuration value changes and that
region starts reading `IEX` with nothing in the frontend edited.**

The larger payoff is Story 2.12, the first real price chart. This task is what makes it
possible for that chart to be honest about what it is drawing without anybody having to
remember to make it so.
