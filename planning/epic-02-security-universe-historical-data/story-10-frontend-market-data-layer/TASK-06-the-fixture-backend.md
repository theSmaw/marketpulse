# Task 2.10.6 — A fixture backend, so three stories do not invent three mocks

**Status:** Not started
**Story:** [2.10 Frontend Market-Data Layer & Application State](STORY.md)
**Depends on:** Task 2.10.5

## Objective

Acceptance criterion 4: **the layer works against a fixture backend with no
network.** Build that fixture backend once, put the application's context for
tests where `test-render.tsx` already says it goes, and give Stories 2.11 to
2.13 a way to test a component against a real series without each writing its
own stub.

## What the user can see when this lands

**Nothing.** This is test support. Its payoff is measurable rather than
visible: three later stories do not each spend a task on the same problem, and
they do not each answer "what does a partial series look like?" differently.

## Work

- **Decide the mechanism, having built enough of the alternative to judge it.**
  There is no MSW in this repository today and no request interception of any
  kind; the frontend's tests stub at the module boundary. The two candidates are
  a **request-level intercept** (MSW, which exercises `api-client.ts` itself
  including the header read and the outcome classification) and a **module-level
  stub** of `api-client.ts`'s exported functions (no dependency, no service
  worker, and it tests the hook against a contract rather than against the
  transport).

  Weigh them against what actually goes wrong. `api-client.ts` distinguishes
  seven outcomes and three of them — `unreadable-body`, `http-error`,
  `unreachable` — are things a module stub can only _assert_, never _produce_.
  Against that: `pnpm test` is fast by contract with no socket and no network, a
  service worker in jsdom is a real dependency with a real failure mode, and this
  repository's habit is to build the alternative before rejecting it. Take the
  measurement (install cost, run time delta on the frontend suite) and record it.

  Whatever is chosen, note the browser suite is a **separate** level with its own
  answer: `e2e/` drives a real Chromium against a pair you started with
  `pnpm dev`, and Playwright route interception is how it produces a failure
  state. This task does not have to unify those two; it has to not contradict
  them.

- **The fixtures are recorded bodies, not hand-written ones.** Take them from the
  real endpoint with `curl` against a local backend over the real store, and keep
  them raw. The backend's `src/fixtures/alpaca/` is the precedent and its rule is
  the one that matters: those files are excluded from Prettier and from
  line-ending normalisation **on purpose**, because both would rewrite evidence.
  Decide whether ours need the same exclusion — ours are our own wire shape rather
  than a vendor's, which is a weaker case, so decide it explicitly and record
  which way and why.

  The set has to cover the states Task 2.10.4 defined, because a fixture set that
  only holds the happy body is what makes three later stories invent their own:
  a full series, a **partial** one (`covered` narrower than `requested`), an
  **empty** one (`bars: []` with provenance and `requested` present), a `null`
  `covered`, a series whose provenance carries **more than one source** — Epic 3
  makes that two feeds disagreeing, and `PROVIDER.md` §2.4 designed for it — and
  the two refusals, the cap's 400 naming its number and the calendar's.

  > **Amended 2026-09-10 by Task 2.10.2 — one more body, and it is a failure.**
  > The set above is all 2xx answers and refusals. Add the **503 carrying
  > `SERVICE_UNAVAILABLE`**, recorded the way the others are — it is produced by
  > `DATABASE_PORT=59999 node dist/index.js` against the real endpoint — because
  > it is the failure the panel has to render as _retryable_ (Task 2.10.8), and a
  > fixture set with no retryable failure in it cannot produce the one failure
  > state this layer treats differently from all the others.

  > **Amended 2026-09-10 by Task 2.10.3 — there are two inline fixtures to
  > replace already, and one of them is in a package this task's home cannot
  > reach.** That task was told to inline its fixtures rather than invent a
  > second home, and it did, in **two** files: `api-client.test.ts` holds a
  > series body and an empty one, and `packages/shared/src/bar-series-response.test.ts`
  > holds a fuller set — full, partial, empty, multi-source, and the vocabulary
  > refusals.
  >
  > The second one is the constraint. `packages/shared` **cannot import from
  > `apps/frontend`**: the dependency runs the other way, and reversing it for a
  > test fixture would make the domain package depend on an application. So a
  > fixture home under `apps/frontend` serves the hook, the components and the
  > stories, and leaves the guard's own tests inline — which is **correct rather
  > than a gap**, because that predicate is tested against bodies chosen to probe
  > _it_ (an unknown feed slug, an empty `sources`) rather than against bodies the
  > server actually produces. Decide it that way explicitly and say so, or move
  > the fixtures into `packages/shared` and have the frontend import them from
  > there; what must not happen is a third set nobody knows about.
  >
  > One property the recorded bodies must keep, because the guard is stricter
  > than the wire type: **every `feed`, `provider`, `adjustment`, `timeframe` and
  > `securityStatus` in a fixture has to be a member this bundle knows.** A
  > recorded body always is. A hand-edited one — widening a fixture to
  > "something realistic" — is the way a fixture set acquires a body the
  > application refuses, and the symptom is `unreadable-body` in a test that
  > looks like it is about something else.

