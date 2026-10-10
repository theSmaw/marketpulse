# Task 4.8.11 — The join runs with nobody attached

**Status:** Complete — 2026-10-10
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

## What was done — 2026-10-10

### The repair: one condition, and TWO early returns that say which is which

`apps/backend/src/market-gateway.ts`, inside `publishObservations` — the region
`the-aggregate-has-three-producer-paths` slices, so the check stays green and
its markers are unmoved:

```ts
publishObservations(observations) {
  // **Return 1 of 2 — NOTHING WAS APPLIED.** The subject is this batch …
  if (observations.length === 0) return;

  // **Return 2 of 2 — NOBODY IS ATTACHED.** A different subject from the
  // line above, and the two must not be read as one test: a batch can be
  // full with no browser listening, and a browser can be listening with
  // nothing applied. …
  if (clients.size === 0) return;
```

**How the two are distinguishable.** Each return opens with a capitalised
statement of **its own subject** — `NOTHING WAS APPLIED` against `NOBODY IS
ATTACHED` — and each comment then says what the other one is not: the first ends
_"This says nothing about who is attached"_, the second opens _"A different
subject from the line above, and the two must not be read as one test: a batch
can be full with no browser listening, and a browser can be listening with
nothing applied."_ Neither sentence can be read as covering the other case, and
neither names `applied` and `clients.size` in one breath.

**Nothing on the path can throw.** `Map.prototype.size` is a field read on an
object this closure owns. The method is called from the socket's own callback
(`index.ts`'s `onObservations`), where an unhandled rejection is a crashed
process, and the second test below publishes twenty batches at zero clients for
the behavioural half of that.

**It changes no browser's view of anything.** With an empty `clients` map,
`broadcast` iterates nothing and the per-client loop iterates nothing, so the
guard removes only work whose sole consumer was the empty map.

### The figure, RE-TAKEN rather than subtracted

A throwaway Node instrument over **`apps/backend/dist`** and
`packages/shared/dist` — the artefact the deployed image runs — holding the
**real `registerMarketGateway`** with the producer composed exactly as
`index.ts`'s `marketOverview()` composes it (`buildMarketOverview` →
`eligibleMoves` → `marketBreadth` → `toWireMarketOverview`, the sector ladder
ratchet, `marketOpen` an **argument** rather than a seam), against a fixture of
**all 518 observed with closes**. No Fastify: at zero clients the upgrade
handler is unreachable, so the host is a stub and every line on the measured
path is shipped code. The producer **counts itself**, so the join count below is
a count of joins that ran rather than of frames that imply one. `readMachineLoad`,
`distribution` and `screen` are taken from the shipped harness
(`scripts/overview-instrument.mjs`). Deleted.

**Two arms plus the calibrator, order ROTATED per burst** — Task 4.8.7's rule,
not merely interleaved — with 4.8.1's calibrator (2,000,000 `Math.sqrt`, band
1.6×) sampled beside every burst and any burst outside the band discarded from
every arm. `n = 300` timed after **200** warm-up.

| tight loop, zero clients attached                           | p50 before   | p50 after | p95 before | p95 after | n       |
| ----------------------------------------------------------- | ------------ | --------- | ---------- | --------- | ------- |
| `publishObservations(518)`, zero clients                    | **1.521 ms** | **0.000** | 1.620      | 0.000     | 298/300 |
| `publishObservations([])` — the `applied` return, the floor | 0.000 ms     | 0.000     | 0.000      | 0.000     | 298/300 |
| **joins that ran** (counted, 500 bursts)                    | **500**      | **0**     | —          | —         | —       |

Calibrator: reference **1.217 ms** before and **1.137 ms** after, bands
`[0.76, 1.95]` and `[0.71, 1.82]`, **2 / 300** discarded in each — the same
machine either side. Load ratio 0.324 before and 0.800 after, both under the 1.0
ceiling, unraised. Maxima 1.746 before and 0.001 after.

**1.521 ms, not 3.708.** Task 4.8.3's figure was an upper bound on today's tree,
exactly as this brief said: Task 4.8.7 took `marketDateAt` from 3.37 to 1.29 ms
over 518 instants between the two measurements, and **4.8.3's 93% attribution
predicted this** — 3.708 with ~93% in `marketDateAt` at 2.6× its new cost gives
≈1.5 ms, which is what was measured. It was **re-taken rather than subtracted**,
and the subtraction would have landed in the right place for the wrong reason.

**What the guard saves, at the cadence the feed runs:** **10.3 ms** of script a
minute at Task 4.1.6's measured 6.8-batch midday floor and **24.5 ms** at the
close's 16.1, on a deployment with nobody looking. That is the figure
`PRODUCT_SPEC.md` §9.1's idle-rate condition cares about, and it is now zero.

**The gapped run, because 4.8.3's idle-wake effect applies.** Re-taken at a
**250 ms** gap with the calibrator re-referenced at that gap, arms rotated,
`n = 60` after 20 warm-up:

```text
BEFORE  gap 250 ms  calibrator reference 2.792 ms  band [1.74, 4.47]  discarded 2/60
        publish518-zero-clients   p50 6.662  p95 8.114  max 10.273  n 58
        publish-empty (floor)     p50 0.002  p95 0.005               n 58

AFTER   gap 250 ms  calibrator reference 4.300 ms  band [2.69, 6.88]  discarded 19/60
        publish518-zero-clients   p50 0.004  p95 0.015  max 0.057    n 41
        publish-empty (floor)     p50 0.003  p95 0.011               n 41
        joins run: 0
```

