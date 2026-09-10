# Task 2.10.9 — Verify, document, ADR, deploy

**Status:** Complete — 2026-09-10
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

---

## Amended 2026-09-10 by Task 2.10.6 — what the fixture backend adds to this close, and one criterion it makes answerable

### Criterion 4 now has an instrument, and the trap in checking it has moved

_"The layer works against a fixture backend with no network"_ is this story's
criterion 4 and was Task 2.10.6's objective. It is met: ten recorded bodies in
`apps/frontend/src/fixtures/`, and the frontend suite runs with no socket, no
database and no network — 320 tests in ~5.1s.

The bullet says to run the suite with the network disabled and read the **counts
rather than the exit code**, because a non-matching `-t` reports skips and exits 0. That still applies, and there is now a second, sharper version of the same
trap worth checking at the close: **`fixtures/bar-series.ts` holds every fixture
to its declared outcome as it loads, by throwing.** So a fixture set that has
silently stopped matching the contract fails loudly at import rather than
skipping — but only in a file that imports it. Confirm the fixture module is
actually reached by the run rather than assuming the guard fires.

### Three things this task added that the sweep should see in the diff

- **`apps/frontend/tsconfig.json` gained `resolveJsonModule`.** A frontend story
  that changed a build configuration, which is the same class of surprise as Task
  2.10.4 changing `packages/shared/src/bar-series.ts` — worth a sentence at the
  close rather than leaving a reader to find it. It is scoped to the one package
  deliberately, and the reasoning is written in beside it.
- **`market/index.ts` exports `clearBarSeriesCache`, a test-only function.** The
  close should confirm the thing it promises: `grep -rn "clearBarSeriesCache"
apps/frontend/src` should find the export, the barrel and `test-setup.ts`, and
  **no product call site**. If it ever finds one, something upstream is wrong
  rather than this having become useful.
- **`CLAUDE.md`'s repository map gained `src/market/` and `src/fixtures/`**,
  already done, so do not do it twice. The map had no entry for the feature
  module either; both lines went in together.

### One line the ADR owes, now that the answer is known

The bullet _"Record the artefact's new size … if a library was adopted"_ has its
answer: **no library was adopted, at either decision.** `FRONTEND-STATE.md` §2
hand-rolled the cache over `@tanstack/react-query`, and Task 2.10.6 kept a global
`fetch` stub over MSW. Both were measured with the alternative built rather than
argued away, and the second one's deciding fact is worth an ADR line because it is
a property of this workspace rather than of the library: **MSW runs a
`postinstall`, and adopting it means a permanent entry in the `allowBuilds`
allowlist that exists to keep install scripts out.** That is a supply-chain
consideration paying for a routing capability this layer does not use, and it is
the kind of reason a future reader will otherwise assume was never considered.

### And one correction this task made to its own brief, for the record

Task 2.10.5's amendment to TASK-06 said _"the six files each build their own
`stubFetch` helper by copy"_. Six files stub the global `fetch`; **four** define a
helper by that name, and all four are now on the shared one. The other two —
`api-client.test.ts`'s body-shaped `respondWith` and `App.test.tsx`'s three
one-liners — were left deliberately, with the reasons in TASK-06 §5. The close
should not go looking for two more migrations.

---

## Amended 2026-09-10 by Task 2.10.7 — three more things in the diff, and criterion 3's other half

- **`routes/paths.ts` grew a second table.** `ROUTE_PATTERNS` holds route paths
  that carry a parameter, and `securityPath()` builds a destination from one.
  The argument is in the file: everything in `PATHS` is a destination and a
  pattern is not one, and six places walk `PATHS` as a list of real destinations
  — one of them asserting that every route has a distinct `<h1>`, which a
  pattern would either fail or force a carve-out in. The close should confirm the
  split held rather than re-deriving it.
- **A real contrast violation was found and fixed**, and it belongs in the
  story's record because it is the second instance of one pattern: amber on a
  **word** rather than on a marker, measured at **1.92:1** where 4.5 is the
  floor, in the same place and for the same reason `FeedProvenance` was caught at
  1.73:1. Two instances is where a rule gets written down —
  `VISUAL-LANGUAGE.md` already says standing out is a job for weight and
  hierarchy, and this is the second time somebody has reached for ink instead.
  Consider whether it wants a sharper form.
