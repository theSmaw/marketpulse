# Task 2.6.6 — The fixture provider: the whole interface, offline, deterministic

**Status:** Not started
**Story:** [2.6 Market-Data Provider Abstraction](STORY.md)
**Depends on:** Tasks 2.6.4, 2.6.5

## Objective

Implement the interface fully, with no network. This is what acceptance criteria 2, 4 and 6
are actually met by, and it is what keeps `pnpm test` free of network access for the rest of
the project.

## What the user can see when this lands

**Nothing directly**, unless Task 2.6.1 decided the fixture provider is selectable in a
running backend — in which case a developer with no Alpaca key has a backend that answers,
and Task 2.6.7 is what makes that visible.

## Why this is the load-bearing task in the story

Three things rest on it, and each is a property the repository already holds and would
otherwise lose:

- **`pnpm test` is fast, needs no build, no socket and no database.** That property has
  survived thirteen stories and `CLAUDE.md` records it as a rule. A test that reaches Alpaca
  breaks all of it at once, and the sixth level of test that already exists —
  `pnpm test:database` — exists precisely because a database test broke all three.
- **Story 2.12's chart works on a laptop on a train.** Also a real requirement: the
  charting decision is a whole-product decision inherited by Epics 6, 8 and 11, and it should
  not be taken while fighting a rate limit.
- **Criterion 4 is only checkable here.** Producing `unauthorised` against a real vendor
  means deliberately breaking a credential; producing it against a fixture is a line of code.

## Work

> **Amended 2026-09-07 by Task 2.6.1.** Three conditionals below are now settled and one of
> them changes what this task builds rather than only how it is described:
>
> - **It ships. Unconditionally.** `PROVIDER.md` §5 — so it is `apps/backend/src`, it is
>   inside the container image, and the "if it ships" clauses below are simply the plan.
> - **`MARKET_DATA_PROVIDER`'s default is `none`, not `fixture`** (§5.3), and `none` is a
>   real member of the enum rather than an absent value. That is what makes this story's
>   loud-default requirement concrete, and it is also what gives Task 2.6.7 a true thing to
>   say before Story 2.7 exists. At the end of this story the enum is `["none", "fixture"]`;
>   Story 2.7 adds its own member.
> - **The corpus is GENERATED from `market-session.ts` and seeded** (§6.2), and — the part
>   that removes work rather than adding it — **there is no re-recording obligation on this
>   corpus at all** (§6.1). It produces domain types and parses no vendor JSON, so it has
>   nothing vendor-shaped it could be wrong about. Story 2.7 records a _different_ corpus
>   (raw HTTP bodies, for its mapping) and owes a reconciliation of three specific numbers,
>   which is written into that story's file. **"Re-record Story 2.6's fixtures" is the wrong
>   instruction**; the Notes at the foot of this file predate that finding.
> - **`retrievedAt` is a fixed instant declared by the corpus** (§6.3), because a `now()`
>   stamp is not byte-identical across runs — and it makes the series obviously not live,
>   which §5.4 wants anyway.

### What Task 2.6.2 handed forward, deliberately, rather than building on a forecast

**This task is the named trigger for the one helper Task 2.6.2 declined**, and it is worth
knowing before writing the filter rather than after. `TimeRange` is half-open, `[start, end)`,
and `timeRangeIncludes` was **not** built because nothing yet needed to ask _"is this bar in
this range"_ — this provider is the first thing that does. Three notes:

- The half-open rule is in `time-range.ts`'s own comment, so the inline form is
  `b.startsAt >= range.start && b.startsAt < range.end`. **The `<` is the whole point**: get
  it wrong and adjacent windows each claim the bar at the seam, which is the corruption
  Story 2.8's backfill would then report as a unique-constraint failure that was actually the
  database being right.
- If a second caller appears, the helper belongs **beside the type in `packages/shared`**
  rather than local to the provider — one definition of half-openness, for
  `market-time.ts`'s reason.
- `TimeRange` is **branded**, so the corpus and every test in this task obtain one through
  `toTimeRange(start, end)` and never by writing a `{ start, end }` literal. It refuses a
  reversed, zero-width or invalid-`Date` range naming both ends, which means a fixture whose
  window is degenerate fails loudly at construction rather than producing a confusingly empty
  series.

The corpus's own instants come from `market-session.ts` per `PROVIDER.md` §6.2, so the
ranges are built from session bounds rather than written out — which is also what keeps the
"no wall clock" property below true by construction.

