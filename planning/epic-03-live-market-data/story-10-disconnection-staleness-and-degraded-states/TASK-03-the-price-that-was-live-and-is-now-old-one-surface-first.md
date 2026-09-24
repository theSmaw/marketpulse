# Task 3.10.3 — The price that was live and is now old, on one surface first

**Status:** **Complete — 2026-09-24, and it built nothing, because this surface was already right.** The identity block has carried the bar's own instant since Task 3.4.2, so a live price three hours old and one five seconds old **already read differently** — which makes Task 3.10.1's audit summary wrong about this surface and right about the table. Corrected in four places. What this task added is the thing nothing held: **the three renderings asserted as a SET** rather than one at a time, five tests. The spoken string did not grow, and counting it turned up **a discrepancy with Task 3.4.7's recorded figure that is reported rather than resolved**.
**Story:** [3.10 Disconnection, Staleness & Every Degraded State](STORY.md)
**Depends on:** 3.10.1, 3.10.2

## Objective

**The per-datum question, which is the hard one**, taken on the identity block
alone before it is taken 518 times.

> A price that was live and is now forty minutes old is not the same as a price
> that was never live.

## What the user can see when this lands

**The big price on a security page stops silently presenting an old number as a
current one.** What it does instead is 3.10.1's decision; what is certain is
that it stops being indistinguishable from a fresh one.

## Why one surface first, and why this one

**Because the repair is a threshold applied to a rendering, and the table
applies it 518 times.** Task 3.6.2 declined this exact repair on exactly that
ground: choosing a number _"on the surface that has to apply it 518 times,
inside a design pass about a disc"_ would take the epic's hardest decision as a
side effect.

So: **take the decision on one row, see it, then scale it.** The identity block
is one figure with three lines that already change together (`LATEST PRICE`, the
figure, and a qualifier carrying an instant and a change basis), and it already
has the instant this task needs to reason about.

## What is already true and must not be undone

- **The qualifier's instant is the survivor** under `prefers-reduced-motion`
  (Task 3.4.7), asserted in a browser. A degraded feed is the case where that
  instant **stops advancing** — which is information this task can use rather
  than a problem to work around.
- **The block deliberately has no live region** — four reasons and a reversal
  trigger in `FRONTEND-STATE.md` §7. Adding one here is a decision with an
  owner, not a detail.
- **The arrival mark fires on a bar arriving**, says nothing about what silence
  means, and simply stops. §11.2's refusal to give a security a status word is
  the standing decision it respects.

## The listening cost, which must be counted rather than discovered

The block's spoken string is **10 or 11 words across three `<p>` elements**, and
its qualifier can already carry **three clauses**
(`07:42 EDT · pre-market · change from …`). A staleness clause is a **fourth**,
and `docs/GAPS.md`'s standing listening item is at **five entries** with an
owner who is a person with a screen reader.

**Count the words and add the entry in this task rather than at the close.**

## Work

- The state-4 repair on the identity block, per 3.10.1's decision
- Its wording, with the rejected alternatives and a reversal trigger
- Whether the change figure survives — 3.10.1's decision 3, applied here first
- Component and browser assertions per state, including _quiet security_ which
  must **not** read as degraded
- The spoken string counted, and `docs/GAPS.md` amended if it grew

## Done when

1. A live price, a stale live price and a stored close are three renderings
2. A quiet security is not one of them
3. The spoken string's length is recorded

---

## What was done — 2026-09-24

### The premise was false for this surface, and rendering it is what showed that

This task's objective opens _"the big price on a security page stops silently
presenting an old number as a current one."_ **It never did.** Rendered:

```text
fresh            Latest price 219.50 ▼ −4.71%  Sep 16 · 14:01 EDT · change from …
three hours old  Latest price 219.50 ▼ −4.71%  Sep 16 · 11:01 EDT · change from …
no live price    Last session close 230.36 ▲ +0.84%  2026-09-04 · change from …
```

Three renderings, three readings. The qualifier has carried
`formatBarInstant(live.startsAt, "1m")` since **Task 3.4.2**, whose own test is
named _says WHEN, because a live price may legitimately be hours old_ and whose
comment says, in as many words, _"hours-old is the feed working, and only the
instant tells that apart from a minute-old one."_

**So decision 1 — _date it, the way a stored close is dated_ — was taken on
this surface a story ago**, and the owner's answer on 2026-09-24 ratified what
already shipped rather than asking for something new.

### The correction, which is the substantive output

Task 3.10.1's grid used **`identical`** to mean _the same shape_. The summary
drawn from it — in its own findings, its stakeholder report, and on the canvas
— slid into the stronger claim that **a price that arrived three hours ago
looks identical to one that arrived five seconds ago**.

**That is true of the table and false of the identity block.** Generalising the
table's defect to every surface below the chrome was the audit reading its own
shorthand back as a finding — and it is the _third_ time in this story that the
instrument rather than the product was the thing that was wrong.

Corrected in four places:

| Where                            | What changed                                                                 |
| -------------------------------- | ---------------------------------------------------------------------------- |
| Task 3.10.1's grid               | `identical` → `same shape`, and the instant column marked as the difference  |
| Task 3.10.1's stakeholder report | the sharpest example is named as **the table's**                             |
| `Degraded states` §01            | the same, with a pointer to the new §03                                      |
| Task 3.10.4's file               | amended — the defect is **its alone**, with this block as the worked example |

### What was actually missing, and is now there

