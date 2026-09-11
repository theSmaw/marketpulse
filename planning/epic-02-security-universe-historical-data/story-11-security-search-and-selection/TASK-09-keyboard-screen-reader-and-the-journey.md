# Task 2.11.9 — Keyboard, screen reader, and the journey a browser walks

**Status:** Not started
**Story:** [2.11 Security Search & Selection](STORY.md)
**Depends on:** 2.11.8

## Objective

Prove the story's third and sixth acceptance criteria against a real browser:
**the whole flow is operable by keyboard alone and announces itself correctly**,
and **a browser journey covers search → open → the security's page.**

This is a task rather than a pass at the end of another one because the story
says so explicitly and because the reason is structural: this is the first
genuinely interactive control in the product, and whatever is settled here is the
pattern every control after it is measured against. A keyboard walk is also the
only level that can see several of these defects — an axe pass is a floor and not
accessibility coverage, and no stylesheet is applied in the test environment, so
a browser is the only place contrast and focus visibility can be observed at all.

## Amended 2026-09-11 by Task 2.11.4 — what the browser suite already covers

Four of this task's assertions exist, so the work here is the **journey** rather
than those pieces. `e2e/specs/securities-route.spec.ts` now covers:

- **Search → open, by pointer.** Typing and clicking a result lands on
  `/securities/NVDA`. This is half of "a browser spec covers search → open → the
  security's page"; the other half is the page's own content, and the keyboard
  version of the same flow is still owed.
- **Axe over the open result surface**, which the three existing axe runs never
  saw because they never type.
- **The tab order**, asserting the field sits between the navigation and the
  table's region.
- **The arrival's motion**, and that it does not replay on every keystroke.

What is untouched and is the substance of this task: the numbered keyboard flow
walked end to end, **where focus lands after a result is opened**, Shift-Tab back
into the control, Back from a security to the list, the failure journeys, and the
screen-reader pass — which no automated check in this repository can stand in
for. Arrow keys, Escape and the spoken sentence are proved at the component level
only, where no screen reader exists and nothing is focused or blurred.

## What the user can see when this lands

**Nothing new drawn** — and quite a lot fixed. Whatever the walk finds is fixed
here rather than filed: focus that goes somewhere useless after opening a result,
an Escape that loses a query, a sticky band covering the element that was just
focused, a sentence announced with no subject in it.

## Work

- **The keyboard walkthrough, written down as a numbered flow** and then walked:
  reach the field, type, move through results, open one, get back. State what
  each key does and **where focus lands after each transition** — focus after a
  result is opened is the one most often left to chance, and landing at the top
  of a new document is not the same as landing on it.
  - Enter with zero, one and many results
  - Escape with the list open, and Escape again
  - Tab out of an open list
  - Shift-Tab back into the control
  - The control reached from the table, and from a security's page
  - **Back, from an opened security to the list — added 2026-09-11 by Task
    2.11.1.** The query is component state and does **not** survive it, so Back
    lands on the list with an empty field. That is a decision taken with its
    reasons (`SEARCH-AND-SELECTION.md` §3) and not a defect to file: state it in
    the numbered flow, and if walking it makes a case that it is wrong, that is an
    amendment to §3 rather than a fix here. This is also the step where the
    third polite region must stay silent — arriving at a page is not a change.

- **The screen-reader pass**, done with a real screen reader rather than inferred
  from the DOM. What is announced when the list opens, when the active option
  changes, when results settle, and when a security opens. Every sentence names
  its subject — this page has two polite regions already and a third is a
  decision (`FRONTEND-STATE.md` §7). **Amended 2026-09-11 by Task 2.11.1: the
  decision is taken and there are three.** Search's region speaks 400 ms after the
  last keystroke and quotes the query. What this pass is listening for is whether
  that rate is right in practice — whether it speaks over somebody still typing, or
  arrives late enough to feel disconnected from what they did. That is §4's own
  reversal trigger, and this task is its first real opportunity.

- **The browser journey.** A spec in `e2e/specs/` covering the criterion as a
  sentence: search for a security, open it, and land on its page with its bars.
  Read `e2e/README.md` first — it holds what a spec must not assert, and the
  suite's rules are not the same as the component suite's.

- **The keyboard journey in the browser too**, at least once end to end. It is
  the only assertion that catches a focus trap or an element covered by a sticky
  header, and both are invisible to jsdom and to axe.

- **The failure journeys.** `backend-failure-states.spec.ts` already walks every
  route asserting its `<h1>` with the backend down; search must not collapse the
  page and the existing assertions must still hold. Add the one this story
  introduces: with the backend unreachable, the control says so and the rest of
  the screen stays usable.

- **The axe gate stays at zero violations**, in the workshop and wherever else it
  runs. Note the asymmetry recorded in `CLAUDE.md`: axe is a **gate** before the
  merge and a **report** after it, and the two scopes answer different questions
  and are never compared.

## Done when

- A numbered keyboard flow exists in `SEARCH-AND-SELECTION.md`, and every step of
  it has been walked in a real browser
- Focus after opening a result is decided, implemented and asserted
- A screen-reader pass is recorded — what was heard, in order, and what was
  changed because of it
- A browser spec covers search → open → the security's page, and a second covers
  the same flow by keyboard alone
- The backend-down journey still renders every route, with search included
- `pnpm verify` and `pnpm e2e` pass

## Notes

The rule this task exists to honour is that accessibility here is a first-class
requirement rather than a pass afterwards. The practical form of that: **anything
this walk finds is fixed in this task.** A finding filed against a later story is
a finding that will be re-found by a user.

One thing not to assert, from `e2e/README.md` and `CLAUDE.md`'s list: an axe pass
as accessibility coverage, a `useId()` value or a DOM snapshot containing one, or
latency without a large n. And a break that does not go red is not evidence a
check works — when a check is added here, verify the substitution by breaking the
thing it is about.
