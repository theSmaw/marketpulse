# Task 2.4.3 — Real data on screen: the frontend read path and the plainest honest list

**Status:** Complete
**Story:** [2.4 The Tracked Universe On Screen](STORY.md)
**Depends on:** Task 2.4.2

## Objective

Get the 101 real securities onto the `/securities` route. **This is the task the whole story
exists for**, and it is deliberately the plainest version of it — the presentation work is
Task 2.4.4's, and separating them is what stops "make it look right" from delaying "make it
true".

## What the user can see when this lands

**The first real data this product has ever shown.** `/securities` stops being a placeholder
and lists every tracked security — symbol, name, sector, kind — read from the database
through the API. A stakeholder can open the deployed site, click Securities, and see that
MarketPulse tracks NVDA, AMD, XLK and SPY, and what each of those things is.

It will look plain. That is intended and worth saying out loud when demonstrating it: this
task proves the data is real and the path works end to end, and Task 2.4.4 makes it look
like the product. Shipping the plain version first is what makes the next task's changes
visible as a design improvement rather than lost inside a fix.

## Work

- **Fetch through `apps/frontend/src/api-client.ts` and nowhere else.** It is currently the
  only file in the application that calls `fetch`, Story 1.12 proved that by grep rather
  than by assertion, and it is worth keeping — it owns the base URL, the deadline, the abort
  signal, the `ApiError` parse and the correlation id, and a second caller would have to
  reimplement all five
- **Add the outcome to the client's vocabulary rather than beside it.** The client already
  returns **seven outcomes and never throws** — `ok`, `unreadable-body`, `api-error`,
  `http-error`, `timeout`, `unreachable`, `aborted` — and a second request shape should
  reuse that arrangement rather than inventing a parallel one. Note `aborted` is not a fact
  about the backend and must not be rendered as one, which Story 1.12 already learned the
  hard way
- **The states are types, not booleans.** Story 1.12's `BackendStatus` is the precedent and
  the argument is the same: name the states, make the impossible ones unrepresentable, and
  let the component render a state rather than infer one from three booleans that can
  contradict each other. There are four here and the fourth is the one nobody plans for —
  loading, loaded, failed, and **loaded-but-empty**, which is exactly what a migrated but
  unseeded database looks like and is not an error
- **Do not add a store.** Story 2.10 owns that decision and this story's open decision 2
  recommends leaving it there: one static list is the weakest possible evidence on which to
  decide how this application holds domain state, and deciding it here anchors it against a
  shape nothing like a streaming bar series. A hook beside `useBackendHealth` is the shape
  that costs nothing to replace
- **Render the plainest honest table**, inside the existing `Region` component so it
  inherits the landmark, the heading and the error boundary. Four columns, no grouping, no
  sorting control, no search. Tabular numerals are already set globally. **The rows arrive
  already ordered by symbol** — Task 2.4.1 put the `order by` in the query, because Postgres
  guarantees no order without one — so this table sorts nothing of its own, and the
  grouping-versus-sorting decision stays Task 2.4.4's
- **An untracked security is a row, not an absence**, and this is the plain version of story
  acceptance criterion 6. Task 2.4.1's read deliberately does **not** filter on `status`, per
  `UNIVERSE.md` §12.2, so untracked rows arrive here and the table must render them rather
  than dropping them — the visible distinction and the count's wording are Task 2.4.4's, and
  what this task owes is that the row is on screen at all. There is no such row today, which
  is exactly why it is easy to lose: the deployed table is 101 rows all `active`, so a
  version of this table that filtered would pass every check this task can run
- **Say on screen that there are no prices yet**, using Story 1.5's convention that an empty
  region names the epic that fills it. A page of securities with no prices looks broken
  unless it says why it is not
- **Fetch once, not on a poll.** `useBackendHealth` polls every 30 seconds because a health
  state changes; the universe changes a handful of times a year, and a poll would be
  standing billable traffic against the Consumption plan's idle condition for no benefit

## Done when

- `/securities` renders every security the API returns, untracked ones included, seen in a
  browser
- The four states exist as types and the component renders a state rather than inferring one
- `api-client.ts` is still the only file that calls `fetch`, verified by grep
- No store, no poll, no search
- Tests at the level each thing belongs to, and `pnpm verify` passes with no database

## Notes

The temptation is to do this task and Task 2.4.4 together, because a plain table feels
unfinished. Resist it: the two failures they catch are different — this one catches "the
data is not what we thought", and that one catches "the page does not read as a product" —
and merging them means a single large change where neither is clearly the cause of the other.

