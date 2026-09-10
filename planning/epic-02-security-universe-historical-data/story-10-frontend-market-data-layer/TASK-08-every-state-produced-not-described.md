# Task 2.10.8 — Every state produced rather than described, and what happens while the next one loads

**Status:** Not started
**Story:** [2.10 Frontend Market-Data Layer & Application State](STORY.md)
**Depends on:** Task 2.10.7

## Objective

Take the union Task 2.10.4 defined and produce every member of it on screen from
a named cause, decide what the page does _while_ a series is being replaced, and
settle the announcement pattern for an asynchronously-filled surface — which the
story explicitly makes this story's rather than Story 2.11's, because it is a
property of every consumer of this layer.

## What the user can see when this lands

**The panel telling the truth in every situation it can be in**, which is the
difference between a demo and a product.

- **A partial answer rendered as an answer** — "we hold 1,438 of the 1,950
  minutes you asked for, through 15:42" — rather than as an error or, worse, as a
  complete series that is silently short. This is §36's shape and the state Story
  2.4's static list could not produce
- **An empty series rendered as an answer**: we have nothing stored for this
  symbol yet, which is true for real symbols in the real store
- **A refusal that names its number**: 10,000 bars is the limit, and a window
  outside the calendar's range refuses rather than quietly returning less
- **The previous series staying on screen, marked stale, while the next one
  loads**, rather than the panel emptying and refilling. Story 2.13 needs this
  for its window control and Epic 3 needs it for a live feed, and deciding it
  here is what stops each of them deciding it differently

## Work

- **Produce each state from a named cause.** A state produced by flipping a
  boolean proves the component and not the wiring — Task 2.4.4's rule, and it
  found real defects. The causes, each of which is available today:

  | State              | Named cause                                                                                                      |
  | ------------------ | ---------------------------------------------------------------------------------------------------------------- |
  | partial            | ask for a window that starts before this symbol's backfill does — `pnpm bars:check` says what is missing and why |
  | empty              | a tracked symbol with no stored bars, or a window entirely before coverage                                       |
  | refused (cap)      | ask for a year of minute bars; the 400 names 98,280 against 10,000                                               |
  | refused (calendar) | a window outside 2024–2028                                                                                       |
  | unreachable        | stop the backend                                                                                                 |
  | retryable          | `DATABASE_PORT=59999 node dist/index.js`, which produces a real 503                                              |
  | retrying           | press the retry with the connection throttled, or hold the answer with a route intercept                         |
  | answered badly     | point `VITE_API_BASE_URL` at a static host, which answers 200 with `index.html`                                  |
  | loading            | a throttled connection or a route intercept                                                                      |

- **Decide what happens to visible data while new data loads, and record the
  decision with its reversal trigger.** A panel that empties and refills flickers;
  one that keeps the old data and marks it stale is the §36 shape. The trap is
  that stale data marked insufficiently clearly is worse than no data, because an
  analyst reads a number that is no longer about the thing they just selected —
  so whatever marks it has to survive the same rule as everything else here:
  **not colour alone**, and it must not make the number harder to read.

  Note this is the decision Story 2.13 inherits for its window control and Epic 3
  inherits for a live feed, so it is written down rather than left in a component.

- **Settle the announcement pattern for this layer, generalising Task 2.4.5's
  finding rather than re-deriving it.** `UniverseTable`'s `Announcement` is a
  **persistent `role="status"`, rendered in every state, never unmounted, silent
  on arrival**, and all three clauses are load-bearing: a live region added at the
  same moment as its content is not reliably announced; `alert` is
  `ErrorFallback`'s and the browser suite asserts on that distinction on every
  route; and arriving at a page is not a change, so a sentence there is only a
  second copy of the visible line.

  What is new here and was not true of a static list: **the content changes more
  than once**, when the symbol or the window changes. So this task has to answer a
  question that page could not raise — what a region says when a _second_ series
  replaces a first, and whether a stale-then-fresh sequence announces once or
  twice. Decide it, and note that a region which announces on every keystroke of
  Story 2.11's search would be actively hostile.

  > **Amended 2026-09-10 by Task 2.10.2, which hit the mechanism half of that
  > question on a single retry.** **A live region whose text does not change
  > announces nothing.** So "once or twice" is not only a taste decision: any two
  > consecutive states that produce the _same sentence_ are silent, and the case
  > nobody pictures is the one that matters — a retry, or a window change, that
  > lands on the state it started from. On the universe page that would have made
  > a second identical failure completely inaudible, and the fix was a distinct
  > in-between sentence (_"Trying the tracked universe again."_) that the region
  > passes through and back out of, which is what makes the return audible at all.
  >
  > Two consequences here. A stale-then-fresh sequence that ends where it began
  > needs something to have changed in between, or it says nothing. And a sentence
  > built by concatenating a state's own copy is identical across a refetch that
  > changes nothing — which is the common case for a closed session's bars, and is
  > arguably the correct silence there. Decide it rather than inheriting it.

- **Cover the states where they can actually be seen.** Component tests can
  assert structure and text; **no test can assert colour**, because no stylesheet
  is applied in the test environment, and that is structural rather than a
  discipline. A browser spec is the only level that sees the stale treatment and
  the contrast. Add browser coverage for the one property that matters most and
  is cheapest to lose — that the live region is the **same DOM node** before and
  after the content changes — which is the assertion `e2e/` already makes for the
  universe table and the reason it caught the original defect.

- **Do not add a control that changes the window.** Story 2.13 owns the window
  control, and this task needs a second window only to _produce_ the transition —
  a URL edit is enough. A control added here is the next story arriving early and
  arriving without its calendar rules.

- **The retryable failure brings a control, and it will be the third copy of the
  button rule — extract it here** (added 2026-09-10 by Task 2.10.2). This
  product's button treatment now exists twice, in `ErrorFallback.module.css` and
  `UniverseTable.module.css`, and the panel's retryable failure is the third.
  **Three is where this repository extracts**: the visually-hidden idiom moved to
  `styles/a11y.module.css` at its third copy, and `Marker` took the geometry and
  the silhouettes off three components that were each remembering them. So this is
  the copy that pays for a shared control rather than the one that makes it
  inevitable — and whatever is extracted lands under `src/components/`, which
  means it owes stories.

  What must **not** travel with it is the surrounding treatment. `ErrorFallback`
  carries a red rule and `role="alert"` because a render failure is what it
  reports; a service that is briefly unavailable is a product state (§36) and
  carries neither. The shared thing is the control, not the error language.

## Done when

- Every member of the union has been produced from a named cause and seen on
  screen, and the causes are recorded so the next person reproduces rather than
  re-invents
- A partial answer says how much we hold and through when, from the response
  rather than from a constant
- Both refusals name their number or their range
- The stale-while-loading behaviour is decided, implemented, marked without
  relying on colour, and recorded with a reversal trigger
- The announcement pattern is settled for a surface whose content changes more
  than once, and the browser suite asserts the region is the same node across a
  change
- A state that is re-entered — a retry or a refetch landing where it started — is
  still announced, or the decision not to announce it is recorded with its reason
- `pnpm verify` and `pnpm e2e` both pass
