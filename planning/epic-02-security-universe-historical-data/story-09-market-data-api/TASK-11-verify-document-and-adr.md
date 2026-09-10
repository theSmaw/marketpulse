# Task 2.9.11 — Verify, document, ADR

**Status:** **Done** — 2026-09-10
**Story:** [2.9 Market Data API](STORY.md)
**Depends on:** Task 2.9.10

> **Renumbered from 2.9.10 on 2026-09-10**, when Task 2.9.9's measurements put a
> build task ahead of the close — see Task 2.9.10, which compresses the wire.
> This file is otherwise unchanged apart from the entry that task's findings
> earned it, and every reference to it was remapped in the same change.

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

  **And one more, added 2026-09-10 by Task 2.9.8, which took it: what this
  product treats as immutable, and what it does about the fact that it is not
  quite.** The bars of a closed session never change; the **response** carrying
  them changes in two ways the calendar cannot see — a vendor correction moving a
  price and its `recorded_at`, and a `securityStatus` read from a different table
  that `pnpm universe` can flip against a window closed years ago. So the
  decision worth recording is not "we added caching": it is that **freshness is
  decided by the trading calendar and identity by the body**, that no response
  carries `immutable` or a `max-age` longer than five minutes, and that a named
  window is a stable URL naming a moving target and therefore never carries a
  lifetime at all. It is ADR-shaped because Epic 13's replay inherits the whole of
  it — in replay every window is closed — and because the reversal trigger is a
  condition rather than a preference: a correction that a client is measured to
  hold past its usefulness, or a third mutable field found in an "immutable"
  response. `MARKET-DATA-API.md` §11 has the tables and the measurements.

  **Two properties the ADR should state rather than leave implied**, both added
  2026-09-10 with the rest of this entry. The cache is **in-process**, so §11's
  vendor bound is per replica and the deployed multiplier is platform-only
  configuration — Task 2.9.9 reads it, and the ADR should record that a shared
  cache was refused rather than overlooked, because it is a second database
  bought to save a request the free plan does not charge for. And **the whole
  mechanism is two response headers**, which means it is the first thing this
  application ships whose correctness depends on a proxy nobody here configures;
  say so, and point at 2.9.9's deployed readings as the only evidence it works
  outside `app.inject()`.

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

  **Added 2026-09-10 by Task 2.9.8 — one discharged, two live, and one figure to
  re-check.**

  - ~~`index.ts`'s _"it is cached by nothing yet"_ about `/securities`~~ —
    **DONE in the same change**, amended in place with a dated note rather than
    rewritten, because the conclusion that paragraph supported (no server-side
    TTL on that route) is unchanged and only its premise moved.
  - **`CLAUDE.md`'s _What `pnpm verify` does not cover_ §3 gains a stated
    invariant nothing checks**, which is exactly that list's subject: the
    five-minute ceiling is spelled **twice** — as `CLOSED_ANSWER_SECONDS`' 300 in
    the `Cache-Control` header and as the same constant's derived
    `CLOSED_ANSWER_TTL_MS` in the cache — and the two agreeing is what makes
    "five minutes is the ceiling on how long anything in this system serves an
    invalidated body" true. They are derived from one constant today, so the
    invariant holds by construction; what nothing checks is that a later edit
    keeps them derived. One line, with its re-measurement, and nothing else.
  - **`CLAUDE.md`'s _Backend_ section has no line about `onSend`**, and Task
    2.9.8 produced one worth having: **a hook cannot remove `Content-Length`**,
    because Fastify computes it from the payload after every `onSend` hook has
    run. That is a trap rather than a figure — attempted, measured against a
    running server, reverted — and it is the sort of thing the next person to
    reach for a response hook will otherwise spend an hour on. Judge whether it
    earns its line; it is listed here so the judgement is made rather than
    skipped.
  - **The `/securities` payload figure is quoted in three live sites** and Task
    2.9.7's entry above says to re-sweep if 2.9.8 or 2.9.9 moves it. **It did not
    move** — 190,736 bytes, re-taken 2026-09-10 through the built backend. The
    gzipped figure differs from 2.9.7's **19,526** only because that reading used
    `gzip -9` and 2.9.8's `gzip` default gives **20,072**; that is the flag and
    not the payload. Nothing to sweep, recorded so a later reader does not read
    two numbers as a regression.

