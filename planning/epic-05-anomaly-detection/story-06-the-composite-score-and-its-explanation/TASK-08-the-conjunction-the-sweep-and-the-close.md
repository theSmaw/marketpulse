# Task 5.6.8 — The conjunction, the sweep, and the close

**Status:** **Complete — 2026-10-29** — the conjunction is **not on `/` at all** and `overview-degraded-grid.spec.ts` was the wrong home; **56 photographs** prove the chip-against-chrome greyscale step is **1.000**, larger than the ramp it sits inside; the sideways sweep was **4 of 6 missing**; and my own _adjacent at 390_ claim is **false at every width**.
**Story:** [5.6 The Composite Score, & Its Explanation](STORY.md)
**Depends on:** 5.6.7

## Objective

A collection of completed tasks is not a completed story — and this story leaves
one design question that **cannot be settled by reading** and must be settled by
photographs.

## What the user can see when this lands

**Nothing new**, unless the amber decision changes a token.

## Work

- **The amber conjunction, into the kept grid.** Four tokens resolve to
  `--palette-amber: #e2b544`: `--anomaly-high`, `--feed-stale`,
  `--service-degraded`, `--provenance-synthetic`. The status bar is **sticky**, so
  a drawn chip and a `STALE` cell are **always co-visible** — adjacent at 390,
  ~700 px apart at 1440. **Chip-against-chrome greyscale step is 1.00**, so no
  greyscale simulation of the region alone can show it.
  - **Rows into `overview-degraded-grid.spec.ts`** (a **kept** spec — Task
    3.10.9's grid was deleted and took a repair with it that had to be re-derived
    two epics later; **add rows, do not restructure**): `high` × stale, `extreme`
    × stale, `high` × backend degraded, `high` × both, `high` × synthetic, and a
    **control** with no chip. Four widths, colour **and** greyscale.
  - **Whole-viewport, never region-scoped** — a crop is the one picture that
    structurally cannot show this.
  - **Say in the spec's header that these are FURNISHED**, produced through the
    shipped socket path like Task 4.7.9's thirteen states, because on CI every
    score is absent for ever. Otherwise the first reader takes a green flagged
    run as proof the collision was examined.
  - **The architectural cost of a repair is zero and that is the useful fact for
    Design**: every consumer reads the semantic token, never `--palette-amber`,
    and `market.css` says the indirection exists for exactly this move. Moving
    `--service-degraded` is **one line**; no component moves.
  - **The two tokens are not symmetric.** `--provenance-synthetic`'s amber has a
    **safety** argument — a fixture-backed deployment advertising itself
    structurally rather than by somebody remembering a banner — so it stays, or
    moves **louder**, never quieter. Recommend moving `--service-degraded` only.
  - **If anything moves, add both names to `TOKEN_NAMES` in the same change.**
    Neither is there today, so the startup throw does not cover them and a
    `var()` resolving to nothing renders an **invisible marker with correct DOM
    and a green `verify`**.
- **Sweep upward**: every figure this story falsified, same day. At minimum
  `anomaly.ts`'s boundaries docblock, `MARKET-OVERVIEW.md` §1.4's trigger count,
  and `unusual-activity.ts`' now-false _"`AnomalyBadge` is imported by no shipped
  route and stays that way"_.
- **Sweep sideways by grepping for every `Story N.M` and `Owner:` line**, check
  each against that story's own file, and **record the count that were missing**.
  Prior art: 5.4's close was 1 of 4, 5.5's was **3 of 3**, and 5.5's next-day
  sweep found a 4th. **Known already**: Story 5.7 (the AC 7 contradiction over
  `substantially`, plus `LIVE-REHEARSAL` row 5.6); Epic 7 (the ledger is a
  complete explanation **only** beside the factor bands — any surface drawing
  this score without them owes its own account); Epic 14 (which clause fired and
  which did not).
- **`docs/GAPS.md`** for every claim left standing, and anything mechanisable
  made mechanical instead. At minimum: no gated machine and no person has seen a
  composite drawn; **the score is checkable against nothing on screen and is
  strictly worse than the percentile** — its inputs are two such figures plus
  weights, so **the explanation's internal addition is the only check that will
  ever exist**; and whether `extreme` is reachable at all, with a condition (the
  first week in which no security reaches the top band).
