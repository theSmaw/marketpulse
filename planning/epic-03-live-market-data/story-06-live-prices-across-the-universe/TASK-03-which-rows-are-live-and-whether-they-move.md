# Task 3.6.3 — Which rows are live, and whether they move: the story's two open decisions

**Status:** **Complete — 2026-09-22.**
**Story:** [3.6 Live Prices Across the Tracked Universe](STORY.md)
**Depends on:** 3.6.2

## Objective

Settle both open decisions **with the figures rather than with a preference**,
and implement whatever they produce.

1. **Whether every row is live, or only the visible ones.**
2. **Whether the table re-sorts under live data.**

They are one task because they are one question asked twice: **what does the
reader lose when a row is not where they left it?**

## What the user can see when this lands

**Possibly nothing**, and that is the likely honest answer for decision 2.

If decision 1 narrows the subscription, what a user sees is a row that stops
updating when scrolled past and **jumps when it returns** — which is the cost,
and it is the reason this is a decision rather than an optimisation.

## Decision 1 — every row, or only the visible ones

### The mechanism is already built and is not the argument

Task 3.5.6 made the fan-out per-client. A viewport-scoped subscription is
**`setLiveSymbols(visibleRows)`** — not new plumbing — and it is asserted over a
**real socket at 200 symbols**. The subscription is re-sent when the list
changes, and changing it does **not** reopen the socket.

### So cost is not the argument, and the figure says why

The whole universe is **56.9 KiB a minute** — and since Task 3.5.6 that is the
**ceiling of what one browser could receive** rather than what every browser
does receive. It is small. **Bandwidth does not decide this.**

**What might decide it is render work**, and the relevant measurement is Task
3.6.2's, not a new one: 518 elements, not the reducer, which carried 6,640
observations at **p95 52 ms** with zero long tasks.

### What is genuinely at stake

- **A row scrolled past stops updating and then jumps.** A reader who scrolls
  back to a row they were watching sees it change under them — which is the one
  behaviour a dense table is worst at absorbing.
- **The bands change the question.** This table is **collapsible by sector**,
  and a shut band renders no rows at all. So "visible" already has a cheaper
  meaning here than "in the viewport": **rows in an expanded band.** The
  route passes nothing to `initiallyCollapsed`, so today every band is open and
  all 518 render.
- **Virtualisation was measured and deferred, and the number is on the canvas**
  (`Universe navigation.dc.html`): replacing the whole 530-row table and forcing
  layout in the dev build — **100, 66, 51, 44, 48 ms**. That is the pessimistic
  bound, and it _brushes_ the 50 ms target without clearing it. The canvas's own
  verdict stands: **collapse is the cheaper answer to the same problem**, this
  repository does not add infrastructure before the iteration that needs it, and
  if a measurement says otherwise the work belongs to **Epic 14**.

**The default answer is therefore _every row_**, and narrowing needs a
measurement to justify it rather than the other way round.

## Decision 2 — does the table re-sort?

**Read the table before answering.** It is grouped into **sector bands in a
declared order**, with a benchmark ETF and then its constituents. **There is no
price sort today**, so "re-sorts itself as prices move" may describe a
behaviour this surface does not have.

If that is what the code says, then the decision is:

> **The table does not re-order under live data. Bands keep their declared
> order and rows keep their position; only the numbers inside them change.**

**Say it rather than leave it implied**, because the criterion asks for a
decision and because the next person to add a sort control needs to find the
argument. And the argument is short: a row that moves while being read is a row
that cannot be read, and **gainers, losers and anything ranked by a live metric
are Epic 4's** — which this story's data makes possible and must not pre-empt.

**Reversal trigger, condition-shaped:** the first sort control on this table
whose key is a **live** value.

## Work

- Read the current ordering and state what it is rather than what it might be
- Decision 1 taken against Task 3.6.2's element-count figure; if the answer is
  to narrow, implement it through `onLiveSymbols` and state what a returning row
  does
- Decision 2 recorded, with the Epic 4 boundary named
- Both with alternatives and a condition-shaped reversal trigger
- If either changes behaviour, a test that would go red if it silently reverted

