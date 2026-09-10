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

- **Any provider this story adds lands in `test-render.tsx`.** That file already
  says so in its header: it is the one place the application's context is
  described for tests, deliberately the third and last such description, and
  "every provider Epic 2 adds — a Redux store, an RxJS scheduler — lands here
  rather than in each test file". If Task 2.10.1 chose a store or a cache
  provider, this is where it is wired, and the header comment is updated from a
  prediction into a statement.

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
- Any provider is in `test-render.tsx` and its header no longer predicts
- The hook's tests run with no network and no socket, and `pnpm test` stays fast
- The built artefact is unchanged in shape and the fixtures are not in it
- `pnpm verify` passes
