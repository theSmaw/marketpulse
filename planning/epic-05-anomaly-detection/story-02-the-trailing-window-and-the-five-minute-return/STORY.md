# Story 5.2 — The Trailing Window, & the 5-Minute Return

**Status:** Complete — 2026-10-14 — the window costs **1.8–4.1 µs a batch**, none of Epic 14's three triggers fired, and the story's own break instruction turned out to be backwards: a pass-through spec proves fidelity, never correctness
**Epic:** [Epic 5 — Anomaly Detection](../EPIC.md)
**Depends on:** 5.1
**Epic scope covered:** 5-minute return calculations

## Description

**This is the epic's one genuinely new structural component, and it exists
because of a decision Story 3.5 took on purpose.**

`currentMarketState` is **latest-only** — _"518 latest values, not 518 × 390
minute bars"_ — chosen as the cheap option because Story 3.8 makes the **store**
hold today's session. The consequence lands here: **a 5-minute return needs the
bar from five minutes ago and nothing in this process holds it.** Property 1 of
that hand-off says anything wanting a series _"assembles it from the store plus
what has arrived since"_, and this is the first computation in the product that
needs a **trailing window per security in memory**.

**And there is no 5-minute bar to ask for.** `TIMEFRAMES = ["1m", "1d"]`, and
`bar.ts` records Epic 5 computing them from stored minute bars as a decision
with two reasons: Epic 13's replay must reconstruct them from what was
**stored**, so a provider-side aggregate would be a second source of truth
replay could not use; and provider-side and our-side aggregation disagree at a
session boundary. **Adding a `5m` member is not the answer** — it reintroduces
exactly that second source of truth.

**Why this story ships a return and not a percentile.** The return is
computable from the window alone. The percentile needs the 60-day baseline,
which is Story 5.3's measured 4–13 minute problem — and separating them means
the window's correctness is established before anything depends on a figure
computed over it.

## What the user can see when this story lands

**`Abnormal-move indicators` draws its first figure.** For the selected
security: its **5-minute return**, the two instants it was measured between,
and **how much of the window was actually observed** — not a score, and no
band. A security the window cannot answer for says so in its own words.

## Acceptance criteria

1. A bounded per-security window of recent bars exists in the backend process,
   keyed on each bar's own `startsAt`, with its **depth, its eviction rule and
   its memory cost stated and measured** against `currentMarketState`'s 0.2 MB
   at universe scale.
2. **It never walks backwards and never imputes.** A revision for a minute
   already superseded is handled the way the live path handles it — discarded —
   and the window records what arrived rather than filling gaps. Measured
   context: **0.1062% of bars are revisions and 37.6% of those change the
   close.**
3. **Endpoint integrity is a refusal, not a stretch.** A 5-minute return is
   measured between two bars whose own `startsAt` are five minutes apart. If
   the earlier endpoint is absent the figure is **refused** — never substituted
   with the nearest available bar. `ERIE` at **2.1%** minute coverage would
   otherwise produce "the 5-minute return" between bars **47 minutes** apart,
   and the measured ordinary maximum gap is **187 minutes**.
4. **The drawn figure states how much of the window it saw** — _observed k of
   the 5 minutes_ — and the instant of the **oldest** endpoint, because that is
   the only thing distinguishing a 5-minute return from a 47-minute one. This
   is `EPIC.md`'s own instruction: _"how much of the window was actually
   observed belongs in it."_
5. **It dates the observation, never the computation.** This product has
   shipped the opposite defect and repaired it: the overview note drew
   `COMPUTED · Oct 9 · 21:42 EDT` under four-week-old closes, and that instant
   was when the page was opened. `the-overview-note-dates-an-observation` holds
   the repair; this figure owes the same rule.
6. **It says nothing about the feed.** The connection has one home, the status
   bar, and a quiet security is **an age rather than a verdict** — no
   threshold, because the 187-minute maximum is what any threshold would have
   had to spare. Held by `a-second-staleness-sentence` and
   `one-home-for-the-strip-staleness-sentence`.
