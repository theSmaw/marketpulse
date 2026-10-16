# Task 5.4.4 — The denominators, the cut, and the third source

**Status:** Complete — 2026-10-16 — the region states three populations, the cut and two distinct refusal kinds, and `/` finally attributes the stored bars it rests on; **my own instruction to use a second `MeasuredSet` instance was impossible honestly** (it renders `Of the 466 companies we track` — false in the lead _and_ the predicate) and the canvas's conjunct was right; **verbatim refusal strings and the no-growth guarantee were mutually exclusive**, measured at +16 px and a fifth line at 390; the region is **unchanged in all 42 cells**; and a break that DELETED its own `find` text went red twice while establishing nothing
**Story:** [5.4 `Unusual activity` on the Landing Page](STORY.md)
**Depends on:** 5.4.3

## Objective

**A ranked list looks equally confident whether its input was complete or not.**
This region has **three** populations where breadth and movers have one, and a
figure derived from 60 sessions of stored bars that nothing on `/` can currently
attribute.

## What the user can see when this lands

**The region says what it ranked over and how much of it got past the line** —
and the screen's source note names the **third** kind of data `/` now rests on.

## Work

- **Three populations, two sentences, one builder.** (1) the **501 equities**,
  read never typed; (2) how many were **heard from in the last 5 minutes**; (3)
  how many of those have a baseline **long enough to rank** — a different
  quantity at a different lookback, which 11 securities fail on sample size and
  a further class fails on an unadjusted split. `describeMeasuredSet` unchanged
  for (1)+(2); a **second `MeasuredSet` instance** through the same function
  gives (3) in the same grammar. **This satisfies AC 3 without widening
  `MeasuredQualifier`**, which `Market breadth` and `Movers` both read.
- **The cut** — how many are above the line, not only how many were heard from.
  One home; a second builder is the duplication this repository fails a build
  over.
- **Two refusal kinds that must not read alike**: `Baseline too short to rank`
  and `Baseline crosses an unadjusted price break — not comparable`, verbatim
  from `percentileRefusal`'s existing home. Both are **clauses in the footer**,
  not rows — a refused security given a rank is the over-claim, and a silently
  dropped one is `Movers`' own lesson: the population is part of the claim.
- **A third `dt` on `OverviewSourceNote`.** It has exactly two terms today,
  `Observed prices` and `Closing prices`. The baseline is a **third source
  class** — 60 sessions of stored bars, preferring consolidated **SIP**, while
  the numerator is **IEX** — so `/` would otherwise draw a figure resting on
  data it never attributes. That is invariant 6's own sentence. It goes on the
  **screen note**, not inside the region: the region owns the ranking, the note
  owns provenance, and a region-level feed line is the `BarSeriesPanel`
  duplicate this product deleted.
- **Disclose the coverage bias.** IEX per-symbol coverage runs ~2.1% to
  near-complete and a top-N **selects the tail**, so a sparsely covered security
  enters the ranking only on the minutes it happens to hold an exact pair. No
  criterion covers this. Either the sentence says so or `docs/GAPS.md` carries
  it with a condition — decide, with the owner if it changes what is drawn.

## Done when

1. The two sentences are drawn, from one builder, in the grammar keyed on the
   basis the wire sent, and a browser spec reads them.
2. The region reserves its lines so it is **one height in every state** —
   measured, the claim having cost `Movers` a third line at 390.
3. A guard that exactly one shipped file holds the cut phrase **and** reads
   `tracked` from the wire rather than spelling a number — two conjuncts,
   because a one-conjunct draft of the neighbouring check reported
   `52 invariants hold.` against the defect. Break hand-performed and **proved
   green first** on a region that imports the builder _and_ appends its own
   local template literal: one import, two builders.
4. `OverviewSourceNote` names the baseline's tape and generation date.
5. The coverage bias is disclosed on screen or recorded in `docs/GAPS.md` with a
   re-measure.

## Amended by Task 5.4.2 — 2026-10-15: what the counts are, and the one equality your sentence rests on

**The section ships three counts and five refusal counts, measured and
shipping.** `tracked` (read, never typed), `eligible` (heard from inside the
cutoff **and** holding a pair exactly the span apart), `scored` (also holding a
comparable baseline). They are **nested, not parallel** — `eligible ⊇ scored` —
and that nesting is the only reason one sentence can carry them honestly.

