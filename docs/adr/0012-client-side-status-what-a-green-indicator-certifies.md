# ADR 0012 — Client-side status: two vocabularies, three states, and what a green indicator certifies

**Status:** Accepted
**Date:** 2026-09-04
**Delivered by:** Epic 1, Story 1.12 (Tasks 1.12.1–1.12.8)

## Context

This is the story that closes Epic 1's fourth exit criterion — backend health
viewable from the frontend — and it is the first thing in this repository whose
rendering depends on a network call. Everything before it was static: ADR 0005
put four routes and a chrome on screen, ADR 0007 contained a render failure to
the box it happened in, ADR 0011 put both halves on hosts that can reach each
other. None of them made the browser _ask the server anything_ and show the
answer.

Small in scope, and it exercises the whole foundation at once: the shared
contract, the configuration boundary, CORS, the error shape, the component
workshop, and both deployments. That is the point of it — the vertical slice is
the test of the foundation rather than a feature.

Four properties of the tree shaped every decision below, and only one of them is
about health checks:

- **`/health` reads `process.uptime()` and returns.** It touches no database and
  no provider. So there is no latency distribution to set a threshold against,
  and a slow answer today is a statement about the network rather than about the
  server. §2 is downstream of this sentence.
- **The chrome already had an indicator.** ADR 0004 built `FeedIndicator` and
  ADR 0005 put it in a status strip with a hard-coded `disconnected` and a
  reserved clock. So "add backend status" had an obvious cheap answer — widen
  the existing one — and §1 and §3 are why it was not taken.
- **The frontend's configuration is substituted at build time** (ADR 0006 §6),
  so the API's address is a literal in the bundle. A wrong `VITE_API_BASE_URL`
  is not a setting to fix; it is a rebuild. That is what makes §13's state worth
  having rather than academic.
- **Nothing here had state.** ADR 0009 §"React Compiler" recorded seventeen
  rules that had never fired outside a spike, on the stated grounds that nothing
  shipped had state. This story ships the first state, the first effect and the
  first network loop, so that claim was finally testable — see
  _Consequences_.

The acceptance criteria name three words — healthy, degraded, unreachable — and
the whole of this record is the consequence of taking that seriously rather than
adding three members to an enum.

## Decisions

### 1. `BackendStatus` is a second vocabulary, not a widening of `HealthStatus`

`HEALTH_STATUSES` is the one-member union `["ok"]` — what the **server says
about itself**. `BACKEND_STATUSES` is `["healthy", "degraded", "unreachable"]` —
what **this client concludes**. They are two types in `packages/shared`, and a
test asserts the two unions share no member.

The reflex is to widen the first until it holds the three words. That is wrong
structurally rather than stylistically:

- **`unreachable` is the absence of a response.** No server can report it about
  itself; a server that could say "I am unreachable" has, by saying so,
  disproved it. It is produced by a refused socket, a name that does not
  resolve, a CORS rejection the browser makes on the client's behalf, or a
  deadline that expires — every one observed at the client and nowhere else.
- **`degraded` is a judgement, not a report.** It is what a client decides about
  an answer it _did_ get. The server did not fail; something answered.

Keeping them apart is what stops Epic 3's market-feed states — which _are_ a
genuine widening of the first — from silently arriving in the second.

It lives in `packages/shared` even though the server never produces one, and
that is the single place the "shared means both sides depend on the same fact"
test needed stating rather than applying, because ADR 0006 refused to put a
one-consumer type there. It is here because every member is **defined in terms
of the wire contract** — a statement about `HealthResponse` arriving, not
arriving, or arriving unreadable — so it and the contract have to change
together. A copy in `apps/frontend` is a copy that drifts the first time
`/health` changes. Story 1.13's browser tests are the second consumer.

### 2. `degraded` is defined structurally, and latency was rejected with a trigger

`degraded` means **an HTTP response arrived and it is not a readable health
report**. It has exactly two producible causes, and they are named in
`BACKEND_DEGRADED_CAUSES` rather than left as prose, because a third state with
no producible cause is a state nobody can exercise:

- **`not-ok-status`** — the response arrived with a non-2xx status. Something is
  answering at that address and it is not answering with health.
