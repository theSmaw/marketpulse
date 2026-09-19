# Task 3.4.3 — Three treatments on a real screen, and the decision

**Status:** Not started
**Story:** [3.4 The Motion Vocabulary & the First Price That Moves](STORY.md)
**Depends on:** 3.4.2

## Objective

**Settle the design criterion this product has answered _not yet_ eight times.**
Put real options in front of the owner on a real moving screen, and take the
decision.

## What the user can see when this lands

**Two or three prices moving, side by side, differently** — a comparison page in
the workshop, or the same screen reloaded three ways. Not a deliverable; the
instrument the decision is taken with.

## What is already decided and must not be re-taken

**The canvas comes first, and it is reachable.** ADR 0026's chain is canvas →
`VISUAL-LANGUAGE.md` → `tokens.css` → components, and **the motion row is the one
place in this product where it has already run backwards** — that row owes a
sync and says so. Tasks 3.3.5 and 3.3.6 reached the canvas and added
`Live in the chrome.dc.html` to it, so **this story's section recording it as
unreachable is stale** and should be corrected rather than inherited.

**Read `Live in the chrome.dc.html` §07 before drawing.** It reserved this
position by name, and it carries the three constraints below.

### The three constraints that arrive with the position

1. **Motion means work in progress, and nothing else may borrow it.** A price
   that has _changed_ has finished changing — so whatever marks it must be
   distinguishable at a glance from the hairline that marks a request in flight,
   or one of them is lying. It already governed a shipped decision: the chart
   rail's settled states are static and only _refreshing_ travels.
2. **Green means price-positive.** The identity accent is crimson, scoped to
   four positions in the chrome. **Green is spent.** A treatment arriving in a
   colour has to answer what that colour already means here.
3. **`LIVE` stays still.** It is a statement of fact about a connection. If this
   task concludes the word itself should acquire motion, that is a **reversal of
   a decision taken with its reasoning written down** and wants the same
   treatment rather than a quiet edit.

### And two rules with teeth

- **Motion must never make a number harder to read.** A value that fades or
  slides while an analyst is reading it is worse than one that changes
  instantly. This is what makes a market application's motion genuinely hard and
  why the existing set is three tokens.
- **Colour is never the sole encoding of anything.** The price palette differs by
  **1.04:1 in greyscale**, so hue is the entire difference between up and down —
  shape, sign, glyph or word must carry it. A green flash and a red flash are
  **the same flash** to a large number of readers, and this repository has
  already caught a real defect where four greyscale simulations passed against a
  chart that was wrong.

## Work

- **Sync the canvas first**, then draw. The motion row's debt is discharged here
  or it is recorded again with a reason.
- **Build two or three treatments that actually run.** The candidates the story
  names: a direction-carrying flash, a brief emphasis on the digits that
  changed, a mark that appears beside the number, or **nothing at all with only
  the digits swapping** — which is 3.4.2's shipped state and is a real option
  rather than the control.
- **Show them at 1× against the replay**, side by side, and **ask the owner**.
  Open decision 1 is theirs and the standing instruction about the bar applies.
- **Ask open decision 2 in the same sitting**: does an unchanged tick show
  anything? A feed saying _still 174.32_ is information, and drawing it is the
  difference between a live application and a static one during a quiet minute —
  and also between a calm screen and a twitching one.
- **Check every candidate in greyscale before showing it**, so a treatment that
  fails rule 2 is never a candidate.

## Done when

- The canvas is synced, or its unreachability is recorded in the motion row's
  own terms
- Two or three running treatments were shown at **1×**, not described
- **The owner decided**, and the rejected options are written down with why
- Open decision 2 is answered
- Every candidate was checked in **greyscale**
- Nothing is shipped yet — Task 3.4.4 implements the answer