---

## Amended 2026-09-06, after Task 2.4.2

Two things this file did not know, and the first is a piece of work that had **no owner in
any of the six tasks** until 2.4.2 shipped. Neither changes this task's scope or position.

### `isSecuritiesResponse` is this task's, and it is the load-bearing half

Task 2.4.2 shipped the contract in `packages/shared/src/securities-response.ts` and
deliberately shipped **no predicate**, under Task 1.7.3's rule that a validator ships with
its first reader — and this task is that reader. So writing it is work here rather than
there, and it goes beside the shape in `packages/shared` for the reason `isHealthResponse`
and `isApiError` do: a validator written at the call site is the copy that drifts.

It is `isHealthResponse`'s case rather than `isApiError`'s, with one exception. `isSecurity`
already exists next door, is total, and **does** check `kind`, `sector` and `status` against
their const arrays — so the predicate here is a shape check over the envelope plus a
`.every(isSecurity)`, and nothing about a security needs re-validating.

**The trap is `provenance`, and getting it wrong turns a correct response into the failed
state.** It is **optional**, and its absence is not a malformed body — it means one of
exactly two things, both of which this task has to render as `loaded`:

| On the wire                              | What it means                                                              |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| `{"securities": [...], "provenance": …}` | The normal case: every security came from one place                        |
| `{"securities": []}`                     | **The empty state.** Nothing to attribute a source to                      |
| `{"securities": [...]}`                  | The rows no longer agree, so the server does not make the claim. Story 2.7 |

A predicate that requires `provenance` makes the **loaded-but-empty state fail as
`unreadable-body`** — which `api-client.ts` maps to `degraded`, so the page would render
"the service could not be reached" against a perfectly healthy backend and an empty
database. That is the fourth state this task exists to get right, arriving through the
validator rather than through the component. It is cheap to produce: point at a migrated
database with no universe loaded, or drive the client against `{"securities": []}`.

### Two smaller facts from the shipped contract

**There is no `count` on the wire** — 2.4.2 rejected it, because without pagination
`securities.length` is the count and a field beside it can only disagree. Both of Task
2.4.4's numbers are derived here: rows held is `securities.length`, and securities tracked
is the rows whose `status` is `"active"`.

**A null `sector` arrives as a genuine `null`**, not as `""` and not as the string
`"null"` — 2.4.2 found that the obvious schema produced the empty string and fixed it with
`type: ["string", "null"]`, asserted on the raw body. So this table can rely on `null`
meaning "there is no answer". What that should _look_ like is Task 2.4.4's, and it now has
an amendment saying so.

---

## Completed 2026-09-06

### What shipped

Five files. `packages/shared/src/securities-response.ts` gained
**`isSecuritiesResponse`** and its test; `apps/frontend/src/api-client.ts` gained
**`getSecurities`** and nothing else; **`apps/frontend/src/use-securities.ts`** is the hook;
and **`apps/frontend/src/routes/SecurityExplorer.tsx`** plus its stylesheet replaced the
placeholder that had been there since Story 1.5. No dependency, no lockfile change, no new
`verify` step, and no store.

`api-client.ts` is **still the only file in `apps/frontend/src` that calls `fetch`**,
verified by grep rather than asserted — one file, one match.

### The four states were produced in a browser, not reasoned about

All four against the running local pair at `/securities`, plus the fifth thing this task
owes:

| State                | How it was produced                                            | What the page said                                                        |
| -------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `loading`            | a request that never answers                                   | _Loading the tracked universe…_, no table                                 |
| `loaded`             | the real database                                              | **101 rows — 86 Company, 11 Sector ETF, 4 Index ETF**                     |
| `empty`              | `{"securities": []}` at the network boundary                   | _…running and holds no securities. The database has been migrated…_       |
| `failed` unreachable | a rejected `fetch`                                             | _The service could not be reached…_, no reference line                    |
| `failed` badly       | a 500 carrying an `ApiError` and an `x-request-id`             | _Something answered at the service's address and it was not this service_ |
| **untracked row**    | `update securities set status='untracked' where symbol='GILD'` | still **101 rows**, GILD present, API confirming `status: "untracked"`    |

The 86 / 11 / 4 split reproduces `UNIVERSE.md` §9 exactly, which is the check that the page
is reading the database rather than a fixture.

**Through every failure: 0 error fallbacks and all 4 navigation links intact.** That is
structural rather than lucky — `getSecurities` never throws, so a dead backend is a _value_
the hook stores and nothing unwinds into `ErrorBoundary`.

