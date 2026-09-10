# Task 2.10.2 — A failure a user can act on, on the page that already has one

**Status:** Complete — 2026-09-10
**Story:** [2.10 Frontend Market-Data Layer & Application State](STORY.md)
**Depends on:** Task 2.10.1

## Objective

Apply Task 2.10.1's fourth decision to the one page that can already produce the
failure: make `/securities` tell a reader whether waiting will help, and give
them the action that follows from it. This establishes the failure vocabulary
every bar-series state in this story then inherits, on a page where the states
are already built and designed.

## What the user can see when this lands

**The first visible thing in this story, and it lands second on purpose.**

- When the database is unreachable, `/securities` says the market data is
  **temporarily unavailable** rather than "unexpected response" — a sentence that
  is currently false for the commonest failure this page has, and false in the
  direction that matters, because it tells a reader nothing will help when in
  fact waiting will
- **A retry the user can press**, which is the first control in this product that
  re-asks a question. Today the only recovery is a page reload, which throws away
  everything else on the screen — the opposite of §36's incremental degradation
- The genuinely unexpected failure keeps its existing sentence and its
  `Reference:` line, so the two remain distinguishable

What a user still cannot do: see a price series, or a chart. Tasks 2.10.7 and
Story 2.12.

## Work

- **Read the error's `code`, not its status.** `SERVICE_UNAVAILABLE` is a member
  of `API_ERROR_CODES` and that union is the contract a client branches on;
  reading `response.status === 503` is reading the status line where the contract
  put a value. `useSecurities` currently collapses `api-error`, `http-error` and
  `unreadable-body` alike onto `answered-badly` — the collapse itself is right and
  its reasoning is written out in that file, so **widen it deliberately rather
  than replacing it**.

  > **Amended 2026-09-10 by Task 2.10.1 — the shape is a flag, and half of this
  > task is in `packages/shared`.** `FRONTEND-STATE.md` §4 chose **a `retryable`
  > flag derived from `code`**, carried on the existing failed state: not a third
  > union member, and not one member per `API_ERROR_CODES` entry. Two consequences
  > this task's original wording did not carry.
  >
  > **The derivation lives beside `API_ERROR_CODES` in
  > `packages/shared/src/api-error.ts`, not in the frontend** — the meaning of a
  > code is part of the contract rather than a client's opinion, which is the same
  > rule `api-client.ts` states for predicates and for the same reason: a second
  > copy written at a call site is the copy that disagrees first. So this task
  > edits the shared package and owes it a test, and `packages/shared` must be
  > built before the frontend typechecks against it.
  >
  > **`http-error` is deliberately _not_ retryable**, and the reason is worth
  > having in front of you while writing the collapse: it carries no `code` at
  > all, and an answer we cannot read the contract from is one we cannot make a
  > promise about. There is a second, non-obvious path into that outcome —
  > `isApiError` declines a `code` it has not been taught — so a server that later
  > learns a retryable code reads as non-retryable here until the shared package
  > learns it. That is a version skew degrading in the safe direction, and §4
  > records it because nothing checks it.

- **Keep the two failure states distinguishable and do not add a third rendering
  vocabulary.** `UniverseTable` already ships two failure sentences in one visual
  treatment (`unreachable` and `answered-badly`, Task 2.4.3), deliberately so they
  read as the same _kind_ of thing. Whatever this adds joins that treatment; a
  third look would make the page appear to have three unrelated error states.

- **The retry is a real re-request, not a re-render.** It must go through
  `api-client.ts`, compose an abort signal, and be safe to press twice — a second
  press while one is in flight either supersedes the first or is refused, and the
  superseded result must not land. That is the same `aborted`-is-not-a-failure
  rule Task 2.10.5 generalises, met here first on a single request.

- **Decide whether a retry is automatic, manual, or both, and record it.** An
  automatic retry with backoff is what a status indicator does — `useBackendHealth`
  already polls every 30 seconds — and a manual one is what a page of content
  does, because a user who is reading something does not want it replaced under
  them. Note that `api-client.ts` states plainly that there is deliberately no
  retry in the transport, and why: retry is a property of the caller, and a retry
  buried in the transport makes the five-second deadline a lie. Do not put one
  there.

- **Produce the state from a named cause.** Point the backend at a port nothing
  listens on (`DATABASE_PORT=59999 node dist/index.js`) and read the code out of
  the body — that is the same one-liner `CLAUDE.md` records for re-measuring the
  connection-timeout message string, and it produces a real 503 rather than a
  mocked one. A state produced by flipping a boolean proves the component and not
  the wiring.

