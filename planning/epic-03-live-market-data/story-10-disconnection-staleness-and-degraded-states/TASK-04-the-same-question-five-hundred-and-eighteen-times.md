# Task 3.10.4 — The same question, 518 times

**Status:** **Complete — 2026-09-24.** State 4 now says **when**, in the line this column had already reserved — **no new element, no new column, no threshold and no clock.** The reference is the newest observation on the page, which is the heading's own rule turned onto the rows. Measured on a production build at the worst case — **every** row behind, 517 instants drawn — at **36.75–36.83 ms of script a tick** against §28's 50 ms, about **4 ms** for all 517. **Epic 14's trigger did NOT fire**, and the argument is that no second surface and no new element exists.
**Story:** [3.10 Disconnection, Staleness & Every Degraded State](STORY.md)
**Depends on:** 3.10.3

## Objective

Take 3.10.3's answer to the universe table, where the state it repairs is
**state 4** and the table currently gets it exactly the wrong way round.

## What the user can see when this lands

**The securities table stops being more careful about a day-old number than
about a three-hour-old one.**

## The four states a row can be in, and the one that reads wrong

| #   | The row holds                               | What it draws                                | Reads correctly?        |
| --- | ------------------------------------------- | -------------------------------------------- | ----------------------- |
| 1   | A live observation from this minute         | the figure, **no date**, `Live price` spoken | **Yes**                 |
| 2   | Only a stored close                         | the figure **with its session date**         | **Yes**                 |
| 3   | Nothing at all                              | an em dash, `No close yet` spoken            | **Yes**                 |
| 4   | A live observation from **three hours ago** | the figure, **no date**, `Live price` spoken | **No — identical to 1** |

**State 4 is ordinary rather than exotic.** `currentMarketState` keeps the
latest observation per security and **never expires it**; §11.2 measured a
maximum ordinary gap of **187 minutes**; §7.6 measured `ERIE` at **2.1%**
coverage.

**And the arrival mark cannot cover it.** The mark answers _is this row being
fed_ for somebody **watching**, and says nothing to somebody who has just
arrived — because nothing has arrived yet. **That gap is precisely state 4.**

## The cost ceiling, which is this task's real constraint

**Anything added per row lands on top of a figure that is already the page's
worst.** Task 3.6.5 repaired a routine per-tick breach with the table's first
two memo boundaries and left the cold load as Epic 14's:

| Figure                                    | Value                  | Owner    |
| ----------------------------------------- | ---------------------- | -------- |
| Cold load of `/securities`                | **50–56 ms** (7 in 10) | Epic 14  |
| `Expand all`                              | **65–86 ms**           | Epic 14  |
| Steady state, every row changing a minute | **37–40 ms** of script | repaired |

**And Epic 14's reversal trigger is written against this task by name**: _the
first time a second surface on this page renders per-row markup at universe
scale_. A staleness affordance per row may be exactly that. **Evaluate it in
writing, whichever way it goes**, and re-measure on a production build rather
than reasoning about it.

> **The cheapest repair is probably not markup.** State 2 already carries a
> **date** and state 4 carries nothing; the asymmetry is the defect. Giving
> state 4 the same treatment state 2 already has costs no new element type.

## Work

- State 4 rendered distinguishably from state 1, per 3.10.3's decision
- Epic 14's trigger evaluated in writing, with a production-build measurement
- The spoken string per state, and the table's existing `Live price` /
  `No close yet` vocabulary extended rather than replaced
- A browser assertion against a store with **zero bars**, which is CI's

## Done when

1. States 1 and 4 do not read identically, asserted
2. The per-tick cost is re-measured and the trigger's verdict is written down
3. `pnpm verify` and `pnpm e2e` pass

---

## Amended by Task 3.10.3 — 2026-09-24: the defect is yours ALONE, and the identity block is the worked example

**Task 3.10.1's audit reported that every surface below the chrome could not
tell an hours-old price from a fresh one. That was its own shorthand read back
as a finding, and Task 3.10.3 corrected it by rendering the identity block.**

The identity block has carried the bar's own instant since Task 3.4.2:

```text
fresh            Latest price 219.50 ▼ −4.71%  Sep 16 · 14:01 EDT · change from …
three hours old  Latest price 219.50 ▼ −4.71%  Sep 16 · 11:01 EDT · change from …
no live price    Last session close 230.36 ▲ +0.84%  2026-09-04 · change from …
```

**Three renderings, three readings**, now held as a set by
`SecurityIdentity.test.tsx`'s _reads differently in all three states_.

**So this table is the only surface where state 4 is real**, which is exactly
where Task 3.6.2 located it and declined to repair it. Nothing has moved except
that the claim is now checked rather than asserted.

### What the identity block did, said plainly, because it is the design you are scaling

- **It dates the figure.** `Sep 16 · 14:01 EDT` — the **bar's own instant**,
  not a relative age and not a threshold verdict.