**The calibrator ratio is the thing to read, and it does not transfer cleanly
here.** At the gap the calibrator inflated **2.29×** (1.217 → 2.792) while the
subject inflated **4.38×** (1.521 → 6.662), so the gapped absolute is **not** a
production cost and is not quoted as one — it is an upper bound on the same
shape, and 4.8.3's warning that _the ratio travels and the absolute does not_
should itself be read with a caveat: on this arm the two ratios differ by a
factor of ~1.9. The **after** gapped run discarded **19 / 60** on a machine whose
load had risen to 0.744, and its only load-bearing figure is the one that cannot
be noise: **0 joins**, with the arm and the floor indistinguishable at 0.004
against 0.003 ms.

### The check it owes — and the first draft PASSED on the defect

`market-gateway.process.test.ts`, a new block with its own listening server and
**no browser attached** (`attach()` connects one, so it could not be reused):

- **`does NOT build the aggregate when no browser is attached`** — a `vi.fn()`
  producer, one real batch published, asserted **not called**.
- **`still publishes nothing, and raises nothing, with nobody attached`** —
  twenty batches at zero clients, because the path is the socket's own callback.

The positive direction is already held: `builds the aggregate ONCE for two
browsers, unlike \`bars\``and`is broadcast once per applied batch, to every
attached browser` both go red on an **inverted** guard, so the two directions
are covered by different tests.

**The passing-wrongly transcript, per `CLAUDE.md`'s 2026-09-26 rule.** The file
the next author writes is this gateway with the guard **removed**, and the
obvious check — _no overview frame is sent when no browser is attached_ — was
written first and run against it:

```text
$ vitest run --config vitest.process.config.ts src/market-gateway.process.test.ts -t 'no browser is attached'
 RUN  v4.1.11 /Users/bensmawfield/WebstormProjects/marketpulse/apps/backend
 Test Files  1 passed (1)
      Tests  1 passed | 22 skipped (23)
   Duration  312ms
```

**Green, against the defect.** And the reason generalises: `broadcast` iterates
an empty map, so **no frame is sent whether the guard is there or not**. Nothing
on the wire can see this defect; the join ran, cost 1.5 ms, and left no trace a
frame-counting assertion could reach. The subject had to be the **producer being
called**.

Replaced with that assertion, same removed guard:

```text
$ vitest run --config vitest.process.config.ts src/market-gateway.process.test.ts -t 'nobody attached'
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
Number of calls: 1
 ❯ src/market-gateway.process.test.ts:874:23
    874|     expect(built).not.toHaveBeenCalled();
 Test Files  1 failed (1)
      Tests  1 failed | 1 passed | 22 skipped (24)
```

**Red for the right reason** — an assertion failure with the other 23 tests
still collecting, which is the only red `CLAUDE.md` accepts as proof. Guard
restored, same file:

```text
 Test Files  1 passed (1)
      Tests  24 passed (24)
   Duration  1.46s
```

And registered as **`the-join-runs-with-nobody-attached`** in
`scripts/breaks.mjs`, performed:

```text
$ pnpm break the-join-runs-with-nobody-attached
Breaking apps/backend/src/market-gateway.ts
✓ apps/backend/src/market-gateway.ts broken → red → restored byte-identical.
  matched: does NOT build the aggregate when no browser is attached
```

### One pre-existing flake observed, and it is not this change

The first process run (with the guard **removed**, i.e. shipped behaviour) failed
`a slow browser is dropped rather than tolerated (Task 3.5.7) > leaves a HEALTHY
client on the same process untouched` — `expected +0 to be 1`, both clients
dropped. It passed on the immediate re-run and on every run since, including the
break's own red/green pair. The guard-removed tree is byte-identical in behaviour
to `main`, so this is **not** attributable to this change; recorded for Task
4.8.9, which owns the flake characterisation.

### The documents

**ADR 0038 carries a dated amendment beside Decision 1**, never a rewrite:
_"Amended 2026-10-10 (Task 4.8.11): one join becomes one join when somebody is
listening."_ It records the re-taken figure, why 3.708 is not the number to
quote, the two-early-returns shape, the snapshot path as **deliberately
unchanged**, the wire-cannot-see-it lesson, and the reversal trigger. Decision 3
is untouched: it claims _one compute per applied batch, broadcast_ and makes no
cost claim, and that sentence is still true of every batch with a reader.

**`the-aggregate-has-three-producer-paths`** had its claim and its note amended
in the same change. The claim now says the third path runs _"only when a browser
is attached, since Task 4.8.11"_, and the note says in as many words that **this
check cannot see the condition and is not asked to** — it counts paths, and a
guarded path is still a path. Its markers are unmoved and its own break is
unaffected; the guard is held by the process test instead.

### Done when

1. **Met.** The join does not run with nobody attached — **0 joins over 500
   bursts**, counted by the producer itself. The guard is a `Map` field read and
   nothing on the path can throw.
2. **Met.** Two early returns, each opening with its own capitalised subject,
   each saying what the other is not.
3. **Met.** A behavioural assertion on the producer, its break, and the
   passing-wrongly transcript above.
4. **Met.** ADR 0038's dated amendment; the snapshot path recorded as
   deliberately unchanged in the ADR, in the code comment and here.
5. **Met.** Gate output below; the figure re-taken on both the tight and the
   gapped arm.

### Gates

Verbatim output is in the hand-back. `pnpm e2e` was **not** run, and the reason
is the change's own shape: the guard fires **only when `clients.size === 0`**,
and a browser spec is a browser attached — the condition is false for the whole
of every e2e run, so no browser can reach the changed branch. The directions a
browser _could_ see (an inverted or mis-scoped guard) are held by the two
existing attached-browser process tests, which go red on exactly that.
