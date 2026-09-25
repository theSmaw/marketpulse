# 0037 — What this deployment's shape costs, in money and in feed

**Status:** Accepted
**Date:** 2026-09-25
**Story:** [3.11 Cost, Performance, the Sweep & the Epic Close](../../planning/epic-03-live-market-data/story-11-cost-performance-and-the-epic-close/STORY.md)
**Relationship to [ADR 0011](0011-deploying-both-halves-and-what-a-green-deploy-certifies.md):** it **takes over the cost subject** and supersedes nothing. 0011's decisions — Azure for both halves, `minReplicas: 1`, the digest-pinned rollout, what a green deploy certifies — are untouched and correct.

## Context

**ADR 0011 carries a cost annexe that has now been amended twice and falsified
once, and a decision record that argues with itself about its own premise is
worse than one that hands the subject on.**

| Reading          | Says                                                                | Basis             |
| ---------------- | ------------------------------------------------------------------- | ----------------- |
| 0011, original   | a live-feed replica costs **$19.04/month**, at the active vCPU rate | a rate card       |
| 0011, 2026-09-17 | **$9.26** — the burst shape crosses the threshold only 397 s/day    | a traffic capture |
| 0011, 2026-09-25 | **$13.32/month** run rate, and **the bill cannot see the socket**   | **the bill**      |

All three reason about whether **holding a socket** pushes the replica off the
Consumption plan's idle vCPU rate. **The third says the question was the wrong
one.**

**Why a new ADR rather than a third amendment.** Amending 0011 again would be
the fourth entry in an argument whose premise has been retired, inside a
document whose actual decision nobody disputes. A decision record is not
primarily a cost model — and the cost subject has now grown a second half
(below) that 0011 never considered at all.

**Why not a supersession.** Superseding 0011 would retire twenty-four decisions
to correct an annexe. `CLAUDE.md`'s rule is that ADRs are never renumbered and
their decisions never rewritten; the honest move is to take the subject, not the
document.

## Decision 1 — the socket is not what costs money; a write a minute is

**Read from the bill rather than computed from a rate card**, for the first time
in this project's life (Task 3.11.5):

- Container Apps ran at **`$0.2056`/day** from 09-11 to 09-22 and **`$0.2832` /
  `$0.2589`** on 09-23 and 09-24 — **up 32%**, a step rather than a drift, and
  **2026-09-23 is the day the live bar writer began writing every complete
  minute to `market_bars`**.
- Across the 2026-09-19 → 09-21 outage — about **forty hours disconnected**,
  the natural experiment nobody designed — the bill read `$0.2149` and `$0.2291`
  a day: **indistinguishable from the connected days either side.**

**So `LIVE-DATA.md` §9.2's 550.6 B/s stays true and stops being load-bearing.**
What a held socket costs is **the plan's one connection slot**, not money.

> **n=2 and it is a step, not a trend.** Story 3.11's close re-reads it. If the
> step holds, the premise is definitively retired; if it does not, this decision
> is the one that needs amending rather than 0011.

## Decision 2 — the every-deploy feed outage is the platform's, not this product's

**`LIVE-DATA.md` §12.2 credited the deliberate `SIGTERM` close with bounding the
every-deploy feed outage at the 5 s shutdown ceiling. Measured on two
consecutive deploys: 45.8 s and 46.5 s** (Task 3.11.6, read from the backend's
own stream log).

**The close works exactly as claimed** — the outgoing replica released the slot
**2.9 s** before the arriving one authenticated. What nobody checked is _when_
it is asked to: the platform does not terminate the outgoing replica until
**~46 s into its successor's life**, because that is Container Apps'
revision-overlap schedule.

**The bound is the platform's revision-overlap policy, not `SHUTDOWN_TIMEOUT_MS`,
and it belongs here** because it is a consequence of the rolling-deploy shape
ADR 0011 chose — not of anything in the live-data path.

**What follows for the product**, and it is small on purpose:

- **Every deploy during a session costs about 46 seconds of live feed.** The
  gap fills itself when the socket returns (Task 3.10.7's refill).
- **46 s is shorter than both liveness thresholds** — 60 s wall, 165 s
  monotonic (ADR 0036) — so the most common feed interruption this product has
  produces **no degraded word on any screen**, by arithmetic rather than by
  accident.
- **`check-deployed.mjs`'s `disconnected` grace is derived from this figure**
  and from nothing else: 60 s, against a measured 46 s overlap.

## What a green deploy certifies about cost, and what it does not

**It certifies** nothing about either. A deploy is green when the rollout
completed; the bill arrives days later and the overlap is invisible to every
check in this repository except the deployed feed probe, which has a grace
sized to ignore it.

**The budget is the mechanism**, not a check: **$20/month with alerts at 60 /
80 / 100%** (Task 3.11.5). A run rate of $13.32 leaves headroom for exactly the
kind of step decision 1 found.

## Reversal triggers, each a condition

- **The 32% step is re-read and does not hold** — decision 1's attribution is
  wrong and this ADR is amended, not 0011.
- **A budget alert fires at 60%** — something changed that nothing here
  predicted, and the first question is what started writing.
- **A deploy is measured taking materially more or less than ~46 s** — the
  platform's schedule is not a documented contract, so it is a dated
  observation of a third party like any other.
