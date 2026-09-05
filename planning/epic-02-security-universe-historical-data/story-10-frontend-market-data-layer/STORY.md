# Story 2.10 — Frontend Market-Data Layer & Application State

**Status:** Not started
**Epic:** [Epic 2 — Security Universe & Historical Market Data](../EPIC.md)
**Depends on:** Story 2.9
**Epic scope covered:** **Addition to this epic's stated scope** — the client-side half implied by every UI item in it

## Description

Decide how the frontend holds domain state and how it fetches, caches and invalidates
market data — once, here, before three UI stories each answer it differently.

§25 recommends Redux for domain state and RxJS for streaming, and immediately adds "avoid
introducing heavyweight global state libraries until application complexity demonstrates
the need". This epic is the first place there is any domain state at all, so this story is
where that judgement is actually exercised rather than quoted.

## What the user can see when this story lands

**Nothing new on screen by itself**, and everything after it is faster and more consistent
because of it. This story decides how the frontend holds domain state and fetches market
data — once, here, rather than three times in three UI stories.

**Scope note added 2026-09-05: Story 2.4 took the first fetch and the loading / loaded /
failed / empty states as types**, exercised against the securities list. What remains here is
the decision that story deliberately refused to take on one static list — **whether this
application needs a store at all**, plus caching, invalidation and the `market` feature
module's real shape. §25's own advice is to avoid a heavyweight state library until
complexity demonstrates the need, and a bar series is the first thing that might.

What a user does eventually feel from this story: whether switching between securities is
instant or re-fetches, and whether a failed request takes out one region or the page.

## Why it sits here in the sequence

It is the first frontend story in the epic and the one every subsequent one depends on.
Getting it after the charts would mean rewriting them.

## Scope

- The state decision: what lives in a store, what is server cache, and what is local
  component state. These are three different things and conflating the first two is the
  most common way a React application acquires a store it does not need
- The data-fetching layer, built on `apps/frontend/src/api-client.ts`, which is currently
  **the only file in the application that calls `fetch`** and should stay so — Story 1.12
  proved that property by grep and it is worth keeping
- Loading, empty, partial and failed states as **types**, not as booleans scattered through
  components (§36). Story 1.12's `BackendStatus` work is the precedent: name the states,
  make the impossible ones unrepresentable, and let components render a state rather than
  infer one
- A `market` feature module under the §26 boundaries, exposing a domain-level API rather
  than its internals
- Caching and invalidation: a closed session's bars never change, so this is mostly a
  question of what to keep and when to refetch
- Request cancellation on navigation and on window change, which `api-client.ts` already
  composes an abort signal for
- What test support this needs, so Stories 2.11 to 2.13 test components without each
  inventing its own mock — the `test-render.tsx` module is the stated home for the
  application's context in tests, and any provider added here lands there

## Out of scope, and who owns it

- Streaming, sockets and reconnection — Epic 3, which is why the choice here should not be
  hostile to RxJS arriving beside it
- The AI's typed workspace commands operating on this state — Epic 11, which is a reason to
  keep the state shape describable
- Investigation state — Epics 7, 8, 12

## Open decisions — settle with the user

1. **Redux now, or not yet.** The honest position: today's domain state is a selected
   symbol, a time window and some cached series. A server-cache library plus URL state
   covers that with no store at all. Against that, §25 names Redux, Epic 11's generative
   workspace is much easier against an explicit typed state tree with a command log, and
   Epic 12 persists workspace state. So the question is whether to pay for it now or take a
   migration later — and the migration is cheap only if this story keeps state out of
   component internals either way. **This is the decision to settle with a person.**
2. **Server cache mechanism** — a library, or a small hand-rolled cache. Note this
   repository's habit of building the alternative before rejecting it, and its equally
   strong habit of keeping a library when the hand-rolled version fails in ways that look
   like success
3. **Where the selected symbol and window live.** The URL is the strongest candidate:
   deep-linking already works (Epic 1 proved it against the deployed host), a shared link
   to a chart is a real product feature, and Epic 11 wants the workspace describable

## Acceptance criteria

1. `api-client.ts` remains the only file calling `fetch`, verified by grep
2. Loading, empty, partial and failed are represented as types, and a component cannot
   render "loaded" without data
3. A navigation away from a pending request cancels it, and the cancelled result is not
   rendered as a failure — the distinction Story 1.12's `aborted` outcome exists for
4. The layer works against a fixture backend with no network
5. The decision and its reversal trigger are recorded
6. `pnpm verify` passes, including the React Compiler rules, which this story is the
   second real test of

## What this story hands forward

One place market data enters the UI, and the state shape Epics 3, 11 and 12 build on.