- **`unreadable-body`** — the response arrived 2xx and `isHealthResponse()`
  rejected the body.

**Latency was rejected**, on two grounds rather than one. It needs a second
number — a slow threshold strictly below the client's request deadline — and
nothing would keep those two ordered; invert them by accident and `degraded`
becomes unreachable code, silently. And there is nothing to set it from: this
route reads `process.uptime()` and returns, so a threshold invented now outlives
the guess that produced it, which is the same argument that keeps the anomaly
score's band boundaries out of `ANOMALY_BANDS`.

**The reversal trigger is a `/health` that does real work.** The moment it checks
a database or a market-data provider, "answered slowly" stops being a statement
about the network and becomes one about the server, and it earns a threshold
measured against a real distribution rather than chosen.

**The consequence to know before debugging one: a request that times out is
`unreachable`, not `degraded`,** because nothing arrived. The deadline is
therefore the boundary between the two states, and it is the client's to own.

### 3. Two indicators sharing one marker language, not one indicator whose meaning widened

`BackendIndicator` is a **second** component beside `FeedIndicator`, and this is
the question ADR 0004 posed and ADR 0005 put on screen.

The argument is §1's, one layer up: `FeedStatus` is a fact the backend
**reports** about the market data; `BackendStatus` is one this client
**concludes** about whether the backend answered at all. **They fail
independently**, and a live feed behind an unreachable backend is a real state
that a single indicator would have to pick between — it would have to lie about
one of them. A user needs both answers.

**What is shared is the visual language rather than the component** — a marker
shape plus a word, achromatic but for one amber — and **the cost is stated here
rather than discovered later: the two stylesheets hold that idiom by imitation,
so a change to the marker language means editing both.** That was taken over
extracting a shared primitive because the two are three-state and four-state
components whose only common ancestor would be "a dot and a word", and a shared
component that thin is a coupling rather than a saving.

The same reasoning put a **second non-market block** in `market.css`:
`--service-healthy`, `--service-degraded` and `--service-unreachable` sit beside
`--status-error`. They resolve to exactly the same two values the `--feed-*`
trio does, **and that duplication is the point** — the two indicators report
facts that fail independently, so one changing colour must not move the other.
What was settled before either of them, by the token layer and by
PRODUCT_SPEC.md §36: a degraded or unreachable backend is a **product state, not
a failure**, and is not rendered in `--status-error` red.

### 4. The fourth visual case is deliberately not a fourth state

Before the first poll settles, `status` reads `unreachable` — literally true,
nothing has arrived — and `hasChecked` is `false` beside it. The indicator
renders a **neutral placeholder**: a dashed marker and the word `checking`.

There is no fourth member of `BackendStatus` and there should not be. A fourth
status name would leak a **client-lifecycle** fact into a vocabulary defined
entirely in terms of the wire contract, and `BackendStatus` would stop being a
statement about the server.

Both alternatives were considered and both are worse than a placeholder:

- **Rendering the honest `unreachable`** flashes the client's own startup as a
  fact about the server on every single page load. It is true and it is true for
  an uninteresting reason, and a user cannot tell it from a backend that is
  actually down.
- **Rendering nothing** collapses the region and shifts the whole chrome when
  the first result lands, and — worse — an indicator that renders nothing is
  indistinguishable from an indicator that is broken.

### 5. `degradedCause` selects a sentence, and a `title` attribute was rejected

`not-ok-status` and `unreadable-body` are engineering words nobody can act on,
so neither is ever shown. But they are genuinely different diagnoses, so **each
picks its own user-facing sentence**:

| Cause             | Sentence                                                                    |
| ----------------- | --------------------------------------------------------------------------- |
| `not-ok-status`   | `The service answered with an error.`                                       |
| `unreadable-body` | `Something answered at the service's address, and it was not this service.` |
| (`unreachable`)   | `No response from the service.`                                             |
| (never answered)  | `No successful check yet.`                                                  |

A `title` attribute was the obvious home for the detail and is **rejected for
the reason ADR 0004 rejected a tooltip**: it is unreachable by keyboard and by
touch, so it is a hint for mouse users and nothing for anybody else. The
sentence is rendered.

