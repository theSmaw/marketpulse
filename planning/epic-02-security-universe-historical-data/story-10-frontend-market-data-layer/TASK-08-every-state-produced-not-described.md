# Task 2.10.8 — Every state produced rather than described, and what happens while the next one loads

**Status:** Complete — 2026-09-10
**Story:** [2.10 Frontend Market-Data Layer & Application State](STORY.md)
**Depends on:** Task 2.10.7

## Objective

Take the union Task 2.10.4 defined and produce every member of it on screen from
a named cause, decide what the page does _while_ a series is being replaced, and
settle the announcement pattern for an asynchronously-filled surface — which the
story explicitly makes this story's rather than Story 2.11's, because it is a
property of every consumer of this layer.

## What the user can see when this lands

**The panel telling the truth in every situation it can be in**, which is the
difference between a demo and a product.

- **A partial answer rendered as an answer** — "we hold 1,438 of the 1,950
  minutes you asked for, through 15:42" — rather than as an error or, worse, as a
  complete series that is silently short. This is §36's shape and the state Story
  2.4's static list could not produce
- **An empty series rendered as an answer**: we have nothing stored for this
  symbol yet, which is true for real symbols in the real store
- **A refusal that names its number**: 10,000 bars is the limit, and a window
  outside the calendar's range refuses rather than quietly returning less
- **The previous series staying on screen, marked stale, while the next one
  loads**, rather than the panel emptying and refilling. Story 2.13 needs this
  for its window control and Epic 3 needs it for a live feed, and deciding it
  here is what stops each of them deciding it differently

## Work

- **Produce each state from a named cause.** A state produced by flipping a
  boolean proves the component and not the wiring — Task 2.4.4's rule, and it
  found real defects. The causes, each of which is available today:

  | State              | Named cause                                                                                                      |
  | ------------------ | ---------------------------------------------------------------------------------------------------------------- |
  | partial            | ask for a window that starts before this symbol's backfill does — `pnpm bars:check` says what is missing and why |
  | empty              | a tracked symbol with no stored bars, or a window entirely before coverage                                       |
  | refused (cap)      | ask for a year of minute bars; the 400 names the count against 10,000 — see the amendment, it is not 98,280      |
  | refused (calendar) | a window outside 2024–2028                                                                                       |
  | unreachable        | stop the backend                                                                                                 |
  | retryable          | `DATABASE_PORT=59999 node dist/index.js`, which produces a real 503                                              |
  | retrying           | press the retry with the connection throttled, or hold the answer with a route intercept                         |
  | answered badly     | point `VITE_API_BASE_URL` at a static host, which answers 200 with `index.html`                                  |
  | loading            | a throttled connection or a route intercept                                                                      |

  > **Amended 2026-09-10 by Task 2.10.3 — a cheaper cause for one row, and a
  > sentence that row must not say.** `isBarSeriesResponse` refuses a `feed`,
  > `provider`, `adjustment`, `timeframe` or `securityStatus` outside its const
  > array, so **_answered badly_ has a second named cause that needs no second
  > host**: hand the guard a body carrying an unknown feed slug, through the
  > fixture backend or a route intercept. Keep the static-host cause too — the
  > two are different real situations — but this one is producible in a
  > component test, where the other needs a rebuild.
  >
  > **And the copy for that state is now constrained.** From this endpoint,
  > `unreadable-body` means _the body is not this contract's shape — a wrong
  > host, or a vocabulary this bundle predates_. It **never** means the numbers
  > disagree with each other, because the guard checks shape and not coherence
  > (see that task's finding, and Task 2.10.4's amendment which owns the
  > coherence check). So a sentence like "the data looks wrong" would be false
  > here in the same direction "unexpected response" was false on the universe
  > page: it points a reader at the numbers when the actual fault is the address
  > or the deploy.

- **Decide what happens to visible data while new data loads, and record the
  decision with its reversal trigger.** A panel that empties and refills flickers;
  one that keeps the old data and marks it stale is the §36 shape. The trap is
  that stale data marked insufficiently clearly is worse than no data, because an
  analyst reads a number that is no longer about the thing they just selected —
  so whatever marks it has to survive the same rule as everything else here:
  **not colour alone**, and it must not make the number harder to read.

  Note this is the decision Story 2.13 inherits for its window control and Epic 3
  inherits for a live feed, so it is written down rather than left in a component.

- **Settle the announcement pattern for this layer, generalising Task 2.4.5's
  finding rather than re-deriving it.** `UniverseTable`'s `Announcement` is a
  **persistent `role="status"`, rendered in every state, never unmounted, silent
  on arrival**, and all three clauses are load-bearing: a live region added at the
  same moment as its content is not reliably announced; `alert` is
  `ErrorFallback`'s and the browser suite asserts on that distinction on every
  route; and arriving at a page is not a change, so a sentence there is only a
  second copy of the visible line.

  What is new here and was not true of a static list: **the content changes more
  than once**, when the symbol or the window changes. So this task has to answer a
  question that page could not raise — what a region says when a _second_ series
  replaces a first, and whether a stale-then-fresh sequence announces once or
  twice. Decide it, and note that a region which announces on every keystroke of
  Story 2.11's search would be actively hostile.

  > **Amended 2026-09-10 by Task 2.10.2, which hit the mechanism half of that
  > question on a single retry.** **A live region whose text does not change
  > announces nothing.** So "once or twice" is not only a taste decision: any two
  > consecutive states that produce the _same sentence_ are silent, and the case
  > nobody pictures is the one that matters — a retry, or a window change, that
  > lands on the state it started from. On the universe page that would have made
  > a second identical failure completely inaudible, and the fix was a distinct
  > in-between sentence (_"Trying the tracked universe again."_) that the region
  > passes through and back out of, which is what makes the return audible at all.
  >
  > Two consequences here. A stale-then-fresh sequence that ends where it began
  > needs something to have changed in between, or it says nothing. And a sentence
  > built by concatenating a state's own copy is identical across a refetch that
  > changes nothing — which is the common case for a closed session's bars, and is
  > arguably the correct silence there. Decide it rather than inheriting it.