- **The label moves for a different KIND of number.** `Latest price` against
  `Last session close`, because a minute bar's close and a session's close are
  different things measured at different times. The qualifier's _format_ moves
  with it — a full instant against a bare session date.
- **No status word, at any age.** Held across three ages by _does not grow a
  status word as it ages_, because §11.2's ordinary maximum gap is 187 minutes.
- **The change figure survives.** Decision 3, asserted.

### The one thing that does NOT carry over, and it is the whole of your difficulty

**The identity block shows one figure and you show 518.** It can afford a full
instant — `Sep 16 · 14:01 EDT` is 17 characters in a block with a column to
itself. A per-row instant at universe scale is the thing Epic 14's trigger is
written against by name: _the first time a second surface on this page renders
per-row markup at universe scale_.

**The cheap version is the asymmetry rather than the instant.** State 2 already
carries a **session date** and state 4 carries nothing. Giving state 4 the
treatment state 2 already has costs no new element type and no new column — and
it is the same decision the identity block took, at the grain this surface can
afford.

---

## What was done — 2026-09-24

### The repair, and it is a line that was already there

**State 4 puts its instant in the span this column already reserved.**

That span exists so arriving costs no height: every stored row carries a
session date once anything is live, so without it a row would **shrink** the
first time an observation reached it — a table reflowing under a reader as a
thin name finally trades. State 2 fills it with a session date; state 4 now
fills it with a time.

| The row holds                            | Before                    | After                  |
| ---------------------------------------- | ------------------------- | ---------------------- |
| 1 — the newest minute                    | `105.03`                  | unchanged              |
| **4 — a minute the feed has moved past** | `105.03` — identical to 1 | `105.03` / **`12:07`** |
| 2 — only a stored close                  | `171.45` / `2026-09-04`   | unchanged              |
| 3 — nothing at all                       | `—`                       | unchanged              |

**No new element type, no new column, no change of row height** — asserted in a
browser, because a claim about height is a claim about layout and nothing below
`pnpm e2e` can see one.

### The reference is the newest observation, not a clock and not a threshold

A row says its instant **when the feed has moved past it**. That is the
heading's own rule turned onto the rows — `held.through` renders its second
clause _only when the shared thing does not cover the row_ — and it means this
makes **no judgement**: it renders the instant, never a verdict about it, which
is what keeps it clear of §11.2's refusal to give a security a status word.

> **A clock would have been the wrong reference, and the difference shows up
> after the bell.** Against `Date.now()` every one of the 518 rows would grow a
> time overnight, saying what the masthead's `CLOSED` already says, 518 times.
> Against the newest observation they are all equal and all silent — which is
> correct, because the prices agree with each other and the chrome owns the
> fact that the market is shut. Asserted: _stays silent when every live row is
> level, which is the shut market._

### The spoken vocabulary is extended rather than replaced

`Live price` stays, and becomes `Live price from 10:00` when there is an
instant to carry. `No close yet` is untouched. A listener who knows the two
words still knows them.

The drawn instant is `aria-hidden`, so the fact is **said once**: the spoken
half carries it and the visible half is the same fact for eyes.

### Measured on a production build, and Epic 14's trigger evaluated

`vite preview` over `apps/frontend/dist`, 530 rows, 30 ticks, two samples:

| Every row…                     | Instants drawn | Script/tick        | Against §28's 50 ms |
| ------------------------------ | -------------- | ------------------ | ------------------- |
| level with the feed            | 0              | **32.85 ms**       | under               |
| **behind it — the worst case** | **517**        | **36.75–36.83 ms** | **under, by 13 ms** |

**517 formatted instants cost about 4 ms** — roughly 7.5 µs each — and the
worst case sits at the bottom of the **37–40 ms** band Task 3.6.5 recorded for
this table with every row changing. Reality is kinder: §7.6's median symbol is
covered in 65.1% of minutes, so a real tick draws a fraction of 517.

> **Epic 14's reversal trigger — _the first time a second surface on this page
> renders per-row markup at universe scale_ — did NOT fire.** There is no
> second surface and no new element: it is the span the column already
> reserved, carrying text instead of a space. The cold load (**50–56 ms**) and
> `Expand all` (**65–86 ms**) remain Epic 14's at the figures Task 3.6.5 left
> them. **The trigger stands unchanged**, and what would fire it is still a
> genuinely new per-row surface — an anomaly badge, a sparkline, a second
> control.

### The instrument, and the two things it got wrong before it was believed

`scripts/row-cost.mjs`, run and deleted. Both faults are worth keeping because
both produced a confident wrong answer:

**1. It intercepted the page it was measuring.** The route pattern
`/\/securities/` matches the **document** at `localhost:4173/securities` as
well as the API call, so the HTML was fulfilled as `application/json` and the
page rendered its own source as text. The symptom was a body whose `innerText`
began `<!doctype html>`.

