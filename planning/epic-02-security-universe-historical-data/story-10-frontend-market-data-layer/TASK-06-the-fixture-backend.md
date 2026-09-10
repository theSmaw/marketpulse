# Task 2.10.6 — A fixture backend, so three stories do not invent three mocks

**Status:** Complete — 2026-09-10
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

---

## Amended 2026-09-10 by Task 2.10.5 — the premise under the MSW decision is wrong, and correcting it changes the answer

The first bullet says _"the frontend's tests stub at the module boundary"_ and
builds the MSW case on it: that a module-level stub of `api-client.ts` can only
**assert** `unreadable-body`, `http-error` and `unreachable`, never **produce**
them, whereas a request-level intercept exercises the client itself.

**Neither half is true of this tree, and Task 2.10.5 walked into the evidence
while writing the hook's tests.** Nothing in `apps/frontend` mocks a module —
`grep -rn "vi.mock" apps/frontend/src` returns nothing. Six test files stub the
**global `fetch`**: `api-client.test.ts`, `use-backend-health.test.ts`,
`use-market-feed.test.ts`, `use-securities.test.ts`, `App.test.tsx`, and now
`market/use-bar-series.test.ts`. That is the transport boundary, one layer below
the one this bullet names, and it means the real `apiRequest` runs — the deadline,
the composed signal, the correlation-id read, the `isApiError` parse and the
whole outcome classification.

So the three outcomes are **already produced rather than asserted**, and
`api-client.test.ts` produces all seven today: `unreadable-body` at its lines 148
and 160, `http-error` at 202, `unreachable` at 218 from a rejected
`TypeError("Failed to fetch")`, plus `timeout`, `aborted` and `api-error`.

**Two consequences for this task.**

1. **The comparison to weigh is three-way, not two, and the third option is the
   incumbent** — a global `fetch` stub, which costs nothing, has no service
   worker, keeps `pnpm test` sockets-free, and is what every other test in this
   package already reads like. MSW's stated advantage over it is not "produces
   the transport outcomes"; that is already had. What MSW genuinely adds is
   _routing_ — one handler set serving many URLs — which matters for a component
   rendering several requests and matters less for a hook making one. Weigh that
   rather than the advantage this bullet describes, and note the repository habit
   the bullet invokes cuts the other way when the alternative is already built and
   working in six files.
2. **The fixture-set half of this task is untouched and is still the valuable
   half.** Recorded bodies covering full, partial, empty, `null`-covered,
   multi-source, both refusals and the 503, in one home, is what stops Stories
   2.11 to 2.13 inventing three sets — and that is worth doing under _any_ of the
   three mechanisms. The mechanism decision is smaller than it looked; the
   fixture decision is not.

**And one deliverable this task now certainly owns**, in addition to the reset
wiring noted above: the six files each build their own `stubFetch` helper by
copy. A shared one belongs wherever the fixtures land, and this is the task that
can see all six at once.

---

## What was done — 2026-09-10

### 1. The mechanism: the incumbent, kept, after the alternative was built

The 2026-09-10 amendment above was right that the premise had to be re-checked,
and re-checking it settled the question. `grep -rn "vi.mock" apps/frontend/src`
returns nothing; six test files stub the **global `fetch`**, which is one layer
below the module boundary the first bullet named, so the real `apiRequest` runs
and the three "cannot be produced" outcomes are produced today.

The alternative was still built rather than argued away. **Two probe files were
written against the real `useBarSeries`** — one on `msw@2.15.0`'s `setupServer`,
one on a global stub — each loading `full.json` and each producing `unreachable`
from a network error. Both passed. What differed:

|                            | MSW                                    | global stub |
| -------------------------- | -------------------------------------- | ----------- |
| Packages added             | **+49**                                | 0           |
| `node_modules/.pnpm`       | 310,460 kB → **329,524 kB** (+19.1 MB) | unchanged   |
| Install script             | **required an `allowBuilds` entry**    | none        |
| Import, per test file      | 136–161 ms                             | 90–123 ms   |
| One probe file, wall clock | 639–859 ms                             | 573–609 ms  |

