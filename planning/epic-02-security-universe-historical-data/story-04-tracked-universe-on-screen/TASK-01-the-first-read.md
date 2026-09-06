# Task 2.4.1 — The first read: the query, the mapping, and the seam

**Status:** Complete (2026-09-06)
**Story:** [2.4 The Tracked Universe On Screen](STORY.md)
**Depends on:** Story 2.3 (rows to read)

## Objective

Write this application's first `selectFrom`, the mapping from a row to a domain object, and
the module arrangement Epic 13's temporal isolation depends on — in that order of
importance, because the third is the one that cannot be retrofitted.

## What the user can see when this lands

**Nothing, and that is correct for this task.** No route changes, no endpoint exists yet,
and the deployed application is byte-identical. What exists afterwards is a function that
returns the tracked universe as `Security[]`, proven by `pnpm test:database` against a real
server.

Say this in the task's own write-up rather than leaving it implied. A task that changes
nothing visible is fine; a task that changes nothing visible **and does not say so** is how
a reader concludes the work was not done.

## Work

- **Write the query, and write the seam around it at the same time.** `CLAUDE.md` records
  that the first `selectFrom` owns "the module whose export list is the whole guarantee":
  Epic 13 attaches a temporal plugin with `withPlugin`, which returns a **different object**,
  so the guarantee holds only while there is no unplugged handle to import. `migrate.ts` and
  `load-universe.ts` both already build a `Kysely` instance and deliberately do not export
  it; this module is the first one whose job is to be _read from_, so it is the first place
  the arrangement is load-bearing rather than incidental
- **Note the one thing that makes this cheap here and expensive later**: `securities` has no
  `observed_at` and is not a temporal table, so nothing here would be filtered by that
  plugin even when it exists. The seam is therefore established against a case where getting
  it wrong has no symptom at all — which is exactly why it must be got right now, and why
  `market_bars` in Story 2.8 is not the place to be discovering the pattern
- **Write the mapping as one function per domain type, beside the query, and never a generic
  row-to-object mapper.** `migrations/README.md` §6 fixes this and gives the reason: the
  mapping is exactly where a nullable column becomes an explicit domain answer, and a
  generic mapper is where that decision gets skipped. Here that is concrete — the row has
  one nullable `sector` column and `Security` is a **discriminated union** in which a null
  sector means two different things depending on `kind`. The mapper is where those separate
  again
- **Decide what happens to a row that does not map**, rather than letting it throw from
  inside a request. A row whose `kind` is not in `SECURITY_KINDS` cannot exist — the database
  refuses it — so the honest question is what the code does if it does anyway. Prefer failing
  the whole read loudly over silently dropping a security from the universe, and say which
- **Filter on `status`, and treat that as the story-level decision it is.** `status` is an
  **invisible predicate**: `UNIVERSE.md` §3's rule is that it is _displayed rather than
  filtered away wherever a human is looking at a security_. So the read should return
  untracked securities and let the page show them as untracked, rather than hiding them —
  and whichever is chosen, it is a decision recorded here and inherited by Story 2.9
- **Test it against a real database**, in `pnpm test:database`, which already creates,
  migrates and drops its own `marketpulse_vitest` and does nothing to the database you are
  working in. Load the universe into it and read it back: the count, one row of each kind,
  and the two meanings of a null sector arriving as the union's two variants

## Done when

- The universe can be read out of Postgres as `Security[]`, asserted against a real server
- The three kinds each round-trip, and an index proxy's null sector arrives as the variant
  that says there is no answer rather than as a missing one
- No unplugged query handle is exported from the module, and the reason is written beside
  the export list rather than in a task file
- `pnpm verify` passes with no database running

## Notes

The temptation is to write four lines that return rows and move on, because the endpoint is
the interesting part and this is plumbing. The seam is the reason not to: it costs almost
nothing to establish now and it is the one thing in this story that Epic 13 cannot repair
from the outside.

---

## What shipped

Three files, no dependency, no lockfile change, no new script and no new `verify` step.

