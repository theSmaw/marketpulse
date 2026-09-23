# Task 3.8.8 — The surfaces that now show a stored today

**Status:** **Complete — 2026-09-23.** The `Last close` column does **not** blur: it reads `1d`, the live writer writes `1m`, and one query settled it before any code was written. What did move was a third surface nobody had named — the store's claim about its own depth, whose comment had already written down the condition that would end it. `through` took the **maximum** end date and now takes the **minimum**, naming the furthest second: measured at 340 of 518, the old figure claimed a date **178 securities did not reach**. The arrival mark is proved not to fire on a store re-read, in a browser, across the whole page. And the two-feed source note **matches the canvas clause for clause**, the first time it has had real data behind it.
**Story:** [3.8 Storing the Live Session](STORY.md)
**Depends on:** 3.8.3

## Objective

Two shipped surfaces change meaning the moment the store holds today, and both
were handed here by the stories that built them. Neither is a new feature;
both are the kind of thing that is **invisible until somebody watches it**.

## What the user can see when this lands

**Consistency across a reload**, which is the sort of thing a user notices only
when it is wrong: a row that was live before the reload and is stored after it
should not change what it claims, and a page re-read from the store should not
pretend prices are arriving.

## 1. The universe table's dating rule, which this story blurs

Handed here by Story 3.6's close. The `Last` column used to hold one kind of
number — a close from the consolidated tape, all from one session — so the date
was stated **once, in the heading**. A live price is a different kind of number
from a different feed, so once any row is live the heading withdraws its shared
claim and **each stored row carries its own session date**, while a live row
carries none and is spoken as `Live price`. Measured then: the exception set
went from 3 of 518 to about 197.

**Storing the live session blurs the line that rule draws.** After 3.8.3 a
reload shows today's bars as **stored**. Decide, in this story's file, what a
stored bar from **today's** session says in that cell and whether it is dated —
and keep the two things the table already guards: the spoken word tells the two
kinds apart, and a claim about a session is made only while it is true of the
whole column.

## 2. The arrival mark, which must not fire on a re-read

Handed here by Story 3.4's close. The mark means **a bar arrived for this
security** — an event — and re-reading a stored session is not one. The
vocabulary is _work in progress loops, a state persists, **a fact arriving
decays**_, and a mark that fired while a user scrolled through yesterday would
make the vocabulary's own sentence false.

**The mechanism to check rather than rebuild**: the mark keys on the
observation's **content**, and `SecurityIdentity` remembers the instant it
mounted with so a first paint marks nothing. Whether that still holds when the
prices come from a **store** rather than a socket is this story's to confirm —
and Story 3.4's close named it as _the one thing that would be invisible until
somebody watched it_.

Note also, from Story 3.6's close: the table is memoised on the observation's
identity, so a stored bar handed to it under a **new object for the same
minute** is a re-render of that row.

## Work

- The dating decision, taken and written down, with whatever the table needs
- Confirm or repair the arrival mark against a store-fed page, and **assert it
  in a browser** — this is a layout-and-time fact, so nothing below `pnpm e2e`
  can see it
- `pnpm probe` at the four viewports if either surface's shape moves
- A `pnpm break` for whichever rule is now load-bearing
- Design: read the source note's two-feed rendering against
  `VISUAL-LANGUAGE.md`'s provenance section now that it has real data behind it
  for the first time, and record whether the drawn result matches what the
  canvas intended. **Check `DesignSync` first** — see the note in `STORY.md`

## Done when

1. What a stored bar from today's session claims in the `Last` column is decided
   and drawn
2. The arrival mark is proved not to fire on a store re-read, in a browser
3. `pnpm verify` passes and the browser suite is green

## What was done — 2026-09-23

### Item 1 does not happen, and one query settled it

The task said storing the live session _blurs the line_ the dating rule draws.
It does not. That column reads **`1d`** (`CLOSE_TIMEFRAME`), the live writer
writes **`1m`** and nothing else, and the store confirms it: 676 daily sessions,
all `sip`, newest `2026-09-11`. Daily bars still arrive only from the nightly
backfill, all 518 together, so `commonSession` still finds one date and the
heading still carries it.

**The third task in a row whose stated hazard was not the real one**, and the
third settled by a query before a line of code.

### What did move was a third surface, and its own comment named the condition

`summariseCoverage`'s `through` took the **maximum** end date across the
universe. The comment above it:

> A backfill walks backwards from the most recent session, so **every security
> shares this date**… **If that ever stops being true, this figure becomes the
> optimistic one and the honest thing to do is say so rather than switch it
> silently.**

Storing the live session ended it — the feed is one venue carrying **65.1% of a
median name's minutes**. Simulated on the real ledger at 340 of 518:

|                                              |            |
| -------------------------------------------- | ---------- |
| distinct end days across the universe        | 2          |
| what the line claimed (the maximum)          | 2026-09-14 |
| what is true of all 518 (the minimum)        | 2026-09-11 |
| **securities not reaching the claimed date** | **178**    |

From the **first minute** of a session, one security printing a bar made the
page claim the store reached today while 517 had nothing for it.

### The decision, and why it is the minimum

`through <min>`, then `, some to <max>` only when they differ.

**Reliability first, because that is the line's job** — what the store can be
trusted to hold for _every_ security. The other way round it is a promise 178
rows cannot keep. This is the asymmetry the table already applies to the
`Last close` heading through `commonSession`, reused rather than reinvented: _a
shared claim is made only when it is true of everything._

**It also stops hiding a straggler.** A delisted security whose history ends
years ago is invisible behind a maximum and is the first thing a reader meets
under a minimum.

**Measured at four viewports, flat against ragged: the clause costs no height** —
`1358×22` at 1440 and `308×100` at 390 in both states, because the line already
wraps and the new text fits the last row. Drawn and looked at:

```text
518 securities tracked · 11 sectors · 15 ETFs · all with history ·
48.4M minute bars · through 2026-09-11, some to 2026-09-14
```

`pnpm break the-store-claims-one-securitys-frontier-as-its-own` proves the red,
and `coverage.test.ts`'s assertion was **inverted rather than rewritten away** —
it read _reports the furthest day any security reaches_ — so a summary that
quietly goes back to the maximum fails the test that used to demand it.

### Item 2: the mark does not fire on a store re-read, in a browser

Two halves were already covered — a reconnect's snapshot fires no mark, and a
snapshot at universe scale is not an arrival. The half that was not is the
task's own sentence.

`security-price-motion.spec.ts` loads `/securities/NVDA` with **no feed
stubbed** — the deployed default and CI's, so every price is a stored close —
**reloads** it, and asserts `[data-arrival]` has count **0** across the whole
page both times. Across the whole page rather than the block, because since Task
3.6.1 the table's 518 rows carry the same handle.

### The design reading, and it is a rare positive

`VISUAL-LANGUAGE.md`'s provenance section specifies, for more than one source:
_each stretch on its own row, its bar count right-aligned in the data face, its
label beside it and its sentence after that_, and _the count is drawn only where
there is a split to measure_. Photographed from real stored rows in Tasks 3.8.3
and 3.8.4:

```text
SOURCES   5,505 bars  All US exchanges
             45 bars  IEX
                      Trades reported by the IEX exchange only — not the
                      full US consolidated tape.
```

**It matches clause for clause**, including the single-source case drawing no
count. An arrangement designed against no data, two epics before any existed,
held the first time it had some. Recorded because the deferred-design failure is
the commoner outcome and this one is worth a line.

A second card went to the Claude Design project — `preview/universe-store-claim.html`,
reusing `tokens.css` and `preview/_card.css` and the `Universe table` group the
previous task opened. Four sections: one frontier, a ragged frontier, nothing
stored, and the claim it replaced.

## For a stakeholder — a status report, 2026-09-23

### What this was

**We checked the two screens that were supposed to change meaning now that the
product remembers the trading day — and found the problem somewhere neither of
us was looking.**

### The screen we expected to have a problem was fine

The table of 518 securities shows each one's last closing price under a single
dated heading. The worry was that once we store today's prices as they happen,
some rows would be showing today and some yesterday, and a single date at the
top would stop being true.

It does not happen. That column reads **daily** closing prices, and the live
feed only ever writes **minute** prices. They never meet during a session. One
database query settled it, before we wrote any code.

That is the third task running where the written-down worry was not the real
one. We are recording that rather than glossing it, because the pattern is now
clear enough to be useful: **when a decision is written months ahead of the
work, the mechanism it assumes has usually moved by the time the work happens.**
Checking first is cheap. Building first is not.

### The problem was in a sentence nobody had flagged

Above the table is one line summarising what we hold: how many securities, how
many prices, and **how far forward that history reaches**.

That last figure took the _furthest_ date any security reached. Perfectly sound
while a nightly job filled every security over the same days — they all shared
one date, so furthest and guaranteed were the same number.

Storing the live session broke that, and broke it immediately. Our live feed is
a single exchange that carries roughly two thirds of a typical company's
trading minutes, so during a session some securities have today's data and some
do not. **From the very first minute of trading, one security receiving a price
made the page claim the whole store reached today — while 517 had nothing for
it.** We measured it on our own database: with 340 of 518 updated, the line
claimed a date **178 securities did not reach**.

The most satisfying part: **the code had already written down that this would
happen**, in a comment beside the figure — that if securities ever stopped
sharing a date, this becomes the optimistic number and the honest thing is to
say so rather than change it quietly. We did what it said.

### The decision

The line now shows **the date every security reaches**, and names the furthest
one second:

> 48.4M minute bars · through 2026-09-11, some to 2026-09-14

Reliability first, progress second. This line's job is to tell you what the
store can be **trusted** for; the other way round it is a promise 178 rows
cannot keep. We reused a rule this very table already applies elsewhere rather
than inventing one — a shared claim is made only when it is true of everything.

It also fixes something nobody had noticed: a security whose history stopped
years ago used to be **invisible** behind the furthest date. It is now the first
thing you see, which is the right way round for a line about trust.

We checked at four screen widths that the extra words cost no height, and
looked at the result rather than assuming.

### The other half: the animation that must not lie

When a new price arrives, a small mark appears beside it and fades — it means
_a price just arrived_. The question this task inherited was whether that mark
could fire when a page is simply **re-read from storage**, which is not an
arrival at all. A mark that flashed while someone scrolled through yesterday
would make the product's own visual vocabulary false.

It does not fire, and that is now proved in a real browser rather than reasoned
about: we load the page with no live feed connected — so every price on it comes
from storage — reload it, and check that no mark exists anywhere on the page,
including all 518 table rows.

### A rare piece of good news

Two epics ago we designed how a chart should say it was built from two
different data feeds — before any such data existed anywhere in the product. It
finally has some. We compared what is now drawn against what was specified back
then: **it matches exactly**, down to the rule that a single-source chart shows
no counts at all.

Designs made against imagined data usually need reworking when real data
arrives. This one did not, and that is worth recording.

### Where the product stands

Eight of ten tasks in this story are done. What remains is the overnight
reconciliation rehearsed end to end, and the story's close.

**What you can see**, if you are looking at the right line: the product is now
careful to tell you what it can be trusted for rather than the best it can
claim. That is a small sentence carrying the difference between a tool an
analyst trusts and one they check.

**What you still cannot see** is any of it against the real market during
trading hours.
