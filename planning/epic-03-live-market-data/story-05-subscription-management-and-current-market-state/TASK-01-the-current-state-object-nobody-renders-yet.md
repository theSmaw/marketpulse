# Task 3.5.1 — The current market state, as an object nobody renders yet

**Status:** **Complete — 2026-09-21.** This backend now remembers what it has seen. Ten tests, two `pnpm break` entries, and a **fifteenth invariant** added because the object could have shipped fully tested and never called — the fourth candidate for a defect family this repository has shipped three times.
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
modes. This task builds a `Map` with one writer; Tasks 3.5.4–3.5.7 are about
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
  Task 3.5.2 owns collapsing the two.
- A read for _everything currently held_, which Task 3.5.4 turns into the
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

---

## What was built

`apps/backend/src/current-market-state.ts` — one `Map`, one writer, many
readers, and the four decisions below.

### 1. A price and its instant are one object, enforced by shape

There is no `priceOf(symbol)` on the interface and there should never be one.
Criterion 4 asked for it and §10.3's second property is why: this map is **not
cleared on a session boundary**, so at 09:31 on Monday it still holds Friday's
bars — correctly. A reader holding a number with no instant beside it renders
Friday's close as today's price, and that repair has to be **structural rather
than documented**, because a comment is something a caller can be unaware of.

### 2. Age is computed on read, never stored

A stored age is wrong the instant after it is written, and the bug it produces —
a price that claims to be four seconds old for the rest of the afternoon — looks
exactly like a working feed. Asserted by reading the same observation through
two clocks and getting 120 s and 180 s.

### 3. Revisions replace by `(symbol, minute)` — and never walk backwards

This is where `LiveObservation.supersedes` is finally **acted on**; Task 3.2.4
carried it across the seam and deliberately did not act, because acting requires
state. Three cases, and the third is the one that gets written wrong:

| Incoming vs. held | Action     | Why                                                                                                 |
| ----------------- | ---------- | --------------------------------------------------------------------------------------------------- |
| Newer minute      | Replace    | It is the latest                                                                                    |
| **Same** minute   | Replace    | §14.1's revision — the common case, since a `u` lands ~30 s after its bar while bars are 60 s apart |
| **Older** minute  | **Ignore** | A correction to a minute already passed does not change what the _latest_ observation is            |

**The third was not in the task and was found while writing it.** Applying an
old correction would make the latest observation _older than the one it
replaced_, and every reader would see the price go back in time for no reason a
user could understand. The correction is not lost to the product — a revision to
a past minute belongs in Story 3.9's store — it is simply not news about _now_.

### 4. `status` is filtered, and the asymmetry is written beside the filter

`UNIVERSE.md` §12.2 makes `status` an **invisible predicate**, and its rule for
a reader not in its table is: filter when computing over _the market we track
now_, never when showing something stored. This object is the former. Story
3.9's read path is deliberately **not** filtered, and the reason sits in the
code, because a reader who makes the two agree breaks one of them — and which
one depends on which way they made them agree.

## The invariant that was not asked for

**The object could have shipped fully tested and never called.** Ten passing
unit tests say nothing about whether `index.ts` does anything with it, and that
is the shape of a defect this repository has now shipped **three** times, every
one with `pnpm verify` green:

| Found by          | The shape                                                           |
| ----------------- | ------------------------------------------------------------------- |
| Story 3.2's close | three implementations of an interface with **no construction site** |
| Task 3.4.3        | three implementations **constructed, and none self-driving**        |
| Task 3.4.9        | a published decision **specified and drawn, and unreachable**       |

Each is _something that exists in one layer and cannot be reached from the
next._ This was the fourth candidate, so `pnpm invariants` gained a fifteenth
check on the **wiring** rather than on the object — `index.ts` must feed the
stream into the state, and must not contain `onObservations: () => undefined`
again. `pnpm break the-live-stream-loses-its-consumer` proves it goes red.

## Evidence

- 10 tests in `current-market-state.test.ts`, driving a **real stream** through
  the real mapper and the recorded vendor fixtures rather than hand-built
  observations
