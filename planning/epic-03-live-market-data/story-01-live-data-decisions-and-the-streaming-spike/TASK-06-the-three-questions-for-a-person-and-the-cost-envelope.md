# Task 3.1.6 — The three questions that need a person, asked together with the measurements in hand

**Status:** Not started
**Story:** [3.1 Live-Data Decisions & the Streaming Spike](STORY.md)
**Depends on:** 3.1.5. **Carried five questions briefly; back to three.** Task 3.1.4 added two on 2026-09-16 (`LIVE-DATA.md` §7.11) and both were answered on 2026-09-17, ahead of this task, because neither depended on the cost envelope. **Do not re-ask questions 4 and 5.**

## Objective

Put this story's genuinely-human decisions to a person **once, together, with
the numbers on the table** — **five of them since 2026-09-16**, where the title
says three — and record their answers **with the reasoning
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

**Added 2026-09-16 by [ADR 0030](../../../docs/adr/0030-replaying-our-own-bars-and-the-mechanisms-that-stop-the-live-feed-rotting.md)
— question 1 has moved again, and in the useful direction.** A replay of our own
stored bars now runs whenever the market is shut, so the socket is no longer the
only thing that can be up at 03:00. Two things for the person:

- **Question 1 is now genuinely about meaning alone.** The cost objection is
  measured away (§6.4) and the word is settled for the replay cell — it reads
  `REPLAYING`, not `LIVE`. What is left to ask is what `LIVE` claims in the
  `iex` cells: the socket being up, or data arriving.
- **One question was put to the person and is already answered — do not re-ask
  it.** Should the **deployed** site replay when the market is shut, so a
  Saturday visitor sees a living product? **No, without qualification:
  production has real users and must only ever tell the absolute truth about the
  real market.** ADR 0030 decision 7a, taken 2026-09-16. The consequence is
  accepted rather than mitigated: out of hours the deployed site is an honest
  historical explorer, `PRODUCT_SPEC.md` §38 and §40 are not satisfied at those
  hours, and the answer to a demonstration is to give it during a session. **A
  question already answered and asked again is how a decision gets reversed by
  accident**, which is this whole story's premise applied to a person.

**Added 2026-09-15 by Task 3.1.3** — [`LIVE-DATA.md`](LIVE-DATA.md) §6.4. This
corrects where the envelope's two halves come from, and it matters because as
written this task would have gone to Task 3.1.4 for a number 3.1.4 cannot
produce:

- **The overnight half of the cost question is measured and it is zero.** An
  open, authenticated, out-of-hours socket received **0 payload bytes in 721
  seconds** — about **0.15 B/s** once the empty heartbeat frames' headers are
  counted — against the **1,000 B/s** the Consumption plan's idle vCPU rate
  requires. That is three to four orders of magnitude of headroom.
- **So question 1's cost objection is gone, and the question is now about
  meaning rather than money.** §2.8's alternative 1 — hold the socket open
  always — no longer costs anything overnight, which leaves the real content of
  question 1 as the one riding with it: **does `LIVE` in the chrome mean _the
  socket is up_ or _data is arriving_?** Put that as the substance, not as the
  rider, and do not spend the person's attention on an overnight bill that has
  been measured away.
- **The envelope's remaining unknown is entirely in-session**, which is figure 9
  and Task 3.1.4's. The factor by which 1,000 B/s is broken, and for how many
  hours a day, is one rate and one session length — nothing about the night.

## Work

**First, produce the envelope**, so the conversation has a number in it. **It
takes two rates from two tasks and one of them is already settled**, per the
amendment above: Task 3.1.4's in-session bytes per second, and Task 3.1.3's
out-of-hours figure, which is zero. Across a session and across a month:
what the replica's vCPU actually costs at the active rate; by what factor the
1,000 B/s condition is broken and for how many hours a day; and what the answer
would be under each of the two candidate answers to question 1. State the
arithmetic, state that it is an estimate over a rate card, and name Story 3.11
as the thing that reads the bill.

**Then put the questions, together and in this shape.**

> **There are FIVE since 2026-09-16, not three.** The title and the filename
> still say three and are deliberately not renamed — a filename is referenced
> from five places and renaming it to fix a count is how a reference rots. Task
> 3.1.4's capture forced two more (`LIVE-DATA.md` §7.11), and they are questions
> 4 and 5 below. They are **not** blocked on the cost envelope the way 1 and 2
> are; if a window opens to ask them earlier, ask them earlier and record the
> answer here.

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

