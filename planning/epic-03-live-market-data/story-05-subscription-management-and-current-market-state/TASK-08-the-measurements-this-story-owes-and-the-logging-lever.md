# Task 3.5.8 — The measurements this story owes, and a logging decision that reverses here

**Status:** Not started
**Story:** [3.5 Subscription Management & the Current Market State](STORY.md)
**Depends on:** 3.5.2, 3.5.6, 3.5.7

## Objective

Criterion 7: **message rates and memory measured at universe scale against the
figures Story 3.1 took, with the difference explained rather than noted.**

_Explained rather than noted_ is the whole instruction. A figure that has moved
looks exactly like a figure that was mis-recorded, and only rebuilding the old
commit tells them apart.

## What the user can see when this lands

**Nothing.** This is a measurement task, and it is deliberately scoped so it
does not become an evening: **confirm what is already recorded rather than
re-derive it**, and take only the figures that are genuinely new at 518.

## What is already measured, and must NOT be re-taken

Take these from [`LIVE-DATA.md`](../story-01-live-data-decisions-and-the-streaming-spike/LIVE-DATA.md)
and confirm they still hold rather than reproducing the work:

- **1,500 symbols accepted in 305 ms**, 5,000 in 867 ms (§4.3)
- **0.2 MB** for the current-state map at universe scale (§10.3)
- **65.1%** median minute coverage, **2.1%** for `ERIE` (§7.6)
- **p50 gap one minute, maximum 187** (§11.2)
- **332 bars in 243 ms** (§7.4)
- Revisions: **0.064%** of bars, **29.1–30.1 s** late, **35.3%** changing the
  close (§14.1)

## What is genuinely new at 518, and is this task's to take

- **Process memory across a full session** with the universe subscribed and the
  current-state map live — the figure that decides whether §10.3's 0.2 MB
  estimate survives contact with 518 real entries plus the fan-out
- **Message rate into the gateway at the open**, which is where coalescing
  earns its keep and where the per-client filter is under the most load
- **Fan-out cost**: one observation × N clients, at a client count worth
  defending rather than one
- **Whether §28's 250 ms p95 is measurable yet.** Story 3.4 found it is **not**
  — no wire message carries a server-side instant, recorded as `docs/GAPS.md`
  entry 12 and owned by Story 3.11. **Check whether this story's work changes
  that**; if it does not, say so and leave the entry standing rather than
  re-deriving the same dead end.

## The logging decision that reverses here

Task 1.12.6 declined `ignore: "reqId,pid"` on pino-pretty after measuring that
**51 request pairs across two windows were every one adjacent** — two requests a
minute per tab does not interleave.

**The stated reversal trigger is this epic's socket**, and it fires **in this
story rather than in 3.2**, because this is the first point at which more than
one thing is in the log at a time. The lever is worth **156 → 101 columns**.

Re-measure the interleaving before pulling it: the trigger is a condition, and
confirming the condition has actually fired is the difference between honouring
a reversal trigger and citing one.

## Work

- Take the four new figures above, each with the method beside it
- Confirm the six existing figures rather than re-deriving them; record the date
  of confirmation, not a new measurement
- Re-measure log interleaving at universe scale; pull the `ignore` lever if the
  trigger has fired, and record the column count either way
- Explain every difference from Story 3.1's figures, including the ones that did
  not move

## Done when

1. Four new figures recorded with their method
2. Six existing figures confirmed or corrected, dated
3. The logging trigger evaluated with evidence, and acted on or explicitly not
4. Any figure that falsifies a governing document is **swept the same day** —
   falsification travels upward, and a story close sweeps only this story's own
   documents
5. `pnpm verify` passes

## Scope discipline

**Be pragmatic about what is re-measured.** The instruction on Task 3.4.8 was
that a measurement task must not take hours, and it was honoured there by
confirming three existing figures rather than re-deriving them. Same here.

---

## Handed here by Task 3.5.3 — 2026-09-21: the replay reads one symbol at a time

**Written into this file rather than left in 3.5.3's record**, because a
constraint one task measures for another lives in a file the owning task does
not read. That failure has happened twice already in this epic.

### What was measured

`replay-bar-source.ts` fills its window with

```ts
for (const symbol of symbols) {
  const bars = await repository.readBars(symbol, "1m", range);
}
```

— **one query per symbol, sequentially.** At five symbols that was invisible.
At 518 it is the dominant cost of a fill.

Against the local store on 2026-09-21, 48.8 M bars, a 30-minute window:

| Read pattern                                              | Time         | Rows   |
| --------------------------------------------------------- | ------------ | ------ |
| One symbol — what the replay does, **518 times per fill** | **2.193 ms** | —      |
| The same window across all symbols, **one query**         | **335.5 ms** | 14,685 |

So a fill is roughly **1.1 s** of query time at 518 symbols versus **335 ms**
for the same data in one round trip — and the sequential figure excludes
per-query pool overhead, so it is a floor rather than an estimate.

### Why it was not fixed there

ADR 0030 makes the replay a **development instrument that never runs in
production** (7a–7d), so this is a `pnpm dev` cost and not a deployed one. It is
a **startup and window-boundary** cost rather than a per-minute one, so watching
a page at 1× is unaffected — which is all Tasks 3.5.4 and 3.5.5 need from it.

Fixing it is a change to the replay rather than to the subscription, and
3.5.3's scope was the subscription.

### What this task owes it

- **Decide** whether to batch the read — one query across symbols, grouped by
  instant in memory, which is the shape `fill()` already builds anyway
  (`byInstant`)
- If it is left alone, say so with the figures rather than silently
- **Re-measure rather than cite the table above.** These are dated observations
  of one machine's store

### One measurement this task no longer owes, and a lesson it should record

**The snapshot size is done.** Task 3.5.4 read it off a real message rather than
constructing one: **58,218 bytes — 56.9 KiB** for 518 securities, taken from a
running gateway with an attached `ws` client.

**The figure was wrong twice before that, in both directions:**

| When          | Figure       | How it was arrived at                         | Error        |
| ------------- | ------------ | --------------------------------------------- | ------------ |
| 3.5.2's sweep | ~50 KB/min   | estimated                                     | **40% low**  |
| 3.5.3's sweep | 70.2 KiB     | computed from a constructed `WireObservation` | **23% high** |
| 3.5.4         | **56.9 KiB** | **read off the wire**                         | —            |

The second was _more careful_ than the first and no more accurate, because both
reasoned about a shape rather than reading one — the constructed version used
five-character symbols and real tickers are shorter. **That is the entry worth
carrying forward**: a computed figure is not a measured one however carefully it
is computed, and `CLAUDE.md`'s _a tolerance is measured, never argued_ earned
its wording twice over inside a single story.

**Still to measure here:** the per-minute fan-out cost at a realistic client
count, and whether the 56.9 KiB figure holds late in a session when every one of
the 518 has been observed.
