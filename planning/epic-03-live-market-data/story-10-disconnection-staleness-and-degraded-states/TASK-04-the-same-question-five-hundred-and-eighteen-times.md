# Task 3.10.4 — The same question, 518 times

**Status:** Not started
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