- **Cover the states where they can actually be seen.** Component tests can
  assert structure and text; **no test can assert colour**, because no stylesheet
  is applied in the test environment, and that is structural rather than a
  discipline. A browser spec is the only level that sees the stale treatment and
  the contrast. Add browser coverage for the one property that matters most and
  is cheapest to lose — that the live region is the **same DOM node** before and
  after the content changes — which is the assertion `e2e/` already makes for the
  universe table and the reason it caught the original defect.

- **Do not add a control that changes the window.** Story 2.13 owns the window
  control, and this task needs a second window only to _produce_ the transition —
  a URL edit is enough. A control added here is the next story arriving early and
  arriving without its calendar rules.

- **The retryable failure brings a control, and it will be the third copy of the
  button rule — extract it here** (added 2026-09-10 by Task 2.10.2). This
  product's button treatment now exists twice, in `ErrorFallback.module.css` and
  `UniverseTable.module.css`, and the panel's retryable failure is the third.
  **Three is where this repository extracts**: the visually-hidden idiom moved to
  `styles/a11y.module.css` at its third copy, and `Marker` took the geometry and
  the silhouettes off three components that were each remembering them. So this is
  the copy that pays for a shared control rather than the one that makes it
  inevitable — and whatever is extracted lands under `src/components/`, which
  means it owes stories.

  What must **not** travel with it is the surrounding treatment. `ErrorFallback`
  carries a red rule and `role="alert"` because a render failure is what it
  reports; a service that is briefly unavailable is a product state (§36) and
  carries neither. The shared thing is the control, not the error language.

## Done when

- Every member of the union has been produced from a named cause and seen on
  screen, and the causes are recorded so the next person reproduces rather than
  re-invents
- A partial answer says how much we hold and through when, from the response
  rather than from a constant
- Both refusals name their number or their range
- The stale-while-loading behaviour is decided, implemented, marked without
  relying on colour, and recorded with a reversal trigger
- The announcement pattern is settled for a surface whose content changes more
  than once, and the browser suite asserts the region is the same node across a
  change
- A state that is re-entered — a retry or a refetch landing where it started — is
  still announced, or the decision not to announce it is recorded with its reason
- `pnpm verify` and `pnpm e2e` both pass

---

## Amended 2026-09-10 by Task 2.10.4 — the union is six wide, and one member takes no control

- **Six members, and three of them are answers.** `loaded`, `partial` and
  `empty` are all 200s. `refused` is a fourth kind of thing — a well-formed
  answer about the request — and only `failed` is a failure.
- **`refused` must not acquire a retry control.** It carries no `retryable` flag
  by design: waiting never helps, and offering the button is a lie the user pays
  for twice. Both refusals name their number or their range because the state
  keeps the server's sentence verbatim, so "both refusals name their number" in
  the criteria above is satisfied by rendering `message` rather than by writing
  new copy.
- **How to produce each member from a named cause**, since the criteria ask for
  causes rather than descriptions. `refused` (cap): ask for `1m` over a year —
  the server computes the bar count and names it. `refused` (calendar): ask for a
  window in 2029. `refused` (unknown security): ask for a symbol not in the
  universe — it arrives as `NOT_FOUND` and is a refusal, not a failure. `empty`:
  a tracked security with no stored bars in the window. `partial`: any window
  reaching to now, which is the default case. `failed` / `unreachable`: stop the
  backend. `failed` / `answered-badly`: the fixture backend Task 2.10.6 builds is
  the only comfortable way to produce the coherence failure — a body shaped like
  the contract whose bars do not ascend.
- **A coherence failure looks exactly like a 500 on screen**, and that is
  deliberate: the diagnosis differs, the user's action does not. The sentence
  naming which check failed goes to the console with the `requestId`, never to
  the screen.

---

## Amended 2026-09-10 by Task 2.10.5 — stale-while-loading half exists, and the half that is missing is the label

The cache landed, and with it the behaviour half of this task's stale decision:
**a held series for the same request paints in the first commit**, while the
fresh answer is in flight behind it. `FRONTEND-STATE.md` §2's rule is what makes
that safe — every read of the cache is accompanied by a request, so a stale entry
can be on screen only for the duration of one in-flight request.

**What does not exist is any way for a component to know it is looking at one.**
`BarSeriesView` has six members and none of them says _a request is in flight
behind this answer_; a cached `loaded` and a freshly-fetched `loaded` are the
same value. So this task's decision is now sharper than "decide what happens to
visible data while new data loads" — the behaviour is decided and the **label is
missing**, and the question is where it goes:

- a seventh union member, which every consumer's `switch` then has to handle;
- a boolean on the answer members, which is `FRONTEND-STATE.md` §4's `retrying`
  precedent — a flag rather than a state, for a difference that is one mark on
  screen rather than a different shape of screen;
- or a field on `BarSeriesSource` beside `retry`, which keeps the union
  comparable and constructible-as-data and is arguably where a fact about _the
  request_ rather than about _the market_ belongs.

Two constraints on whichever is chosen. **Only an answer is ever stale** — the
cache holds `loaded`, `partial` and `empty` and never a `failed` or a `refused`,
so there is no "stale failure" case to design for. And a **different** request
never shows the previous one's series: a key change resets the view to the new
key's entry or to `loading`, so the thing being marked stale is always the same
symbol, timeframe and window.

The announcement question inherits the same shape: a refetch that lands on an
identical series is the common case for a closed session's bars, and it produces
the same sentence, which a live region passes over in silence. That is arguably
correct here — nothing changed — but it must be decided rather than discovered.

---

## Amended 2026-09-10 by Task 2.10.6 — every state now has a named cause on disk