## Done when

1. Both decisions taken **with figures**, recorded with alternatives and a
   reversal trigger that is a condition
2. Whatever they produce is implemented, or explicitly implemented as "no
   change" with the reason
3. The Epic 4 boundary is stated so the next story does not have to rediscover it
4. `pnpm verify` passes

---

## What was done — 2026-09-22

**Both decisions: no change. Both taken against a measurement rather than a
preference, and both now asserted** — because a decision that is already the
behaviour is the easiest kind to lose.

The design artifact is **`Universe navigation.dc.html` §07**, extended rather
than replaced: that page is already about _which rows are on the screen and in
what order_, and it already carries the virtualisation figure this task had to
reason against. Reuse over reinvention, and it puts the two decisions beside
the collapse mechanism they interact with.

### Decision 1 — every row stays live, and the task's premise had changed

**The task file said the default answer was _every row_ and that narrowing
needed a measurement to justify it.** By the time it ran, Task 3.6.2 had
produced one that pointed the other way: §28's _no routine main-thread task

> 50 ms_ is **breached on every tick**, and a reader could reasonably conclude
> that scoping the subscription was now justified.

**So it was measured rather than argued.** Same machine, same fixture feed,
`PerformanceObserver` on `longtask` with `buffered: false`:

| Subscription               | Long tasks (ms)    | Against §28's 50 ms |
| -------------------------- | ------------------ | ------------------- |
| **all 518**                | 263, 259, 237      | ~5× over            |
| **8 — a viewport's worth** | 127, 162, 172, 203 | **still ~3× over**  |

**Cutting the data by 98.5% removed about a third of the cost.** The residue is
the reconciliation walk over 518 rows, which happens on every tick whatever
arrived — the feed state lives in `App` and nothing below it is memoised.

**And the narrowed arm was flattered.** With 510 rows falling back to stored
closes, each drew a session date the all-live arm does not — so it rendered
_more_ DOM per row and still came out ahead. The real saving is smaller than a
third.

**So scoping buys a fraction of a breach it does not clear, in exchange for a
row that jumps when a reader scrolls back to it.** That is a behaviour cost for
a partial performance win, and the repair for the residue is memoisation or
virtualisation — which `Universe navigation.dc.html` §06 already measured and
deferred to Epic 14.

**Two arguments that are now closed rather than open:**

- **Bandwidth was never going to decide it.** The whole universe is
  **56.9 KiB a minute**, and since the fan-out went per-client that is a
  ceiling rather than everybody's bill.
- **The bands already do the scoping**, better. "Visible" has a cheaper meaning
  here than _in the viewport_ — a shut band renders no rows at all — and the
  collapse is under the reader's control rather than their scroll position.

**Reversal trigger, condition-shaped:** the first measurement on a
**production** build showing that scoping the subscription _alone_ brings a
tick under 50 ms. Not a preference, and not a scroll-performance complaint.

### Decision 2 — the table does not re-order, and it never did

**Read rather than assumed.** `groupUniverse` orders by `SECTORS` — a declared
constant — then the sector's own ETF, then its equities in the order the query
returned. **Nothing in the ordering reads a price**, live or stored. So the
behaviour was already correct and the work was to record that it was **chosen**.

**The argument, for whoever adds a sort control:** a row that moves while it is
being read is a row that cannot be read. On 518 rows that is not a nuisance —
it is the loss of the one thing a dense list is for, because a reader holds
their place by where it sits on the screen.

**And the boundary:** anything _ranked_ by a live value is **Epic 4's** —
gainers, losers, breadth, sector performance. This story's data is what makes
those possible and must not pre-empt them. A ranked view is a different surface
with a different promise, not this table sorted differently.

**Reversal trigger:** the first sort control on this table whose key is a
**live** value.

### Three tests, each verified to go red

Neither decision changes behaviour, so the tests are the whole deliverable —
and a test that cannot fail proves nothing. **Each was checked against the
reverted behaviour and the tree restored byte-identical:**