- **The announcement is not free.** `UniverseTable`'s `Announcement` is a
  persistent `role="status"` rendered in every state and never unmounted, and a
  retry that changes the page's content is exactly the kind of change it exists
  to report. Check what it says across a failed → retrying → loaded sequence, and
  keep it `status` rather than `alert` — `alert` is `ErrorFallback`'s and the
  browser suite asserts on that distinction on every route.

## Done when

- A real 503 from a real unreachable database renders a sentence that tells the
  reader waiting will help, produced from a named cause and seen on screen
- A genuinely unexpected response still renders its own sentence and its
  `Reference:` line, and the two are visibly the same kind of thing
- Pressing retry re-asks and recovers without a page reload, and the rest of the
  page is untouched throughout
- Pressing retry twice cannot render a stale answer
- The raw `code` appears nowhere on screen
- The retryable derivation is in `packages/shared` beside `API_ERROR_CODES`, with
  its own test, rather than written in the frontend
- The states are covered at the component level and the wording is judged by a
  person, per Task 2.4.5's rule that no instrument can hear whether a sentence is
  a good one
- `pnpm verify` passes

---

## What was built — 2026-09-10

### The derivation, in the contract rather than in the client

`packages/shared/src/api-error.ts` gained `RETRYABLE_API_ERROR_CODES` and
`isRetryableApiErrorCode(code)`, beside `API_ERROR_CODES`, with their own tests.
One member: `SERVICE_UNAVAILABLE`. Three tests, and one of them is the one that
matters — every member of `API_ERROR_CODES` gets an answer, so a code added to
the union and forgotten here is `false`, which is the safe direction.

It takes an `ApiErrorCode` and not a status number. Reading `response.status ===
503` would be reading the status line where the contract put a value.

### The flag, and the two things it changes

`SecuritiesView`'s `failed` member grew **two** booleans, and the second was not
in this task's original scope:

- `retryable`, per `FRONTEND-STATE.md` §4.
- `retrying`, because "what the page does while the retry is in flight" turned
  out to be a real question with a wrong obvious answer. Returning to `loading`
  would take the failure's own sentence off the screen while we find out whether
  it is still true and put it back a moment later, which reads as the page
  breaking twice. The failure stays, the control says it is working.

Neither is a fifth union member, for the reason §4 gives for the first and a
different one for the second: a member whose entire content is the member it
replaces makes every consumer carry both.

The mapping from the client's seven outcomes is written out in
`use-securities.ts` with a reason per branch. `http-error` and `unreadable-body`
are **not** retryable, deliberately, and the comment in that file carries the
`isApiError`-declines-an-unknown-code path so the next reader meets it before
being surprised by it.

### The retry: manual, never automatic — decided and recorded

**Manual.** A poll is what a status indicator does — `useBackendHealth` polls
every 30 seconds because a health state changing _is_ the information it carries
— and a page of content is the other thing. Three reasons, in order of weight:
a user reading a failure should not have it replaced under them; an automatic
retry is a request per open tab, forever, against a service that is already
unwell; and a page that recovers on its own gives a user no way to tell a
service that came back from one that never went away. Nothing goes in the
transport, which `api-client.ts` already forbids and says why.

The mechanism is one ref holding the controller of the request whose answer the
hook will accept. Starting a request aborts the previous one and takes the ref;
a result whose controller no longer owns it is dropped. **The abort alone is not
enough** — a request that had already resolved when the abort landed cannot be
un-resolved — which is exactly what the identity check is for, and the test for
it was verified by removing the check and watching it go red.

### The copy, and the third rendering that is not a third vocabulary

| Rendering                   | Silhouette   | Says                                           | Control   |
| --------------------------- | ------------ | ---------------------------------------------- | --------- |
| **no response**             | hollow ring  | nothing answered; check the service is running | Try again |
| **temporarily unavailable** | dashed ring  | the service answered and cannot reach its data | Try again |
| **unexpected response**     | amber square | something else is answering that address       | none      |

All three in one treatment, `BackendIndicator`'s marker-plus-word language.
Dashed is the silhouette that language already uses for _not yet_; deliberately
**not** the amber square, which marks the one condition on this page that needs
somebody to go and look at something.

**Both directions of the prospect are said.** A retryable failure says waiting
may help; a non-retryable one says trying again would produce the same answer
and that the page is therefore not offering to. The second half is the one that
is easy to drop, and dropping it makes the button's absence read as something
missing rather than as a decision.

