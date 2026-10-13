# Story 5.1 — The Decisions, the Adjustment, & `Relative performance` Drawn

**Status:** In progress — 2026-10-13
**Epic:** [Epic 5 — Anomaly Detection](../EPIC.md)
**Depends on:** nothing — this is the epic's first story
**Epic scope covered:** market-relative movement, sector-relative movement

## Description

**This story takes the decisions the rest of the epic cannot start without, and
pays for them with the one factor that needs no history at all.**

Epic 4's shape is the model: Story 4.1 took four decisions and shipped the
shell, so the expensive unknowns were off the critical path of every story after
it. Epic 5's expensive unknowns are a **60-day baseline pass measured at 4–13
minutes of cold I/O**, an **unmeasured tape ratio** behind the volume factor,
and a **corporate-action problem the store cannot solve**. None of them blocks
the relative-move factor, which is why that factor is here.

**`Relative performance` is the cheapest visible surface in the epic and it is
already reserved.** `SecurityExplorer.tsx` draws a region whose own sentence is
_"This security measured against its sector proxy and the broad market, so a
move can be told apart from a tide."_ The join already computes
`changeFromClose` for all 516 securities every applied batch, so the security's
move, its sector benchmark's and `SPY`'s are **three reads from figures already
on the wire** — the 0.118–0.123 ms shape rather than the 1.29 ms per-security
derivation shape.

**And it carries one row of schema whose cost is not effort but irreversibility.**

## The decisions taken at Gate 1 — 2026-10-13

Recorded here because five of the eight are the reason the later stories are
shaped as they are, and a decision re-litigated in story four is a decision
nobody took.

**1. Corporate actions: ask the provider for adjusted bars.** `STORED_BAR_ADJUSTMENT`
is `"raw"` and the store **never** rewrites a bar for a corporate action,
because that is what Epic 13's replay needs. `PROVIDER.md` §3.4 names this epic
as the stronger reader and quantifies the failure: an unadjusted 10-for-1 split
is a **−90% return that sits at the 100th percentile of every distribution it
touches**, producing a permanent, confident, entirely false anomaly. §3.6 calls
a split inside the window _"likely, not hypothetical, at any realistic history
depth"_, and the minute store is a year deep.

**Two live documents disagreed about whose problem this is** — `PROVIDER.md`
§3.1 says an adjusted series is obtained by **asking a provider for one**,
`market-bars.ts` says Epic 5 _"will have to adjust for themselves"_ — and that
contradiction is resolved here in favour of the provider. The baseline fetches
a **split-adjusted** series for its window; the store stays raw; our arithmetic
is not on the path. **The reason the alternative was refused is §3.5**: a series
spanning no corporate action returns identical numbers either way, so a wrong
adjustment argument is **invisible in testing and wrong exactly once**, on the
one name and the one week somebody is looking at.

**2. The price percentile is a MAGNITUDE percentile.** §11's prose says
_"compare current 5-minute return to historical 5-minute returns"_, which is
signed — but its own example, `-2.1%` at the **99.1st percentile**, is
arithmetically consistent only with a percentile of **|return|**: a −2.1%
return sits near the _first_ percentile of a signed distribution. A signed
one-tailed percentile would score a crash ~1 and a rally ~99, which is a
**directional judgement inside a number §11 says in terms must not represent
risk or opportunity**. Direction lives in the explanation.

**3. The distribution is POOLED across the session, not per time-of-day
bucket.** Per-bucket gives **60 samples**, whose finest expressible percentile
is **1.7%** — so §11's own `99.1%` could not be said and the 99th percentile
_would be_ the maximum. Pooled gives **4,680 samples** per security and 0.02%
granularity. **The known cost is stated rather than discovered**: the open is
structurally the fattest-tailed bucket, so a pooled percentile reads a market
open as more unusual than it is, and the explanation must say so.

**4. Breadth is CONTEXT in the explanation, not a scored factor.** §11 says
_"normalize the preceding factors"_ over all four, and this epic ships three
scored factors and a stated breadth clause. The reason is structural rather
than a preference: **breadth is a property of a group, so it is identical for
every member of that group** — it cannot order securities within a sector, and
weighting it correlates the whole group's scores so a ranked list fills with
one industry, which is close to the opposite of _unusual for this security_.
`PRODUCT_SPEC.md` §11 gains a dated amendment, the way §9 carries Story 4.4's
refusal of percentages.

**5. The score is ABSOLUTELY calibrated against each security's own history**,
not a cross-sectional rank against today's universe. A cross-sectional rank
**guarantees a 91 exists every day, including a dead one** — a confident claim
of extreme unusualness over nothing, which is ADR 0029's false impression in
the one number this epic is about, and it makes the figure incomparable between
days. **The honest cost is this epic's exit criterion**: `NVDA — Anomaly 91` is
**not producible on demand**, and Story 5.7 rewrites that criterion as a shape
rather than a number.

