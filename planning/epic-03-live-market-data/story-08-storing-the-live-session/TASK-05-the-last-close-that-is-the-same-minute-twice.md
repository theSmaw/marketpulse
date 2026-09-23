# Task 3.8.5 — The last close that is the same minute twice

**Status:** **Complete — 2026-09-23.** `readLastCloses` takes one row per **instant** under `SERVED_TAPE_RANK`, so `last` and `previous` are two minutes again rather than one minute on two tapes. `distinct on` inside the lateral, measured: **7.6 ms at `1m` against 5.2 ms without**, plan an **Incremental Sort** so the index still supplies the order — inside the 4.8–8.2 ms band this query has occupied since 2026-09-09 and 33× clear of the shape that measurement rejected. **The task's own urgency claim was wrong and is corrected in place**: the defect was latent, not live. Five database tests, one failing without the repair by producing a number, and `pnpm break the-last-close-compares-one-minute-with-itself`. The audit found a third instance and handed it to 3.8.9.
**Story:** [3.8 Storing the Live Session](STORY.md)
**Depends on:** 3.8.4

## Objective

**Task 3.8.4 repaired one read and there is a second one with the same defect,
and this one does not throw — it lies.**

`readLastCloses` takes the newest **two rows** for each security and calls them
`(last, previous)`. It has assumed since Task 2.9.6 that two rows means two
minutes. Since ADR 0035 and `0011` a minute may hold a row per tape, so on a
reconciled session the two newest rows are **the same minute on two tapes**, and
`previousClose` becomes the other tape's version of the close it is being
compared against.

Measured on the populated store, 2026-09-23, by inserting a three-minute live
session and a backfill over it **at the `1m` timeframe** — see _What the user
can see_ below for why that qualifier matters and why the first draft of this
task overstated the consequence:

```text
BEFORE: close 218.19 at 2026-09-11T19:59Z,  previousClose 218.38
AFTER : close 301    at 2026-09-14T13:32Z,  previousClose 201
```

`301` is the consolidated close for 13:32. `201` is the **IEX close for
13:32** — the same minute. The change this produces is roughly **+49.8%**, and
it is drawn as an ordinary price move.

**Make the last close and the previous close two different minutes again.**

## What the user can see when this lands

**Nothing — and the first draft of this task said otherwise, which is corrected
here rather than quietly fixed.**

This task was written claiming that _on the first night after a live session,
every security the live writer touched would print a fabricated double-digit
move_. **That is false, and checking it took one grep.** `readLastCloses` has
exactly one shipped caller, `GET /securities`, and it calls it with
**`1d`**. The live writer writes **`1m`** and nothing else. Only the backfill
writes daily bars and it only ever asks Alpaca for `sip`. Confirmed against the
store: `1d` is 347,631 rows, all `sip`; `1m` is 48.4 million, all `sip`.

**So the defect is latent rather than live.** The reproduction that found it
called `readLastCloses("1m")` — a timeframe nothing in the product passes it.

## Why it is still worth doing now, and worth doing before 3.8.8

**Because it is a trap laid directly in the path of the next visible task.**
`readLastCloses` takes a timeframe as a **parameter**; it is wrong for any
timeframe that can hold two tapes, and `1m` can hold two tapes today. Task
3.8.8 is _The surfaces that now show a stored today_, and a universe table
showing **today's** close is a table reading minute bars. The day that
argument is made, this function is already waiting with the wrong answer.

And the wrong answer has no tell. It is not a crash, a blank or an odd-looking
figure: it is a well-formed, correctly-aligned, correctly-coloured percentage
with an arrow, computed between two versions of one minute.
`PRODUCT_SPEC.md` §35 forbids exactly that twice — no **manufacturing missing
observations**, and **every generated conclusion distinguishable from an
observed fact**.

**The honest ranking, restated.** It does not outrank the tasks it was inserted
before because of urgency on a deployed store, because there is none. It
outranks them because it is **cheap now and a silent defect later**, and
because 3.8.8 would otherwise have to discover it.

## The decision this task takes

**Does `readLastCloses` adopt `SERVED_TAPE_RANK`, and is "the last two rows"
still the right shape?** Two questions, and the second is the one with teeth.

