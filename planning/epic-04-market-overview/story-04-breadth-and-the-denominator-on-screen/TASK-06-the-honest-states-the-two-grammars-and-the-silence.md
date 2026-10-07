# Task 4.4.6 — The honest states, the two grammars, and the silence

**Status:** Not started
**Story:** [4.4 Breadth, & the Denominator on Screen](STORY.md)
**Depends on:** 4.4.5

## Objective

**The market is shut about 80% of the week, so the second grammar is the common
path rather than an edge case** — and three states that look identical must read
differently.

## What the user can see when this lands

**An honest region out of hours**: last session's close-to-close breadth, labelled
as that session, rather than a blank panel or a stale intraday count. And a region
that says what it has none of when nothing ever arrives.

## Work

- **Two grammars of one sentence, chosen by what the figures are** — the shipped
  precedent is `qualifierOf`'s two grammars in `market-proxies.ts`, and its two
  states are the same two.
  - In session: _Of the 503 companies we track, N were heard from in the last 5
    minutes._
  - Shut: the denominator is **not a coverage figure** — it is how much of the
    store has two sessions behind it, and the sentence names **the session the
    closes belong to**. Note there is **no previous-session date** on
    `SecurityLastClose`, only a number, which is why `sessionChangePercent` had to
    carry its meaning in its name.
- **This discharges the story's own flagged tension.** Close-to-close was rejected
  as _the denominator for the intraday figure_, not as the market-shut answer. The
  two grammars are what make that visible rather than contradictory.
- **Three states that look identical and must read differently:**
  | state                             | means                                                  | draws                              |
  | --------------------------------- | ------------------------------------------------------ | ---------------------------------- |
  | no `breadth` section on the frame | this gateway does not send breadth (a pinned rollback) | the reserved state — **not zeros** |
  | section present, N = 0            | we counted and heard nothing                           | the sentence, no figures           |
  | no frame at all, past the floor   | nothing reached this browser                           | the silence sentence               |
- **The silence floor is `useWaited`, reused** at `SAY_NOTHING_ARRIVED_AFTER_MS`
  (2,000 ms against a first frame measured at 174–277 ms) — **do not invent a
  second floor**. The sentence sits in room the reservation already holds, so
  nothing moves when it appears. **The words are breadth's own**: the strip has no
  _prices_, sectors have no _moves_, breadth has no **count**.
- **N = 0 and N = 1**: no percentage over an empty denominator, and no `100%` over
  one security — technically true and it reads as a statement about the market.
- **A figure heard from but with no measurable move** is in none of the three
  buckets. The owner's rule is that N **is** the sum, so such a figure is outside N
  — **measure how large that set is on the deployed store** before the sentence is
  final, because if it is never empty the wording needs one more word.

## Done when

1. The two grammars are produced, not imagined, and neither can render the other's
   denominator
2. The three look-alike states render differently, each produced through the
   shipped socket path
3. N = 0 and N = 1 draw no percentage, and no state draws zeros where the truth is
   _we have not heard_
4. The region's height is unchanged across every state added here
5. The heard-from-but-unmeasurable set is measured on a real store and the figure
   recorded
