# Task 4.5.6 — The denominator, the two grammars, and the one-sided market

**Status:** Not started
**Story:** [4.5 The Movers, & the First Surface That Ranks by a Live Value](STORY.md)
**Depends on:** 4.5.5

## Objective

**The ranking's honesty.** A top ten computed over the ~466 names heard from may
show ten securities that are **not** the ten biggest movers, and **a ranked list
looks exactly as confident whether its input was complete or not.** This is
`EPIC.md`'s _an aggregate is the one kind of number that can be wrong while
looking right_ in its sharpest form.

## What the user can see when this lands

**A sentence under the two lists saying what they were ranked over**, and an
honest answer in every state where a list is short, empty or about a market that
is shut.

## Work

### The denominator, restated here — the owner's Gate 1 decision

Breadth states _"Of the 503 companies we track, 451 were heard from in the last
5 minutes."_ 200–300 px away. **This region states it too**, because a ranking's
whole honesty rests on it and a reader must not cross the page to learn whether
the top five is the top five.

**Both clauses read the same `measured` / `tracked` on the same frame**, so they
cannot disagree — and that single producer **owes a check**. The window figure is
**read, never spelled**: `5` comes off the frame as `windowMinutes`, because a
rollback can put a gateway and a bundle two values apart.

**No feed word.** A sentence reaching for `live`, `stale` or `disconnected`
trips `one-home-for-the-feed-words` and **would deserve to**. No venue, no
instant — `computedAt` is the source note's, once for the screen.

**Drawn and spoken built from one value**, `BreadthClaim`'s idiom, even if they
come out identical — so they cannot diverge later. **Check it reaches a
listener with `Accessibility.getFullAXTree`, not the DOM**: Story 4.4 found N
reached no listener at all because its only printed home was an `aria-hidden`
ladder, and **this region has no ladder at all**, so there is no printed
endpoint anywhere.

### Two grammars, keyed on the basis the wire sent

_Heard from in the last 5 minutes_ is **false about a closed market** —
breadth's own recorded reason for having two grammars. Keyed on `basis`, never
on a clock this module reads, so neither can render the other's: `windowMinutes`
does not exist on the session member and `session` does not exist on the
observed one, which is a **compile error rather than a wrong sentence**.

### The one-sided market, which is the state nothing has ever drawn

Each list holds only rows whose `directionOf` matches it (Gate 1). So on a
strong trend day **one list is full and the other is short or empty** — and that
is honest, where the alternative draws five gains under a heading saying
`LOSERS`.

**An empty list must say something.** `docs/GAPS.md`: _a region whose content is
legitimately conditional looks identical to one whose content silently
disappeared._ The sentence claims **the heard-from set, not the market** — the
`No shares changed hands anywhere in the window.` lesson, which is the only
shipped sentence that ever over-claimed about the market. Candidate:
`Nothing we heard from declined.`

**And it must agree visibly with breadth**: an empty `GAINERS` beside breadth's
`Advancing 0` is the two regions agreeing, and five rows under `GAINERS` beside
`Advancing 0` is the contradiction to design against.

### The copy defect already on screen

`MarketOverview.tsx:462` ships:

> `"The largest moves among the securities we track, up and down, ranked while the session runs."`

**`securities we track` is 518**, including `SPY` and the eleven SPDRs. The set
is **503 companies**. Yesterday's `the-population-is-never-a-literal` does not
catch it — that clause fires on a **digit** beside `we track`, and this sentence
has none. Fix the word, and **consider whether the invariant should also refuse
the wrong noun** — if it can be keyed on something the re-implementer cannot
avoid writing, it should be; if not, say so rather than claiming a guard that
is a sentence.

### Boundaries

Not the hold (4.5.7). Not the grid or the sweeps (4.5.8).

## Done when

1. The footer sentence renders in both grammars, from one builder, with the
   window read off the frame and no feed word anywhere
2. It reaches a listener, verified from the **accessibility tree**
3. Both this region's and breadth's figures demonstrably come from one producer,
   with a check
4. An empty or short list says something that claims the heard-from set rather
   than the market, and agrees visibly with breadth's count
5. The `securities we track` copy defect is repaired, and the invariant question
   is answered either with a clause or with a recorded reason it cannot be one
6. `pnpm verify` green

## Handed here by Task 4.5.3 — 2026-10-08: your sentence is the ONLY thing that will explain the empty state

**Produced and photographed**: with both lists empty — **CI's permanent state,
for ever, and most of a weekend** — the region draws its name, the head slot
reading `TOP 5 EACH WAY`, the two headings `GAINERS` and `LOSERS`, a rule, and
**nothing else at all**. 466 px of labelled, empty box. That is `docs/GAPS.md`
entry 13 exactly, and your done-when 4 is the only thing in this story that
closes it.

Two specifics the picture adds to that criterion:

- **The sentence has to be honest at zero**, because zero is the state a gated
  machine and a weekend both reach: `of the 503 we track, 0 were heard from`
  with the window is a true, complete explanation; a sentence that only renders
  when something was ranked leaves this box silent.
- **Decide what the head slot says there.** `Top 5 each way` states the
  **bound** and is not false with nothing in the lists, but in that state it is
  the only text on the screen besides two empty headings, and it reads as a
  claim about a selection that selected nothing. The precedent for suppressing
  it is one region up: `SectorPerformanceMeta` speaks **only in the mixed
  state**, on the argument that a claim nobody needs is noise and a claim the
  rows contradict is two true halves and one contradiction. `MoversMeta` takes
  no props today; giving it the view is a one-line change and is deliberately
  left to you, because it is the same judgement as the sentence and should be
  taken once.

**The sentence this task writes has no home yet**: `Movers.tsx` renders an
empty `<p className={styles.claim} />` holding **44 px** (12 margin + two
16 px micro lines), which is in the region's measured budget. Fill that
element; do not add a second one.