The raw `code` is nowhere on screen, asserted in a component test and again in
the browser suite.

### The announcement across failed → retrying → failed

Checked, and it changed the design. `role="status"`, never `alert`, unchanged.
The retry sentence — _"Trying the tracked universe again."_ — is not decoration:
a live region whose text does not change announces nothing, so a retry that
failed the same way would have been completely silent to a listener. Passing
through a distinct sentence and back out of it is what makes the second failure
heard at all.

### Produced from a named cause, and seen

`DATABASE_PORT=59999 node dist/index.js`, then `curl -i /securities`:

```
HTTP/1.1 503 Service Unavailable
{"code":"SERVICE_UNAVAILABLE","message":"Market data is temporarily unavailable. Try again shortly.","requestId":"850467d3-…"}
```

The page rendered _temporarily unavailable_ against that real 503. The backend
was then restarted against the real database and **Try again** was pressed: 518
securities, their closes and their coverage arrived into the same document, with
the heading, the chrome and the region's own frame untouched. The `unreachable`
rendering was produced the same way, by stopping the backend entirely.

### Where it is checked

- `packages/shared/src/api-error.test.ts` — the derivation, three tests
- `use-securities.test.ts` — the four outcome mappings, the recovery, and the
  supersession (verified by breaking it)
- `UniverseTable.test.tsx` — the three renderings, the absent code, the press,
  the pressable-while-busy control, and the announcement sequence
- `UniverseTable.stories.tsx` — twelve renderings in `AllPermutations`,
  including the retrying state, which is the one no assertion can judge
- `e2e/specs/securities-route.spec.ts` — a real browser: the 503 renders, axe is
  clean, the button recovers the page, and no navigation happens

`pnpm verify` passes. `pnpm e2e` passes, 31 tests.

### What a user still cannot do

See a price series, or a chart. Tasks 2.10.7 and Story 2.12.

---

## For the stakeholders — what this actually changed

MarketPulse's securities page had one honest problem and one dishonest one.

The honest problem: **when something went wrong, the only way out was to reload
the page.** Reloading throws away everything else on screen to re-ask a single
question, which is precisely the behaviour this product has committed to not
having — a failure in one part of the workspace is supposed to leave the rest of
it working. Today that page has a **Try again** button. It is the first control
in MarketPulse that re-asks a question, and everything the rest of this epic
builds — the price chart, the volume chart, the live feed — inherits it.

The dishonest problem was worse, because it looked fine. By far the commonest
way this page fails is that our service is running perfectly and cannot reach
its database for a moment. The page used to describe that as an **"unexpected
response"** — which tells a reader that something is broken and that waiting
will not help, at the exact moment when waiting was the entire answer. It now
says the market data is **temporarily unavailable**, and offers the button. A
genuinely unexpected failure keeps its old wording, keeps its reference number,
and offers no button — because a retry button under something that will fail
again is a lie the user pays for twice.

Three decisions worth knowing about:

**The page asks the server what kind of failure it was, rather than guessing.**
Our API already labels its own failures, and that label is what the page reads —
so the day the server learns a new kind of temporary failure, the page's
behaviour follows from the contract rather than from somebody remembering to
update a screen. Where there is no label to read — nothing answered at all, or
something answered that is not our service — the page says less rather than
promising something it cannot know.

**The retry is a button and not a timer.** A page that quietly re-asks on its
own replaces what somebody is reading, generates a request per open browser tab
forever against a service that is already unwell, and leaves a user unable to
tell a service that recovered from one that was never down. A person presses it
when they are ready.

**Pressing it twice cannot show you an old answer.** That sounds like a detail
and is not: the failure it prevents is a page that displays stale market
information while looking completely correct. Getting it right once, here, on
the simplest possible request, is a great deal cheaper than getting it right
later on a live price series — and this is the same rule the rest of this epic
will lean on.

We also checked the part nobody usually checks: what a screen-reader user hears
when they press the button. They now hear that we are trying, and then hear the
result — including when the result is the same failure again, which without this
work would have been complete silence.

**Where this leaves the product.** Nothing new is on screen when everything is
working; the visible change is what happens when it is not. What it unlocks is
the vocabulary: every state the price series is about to acquire — loading,
partial, empty, refused, failed — now has a settled answer for what a failure
says and what a user can do about it, and it is a settled answer that already
survived a real 503 and a real browser rather than a mocked one.
