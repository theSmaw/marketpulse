# Task 2.10.4 — The `market` module, and the state a static list could not teach us

**Status:** Not started
**Story:** [2.10 Frontend Market-Data Layer & Application State](STORY.md)
**Depends on:** Task 2.10.3

## Objective

Give the frontend its first feature module under §26's boundaries, and define
what this application knows about a bar series as **types** — including the one
member Story 2.4's static list could not have taught anyone: **loaded and
partial, which is not failed.**

No React in this task beyond what a pure function needs. The collapse from the
client's seven transport outcomes onto a small named vocabulary is a function
with a reason per branch, testable without rendering anything, exactly as
`toBackendHealth` and `useSecurities`' collapse already are.

## What the user can see when this lands

**Nothing.** Types and one pure function. The payoff is Tasks 2.10.7 and 2.10.8
and then three UI stories.

## Work

- **Create the `market` module** under §26's `app/market/{data,models,state}`
  boundaries, adapted to this repository's actual layout rather than copied
  literally — `apps/frontend/src` today is flat, with `components/<Name>/` and
  `routes/`, and four hooks at the root. **Decide where a feature module sits in
  that tree and record it**, because Epics 3 to 11 add seven more and this is the
  precedent. The rule §26 states is the one that matters: a module exposes a
  domain-level API rather than its internals, so what leaves this module is a
  hook, a type and a handful of functions, and nothing imports its inside.

  Do not move the four existing hooks into it. `use-backend-health` and
  `use-market-clock` are chrome rather than market domain, and `use-securities`
  is a candidate but moving it is a change with no user in it — note the
  judgement and leave it, or move it deliberately and say why.

- **The series state is a discriminated union**, following `SecuritiesView`
  exactly, which is itself Story 1.12's `BackendStatus` lesson applied a second
  time: the impossible combinations cannot be constructed, so a component renders
  a state instead of inferring one. Acceptance criterion 2 is that a component
  **cannot render "loaded" without data**, and a union is what makes that a type
  error rather than a convention.

  The members this contract forces, each with the reason it exists rather than a
  name alone:

  - **loading** — nothing yet.
  - **loaded** — bars, and `coverage.covered` equal to what was requested.
  - **partial** — `coverage.covered` is narrower than `coverage.requested`. **A
    partial answer is a 200** (§6), it is an answer rather than an error, and this
    is the member the story names as the one shape Story 2.4 could not teach.
    Note it carries _two_ windows and a component needs both: what was asked for
    and what we hold. "We have data through 15:42" is only writable if the state
    kept the number.
  - **empty** — `bars: []` with provenance and `requested` present. Also a 200,
    also an answer (§6). Distinct from `partial` with zero bars only if that
    distinction is real — check the contract rather than assuming, and if it is
    not, say so and have one member.
  - **refused** — the request itself was not answerable: the 10,000-bar cap
    (§3, §4), or a window outside the calendar's 2024–2028 range. **Neither is a
    failure the user caused and neither is a server fault**, which is why they do
    not belong under the failure members. The cap's 400 names the number; a state
    that discards it makes the sentence "too much data" instead of "10,000 bars is
    the limit and you asked for 98,280".
  - **the failures**, carrying the `retryable` flag `FRONTEND-STATE.md` §4
    settled, and **exactly the two distinctions a reader can act on** — the one
    `SecuritiesView` already draws (did anything answer at all?) plus retryability.
    Not one per `API_ERROR_CODES` member: the union grows for the server's reasons
    and a page that mirrors it changes every time the API learns a new failure.

    > **Amended 2026-09-10 by Task 2.10.1 — where `refused` sits relative to the
    > flag, because the two were settled in different documents and could
    > otherwise produce two different unions.** §4's mapping table lists
    > `BAD_REQUEST` as not retryable, and both refusals above — the cap and the
    > calendar — arrive as `api-error` carrying exactly that code. **They are
    > still `refused`, not failures.** The flag is a property of the **failure**
    > members only, and `refused` is upstream of it: a refusal is a well-formed
    > answer about the request, so it needs its number on screen and needs no
    > statement about whether waiting helps. Waiting never helps, and saying so
    > would imply it might otherwise. So the collapse tests the code for a refusal
    > **before** it reaches the retryable branch, and §4's row for `BAD_REQUEST`
    > governs only a `BAD_REQUEST` this client did not recognise as a refusal.

  **`aborted` is not a member.** It is not a fact about the backend at all — it is
  a torn-down effect or a superseded request — and rendering one as a failure is
  the specific defect acceptance criterion 3 exists to prevent. It leaves the
  collapse without producing a state; Task 2.10.5 owns the mechanism.

- **Write the collapse as one function with a comment per branch.** Both existing
  precedents do, and both are readable a year later because of it. The value of
  the comment is the _reason_ two outcomes merge, not a restatement of which.

- **Decide how a state is handed to a component, and follow Task 2.4.4's finding
  rather than re-deriving it.** `UniverseTable` takes `view: SecuritiesView`
  **whole** while `BackendIndicator` takes four separate props, and both are
  right: a union exists so the impossible combinations cannot be built, and
  spreading it back into four props hands the renderer the eight-way boolean space
  it removed. A series is a union, so it travels whole.

- **Keep the shape describable.** Invariant 2 and Epic 11 want typed state a
  `WorkspaceCommand` can act on, and Epic 12 persists it. That is not a licence to
  build a command log now — it is a reason to prefer plain serialisable data over
  class instances, closures and `Map`s in the state, and to say so in the module
  header.

## Done when

- A `market` module exists, its position in the tree is recorded with the reason,
  and nothing outside it imports its internals
- The series state is a union whose `loaded` member cannot exist without bars —
  demonstrated by **producing** the compile error, not by describing it
- `partial` carries both windows, and `refused` carries the cap's number
- The collapse is a pure function with a per-branch reason, unit-tested against
  every transport outcome including `aborted`
- `aborted` produces no state, asserted by a test
- `pnpm verify` passes