- **What Task 2.9.9 leaves you, added 2026-09-10.** It took criterion 5 and
  swept four documents the same day, so there is nothing outstanding to sweep;
  what it leaves is material for the ADR and one recommendation that is not
  yours to take silently.
  - **`MARKET-DATA-API.md` §12 is the measurement section**, and §12.12 is its
    own table of what it falsified: §4's gzipped-wire inference and the price of
    the pre-query calendar walk (both amended in place), §11's unknown replica
    multiplier (read: `maxReplicas: 1`, now in `HOSTING.md` too), and `BARS.md`
    §8.6's 28.2 ms cross-sectional timing (re-taken; plan identical, warm
    **1.93 ms**, cold **408.7 ms**, and the two-index deferral re-argued rather
    than the number replaced).
  - **The ADR has a genuine finding to carry: nothing on this path compressed**,
    neither the application nor the Azure Container Apps ingress, and nobody had
    ever checked. That is the class `CLAUDE.md`'s _What `pnpm verify` does not
    cover_ §6 names — behaviour that exists only on the platform — and it is the
    reason §4's cap argument needed amending rather than re-stating. ~~Decide
    whether it is an ADR line, a task in this story, or Story 2.12's.~~
    **Decided the same day: it is Task 2.9.10, which is why this file is 2.9.11.**
    What is left for the ADR is the finding rather than the repair, and the
    finding is the better half: **an assumption about the transport that every
    test was structurally unable to see**, sitting underneath a decision (§4's
    cap) that was argued in the units the assumption produced. Task 2.9.8's
    validator has the same shape and passed its gate; this one did not. That
    pairing is worth an ADR paragraph on its own.
  - **Read Task 2.9.10's own outcome before re-taking anything.** It re-takes
    §12.1, §12.5 and §12.8 and is told explicitly **not** to re-take §12.2,
    §12.4, §12.6, §12.7 or §12.11 — so this task inherits a document with two
    dates in it on purpose, and should not flatten them.
  - **Two figures worth quoting in the stakeholder section** because they are the
    only ones a reader will feel: ~~`/securities` costs **1,153 ms** deployed and
    **356 ms** when the validator hits, and a month of minute bars is **1.06 MB**
    and **~2.5 s**.~~ **Both moved on 2026-09-10 when Task 2.9.10 deployed the
    coding, and the post-compression pair is the one to quote: `/securities` is
    **484 ms** against a **376 ms** conditional floor, and a month of minute bars
    is **154 kB** on the wire and **1,210 ms**.**

