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

     > **Sharpened 2026-09-10 by Task 2.10.5 — criterion 3's browser check is not
     > belt-and-braces, it is the only instrument for half the property.** That task
     > tried to assert _"no state update happens after an unmount"_ in jsdom and
     > found it **cannot be observed there**: React does not re-render an unmounted
     > component, so `result.current` cannot move whether the guard exists or not,
     > and the assertion is green against a hook with no guard at all. What jsdom
     > _can_ see is the `AbortSignal` reporting `aborted` and the cache holding
     > nothing from an answer that landed after the unmount, and both are asserted.
     >
     > So the "in a browser, against a throttled connection, not only in jsdom"
     > clause is load-bearing rather than thorough, and the close should say which
     > half each level actually answered rather than treating the pair as one green
     > tick.

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

---

## Amended 2026-09-10 by Task 2.10.4 — one criterion is already demonstrated, and one new invariant nothing checks

### Criterion 2 has its produced compile error, and it is already a nested one

The bullet above warns to pick a **nested** shape rather than the outermost one.
Task 2.10.4 did: `PopulatedBarSeries` narrows `bars` inside `series` inside the
`loaded` member, so the error is two levels in and is quoted verbatim in that
task's file. Re-take it at the close rather than citing it — the point of the
criterion is the instrument, not the transcript — but re-take **that** shape,
because assigning a plain `BarSeries` to the member is the assignment the union
exists to forbid and an envelope-level demonstration would prove nothing about
it.

### A new stated invariant that nothing checks, and it has more weight than it looks

**The market module's `no-restricted-imports` pattern must stay inside the
browser boundary's own `patterns` array, and nothing enforces that.**

ESLint's flat config resolves a rule to the **last** configuration that matched,
so a second config object setting `no-restricted-imports` for
`apps/frontend/src/**` does not add to the first — it replaces it. Task 2.10.4
reproduced this: with the market pattern in a block of its own,
`import path from "node:path"` in a frontend source file lints **clean**, with no
diagnostic anywhere.

That is not a lint-hygiene problem. `CLAUDE.md`'s frontend section records that
`no-restricted-globals` and `no-restricted-imports` over `apps/frontend/src/**`
are **the only thing standing** where a compile error used to be, because both
things downstream of tsc are silent: `process.env.X` compiles to `{}.X`, and
`import "node:path"` builds at exit 0. So the failure is the browser boundary
disappearing without a symptom — and the moment it becomes likely is the obvious,
well-intentioned change: **Epics 3 to 11 add seven more feature modules, and the
natural way to add the second one's rule is a new block.**

The close owes this a sentence in `FRONTEND-STATE.md` and an entry in
`CLAUDE.md`'s _stated invariants nothing checks_ list, in the form that list
already uses — the claim, the failure it hides, and how to re-measure it:
`import path from "node:path"` in a frontend source file must produce **two**
errors on a file that also deep-imports `market/`, not one.

The reversal, if it ever needs to become a mechanism rather than a sentence: one
`no-restricted-imports` configuration is the constraint, so a second module's
rule is another entry in the same `patterns` array — which is also where the
generalisation question gets asked, since a rule written against `market/`
specifically was a deliberate refusal to guess at a `*/index.js` shape from one
instance.

### One more sweep target, unusual for a frontend story

Task 2.10.4 changed **`packages/shared/src/bar-series.ts`**, adding a guard that
refuses a bar whose `startsAt` is an invalid `Date`. That is a shared constructor
on the **ingestion** path as well as the read path — `alpaca-mapping.ts` builds
bars from a vendor string — so a story that was supposed to touch only the
frontend has changed behaviour the backfill depends on. It is covered by
`pnpm test:database` and the backend suite, both green at the time, and the
close should say so rather than leave a reader to notice the file in the diff and
wonder.

### The two-vocabularies comparison is now actually possible

Task 2.10.2's note above asks the close to read the universe page and the series
states against `FRONTEND-STATE.md` §4 and record the comparison. Both now exist:
`SecuritiesView` and `BarSeriesView` each carry `retryable` and `retrying`,
derived through the same `isRetryableApiErrorCode`. What is **not** shared is the
copy, the silhouette and the control, and §4's amendment records one deliberate
divergence to check rather than flag — `BarSeriesView` has a `refused` member the
universe page has no use for, and it sits outside the flag entirely.

---

## Amended 2026-09-10 by Task 2.10.5 — what is already swept, and what the ADR now owes

**Already done, do not do it twice.** `FRONTEND-STATE.md` §2's _"What this does
not decide"_ carries a dated amendment with the parsed-heap table and the bound
that measurement produced. That is the one live claim this task falsified, and it
was swept the same day.

What this task still owes the record, beyond its own list:

- **The cache is bounded twice, not once** — 50,000 bars (~12 MB) and 32
  entries — because a series varies 25× in size and a bound counted in entries
  bounds entries rather than memory. §2's working number of 24 would have been
  58 MB at the cap. The ADR should carry the shape of the bound, not just its
  existence.
- **§2's first reversal trigger has not fired**, and the figure that says so is
  worth publishing: a cap-sized series parses and constructs in 4.6–8.7 ms
  against §28's 50 ms budget.
- **The absolute-window re-ask was explicitly declined**, with its reasoning and
  reversal trigger in `use-bar-series.ts`'s header. It is a decision about a
  request and leaves §3's address-bar rule untouched — worth one line in the ADR
  so nobody re-derives it as an obvious optimisation.
- **The refetch policy is a third thing**, neither `useBackendHealth`'s poll nor
  `useSecurities`' fetch-once: mount, key change and retry only, with an open
  session's tail deliberately left where it is because `covered.end` is the seam
  Epic 3 attaches to.
- **The React Compiler rules still have not fired** — including on a `useRef`
  written from an async callback and a `setState` called during render, which
  were the two most likely provocations this story had to offer. `CLAUDE.md`'s
  reading of that silence stands and should not be upgraded to a claim.
