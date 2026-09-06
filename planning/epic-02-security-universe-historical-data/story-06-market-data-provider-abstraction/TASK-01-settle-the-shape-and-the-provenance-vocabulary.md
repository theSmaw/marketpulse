# Task 2.6.1 — Settle where the seam lives, what provenance is attached to, and what "adjusted" means, shipping nothing

**Status:** Not started
**Story:** [2.6 Market-Data Provider Abstraction](STORY.md)
**Depends on:** Story 2.5

## Objective

Settle the story's three open decisions, plus the two it does not name and that the tasks
after this one cannot proceed without, and write them down. **Ship no code**, exactly as
Tasks 2.1.1, 2.2.1, 2.3.1 and 2.5.1 did.

## What the user can see when this lands

**Nothing, and no file outside `planning/` changes.** The tree finishes byte-identical and
`pnpm verify` is exit 0 — the check rather than a formality, because this task is the one
most likely to "just try something" against a candidate library and leave a stray dependency
behind. Task 2.5.1 installed three date libraries here and reverted all three.

## Where the record goes

`PROVIDER.md`, beside this file. That is `HOSTING.md`'s, `DATA-LAYER.md`'s, `UNIVERSE.md`'s
and `CALENDAR.md`'s arrangement: one document per story subject, in the story that owns it,
pointed at from `CLAUDE.md` rather than copied into it.

**Write it for two specific later readers.** Story 2.7 reads it before writing a line of
Alpaca code, and Epic 3 reads it before adding a streaming provider to the same seam. If
either has to re-derive a decision from the code, this document failed.

## The decisions

### 1. Where the interface lives — and the answer is probably a split rather than a place

The story's open decision 1 offers `packages/shared` or `apps/backend`, and applies Story
1.12's rule: shared means both sides depend on the same fact, not "shared is where types go".

Applied honestly, that rule **cuts through the middle of this story rather than choosing one
side**, and saying so is the decision:

- The frontend genuinely needs `Bar`, `Timeframe` and the provenance record — Story 2.12
  draws one and Story 2.14 renders the other. Those are facts both halves depend on.
- The frontend has no business knowing there is such a thing as a **provider**. A
  `MarketDataProvider` interface describes something that makes network calls to a vendor;
  putting it in `packages/shared` puts it in the browser's type graph and invites a future
  author to implement one there.

So the expected shape is: **domain types and provenance in `packages/shared`, the provider
interface and every implementation in `apps/backend`.** Take that decision explicitly, with
the alternative named, because the cheap move is to put it all in one place and the cost of
that only appears in Epic 3.

Two costs to state rather than discover, both already measured in this repository:

- `packages/shared` is **consumed as built output**, so a change there means rebuilding
  before either app typechecks against it
- it is **inlined into the frontend bundle**, and Task 2.3.8 measured that a vocabulary
  declared as a plain literal is tree-shaken completely while one built by _calling_ a
  function is not — `SECTOR_ETFS` cost 115 bytes to a page that never reads it. **Predict
  the bundle cost of whatever this story adds to `packages/shared`, and have Task 2.6.8
  measure it.**

### 2. Provenance per-series or per-bar

The story states the tension exactly: per-series is cheap and is right until a series is
stitched from two sources, which **Story 2.8's store does the moment stored bars and freshly
fetched bars appear in one response.**

That is not a hypothetical, so do not decide it as one. Work out what the per-series answer
actually renders when the series is mixed, and whether Story 2.14 can tell the truth from it.
The candidates worth costing:

- **Per-series, one record.** Cheapest. Becomes a lie on a stitched series unless the
  stitcher is forbidden from producing one, which is a rule nothing checks.
- **Per-series, but the record can name more than one source** — a list, with the series
  carrying the union. Truthful on a stitch, cheap on the common case, and it makes "this
  chart is 90% stored and 10% fresh" expressible.
- **Per-bar.** Always truthful and never wrong, at the cost of a provenance field on every
  row of a ten-million-row table — see Story 2.8's arithmetic before assuming that is
  affordable, and note it also lands in every JSON response on the wire.

State the answer, the alternative, and **the thing that would reverse it**.

### 3. Adjusted or raw as the stored default, and whether both are kept

The story is right that this is effectively irreversible for stored history, which is why it
sits here rather than in Story 2.8. What makes it irreversible: an adjustment factor applied
at write time cannot be undone later, because the factor is not stored beside the value.

The three shapes:

- **Store raw, adjust on read.** Nothing is lost. Costs an adjustment computation on every
  read and a corporate-actions table nobody has planned.
