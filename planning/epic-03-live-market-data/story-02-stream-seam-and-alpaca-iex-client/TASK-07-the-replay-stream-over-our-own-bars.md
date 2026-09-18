# Task 3.2.7 — The replay stream, and the guard that stops it lying

**Status:** Not started
**Story:** [3.2 The Market-Data Stream Seam & the Alpaca IEX Client](STORY.md)
**Depends on:** 3.2.6

## Objective

A third implementation reading the **48.4M real minute bars already in
`market_bars`**, re-stamped onto the wall clock — so `pnpm dev` shows **real
intraday movement** outside market hours. Plus the two guards that keep it from
becoming a lie.

## What the user can see when this lands

**Nothing in the product**, and this is the subtle one: a **developer** running
`pnpm dev` outside a session now sees real prices moving. That is not a user-
visible feature — it is the instrument Story 3.4 needs, because **invented prices
cannot settle a motion vocabulary**; the shape of real intraday movement is the
thing being designed against.

## What is already decided and must not be re-taken

- **[ADR 0030](../../../docs/adr/0030-replaying-our-own-bars-and-the-mechanisms-that-stop-the-live-feed-rotting.md) decisions 7a–7f are the layering, and the story says read
  them before implementing.** One mechanism **prevents**, two **detect and
  bound**, one **raises the number of independent mistakes needed from one to
  two**. **None is a compiler, and the word "guaranteed" must not appear in this
  story's record.**
- **The replay refuses to run while `marketSessionStateAt(now)` is `open`** —
  decision 7, and the developer-side guard. It catches the person who left
  `MARKET_DATA_PROVIDER=replay` in their `.env` and is building against a
  recording believing they are on the live feed. **This owes a `pnpm break`
  entry.**
- **Production only tells the truth, at any hour.** The deployed backend is
  `alpaca`; outside a session it shows stored history, a clock reading closed and
  a feed not delivering. **This story must not ship anything that makes a
  deployed replay reachable.**
- **Bars are re-stamped onto the wall clock while `occurredAt` keeps the
  recorded instant** (acceptance criterion 10), and **no observation is ever
  emitted ahead of the replay's own clock** — invariant 4 in miniature, and the
  **first place in this product where that constraint is real rather than
  anticipated.**
- **One engine over a `ReplayBarSource` seam** serves this and the generated
  case, so pacing, ordering, session advance and `BarSource` stamping exist
  **once**.
- **It reads through the shipped `MarketBarsRepository.readBars`** rather than
  its own query — and note `status` is Story 2.3's invisible predicate: a replay
  shows what we **stored**, so it **must not filter** on it.

## Work

- **Build the engine over the `ReplayBarSource` seam**, then the stored-bars
  source behind it.
- **The open-market refusal**, which both refuses to start and **stops if already
  running**. Test both directions: a replay that refuses to start but keeps
  running once the bell rings is the same defect.
- **Re-stamp onto the wall clock; keep `occurredAt`.** Two instants, both real,
  neither invented. This is where invariant 4 becomes code.
- **Stamp `replay` as both provider and feed** — which 3.2.1 made possible and
  the compiler now requires.
- **The `pnpm break` entry** proving the open-market guard goes red. `CLAUDE.md`:
  a break that does not go red is equally evidence the break did not land —
  verify the substitution.
- **Do not let a replayed bar near the database.** That guard is 3.2.8's and it
  is deliberately a separate task, because it protects a different boundary.

## Done when

- A third implementation exists over one shared engine
- The replay **refuses to start while the market is open and stops if the bell
  rings under it**, proven by a `pnpm break` entry rather than asserted
- Bars carry the wall clock and `occurredAt` keeps the recorded instant; a test
  proves **nothing is emitted ahead of the replay's own clock**
- `replay` is stamped as provider and feed
- `pnpm dev` outside a session shows real movement; `pnpm test` never touches
  the database
- `pnpm verify` passes

## Notes

**This is the task most likely to be remembered fondly and to cause the most
damage**, and the story says so in its own words: the risk it creates is that the
application gets built against the replay and the real socket quietly stops
working. Everything above is the answer, and every part of it is mechanical
rather than a good intention. **If a mechanism here is inconvenient, that is the
mechanism working.**
