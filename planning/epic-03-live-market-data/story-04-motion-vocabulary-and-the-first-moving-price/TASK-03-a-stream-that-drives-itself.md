# Task 3.4.3 — A stream that drives itself, and the assertion that was missing

**Status:** **Complete — 2026-09-20.** A price moved on its own for the first time in this product's history: **219.40 → 219.60 → 219.96 → 219.78**, 60.1 s apart, watched at 1× with no page refresh. Two faults fixed, the suspect this task was handed was **innocent**, and the assertion that was missing now exists with two `pnpm break` entries behind it.
**Story:** [3.4 The Motion Vocabulary & the First Price That Moves](STORY.md)
**Depends on:** 3.4.2

## Objective

**Make a number move.** Task 3.4.2 shipped the screen and could not demonstrate
it, because **none of the three stream implementations delivers an observation
into a running process.** Everything after this is blocked on it.

## What the user can see when this lands

**The first number in this product's history that moves on its own** — the
deliverable Task 3.4.2 owed and could not produce. Digits swapping, nothing
else, exactly as that task designed it.

## Why this is a task rather than a line in 3.4.2

Because it is **not the same work**. 3.4.2 wired a component to a store and took
a design decision about what a block says; this is a backend defect in the seam
underneath, and the three faults below have nothing to do with each other. A
task that contained both would be two tasks with one name.

## What was found, so this does not start from zero

| Provider  | State                                                                     |
| --------- | ------------------------------------------------------------------------- |
| `replay`  | calendar fault **fixed** in 3.4.2; the stored source still yields nothing |
| `fixture` | **has no timer** — it emits only when a test calls `tick()`               |
| `alpaca`  | **`406`** — the deployed backend holds the plan's single connection       |

**Three of the four candidate causes for the replay are ruled out**, measured
rather than assumed:

- `from` resolves to **Friday 2026-09-11 13:30Z** since 3.4.2's calendar fix
- the store holds **390 minute bars per symbol in exactly that window**, for all
  five of `STREAM_SYMBOLS`
- the engine's ceiling arithmetic is right: `ceiling = from + elapsed × speed`,
  so the slice at `from` itself is due **immediately**

**What is left is `createStoredReplaySource`.**

## The shape underneath, which is what this task should actually leave behind

Story 3.2's close found **three implementations with no construction site** and
a green `verify` throughout. This is that one level further out: **three
implementations that are constructed, and none of which drives itself.**

Every test drives them by hand — `tick()`, or an injected event — so **nothing
has ever asserted that a stream left alone in a process produces anything.**
That is what let it survive two stories.

> **The repair is not finished when a number moves. It is finished when
> something would go red if it stopped.**

## Work

- **Fix `createStoredReplaySource`**, or give `createFixtureStream` a timer —
  and say which and why. The fixture is the cheaper route to _a number that
  moves_; the replay is the one Task 3.4.4's design decision needs, because it
  is **real recorded movement** rather than a generator's idea of some.
- **A timer on the fixture must run at the product's own cadence** (§2.1: one
  observation per symbol per minute). A generator emitting faster because it is
  convenient produces a motion decision designed for a market that does not
  exist, which is this story's own warning one level down.
- **Leave the missing assertion behind.** A test that starts a stream, advances
  time, and asserts an observation arrived **without anything calling `tick()`**
  — for whichever implementations are meant to be self-driving. It belongs in
  `pnpm test` with injected timers rather than in a browser.
- **Then finish Task 3.4.2's demonstration**: watch a price change at **1×**,
  `pnpm probe` at four widths, and **write down what the undesigned version is
  actually like to watch.** That observation is Task 3.4.4's starting evidence
  and is worth having before anybody has an opinion about a treatment.

## Done when

- A price updates on `/securities/:symbol` **without a page refresh**, watched
  at **1×**
- **A test fails if a stream stops driving itself** — the assertion that was
  missing, not just a working stream
- Which implementation was fixed, and why that one, is written down
- The observation of the undesigned version is recorded for Task 3.4.4
- `pnpm verify` passes

---

## What was found

### The suspect this task was handed was INNOCENT, and ninety-one milliseconds said so