- **What Task 2.9.10 leaves you, added 2026-09-10.** It swept its own
  falsifications the same day, so there is nothing outstanding to sweep — with
  **one exception, which is a hard precondition on this task rather than an
  item on a list.**

  - ~~**DO NOT START THIS TASK WHILE 2.9.10'S DEPLOYED GATE IS OUTSTANDING.**~~
    **Discharged 2026-09-10, hours after it was written: all four readings pass**
    (§13.6), §12.8's `200` rows are re-taken with an identity arm as the control,
    and Story 2.11's deployed figure is re-taken. Nothing falsified §11 or §12.5,
    so there was no upward sweep. **The headline for your criteria walk:
    `/securities` fell from 1,153 ms to 484 ms against a 376 ms conditional
    floor, and a month of minute bars from 2,606 to 1,210 ms.** The `304` column
    did not move, which was the stated check.
  - **§13 is the new section** — the plugin, the hook order, what the `ETag`
    validates, `Vary`, and the two measured numbers. It is Task 2.9.10's and this
    task does not re-take it.
  - **The document now carries two dates on purpose.** §4 has **two** amendments
    (2.9.9 saying its arithmetic is about a transfer that does not happen, 2.9.10
    saying it happens again); §11 and §12.1 have one each; §12.5's heading is
    deliberately left saying _nothing on this path compresses_, because that is
    what was true when it was measured. **Do not flatten any of them into a
    single current statement** — the sequence is the finding.
  - **`strongETag` is `weakETag` and emits `W/"…"`.** Anything in this task's own
    criteria walk that quotes a strong tag is stale.
  - **Three things for the ADR, on top of the finding 2.9.9 left you.** That
    entry says the ADR should carry _an assumption about the transport that every
    test was structurally unable to see_. 2.9.10 adds the repair's own shape and
    it is the better half of the pairing: **the fix for an invisible assumption
    was itself a silent-failure risk of exactly the same kind** — a compressor
    registered ahead of the validator removes every `ETag` with nothing on screen
    wrong and every `app.inject()` test green. Both failures were produced red
    first. Second: **the entity tag became weak, and which of the three RFC-legal
    repairs was happening had to be found by asking a running server** rather
    than by reading a plugin's documentation. Third, and it is a `CLAUDE.md`
    candidate rather than an ADR one: **`@fastify/compress` attaches its `onSend`
    per route via `onRoute`, so Fastify runs it after every instance-level
    hook** — which means the ordering trap this task's predecessor was written
    around is not reachable through that plugin at all. Judge whether that earns
    a line in the _Backend_ section beside the `Content-Length` one 2.9.8 left;
    it is listed here so the judgement is made rather than skipped.
  - **A second entry for _What `pnpm verify` does not cover_ §3, and it is the
    same class as the five-minute ceiling above.** Nothing in `verify` negotiates
    an encoding against a deployed host, so the claim that the ingress passes
    `Content-Encoding` through untouched is a stated invariant checked by one
    `curl` at one moment. One line with its re-measurement.
  - **One figure a stakeholder will feel, to sit beside 2.9.9's two:**
    `/securities` fell from **190,736 to 20,072 bytes** on the wire, and the
    month of minute bars from **1.06 MB to ~171 kB**.

- **Write the stakeholder section** in the shape Task 2.4.2 and 2.8.9 established:
  what this actually did in plain terms, why the small decisions went the way they
  did, and where it leaves the product. Say plainly that the visible result is one
  column of real prices and that the chart is next.

## Done when

- ~~**Task 2.9.10's deployed gate is discharged before this task starts**~~ —
  **done 2026-09-10**, four readings quoted in §13.6, §12.8 re-taken
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

---

# Outcome

Story 2.9 is closed. Seven criteria re-taken, three gates run, the subject
document finished at §15, [ADR 0021](../../../docs/adr/0021-the-market-data-wire-the-grain-of-provenance-and-what-a-cached-response-certifies.md)
written and indexed, and eleven documents swept.

## The seven criteria, re-taken

**Which half is code and which half is data**, since the Notes ask for it. Five
of the seven are properties of the **code** and re-take from a clean clone:
1, 3, 4, 6, 7. Two are properties of a **populated database** and cannot —
criterion 2 needs bars in a store to return, and criterion 5 is a timing against
48 million rows. Those two are dated readings. This is the same split ADR 0020
recorded for Story 2.8, and it is stated here rather than discovered by whoever
tries to reproduce them.

### 1 — a field added to a response type without its schema entry fails to compile

**Instrument: the compiler, on a NESTED shape.** Produced rather than described.

A `readonly vwap: number` was added to `BarPayload` in
`packages/shared/src/bar-series-response.ts` — nested three levels inside the
response envelope, because the guard checks **top-level keys** and does not reach
into a nested object, so a probe at the envelope would demonstrate nothing about
the shapes inside it. `pnpm typecheck`:

```
apps/backend/src/routes/market-data.ts(243,3): error TS1360: Type '{ startsAt: …;
  open: …; high: …; low: …; close: …; volume: … }' does not satisfy the expected
  type 'Record<keyof BarPayload, JsonSchemaProperty>'.
apps/backend/src/routes/market-data.ts(340,3): error TS2741: Property 'vwap' is
  missing in type '{ … }' but required in type 'BarPayload'.
```