- **Any provider this story adds lands in `test-render.tsx`.** That file already
  says so in its header: it is the one place the application's context is
  described for tests, deliberately the third and last such description, and
  "every provider Epic 2 adds — a Redux store, an RxJS scheduler — lands here
  rather than in each test file".

  > **Amended 2026-09-10 by Task 2.10.1 — there is no provider, and the thing
  > that replaces it is a trap this task now owns.** `FRONTEND-STATE.md` §1 took
  > no store and §2 chose a **module-level bounded `Map`** rather than a React
  > cache provider, so nothing new is wired into `test-render.tsx` and its header
  > stays a prediction for Epic 11 rather than becoming a statement.
  >
  > What arrives instead is **shared mutable state that outlives a test**. A
  > module-level singleton is imported once per worker, so a series cached by one
  > test is visible to the next, and the symptom lands in a **later** test as a
  > request that was never made or a state that was already loaded — which is the
  > same failure shape, and the same debugging cost, as the missing
  > `afterEach(cleanup)` this package's `setupFiles` already exists for.
  >
  > So this task owes the cache a **reset**, exported from the module and called
  > where `cleanup` is called, and it owes it a test that would fail without it:
  > two tests in one file that would pass individually and disagree when run
  > together. Note the ordering hazard is invisible to a single-file run, which is
  > exactly how it survives into a suite.

  Note the two descriptions it must stay consistent with: `App.tsx` uses a real
  `BrowserRouter`, and `.storybook/preview.tsx` uses a `MemoryRouter` decorator.
  A provider added to only one of the three is a story or a test that renders in
  a context the application does not have.

- **The workshop gets the same series.** A component under `src/components/`
  owes stories, and Stories 2.12 and 2.13 build chart components there. A story
  file that inlines its own bar data is a fourth definition of a series; make the
  fixtures importable from `.stories.tsx` and check they do not reach the
  application bundle — the artefact is three files and this task must leave it
  three.

## Done when

- The mechanism is chosen with a recorded measurement and the rejected
  alternative is described
- A fixture set exists covering full, partial, empty, `null`-covered,
  multi-source and both refusals, recorded from the real endpoint rather than
  written by hand
- Whether the fixtures are excluded from Prettier is decided and recorded
- No provider was needed, and the cache's `reset` is called where `cleanup` is —
  proved by two tests that pass alone and would disagree when run together
  without it
- The hook's tests run with no network and no socket, and `pnpm test` stays fast
- The built artefact is unchanged in shape and the fixtures are not in it
- `pnpm verify` passes

---

## Amended 2026-09-10 by Task 2.10.4 — three more bodies, and where the fixtures may not live

### The fixture set grows by three, and one of them cannot be recorded