7. The window is loaded or filled by a path that **does not put an `await` in
   the overview join's socket callback** — an unhandled rejection there is a
   crashed process. If a store read is involved it is cached, the way
   `last-closes-cache.ts` is, and the cache's recorded defect is not inherited:
   `loadedFor` records **what was asked for rather than what was read**.
8. The window's cost per applied batch is **measured on a production artefact
   with a calibrator**, and reported with both caveats stated separately: a
   **Node** figure at a gap is an upper bound and the calibrator **does not
   divide out** (subject 4.38× against calibrator 2.29×, a factor of ~1.9
   apart), while a **browser** figure reads ×1.00.

## Gate 1 — the task list approved, 2026-10-13, and four decisions

Five tasks, approved as proposed. Four roles shaped it — the technical analyst
on delivery, the architect on the window as a pattern, UX on the state set, the
tester on what cannot be checked as written — and **three premises in my own
briefs were false**, which is recorded here because each was load-bearing.

### The four decisions

**1. A fifth market-stream frame type, scoped to one symbol.** Measured: a field
on every observation costs **+54,525 B per frame** at 516 subscribed — **+82%**
against a real article of 58,187–59,475 B — which at the feed's **6.8–16.1
batches a minute** is **+371–878 KiB a minute per attached browser**, for one
figure about one security on screen. The symbol-scoped frame is **221 B**. **A
factor of 247, and that figure is what decided it.**

_Rejected:_ computing it in the **browser** from the series the chart already
holds, which is free and wrong for three reasons — at `3M` and `1Y` the series
is `1d` bars and has no five-minute endpoint at all; the browser holds only the
subscribed symbol's series, so the figure Story 5.4 ranks is unreachable by that
path; and **invariant 4** puts the computation in the data layer so leakage is
structurally impossible rather than instructed. _Also rejected:_ an **HTTP
route**, which is cheaper still and is the shape Epic 13's replay already knows
how to drive — kept as the named alternative if the frame type proves wrong,
with the cost being a figure that does not tick on a page where the price beside
it does.

**2. The window sits BESIDE `currentMarketState`, not inside it.**
`market-overview.ts`'s own precedent — a sibling, never a method on it. The
architect recommended replacing it for one-home and the owner took the lower
risk to a hot path the socket, the gateway and the live bar writer all stand on.
**The cost is recorded rather than hidden**: two homes hold _the newest bar for
this security_. **Reversal trigger:** the first time the two are observed to
disagree, or the first writer of either that is not `onObservations`.