Note the fourth row is not a cause at all — it is what a client that has never
once been answered says instead of leaving a gap, and it is exactly what a wrong
`VITE_API_BASE_URL` looks like from the user's side.

### 6. The last successful check is an absolute, hand-formatted clock time

It is a 24-hour `HH:MM:SS` formatted by hand, shown in **every state except
`healthy`**.

- **Absolute rather than relative.** "3 minutes ago" needs a second timer to
  stay true, which is a second scheduled thing in a component whose whole job is
  to render a state.
- **Hand-formatted rather than `toLocaleTimeString`.** A locale-dependent string
  changes width when a meridiem comes and goes, and **that is exactly what
  `tabular-nums` cannot fix** — the tokens' figure alignment (ADR 0004) buys
  nothing against a string that gains three characters.
- **Not shown when `healthy`,** where it would be a second copy of a fact the
  word already carries.

### 7. No request id is rendered at all, and it is structural

ADR 0007 and Task 1.12.2 settled how much of a `requestId` a user may ever see:
the whole thing, never a prefix, and only ever as a labelled reference beside a
failure the user is being asked to report.

**This indicator reports a _state_, not a failure a user is being asked to
report, so it renders no id** — and that is not a discipline, it is structural:
`BackendIndicatorProps` has four fields and none of them can carry one. It was
verified rather than asserted, with an impostor returning a 503 carrying a
well-formed `ApiError` and a real `requestId`: the indicator rendered `degraded`
and the sentence, and the id appeared nowhere.

The consequence for ADR 0007: **`ErrorFallback` is unchanged.** It still keeps a
boolean rather than the error, so it structurally cannot show one. If a
reference line ever needs to reach it, that is a **new named prop**, never a
widening of `detail`.

### 8. The interval is 30 s, a literal, and it is bounded below by the deadline

`HEALTH_POLL_INTERVAL_MS = 30_000`, and `API_TIMEOUT_MS = 5_000`.

The hard constraint first: the interval must be **strictly greater than the
deadline**. At or below it a hung request is still outstanding when the next poll
starts and the two overlap forever — the exact failure the deadline exists to
prevent, arriving from the other side.

**That ordering is checked rather than only stated**: a test in
`use-backend-health.test.ts` asserts `HEALTH_POLL_INTERVAL_MS > API_TIMEOUT_MS`.
This is ADR 0009's own rule applied — when the thing being checked is reachable
from code, a test beats an eighth `verify` step.

Above the floor, three costs decided the number, and only one of them is log
noise:

- **The shared development terminal** — 4 rendered lines a minute at 30 s
  against 24 at 5 s.
- **The deployed backend's log volume** — 2 requests a minute **per open tab**,
  against a probe-only baseline the platform already generates.
- **Billing** — the Consumption plan's idle rate has among its conditions that
  the replica receive less than 1,000 bytes per second. Platform probes are not
  billable and these polls are. Whether continuous probing breaks that condition
  is still open (see _Consequences_), and it is the reason the interval is not
  5 s just because 5 s is legal.

**It is a literal and not a `VITE_` variable**, which keeps this story's
environment-variable count at one. The deciding argument is not ADR 0008's
ports-are-literals precedent but something stronger: **this number is coupled to
another literal.** Making one of a coupled pair configurable lets an operator
invert an ordering nothing enforces at the boundary, from a file where the other
half of the pair is not visible. If it ever becomes configurable, both move
together and the test for the ordering moves with them.

Epic 3's market feed is a **socket**, not a poll, so nothing here sets a
precedent for its rate.

### 9. Scheduling is a chain of timeouts, and a hidden tab does not poll

The next poll is scheduled when the previous one **settles**, not on a clock. So
two requests can never be outstanding at once, which makes the overlap §8's floor
exists to prevent **structurally impossible as well as arithmetically avoided**.
The floor is kept anyway, so a future move back to `setInterval` cannot silently
reintroduce it.

A hidden tab does not poll, and a returning one polls **immediately** rather
than waiting out the interval, so a returning user does not read a stale state.
A tab hidden mid-flight lets that request finish and writes its result:
cancelling a request the backend has already been asked to serve buys nothing.