The two failure branches were reached by intercepting at the **network boundary** (patching
`window.fetch` in the page) rather than by breaking the environment, so the real
`api-client`, the real shared predicate, the real hook and the real component all ran. That
is stated rather than glossed: it is not a substitute for Task 2.4.6 producing them against
the deployed pair.

### Five findings

**1. `isSecuritiesResponse` had to be written before it could be got wrong, and the wrong
version was produced.** The amendment above predicted that requiring `provenance` turns the
empty state into `unreadable-body`. It was made to happen: removing the
`=== undefined ||` clause takes **two** tests red — the empty list _and_ the populated list
with no provenance, which is Story 2.7's normal case arriving early. Reverted.

**2. `loaded` carries a non-empty tuple, and that is what removes the fourth state's
ambiguity rather than a comment about it.** `readonly [Security, ...Security[]]` means
"loaded with zero rows" cannot be constructed, so `empty` is not a case each consumer has to
remember. It costs nothing to build: `noUncheckedIndexedAccess` already makes
`const [first, ...rest]` give a `Security | undefined` head, so the guard that narrows it
**is** the empty check.

**3. The seven outcomes collapse onto two failures, not five, and the id survives the
collapse.** `SECURITIES_FAILURES` is `unreachable | answered-badly` — the same judgement
`toBackendHealth` makes, for the same reason: a person looking at an empty page can act on
exactly two facts, _is it up_ and _what is answering there_. `api-error` and `http-error`
merge because the client tells them apart only by whether a quotable `requestId` came back,
and that travels on the state rather than needing a member. This is **the first place in
MarketPulse that puts a correlation id on screen**, and it obeys `api-client.ts`'s rule
verbatim: the whole UUID, never a prefix, labelled, and only beside a failure — `null` and
therefore absent on every `unreachable`, because nothing arrived to carry one.

**4. A page load makes two `/securities` requests in development and it is not a poll.**
Measured off `performance.getEntriesByType('resource')`: two `fetch` entries 1 ms apart, one
of which is aborted. That is `StrictMode`'s effect double-invoke, which this repository
already recorded for `/health` in Task 1.13.5 — worth writing down again because it looks
exactly like the poll this hook deliberately does not have. **A test asserts one request and
no second one**, which is what would catch a real regression: a poll here would be standing
billable traffic per open tab against a fact that moves a handful of times a year.

**5. The `e2e` gate caught a real defect in this change, on the pull request, and the specs
were right where the change was wrong.** The first draft gave the page an `<h1>` of
_"Securities"_ — which reads better in isolation and disagrees with the navigation link a
user clicked to reach it. Two specs went red for that reason:
`backend-failure-states.spec.ts` walks all four routes asserting each one's `<h1>`, and
`specs-deployed/host-routing.spec.ts` deep-links to `/securities` and asserts the same name.

Worth recording for two reasons beyond the fix. **The tempting response was to edit the two
specs**, and it would have been wrong — a heading that contradicts its own link is a defect,
and PRODUCT_SPEC.md §8.3, `AppHeader`'s link and both specs already agreed on the name. And
**the failure was invisible to `pnpm verify`**: this is a property of the assembled
application across a route change, which no unit test in this repository is positioned to
see. It is the fifth thing the browser gate has caught that nothing else could, and the
first that was a naming inconsistency rather than a wiring one. Whether the route should be
renamed is a real question and is Task 2.4.4's, moving three things together.

### Three decisions worth not undoing

**No store.** Story 2.10's, deliberately left there — §25 says avoid a heavyweight state
library until complexity demonstrates the need, and one static list is the weakest possible
evidence on which to decide how this application holds domain state.

**Still a route module, not a `src/components/` component.** It will have states worth
reviewing side by side, which is the test Task 1.5.3 set — but those states are Task 2.4.4's
subject, and promoting it to workshop material now fixes a shape one task early. It moves
then, the way `Region` moved when it acquired a failed state.

**The untracked row renders identically to an active one, and that is a deliberate, visible
gap.** `UNIVERSE.md` §12.2 puts this reader on the _do not filter_ side and the row is on
screen; **marking it is Task 2.4.4's**, along with the page's two counts. The screenshot
shows a security we no longer track presented as one we do, which is the argument for doing
2.4.4 next rather than a reason to have merged them.

### Figures