| Test                                                               | Broken by                                   | Went red? |
| ------------------------------------------------------------------ | ------------------------------------------- | --------- |
| _asks for every row it renders rather than a subset_               | scoping `liveSymbols` to one entry          | **yes**   |
| _keeps every row where it was when prices arrive_                  | sorting rows by `observations.get(…).close` | **yes**   |
| _puts the bands in their declared order rather than a derived one_ | reversing `groupUniverse`'s result          | **yes**   |

The ordering test renders the **same specimen twice** — once with no
observations, once with prices chosen so that _any_ live ordering would
differ — and asserts the symbol order is identical. It is deliberately blind to
an order that is wrong in both renders: that is `groupUniverse`'s own tests'
job, and this one is about **dependence on live data**.

### What this task did NOT do

- **It did not repair the §28 breach**, which is Task 3.6.5's and now has two
  more data points to work from: scoping is not the lever, and the cost is
  per-tick rather than per-observation.
- **It did not add virtualisation.** Measured and deferred on the canvas
  already; this task adds the figure that says scoping is not an alternative
  to it.

---

## For the stakeholders — what this actually did, in plain words

**The short version: we tested an optimisation that sounded obviously right,
found it wasn't, and left the product alone — with the numbers written down so
nobody has to wonder again.**

### The question

The table now shows live prices for all 518 companies. A reader only ever sees
about twenty rows at a time. So the obvious question: **why send prices for the
five hundred rows nobody is looking at?**

Every instinct says scope it to what's on screen. It sounds like free
performance.

### Why it mattered more than usual this week

Last week's work found that the page is **slower than our own published
target** — it takes about a quarter of a second of the browser's attention
every time prices arrive, where our standard says nothing routine should take
more than a twentieth.

So this was not a theoretical tidy-up any more. If scoping fixed that, it was
worth the cost.

### What we measured

We ran it both ways on the same machine, minutes apart: all 518 companies
subscribed, and then just eight — a screenful.

**Sending 98.5% less data removed about a third of the cost, and the page was
still three times over the target.**

The reason is that the expensive part isn't the data. It's the browser
re-checking all 518 rows every time anything arrives — and it does that whether
one price changed or five hundred did.

There's a wrinkle that makes the case stronger, not weaker: in the scoped test,
the 510 unsubscribed rows fell back to showing yesterday's closing price _with
its date_, which is slightly more to draw. So the scoped version was given a
small unfair advantage and **still** didn't clear the bar.

### The decision

**Every row stays live.** Scoping would have bought a fraction of a problem it
doesn't solve, and the price would have been paid by a specific reader: the one
who scrolls back to a row they were watching and finds it jumped while they
were away. That's the single worst thing a dense table can do.

**And the page already has a better version of this control.** Readers can
collapse whole sectors — a collapsed sector draws nothing at all. That's the
same saving, except the reader chose it deliberately instead of it happening
behind their back.

The real fix for the slowness is a different technique entirely, already
measured and scheduled. This work adds the finding that **scoping is not an
alternative to it.**

### The second decision, which is about trust

Should the table re-sort itself as prices move — biggest gainers to the top?

**No.** A row that moves while you're reading it is a row you can't read. On a
list of 518, people keep their place by _where a row sits on the screen_. Sorting
live would take that away from everyone in order to give a ranking to nobody
who asked for one.

Rankings — biggest movers, sector performance, market breadth — are a real
product feature and they are coming. They belong on a screen designed to be a
ranking, where a reader expects things to move. **That's the market overview,
and this table's data is exactly what makes it possible.**

We found the table already behaved this way. **The work was writing down that it
was a decision rather than an accident** — because the next person to add a
sort control needs to find the argument, not guess from the absence of one.

### Where this leaves the product

**Done:** the live table's behaviour is now settled and defended by tests that
we checked actually fail if someone changes their mind quietly.

**Next:** the performance repair, with two more facts than it had — scoping
isn't the lever, and the cost is per-update rather than per-price.

**Still owed:** somebody watching a real trading session. We're three pieces of
work into owing that, and it is one sitting.