**State this in its sharper form, because the weaker one was recorded first and
is wrong.** It is not "the first poll happens and then silence": `poll()` is
itself guarded by the visibility check, not only the scheduler, so **a page
opened in a background tab makes no request at all** and sits on the `checking`
placeholder indefinitely. Measured deployed: 0 requests in 4.65 s at mount, and
still `checking` after twelve seconds in this task's own reading.

That is correct behaviour and it is **indistinguishable from broken wiring**,
which is a real cost paid by everything that tries to observe this loop — see
_Consequences_.

### 10. The result travels as four props from `App`, and the re-render is accepted

`App` calls `useBackendHealth()` and passes **four props** to `AppHeader` —
`backendStatus`, `backendDegradedCause`, `backendLastSuccessAt`,
`backendHasChecked` — rather than the result object whole.

**This is the decision to resist tidying.** A prop named after a hook's return
type is how a presentational component acquires a dependency on a network loop:
`BackendIndicator` has no hook, no `fetch` and no state, and it stays that way
only because what reaches it is four values rather than one object shaped like a
poll. The fifth field, `lastSuccess`, is passed nowhere, because its only
interesting member is `version`, which is `"0.0.0"` deliberately (ADR 0011 §13).

**The call site is `App` and not `AppHeader`**, because the header renders inside
its own `ErrorBoundary` (ADR 0007): a header that throws would otherwise take the
health check down at the moment it became most interesting.

**Every poll re-renders the whole tree, and that is accepted rather than
confined.** The two alternatives both cost more than they buy today: a provider
sited around the header alone would confine it and drag `test-render.tsx` in as
the place every test gets the value from, and memoising trades one decision for a
second one nothing checks. It was measured rather than assumed — see
_Measured_ — and the reversal trigger is **a second consumer, or Epic 3's
rate**.

### 11. The strip is three regions, the label names the service, and it sits before the clock

`Market feed`, `Backend service`, `Market clock`, in that order.

The micro-label names the **service** and not the connection: the states already
say "unreachable", so "Connection" would be redundant on one indicator and
ambiguous across two.

It sits **before** the clock because `.clock` is `align-items: flex-end` as the
end of the strip — a region appended after it takes that edge away.

The one new rule in the stylesheet is `max-width: 34ch` on that region, and it is
**the first length in a component stylesheet here that is neither a token nor a
grid fraction**. Recorded as a deliberate exception with its reason, so it is not
read as licence for literal lengths generally: it is a measure in the text's own
units — the same category as the region grid's `fr` fractions — because this is
the only one of the three regions that renders two sentences under its word, and
the strip is the header grid's `auto` column.

### 12. Seven transport outcomes collapse onto three states, and one maps to no state

`getHealth()` returns one of seven outcomes and **never throws in any branch**:
`ok`, `unreadable-body`, `api-error`, `http-error`, `timeout`, `unreachable`,
`aborted`. The collapse is four lines of judgement:

| Outcome                   | State                              |
| ------------------------- | ---------------------------------- |
| `ok`                      | `healthy` — records time + body    |
| `unreadable-body`         | `degraded` / `unreadable-body`     |
| `api-error`, `http-error` | `degraded` / `not-ok-status`       |
| `timeout`, `unreachable`  | `unreachable`                      |
| `aborted`                 | **no state — previous, untouched** |

Two of those are decisions rather than renames.

**`api-error` and `http-error` collapse together** because the client tells them
apart only by whether the body carried a `requestId` a user could quote — and
by §7 no id is rendered, so that distinction is deliberately invisible here. It
is kept _inside_ the client because the two are genuinely different to a caller
that wants to report one; it is not a distinction `BackendStatus` has, and one
must not be added for it. **Verified from both sides rather than argued**: a 503
carrying a well-formed `ApiError` and a 502 carrying an HTML page render
identically.

**`aborted` maps to no state at all.** A caller's teardown is not a fact about
the backend, so it returns the previous state untouched — which is the
"resolved after unmount" bug closed at the one place it can be closed. Which
signal fired is read off the composed signals rather than off a `DOMException`
name compared across realms.

