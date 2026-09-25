# Task 3.11.1 — What this epic already measured, and the four decisions this close cannot start without

**Status:** **Complete — 2026-09-25.** Thirteen hand-off sections marked; **five are already answered and one is answered by a file nobody had opened.** `weekend-watch.mjs`'s run has been sitting in `.capture/` since 2026-09-21 with **1,065 samples over 55 hours**, and it answers the question its own section ends on — _Monday's open is still at risk_ — with **no**: the feed recovered on the Sunday at 01:45 ET and Monday opened working. All four decisions answered by the owner.
**Story:** [3.11 Cost, Performance, the Sweep & the Epic Close](STORY.md)
**Depends on:** nothing

## Objective

**Build nothing.** Read the eleven hand-off sections this story has accumulated,
mark each as _already answered_, _still owed_ or _no longer true_, and put the
four decisions to the owner.

## What the user can see when this lands

**Nothing.** This is the task that stops the other nine doing work that has
already been done — which in Story 3.10 removed most of two tasks and corrected
a premise three others were built on.

## Why this comes first, with the evidence

Story 3.10's equivalent task found that **§36's sentence already shipped**, that
**two of its eight criteria were already met**, and that the stopped chart edge
it was written to add **had been drawn since Story 2.12**. The pattern held
six times across that story: _looking first removed work._

This story is the most exposed to it, because it has been collecting hand-offs
from **eleven** sources over ten days and several of them have been superseded
by the story that wrote them.

## The eleven sections, each to be marked rather than re-read later

`STORY.md` carries hand-offs from Story 3.3's close, Task 3.1.6, Task 3.1.9's
weekend hold, Task 3.2.5, the slot question, Task 3.4.8, Story 3.5's close,
Task 3.6.4, Task 3.6.5, Story 3.7's close, Story 3.8's close, Story 3.9's close
and Story 3.10's close.

**At least three are known to have moved already**, which is the argument for
this task rather than a hypothesis:

- **Story 3.5's hand-off says §28's p95 is unmeasurable.** It is not, since
  2026-09-22: `sentAt` ships on every frame and Task 3.6.4 took the figure. The
  section says so itself, in an amendment. What survives is the **re-take**.
- **Task 3.1.6's cost premise halved** on 2026-09-17, from **$19.04** to
  **$9.26**, because minute bars arrive as a burst once a minute and a
  per-second threshold barely notices. The estimate this story measures against
  is the second number.
- **Task 3.4.8's §28 figure** was taken from Asia/Singapore over a 271–311 ms
  round trip production does not have.

## The four decisions, each with what constrains it

### 1. The budget, re-decided against a real reading

`marketpulse-monthly` is **$20** with alerts at 50/80/100%. The measured
estimate is **$9.26/month**, so the 50% alert at $10 sits **eight percent above
the total** and is already primed. §9.6's reversal trigger is **the first month
whose actual bill exceeds $12**.

**Epic 1 could read no bill at all** — both billing APIs refused, then answered
`[]` and `429`. This story is the first that can try.

### 2. Whether the deployed check asserts liveness

`check-deployed.mjs` runs after every merge, **at any hour**. It cannot assert a
live feed on a Sunday. The honest options: a criterion that asserts out of hours
only what is assertable out of hours, or **a scheduled check inside a session**,
which is a new mechanism rather than an assertion.

### 3. Whether CI holds a credential

Handed here by Story 3.3's close with two measured consequences: a spec
asserting an **absence** passed for four days after the words it forbade became
real, because they do not appear on an unconfigured deployment; and **no browser
test in this epic has ever watched a real vendor frame reach a screen.**

**It is a cost decision as much as a testing one** — a credential in CI is quota
on every push, against a free plan whose **single connection is already
contended** between the deployment and any developer.

### 4. What _watched_ means in the exit criterion

`LIVE-REHEARSAL.md` has dated rows for six of eleven stories and **not one was
watched by a person** — every row was a headless browser or a Node client, which
each row states on its face. The epic's exit criterion says _watched_. Decide
whether that is met, and if not, what Task 3.11.8's sitting has to do.

## Work

- Every hand-off section marked, in the file, with a date
- The four decisions put to the owner and written down with their rejected
  alternatives
- A correction to `STORY.md` for anything it asserts that is no longer true
- The list of figures criterion 1 has to re-take, extracted into one table
  rather than left across eleven sections

## Done when

1. Every hand-off section carries a verdict
2. The four decisions are answered and recorded
3. Criterion 1's re-take list exists as a table, with the instrument named for
   each figure

---

## What was done — 2026-09-25

### The thirteen sections, each marked