- **`LIVE-REHEARSAL.md` row 5.6** — the sixth this epic owes. Row 5.5's
  _unwatchable_ precedent applies to the volume term; the **score itself is
  watchable** once two factors are present, which is a stronger row than 5.5's.
- **`STORY.md`, `MARKET-OVERVIEW.md`, `CLAUDE.md`'s Current state**, and the
  subject document. ADR **0046** — one ADR with three parts (the weighted sum and
  its four refused alternatives; no imputation / no renormalisation / the factor
  count in the identity; the score and explanation as one object with its
  guarantee ending at the wire), each with a **condition** as its reversal
  trigger. Not three ADRs: ADR 0038 refused that for the stated reason that _"a
  second ADR would be a second home … and would make the misattribution
  permanent by giving it somewhere plausible to point."_
- ADR **0044** gets a **third dated amendment** (third application), and the
  `*_passes` convention should become a **mechanism** — a stated convention in
  `apps/backend/migrations/README.md` plus an invariant that every DERIVED table
  keyed on `(…, observed_at[, feed])` has a sibling passes table. **Not** a shared
  `derived_aggregate_passes` table with a discriminator: the three pass rows carry
  differently-typed columns, which is 0044's own argument against widening.

## The sideways sweep — enumerated 2026-10-29, and it was 4 of 6 MISSING

Grepped this story's eight task files and its `STORY.md` for every `Story N.M`,
`Epic N` and `Owner:` line, then checked each against **that** story's own file.
The count, because this repository's rule is that the count is the finding:

| Named                       | Carried in its own file?                    | Written                                                                                                                                                                                                                                                           |
| --------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Epic 6** (topology)       | **No — nothing**                            | The band floors are a **two-factor, max-75** scale with a trigger a topology fires; `--anomaly-normal` exists **for this epic** because a canvas cannot render _no chip_; ADR 0045's **restated** test; and that the permission is **conditional on the mapping** |
| **Epic 9** (filings)        | **No — nothing**                            | ADR 0045 names this epic by name, and **its wording changed**: extensive vs intensive, so a filing-day **return** is permitted and a filing-day **volume** is refused, with the 12–45× measurement behind it                                                      |
| **Epic 13** (replay)        | **No — nothing**                            | `0017` is a **fourth** derived table whose `observed_at` name exists **for this epic**; the `atOrBefore` frontier trap and the live defect it already produced; and that a **replayed ranking** before 2026-10-12 must refuse                                     |
| **Epic 7** (investigations) | **No — nothing**                            | The ledger is complete **only beside its factors**, so any other surface owes its own account; and `Popover` is **deferred by name**, with the test for when to reach for it                                                                                      |
| **Story 5.7** (the close)   | **Partial** — only Gate 1's AC 7 refinement | The rehearsal row and that it is the **first fully watchable** one; the measured band distribution; the exit criterion's two corrections; the volume arm's paired triggers; and the undrawn sentence to verdict                                                   |
| **Epic 14**                 | **Yes, and complete**                       | Already carries the measured figures, the fifth non-firing, **and** the withdrawn lower-bound caveat — written by Task 5.6.7 itself                                                                                                                               |

**4 of 6 entirely missing, 1 partial, 1 complete.** Against Story 5.4's 1 of 4
and Story 5.5's 3 of 3, this is the worst absolute count the epic has recorded —
and the shape is the same every time: **each miss is a document this story never
opened**, so nothing about writing its own close would have reached any of them.

**One thing worth noting about the one that was complete.** Epic 14's entry was
written **by the task that measured it**, at the moment it had the figures —
not at a close. That is the only mechanism in this story that worked, and it
worked because the hand-off happened **where the measurement was taken** rather
than being deferred to a sweep.

## Done when

1. The conjunction rows are in the kept grid, furnished and labelled as such,
   whole-viewport, colour and greyscale.
2. The amber decision is taken **with the photographs in hand**, or explicitly
   deferred with a condition.