**Recovery and the surviving timestamp are structural rather than remembered**:
every failing branch spreads the previous state, so a failed poll cannot clear
`lastSuccessAt`, and the next successful poll returns the state to `healthy` on
the same mounted hook with no reload.

**There is no `try`/`catch` anywhere in the loop and its absence is deliberate.**
`getHealth()` never throws, so a rejection would be a bug in the client rather
than a backend that is down — and it is also what keeps an unreachable backend
out of `ErrorBoundary` entirely, which is what makes "the rest of the interface
remains usable" a property of the design rather than something the error
boundaries happen to allow.

### 13. `unreadable-body` is defined against a host we do not control, and there is a real producer

This is the state most likely to be dismissed as theoretical, and it is not.

Until Task 1.12.6 it had only ever been produced from a host written for the
purpose. The obvious real producer, `vite preview`, **does not produce it**:
that server's SPA fallback keys on the `Accept` header, so the
`application/json` this client sends gets a 404 and the state reads as
`degraded` / `not-ok-status`.

**Azure Static Web Apps' `navigationFallback` is a URL-pattern rule and not an
`Accept` rule.** Re-measured for this record on 2026-09-04:

| Request                                      | Response     |
| -------------------------------------------- | ------------ |
| `/health`, `Accept: application/json`        | 200, 1,101 B |
| `/health`, `Accept: text/html`               | 200, 1,101 B |
| `/assets/health`, `Accept: application/json` | 404, 2,400 B |

So pointing `VITE_API_BASE_URL` at the frontend's **own origin** — the single
most likely misconfiguration, since it is the address a developer already has in
hand — renders `Something answered at the service's address, and it was not this
service.` from a host nobody here authored.

**The transferable finding is not the sighting; it is that the two hosts
disagree about the one request an API client actually sends.** "A static host
answering at the API's address" is not one behaviour but two, and which of the
two `degraded` causes you get depends on the host's fallback rule rather than on
anything this client does. Check the header before attributing a state to a host.

`not-ok-status` is **equally reachable deployed**, at `<origin>/assets`, which
is excluded from the fallback and returns a real 404. That was measured and
deliberately **not** spent a second deploy on, because both producers of that
cause had already been shown to render identically (§12) — recorded here as a
decision rather than left as an omission.

### 14. `unreachable` is one state with two latency signatures at opposite ends of the range

Worth stating beside §2's "a timeout is `unreachable`, not `degraded`", because
the consequence is not one cadence but two:

- **A CORS rejection fails at the round trip** — 270–764 ms measured deployed —
  because the response _arrives_ and the browser discards it.
- **A hung socket fails at the 5 s deadline**, and stretches the poll cycle to
  36 s, because the next poll is scheduled on settle.

So the fastest and the slowest failures this client can have both render the same
word, and an operator timing one can tell them apart with no other instrument.
Epic 3 inherits that distinction for the feed.

## Rejected, with reasons