This task's title is _every state produced, not described_, and the fixture
backend is what makes the producing cheap. `apps/frontend/src/fixtures/` holds
ten recorded bodies of `GET /market-data/bars`, eight of them taken from the real
endpoint over the real store, each with the state it collapses to asserted in
`fixtures/bar-series.test.ts`:

| Cause                                 | Fixture                | State                             |
| ------------------------------------- | ---------------------- | --------------------------------- |
| A complete answer                     | `full`                 | `loaded`                          |
| A window past what the store holds    | `partial`              | `partial`                         |
| A window with no prints in it         | `empty`                | `empty`                           |
| History plus a live tail              | `stitched`             | `loaded`, two provenance sources  |
| A window over the 10,000-bar cap      | `refusedCap`           | `refused`, naming 98,310          |
| A window outside the trading calendar | `refusedCalendar`      | `refused`                         |
| A symbol the universe does not hold   | `refusedUnknownSymbol` | `refused` — **the third refusal** |
| The store unreachable                 | `unavailable`          | `failed`, **`retryable: true`**   |
| Our own server contradicting itself   | `incoherent`           | `failed`, not retryable           |
| A feed slug this bundle does not know | `unknownFeed`          | `failed`, via `unreadable-body`   |

`stubBarSeries(name)` installs a `fetch` stub answering with any of them;
`barSeriesFixtureView(name)` returns the state itself, built through the real
`toBarSeriesView`, which is the form a story wants. **Constructing a state by
hand is the thing to avoid**: a hand-built `partial` whose `covered` disagrees
with its bars is unreachable in the real layer, and a component tuned against it
renders the real one wrongly.

Three states this task must produce that no recorded body can, because they are
properties of a **transport** rather than of an answer: `loading` (use
`neverAnswers` from `fixtures/stub-fetch.ts` — the socket that accepts and does
not reply), `unreachable` (reject with `new TypeError("Failed to fetch")`), and
`timeout` (`neverAnswers` again, past the deadline). All three are in
`stub-fetch.ts` or one line away from it.

And the one wording constraint that comes out of the recording rather than out of
a decision: **`stitched.json`'s two sources name the same feed.** Both halves are
Alpaca's historical API, which is SIP on this plan, so _"this chart is stitched
from two feeds"_ is not a sentence anything can currently produce. The two-feed
case arrives with Epic 3's IEX socket, and Story 2.14 owns it.

---

## Amended 2026-09-10 by Task 2.10.6 — three corrections to the causes table, measured while recording the fixtures

### The cap's number: 98,280 is not a number this endpoint produces

The causes table above says _"ask for a year of minute bars; the 400 names
**98,280** against 10,000"_. Recording that refusal against the real endpoint
produced **98,310**, and the discrepancy is not a drift — it is a figure that was
derived rather than taken. Measured, `symbol=NVDA&timeframe=1m`:

| Window                                          | The 400 names |
| ----------------------------------------------- | ------------- |
| `start=2025-09-04T13:30Z&end=2026-09-04T20:00Z` | 98,310        |
| `start=2025-09-05T13:30Z&end=2026-09-04T20:00Z` | 97,920        |
| `sessions=252`                                  | 97,920        |
| `sessions=253`                                  | 98,310        |

The counts step by exactly 390 and are ≡ 30 (mod 390) for a session-aligned
window, so **98,280 = 390 × 252 sits off the lattice** and no session-aligned
window produces it. It is the naive sizing arithmetic — `390 × 252` — which
`BARS.md` §"Mean 97,494" already flags as _not_ the real figure for a different
purpose, arriving here as though it were a server's output.

**Only the live instruction is corrected: this table's row.** The other twelve
copies of 98,280 are deliberately left standing, and they split into two kinds
that must not be swept together. `UNIVERSE.md`, `BARS.md` and Story 2.8's tasks
use it as the _naive sizing estimate it is_, correctly and about a different
subject. `TASK-04`'s four copies, `bar-series-view.ts`'s doc comment and three
frontend test files use it as an **invented example sentence** demonstrating that
the client shows the server's message verbatim — where the number is immaterial
by construction, since the whole property under test is that nothing here reads
it.

Which is also the durable point, and it is the one this task should act on rather
than the number: **no document and no component should carry this figure at all.**
The criterion _"both refusals name their number"_ is satisfied by rendering
`message`, and any copy written around a specific number is copy that will be
wrong for every window except one.

### The `empty` row has a much cheaper cause, and it is the default

The table offers _"a tracked symbol with no stored bars, or a window entirely
before coverage"_. Neither is needed, and neither is available cheaply: every
security in the store has a ledger row for both timeframes, so there is no
symbol with nothing stored.

What produces `empty` is **the ordinary default**. Measured 2026-09-10 against
both stores, `symbol=NVDA&timeframe=1m`: `sessions=1` and `sessions=2` are both
`empty` with `covered: null`, because the current session has not opened and the
nightly backfill has not taken the one before it. `sessions=5` is `partial` on
both. See TASK-07's amendment for the full table and what it means for the
default window — the short form is that **`empty` and `partial` are what this
panel renders in normal use**, which makes this task's _"produce every state from
a named cause"_ considerably cheaper and its copy considerably more important.

### The coherence fixture mutates a count, not an ordering

Task 2.10.4's amendment says `failed` / `answered-badly` is produced by _"a body
shaped like the contract whose bars do not ascend"_. The shipped fixture takes the
other route the amendment offered: `incoherent.json` decrements the single
source's `barCount` from 30 to 29, so the sources no longer sum to the bars. Same
branch, same state, same one `try` in the layer — but anyone grepping for a
non-ascending fixture will not find one.

---

## Amended 2026-09-10 by Task 2.10.6 — a consequence for where the stale label goes

Task 2.10.5's amendment lists three homes for the _a request is in flight behind
this answer_ label: a seventh union member, a boolean on the answer members, or a
field on `BarSeriesSource` beside `retry`. The fixture backend adds one input to
that choice that was not visible when those three were written.

