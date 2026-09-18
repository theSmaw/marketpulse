# Story 3.11 — Cost, Performance, the Sweep & the Epic Close

**Status:** Not started
**Epic:** [Epic 3 — Live Market Data](../EPIC.md)
**Depends on:** 3.10
**Epic scope covered:** the continuous-connection cost envelope, the epic's exit criterion, and everything this epic falsified upstream

## Description

The close, in the shape Epic 2's worked: re-take every acceptance criterion
against the thing it is about rather than citing it, finish the subject
document, write the ADRs, **sweep upward**, and hand what ships open to a named
owner rather than to a story number.

It carries one measurement no other story can take, because it needs a month
rather than an afternoon.

## The cost envelope, which is a re-measurement and not a confirmation

**Epic 1's recorded figure is an idle figure and this epic breaks the condition
it rests on.** The Consumption plan's idle vCPU rate requires the replica to
receive **less than 1,000 bytes per second** of network traffic. A replica
holding a live feed exceeds that through every market session, so the estimate
moves from **$4.21** to **$14.04** for the replica — **$9.21 to $19.04** a month
with ACR Basic. Memory bills the same either way; the discount is on vCPU alone.

**And the alert that matters would not fire.** The `$20` budget with its
50/80/100% alerts sits just _above_ the active-rate total, so the single change
most likely to move this bill is the one the thresholds cannot see.

Epic 1 could not take a real reading at all — both billing APIs refused, then
answered `[]` and `429` — so **this is a re-measurement rather than a
confirmation**, and the budget threshold is re-decided against what it reads.
Storage is the second half: a live session adds rows every day, and what a month
of them costs is arithmetic nobody has done.

## What the user can see when this story lands

**Nothing new, and the epic's exit criterion walked on the deployed site by a
person** — a live connection maintained for the tracked universe, visible market
values updating without a page refresh, at three viewports.

Epic 2 ended by making its exit criterion **run on every deploy** rather than be
walked once. This epic's criterion is harder: it needs a live session, and a
deploy at 21:00 on a Sunday cannot prove it. That is a real constraint on what
the deployed check can assert and it should be stated rather than worked around.

## Why it sits here in the sequence

Because a close re-takes rather than cites, and there is nothing to re-take
until the last feature story has shipped.

## Scope

- **The cost reading**, above, with the budget re-decided and `HOSTING.md`
  amended. Note what is being measured: the change is the **socket**, not the
  traffic to browsers, and the two are separable in the reading.
- **The performance figures, at universe scale with the feed running**:
  §28's _event → application state <250 ms p95_ excluding provider latency;
  _no routine main-thread task >50 ms_; and the one breach this product already
  carries with a named owner — **50–76 ms on every cold load of `/securities`
  and `/securities/:symbol`, from the 518-row table rather than from the chart**,
  measured three times and attributed from both ends each time. Its trigger is a
  condition that outranks Epic 14, and Story 3.6 will have evaluated it; this
  story records the verdict either way.
- **The subject document finished** — `LIVE-DATA.md`, from Story 3.1, as the
  maintained account of how a live observation reaches a screen, with the rule
  that where it and any task file in this epic disagree, **it wins**.
- **The ADRs.** Epic 2 produced nine; this epic's candidates are the streaming
  seam and what a fixture-backed stream certifies; the motion vocabulary and
  what a green suite certifies about it (nothing below a browser can see
  motion, and nothing at all can see whether it helps); and the two-tape store.
  **ADRs are never renumbered**, so these start at **0030**.
- **The upward sweep, which is the obligation most likely to be skipped.**
  Falsification travels **upward**: a task measures a vendor or the tree, and
  what it invalidates is a premise in an ADR, an invariant in `CLAUDE.md`, or
  `PRODUCT_SPEC.md` — and **nothing sweeps upward**, because a story close
  sweeps that story's own documents. This has already happened once in this
  repository: for a day, `ALPACA.md` and ADR 0019 both recorded that §7.1's feed
  claim was false while §7.1 itself, `README.md`, two other ADRs and invariant 6
  went on asserting it. The known candidates before the work starts:
  - **`PRODUCT_SPEC.md` §42's milestone**, whose _live price updates_ clause is
    this epic's and is explicitly marked as such
  - **§7.1's asymmetry table**, which is a dated observation of a third party
    and will have been re-measured by the spike
  - **`CLAUDE.md`'s invariant 6**, whose parenthesis — _Epic 3's live feed must
    not inherit Epic 2's word_ — becomes a statement about shipped code
  - **`CLAUDE.md`'s "Current state"** section, including _what they still cannot
    do: watch a price move_, which this epic makes false
  - **`FeedIndicator`'s and `feed-status.ts`'s own comments**, which describe a
    component that is not in the chrome and a type waiting for this epic
  - **`VISUAL-LANGUAGE.md`'s Motion section**, whose deferral is discharged
  - **`PROVIDER.md` §12**, which sketched this epic's seam and can now record
    what shipped against what was predicted
