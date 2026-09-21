# Task 3.6.1 — The universe subscribes, and 518 prices move

**Status:** **Complete — 2026-09-21.**
**Story:** [3.6 Live Prices Across the Tracked Universe](STORY.md)
**Depends on:** 3.5

## Objective

Criterion 1 and criterion 2 together, and they are one task because **splitting
them ships the defect the story's scope names**:

> a live price beside a stale change is worse than two stale numbers, because
> one of them looks current.

So this task makes `/securities` ask for the whole universe, renders the live
price where one exists, and **re-derives the change beside it in the same
render**.

## What the user can see when this lands

**A market.** 518 rows whose `Last` and `Change` columns move on their own
during a session, on the screen that has shown a stored close since Task 2.9.7.

**This is the story's headline and it lands first on purpose.** Everything after
it is a measurement, a decision or a repair.

**Deliberately undesigned.** No arrival mark, no density rule, no new word for a
row that has nothing. That is Task 3.6.2's, **in front of this running**, which
is the order Story 3.4 used and the reason it worked: Task 3.4.2 shipped the
undesigned moving price and Task 3.4.4 discovered the worry was backwards — the
change was _nearly invisible_ rather than distracting. **A density rule argued
before 518 rows have ever moved is a rule argued about nothing.**

What the user still cannot do: see today's session on a chart (3.9), reload and
still see today (3.8), or be told properly what they are looking at when the
feed stops (3.10).

## How the screen asks, which is inherited rather than built

`useLiveFeed` is called once in `App` and takes a `symbols` list; a page
declares its own need through `onLiveSymbols`. `SecurityExplorer` already does
this for one symbol. **This screen passes all 518.**

Three properties come with it and none is this task's to build (Task 3.5.6):

- **Changing a subscription does not reopen the socket** — the hook keys the
  socket effect on its tick and the subscription on a **primitive** derived from
  the list. Passing a fresh array literal each render is safe; passing one whose
  **content** changes each render is not, and at 518 symbols that mistake is a
  message storm rather than a wasted render.
- **The subscription is re-asserted on every socket**, reconnects included.
- **A subscribe is answered with a `snapshot`, never `bars`** — and the
  distinction is the whole reason this screen populates instead of flashing.
  A snapshot sets the arrival mark's baseline; `bars` fires it. **518 marks on
  first paint is exactly the failure Task 3.5.4 removed from the security page**,
  and it is already prevented here — do not undo it by treating a snapshot as an
  arrival.

## The change arithmetic, which is the part with a wrong answer that looks right

The column today is `Last close` and `Change`, derived from `SecurityLastClose`
by `last-close.ts`'s `changePercent`. **A live price is not a close**, and the
number it must be measured against is the **previous session's** close.

Three cases, and the middle one is the trap:

| What the row has                                                     | Measure the change against                                                                                                                                                          |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No observation, a stored close                                       | Unchanged — today's stored behaviour, the session before it                                                                                                                         |
| A live observation, and the stored close is the **previous** session | The stored close. This is the ordinary case during a session                                                                                                                        |
| A live observation, and the stored close is **today's**              | **Not today's close.** The backfill has already written the session this observation belongs to, so measuring against it compares a price with itself and reports ≈0% for every row |

**The third case is reachable in development every evening** — the nightly
backfill writes today, the replay serves today, and the two meet. It is also
what a cold load looks like the morning after a deploy.

`commonSession(lastCloses)` already computes the session the table is quoting;
this task needs the **previous** one per security rather than a global answer,
because coverage is uneven and a thin name's last stored session is not
everybody's.

**Do not invent a second formatter.** `formatPrice`, `formatChangePercent` and
`directionOf` exist in `src/market/` and `PriceChange` already carries direction
with a **glyph as well as a hue** — which is what keeps the column legible in
greyscale, and is a standing rule rather than a nicety.

## What a row with no observation does — and it is most of them

**Absence is ordinary and must not read as an error.** Measured on the live IEX
feed (§7.6, 2026-09-17): **65.1% median per-symbol minute coverage**, about
**321 of 518** symbols producing a bar in a given minute, and **`ERIE` at
2.1%** — silent for most of a session. §11.2 measured a gap of **187 minutes**
between one security's consecutive bars.

So on any given minute roughly **200 rows have nothing new**, and after a
restart **every** row has nothing until the feed refills — unevenly, and for a
thin name possibly for hours (§10.3).

**For this task the rule is: a row with no live observation renders exactly what
it renders today.** The stored close, unchanged, with no new word and no new
mark. **What that row should _say_ is a design question and it is Task 3.6.2's**
— the state is none of `live`, `stale` or `disconnected`, the feed is healthy,
nothing is wrong, and there is no price.