**`barSeriesFixtureView(name)` returns a `BarSeriesView`.** That is what a story
holds, and it is deliberately built through the real `toBarSeriesView` so a story
cannot render a state the layer cannot produce. If the flag lands on the union or
on its answer members, a stale story is `{ ...barSeriesFixtureView("partial"),
stale: true }` and costs nothing. If it lands on `BarSeriesSource`, the fixture
module cannot express it and this task owes a second helper — because a story
that constructs the source shape by hand is back to hand-building state, which is
the thing the fixture set exists to stop.

That is a cost on the third option, not a case against it: a fact about _the
request_ rather than about _the market_ arguably does belong beside `retry`, and
one small helper is a fair price. It should just be priced rather than discovered
after the choice.

---

## Amended 2026-09-10 by Task 2.10.7 — the panel exists, and three of your deliverables are already in it

`components/BarSeriesPanel/` renders all six members from a `BarSeriesView`
taken whole, and `e2e/specs/security-series.spec.ts` drives the healthy path
against the real pair. What that leaves you is narrower and sharper than the
brief above.

**Already done, do not do it twice.**

- **Every state has a rendering**, and every one is reviewable in
  `BarSeriesPanel.stories.tsx`'s `AllPermutations` grid, built from the recorded
  fixtures. The refusals carry no control and no correlation id; the retryable
  failure carries both; the incoherent one says asking again will not help.
- **The third copy of the button rule is written**, in
  `BarSeriesPanel.module.css`, with a note saying what must _not_ travel with it
  when you extract it: `ErrorFallback`'s red rule and `role="alert"` belong to a
  render failure, and a briefly unavailable service is a product state.
- **The `refused` states are already correct** — the server's sentence verbatim,
  and the criterion _"both refusals name their number"_ is satisfied by
  rendering `message` rather than by writing copy.

**Still entirely yours**, and the list is now specific:

- **The stale-while-loading label.** The behaviour exists — a held series paints
  in the first commit — and nothing on screen says so. See the two amendments
  above for where the flag could live and what each choice costs.
- **The announcement.** The panel is deliberately **not** a live region, and its
  header says so and names you. Note the panel's content changes on _two_ axes
  now: the symbol (a navigation) and, from Story 2.13, the window.
- **Producing each state from a named cause in a browser.** The four states the
  new spec covers are the healthy ones; the failures are yours.

**One finding from building it, which is about your `answered badly` row.** The
`Marker` primitive reads `--marker-color` off its inherited context and owns no
colour. A row that renders a marker without setting it renders an **invisible**
one — no error, no warning, correct DOM, and nothing in `pnpm verify` can see
it. That happened here and was caught by looking. Any state you add a marker to
owes that custom property.

---

## Amended 2026-09-10 by Task 2.10.7 — a seventh thing to produce, and the live region is now the page's _second_

Three findings from building the panel, and the first is a gap that task created
rather than closed.

### `untracked` renders, and nothing can currently produce it

`BarSeriesPanel` has an `Untracked` note — _"MarketPulse no longer tracks this
security. These bars are what was stored while it did."_ — because
`securityStatus` is on all three answer members and this panel is the first
thing in the product able to say it.

**It has no fixture, no test, no story and no browser cause.** Checked: all six
recorded 2xx bodies carry `securityStatus: "active"`, every row in the local
store is `active`, and no deployed row has ever been anything else. So there is a
rendering path in shipped code that nothing has ever executed, and the criterion
_"every member of the union has been produced from a named cause"_ does not
reach it — because it is not a member of the union, it is a **field on three of
them**, which is exactly the shape a states checklist walks past.

It is producible, and the procedure is worth recording rather than rediscovering.
Two routes, both reversible:

- **Through the loader**, which is the honest one: remove a symbol from
  `apps/backend/src/universe.ts`, run `pnpm universe`, and the loader untracks
  the row rather than deleting it — `load-universe.test.ts` covers exactly that
  transition. Restore the file and re-run to undo.
- **Directly**, for a one-off recording:
  `update securities set status = 'untracked' where symbol = $1`, which is what
  `market-bars.database.test.ts` already does twice for the same reason.

Either produces a real body with `securityStatus: "untracked"` for
`apps/frontend/src/fixtures/`, which is where the eleventh recorded body belongs.
Note the store keeps that security's bars and the route still serves them — an
untracked security is not a 404 — so the fixture is a **populated** answer with
a different status, not an empty one.

### The panel's live region will be the page's second, not its first

The announcement bullet above was written when this panel was the only
asynchronously-filled surface this story added. It is not: `/securities` now
renders **two** regions that fill over the network — the universe table and the
market-data panel — and the table already owns a `role="status"`.

So this task is not adding _a_ live region, it is adding a **second one to the
same document**, and that raises a question the brief does not contemplate: two
polite regions can be updated in the same moment, and a screen reader queues them.
Landing on `/securities` currently announces the universe's arrival; with a panel
region it would announce two things about two different subjects, in an order
neither component controls. Decide it — one region for the page, two with
distinct subjects, or the panel staying silent while the table speaks — rather
than discovering it.

**And two live claims in the tree go false the moment it lands.** Both are true
today, so leave them alone until then and correct them as part of this task:

- `components/FeedProvenance/FeedProvenance.tsx:59` — _"`UniverseTable` owns the
  page's one live region."_
- `components/MarketClock/MarketClock.tsx:85` — _"application's one live
  region."_

They are named here because recording a correction and propagating it are two
obligations, and the mechanism that defers the first routinely covers only the
component being changed.

### The stale label has a concrete route to exercise it now

`/securities/NVDA` → `/securities/AMD` → back is a real navigation that produces
the cached paint: the third view renders `loaded` in its first commit while a
request is still in flight. That is the sequence to design the label against, and
it is cheaper than anything the brief suggests — no throttling, no interception,
two clicks in a browser.

---

## Amended 2026-09-10 by Task 2.10.7's CI run — the browser suite has a universe and no bars