| Hand-off                                                         | Verdict                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Story 3.3's close** — should CI hold a credential?             | **STILL OWED, and now decided** — see decision 3                                                                                                                                                                                                                                 |
| **Task 3.1.6** — the cost premise                                | **SUPERSEDED in the number, still owed in the reading.** $19.04 → **$9.26**, because minute bars arrive as a burst once a minute (243 ms of traffic, 59 s of silence) and a per-second threshold barely notices. The reading is Task 3.11.5's                                    |
| **Task 3.1.9** — the weekend hold                                | **TAKEN, AND THE OUTPUT WAS NEVER READ.** See below — this is the finding of this task                                                                                                                                                                                           |
| **Task 3.2.5** — does a half-open socket lock out its successor? | **STILL OWED, and its trigger has fired many times over.** The condition is _the first deploy that rolls a replica while the feed is connected_; this product has deployed during a session repeatedly, including twice on 2026-09-24. It is **one log read**, and Task 3.11.6's |
| **The slot question** (2026-09-19)                               | **STILL OWED, same measurement.** Three occupants, one slot; the third — _a live process nobody remembered_ — was observed unplanned at **1,149 ms to the `406`, 9,498 ms to the close**                                                                                         |
| **Task 3.4.8 §1** — §28's headline never taken                   | **SUPERSEDED.** Taken 2026-09-22 by Task 3.6.4 once `sentAt` shipped                                                                                                                                                                                                             |
| **Task 3.4.8 §2** — the logging lever                            | **CLOSED.** Evaluated at universe scale and **not pulled**: an ordinary page load is concurrent, interleaving is real, and `reqId` is doing its job. Re-open on _concurrency_, never on the feed                                                                                 |
| **Task 3.4.8 §3** — `onLog`                                      | **STILL OWED**, and now Task 3.11.3's with a task of its own                                                                                                                                                                                                                     |
| **Story 3.5's close** — §28 unmeasurable                         | **SUPERSEDED.** `docs/GAPS.md` entry 12 is closed; what survives is the re-take                                                                                                                                                                                                  |
| **Task 3.6.4** — the recipe                                      | **STILL OWED**, and it is a re-take with four lines of recipe rather than an instrument to build                                                                                                                                                                                 |
| **Task 3.6.5** — the steady state                                | **STILL OWED** for the live re-take; **the cold load and `Expand all` are to be QUOTED rather than re-taken**, in that section's own words                                                                                                                                       |
| **Story 3.7's close**                                            | **MOSTLY ANSWERED, and it says so**: _quote those rather than re-taking them_. `market_bars_feed_check` stays `NOT VALID` permanently and is asserted by `pnpm test:database`. One `docs/GAPS.md` condition is left to evaluate                                                  |
| **Story 3.8's, 3.9's and 3.10's closes**                         | **STILL OWED** — they are the deployed re-take list, and they are criterion 1's table below                                                                                                                                                                                      |

**Five superseded or closed, one taken-and-unread, seven owed.** The argument
for doing this first holds: **eight of thirteen needed no work at all**, and
without reading them the deployed sitting would have been sized for thirteen.

### The finding — a run was taken and its output has been sitting unread for four days

`STORY.md`'s weekend-hold section ends: _Monday's open is still at risk, and the
restart is not the remedy._ It was written on 2026-09-19 during the outage.

**`.capture/weekend/watch-2026-09-19.jsonl` has 1,065 samples spanning
2026-09-19T13:56Z → 2026-09-21T20:58Z — 55 hours** — and nobody has opened it.
It is under `.capture/`, which is gitignored, so it exists on one machine only.

**The arc, from the file:**

| Stretch                                | Reading                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| 2026-09-19 13:56Z → 2026-09-21 ~05:44Z | **`disconnected`**, ~40 hours, spanning the whole of Friday's session and the weekend |
| 2026-09-21 **05:45Z**                  | **`live`** — 01:45 ET on the Sunday                                                   |
| 05:45Z → 20:58Z                        | **`live`**, with nine single-sample blips and one `stale`                             |

**So the question that section ends on is answered: Monday's open was NOT at
risk.** The feed recovered about forty hours in, on the Sunday, unattended, and
stayed up. `535` samples read `disconnected` against `488` `live` and `1`
`stale`.

> **What the file cannot say, and neither can this task: what recovered it.**
> No restart is recorded in the window, and the eight diagnostic events that
> would have said were not being logged — which is the nineteen-hour finding
> restated. **An outage that ends on its own is worse than one that needs a
> restart**, because nothing learned anything. Task 3.11.3 is what changes that.
>
> **And two caveats that bound the reading.** The `poll-failed` stretches — one
> of 5.68 h on the Saturday morning — are the watching laptop asleep, not the
> product. And this is `/diagnostics/feed`'s own `status`, which is the
> **backend's** view of its socket; it is the right instrument for this question
> and it is not a browser's.

