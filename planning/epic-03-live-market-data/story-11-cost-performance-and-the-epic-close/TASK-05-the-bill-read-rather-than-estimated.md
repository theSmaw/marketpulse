# Task 3.11.5 — The bill, read rather than estimated

**Status:** Not started
**Story:** [3.11 Cost, Performance, the Sweep & the Epic Close](STORY.md)
**Depends on:** 3.11.1

## Objective

Criterion 3. **This story owns the only real cost measurement anybody will ever
take** — Epic 1 could read no bill at all, because both billing APIs refused the
subscription and then answered `[]` and `429`.

## What the user can see when this lands

**Nothing.** What the owner sees is whether this product costs what it was said
to cost.

## What is being measured against, and it is not the number ADR 0011 published

ADR 0011 put a live-feed replica at the **active** vCPU rate through every
session — **$19.04/month**. That halved on 2026-09-17:

> Measured against a real 7.77-hour capture, a **bars-only** subscription to all
> 518 symbols averages **550.6 B/s** against the Consumption plan's 1,000 B/s
> idle condition, and crosses it for **397 seconds a day**. The blended total is
> **$9.26** — five cents above a replica doing nothing.

**The error was a premise rather than a calculation**: minute bars arrive as a
**burst once a minute** — 243 ms of traffic, 59 seconds of silence — and a
per-second threshold barely notices that. ADR 0011 carries a dated amendment and
its tables are untouched.

**It is n=1** — one Wednesday in September — and it is arithmetic over a rate
card rather than a bill.

## The three halves, and the second is the one nobody has done

**1. The replica.** Read the actual bill. The reading is the point; the estimate
above is what it is checked against.

**2. Storage, which is arithmetic nobody has done.** A live session adds rows
every day. Since Story 3.8 it adds **both tapes** — `+69% rows a year`, and the
runway from `~2.6 years to ~1.5` on 22.5 GiB usable, which is **a ceiling rather
than a measurement** and was handed here by Story 3.8's close by name. And the
offset is already known: `market_bars_pkey` is **1,045 MB with zero scans**.

**3. The fan-out, which the envelope explicitly does not cost.** §9.5 measured
**38 kB/min per browser** at the whole universe. Whether Azure's 1,000 B/s
condition counts **egress**, and what concurrent browsers add, is **this
story's to measure and nobody else's.**

## The budget, and the trigger that is already primed

`marketpulse-monthly` is **$20**, alerts at 50/80/100%. At $9.26 the **50% alert
at $10 sits eight percent above the measured total** — so the single change most
likely to move this bill is one the thresholds can barely see. §9.6's reversal
trigger is **the first month whose actual bill exceeds $12**, which is above
§9.2's realistic worst case, so reaching it means an assumption is wrong.

**Task 3.11.1's decision 1 settles what the budget becomes.** This task
implements it and records the reading it was decided against.

## Work

- A real billing reading, or the recorded refusal with what was tried — this is
  a third party and _it refused_ is a finding rather than a failure
- The storage arithmetic, from the real store rather than from the ceiling
- The fan-out question answered: does the idle condition count egress
- The budget re-decided per decision 1, and changed in the portal if it changes
- `HOSTING.md` amended; ADR 0011 given a **dated amendment**, never a rewrite
- `docs/GAPS.md`: whatever of this cannot be checked mechanically, with a
  `Re-measure:` line

## Done when

1. A bill has been read, or the refusal is recorded with what was tried
2. Storage has a figure from the store rather than a ceiling
3. The budget is decided against a reading rather than an estimate