Before writing browser specs for this task's states, know what CI's store
actually contains: **518 securities and zero bars.** `verify.yml` runs
`pnpm migrate` and `pnpm universe` and deliberately never `pnpm backfill`,
because a backfill is metered and the gate has no credentials on purpose.

So on CI, every window is `empty` — a correct 200 — and locally and on the
deployed store the same window is `partial`. **A spec that asserts on bars
passes locally and fails the gate**, which is exactly what happened to three of
Task 2.10.7's four new tests. `e2e/specs/security-series.spec.ts` carries the
shape that fixes it: wait for _an answer_, then branch on which arrived.

Two consequences for this task specifically, and the second is the useful one.

**`partial` and `loaded` cannot be produced in the CI gate at all**, so their
browser coverage is a developer's machine and `pnpm e2e:deployed`. Do not spend
effort trying to make the gate assert them; do make sure the deployed check
does.

**`empty` is the one state CI produces for free**, on every route, without any
interception — which makes it the cheapest browser assertion in this whole
story and the one most worth making load-bearing. If the empty state's copy is
wrong, the gate can catch it.

---

# What was done — 2026-09-10

**Status: complete.** `pnpm verify` and `pnpm e2e` both pass (42 browser tests,
385 frontend tests). The design brief's six deliverables are answered below, in
its own order, followed by the causes table, the copy matrix, and a
non-technical status report.

## D1 — The stale mark

### Where the flag lives, and the two homes that were rejected

**A `stale: boolean` on the three answer members** of `BarSeriesView`. The
argument is in `bar-series-view.ts` beside it and in `FRONTEND-STATE.md` §2's
amendment, which is where Story 2.13 and Epic 3 will read it.

- **Not a seventh union member.** Every consumer's `switch` would carry it
  forever, and each would have to re-derive which answer it is stale _of_ — the
  member would have to carry the whole answer to be renderable, which is the
  answer members with a boolean, spelled longer.
- **Not a field on `BarSeriesSource`.** That cost was priced in the amendment
  above and it turned out to be the deciding one: `barSeriesFixtureView` returns
  a `BarSeriesView`, so a story could not express the state without hand-building
  it — which is the thing the fixture set exists to stop.
- **A flag and not a state** is `FRONTEND-STATE.md` §4's `retrying` precedent,
  and the test it states is whether a consumer renders something structurally
  different. A stale answer renders the same panel with a line above it.

**It is set in exactly one place**: `use-bar-series.ts`'s `held(key)`, through
which both cache reads pass. `barSeriesCache.write` normalises it back off, so
an entry never remembers that it was once painted from the cache. That is what
makes the mark mean what it claims — §2's _every read is accompanied by a
request_ and the mark are one expression rather than two that can drift.

### What is on screen

A rail above the body: a dashed `Marker`, one sentence, and a travelling dashed
hairline under it.

> Refreshing — showing the held answer while a newer one is read.

**Not one pixel of any number changes.** No dim, no blur, no fade, no skeleton
replacing a value. Every treatment that would have marked the figures themselves
is R3 broken by another route, and the brief said so first.

**Colour carries none of it.** The dashed marker and the dashed rule are the
encoding and both survive `grayscale(1)` unchanged, which matters more here than
usual: the only colours nearby are the feed amber and the negative-price red, and
either would say _something is wrong_ about an answer that is correct.

**Motion, in tokens only.** The rail's dash travel is
`calc(var(--motion-duration-settle) * 5)` linear infinite — the same multiple the
two skeletons use, so every "we are working" texture on this page breathes at one
rate rather than three. The settle wash is `var(--motion-duration-settle)` with
`var(--motion-ease-standard)`. Both resolve to `0ms` under
`prefers-reduced-motion` at the token layer, so **there is no media query in this
component** and what is left under the preference is a static dashed rule that
still marks the state.

### The transition out, including the case where nothing changed

The settle wash plays **only when a figure actually moved**, and the mechanism is
a `key` rather than a comparison:

```
<div className={styles.settle} key={settleSignature(series, prices)}>
```

The signature is the close, the bar count and `covered.end` — the three facts a
reader would notice moving, and deliberately not the provenance's retrieval
timestamp, which changes on every request and would flash the panel on precisely
the refetch this is designed to leave alone. React remounts a keyed element when
its key changes and leaves it alone when it does not, so there is no
previous-value ref, no effect, and no second copy of _what counts as the answer_
that could drift from the one on screen.

A refetch landing on an identical answer therefore passes in complete visual
silence. That is the design's own reversal-trigger protocol, and it is right: a
flash over numbers that did not move is a claim about the numbers.

### The route that produces it, which was a finding

The brief's two-click route — `/securities/NVDA` → `/securities/AMD` → back —
**does not work in a browser and cannot**, because each of those is a document
navigation and a document navigation reloads the bundle and takes the
module-level cache with it. Nothing in the interface links one security to
another yet; Story 2.11's search and click-through is what will.

What does work, and is a real user's route: **leave the route by the header's
primary navigation and come back.** That is client-side, it unmounts and remounts
the panel inside one document, and the bare `/securities` asks for
`DEFAULT_SYMBOL` — so the second mount reads the entry the first visit stored.
`e2e/specs/security-series-states.spec.ts` drives exactly that.

## D2 — `untracked`

**The copy is confirmed and the placement changed.** The sentence reads as it
did; what moved is where it sits.

> **AMD** `Untracked`
> MarketPulse no longer tracks this security. These bars are what was stored
> while it did.

A neutral `Badge` beside the ticker on the subject header, with the sentence
under it — **not** a note at the bottom of the body. The argument is what the
fact is _about_: an untracked security is untracked whatever this answer turned
out to be, so it is still true under a partial series, an empty one, and one
being refreshed. A note under the provenance line reads as a footnote on the
numbers when it is a qualification on the subject, and it is read _after_ the
figures rather than before them.