Removed, rebuilt, green.

**The count, re-taken rather than subtracted from a remembered one.**
`grep -rn "satisfies Record<keyof" apps/backend/src` returns **28**, and it
splits exactly as this file predicted:

| Category                                                |  Count | Where                                                                                                                                                    |
| ------------------------------------------------------- | -----: | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Response-schema guards (the thing criterion 1 is about) | **17** | 6 `routes/securities.ts`, 7 on the series response, 1 each in `market-data.ts`'s feed response, `routes/health.ts`, `routes/diagnostics.ts`, `errors.ts` |
| Prose mentions of the idiom rather than uses of it      |  **8** | `schema.ts`, `json-schema.ts` ×2, `market-data-provider.test.ts`, `migrate.database.test.ts`, `market-data.ts`, `securities.ts`, `health.ts`             |
| The same idiom applied to a **different** guard         |  **3** | `satisfies Record<keyof T, ExpectedColumn>` in the two database suites — migration checks, not response schemas                                          |

That third category is what makes a bare `wc -l` of the grep wrong in a way that
looks right.

**One thing this file warned about turns out not to apply, and it is worth
correcting rather than repeating.** The brief says the edit proves nothing until
`packages/shared` is rebuilt, and that skipping the rebuild leaves `typecheck`
green against the old `.d.ts`. **It does not**, because `pnpm typecheck` is
`tsc -b` — which rebuilds the referenced project as part of the build graph.
Confirmed in the same session: the source reverted with no explicit
`--filter shared build`, `tsc -b` regenerated the declaration and reported 0
errors. The trap is real for `tsc --noEmit`, which is exactly why no script in
this repository uses it.

### 2 — a series returns bars with provenance, over a calendar-resolved window

**Instrument: `curl` against the running pair, over the real 48-million-row
store.** `GET /market-data/bars?symbol=NVDA&timeframe=1d&sessions=5`:

```json
{ "securityStatus": "active",
  "series": {
    "symbol": "NVDA", "timeframe": "1d",
    "bars": [ { "startsAt": "2026-09-03T04:00:00.000Z", "open": 226.02,
                "high": 230.4, "low": 224.75, "close": 228.45,
                "volume": 135429028 }, … ],
    "provenance": { "adjustment": "raw", "sources": [
      { "provider": "alpaca", "feed": "sip",
        "retrievedAt": "2026-09-08T07:29:39.358Z", "barCount": 2 } ] },
    "coverage": {
      "requested": { "start": "2026-09-03T04:00:00.000Z",
                     "end":   "2026-09-11T04:00:00.000Z" },
      "covered":   { "start": "2026-09-03T04:00:00.000Z",
                     "end":   "2026-09-08T04:00:00.000Z" } } } }
```

Everything the criterion asks for is in it: the window was resolved server-side
from `sessions=5` through the trading calendar and reported back absolutely; the
bars carry `alpaca`/`sip` with a `retrievedAt` that is the **batch's** and not
the clock's; and `covered` is narrower than `requested`, which is criterion 4 in
the same reading.

### 3 — four failures, the right status, the `ApiError` shape, a quotable request id

**Instrument: `curl` for the first three, and a backend pointed at a closed port
for the fourth.**

