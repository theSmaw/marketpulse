# Task 3.6.2 — The design pass at universe scale: the mark at 518, and the row that has nothing

**Status:** Not started
**Story:** [3.6 Live Prices Across the Tracked Universe](STORY.md)
**Depends on:** 3.6.1

## Objective

**Two design questions that only exist at 518, taken in front of the real table
running at 1×**, and recorded on the design canvas because that is where the
language lives (ADR 0026).

1. **Does the arrival mark survive multiplication?** Story 3.4 decided it on
   **one** number and said so.
2. **What does a row say when it has nothing?** Story 3.1 handed this here by
   name: _518 rows is where "we have no price for this" stops being a
   theoretical state._

## What the user can see when this lands

**A table that is alive rather than twitching**, and a row with no price that
reads as a fact rather than a fault.

Whether anything is _added_ is the decision — **"the mark applies unchanged" is
a legitimate outcome** and must be reachable, not a failure of nerve.

## Question 1 — the mark at 518

**The vocabulary is not yours to re-take.** `The motion vocabulary.dc.html` §05
decided it: a small disc appears beside the figure and **decays over 900 ms**,
and it fires **when a bar arrives**, not when the price changes — so it says
_a bar arrived for this security_, which nothing else on the screen says. A
vocabulary is one decision and three surfaces would make it three.

**What is open is whether it applies unchanged at this scale**, which is a
different question from what the mark means.

### The arithmetic, and the trigger that is aimed at you

**The reversal trigger is already written**: _the first time a reader reports
the mark as noise, or the first surface where it fires more than once a second._

At 518 rows receiving roughly one bar a minute that is **8.6 marks a second**
across the page. **Read the trigger as having fired unless you can show it has
not.**

Two figures bound the problem rather than settle it:

- **The reducer is not the cost.** Task 3.4.8: 6,640 observations through a
  production build, **p95 52 ms**, **zero** long-task entries.
- **518 elements each running a 900 ms animation is a different question**, and
  it is this task's. Take it from `pnpm probe` and a `PerformanceObserver` on
  `longtask` — **unbuffered**. Buffered returns the cold load, which on this
  exact page is Epic 14's known **50–76 ms** breach arriving inside a
  measurement about something else.

### And the honest complication

**About 321 of 518 rows produce a bar in a given minute** (§7.6), not 518. The
worst case and the ordinary case differ by a third, and a rule designed against
518 is designed against a minute this feed does not have. **Measure the real
distribution before designing against the ceiling.**

### Candidates, to be held against the running table rather than reasoned about

- **Unchanged.** The mark fires per row exactly as it does on the security page.
- **Only rows in the viewport.** Cheap now — but it couples a visual rule to
  scroll position, and a row that marks only when watched is making a different
  claim.
- **Only rows whose value changed.** This **reverses §05's decision** for this
  surface — the mark would go back to meaning _the price moved_, which the `▲`
  already says. If this wins, it is a change to the vocabulary and belongs on
  the canvas beside the decision it qualifies.
- **Nothing per row; the chrome's connection word carries it.** The quietest,
  and it gives up the one per-security feed signal the product has.

**Run it, do not draw it.** `The motion vocabulary.dc.html` §03 is the
precedent: four treatments running at the product's real cadence, with a
greyscale switch and a 10×-for-iteration-only switch, and the decision taken in
front of it at 1×. **A static mock cannot settle a motion decision**, and a
vocabulary tuned against a 10× replay is a vocabulary designed for a market that
does not exist.

## Question 2 — the row that has nothing

**None of `live`, `stale` or `disconnected` fits.** The feed is healthy, the
connection is up, nothing is wrong, and there is no price. §11.2 refuses a
per-security **status word** and the measurement behind that refusal is
decisive: p50 gap of one minute, **maximum 187**, so no threshold separates a
quiet security from a broken one.

**So whatever this is, it is not a judgement about the security.** What is
available honestly:

- The **stored close**, which is a real number with a real session behind it
- The **age** of the row's own observation, if it has one — `SecurityRow`'s
  removed feed column named this as what a security gets instead, _Story 3.6,
  across 518 of them at once_
