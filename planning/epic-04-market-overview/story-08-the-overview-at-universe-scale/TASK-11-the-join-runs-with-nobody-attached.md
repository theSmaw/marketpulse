# Task 4.8.11 — The join runs with nobody attached

**Status:** Not started
**Story:** [4.8 The Overview at Universe Scale](STORY.md)
**Depends on:** 4.8.3

## Objective

**Added 2026-10-09 at the owner's decision**, after Task 4.8.3 measured it and
Task 4.8.8 escalated it. `publishObservations` evaluates `overviewMessage()` as
an **argument** to `broadcast`, so **the 518-join runs before the client map is
read.**

## What the user can see when this lands

**Nothing.** It is work a deployment stops doing when nobody is looking at it.

## Work

### The measurement, so nothing is re-derived

**3.708 ms p50 with zero clients attached** (n = 300) against a
cached-overview control of **0.013 ms** — so **all of it is the join**, and
`broadcast` to an empty map is 13 µs. At the measured cadence that is
**25 ms of script a minute at the 6.8-batch midday floor and 60 ms at the
close, for an aggregate sent to nobody**, against `PRODUCT_SPEC.md` §9.1's
idle-rate condition.

**Both figures are tight-loop figures on one laptop** and Task 4.8.3's
idle-wake finding applies: production's inter-batch gap is 3.7–8.8 s, where the
same join reads 12.97–15.43 ms **and a fixed-cost control with no ICU and no
allocation inflates by the same factor**. The ratio travels; the absolute does
not. Note also that **Task 4.8.7 took `marketDateAt` from 3.37 to 1.29 ms**
after 4.8.3 measured this, and **nobody has re-run the join benchmark** — so
3.708 ms is an upper bound on today's tree.

### The guard

The same `clients.size > 0` test **the keepalive already makes twelve lines
below**, in `apps/backend/src/market-gateway.ts`. One condition, on the socket
callback's own path.

**Two things about that path.** It is called from the socket's own callback,
where an unhandled rejection is a crashed process — so nothing here may throw.
And `publishObservations` already returns early on
`observations.length === 0`, which tests **`applied`** rather than `tracked`;
the new condition is a second early return with a different subject, and the
two must not be collapsed into one sentence that implies either.

### What it costs elsewhere, and the ADR that owes an amendment

**ADR 0038's decision 1 reads _one join_ and becomes _one join when somebody is
listening_.** That is a dated amendment beside it, never a rewrite. Note the
ADR's decision 3 is unaffected and makes no cost claim.

And **the snapshot path is NOT in scope**: a browser connecting or subscribing
still gets a freshly computed aggregate, which is three joins per cold load of
`/` (measured off the wire by Task 4.8.3). Memoising that is a different
decision with more surface, and it was explicitly **not** the one taken.

### The check it owes

A claim about a mechanism reads identically whether the mechanism is there or
not. The guard is one condition that the next author removes while tidying, so
it owes something mechanical — and prefer **an assertion a re-implementer
cannot avoid failing**: the process suite already drives a real socket with an
injected clock (`market-gateway.process.test.ts`), so a test that publishes
observations with **no client attached** and asserts the producer was **not
called** is a behaviour rather than a grep. Register the break with it, and per
`CLAUDE.md`'s 2026-09-26 rule **write the file the next author would write,
confirm the check passes wrongly first, keep the transcript**, then fix, then
confirm red.

**Reversal trigger, a condition:** _the first consumer of the aggregate that is
not an attached browser socket_ — a scheduled job, a diagnostics route, a
second gateway — at which point `clients.size` stops being the right question.

## Done when

1. The join does not run when no client is attached, with nothing on the socket
   callback's path able to throw
2. The two early returns are distinguishable in the code and in its comment —
   `applied` is not `tracked`, and neither is `clients.size`
3. A behavioural assertion holds it, with its break and its passing-wrongly
   transcript
4. ADR 0038 carries its dated amendment; the snapshot path is recorded as
   deliberately unchanged
5. `pnpm verify` and `pnpm test:process` green, and the figure re-taken after
   the repair rather than assumed

## Handed here by Task 4.8.8 — 2026-10-09: the path you are guarding is now COUNTED, and your repair keeps the count

**Two things, and the second is a one-line constraint on where your guard
goes.**

**1. The three paths to the aggregate are now held mechanically, and one of
them is yours.** `pnpm invariants` carries
**`the-aggregate-has-three-producer-paths`** (break:
**`a-fourth-path-to-the-aggregate`**), which counts the ways
`overviewMessage()` is reached in `apps/backend/src/market-gateway.ts`: the
connect and the `subscribe` message, both through `sendSnapshot()`, and **once
per applied batch from `publishObservations`** — the one you are guarding. Its
claim says in as many words that **three is not endorsed as correct**, only
that a fourth is a decision; your task is the one that argues the third is a
path doing work nobody asked for. Epic 14's repaired 2026-10-07 clause fires on
that count, which is why it has a check rather than a sentence.

**2. Your guard must stay INSIDE `publishObservations`, or repoint the check in
the same change.** The check slices two regions by their Prettier-formatted
indentation — `\n    publishObservations(observations) {` to `\n    },` and
`\n      const sendSnapshot = (): void => {` to `\n      };` — and requires
**exactly one** `overviewMessage()` call in each, with every other call refused
as a stray. The repair the task names, `if (clients.size > 0)
broadcast(overviewMessage())`, sits inside that region and the check stays
green. What would turn it red is **hoisting the call above the method** to make
the guard read better — which is precisely the sort of tidy-up that looks
right. If you restructure the gateway, repoint the markers and **re-count the
paths while you are there**; the check's own failure message says so.

**And one figure you already have but should quote with its date**: your
3.708 ms was taken before Task 4.8.7 took `marketDateAt` from 3.37 to 1.29 ms
over 518 instants, so it is an **upper bound** on today's tree. The join's
other terms were measured with the dear version underneath them —
**re-measure rather than subtract.**