**Five refusal counts, in two closed vocabularies**: `nothing-observed`,
`no-earlier-endpoint`, `no-basis` for the figure; `too-few-samples` and
`split-discontinuity` for the comparison.

**There is no sixth, and that is a decision rather than an omission.**
`comparableBaseline` deliberately collapses _no baseline row at all_ into
`too-few-samples` with `sampleCount: 0` — Story 5.3 recorded that "`0` and _too
short_ share a word on purpose". A third count would either add a vocabulary
member, reversing that decision, or put a second home for the distinction in
this pass. Accepted at 5.4.2's review: _no row at all_ versus _row too short_ is
not a distinction a reader can act on, whereas _too short_ versus _crosses a
split_ is.

**The equality your sentence depends on, with its exact bound.**
`eligible − scored` equals the sum of the two comparison refusals **in every
reachable state, but not provably in every state**: `returnPercentileOf` also
refuses a stored distribution that is not 101 points, or a non-finite magnitude,
**with no word at all**. Migration `0013`'s constraint forbids the first and the
division forbids the second, so neither is reachable — but **do not write a
sentence that asserts the subtraction is exhaustive.** State the counts, or
state the cut; do not invite a reader to derive one from the others. Task 5.4.2
asserts the equality over the reachable states and deliberately did not invent a
refusal word no reader could act on.

**And one narrowing inherited from the intersection, worth knowing before you
write the denominator.** A security with a live bar inside the cutoff but **no
stored close** is never scored, because the shared pass already excludes it
(`change.percent === null`). So `eligible` is already narrower than _heard from
in the last five minutes_ in a way the phrase does not convey — the wording has
to survive that.

