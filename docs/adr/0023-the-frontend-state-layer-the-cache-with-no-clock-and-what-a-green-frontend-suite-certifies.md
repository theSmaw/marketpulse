# ADR 0023 — The frontend state layer: a cache with no clock, and what a green frontend suite certifies

**Status:** Accepted
**Date:** 2026-09-10
**Delivered by:** Epic 2, Story 2.10 (Tasks 2.10.1–2.10.9)

## Context

ADR 0021 put a bar series on the wire. This story is the client half: how this
frontend holds domain state, how it fetches, what it keeps, what it cancels, and
what it says while it is doing any of that.

PRODUCT_SPEC.md §25 names **Redux** for domain state and immediately adds "avoid
introducing heavyweight global state libraries until application complexity
demonstrates the need". Those two sentences are in tension by design, and this
epic is the first place there is any domain state at all — so this is where the
judgement is exercised rather than quoted.

**The decision worth recording is not "we added a hook."** Seven things here are
inherited by Stories 2.11 to 2.14 and by four later epics, and each is a choice a
later reader would otherwise re-take differently:

1. **whether this application has a store**, which Epic 11's generative workspace
   and Epic 12's persistence both build on;
2. **what a server cache is allowed to be**, given that the server already
   answered half the question in a layer no JavaScript here can see;
3. **where the selected symbol and window live**, which is a product feature
   before it is an architecture;
4. **what "retryable" means**, which is now spelled twice on one page and must
   not come to mean two things;
5. **what a state union is for**, and the member a static list could not teach —
   _loaded and partial_, which is not _failed_;
6. **what the screen does while an answer is being replaced**, which Story 2.13's
   window control and Epic 3's live feed both inherit;
7. **what an asynchronously-filled surface says out loud**, on a page that now
   has more than one of them.

The working record is
[`FRONTEND-STATE.md`](../../planning/epic-02-security-universe-historical-data/story-10-frontend-market-data-layer/FRONTEND-STATE.md),
which carries every alternative, every measurement and every reversal trigger.
This document carries the decisions.

**Read that document's amendments as a sequence rather than as noise.** §2 was
written with an entry count and a resolved-window key, and both were reversed by
measurement rather than by argument. Flattening them into a single current
statement would destroy the finding that a bound counted in entries bounds
entries and not memory.

## Decisions

### 1. There is NO store, and that is a decision with a trigger rather than a deferral

Today's domain state is a selected symbol, a time window, and some cached series.
The URL holds the first two and a bounded cache holds the third; nothing else in
the application shares state with anything else.

**Redux was declined now and is not declined forever.** §25 names it, and the two
things that will actually demand it are Epic 11's typed workspace commands — much
easier against an explicit state tree with a command log — and Epic 12's
persistence. What makes deferring it cheap is the shape rule this story held
instead: **state lives in a module as a plain, serialisable, discriminated union,
and the transition is a pure function separate from the hook.** A
`(state, event) => state` is a reducer that has not been told it is one, which is
what makes a later move to a store a re-wiring rather than a rewrite.

The reversal trigger is a condition, not a story number: **the first piece of
state two features must agree about that neither owns** — a selection Epic 6's
topology and Epic 8's workspace both read, or the first `WorkspaceCommand` that
has to be applied, recorded and undone.

### 2. The server cache is HAND-ROLLED, bounded twice, and has no clock

`@tanstack/react-query` was built before it was rejected, which is this
repository's habit. What decided it was measuring what was actually left to win.

**Every one of these responses is already cached by the browser.** Story 2.9 gave
both endpoints an `ETag` and a `Cache-Control`; a repeat request is revalidated
into a `304` with an empty body, measured at 1,060,490 B → 0 for a month of
minute bars. That saving happened in a layer no JavaScript here can see, before
this cache existed. Anyone re-arguing this in bytes on the wire is arguing about
bytes Task 2.9.8 already saved.

