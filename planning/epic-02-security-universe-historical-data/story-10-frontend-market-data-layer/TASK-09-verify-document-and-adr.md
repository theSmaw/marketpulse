# Task 2.10.9 — Verify, document, ADR, deploy

**Status:** Not started
**Story:** [2.10 Frontend Market-Data Layer & Application State](STORY.md)
**Depends on:** Task 2.10.8

## Objective

Close the story: re-take every acceptance criterion against the thing it is
about rather than citing it, finish `FRONTEND-STATE.md`, write the ADR, deploy,
and sweep what this story falsified.

## Work

- **Re-take the six criteria, each with the instrument that answered it.**

  1. **`api-client.ts` remains the only file calling `fetch`** — the criterion
     names grep, so run it: `grep -rn "fetch(" apps/frontend/src`. Then check the
     grep itself, because a property verified by a check that cannot fail is not
     verified: add a `fetch` somewhere else, watch the count go to two, remove it.
     `CLAUDE.md`'s rule — a break that does not go red is equally evidence the
     break did not land.
  2. **Loading, empty, partial and failed are types, and a component cannot
     render "loaded" without data** — produce the compile error rather than
     describing it, and pick a _nested_ shape rather than the outermost one, for
     the reason Task 2.9.11 found on the backend's equivalent guard: a
     demonstration at the envelope demonstrates nothing about what is inside it.
  3. **A navigation away from a pending request cancels it, and the cancelled
     result is not rendered as a failure** — in a browser, against a throttled
     connection, not only in jsdom.
  4. **The layer works against a fixture backend with no network** — run the
     frontend suite with the network disabled and confirm it is green rather
     than skipped. `CLAUDE.md`'s trap applies: a non-matching `-t` reports skips
     and exits **0**, so read the counts, not the exit code.
  5. **The decision and its reversal trigger are recorded** — in
     `FRONTEND-STATE.md` and the ADR, with triggers that are conditions rather
     than story numbers.
  6. **`pnpm verify` passes, including the React Compiler rules** — and say
     whether any of the 17 fired. `CLAUDE.md` records that they never have on
     shipped code, and that this is evidence nothing has yet written the shape
     they dislike rather than evidence the tree satisfies them. This story is the
     second real test of that, so the answer either way is a finding.

- **Finish `FRONTEND-STATE.md`.** It was started by Task 2.10.1 as four
  decisions; it closes as the subject document for how this frontend holds domain
  state and fetches market data — what is store, what is server cache, what is
  local component state, the `market` module's boundary, the state union and why
  each member exists, the cancellation and supersession rules, the fixture
  backend, and the stale-while-loading and announcement decisions. Where it and
  this story's files disagree, the subject document wins, and say so in it.

- **Add it to `CLAUDE.md`'s _Where the record lives_ table**, and correct the
  two live claims in that file this story moves: **"There is no state library
  yet — four hooks, no store — and that is Story 2.10's decision to take"** under
  _Intended stack_, and the Current-state paragraph naming Stories 2.10 to 2.14
  as remaining. Amend the live claims; leave the historical records in story and
  task files standing. Count the duplicates with a grep before correcting them —
  a sentence duplicated for legibility is a real hazard here and has caught this
  repository before.

- **Write the ADR.** It is the next number after 0021 and it records the state
  decision with its alternatives and its reversal trigger. **ADRs are never
  renumbered and their decisions are never rewritten**; if this story falsifies
  an earlier one, that ADR gets a dated amendment beside it rather than an edit.
  Update `docs/adr/README.md`'s index, which `CLAUDE.md` points at as current.

