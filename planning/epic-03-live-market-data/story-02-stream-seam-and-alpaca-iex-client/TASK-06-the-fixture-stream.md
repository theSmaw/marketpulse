# Task 3.2.6 — The fixture stream, and the default that must stay `none`

**Status:** Not started
**Story:** [3.2 The Market-Data Stream Seam & the Alpaca IEX Client](STORY.md)
**Depends on:** 3.2.5

## Objective

A second implementation of `MarketDataStream` that generates observations with
**no credential, no network and no database**, so `pnpm test` has a live feed.

## What the user can see when this lands

**Nothing** in the deployed product. A developer running `pnpm dev` against it
sees invented numbers move — and **invented is the operative word**, which is why
this is not the thing Story 3.4 designs against.

## What is already decided and must not be re-taken

- **The default is `none`, emphatically not `fixture`** — [`PROVIDER.md`](../../epic-02-security-universe-historical-data/story-06-market-data-provider-abstraction/PROVIDER.md)
  §5.3. **Invented prices must never be reachable by forgetting to configure
  something.** This is the single most important line in the task.
- **No second configuration variable.** `MARKET_DATA_PROVIDER`'s id vocabulary
  is shared, and the story is explicit that this epic adds none.
- **`pnpm test` may touch no database**, which is exactly why this exists
  separately from 3.2.7's replay.
- **A generated bar's `BarSource` names `synthetic`**, which already exists in
  `MARKET_FEEDS` — not `iex`, and not `replay`. Its feed is what it is.

## Work

- **Implement `MarketDataStream` with generated observations**, in the shape
  `fixture-provider.ts` already established. Same interface, no method that
  throws.
- **Make it drive the same state machine** — including the unhappy states, so a
  test can exercise _disconnected_ without a socket. A fixture stream that can
  only be healthy leaves half the interface untested.
- **Deterministic by default.** A seeded generator, so a test asserting on a
  value is not asserting on a coin flip. `CLAUDE.md`'s rule about asserting
  latency without a large n applies here in reverse: do not make the suite depend
  on randomness it cannot control.
- **Check the default.** Add or extend a test that `MARKET_DATA_PROVIDER`
  unset produces **no feed at all** rather than a fixture feed, and give it a
  `pnpm break` entry — a default that has never been tested by breaking it is a
  default nobody has checked.

## Done when

- A second implementation exists; **neither it nor the client has a method that
  throws** (acceptance criterion 1 is now fully satisfiable)
- Its bars stamp `synthetic`
- The unhappy states are reachable through it
- Unset configuration yields **no feed**, proven by a `pnpm break` entry
- `pnpm verify` passes with no database
- The generator is deterministic under a seed

## Notes

The interesting question this task answers is whether 3.2.2's interface was
really written first. **A second implementation is where a seam that was secretly
a description of one client falls over** — if the fixture stream has to
contort, that is the finding, and it belongs in this task's record rather than
being smoothed away.
