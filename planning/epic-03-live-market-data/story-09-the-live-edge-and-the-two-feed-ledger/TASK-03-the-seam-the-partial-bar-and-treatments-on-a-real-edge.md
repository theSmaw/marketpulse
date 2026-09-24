# Task 3.9.3 — The seam, the partial bar, and treatments on a real edge

**Status:** Not started
**Story:** [3.9 The Live Edge on the Chart & the Two-Feed Ledger](STORY.md)
**Depends on:** 3.9.2

## Objective

Settle this story's two open decisions **in front of a chart that is actually
extending**, and take the seam decision with them. Story 3.4's rule governs what
is added here: **work in progress LOOPS, a state PERSISTS, a fact arriving
DECAYS.**

## What the user can see when this lands

**Nothing yet.** This is the argument and the artefacts; 3.9.4 draws the result.
That separation is Story 3.4's (3.4.4 decided, 3.4.5 tokenised, 3.4.6 drew) and
it exists because a treatment argued and shipped in one change is a treatment
nobody compared.

## Three decisions, each with what makes it hard

**1. Is the minute in progress drawn as a bar?** Open decision 1. It is a real
observation of an incomplete minute, and drawing it identically to the 389
complete ones is a small false impression of exactly the family ADR 0029
refuses — _a claim about data requires data_. Against that: a chart whose last
point flickers in and out of existence every minute is worse than one that is
slightly optimistic, and the figure beside it in the identity block has already
made the same claim without hedging. Task 3.9.1 narrowed this: the **store**
never holds a partial minute (the writer holds it back), so a partial bar exists
only in the browser and only for the page that is open.

**2. Is the seam between stored and live drawn at all?** The story's own design
bar states the risk in both directions: _a seam drawn too loudly turns a
provenance fact into a decoration; drawn too quietly it is a claim the chart is
not making honestly._ Note what the seam is **not**: it is not where the data
becomes less trustworthy — both stretches are real bars — it is where the
**tape** changes, and the source note already says that in words with counts.
A second rendering of one fact needs an argument, and _one fact has one home_ is
this repository's rule.

**3. Does the edge mark?** The `[data-arrival]` handle is shared — the identity
block and all 518 table rows carry it, and a page-wide count on
`/securities/:symbol` already counts two. A third is free to build and is a
claim about attention. Task 3.6.2 measured that the mark is **not** the cost at
518 rows, so this is a design question and not a performance one.

## Work

- **Check `DesignSync` first.** ADR 0026's chain is canvas → `VISUAL-LANGUAGE.md`
  → `tokens.css` → components, and the canvas has been unreachable for this
  login twice (Stories 3.7 and 3.8 both recorded it). If it is reachable, this
  is the first story since that genuinely needs it; if not, record the third
  occurrence and work from the document
- Treatments **on the real component**, at 1×, against a real extending chart —
  a recording of a session is acceptable and a static mock is not
- Design artefacts in the Claude Design project, reusing `tokens.css` and the
  `preview/_card.css` idiom the `Universe table` group already established.
  **Prefer reuse to invention**
- The three decisions written down with their rejected alternatives and a
  reversal trigger each, as a **condition** rather than a story number
- A reading of how the two-feed source note and any drawn seam sit together,
  because between them they are two renderings of one fact

## Done when

1. Three decisions taken, each with alternatives and a trigger
2. Artefacts exist and reuse the language rather than extending it
3. Nothing is on screen, and the task says which task draws each decision

---

## Amended by Task 3.9.1 — 2026-09-24: one of the three decisions is withdrawn

**Decision 1 — _is the minute in progress drawn as a bar?_ — is gone.** There is
no minute in progress on the wire: `LIVE-DATA.md` §7 measured that a bar arrives
about half a second after the minute it describes has **ended**, and
`live-bar-writer.ts`'s `isComplete` is a guard against a bar stamped in the
**future** rather than a completeness test. Nothing partial reaches the store or
the browser.

**What takes its place is narrower and is a drawing question rather than a
domain one:** the last bar's numbers change about thirty seconds after it is
drawn, on 0.064% of bars, a third of which move the close. Whether that
correction is visible — a mark, a transition, or deliberately nothing — is the
decision to take here, and it is **not** the same as marking an arrival: the
bar was already there.

**And a measured constraint for decision 2, the seam.** The gaps on either side
of any seam are **invisible**, by design: `ERIE` drew 131 bars and `NVDA` 390
over one session, both the full width of the frame, at 4.3 px and 2.1 px a slot.
So a seam drawn as a break in the line would be the only break on a chart that
hides thirty-odd others, which is a stronger argument against drawing it than
this task's file originally carried.
