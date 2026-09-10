# Task 2.9.10 — Verify, document, ADR

**Status:** Not started
**Story:** [2.9 Market Data API](STORY.md)
**Depends on:** Task 2.9.9

## Objective

Close the story: re-take every acceptance criterion rather than citing it, finish
`MARKET-DATA-API.md`, add the ADR, and sweep what this story falsified.

## Work

- **Re-take the seven criteria, each against the thing it is about**, and say
  which instrument answered each. Criterion 1 is a compile error **produced**, not
  described — add a field, see `TS1360`, remove it.
  **Two things about criterion 1, added 2026-09-09 by Task 2.9.3.** There are
  ~~**eleven**~~ ~~**sixteen**~~ **seventeen** guard applications across the
  application — **re-counted 2026-09-09 by Task 2.9.7, which added one; the
  figure before it was eleven, which its own enumeration contradicted at
  thirteen, and both were low.** The count is: **six** in `routes/securities.ts`
  (`SecurityLastClose` is the sixth), **seven** on the series response, and one
  each in `routes/health.ts`, `routes/diagnostics.ts`, `/market-data`'s feed
  response and `errors.ts` (`ApiError` itself). The point is unchanged and is
  the reason the number matters: "add a field" at the envelope demonstrates
  nothing about the sixteen inside it, which is the whole property the criterion
  is about; pick a **nested** shape.

  **The one-liner is `grep -rn "satisfies Record<keyof" apps/backend/src`, and
  re-count rather than subtracting a remembered number from it.** It returns
  **28** hits today: 17 response-schema guards, **8** prose mentions of the idiom
  rather than uses of it (this file's ancestor said four, which was true when it
  was written and has not been true since), and **3** applications of the same
  idiom to a _different_ guard — `satisfies Record<keyof T, ExpectedColumn>` in
  the two database suites, which check a migration against `information_schema`
  and are not response schemas at all. That third category is the one that makes
  a bare `wc -l` of the grep wrong in a way that looks right. And `packages/shared` is consumed as **built output**, so the
  edit proves nothing until that package is rebuilt: skip the rebuild and
  `typecheck` is green against the old `.d.ts`, which looks identical to the guard
  not firing. Criterion 3 is four responses
  quoted with their request ids. Criterion 5 is Task 2.9.9's table. Criterion 6 is
  the route-table walk plus the `app.inject()` suite. Criterion 7 is `pnpm verify`
  at exit 0 **with no database running**.

- **Run the gates this story can break, not only the one this file names**:
  `pnpm verify`, `pnpm test:database` against a real server, and `pnpm e2e`
  against a locally started pair — Task 2.9.7 touches a rendered page, so the
  browser suite is in scope. All three of `verify`, `e2e` and `database` are
  required checks on `main`.

- **Finish `MARKET-DATA-API.md`** as the subject document for this story: the
  namespace, the four decisions with their alternatives and condition-shaped
  reversal triggers, **the request contract's refusal taxonomy and the two window
  forms as built** (added 2026-09-09 — §2 settles the _decision_ and does not
  record the five reasons Task 2.9.2 shipped, and a reader coming to add a sixth
  needs the test that governs one), the provenance decision from Task 2.9.4, the
  caching result from 2.9.8, and 2.9.9's measurements with their dates. Add it to `CLAUDE.md`'s
  _Where the record lives_ table, and add nothing else to `CLAUDE.md` — that file
  holds rules and traps, not figures.

  **One section this list did not anticipate, added 2026-09-09 by Task 2.9.7:
  the cross-sectional read.** That task answers _what did every tracked security
  last close at_ with a lateral scan of two rows per security, and measured the
  obvious alternative — a `row_number()` window over the daily half — at **30–40×
  worse warm** (182–279 ms against 4.8–8.2 ms). Its own file has the numbers, and
  they belong here too, because the _task_ file is where a reader goes for how
  2.9.7 was built and the _subject_ document is where they go before writing the
  next query of that shape. **Epic 4's Market Overview is that reader**: §8.1's
  landing screen wants the same figure for the same 518 securities, and the
  cheapest way for it to get that wrong is to not know this was already settled.
  Record the shape, both timings, and that the minute half is untouched by
  construction rather than by luck.

