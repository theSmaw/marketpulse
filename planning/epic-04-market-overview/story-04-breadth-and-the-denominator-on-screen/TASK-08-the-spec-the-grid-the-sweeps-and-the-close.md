# Task 4.4.8 — The spec, the state grid, the sweeps and the close

**Status:** **Complete — 2026-10-07.** Producing all 18 states found **ten that had never been drawn** and **two shipped defects**: the region said _"among the 503 companies we track"_ in the one state with no readable denominator (a produced frame carrying `tracked: 400` made it say 503), now carrying no number and guarded by a new invariant; and a docblock called two of the region's states one. AC 5 proved **exhaustively** — 21,464,520 triples, not a sample. The brief's own cross-check was **wrong and not written**: the fifteen proxies are exactly what breadth excludes. **4 of 5 sideways hand-offs were missing**, and the prescribed grep could not see two of them.
**Story:** [4.4 Breadth, & the Denominator on Screen](STORY.md)
**Depends on:** 4.4.7

## Objective

**What the suite can say about a count over securities the frame does not carry,
and what it cannot.**

## What the user can see when this lands

**Nothing.** The story is finished and the next reader can find out why it is
built this way.

## Work

- **The browser spec is a PASS-THROUGH, not a furnished fixture**, for the reason
  Story 4.3 paid to learn: four overview specs passed against a server with the
  ranking deleted, because each furnished the data it then checked. **Breadth is
  worse** — it is a _reduction_, so the browser receives counts and draws counts
  and there is no recoverable input on the frame at all. Copy
  `overview-sector-ranking.spec.ts`'s `openWithRecordedStream`.
- **The assertions that survive a bare store**, and they are real: the identity
  `advancing + declining + unchanged === measured` read off the recorded frame
  (on CI every term is 0 and the identity still holds, and `0 !== 503` is a real
  distinction); `measured <= 503`; `figures` has exactly **four** entries — the
  one assertion that catches the negative-filter regression; and the screen equals
  the latest recorded frame, converged with `expect.poll`, **scoped to the
  region**.
- **One genuine cross-check exists and is worth having**: the four proxies and
  eleven sectors ride on the **same frame** and are inside the 518, so the number
  of those fifteen that are `observed` with a positive move is a **lower bound** on
  `advancing`. One-sided and weak — and it goes red on an inverted sign, a
  transposed bucket, or breadth computed over the wrong symbol set.
- **Stay out of the three flakes' class.** Wait for a positive state; assert
  **scoped**, never whole-`main`; assert a **transition**, not an absence across a
  window; no durations and no thresholds; and characterise with `--repeat-each=6`
  four times on one settled checkout, counting per execution.
- **The state grid**: every state × four widths, in greyscale **and** under a
  deuteranopia matrix, compared as strings, **produced** through the shipped socket
  path. **Run the producer walk** — entry 13's second half — because it has found
  something every time it has been run: two states in Story 4.2, five in 4.3.
- **AC 5's adversarial case is arithmetic**, and tidy fixtures pass it. Enumerate
  exhaustively rather than sampling: every `(a, d, u)` summing to N, for N from 0
  to 503, asserting the displayed identity. ~23M triples runs in seconds in Node,
  and exhaustive is the only honest answer to _at any rounding_.
- **The `docs/GAPS.md` entries**, each with a `Re-measure:` — the counts checked
  against nothing outside this repository; no gated machine ever seeing a breadth
  figure; the heard-from-but-unmeasurable set; the denominator sentence's clipping
  risk at 390 (**mechanically invisible**, because the DOM holds the full string);
  and the ≤860 reorder, which has **no entry at all** today.
- **The sweeps.** Upward: `PRODUCT_SPEC.md` §9 draws percentages and this story
  ships counts — it owes a **dated amendment**, not a rewrite, the way §8.1 already
  carries Story 4.1's. Sideways: grep for every `Story N.M` and `Owner:` line and
  **record the count that were missing** — Story 4.3's sweep found three of three.
- **`LIVE-REHEARSAL.md`**: open this story's row when the work opens, not at the
  close. **The most valuable sitting item is whether a frozen count is noticed by
  somebody who was not told to look for it.**

## Done when

1. A pass-through spec asserts the identity and the four-figure bound, and goes
   red when the producer stops counting
2. Its fixtures are the server's own, and the header says what a green run does
   not certify
