# Task 3.4.2 — The first price that moves, with no vocabulary yet

**Status:** **Code complete, DELIVERABLE NOT DEMONSTRATED — 2026-09-20.** The identity block renders a live price and its four states are tested; the canvas carries the decision. **But no price could be made to move**, because _none of the three stream implementations delivers an observation into a running process_ — one defect fixed, two found. `pnpm verify` green.
**Story:** [3.4 The Motion Vocabulary & the First Price That Moves](STORY.md)
**Depends on:** 3.4.1

## Objective

**Put a moving number on a screen, deliberately undesigned**, and stand up the
replay so it can be watched at any hour. This is the instrument the next task's
design decision is taken against.

## What the user can see when this lands

**A price that changes while they watch it** on `/securities/:symbol` — the
first number in this product's history that moves on its own.

**It changes by swapping digits and nothing else.** No flash, no mark, no
colour, no transition. That is the honest starting point rather than a
placeholder: it is what "the correct answer may be very small" looks like at its
smallest, and the next task has to beat it on purpose rather than by default.

## Why the plain version ships first, rather than being skipped

**Open decision 1 says static mock-ups cannot settle a motion decision.** You
cannot design against a still image of a moving thing, and you cannot design
against a number that does not move yet. **So the subject of the decision has to
exist before the decision.**

It is also the story's own argument one level down: a vocabulary designed
against a mock is a vocabulary designed for the easy case, and this story exists
because that already happened once.

## What is already decided and must not be re-taken

- **One surface: the identity block's last price** on the Security Explorer.
  **A vocabulary is a decision and three surfaces would make it three
  decisions**; the universe table is Story 3.6 and the chart is Story 3.9.
