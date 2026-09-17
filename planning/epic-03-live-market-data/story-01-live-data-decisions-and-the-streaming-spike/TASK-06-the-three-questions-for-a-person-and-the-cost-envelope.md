# Task 3.1.6 — The three questions that need a person, asked together with the measurements in hand

**Status:** **Complete — 2026-09-17.** The envelope is in [`LIVE-DATA.md`](LIVE-DATA.md) §9.1–§9.2 and **falsifies ADR 0011's premise**: this epic costs **$9.26/month**, not $19.04. All four questions were put to the owner together and answered, with reasoning and a condition-shaped reversal trigger each (§9.3–§9.6). ADR 0011 carries a dated amendment.
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
- ~~**Epic 1's recorded cost figure is an idle figure and this epic breaks the
  condition it rests on.**~~ **Falsified by this task's own envelope, 2026-09-17
  — `LIVE-DATA.md` §9.1.** This epic does **not** break that condition: a
  bars-only feed averages 550.6 B/s against the 1,000 B/s threshold and crosses
  it for 6.6 minutes a day, so the total is **$9.26** rather than $19.04. The
  bullet is struck rather than deleted because it is what the envelope was
  written to check, and the checking is the task. ADR 0011 carries a dated
  amendment. The original:
- **Epic 1's recorded cost figure is an idle figure and this epic breaks the
  condition it rests on.** The Consumption plan's idle vCPU rate requires the
  replica to receive **less than 1,000 bytes per second**. A replica holding a
  live feed exceeds that through every session, so the estimate moves from
  **$4.21** to **$14.04** for the replica — **$9.21 to $19.04** a month with ACR
  Basic. Memory bills the same either way; the discount is on vCPU alone.
- ~~**The `$20` budget with its 50/80/100% alerts sits just _above_ the
  active-rate total**, so the single change most likely to move this bill is the
  one the thresholds cannot see. That is the defect, not the price.~~
  **The defect does not arise — 2026-09-17, §9.6.** At a measured $9.26 the 50%
  alert at $10 sits eight percent above the total, so the budget that looked
  blind is already primed. Left unchanged, deliberately.
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

> **Amended 2026-09-16 by Task 3.1.5 — question 1's rider is no longer a
> choice, and the person must be told that rather than offered it.**
> [`LIVE-DATA.md`](LIVE-DATA.md) §8.4: **all four authentication failures leave
> the socket OPEN, for ever.** So _the socket is up_ is not the weaker of two
> honest readings of `LIVE` — it is a claim that is **demonstrably compatible
> with a connection that was rejected at the door and will never carry a bar**.
> Putting it to a person as one of two options would be offering a choice that
> only has one defensible side. Ask what `LIVE` should mean, and say that the
> socket-up reading has been measured into the ground.

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

## What the envelope found and what the person answered — 2026-09-17

### The envelope overturned the premise it was written to confirm

ADR 0011 recorded that a replica holding a live feed bills at the **active**
vCPU rate through every session — **$19.04/month**. Measured against Task
3.1.4's 7.77-hour capture, a **bars-only** subscription to all 518 symbols
averages **550.6 B/s** against the 1,000 B/s condition and crosses it for
**397 seconds a day**. The total is **$9.26** — five cents above a replica doing
nothing at all.

**The error was a premise rather than a calculation**, which is why ADR 0011's
tables are untouched and carry a dated amendment instead: _bills at the active
rate through every session_ assumes the rate is **continuous**, and minute bars
arrive as a **burst once a minute** (243 ms of traffic, 59 seconds of silence).
**A once-a-minute burst cannot hold a per-second threshold.** The model in §9.2
reproduces ADR 0011's own $4.21 and $14.04 to the cent before varying one input,
so this is the same arithmetic with a corrected assumption rather than a rival
calculation.

**Also worth noticing: the blended capture figure is 2.9× the bars-only one**,
and almost all of the difference is ten symbols' trades (18.9 MB against `b`'s
15.4 MB for 518 names). A cost taken from the capture total would have costed a
subscription this product is not going to have.

### The four answers

| #   | Question                     | Answer                                      | Trigger                                                                           |
| --- | ---------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------- |
| 1   | Socket outside market hours  | **Hold it always**                          | A month of billing above the measured 6.6 min/day                                 |
| 2   | What `LIVE` means            | **The feed is healthy — heartbeat current** | The first surface asked _is this number current_ with no staleness mark beside it |
| 3   | What a browser subscribes to | **The whole universe**                      | A tab unable to hold 60 FPS applying one minute's burst                           |
| 4   | The budget                   | **Unchanged**                               | The first month whose actual bill exceeds $12                                     |

**Each is recorded in §9.3–§9.6 with what was weighed**, because an outcome
without its alternatives is a decision that gets re-litigated by a reader who
cannot tell whether the other option was considered.

### Three things the answers change downstream

- **Staleness is no longer optional.** `LIVE` means _the feed is healthy_, so it
  says nothing about how old the number under it is. A per-security staleness
  mark is **Task 3.1.8's decision 5** and is now load-bearing: without it, `LIVE`
  over a four-minute-old price is true and misleading at once.