What is genuinely left is that the browser caches **bodies** and this application
needs a **parsed, typed series** — and parsing one is not free: 4.6–8.7 ms of
main thread for a cap-sized series. So the cache holds parsed series, and three
rules keep it from becoming a second source of truth:

- **Every read is accompanied by a request.** The entry paints sooner; it is
  never consulted to decide that no request is needed. Freshness therefore stays
  entirely with the browser and the server's five-minute ceiling.
- **Eviction is by count, never by clock.** There is no `Date` in that file and
  there must not be one. A cache with no lifetime cannot have a lifetime that
  disagrees with the server's — which is what would silently defeat ADR 0021's
  ceiling.
- **The key is the request as sent**, the same string the URL carries and every
  HTTP cache between here and the server already keys on.

**It is bounded twice, and that shape came from a measurement rather than a
guess.** A series varies **25×** in size — 97.8 kB for one session, 2.43 MB at
the cap — so the working number of 24 entries would have bounded entries and not
memory: 11.4 MB in the common case and **58 MB** in the case a window control can
produce. So: 50,000 bars (~12 MB) **and** 32 entries, the second being the guard
for the degenerate case a bar budget cannot see, since an empty series is a
correct answer weighing zero bars.

### 3. The selected symbol and window live in the URL

Deep-linking already worked, a shared link to a security is a real product
feature, and Epic 11 wants the workspace describable. The symbol is a **path
segment** (`/securities/:symbol`); the window is a query parameter when Story
2.13 adds one.

**The address bar is never rewritten into a different window form.** A user who
picked "the last five sessions" shared a link that means five sessions, and
resolving it to an absolute range behind their back changes what their link says
tomorrow. That is a rule about the **address**, and it deliberately says nothing
about what is sent behind it — a distinction Task 2.10.5 had to make explicitly
when it declined to re-ask for a resolved window.

### 4. "Retryable" is a DERIVED FLAG on the failure members, never a state per error code

The API's `code` is the closed union a client is meant to branch on;
`isRetryableApiErrorCode` in `packages/shared` is the single derivation, and both
pages read it. `SERVICE_UNAVAILABLE` is the only code that says yes.

Two prohibitions carry the weight. **Never branch on the status number** — the
contract put the answer in a value. And **never add a state per
`API_ERROR_CODES` member**: the union grows for the server's reasons, and a page
that mirrors it changes every time the API learns a new failure.

Two shapes fell out of it that are worth naming because they look like
inconsistencies and are not. `retrying` is a **flag rather than a state**,
because a retry in flight must keep the failure's own sentence on screen —
returning to `loading` reads as the thing breaking twice. And `refused` sits
**outside the flag entirely**: it is a well-formed answer about the request, so
waiting never helps, and a control there is a lie the reader pays for twice.

### 5. The union has a PARTIAL member, and the impossible combinations are compile errors

`BarSeriesView` is six members. Three are **answers** — `loaded`, `partial`,
`empty`, all 200s — one is a **refusal**, and two describe the two things that
can go wrong: nothing arrived, or what arrived could not be used.

**`partial` is the member Story 2.4's static list could not have taught anyone**,
and it is the normal case rather than the exceptional one: the store is
backfilled nightly and the free plan withholds the most recent ~15 minutes, so a
window reaching towards now is routinely covered up to a point and no further. A
union with no member for it forces every consumer to choose between calling that
a failure and rendering it as complete. Both are wrong and the second is wrong
invisibly.

**A `loaded` with no data is a compile error, and it is a nested one.**
`PopulatedBarSeries` narrows `bars` to a non-empty tuple and `covered` to
non-null _inside_ `series`, so assigning a plain `BarSeries` fails two levels in.
An envelope-level guard would have demonstrated nothing about what is inside the
envelope.

And the rule that keeps this honest at the edges: **a component receives the
union whole** rather than spread into props. Spreading a union back into booleans
hands the renderer the impossible space the union just removed.