`pnpm verify` **exit 0**, seven steps, with no database needed. `pnpm e2e` **10 passed**. `pnpm test` is **331**
(shared 68 across 6 · backend 146 across 10 · frontend 117 across 14) — shared +13 and the
frontend +14. `pnpm test:process` **14**, unchanged.

### Handed forward

- **Task 2.4.4**: the marking of an untracked row, both counts, grouping the eleven sectors,
  and whether the em dash is the right way to say "this thing has no sector". The four
  states exist as types and each has a rendering to improve rather than to invent.
- **Task 2.4.5**: the table is `<th scope="col">` headers over `<th scope="row">` symbols, so
  a screen reader announces the symbol with each cell; the axe gate has not been run against
  this page.
- **Task 2.4.6**: none of the above has been seen against the **deployed** pair.

---

## For the stakeholder — what changed, in plain terms

**MarketPulse now shows real data for the first time.**

Until today every screen in the product was a promise. The landing page's only
market-looking content was a hand-written demonstration table invented back in Epic 1 — it
was never real, and two of its rows were deliberately marked broken to show what a fault
would look like. Click "Security Explorer" and you got a paragraph explaining what would
eventually live there.

Open it now and you get **the 101 securities MarketPulse actually tracks**, read out of the
real database: Apple, NVIDIA, Boeing, Bank of America, the eleven sector funds, and the four
whole-market funds like SPY. For each one, its ticker, its full name, which part of the
economy it belongs to, and whether it is a company, a sector fund or a market fund. Nothing
on that page is typed in by hand; if somebody changes the list we follow, the page changes.

**Why that matters more than it looks.** The value is not the table — it is that a piece of
information now travels the whole length of the product without a human touching it: out of
the database, through the server, across the internet, into the browser, onto the screen.
Everything Epic 2 has built over the last three stories — the database, the migrations, the
curated list of companies — was invisible until this. It is now visible, and every future
feature (prices, charts, the anomaly scores, the AI investigations) travels the same road we
have just proved works.

**Why it looks plain, on purpose.** This is a four-column table with no styling opinion in
it, and that was the plan rather than an oversight. The very next task makes it look like a
funded product — the visual bar is an acceptance criterion for this story, not something
deferred. Splitting the two means that if the numbers turn out to be wrong we find that out
now, and when the design lands next week it reads as a design improvement instead of
disappearing inside a bug fix. Showing you the plain version first is the point.

**Where we were careful.**

- **The page never lies about prices.** There are no prices in MarketPulse yet — the live
  market feed is Epic 3 — so the page says so on its face rather than leaving a user
  wondering why the numbers are missing. An unfinished screen that explains itself is
  trustworthy; one that is silently incomplete is not.
- **The page never lies when something breaks.** Four different things can happen when it
  asks for the list, and it tells them apart instead of showing one generic error. "We
  couldn't reach the service" and "something answered and it wasn't our service" send you to
  two completely different places to look. And crucially, "the service is fine and has
  nothing in it" is treated as an honest answer rather than a failure — that is exactly what
  a freshly set-up environment looks like, and calling it a fault would send somebody
  hunting for a bug that isn't there.
- **Nothing else breaks when this does.** Every failure was produced and watched: the
  navigation still works, the rest of the page is untouched, and the product does not
  collapse into an error screen. That is a founding rule of this product and it now has
  evidence behind it on a real screen.
- **When something does go wrong, you get a reference number to quote.** Each failure shows
  the identifier of the exact request that failed, which an engineer can search for in the
  server's logs. This is the first place in the product that offers one.
- **We did not build the big machinery early.** There is a well-known temptation to install a
  heavyweight data-management library the moment a page fetches something. We deliberately
  didn't: a list that changes a few times a year is the worst possible evidence for a
  decision about how to handle prices that change several times a second. That decision stays
  where it belongs, with the story that has real streaming data to judge it against.

**What you still cannot do**, so nobody demonstrates this and over-promises: you cannot
search the list, cannot click a security to open it, and cannot see any price or chart.
Those are three separate later stories. And one honest gap this task leaves for the next one:
if we ever stop tracking a company, it currently still appears in the list looking exactly
like one we do track. Keeping the row is deliberate — its history matters, and a company
that silently vanishes is the failure we designed against — but _labelling_ it is the very
next task's job.

**Where we are.** Epic 2 is roughly halfway through. The database, the schema, the tracked
list of companies and now the route from database to screen are all done. What remains in
this epic is the market-data provider, the connection to Alpaca, and the historical price
bars — at which point this page stops being a list of names and starts being a market.