- **`docs/GAPS.md`.** Add what this epic leaves standing, each with a
  `Re-measure:` line — and take the standing instruction seriously: **an entry
  that can be made mechanical should be**, because a prose entry with a
  re-measure command is a check nobody runs. A live feed generates exactly the
  kind of claim that rots silently.
- **`pnpm break` entries** for every check this epic added, and a run of each.
- **What ships open**, each with an **owner and a condition** rather than a
  story number.

## Out of scope, and who owns it

- Aggregations over the live universe — Epic 4
- Anomaly scores — Epic 5
- Any repair to the §28 cold-load breach beyond evaluating its trigger —
  Epic 14, unless Story 3.6's measurement fired it

## Open decisions — settle with the user

1. **The budget**, re-decided against a real reading.
2. **Whether the deployed check asserts liveness**, given that it cannot on a
   Sunday. The honest options are a criterion that only asserts out of hours
   what can be asserted out of hours, or a scheduled check inside a session —
   and the second is a new mechanism rather than an assertion.

## Acceptance criteria

1. Every acceptance criterion in Stories 3.1–3.10 re-taken against the thing it
   is about, with the instrument named and the reading quoted — and the split
   stated between the ones that re-take from a clean clone and the ones that are
   **dated readings against a populated store and a live session**
2. The exit criterion walked by a person on the deployed site during a live
   session, at three viewports
3. A real billing reading, the budget re-decided, `HOSTING.md` amended
4. §28's figures re-taken with the feed running
5. The ADRs written; `LIVE-DATA.md` closed as the maintained document
6. The upward sweep performed against the list above **and against a grep**,
   with live claims amended, historical records left standing, and ADRs given
   dated amendments rather than rewrites
7. `docs/GAPS.md` updated, with anything mechanisable made mechanical
8. `pnpm verify`, `pnpm test:database` and `pnpm e2e` all green, and every new
   check's break performed
9. **[`LIVE-REHEARSAL.md`](../LIVE-REHEARSAL.md) is complete** — a dated row for
   every visible story, each watched against the real IEX socket during a real
   session, with its `What was wrong` column filled in honestly. Added
   2026-09-16 with [ADR 0030](../../../docs/adr/0030-replaying-our-own-bars-and-the-mechanisms-that-stop-the-live-feed-rotting.md):
   this epic can be built at any hour against a replay of our own bars, and
   criterion 2 above is the only other thing standing between that convenience
   and an epic that closes without anyone having watched the live feed work.
   **A missing row is closed by taking the rehearsal, never by deleting the
   row** — and a `pnpm invariants` entry asserts every story `EPIC.md` marks
   complete has one, so this criterion is checked rather than remembered
10. **The replay's guards re-broken rather than assumed**: that a replay refuses
    to start while the market is open, and that a replayed series cannot reach
    `market_bars`. Both are the mechanisms ADR 0030 rests on, and a check that
    has not gone red this epic has not been tested this epic
11. **The deployed site confirmed never to have replayed** — `check-deployed.mjs`
    asserts it after every merge at any hour (ADR 0030, 7c), and this close
    checks the assertion exists and has run rather than trusting that it does.
    Production has real users and must only ever tell the absolute truth about
    the real market; that is the one claim in this epic where a missed check is
    a user being misled rather than a developer being inconvenienced

## What this story hands forward

A live application, and an epic whose figures can be re-taken rather than cited.

## Handed here by Task 3.1.6 — 2026-09-17, and the premise halved

**This story owns the only real cost measurement anybody will ever take**, and
the estimate it is measuring against changed by a factor of two on 2026-09-17.