3. The grid exists at four widths in greyscale and deuteranopia, with the producer
   walk run and its findings recorded
4. AC 5 is proved exhaustively rather than by sample
5. The sideways sweep's miss count is recorded, and §9 carries its dated amendment

---

## What was done — 2026-10-07

### The upward sweep: `PRODUCT_SPEC.md` §9 carries a dated amendment

§9's sketch draws breadth as **three percentages** and the shipped region draws
**counts with a stated population**. The amendment says why, and it is two
findings rather than a preference.

**The sketch's own arithmetic does not close.** Three percentages summing to 100
is what the sketch shows, and at N = 466 — the figure the spec was drafted
against — `33.3 + 33.3 + 33.5 = 100.1`. The sketch was drawn without the
rounding in mind, and three independently-rounded percentages over a real N
routinely sum to 99.9 or 100.1. A reader who adds them finds the product wrong
about arithmetic in the one region whose whole subject is arithmetic.

**And the sketch has no denominator at all**, which is the story's title. A
percentage over _the part of the market we heard from in the last five minutes_
reads as a percentage over the market. The shipped region draws **counts** and
states the population in words — _"Of the 503 companies we track, 451 were heard
from in the last 5 minutes."_ — so the figure a reader takes away carries its own
denominator. §9 is amended rather than rewritten, in the idiom §8.1 already
carries for Story 4.1.

### The sideways sweep, and the prescribed grep found three of five

Enumerated as `CLAUDE.md` instructs — every `Story N.M` and `Owner:` line in
this story's own documents, each checked against that story's own file.

**What the grep found.** No `Owner:` lines at all. Forward-facing story and epic
references: **Story 4.6** (×2), **Epic 5** (×2), **Epic 14** (×1). Three
siblings.

**Of those three, two were missing — and were written.**

| Sibling   | Constraint                                                                                                                                                                                                                                   | State before                        |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Story 4.6 | The DOM reorder changed the page-level focus order; at ≤860 everything now agrees and at ≥861 it deliberately does not; `Region.scrollable` stays 4.6's                                                                                      | **present** (written by Task 4.4.7) |
| Epic 5    | `marketBreadth` exists and is pure; the window is 5 minutes and **measured**; the same window must filter numerator **and** denominator; §11's percentage hides the denominator a 0–100 score's explanation owes; `directionOf` is in shared | **missing**                         |
| Epic 14   | The widening's cost and its attribution — 0.118 → 3.497 ms, the count 0.041 ms (1.2%), the remainder 518 `marketDateAt` calls — with the two conditions under which it becomes a breach                                                      | **missing**                         |

**And the grep could not see the two hand-offs with the most substance.**
`Story 4.5` and `Story 4.8` appear **nowhere** in this story's documents, and
both needed a constraint: 4.5 needs that the join already sees 518, that
positive membership sets with a cross-field check exist, that `directionOf` is
in shared, and that the cost attribution makes a top-N over the same entries
nearly free; 4.8 needs that the first universe-scale per-tick computation now
**exists** and has had a first reading. Both were found by reasoning about the
epic's sequence, not by the grep, and both were written during this task.

**The finding, stated for the next close.** The prescribed grep enumerates the
siblings a story happened to **mention**. A constraint measured for a sibling
the story never had reason to name is **invisible to it** — and that is the
larger category here: three found, five real, and the two it missed were the
two downstream stories this story's own measurements most directly serve. The
cheaper second pass is to walk the **epic's own story list** and ask of each
_did this story measure anything that one acts on_, which takes a minute and
does not depend on a string appearing.

**Miss count: 2 of the 3 the grep found, plus 2 the grep could not find. 4 of 5
hand-offs were missing at the start of this task; all 5 are written now.**

### `docs/GAPS.md` — four entries added, and one corrected

Added:

1. **Every breadth figure is checked against this repository and nothing else**,
   and the 503 it counts are on no frame a browser can see. Breadth is a
   _reduction_: five integers reach the browser and nothing can recompute one.
   The one external-ish check is the fifteen proxies-and-sectors lower bound on
   `advancing`, which is one-sided and silent on any error smaller than fifteen.
2. **No gated machine has ever seen a breadth figure at all — not a wrong one, an
   absent one.** CI's `measured` is **0** in every run, so the only states a
   gated run reaches are `reserved` and `N = 0`. This is why the pass-through
   spec asserts an identity, a bound, a figure count and convergence, and no
   figure.