### The four decisions, answered by the owner on 2026-09-25

#### 1. The budget → **decide it after the reading**

`marketpulse-monthly` stays **$20** with alerts at 50/80/100% until Task 3.11.5
has a real number, and §9.6's reversal trigger — **the first month whose actual
bill exceeds $12** — stands.

> **Rejected — lower it to $15 now.** The 50% alert would land at $7.50, below
> the $9.26 estimate, so it would fire every month; an alert that always fires
> is an alert nobody reads. **Rejected — keep $20 and move the thresholds to
> 60/80/100**, which is tidy (the first alert becomes the $12 trigger exactly)
> and is a portal change made against an estimate rather than a bill.
>
> **The risk this accepts, stated**: if 3.11.5 cannot read a bill — and Epic 1
> could not, twice — the budget goes unexamined for a second epic. **Then the
> 60/80/100 option above is the fallback**, because it is the one change that
> improves the alerting without needing a reading.

#### 2. The deployed check → **only what holds at any hour**

`check-deployed.mjs` asserts the deployment is configured for the real provider,
is **never replaying** (ADR 0030, 7c), and — once Task 3.11.3 lands it —
reports a **last-observation instant**. It **never** asserts `status: live`.

> **Rejected — a scheduled in-session check.** It would have caught the
> nineteen hours, and it is a **new mechanism with its own failure modes** and
> its own silence when it breaks. **Rejected — both**, for the same reason
> doubled.
>
> **What this leaves open, and it is the honest cost**: nothing mechanical will
> notice a dead feed during a session. **Task 3.11.3 is what narrows it** — a
> last-observation instant makes _the socket is up and has heard nothing since
> Tuesday_ readable at any hour, which is most of what a liveness assertion
> would have bought, without a cron.

#### 3. CI's credential → **no, and record why**

> **The reason is the single connection rather than the quota.** The free plan
> allows **one** connection; the deployment holds it, and a developer machine is
> already refused `406` because of that (`docs/GAPS.md` entry 7). **A CI
> credential would make every push a third claimant for a slot two things
> already contend for** — and CI would not merely fail, it would take the
> **deployment's** socket down. The quota is the smaller half of the argument.
>
> **Rejected — add one**, which would let a browser test watch a real vendor
> frame reach a screen; that is a real gap and the deployed pass is where it is
> answered instead. **Rejected — defer to a paid plan**, which is a way of not
> deciding.
>
> **The two measured consequences stand and are not repaired by this
> decision**: a spec asserting an **absence** passed for four days after the
> words it forbade became real, and **no browser test in this epic has ever
> watched a real vendor frame reach a screen.** Both belong in `docs/GAPS.md`
> with this decision beside them.

#### 4. _Watched_ → **not met; Task 3.11.8 takes a real sitting**

A person opens the deployed site during a session, at three viewports including
**a real phone**, and fills the remaining rows.

> **Rejected — instrumented counts as watched**, which would close the criterion
> by amending its word. The rows are dated and honest and in several ways richer
> than a person's notes — and _a headless browser did not notice_ is not the
> same claim as _a person did not notice_, which is exactly what the 390
> question needs. **Rejected — half-met with a named owner**, which is the
> shape this repository uses for the screen-reader pass and is right when the
> thing is genuinely unbookable. **This one is bookable**: it is one sitting,
> already shared with Task 3.11.4.

### Criterion 1's re-take list, in one table

Extracted from thirteen sections so no later task has to re-read them. **The
split criterion 1 asks for is the last column.**