- **Nothing at all**, which is what the row does today

**Two states must not read identically**, and that is the defect the Epic 2
state pass found twice: a row that has **no live observation this minute** and a
row for a security **we hold no data for at all** imply different next actions.

**And every deploy produces an empty table** (§10.3), refilling unevenly — a
liquid name within a minute, `ERIE` possibly not for hours. Whatever is designed
has to be correct for a screen where **all 518** are in this state at once, not
just a scattered few.

## The standing rules, which do not bend here

- **No accent on a datum, ever** — including a highlighted row and a featured
  ticker. The crimson identity accent is scoped to four positions in the chrome.
- **Colour is never the sole encoding.** The price palette differs by
  **1.04:1 in greyscale**.
- **Motion must never make a number harder to read.** No flashing panel behind
  digits, no count-up, no cross-fade — the rule that ruled out what most market
  software reaches for first.
- **Work in progress LOOPS, a state PERSISTS, a fact arriving DECAYS.** A fourth
  behaviour is a change to the vocabulary rather than to a component.
- **`prefers-reduced-motion` is answered once, at the token layer** — the
  durations resolve to `0ms`. A consumer reading the tokens honours it by
  construction; hard-coding a duration is the only way to get it wrong. **And
  the information must survive the motion being removed**: the new value and its
  `▲` are already on screen, and the mark only says _look_.

## Work

- A canvas page for this story, in the existing design language — reuse rather
  than reinvent; `Universe navigation.dc.html` is this table's own precedent and
  already carries its bands, its sticky-header finding and its rejected options
- The mark's behaviour at scale, **running**, against the real cadence, with
  greyscale and an iteration-speed switch
- The empty row's treatment, at one row and at all 518
- Both decisions recorded with their alternatives and a **condition-shaped**
  reversal trigger
- Reconcile downward: canvas → `VISUAL-LANGUAGE.md` → `tokens.css` → components,
  and **only if a token is actually needed** — the expected answer is none
- `pnpm probe` at 1440, 1024, 768 and 390, and **look at the page** before
  running a suite

## And a debt on the canvas this task should clear while it is there

**The epic re-ordered on 2026-09-21 and the renumber did not reach the design
canvas.** Every local reference was remapped in that change — the `Story N.M`
forms, the directories, the dependency lines, the epic table, the rehearsal
ledger and six source comments — but the canvas is a separate store reached
through `DesignSync`, and a grep over the repository cannot see it.

**Known stale, and confirmed by reading it:** `The motion vocabulary.dc.html`
says _the chart is Story 3.7_ and _Stories 3.6 and 3.7 inherit it_. **The chart
is Story 3.9.** Other pages may carry the same staleness and have not been
checked.

| Story                                            | Was | Now     |
| ------------------------------------------------ | --- | ------- |
| The Tape on the Bar                              | 3.8 | **3.7** |
| Storing the Live Session                         | 3.9 | **3.8** |
| The Live Edge on the Chart & the Two-Feed Ledger | 3.7 | **3.9** |

**This task is the next thing that opens the canvas**, so it clears it: check
every page for a `Story 3.7`, `3.8` or `3.9` reference and remap it. Leave
figures that merely look like story numbers alone — that is the trap the local
renumber was careful about, and the canvas has its own (`3.8× normal`).

**It is worth noticing why this was missed rather than only fixing it.** ADR
0026 makes the canvas the **source of truth** for the design language, and a
source of truth that no local check can read is one that goes stale silently.
`pnpm links` walks 374 documents and cannot follow a single reference into the
canvas.

## Done when

1. The mark's behaviour at 518 is decided in front of the running table at 1×,
   with the long-task figure taken unbuffered and recorded
2. The empty row has a treatment that is not a status word and does not read as
   an error, correct both for a scattered few and for all 518
3. Two states that imply different next actions do not read identically
4. Both decisions are on the canvas with alternatives and a reversal trigger
5. The canvas's stale story numbers are remapped, and any page that could not
   be checked is named
6. `pnpm verify` passes, and `pnpm probe` output is recorded rather than
   described
