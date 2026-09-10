# Task 2.10.1 — Settle the store, the cache and where selection lives, shipping no component

**Status:** Not started
**Story:** [2.10 Frontend Market-Data Layer & Application State](STORY.md)
**Depends on:** Story 2.9 (complete)

## Objective

Take this story's three open decisions — **a store or not**, **the server-cache
mechanism**, and **where the selected symbol and window live** — plus the fourth
the 2026-09-09 amendment handed this story (**what a retryable failure is on the
frontend**), with measurements rather than preferences, and write them down in one
document before a line of the layer is typed.

Task 2.9.1's precedent exactly: settle the shape, ship nothing. The thing this
task buys is that Tasks 2.10.3 to 2.10.8, and then three UI stories after them,
do not each answer the same question differently.

## What the user can see when this lands

**Nothing.** No hook, no module, no pixel. The payoff is Task 2.10.7, which puts
a real bar series on screen, and the three stories after it. Say so plainly when
reporting it — this repository's rule is that "nothing visible" is stated rather
than dressed up, and the story it pays off is named.

## Work

Produce **`FRONTEND-STATE.md`** in this directory — the subject document for this
story, added to `CLAUDE.md`'s _Where the record lives_ table by the close task
(2.10.9) — and settle each of the following in it, with the alternatives that
were weighed and a **reversal trigger that is a condition rather than a story
number**.

- **Open decision 1 — Redux now, or not yet.** State the honest position the
  story states: today's domain state is a selected symbol, a time window and some
  cached series, and a server cache plus URL state covers that with no store at
  all. Against that, §25 names Redux, Epic 11's generative workspace is much
  easier against an explicit typed state tree with a command log, and Epic 12
  persists workspace state.

  Three things must appear in the decision or it is a preference. **What is
  actually in the tree today** — enumerate it; there are four hooks
  (`use-backend-health`, `use-securities`, `use-market-feed`, `use-market-clock`)
  and no store, and three of them make requests. **What Epic 11 needs and when**
  — a `WorkspaceCommand` executed against typed state is invariant 2, and the
  question is whether that state has to exist now or whether this story only has
  to avoid making it expensive later. And **the bundle cost, measured** rather
  than assumed, the way Story 1.4 measured its component library: add the
  candidate, build, read `dist/`, remove it. A number that is not in the file is
  a number nobody took.

  Whatever is decided, the story's own hedge is binding: **the migration is cheap
  only if this story keeps state out of component internals either way.** So if
  the answer is "not yet", the file must say what shape keeps it cheap, and that
  shape is what Task 2.10.4 builds.

- **Open decision 2 — the server-cache mechanism.** A library, or a small
  hand-rolled cache. **Read `MARKET-DATA-API.md` §11 before weighing this**,
  because the server already answers half of it in a layer no JavaScript here can
  see: every response carries a weak `ETag`, `fetch()` revalidates on its own,
  and an unchanged answer comes back as a `304` with no body — measured at
  1,060,490 bytes → 0 for a month of minute bars.

  So the thing a client cache still has to justify is **a `304` round trip and a
  `JSON.parse`**, not a megabyte, and the file must say that explicitly so nobody
  later re-argues this in bytes that were already saved. What is genuinely left
  is **keeping a parsed, typed series in memory across a component unmount**.

  Two hard constraints on whatever is chosen. **No second TTL over these URLs** —
  the five-minute ceiling exists so nothing in this system serves an invalidated
  body for longer, and a client cache with a lifetime of its own defeats it
  silently. And note this repository's two opposing habits, both real: it built
  and threw away two schema libraries and an error-boundary library, and it kept
  `@fastify/cors` because the hand-rolled version fails invisibly. Say which of
  those this is and why.

- **Open decision 3 — where the selected symbol and window live.** The URL is the
  strongest candidate: deep-linking already works and was proved against the
  deployed host in Epic 1, a shared link to a chart is a real product feature, and
  Epic 11 wants the workspace describable. Decide the **shape** too, not only the
  home — Story 2.11 owns the per-security route's URL and Story 2.13 owns the
  window control, so what this task owes them is the rule (path segment for the
  subject, query for the view; or whatever is decided) rather than the strings.

  One thing this decision must handle rather than defer: **a named window and an
  absolute range are different URLs with different cache behaviour** (§11 again —
  `?sessions=5` is a stable URL naming a moving target and carries no lifetime,
  an absolute window inside closed sessions is reusable for five minutes with no
  request at all). If the URL is the home of window state, which form goes in it
  is a product decision about what a shared link means tomorrow, and it belongs
  here.

- **The fourth decision, handed to this story on 2026-09-09 by Task 2.9.6 — what
  a retryable failure is.** `/securities` and `GET /market-data/bars` now answer
  **503** when the database is unreachable, distinct from the 500 that means this
  server failed, and the two carry different instructions: _temporary, retry_
  against _this will fail again_. The frontend throws that away at the first hop
  and renders both as "unexpected response", which is false in the direction that
  matters.

  The story's amendment already fences the answer and the fence is binding.
  Branch on **`code`**, the closed union a client is meant to read, never on the
  status number. Do **not** put the raw code on screen — `requestId` remains the
  only internal identifier this product shows. Do **not** add a state per
  `API_ERROR_CODES` member, because that union grows for the server's reasons and
  a page mirroring it changes every time the API learns a new failure. What is
  open is only whether this is a third state, a `retryable` flag off the error,
  or different copy under the same state. Decide it, and note that the answer
  binds both the universe page and every series state after it.

## Done when

- `FRONTEND-STATE.md` exists and settles four decisions, each with its
  alternatives and a reversal trigger that is a condition
- The store decision carries a **measured** bundle figure for the candidate, taken
  in this repository rather than read off a package page
- The cache decision states, in one sentence a later reader cannot misread, what
  the browser's HTTP cache already does and therefore what a client cache is
  being asked to buy
- The URL decision says which window form a shared link carries
- Nothing is added to `apps/frontend/src` — verified by `git status`
- `pnpm verify` passes, which for a documentation task means `pnpm links` in
  particular

## Notes

The temptation here is to decide by architecture diagram. Resist it: three of the
four decisions have a cheap measurement available in this repository today, and a
decision with a number in it survives a disagreement six epics from now.

One boundary worth stating up front, because it is the likeliest scope leak: this
task does not choose a **charting** library, does not design the security route,
and does not settle Story 2.13's window vocabulary. It decides where state lives
and how it is fetched. If a decision here appears to force one of those, that is
a finding to record, not a licence to take it.
