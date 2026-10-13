# Story 5.2 — The Trailing Window, & the 5-Minute Return

**Status:** Not started
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

**3. One height in every state, reserved band by band, and NEVER a
`min-height`.** `Relative performance` measures **240 / 240 / 240 / 302 px** at
1440 / 1024 / 768 / 390, identical across nine states. The reason is not tidiness:
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
