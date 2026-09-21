# Task 3.6.1 — The universe subscribes, and 518 prices move

**Status:** Not started
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