- **A stated invariant nothing checks, in the form that list already uses.**
  _`Marker` renders nothing visible unless the row containing it sets
  `--marker-color`._ The failure is an invisible marker with no error, no
  warning, correct DOM and a green `pnpm verify` — found by looking at the page.
  Five components now set it. Re-measure: delete the custom property from one
  row and confirm the marker disappears silently.

**And criterion 3's browser half now has an instrument for the other property.**
The sharpening above records that jsdom cannot observe _"no state update after an
unmount"_. `e2e/specs/security-series.spec.ts` drives the real pair over a real
navigation, so the close can now check the supersession property where it is
observable — navigate between two symbols and confirm the panel never shows one
symbol's bars under the other's name, which is the defect the whole cancellation
design exists to prevent and which no jsdom test can see.

---

## Amended 2026-09-10 by Task 2.10.7 — one more class of gap for the close to look for

The `untracked` finding in TASK-08's amendment is worth generalising here,
because the close is where a _class_ of omission gets caught rather than an
instance.

**A states checklist walks past a field on a state.** `BarSeriesView` has six
members and this story has been careful about all six — but `securityStatus`
lives _on_ three of them, `retryable` and `retrying` live on a fourth, and none
of those is a member the exhaustive `switch` forces anybody to handle. The
`untracked` rendering shipped with no fixture, no test, no story and no way to
produce it, and every instrument this story has was green.

So criterion 2's _"a component cannot render loaded without data"_ demonstration
should be joined at the close by a cheaper sweep: **for each member of the union,
list its fields, and for each field say what produces each value.** Where the
answer is "nothing does", that is either a fixture to record or a branch to
delete — and both are better outcomes than a rendering nobody has seen.

`retrying` is worth checking against that sweep too: it is exercised in a story
and a component test, and it has never been produced by a real retry in a
browser.

---

## Amended 2026-09-10 by Task 2.10.8 — what is swept, one criterion whose instrument does not exist, and a wider field sweep

Task 2.10.8 is complete. Four parts to this: what is already done, what it
deliberately did **not** do, one correction to an instrument this file names, and
three claims for the close to check rather than assume.

### Already swept, do not do it twice

- **`FRONTEND-STATE.md` §2 carries the stale-while-loading decision** as a dated
  amendment — where the flag lives, the two homes rejected, what the mark does on
  screen, and **two** reversal triggers. §5's inheritance table now marks 2.10.8
  shipped. The "finish `FRONTEND-STATE.md`" bullet's _stale-while-loading_ half is
  done; its _announcement_ half is not — see below.
- **The two live claims this file's predecessor flagged are corrected.**
  `FeedProvenance.tsx` and `MarketClock.tsx` no longer say this application has
  one live region. A **third** copy was found by grep and corrected with them:
  `styles/a11y.module.css` counted its call sites as "three of the four".
- **The `untracked` gap is closed.** It has a recorded body
  (`fixtures/bar-series/untracked.json`, the eleventh), a fixture entry, a
  component test, a story, a browser cause and an entry in the copy matrix. The
  close should report it as closed rather than re-finding it as an open gap.
- **The button-rule extraction bullet in TASK-08 was already superseded** by the
  2026 refresh's `components/Button`, and no new shared component landed. Nothing
  in `src/components/` gained a stories obligation.

### Still owed, and this file is the only place it is now recorded

**The announcement decision is not in `FRONTEND-STATE.md`.** It lives in
`components/BarSeriesPanel/series-announcement.ts`'s header and in TASK-08, and
the "finish `FRONTEND-STATE.md`" bullet explicitly lists it as a subject that
document owes. It is a rule every future asynchronous surface inherits, not a
property of one panel, so it belongs beside the others:

> **A live region per subject, and its sentences name that subject.** Two polite
> regions updated in the same moment are queued in an order neither component
> controls, so a sentence that does not name its own subject is a fact with no
> subject. One region for the page was rejected (it makes one component the owner
> of another's sentences), and so was two regions for one subject (it reproduces
> the queue-order problem one level down).

Two sub-decisions go with it, both departures from the design brief and both
argued in that file: **a correlation id is never spoken**, and **a re-entered
state is announced**, by a clause the region passes through and back out of.

Story 2.11 inherits a third thing from it — a **note on rate**: nothing today
changes this region's text without a user having navigated or pressed something,
and a search field re-requesting on every keystroke would drive it at typing
speed.

### A correction: criterion 3's browser half has a narrower instrument than this file believes

