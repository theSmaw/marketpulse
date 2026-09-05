# Task 2.3.2 — `Security` in `packages/shared`, and the vocabularies it fixes

**Status:** Complete
**Story:** [2.3 Security Domain Model & the Tracked Universe](STORY.md)
**Depends on:** Task 2.3.1 — every name in this file is one that task chose

## Objective

Define what a security **is** in this product, once, in `packages/shared`, and have both
apps compile against it. Acceptance criterion 1, and nothing else: no table change, no
rows, no loader.

## Work

- **Write `Security` in `packages/shared/src/security.ts`, beside `SECURITY_KINDS`**,
  which has been sitting there since Task 2.2.4 saying in its own comment that this
  interface is Story 2.3's. It is a **domain object and not a row**: `apps/backend/src/
schema.ts` already holds `SecuritiesTable`, and the two are deliberately different types
  in different packages — `migrations/README.md` §6 gives the three reasons and they have
  not changed. Expect the differences to be visible rather than theoretical: the row has
  `recorded_at` and `updated_at` and the domain object almost certainly should not, and
  the row's nullable `sector` is where the domain type gets to make an explicit answer
- **Ship the vocabularies as `const` arrays with derived unions**, the shape
  `HEALTH_STATUSES`, `FEED_STATUSES`, `ANOMALY_BANDS`, `API_ERROR_CODES` and
  `SECURITY_KINDS` already have, so each is readable at run time by anything comparing it
  against the database. That is at least the sector taxonomy and the `status` vocabulary,
  plus whatever Task 2.3.1 decided about the index-proxy / sector-proxy distinction
- **Put the sector-to-ETF mapping here too, and decide out loud whether it is domain
  vocabulary or data.** It is the one thing in this task that could plausibly live in the
  universe file instead, and the argument for `packages/shared` is that Epic 5's
  relative-move reads it and Epic 4's sector rows group by it, so it is a fact both sides
  depend on rather than a fact about our particular list. The argument against is that it
  is a table of strings that changes when the ETF set changes. Say which and why
- **Ship the one derived helper the `kind` widening costs.** Task 2.3.1 widened
  `SECURITY_KINDS` to `equity | sector_etf | index_etf`, and the single stated cost of that
  choice is that "is this an ETF" stops being an equality and becomes a membership test.
  That helper — `ETF_KINDS` as a const array, or an `isEtf()` beside the union, whichever
  reads better — belongs here beside the vocabulary rather than at each call site, for the
  reason `isHealthResponse` and `isApiError` are in this package: a predicate written
  anywhere but beside its shape drifts from it. Epic 4 is its first real reader
- **Do not widen the type to carry anything Story 2.8 or Epic 9 owns.** No price, no bar,
  no filing, no CIK-derived anything beyond the identifier field that already exists. The
  test is whether the field is a fact about the security or a fact about something that
  happened to it
- **Decide whether a predicate ships beside the interface, on the precedent rather than on
  taste.** `isHealthResponse` and `isApiError` are both in this package for a stated
  reason — a validator written anywhere but beside its shape drifts from it — and both
  have a reader. The reader here is Task 2.3.5's loader, which has to reject a malformed
  row. Note the one asymmetry those two already record: `isApiError` **does** check its
  discriminator against the const array where `isHealthResponse` deliberately does not,
  because one is switched on and the other is rendered. Say which case a `Security` is
- **Make both apps compile against it, and make that mean something.** `apps/backend`
  imports it or nothing has changed for the backend at all; `apps/frontend` has no reader
  until Story 2.10, so state whether "both apps compile against it" is met by the shared
  package being in both type graphs or requires an actual import, and do not manufacture a
  fake consumer to satisfy a criterion
- **Add the tests this package's convention asks for**, beside the subject. Note what is
  worth asserting and what is not: `security.ts` has shipped no test until now, correctly,
  because `SECURITY_KINDS` alone had nothing to assert — the same position `feed-status.ts`
  and `anomaly.ts` are in. A union whose members must not overlap with another union, or a
  mapping that must be total over a taxonomy, **is** worth asserting, and that second one
  is acceptance criterion 3's first half expressed at compile time rather than at load time
- **Do not touch the `Database` interface or the migration.** The schema catching up with
  this vocabulary is Task 2.3.3, deliberately in that order: the type is the source of
  truth and the `check` constraint is the backstop, which is the arrangement
  `migrations/README.md` requires of every closed set

## Done when

- `Security` and its vocabularies exist in `packages/shared` and are exported from the
  package root
- Every closed set is a `const` array with a derived union, and the sector-to-ETF mapping
  is total over the taxonomy in a way the compiler holds
- Both apps typecheck; `pnpm verify` passes with no database running
- Nothing about the table, the rows or the loader changed

## Notes

The `Database` interface and `Security` will look like near-duplicates in a diff, and the
reflex will be to make one derive from the other. `migrations/README.md` §6 already
refused that: a row has a nullable column where a domain object has an explicit answer,
and the mapping between them is exactly where that decision gets made. That mapping is
Story 2.9's to write, one function per domain type and never a generic mapper — and this
task should not pre-empt it either.

---

## What shipped

**Two files changed and one was added**, all in `packages/shared`:
`src/security.ts` (rewritten from Task 2.2.4's thirty-seven lines),
`src/security.test.ts` (new, **18 tests**) and `src/index.ts` (the exports).
**No dependency, no lockfile change, no migration, no row, no loader, and
`apps/backend/src/schema.ts` was not touched.** `pnpm verify` is exit 0 with no
database running; `pnpm test` is **257** (55 + 99 + 103) and `packages/shared`
is 55 across 5 files, up from 37 across 4.

### The type is a discriminated union, not one interface with a nullable sector

`Security` is `EquitySecurity | SectorEtfSecurity | IndexEtfSecurity`. That was
not the obvious shape and it is the decision the rest of the file hangs off.

`UNIVERSE.md` §6 chose a `.ts` universe file over a data file on the promise
that **"a row missing a sector, or carrying a sector that is not in the
taxonomy, is a compile error rather than a load-time failure."** A flat
`sector: Sector | null` does not deliver that — it makes every row's sector
optional at compile time and pushes acceptance criterion 3's first half entirely
onto Task 2.3.5's loader. Discriminating on `kind` delivers it: an
`EquitySecurity` and a `SectorEtfSecurity` **require** a `Sector`, and an
`IndexEtfSecurity`'s sector is **structurally `null`**.

The deeper reason is that `sector`'s nullability has **two distinct meanings**,
which `UNIVERSE.md` §2 already recorded — on an index proxy null is the correct
and complete answer, and on an equity it is a row that should have failed to
load — and a single nullable column cannot tell a reader which one it is looking
at. The discriminant is what tells them apart, which is the same argument that
made `kind` a three-member column rather than an inference from `sector`.

The cross-row rules are still the loader's, untouched: "every sector _present_
has a sector ETF" is a statement about the whole list, exactly as Task 2.3.4's
brief says.

### `SECURITY_KINDS` is three members, and it now disagrees with the database on purpose

`["equity", "sector_etf", "index_etf"]`, per Task 2.3.1. `0002_securities.sql`
still carries `check (kind in ('equity', 'etf'))`, so **the vocabulary and the
constraint deliberately disagree for exactly one task**, and Task 2.3.3 closes it.

This was measured rather than predicted. `pnpm test:database` was run against the
local database after the widening and reports **1 failed | 22 passed**, naming
both sides:

```
- Expected            + Received
  [ "equity",           [ "equity",
-   "index_etf",        +   "etf",
-   "sector_etf", ]         ]
```

That is Task 2.2.5's check **working**, not failing — it exists to catch exactly
this divergence, and it caught it on the first change that produced one. Two
things follow and both are stated rather than left to be found. It is harmless:
`securities` holds zero rows and nothing writes to it until Task 2.3.5's loader,
which ships after the migration, so nothing can be in the state the tightened
constraint would refuse. And it is **not free**: `database` is a required status
check on `main` alongside `verify` and `e2e`, so this change cannot merge green
on its own — 2.3.2 and 2.3.3 belong in one pull request, or 2.3.3 lands before a
merge is attempted. Weakening the test to tolerate the gap was rejected outright;
a check relaxed to fit a transient state is a check that certifies nothing.

The note is in `security.ts` itself as well as here, because the person who hits
the red suite is reading code rather than a task file.

### Sectors are slugs with a separate label table

`SECTORS` is eleven lowercase, punctuation-free members (`technology`,
`health_care`, `consumer_discretionary`, …) rather than display strings, which
is a decision rather than a default: every other vocabulary in this package has
that shape, and these values reach URLs, a database `text` column and
agent-facing text.

`SECTOR_LABELS` carries the display string. Deriving one by transform
(`health_care` → "Health Care") happens to work for all eleven today and is
rejected anyway: `"Health Care"` and `"Healthcare"` are the same slug and
different words, and a transform picks one silently. This story's own Design
surface note says the sector name is user-visible from Epic 4 onward and
expensive to rename, so eleven display strings retyped in Epic 4 and again in
Epic 6 are eleven strings that will eventually differ. It is a **name and not a
colour**, which is the line `ANOMALY_BANDS` already draws.

### The sector-to-ETF mapping is domain vocabulary, and the argument is written down

`SECTOR_ETFS: Record<Sector, Ticker>`, in `packages/shared`, following Task
2.3.1's recommendation rather than silently adopting it. The case for treating it
as data is real and is recorded in the file: it is a table of strings that
changes when the ETF set changes. It is here because Epic 5's relative-move and
Epic 4's sector rows both read it, so it is a fact both sides depend on rather
than a fact about our particular list — the same test `HealthResponse` passes and
Story 1.6's configuration type failed.

A `Record` keyed by the union rather than a lookup array, so it is **total by
construction**: a twelfth sector without an ETF does not compile. That is
acceptance criterion 3's second half held by the compiler.

The stated cost is unchanged and is Task 2.3.4's to pay: the eleven `sector_etf`
rows are derivable from this table (a `sector_etf` row's sector is the key it is
the value of), so they must be **generated** from it rather than typed twice.

### `symbol` is a `Ticker`, which gives that branded type its first real job

`Ticker` has existed since Story 1.1 with no reader outside its own tests, and
its own comment says whether a ticker is _listed_ "is a question for the security
universe (Epic 2), not for a string predicate." This is Epic 2. A raw string can
no longer reach anything expecting a validated symbol without passing through
`toTicker` or `isTicker`.

`SECTOR_ETFS`'s values go through `toTicker` as well, so a typo in one of the
eleven is a **throw at module load** rather than a symbol nothing matches — the
same startup-assertion shape `getTokens()` has in the frontend.

The cost, stated so Task 2.3.4 is not surprised by it: a curated row cannot write
`symbol: "AAPL"` and satisfy the type. Either each row wraps the symbol in
`toTicker`, or the file maps plain rows through one small constructor — which is
where a curated file should be validated anyway.

### `isSecurity` ships, and it is the `isApiError` case

The task asked which precedent applies, and it is the one that **does** check its
discriminators. `isSecurity` validates `kind` against `SECURITY_KINDS`, `sector`
against `SECTORS`, `status` against `SECURITY_STATUSES`, `symbol` against
`isTicker`, and the kind-to-sector agreement the union encodes.

`isHealthResponse` deliberately accepts a `status` it has not been taught, because
that is a value the interface _renders_ and a newer server is a version skew. None
of these three is that: Epic 4 branches on `kind`, Epic 5 keys the benchmark
lookup on `sector`, every reader filters on `status`. An unrecognised sector is
not something a client can still display — it is a security with **no benchmark**,
which is the exact failure acceptance criterion 3 exists to prevent, and admitting
it would push that failure to whatever indexes `SECTOR_ETFS` with it.

It has **two** readers rather than the one the brief named: Task 2.3.5's loader,
and Story 2.10's frontend, which receives these over the wire from Story 2.9's API
and is in exactly the position `api-client.ts` is in for `/health`.

### Provenance: the vocabulary and the field-to-group map, and nothing else

`SECURITY_FIELD_GROUPS` is `profile | classification | identity | ours`, and
`SECURITY_FIELD_GROUP` is `Record<keyof Security, SecurityFieldGroup>` — **total
by construction**, so a field added to `Security` without a group is a compile
error, the same `TS1360` guarantee the response schemas get from
`satisfies Record<keyof HealthResponse, JsonSchemaProperty>`. That is acceptance
criterion 6's "per field" half held by the compiler, and `UNIVERSE.md` §4 places
this mapping here explicitly so the loader and Story 2.14's renderer agree rather
than each deciding.

**What deliberately did not ship is a stored provenance shape** — no
`SecurityProvenance` interface with a `source` and a `retrieved_at`. Two reasons.
The columns are Task 2.3.3's, along with the `observed_at` question that task is
told to answer explicitly, and a type here would be a second description of them.
And `Security` does not embed provenance at all, because the universe file has to
satisfy `Security` and **a file checked into a repository cannot know when it was
retrieved** — the loader supplies that at load time. Story 2.9's read composes the
two.

### What "both apps compile against it" means, stated rather than manufactured

The brief warned against a fake consumer, so:

- **`apps/backend` imports it for real.** `src/schema.ts` has imported
  `SecurityKind` since Task 2.2.4 and now compiles against the three-member
  union — which is itself the change that surfaced the constraint divergence
  above.
- **`apps/frontend` has no reader until Story 2.10**, and none was invented. It
  already imports `@marketpulse/shared` (`BackendStatus`, `isHealthResponse`,
  `REQUEST_ID_HEADER`), so the package is in its type graph and `Security` is
  reachable from it; a component that renders one arrives with Story 2.10's
  security list. Criterion 1 is met by a real import on one side and by the
  package boundary on the other, and pretending otherwise would be worse than
  saying so.

### The eighteen tests, and what is deliberately not asserted

`security.ts` shipped no test from Task 2.2.4 until now, correctly — a one-member
const array has nothing to assert that the compiler does not already hold, which
is the position `feed-status.ts` and `anomaly.ts` are still in. What is worth
asserting is everything the compiler **cannot** see:

- **Both tables stay total at run time.** `Object.keys(SECTOR_ETFS)` and
  `Object.keys(SECTOR_LABELS)` are compared against `SECTORS`, so loosening the
  type to a `Partial` or an index signature later is caught rather than silently
  permitted.
- **The sector-to-ETF mapping is injective.** Two sectors sharing one benchmark
  would make Epic 5 measure both against the same thing and report the difference
  as a finding about one of them. The compiler holds totality and cannot hold this.
- **`SECURITY_STATUSES` does not contain `delisted`**, which is what makes adding
  it a deliberate act with a producer behind it (Story 2.7) rather than a tidy-up
  — the same shape `backend-status.test.ts` uses for latency.
- **`isSecurity` rejects each closed vocabulary's near-miss**: `kind: "etf"` (the
  old member), `sector: "Technology"` (the label rather than the slug),
  `status: "delisted"`, a lowercase symbol, an index proxy carrying a sector and
  an equity carrying none.

Not asserted: the count of sectors as a policy (the eleven-ness is a consequence
of the ETF set, and the mapping's totality is the real property), and anything
about how a sector is coloured or rendered, which is not domain knowledge and is
not in this package.

## Status report for a non-technical reader

**In one sentence: MarketPulse now has a single, written-down definition of what
"a security" means, and the computer enforces it.**

Up to this point the product knew how to talk to a database and how to change its
shape, but it had no opinion about what it was going to store. This task settled
that. It added no data, no screens and no database changes — it is the dictionary,
not the entries.

**What a "security" now officially is.** A ticker symbol, a company or fund name,
the exchange it trades on, what _kind_ of thing it is, which sector it belongs to,
its finer industry, whether we are currently tracking it, and a slot for the
regulatory identifier that will later connect it to SEC filings. That is it —
deliberately. There is no price, no trading volume and no anomaly score in here,
because those are things that _happen to_ a security rather than facts _about_
one, and mixing the two is how a codebase ends up with one enormous type nobody
can change.

**Three decisions worth explaining, because each of them prevents a specific
future mess.**

_First, we made the computer refuse a security with no sector._ MarketPulse's
central question is "is this move about this company, or about its whole sector,
or about the whole market?" — that comparison is impossible for a company we
never classified. Rather than trusting whoever types the list to remember, the
definition is written so that a company row **without** a sector simply does not
compile. The list cannot be built wrong. The one exception is deliberate: the
four "whole market" funds (SPY, QQQ, DIA, IWM) genuinely have no sector, and the
definition says so explicitly rather than leaving a blank that could mean either
"none" or "we forgot".

_Second, we split ETFs into two kinds rather than one._ An ETF that tracks
technology and an ETF that tracks the whole market look identical in a database
and mean completely different things on screen — one is what a company is
compared _against_, the other is what "the market did today" means. Treating them
as one thing would eventually produce a chart comparing a sector to itself. They
are now two different kinds, so nobody has to remember a rule.

_Third, we listed the eleven sectors and gave each one its benchmark fund in the
same table._ This is the quiet one, and it is the most valuable. The table is
built so that **a sector cannot be added without also naming the fund it is
measured against** — the code will not compile otherwise. That means the promise
"every sector we track has something to compare it to" is kept by the tools rather
than by a person checking, permanently and for free.

**One thing to be aware of.** The dictionary now says an ETF can be a _sector_
fund or an _index_ fund, and the database still only knows the older, vaguer word
"ETF". They are deliberately out of step for one step, and our automated checks
noticed immediately and went red — which is exactly what we built them for. The
very next task teaches the database the new words and they agree again. Nothing is
at risk in the meantime: the table is empty and nothing writes to it yet.

**Where this sits in the plan.** Epic 2 is building the foundation the whole
product stands on: a list of companies to watch, and their price history. The
managed database exists and is live; the mechanism for changing its shape safely
exists and every way it can fail has been tried on purpose; and now the vocabulary
exists. The next three steps are the database catching up with this vocabulary,
then the actual list of roughly 100 companies — which is a genuine business
conversation about which companies make the product interesting to demonstrate —
and then the program that loads them. After that, Epic 2 turns to price history,
and the product starts having something to show.
