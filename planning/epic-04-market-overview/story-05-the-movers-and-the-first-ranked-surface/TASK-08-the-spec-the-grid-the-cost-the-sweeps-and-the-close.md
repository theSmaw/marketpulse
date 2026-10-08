# Task 4.5.8 — The spec, the grid, the cost, the sweeps and the close

**Status:** Not started
**Story:** [4.5 The Movers, & the First Surface That Ranks by a Live Value](STORY.md)
**Depends on:** 4.5.7

## Objective

**What the suite can say about a ranking it did not compute, and what it
cannot** — and the close.

## What the user can see when this lands

**Nothing.** The story is finished and the next reader can find out why it is
built this way.

## Work

### The spec is a pass-through, and a furnished frame can see nothing

**Four overview specs passed against a server with the ranking deleted**, each
furnishing the order it then checked; Story 4.4 then found its own first-draft
guards green on the exact defect they forbid **twice more**. Copy
`overview-sector-ranking.spec.ts`'s `openWithRecordedStream`.

### A top-N is a SELECTION, not a reduction — and that makes it far more checkable than breadth

Breadth is irreducible: five integers reach the browser and nothing recomputes
one. **Every mover row carries its own key**, so the claim splits four ways:

| Sub-claim                                                      | Recoverable?                           |
| -------------------------------------------------------------- | -------------------------------------- |
| **(a)** the N rows are in descending key order                 | **from the frame**                     |
| **(b)** N distinct symbols, N rows                             | **from the frame**                     |
| **(c)** every row is in the population                         | **`GET /securities`**                  |
| **(d) the cut** — nothing outside outranks the smallest inside | the hard part, **and it is reachable** |

**Source 1 — `GET /securities`, which settles (d) COMPLETELY in the session
basis.** It carries `close` and `previousClose` for every security, so a spec can
compute the move for all 503, take its own top-N, and compare membership, order,
the cut and the figures against the frame. Copy the breadth spec's guard: filter
to **the session the frame names**, because the producer reads a closes cache
with its own window while the route reads the table. **Re-implement
`changePercent` and `directionOf` rather than importing them** — importing
asserts the application agrees with itself. It **skips** on the observed basis
and on CI, and the skip must print its reason by name.

**Source 2 — the snapshot beside the aggregate, which nobody has used yet and
which closes the observed basis.** `sendSnapshot()` sends the snapshot and
`overviewMessage()` **back to back with no `await` between them** — verified:
zero `await`s in the function — and `currentMarketState` is written only from
the socket callback, which cannot interleave inside a synchronous tick. **So the
snapshot is provably the input the aggregate beside it was computed from,
guaranteed by the event loop rather than by a tolerance.** A client subscribing
to all 518 receives every current observation; the grain rule forbids shipping
the 518-figure _aggregate input_, not a client asking for 518 _subscriptions_.

**State its limit in the instrument's own header, in these words**: it is the
same process and the same data, so it proves **nothing about the data** and
**everything about this story's new code** — the population split, the
comparator, the key selection, the cut and the N. A **throwaway Node client**
rather than a gated spec: injecting `subscribe [518]` from a browser spec changes
what the page receives and would perturb the cost measurement.

**Flag for the architect in the sweep:** that pairing's race-freedom is
load-bearing for this instrument, is held by nothing but the absence of an
`await`, and its comment today argues only that _on connect_ and _on subscribe_
must not come apart. It owes a line saying the pairing is also an **evidence**
guarantee, before somebody makes `overview()` async.

### The defects a furnished fixture cannot see — each owes an instrument and a break

An inverted comparator; a top-N taken from the wrong end; an off-by-one in the
cut; a `?? 0` reintroduced for an absent key; the population silently becoming
518; the two lists transposed; a figure landing on the wrong row; **a stale
close re-ordering the list** (`docs/GAPS.md`'s existing entry, where one stale
close produces **two** wrong positions and the displayed basis would not
disagree); and rounding introduced at a second site.

Two warnings: the **permutation-and-uniqueness triple** is needed, because a
`Set` comparison alone cannot see a symbol drawn twice — which is exactly what
an off-by-one in a sort that rebuilds its array produces. And **do not write the
wrong-end check as a sign assertion**: in a one-sided market the bottom of
gainers and the top of losers can both be negative, so it must be _two disjoint
lists whose keys interleave in exactly one way_.

### AC 6 — the cost, as a measurement and never a gate