Neutral tone because it is **not a warning**: the bars are real, the series is
correct, and what changed is the universe. `BADGE_TONES` has no warning tone by
design, which is the language agreeing with the judgement rather than
constraining it.

**How the three marks compose**, since all can be true at once: the badge is on
the header and stays; the stale rail is above the body and goes when the answer
settles; the coverage line is inside the body and belongs to this answer. None of
the three can take another's position, which is why they can be read together.

**It has a recorded fixture now.** `apps/frontend/src/fixtures/bar-series/untracked.json`
is the eleventh recorded body — a **populated** 200 for AMD, produced by setting
`status='untracked'` on the real row, curling the real endpoint, and restoring the
row in the same command. The full procedure, including the restore and why it is
not optional, is in `fixtures/bar-series.ts`'s header.

## D3 — Two live regions on one page

**Two regions, one per subject, and every sentence names its own subject.**

The reason, because the next asynchronous surface inherits it: naming the subject
is what makes the queue order stop mattering. _"NVDA: holding 1,438 bars…"_ and
_"The tracked universe loaded. 518 securities…"_ are each complete out of
context, in either order, and a screen reader is free to queue them however it
likes.

Two alternatives were rejected:

- **One region for the page** would make one component the owner of another's
  sentences, and the two states are produced by two independent hooks with no
  moment at which both are settled.
- **The design's two regions inside this panel** (a lifecycle one and a data one)
  reintroduces the page-level problem one level down: two polite regions about
  _one_ subject queue against each other in an order neither controls, and a
  listener hearing _"NVDA: refreshing"_ after _"NVDA: 1,438 bars"_ cannot tell
  which is current. The lifecycle fact is a **clause** on the subject's own
  sentence instead, never a second voice.

It is `role="status"` and never `role="alert"`, persistent, rendered in every
state, never unmounted, and silent on arrival — all four of `UniverseTable`'s
clauses, none of them re-derived.

**Two live claims went false the moment this landed and were corrected in the
same change**, which is the obligation `CLAUDE.md` records as routinely missed:
`FeedProvenance.tsx` and `MarketClock.tsx` both said this application had one
live region. `styles/a11y.module.css`'s call-site count was a third, and
`e2e/specs/securities-route.spec.ts`'s unscoped `getByRole("status")` was the
instrument that would have gone red — it is now scoped to the table's region,
and the scope is the assertion rather than a workaround.

## D4 — Announcement copy

The matrix is below. Three decisions in it are worth stating separately.

**A re-entered state is announced, and the stale clause is what does it.** A live
region whose text does not change announces nothing, so a refetch landing back on
the answer it started from would be silent — and that is the _common_ case for a
closed session's bars. The sequence is `answer` → `answer` + _"Showing a held
answer while a newer one is read."_ → `answer`: the region passes through a
different text and back out of it, so the return is heard even when every number
is identical. Nothing was invented for the mechanism; the clause is true, it is
the same fact the rail carries, and it happens to be the in-between sentence the
region needs.

**This is a deliberate departure from the design's _"settled unchanged →
silent"_, and only for the spoken channel.** The visible flash _is_ suppressed,
because a flash on unmoved numbers is a claim about the numbers. A listener has
no flash: silence would leave them unable to tell _nothing changed_ from _nothing
happened_, and both transitions here follow something the user did.

**The correlation id is not spoken**, which is the second departure — the design
says _"always announces correlation ID"_. It is a 36-character UUID: read aloud
it is thirty seconds of hex a listener cannot hold or transcribe, and it is the
same judgement `UniverseTable` made about a magnitude (`47.7M` spoken is worse
than not said). The announcement says a reference exists and where; the id itself
is on screen, selectable, and that is where it is useful.

**A note on rate, which Story 2.11 inherits.** Nothing today changes this text
without a user having navigated or pressed something. A search field that
re-requested on every keystroke would drive this region at typing speed, which is
actively hostile — whatever ships there owes either a debounce upstream of the
request or a decision to leave the region silent while a query is being typed.

## D5 — Everyday copy

**Confirmed rather than changed, and that is the finding.** `empty` and `partial`
are what this panel renders in normal use, their copy was argued into shape by
Task 2.10.7 against the same constraints, and churning it would have been change
without an improvement. What this task added is the **instrument**: the `empty`
state's copy is now load-bearing in the CI browser gate, which is the one state
that gate produces for free on every route.

`e2e/specs/security-series-states.spec.ts` asserts not that the words appear but
that they do the job: the window that was asked for, in market time with the zone
named, and the reason nothing is in it. And that it carries **no control and no
correlation id**, because it is an answer.

R4 held throughout: **no copy carries a figure.** Every number in every sentence
above — 30, 60, 1,438, 10,000 — comes from the response.

## D6 — What was handed back

- **Annotated states**: `BarSeriesPanel.stories.tsx`'s `AllPermutations` grid,
  now thirteen wide — the six members, the stitched variant, the retrying
  control, the defaulted symbol, and the two this task added, **Stale** and
  **Untracked**. Every one built from a recorded body through the real
  transition; no state in it is hand-constructed.
- **The copy matrix**: below.
- **The motion note**: D1 above, in token terms only.
- **New shared components**: none. The retry control's extraction was already
  superseded by the 2026 refresh's `Button`, the badge is the existing `Badge`,
  and the stale rail is one paragraph in this panel's own stylesheet. Nothing
  new landed under `src/components/`, so nothing new owes stories.

---

## Every state, from a named cause, seen on screen

