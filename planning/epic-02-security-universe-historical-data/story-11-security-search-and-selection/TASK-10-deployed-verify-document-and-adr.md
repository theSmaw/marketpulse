# Task 2.11.10 — Deployed, verified, documented: the record and the ADR

**Status:** Not started
**Story:** [2.11 Security Search & Selection](STORY.md)
**Depends on:** 2.11.9

## Objective

Close the story: prove the per-security URL deep-loads cold in the deployed
environment, finish `SEARCH-AND-SELECTION.md` as the subject document, write the
ADR, and sweep upward everything this story falsified.

## What the user can see when this lands

**Search, live.** Everything the previous nine tasks built, on the deployed site,
reachable from a link somebody sends. The epic's exit criterion is half met and
demonstrable: **a user can search for NVDA and open it.** The other half — look
at its price and volume — is Stories 2.12 and 2.13.

## Work

- **Deploy and check the deployed thing**, not the local one. Acceptance
  criterion 2 is specifically that **a per-security URL deep-loads cold**, which
  is a property of the host's fallback configuration rather than of the
  application: `public/staticwebapp.config.json` is part of the artefact and the
  three hosts this product runs on behave differently for an unmatched path.
  `pnpm e2e:deployed` and `specs-deployed/host-routing.spec.ts` are the existing
  mechanism.

  **Poll for coherence rather than checking once.** The frontend's upload is not
  atomic; for roughly two seconds around a deploy that changes the artefact a
  cold load can be broken in two distinct ways, and the window _opens_ at the
  second the deploy step reports success.

- **Take the measurements this story owes**, rather than citing any:
  - The universe payload as a browser receives it, re-taken — the client-side
    matching decision rests on it and the figure has already moved twice
  - The bundle, before and after this story, since it added a control and
    possibly an icon
  - Whatever figure Task 2.11.8 recorded about rendering 518 rows

- **Finish `SEARCH-AND-SELECTION.md`.** It was created in Task 2.11.1 with three
  decisions in it; it closes as the subject document for search, selection, the
  Security Explorer shell and the input idiom. It must carry: the matching rules
  and the ranking tiers; where search lives and why; the URL rule and what a
  shared link means; the live-region rate; the keyboard flow from 2.11.9; the
  grouping control and its trigger; and **what a green run does not certify**
  here, in this repository's habit of saying so.

- **Write the ADR — the next free number is 0024** — and add it to
  `docs/adr/README.md`'s index. ADRs are never renumbered and their decisions
  never rewritten. It covers the interactive layer: client-side matching over a
  payload the page already holds, the URL as the home of selection, client-side
  navigation and what it changed about the cache's lifetime, and the input idiom
  this product now has.

- **Add `SEARCH-AND-SELECTION.md` to `CLAUDE.md`'s _Where the record lives_
  table**, and update the _Current state_ section: what a user can see today
  changes materially with this story, and that paragraph is the thing readers
  trust.

- **The upward sweep, and it travels upward rather than sideways.** A story close
  sweeps that story's own documents; what a measurement here invalidates is a
  premise in an ADR, an invariant in `CLAUDE.md`, or `PRODUCT_SPEC.md`. Grep for
  each claim, correct the live sites, give an ADR a **dated amendment** rather
  than a rewrite, and leave the historical records standing. Specific candidates:
  - `VISUAL-LANGUAGE.md` says input fields have never been built and names this
    story as the consumer. That is now false, and the file owns the input idiom.
  - The icon set is recorded as closed at five members. If it gained one, every
    place that says five is a live claim.
  - Story 2.4's reversal trigger for grouping is recorded as unfired. It fired.
  - `FRONTEND-STATE.md` §7's note that nothing changes a live region without a
    user having navigated or pressed something, and its two reversal triggers.
  - Any live claim that the only route to a second symbol is a document
    navigation — 2.11.5 ended that, and it is asserted in more than one file.
  - **Count a duplicated sentence with a grep before correcting it**, and tell a
    live claim apart from a historical record. Story files record what was true
    when written; correcting those destroys the record.

- **Update `STORY.md`, `EPIC.md` and `EPICS.md`** to complete, with what is
  genuinely left in the epic: 2.12, 2.13 and 2.14.

- **Check what `pnpm verify` does not cover** and add to that list anything this
  story introduced of the same class — a claim that is true today and checked by
  nothing, with a **re-measure one-liner** beside it. Likely candidates: a
  focus-order or announcement rule enforced by one component's tests and nothing
  else; the fixture bodies staying out of the bundle now that a second surface
  imports securities; and the summary line's truthfulness under filtering.

## Done when

- The deployed site serves a per-security URL cold, checked by polling rather
  than once
- `pnpm verify`, `pnpm e2e` and `pnpm e2e:deployed` all pass, and the three
  required checks are green on `main`
- `SEARCH-AND-SELECTION.md` is complete and linked from `CLAUDE.md`
- ADR 0024 exists and is in the index
- The upward sweep is done, with each corrected site named
- `CLAUDE.md`'s _Current state_ describes what a user can see today, including
  what they still cannot do
- The four tests of the bar are applied to the deployed screens and the answers
  recorded

## Notes

Two of this repository's own rules bite hardest at a close. **Measure rather than
cite** — every figure that goes into these documents is re-taken here, including
ones taken three tasks ago, because a figure that has moved looks exactly like a
figure that was mis-recorded. And **a measurement that falsifies a governing
document is swept the same day**: the failure mode this project has already had
is recording a correction and not propagating it, so the sweep is a grep and a
list of corrected sites rather than an intention.