| Request                                  | Status  | Body                                                                                                                                                                   |
| ---------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `?symbol=ZZZZ&timeframe=1d&sessions=5`   | **404** | `NOT_FOUND` · "ZZZZ is not a security this system tracks. The tracked universe is listed at /securities." · `4a309516-32af-40da-93d0-a0d8dc1b67e8`                     |
| `?symbol=NVDA&timeframe=7m&sessions=5`   | **400** | `BAD_REQUEST` · `"7m" is not a timeframe. Expected 1m or 1d.` · `d01c9d3e-de9f-43ab-a224-cf1b0c7be4f3`                                                                 |
| `?symbol=NVDA&timeframe=1d` (no window)  | **400** | `BAD_REQUEST` · "No window given. Pass ?sessions=5 …, or ?start= and ?end= as UTC instants." · `4aaf60d2-79e4-4192-8e45-68a1f3ce38e0`                                  |
| `…&start=2016-01-04T05:00:00.000Z&end=…` | **400** | `BAD_REQUEST` · "That window reaches 2016-01-04, outside the trading calendar this system covers — 2024-01-01 to 2028-12-31." · `c11a619a-817c-473f-9b41-8520c7d14eb1` |
| `?symbol=NVDA&timeframe=1m&sessions=40`  | **400** | `BAD_REQUEST` · "That window is 15,600 bars and one response carries at most 10,000. …" · `f565e91d-b514-460d-9ba5-3216800fc8b9`                                       |
| The same, against `DATABASE_PORT=59999`  | **503** | `SERVICE_UNAVAILABLE` · "Market data is temporarily unavailable. Try again shortly." · `7a6dd980-6bd5-4173-af57-40ace43e8950`                                          |
| `GET /securities`, same dead backend     | **503** | `SERVICE_UNAVAILABLE`, the same constant message · `935d0560-fa93-40c9-af21-0c6086e89117`                                                                              |

**Both routes answer the same way**, which is the property `throughDatabase`
exists to give — one outage cannot get two answers. And the internal detail
stayed internal: `connect ECONNREFUSED 127.0.0.1:59999`, the Kysely stack and the
`ServiceUnavailableError` cause all reached the **log** at `warn`, and no part of
any of it reached a body.

Note the calendar-range refusal names `2024-01-01` and `2028-12-31` and names
neither `packages/shared` nor `MARKET_CALENDAR` — the rewrite Task 2.9.2 argued
for, checked at the wire rather than at the unit.

### 4 — "partial data" is expressible and is not an error

**Instrument: two `curl`s, one for each shape.** Criterion 2's reading above is
the _partial_ case — `covered` ends 2026-09-08, `requested` ends 2026-09-11, at
a 200. The _empty_ case, asked over Independence Day 2024 when the market was
shut:

```json
{
  "series": {
    "symbol": "NVDA",
    "timeframe": "1m",
    "bars": [],
    "provenance": {
      "adjustment": "raw",
      "sources": [
        {
          "provider": "alpaca",
          "feed": "sip",
          "retrievedAt": "2026-09-10T04:17:42.143Z",
          "barCount": 0
        }
      ]
    },
    "coverage": {
      "requested": {
        "start": "2024-07-04T13:30:00.000Z",
        "end": "2024-07-04T14:00:00.000Z"
      },
      "covered": null
    }
  },
  "securityStatus": "active"
}
```

**HTTP 200.** `bars: []`, `covered: null`, and the requested window still on the
wire — which is the whole argument against 204 produced rather than asserted:
the body _is_ the answer.

### 5 — response times measured against the real row count

**Instrument: Task 2.9.9's measurement suite, re-taken by Task 2.9.10 after
compression.** Not re-taken here — `MARKET-DATA-API.md` §12 and §13.6 carry them
with their dates, and this file's own brief says explicitly not to flatten the
two dates into one.

The headline pair, post-compression: **`/securities` is 484 ms deployed against a
376 ms conditional floor** (from 1,153 ms), and **a month of minute bars is
154 kB on the wire and 1,210 ms** (from 1.06 MB and 2,606 ms).

### 6 — the contract is exercised by tests against an assembled server

**Instrument: two suites, counted rather than remembered.**

| Suite                            |  Tests | What it walks                                                              |
| -------------------------------- | -----: | -------------------------------------------------------------------------- |
| `src/server.test.ts`             | **17** | The route table — every route that can fail declares `500: apiErrorSchema` |
| `src/routes/market-data.test.ts` | **39** | `app.inject()` over the assembled server                                   |
| `src/routes/securities.test.ts`  | **22** | the same, for the route that carries the last closes                       |
| `src/series-request.test.ts`     | **28** | the refusal taxonomy, with no pool, no Fastify and no clock                |

### 7 — `pnpm verify` passes

**Instrument: `pnpm verify`, exit 0, with no database running.** Re-read rather
than carried forward:

| Suite                 |  Files |     Tests |
| --------------------- | -----: | --------: |
| `packages/shared`     |     14 |       218 |
| `apps/backend`        |     29 |       650 |
| `apps/frontend`       |     22 |       240 |
| **`pnpm test` total** | **65** | **1,108** |
| `pnpm test:process`   |      1 |        14 |

## The three gates

All three required checks on `main`, run because this story can break all three —
Task 2.9.7 touches a rendered page and Task 2.9.10 changed the wire under it.

| Gate                 | Result                                                                  |
| -------------------- | ----------------------------------------------------------------------- |
| `pnpm verify`        | **exit 0** — 1,108 tests + 14 process tests                             |
| `pnpm test:database` | **exit 0** — 6 files, **165 tests**, real PostgreSQL                    |
| `pnpm e2e`           | **exit 0** — **30 specs**, real Chromium against a locally started pair |

## The upward sweep, and the greps behind it

Eleven sites. Live claims amended, ADRs given dated amendments rather than
rewrites, historical records in task files left standing.

| Site                                           | What was false                                                                                   | What was done                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `market-bars.ts` header                        | "the write path, and the ledger" — it now holds two **serving** reads                            | Dated amendment; the narrow sense ("does not serve HTTP") kept and qualified       |
| `market-bars.ts` §What this module does not do | "Story 2.9 owns the wire contract" as the reason `readBars` is here                              | Dated amendment: 2.9 took it as the served read rather than writing a second one   |
| `database.ts` reversal trigger                 | nothing — **re-checked and still unfired**                                                       | One dated line, so a later reader does not re-derive it                            |
| `market-provenance.ts` module comment          | "survives exactly until the first stitch" — the stitch happened 2026-09-09                       | Dated amendment pointing at §5                                                     |
| `errors.ts` 4xx branch                         | "On Task 2.9.10's sweep list" — the number moved at the 2026-09-10 renumber                      | Corrected to 2.9.11, with the check's result recorded                              |
| `schema.ts` `bar_coverage` docblock            | enumerated "one window, and a count" — predates `0007`'s two columns                             | Enumeration extended, dated                                                        |
| `migrations/README.md`                         | `0002` says a provenance column takes no default; `0007` gives two one                           | The **rule that reconciles them** added, rather than leaving a reader to pick one  |
| ADR 0020                                       | three enumerations of the ledger written before it had provenance                                | **Dated amendment**, not a rewrite — nothing above it reversed                     |
| `BARS.md` §8.13                                | "no owner written down" for the read-side join                                                   | Struck; the owner is Task 2.9.5, the paragraph left as what handed the decision on |
| `PROVIDER.md` §2.4                             | the stitch case written as hypothetical                                                          | Dated amendment: it is a response this application returns                         |
| `MARKET-DATA-API.md` §9 first bullet           | four nested shapes (there are seven); "types live in `packages/shared`" (the **schemas** do not) | Both corrected in place, pointing at the new §14                                   |
| `STORY.md` 2.10                                | had no record of the contract it fetches through                                                 | A "what you inherit" section: the window, the partial answer, the caching, the cap |

**And what was checked and needed nothing**, recorded so it is not re-checked:
`CLAUDE.md`'s "no state library yet / four hooks" line — still four `use-*.ts`
files, because Task 2.9.7 added a key to a response an existing hook already
fetched. `/securities` and `/market-data/bars` still share one
`throughDatabase`, so the 503 sweep item stays discharged.

**Four `CLAUDE.md` edits, all inside the "add nothing else" carve-out** — three
are traps rather than figures and one is the _Current state_ paragraph the close
owed anyway:

- _Where the record lives_ gains `MARKET-DATA-API.md`; the ADR range becomes
  0001–0021.
- _Current state_ now says Story 2.9 is complete and stops under-describing the
  screen: the tracked universe carries a real last close and change for 518
  securities. The two negatives it was right about — no charts, no live data —
  are kept.