**What must not happen here:** a zero, a dash that means two different things, a
`—` where a number was a second ago, or anything that reads as a fault. §7.2 is
the rule underneath it — a bar that does not exist produces **no frame at all**,
not a zero.

## Per-row updates without per-row work

**The naive wiring is 518 subscriptions and 518 re-renders a minute**, and this
repository has already produced the counterfactual for exactly this choice:
`useMarketClock` placed in `AppHeader` gives **0** whole-route re-renders in
20 s where placing it in `App` gives **40**.

One subscription exists, in `App`. This task reads from it. **The observations
arrive as one map, once per tick**, and the table should re-render from that map
rather than each row subscribing to its own symbol.

**The reducer is not the thing to worry about, and that is measured rather than
assumed.** Task 3.4.8 pushed **20 bursts of 332 bars — 6,640 observations** —
through a production build and recorded **p95 52 ms** frame-to-screen with
**zero** long-task entries at any length. The load this story adds is **518
elements**, not the arithmetic.

## Work

- `/securities` declares the tracked universe through `onLiveSymbols`, and
  withdraws on unmount the way `SecurityExplorer` already does for one symbol
- The table takes the observations it needs as a prop — it does not fetch, it
  does not subscribe, and it does not import the hook. `UniverseTable` is a
  workshop component with **no `fetch` anywhere in it** and that property is
  load-bearing: it is what makes every state reviewable with no backend running
- The live price replaces the stored close where one exists, and the change is
  re-derived against the **previous** session's close in the same render
- A row with no observation is untouched
- Stories for the new states — a table mid-session with a realistic **two-thirds
  covered** mix, and a table that has just subscribed and holds a snapshot. Not
  518 rows all moving, which is a state the product never has
- Unit coverage of the three change cases above, the third one especially

## Done when

1. Prices and changes on `/securities` update without a page refresh, from the
   live feed rather than a poll
2. The change is computed against the previous session's close and is correct
   across the boundary where a live price crosses it — asserted, because the
   wrong answer here is a plausible `0.00%` rather than a visible break
3. A row with no observation renders exactly as it did before this task
4. One subscription, one map, no per-row subscription — and the invariant that
   says so, or a stated reason there is not one
5. `pnpm verify` passes

---

## What was done — 2026-09-21

### The design artifact, and the question it turned out to be about

**A canvas page was written before the code**: `The column that stops being one
kind of number`. It exists because the task's framing — _render the live price
where one exists_ — hides the actual design problem, and the problem is not
about prices at all.

Since Task 2.9.7 **every cell in that column has been the same kind of number**:
the close of a stored session, from the consolidated tape, and **518 of 518
shared one session** — which is exactly why the date is stated once in the
heading rather than 518 times. This task makes two cells in three a **live IEX
price from this minute**, and the two look identical: six glyphs, two decimal
places, same column.

**That is invariant 6 rather than a labelling preference.** The free plan is
asymmetric — stored history is SIP, the live stream is IEX only — and §7.1 is
explicit that we must not imply one venue is every US exchange.

**Decided, with the alternatives recorded:**

|            |                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Chosen** | The heading says `Last` once any row is live, and the **stored** rows carry their own session date. The feed is stated **once**, below the table |
| Rejected   | Keep `Last close` and the date — **the one that ships by accident**, and it asserts a session over rows whose number came from a minute ago      |
| Rejected   | A second column — two mostly-blank columns on a seven-column table that is already the page's known main-thread cost                             |
| Rejected   | A per-row feed mark — ~321 glyphs saying the same word, on the _majority_ of rows, which reads as decoration rather than as an exception         |

**Why the stored rows are the ones that carry a date:** they are exactly the
rows whose number is **not from this minute**. That is the asymmetry
`commonSession` already had — _a shared claim is made only while it is true of
everything_ — pointed at a second reason. The exception set grew from **3 of
518** to about **197**, and it is the correct set.

**Reversal trigger, condition-shaped:** the first time a reader asks which of
these numbers is live, or the first surface that has to compare a live price and
a stored close **in the same reading** — which is Story 3.9's chart.

### The arithmetic, and a defect found in shipped code

`changeFromClose` has existed since Task 3.4.2 and measured a live price against
`close.close` — **the last session we hold a daily bar for.**

**That is wrong whenever the store already holds today**, which is not exotic:
the nightly backfill writes today, so the stored close and the live bar **meet**
every evening in development and on a cold load the morning after a deploy. The
result is not a crash or a blank. It is **≈0.00% down the whole column** — 518
well-formed, correctly formatted, correctly coloured numbers saying the market
did not move.

The repair is small because the wire already carries what is needed:

```
basis = liveSession === close.session ? close.previousClose : close.close
```

**And the function now returns which close it used**, because a caller renders
_"change from 2026-09-19's close"_ and a caller that re-derives the basis is a
second copy of the decision with nothing holding it to the first.

