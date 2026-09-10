# Task 2.10.2 — A failure a user can act on, on the page that already has one

**Status:** Not started
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