**The `allowBuilds` row is the one that decided it**, and it is a property of
this workspace rather than of MSW. `msw` runs a `postinstall`; installs are
denied unless the package is named in `pnpm-workspace.yaml`; and until it is,
**every subsequent pnpm command fails** — measured, `pnpm exec vitest` refused
to start with `ERR_PNPM_IGNORED_BUILDS`. Adopting it means a permanent entry in
the allowlist that exists to keep install scripts out, for a dev dependency, to
buy **routing** — one handler set answering many URLs — which is MSW's real
advantage over a global stub and which a layer making one request per hook does
not use.

Both probes were deleted, `msw` was removed and `pnpm-lock.yaml` was restored
from git; `git status` is clean of it.

The decision, the table and two reversal triggers live in
`apps/frontend/src/fixtures/stub-fetch.ts`, beside the thing they justify. The
triggers are conditions: **a test needing several URLs answered differently in
one render**, and **the first thing that must be intercepted in a real browser**
— which is Storybook or a component harness, not `e2e/`, since the browser suite
is a separate level that already answers this with Playwright route interception
against a pair started by `pnpm dev`. Nothing here contradicts that.

### 2. Ten recorded bodies, in one home outside the module

`apps/frontend/src/fixtures/bar-series/` — beside `test-render.tsx`, **not**
inside `src/market/`, because `eslint.config.mjs`'s feature-module boundary would
make a fixture module in there unreachable from a component test, a story or the
browser suite, and the way round it is worse than the problem.

| File                          | How                                                    | State it collapses to                                                     |
| ----------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------- |
| `full.json`                   | recorded, NVDA 1m, one absolute half-hour              | `loaded` — 30 bars, `covered` equals `requested`                          |
| `partial.json`                | recorded, a window a session past what the store holds | `partial` — 60 bars, `covered` stops early                                |
| `empty.json`                  | recorded, `sessions=1` before the session opened       | `empty` — `bars: []`, `covered: null`                                     |
| `stitched.json`               | recorded through the shipped route with a pinned clock | `loaded` — 150 bars, **two** provenance sources                           |
| `refused-cap.json`            | recorded, a year of minute bars                        | `refused` — 400 naming **98,310** against 10,000                          |
| `refused-calendar.json`       | recorded, a 2023 window                                | `refused` — 400 naming 2024-01-01 to 2028-12-31                           |
| `refused-unknown-symbol.json` | recorded, `symbol=ZZZZ`                                | `refused` — 404, the third refusal                                        |
| `unavailable.json`            | recorded against `DATABASE_PORT=59999`                 | `failed` / `answered-badly`, **`retryable: true`**                        |
| `incoherent.json`             | derived from `full.json`, one field                    | `failed` / `answered-badly` — accepted by the guard, refused by the parse |
| `unknown-feed.json`           | derived from `full.json`, one field                    | `failed` / `answered-badly` — by way of `unreadable-body`                 |

**`covered: null` is not a separate entry and does not want one.** The contract
makes `covered: null` and `bars: []` the same fact — `toBarSeries` refuses either
without the other — so `empty` is both, and a second fixture would be the same
body under two names.

The exact `curl` lines are in the fixture module's header so the set can be
**re-recorded rather than cited**, which is this repository's rule about anything
measured.

#### The one 200 `curl` cannot ask for, and why that is a finding

`serve-series.ts` fetches a live tail only for the **current session**, and only
when the store is caught up to it: a whole session between `covered_end` and
where the tail would begin is declined as `stale-store`. The local store stops at
Friday 2026-09-04's close, so **every** request made on 2026-09-10 declines —
confirmed against `1m` and `1d`, with the Alpaca provider and with the `fixture`
one. Every security in the store has a ledger row for both timeframes, so there
is no symbol that escapes the gap check either.

