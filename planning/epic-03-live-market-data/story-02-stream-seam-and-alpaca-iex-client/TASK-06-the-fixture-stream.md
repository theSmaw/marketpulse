# Task 3.2.6 — The fixture stream, and the default that must stay `none`

**Status:** **Complete — 2026-09-18.** `fixture-stream.ts`, 143 stream tests, a new `pnpm break`. **The second implementation found a real defect in the first** — `stale` could never fire in production. See _What was found_.
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

---

## What was found

### The second implementation found a bug the first could not

**This is the thing the task predicted, arriving from a direction it did not
predict.** The Notes asked whether the interface was really written first, and
expected the answer to show up as the fixture stream _contorting_. It did not
contort — it compiled first time. **What it did instead was expose a defect in
Task 3.2.5's client that 3.2.5's own tests structurally could not catch.**

**The defect: `stale` could never fire in production.**

`feedStatusOf` subtracted a single `now` from two different fields:

| Field               | Where it came from  | Scale                    |
| ------------------- | ------------------- | ------------------------ |
| `lastInboundAt`     | `performance.now()` | **monotonic**, near zero |
| `lastObservationAt` | `Date.parse(bar.t)` | **epoch**, ~1.76 × 10¹²  |

So `now - lastObservationAt` was hugely negative and could never reach the 60 s
threshold. The feed would have reported `live` or `disconnected` for ever and
**never `stale`** — silently, with every test green. §11.2 exists specifically to
make that state sayable, and §12.2 requires _our socket is fine and the feed
behind it is dead_ to be expressible.

**Why 3.2.5's tests could not have found it.** `stream-connection.test.ts`
constructs its own observations, so it put both numbers on one synthetic scale
and they agreed. `alpaca-stream.test.ts` never asserted `stale` at all. **Only an
implementation that generates observations from a real calendar instant while
reporting a synthetic monotonic clock puts the two scales side by side** — which
is what the fixture stream is.

### The fix is two clocks, because they measure different things

`FeedStatusInputs` now carries `now` **and** `wallNow`, and merging them was the
error rather than an over-simplification:

- **Liveness is elapsed time since a frame arrived.** It must not move when the
  machine sleeps or NTP corrects the clock. **Monotonic.**
- **Staleness is how old an observation's own instant is.** §11.2 is explicit
  that it keys on the observation's timestamp rather than on a frame having
  arrived — §6.7 measured `dailyBars` re-sending a byte-identical aggregate every
  minute, and arrival-keyed staleness would call that liveness. An instant only
  has meaning against the **wall clock**.

**The type change named all 23 call sites**, which is the `satisfies`-guard
pattern doing the same job one layer over. Three regression tests now hold the
distinction, including one asserting the _shape_ of the bug — that the epoch
minus the monotonic reading exceeds the threshold while the reverse is negative —
so the fix cannot be quietly undone.

### The interface did NOT contort, and that is the other half of the answer

`fixture-stream.ts` implements `MarketDataStream` with **no change to the
interface**, no method that throws, and no added optional field. It drives the
**same** `stream-connection.ts` reducer, so the handshake a consumer sees is the
handshake the real client produces.

**Acceptance criterion 1 is only now fully satisfiable**: two things implement
the seam and neither has a method that throws.

### The unhappy states are reachable with no socket

`inject(event)` plays any `StreamEvent` through the same reducer, so
`disconnected`, `stale`, a `406` refusal and a close carrying §8.5's 30,016 ms
timeout are all testable without a server. **A fixture stream that could only ever
be healthy would leave half the interface untested** — and the half that matters,
since the silent death and the deploy-time refusal are the states the product has
to get right.

### `tick()` is driven rather than timed

A generator on a real interval would make every test a race and make `pnpm dev`
depend on wall-clock timing. The caller decides when a minute passes — the same
decision the real client's injected clock makes, for the same reason.

### The default's break did not exist, and now does

`config.test.ts` has asserted `loadConfig({}).marketDataProvider === "none"` since
Story 2.6. **Nothing had ever proved that test goes red.** `pnpm break
market-data-default-is-none` now flips the default to `fixture` and proves it —
_a default that has never been tested by breaking it is a default nobody has
checked._