**3. No store-backed fill at cold start.** An empty window is a **legitimate
value, not a degraded one** (Story 3.5's property 4), and `observed 0 of 5`
already has to render. A fill buys a store read whose cost on the deployed tier
is unmeasured, a cache, a tape decision — a store-filled window straddling the
nightly backfill gets a `sip` earlier endpoint and an `iex` later one, and the
close can differ by more than the move being measured — and a `loadedFor`-class
defect, for the first five minutes of a process's life. **Reversal trigger:** the
first restart inside a session where a reader reports the region blank.

**4. The band word is not this story's.** A band with no score is a verdict this
figure cannot license (ADR 0029), and a return alone does not classify. Story
5.1's hand-off says the word ships before the score; that binds whichever story
first draws one, which is not this one.

### Three premises corrected before any code was written

- **`1M` is minute bars, not daily.** `MAX_MINUTE_SESSIONS = 21` and `1M` is 21
  sessions, so only `3M` and `1Y` map to `1d`. The conclusion survives and is
  stronger: two of five windows cannot answer, and a hand-typed `?sessions=22`
  is a third.
- **Two stale `324 px` survive in shipped comments** —
  `RelativePerformance.tsx:34` and its stories file. The rail is **419 px of
  content in a 453 px column**, corrected in three documents on 2026-10-13 and
  in **no code**, because that sweep's grep was scoped to `.md`. **A figure
  corrected in the documents is not corrected in the tree.** Task 5.2.1 fixes
  both.
- **The region-level sentence is the SIXTH honest-nothing noun, not the fifth**
  this story's own _Design work_ section claims. Four are on `/` and
  `No comparison yet.` shipped on this page in Story 5.1.

### And one trigger nobody had evaluated

Epic 14's trigger has a **third** condition, in Epic 5's own file rather than
Epic 14's: _the first computation added to that callback that **derives a figure
per security**, rather than ranking or counting figures the join has already
produced._ **AC 7 points this story straight at that callback.** A ring-buffer
push is storage rather than derivation and the return is computed for one
security on demand, so the expectation is that it does not fire — but the
verdict is owed in writing, and Task 5.2.5 owes it for all three conditions.

## Design work

One figure and one honest-absence sentence in a reserved region, in the column
Story 5.1 set the idiom for. ~~The absence sentence is the fifth of its kind on
this product~~ — **false, and corrected at Gate 1 above and again on 2026-10-14
by Task 5.2.4: it is the SIXTH**, because `No comparison yet.` shipped on this
page in Story 5.1. It must name its own region — four already read
`No prices yet.` / `No count yet.` / `No sector moves yet.` /
`No moves to rank yet.` on `/`, and the fifth is this page's own.

**And the count of NEW sentences is four rather than one** (Task 5.2.4): the
producer has **three** refusals and each needs words, beside the region noun.
Each of the four carries its recorded reason for not being one of
`relative-performance.ts`' eight, in `five-minute-return.ts`.

## Out of scope

The baseline, the percentile, the volume factor, any band, any 0–100 figure,
and anything on `/`.

## Handed here by Story 5.1's close — 2026-10-13: the rail you are drawing into already has an idiom, a height and a drawn shape

Story 5.1 filled `Relative performance`, the middle of the three regions this
epic was given, and drew the other two on the canvas so they are amended rather
than redrawn. `The rail that says how unusual.dc.html` is the page;
`VISUAL-LANGUAGE.md`'s _The rail, and the anchored comparison track_ is the
written half. **Six things bind this story, and none of them is a preference.**

**1. The rail is an adjacency at `≥74rem` and an ORDER everywhere else.** The
route's own comment says the three regions share a column because they answer one
question; measured, that is true at 1440 and **false at 1024**, where the span
arithmetic puts two of them in column 2 and `Anomaly history` in column 1 with
two unrelated regions between them. Do not write _the rail_ into anything as a
layout; write **order**. Making it real at every width is a change to seven
regions' placement and nobody has taken it.

**2. The region is 419 px of content in a 453 px column** at 1440, and 342 at 390. Every specimen on the canvas is drawn at 419. The earlier figure of 324 px
was measured on the wrong screen and is corrected everywhere — if you find it
again, it is a copy nobody swept.

**3. One height in every state, reserved band by band, and never a
`min-height` that pins the REGION to a number.** `Relative performance` measures **240 / 240 / 240 / 302 px** at
1440 / 1024 / 768 / 390, identical across nine states. **Corrected 2026-10-14:
the absolute wording was wrong and that file holds three `min-height`
declarations.** A band reserving its own room as
`calc(2 * var(--line-height-micro))` is derived from a token and is the shipped
idiom; what is forbidden is a number that pins the region. The reason is not tidiness:
this region sits in a column of three, `Movers` paid 81 px for discovering it the
other way round, and `MARKET-OVERVIEW.md` §1.4's trigger **fired** on the release
that filled this region. The owner accepted a **+74 px** one-time step (136 at
390); a second region stepping the page again is a second conversation.

**4. The band word ships before the score, and the badge must read alone.** That
is the owner's 2026-10-13 split. So `Abnormal-move indicators` has a state in
which the word is present and the number is absent — and the word is what
survives greyscale, because the price palette differs by ~1.1:1 there and hue is
effectively the whole difference.

**5. Every absence is a sentence, and nine of them are already approved.** The
register is set and inherited rather than re-invented: short, no connection word,
no terminal full stop except on the one region-level sentence, and the longest
string is what the two-line reserve is sized for. They are named constants in
`apps/frontend/src/market/relative-performance.ts`. **And the two facts that look
identical must not read identically** — _nothing has reached us yet_ and _the
aggregate arrived carrying nothing_ were one sentence in this region for a day,
and the second is the state every gated run is permanently in.

**6. `Abnormal-move indicators` is filled PROGRESSIVELY and you are the first
figure in it**, not the story that finishes it — Story 5.6 is. A region that
draws one figure and reserves the rest of its bands is the shape to aim at, for
the reason in 3.

## Gate 2 — the acceptance criteria, verdicted — 2026-10-14

**Kind**: a **re-take** is a command a clean clone can run; a **reading** is
dated and cannot be re-taken without the conditions that produced it.

| AC  | Verdict                                    | Instrument                                                                                                                                                                                                                              | Kind              |
| --- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 1   | **Met**                                    | `trailing-window.test.ts` (12); memory via `heapUsed` after two forced collections, **553 B a security at depth 1, 283–284 B a marginal bar, ~1.02 MB at depth 7** against `currentMarketState`'s 0.208 MB taken by the same instrument | re-take + reading |
| 2   | **Met**                                    | The supersede rule is **inherited from `observed.applied`** rather than re-implemented; the impute test asserts the **absence** of a gapped minute; a revision interleaved with an advance makes a FIFO eviction go red                 | re-take           |
| 3   | **Met**                                    | `five-minute-return.test.ts` — 47 minutes apart refused by name; four and six minutes refused; **no `(earlier, later)` entry point exists**, asserted against the module's own exports                                                  | re-take           |
| 4   | **Met**                                    | `observed k` comes from the **same traversal** as the figure, so they cannot disagree; the oldest endpoint is printed first and both instants are drawn                                                                                 | re-take           |
| 5   | **Met**                                    | No `computedAt`, `sentAt` or `Date.now()` in the band; both instants are bars' own `startsAt` with no interval added, asserted                                                                                                          | re-take           |
| 6   | **Met**                                    | No threshold and no connection word; `one-home-for-the-strip-staleness-sentence`'s corpus is a directory walk and was **proved by plant** rather than read                                                                              | re-take           |
| 7   | **Met**                                    | The write is synchronous with **no I/O at all**, so there is nothing to await; placed **before** `publishObservations`' early return, so the window is not empty when nobody is watching                                                | re-take           |
| 8   | **Met, and arm 2 is reported as unusable** | Three arms on the production artefact with a calibrator and the load read before each; plant caught at **2.8%** of its predicted size                                                                                                   | reading           |

### What a user can now see

On `/securities/:symbol`, `Abnormal-move indicators` draws the security's
**5-minute return**, the two instants it was measured between, `observed k of 5
minutes`, and `Measured on IEX`. **No score and no band** — those are Story
5.6's. Two of the three regions this epic was given now hold figures.

### What shipped open, with an owner and a condition

- **Nobody has seen this figure against a real market, and nothing can.**
  `LIVE-REHEARSAL.md` row **5.2** is unwatched and `pnpm invariants` refuses
  Epic 5's close with it. The window is process memory fed by the live socket
  with **no store-backed fill**, so it is empty on every gated run and for the
  first five minutes of every deployment.
- **The figure has no external check** — its two input prices are on no frame —
  which is why the rehearsal row's item 4 is a public five-minute chart.
  **Owner: the first sitting.**
- **Arm 2's calibrator inflation is non-monotonic in the gap** (2.75–3.26× at
  8,824 ms against 18.0–19.4× at 3,727 ms) and **gap and order were
  confounded**, because the arms always ran midday-then-close. Not resolved,
  because the arm is 100% discarded either way. **Owner: Epic 14.**
- **Whether Task 4.8.11's 2.29× was partly the in-loop calibrator artefact
  cannot be settled**, because that instrument was deleted. The conclusion is
  unaffected and stronger; the mechanism may be misattributed.

### What was NOT verified, and why

- **The deployed backend has not run this code.** Every figure is one laptop,
  one furnished cadence.
- **The revision branch is not in the cost figures** — the fixture plants none,
  and at 0.1062% that is 1 bar in 940.
- **Arm 2 produced no usable absolute**, by its own control.
- **`observed k` has never been anything but 0 on a gated machine.**