The list above covers the 2xx answers and two refusals. The union that shipped
has three causes it does not reach:

- **A `404` carrying `NOT_FOUND`** — a symbol the universe does not hold. It is
  a **refusal** rather than a failure (see the finding in TASK-04), so the set
  now covers **three** refusals rather than two, and Task 2.10.8 names it as a
  cause. Recorded the way the others are: ask the real endpoint for a symbol that
  is well-formed and not tracked.
- **A body whose numbers disagree with each other** — the coherence failure
  `toDomainSeries` throws on, which becomes `failed` / `answered-badly`. **This
  one cannot be recorded**, because a correct server never produces it, and that
  is precisely why it needs a fixture: it is otherwise unreachable from a test
  and the branch would be covered by nothing.

  It is therefore **the one hand-made body in the set, and it must be made by
  mutating a recorded one in a single documented step** — swap two adjacent bars,
  or decrement a source's `barCount` — with the mutation named in the file and
  the recorded original kept beside it. Note this does **not** contradict the
  amendment above forbidding hand-edited fixtures: that rule is about widening a
  body into a value the guard refuses, whose symptom is `unreadable-body` in a
  test that looks like it is about something else. This mutation is the opposite
  — it must keep every closed vocabulary valid, because the whole point is a body
  `isBarSeriesResponse` **accepts** and `toBarSeries` refuses.

- **A body with an unknown feed slug**, for `unreadable-body` — already named by
  Task 2.10.3's amendment in TASK-08 as a cause. It belongs in the set for the
  same reason: hand-made, deliberately invalid, and labelled as such so nobody
  reads it as a body the server sends.

### The fixtures may not live inside `src/market/`

Task 2.10.4 added a `no-restricted-imports` rule: nothing outside
`apps/frontend/src/market/` may import anything under it except its `index.ts`.
So a fixture module placed inside the module would be unreachable from a
component test, a story or the browser suite — and the way round it is worse
than the problem, because re-exporting test fixtures through `index.ts` puts
them in the module's public API and, with them, in the application's import
graph.

**Put them outside the module**, beside the other test scaffolding
`vitest.config.ts` already knows about (`test-render.tsx`, `test-setup.ts` are
both excluded from coverage there by name, and a fixture module wants the same
treatment). The module imports nothing from them; they import the module's API
if they need its types, which is the direction the boundary allows.

### One property the recorded bodies must have that a hand-written one will not

`securityStatus` is **`active` | `untracked`**. Task 2.10.4 wrote `"tracked"` in
an inline fixture, all 14 tests passed, and only `tsc -b` in `pnpm verify` caught
it — a test run is not a typecheck. A recorded body cannot get this wrong, which
is the argument for recording rather than writing, restated as a live example.

---

## Amended 2026-09-10 by Task 2.10.5 — the reset exists, its wiring does not

The cache landed as `apps/frontend/src/market/series-cache.ts`, and the reset the
amendment above asked for is on the instance: **`barSeriesCache.clear()`**, with
a doc comment saying it is for tests and that there is no product call site.

What is **not** done, and is still this task's:

- **Wiring it where `cleanup` is called** — `apps/frontend/src/test-setup.ts`.
  Today the only file that clears it is `market/use-bar-series.test.ts`, in its
  own `beforeEach` and `afterEach`, which protects that file and nothing else.
  The moment a second file renders anything that fetches a series, the ordering
  hazard the amendment describes is live again.
- **The test that would fail without it**, which is the half that matters: two
  tests in one file passing individually and disagreeing when run together. Note
  the symptom this cache produces is specific and worth arranging for
  deliberately — the second test's **first rendered state is `loaded`** rather
  than `loading`, because the entry the first test left behind paints
  immediately. A test asserting only the eventual state passes either way.

One thing the fixtures now have to respect: **the cache key is
`barSeriesQuery(request)`**, so two fixtures differing only in window form are
two entries, and a fixture set that reuses one request across tests shares one
entry across them.