**2. It reported ZERO instants drawn while the page was full of them.** The
counter used `/\b\d{2}:\d{2}\b/`, and a behind row's text runs the spoken half
into the drawn one — `Live price from 12:0712:07` — so the trailing word
boundary never matches. **Had the measurement been taken on trust, it would
have recorded the worst case as costing nothing**, because the worst case was
never actually on screen.

> And a third, which is the environment rather than the instrument: `vite
preview` serves :4173 and the backend allows :5173, so every fetch was
> blocked by **CORS** — invisible in `curl`, loud only in the console, which is
> the trap `CLAUDE.md` already records. Proxying through Playwright fixes it
> only if the interception **replaces** the upstream `access-control-allow-origin`
> rather than forwarding it, and only if the pattern names the host the bundle
> was built with (`localhost`, not `127.0.0.1`).

### The canvas

`Degraded states` gains **§04**: the four states before and after, the two
constraints that shaped the repair, the measurement table and Epic 14's written
verdict. A story joins the workshop — `A row the feed has moved past` — so the
state is reviewable beside the others rather than only in a test.

### Gates

`pnpm verify` green — **2,412 tests** (five new), 26 invariants. `pnpm e2e`
green. Looked at, at 1440 and 390, before any suite was run.

> **And one flake repaired rather than blamed on the machine.** The first full
> browser run failed **one** spec — Task 3.10.2's _killing the feed leaves the
> page exactly as it was_ — which this change cannot reach: it is on
> `/securities/NVDA`, pushes a single observation, and nothing is ever behind a
> single observation. The runner warned about load 13.5 and it passed in
> isolation, so contention was the easy answer.
>
> **It was a real race in that spec.** It snapshotted `main` as soon as the
> chrome said `live` — which happens when the socket greets the browser, before
> the identity block has rendered the observation that greeting carried. A
> `before` taken then can miss a figure the `after` has, and the comparison
> fails on the page having finished loading rather than on the outage changing
> anything. It now waits for the price to be on the page first. **The
> assertion was right and the fixture was racing it.**

## For a stakeholder — a status report, 2026-09-24

### What this was

**The 518-row table was more careful about a day-old price than about a
three-hour-old one.** A row showing yesterday's closing price told you the date
it came from. A row showing a _live_ price from three hours ago told you
nothing at all — it looked exactly like a price from this second.

That is backwards, and it is the one place in the product where it was still
true. The big price at the top of a security page has always shown its time;
the table had not.

### Why nobody had fixed it

Because it looked like it needed a number, and we had already measured that no
number works.

The obvious repair is _"mark a price stale after N minutes"_. But a share can
normally go **187 minutes** between trades, and our live feed carries only about
**65%** of a typical share's minutes. Any threshold we picked would spend all
day accusing perfectly healthy quiet shares of being broken. A previous piece of
work found this defect, wrote it down, and deliberately left it — because taking
that decision as a side effect of a different task would have been the wrong way
to take it.

### What we did instead

**We show the time, and make no judgement about it.**

A row says _when_ its price is from — but only when the feed has already moved
on to a later minute elsewhere in the table. If every row is equally old, which
is what happens overnight, they all stay quiet, because the clock at the top of
the screen already says the market is closed. Saying it 518 more times would be
noise.

**No verdict, no warning colour, no new word.** Just the minute, in the same
place a stored price already shows its date.

### The part we are most pleased with

**It cost no new anything.** That column already reserved a blank second line —
it exists so rows do not jump about when a quiet share finally trades. We put
the time in the line that was already there. Same position as the date a stored
row shows, same row height, no new column.

So the change a reader sees is a number appearing in a space that was already
blank, in a format they already recognise from the row above.

### And we measured it, because 518 of anything is a cost

On a production build, with **every single row** made three hours old — far
worse than reality ever gets — the page spends **36.8 milliseconds** per update
against a budget of **50**. All 517 timestamps together cost about **4
milliseconds**.

We also formally re-checked a standing condition we had set ourselves: _"the
first time a second surface on this page renders per-row markup at universe
scale, come back and deal with the page's known performance debt."_ **It did not
trigger** — because we added no new surface and no new element. That debt stays
where it was, on the list, with its figures unchanged.

### One thing worth telling you about how we measure

**Our measuring tool reported that the worst case cost nothing, and it was
wrong.** Its counter for "how many rows are showing a time" used a pattern that
could not match, so it kept reporting zero while the screen was full of them.
Had we trusted it, we would have published a figure for a situation that was
never actually on screen.

We caught it by dumping four real rows and reading them. That is the fourth
time in this story the tool rather than the product was at fault — and each one
was found by looking at output rather than re-reading code.

### Where the product stands

**Epic 3's final story, four of ten tasks done.** The status strip is honest
about the connection, the big price is honest about its age, and now so are all
518 rows.

**What is next:** the charts — where a feed that stops mid-session currently
draws a line that simply ends, with nothing saying why.