3. **The remainder row cannot distinguish _we did not hear_ from _it did not
   trade_**, and there are at least four reasons with one number — three of them
   facts about our tape rather than about the market. `Not heard from` is the
   honest word for the sum and it is a **chosen** word, not a derived one.
4. **The denominator sentence's clipping at 390 is mechanically invisible**, and
   the longest string is the one the N = 0 state draws — because at `measured > 0`
   the long sentence is the **spoken** twin and the drawn claim is a 64-character
   method clause, while at `measured === 0` the two collapse and the drawn string
   is 74 characters (observed basis) or **76** (session basis, the real worst
   case). `textContent` is identical whether it wraps, clips or overflows.

**Corrected**: the entry Task 4.4.7 added said `overview-region-order.spec.ts`
holds the order at **768** and that **nothing holds it at 390**. The spec runs
at **both** widths — `for (const width of [768, 390])` — so the entry was
describing a gap that had already been closed in the same change. Both the body
and the `Re-measure:` line are corrected.

### `LIVE-REHEARSAL.md` — Story 4.4's row is open

Written as the row the ledger has not had before: **the first for a figure that
is a reduction, where every input can be visible and the output still wrong.**
Every row above it watches a figure that can be compared with something — a
price against a bar, a rank against a move. Breadth cannot be compared with
anything on the page, so a watcher's whole leverage is plausibility over time,
and the row names three readings only a person at a live session can return: do
the four rows **move at all**; do `advancing` and `declining` move in **opposite**
directions as the tape turns; and does the denominator sentence read as a fact
about our reach or as an apology.

**The most valuable item is adversarial and needs no movement in the market**:
pull the backend's feed mid-session and watch whether a **frozen count** is
noticed by somebody who was not told to look for it. Nothing on the region says
how old a count is, by decision (Task 4.4.6), and the only surface that says the
feed stopped is the status bar at the foot of the viewport.

The row's `What was wrong` column records that the gap is wider here than on any
row above it: on CI `measured` is 0, so **no gated machine has seen a breadth
figure at all**, and at 390 the clipping is mechanically invisible.

### `CLAUDE.md`'s _Current state_ — amended for Stories 4.3 AND 4.4

**4.3's close did not update it**, so the page's paragraph still said that six of
the seven regions _"say what they are waiting for"_. Struck, with the correction
beside it: three still do — topology, unusual activity, investigations — and
three hold figures. A new paragraph records the four things from 4.3 and 4.4 that
are load-bearing downstream: the join sees all 518 through a **positive**
membership set; breadth ships **counts with a stated population** and §9 carries
the amendment saying why; the window is **5 minutes, measured**, on `startsAt`
and never `ageMs`; the widening cost **0.118 → 3.497 ms** of which the count is
**0.041 ms (1.2%)**; no gated machine has ever seen a breadth figure; and the DOM
is in the **≤860 order** since Task 4.4.7.

No row was added to _Where the record lives_ — Epic 4 has written no subject
document, and each story's `STORY.md` is its record, as for 4.1–4.3.

### The pass-through spec — `e2e/specs/overview-breadth-counts.spec.ts`

`openWithRecordedStream` copied from `overview-sector-ranking.spec.ts`:
`ws.connectToServer()`, `server.onMessage` forwarding verbatim, the shipped
decoder, installed before `goto` and awaited. Three tests.

| Test                                                                                         | Asserts                                                                                                                                                                                                                                                                             | Where it runs                                                                                            |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| the counts partition the denominator, and the denominator is the set the universe says it is | `advancing + declining + unchanged === measured`; `measured <= tracked`; **`tracked` against the count of `active`/`equity` rows in `GET /securities`**; `figures` has exactly **four** entries                                                                                     | everywhere, CI included                                                                                  |
| the screen is the frame's counts and nothing it invented                                     | one `evaluate` **scoped to the region** — heading, ledger visibility, the three `dt·dd` rows, the quiet row, the ladder endpoint, the headline's three channels — polled to equality with the latest recorded frame, plus `Of the {tracked} companies we track` reaching a listener | everywhere                                                                                               |
| the three buckets recounted from the store's own closes                                      | an **independent recount** over `GET /securities`' `lastCloses`, filtered to the equities and to the session the frame names, with `changePercent`/`directionOf` **re-implemented rather than imported**                                                                            | **skips** on the `observed` basis and when the store holds no close for that session — so it skips on CI |