3. The sideways sweep is enumerated and the missing count recorded.
4. ADR 0046 exists with three parts and three conditions; 0044 amended.
5. `LIVE-REHEARSAL.md` row 5.6 states what is watchable and what is not.
6. `pnpm verify`, `pnpm test:database`, `pnpm e2e` at two workers — all green.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — the conjunction rows, 2026-10-29

**The conjunction is NOT reachable from `/` and this task's own work item was
written against a tree that no longer exists.** Task 5.6.7 moved the band off
`/`'s rows — it is now a **word in the region heading with no fill** — and
`Unusual.tsx` already records the consequence in as many words: _"there is no
amber on `/` again … the collision stays Story 5.6's and is unreachable from
`/` — Task 5.6.8 photographs it on the security page, where the chip is."_
Verified rather than taken on trust: `AnomalyBadge.module.css` is the only
shipped stylesheet that reads the ramp (`amber-appears-once-in-the-rail`), and
`AnomalyBadge` is imported by exactly **one** shipped component,
`AbnormalMove.tsx`, which draws on `/securities/:symbol` alone.

**So `overview-degraded-grid.spec.ts` is the wrong home and was not touched.**
The rows are a new kept spec,
[`e2e/specs/security-amber-conjunction.spec.ts`](../../../e2e/specs/security-amber-conjunction.spec.ts).

### Seven states × four widths × colour and greyscale = 56 photographs

`AMBER_CONJUNCTION_PHOTOS=1 pnpm e2e security-amber-conjunction.spec.ts`, into
`.capture/security-amber-conjunction/` beside a `readings-<width>.json` per
width. `high` × stale, `extreme` × stale, `high` × degraded, `extreme` ×
degraded, `high` × both, `high` × **synthetic venue**, and a **control** with
every factor absent and no chip.

**Viewport captures and deliberately NOT `fullPage`**, which inverts the kept
grid's idiom on purpose: a full-page capture un-sticks the status bar, and the
bar's stickiness is the entire claim.

**FURNISHED, said in the spec's own header** — every score is written by the
spec, crossing the shipped encoder, decoder, socket route and renderer. On CI
every member of the `return` frame refuses for ever, so a green flagged run is
**not** evidence the collision was examined.

### The measured figures

Greyscale contrast, by the method that **reproduces `market.css`' own
1.12 / 1.43 / 1.59 to three decimals** (a calibrator asserted in the spec; the
sRGB-space alternative gives 1.13 / 1.49 / 1.65 and does not):

| pair                                    | step      |
| --------------------------------------- | --------- |
| chip `high` → any chrome amber mark     | **1.000** |
| chip `extreme` → any chrome amber mark  | **1.587** |
| chip `elevated` → any chrome amber mark | **1.426** |

Chip-to-chrome separation, centre to centre, **measured rather than quoted**:
**467–745 px** at 390, 631–674 at 768, 513–751 at 1024, 564–1107 at 1440. The
two **chrome** marks are **44 px** apart at 768 and **117 px** at 390.

**Four amber positions, not three**, and the fourth was not in the brief:
`UniverseTable.module.css` spends `--service-degraded` on its own
`.markerAttention`, so `/securities` has one too. The conjunction's richest
surface is `/securities/:symbol`, where the sticky bar can hold `--feed-stale`,
`--service-degraded` **and** `--provenance-synthetic` at once.

### Channels other than hue, as found

- **ENCLOSURE** — the chip contains its own band name; the chrome marks contain
  nothing and are `aria-hidden` silhouettes beside a sibling word. The strongest
  separation of the three.
- **SIZE** — `112 × 24` against `8 × 8`, measured at every width.
- **SHAPE** — square for `degraded` and `synthetic`, **disc** for `stale`. So
  `market.css`' _told apart by marker shape_ does **not** cover the feed pair:
  `live` and `stale` are both discs and differ by hue and by the written word
  alone.
- **POSITION** — sticky foot versus rail.

### Two defects this measurement produced

1. **A `serveFeed` with no snapshot draws an amber feed cell on arrival.**
   `feedStatusFrom` returns `stale` the moment `lastObservationAt` is undefined
   and the market is open, so three rows written to isolate the backend's square
   were silently _inside_ the conjunction. Caught only by the declared mark set.