| Rejected                                            | Why                                                                                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Widening `HealthStatus` to three members            | `unreachable` is the absence of a response; no server can report it about itself. §1                                                                   |
| Widening `FeedIndicator` to carry backend state     | The two facts fail independently; a live feed behind an unreachable backend would force one indicator to lie. §3                                       |
| A shared indicator primitive                        | The only common ancestor is "a dot and a word". A shared component that thin is a coupling, not a saving. The idiom is duplicated knowingly. §3        |
| Latency as the definition of `degraded`             | Needs a second threshold below the deadline with nothing keeping them ordered, and there is no distribution to set it from. Trigger recorded. §2       |
| A fourth `BackendStatus` member for "not yet asked" | Leaks a client-lifecycle fact into a vocabulary defined in terms of the wire contract. `hasChecked` instead. §4                                        |
| Rendering `unreachable` before the first poll       | Reports the client's own startup as a fact about the server, on every page load. §4                                                                    |
| Rendering nothing before the first poll             | Collapses the region, shifts the chrome, and is indistinguishable from a broken indicator. §4                                                          |
| Showing the cause as a slug                         | `not-ok-status` is an engineering word nobody can act on. §5                                                                                           |
| A `title` attribute for the cause                   | Unreachable by keyboard and by touch — ADR 0004's tooltip argument. §5                                                                                 |
| `toLocaleTimeString` for the last check             | Width changes when a meridiem comes and goes, which `tabular-nums` cannot fix. §6                                                                      |
| Rendering a `requestId` on the indicator            | An id is a reference beside a failure a user is reporting; this reports a state. Structurally impossible — no prop carries one. §7                     |
| A `VITE_` variable for the poll interval            | Coupled to `API_TIMEOUT_MS`, which is a literal; configuring one of a coupled pair invites inverting an ordering from where the other is invisible. §8 |
| `setInterval` for the poll                          | Fires on a clock that knows nothing about whether the last request came back. §9                                                                       |
| Cancelling an in-flight request when the tab hides  | Aborts a request the backend has already been asked to serve, for nothing. §9                                                                          |
| A retry inside the transport                        | Retry is a property of the poll; a retry in the transport turns the caller's five seconds silently into fifteen. Task 1.12.2                           |
| A context provider for the health result            | Confines the re-render but drags `test-render.tsx` in as the place every test gets the value from. Trigger: a second consumer. §10                     |
| Memoising the header subtree                        | Trades one decision for a second one nothing checks. §10                                                                                               |
| Passing the hook's result object whole              | A prop named after a hook's return type is how a presentational component acquires a dependency on a network loop. §10                                 |
| A second deploy to produce `not-ok-status` deployed | Both producers already shown to render identically; measured at `<origin>/assets` instead. §13                                                         |
| A `window` error listener on the client             | Re-taken in Task 1.12.2: the trigger was never a story number, it is _an endpoint that accepts a client error report_, and this story builds neither.  |

## Consequences worth stating separately

### What a green indicator certifies, and what it does not

This is ADR 0010's "what the tick certifies" arriving one layer out, and it is
the honest framing here because **every state in this story is a client-side
conclusion**.

A green indicator certifies that **this browser reached that address and
understood the answer**. It does not certify that the server is healthy, and it
is not evidence about any other client.

That has evidence rather than only a framing. With a deliberately wrong
`CORS_ORIGIN` on the deployed backend (Task 1.12.7), three instruments
disagreed:

| Instrument                          | Reading                                                   |
| ----------------------------------- | --------------------------------------------------------- |
| The browser                         | `TypeError: Failed to fetch` — indicator `UNREACHABLE`    |
| `curl`, sending the same `Origin`   | **200 with the full body**                                |
| The backend's Log Analytics records | **38 requests in 4 minutes, every one `statusCode: 200`** |

So every piece of server-side evidence said healthy while the product was broken
for every user, and **`curl` is structurally incapable of catching it**. That
table is the reason Story 1.13 exists, and it is that story's acceptance
criterion.

The converse is also worth stating: a **red** indicator is not proof the server
is down either. It is proof that this browser could not get a readable answer,
which is a strictly weaker and more useful claim.

### The hidden-tab rule costs every observer something, and it is a handover

Because `poll()` is guarded rather than only the scheduler (§9), **an automated
tab makes no request at all**. Anything that drives this loop — Task 1.12.6,
Task 1.12.7, Story 1.13's post-deploy check — must make the tab report visible
first, or it will observe an application that appears never to have been wired
up.

The concrete handover to Story 1.13, checked against the code for this record
rather than trusted:

- **The words on screen** are `healthy`, `degraded`, `unreachable`, plus the
  `checking` placeholder a check must wait past.
- **The region labels** are `Market feed`, `Backend service`, `Market clock`.
- **The four detail sentences** are §5's table, verbatim.
- **The visibility precondition** is not optional — without it the loop never
  starts.
- **The two `degraded` causes share a word** and differ only in sentence, so a
  check asserting on the word alone cannot tell them apart and should not try.

### The React Compiler rules met shipped state and still said nothing

ADR 0009 recorded seventeen rules that had never fired outside a spike, with the
stated reason that nothing shipped had state. This story shipped the first
state, the first effect and the first network loop, and **they said nothing** —
so the conclusion held and its stated reason did not.