#### The cross-check this task's own brief specified does not exist, and the brief was wrong

The brief said: _the four proxies and eleven sectors ride on the same frame and
are inside the 518, so the number of those fifteen that are `observed` with a
positive move is a lower bound on `advancing`._

**Those fifteen are exactly the securities breadth excludes.** `index.ts:810` is
`entries.filter((entry) => isEquitySymbol.has(entry.symbol))`, and
`breadth-is-counted-over-the-equities-alone` holds it there, because a count
including `SPY` and the eleven sector SPDRs **beside their own constituents**
makes this region and `Market proxies` non-independent. So `XLK` advancing is
not evidence about `advancing`; it is evidence about the one number the producer
is **forbidden** to count. A lower bound built on it would be **red exactly when
the producer is correct** — on any frame where a fund rose and the names inside
it did not. It was not written.

**What replaced it is strictly stronger**: `tracked` against `GET /securities`
is an **independent source** — the database, over HTTP, for a figure the socket
computed from the typechecked universe in process — and it is the assertion that
makes the file non-vacuous **on CI**. It is also the one that catches the
negative-filter regression of Task 4.4.1 from the other end: a count handed the
join whole reports `tracked: 518`, one handed what the page subscribed to reports
`15`.

#### The reds, and one confirmed passing WRONGLY first

**Break 1 — a transposed bucket** (`bucketOf`: `positive → "declining"`,
`negative → "advancing"`), `dist/` rebuilt, frame confirmed as
`advancing: 166, declining: 335`:

```
  ✓  1 › the counts partition the denominator, and the denominator is the set the universe says it is (1.4s)
  ✓  2 › the screen is the frame's counts and nothing it invented (978ms)
  ✘  3 › the three buckets recounted from the store's own closes (1.3s)
    Error: expect(received).toEqual(expected) // deep equality
    -   "advancing": 335,     +   "advancing": 166,
    -   "declining": 166,     +   "declining": 335,
  1 failed, 2 passed (4.3s)
```

**Break 2 — the producer stops counting** (`marketBreadth([], { asOf, marketOpen })`),
frame `advancing: 0, measured: 0, tracked: 0`:

```
  ✘  1 › the counts partition the denominator … (1.3s)
        Expected: 503   Received: 0
        at overview-breadth-counts.spec.ts:358:27
  ✓  2 › the screen is the frame's counts and nothing it invented (977ms)
  -  3 › the three buckets recounted from the store's own closes      [skipped]
  1 failed, 1 skipped, 1 passed (4.2s)
```

**Break 3 — the procedure `CLAUDE.md` demands, and it found the file's real
boundary.** `tally`'s guard inverted (`if (direction !== undefined) continue;`):
every count `0`, `tracked` still `503`.

```
  ✓  1 › the counts partition the denominator …      ← PASSES WRONGLY
  ✓  2 › the screen is the frame's counts …          ← PASSES WRONGLY
  ✘  3 › the three buckets recounted …
    -   "advancing": 335,  "declining": 166,  "measured": 503,  "unchanged": 2,
    +   "advancing": 0,    "declining": 0,    "measured": 0,    "unchanged": 0,
```

In every case **an assertion failure with the other tests still collecting**,
which is the only red that proves a check works.

**And the limit is now written down rather than assumed.** The identity and the
screen-agreement assertions are **green against a producer that counts nothing**,
and necessarily so: `advancing: 0, declining: 0, unchanged: 0, measured: 0`
beside a correct `tracked` is _we counted and heard nothing_, which is **CI's own
true answer for ever**. No assertion can call that a defect without being red on
every gated run. Only the recount closes it, and only on a store with closes.
That is the second `docs/GAPS.md` entry above, which is why it is worded as _not
a wrong figure, an absent one_.

**Registered break**: `the-breadth-buckets-are-transposed` — the clause is the
**translation**, not the tally, because nobody inverts an accumulator but the
three wire names are not the three direction names and `bucketOf` is the one
place somebody has to write the pairing out.

```
$ pnpm break the-breadth-buckets-are-transposed
Breaking apps/backend/src/market-breadth.ts
  $ pnpm run build   (making the break reach the bundle)
  $ pnpm e2e overview-breadth-counts.spec.ts --anyway
  $ pnpm run build   (clearing the break out of the bundle)
✓ apps/backend/src/market-breadth.ts broken → red → restored byte-identical.
  matched: recounted from the store's own closes
```