2. **`Region` renders a bare `<section aria-label>`**, so `[role="region"]` does
   not match it and the first sweep filed the chip under `elsewhere`.

### Not repaired, and owed to the owner's decision

`--service-degraded` and `--provenance-synthetic` are **not** in `TOKEN_NAMES`
(`apps/frontend/src/styles/tokens.ts`), and neither is any `--service-*`,
`--provenance-*` or `--market-*` name — so the startup throw does not cover
them and a `var()` resolving to nothing would render an invisible marker with
correct DOM and a green `verify`. Left alone deliberately: this task's own work
item makes adding them conditional on something moving, and nothing moved.

### Gates

`pnpm typecheck`, `pnpm lint`, `pnpm invariants` (**74 hold**), the scoped spec
with and without the photograph flag (4 passed, 42.0 s and 49.0 s at two
workers), and `pnpm verify` **EXIT: 0** with no `Unhandled Errors` block.

## For a stakeholder — a status report, YYYY-MM-DD

## What was done — 2026-10-29

### The conjunction is NOT where every record of it said

**Verified three ways rather than assumed.** `amber-appears-once-in-the-rail`
proves `AnomalyBadge.module.css` is the **only** shipped stylesheet reading the
ramp; `AnomalyBadge` is imported by exactly **one** shipped component
(`AbnormalMove.tsx`); and `Unusual.tsx` already said so in as many words after
Task 5.6.7 took the chip off `/`.

**So `overview-degraded-grid.spec.ts` was the wrong home and was not touched.**
The rows are a new kept spec, `e2e/specs/security-amber-conjunction.spec.ts`.
**56 photographs** — 7 states × 4 widths × colour and greyscale — behind
`AMBER_CONJUNCTION_PHOTOS=1`.

**Viewport captures rather than `fullPage`, inverting the kept grid's idiom
deliberately**: a full-page capture **un-sticks the status bar**, which is the
one element whose stickiness _is_ the claim. The grid's own comment records that
artefact as harmless there; it is fatal here.

### The measurement, in this repository's own unit

**The method was calibrated against a figure the product already records** —
linearRGB greyscale (≡ WCAG relative luminance) reproduces `market.css`'s
**1.12 / 1.43 / 1.59 to three decimals**, where the sRGB alternative gives
1.13 / 1.49 / 1.65 and does not. The calibrator is **asserted in the spec**, so a
later reader cannot take a figure in the wrong unit.

| pair                               | step      |
| ---------------------------------- | --------- |
| chip `high` → **any** chrome amber | **1.000** |
| chip `extreme` → any chrome amber  | 1.587     |
| chip `elevated` → any chrome amber | 1.426     |

**The collision is larger than the ramp it sits inside**: `high` against the
chrome is **1.000**, against its own neighbour `elevated` **1.426**.

### Four corrections to my brief, and the first is the one that matters

1. **_Adjacent at 390, ~700 px at 1440_ is FALSE at every width.** Measured
   centre to centre: **467–574 px at 390, 564–1107 px at 1440**. The chip is in
   the rail and the chrome in a sticky foot, so they are **never** adjacent.
   What _is_ 44–117 px apart, at 768 and 390, is the two **chrome** marks. Both
   copies of the claim are corrected.
2. **There is a FIFTH amber position** — `UniverseTable`'s own
   `.markerAttention` — so `/securities` carries one too. Every previous record
   said four.
3. **`market.css`'s _told apart by marker shape_ does not cover the feed pair.**
   `live` and `stale` are **both discs**; only `degraded`/`synthetic` get the
   square. The feed pair is separated by hue and the written word **alone**.
4. **`Region` renders a bare `<section aria-label>` with no `role`**, which
   mis-filed the chip on a first sweep.

### Two defects the measurement itself produced

**`serveFeed` with no snapshot draws an amber feed cell on arrival** —
`feedStatusFrom` returns `stale` the instant `lastObservationAt` is undefined and
the market is open. So three rows written to **isolate** the backend's square
were silently inside the conjunction they were meant to be the control for.
**Only the declared mark set caught it**, which is the argument for declaring one.

### The decision, and the condition