- The `fast-json-stringify` coercion sentence gains **one clause** naming both
  produced instances: `null` under `"string"` reaching the wire as `""`, and
  `null` under `"number"` reaching it as **`0`**. The pair is what makes the rule
  land, because `""` is visibly wrong and a plausible price is not.
- _What `pnpm verify` does not cover_ §3 gains **three** stated invariants
  nothing checks, each with its one-line re-measurement: `pg-pool`'s
  connection-timeout **message string**; the five-minute ceiling being spelled
  twice from one constant; and the ingress passing `Content-Encoding` through,
  which one `curl` at one moment is the whole evidence for.
- The _Backend_ section gains **two** lines, both judged rather than assumed
  into: an `onSend` hook cannot remove `Content-Length` (Fastify recomputes it
  after every hook), and `@fastify/compress` attaches per route via `onRoute`, so
  the hook-ordering trap the caching work was written around is **not reachable
  through that plugin at all**.

## What went into the subject document

`MARKET-DATA-API.md` gains **§14** and **§15** and keeps its numbering, so every
existing cross-reference still resolves.

- **§14 — the request contract as built.** §2 settled the _decision_ and did not
  record what shipped: the five refusal reasons and the test that governs a
  sixth (_does a caller do anything different for each?_), the two window forms
  with the four traps under them, and the cap's half-day boundary. The
  measurement worth keeping is `new Date`'s inconsistency about unreal dates —
  `2026-02-30` becomes March 2nd silently, and the rollover is more dangerous
  than the NaN because it produces a **plausible** answer rather than an
  inexplicable empty one.
- **§15 — the cross-sectional read**, with both timings, because **Epic 4's
  Market Overview is the known next reader** and the cheapest way for it to get
  this wrong is not to know it was settled. A lateral scan of two rows per
  security at **4.8–8.2 ms warm** against **182–279 ms** for the `row_number()`
  window function — 30–40× — and the minute table untouched **by construction**:
  the timeframe is in the `Index Cond`, 518 index searches, 2,597 buffers.

## The ADR