| File                                           | What it is                                              |
| ---------------------------------------------- | ------------------------------------------------------- |
| `apps/backend/src/securities.ts`               | the seam, the query and the mapping                     |
| `apps/backend/src/securities.test.ts`          | the mapping, in the **fast** suite — 8 tests, no socket |
| `apps/backend/src/securities.database.test.ts` | the read, against a real PostgreSQL server — 6 tests    |

**Nothing consumes it yet**, which is Task 2.4.2's, and is the same position
`apps/backend/src/schema.ts` was in after Task 2.2.4: its only reader is a test, and that
is the arrangement rather than a loose end.

## The decisions

### The seam — no unplugged handle leaves the module

`createSecuritiesRepository(pool)` builds the `Kysely` instance in a closure and returns an
interface of **functions returning domain objects**. Five things are exported and none of
them is a query handle. The reason is written in the module header rather than here,
because the file is where the next person adding a read will be looking.

**The rule for anything added below it: a new read is a new function on the interface.** If
a caller ever needs something no function provides, the answer is a function — never an
exported handle. `withPlugin` returns a _different object_, so Epic 13's guarantee is worth
nothing the moment there is a raw handle somebody can import.

Two things about this arrangement that differ from `migrate.ts` and `load-universe.ts`,
which already have the shape:

- **Theirs is incidental and this is load-bearing.** They build a handle because they need
  one and nobody was ever going to import it. This is the first module here whose _job_ is
  to be read from.
- **It takes a pool rather than opening one, and therefore has no `destroy()`.** Kysely's
  `destroy()` ends the underlying pool, which `index.ts` owns and closes inside the drain.
  A repository that could be destroyed would be a second way to close the application's
  pool half-way through a request. That is the exact mirror of the note in `loadUniverse`,
  where the handle _does_ own its pool and `closeDatabasePool` must therefore not also be
  called.

**The cost of getting this right was zero, and that is precisely why it was dangerous.**
`securities` has no `observed_at`, so nothing this module does would be filtered by the
temporal plugin even once it exists — a version of this file that exported the handle would
have passed every check anybody can write today. The seam is established against a case
where breaking it has _no symptom at all_. In Story 2.8 the symptom would be a replay
quietly showing a user the future.

### The query selects columns by name rather than `selectAll()`

Three reasons, in ascending order of weight. It does not fetch `id`, `recorded_at`,
`updated_at` or the four provenance columns, none of which the domain object has. A column
added in a later migration does not silently start arriving. And — the one that is a check
rather than a tidiness — because the mapper builds its candidate from exactly those names,
**a field added to `Security` in `packages/shared` and forgotten here is a compile error**
rather than a field that is quietly `undefined` on the wire.

### `orderBy("symbol")`, and why not by sector

Postgres guarantees no order without one, so a list rendered in whatever order the plan
happened to produce is stable until it is not. By **symbol** because it is the domain
identity and the only column with a unique index behind it, which makes the order _total_ —
ordering by sector would leave rows within a sector unordered and reintroduce the same
problem one level down. Grouping the eleven sectors for the page is presentation and
belongs to the page.

### The mapping reuses `isSecurity` rather than re-implementing the rules

`isSecurity` ships beside the shape it checks in `packages/shared`, for the reason
`isHealthResponse` and `isApiError` do: a validator written anywhere else is the copy that
drifts. It already enforces every rule this mapper needs, the kind-to-sector agreement
included, and it is where the ticker is validated. **This is its third reader**, after
Task 2.3.5's loader and ahead of Story 2.10's frontend — which is exactly the set its own
comment anticipated.

The `unknown` widening is the precedent `validateUniverse` set and it is the honest
statement of what is being checked: Kysely types `kind` as `SecurityKind` because the
_column_ is declared that way, which is a claim about the database rather than an
observation of the bytes that arrived. A predicate applied to a value the compiler already
believes narrows its negative branch to `never`, so the check could not report what it
found.

What is **not** delegated is the mapping itself. The column-to-field assignment is written
out field by field — one function for one domain type, never a generic mapper — because
that is where the row's one nullable `sector` column separates back into the union's two
meanings, and a generic mapper is where that decision gets skipped.

### A row that does not map fails the whole read, loudly