- **At 03:00 the chrome reads `LIVE` and `CLOSED` together, and that is
  correct.** The feed's health and the market's state are different facts with
  different cells. Recorded explicitly because it looks like a contradiction and
  is not.
- **The browser payload objection does not survive measurement.** 38 kB/min
  mean, 53 at the close — under 1 kB/s. The constraint moved from bandwidth to
  **render cost**: 332 bars inside a 243 ms burst, once a minute. That is Story
  3.6's problem, and it is the real argument for server-side coalescing in Task
  3.1.8's decision 2.

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

## What this task did, for somebody who does not read code

**Short version: we worked out what running the live version of MarketPulse will
actually cost, and found we had been over-estimating it by about double. Then we
asked the owner four questions that only a person can answer, put the real
numbers in front of them, and wrote down both the answers and the reasoning.**

### The bill we were bracing for is not the bill we are going to get

Our hosting has two prices. A server sitting quietly gets a **discounted** rate;
a server that is busy pays about **eight times more** for its processor time. The
line between the two is drawn at a thousand bytes a second of incoming traffic.

When we planned this, we assumed that holding a live connection to the stock
market would obviously push us onto the expensive side — all day, every trading
day. On that basis we budgeted around **$19 a month**.

We measured it instead of assuming it, and it is **$9.26**. That is five cents a
month more than a server doing absolutely nothing.

**The reason is a nice one.** Prices do not trickle in continuously — they arrive
in a **burst once a minute**. Roughly a quarter of a second of activity, then
fifty-nine seconds of silence. A limit measured _per second_ barely notices
that: across a whole trading day we are over the line for about **six and a half
minutes**. And the market itself is only open for 19% of the hours in a month.

We also caught a trap in our own measurement. The recording we took last night
included _trade-by-trade_ data for ten big companies, which is enormously
chattier than the minute-by-minute prices we actually plan to use — it alone was
larger than all 518 companies' prices put together. Costing from the raw total
would have been costing a product we are not building.

We were careful not to overclaim: this is still **arithmetic over a price list**,
not a real invoice. Nobody has ever successfully read an actual bill for this
project — the billing system refused us when we tried. A later piece of work owns
reading it for real.

### The four questions, and why they needed a person

**1. Should we keep the connection to the market open overnight?**
**Answer: yes, always.** Since it costs nothing, this became a question about
complexity rather than money — and the alternatives both require the software to
know the trading calendar and disconnect and reconnect on schedule. That is
exactly the kind of logic that works all year and then breaks on a half-day
before Thanksgiving. One connection that is simply always there has no such day.

**2. What should the word "LIVE" on screen actually mean?**
**Answer: the feed is healthy.** The tempting answer is "prices are arriving" —
but our data source only covers one exchange, and for a quietly-traded company
prices genuinely do not arrive most minutes. One company in our list produced a
price in only **2% of the minutes** of a full trading day, entirely normally. A
"LIVE" light wired to arriving data would sit dark for a third of the market at
any moment and would be wrong to do so.

So "LIVE" means _our connection to the market is working_. **That creates an
obligation we have written down rather than left implied**: it says nothing about
how old any particular price is, so each price now needs its own small "this is
from four minutes ago" mark. That is the next piece of work along.

One consequence that looks odd and is correct: at three in the morning the screen
will say **LIVE** next to a market clock saying **CLOSED**. Those are two
different facts — our connection is healthy, the market is shut — and the screen
already has room for both.

**3. What should a browser receive — everything, or just what is on screen?**
**Answer: everything, all 518 companies.** This one was decided by a
measurement that surprised us. We assumed sending the whole market to every
browser would be extravagant. It is **38 kilobytes a minute** — less than a
single small photograph, per minute. Restricting it would have been optimising
something that was never expensive, and the product's main screen is supposed to
show the whole market moving at once anyway.

**What the measurement did do is move the difficulty somewhere else.** The
problem is not the amount of data, it is that **330 price updates land in a
quarter of a second, once a minute**, and the screen has to absorb that without
stuttering. That is a genuine engineering problem and it is now a known one
rather than a surprise.

**4. Should we change the spending alert?**
**Answer: leave it exactly as it is.** The alert was set at $20 with a warning at
half that. We had flagged this as a flaw, because the *feared* cost of $19 would
have slipped in just under the ceiling without ever triggering anything. But the
real cost is $9.26 — so the existing warning at $10 sits just above where we
actually are, and would fire immediately if anything pushed the cost up. The
alarm we thought was badly placed turns out to be well placed; it was the cost
estimate that was wrong.

### Why we asked all four at once

Because they interact. What a browser receives, what the connection costs, and
what the spending alert should be are all functions of each other. Asked one at a
time, each answer gets taken without the constraint the next one would have
supplied — which is the same failure this whole piece of work exists to prevent,
applied to a person instead of to a plan.

### What this unlocks

Three of the four answers feed directly into work that was waiting on them: the
screen can now be told what "LIVE" means, the browser connection can be designed
knowing it carries the whole market, and the server's relationship to its own
connection is settled. None of them could have been taken sensibly before last
night's recording existed.

**The product remains, today, a historical explorer.** Nothing on screen has
changed. But the remaining planning work in this phase is now down to executing
answers rather than arguing about them — and we are budgeting against a measured
number rather than a pessimistic guess.