The reason matters more than the outcome: `set-state-in-effect` objects to a
**synchronous** update in an effect body, and this hook's `setState` calls happen
in async continuations and event handlers. So the rules are still untested
against anything they dislike, and any copy of that claim reading "because
nothing here has state" is now wrong for the stated reason while right in its
conclusion.

What _did_ fire was ordinary type-aware lint, and it is worth carrying:
`if (stopped) return;` after an `await` is `no-unnecessary-condition` at error —
_"value is always falsy"_ — because TypeScript narrows a `let` from an enclosing
scope and does not widen it again across an `await`, and the only assignment to
`true` is in a teardown closure the analysis cannot see running. It is not always
falsy; it is exactly the case teardown produces. Reading the flag through a
one-line function closes it, because **a call expression is never narrowed** —
no assertion and no disabled rule. The general form: **a lint error saying a
guard is dead is not always evidence the guard is dead.**

### The accessibility panel produced this repository's first real violation

Through eight stories the workshop's a11y addon had only ever returned the
standing `color-contrast` _inconclusive_ over `aria-hidden` direction glyphs.
`BackendIndicator`'s placeholder produced an actual violation: `--ink-disabled`
at 12px on the page ground measures **2.09:1** against a 4.5 threshold.

The fix was `--ink-secondary`, and the rule behind it is worth keeping:
**disabled ink is for a control nobody can operate, and receding is a job for
weight and hierarchy rather than for ink below the contrast floor.** The fix
transferred to the assembled header without re-taking — the `checking` label
measures 5.99:1 there.

### The idle-billing question is still open, and its refusal has changed shape

§8's third cost cannot be settled yet, and **what to hand over is the current
refusal rather than the old one**: `az consumption usage list` now returns `[]`
at exit 0 rather than refusing on offer type, and the Cost Management query API
answers `429`. Anyone re-taking this in Epic 2 or Epic 3 should not cite ADR
0011's stated cause, because it is no longer what happens.

The estimate itself reproduces: **$9.21/month at the idle rate and $19.04 at the
active rate**, against a **$20** budget with alerts at 50/80/100% — which sits
just _above_ the active-rate total, so **it would not fire on the change that
matters most**. That is the one number in this area worth repeating, because it
is wrong in the dangerous direction.

## Measured

### Acceptance criteria, re-run for this record (2026-09-04)

Local evidence and deployed evidence are kept separate deliberately: the
criterion's wording is "verified against the deployed environment, not only
locally", and this story has met it twice over in two environments.

| #   | Criterion                                              | Local (this task)                                                                                            | Deployed                                                                                      |
| --- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| 1   | Queries health, displays it in the chrome              | Met — three regions: `Market feed / disconnected`, `Backend service / healthy`, `Market clock / --:--:-- ET` | Met — `Backend service / healthy` on the live pair                                            |
| 2   | Distinguishes healthy, degraded, unreachable           | Met — all three, plus both `degraded` causes rendering different sentences under the same word               | Met — all three, each from a named cause (Task 1.12.7); `unreadable-body` re-confirmed here   |
| 3   | Unreachable reports last check; interface stays usable | Met — `Last confirmed 10:21:16`; four routes + not-found navigate, **0 error fallbacks**, 1 navigation entry | Met (Task 1.12.7) — six failed polls held `Last confirmed 09:02:38`; four routes, 0 fallbacks |
| 4   | Recovery automatic, no reload                          | Met — watched, see below                                                                                     | Met (Task 1.12.7) — failed 01:10:54 / 01:11:26, succeeded 01:11:57, one navigation entry      |
| 5   | Verified against the deployed environment              | —                                                                                                            | Met — healthy, poll, correlation id, and the fallback rule all re-taken here                  |
| 6   | Polling deliberate, does not spam logs                 | Met — 6 polls in 185 s, 2 log records each, 0 header mutations, 0 long tasks                                 | Met — cycle 31.05 s, round trip 262–268 ms                                                    |

### Recovery, watched rather than inferred (local)