Task 3.4.2 ruled out three of four candidate causes and named the fourth:
_"What is left is `createStoredReplaySource`."_ **It was not.**

A throwaway instrument built the real source against the real store with the
real repository behind it, and asked it for one slice:

```text
from = 2026-09-11T13:30:00.000Z  symbols = [ 'AAPL', 'MSFT', 'NVDA', 'SPY', 'QQQ' ]
next(from) -> 2026-09-11T13:30:00.000Z bars=5   91ms
next(+1)   -> 2026-09-11T13:31:00.000Z bars=5
```

The source was correct and had always been correct. **What was wrong was the
instant it was being asked about**, and the same instrument said that too — run
with the default rather than a hard-coded `from`, it printed:

```text
from = 2026-09-12T13:30:00.000Z
next(from) -> UNDEFINED  91ms
```

**2026-09-12 is a Saturday.** Task 3.4.2's calendar walk was supposed to make
that impossible.

### Fault 1: the walk validated one date and stamped another

`defaultReplayStart` asked the calendar about
`marketSessionOn(marketDateAt(day))` — the candidate's **market** date — and
then built the returned instant from that candidate's **UTC** calendar fields.

Those two agree at midday. They disagree before about 04:00 UTC, when New York
is still on the previous day. Measured at **2026-09-20T03:36Z**:

|                                                   | Reads                             |
| ------------------------------------------------- | --------------------------------- |
| `marketDateAt(day)` — what was checked            | **2026-09-11**, Friday, a session |
| `day.getUTCFullYear/Month/Date()` — what was used | **2026-09-12**, Saturday          |

So the walk found a real session and returned the day after it. And the failure
is the silent one ADR 0030 exists to prevent: the replay reported `live` and
emitted nothing, which is indistinguishable from a dead feed.

**The repair is that the walk returns the session's own `open` instant.** It
closes a second, latent bug in the same line: a hard-coded `13:30Z` is 09:30
**EDT** only, so every replay defaulted between November and March would have
started an hour before the bell — an hour of correctly reporting `live` while
the store holds nothing.

### Why the test could not see it, which is the finding that outlives the bug

Task 3.4.2 shipped four test cases for exactly this walk. All four passed.

**Every one of them ran at `12:00:00Z`** — the only time of day where the two
dates cannot disagree — and the assertion,
`expect(marketSessionOn(marketDateAt(from))).toBeDefined()`, **converted the
answer back along the axis that was wrong.**

> **A check written in the same units as the thing it checks cannot see a units
> error.** It is not a weak assertion; it is a correct assertion of a different
> claim.

So the cases now straddle the offset — `03:36Z`, `00:20Z`, `02:00Z`, and a
winter date where the offset is EST rather than EDT — and two assertions were
added on axes `defaultReplayStart` does **not** convert on: the instant must
**be** a session's `open`, and its **UTC day must be a weekday**.

### Fault 2: the fixture had no clock, and `tick()` was the only door

`createFixtureStream` exposed `tick()` and nothing in a running process called
it. A deployment selecting `fixture` completed the handshake, reported a healthy
connection, and produced nothing for ever.

It now arms a timer on `subscribe` and clears it on unsubscribe, **at 60 s** —
§10.1's grain and §2.1's cadence. The default is deliberately not shortened for
convenience: a generator emitting every second produces a motion vocabulary
designed for a market that does not exist, which is this story's own warning one
level down. A test shortens it by injecting the timer instead.

### Which implementation was fixed, and why that one

**Both, and the task's "or" was the wrong question.** The brief offered a choice
— fix the replay _or_ give the fixture a timer — on the reasoning that the
fixture is cheaper and the replay is what Task 3.4.4 needs.

Once the replay's real fault turned out to be four lines in `defaultReplayStart`
rather than a dig through `createStoredReplaySource`, the cost argument
evaporated. And **the fixture's missing clock is not a convenience, it is the
same defect** this task exists to close: a `MarketDataStream` that a running
process constructs and that cannot advance itself. Leaving one of the two
standing would have left the shape intact and the assertion only half true.

