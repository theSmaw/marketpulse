# Task 4.2.6 — The honest states, and the rule the table does not have

**Status:** **Complete — 2026-09-26.** The stored state says **`closing prices`** and the absolute rule is keyed on ADR 0028's bell rather than on a duration. **The first version of the sentence was false for ~9.5 hours of every trading day** — `pre-market · last prices of the session` in one sentence — and is suppressed in extended hours. A guard written for an out-of-calendar instant was **inert in the one scenario that arrives**. And a `security-gap-fill` failure this task was blamed for turned out to be a **~12% pre-existing flake**, established by running the branch commit that contains no code.
**Story:** [4.2 The Aggregate Seam, & the Index Proxies That Move](STORY.md)
**Depends on:** 4.2.5

## Objective

**The states nobody will ever see in production are the ones this task is
about, and that is exactly why it is a task.** `SPY`, `QQQ`, `DIA` and `IWM` are
the four most heavily traded names in the universe; their IEX coverage is near
total. So a proxy with no observation will be exercised by CI, by
`pnpm store:bare`, and by the sixty seconds after a restart — and essentially
never by a real user. That is `docs/GAPS.md`'s trap in its most expensive form:
**a placeholder indistinguishable from a real answer, hiding whatever is built
on it until the day it stops being empty.**

**And one state is not rare at all — it is most of the week.** The universe
table's staleness rule is **relative**: `LastCell` renders an instant only when
a row is _behind the page's newest observation_. That is correct for 518 rows,
because it dates exactly the set whose number is not current. It **fails
closed** when the whole map is uniformly old, which is every Saturday, every
evening and every morning before the bell — `currentMarketState` is not cleared
on a session boundary, deliberately, so it still holds Friday's 15:59 bars,
nothing is "behind" anything, and **no date renders at all.** Four large figures
sit at the top of the landing page, spoken as `Live price`, under a region whose
whole subject is what is happening right now. The status bar does not rescue
it: a quiet socket at 02:00 is correctly `LIVE`, by decision.

**The owner chose an absolute rule, in this story.**

## What the user can see when this lands

**A strip that is honest for the ~80% of the week the market is shut** — four
figures with the session they belong to, stated once beneath them. And an
honest answer where a proxy has been quiet, where it has never been heard from,
and where the store holds nothing at all.

**What they still cannot do:** everything 4.3–4.6 owns.

## Work

- **The absolute rule.** Keyed on ADR 0028's existing instrument — _the last
  session whose bell has rung_ (`marketSessionStateAt`) — not on comparison with
  siblings. A figure belonging to a session that has closed is dated, whether or
  not its neighbours are equally old. This is a rule the universe table does not
  have and is not being given; the difference is the strip's prominence, and it
  should be recorded as the reason rather than left as an inconsistency.
- **Stated once for the strip, per proxy only on disagreement** — the
  shared-claim idiom, already shipped twice.
- **The per-proxy states, each with the product's existing words and no new
  synonym.** A proxy with a live figure the feed has moved past renders **an age
  and never a verdict** — no threshold, because §11.2 measured an ordinary
  maximum gap of **187 minutes** and a p50 of one minute, and a surface that
  reports silence as a fault will cry wolf on thin names all day. A proxy with
  no observation renders its last stored close **with the session it belongs
  to**. A proxy with neither renders the vacancy state.
- **The third state the story's own criterion 3 does not name.** It gives two —
  live observation, or last stored close. **On CI there is neither**, and that
  is permanent there: 518 securities, zero bars, no provider. Enumerate three,
  not two.
- **The percentage is omitted, never zero.** `changeFromClose` returns a null
  percent when there is no previous close, and the shipped behaviour is an
  absence. Four blanks in the most prominent position on the screen is the
  correct answer and must not be repaired into a `0.00%`.