| Time     | Event                                                             |
| -------- | ----------------------------------------------------------------- |
| 10:23:20 | `healthy`                                                         |
| 10:23:28 | backend `SIGTERM`ed — and the poll at that second still succeeded |
| 10:24:00 | `unreachable` on screen, `Last confirmed 10:23:28`                |
| 10:24:05 | backend answering again                                           |
| 10:24:31 | `healthy` again                                                   |

`performance.timeOrigin` unchanged at `1788488462798.1` throughout, exactly
**one** navigation entry of type `navigate`, on `/replay` — a route reached by
client-side navigation, so recovery landed on a tree the router had already
rebuilt. Zero error fallbacks. The failed poll neither cleared nor advanced the
timestamp.

### The poll, counted rather than estimated (local, 185 s, one visible tab)

- **6 requests**, cycle **30.98 / 31.00 / 31.00 / 31.00 / 31.02 s**
- **12 log records** — exactly 2 per request, which is `singleLine`'s figure
- round trip **7.8–25.1 ms**
- **0 header DOM mutations** across six healthy polls — the whole-tree re-render
  is invisible, because `lastSuccessAt` is deliberately not rendered while healthy
- **0 `longtask` entries**

The 31 s cycle rather than 30 is the browser rather than the application: an
automated tab is genuinely backgrounded, so Chrome aligns its timers to the
second. Overriding `visibilityState` gets past the application's own guard and
**not** past that. A real foreground tab reads 2.00 requests and 4.00 lines a
minute; anyone re-taking this in an automated tab will read 1.94 and 3.87 and
should not treat it as drift.

### The deployed pair (2026-09-04)

- Backend `/health` **200** over HTTPS, `x-request-id` present,
  `access-control-allow-origin` naming the deployed frontend
- **Three correlation ids followed from a browser to a Log Analytics record** —
  `responseTime` **0.48 / 0.31 / 0.38 ms**, `pid` **1**, revision `0000040`
- Round trip **250.8 / 262 / 268.1 / 275 / 385.5 ms** — inside Task 1.12.7's
  262–768 ms band, so the round trip is three orders of magnitude more than the
  server's own work
- Deployed bundle still `index-CL7CW2na.js` — Task 1.12.7's restored value
- Deep-linking: `/`, `/investigations`, `/securities`, `/replay` and a made-up
  path all **200 with the 1,101 B `index.html`**; `/assets/nope.js` **404**

### The tree

| Figure                     | Value                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm verify`, clean clone | **exit 0 in 27.06 s**, after a cold install of **398 packages in 7.91 s**                                                                              |
| `pnpm verify`, warm        | **21.93 s** — build 2.44 / lint 4.03 / `format:check` 4.05 / `stories` 0.27 / `env:check` 0.29 / `test` 3.38 / `test:process` 7.79                     |
| Tests                      | **189** — 37 `packages/shared` (4 files), 49 `apps/backend` (3), 103 `apps/frontend` (12) — plus **10** process tests                                  |
| Frontend artefact          | **361,653 B over four files** — JS 348,124 B `d280e167…`, CSS 12,128 B `134d5dd8…`, `index.html` 1,101 B `177df27d…`, `staticwebapp.config.json` 300 B |
| Modules transformed        | **278**                                                                                                                                                |
| Storybook output           | **63 files, 9.3 MB**                                                                                                                                   |

The artefact reproduces Task 1.12.5's figures **to the byte** from a clean clone
with an empty store, which is the check rather than a coincidence: Tasks 1.12.6,
1.12.7 and 1.12.8 shipped no application source.

### Coverage

| Package           | Statements | Branches | Functions | Lines  |
| ----------------- | ---------- | -------- | --------- | ------ |
| `packages/shared` | 75.86%     | 92.00%   | 71.42%    | 70.83% |
| `apps/backend`    | 64.33%     | 75.00%   | 72.72%    | 63.82% |
| `apps/frontend`   | 85.80%     | 87.50%   | 88.23%    | 85.81% |

Two of the three moved a long way this story — shared from 30.00% and the
frontend from 68.25% — because this story added tests to both. The backend is
unchanged to the digit, which is expected: it shipped no backend source. There
is still **no threshold**, for ADR 0010's reasons, all of which still hold.