It is deliberately a **second** break beside `non-live-data-refused-at-startup`,
because they guard different routes to the same failure: that one stops a
deployment that **names** a non-live provider without permission; this one stops
a deployment that **names nothing at all**. Two ways to reach fabricated prices,
two breaks.

### What was checked and found already true

- **Bars stamp `synthetic`**, and `FixtureBarSource` narrows the field to the
  literal for the reason `StreamBarSource` does — a wide field is where a lie
  fits.
- **The generator never revises.** §7.8's `u` is a property of the _vendor_, and
  inventing one here would be inventing a behaviour rather than a number.
- **A property test over 150 generated bars** asserts `high` and `low` actually
  bound `open` and `close` — a generator emitting an impossible bar would put a
  defect into every chart test downstream, and the chart would render it without
  complaint.

## For a stakeholder — a status report, 2026-09-18

**Where the product is.** A user can explore 518 US companies and their
historical charts. They still cannot watch a price move. This was the sixth
building block of the work that changes that — and the one that caught a real
bug.

**What this task built:** a **stand-in** for the market data service. It makes up
prices and delivers them exactly the way the real service does, so the rest of the
system can be built and tested with no connection, no password, and at any hour.

**Why build a fake at all, when we just built the real one?** Two reasons, and
the second turned out to be the valuable one.

The first is practical: our automated checks run on a machine with no market
credentials, by design. Without a stand-in, everything downstream of the market
connection could only be tested by someone sitting at a desk during New York
trading hours.

**The second is that a second implementation is a test of the first.** We
deliberately designed the "shape" of a market connection before building any
connection — on the principle that if you build the thing first and describe it
afterwards, you have not written a standard, you have written a description of
one supplier. The only way to find out whether that worked is to build a
_second_ thing to the same shape and see whether it fits.

**It fitted. And in fitting, it found a bug that would have been invisible.**

Our system reports the market feed as one of three things: **live**, **stale**
(the connection is fine but prices have stopped arriving), or **disconnected**.
The stand-in revealed that **"stale" could never have been reported at all.**

The cause is the sort of thing that is obvious once seen and nearly impossible to
spot otherwise. Two different kinds of clock were being compared. One counts
_elapsed time_ — deliberately immune to the computer's clock being adjusted or
the machine going to sleep, because otherwise a sleeping laptop would look like a
broken connection. The other is the _actual date and time_, needed to ask "how
old is this price?". Those two numbers are in completely different units — like
comparing a stopwatch reading to a calendar date. The subtraction always produced
nonsense, and the nonsense always meant "not stale".

**Every test passed throughout**, because the tests for the real connection
happened to supply both numbers on the same made-up scale. **Only a second
implementation, generating prices against a real calendar while reporting a
stopwatch, put the two side by side.** That is precisely the value we were hoping
for from building things in this order, and it arrived in a form we did not
predict — we expected the stand-in to feel awkward to build, and instead it built
cleanly and exposed something else.

The fix separates the two clocks, and the compiler then pointed at all
twenty-three places that needed updating. Three new tests now hold the
distinction, including one that describes the _shape_ of the bug so it cannot
return quietly.

**One other thing worth reporting: we found a safety check nobody had ever
tested.** If someone deploys our system without saying which market data source
to use, it must produce **no data at all** — never invented prices. There has been
a test asserting that for weeks. But this repository holds a rule that a check
which has never been _seen to fail_ has never really been tested — so we
deliberately broke the setting, confirmed the test went red, and put that
sabotage-and-restore routine into the automated toolkit. It now sits beside a
similar one guarding a different route to the same danger.

**How this unlocks progress.** Everything after this can be built and tested
against a moving feed at any hour, with no credentials. **The next task replays
real recorded prices** — needed because invented numbers do not _move_ like real
ones, and the design work on how a changing price should look has to be done
against the real thing.

**What a user can see today: nothing new.** The screen is unchanged.