**It had no unit tests at all.** Six were added, and the discriminating one is
_does NOT measure against a close from the live bar's own session_ — it fails
against the old implementation rather than merely passing against the new.

**The security page had the same defect and is fixed in the same change.** Its
identity block names the session it measured from, so it would have read
_`change from 2026-09-21's close`_ beside `0.00%`. Widening the task to one
extra call site was cheaper than leaving one surface right and the other wrong.

### The layout shift the page showed and no test could

**Found by opening the page**, which is the working loop's first rule.

Once any row is live, every **stored** row draws a session date and every live
row does not — so `pnpm probe` on `/securities` came back with rows at
**35 px and 53 px** against each other. Worse than ragged: **a row changes
height the first time an observation arrives for it**, because it loses the
line. A table that reflows under a reader as a thin name finally trades.

The live cell now **reserves the line it does not draw** — and reserves it only
while a stored row is actually drawing one, because there are three states and
only the middle one needs it:

| Rows                | Dates drawn                                   | Reserved |
| ------------------- | --------------------------------------------- | -------- |
| Nothing live        | none — the heading carries the shared session | no       |
| Some live, some not | the stored rows                               | **yes**  |
| Everything live     | none — no stored row left to date             | no       |

**The third row is not hypothetical and is the reason the reservation is
conditional**: the current market state keeps the latest observation per
security and **never expires it**, so coverage accumulates through a session.
The mixture is a morning; everything-live is where a session ends up.
Reserving unconditionally would cost 19 px on every row of a 518-row table for a
line nothing draws.

Re-probed after the repair: **a uniform 53 px pitch**.

### Verified against a running feed rather than only against tests

`MARKET_DATA_PROVIDER=fixture NON_LIVE_MARKET_DATA=permitted pnpm dev`, then
`/securities` in a real browser:

- **518 of 518 rows live**, each carrying `Live price` for a listener
- The column heading reads **`LAST`**, not `Last close`
- The identity block above reads `change from 2026-09-11's close` — the basis
  fix, on the surface that names its own basis

**The replay was tried first and produced nothing** — `observedAt: null` after
two minutes with 518 symbols subscribed. This machine's store does not cover the
window it replays. Recorded rather than worked around: it is the same
store-shaped trap `docs/GAPS.md` carries, arriving in an instrument rather than
in a spec.

### The invariant, and its break

`pnpm invariants` gains **`one-caller-of-the-live-feed-hook`** — shipped
frontend code calls `useLiveFeed` exactly once, counted at **call sites rather
than files**, because the defect it guards against is a hook inside a row
component: one file, called 518 times.

`pnpm break a-second-caller-of-the-live-feed-hook` performs it, proves red, and
restores byte-identical.

### One stale assertion, and it is the sharpest kind

`SecurityExplorer.test.tsx` asserted the region said **`Epic 3`** — reading a
sentence that promised live prices would arrive _with the market feed in
Epic 3_. **This task is that.** The promise became a description, so the
sentence changed and the assertion followed it.

It is the family `docs/GAPS.md` records: **an assertion that passes only while
the product is unfinished.** Nothing mechanical caught it — it went red because
the sentence it was reading ceased to exist.

### Two browser assertions the change made wrong, and both were the product improving

The full suite against `marketpulse_bare` — CI's store shape — went red twice in
`market-reconnect.spec.ts`, and **neither was a defect**:

- **`the price stays on screen for the whole outage`** located `219.50`
  unscoped. That figure is now correctly on the page **twice**: this security's
  identity block, and its row in the universe table below. A strict-mode
  violation caused by a surface gaining a live price. Scoped to the identity
  block.
- **`the page re-sends its subscription on every reconnect`** asserted the
  subscription `toEqual(["NVDA"])`, **in two places**. The screen renders the
  universe table on both its routes, so it asks for every row it draws as well
  as the security on show — 518 symbols against CI's store, the page's own
  symbol first. Re-asserted as that.

**The second copy was missed on the first pass and the suite caught it**, which
is the argument for running the whole thing rather than the spec you think you
touched.

**Full suite, bare store: 140 passed, 15 skipped, 0 failed.**

### The four criteria

| #   | Criterion                                                                | Evidence                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Prices update without a refresh, from the feed                           | Verified in a browser against a running fixture stream: 518 live rows. `UniverseTable.test.tsx` — _shows the live price instead of the stored close_                                                 |
| 2   | Change against the previous session's close, correct across the boundary | `last-close.test.ts` — six tests, including one that fails against the old implementation. Asserted again at the rendering layer: _does not report a flat market when the store already holds today_ |
| 3   | A row with no observation renders as before                              | _leaves a row with no observation showing its stored close_, and _keeps the close wording and the shared session when nothing is live_ — which is what CI and an unconfigured deployment render      |
| 4   | One subscription, one map, no per-row subscription                       | `pnpm invariants` — `one-caller-of-the-live-feed-hook`, with a break behind it                                                                                                                       |
| 5   | `pnpm verify` passes                                                     | Green: **18 invariants**, 2,320 tests, 33 process tests, 381 documents / 0 broken links                                                                                                              |