So `stitched.json` was recorded by driving the **shipped route** — the same
plugin `index.ts` registers, the same store, the same Alpaca client, the same
response schema — through `app.inject()` with the route's own clock seam
(`MarketDataRouteDependencies.now`, which exists for exactly this) pinned to
Tuesday 2026-09-08 15:00Z. 2026-09-07 is Labor Day, so `sessionsInGap` is empty
and the tail fires. Nothing in the body is invented: 60 bars from the store, 90
from the vendor, joined by `mergeSeriesProvenance`.

**And one property of that body is a recorded fact rather than an omission: its
two sources name the same feed.** Both halves come from Alpaca's historical API,
which is SIP on this plan. A series naming two _different_ feeds is what Epic 3's
IEX socket produces, and **it cannot be recorded until that socket exists** — so
this fixture is the multi-source _shape_, and Story 2.14 will want a second one
for the two-feed _wording_. Writing that one by hand now would be inventing a
body no server has ever sent, which is the thing this set exists not to do. Said
here as well as in the module, because it is a fact about what Story 2.14
inherits rather than a comment about a file.

#### The two hand-made bodies, and the rule they do not break

Each is derived from `full.json` in one documented step, with the recorded
original beside it, and after formatting **each is literally a one-line diff**:

- `incoherent.json` — `"barCount": 30` → `29`. Every closed vocabulary stays
  valid, so `isBarSeriesResponse` **accepts** it and `toBarSeries` refuses it.
  That is the opposite of the hand-editing the amendment forbids rather than an
  exception to it: the forbidden move is widening a body into a value the guard
  refuses, whose symptom is `unreadable-body` in a test about something else.
- `unknown-feed.json` — `"feed": "sip"` → `"darkpool"`. Deliberately refused by
  the guard, and labelled so nobody reads it as a body the server sends.

`bar-series.test.ts` asserts the derivation as a **path diff**, and the first
attempt is worth recording because it was wrong in an instructive way: a
character-run comparison reported **11** differing runs for the one-field
`"sip"` → `"darkpool"` edit, because a length change shifts every character after
it. The property being asserted is _how many fields were touched_, which is a
question about the structure, so the assertion became one.

#### Every fixture is held to its own label as the module loads

Each entry declares the outcome it was recorded as — a recorded fact, not a
computation, deliberately, so nothing here becomes a second copy of
`api-client.ts`'s classification — and the module checks that claim against the
**real** `isBarSeriesResponse` and `isApiError` at import. A body that stops
matching its label throws where it is imported rather than failing three stories
later as a state nobody asked for.

`barSeriesFixtureView(name)` builds the state through the **real**
`toBarSeriesView`, so a story gets a `BarSeriesView` the application can actually
produce rather than a hand-built one — a hand-built `partial` whose `covered`
disagrees with its bars is a state the layer cannot reach, and a component tuned
against it renders the real one wrongly.

### 3. Prettier: **formatted, not excluded** — decided and recorded

`apps/backend/src/fixtures/alpaca/` is excluded from Prettier _and_ from git's
line-ending normalisation because those are a **vendor's bytes**, and one of them
exists to prove that a real Alpaca error body is not JSON.

Ours are not that. Every one is our own contract, JSON by construction, and what
makes them evidence is that the **values** came off the server — which whitespace
cannot change. So they stay in the formatter's hands and `pnpm format:check`
reads them like anything else. The decision and its reversal trigger — _the first
fixture of ours whose bytes are the claim_ — are written into `.prettierignore`
beside the entry they might otherwise be assumed to belong to, because that is
where the next person will look before "fixing" it.

A side effect worth having: formatted, the two derived bodies are one-line diffs
against their original.

### 4. The cache reset, wired where `cleanup` is, and proved by removing it