**Nothing held the three renderings against each other.** Task 3.4.2 asserted
the pieces one at a time — the instant exists, no status word appears, an absent
live price falls back — and Story 3.10's criterion 2 is about the **set**: _two
states that imply different next actions do not read identically._

`SecurityIdentity.test.tsx` gains five tests, including the pairwise one that
is the criterion rather than a proxy for it:

```ts
expect(new Set([fresh, hoursOld, stored]).size).toBe(3);
```

and _does not grow a status word as it ages_, which holds §11.2's refusal
across three ages rather than at one instant — because the ordinary maximum gap
between one security's bars is **187 minutes**, so an hours-old price is the
feed working and must not be dressed as a fault.

**Decision 3 is asserted too**: an hours-old price keeps its change figure.

### The spoken string — counted, unchanged, and a discrepancy worth reporting

**This task added no clause**, so whatever the true figure, it has not moved and
`docs/GAPS.md` needs no amendment on that account.

Counted here for the first time with the method written down — whitespace
tokens, after removing the `·` separators, across the block's three `<p>`:

| Part                                                  | Words |
| ----------------------------------------------------- | ----- |
| `Latest price`                                        | 2     |
| `219.50 down 4.71%`                                   | 3     |
| `Sep 16 · 14:01 EDT · change from 2026-09-04's close` | 8     |
| `… · change from the previous close`                  | 9     |
| `… · pre-market · change from the previous close`     | 10    |

**13, 14 or 15 words** depending on the basis and whether an extended-hours word
is present.

> **`CLAUDE.md` and Task 3.4.7 record 10 or 11, and this does not reconcile.**
> Both lengths there are attributed to the basis clause's two spellings, which
> this count also has — so the gap is not the second length, it is three words
> somewhere in the method. **It is reported rather than resolved**: adopting
> either number silently would make one of two records wrong with nothing
> saying which, and the count that matters for the listening backlog is the
> **pacing** one, which belongs to `readingAnnouncement` rather than to this
> block. **Owner: the listening pass**, which has to read this block aloud
> anyway — it is entry two and three on that list.

### What this task deliberately did NOT do

**It did not give the block a staleness word, a relative age or a threshold.**
The owner's decision was to date the figure, the block already does, and
§11.2's refusal to give a security a status word is a measurement rather than a
preference.

**It did not add a live region.** `FRONTEND-STATE.md` §7's four reasons and its
reversal trigger stand; the trigger names a condition and this is not it.

### Gates

`pnpm verify` green — **2,407 tests** (five new), 26 invariants. No product code
changed: every file touched is a test, a task record or the canvas.

## For a stakeholder — a status report, 2026-09-24

### What this was meant to be, and what it turned out to be

**The plan said: stop the big price at the top of a security page from
presenting a three-hour-old number as if it were current.**

We went to make that change and found the page was already doing it correctly.
So this task became a correction — of our own reporting — plus the safety net
that stops the good behaviour being lost.

### What the page actually does

Three situations, three different readings:

| Situation                    | What you see                                              |
| ---------------------------- | --------------------------------------------------------- |
| A price from this minute     | **Latest price** 219.50 ▼ −4.71% — Sep 16 · **14:01 EDT** |
| A price from three hours ago | **Latest price** 219.50 ▼ −4.71% — Sep 16 · **11:01 EDT** |
| No live price at all         | **Last session close** 230.36 ▲ +0.84% — 2026-09-04       |

The time is right there, and it has been since the work that first put a moving
price on the screen. A price that is hours old says so; a price that is not
live at all changes its _label_, because a minute's trading and a whole
session's close are different kinds of number.

### So where did the problem go?

**It is in the 518-row table, and only there.** Yesterday's audit summarised its
findings with a phrase — _"looks identical"_ — that was shorthand for _"the
same layout"_, and the summary then travelled as though it meant _"you cannot
tell them apart"_. True of the table. Not true of the big price.

**We have corrected that in all four places it had spread to**, including the
stakeholder report you were given yesterday and the design record. The task
that fixes the table now carries the big price as its worked example — because
the design it needs already exists, one surface over.

**This is the third time in this story that our own measuring was the thing at
fault rather than the product.** That is uncomfortable to keep reporting, and
it is also the reason the reports are worth anything: each was caught by going
and looking rather than by re-reading a note.

### What we actually built

**The safety net.** The three readings were each checked individually, and
**nothing checked them against one another** — which is precisely the kind of
gap this story exists to close: a state can be correct on its own and wrong
beside its neighbour.

There are now five automated checks, including one that simply asserts the
three readings are three _different_ readings, and one that confirms the page
never starts calling a quiet share "stale" as its price ages. That last one
matters: we measured that a share can normally go **187 minutes** between
trades, so accusing it of being stale would be the product crying wolf.

### One thing we are reporting rather than quietly fixing

We counted how long the spoken version of that price block is — it matters for
screen-reader users, who hear it read aloud. **Our count came to 13–15 words;
an earlier record says 10 or 11.** We cannot reconcile the two without knowing
exactly how the first was counted.

We have **not** simply adopted our number. Doing so would silently make one of
two records wrong with nothing saying which. It is written down as an open
discrepancy for the accessibility review that has to read this block aloud
anyway — and the important part is unaffected: **this task added no words**, so
whatever the true figure, it has not moved.

### Where the product stands

**Epic 3's final story, three of ten tasks done.** The status strip is honest
about the connection, and the big price is honest about its own age.

**What is next:** the same honesty 518 times over, in the table — where the
problem actually lives, and where the cost of a per-row change is the real
constraint.