The obvious repair is `distinct on (market_bars.observed_at)` inside the lateral
with the rank as the tie-break, exactly as 3.8.4 did for `readSeries` — one
decision, one home, already argued and already break-verified.

**What makes it a task is the cost.** That lateral's shape is load-bearing and
measured, and the comment above it says so: `limit 2` is what makes the planner
take a bounded backwards walk of `(security_id, timeframe, observed_at)` — 518
index searches returning two rows each, **2,597 buffers** — rather than ranking
every bar. Measured 2026-09-09 at full depth:

| shape                                        | rows  | time       |
| -------------------------------------------- | ----- | ---------- |
| this query, cold                             | 1,036 | 21.4 ms    |
| this query, warm, whole round trip from Node | 1,036 | 4.8–8.2 ms |
| `row_number() over (partition by …)`, cold   | 1,036 | 830.1 ms   |
| the same, warm                               | 1,036 | 182–279 ms |

**That is a 40× margin and it is not to be spent by accident.** `distinct on`
needs a sort; whether the planner can still stream it off the index or falls
back to ranking is a question for `explain (analyze, buffers)` rather than for
reasoning. **Re-measure against the table above and record the new figures
beside the old**, and if the repair is not affordable in that shape, the
alternatives are worth naming rather than assuming:

1. **`distinct on` in the lateral.** One home for the preference. Measure it.
2. **Read more rows and reduce in Node** — `limit` 3 or 4 and take the first two
   distinct minutes. Cheap for the planner and correct, but the number is a
   magic one: it holds while a minute can carry two tapes and breaks silently
   on a third. If this is chosen, the limit is derived from the count of
   `MARKET_FEEDS` rather than typed.
3. **Ask for two distinct instants directly**, which is a different query and
   probably the `row_number()` shape the measurement above rejected.

**Whichever is chosen, `SERVED_TAPE_RANK` is the tie-break** — a table showing
the IEX close while the chart beside it shows the consolidated one would be two
surfaces disagreeing about one minute, which is the defect class
`docs/GAPS.md` entry 13 already carries.

## What to check while you are in here

**Every other read of `market_bars` that assumes one row per minute.** Two were
found by Task 3.8.4 and this task; the sweep is worth finishing rather than
waiting for the third to be found in production:

- `readLastBarDates` — `max(observed_at)` grouped by symbol. **Safe**: a
  maximum over duplicates is the same maximum. Confirm rather than assume.
- `readSeries` — repaired by 3.8.4.
- `readBars` — deliberately unrepaired, for the replay source.
- `writeBatch`'s presence check — tape-scoped since 3.8.2.
- `scripts/bars-check.mjs` and `GET /diagnostics/freshness` — do either count
  rows or compare a count against an expected number of minutes? A count that
  doubles on a reconciled session reports a session as over-complete.

## Work

- The repair, with the **measurement** behind the shape chosen, recorded beside
  the existing table rather than replacing it
- `market-bars.database.test.ts`: a security whose newest minute holds two
  tapes has a `previousClose` from the **minute before**, not the other tape;
  a security with one tape is unchanged
- **A test that fails without this task**, asserting the two instants differ
- A `pnpm break` for it — the defect is silent, which is the whole reason
- The `market_bars` reads audited, with the result written down either way
- `LIVE-SESSION.md` §on the reads that assume one row a minute

## Done when

1. `readLastCloses` answers two different instants for a security whose newest
   minute holds two tapes
2. The tie-break is `SERVED_TAPE_RANK`, so the table and the chart cannot
   disagree about one minute
3. The lateral's measured cost is re-taken and recorded; a regression past the
   2026-09-09 figures is a decision rather than a discovery
4. The remaining `market_bars` reads are audited and the answer recorded
5. `pnpm verify` and `pnpm test:database` pass

## What was done — 2026-09-23

### The correction that came first

**The task's own framing was wrong and checking it cost one grep.** It claimed
the universe table would print a fabricated move on all 518 rows the first night
after a live session. `readLastCloses` has exactly one shipped caller and it
passes **`1d`**; the live writer writes **`1m`**; only the backfill writes daily
bars and only on `sip`. Confirmed against the store — `1d` is 347,631 rows, all
`sip`. **The defect was latent**, and the reproduction that found it called the
function at a timeframe nothing in the product passes it.