- **Sweep upward, and treat it as two obligations rather than one.** Recording a
  correction and propagating it are different, and the mechanism that defers the
  first routinely covers only the product decision, not the document that was
  wrong. Grep for every claim this story falsified — the four-hooks-no-store
  sentence has copies, `use-securities.ts`'s header argues at length that the
  store decision is Story 2.10's, and Stories 2.11, 2.12 and 2.13 each reference
  decisions this story has now taken. Correct the live sites; leave the histories.

  > **Added 2026-09-10 by Task 2.10.2 — a claim to check rather than to correct.**
  > The failure vocabulary now ships in **two** places: the universe page (Task
  > 2.10.2) and the bar-series states (Tasks 2.10.4 and 2.10.8).
  > `FRONTEND-STATE.md` §4 exists so that those two agree about what a 503 means,
  > and **nothing checks that they do** — the flag is derived once in
  > `packages/shared`, but the copy, the silhouette and the control are written
  > twice. Read both against §4 at the close and record the comparison as a
  > finding either way, rather than assuming it.

  > **Added 2026-09-10 by Task 2.10.3 — one more stated invariant that nothing
  > checks, and this one has product weight.** `isBarSeriesResponse` refuses a
  > `feed`, `provider`, `adjustment`, `timeframe` or `securityStatus` it has not
  > been taught, and the argument for that strictness rests on a **deploy
  > property**: every one of those unions lives in `packages/shared`, which is
  > inlined into the frontend bundle, and `deploy.yml` ships both halves from one
  > commit — so a client that does not know a value and a server that sends one
  > cannot both be current.
  >
  > That is true and it is checked by nothing, and the failure is not small:
  > `deploy.yml` rolls the **backend first**, so a deploy that introduces a new
  > feed opens a window in which the deployed frontend refuses **every** series
  > as `unreadable-body`. Charts go blank, and the message points at the address
  > rather than at the deploy. It degrades safely — nothing false is rendered —
  > and it degrades loudly for everyone at once.
  >
  > So the close owes it a sentence rather than a mechanism: record it in
  > `FRONTEND-STATE.md` with the condition that makes it real (**the first
  > addition to `MARKET_FEEDS`, `PROVIDER_IDS` or `ADJUSTMENTS` after this
  > layer ships** — Epic 3's live feed is _not_ one, because `iex` is already a
  > member), and consider whether `CLAUDE.md`'s _stated invariants nothing
  > checks_ list is where it belongs. The repair, if the condition ever fires, is
  > a deploy ordering change rather than a looser guard: loosening it is the
  > caption problem invariant 6 exists to prevent.

- **Hand forward deliberately.** Story 2.11 needs the URL shape and whether
  matching is client- or server-side; Story 2.12 needs the state union, the
  fixture set and the stale-while-loading rule; Story 2.13 needs the window's home
  in the URL and which form a shared link carries; Story 2.14 needs to know what
  provenance this layer already renders and what it deliberately left. Write those
  four handoffs as amendments to those stories' own files, dated, in this
  repository's usual form.

- **Deploy and check the deployed page.** The frontend's upload is not atomic —
  for roughly two seconds around a deploy that changes the artefact a cold load
  can be broken, in two distinct ways, and the window _opens_ at the second the
  deploy step reports success. So poll for coherence rather than checking once.
  Run `pnpm e2e:deployed`, and remember a deployed check runs after a merge and
  therefore gates nothing: its output is a rollback decision.

- **Record the artefact's new size**, and note whether the store or cache
  decision moved it. If a library was adopted, the figure Task 2.10.1 chose it on
  is re-taken here against the real build rather than carried forward — a figure
  that has moved looks exactly like a figure that was mis-recorded.

## Done when

- All six criteria are re-taken, each with the instrument named, and criteria 1
  and 2 are demonstrated by a produced break rather than an assertion
- `FRONTEND-STATE.md` is finished and listed in `CLAUDE.md`'s table
- The ADR is written and indexed
- Every live claim this story falsified is corrected, and the historical records
  are intact — with the grep counts recorded
- The four handoffs are written into Stories 2.11 to 2.14
- The deployed page serves the panel, checked by polling rather than once
- The artefact size is recorded
- `pnpm verify`, `pnpm test:database` and `pnpm e2e` pass, and `pnpm e2e:deployed`
  passes against the live environment