### What was deliberately NOT done

- **No arrival mark.** Task 3.6.2's, in front of this running. Nothing here
  marks anything, and the snapshot/`bars` distinction that stops 518 marks
  firing on first paint is inherited rather than rebuilt.
- **No new word for a row that has nothing.** Task 3.6.2's.
- **No re-ordering.** Rows keep their positions; Task 3.6.3 decides it with
  figures.
- **No token and no new component.** `PriceChange` already carries direction
  with a glyph and a sign as well as a hue.

---

## For the stakeholders — what this actually did, in plain words

**The short version: the list of 518 companies now shows live prices, and a
number that would have been quietly wrong is not.**

### What you can see

Open the Security Explorer and the table of every company we track no longer
shows yesterday's closing prices. **It shows what each one is trading at now**,
updating on its own, without refreshing the page.

This is the headline of this phase of work, and it deliberately landed first —
before any of the polish — so there is something real to look at and react to
rather than a plan to read.

### The part that looks like a detail and is not

The column has had a heading reading **"Last close"** since we first put prices
on screen, with a single date under it. That worked because every number in it
was the same kind of thing.

**It isn't any more.** During market hours about two thirds of those cells are
live prices from the last minute, and the rest are still yesterday's close — for
companies that simply have not traded recently. **The two look identical.** Same
size, same alignment, same two decimal places.

We are not allowed to let that slide, and not as a matter of taste. One of this
product's founding rules is that **we say where a number came from and never
imply coverage we do not have** — our live feed comes from a _single_ exchange,
while our stored history is the full consolidated US tape. Letting a reader
assume a live price is the whole market would be exactly the kind of quiet
dishonesty the rule exists to prevent.

So: the heading now says **"Last"**, and the rows that are _not_ live carry their
own date. The set that gets a date is precisely the set whose number is not
current. The feed itself is explained once, under the table, rather than
stamped on 518 rows.

**We wrote that decision up properly before writing any code**, with the three
alternatives we rejected and why — including the one that would have shipped if
nobody had asked the question, which was simply to leave the heading alone.

### The bug we found on the way, which is the one worth telling you about

The percentage beside each price is "how much has this moved". To work that out
you compare today's price against **yesterday's** closing price.

Our code compared it against _the most recent closing price we had stored_.
Almost always that is yesterday's, so it was right. **But every evening, once
our overnight job files today's closing prices, it stops being yesterday's — it
becomes today's.** At that point we were comparing today's price against today's
close: the same number, twice.

**The result is a table where every single company shows a change of +0.00%.**

That is the dangerous kind of wrong. Nothing breaks. Nothing looks odd. There is
no error message. It is 518 perfectly formatted, perfectly plausible numbers
politely reporting that the entire US stock market did not move today. Anyone
glancing at it would believe it.

The fix was three lines, because the information needed was already there. **The
interesting part is that this code had shipped and had no tests at all** — so we
wrote them, including one specifically built to fail against the old version
rather than merely pass against the new one. A test that passes either way
proves nothing.

**The same bug was on the individual company page too**, and we fixed it in the
same change rather than leaving one screen right and another wrong.

### The thing only a human looking at the page could find

Every automated check was green, and we opened the page anyway — which is a
standing rule here, learned the expensive way.

The rows were **different heights**. Rows with a date were taller than rows
without one. Worse, a row would visibly **shrink the moment its first live price
arrived**. Picture watching a quiet company finally trade and the whole table
twitching underneath your cursor.

No test could see this — our fast tests have no concept of layout at all. It
took a measuring tool and somebody looking. The fix holds the space rather than
letting it collapse, and only when it is actually needed, so a table where
everything is live is not 518 rows of wasted whitespace.

### Where this leaves the product

**Done:** the live price, the correct change beside it, and the honesty about
which is which.

**Deliberately not done, and next:** we have not yet decided how a _changing_
number should announce itself across 518 rows at once. We have a design for that
on a single price, agreed last week — a small dot that appears and fades. **On
one number it is calm. Multiplied by 518 it could be a fairground**, and we
refuse to settle that by arguing about it in advance. It is the next task, and
it will be decided by watching this table run.

That ordering is on purpose and it has already paid off once: the last time we
shipped a moving price undesigned, the thing we were worried about turned out to
be backwards — it was too _subtle_ to notice, not too distracting.

**Still not possible:** seeing today's session drawn on a chart, and reloading
the page without losing today. Those are the next two stories, in that order.