**Deferred by the owner with the photographs in hand rather than before them.**
What saves it is **enclosure**: the chip contains its own band name, the chrome
marks are 8×8 `aria-hidden` silhouettes beside a _sibling_ word — plus size
(112×24 against 8×8) and position. **Condition:** _the first surface on which an
anomaly mark and a chrome amber mark fall within one glance of each other_ —
which the 467 px minimum says is true of no surface today.

**Row 06 is the frame to put in front of a person first:** `SIMULATED · Generated
test data. Not a market feed.` in amber bottom-left and `HIGH` in the same amber
top-right — **invented prices and a genuine anomaly band in one hue**. Its
mitigation is real but narrow: production never ships synthetic data, so that
frame exists only where **the scores are themselves synthetic** and the two
meanings agree.

### The sweeps

**Sideways: 4 of 6 MISSING** — the table above. Epics 6, 9, 13 and 7 had
**nothing**; Story 5.7 had only Gate 1's AC 7 refinement; **Epic 14 alone was
complete, because it was written by the task that took the measurement rather
than deferred to a close.**

**Upward**, same day: ADR **0046** written and indexed (three parts, three
conditions); ADR **0044** amended for its **fourth** application — the first to
store a **policy** rather than a measurement; `CLAUDE.md`'s _Current state_;
`LIVE-REHEARSAL.md` row 5.6, whose claim that a score had only ever drawn in
Storybook **my own Task 5.6.4 had falsified**; and two `docs/GAPS.md` entries.

**And a flake characterised rather than shrugged at.**
`overview-nothing-to-open:545` is documented as _"a sighting, not a rate"_. Its
own re-measure, run verbatim, gives **0/24 at four workers, 1 failure per full
suite at two, and 3/12 at one** — monotonic, and **the opposite direction to
every other flake in that file**. The mechanism explains it: the failure is a
furnished frame that has not arrived when the assertion runs, and one worker
gives the repeats **no scheduling slack**. So the standing advice _re-run it
alone to tell a flake from a regression_ is **exactly backwards for this one**.

### Gates

| Gate                 | Result                                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `pnpm verify`        | **EXIT 0**, `74 invariants hold.`, **zero** `Unhandled`, shared 632 / backend 1338 / frontend 1686 / process 60   |
| `pnpm test:database` | **EXIT 0** — 383 across 13 files                                                                                  |
| `pnpm e2e`           | **276 passed**, up from 272; the one failure is the documented flake above, **0/24 on its own re-measure, twice** |
| conjunction spec     | 4 passed scoped; 4 passed with the flag, **56 PNGs + 4 JSON**                                                     |

## For a stakeholder — a status report, 2026-10-29

The closing task of the anomaly-score story: photograph a colour problem, sweep
the records, and write the decision down.

**The colour problem is real, measured, and deliberately not fixed yet.** Five
different things in this product are drawn in the same amber — an unusual
security, a stale market feed, a struggling backend, a warning that the data is
simulated, and a marker in the securities table. In black and white, the anomaly
badge and the chrome marks are **identical**, while the badge differs from its
own neighbouring shade by a visible amount. So the clash is bigger than the scale
it belongs to.

**It is not currently misleading, and that is why it waits.** The two marks are
never near each other on screen — at least 467 pixels apart at every window size,
one in the panel and one pinned to the bottom edge — and the badge **contains its
own word** where the chrome marks are tiny silhouettes. Fixing it means choosing
and measuring a new colour and re-photographing five screens, so it is recorded
with the exact condition that should force it, and **56 photographs are on file**
so the next person decides from pictures rather than from an argument.

**The one picture worth looking at** shows _"Generated test data. Not a market
feed."_ and _"HIGH"_ in the same amber on one screen — invented prices beside a
genuine alarm. It is narrower than it looks, because that combination can only
happen where everything on screen is already fake.

**Four of six hand-offs to other teams were missing**, which is the worst count
this epic has recorded — and the one that was present had been written by the
task that took the measurement, at the moment it had it, rather than saved for a
close. That is the only mechanism here that worked.

**And I was wrong about something I had asserted repeatedly.** I had written that
the two amber marks sit next to each other on a phone. Measured, they never do,
at any width. Both copies are corrected.
