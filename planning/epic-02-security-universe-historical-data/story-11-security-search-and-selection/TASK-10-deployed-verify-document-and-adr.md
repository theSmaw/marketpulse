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
  - **Not the matcher's, which is taken — added 2026-09-11 by Task 2.11.2.** The
    shipped rules measured **0.101 ms** for `nv`, **0.040 ms** for `nvid`,
    **0.072 ms** for `a` and **0.216 ms** over a synthetic 5,000, against §0's
    0.295 ms and 0.58 ms for the naive scan. Both sets are true and they are
    **different implementations**, so §0's figures are a historical record and
    §2's slope argument should cite the shipped ones. Reconcile rather than
    re-measure, unless the implementation has stopped being a linear scan.
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
    **Amended 2026-09-11 by Task 2.11.1: both of §7's triggers have already fired
    and been answered**, so this is a correction to make rather than a question to
    settle — a third region exists, it speaks 400 ms after a keystroke rather than
    after a navigation, and §7's "what nothing checks" paragraph gains the page-level
    gap that a fourth region would pass through unnoticed.
  - Any live claim that the only route to a second symbol is a document
    navigation. **Amended 2026-09-11 by Task 2.11.4: 2.11.4 ended it, not
    2.11.5** — search navigates client-side already (measured: the `window`
    marker survives and there is one navigation entry). The claim is asserted in
    more than one file and every one of them is live. **Amended again the same
    day by Task 2.11.5: ADR 0023's copy is swept** — its "does not certify …
    the only route is a document navigation" carries a dated amendment stating
    the narrower thing that is still true. `STORY.md`'s own two copies are
    **not** swept and are deliberately yours: they are this story's documents,
    which is what a close sweeps.
  - **Two candidates on this list are already swept and should not be re-swept.**
    `VISUAL-LANGUAGE.md`'s "input fields have never been built" was corrected by
    Task 2.11.3, and `CLAUDE.md`'s "the React Compiler rules have never fired on
    shipped code" by Task 2.11.4 — they fired twice, on the combobox, and both
    were right. Check them rather than assume; the point of the list is that a
    correction recorded is not a correction propagated.
  - **A third is swept, and the "if it gained one" above is settled: the icon set
    is SIX.** `magnifier` was added by Task 2.11.3 for `TextField`, and
    `VISUAL-LANGUAGE.md` §_No icon beyond the closed set_ already says six with
    the date. Task 2.11.5 added **no** icon — the chevron on a table row's symbol
    is the existing `chevronRight`. Verify the count rather than carrying this
    line: `grep -c '"' apps/frontend/src/components/Icon/Icon.tsx` is not the
    check; `ICON_NAMES` is.
  - **`SEARCH-AND-SELECTION.md` §3's "Back returns to an empty field" was
    falsified and swept on 2026-09-11 by Task 2.11.5** — the field keeps its
    query, because the two routes render the same module and React re-renders
    rather than re-mounts. §3 and §7's handoff row carry dated amendments and
    `TASK-09`'s bullet was corrected. **What is left for the close is the
    keyboard flow's own wording**, since 2.11.9 writes that sentence into this
    document.
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

  **One is already written and needs carrying up rather than re-deriving — added
  2026-09-11 by Task 2.11.5.** `SEARCH-AND-SELECTION.md` §8 records that nothing
  in `pnpm verify` can see whether a navigation stays client-side: jsdom has no
  history and no bundle to reload, so swapping the table's `Link` for a plain
  `<a href>` leaves **every** unit, component and integration test green while
  the product silently goes back to reloading itself on every symbol. It is held
  by `e2e/specs/security-navigation.spec.ts`, which gates a merge, and by nothing
  else. That belongs in `CLAUDE.md`'s own list with its one-liner, because the
  failure is invisible and the repair is a one-character import away from
  happening by accident.

## Amended 2026-09-11 by Task 2.11.6 — one decision to carry into the document, two entries to carry up, and two sites already swept

**A decision this story took that is recorded only in a component header and a
task file, and that the document and the ADR owe a home:**

> **One retry per failure per screen, and it belongs to the surface that owns
> the data.** Search and the tracked universe render from the same fetch, so a
> failure puts two explanations on one screen. Search states the fact and defers
> the control; the table offers the `Try again`. `FRONTEND-STATE.md` §4's rule —
> a retryable failure says waiting may help, a permanent one says it will not —
> is honoured in the **words**, in both directions, which is the half that
> survives there being one button. A browser test asserts
> `toHaveCount(1)` on the page's `Try again` buttons.

Its reversal trigger is **the first screen where the two surfaces read different
fetches**, at which point they are two failures rather than one and each owes its
own control. Epic 3's live feed is the likely first, and Task 2.11.7 may reach it
sooner if the universe table leaves `/securities/:symbol` — that route would then
hold a failure with no control on it at all, which is the trigger firing with
nothing to fire it.

**Two "what nothing checks" entries are already written and should be carried up
rather than re-derived.** `SEARCH-AND-SELECTION.md` §8 gained them on 2026-09-11:
that nothing refuses a sentence duplicating another surface's (found three times
in one afternoon, every time by a locator matching two nodes), and that nothing
notices a control being absent from a state entirely — `pnpm verify` was green
for two tasks while the field was missing from three of them. Both belong in
`CLAUDE.md`'s own list with their re-measure one-liners.

**Two sites are already swept and must not be re-swept — verify instead.**

- `CLAUDE.md`'s bundle-leak entry now names `fixtures/securities/` and carries a
  second re-measure one-liner (`grep -o "Agilent Technologies"`). The claim it
  amends was about bar timestamps only, and the securities body is by far the
  larger thing that must not ship.
- `CLAUDE.md`'s repository map described `src/fixtures/` as the recorded bodies
  of `GET /market-data/bars`. That became false the moment this task landed and
  was corrected the same day.

**One measurement this story owes is taken and is `SEARCH-AND-SELECTION.md`
§6's**: untracked, `AAPL` falls from match 2 of 99 to **match 50** for the query
`a` and off the shown slice while the total still counts it. Reconcile rather
than re-measure, unless the ranking rules have changed.

---

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