> **Questions 4 and 5 were ANSWERED on 2026-09-17 and must NOT be re-asked.**
> They were added on 2026-09-16 and put to the owner the next day, ahead of the
> cost envelope, because neither depended on it. The answers, the reasoning and
> a reversal trigger for each are in [`LIVE-DATA.md`](LIVE-DATA.md) §7.11:
> **extended-hours bars are rendered and marked**, and **the product subscribes
> `updatedBars`**. They are left below with their options intact because this
> task's own rule is that an outcome without the alternatives is a decision that
> gets re-litigated — read them as the record of what was weighed. **This task
> now carries three questions again.**

4. **Do the charts show extended-hours bars?** **ANSWERED — rendered and
   marked.** Added 2026-09-16 from
   `LIVE-DATA.md` §7.7 and §7.11. Pre-market and after-hours bars arrive on `b`
   and **nothing on the frame distinguishes them from a regular-session bar** —
   one field set across all 129,481 frames in the capture. 37 pre-market bar
   minutes were observed in a window that was itself 1h43m short, so the real
   number is higher. Left alone, every chart in Stories 3.6, 3.7 and 3.9
   silently grows a thin, sparse tail before 09:30 and after 16:00; it is also
   what inflates `QQQ` to 105.6% coverage in §7.6, which is the tail showing up
   as arithmetic. **Epic 2's charts never met this** because stored bars were
   fetched per session. Three candidates, and say what each costs:
   - **Render them.** Honest, and the tail is thin and jagged against a
     session-ordinal axis that has no vocabulary for a gap in the middle of it.
   - **Filter them at the data layer by market time.** Clean charts, and the
     filter is a claim about the session that the feed itself does not make.
   - **Render them marked.** Most honest and most work — it needs a visual
     vocabulary Story 3.4 has not built, so choosing this one puts a dependency
     on 3.4 that does not currently exist.

5. **Does the product subscribe `updatedBars`?** **ANSWERED — yes.** Added 2026-09-16 from
   `LIVE-DATA.md` §7.8, and it was on nobody's register — it was found by
   reading frames. A bar is **restated about 30 seconds after it is delivered**:
   14 restatements in the capture, **all 14 changed the bar**, three of them
   changed the **close price** (SPY 758.85→758.81, META 676.96→677.20,
   TSLA 358.07→358.13). That is 0.36% of the narrow set's bars, and the channel
   costs 1,742 bytes across a whole session for ten symbols. The trade is
   genuinely two-sided and neither side is free:
   - **Subscribe.** A number can change under a reader's eye half a minute after
     it appeared, which collides with §2.1's definition of a live observation and
     with the motion vocabulary Story 3.4 has not designed.
   - **Do not subscribe.** The product is quietly wrong on roughly one bar in
     three hundred, for ever, with no way to know which — in a tool whose whole
     purpose is helping somebody trust what they are looking at.
   - **Note it interacts with Story 3.10's gap-filling**, which treats a missing
     bar as a gap: a _revised_ bar is not a gap and none of that machinery would
     catch it. Measure at 518 symbols before deciding the rate holds — this was
     ten liquid names.

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

Ask all three at once. They interact: the payload a browser gets and the budget
threshold are a function of each other, and of question 1's answer. **One
interaction this note used to claim is now measured away** — it read "holding
the socket open overnight is cheap if nothing is subscribed and expensive if the
whole universe is", and Task 3.1.3 measured **0 payload bytes per second with
all 518 subscribed, out of hours** (§6.4). Overnight is cheap either way; the
expense is the session. **One qualification, added the same day**: that zero is
a bar subscription. `dailyBars` re-sends an unchanged daily aggregate every
minute after the close — 21.6 B/s for ten symbols, which extrapolates past the
1,000 B/s idle condition at universe scale (§6.7) — so the envelope must state
**which channels** it is costing, and the cheap answer depends on Decision 1
not taking that channel. Asked one at a time, each answer is
taken without the constraint the next one supplies — which is the same failure
mode this entire story exists to prevent, applied to a person instead of to a
task.

---