### Determinism is the requirement, and it has a sharper edge than it looks

The same request must produce the same series, byte for byte, on every machine and every run.
Two things break that quietly and both should be structurally impossible rather than avoided:

- **reading the wall clock.** A fixture whose range is relative to "today" is a fixture whose
  test passes until a market holiday. `packages/shared` already cannot read the clock — the
  lint rules have no exception — and this provider should take its instants from its input
  for the same reason
- **a random walk with an unseeded generator.** If bars are generated rather than recorded,
  the seed is part of the fixture and is written down

### The corpus comes from Task 2.6.1's decision, and it carries an obligation forward

`PROVIDER.md` settled where the fixtures come from and when they get re-recorded against a
real Alpaca response. Honour it, and **make the corpus's own provenance visible**: whatever
`Provenance` says for a fixture series must not be mistakable for real market data. That is
Task 2.6.3's record doing its job on its first consumer, and it is also the thing that stops
a fixture-backed chart ever being screenshotted as a product.

Cover, at minimum, the cases the rest of the epic will hit:

- a full regular session, and its exact bar count — **390** for a regular session and **210**
  for a half day, both derived by `market-session.ts` rather than written out here
- a **half day**, which is where a hard-coded 390 dies
- a **holiday** and a **weekend**, which are empty answers rather than failures
- a **gap** inside a session — a minute with no print, which on IEX is ordinary for a thinly
  traded name and which Story 2.8 must not read as a fault
- a range that **crosses a DST transition**, since the UTC open moves 14:30Z → 13:30Z and
  back and `CALENDAR.md` §7 already names the dates to use
- a range spanning a **corporate action**, so Task 2.6.3's adjustment modes return genuinely
  different numbers rather than agreeing by accident — otherwise nothing in this story ever
  exercises criterion 5's real consequence

### Every error cause, produced — criterion 4

Each member of Task 2.6.5's taxonomy needs a way to be triggered, and the mechanism should be
part of the fixture corpus rather than a special flag on the interface: a symbol that is
configured to be rate-limited, a symbol that does not exist, a corpus entry that says the
upstream is unavailable. The interface must not grow a `simulateError` parameter — that is a
test concern leaking into a shipped type, which is the shape Task 1.10.5 refused when it
declined to widen `config.ts`'s port range for a test's convenience.

**Then assert distinguishability rather than assuming it**: a test that receives each cause
and branches on it, which is what proves the union is switchable and not merely different
strings.

### Where it lives, and the `files` consequence

Task 2.6.1 decided whether it ships. If it does, it is `apps/backend/src`, it is in the
container image, and **which provider is active is configuration** — a `CONFIG_VARIABLES`
entry, an `.env.example` line, and `pnpm env:check` will fail if the two disagree, including
on the default. That check has been made to fail all four ways before and will do so again.

State the safety property explicitly wherever the selection is read: a deployment that
selects the fixture provider is serving **invented prices**, so the default must be the one
that fails loudly rather than the one that quietly works. Task 1.8.3's `CORS_ORIGIN` note is
the precedent — a default that is convenient in development is a decision about production,
and it must be written down as one.

### The test suite this creates

Fast tests, in `pnpm test`, no build, no socket, no database. If a fixture is large enough
that loading it is slow, that is a signal the corpus is too realistic rather than a reason to
move the suite.

## Done when

- The fixture provider implements the interface **completely** — no method left throwing
  "not implemented"
- The same request produces a byte-identical series across runs, asserted
- Every error cause from Task 2.6.5 is produced against it and each is distinguished by a
  caller in a test
- The half day, the holiday, the gap, the DST range and the corporate action are all covered,
  with counts derived from `market-session.ts` rather than written out
- A fixture series' provenance cannot be mistaken for real market data
- The range filter is half-open and was **seen to fail** against a bar sitting exactly on
  `range.end`, which is the one boundary an inclusive comparison gets wrong and no other test
  in the corpus would notice
- If it ships: the provider selection is in `CONFIG_VARIABLES` and `.env.example`,
  `pnpm env:check` passes, and the default is the loud one
- `pnpm test` passes **with the network disabled**, checked rather than assumed — criterion 6
- `pnpm verify` is exit 0

## Notes

The re-recording obligation is the thing most likely to be quietly dropped. If Story 2.7 does
not re-record this corpus against a real Alpaca response, every test in this story is
asserting that our code agrees with our assumptions — which is a green suite that certifies
nothing, and this repository has already named that failure twice.
