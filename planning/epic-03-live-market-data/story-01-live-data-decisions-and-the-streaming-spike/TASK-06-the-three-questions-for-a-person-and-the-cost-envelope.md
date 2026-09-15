# Task 3.1.6 — The three questions that need a person, asked together with the measurements in hand

**Status:** Not started
**Story:** [3.1 Live-Data Decisions & the Streaming Spike](STORY.md)
**Depends on:** 3.1.5

## Objective

Put this story's three genuinely-human decisions to a person **once, together,
with the numbers on the table** — and record their answers **with the reasoning
rather than just the outcome**, which is acceptance criterion 5 and the half
that is usually dropped.

They are asked here rather than at the start because two of the three are
unanswerable without Task 3.1.4's rate: a budget is a number about a bill, and a
bill is a number about bytes per second.

## What the user can see when this lands

**Nothing.** The payoff is Story 3.3 and, for the budget question, Story 3.11 —
which is the only story that can read a month of billing and confirm or refute
whatever is decided here.

## What is already decided and must not be re-taken

- **`minReplicas: 1` is required** (ADR 0011). The question below is not whether
  the replica exists overnight — it does, and must — but whether it **holds a
  socket open** while it is there.
- **Epic 1's recorded cost figure is an idle figure and this epic breaks the
  condition it rests on.** The Consumption plan's idle vCPU rate requires the
  replica to receive **less than 1,000 bytes per second**. A replica holding a
  live feed exceeds that through every session, so the estimate moves from
  **$4.21** to **$14.04** for the replica — **$9.21 to $19.04** a month with ACR
  Basic. Memory bills the same either way; the discount is on vCPU alone.
- **The `$20` budget with its 50/80/100% alerts sits just _above_ the
  active-rate total**, so the single change most likely to move this bill is the
  one the thresholds cannot see. That is the defect, not the price.
- **Epic 1 could not take a real reading at all** — both billing APIs refused,
  then answered `[]` and `429`. So every figure here is arithmetic over a rate
  card, and it is an **estimate this story owes** and a **measurement Story 3.11
  owns**. Do not let the two be confused in the document.
- **`PRODUCT_SPEC.md` §9's landing page shows the whole market moving at once**
  and Epic 4 builds it. An answer to question 2 that only works for one security
  is an answer Epic 4 has to re-take.

## Work

**First, produce the envelope**, so the conversation has a number in it. From
Task 3.1.4's measured bytes per second, across a session and across a month:
what the replica's vCPU actually costs at the active rate; by what factor the
1,000 B/s condition is broken and for how many hours a day; and what the answer
would be under each of the two candidate answers to question 1. State the
arithmetic, state that it is an estimate over a rate card, and name Story 3.11
as the thing that reads the bill.

**Then put the three questions, together and in this shape.**

1. **Is the socket held open outside market hours?** The honest default is
   **yes** — a feed that is up is a feed that can say so — and it is the one
   that costs money for nothing overnight. The related question rides with it
   and must be answered in the same breath, because they are the same decision
   wearing two hats: **does `LIVE` in the chrome mean _the socket is up_ or
   _data is arriving_?** Those are different claims at 3am and identical at
   10:42, and Story 3.3 puts whichever one is chosen on every route in the
   product. Offer the alternatives honestly: hold it always; hold it through
   extended hours and drop it overnight; connect on the session boundary. Say
   what each costs, using the envelope, and what each does to the chrome's
   sentence at 3am.
2. **What does a browser subscribe to?** The whole universe, the visible rows,
   or one security. This trades payload against the product's own promise, and
   the constraint is §9: the landing page shows the whole market moving. Put the
   payload arithmetic beside it from Task 3.1.4's rate — 518 symbols a minute is
   a specific number of bytes and it should be on the table, not described.
   Note that this answer decides whether Story 3.6 is affordable at all.
3. **The budget.** What the threshold should be, given that the current one
   cannot see the change that matters. Offer the two moves separately, because
   they are separable: raise the budget to sit above the real active-rate total,
   and/or add a threshold **below** it so the transition from idle to active is
   visible at all.

**Record the answers with the reasoning.** A decision recorded as an outcome is
a decision that gets re-litigated in six weeks by a reader who cannot tell
whether the alternative was considered. Each answer lands in `LIVE-DATA.md` with
what was weighed, what was chosen, and a **reversal trigger written as a
condition** — not a story number.

## Done when

- The cost envelope is in `LIVE-DATA.md`, with its arithmetic, labelled an
  estimate, naming Story 3.11 as the measurement.
- All three questions were put to a person **together**, and all three answers
  are recorded with reasoning and a condition-shaped reversal trigger.
- The `LIVE` semantics question is answered explicitly, in words Story 3.3 can
  put on screen.
- If the budget answer is a change to a threshold, the change is either made or
  handed to a named owner — not left as an observation.
- `pnpm verify` passes.

## Notes

Ask all three at once. They interact: holding the socket open overnight is
cheap if nothing is subscribed and expensive if the whole universe is, and the
budget threshold is a function of both. Asked one at a time, each answer is
taken without the constraint the next one supplies — which is the same failure
mode this entire story exists to prevent, applied to a person instead of to a
task.

---