[ADR 0021](../../../docs/adr/0021-the-market-data-wire-the-grain-of-provenance-and-what-a-cached-response-certifies.md),
seven decisions, indexed. It records the pairs the rest of the product inherits
rather than "we added an endpoint": how a window is expressed (and why the
browser's clock decides it), why the server never reduces, **the grain at which
this product stores provenance** and why the free answer was measured false, the
stitch, freshness-by-calendar with identity-by-body, 503-versus-500 with a bias
towards 500, and the compression finding.

**The finding is the better half of the last one**, and it is why that decision
is written as a pair rather than as a fix: _an assumption about the transport
that every test was structurally unable to see_ — `app.inject()` never negotiates
an encoding and nothing in `verify` opens a socket — sitting underneath a
decision (the cap) argued in the units that assumption produced. And **the repair
had the same shape**: a compressor registered ahead of the validator removes every
`ETag` with nothing on screen wrong and every test green. Both were produced red
first.

---

# For the stakeholder — what this actually did, in plain terms

**In one line: the price history is now something the application can ask for
over the internet, and asking for it twice is nearly free.**

## Where we were, and where we are

Last month's work ended with roughly 48 million real US stock prices sitting in
a database — minute by minute, for 518 companies, going back a year. Real data,
correctly stored, and **completely unreachable** by anything a person looks at.
A database is not a product.

This story built the doorway. There is now a web address the application can call
that answers _"give me NVIDIA's prices for the last five trading days"_, and gets
back the prices, the exact window they cover, and a note saying where they came
from. That doorway is the thing the next five stories all walk through: the
search box, the price chart, the volume chart and the window controls are each
one screen built on top of this one answer.

**What you can see on screen today** is the securities table, and it now carries
a real last price and a real percentage change for all 518 companies — the first
real prices this product has ever shown anybody. **The chart is next.** That is
Story 2.12, and it is now the only thing standing between the data and a picture
of it.

## Five decisions, and why they went the way they did

**1. "The last five trading days" is worked out by the server, never the
browser.** This sounds pedantic and is not. If a laptop in Singapore works out
"the last five trading days" from its own calendar, it is on the _previous_ New
York trading day for several hours of every day — so it silently asks for the
wrong window and draws a chart that looks perfectly reasonable and is shifted by
a day. Nobody would ever notice, because there is no error and the picture looks
fine. The server knows what today means in the market; a browser only knows what
day it is where it is sitting. So the browser asks by name and the server does
the arithmetic.

**2. The server never quietly sends less than you asked for.** A year of
minute-by-minute prices for one company is eleven megabytes — too big to send.
The tempting fix is to thin it out invisibly. We refused, and instead the server
says _"that is 15,600 prices and I send at most 10,000; ask for a narrower window
or use daily prices."_ The reason is the product's founding rule: **every number
a user sees must come from code they can point at.** A server that quietly
averages prices together has done a calculation nobody asked for, on data
somebody is about to draw a conclusion from — and it also has to decide which
high and which low survive the thinning, which is exactly the kind of hidden
judgement this product exists not to make.

**3. Every batch of prices carries a label saying which market it came from.**
Our data supplier gives us the _full_ US market for historical prices but only
_one exchange_ for live ones. Those are genuinely different things and a chart
that mixes them without saying so is misleading. We had assumed we could just
stamp every price with "full US market" — it is stored, so it must be. **We
tested that assumption and it was false**: the repository ships a command that
loads _invented_ test prices into a real database, so the stamp would have
labelled fake prices as the real US market. So we spent a small database change
on storing the label properly. That is roughly a thousand extra rows against
forty-eight million — cheap, and honest.

**4. A chart that runs up to "now" is stitched from two sources, and it says
so.** Our stored history stops at the last completed trading day. A chart ending
_now_ therefore needs a fresh piece from the supplier, live, while the user
waits. We could have ducked it by ending every chart at yesterday's close —
honest, cheap, and obviously wrong to anyone expecting today. Instead the answer
is stitched together and **labelled at the seam**, so the interface can show
which part came from where. It costs under 20 milliseconds and is capped so it
can never hammer the supplier.

**5. "We only have part of that" and "we have none of that" are answers, not
errors.** If you ask for prices for a day the market was shut, you get a normal,
successful reply that says: here is the window you asked about, and it is empty.
This matters more than it sounds. The product's whole thesis is that _"there
isn't enough evidence"_ is a legitimate, useful conclusion rather than a
failure — and a system that treats missing data as a crash can never say that
honestly.

## Two things we found by measuring rather than assuming

**Nobody had ever checked whether the data was compressed on the way out.** It
was not — not by our software, not by the hosting platform. Every size figure
this project had quoted for months described a saving that was not happening. We
turned compression on, and the securities page dropped from **191 kB to 20 kB**
on the wire, a month of minute prices from **1.06 MB to about 154 kB**, and the
page load from about 1.15 seconds to **0.48 seconds** — a bit over twice as fast,
for a change that is four lines of configuration.

The lesson is the more valuable half, and it is written down as such: this was
not an oversight, it was a thing **none of our 1,100 automated tests could
possibly have seen**, because they test the software without ever putting it on a
network. We now keep an explicit list of exactly those claims — true today,
checked by nothing — so the next one is found on purpose rather than by luck.

**And asking twice is now nearly free.** Yesterday's stock prices never change,
which is the cheapest saving this product will ever get. But we found that the
_answer_ about them can still change — a supplier can correct a price, and a
company's status can change — so rather than telling browsers "this is frozen
forever", the server sends a fingerprint of the answer. A browser that already
has that answer gets a 20-byte "still correct" reply instead of the whole thing,
and nothing anywhere in the system can serve a stale answer for more than five
minutes. That is the same mechanism the eventual replay feature — the one this
product is being built around — will run on, because in replay every trading day
is a closed one.

## Where this leaves the product

The backend half of this epic is **finished**. Everything from here to the end of
Epic 2 is on screen: the search box, the price chart, the volume chart and the
time-window control. The doorway is built, measured, documented, and its
decisions are written down with the alternatives that lost — so the five stories
that walk through it inherit the answers rather than re-taking them differently
five times.