### 6. A held answer STAYS ON SCREEN, marked, and the mark never touches a number

A cached series paints in the first commit while the fresh answer is in flight,
rather than the panel emptying and refilling. Because every read is accompanied
by a request, that can last only the duration of one request.

**The label is a `stale` boolean on the three answer members** — not a seventh
union member, which every consumer's `switch` would carry forever, and not a
field beside the actions, which the fixture helpers could not express. It is set
at the cache read and nowhere else, and normalised back off when an entry is
written, so _every read is accompanied by a request_ and the mark on screen are
one expression rather than two that can drift.

**What it does on screen is constrained by a rule this repository already had:
motion must never make a number harder to read.** So the mark is a rail _above_
the figures — a dashed marker, a sentence, a travelling dashed hairline — and no
dim, no blur, no fade, no skeleton replacing a value. Every treatment that marks
the figures themselves is that rule broken by another route. The encoding is
dashes rather than colour, so it survives greyscale; the durations are tokens
that resolve to `0ms` under `prefers-reduced-motion`, so the component contains
no media query.

**And the settle is conditional**: when the fresh answer lands the figures take a
240 ms background wash **only if a figure moved**, implemented as a `key` rather
than a comparison. A refetch landing on an identical answer — the common case for
a closed session's bars — passes in silence, because a flash over numbers that
did not move is a claim about the numbers.

### 7. A live region belongs to a SUBJECT, and its sentences name it

`/securities` fills two things over the network, and both speak. Two polite
regions updated in the same moment are queued in an order neither component
controls, so **each region belongs to one subject and every sentence names it**.
That is what makes the order stop mattering: two self-describing sentences are
complete in either order.

One region for the page was rejected — it makes one component the owner of
another's sentences, and the two states come from independent hooks with no
moment at which both are settled. Two regions for **one** subject was rejected
for the same reason the page-level problem exists, one level down.

Four mechanical clauses are inherited from ADR 0012's era and none was
re-derived: persistent, rendered in every state, never unmounted, silent on
arrival. To them this story adds the one a page that fills _once_ could not
raise: **a live region whose text does not change announces nothing**, so any two
consecutive states producing the same sentence are inaudible — and the case that
matters is a retry or a refetch landing back where it started. The repair is a
distinct in-between text the region passes through and back out of.

Two judgements inside the copy are recorded because they were departures from the
design brief: **a correlation id is never spoken** — 36 characters of hex a
listener cannot hold or transcribe, the same judgement made about a magnitude one
screen earlier — and **a re-entered state is announced**, because silence leaves
a listener unable to tell _nothing changed_ from _nothing happened_.

## What a green frontend suite certifies here, and what it does not

### What it certifies

- **That `api-client.ts` is the only file calling `fetch`** — by grep, and the
  grep was verified by producing the break: a second `fetch` takes the count to
  two.
- **That a `loaded` with no data cannot be constructed**, two levels inside the
  envelope, demonstrated by producing the error rather than describing it.
- **That a superseded answer is never rendered**, by request identity rather than
  by aborting alone — an answer that had already resolved cannot be un-resolved.
- **That the layer runs with no server, no database and no network** — 385 tests
  in 5.6 s over eleven recorded bodies.
- **That a recorded body still matches its own label**, because the fixture module
  holds every entry to its declared outcome as it loads and **throws** at import.
  Verified by mislabelling one: the file fails with `no tests` rather than
  skipping.

### What it does NOT certify

- **Not colour, and not by discipline — structurally.** No stylesheet is applied
  in the test environment, so `getTokens()` throws there. A browser is the only
  instrument that can see the stale rail's contrast, the settle wash, or the
  amber that was once measured at 1.92:1 on a word.
- **Not that a screen reader announces well.** The suites assert that a region
  exists, is the same DOM node across a change, and carries a sentence naming its
  subject. Whether the sentence is a _good_ one was judged by a person.