**Out of hours there is nothing to count.** Task 5.4.2 gates the pass on
`basis === "observed"` and reports `eligible: 0`, because `eligibleMoves`
answers on the `session` basis when the regular session is shut and a pass that
ignored the basis would rank **yesterday's 15:55→16:00 pair as unusual activity
right now, for ever** (eviction in `trailing-window.ts` is relative to each
security's own newest bar). So until Task 5.4.5 writes the nightly row, the
region is empty for ~80% of the week and your sentence has to be honest at zero.

<!-- Amendments from later tasks are appended here as:
## Amended by Task N.M.K — YYYY-MM-DD: <what changed> -->

---

## What was done — 2026-10-16

### The sentences, verbatim

With a feed arriving:

```
Of the 501 companies we track, 466 were heard from in the last 5 minutes and 455 have a long enough history to rank. 9 have too short a baseline and 2 cross an unadjusted price break. Nothing newer than Oct 15 · 14:01 EDT has reached us.
```

At zero — out of hours, every gated run, ~80% of the week — the cut, the
refusals and the age are **absent rather than empty**, which is ADR 0029's rule:

```
Of the 501 companies we track, none were heard from in the last 5 minutes.
```

The second is what the local page draws today, read out of the live DOM at
1440×900 with the market shut and `provider=none`.

And the screen's source note gains a **third `dt`** — `Baselines` →
`All US exchanges` / `Ranked against 60 sessions of stored bars, generated for
Oct 14.` — drawn only where the frame carried a generation, so **absent locally
and on CI**. That is invariant 6 discharged for this figure: `/` was drawing a
number resting on 60 sessions of stored **SIP** bars while its numerator is
**IEX**, and nothing on the screen could say so.

### Two of my own instructions were wrong, and the canvas was right both times

**1. "A second `MeasuredSet` instance through the same function" is not possible
honestly.** `describeMeasuredSet` renders `Of the {tracked} companies we track,
{count} were heard from in {window}` — fed `tracked: eligible, count: scored` it
says _Of the 466 companies we track, 455 were heard from in the last 5 minutes_,
**false in the lead and false in the predicate**. The canvas §06 said the right
thing — _"the third population is a conjunct on the same sentence rather than a
second sentence"_ — and that is what shipped: an **optional `ranked`** on
`MeasuredSet`, rendered by the one builder, with the agreement (`1 has` /
`455 have`) in one place. **`MeasuredQualifier` is untouched at two members**, so
`Market breadth`'s and `Movers`' strings are byte-identical.

**2. Quoting the refusal strings verbatim and "the region must not grow" were
mutually exclusive**, and the measurement settled it rather than an argument.
`Baseline too short to rank: 9. Baseline crosses an unadjusted price break — not
comparable: 2.` is a **fifth line at 308 px**, taking the region **458 → 474 at
390** (+16 px, stepping the lower page) and costing nothing at the three wider
widths. Sharing the subject still costs the line. The shipped counted grammar
keeps **both kinds distinct and both load-bearing words** — _baseline_ and
_unadjusted price break_ — lives in one home beside the per-security strings, and
measures **four lines at every width even with three-digit counts**
(`344 are too short… and 11 cross…`).

### The height, re-taken in all 42 cells — unchanged

| state                  | 1440×900 | 1024×900 | 768×800 | 390×780 | 1440×700 | 1440×680 |
| ---------------------- | -------- | -------- | ------- | ------- | -------- | -------- |
| all seven drawn states | **491**  | **491**  | **458** | **458** | **491**  | **491**  |

`scrollHeight === clientHeight` in all 42 — 489/489 wide, 456/456 narrow.
**`.claim` is 64 px — exactly the four micro lines Task 5.4.3 reserved — in
every state that draws it**, at 308, 323 and 686 px of paragraph. The
reservation draws no claim string at all. This is the claim the task most easily
broke and it did not.

### A silent failure mode found by using the thing

`e2e/specs/overview-source-note.spec.ts`'s `noteOf` requires **every** `dt` to
be in its `TERMS` list — so a fourth term would have made the note
**unfindable**, returning `null` and reading as _no note drawn_ rather than
failing an assertion. Found by adding the term, not by reading. `Baselines` is
now in both that list and `one-provenance-note-on-the-landing-route`.

### The guard, green on its own defect first

`the-cut-has-one-home-and-is-read-off-the-frame`, two conjuncts. With
`Unusual.tsx` holding `const alsoTheCut = \`${String(view.rows.length)} have a
long enough history to rank\`;`— **one import, two builders** — and the check
not yet written:`61 invariants hold.` Red after, for the right reason:

```
✗ the-cut-has-one-home-and-is-read-off-the-frame
  The cut phrase is written in 2 shipped file(s), expected exactly 1 in apps/frontend/src/market/measured-set.ts:
    apps/frontend/src/components/Unusual/Unusual.tsx
    apps/frontend/src/market/measured-set.ts
1 of 62 invariants failed.
```

**Conjunct two proved separately** — a population spelled rather than read:

```
✗ the-cut-has-one-home-and-is-read-off-the-frame
  A population spelled rather than read:
    apps/frontend/src/market/unusual-activity.ts — ranked: 455
```

Both conjuncts matter: the one-conjunct draft of the neighbouring check once
reported `52 invariants hold.` against the defect.

### A break that went red TWICE and established nothing

Performing the break by hand found a trap worth more than the break. The first
substitution **deleted** the `find` text, so the registry's own `find` no longer
matched: **`every-break-can-still-land` went red about the break**, and the guard
under test went red on **a different clause of its own** than the one the plant
was written for. Two reds, a failing run, **nothing whatever established** — and
it reads exactly like a thorough proof. The entry now **keeps the found line and
appends the defect beside it**, so the `find` survives its own break.
`CLAUDE.md`'s _Red for the wrong reason reads exactly like proof_ is amended with
it, because the existing wording covers a decayed substitution and not a deleting
one.

Checksums either side of the hand-performed run: `1800c00d…a9d7a5` before and
after, identical. **The registry run is owed post-commit.**

### A figure corrected in a neighbour's record

`Unusual.test.tsx`'s header comment recorded the narrow heights as **323**,
written from a five-row region before the owner took ten. It is **458**, and
`27N − 1` is why. Corrected in place with the reason, because a figure in a
comment is quoted by the next reader who needs one.

### Gates

`pnpm verify` — **exit 0**, **`62 invariants hold.`**, `507 / 1161 / 1627 / 60`
tests passed, no `Unhandled Errors` block. Two earlier runs were red and both are
recorded rather than tidied: one on `format:check` (four files, fixed with an
explicit `prettier --write`), and **two of four runs** on
`market-gateway.process.test.ts > leaves a HEALTHY client on the same process
untouched` (`expected +0 to be 1`) — against a diff touching **no backend
file**, passing **6 of 6** standalone `pnpm test:process` runs including five
back to back at load 11.86, and failing only as `verify`'s last step. That is
`docs/GAPS.md`'s third characterised flake, measured at **n = 96 across four arms
with its rate running 0% → 79% monotonically in load**, and it is **inside
`verify`**, so it can fail the required gate with no browser involved.

`pnpm e2e "specs/overview-"` — **92 passed, 2 skipped, 0 failed (2.4 min)**,
the kept degraded grid at four widths included, plus the new
`overview-unusual-denominator.spec.ts`: the drawn sentence, the cut read out of
`Accessibility.getFullAXTree`, and the note naming the baseline's tape **while
the region does not**.

`pnpm probe / --within "Unusual activity"` at four widths, screenshot looked at,
plus the furnished six-pair instrument at 1440×700 and 1440×680.

**The orchestrator's own full `pnpm e2e`: 262 passed, 17 skipped, 4 FAILED**,
load read **before** at 5.97 on eight cores (ratio 0.75). Three are the
front-of-margin family — `securities-route:107`,
`security-holiday-week:217`, `security-price-chart:909`, all named in
`docs/GAPS.md`'s own ranked table at 24.9 / 47.4 / 31.1 s against a 30 s budget.

**The fourth was worth stopping for and was investigated rather than re-run
hopefully**: `overview-degraded-grid.spec.ts:1105 › the degraded grid at 1024`.
That is the **kept** grid, it is on `/`, it **fails in both directions**, and it
partitions by drawn string against declared class — exactly what this task's new
footer strings could legitimately break. **Re-run scoped: 4 passed at all four
widths in 1.2 min, at a load average of 27.76** — i.e. it passed on a machine far
_more_ contended than the one it failed on, which is the signature of contention
rather than of this change.

**And the reason the grid is untroubled by this task is worth writing down**: its
seven surfaces are `Market proxies`, `Sector performance`, `Market breadth`,
`Movers`, the source note, the feed cell and the service cell — **`Unusual
activity` is not one of them**. Adding it is AC 10's work and Task 5.4.6's, and
until then **the kept grid cannot see this region at all**. The source note _is_
a surface and did change, and it passed because the third term is absent without
a baseline generation, which these fixtures have none of.

So **0 of 5 full runs across this story were clean**, against that entry's
recorded 0 of 3.

### Owed

`pnpm break the-cut-is-spelled-rather-than-read` through the registry, on a
clean tree.

## For a stakeholder — a status report, 2026-10-16

**The new region now says what it measured over, and the screen says where the
data came from.** It reads: _"Of the 501 companies we track, 466 were heard from
in the last 5 minutes and 455 have a long enough history to rank. 9 have too
short a baseline and 2 cross an unadjusted price break."_ When nothing has
arrived — which is most of the week — the clauses about the cut and the refusals
**disappear** rather than printing zeros, because a fully-formed statement about
nothing is a false impression rather than a courtesy.

**Why that matters more than it looks.** A ranked list looks equally confident
whether it saw the whole market or a tenth of it. This region ranks within _the
part of the market we heard from in the last five minutes_, and two separate
reasons can stop a company being rankable at all — too little history, or a
share split in its recent history that would make the comparison nonsense.
Those two now read differently on screen, because a reader who cannot tell them
apart learns nothing from either.

**And the page finally attributes a third kind of data.** The figure rests on
sixty sessions of stored prices from the full consolidated tape, while the
live half comes from a single exchange — two different sources inside one row,
and until today the screen could not say so. That is one of this product's
non-negotiable rules: where a number came from is displayed, never implied.

**Two of my own instructions to the implementer were wrong**, and the design
canvas was right both times. The first would have produced a sentence that was
false in two places at once — _"Of the 466 companies we track…"_ when the number
we track is 501. The second asked for wording that measurement showed would not
fit: quoting the refusal text exactly needs a fifth line of text on a phone and
would have pushed the rest of the page down 16 pixels. The shipped wording keeps
both distinctions and fits at every width, even with counts in the hundreds.

**One thing was found by using a test rather than reading it**: the check that
confirms the screen's source note is drawn would have gone _silent_ rather than
failing when a third source was added — reporting "no note at all" instead of
"this note has something new in it". Fixed.

**And a safety check went red twice while proving nothing.** Breaking it by hand
removed the very text the harness looks for, so two different alarms fired,
neither of them the one that mattered — a failing run that reads exactly like a
thorough proof. The repository's rule about that has been amended, because it
described a related mistake and not this one.

**What is still not disclosed, and it is now written down.** The list is biased
towards companies we hear from often: a row needs two prices exactly five
minutes apart, and per-company coverage on the live feed runs from near-complete
down to about 2%. The sentence says how many we heard from; it cannot say _which_.
That is recorded in the standing list of things no check guards, with a
re-measure and an owner.