[`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md)
§9.1–§9.2: ADR 0011 put a live-feed replica at the **active** vCPU rate through
every session — **$19.04/month**. Measured against a real 7.77-hour capture, a
**bars-only** subscription to all 518 symbols averages **550.6 B/s** against the
1,000 B/s condition and crosses it for **397 seconds a day**. The blended total
is **$9.26** — five cents above a replica doing nothing.

**The error was a premise rather than a calculation**: minute bars arrive as a
**burst once a minute** — 243 ms of traffic, 59 seconds of silence — and a
per-second threshold barely notices that. ADR 0011 carries a dated amendment and
its tables are untouched.

**What this story is therefore measuring against is $9.26, not $19.04**, and
three things follow:

- **The budget was left unchanged deliberately** (§9.6). `marketpulse-monthly`,
  $20, alerts at 50/80/100%. At $9.26 the 50% alert at $10 sits eight percent
  above the measured total, so it is already primed. **The reversal trigger is
  the first month whose actual bill exceeds $12** — above §9.2's realistic worst
  case, so reaching it means an assumption in §9.2 is wrong.
- **The envelope is inbound-from-Alpaca only.** It does not cost the fan-out to
  browsers, and §9.5's answer makes that the **whole universe** — 38 kB/min per
  browser. Whether Azure's condition counts egress, and what concurrent browsers
  add, is **this story's to measure** and nobody else's.
- **It is n=1** — one Wednesday in September — and it is arithmetic over a rate
  card. Epic 1 could read no bill at all; both billing APIs refused the
  subscription. **This story is the first that can read one.**

**And §28's performance target is in the same position.** §7.4 measured the
provider's own share of the 250 ms budget at **901 ms p95 corrected** — but from
Asia/Singapore, over a 271–311 ms round trip production does not have. That does
not falsify §28; it makes it **unevaluable until the same figure is taken from
`eastus2`**. The condition is **the first time a real socket runs in the deployed
backend**, and that is this story's too.

---

## The weekend hold — handed here 2026-09-18 by Task 3.1.9

**This story owns a measurement Story 3.1 built the instrument for and chose not
to run.** [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md)
§13.4 has the full account; this is what this story has to do about it.

**The question.** §9.3 decided the socket is held **always** — one connection,
opened at boot, never deliberately closed. The longest hold ever achieved is
**7.77 hours**. A weekend is **56+**. So _always_ is validated to less than a
seventh of the interval it claims, and whether Alpaca tolerates a multi-day idle
connection, keeps heartbeating across it, or drops it, is **unmeasured**.

**Why it is yours rather than 3.1's.** It needs 56 hours of a machine that
cannot close its lid, and this story is **already the one that runs a real
socket in the deployed backend** — §7.4's latency re-measure is parked here on
exactly that condition. There, the hold costs a container that is running
anyway. The same trigger serves both: **the first time a real socket runs in the
deployed backend.**

**What to watch for, so this is a measurement rather than an observation:**

- **The heartbeat, not the data.** `b` is legitimately silent for 56 hours with
  the market shut (§6.2), so anything keying on data reports a healthy socket as
  dead. The server's **54 s** ping (§6.3) is the only liveness signal.
- **Do NOT subscribe `dailyBars`.** §6.7 measured it re-sending an unchanged
  aggregate every minute out of hours, which would keep the connection warm and
  answer a different question. Production's real subscription is `bars` +
  `updatedBars` for the 518 (§10.2), and that is what should be held.
- **The elapsed time at death, the close code and the close latency.** §8.5 is
  the discriminator: ~1 ms means our own link went, ~6 s the server closing a
  rude client, ~30 s `ws@8` timing out on a corpse.

**The outcome that actually matters, and it is not "did it survive".** A drop is
handled by machinery this epic builds anyway — Story 3.2's watchdog and
reconnect exist for §6.4, §8.2 and §8.8 regardless. **The incident shape is a
drop that also holds the connection slot.** §6.4 measured a dead socket
occupying the single permitted connection for **4 h 21 min** with `readyState`
reporting `OPEN`. If a weekend drop leaves the slot held, **Monday's pre-market
opens with no feed and no obvious cause** — so the thing to measure is not only
whether the socket dies but **whether a fresh connection is accepted
immediately afterwards**.

**The instrument existed and was proved before it was retired.** `weekend.mjs`
held a real socket, acknowledged 518 on both production channels and caught the
heartbeat at **54.03 s**, with sentinels that distinguish a suspended laptop and
a dropped local link from a vendor drop. It went with the harness; the design is
recorded here so it does not have to be re-derived — **two sentinels: a
monotonic-vs-wall-clock tick that makes a machine suspension a recorded fact
with a duration, and a DNS + HTTPS reachability probe fired at the moment of
death, because a death with a clean network and no clock jump is the finding and
anything else is an artefact.**
