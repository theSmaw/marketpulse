# Task 2.14.7 — Every failure and partial state in the epic, checked as a set

**Status:** Not started
**Story:** [2.14 Market-Data Provenance, Partial States & Epic Close](STORY.md)
**Depends on:** 2.14.3, 2.14.4, 2.14.5, 2.14.6

## Objective

Acceptance criterion 3, and the local half of criterion 5. Take every failure
and partial state this epic can produce — **as a set, in one sitting, on one
screen size, by a person looking at them** — and establish three things: each is
a designed state, none of them produces a global error screen, and together they
speak in one voice.

The per-component work is already done. Story 2.10 shipped six union members,
Story 2.13 shipped four more states of a window change, and each was reviewed
against its own story. **Nothing has ever reviewed them against each other**,
which is where a product acquires four different words for _"we could not reach
the server"_.

## What the user can see when this lands

**The product behaves the same way every time something is missing** — and looks
deliberate while doing it. This is the criterion §36 makes a product
requirement: failures degrade locally, the rest of the workspace and any
gathered evidence stay visible and labelled, and there is no global error screen
anywhere in the epic's surface.

## What is already decided and must not be re-taken

- **Every state is produced from a named cause and reviewable in a stories
  grid** — the copy matrix, visible text against announced sentence for every
  state, is in Story 2.10's `TASK-08`. **Read it before rewriting any of it.**
- **A wait longer than 160 ms is covered by a pulsing panel over the picture,
  never over a number**, and the in-flight rail sentence was withdrawn because it
  lived 3–68 ms (ADR 0028, amended 2026-09-14). Do not reintroduce a sentence
  nobody can read.
- **The last answer stays on screen until a newer one replaces it.** A window
  change never blanks the page.
- **One `Try again` per screen**, and every failure has an honest sentence.
- **A 5xx never carries the thrown message**, and a natively `disabled` control
  is not focusable — so anything `aria-describedby` hangs off it is unreachable,
  which is why `TextField` renders `aria-disabled` + `readOnly`. Both of those
  are shipped rules this pass verifies rather than re-decides.

## Work

- **Enumerate the set before producing any of it.** At minimum: search
  unavailable; the universe unreachable; a security not in the universe; a
  security found with no data; both empties (2.14.6); a partial window; a chart
  request failed; a window change refused by the cap; a window change failed with
  the previous window still readable; the stale mark; the untracked badge; the
  backend unreachable entirely; a security page opened cold with no backend at
  all. Write the list into `PROVENANCE.md` — the list **is** the deliverable of
  this bullet, because a set checked from memory is a set with a hole in it.
- **Produce each one for real**, against a running pair. `store:bare` gives the
  empties; a stopped backend gives the unreachable states; `?sessions=` beyond
  the cap gives the refusal. Where a state needs a body no server sends, it is a
  story rather than a browser — and that fact goes in the list beside it, because
  "reviewed in Storybook" and "seen in the product" are different artefacts.
- **Look at them side by side.** Screenshot each, at 1440 and 390, with
  `pnpm probe`. The point of the pass is the comparison, and it is invisible one
  state at a time: four sentences that are each individually fine and
  collectively four different voices is the exact defect this task exists to
  find.
- **Check for a global error screen at every level**, which is the one hard
  criterion in the set. The `ErrorBoundary` exists and a thrown render is the way
  to a full-page failure; verify that each region's failure stays in its region,
  and remember that a boundary reset cannot recover state that lives **above**
  the boundary (that is a documented non-assertion, not a bug to chase).
- **Cover the failure states in the local browser suite** — criterion 5's local
  half. `backend-failure-states.spec.ts`, `security-series-states.spec.ts` and
  `security-window-change.spec.ts` exist and are the homes; extend rather than
  add a parallel file. Two suite rules apply: **before asserting on a number,
  ask whether CI has the data** (518 securities, zero bars), and a chart mark is
  **counted** rather than asserted visible, because a horizontal gridline is zero
  pixels tall and Playwright reports it `hidden`.
- **Run scoped while iterating.** `pnpm e2e security-series-states.spec.ts -g "…"`
  is seconds; the whole suite is five minutes and is for the end.

## Done when

- The enumerated set is in `PROVENANCE.md`, each entry with how it was produced
  and where it was seen — product or story.
- Every state renders as a designed state at 1440 and 390, and the screenshots
  were looked at as a set.
- No state in the set produces a global error screen, and that was verified
  rather than assumed.
- The local browser suite covers the failure states; `pnpm e2e` is green.
- `pnpm verify` passes.

## Notes

This task is where this epic either reads as trustworthy or reads as broken, and
it is the one most likely to be declared done from a green suite. A green suite
says the states exist. It says nothing about whether they speak the same
language, and that is the entire deliverable.