| State                        | Named cause                                                                  | Seen in                                                   |
| ---------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| `loading`                    | `neverAnswers`, or a delayed `route.continue()`                              | Story; browser (live-region spec)                         |
| `loaded`                     | A window entirely inside what the store holds                                | Story (`full`); browser, on a backfilled store            |
| `partial`                    | The default `sessions=5` against a nightly-backfilled store                  | Story; browser, on a backfilled store                     |
| `empty`                      | **The ordinary default on CI** — 518 securities and zero bars, every window  | Story; browser gate, load-bearing                         |
| `refused` — cap              | A year of minute bars; the 400 names the count against 10,000                | Story                                                     |
| `refused` — calendar         | A window outside 2024–2028                                                   | Story                                                     |
| `refused` — unknown security | `/securities/ZZZZ` against the **real backend**, no interception             | Story; browser (`security-series.spec.ts`)                |
| `failed` — retryable         | `DATABASE_PORT=59999 node dist/index.js`; a real 503, `SERVICE_UNAVAILABLE`  | Story; browser, and the retry recovers the page           |
| `failed` — unreachable       | Stop the backend (`route.abort()` in the browser)                            | Browser                                                   |
| `failed` — incoherent        | A source's `barCount` off by one, so sources do not sum to bars              | Story; browser, over the **real** body                    |
| `failed` — unknown feed      | A `feed` slug this bundle does not know; refused by the guard, not the parse | Story                                                     |
| **`stale`**                  | Leave `/securities` by the header nav and come back — a client-side remount  | Story; browser                                            |
| **`untracked`**              | `update securities set status='untracked'`, curl, restore                    | Story; browser, over the real body with one field changed |

Two rows are the ones this task added, and one correction to the brief: `empty`
does **not** need a symbol with nothing stored. Every security in the store has a
ledger row for both timeframes, and what produces `empty` is the ordinary
default — which is also why its copy is the most-read text on this surface.

## The copy matrix

`{ }` marks a value from the response. No sentence carries a figure of its own.