**`alpaca` is deliberately NOT self-driving.** It is driven by frames arriving
on a socket, and a timer there would be a defect rather than a feature — a
client inventing minutes the vendor had not sent is manufacturing prices. Its
equivalent claim, _a frame produces an observation_, is already asserted.

### The assertion that was missing, and the two breaks that prove it

`apps/backend/src/self-driving-streams.test.ts`. Each self-driving stream is
started **through `createMarketStream`** — the construction site, not the file —
given an injected timer, and asserted to have delivered an observation.

**Nothing in it calls `tick()`, and that absence is the test.** A version that
called it would pass against the exact defect the file exists to catch.

Both halves are break-verified, and both breaks restore the tree **exactly as it
shipped** rather than inventing a synthetic fault:

```text
pnpm break fixture-stream-drives-itself
  ✓ apps/backend/src/fixture-stream.ts broken → red → restored byte-identical.
    matched: produces a minute with nothing but time passing

pnpm break replay-start-is-a-real-session
  ✓ apps/backend/src/market-stream.ts broken → red → restored byte-identical.
    matched: lands on a real trading session
```

### The demonstration: the first number in this product's history that moved

`MARKET_DATA_PROVIDER=replay NON_LIVE_MARKET_DATA=permitted pnpm dev`, watched
on `/securities/NVDA` at **1×**, with no page refresh. A `bars` frame, verbatim
off the browser socket and truncated at 460 characters by the instrument:

```text
 83.1s 643B {"type":"bars","version":1,"observations":{"AAPL":{"startsAt":"2026-09-20T03:43:04.107Z","open":328.555,"high":329.48,"low":328.355,"close":328.8702,"volume":303111},"MSFT":{"startsAt":"2026-09-20T03:43:04.107Z","open":493.77,"high":494.78,"low":493.7501,"close":494.56,"volume":29975},"NVDA":{"startsAt":"2026-09-20T03:43:04.107Z","open":219.36,"high":219.74,"low":219.18,"close":219.6,"volume":482958},"SPY":{"startsAt":"2026-09-20T03:43:04.107Z","open":764.
```

| Elapsed | Gap        | NVDA, as rendered | Glyphs changed |
| ------- | ---------- | ----------------- | -------------- |
| 23.0 s  | —          | `219.40`          | —              |
| 83.1 s  | **60.1 s** | `219.60`          | **1**          |
| 143.2 s | **60.1 s** | `219.96`          | **2**          |
| 203.2 s | **60.0 s** | `219.78`          | **2**          |

## The observation of the undesigned version — Task 3.4.4's starting evidence

Recorded before anybody had an opinion about a treatment, which is the only time
it can honestly be recorded. It is also on the canvas, in
`The first price that moves.dc.html` §06.

**1. It is not distracting. It is nearly invisible.** That is the opposite of
what the story feared. A minute of real movement changes **one or two glyphs in
the middle of a six-glyph number**, and the leading digits never moved once in
four minutes. Unless you are looking directly at the figure, nothing announces
that anything happened — and a reader consulting a price chart is, by
definition, looking somewhere else.

**So Task 3.4.4 is not choosing how loudly to announce a change.** It is
deciding whether a change should be noticeable **in peripheral vision at all**,
and what that costs in calm.

**2. Three figures move at once, every minute** — the price, the percentage and
the instant. A treatment has to say whether it marks one of them or all three,
and the question does not arise from a mock-up because a mock-up has one state.

**3. The biggest visual event is not a tick, and nobody designed it.** On
**every** page load the block reads `LAST SESSION CLOSE · 218.29`, and then —
**up to a minute later** — all three lines change together to `LATEST PRICE ·
219.40 · Sep 19 · 23:42 EDT`. Label, figure, basis and colour, at once.

That is §11.1 working correctly: a browser joining under deltas-only sees
nothing until each security's next bar, and the gateway's snapshot is
deliberately empty until Story 3.5 builds the current-state model. But it means
the story has **two events to name rather than one** — _a price moved_, and
_this block now answers a different question_ — and a vocabulary for the first
will have the second happen to it anyway, undesigned, once per visit.

