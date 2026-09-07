# Story 2.6 — Market-Data Provider Abstraction

**Status:** Not started
**Epic:** [Epic 2 — Security Universe & Historical Market Data](../EPIC.md)
**Depends on:** Story 2.5
**Epic scope covered:** Market-data provider abstraction; market-data provenance (the model half)

## Description

Define the interface market data arrives through, and the domain types it arrives as,
**before** writing a line of Alpaca-specific code. Invariant 7 requires it — "no vendor
SDK types leak into the domain model" — and §7.1 requires it explicitly for Alpaca.

This is the same move Story 1.12 made twice and both times it paid: the contract lands
first, in `packages/shared` or beside it, with a fake implementation, and the vendor
client is then written against something that already exists.

## What the user can see when this story lands

~~**Nothing on screen.**~~ **Amended 2026-09-07, when this story was split into tasks: one
small thing, and it is a correction rather than an addition — see Task 2.6.7.** This story
defines the interface every market-data provider is read through, before any vendor code
exists — invariant 7, and the reason a later provider swap is a new implementation rather
than a rewrite.

What changed the answer is that the header's `Market feed` region has been rendering a
**hard-coded `DISCONNECTED`** since Story 1.5, listed in `README.md` among the things a
correct first run shows that read as faults — and this is the story that knows what the true
claim is. So Task 2.6.7 replaces an invented status with a real one derived from the
backend's actual configuration, and builds the provenance presentation vocabulary invariant 6
requires. It is a small feature and a disproportionately honest one: after it, **one
configuration value in Story 2.7 changes and the same region reads `IEX`** with nothing in
the frontend edited.

What it unblocks is Story 2.7, and through it every price in the product. **The payoff is
visible in Story 2.12.**

**One thing it decides that the user does eventually see**: the provenance vocabulary — that
the feed is IEX and not the consolidated tape, and whether a price is adjusted. Invariant 6
requires that to be displayed rather than implied, so the words chosen here are the words
Story 2.14 renders on screen.

## Why it sits here in the sequence

Immediately before the Alpaca client, and not after it. An interface extracted from a
working client is a description of that client; an interface written first is a
constraint on it. The difference shows up in Epic 3, which adds a **streaming** provider
against the same abstraction, and at whatever point a second provider is evaluated.

## Scope