- **Write the ADR** — the next free number after 0020, never a reused one. The
  decision worth recording is not "we added an endpoint": it is the pair the rest
  of the product inherits — **how a time window is expressed on this wire**, and
  ~~**what a series says about where it came from when the store deliberately
  holds no provenance**~~ — **amended 2026-09-09 by Task 2.9.4, because that
  framing is now false and would send a reader to the wrong table.** The store
  **does** hold provenance: `0007_bar_coverage_provenance.sql` put `provider` and
  `feed` on `bar_coverage`, ~1,036 rows. What stays true is the shape of the
  problem and it is the better decision to record — **`market_bars` holds none per
  bar, on purpose, so the grain at which a product stores provenance is a
  decision** and this story took it at the series rather than at the observation.
  Record why the free answer was refused: a constant asserted at the read boundary
  was **measured false**, because a shipped command writes fixture bars into a real
  store. `MARKET-DATA-API.md` §10 has the four candidates and the trigger — and,
  added 2026-09-09, **the migration itself is worth a line**: this story shipped
  one, which its scope did not anticipate — and, added 2026-09-09, **the read-side
  join**: that this
  product answers "up to now" by stitching a stored SIP history to a live tail and
  reporting both feeds, rather than by ending the chart at the last close. The cap
  and its measured basis belong in it too; the downsampling decision is the
  interesting **negative**.

  **And one more, added 2026-09-09 by Task 2.9.6, which took it: how this API
  distinguishes a dependency being down from this server having failed.**
  `SERVICE_UNAVAILABLE` is `API_ERROR_CODES`' fourth member and the first added
  for a failure that is **not ours** — 503 rather than 500 because the two carry
  different instructions to a client, with `isDatabaseUnavailable` as the
  classifier and a deliberate bias towards 500 for anything unrecognised. It is
  ADR-shaped rather than task-shaped because every later epic that adds an
  unreliable dependency (Epic 9's SEC client first) inherits the question, and
  because the bias has a reversal trigger: a failure class that is repeatedly
  mis-answered as 500 is a reason to add to the allowlist, never to invert the
  default. Index it in `docs/adr/README.md`.

- **Sweep upward, the same day.** Falsification travels from a task to a
  governing document, and nothing sweeps upward on its own: grep for any claim
  this story changed, amend the **live** sites, give an ADR a **dated amendment**
  rather than a rewrite, and leave historical records in story and task files
  standing. Known candidates: `readBars`' comment saying Story 2.9 owns the series
  read; `database.ts`'s reversal trigger; `BARS.md` §8.13's "no owner written
  down" for the read-side join, which **now has one** — Task 2.9.5;
  `PROVIDER.md` §2.4, whose stitch case is no longer hypothetical; and Story
  2.10's and 2.12's files, which should inherit this contract rather than
  rediscover it. **Added 2026-09-09 and certain rather than conditional:**
  ~~`database.ts`'s _"nothing in this application serves data yet"_, false since
  Story 2.4 and doubly so now~~ **— DONE by Task 2.9.6**, marked superseded in
  place rather than deleted, because that sentence is what made the 503 decision;
  its **reversal trigger** is a separate line and is still live, so check that
  one; `market-provenance.ts`'s module comment
  anticipating the first stitch, which has happened; and ~~`CLAUDE.md`'s
  "no state library yet / four hooks" line if Task 2.9.7 moved it~~ — **checked
  2026-09-09: it did NOT move it.** That task added a fourth key to a response
  the existing hook already fetched and built no hook, no store and no second
  fetch, precisely so Story 2.10's decision stayed open; `use-*.ts` is still four
  files. The line stands as written and needs no edit — recorded so a later
  reader does not re-check it.
  **Added 2026-09-09 by Task 2.9.2 and certain rather than conditional:**
  `errors.ts`'s 4xx branch, whose recorded trigger — _"once request schemas
  exist"_ — this story fires, and whose decision Task 2.9.6 takes; amend that
  comment with what was decided rather than leaving a trigger that has already
  fired reading as though it has not.
  **Added 2026-09-09 by Task 2.9.3 and certain rather than conditional:**
  `MARKET-DATA-API.md` §9's first bullet, which says the response types are Task
  2.9.3's and names _"bars, provenance, sources and coverage"_ as the nested
  shapes — a forward-looking list that is now answered and undercounts, since
  there are **seven** shapes and the seventh (`TimeWindowPayload`) is the one the
  nullable field hangs off; and that same bullet's _"live in `packages/shared`"_,
  which is true of the types and **false of the schemas**, which sit in
  `apps/backend/src/routes/market-data.ts` beside the route. `STORY.md`'s scope
  list carries the same correction already. Neither is a figure — both are live
  claims about where the contract is, and a reader sent to the wrong package is
  the cost.

  **Added 2026-09-09 by Task 2.9.4 and certain rather than conditional:**
  `market-bars.ts`'s header, which says the module is _"the bar store's write
  path, and the ledger"_ and that _"it does not serve HTTP"_ — it now also holds
  the serving read, and the second half of that sentence is still true only in the
  narrow sense that the route is elsewhere; `schema.ts`'s and
  `migrations/README.md`'s accounts of `bar_coverage`, which predate its two new
  columns; ADR 0020, whose enumerations of what the ledger holds were written
  before them and which wants a **dated amendment** rather than a rewrite; and
  `PROVIDER.md`, if it anywhere says a stored series has no feed. **And one that
  is a decision rather than a description:** `0002_securities.sql` argues that a
  provenance column must have **no default**, and `0007` gives its two a default
  for a deploy-window reason with the compile-time guard doing the work instead —
  two migrations now say opposite-looking things about one convention, so
  `migrations/README.md` should carry the rule that reconciles them rather than
  leaving the next reader to pick one.

  **Added 2026-09-09 by Task 2.9.7 — one discharged, two live.**

  - ~~The `/securities` payload figure, quoted in three live sites
    (`api-client.ts`, `use-securities.ts`, `securities-response.ts`)~~ — **DONE
    by Task 2.9.7 in the same change that moved it**, 150,660/12,831 →
    **190,736/19,526**. Nothing to sweep unless 2.9.8 or 2.9.9 moves it again;
    if either does, it is three sites and they are named here.
  - **`CLAUDE.md`'s _Current state_ paragraph, and it is a live claim rather than
    a figure.** It reads _"the tracked universe with its coverage. There are no
    charts and no live data yet."_ The two negatives are still true and the
    enumeration is now short by the most significant thing on the screen — a real
    price for 518 securities, which is the first one this product has ever shown.
    A reader taking that paragraph as the current state would under-describe what
    exists, which is the failure mode that paragraph exists to prevent. It is
    listed here rather than swept on the day because the same paragraph has to be
    rewritten at this story's close anyway and two edits would fight; **if this
    story stalls, sweep it regardless** — the rule is same-day and the exception
    is that the close is imminent, not that the close exists.
  - **`fast-json-stringify`'s null coercion now has a second measured instance,
    and `CLAUDE.md` already names the class.** That file's backend section
    records the gap as _"a declared JSON type disagreeing with the TypeScript one
    is coerced silently"_ — abstractly correct and, as written, easy to read past.
    There are now two produced instances: a `null` under `"string"` reaches the
    wire as `""` (Task 2.4.2, `sector`), and a `null` under `"number"` reaches it
    as **`0`** (Task 2.9.7, `previousClose`). The second is the worse of the two
    and the pair is what makes the rule land, because `""` is visibly wrong and a
    plausible price is not. This is a trap rather than a figure, so it is inside
    this task's "add nothing else to `CLAUDE.md`" carve-out — one clause on the
    existing sentence, not a new one.

  **Added 2026-09-09 by Task 2.9.6 — one discharged, one new, and the new one is
  the kind this list exists for.**

  - ~~`/securities` should answer `SERVICE_UNAVAILABLE` once the member exists
    (`MARKET-DATA-API.md` §6 put it on this list)~~ — **DONE in the same change as
    the member.** Both routes share `throughDatabase`, so one outage cannot get
    two answers. Nothing to sweep; check it is still one wrapper.
  - **NEW, and it is a trap rather than a figure, so it belongs in `CLAUDE.md`
    despite this task's own "add nothing else" instruction.** `database.ts` matches
    `pg-pool`'s connection-timeout **message string**, because that one failure
    carries no code at all — and nothing re-checks the string, since producing it
    needs a pool that fails to connect and `pnpm verify` has no network. A driver
    upgrade that rewords it silently downgrades a timed-out pool from 503 to 500:
    a well-formed answer naming the wrong thing, which is exactly what _What
    `pnpm verify` does not cover_ §3 enumerates. Add it to that list with its
    one-line re-measurement, and to nothing else.

- **Write the stakeholder section** in the shape Task 2.4.2 and 2.8.9 established:
  what this actually did in plain terms, why the small decisions went the way they
  did, and where it leaves the product. Say plainly that the visible result is one
  column of real prices and that the chart is next.

## Done when

- All seven criteria re-taken, each with the instrument named and the reading
  quoted
- `pnpm verify`, `pnpm test:database` and `pnpm e2e` all pass, and the numbers
  (`pnpm test`'s three-way split, the database count) are re-read rather than
  carried forward
- `MARKET-DATA-API.md` is complete and linked from `CLAUDE.md` — including the
  cross-sectional read and its two timings, which Epic 4 inherits; the ADR is
  written and indexed; the upward sweep is done and its greps recorded
- `STORY.md`'s status is Complete and its open decisions are struck through with
  pointers to where each was settled

## Notes

Half of Story 2.8's criteria could not be re-taken from a clean clone because they
were properties of a populated database, and that story said so criterion by
criterion. The same is true here for criterion 5. Say which half is code and which
half is data.