That claim had already reached three documents. All three were corrected before
a line of code was written, which is the order that matters: an implementation
built on a false premise produces a correct patch and a wrong record.

**The repair went ahead, and the reason is a date rather than a severity.** The
timeframe is a **parameter**, `1m` can hold two tapes today, and Task 3.8.8 is
_The surfaces that now show a stored today_ — a universe table showing today's
close is a table reading minute closes. The trap sits in that task's path.

### The shape, and the measurement that chose it

`distinct on (market_bars.observed_at)` inside the lateral, tie-broken by
`SERVED_TAPE_RANK` — the same rule 3.8.4 serves charts under, so a table and the
chart beside it cannot disagree about one minute. One home for the preference,
already argued and already break-verified.

`limit 2` is load-bearing and the task said so: it is what makes this a bounded
backwards walk rather than a ranking of every bar. Measured against the
populated store with the newest two minutes of all 518 securities doubled:

| shape                            | `1m`    | `1d`   |
| -------------------------------- | ------- | ------ |
| today's query, no preference     | 5.2 ms  | 3.4 ms |
| **`distinct on` in the lateral** | 7.6 ms  | 5.5 ms |
| a wider limit, reduced in Node   | 16.6 ms | 6.4 ms |

**`explain (analyze, buffers)` answers the question the task actually asked.**
The plan is an **`Incremental Sort`**: the index still supplies the order and
only rows sharing an instant are sorted, which is why the 40× margin survives.
Buffers rise 12,487 → 31,377 at `1m`. The result sits inside the **4.8–8.2 ms**
band this query has occupied since 2026-09-09 and is **33× clear** of the
`row_number()` shape that measurement rejected. Recorded beside the old figures
rather than replacing them.

Candidate 2 — a wider limit reduced in Node — was rejected on the measurement
rather than on the magic-number argument: it is the slowest of the three at both
timeframes.

### The audit, written down either way

| read                        | verdict                                      |
| --------------------------- | -------------------------------------------- |
| `readSeries`                | repaired by 3.8.4                            |
| `readBars`                  | deliberately not repaired — replay wants all |
| `readLastCloses`            | repaired here                                |
| `readLastBarDates`          | **safe**, checked: a max over duplicates     |
| `writeBatch` presence check | tape-scoped since 3.8.2                      |
| `store-freshness`           | **safe** — reads `readLastBarDates`          |
| **`pnpm bars:check`**       | **not safe** — see below                     |

**The audit found a third instance of the family.** `bars:check` reports
_series holding MORE bars than their sessions have minutes_ as an anomaly, and
the ledger's `bar_count` counts **rows**. A fully reconciled session holds up to
two rows a minute, so every reconciled security would trip that line — a false
alarm, on exactly the night the tool's output matters most. **Handed to Task
3.8.9**, which already owns `bars:check` as criterion 9, with the three
candidate repairs named.

### One break rotted, caught by the invariant rather than by review

`the-served-minute-keeps-both-its-rows` — 3.8.4's — anchored on
`        .distinctOn("market_bars.observed_at")` at eight spaces. This task gave
`readLastCloses` the same call at **twelve**, and an eight-space anchor is a
**substring** of a twelve-space one, so the entry began matching twice and could
no longer land. `every-break-can-still-land` said so. Both anchors now carry the
line after them, which differs between the two call sites.

### Checks

Five tests under _a minute held on two tapes_, at `1m` because that is the
timeframe that can hold them:

1. **Fails without the repair by producing a number rather than throwing** —
   two instants compared, not one instant twice.
2. The consolidated tape is what a reader is served, matching the chart.
3. The live tape is the fallback where the consolidated one has not reached.
4. **One distinct instant held twice has no previous close** — an absence
   rather than a zero, which is the state the design card was made for.
5. A security with one tape is unchanged.

`pnpm break the-last-close-compares-one-minute-with-itself` proves the red.

### The design artifact