Two halves, labelled, and say which was proved. **Backend**: n ≥ 400 timed after
≥ 300 warm-up, two reproducible runs, all 518 observed — **the worst case,
against ~332 in a median minute** — median/p95/max, against Story 4.4's 3.497 ms
baseline and with the movers computation removed as a control. **Browser**: a
production build, `PerformanceObserver({entryTypes:["longtask"]})` installed
**before navigation**, ≥ 40 bursts with the whole population changing, net of a
control, with the load average at start and end.

Three traps. **"Every row changing" is ~20 rows and that is the cheap half** —
the cost is the 503-entry ranking and the re-render it triggers; make the
**population** change. **A synthetic all-at-once tick measures a state the
market never delivers** (243 ms p50 spread, n=445) — fine as a ceiling,
dishonest as a figure, so say which. And **§28's own criterion is blind to real
regressions**: `docs/GAPS.md` records a change costing **17× the CPU on the
pointer path** that produced no long task at all, so measure script per tick and
not only `longtask`.

**Quote verbatim before deleting**: one whole overview frame carrying a
populated movers section as the gateway wrote it, with its byte length; the raw
per-tick samples, not only the median; the `longtask` entries as reported,
**including the empty case** (zero entries is a finding and reads identically to
an instrument that was never wired); and the control's own samples.

And **count by URL, never by event** (the 2026-09-25 withdrawal), and **drain a
page buffer with `splice` in place** (the rebind that reported a silent socket
on a healthy connection, through a rehearsal recorded as clean).

### The state grid, produced rather than reasoned about

Every state × four widths × three renderings, through the shipped socket path.
It has found something **every time**: two states in 4.2, five in 4.3, **ten** in
4.4 including two shipped defects. Cover at least: N = 0 (CI's permanent state),
N = 1, one short of the cut, exactly at the cut, **more ties at the cut than rows
remaining**, the one-sided market both ways, a figure reading exactly `0.00%`,
both bases, a mixed observed/stored frame, the section refused vs absent vs no
frame at 600 ms vs at 12 s, the denominator at 466 / 446 / **298**, the
reservation past the floor, the four hold states, and reduced motion over
everything that moves.

**And the two things the grid is for that are not states**: the **390 clip** —
both existing clipping entries were found by photographing, and `textContent` is
identical whether a string wraps, clips or overflows, so **open the screenshots**
— and the **height**, confirmed at all four widths.

### The sweeps

**Upward**: `PRODUCT_SPEC.md` §9's sketch has **no movers region at all** and
§8.1's list does not mention gainers or losers, while `EPIC.md` line 21 does —
so §9 owes a dated amendment in §8.1's and Story 4.4's idiom. Check ADR 0038's
amendment from 4.5.4 still reads true against what shipped.

**Sideways**: grep every `Story N.M` and `Owner:` line and **record the count
that were missing** — and do the second pass Task 4.4.8's finding recommends:
**walk the epic's own story list and ask of each whether this story measured
anything it acts on**, because the prescribed grep enumerates only the siblings
a story happened to _mention_, and in 4.4 it missed **two of five**, which were
the two with the most substance. Story 4.6 is the obvious one — it makes these
rows navigate, and this story's two-list keyboard model, the roving-`tabIndex`
question and the disjointness guarantee are all things 4.6 acts on.

**`docs/GAPS.md`**: the candidates are named in the shaping and are at least —
the cut checkable only where the input is recoverable; **no gated machine has
ever seen a mover**; the day's biggest mover may be a name we never heard from;
a ranking over a one-venue tape; the stale-close entry **amended in
consequence** for a top-N's larger blast radius; the adjacent-rank gap
distribution; the 390 clip; AC 6's one machine on one afternoon; and an eighth
screen-reader entry — two `<ol>`s re-ordering unprompted doubles the standing
unanswerable about whether a polite update queues or replaces.

**Anything that can be made mechanical is made mechanical instead.**

### The close

`STORY.md` status; `CLAUDE.md`'s _Current state_; Gate 2.

## Done when

1. A pass-through spec asserts (a), (b) and (c), and goes red when the producer
   stops ranking
2. Both independent-source instruments exist, each stating what it cannot prove,
   each quoting a frame verbatim
3. The grid exists at four widths in greyscale and deuteranopia, with the
   producer walk run and its findings recorded
4. AC 6 is measured on a production build with a control, both halves labelled
5. The sideways sweep's miss count is recorded, **including the second pass over
   the epic's story list**, and §9 carries its dated amendment
