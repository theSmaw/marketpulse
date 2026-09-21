# Task 3.5.1 — The current market state, as an object nobody renders yet

**Status:** Not started
**Story:** [3.5 Subscription Management & the Current Market State](STORY.md)
**Depends on:** 3.4 (shipped)

## Objective

Build the object this whole story exists for: **the latest observation per
security**, held in the process, written by the socket and read by everybody
else.

Today there is no such object. `index.ts` subscribes to the stream with
`onObservations: () => undefined` — **every observation this product receives is
currently thrown away**, and the only reason a price moves on screen is that
`market-gateway.ts` holds a second subscription and re-broadcasts each batch
without remembering it. Nothing in this process can answer _what is NVDA's
latest price_ without a browser being attached.

## What the user can see when this lands

**Nothing.** Not one pixel changes, and the story that pays it off is
[3.6](../story-06-live-prices-across-the-universe/STORY.md), which puts 518 live
prices on screen and cannot exist without it.

What the user still cannot do: see the universe move, see a correct price on
first paint, or survive a deploy without reloading.

## Why this is a task rather than the whole story

Because the object and its **consumers** are separate work with separate failure
modes. This task builds a `Map` with one writer; Tasks 3.5.3–3.5.6 are about
what happens when many readers and many browsers pull on it. Getting the object
wrong is a correctness bug; getting the fan-out wrong is a memory leak on a slow
connection during a busy session.

## The shape, which §10.3 already settles

A `Map<symbol, LiveObservation>` — **0.2 MB measured** at universe scale, one
writer, many readers. Three properties that are easy to get wrong, all recorded
in [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md)
§10.3 and §14.1:

- **After a restart the map is legitimately empty**, and it refills
  **unevenly** — within a minute for a liquid name, possibly hours for `ERIE`
  (§7.6 measured IEX covering 65.1% of minutes for a median symbol and **2.1%**
  for `ERIE`). So _no current observation for this symbol_ is an **ordinary
  answer rather than an error**, and every reader must have a word for it.
- **It is not cleared on a session boundary.** At 09:31 on Monday it still holds
  Friday's bars, which is **correct**, and is only safe because every entry
  carries its own `startsAt` and **no reader may render a price without reading
  it**. A reader that trusts presence over instant ships Friday's price as
  today's.
- **A bar is not final for thirty seconds.** §14.1 measured revisions at 0.064%
  of bars, arriving **29.1–30.1 s** after the bar they correct, **35.3%**
  changing the close and **none** changing nothing. So the map replaces by
  `(symbol, minute)` rather than appending — this is where
  `LiveObservation.supersedes` is finally **acted on**, which Task 3.2.4
  deliberately left undone because acting requires state and the state is this
  task's.

## Work

- A module holding the map, with a read by symbol that returns the observation,
  its instant, its source and **how old it is** — criterion 2. Age is computed
  on read against the clock seam, never stored.
- **Apply revisions by `(symbol, minute)`.** A `u` frame for a minute already
  held replaces it; a `u` frame for a minute we never saw is an insert, not an
  error.
- **Filter on `status`** — criterion 6. This is a computation over _the market
  we track now_, which `UNIVERSE.md` §12.2 puts firmly on the filtering side.
  Story 3.9's read path is **not** filtered, and that asymmetry is deliberate;
  write the reason beside the filter so the next reader does not "fix" it.
- Wire it as the stream's `onObservations` in `index.ts`, replacing the
  discard — and **leave the gateway's own subscription alone for now**, because
  Task 3.5.7 owns collapsing the two.
- A read for _everything currently held_, which Task 3.5.3 turns into the
  snapshot.

## Done when

1. The map is written by the live stream in a running process, proven by a test
   that observes a stream and then reads a price back **without a browser
   attached** — the thing that is impossible today
2. A revision for a held minute **replaces** rather than appends, asserted
   against the recorded `u` fixture
3. A symbol with nothing observed reads as an explicit _nothing observed_
   rather than as a zero, an empty string or a throw
4. Reading a price and reading its instant are the **same** call, so a reader
   cannot get one without the other
5. `status` is filtered, with a `pnpm break` entry proving the filter goes red
   when removed — **a check you add owes a break**
6. `pnpm verify` passes

## Reversal trigger

**The first reader that needs more than the latest bar per security** — a
second-to-last value, a running high, an intraday series. That is the condition
under which this stops being a `Map` and becomes the thing Task 3.5.8's
measurement is really about; it is not a story number, because story numbers
move.