`preview/universe-change-cell.html` in the Claude Design project, reusing
`tokens.css` and `preview/_card.css` rather than introducing anything. Four
sections: a move, unchanged, **nothing to compare against**, and one that is
not a state at all — the fabricated move, kept on the card because the cell had
**no way to defend itself**: every channel it owns was correct.

It also records a collision the repair does not fix. The em dash in the Change
column means _we cannot say_; the same glyph in Sector and Industry means _this
row has no such thing_. Those columns argue the dash is enough **because the
group heading and the Kind column already explain it**, and that argument does
not transfer. The card carries the reversal trigger rather than pretending it
does: the first time a reader can meet this dash on a deployed store, or the
first second column to draw an em dash for a third meaning.

## For a stakeholder — a status report, 2026-09-23

### What this was

**We found a way the product could have shown you a price move that never
happened, and closed it before anything could reach it.**

The universe table — the 518-row list of everything we track — shows each
security's last price and how much it moved. The move is worked out by
subtracting the previous close from the latest one. That is obviously correct,
and it rested on an assumption nobody had written down: **that the two most
recent prices we hold are from two different moments.**

Since last week that is no longer guaranteed. We now keep two records of the
same minute when both our data feeds saw it — the live one we watch during the
day, and the fuller one that arrives overnight. Ask for "the last two prices"
and you can get **the same minute twice**. Subtract one from the other and you
get a move of about **50%**, drawn with an arrow and a colour, in the right
format, in the right place.

### The part worth telling you plainly

**We initially said this was already live and about to affect every row, and
that was wrong.** One check showed why: the table reads _daily_ closing prices,
and the live feed only ever writes _minute_ prices. The two never meet today. No
customer-facing screen was affected.

We are recording that mistake rather than quietly fixing it, because the order
matters. We had already written the incorrect claim into three planning
documents. Had we implemented first and checked later, the code would have been
right and the written record would have been wrong — and the written record is
what the next person reads.

### So why do it now at all?

**Because the trap is sitting directly in the path of the next piece of
visible work.** The very next task on this story is called _The surfaces that
now show a stored today_, and its whole point is making the table show today's
prices. Today's prices are minute prices. The day we make that change, this
function is already waiting with the wrong answer.

Closing it now cost **two milliseconds** of database time and an afternoon.
Meeting it later would have meant finding it in a table of 518 plausible,
well-formatted, entirely invented numbers.

### Why it would have been hard to catch

This is the uncomfortable part, and it is why we also produced a design artifact
rather than just a code fix.

The cell had **no way to defend itself**. Every channel it controls was correct:
right number of decimal places, right alignment, right colour for the direction,
right arrow, right position in the row. Nothing about it looked wrong, because
nothing about it _was_ wrong — it was faithfully rendering a number that should
never have been calculated.

Our product specification has two rules that this breaks: we must not
manufacture observations we do not have, and anything the system concludes must
be distinguishable from something it observed. A percentage computed between two
versions of one minute is neither.

### The design work

We added a card to the design system for this one table cell, showing the states
it can actually reach — a move, no change, and **nothing to compare against** —
plus, deliberately, the broken state, labelled as what it replaced. Designers
should see once what a correct-looking lie looks like.

It also records a smaller inconsistency we chose **not** to fix. The dash we
draw in this column means _we cannot tell you_; the same dash in the Sector
column means _this row has no such thing_. Those columns justify the dash on the
grounds that the rest of the row already explains it, and that justification
does not hold here. We wrote down the condition that should make us revisit it
instead of pretending it does, because a 518-row table is not worth widening for
a state almost nobody will reach.

### Where the product stands

Five of ten tasks in this story are done. The live market session is now
**written down, served correctly, honestly labelled, and safe to reconcile
overnight**. Four of those five tasks fixed things that would have gone wrong
only once real data flowed through — which is the normal shape of this kind of
work, and the reason we keep building the situation in our own database and
looking at it rather than reasoning about it.

**What you still cannot see** is any of it against the real market during
trading hours. That remains one sitting with the market open, and it is on the
list.

**What is next** is the visible one: the screens that will start showing today's
session as stored history rather than as a live feed, which is the task this one
was cleared out of the way for.