| Figure                                                       | As taken                     | Instrument                                                                                            | Re-takes from                                                                                                 |
| ------------------------------------------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| §28 **p95 68.1 ms** gateway→repaint, 518 subscribed          | Task 3.6.4, loopback         | `window.WebSocket` wrapped from `addInitScript`, `sentAt` subtracted, `MutationObserver` on the table | **a live session**                                                                                            |
| **7.2–8.1 ms** script a burst, 1,950 bars                    | Task 3.9.9, production build | `long-animation-frame` observer, rAF self-test first                                                  | **a live session**                                                                                            |
| **12.3–13.2 ms**, 6,630 bars (**68% of the cap**)            | same                         | same                                                                                                  | **a live session**, where the cap is free                                                                     |
| **zero** frames over 50 ms, 160 bursts                       | same                         | same                                                                                                  | **a live session**                                                                                            |
| **37–40 ms** a tick, every row changing                      | Task 3.6.5                   | same, plus `onCommitFiberRoot` commit counter                                                         | **a live session** — and should be **lower**, because the memo boundary skips rows the feed did not touch     |
| **36.75–36.83 ms** a tick, 517 instants                      | Task 3.10.4                  | same                                                                                                  | **a live session**                                                                                            |
| cold load **50–56 ms**; `Expand all` **65–86 ms**            | Task 3.6.5                   | —                                                                                                     | **quote, do not re-take** (Epic 14's, in its own `EPIC.md`)                                                   |
| the **transition's** cost                                    | **never taken**              | none yet                                                                                              | **a live session**                                                                                            |
| **550.6 B/s** inbound, 397 s/day over the threshold          | Task 3.1.6, one Wednesday    | a real capture                                                                                        | **a bill**, Task 3.11.5                                                                                       |
| **38 kB/min per browser** fan-out                            | §9.5                         | —                                                                                                     | **a bill**, and _does the idle condition count egress_ is unanswered                                          |
| **36 bytes a frame** for `sentAt`; the universe frame's size | Task 3.6.4                   | read off the wire                                                                                     | **a live session** — and the cost envelope should cite this rather than the eleven places that say `56.9 KiB` |
| `market_bars` 195 → **199 B/row**, 8.84 GiB/yr, ~2.55 yr     | Story 3.7                    | —                                                                                                     | **quote, do not re-take**                                                                                     |
| tape validation                                              | —                            | `pnpm test:database` + `pnpm break the-tape-check-gets-validated`                                     | **a clean clone**                                                                                             |
| every criterion of 3.1–3.10 with a test name                 | —                            | `pnpm verify`, `pnpm e2e`, `pnpm break`                                                               | **a clean clone**                                                                                             |

**Eight need a live session, three are clean-clone, three are quote-only.** The
eight are one sitting with Task 3.11.8's.

### What this changes in STORY.md

- The weekend-hold section gets the run's result and the answer to _Monday's
  open is still at risk_
- The four decisions are recorded where the story's _Open decisions_ section
  asks for them
- Nothing else in `STORY.md` was found to be untrue — the superseded sections
  each carry their own amendment already, which is why they were superseded
  rather than wrong

### Gates

Documents only. `pnpm links` green.

## For a stakeholder — a status report, 2026-09-25

### What this was

**The task that reads before anyone builds.** The final story of the live-market
phase has been collecting instructions from thirteen earlier pieces of work over
ten days. Some of those instructions have since been carried out by the very
work that wrote them, and nobody had checked which.

**Eight of the thirteen needed no work at all.** Without this half-day, the
expensive part of this story — a sitting that can only happen while the market
is open, using a connection the product only has one of — would have been
planned for thirteen things instead of five.

### The thing we found sitting on a disk

Six days ago our live market feed went down and stayed down for what we recorded
at the time as nineteen hours. We wrote, in the middle of it: _Monday's open is
still at risk._

**A monitoring script was left running through that weekend, and nobody ever
opened the file it produced.** It has 1,065 readings covering 55 hours.

It answers the question we left hanging. The feed was down for about **forty
hours**, through the whole of Friday's trading session and the weekend — and
then **came back on its own, on the Sunday at 01:45 New York time**, and stayed
up. Monday opened working.

**The uncomfortable part is that we cannot say what fixed it.** Nothing restarted
it that we recorded. An outage that ends by itself is in some ways worse than one
that needs intervention, because nobody learns anything — and the reason we
cannot say is the same reason the outage went unnoticed for nineteen hours: the
eight internal signals that would have explained it **are not written down
anywhere**. That is the third task of this story, and it is deliberately early.

### The four decisions you made

**The budget stays at $20 until we can read an actual bill.** Lowering it now
would set an alert below our own estimate, so it would fire every month and
teach us to ignore it. If the bill cannot be read — and it could not be, twice,
in an earlier phase — there is a fallback already written down.

**The post-deploy check will only assert what is true at any hour.** It cannot
prove the feed is live at 9pm on a Sunday, so it will not pretend to. A
scheduled check inside market hours would have caught the outage, and it is a
new machine with its own ways of failing silently — we are buying most of the
same benefit more cheaply by recording _when we last heard anything_, which
reads correctly at any hour.

**Our automated tests will not get live market credentials**, and the reason is
sharper than cost: our data plan allows exactly **one** connection, the live
site holds it, and giving the test system one too would not just make tests
flaky — it would knock the live site's feed over. Two real gaps follow from that
and are written down rather than hidden.

**And the phase does not count as finished until a person has actually watched
it work.** We have six dated records of the product running live — every one
taken by an automated browser. They are honest and detailed, and "no automated
script noticed a problem" is not the same claim as "a person looked and it was
fine". One sitting, with a human, including on a real phone.
