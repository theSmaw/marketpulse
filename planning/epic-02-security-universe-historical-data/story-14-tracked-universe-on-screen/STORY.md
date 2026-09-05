# Story 2.14 — The Tracked Universe On Screen (the first vertical slice)

**Status:** Not started
**Epic:** [Epic 2 — Security Universe & Historical Market Data](../EPIC.md)
**Depends on:** Story 2.3
**Delivered:** fourth, immediately after Story 2.3 and before Story 2.4
**Epic scope covered:** part of Security search/select — the _select_ half, without search

> **Why the number and the position disagree.** This story was added on 2026-09-05, after
> Stories 2.1 to 2.3 had shipped, so it takes the next free number rather than becoming a
> new 2.4. Story numbers are identities and are referenced across the tree — `market_bars`
> is Story 2.7's, the first `selectFrom` was Story 2.8's, the temporal plugin is Epic 13's
> — and renumbering would falsify every one of those references silently, which is the same
> reason ADRs are never renumbered. **Read the table in `EPIC.md` top to bottom for delivery
> order; the `#` column is a name, not a position.**

## Why this story exists

Two reasons, and the second is the one that makes it good engineering rather than a
concession.

**The delivery reason.** Epic 2 is planned in layers — 2.1 to 2.8 are backend and
infrastructure, and nothing a user can see arrives until 2.10. That is seven stories and
roughly fifty-five tasks of silence, during which the deployed application shows exactly
what it showed when Epic 1 closed: four routes of placeholders and a landing page whose
only market-looking content is **Story 1.4's render check, which is invented data**,
including two rows deliberately marked stale and disconnected. A stakeholder looking at the
deployed site during Stories 2.1 to 2.3 saw no change and a page of fiction. That is a bad
position to be in for three stories and an indefensible one for seven.

**The engineering reason.** The universe is in the database as of Story 2.3, and putting it
on screen needs **none** of Stories 2.4 to 2.7. The trading calendar, the provider
abstraction, Alpaca and bar ingestion are prerequisites for _charts_, not for _a list of
securities_. So the slice is available without skipping anything that anything else needs
— and it exercises the read path, the wire contract and the frontend data layer against
real data while all three are still cheap to change. Story 2.10's own file already makes
this argument about itself: it calls a security list "the smallest useful vertical slice
through Story 2.9's layer, which is a good way to find out whether that layer is right
while it is still cheap to change." This story takes that sentence at its word and moves it
earlier.

## What the user can see when this story lands

**A `/securities` page that lists the 101 real securities MarketPulse tracks**, replacing
the placeholder that has been there since Story 1.5. Concretely, on the deployed site:

- **A count and a summary line** — "101 securities · 11 sectors" — which is the first
  sentence in this product that is a fact about our data rather than a description of an
  intention
- **A table of every tracked security**, showing **symbol**, **company or fund name**,
  **sector**, and **what kind of thing it is** (a company, a sector ETF, an index ETF).
  Those four columns are the whole of what Story 2.3 curated, and they are enough to be
  genuinely useful: a user can see that we track NVDA and AMD and that both are
  Semiconductors, that XLK is the benchmark for Technology, and that SPY is a market proxy
  rather than a company
- **Grouping or sorting that makes the eleven sectors legible**, so the page reads as a
  described universe rather than an alphabetical dump — this is the difference between
  "here is a list" and "here is what we cover"
- **Honest states**: a loading state while the request is in flight, a failed state that
  says the service could not be reached and keeps the rest of the page usable, and — the
  one nobody plans for — a **loaded-but-empty** state, which is exactly what a database
  that was migrated but never seeded looks like
- **No prices, and the page says so**, because we do not have any until Story 2.7. A
  region that names the epic that fills it is Story 1.5's convention and it is what keeps
  this page honest rather than looking broken

**What the user still cannot do**, stated so nobody demonstrates this and promises more
than it is: they cannot search, cannot click a security to open it, and cannot see a price
or a chart. Those are Stories 2.10, 2.11 and 2.12, and this story deliberately does not
reach for them.

## Scope

- **The first read of this database.** A query, and the mapping from a `securities` row to
  the `Security` domain object in `packages/shared` — one function, beside the query, never
  a generic row-to-object mapper, per `apps/backend/migrations/README.md` §6
- **`GET /securities`** and its response contract in `packages/shared`, with the
  `satisfies` guard idiom so a field added to the interface and forgotten in the schema is
  a compile error rather than a field that silently vanishes from the wire
- **The frontend read path**, through `apps/frontend/src/api-client.ts`, which is currently
  the only file in the application that calls `fetch` and must stay so
- **The states as types rather than booleans** — Story 1.12's `BackendStatus` is the
  precedent: name the states, make the impossible ones unrepresentable, let components
  render a state rather than infer one
- **The `/securities` route**, turned from a placeholder into a real page
- **The browser journey and the accessibility gate**, because this is the first page in
  this product that renders data and the first table a screen reader has to make sense of

## What this story deliberately pre-empts, and from whom

This is the important half of the file, because three later stories were written assuming
they would be first. Each keeps its subject; what moves is a thin first cut.