### Characterisation — 72 executions, 0 failures

Four × `--repeat-each=6` on one settled checkout (load average 2.19 at the
start, 6.27 at the end), counted **per execution** rather than per run:

```
=== run 1   18 passed (9.2s)
=== run 2   18 passed (8.7s)
=== run 3   18 passed (8.6s)
=== run 4   18 passed (9.3s)
```

Three tests × six repeats × four runs. The recount ran in **all 72** rather than
skipping.

### The state grid — 18 states × 4 widths × 3 renderings = 216 photographs

`.capture/breadth-states/`, plus `readings-{1440,1024,768,390}.json` carrying
each state's drawn text, spoken text, ledger visibility, every row as `dt · dd`,
the ladder endpoint, the headline and every band's inline width. 220 files,
3.6 MB. Every row **produced through the shipped socket path** — the gateway
connect sequence, the shipped encoder, the real `routeWebSocket`. Greyscale is
`grayscale(1)`; deuteranopia is the Machado (2009) full-severity matrix the
workshop's own `story-simulation.tsx` uses. The instrument is deleted.

**Compared as strings: 18 states, 15 distinct readings at every width**, and the
single collision group is identical at all four widths and all three renderings:

```
1440: 18 states, 15 distinct readings, collisions:
  [["06-no-breadth-section","16-counts-do-not-sum","17-measured-over-tracked","18-a-previous-image-no-tracked"]]
1440 grey: 15 distinct images, pairs: [same four]
1440 deut: 15 distinct images, pairs: [same four]
```

That group is **one state by decision** — `readBreadth` refuses an unreadable
section and the region draws the absence. **No two _different_ states read
alike, and no pixel pair collides under either simulation.** Direction survives
both: the band inks are one grey under `grayscale(1)` and near-identical olive
under the matrix, and every band is **labelled and counted to its left** in all
216 photographs.

#### What the producer walk found — ten states that had no row

Entry 13's second half has found something every time it has been run (two
states in Story 4.2, five in 4.3). This time, ten. Verbatim readings:

1. **`09-observed-n2-the-ladder-edge`** — the threshold's lower edge, never
   drawn. `ladder: "2"`, `bands: ["50%","50%"]`.
2. **`12-a-perfectly-split-market`** (220/220/11) and `09` both make the
   headline read **`NET ADVANCING` / `— unchanged 0`** — a caption saying
   _advancing_ over a figure saying _unchanged_. Never drawn before. **Routed
   below.**
3. **`11-every-name-in-one-bucket`** — `bands: ["100%"]`, a full-track band at
   N = 451. The argument that refuses a full track at N = 1 permits it here, and
   it had never been photographed.
4. **`10-a-bucket-reading-exactly-zero`** — `Unchanged · 0` with a present,
   empty band cell and the origin rule through it: `bands:
["66.5188%","33.4812%"]`, two bands for three rows.
5. **`13-a-one-minute-window`** — the singular grammar, reachable by rollback:
   `Heard from means at least one observation in the last 1 minute.`
6. **`14-nothing-unheard`** — `measured === tracked`:
   `quiet: ["Not heard from · 0"]`.
7. **`15-session-n1`** — `Of the 503 companies we track, 1 had a close-to-close
move on 2026-09-11.` (the past tense dodging the agreement problem, confirmed
   on screen).
8. **`16-counts-do-not-sum`**, **`17-measured-over-tracked`**,
   **`18-a-previous-image-no-tracked`** — the three refusal paths, **produced
   rather than reasoned about**. All three draw the region's own sentence, and
   **17 is the finding below.**

And the shipped eight, for the record: `06` (frame, no section) draws the
reserved sentence immediately; `07` (no frame, 600 ms) draws `"Market breadth"`
and nothing else; `08` (no frame, 12 s) draws `"Market breadth\n\nNo count
yet."` **The `useWaited` floor works and the three absences are three distinct
readings.**

### AC 5, proved exhaustively rather than by sample

A throwaway vitest instrument over the **shipped** `marketBreadth` reader, since
deleted:

```
AC5: 21464520 triples, N = 0..503, 10931 ms, worst band-width sum 100.000000000000028%
Test Files  1 passed (1)   Tests  3 passed (3)
```

