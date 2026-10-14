# Story 5.2 — The Trailing Window, & the 5-Minute Return

**Status:** In progress — 2026-10-13
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
Story 5.1 set the idiom for. The absence sentence is the fifth of its kind on
this product and must name its own region — four already read `No prices yet.` /
`No count yet.` / `No sector moves yet.` / `No moves to rank yet.`

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