`SecurityMappingError`, naming the symbol. The alternative — skip the row, return the rest
— is worse in the way that matters on this particular page: **a universe list that is
silently one security short is indistinguishable from a universe that is one security
smaller**, and that is a claim this product is about to make on screen ("101 securities ·
11 sectors"). Dropping a row turns a malformed database into a wrong number, which is what
PRODUCT_SPEC.md §35's "manufacture missing observations" prohibits. A read that fails is a
page that says the service could not be reached, and Story 2.4 already owes that rendering.

It cannot happen — `kind`, `sector`, `status` and the cross-column
`securities_sector_matches_kind` are all `check` constraints — and that is not a reason to
leave the behaviour undefined. The available answers were "a `TypeError` from inside a
request handler with no symbol in it" or this.

### `status` is not filtered, and the caller is told what it now owes

`UNIVERSE.md` §12.2 had already decided this: the universe list, search, the Security
Explorer and replay all **show** the row with its status, and only the readers computing
over _the market we track now_ filter. So `listSecurities()` returns untracked rows, and
the note on the interface states the consequence rather than leaving it to be discovered —
**`securities.length` is the number of rows we hold, which from the first removal onward is
not the number of securities we track.** Filter in the caller if the tracked count is what
is wanted; do not push it down, because the row that would disappear is exactly the row
Story 2.4 renders as untracked.

## What was produced rather than reasoned about

**Four deliberate breaks, each seen to fail and each reverted.** Removing the `orderBy`
takes the ordering test red. Adding `.where("status", "=", "active")` takes the untracked
test red. Returning `flatMap` with a swallowed `catch` — the plausible wrong version of the
malformed-row decision — takes the mapping-failure test red. And removing the `isSecurity`
call from the mapper takes **five** fast tests red.

**A malformed row was produced rather than described.** The database refuses it, so the
test drops `securities_sector_matches_kind`, sets a sector on `SPY`, asserts the read
rejects and names the symbol, and puts both back in a `finally`. That is a thing only a
scratch database allows, and it is the reason this suite creates its own.

**One finding, from making it fail rather than from writing it.** The `.where` break took
_two_ tests red, and the second was collateral: the untracked test's cleanup was a bare
statement after the assertions, so a failing assertion left `GILD` untracked for every test
after it. The cleanup is in a `finally` now. The transferable half is that a suite which
mutates shared fixture state is only as isolated as its unhappy path, and the unhappy path
is the one nobody exercises until something breaks.

## Figures

- `pnpm test` is **295** (55 + **137** + 103) — the backend's fast suite went 129 → 137 —
  and needs no build, no socket and no database
- `pnpm test:database` is **61 across 3 files** in ~1.3 s, up from 55 across 2
- `pnpm verify` is **exit 0 in 26.82 s with no database running**, which is the "done when"
  taken on the task that could have broken it — the container was genuinely stopped, not
  reasoned about
- With no database, `pnpm test:database` is **exit 1 with 61 skipped**, failing in
  `beforeAll` naming `pnpm db`. No `skipIf`, because a skipped test reports green
- The **development database is untouched** — 101 rows, 101 `active`, 11 sectors, read back
  afterwards — because the suite creates, migrates, reads and drops its own
  `marketpulse_vitest`
- **The frontend artefact did not move**, which is the check rather than a coincidence,
  because this task shipped no frontend and no `packages/shared` source: 348,250 B
  `1a92544a…`, 12,128 B `134d5dd8…`, `index.html` 1,101 B `bcb28338…`, 300 B, **361,779 B
  over four files** — Task 2.3.8's figures to the byte

## What Task 2.4.2 inherits

A function that returns `Security[]`, and three things it must not undo: the handle stays
unexported, the repository gets no `destroy()`, and the read does not learn to filter on
`status`. What it owes is the wire contract in `packages/shared` with the `satisfies` guard,
and a decision about what the route does with a `SecurityMappingError` — which is a 500 and
an `INTERNAL_ERROR`, because a malformed row is this server having failed rather than the
client having asked wrongly.

---

## For the stakeholders — what this actually did, in plain terms

**Short version: nothing on the screen changed today, and that is exactly what this task
was supposed to do.** The next task puts a web address on it, and the one after that puts
it on the page. This one built the piece in between: the code that goes and fetches the
list of companies we track out of the database and turns it into something the rest of the
application can work with.

### Where the product is

We now hold a real, curated list of **101 US securities** in a real managed database — 86
companies, the eleven sector funds we benchmark them against, and four whole-market funds
like SPY. That landed last story. Until today, though, nothing in the application had ever
_read_ it. The list existed the way a filing cabinet exists before anyone opens a drawer.

Today the drawer opens. There is now a function that asks the database for the universe and
hands back proper, checked business objects — a company with a sector, a sector fund with
the sector it represents, a market fund with no sector at all because it genuinely does not
have one. It is proven against a real database server, not a stand-in.

### Why so much care over four lines of database query

Three decisions cost more thought than the query did, and each one is cheap now and
expensive later.

**1. We built a one-way door in the right direction.** MarketPulse's signature feature —
the one the whole product is being built towards — is _Market Replay_: rewind to 11:07 last
Tuesday and see only what was knowable at that moment. The hard part of that is not the
rewinding, it is guaranteeing that nothing anywhere accidentally peeks at data from later in
the day. The plan has always been to enforce that in the plumbing rather than by asking the
AI nicely, so that leaking the future is _impossible_ rather than merely discouraged.

That guarantee only works if there is exactly one door into the database and it is the
locked one. So this task made the database connection private to the module that owns it:
you can ask it questions, you cannot get your hands on the raw connection. It is a
five-minute decision today. If we had got it wrong today, the symptom would not appear until
Replay ships — and the symptom would be the product quietly lying to a user about what was
knowable. Note that this list of companies has no timestamps on it, so nothing here would
have been filtered anyway; that is _why_ it was the right place to set the pattern, because
getting it wrong here would have gone completely unnoticed.

**2. A broken row fails loudly instead of quietly disappearing.** The page we are about to
build will say "101 securities". If a row in the database were ever malformed, the tempting
behaviour is to skip it and carry on — the page still loads, nobody sees an error. But then
it says "100 securities", confidently, and there is no way to tell that from us genuinely
tracking 100. A number that is quietly wrong is worse than a page that says "we could not
load this right now", because the first one gets believed. So the read fails as a whole and
names the offending security. This is the same principle the product spec sets for the AI:
never manufacture a missing observation.

**3. Securities we have stopped tracking are shown, not hidden.** If we drop a company from
our watchlist, its row stays in the database — its price history is still real history, and
Replay will need it. The easy thing is to filter those rows out so the list looks tidy. We
deliberately do not. "We stopped tracking this" is _information_, and rows that silently
vanish are exactly the confusion we designed the database to avoid. The page will show such
a security and mark it as untracked. The trade-off, which we wrote down rather than left to
be discovered: from the first removal onward, "how many rows we hold" and "how many
securities we track" become two different numbers, and the page has to be clear about which
one it is quoting.

### How we know it works

Fourteen new automated tests — eight that run in a fraction of a second with no database,
and six that run against a real PostgreSQL server, load the actual 101 securities, and read
them back.

More usefully: **we broke it on purpose four times to check the tests would notice.** We
removed the sort order, we added the filter we had just decided against, we made a broken
row disappear silently, and we switched off the validation. Every one of those turned the
test suite red and named the behaviour that had gone. A test that has never been seen to
fail is not evidence of anything.

That exercise also found a real flaw in our own test setup, which we fixed: one test changed
a row and changed it back afterwards, but if the test failed part-way the change was never
undone and the _next_ test failed for a reason that had nothing to do with it. Small, and
exactly the sort of thing that costs an afternoon six months from now.

### What is still not possible

You cannot see this list. You cannot search it, click a security, or see a price — there are
no prices in the system yet, and there will not be until later in this epic. The `/securities`
page is still the placeholder it has been since Epic 1.

**The next task puts this behind a web address, and the one after that puts real company
names on the screen for the first time.** That is the point at which the deployed site stops
showing the invented sample data it has been showing since the very first design work, and
starts showing something true.