- **Not "no state update after an unmount".** jsdom cannot observe it: React does
  not re-render an unmounted component, so the assertion is green against a hook
  with **no guard at all**. What is asserted instead is the `AbortSignal` and an
  empty cache, and the rest is the browser's.
- **Not client-side supersession between two securities.** Nothing in the
  interface links one security to another until Story 2.11, so the only route is
  a document navigation — which reloads the bundle and exercises no client-side
  transition. That property stays at the jsdom level, by identity, and says so.

  > **Amended 2026-09-11 by Task 2.11.5.** The premise is no longer true and the
  > conclusion is now only half true. Search navigates with `useNavigate()` and a
  > row of the tracked universe is a React Router `Link`, so two securities are
  > linked and the transition is client-side; `e2e/specs/security-navigation.spec.ts`
  > asserts it in a browser, including that the return to a security paints its
  > held series **before** the network answers and asks again anyway, and that no
  > frame shows one symbol's bars under another's name. What stays at the jsdom
  > level is narrower and was measured rather than assumed: the browser suite is
  > **green with the identity guard removed**, because the effect teardown's abort
  > alone supersedes a navigation that fast. The guard exists for an answer that
  > had already _resolved_ when the abort landed, and that order cannot be timed
  > deterministically from outside the page.

- **Not that the prices are right.** Every assertion is about rendering what the
  API returned, over a corpus this repository recorded.

## Consequences

- **Epic 3's live feed attaches to `covered.end`**, which is why this layer does
  not poll: a socket resumes from the last bar held rather than a timer
  re-downloading a window to discover four new bars. The refetch policy is
  deliberately a third thing — mount, key change and retry — and neither of the
  two hooks that existed before it.
- **Epic 11 inherits describable state.** No class instances, no closures, no
  `Map`s on the union, and actions beside the state rather than hung off it —
  which is what lets a `WorkspaceCommand` act on it and Epic 12 persist it.
- **Story 2.13 inherits the stale rule and Story 2.11 inherits a rate note.**
  Nothing today changes a live region's text without a user having acted; a
  search field re-requesting on every keystroke would drive one at typing speed.
- **A deploy-ordering hazard is now stated and unchecked.** `isBarSeriesResponse`
  refuses a `feed`, `provider`, `adjustment`, `timeframe` or `securityStatus` it
  has not been taught, and the argument for that strictness rests on both halves
  shipping from one commit. `deploy.yml` rolls the **backend first**, so the first
  addition to one of those unions opens a window in which the deployed frontend
  refuses every series. It degrades safely and loudly, and the repair is a deploy
  ordering change rather than a looser guard — loosening it is the caption problem
  invariant 6 exists to prevent.
- **No library was adopted at either decision**, and the second one's deciding
  fact is a property of this workspace rather than of the library: MSW runs a
  `postinstall`, so adopting it means a permanent entry in the `allowBuilds`
  allowlist that exists to keep install scripts out. That is a supply-chain cost
  paying for a routing capability this layer does not use.
- **The React Compiler's 17 rules still have not fired**, including on a `useRef`
  written from an async callback and a `setState` called during render — the two
  most likely provocations this story had. That remains evidence that nothing has
  written the shape they dislike, not evidence the tree satisfies them.

## Related

- [ADR 0012](0012-client-side-status-what-a-green-indicator-certifies.md) — the
  states-as-types precedent this generalises, and the `alert`/`status` split
- [ADR 0021](0021-the-market-data-wire-the-grain-of-provenance-and-what-a-cached-response-certifies.md)
  — the wire this layer fetches through, and the caching it must not fight
- [ADR 0022](0022-the-design-refresh-three-typefaces-an-identity-accent-and-what-a-token-change-certifies.md)
  — the design language the stale rail and the untracked badge are drawn in
- [`FRONTEND-STATE.md`](../../planning/epic-02-security-universe-historical-data/story-10-frontend-market-data-layer/FRONTEND-STATE.md)
  — the working record, with the alternatives and the reversal triggers