| Story                                | What this story takes                                                                                                                                                   | What that story keeps                                                                                                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **2.8 Market Data API**              | the universe endpoints, the response-contract idiom, and — the significant one — **the first `selectFrom` and the module whose export list is Epic 13's temporal seam** | the bar-series contract, the time-window request shape, partial answers over a series, and everything that needs bars to exist                                  |
| **2.9 Frontend Market-Data Layer**   | one fetch through `api-client.ts` and the loading/loaded/failed/empty states as types                                                                                   | **the store decision**, which is deliberately not taken here — see the open decisions — plus caching, invalidation and the `market` feature module's real shape |
| **2.10 Security Search & Selection** | the list and its presentation                                                                                                                                           | search, the combobox and its keyboard behaviour, the per-security route and deep link, and the Security Explorer shell                                          |

**The temporal seam is the one to read twice.** `CLAUDE.md` records that Story 2.8 "writes
the first `selectFrom` and owns the module whose export list is the whole guarantee" for
Epic 13's replay isolation. That obligation moves here, and it is not optional: the whole
point of that arrangement is that there is no unplugged query handle to import, and a
first read written as a quick demo would establish the opposite pattern. `securities` has
no `observed_at` and is not itself a temporal table, so nothing here would be filtered —
which makes this the **cheapest possible place** to get the seam right, and the easiest
place to get it wrong without noticing.

## Out of scope, and who owns it

- Search of any kind — Story 2.10
- Clicking through to a security — Story 2.10
- Any price, volume, chart or time window — Stories 2.11 and 2.12
- A store — Story 2.9, deliberately, and see the open decisions
- Anything about the landing route's regions — Epic 4 owns the market overview
- Pagination as a product feature — see the open decisions; 101 rows do not need it and
  500 might

## Open decisions — settle with the user

1. **Whether the whole universe comes back in one response.** 101 rows is a small payload
   and the architecture is meant to reach 500, which is still small. A limit-and-offset
   contract is the general answer and costs a shape every later caller has to handle; no
   limit is simpler and is the thing that would have to change. Note `UNIVERSE.md` §8
   already lists "an API default page size" as a place a hard-coded 100 could hide
2. **Whether the store decision is taken here or left to Story 2.9.** The recommendation is
   **left**, firmly: §25 says avoid a heavyweight state library until complexity
   demonstrates the need, and one static list is the weakest possible evidence on which to
   decide how this application holds domain state. Taking it here risks anchoring it wrongly
   against a shape that is nothing like a streaming bar series
3. **What happens to the landing route's render check.** It is invented data on the page a
   stakeholder lands on, and it has been there since Story 1.4. The options are to leave it
   (it is the topology region's placeholder and Epic 6 replaces it), to caption it honestly
   so nobody reads it as market data, or to retire it now and leave the region empty with
   its "Epic 6 fills this" sentence. This is a judgement about what the product should look
   like while it is unfinished, which makes it the user's

## Acceptance criteria

1. `GET /securities` returns the tracked universe against the response contract in
   `packages/shared`, and a field added to the interface and not to the schema is a compile
   error
2. The `/securities` route renders every tracked security with its symbol, name, sector and
   kind, from the database rather than from a fixture — verified in a browser against the
   **deployed** pair, not only locally
3. Loading, failed and loaded-but-empty are each rendered as a distinct, honest state, and
   each is produced rather than reasoned about
4. The page is usable by keyboard and passes the axe gate with zero violations, at the same
   bar Story 1.13 set
5. No price, volume or chart appears anywhere, and the absence is explained on screen rather
   than left looking broken
6. `pnpm verify` passes with no database running

## Tasks

Tackled in order. The story is complete when all six are done.

The ordering has one property worth stating: **the third task is where a stakeholder can
see something.** The first two are the read path and the contract, and they are demonstrable
as a URL rather than as a page; from 2.14.3 onward every task changes what is on screen.

| #      | Task                                                                                                    | Status      |
| ------ | ------------------------------------------------------------------------------------------------------- | ----------- |
| 2.14.1 | [The first read: the query, the mapping, and the seam](TASK-01-the-first-read.md)                       | Not started |
| 2.14.2 | [`GET /securities` and the wire contract](TASK-02-the-endpoint.md)                                      | Not started |
| 2.14.3 | [Real data on screen: the frontend read path and the plainest honest list](TASK-03-on-screen.md)        | Not started |
| 2.14.4 | [The states, and making it look like the product](TASK-04-states-and-presentation.md)                   | Not started |
| 2.14.5 | [Keyboard, screen reader, and the browser journey](TASK-05-accessibility-and-journey.md)                | Not started |
| 2.14.6 | [Deploy it, verify it in a browser, and hand forward what was pre-empted](TASK-06-deploy-and-verify.md) | Not started |

## Design surface

This is the first page in MarketPulse that renders real data, so it sets patterns that are
expensive to change later: how a table of securities looks, how the equity/sector-ETF/index-ETF
distinction is shown, how a sector is labelled, and what a loading and a failed region look
like inside a `Region`. Story 1.4's component set already has `SecurityRow`, `FeedIndicator`
and the token layer; this is the first time any of it renders something true.

## What this story hands forward

A working read path from Postgres to the browser, exercised end to end against real data —
which is the thing Stories 2.8, 2.9 and 2.10 would otherwise each have to prove for the
first time on their own. And a page that gives every later story in this epic somewhere
visible to land.