**6. The band is renamed `unusual` → `high`**, giving
`normal / elevated / high / extreme`. `Unusual activity` is the region's name
in `PRODUCT_SPEC.md` §8.1 and §9, the shipped route, `landing-route.spec.ts`'s
region list and `CLAUDE.md`; `unusual` as one band of four inside a region
claiming all four are unusual activity is a collision, and the ladder does not
read monotonically. The band is **consumed by nothing shipped**, so it is far
the cheaper repair. The boundaries stay undecided until Story 5.6.

**7. `Anomaly history` is deferred out of this epic with a condition**, not
scheduled. It is the only surface needing scores **written down** — a new
table, a migration against a store with a live per-minute writer where
`ALTER TABLE` takes `ACCESS EXCLUSIVE` and one has waited 18.16 s behind an
open write transaction, plus an unasked backfill question. **Condition: the
first surface that needs a score older than the process.** Its region stays
`reserved` and keeps naming this epic.

**8. No anomaly score in the 518-row universe table, and the refusal is
written down.** §9 specifies `Unusual activity` as **a short list, not 518
rows**, and a top-N fires neither of Epic 14's two frontend conditions.
`SecurityRow.tsx` **already composes `<AnomalyBadge band={band} />`**, so the
edit that fires the original trigger is twenty minutes long — and
`EPIC.md`'s own warning is that _a condition that takes a day to fire gets
noticed; one that takes twenty minutes does not._ **Corrected figure, because
`EPIC.md` overstates it**: at Task 4.8.6's measured ≈3.9 µs a node, a badge on
518 rows is ~1,036 nodes ≈ **+4 ms**, an ~8% node increase — not the "two
helpings of a fifty-millisecond task" that file describes. The trigger still
fires categorically and the refusal stands on §9, not on the figure.

## What the user can see when this story lands

**On `/securities/:symbol`, the first of this epic's three reserved regions
stops being a placeholder.** `Relative performance` draws the security's own
move beside its **sector benchmark ETF's** and **`SPY`'s**, with the excess
stated, so a reader can tell a security-specific move from a tide.

**Nothing on `/` changes**, and nothing is scored yet — there is no 0–100
figure anywhere until Story 5.6.

## Acceptance criteria

1. `Relative performance` draws, for the selected security, its own move, its
   **sector benchmark's** move, `SPY`'s move, and the **excess** against each —
   from figures the join already produced, with **no new per-security
   derivation** in the socket callback.
2. **One basis per comparison.** A live price is compared with a live
   benchmark, or a close with a close, **never one of each** — the two-basis
   defect `changeFromClose` and `sharedBasis` already exist to prevent. When
   the benchmark has not been heard from in the window, the comparison is
   **refused** rather than substituted.
3. **The reference's kind is named on screen.** A sector SPDR is
   **capitalisation-weighted**, so a mega-cap is largely being compared with
   itself and a small constituent's excess is structurally amplified. The
   region says what the reference is; whether the **scored** factor later uses
   the ETF or an unweighted **industry peer median** is Story 5.6's decision
   and is recorded, not assumed.
4. **`classification.checkedOn` is visible wherever a sector is named.** It
   reads `2026-09-08` and has not moved; `UNIVERSE.md` §5's drift table names
   this epic — _"Epic 5 compares it against the wrong benchmark … indefinitely,
   and correctly-looking"_ — and the visible date is the only mitigation.
5. **Point-in-time universe membership is written from this story onward.**
   `securities` gains `tracked_from` / `tracked_to` (or a small membership
   table), additive, catalogue-only on a 518-row table, written by the universe
   loader on a status transition. `CLAUDE.md`'s invariant 4 qualification names
   anomaly scores explicitly, and **the cost of deferring is not effort — it is
   history that cannot be reconstructed, only written from the day somebody
   starts.**
6. Every factor function is **pure**: `asOf` and the observations are
   arguments, and it reads no clock, no socket and no repository handle —
   `marketBreadth`'s shape, which is what makes invariant 4 structural here.
7. `PRODUCT_SPEC.md` §11 carries a **dated amendment** for decisions 2, 3, 4
   and 5; `packages/shared/src/anomaly.ts` and `AnomalyBadge` carry the rename;
   `PROVIDER.md` and `market-bars.ts` carry a dated note resolving their
   contradiction.
8. The eight decisions above are recorded with their alternatives and, where
   one applies, a **reversal trigger that is a condition** rather than a story
   number.

## Gate 1 — the task list approved, 2026-10-13, and four more decisions

**Six tasks**: 5.1.1 the decisions and the band rename · 5.1.2 the rail drawn
on the canvas · 5.1.3 the comparison computed, drawn and refused · 5.1.4 the
states, the fifth noun and one height · 5.1.5 point-in-time membership ·
5.1.6 the sweeps and the close.

**Two of these decisions amend acceptance criteria written above**, which is
recorded here rather than by editing them silently.

