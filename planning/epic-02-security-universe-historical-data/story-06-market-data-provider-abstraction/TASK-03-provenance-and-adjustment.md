# Task 2.6.3 — Provenance and adjustment: a series that cannot exist without saying where it came from

**Status:** Not started
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

Consider a fifth, and decide it rather than leaving it: **coverage** — whether this series is
everything the range asked for. Story 2.14's "we have data through 15:42" is a partial answer
rendered as an answer, and a consumer can only say that if something on the response says so.
It may belong here or in Task 2.6.4's response shape; either is defensible, but it must have
an owner before Story 2.14 needs it.

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

Two members is likely enough — raw and split-and-dividend adjusted — but decide it against
what Story 2.8 stores and what Story 2.12 draws, and state the one thing that makes this
worth a whole paragraph: an unadjusted series through a split has a **cliff in it that is not
a market event**, and a chart that draws that cliff is making a false claim about a price.
That is the visible consequence, and it is why this is not a flag.

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