TASK-07's amendment above tells the close to check supersession in a browser by
_"navigat[ing] between two symbols and confirm[ing] the panel never shows one
symbol's bars under the other's name"_. **That check is not available, and the
reason is worth knowing before an hour is spent on it.**

There is no in-application link from one security to another — Story 2.11 owns
search and click-through — so the only way to reach a second symbol today is
`page.goto`, which is a **document** navigation: it tears down the whole bundle
and re-runs it. Nothing about client-side supersession is exercised, because
there is no client-side transition. (This is the same finding that forced
TASK-08's stale spec off the brief's suggested route; the module-level cache goes
with the document too.)

What **is** available, and what the close should use instead:

- **Client-side unmount**, via the header's primary navigation — leave
  `/securities` and come back. That is a real route change inside one document,
  it tears the effect down, and it is what `security-series-states.spec.ts`
  already drives for the stale mark. It answers _"a navigation away from a
  pending request cancels it"_.
- **The wrong-bars-under-the-wrong-name property stays at the jsdom level**,
  where `use-bar-series.test.ts` asserts it directly by identity, until Story
  2.11 makes a client-side symbol change possible. The close should record that
  split rather than claiming the browser covered it — this file's own sharpening
  of criterion 3 is the precedent for saying which half each level answered.

### The field sweep is one field wider, and one of its examples has moved

TASK-07's last amendment asks the close to sweep **fields on members**, not only
members, because `untracked` shipped unseen. That sweep is still the right one
and it now has one more entry:

- **`stale` is a new field on `loaded`, `partial` and `empty`.** It is produced
  by `toStaleBarSeriesView` at the cache read and by nothing else, it is
  normalised back off by `barSeriesCache.write`, and every value of it is
  produced in a story, a component test, a hook test and a browser spec. It is
  the first field added _after_ the sweep was proposed, so it is also the sweep's
  first live test.
- **`retrying`'s status has changed.** That amendment says it "has never been
  produced by a real retry in a browser". It has now:
  `security-series-states.spec.ts` clicks the control against a real 503 and the
  page recovers. What is **still** unasserted in a browser is the in-between
  label — the answer arrives too quickly to observe _"Trying again…"_ without
  holding the response. Correct the claim, keep the gap.

### Three claims for the close to check rather than assume

1. **The eleventh fixture must not reach the shipped bundle.** Fixtures live
   under `src/` and are imported by tests and stories only; measured after this
   task, `apps/frontend/dist` contains none of `untracked.json`'s bar timestamps
   and the entry chunk is 400,960 B. Re-measure rather than cite — a fixture
   pulled into a component by a well-meant import is a recorded market body
   shipped to every visitor, and nothing checks for it.
2. **A third asynchronous surface could add an unnamed live region and nothing
   would fail.** The rule above — one region per subject, sentences that name it
   — is enforced by two tests inside `BarSeriesPanel` and by nothing at the page
   level. Story 2.11 is the first chance to break it. This is a candidate for
   `CLAUDE.md`'s _stated invariants nothing checks_ list, in that list's usual
   form: the claim, the failure it hides (two facts with no subjects, queued in
   an order neither component controls), and how to re-measure it.
3. **The dated figures in the 2.10.6 amendment above have moved**, as dated
   figures do: it records _"ten recorded bodies"_ and _"320 tests in ~5.1s"_,
   both true when written and now eleven and 385. They are a historical record of
   that task's measurement and are left standing; criterion 4 is re-taken at the
   close against the tree rather than read off them.

---

# What was done — 2026-09-10

**Status: complete.** `pnpm verify`, `pnpm test:database` (165 tests), `pnpm e2e`
(42) and `pnpm e2e:deployed` (15) all pass. Story 2.10 is closed. The decisions
are **ADR 0023**; the subject document is `FRONTEND-STATE.md`.

## The six criteria, re-taken, each with its instrument