**9. AC 2's staleness clause is DROPPED. The basis refusal stands.** As
written — _"when the benchmark has not been heard from in the window, the
comparison is refused"_ — **it has no implementation that does not cross a
governed boundary**, and that was found by shaping rather than by building:

- `overview.figures` and `overview.sectors` have **no freshness expiry at
  all** — ADR 0040's Consequences record it as a dated, accepted asymmetry —
  and `eligibleMoves` runs over the **equities only**, so **no backend
  eligibility verdict exists for `SPY` or any `XL*`**.
- A window computed in the frontend is **red** against
  `one-home-for-the-observation-window`, which permits exactly one
  minute-scaled cutoff, in `market-breadth.ts`. That check's own docblock
  records its draft being planted against `apps/backend/src/market-unusual.ts`
  — _"the file Epic 5 writes"_ — and **passing**.

So the region refuses on **mixed basis, absent figures and disagreeing
closes**, all decidable from fields on the wire today, and **does not refuse on
age**. The gap is recorded in `docs/GAPS.md` in ADR 0040's own terms: bringing
the fifteen funds inside the window _"is a product decision about what the top
of the screen says during an outage rather than a correctness repair"_. The two
alternatives were priced and refused here — widening `eligibleMoves` moves `/`'s
already-photographed proxy strip and sector rows and crosses ADR 0038's
one-producer rule; comparing a figure's own `at` against the frame's
`observedAt` uses two market facts and no process clock but is still a second
cutoff.

**10. On `/securities/SPY` and `/securities/XLK`, the region draws what applies
and says what does not.** Both are reachable routes and **the type forces a
branch**: an `index_etf` has `sector: null`, so there is no sector benchmark; a
`sector_etf` **is** its sector's benchmark, so the comparison is with itself.
Hiding the region on those fifteen routes was refused — no other region on this
page changes by security kind, and ADR 0039's unconditional tab stop would make
it a disappearing landmark.

**11. AC 4 is satisfied by the source note, and owes a mechanical check rather
than a second copy.** `SourceNote` already draws
_"Sector and industry are curated, not from the market feed"_ and
_"Last checked 8 September 2026"_ on every security page that resolved a
security. One fact, one home (ADR 0029), and the grain rule puts _where did
these numbers come from_ at **per screen**. **But _satisfied by construction_
is exactly the claim `CLAUDE.md` says reads identically whether the mechanism is
there or not**, so AC 4 now reads: the region naming a sector-derived reference
and the note's date are **asserted co-present**, with a `pnpm break` written as
the defect the next author writes — a region resolving its benchmark from a
sector slug without the universe answer loaded.

**12. The scale gains `±25` and `±50` and ratchets up only within a session.**
The sector ladder's `±1/2/5/10` saturates on a single name — a security moves
20%+ on an earnings day — and **a clipped subject beside an unclipped reference
tick makes the difference unreadable from the picture**. The rung is chosen from
`max(|subject|, |sector|, |market|)` and is **raised but never lowered** during a
session, because a bracket that rescales under a reader is worse than a bar that
does, which is `/`'s own argument. When anything clips the printed figures stay
exact and **the bracket is simply not drawn** — a bracket between a clipped end
and an unclipped tick is a _wrong_ length rather than a saturated one.

### Two corrections to this story file, found by shaping

**The sector→benchmark pairing needs nothing shipped.** `SECTOR_ETFS`,
`SECTOR_BY_ETF`, `sectorOfEtf` and `SECTOR_LABELS` are already in
`packages/shared` and **already imported by the frontend** —
`UniverseTable.tsx` does `benchmark: SECTOR_ETFS[sector]`. Adding a `benchmark`
field to the wire figure would be worse than useless:
`one-pairing-of-a-sector-and-its-benchmark` would not see it.

**The shared-column promise is a `≥74rem` claim.** `SecurityExplorer.module.css`
is a three-column span grid with `grid-auto-flow: row` and no named areas. At
≥74rem the arithmetic does put the three Epic 5 regions in column 3, rows 1–3.
**At `<74rem` `.wide` collapses to `span 1` and they scatter** — two to column 2
and `Anomaly history` to column 1. The code comment's _"rather than landing in
three unrelated corners of the page"_ is **true at 1440 and false at 1024**, and
nothing asserts it either way. The idiom is therefore stated as adjacency at
≥74rem and as **order** below it.

## Design work

`Relative performance` is a reserved region with a written promise and no
drawing. Three figures and two excesses need a layout that reads as a
comparison rather than as three prices — and the three Epic 5 regions **share a
column deliberately**, so this story sets the column's idiom for the two that
follow. **`MARKET-OVERVIEW.md` §1.3's reversal trigger — _two regions where one's
figure is read against the other's_ — has never been evaluated for
`/securities/:symbol`**, whose layout differs from `/`; this story owes it a
probe and a written verdict.

## Out of scope

Any 0–100 score, any band on screen, any percentile, the volume factor, the
baseline, and `Unusual activity` on `/`.