- **Nothing jumps.** Five reservations, and the argument that this strip has no
  control to displace must be **rejected** on the recorded ground — nothing in
  this product may move while a number is being read. Reserve: the change slot
  (`No previous session` is a completely different width from `▲ +0.84%` —
  `.close`'s `8ch` is the idiom, and **the width is measured, not argued**); the
  figure's own width; the qualifier line; the mark's slot in every state, not
  just the one where it fires; and the strip's total height across R1→R2→the
  vacancy state, because `.regions` starts immediately after it in a flex column
  and **the first arrival of the day would otherwise move the entire
  seven-region grid down by one line**.
- **The reserved-room idiom is already shipped and should be copied rather than
  re-derived**: `sessionReserved` renders ` ` with `aria-hidden` so arriving
  costs no height, and `FiguresReservation` uses `visibility: hidden` plus
  `aria-hidden` rather than em-dashes — because a fully-formed record about
  nothing is a false impression (ADR 0029), and because a hidden `dt` reading
  `SPY` is still matched by `getByText` and wedges a locator.

## Done when

1. On a store whose newest bars are from a closed session, every figure carries
   the session it belongs to — asserted, and reachable without waiting for a
   weekend
2. Three per-proxy absence states are enumerated, each **produced** rather than
   imagined, and each rendered in words that already exist in the product
3. No state renders an empty cell, and no state renders a percentage of zero
   where the truth is "no basis"
4. The strip's height is identical across every state at each of the four
   widths, measured with `pnpm probe` and the figures recorded
5. A second definition of any of the words used here fails `pnpm invariants`

## Amended by Task 4.2.5 — 2026-09-26: the gap is a missing NOUN, not a repeated date

**Four copies of `2026-09-11` on a developer's machine is honest but
repetitive, and consolidating it will not fix the real defect.**

**Row 3 carries two grammars and only one of them is labelled.** The exception
reads `from 12:07` — a preposition, so a reader knows it is an observation
time. The stored state reads a bare `2026-09-11`: no preposition, no noun.
And **nothing in the entire strip, in that state, contains the word _close_ or
_closing_** — `qualifierOf` returns `undefined` when nothing is observed, so
the one sentence that would supply the noun is suppressed.

So a reader meets `764.29` under a heading saying `Market proxies`, with a
date beneath it, and is left to infer that the figure is a **session close**
rather than a price observed at some point that day. A listener gets
`SPY. 764.29. 2026-09-11.` — a symbol, an unlabelled number and an unlabelled
date.

**The requirement is therefore _supply the missing noun_, not _deduplicate the
date_.** This task's drawn sentence already does it (`… 16:00 EDT · closing
prices · …`); what must not happen is a consolidation that removes three dates
and leaves the fourth still unlabelled.

**And confirm the two-line qualifier reserve at 390 is still right.** Task
4.2.5 kept it per the canvas, and noted that today's longest produced sentence
fits one line — the extended-hours and absolute-rule sentences are the ones
that need the second. This task writes the longest of them, so this task is
where the reserve is either justified or reclaimed.

---

## What was done — 2026-09-26

### The missing noun, supplied

| state                                | shared line                                           | the cells                              |
| ------------------------------------ | ----------------------------------------------------- | -------------------------------------- |
| nothing observed, one stored session | `2026-09-11 · closing prices`                         | covered, nothing                       |
| nothing observed, sessions disagree  | _(nothing shared)_                                    | `2026-09-11 close` each                |
| observed, session running            | `Sep 25 · 14:01 EDT · change from 2026-09-24's close` | —                                      |
| observed, bell has rung              | `… · last prices of the session · …`                  | —                                      |
| observed in extended hours           | `Sep 28 · 07:42 EDT · pre-market · change from …`     | —                                      |
| mixed observed and stored            | the observation's                                     | the stored ones say `2026-09-11 close` |
| all unknown                          | `No prices stored for these four yet.`                | `None stored`                          |

**`closing prices` and `close` are the product's existing nouns**, not new
synonyms — already shipped in `chart-alternative.ts` and `UniverseTable.tsx`.
Only `last prices of the session` is new, and it has one home and a guard.

**The consolidation is structurally unable to produce the failure the amendment
warned about**: the cells a shared claim does **not** cover carry the noun
themselves, so "remove three dates and leave the fourth unlabelled" cannot
happen.

### The rule, and the clock it had to borrow

Keyed on `marketSessionStateAt` and **never on a duration**. The clock is
`computedAt` — the gateway's stamp — because `useMarketClock` is refused on
this route by `a-second-clock-on-the-landing-page`, and `computedAt`'s docblock
was written for exactly this reader. **No browser clock is read**, so ADR 0033's
skew has no purchase: both operands are server-origin. The rule **cannot flap**
— `computedAt` moves only forward and the predicate is monotone within a day.
Its limit is recorded: a tab held across the bell keeps the last frame's stamp
until the next frame arrives.

The rule also reached a cell: a proxy both behind and from an earlier session
now reads `from Sep 24 · 12:07 EDT` rather than `from 12:07`, which said _two
hours behind_ where the truth was _a day and two hours_.

### The sentence was false for nine and a half hours of every trading day

`marketSessionStateAt` returns `before_open` / `after_close` for extended hours,
so `running` was false and the closed-session clause fired — producing, three
clauses apart in one sentence:

```text
Sep 28 · 07:42 EDT · pre-market · last prices of the session · change from 2026-09-24's close
```

`pre-market` says the session has not started; `last prices of the session`
says it has ended. **And in pre-market the claim is simply wrong** — the figure
is _today's_ pre-market print, and the sentence invites a reader to take it for
the previous close. The backend stores and streams extended-hours bars, so this
was the deployed landing page 04:00–09:30 and 16:00–20:00 ET **every weekday**
— far commoner than the weekend state the task was written against.

The clause is now suppressed when `extendedHoursAt(at)` is defined: the
extended-hours word already says when the price is from, as a fact about the
figure rather than a claim that a session ended. **A sentence that is silent
beats one that is false**, and the residue is recorded rather than hidden — a
Friday after-hours print read on the Saturday is dated, correct, and one clause
shorter than it could be.

### A guard that was inert in the one scenario that arrives

`closedSessionClause` caught `MarketCalendarRangeError`, and its docblock said
the alternative was a blank page. But `qualifierOf` called `extendedHoursAt(at)`
**unguarded, fifteen lines earlier** — so on 2029-01-01 both inputs are out of
range, `at` is reached first, and the `catch` never runs. The new test varied
only `computedAt`, so it passed while asserting a hazard was handled.

**Writing the corrected test found a second half neither the review nor the
orchestrator had named**: `marketDateAt` is a timezone conversion and answers
happily for 2030, so guarding `extendedHoursAt` alone would still reach the
session comparison and assert `last prices of the session` about an instant the
calendar cannot classify. Both reads are now inside one guard, because **a
refusal has to be a property of the instant as a whole rather than of one
call.**

### A tripwire deleted rather than patched

`the-proxy-strip-dates-a-figure-from-a-calendar`'s second clause forbade numeric
literals. It missed what it was for — `3e5` and `0x493e0` both satisfy it — and
would have gone red for nothing on a trailing comment, a `slice(0, 10)` or a
year in a string; its own first version had already gone red on
`figures.length > 0`. **Deleted, and the surviving clause asserts the file
CALLS `marketSessionStateAt`** — the call rather than the name, so an import
left behind by a substitution does not satisfy it. The break is repointed to
perform the real regression: the calendar read replaced by a duration
comparison.

### The regression that was not one

`security-gap-fill.spec.ts:165` failed 3 of 12 on this branch while `main`
passed 12 of 12 — same command, same settled machine, back to back. **That was
called decisive and it was underpowered.** The branch's first commit differs
from `main` by **one line of Markdown**, with byte-identical runtime trees, and
it **failed 2 of 12**. The spec fails on `main` at **14 / 120 ≈ 12%**, and three
consecutive runs on one checkout gave `48 passed`, then 5, 5 and 3 failures.

At 12% per execution, `P(0 failures in 6) ≈ 0.46`. **n=6 cannot separate a 12%
flake from a regression.** The lesson is in `CLAUDE.md`: _before attributing a
flake to a branch, run the branch commit that contains no code._ The flake
itself is `docs/GAPS.md`'s, owed by Task 4.2.8, with an owner as a condition and
a re-measure that counts failures per **execution** rather than per run.

### Gates

`pnpm verify` exit 0 — **34 invariants hold**, 36/36 stories, 470 documents and
0 broken links, frontend 1,198 / backend 973 / shared 345 / process 41, no
`Unhandled Errors`. Five breaks red and restored byte-identical. Reserved room
**delta 0** at every width across ten states; the 390 two-line reserve
re-justified after the fix **removed the longest sentence that existed** —
after-hours plus closed-session is now unreachable, so the maximum had to be
re-measured rather than inherited.

## For a stakeholder — a status report, 2026-09-26

### What this was

**Making the four headline figures say what they are.** A price with a date
under it is not self-explanatory: the reader has to be told whether it is a
live price or the previous session's close, and until this task the screen never
used the word _close_ in the state where every figure was one.

### What we found

**Our first attempt at the sentence was wrong for about nine and a half hours of
every trading day.** Before the market opens and after it shuts, trading still
happens in what the industry calls extended hours, and we stream those prices.
The sentence we wrote said _last prices of the session_ — and sat three words
away from our own label saying _pre-market_, which means the session has not
started yet. One sentence, two contradictory claims. Worse, before the opening
bell the figure is **today's** early price, and our sentence invited the reader
to read it as **yesterday's** close.

It now says nothing in that state, because the label beside it already says
what the price is. A sentence that is silent beats one that is false.

### The part worth telling

**We accused ourselves of breaking something and we had not.** One of our
browser tests failed on this work and passed on the main line — three failures
against twelve clean runs, same machine, one after the other. That looks
conclusive. It was not: the test fails on the main line too, about one time in
eight, and at that rate a clean run of twelve happens about half the time by
chance.

What settled it was running **the one commit in this work that contains no code
at all** — a single line changed in a planning document. It failed too. A
change that cannot break anything broke it, which is proof the fault was never
ours.

That test is now recorded as a known weakness with an owner, rather than being
quietly made less strict — the thing it checks is a real promise about the
product, and loosening it to get a green tick would have traded a true statement
for a comfortable one.

### Where this leaves the work

**The figures on the landing page now say what they are, in every state.** Three
tasks left: where the numbers came from, the browser tests, and the close.