`clearBarSeriesCache()` now runs in `src/test-setup.ts`'s `afterEach`, beside
`cleanup()`, so one rule holds for both: **a test leaves nothing behind.**
Clearing before each test instead would protect the next test and leave the last
one's entries alive for whatever runs after the file.

**Getting at it needed a decision.** `test-setup.ts` is outside `src/market/`, so
the `no-restricted-imports` boundary means it can reach the module only through
`index.ts` — and `barSeriesCache` is deliberately not exported there. The
alternative, an ESLint exemption for one file, was rejected on the trap that
config already documents: `no-restricted-imports` resolves to the last
configuration that matched, so a second block for `test-setup.ts` would silently
**replace** the `node:*` group and take the browser boundary out with it.

So **one function** is exported and only one: `clearBarSeriesCache`, which can
forget and cannot read. The invariant the cache's header states — _nothing
outside this module can read a series without asking for one_ — is untouched.

`market/series-cache-isolation.test.ts` is the pair the amendment asked for, and
it asserts the **first rendered state** rather than the eventual one, which is
the half that matters: `useBarSeries` reads the cache while rendering, so an
inherited entry makes the second test start at `loaded`, and both tests still end
at `loaded` either way. **Verified by substitution**, per the rule that a break
which does not go red is not evidence:

|                                                   | Result                                                       |
| ------------------------------------------------- | ------------------------------------------------------------ |
| `clearBarSeriesCache()` commented out, both tests | **1 failed, 1 passed** — `expected 'loaded' to be 'loading'` |
| Same, second test alone with `-t`                 | 1 passed, 1 skipped                                          |
| Line restored, both tests                         | 2 passed                                                     |

`market/use-bar-series.test.ts`'s own `beforeEach`/`afterEach` clears were
**removed**, because a file that protects itself is exactly what leaves the suite
unprotected — and leaving them in would have masked the substitution above.

### 5. The shared `fetch` stub, and a correction to this file

`apps/frontend/src/fixtures/stub-fetch.ts` holds one `stubFetch(respond)` whose
handler is given `{ url, signal, index }` — the superset of the four shapes that
existed — and hands back the live `calls` array. Beside it: `stubBarSeries(name)`,
which is the shortest path from a fixture to a rendered state and the one Stories
2.11 to 2.13 should reach for; `barSeriesFixtureResponse(name)`, a fresh
`Response` per call because a body is a stream and reading it twice throws; and
`neverAnswers`, the socket that accepts and does not reply.

**A correction to the amendment above, which this task could check:** it says
_"the six files each build their own `stubFetch` helper by copy"_. Six files stub
the global `fetch`; **four** define a helper called `stubFetch`, and all four are
now on the shared one — `use-backend-health.test.ts`, `use-market-feed.test.ts`,
`use-securities.test.ts` and `market/use-bar-series.test.ts`.

The other two were left alone deliberately rather than missed. `api-client.test.ts`'s
`respondWith` is not that helper: it is a **body-shaped constructor** for this
client's own contract, taking `{ status, body, raw, requestId }`, and collapsing it
into the shared stub would lose the thing it is for. `App.test.tsx` has three
one-line `vi.stubGlobal` calls and a `beforeEach` default; the import would cost
more than the copy.

`api-client.test.ts` did give up its **inline fixtures**, which is the other half
the amendment asked for: its series body, its empty body, its two refusals and its
unknown-feed body are now the recorded ones. Its four inline literals became one
line each.

The **third** inline set, `packages/shared/src/bar-series-response.test.ts`, stays
inline, and the file now says why in its own header rather than only here.
`packages/shared` cannot import from `apps/frontend` — the dependency runs the
other way — and it is the right answer independently: that predicate is tested
against bodies chosen to probe **it** (an unknown feed slug, an empty `sources`, a
field of the wrong type), and a recorded body is by definition none of those. Two
sets, two purposes. What must not happen is a third nobody knows about, and there
is not one.

### 6. `resolveJsonModule`, scoped to one package