| #   | Criterion                                                                                      | Instrument                                                            | Result                                                                    |
| --- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | `api-client.ts` is the only file calling `fetch`                                               | grep, **plus a produced break**                                       | **One** file. Adding a `fetch` to `NotFound.tsx` took it to two; reverted |
| 2   | A component cannot render `loaded` without data                                                | a produced compile error, **nested**                                  | `TS2322` two levels in — on `bars` inside `series`                        |
| 3   | A navigation away from a pending request cancels it, and the cancelled result is not a failure | split across jsdom and the browser, **and one half is not available** | See below                                                                 |
| 4   | The layer works against a fixture backend with no network                                      | the suite, reading **counts** not the exit code                       | 33 files, **385 tests, 5.62 s**, no socket, no database, no network       |
| 5   | The decision and its reversal trigger are recorded                                             | `FRONTEND-STATE.md` §§1–4, §7; ADR 0023                               | Every decision carries a trigger stated as a **condition**                |
| 6   | `pnpm verify` passes, including the React Compiler rules                                       | `pnpm lint` at `--max-warnings 0`                                     | Passes. **None of the 17 fired**                                          |

**Criterion 1's break is the part worth keeping.** A property verified by a check
that cannot fail is not verified: the grep was made to report two files before it
was trusted to report one.

**Criterion 2's error, verbatim**, and it is nested rather than at the envelope:

```
error TS2322: Type 'BarSeries' is not assignable to type 'PopulatedBarSeries'.
  Types of property 'bars' are incompatible.
    Type 'readonly Bar[]' is not assignable to type 'readonly [Bar, ...Bar[]]'.
      Source provides no match for required element at position 0 in target.
```

**Criterion 3 is answered in three parts, and one of them is a "cannot".**

- **jsdom** answers the `AbortSignal` reporting `aborted`, that the cache holds
  nothing from an answer landing after an unmount, and that a superseded answer
  never reaches the state — by **request identity**, which is the guard that
  matters, since a request that had already resolved cannot be un-resolved.
- **The browser** answers the unmount half: leaving `/securities` by the header
  navigation and returning is a real client-side route change, and it is what
  `security-series-states.spec.ts` drives.
- **What no level answers is _"the panel never shows one symbol's bars under
  another's name"_ in a browser**, and this file's own amendment above records
  why: there is no in-application link from one security to another, so the only
  route to a second symbol is `page.goto`, which is a document navigation and
  exercises no client-side transition. That property stays in jsdom until Story
  2.11's click-through exists, and that story's file now says so.

**Criterion 4's second, sharper trap was also checked.** `fixtures/bar-series.ts`
holds every fixture to its declared outcome as it loads, by throwing — but only
in a run that reaches it. Verified by mislabelling `empty` as `api-error`: the
run reports `TypeError: The empty fixture is labelled api-error and reads as ok`
and **`Tests no tests`**, so it fails loudly rather than skipping. Seven files
import the module, so the guard is reached.

## The field sweep — and it found a second instance of the class

TASK-07's amendment asked for a sweep of **fields on members**, not only members,
because `untracked` shipped unseen. Done. Every value of every field on
`BarSeriesView` is produced by something, with two exceptions:

- **`retrying` has never been observed mid-flight in a browser.** It is produced
  by a real retry now — `security-series-states.spec.ts` clicks the control
  against a real 503 and the page recovers — but the answer arrives too quickly
  to observe _"Trying again…"_ without holding the response. Story 2.13's window
  control is the natural place to fix that.
- **`feed: "synthetic"` is a branch in `BarSeriesPanel` that no recorded body
  exercises.** All seven valid fixtures are `sip`. **This is the second instance
  of the `untracked` class and it is not closed**, deliberately: a synthetic feed
  implies `provider: "fixture"` too, so a hand-edited body claiming
  `alpaca`/`synthetic` would be a pairing no server produces — the one thing the
  fixture module exists to prevent. Producing it honestly needs a store
  backfilled through the fixture provider. Recorded as a handoff on Story 2.14,
  which owns provenance. The visual risk is low, because the same treatment is
  reviewed in `FeedProvenance`'s stories; the risk is that the _branch_ in this
  panel has never run.

**The generalisation is the useful output.** A states checklist walks past a
field on a state, and two of them got through in one story. The cheap sweep — for
each member list its fields, and for each field say what produces each value —
is now the thing to run at any close that touches a union.

## The two-vocabularies comparison, as a finding rather than an assumption

Task 2.10.2's note asked the close to read the universe page and the series
states against `FRONTEND-STATE.md` §4 rather than assume they agree. Read.

**They agree on meaning and differ in richness, and the difference is defensible
rather than drift.** Both derive `retryable` and `retrying` through the same
`isRetryableApiErrorCode`, and both say _waiting will help_ for a 503 and _asking
again will not change this_ otherwise. What differs:

|                    | `UniverseTable`                                                                                      | `BarSeriesPanel`                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Failure treatments | **Three**, each with a status word — _no response_, _temporarily unavailable_, _unexpected response_ | **Two** sentences plus the flag                                       |
| A 503              | gets its **own headline and its own marker**                                                         | folds into _"The series could not be read"_ with a retryable prospect |
| Marker             | three silhouettes (hollow, pending, attention)                                                       | one dashed marker for every failure                                   |
| `refused`          | no such state                                                                                        | a fourth kind of thing, outside the flag                              |

The asymmetry is a property of the two surfaces rather than an inconsistency: the
table is a page's whole content and can afford a status word, and the panel is
one region among several on a page that must degrade **locally** (§36). Recorded
so that the next person comparing them does not read it as drift and "fix" it.

## What was swept upward

| Claim                                                                                       | Where                                | Action                                                                                                                                                              |
| ------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _"a current index of ADRs 0001–0022"_                                                       | `CLAUDE.md`                          | → 0023                                                                                                                                                              |
| _"Stories 2.10 to 2.14 remain"_                                                             | `CLAUDE.md`                          | Story 2.10 now has its own paragraph; 2.11–2.14 remain                                                                                                              |
| _"What a user can see today"_                                                               | `CLAUDE.md`                          | now names `/securities/:symbol` and one security's real bars                                                                                                        |
| _"no state library yet — four hooks, no store — and that is Story 2.10's decision to take"_ | `CLAUDE.md` _Intended stack_         | replaced by the decision **with its reversal trigger**. Grepped first: **one** live copy, plus two historical mentions in Story 2.9's close which are left standing |
| `FRONTEND-STATE.md` is a subject document                                                   | `CLAUDE.md` _Where the record lives_ | added                                                                                                                                                               |