21,464,520 = C(506,3) — **every** `(a, d, u)` summing to N for N from 0 to 503,
not a sample. Per triple it asserted the three printed counts against their
inputs, their sum against the printed N, `N + remainder === tracked`, the ladder
endpoint (absent below 2, `String(N)` above), and the headline's digits and
direction against `a − d` (absent at N = 0). N = 0 and N = 1 in all three
placements are separate named tests.

**Rounding enters in exactly one place and it is the bands, not the figures.**
The three widths are `fraction * 100` floats: the worst sum over 21.4M triples is
**100.000000000000028 %** — 2.8 × 10⁻¹⁴ of a track, 4 × 10⁻¹³ px at 1440 — and
the browser's own serialisation is coarser: `62.9712% + 33.7029% + 3.32594% =
100.00004%`, read back off state `01`. Neither is visible at any density.
**The printed figures themselves cannot round**: they are `String(int)`, which
is the whole reason the shape prints counts. **AC 5 is met at every rounding
because there is no rounding in the numbers a reader can add up.**

The instrument was proved rather than trusted: with `net` changed to
`breadth.measured − breadth.declining` it went red at the first non-trivial
triple (`Error: net 0`), and the file was restored byte-identical.

### Three things the grid found that read wrong — two repaired here, one for the owner

**(a) A hard-coded `503` in a shipped sentence, and it could already contradict
the wire. REPAIRED.** `MarketOverview.tsx` read _"Advancing, declining and
unchanged among the 503 companies we track, over the number of them the count
could see."_ — in the state where the frame arrived and its breadth section was
**refused**, which is precisely the state where this screen has **no readable
denominator**. State `17-measured-over-tracked` produced the sharper version: the
frame carried **`tracked: 400`**, the section was refused, and the screen said
**503**. Reachable by rollback.

Everywhere else in this story the set size is read off the frame, because
`BreadthClaim`'s own docblock says a literal is _a lie with no symptom the day a
constituent is delisted_. **The repair is no number rather than a different
one** — ADR 0029's defer rule applied to the clause rather than to the region —
and the sentence now says what the region is for while `BreadthLedger` states
the population in the states that have one.

**It is also the one finding here that could be made mechanical, so it was.**
`pnpm invariants` gained **`the-population-is-never-a-literal`** (43 invariants
now): no string or template literal in shipped source may contain the phrase
`we track` **beside a digit**. The clause is `we track` rather than the number,
per `CLAUDE.md`'s rule to prefer one the re-implementer cannot avoid writing — a
grep for `503` rots the day the curation changes size, says nothing about `518`,
and would fire on an HTTP status, of which this frontend discusses several. An
interpolation reads as no digit, so `` `Of the ${String(tracked)} we track` ``
passes and `"Of the 503 we track"` does not. It carries an **anchor**: zero
matching literals fails loudly rather than passing vacuously.

Proved on **two different defects in two different files with two different
numbers**, because a break that edits the file the check was written around
proves only that the check sees that file:

```
=== (1) the defect as it actually shipped ===
  ✗ the-population-is-never-a-literal
    1 shipped literal(s) state the population as a figure rather than reading it off the frame:
      …/apps/frontend/src/routes/MarketOverview.tsx
        "Advancing, declining and unchanged among the 503 companies we track, over the number of them the count could see."
  1 of 43 invariants failed.

=== (2) the defect somebody ELSE writes: a different file, a different number ===
  ✗ the-population-is-never-a-literal
      …/apps/frontend/src/market/market-breadth.ts
        "Of the 518 we track"
  1 of 43 invariants failed.