`apps/frontend/tsconfig.json` gained it, with the reason and the scoping argument
written in beside it. Without it tsc does not put a `.json` file in the program at
all and the import is `TS2732` — while Vite resolves it happily, which is the
usual shape of a convention only tsc enforces. `nodenext` then requires the import
attribute, `with { type: "json" }`, which is what a browser and Node both need.

It is **not** in `tsconfig.base.json`: it widens what `include` admits, and
neither other package imports JSON. `apps/backend/src/fixtures/alpaca/` is read at
runtime rather than imported, deliberately, because those files are a vendor's raw
bytes.

`vitest.config.ts`'s coverage `exclude` gained `src/fixtures/**`, on the same
argument as `test-render.tsx` and `test-setup.ts` already there: they are what the
tests are made of, not what they are about.

### 7. The artefact is unchanged, and the fixtures are not in it

`apps/frontend/dist/` holds the same four entries it held before — the JS bundle,
the CSS, `index.html`, and `staticwebapp.config.json` copied from `public/`.
Grepped for fixture content: `darkpool`, `227.0499`, `ZZZZ` and the 404's sentence
are all **absent**. The one hit, `barCount`, is a field name the domain model
reads and has always been there.

**A story can import them, and that was proved rather than assumed.** A throwaway
`Probe.stories.tsx` importing `barSeriesFixtureView` was added, `pnpm storybook:build`
run, and `storybook-static/assets/Probe.stories-*.js` confirmed to carry the
recorded bar data — then removed. That is what the two-file split buys:
`bar-series.ts` imports nothing from a test runner, and only `stub-fetch.ts`
imports `vitest`.

### Done when — checked

| Criterion                                                                         | How                                                                         |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Mechanism chosen with a recorded measurement, alternative described               | §1; both probes built and run, `msw` installed and removed                  |
| Fixture set covering full, partial, empty, `null`-covered, multi-source, refusals | §2; ten bodies, eight recorded, three refusals, plus the 503                |
| Recorded from the real endpoint rather than written by hand                       | §2; the `curl` lines are in the module, and the one exception is explained  |
| Prettier exclusion decided and recorded                                           | §3; **not** excluded, recorded in `.prettierignore` with a trigger          |
| No provider was needed, and the reset is called where `cleanup` is                | §4; `FRONTEND-STATE.md` §1 took no store, so `test-render.tsx` is untouched |
| Proved by two tests that pass alone and disagree without it                       | §4; the substitution table                                                  |
| The hook's tests run with no network and no socket, `pnpm test` stays fast        | 320 frontend tests, 5.14s; no socket, no database, no network               |
| The built artefact is unchanged in shape, fixtures not in it                      | §7; four entries, grepped                                                   |
| `pnpm verify` passes                                                              | Exit 0 — 237 + 650 + 320 tests, plus the 14 process tests                   |

Beyond `verify`, both other required checks were run because this change touches
the frontend's build configuration: **`pnpm e2e`** — 31 passed against a real
Chromium — and **`pnpm test:database`** — 165 passed against a real PostgreSQL.

---

## For the stakeholders — a status report in plain English

### Where the product is

MarketPulse can show you 518 companies with a real last price and a real change,
drawn from roughly 48 million minute-by-minute price records on our own servers.
It still cannot draw a chart. This was the sixth of a short run of small,
load-bearing pieces between _"the prices are on our server"_ and _"you can look
at them"_. **The next task puts a real price series on screen.**

### What this task built

A **fixture backend**: a permanent, checked-in set of ten real answers from our
own market-data service, so that every future screen can be built and tested
against real data without a database, a network connection or a running server.

Nothing visible. Stated plainly, as this project requires.

### Why that is worth a task of its own

Three screens are coming: a security search, a price chart and a volume chart.
Each of them has to answer the same awkward questions. _What does the screen do
when we hold only part of the history you asked for? When we hold none of it?
When you ask for more data than one answer can carry? When the database is
down?_