**`use-securities.ts`'s header argues at length that the store decision is Story
2.10's.** Left standing deliberately, and it is worth saying why: it is not a
claim about the _present_ that has gone false — it is that file explaining why
**it** has no store, and the reasoning ("one static list is the weakest possible
evidence") is exactly as true now as it was, and is the reasoning ADR 0023
decision 1 rests on.

**Four new entries in `CLAUDE.md`'s _stated invariants nothing checks_ list**, in
that list's own form — the claim, the failure it hides, how to re-measure:

1. **The `market` module's `no-restricted-imports` pattern must stay inside the
   browser boundary's `patterns` array.** The most dangerous thing on that list:
   flat config resolves a rule to the **last** matching configuration, so a second
   block **replaces** the first, and the browser boundary disappears with no
   symptom. Seven more feature modules are coming and a new block is the natural
   way to add the second one's rule.
2. **`Marker` renders nothing unless the row sets `--marker-color`.**
3. **A live region belongs to a subject and its sentences name it**, enforced
   inside one component and nowhere at page level.
4. **The recorded fixture bodies must not reach the shipped bundle.** Measured:
   `dist/` contains none of their bar timestamps.

**The deploy-ordering hazard was recorded in ADR 0023's Consequences rather than
in that list**, and the placement is a judgement worth stating: `isBarSeriesResponse`'s
strictness rests on both halves shipping from one commit, and `deploy.yml` rolls
the **backend first** — so the first addition to `MARKET_FEEDS`, `PROVIDER_IDS`
or `ADJUSTMENTS` opens a window in which the deployed frontend refuses every
series. That is not a gap in `pnpm verify`, which has no deploy; it is a
consequence of a decision, and it belongs where the decision is. Epic 3's live
feed is **not** the trigger, because `iex` is already a member.

## Figures, taken rather than carried forward

- **The frontend artefact: 400,960 B of JavaScript** (128,147 B gzipped) and
  30,191 B of CSS; `dist/` is 556 kB. **No library was adopted at either
  decision**, so there is no figure from Task 2.10.1 to re-take — the cache was
  hand-rolled over `@tanstack/react-query` and the fixture backend is a global
  `fetch` stub rather than MSW.
- **The deployed store answers `partial`**, checked directly rather than
  inferred: `sessions=5` for NVDA returns **1,170 bars through 2026-09-08 20:00Z**
  against a window requested to 2026-09-10 20:00Z, in 133,172 B on the wire. So
  the deployed panel renders the state this story spent the most care on, and the
  CI gate — 518 securities and zero bars — renders `empty`. Both are correct and
  neither is the other.
- **`pnpm e2e:deployed`: 15 passed**, including two axe runs reporting **0
  violations** against the live host.

## What Story 2.10 did not decide, restated at the close

The charting decision (2.12), search and the per-security route's URL strings
(2.11), the window vocabulary and its calendar words (2.13), and provenance as a
product-wide requirement including a series naming two feeds at once (2.14).
Each now carries a dated amendment on its own `STORY.md` saying what it inherits
rather than decides.

---

# For the stakeholders — the story that changed nothing on screen, and everything after it

## What Story 2.10 was for

Every screen this product will ever build — the price chart, the volume chart,
search, the market overview, the AI's workspace — has to answer the same four
questions. Where does the application keep what it knows? How does it ask the
server for more? What does it keep, and for how long? And what does it show while
it is waiting?

Answer those once and the next four stories are fast. Answer them four times and
the product ends up with four subtly different ideas about what a loading screen
is, which is how software becomes expensive without anybody deciding to make it
so.

That is the whole story. It also happens to have produced the first screen in
MarketPulse that shows one company's actual trading data.

## The four decisions, in plain terms

**One: we did not add a state-management library, and that is now a decision
rather than a delay.** The specification names one (Redux) and immediately warns
against adding it too early. We looked at what the application actually holds
today — which company you are looking at, what time range, and some recent
prices — and it did not need one. What we did instead is the important part: we
kept everything in a shape that a library could take over later without a
rewrite. And we wrote down the exact condition that would trigger it: **the first
piece of information two parts of the product must agree about that neither one
owns.**

**Two: we do keep recent prices in memory, and the design point is what it is
_not_ allowed to do.** Going back to a company you just looked at shows its
figures instantly instead of a loading spinner. The trap in that kind of cache is
that it starts deciding _not_ to ask the server — and then quietly shows people
old numbers. Ours cannot: it has no concept of time at all, and every time it
shows you something it is already asking for a fresh copy. It also has a size
limit, and that limit was set by measurement rather than by guessing — a price
series can vary **twenty-five-fold** in size, so limiting the number of them
would have limited the wrong thing and could have used almost sixty megabytes of
someone's browser.

**Three: what you are looking at lives in the web address.** That means a link to
a company is a real link — you can send it to a colleague and they see what you
saw. It sounds obvious, and it is the reason the eventual AI workspace can be
described, saved and reopened at all.

**Four: "try again" only appears when trying again would actually work.** The
server distinguishes _"this is temporary"_ from _"this will fail the same way
next time"_, and the application now respects that distinction everywhere rather
than showing a hopeful button beside a permanent failure. A button that cannot
work costs the user twice: once when they press it, and again when they stop
trusting the ones that do.

## Why the closing task looks like paperwork and is not

A large part of this task was re-checking things that were already claimed to be
true — and doing it in a way that could **fail**.

For example: the application promises that exactly one file is allowed to talk to
the network, which is what keeps every request going through the same error
handling. Rather than run the check and note that it passed, we deliberately
broke the rule first, confirmed the check caught it, and then undid the break.
A check that has never been seen to fail is not evidence of anything.

The same discipline found two real things this time:

- **A test we were relying on cannot see what we thought it saw.** One property —
  that abandoning a request stops it cleanly — is genuinely unobservable in the
  fast test environment; it looks green even against code with no protection at
  all. That is now written down, and the property is checked where it actually
  can be.
- **A second piece of the interface has never run.** Alongside the one we found
  and fixed last task, there is a display for data from our simulated feed that
  no test has ever produced. We chose **not** to fake it, because faking it would
  have meant recording a server response no real server would ever send — and the
  entire value of our test material is that every piece of it came off a real
  server. It is recorded as an open item on the story that owns it.

## Where the product stands

**Epic 2 is nine stories in and four from done.** MarketPulse now has: a real
database, 518 tracked companies, 48 million minute-by-minute price bars, a
trading calendar, a market-data provider it can swap out, a public interface for
serving prices, and — as of this story — a frontend that can ask for them, hold
them, cancel them, and tell the truth about every way that can go wrong.

**What a user sees:** five screens, a live status strip, the full list of tracked
companies with real closing prices, and one company's real minute-by-minute
figures at its own web address.

**What a user still cannot do:** see a chart (Story 2.12), change the time range
(2.13), search for a company or click one in the list (2.11), or see live prices
(Epic 3). Those are the next four, and each one now starts from a written
handoff saying what is already decided for it — which is the actual product of
this story.
