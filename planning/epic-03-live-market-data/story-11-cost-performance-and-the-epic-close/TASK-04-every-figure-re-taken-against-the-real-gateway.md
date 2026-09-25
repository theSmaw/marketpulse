# Task 3.11.4 — Every figure re-taken against the real gateway, in one sitting

**Status:** Not started
**Story:** [3.11 Cost, Performance, the Sweep & the Epic Close](STORY.md)
**Depends on:** 3.11.1, 3.11.2

## Objective

Criterion 4, and the largest single piece of this close. **Every performance
figure this epic published was taken on a developer's machine against a socket
an instrument served.** They are honest about what they measure and none of them
is the deployment.

## What the user can see when this lands

**Nothing**, unless a figure comes back over the line — in which case what they
see is a repair, and it belongs to whichever surface the figure is about.

## The figures, and why each must be re-taken

| Figure                                                               | As taken                              | Why the deployment differs                                                                   |
| -------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| §28's **p95 68.1 ms** gateway send → table repainted, 518 subscribed | Task 3.6.4, **loopback**              | server and browser on one machine and **one clock** — the skew this hides is the whole point |
| **7.2–8.1 ms** script a burst at 1,950 bars                          | production build, instrument's socket | no gateway, no network, one machine's CPU                                                    |
| **12.3–13.2 ms** at 6,630 bars                                       | same                                  | and 6,630 is **68% of the 9,750-bar cap**, not the cap                                       |
| **zero** frames over 50 ms across 160 bursts                         | same                                  | the acceptance figure, and the one worth defending                                           |
| **37–40 ms** of script a tick, 518 rows changing                     | Task 3.6.5                            | §28's _routine_ line, repaired there and never re-taken live                                 |
| **36.75–36.83 ms** a tick with 517 instants drawn                    | Task 3.10.4                           | the worst case of Story 3.10's dating                                                        |
| cold load **50–56 ms** (7 in 10), `Expand all` **65–86 ms**          | Task 3.6.5                            | Epic 14's two standing exceptions                                                            |
| the **transition's** own cost                                        | **never taken**                       | Story 3.10 declined it with its reasoning — see below                                        |

## The cap is the gap worth closing, and it is free here

Task 3.9.9 could not reach **9,750 bars**: that machine's store ended
2026-09-11, and backfilling to reach it is a metered vendor write. **The
deployed store is backfilled nightly**, so a deployed re-take reaches the cap
for nothing — ask for 25 sessions of `1m` on a liquid name and the answer _is_
the cap.

The trend measured was **sub-linear** — 3.4× the bars for 1.8× the script — so
the expectation is comfortable. **The point is that expectation is not
measurement**, and ADR 0027's whole argument is a count.

## The transition, which is an argument awaiting a number

A feed dying changes one field on one view and re-renders every surface at once.
Story 3.10 declined to measure it and said why: §28's word is **routine** and a
disconnection is a one-off, so it falls where the cold load falls rather than
where the tick does. **This story is where arguments of that kind get numbers.**

## The method note worth inheriting rather than rediscovering

**A `long-animation-frame` entry only exists for a frame over 50 ms**, so _zero
observed_ and _the observer is broken_ are the same output. Task 3.9.9's first
self-test reported zero because it blocked **outside** an animation frame on an
idle page. **Block inside a `requestAnimationFrame`, with a mutation after it,
and confirm the observer complains before believing any silence it reports.**

And the second, from the same task: hold bars back so the chart has room to
grow, or the timings look plausible while nothing is actually being drawn.

## The constraint on the sitting

The free plan holds **one** Alpaca connection and the deployment has it
(`docs/GAPS.md` entry 10). This sitting needs the **market open** and shares its
window with Task 3.11.8's rehearsal. **Take them together**, and prefer one
instrument that records everything to five that each need their own session.

## Work

- One instrument, run against `pnpm e2e:deployed` during a session, recording
  every figure above with its n
- The cap reached, deliberately, on a liquid name
- The transition measured, or a second recorded refusal with a better reason
- §28's p95 taken as a **distribution** with its n and its skew caveat, never a
  single number — a server clock and a browser clock disagree and a negative
  sample is skew rather than a measurement
- Every figure written where a later reader finds it: `CHARTING.md` §18,
  `STREAM-SEAM.md` §8.9, `PRODUCT_SPEC.md` §28's amendments, Epic 14's file
- Epic 14's two exceptions re-verdicted, and its trigger evaluated in writing
- The instrument deleted, with at least one reading quoted **verbatim**

## Done when

1. Every figure in the table has a deployed reading or a recorded reason it has
   none
2. The 9,750-bar cap has a measurement rather than an extrapolation
3. §28's p95 is a distribution with an n, taken against the real gateway

## Amended by Task 3.11.1 — 2026-09-25: the list is elsewhere now, and it is two rows longer

**Do not rebuild the table.** Task 3.11.1 extracted criterion 1's whole re-take
list from thirteen hand-off sections into **one table**, with the instrument
named per figure and the split criterion 1 asks for in the last column:
**eight need a live session, three re-take from a clean clone, three are
quote-only.** The eight are this task's.

**Two figures this task's own table did not carry, and both are cheap once the
socket is open:**

- **The payload.** `sentAt` costs **36 bytes a frame**, read off the wire, and
  the universe frame's own size is in Task 3.6.4's record. **The cost envelope
  should cite the re-measured figure rather than either of the two currently in
  circulation** — the eleven places that say `56.9 KiB` were deliberately not
  rewritten by Task 3.5.8's amendment, so there is no single number to quote
  until this takes one.
- **The fan-out**, which belongs to Task 3.11.5's bill but can only be measured
  here: **38 kB/min per browser** at the whole universe (§9.5), and whether
  concurrent browsers change it.

**And one row is quote-only rather than yours**, in its own section's words: the
cold load at **50–56 ms** and `Expand all` at **65–86 ms** stay Epic 14's and
are quoted from that epic's `EPIC.md` unless the table itself changed.

## Amended by Task 3.11.2 — 2026-09-25: the deployed harness is simpler than this task assumed

**A plain Playwright script pointed at the deployed URL works.** Task 3.11.2
took its deployed reading with about fifteen lines — `chromium.launch()`,
`page.goto("https://…/securities/NVDA")`, listeners, a `waitForTimeout` — and
needed **no `pnpm e2e:deployed`, no config, and no credential**. The deployed
frontend is a static site and the gateway is `wss://…/market-stream`; both are
reachable from a laptop.

**So the instrument for the whole sitting is one script rather than a suite**,
which matters because this task shares its window with Task 3.11.8's rehearsal
and the sitting is bounded by the market's hours rather than by effort.

> **One caveat that bounds what a browser reading can claim, and it caught
> Task 3.11.2 nearly overclaiming.** A browser's socket to **our gateway**
> says the gateway is up and holding. It says **nothing** about the backend's
> upstream socket to **Alpaca** — those are two different connections, and the
> forty-hour outage was the second one with the first working perfectly.
> `GET /diagnostics/feed` is what answers for the upstream, and it is one curl.