**4. Nothing moved on the page.** Tabular numerals held at all four widths. The
identity block measured `1392×107`, `976×107`, `720×203` and `342×219` at
1440 / 1024 / 768 / 390, and no width overflowed.

### One thing seen that belongs to the chrome, and is NOT this story's

**The status bar contradicts itself on a replay**, at every width:

```text
MARKET FEED  ○ NOT CONFIGURED  No market-data provider is configured.
             ● REPLAYING       Replaying a past session. Not the live market.
```

Both sentences are true. The first is the **stored series'** provenance and the
second is the **live connection's**, and one environment variable selects both —
so `replay` is a valid live selection and no historical provider at all. Under a
single _Market feed_ label a reader gets _nothing is configured_ and _we are
replaying_ three words apart.

**It is invisible in production**, where one provider answers both, and it is
§11.3's grid rather than this story's. Recorded here because this was the first
time a live feed and an unconfigured historical provider were ever on one screen
together — and raised with the user rather than left in a task file.

## For a stakeholder — a status report, 2026-09-20

**A price moved on its own for the first time in this product's history.**
219.40, then 219.60, then 219.96, then 219.78 — a minute apart, on screen, with
nobody refreshing anything. That is the deliverable the previous task owed and
could not produce, and it is the sentence this epic exists to be able to write.

**What was actually wrong, which was not what we thought.** The previous task
left a prime suspect: the piece of code that reads recorded prices out of our
database. It spent a day under suspicion and it was **innocent** — a
twenty-line throwaway instrument proved it in under a tenth of a second by
asking it for one minute of prices and getting five companies' worth back.

The real fault was two doors up, in the code that decides **which day to
replay**. We had already fixed this once: it used to say "a week ago" and land
on a weekend. The fix taught it to walk back to a day the market was actually
open — and then it **checked one date and used a different one**. Before dawn
UK time, New York is still on the previous day, so the code confirmed _Friday
was a trading day_ and then handed back _Saturday_. The replay reported itself
perfectly healthy and produced nothing, which is the worst kind of failure
because it looks exactly like working.

**Why our tests did not catch it, which is worth more than the bug.** There were
four tests covering that exact function and all four passed. Every one of them
ran the clock at midday — the only time of day where the two dates cannot
disagree — and then checked the answer by performing **the same conversion the
broken code performed**. A ruler with the same fault as the thing it measures
reports everything as correct. The tests now run before dawn, in winter, and
check the answer on a measure the code never touches.

**The second problem, and the pattern underneath both.** Our synthetic price
generator had **no clock at all** — it produced a price only when a test asked
it to, and nothing in the running application ever asked. An earlier story found
three pieces of this system that were built but never used anywhere. This was
the same shape one step on: three pieces that _are_ used, and none that ran on
its own. Every test drove them by hand, so **nothing had ever checked that one
left alone produces anything**. That is how it survived two stories with every
automated check green.

**So the repair was not finished when the number moved.** There is now a test
that starts each feed, lets time pass, and fails if nothing arrives — and we
deliberately broke the code twice, in the exact way it was broken before, to
confirm the test goes red. A check that has never failed has never been tested.

**And the generator now runs at one price a minute, not faster.** It would have
been convenient to make it tick every second while we work on the next task. It
would also have meant designing how a changing price should look against a
market that does not exist.

**What we learned by watching it, which is the next task's whole input.** We
expected a number ticking once a minute to be _distracting_. It is the opposite:
it is **almost impossible to notice**. A minute of real market movement changes
one digit in the middle of the number, and the first two digits did not change
once in four minutes. The next task is therefore not "how loud should this be" —
it is "should a change be noticeable when you are not looking at it, and what
does that cost in calm?"

We also found something nobody had designed: **the largest visual change on the
page is not a price tick.** When you first load the page it shows yesterday's
closing price, and then up to a minute later the whole block changes at
once — its heading, its number, its colour and what it is comparing against.
That happens on **every single visit**, and it is much bigger than anything that
follows.

**What a user can see today:** a price that changes while they watch it, on the
Security Explorer, out of market hours, against our own recorded data. **The
next task decides what that change should look like** — and for the first time
it can be decided in front of the real thing rather than a drawing.