- **Store adjusted.** Cheapest to read and to chart. **A later split silently rewrites
  history** — every stored bar for that symbol is now on a different scale from every bar
  written before it, and nothing in the row says which.
- **Store both.** Truthful and doubles the largest table in the system.

Decide, and be explicit about the consequence for Epic 13: replay asks "what was knowable at
11:07", and an adjusted price is a value **nobody could have seen at 11:07**, because the
adjustment encodes a split that had not happened. That is invariant 4 arriving through a
number rather than through a timestamp, and it is the strongest argument in this decision.

### 4. The one the story does not name: where the fixture corpus comes from

Acceptance criterion 2 says a fixture provider is what tests use, and criterion 6 says
`pnpm verify` passes with no network access. But **the vendor client that could record real
fixtures is Story 2.7, which depends on this story.** That is a genuine ordering problem and
it needs an answer here rather than a shrug in Task 2.6.6:

- **Hand-authored fixtures now**, re-recorded from Alpaca in Story 2.7. Unblocks everything;
  the risk is that the fixtures encode our assumptions about the vendor's data rather than
  the vendor's data, so every test passes and Story 2.7 finds the shape is different.
- **Generated fixtures** from the calendar Story 2.5 shipped — plausible sessions, plausible
  bar counts, no invented realism. Cheaper to keep honest, worse at exercising edge cases.
- **Fixtures deferred**, with Story 2.7 recording them and back-filling this story's tests.
  Rejected on sight, probably, because it makes criterion 2 unmeetable within this story.

Whatever is chosen, **name the moment the corpus is re-recorded from a real response** and
put it in Story 2.7's file as an obligation rather than leaving it here as a hope.

### 5. The other one the story does not name: whether the fixture provider ships

Is the fixture provider test-only, or is it a **selectable provider in a running backend**?

The story's own words argue for the second — "usable by tests _and by a developer with no
Alpaca key_", and "what makes Story 2.12's chart work on a laptop on a train". If it ships,
three things follow immediately and all three are cheap now and awkward later: it lives in
`apps/backend/src` rather than beside a test, it is inside `apps/backend/package.json`'s
`files` field and therefore inside the container image, and **which provider is active
becomes configuration** — a `CONFIG_VARIABLES` entry, an `.env.example` line and a
`pnpm env:check` obligation.

That last one is what Task 2.6.7 renders. Decide it here.

### 6. And state how Epic 3 attaches, in one paragraph

The story requires the streaming provider to be an **addition** to this abstraction rather
than a replacement. Write the sketch down: does Epic 3 implement a second interface on the
same object, a sibling interface with a shared provenance record, or a subscription method
on this one? Nothing is built here. What is being bought is that Epic 3 does not have to
argue with a design that assumed request/response was the only mode.

## Work

- Answer all six above with the argument, not just the answer
- **Read the vendor's documentation for shape, not for adoption.** Story 2.7 writes the
  client; this task needs only enough of Alpaca's bar payload to know which fields exist, so
  that "resist copying the vendor's field set" in Task 2.6.2 is a decision taken against a
  known list rather than a guess. Write the list into `PROVIDER.md` and mark it as the
  vendor's, not ours
- **Check whether a dependency is needed at all**, and expect the answer to be no. If one is
  proposed, cost it the way Task 2.2.1 costed Kysely — store entries, KB, lockfile lines,
  install scripts, from a **fresh install** — then revert
- **List the error causes Task 2.6.5 will implement**, so that task builds against a list
  somebody chose rather than a list somebody remembered. The story names five: unknown
  symbol, rate-limited, unauthorised, upstream unavailable, bad range. Decide whether that is
  the complete set, and apply `API_ERROR_CODES`' own rule — a member exists when a failure
  can be **produced**, not when it can be imagined
- Leave the tree byte-identical

## Done when

- `PROVIDER.md` exists and answers all six, each with the alternative and why it lost
- The bundle prediction for `packages/shared` is written down and assigned to Task 2.6.8
- The fixture-corpus obligation is recorded in Story 2.7's file, not only here
- The error-cause list exists and Task 2.6.5 has nothing left to choose
- `pnpm verify` is exit 0 and `git status` is clean outside `planning/`

## Notes

The temptation is to skip this and start writing `interface MarketDataProvider`. The reason
not to is that decisions 2 and 3 are the two in this epic that **cannot be repaired from
outside later** — one is a claim printed beside every chart, and the other is baked into ten
million stored rows. That is the same position Task 2.4.1's seam was in, and the same
position `CALENDAR.md` §3 records for the replay clock.