- **A number ticks ONCE A MINUTE or less, never continuously** (§10.1, §7.6).
  There is no intra-minute movement on any screen in this epic — trades cannot
  reach 518 symbols (§1.4's 30-symbol cap) and no story delivers them. **Do not
  build anything that assumes a stream of ticks.**
- **The arrival is a burst, not a trickle**: about **332 bars inside 243 ms**,
  once a minute (§7.4).
- **Tabular numerals are already load-bearing** and become more so: a value that
  changes width must not move anything around it.
- **The existing `LAST SESSION CLOSE` block is a different claim** and this must
  not silently overwrite it. A live price and yesterday's close are two facts;
  decide what the block says when both exist, and say it in words rather than by
  replacing one with the other.

## The replay is the instrument, and it has an hours rule of its own

**ADR 0030's replay of our own stored minute bars** is why this story's design
work no longer waits for 21:30 — it is **real recorded intraday movement**,
available at any hour.

```
MARKET_DATA_PROVIDER=replay NON_LIVE_MARKET_DATA=permitted pnpm dev
```

- **It refuses during a session**, deliberately — `pnpm break
replay-refuses-during-a-session` proves it — so out of hours you replay and in
  session you get the real feed. Nothing has to be remembered.
- **Design at 1×.** The engine takes a speed multiplier and a developer may run
  it faster to iterate, but **the vocabulary is settled at the cadence the
  product actually has.** A language tuned against a 10× replay is designed for
  a market that does not exist.
- **Production never serves it** (ADR 0030, and `NON_LIVE_MARKET_DATA` is the
  guard that refused a mis-configured start once already).

## Work

- **Wire the identity block's price to the store**, for the security on screen.
- **Stand up the replay** and confirm a number moves at 1× while watching it.
- **`pnpm probe` at four widths** and look at the screen — the story requires a
  person to have looked, and this is the first task where there is motion to
  look at.
- **Record what the undesigned version is actually like to watch.** That
  observation is the next task's starting evidence and it is worth writing down
  before anybody has an opinion about a treatment.

## Done when

- A price updates on `/securities/:symbol` **without a page refresh**
- It was watched at **1×** against the replay, and the observation is written
  down
- Nothing animates, flashes or transitions — deliberately
- The last-session-close claim is still honest beside it
- `pnpm verify` passes

---

## What was found

### The design decision: one figure, two claims, and the qualifier is what makes it honest

`The first price that moves.dc.html` on the canvas. The block keeps its three
lines and **all three change together**, which is what makes this a _stated_
substitution rather than the silent one the task forbids.

|            | Label                | Figure                        | Qualifier                                     |
| ---------- | -------------------- | ----------------------------- | --------------------------------------------- |
| **Before** | `LAST SESSION CLOSE` | close, vs previous close      | `2026-09-11 · change from the previous close` |
| **After**  | `LATEST PRICE`       | live close, vs the last close | `14:01 EDT · change from 2026-09-11's close`  |

**The label is not `LIVE`.** §11.2 is explicit that a security gets **no status
word** — the gap between one security's bars has a p50 of one minute and a
**maximum of 187**, so no threshold separates a quiet security from a broken
one. And not `Last trade`: this is a minute bar's close, and a trade is a thing
we do not have.

**The instant takes the qualifier's first slot**, which is §10.3's rule applied:
a live price is at most a minute old for a liquid security and **may
legitimately be hours old** for a thin one, and the instant is the only thing
that tells those apart.

**And the displaced close is NAMED rather than deleted** — the change was always
_from the previous close_, and is now from a close **with a date on it**. That
is the difference between replacing a claim and superseding one, and it costs
four words.

**The percentage changes its basis, which is the half most likely to be got
wrong.** Before it is close-against-previous-close, a completed session's move
that never changes again. After it is live-against-the-last-close, which is what
every market screen means by _today_. `changeFromClose` is a **second function
rather than a flag**, because a version that kept the old basis would show a
figure that never moved beside a number that did, and nothing about it would
look wrong.

**A live price with no stored close shows no percentage at all** — not a zero.
`0.00%` would claim the price has not moved, which is not what _we cannot say_
means.

### ADR 0023's store trigger did NOT fire, and that was worth checking

The route needs the observation and the hook lives in `App`. The recorded
trigger for a store is _the first piece of state two features must agree about
that neither owns_ — and it looked like this was it.

**It is not.** `SecurityExplorer`'s element is constructed in `App` and already
takes `marketFeed` as a prop. The value reaches it by the path that is already
there, so this is a prop and not a context, and the trigger stays unfired.

### THE DELIVERABLE COULD NOT BE DEMONSTRATED, and the reason is three separate faults

The task's own Done-when is _a price updates without a page refresh_, watched at
1×. **It could not be watched, because nothing delivered an observation.** All
three implementations were tried:

| Provider  | What happened                                                                |
| --------- | ---------------------------------------------------------------------------- |
| `replay`  | **Two faults. One fixed.**                                                   |
| `fixture` | **Emits only when `tick()` is called, and nothing in the process calls it.** |
| `alpaca`  | **`406`** — the deployed backend holds the plan's single connection          |

**1. `defaultReplayStart` ignored the trading calendar — FIXED.** It was
`now - 7 days` at 09:30 and nothing else, which lands on whatever weekday the
subtraction produces — **and on a weekend that is another weekend.** Today is
2026-09-20, so it resolved to **Sunday 2026-09-13**, a day the market was shut
and the store holds nothing for.

**The failure is silent in the worst way**: the replay reported `live` and
emitted nothing, which is indistinguishable from a broken feed. And it is
exactly backwards from ADR 0030's purpose — the replay exists so this epic's
design work can run **at any hour**, and the hours it most needs to serve are
the ones where the naive subtraction lands on a closed day. It now walks back to
a session the market actually held, asserted for four weekdays.

**2. The replay still emits nothing, and three causes are ruled out.** After the
fix, `from` is Friday 2026-09-11 13:30Z; the store holds **390 minute bars per
symbol in exactly that window** for all five; and the engine's ceiling
arithmetic is right — the first slice is at `from` itself, so it is due
immediately. **What is left is `createStoredReplaySource`**, and that is a
deeper dig than this task warrants.

**3. `createFixtureStream` has no timer.** It exposes `tick()` and nothing in
`index.ts` or `market-stream.ts` calls it — it is a **test instrument** that a
running process cannot drive.

### The shape of that, which is worth more than any one of the three

Story 3.2's close found **three implementations with no construction site**, and
a green `verify` throughout. This is the same shape one level further out:
**three implementations that are constructed, and none of which drives itself.**
The seam is exercised by tests that call `tick()` or inject events; nothing has
ever asserted that a stream, left alone in a process, produces anything.

**That is what let it survive two stories.** `pnpm verify` is green, 1,011
frontend tests pass, and the product cannot show a moving number.

### What this blocks

**Task 3.4.4 cannot start.** Its whole method is _two or three treatments shown
at 1× against the replay_, and there is nothing to show them against.

**So [Task 3.4.3](TASK-03-a-stream-that-drives-itself.md) was inserted on
2026-09-20** and the rest of the story renumbered behind it. It owns the fix,
**and the assertion that was missing** — because a repair that makes a number
move without leaving something that would go red if it stopped is the same gap
again, one story later.

## For a stakeholder — a status report, 2026-09-20

**Where the product is.** A user can explore 518 US companies and their
historical charts, and the chrome says honestly whether live data is arriving.
This task was meant to produce **the first number in this product's history that
moves on its own.**

**The screen is ready and the number did not move.** That is the honest headline.

**What was built, and it is finished.** The identity block — the block showing
NVDA's price at the top of the page — now knows how to show a live price, and
the decision about _what it says_ was the real work.

That block currently says **"Last session close · 218.29 · change from the
previous close"**. A live price is **not a newer version of that number**: it is
a different number, measured from a different thing, true at a different moment.
Quietly swapping one for the other would have been the product lying by
omission.

So all three lines change together. The label becomes **"Latest price"**, the
figure becomes the live one, and the small print becomes **"14:01 EDT · change
from 2026-09-11's close"** — which does two jobs: it says **when** the price is
from, because a live price can legitimately be hours old for a thinly-traded
company and that is the feed working correctly; and it **names** the closing
price it is being compared against, so the fact it displaced is still on the
screen rather than deleted.

**And deliberately, it does not move, flash, or animate.** That is this task's
deliverable rather than an omission: you cannot decide how a number should
change by looking at a picture of a number that doesn't. The next task puts two
or three options on a real screen and asks you to choose — and shipping the
plainest possible version first means any fancier option has to **beat nothing
on purpose** rather than win by default.

**Why nothing moved, which is three separate problems.**

We have three ways to feed prices in: a replay of our own recorded market data,
a synthetic generator, and the real market feed. **All three failed, for
different reasons.**

- **The replay had a date bug, now fixed.** It was set to replay "one week ago",
  calculated by subtracting seven days — which on a **weekend lands on another
  weekend**, a day the market was shut and we hold nothing for. It reported
  itself as working and produced nothing. That is the worst kind of failure, and
  it is precisely backwards: the replay exists so we can work at **any** hour,
  and the hours it most needs to cover are the ones it was failing on.
- **The replay still produces nothing**, and I have ruled out three of the four
  possible causes — the data is there, the dates are now right, the timing logic
  is correct. The remaining piece is the database query, which is the next thing
  to look at.
- **The synthetic generator has no clock.** It only produces a price when a test
  explicitly asks it to. Nothing in the running application ever asks.
- **The real market feed is refused**, because our deployed site is holding our
  data provider's single permitted connection — the outage reported yesterday.

**The pattern underneath is the finding worth reporting.** An earlier story
found three pieces of this system that were built but never actually
_used_ anywhere. This is the same shape one step further on: three pieces that
are used, and **none of which runs on its own**. Every test drives them by hand,
so nothing ever checked that one left alone in a running application produces
anything at all. That is how it survived two stories with every automated check
passing.

**What this means for the schedule.** The next task is the design decision —
choosing how a changing price should look — and it **cannot start** until
something makes a number move. Fixing the replay's database query is now ahead
of the design work.

**What a user can see today: nothing new**, and one task from now that should
change.

---

## Amended by Task 3.6.1 — 2026-09-21: the basis this task chose was wrong in one case, and the two qualifiers converged

**`changeFromClose` shipped here and measured against `close.close` — the last
session we hold a daily bar for.** Task 3.6.1 found the case where that is the
wrong number, and it is not exotic: **the nightly backfill writes today**, so
the stored close and the live bar share a session every evening in development
and on a cold load the morning after a deploy.

Measuring a live price against a close **from its own session** compares a price
with itself. The whole column then reads **≈0.00%** — well-formed, correctly
formatted, correctly coloured numbers reporting that nothing moved. The repair
is a basis chosen by comparing sessions, using `previousClose`, which was
already on the wire.

### What that does to the table above

|                                      | Label          | Figure                                 | Qualifier                                    |
| ------------------------------------ | -------------- | -------------------------------------- | -------------------------------------------- |
| **After**, ordinary case             | `LATEST PRICE` | live close, vs **the last close**      | `14:01 EDT · change from 2026-09-11's close` |
| **After**, store already holds today | `LATEST PRICE` | live close, vs **the close before it** | `14:01 EDT · change from the previous close` |

**The second row renders the exact third clause the `Before` state owns**, and
that is worth writing down rather than leaving to be discovered: this task's
argument was that the two states are distinguishable — _the displaced close is
named rather than deleted_, which is the difference between replacing a claim
and superseding one.

**The argument survives, and the reason it survives is this task's own
decision.** The discriminator is **the first slot**, not the third: the stored
state opens with a **session date** (`2026-09-11 · …`) and the live state with
an **instant** (`14:01 EDT · …`). That is why _the instant takes the
qualifier's first slot_ was the right call, and it is now load-bearing rather
than merely tidy — **the third clause has stopped telling the two apart.**

**Why the clause says `the previous close` rather than naming a date:** there
isn't one. `SecurityLastClose.previousClose` is a number with no session beside
it on the wire, so naming a date would mean inventing one by arithmetic on a
calendar — which is exactly what that field exists to avoid. The function
returns **which** close it used so the component never re-derives it.

**And this function had no unit tests when it shipped here.** Six were added by
Task 3.6.1, including one that fails against this task's implementation rather
than merely passing against the new one.