=== (3) restored ===
43 invariants hold.
```

The registered break is **`the-population-is-stated-as-a-literal`**, and it is
deliberately the _second_ of those two — the view builder's heading, saying 518
— rather than the defect that shipped. No `build:` flag: this check reads
source, so a rebuild either side would be four minutes proving nothing.

**(b) A live claim in a docblock that the grid falsified. REPAIRED.**
`marketBreadth`'s docblock in `apps/frontend/src/market/market-breadth.ts` said
_"Two ways to reach it and they are one state on screen: no frame has arrived at
all, or the frame carries no readable `breadth`."_ **They are two states**, and
`MarketOverview.tsx` had been telling them apart deliberately — with its own
comment saying so — since Task 4.4.6. Produced: `06` reads the region's
sentence, `07`/`08` read the reservation and then `No count yet.` The docblock
now names both states, says which rendering each gets, and records that the
caller's branch is the authority. **This is `CLAUDE.md`'s own rule arriving in
the one direction it warns about** — the two documents were written in different
tasks and the false one was the one nobody had reason to re-read.

**(c) `NET ADVANCING` over `— unchanged 0`. NOT repaired — it is the owner's
judgement.** At `advancing === declining` the headline's caption names a
direction the figure denies. Every channel is individually correct — the glyph,
the word and the sign all agree with each other and with `a − d = 0` — and it
may still read oddly to a stranger. Two produced states reach it (`09` at N = 2,
`12` at 220/220/11) and **neither had ever been drawn**. Put to the owner at
Gate 2 rather than changed on a tester's judgement, because the alternatives are
a different caption, a different figure, or accepting it.

### Gates

```
$ pnpm verify      exit 0,  Unhandled Errors: 0
40 components, 40 stories files.
487 documents, 1669 cross-file links, 39 anchor links, 0 broken.
43 invariants hold.
shared 408 · backend 1010 · frontend 1322 · process 41

$ pnpm e2e         194 passed, 15 skipped, 0 failed  (3.3m, started at load 3.60)

$ pnpm break the-breadth-buckets-are-transposed       ✓ red → restored byte-identical
$ pnpm break the-population-is-stated-as-a-literal    ✓ red → restored byte-identical
```

**A red run reported rather than hidden.** The session's first full `pnpm e2e`
was `1 failed, 15 skipped, 193 passed` — `security-gap-fill.spec.ts:165`, failing
at line 219's final assertion, **started at load 6.81 and finished at 24.23 on
8 cores**. That is the known ~12% flake on its documented failure line with the
documented contention signature, and the diff cannot reach that file: one new
spec, two `scripts/` entries and two frontend files, none of them `security-gap-fill`'s.
Re-run from a settled start: **0 failed**. Counted per execution; nothing
attributed to the change.

`pnpm verify` was re-run after the two repairs and the new invariant; the figures
above are the later run.

## For a stakeholder — a status report, 2026-10-07

**What this was.** The close of Story 4.4: proving the breadth count rather than
asserting it, photographing every state it can reach, correcting the documents
this story falsified, and handing its measurements to the stories that need them.

**What was found, and the two repairs are the part worth reading.** Producing
all eighteen states — rather than reasoning about them — found **ten that had
never been drawn**, and two of those were defects in shipped code. The region
said **"among the 503 companies we track"** in the one state where the screen has
no denominator to state, and a produced frame carrying `tracked: 400` made it
say 503 while the wire said otherwise; the sentence now carries no number, and
`pnpm invariants` will refuse the next one. A docblock describing two of the
region's states as one was false, and had been false since the day the caller was
written to tell them apart.

**What was proved.** The arithmetic, **exhaustively**: 21,464,520 triples —
every possible split of every population from 0 to 503 — rather than a sample,
because _at any rounding_ has no honest answer by sampling. The printed figures
cannot round at all; the only rounding anywhere is in the band widths, at
2.8 × 10⁻¹⁴ of a track. The new browser spec was proved on three deliberate
defects, including **one it passes wrongly** — which is how its real boundary got
written down rather than assumed.

**What shipped open.** The largest gap this epic has opened: **a breadth count
can only be checked against this repository.** Five integers reach the browser
and nothing on the frame can recompute one, so a systematic error would draw a
plausible picture. **No gated machine has ever seen a breadth figure at all** —
CI's store has no bars, so every gated run renders the honest-nothing state. The
remainder row sums four distinct causes under one label, three of them facts
about our tape rather than about the market. And the denominator sentence's
clipping at 390 is **mechanically invisible**, because the DOM holds the full
string whatever the box does. All four are `docs/GAPS.md` entries with
re-measures.

**What was deliberately not done.** The cross-check this task's own brief
specified — the fifteen proxies and sector ETFs as a lower bound on `advancing`
— was **not written, because the brief was wrong**: those fifteen are exactly the
securities the count excludes, so the assertion would be red when the producer is
right. An independent recount from the store's own closes replaced it. And
`NET ADVANCING` over `— unchanged 0` is left on screen for the owner to judge.

**Where it leaves the work.** Story 4.4 is ready for acceptance. One sitting is
owed and now has a row: **nobody has watched a breadth count against a real
feed**, and the most valuable thing in that sitting needs no market movement at
all — pull the feed and see whether a **frozen count** is noticed by somebody who
was not told to look for it.