| State                | On screen                                                                                                                                                                                 | Announced                                                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `loading`            | _Reading the series…_ + four ragged skeleton bars (`aria-hidden`)                                                                                                                         | **Nothing.** Arriving at a page is not a change                                                                                           |
| `loaded`             | _Holding all {n} bars of the window asked for._                                                                                                                                           | _{SYM}: holding all {n} bars of the window asked for. Last close {close}, up {pct}._                                                      |
| `partial`            | _Holding {n} bars, through {covered.end} — less than the window asked for, which runs to {requested.end}._                                                                                | _{SYM}: holding {n} bars, through {covered.end}, of a window running to {requested.end}. Last close {close}, down {pct}._                 |
| `empty`              | _No bars stored for this window._ / _We asked for {requested} and hold nothing in it. A window reaching into the current session is usually this: stored history is caught up overnight._ | _{SYM}: no bars are stored for the window asked for, {requested}._                                                                        |
| `refused`            | _That request could not be answered._ / **{message}, verbatim**                                                                                                                           | _{SYM}: that request could not be answered. {message}_                                                                                    |
| `failed` unreachable | _No response from the service._ / _This is usually temporary. Try again in a moment._ + **Try again**                                                                                     | _{SYM}: no response from the service. This is usually temporary. Try again in a moment._                                                  |
| `failed` retryable   | _The series could not be read._ / _This is usually temporary. Try again in a moment._ + **Try again** + _Reference {id}_                                                                  | _{SYM}: the series could not be read. This is usually temporary. Try again in a moment. A reference for this failure is shown beside it._ |
| `failed` permanent   | _The series could not be read._ / _Asking again will not change this answer._ — no control                                                                                                | _{SYM}: the series could not be read. Asking again will not change this answer._                                                          |
| `retrying`           | The failure's own sentence stays; the control reads _Trying again…_ and is disabled                                                                                                       | _{SYM}: trying {SYM} again._                                                                                                              |
| **`stale`**          | A rail above the body: dashed marker + _Refreshing — showing the held answer while a newer one is read._ Numbers untouched                                                                | The answer's own sentence **plus** _Showing a held answer while a newer one is read._                                                     |
| **`untracked`**      | `Untracked` badge beside the ticker + _MarketPulse no longer tracks this security. These bars are what was stored while it did._                                                          | The answer's own sentence **plus** _MarketPulse no longer tracks this security; these bars are what was stored while it did._             |
| **settle**           | A 240ms background wash over the figures, **only if a figure moved**                                                                                                                      | (the answer's sentence, which changed)                                                                                                    |

## Where the coverage sits

| Level                                | What it can see here                                                                                            |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `series-announcement.test.ts` (11)   | **The sentences.** The only level that reads the copy: subjects, the id that is not spoken, the re-entrant case |
| `BarSeriesPanel.test.tsx` (52)       | The marks, the region's existence and **node identity** across a change, the region in every state              |
| `use-bar-series.test.ts` (13)        | That a cached paint is marked and a settled one is not, and that the cache does not remember the mark           |
| `series-cache.test.ts`               | That `write` normalises the flag off                                                                            |
| `fixtures/bar-series.test.ts` (14)   | That the eleventh body is a **populated** untracked answer, and that no recorded answer arrives stale           |
| `security-series-states.spec.ts` (7) | Every failure, both marks, and the live region — in a real browser, from named causes                           |

**What none of them can see is colour**, structurally: no stylesheet is applied
in the test environment. The stale rail's dashes, the settle wash and the badge's
contrast were reviewed in Chrome against the workshop's grid, which is the only
instrument that can.

## Findings recorded for whoever comes next

1. **A document navigation cannot produce a cached paint.** `page.goto` reloads
   the bundle and takes the module-level cache with it. Any future test of this
   behaviour has to move within one document, and until Story 2.11 the only such
   route is the header's primary navigation.
2. **A second live region on a page breaks an unscoped `getByRole("status")`,
   loudly and correctly.** The fix is a scope, and the scope is the assertion.
   The same thing happened one level down in jsdom: text queries that did not say
   which channel they meant resolved to two elements, which is why
   `BarSeriesPanel.test.tsx` now has a `VISIBLE` option and `e2e/support/app.ts`
   a `readable()` helper.
3. **`untracked` is a field on three members, not a member**, which is why a
   states checklist walked past it for a whole task. Anything else in this shape
   — a field carried by several members that changes what is rendered — is
   invisible to _"every state produced"_ and needs naming separately.
4. **A settle flash wants a `key`, not a diff.** React already answers _did this
   change_ for anything expressible as a value, and the version with a
   previous-value ref is longer, has a second copy of "what counts as the
   answer", and gets `StrictMode` wrong.

---

# For the stakeholders — what this actually delivered

## The short version

The market-data panel now tells the truth in every situation it can be in,
including the three it was previously silent about. It says when the numbers on
screen are a moment out of date while fresher ones are on their way; it says when
a company has dropped out of the list we follow; and it now speaks to people
using a screen reader, which it did not do at all before today.

None of this adds a feature you can point at in a demo. All of it is the
difference between a demo and a product.

## The three gaps, in plain terms

**One: the panel could be showing you yesterday's answer and not say so.**

When you look at a security you have looked at before, the application shows you
what it already has _immediately_ rather than making you watch a loading spinner
while it asks again. That is deliberate and it is good — but until today there
was no way to tell that answer apart from a brand-new one. An analyst could be
reading a price with a fresher one arriving a second later and have no idea.

Now a line appears above the figures — _"Refreshing — showing the held answer
while a newer one is read"_ — with a small dashed rule underneath it that
travels, so the screen visibly looks _busy_ rather than frozen. When the new
answer lands the line disappears, and the figures take a quarter-second flush of
background colour **only if something actually changed**. If the new answer is
identical to the old one, nothing flashes at all, because a flash over numbers
that did not move would be telling you something untrue.

The rule we held ourselves to throughout: **nothing touches the numbers.** No
greying out, no fading, no blurring, no replacing a price with a placeholder. A
figure that goes dim while you are reading it is worse than one that changes
instantly. The mark sits beside the data, never on it.

**Two: there was a screen in the product nobody had ever seen.**

The system distinguishes companies it actively follows from ones it has stopped
following but still holds history for. The panel has had a note for that second
case since last week — and nothing had ever _produced_ it. No test, no example,
no way to look at it. It was code that had never run.

It runs now. We produced it honestly: we marked a real company as no-longer-
followed in the real database, recorded what the real server answered, and put
the row back the way it was. That recording is now permanently part of the test
material, so the case can never go unseen again.

We also moved where it appears. It used to sit at the bottom, under the numbers,
where it read like a footnote about the prices. It now sits next to the ticker at
the top as a small label, because it is a fact about _the company_, not about
this particular set of prices — and because it should be read before the figures
rather than after them.

**Three: the panel said nothing to anyone using a screen reader.**

This was left deliberately unbuilt, because the question it raises is bigger than
one panel: what should a page say out loud when its content changes more than
once, and what happens when _two_ different parts of the page want to speak at
the same moment?

That page now has two things that fill in from the network — the panel and the
list of tracked companies underneath it — and they can finish at the same
instant, in an order nobody controls. Our answer: **each one speaks for itself,
and each names what it is talking about.** So a listener hears _"NVDA: holding
1,438 bars…"_ and _"The tracked universe loaded. 518 securities…"_ and it does
not matter which arrives first, because neither sentence is ambiguous on its own.

Two smaller judgements inside that, both of which we made against the design
brief and both of which we have written down with reasons:

- **We do not read the error reference number aloud.** It is a 36-character code.
  Spoken, it is half a minute of letters and digits nobody can hold in their head
  or write down. We say that a reference exists and where it is; the code itself
  stays on screen where it can be copied.
- **We do announce a refresh that changes nothing.** There is a quirk in how
  screen readers work: if the text does not change, nothing is said. So pressing
  "try again" and getting the same failure twice used to be completely silent —
  the second failure simply never happened, as far as a listener was concerned.
  Our refresh sentence solves this almost by accident: the wording passes through
  a different state and back, so the return is always heard.

## Why this was worth a task of its own

Because every one of these is invisible until it costs somebody something.

An analyst reading a stale price is not looking at a bug — they are looking at a
number that is correct and out of date, and there is nothing on the screen to
tell them which. A rendering nobody has ever seen is not a rendering that works;
it is a rendering nobody has checked. And an interface that says nothing to a
screen reader is not neutral, it is unusable.

The product principle behind all three is the one in the specification: **failures
and partial answers are normal product states, not exceptions.** A panel that
only looks good when everything is perfect is a demo. This one now looks
deliberate when the store is behind, when the service is down, when the request
was impossible, when the company is no longer followed, and when a fresher answer
is on its way.

## What a user can see today

The same five screens, and on the Security Explorer:

- a real security's real minute bars, stated as facts — the close, the move, the
  four prices, the window we asked for against the window we hold, and which
  market feed the data came from;
- a clear mark when those figures are being refreshed, and a quiet settle when
  the new ones land;
- a clear mark when the company is one we no longer follow;
- an honest sentence for every way this can go wrong, with a "try again" button
  **only** where trying again could actually help;
- and a spoken description of all of it for anyone not looking at the screen.

## What a user still cannot do

- **See a chart.** There is still no line, no candle and no axis, and that is
  deliberate — Story 2.12 owns that decision, and a small chart added here would
  be that decision taken by accident by whoever needed one first.
- **Change the time window.** Story 2.13 owns that, along with the calendar rules
  that go with it.
- **Search for a security, or click one in the list to open it.** Story 2.11.
  Today you reach a security by typing its address, which is also why the stale
  mark needed a slightly indirect route to demonstrate.
- **See live prices.** The market feed arrives in Epic 3.

## Where this leaves the story

Story 2.10 has one task left, 2.10.9: verify the whole layer, write its record
into the repository's index, and take the architecture decision record. Then
Stories 2.11 to 2.14 turn this panel into something you navigate to rather than
type your way to, and finally draw the picture.

The decisions this task took are the ones the next three stories inherit rather
than re-argue — how a refresh is marked, what a page with several speaking
surfaces does, and what a screen says when it is asked the same question twice.
Each of them is written down with the condition that would reverse it, so nobody
has to guess later whether it was a decision or an accident.