- `pnpm break the-current-state-holds-an-untracked-security` — red, restored
  byte-identical
- `pnpm break the-live-stream-loses-its-consumer` — red, restored
  byte-identical
- `pnpm verify` green: **15 invariants**, 908 backend tests, 2257 in total

---

## For a stakeholder — a status report, 2026-09-21

### What we did, in one sentence

**We gave the application a memory.**

### What was actually wrong

Until today, MarketPulse was watching the market through a letterbox.

Live prices arrived from the exchange every minute, and the system did exactly
one thing with them: if a browser happened to be open at that precise moment, it
passed the number straight through to the screen and then **forgot it
immediately**. There was no record. If you asked the server _what is NVDA
trading at?_, it had no answer — not a stale answer, not a wrong answer, **no
answer at all** — unless somebody happened to be looking at NVDA at that second.

That sounds like an oversight. It was actually a deliberate staging decision
from an earlier piece of work — build the pipe first, then build the thing that
remembers — but it had reached the point where everything else was waiting on
it.

### Why it matters commercially

Three of the biggest features on the roadmap are blocked behind this one object:

- **The market overview** — the landing screen showing what's happening across
  all 518 securities at once
- **Unusual-activity detection** — the feature that spots a stock behaving
  abnormally and is arguably the product's whole reason for existing
- **The AI investigation tools** — when the assistant is asked _why did NVDA
  drop?_, the first thing it needs is what NVDA is doing now

**None of those wants to open a connection to the stock exchange.** They want to
ask one question — _what is the latest price?_ — and get an answer. That is what
we built, and it is why this unglamorous piece of plumbing was worth doing
properly rather than quickly.

### The decisions worth explaining

**We made it impossible to get a price without its timestamp.** This sounds
pedantic; it prevents a specific and embarrassing failure. The system keeps
Friday's closing prices over the weekend — correctly, because that genuinely is
the most recent thing that happened. But if a screen could ask for "the price"
without also being handed "and this is from Friday afternoon", then at 9:31 on
Monday morning the product would confidently display Friday's price as though it
were live. We removed the ability to make that mistake rather than writing a
note asking people not to.

**We taught it to say "I don't know".** Around a third of the securities we
track are quiet enough that minutes or hours can pass with no trading activity
reported. After a restart the system knows nothing at all and fills in
unevenly — a heavily traded name within a minute, a thin one possibly not for
hours. _Nothing observed yet_ is therefore a **normal, correct answer**, not an
error, and everything downstream is built to expect it. A system that invented a
zero here would be showing customers a price that no one ever traded at.

**We handled the corrections the exchange sends.** Roughly one bar in every
1,500 is followed, about thirty seconds later, by a corrected version — and when
a correction comes, it changes the price about a third of the time. We apply
those. We also found a case the task hadn't anticipated: a correction can
occasionally arrive _after_ we've already moved on to the following minute.
Applying it then would make the displayed price jump backwards in time for no
visible reason. So we don't — the correction still gets stored permanently by a
later piece of work, it just isn't treated as breaking news.

**We added a safeguard nobody asked for.** We have now three times in this
project built something correct that nothing ever called — fully tested, fully
working, and wired to nothing. Every time, all the automated checks passed. This
new component had exactly that risk, so we added an automated check that fails
the build if the system ever stops using it. Then we deliberately broke it to
confirm the check actually fires, because a safety net nobody has tested is just
a decoration.

### What you would see on screen today

**Nothing.** Not one pixel has changed, and that is expected — this task builds
a foundation rather than a feature.

The next two pieces of work are visible, and both are fixes to things you can
see going wrong today:

- **Every page currently flickers about a second after it loads** — it shows
  yesterday's closing price, then abruptly swaps four things at once when the
  first live price arrives. Because the system now remembers prices, it can hand
  them over the moment a page opens, and that flicker simply stops happening.
- **Every time we deploy an update, every open browser tab silently stops
  updating** until somebody reloads it. The fix depends on the same memory: a
  reconnecting tab needs to be told what it missed.

After those comes the one that pays for all of it — **live prices across all 518
securities at once**, which is the screen this whole run of work exists to
build.