Without this, each of those three screens would invent its own answer to _"what
does a partial result look like?"_ — and they would not agree. Three teams, three
made-up examples, three subtly different ideas of the truth, and the
disagreements only surface in front of a customer. Deciding it once, from real
data, is the cheaper end of that trade by a wide margin.

### The rule: record it, never write it

Every one of these ten examples was **taken from our own running service** rather
than typed out by hand. That sounds pedantic; it is the whole point, and there is
a live example of why.

A previous task hand-wrote a test example and used the word `"tracked"` where the
system's actual vocabulary says `"active"`. All fourteen of that task's tests
passed. The mistake was caught by a completely different tool, by luck. A
hand-written example is a **guess about what the server says**, and a guess that
is nearly right is worse than one that is obviously wrong — it passes, and it
teaches everyone downstream a fiction.

A recording cannot make that mistake, because the server produced it.

### The two examples we could not record, and why that is fine

Two of the ten describe things a **correct server never sends**: an answer whose
numbers contradict each other, and an answer naming a data source we do not
recognise. We need both, because those are the failures the screen has to survive
gracefully, and there is no way to ask a working server to misbehave.

So each was made by taking a real recording and changing **exactly one field** —
and after formatting, each is literally a one-line difference from the original
sitting next to it. Anyone can see in a second what was changed and that nothing
else was. That is the difference between a deliberate, inspectable exception and
a fixture nobody trusts.

### One thing we found while doing it, worth telling you

Our service can stitch two data sources into one answer — history from our
database plus the most recent minutes fetched live — and we needed an example of
that stitched shape, because Epic 3's live market feed will produce it constantly.

We could not get one by asking normally: the stitch only happens during a live
trading session against an up-to-date database, and our local copy is a few days
behind. Rather than invent one, we recorded it by running **the real service, the
real database and the real market-data vendor**, with only the clock moved back
to a moment when the stitch genuinely fires. Every number in that example is real.

And a fact fell out of it that is worth passing on rather than discovering later:
in that recording, both halves of the stitch name **the same feed**, because both
came from the vendor's historical service. The case where the two halves name
_different_ feeds — the one where honest labelling actually matters — arrives with
the live connection in Epic 3, and cannot be recorded until it exists. That is now
written down as something Story 2.14 inherits, rather than a surprise it finds.

### The dependency we declined to take on, and what it cost to find out

There is a well-known library, MSW, for exactly this kind of test scaffolding. The
house rule here is to **build the alternative before rejecting it**, so we did:
both versions were written, both worked, and both were measured.

The library added 49 packages and 19 MB, and — the deciding fact — it runs an
installation script. This repository deliberately blocks installation scripts
unless a package is named in an allowlist, because that is one of the more common
routes a supply-chain compromise takes. Adopting it meant a permanent hole in that
allowlist, for a development-only tool, to buy a capability this layer does not
use.

So we kept what was already working, at zero packages and slightly faster tests,
and wrote down the two specific conditions under which we would revisit it. The
measurement is in the repository; the library was removed cleanly.

### A quiet bug that would have been very expensive later

The application keeps recently-viewed price data in memory so that flicking back
to a company you were just looking at is instant. That memory is shared across the
whole application — which means, in testing, it is shared **between tests**.

The consequence is nasty in a specific way: a test could pass because of data left
behind by the test that ran before it, and it would fail the moment someone
reordered the tests or ran that one on its own. That is the kind of thing that
burns an afternoon eighteen months from now and makes people distrust the test
suite generally.

It is now cleared automatically after every test. And rather than assert that,
**we proved it**: we removed the line, watched exactly the expected test fail with
exactly the expected message, and put it back. A safety net nobody has tested is a
decoration.

### What you still cannot do

There is still no chart, no search box and no live data. What there is, after this
task, is a set of real answers that the next three screens can be built and tested
against — and a shared way of using them, so those three screens will agree with
each other about what our own service says.