- Domain types: `Bar` (open, high, low, close, volume, timestamp, and whatever else is
  genuinely needed — resist copying the vendor's field set), `Timeframe`, a time range,
  and the shape of a bar request and response
- The **provenance record**, and this is the part with product weight rather than
  engineering weight. §7.1 and invariant 6 require the feed to be displayed and require us
  not to imply full US coverage. So provenance is a **field on the data**, not a caption
  on a component: which feed, which provider, whether the value is adjusted, when it was
  retrieved. Story 2.14 renders it; this story makes it impossible to have data without it
- Adjustment semantics — splits and dividends — as an explicit part of the request, since
  an unadjusted historical series through a split is a chart with a cliff in it that is
  not a market event
- The error taxonomy, in the shape Story 1.7 established for `ApiError`: a closed union of
  causes a caller can branch on — not-found symbol, rate-limited, unauthorised, upstream
  unavailable, bad range — each of which a later story renders differently
- Whether a provider call can fail without throwing, following `api-client.ts`'s
  seven-outcome result shape, which exists precisely so a caller cannot forget a case
- A **fixture provider**: deterministic, offline, seeded from recorded fixtures, usable by
  tests and by a developer with no Alpaca key. This is what keeps `pnpm test` free of
  network access and what makes Story 2.12's chart work on a laptop on a train
- Rate-limit and retry **policy shape** (where it lives, what it is allowed to do), not
  the numbers, which Story 2.7 measures

## Out of scope, and who owns it

- Alpaca — Story 2.7
- Streaming, subscriptions, connection state — Epic 3, which extends this abstraction
  rather than replacing it. Design so that is an addition
- Persistence and caching — Story 2.8. The provider fetches; it does not store
- Rendering provenance — Story 2.14

## Open decisions — settle with the user

1. **Where the interface lives.** `packages/shared` if the frontend genuinely needs the
   types (it needs `Bar` and the provenance record for charts, so probably yes); the
   backend alone if not. Story 1.12's rule applies: shared means both sides depend on the
   same fact, not "shared is where types go"
2. **Whether provenance is per-series or per-bar.** Per-series is cheap and is right until
   a series is stitched from two sources — which Story 2.8's cache does the moment stored
   bars and freshly fetched bars appear in one response
3. **Adjusted or raw as the stored default**, and whether both are kept. This is
   effectively irreversible for stored history, so it belongs here rather than in 2.8

## Acceptance criteria

1. The interface and its types exist with no reference to any vendor, checked by grep
2. A fixture provider implements it fully and is what tests use
3. Every response carries provenance; there is no code path that produces a bar without it
4. Each error cause is producible against the fixture provider and each is distinguishable
   by the caller
5. Adjustment is explicit at the call site — no default that silently means "whatever the
   provider does"
6. `pnpm verify` passes with no network access

## Tasks

Tackled in order. The story is complete when all eight are done.

2.6.1 decides and ships nothing, which is the shape Tasks 2.1.1, 2.2.1, 2.3.1 and 2.5.1 set —
and it carries more weight here than usual, because two of its decisions (what provenance is
attached to, and whether stored history is adjusted) **cannot be repaired from outside
later**: one is a claim printed beside every chart and the other is baked into ten million
stored rows.

2.6.2 and 2.6.3 build the data — the bar, and the record that says where it came from — and
they are kept apart because they fail differently. A wrong field on `Bar` is a migration; a
missing provenance record is a product making a false claim about a number, which is §35's
subject. 2.6.4 and 2.6.5 build the seam — the interface and the result, then the taxonomy of
everything that can go wrong — separated because criterion 4 is a real piece of work and
folding it into the interface is how it becomes a `ProviderError` with a `message`.

2.6.6 is the task the story is actually met by: criteria 2, 4 and 6 are all properties of the
fixture provider. 2.6.7 spends the story on the visible thing. 2.6.8 closes it and records
ADR 0018.

**Five of the eight are invisible, and the story says so plainly rather than apologising for
it** — the same shape Story 2.5 recorded. What makes it acceptable is that 2.6.7 is the
seventh of eight rather than deferred polish, and that the region it fixes has been showing an
invented value for six stories.

| #     | Task                                                                                                                                                   | Status      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| 2.6.1 | [Settle the shape, the provenance granularity and the adjustment default, shipping nothing](TASK-01-settle-the-shape-and-the-provenance-vocabulary.md) | Complete    |
| 2.6.2 | [`Bar` and `Timeframe`: the smallest honest description of a price observation](TASK-02-the-bar-and-the-timeframe.md)                                  | Not started |
| 2.6.3 | [Provenance and adjustment: a series that cannot exist without saying where it came from](TASK-03-provenance-and-adjustment.md)                        | Complete    |
| 2.6.4 | [The provider interface, the request, and a call that cannot throw](TASK-04-the-interface-and-the-result-shape.md)                                     | Not started |
| 2.6.5 | [The error taxonomy, and where a retry policy is allowed to live](TASK-05-the-error-taxonomy-and-the-retry-policy.md)                                  | Not started |
| 2.6.6 | [The fixture provider: the whole interface, offline, deterministic](TASK-06-the-fixture-provider.md)                                                   | Not started |
| 2.6.7 | [The feed tells the truth: provenance on screen](TASK-07-the-feed-tells-the-truth-on-screen.md)                                                        | Not started |
| 2.6.8 | [Verify, document, and ADR 0018](TASK-08-verify-document-and-adr.md)                                                                                   | Not started |

## The chart that could be pulled forward, and why it is not

Recorded here rather than left implicit, because it is the obvious thing to suggest and it
will be suggested again.

Task 2.6.6 produces a deterministic offline bar series, so a chart is **technically available
in this story**, three stories before Story 2.12. It is rejected on two arguments, either of
which is sufficient.

It would take **Story 2.12's charting decision by accident**. That decision — library or
hand-built, measured the way Story 1.4 measured its component library — is inherited by Epic
6's WebGL topology, Epic 8's comparison charts and Epic 11's AI-opened charts. Taking it
inside a story about a data interface, under time pressure, to draw fixture data, is the
precise failure this epic's sequencing exists to prevent: an interface extracted from a
working thing is a description of that thing.

And it would put **invented prices on a market product's screen**. §35 lists "manufacture
missing observations" among the things MarketPulse must not do, and this repository has
already recorded the criticism against Story 1.4's render check — invented data, including two
rows deliberately marked stale, which was the landing page's only market-looking content for
six stories. A `SAMPLE DATA` label does not repair that; it advertises it.

**The reversal trigger is Story 2.12 arriving and finding it cannot make the charting
decision without data** — which it will not, because Story 2.8 stores real bars two stories
earlier.

## What this story hands forward

The seam Epic 3 streams through, and the provenance record invariant 6 is enforced by.
