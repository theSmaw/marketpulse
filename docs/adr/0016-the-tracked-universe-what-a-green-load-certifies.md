# ADR 0016 — The security domain model, the tracked universe, and what a green load certifies

**Status:** Accepted
**Date:** 2026-09-06
**Delivered by:** Epic 2, Story 2.3 (Tasks 2.3.1–2.3.8)

## Context

`PRODUCT_SPEC.md` §6 asks for **100–500 liquid US-listed equities plus a small number of
useful ETFs**, starting at roughly 100, with an architecture that expands without a
redesign. §42 makes the first implementation milestone "display 100 securities, receive
live price updates, calculate an explainable anomaly score, and click a security to
inspect the underlying price/volume evidence."

Story 2.2 built the mechanism by which a table arrives — plain `.sql` migrations driven
by a runner we own, forward-only, checksummed — and applied a `securities` table holding
**zero rows**. This story decides what a security **is**, chooses which ~100 of them
MarketPulse tracks, and gets them into the local and the deployed database.

**Half of this story is a product decision rather than an engineering one**, and it is
the half that quietly determines whether the rest of the epic has anything worth showing.
Five later bodies of work read this list and nothing else:

- **Epic 4** renders sector performance, which is a statement about the sector column.
- **Epic 5** computes a relative move by comparing a security against its sector's ETF,
  which needs the mapping to be total.
- **Epic 6** clusters the market topology by sector, which needs the sectors to be
  populated enough to look like clusters rather than dots.
- **Epic 7** compares a security against peers, which needs peers to exist.
- **Epic 9** maps a security to a CIK to fetch filings, which needs somewhere to put one.

So a list that is 40% technology, or that has three securities in five sectors, produces
a product whose breadth numbers are arithmetically meaningless and whose topology has
nothing to cluster. **That failure is invisible at the point it is made** — the schema
accepts it, the loader accepts it, `pnpm verify` passes — and it surfaces four epics
later as charts that look wrong for reasons nobody can attribute.

Three properties of the tree shaped the decisions below.

**A `.ts` module is inside `tsc -b`; a `.json` file is read by Prettier for formatting
and by nothing for meaning.** That is the whole argument for the universe's file format,
and it is a measurement rather than a preference.

**`packages/shared` is consumed as built output and is inlined into the frontend
bundle.** Anything put there ships to the browser unless the bundler can prove it dead.
Task 2.3.8 measured the exact boundary — see _Consequences_.

**The deployed database carries a `CanNotDelete` lock and there is no admin password.**
"Drop it and start again" is not an available recovery, which is why Tasks 2.3.2 to 2.3.6
are entirely local and 2.3.7 is the first that touches production.

## Decisions

### 1. The taxonomy is eleven GICS-_shaped_ sectors, one per sector SPDR

Not GICS itself, which is proprietary — S&P and MSCI license both the classification and
its constituent assignments. What is free is the eleven-sector _shape_, which the sector
SPDRs already imply. These are ordinary English sector names carrying no GICS data.

**The taxonomy was chosen against the ETFs rather than against familiarity**, and that is
the decision. Epic 5 measures a security against its sector's benchmark, so a taxonomy
with a sector that has no ETF produces securities with a sector and no benchmark —
classified and unmeasurable. Choosing the eleven the SPDRs already define makes the
mapping total by construction: `SECTOR_ETFS` is a `Record<Sector, Ticker>`, so the
compiler refuses a twelfth sector unless its ETF is named in the same edit.

Two limitations are stated rather than discovered later. **The sector SPDRs hold S&P 500
constituents only**, so a tracked equity outside the index has a sector, has a benchmark,
and is not _in_ that benchmark. And **eleven sectors is coarse** — see decision 12 and
the open question in _What the universe is not_.

### 2. `SECURITY_KINDS` has three members, not two

`equity | sector_etf | index_etf`. The original scope line said two (`equity | etf`) and
Task 2.3.1 widened it, because **an index proxy and a sector proxy are different things
to Epic 4 and Epic 5** and telling them apart from an `etf` flag plus a null sector is an
inference rather than a fact. One column, one source of truth, one `check` constraint.

The rejected alternative — `kind` stays `equity | etf` with a separate `etf_role` — is
recorded in `packages/shared/src/security.ts`: it makes the distinction two nullable
columns that can disagree.

### 3. `status` has exactly two members, and `delisted` is deferred to its producer

`active | untracked`. Those are the two states **this story can produce**: a security is
in the file, or it is in the database and not in the file. `delisted` is a fact about the
world that only a market-data provider can report, so it belongs to Story 2.7, which is
the first thing that can produce one. This is `API_ERROR_CODES`' own rule applied to a
third vocabulary — **a member is added by the story that can make it happen**, not by the
story that can imagine it.

Task 2.2.4 had deliberately shipped `securities.status` with no `check` constraint for
exactly this reason: the vocabulary did not exist, and a constraint written first would
have made the database the source of truth for a union five epics read from
`packages/shared`. Migration `0003_security_vocabulary.sql` added the constraint once the
union existed.

### 4. `Security` is a discriminated union, and it lives in `packages/shared`

Discriminated on `kind`. The consequence is the point: **an equity with no sector does not
compile, and an index proxy carrying one does not compile either.** Acceptance criterion 3
is therefore enforced twice — by the compiler for anything written in TypeScript, and by
the loader's validator at runtime for anything that arrives another way.

It is in `packages/shared` because both apps depend on the same fact. The **row** type is
not: `apps/backend/src/schema.ts` describes one process's transport, with `string` where
Postgres has `bigint`, and putting it in the shared package would make Kysely's
`ColumnType` helpers part of the frontend's type graph. What maps between them lives
beside the query, one function per domain type and never a generic mapper — because the
mapping is exactly where a nullable column becomes an explicit domain answer, and a
generic mapper is where that decision gets skipped.

### 5. The metadata is a curated file in this repository, and its cost is recorded rather than glossed

**Alpaca's assets endpoint does not carry sector or industry.** So the options were a
curated dataset checked into the repository, a third-party source with its own licence and
key, or deriving sector membership from ETF holdings.

The curated file is the honest V1 answer: ~100 rows, reviewable in a diff, no new
dependency, no new credential, no rate limit, and it works offline. **Its cost is that it
goes stale silently** — a company changes sector, a ticker changes, a security delists,
and nothing in this repository notices. That is a gap of this repository's third kind: a
stated invariant nothing checks.

What partially mitigates it is decision 6.

### 6. Provenance is a source and a retrieval timestamp per **field group**, not per field and not per row

Two groups, `profile` and `classification`, giving four columns:
`profile_source`, `profile_retrieved_at`, `classification_source`,
`classification_retrieved_at`. Per-row is too coarse to answer invariant 6's question —
"where did this come from?" — when a row's name comes from one place and its sector from
another. Per-field is eighteen columns for a distinction nobody makes.

**The retrieval timestamp is the FILE's own stated date and never `now()`**, and this is
the load-bearing half. `UNIVERSE_PROVENANCE.checkedOn` lives beside the rows in
`apps/backend/src/universe.ts` and the loader copies it. Using `now()` would make the
column mean "when the loader last ran", which is always today, which makes it permanently
silent — destroying the one mitigation decision 5 has against silent staleness.

The consequence is deliberate and stated: **adding a symbol does not move `checkedOn`.**
The date means the whole list was checked against a source, and moving it for one addition
claims a hundred verifications that did not happen. So a newly added row's provenance
_understates_ its freshness, which is the safe direction.

**Nothing can enforce that `checkedOn` is moved when somebody actually re-checks**, and
nothing can stop somebody moving it while tidying. That is unavoidable — whether a person
read a fund's fact sheet is not a fact any tool here can observe — and it is written in
three places rather than one.

### 7. The universe is a `.ts` module, not JSON, and not a database-only fact

`apps/backend/src/universe.ts`, typechecked against `Security`. Two measurements decided
it. A data file is **invisible to `tsc`**, so an equity with no sector or a sector outside
the taxonomy would be a runtime failure rather than a compile error. And a data file is
**absent from `dist/`** and therefore from the container image, which matters because
Task 2.3.7 had to decide whether the image could seed itself.

It lives in `apps/backend` rather than `packages/shared` because it is data the backend
loads, not a contract both apps share. The frontend will learn the universe by asking the
backend (Story 2.4), not by importing a list.

### 8. Loading it is a seed script and not a migration

`pnpm universe` over `scripts/load-universe.mjs` over `apps/backend/src/load-universe.ts`
— the same shape `pnpm migrate` has, and for the same reasons: the mechanism sits in
`src/` so it is typechecked, linted and testable, and the script is a thin wrapper that
owns the name and the exit code.

**The distinction is mechanical rather than stylistic.** A migration runs once, is
recorded, and — since Task 2.2.7's checksum — is _refused_ if edited afterwards. So data
in a migration cannot be corrected without a second migration. The universe's acceptance
criterion says re-running the load is idempotent, and **"idempotent" here has to mean
"picks up an edited list"**, which a migration structurally cannot do, rather than "does
nothing the second time", which a migration does trivially and uselessly.

It is a **separate command and not a phase of `pnpm migrate`**, because the two mean
different things by idempotent and a red result has to say which one failed.

### 9. Idempotent means CONVERGES ON THE FILE, which is an upsert on `symbol`

`insert … on conflict (symbol) do update … where` a row comparison. The `where` clause is
the load-bearing half: `updated_at` has no trigger, Task 2.2.4 recorded that maintaining
it is the writer's obligation, and a bare `set … updated_at = now()` would move all 101
rows on every run — making the column mean "when the loader last ran" and destroying the
same signal decision 6 protects. Measured: removing that clause takes two database tests
red.

### 10. A symbol removed from the file is marked `untracked` and KEPT — never deleted

This is the decision Epics 4 to 7 and Epic 13 inherit, and both alternatives were
**produced rather than argued**.

`DELETE` was rejected because Story 2.8's `market_bars` hang off `security_id`, and Epic
13 replays a date on which the security _was_ tracked. Deleting the row either cascades
away real history or fails on the foreign key. Produced in a scratch database: under the
rejected `DELETE`, a removed-then-re-added `GILD` came back on a **new id**, where the
shipped answer keeps its **original id and its original `recorded_at`**. That contrast is
what makes the id check evidence rather than a trivial pass — under the chosen answer the
row never leaves the table, so its key surviving proves nothing on its own.

Refusing the load was rejected because removing a symbol is an ordinary editorial act.

**The re-add needed no code.** `status` is in the upsert's `is distinct from` comparison,
so a file saying `active` over a row saying `untracked` is simply a row that changed.

**A steady state writes nothing**: an already-untracked row keeps its `updated_at`
byte-identical and the loader reports `already untracked` rather than shouting the removal
paragraph forever — because an output nobody reads is how the _next_ removal goes
unnoticed.

**The cost is stated: `status` is the one invisible predicate this schema has.**
`UNIVERSE.md` §12.2 names all seven future readers and the rule — **filter on it when
computing over the market we track NOW, never when showing or replaying something we
STORED** — with **Epic 13's replay called out as the one that must not filter**, because a
security untracked today was tracked on the date being replayed. That is invariant 4's
failure arriving through a column rather than through a timestamp, and it is the single
most expensive thing in this story to get wrong.

### 11. The validator refuses a bad universe as a SET, before opening a connection

`validateUniverse` takes the list as a **parameter** rather than importing it, which is
what lets the fast suite hand it broken fixtures — two of its checks are vacuous against
the shipped file, so they were made to fail against hand-built lists rather than watched
passing.

It reports **every** violation in one run rather than the first, and it runs **before the
pool is built**, so a refused universe never opens a connection at all.

**One premise this story started from is corrected: a duplicate symbol is not invisible
to the database, it is invisible ACROSS STATEMENTS.** Measured with the check disabled:
both copies in one `insert` are refused outright (`21000`, _"ON CONFLICT DO UPDATE command
cannot affect row a second time"_), which is what happens at 101 rows. Split across chunks
it printed `✓ 102 securities in the universe` at **exit 0** over a table holding 101. So
the database's protection there is a property of the list being small, and it disappears
past ~5,461 securities or the first time anybody changes the batching.

### 12. The selection rule is a floor of 6 and a ceiling of 12 equities per sector

Written down **before** the list, so the list can be regenerated rather than only edited.
The floor exists because a breadth number over three securities is noise; the ceiling
exists because the naive "top 100 by market cap" list is roughly 40% technology, which
makes "the market is down" and "technology is down" the same sentence.

The list met the rule without the rule moving: **floor and ceiling hit exactly**, and the
largest sector is **14.0%** of the equities.

### 13. Nothing anywhere encodes the count

No `EXPECTED_COUNT`, no asserted array length, no page size, no constant that would have
to change to reach 500. `UNIVERSE.length` is the only way to learn it. That is what makes
"expands to 500 without redesign" a property of the code rather than a promise — and it is
demonstrated by **absence**, checked by grep, rather than by loading 500.

### 14. The deployed load is a step in `deploy.yml`, and it runs on EVERY deploy

Immediately after the migration step and before either half of the code rolls.

**Boot-time seeding was genuinely available here** — unlike migrations, where Task 2.2.7
killed it because the image carries `dist/migrate.js` and not `apps/backend/migrations/`.
Measured on the shipped files, `dist/universe.js` and `dist/load-universe.js` are **both**
in the image, so it carries the data _and_ the mechanism.

It is rejected on an argument that did not exist before decision 10. The loader now writes
rows it did not insert; a boot-time seed runs on **every replica start**; and during a
rollout two revisions carry different `universe.ts` files — so an old replica booting
would untrack a symbol the new file just added while the new one sets it `active`, and
**which value survives depends on start order**. A flip-flop against production with
nothing recording it, and unreachable from a step that runs once with one file.

**Every deploy rather than run-once**, because run-once would make editing `universe.ts` a
change that ships nowhere. Two of the three arguments against that do not survive
measurement: a no-op run writes nothing (**zero rows where `updated_at <> recorded_at`,
and exactly one distinct `updated_at` across all 101** — stronger than the counters' own
report), and the Consumption plan's idle-billing condition does not apply, because that is
a property of the container app's replica and this step talks to Postgres from a runner.
The third — a step nobody reads — is real, and what stands against it is the three
counters, where `0 inserted, 0 updated, 101 unchanged` is the line saying the file and the
database agree.

It connects as **`marketpulse-github-deploy`**, not as the backend — forced rather than
chosen, because Task 2.1.6 measured that a service principal cannot mint a Postgres token
for another principal's role.

## Rejected, with reasons and reversal triggers

| Rejected                                                 | Why                                                                                                                                                                                                                                         | Reversal trigger                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| A provider-backed metadata fetch                         | Alpaca carries no sector or industry, so it would be a _second_ provider with its own licence and key, for ~100 rows that change a few times a year                                                                                         | Sector data becoming wrong often enough that a human notices before a story does |
| A Postgres `enum` for `kind`/`status`                    | Produced in Task 2.2.3: inside one transaction — which is what a migration is here — adding an enum value **and using it** is refused outright, so "add `etf` and backfill" cannot be written at all; and removing a value has no operation | None. `text` + `check` is strictly better here                                   |
| Deriving sectors from ETF holdings                       | A network call, a licence question, and holdings churn — for a fact that is stable                                                                                                                                                          | A curated file that has drifted badly enough to be untrustworthy                 |
| `DELETE` on removal                                      | Bars hang off `security_id`; Epic 13 replays dates on which the security was tracked. Produced: the re-added row gets a **new id**                                                                                                          | None foreseeable                                                                 |
| Refusing a load that would remove a symbol               | Removing a symbol is an ordinary editorial act                                                                                                                                                                                              | None                                                                             |
| Boot-time seeding                                        | Two revisions carry different lists during a rollout, so the outcome depends on replica start order                                                                                                                                         | A deploy shape with no overlapping revisions                                     |
| A migration for the universe                             | "Idempotent" has to mean "picks up an edited list"; a migration is refused if edited after being applied                                                                                                                                    | None                                                                             |
| JSON for the universe file                               | Invisible to `tsc`, and absent from `dist/` and therefore from the image                                                                                                                                                                    | None                                                                             |
| An `EXPECTED_COUNT` constant                             | It is the thing that would have to change to reach 500                                                                                                                                                                                      | None                                                                             |
| A check that the seven `status` readers filter correctly | None of those readers exists yet, so it would assert the shape of an empty set                                                                                                                                                              | Two or more of them existing                                                     |
| A drift detector on the deployed rows                    | A thing that watches production on a timer is uptime monitoring, declined with a stated reason by Tasks 1.13.5 and 2.1.7                                                                                                                    | Uptime monitoring gaining an owner                                               |

## Consequences worth stating separately

### `packages/shared` is inlined into the frontend bundle, and a vocabulary's DECLARATION decides whether it ships

This story shipped no `apps/frontend` file and **moved the frontend artefact by 115
bytes** — 348,135 B to **348,250 B**, 278 modules to 279. Task 2.3.8 found it by
fingerprinting rather than by assuming, and confirmed it by rebuilding Story 2.2's close
commit, which reproduces 348,135 B exactly.

The mechanism is not the obvious one. `SECURITY_KINDS`, `SECTORS` and `SECURITY_STATUSES`
are plain `as const` array literals and are tree-shaken out **completely** — a grep of the
bundle for `sector_etf`, `untracked` or any sector name returns **zero**. But
`SECTOR_ETFS` is built by **calling `toTicker()` eleven times**, and a call expression is
something the bundler cannot prove side-effect-free, so it retains the eleven calls while
dropping the object they build.

That is Task 1.7.7's _"a module can join the graph and cost nothing"_ arriving with its
counter-example: **a module can join the graph and cost exactly its function calls.**

The 115 bytes were deliberately **not** removed. They are trivial, and sector-ETF tickers
are shared domain vocabulary Story 2.4 may well want anyway. What matters is the rule:
**a vocabulary declared as a literal is free to the browser and one declared through a
constructor is not.** `/* @__PURE__ */` is the lever, and the reversal trigger is a
vocabulary large enough to see, or anything backend-only reaching `packages/shared`.

### The type, the validator and the deployed database are aligned, and NOTHING checks that they stay aligned

Task 2.3.7 tried to produce a mid-transaction database refusal and could not. `0003`
mirrors every constraint on `securities` in the discriminated union, so **nothing the
compiler accepts is rejected by the deployed database** — the single exception being a
duplicate symbol, which the validator catches first. The reachable deployed failure classes
are therefore exactly two: a refused universe, and an unreachable database.

That is a genuinely good property and it is **an unchecked invariant of this repository's
third kind.** It stops being true the moment a column is added to a migration and not to
`Security`, or a `check` is widened on one side only. The symptom would be a load that
passes `pnpm verify`, passes `pnpm test:database` against a database built from those same
migrations, and fails **in the deploy step against production** — the one environment where
a red result costs something.

### The first run of a clean clone is five steps, and the last two have no symptom if skipped

`pnpm install` → `pnpm build` → `pnpm db` → `pnpm migrate` → `pnpm universe`.

An unmigrated database and a migrated one holding zero securities both **tick in
`pnpm ready`, pass `pnpm verify` and serve `pnpm dev`**. Nothing anywhere reports the
absence, because nothing reads the table yet. Story 2.4 is the first thing that would
notice.

### A clean clone does not get a clean database

`compose.yaml` declares a fixed Compose project name, so a second checkout's `pnpm db`
attaches to the same container and the same volume. `pnpm db down -v` is what empties it.
That is the right default — one Postgres per machine rather than one per checkout — and it
is recorded because it makes "verify from a clean clone" mean less than it looks like it
means for anything database-shaped.

### An upsert consumes an identity value per row per run, whether or not anything changed

Locally: `securities_id_seq.last_value` read **404** after four runs of 101 against
`max(id)` **101**. Deployed, the sequence moved **406 → 507** across the CI load. Ids are
stable and the sequence runs ahead of them. Nobody can act on a gap in a surrogate key, so
this is recorded rather than fixed — but anything that ever reads `last_value` as a row
count will be badly wrong.

## What a green load certifies

1. **The file was read, parsed and validated as a set** — every equity and sector proxy
   has a sector, every sector present has a sector ETF, and no symbol appears twice.
2. **The database now holds exactly what the file says**, for the columns the loader
   writes. Re-running changes nothing: zero rows where `updated_at <> recorded_at`, and
   one distinct `updated_at` across all 101.
3. **Every constraint on the table was satisfied** — the three `check` constraints, the
   unique index on `symbol`, and every `not null`.
4. **A symbol dropped from the file was marked `untracked` and kept**, with its `id` and
   its `recorded_at` intact, and so was everything stored against it.
5. **The write was one transaction.** A refused universe leaves the table byte-for-byte as
   it was — verified by fingerprint before and after every deliberate break.
6. **The provenance columns carry the file's own stated date**, so Story 2.14 can render
   "where did this come from, and when was it last checked" without reading the loader.

## What a green load CANNOT certify

1. **That any sector is still correct.** The file is curated and goes stale silently.
   Nothing in this repository fetches a second opinion, and `checkedOn` is a claim a human
   makes rather than a fact a tool observes.
2. **That any symbol still trades.** A delisted security loads exactly as happily as a
   listed one. `status` has no `delisted` member yet, because nothing here can produce one
   — Story 2.7 is the first thing that can.
3. **That the list is a GOOD list.** The selection rule is checked by a human reading a
   distribution, not by an instrument. Nothing would notice a universe that met the floor
   and the ceiling and was still uninteresting.
4. **That any name, exchange or industry string is accurate.** They are typed as `string`
   and validated for presence, not for truth.
5. **That the seven `status` readers filter correctly.** None of them exists yet.
   `UNIVERSE.md` §12.2 is the durable copy of the rule and no instrument can hold it —
   **Epic 13 filtering on today's `status` would silently rewrite history**, and that is
   the most expensive failure this story makes possible.
6. **That the type, the validator and the deployed schema are still aligned.** See
   _Consequences_. They are today; nothing checks tomorrow.
7. **That the database still matches the file.** The load converges **at the moment it
   runs**. A hand-edited production row stands until the next deploy corrects it, and
   nothing detects drift in between. That is the design working rather than a hole, but
   "the file was applied" and "the database matches the file now" are different claims.
8. **That the local pin and the deployed engine version agree.** Still compared by hand,
   still a gap of the third kind, and still not closable inside `pnpm verify`, which
   deliberately has no Azure credentials.

## What the tracked universe IS

- **101 securities**: 86 equities, the 11 sector SPDRs, and 4 index proxies.
- **A product decision**, taken against a written rule, reviewable in a diff, and changed
  by editing one file and running one command.
- **The complete input to Epics 4, 5, 6, 7 and 9.** Every sector chart, every relative
  move, every topology cluster and every peer comparison reads this and nothing else.
- **Total over its own taxonomy**: every sector present has a benchmark, enforced by the
  compiler and re-checked by the validator.
- **Provenance-carrying**, per field group, with a date that means what it says.

## What the tracked universe is NOT

- **Not a settled count.** 101 is **provisional and the sizing is PARKED**, and this ADR
  does not close it. `UNIVERSE.md` §10 parks it on a measurement **Story 2.7** owns —
  whether Alpaca's free tier exempts minute bars from its 30-channel cap, which two of
  their own pages disagree about — because if it does not, 101 is already over the cap.
  **The deadline is Story 2.8, not 2.7**: nothing encodes the count, so re-sizing costs one
  file edit until bars exist, and a re-backfill afterwards.
- **Not a taxonomy anybody should be comfortable with yet.** The _industry_ taxonomy is
  finer than GICS's own industry-group level on a universe a fraction of the size: **45
  industries across 86 equities, 51% of them singletons**, and §11's own worked example of
  "82% of semiconductor securities" is arithmetically unreachable below 11 constituents
  against our deepest group of 8. **This is not parked** — coarsening it needs no new data
  and no provider answer, and it is actionable now.
- **Not a watchlist.** There is no user-editable universe in V1 (§37).
- **Not evidence of anything about prices.** No bar, no quote, no trade. Stories 2.7 and
  2.8 own all of it.
- **Not proof that the architecture expands to 500.** That is an **argument** — no
  encoded count, one statement up to 5,461 rows, ~20 years of storage headroom at 100 and
  ~4 at 500 — and it has never been executed. Loading 500 would test it; nothing has.

## What this story hands forward — and which parts are properties rather than claims

**Properties**, demonstrated:

- A symbol list every later story iterates, in the local and the deployed database, with
  the two byte-identical (`ee27fda0…` on both).
- One command that converges the database on the file, idempotent, refusing a bad list
  without opening a connection.
- Removal semantics with the id preserved across a remove/re-add round trip.
- A deployed load that runs on every merge, proved by its first real execution on `main`.

**Claims**, argued but not executed:

- That the architecture expands to 500 without redesign.
- That the seven `status` readers will filter correctly.
- That `checkedOn` will be moved when, and only when, somebody re-checks the list.

## Measured

Every figure below was taken by Task 2.3.8 against the shipped tree, from a clean clone
where a clone is the honest place, and re-taken rather than cited.

|                                       |                                                                                                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Universe                              | **101** — 86 equity, 11 sector_etf, 4 index_etf                                                                                                                                      |
| Equities per sector                   | technology 12, health_care 9, financials 9, consumer_discretionary 9, industrials 8, communication_services 7, consumer_staples 7, energy 7, materials 6, real_estate 6, utilities 6 |
| Selection rule                        | floor 6 and ceiling 12, both hit **exactly**; largest sector **14.0%** of equities                                                                                                   |
| Industry depth                        | 45 distinct, deepest `Semiconductors` at 8, 51% singletons                                                                                                                           |
| Clean clone                           | 417 packages; **419 store entries / 285,008 KB / 4,766 lockfile lines** — reproduces Story 2.2's baseline exactly, which is the check, because this story added no dependency        |
| Install scripts                       | `esbuild@0.28.2` and nothing else                                                                                                                                                    |
| `pnpm verify`                         | exit 0 in **33.21 s** cold from the clone; **27.0 s** warm with a database and **27.0 s** with none                                                                                  |
| `pnpm test`                           | **287** (55 + 129 + 103), no database needed                                                                                                                                         |
| `pnpm test:process`                   | **14**                                                                                                                                                                               |
| `pnpm test:database`                  | **55** across 2 files in 939 ms; **exit 1** with no database, not skipped                                                                                                            |
| Local load                            | 3 migrations in **0.504 s**; 101 inserted in **0.329 s**; re-run `0 / 0 / 101`                                                                                                       |
| Idempotence                           | **one** distinct `updated_at` across 101 rows; **zero** rows where `updated_at <> recorded_at`                                                                                       |
| Refusals                              | unclassified equity → exit 1 naming it; missing sector ETF + duplicate → **3 problems in one run**, exit 1; table fingerprint identical before and after all three                   |
| Add / remove / re-add                 | add `1 inserted`; remove → `untracked`, **id 34 and `recorded_at` preserved**; re-add → `1 updated`, **same id 34, same `recorded_at`**; steady state writes nothing                 |
| Deployed                              | 101 rows, all `active`, 86/11/4, distribution identical to local                                                                                                                     |
| Local vs deployed                     | shape fingerprint **`ee27fda00f3fc6838b054b285630c19c`** on both                                                                                                                     |
| Migration checksums                   | `cdebe2ea…` / `8a944594…` / `b52847a2…`, identical across the local database, the deployed database and `shasum -a 256` of the files                                                 |
| Engine                                | PostgreSQL **18.6** local and deployed                                                                                                                                               |
| First `main` run of the universe step | deploy run `33975545926`, **`0 inserted, 0 updated, 101 unchanged`**, exit 0                                                                                                         |
| That step's cost                      | **2 s** wall, of which the loader is **0.428 s** — against ~3 s from a laptop across the Pacific                                                                                     |
| Frontend artefact                     | **348,250 B** `1a92544a…` + 12,128 B `134d5dd8…` + 1,101 B `bcb28338…` + 300 B = **361,779 B**, 279 modules                                                                          |

## Related

- `docs/adr/0015-*` — the migration mechanism this story's schema arrived through.
- `docs/adr/0014-*` — the managed database and the credential path.
- `planning/epic-02-security-universe-historical-data/story-03-security-domain-model-and-tracked-universe/UNIVERSE.md`
  — the full record: the taxonomy, the selection rule, the distribution, the sizing
  question, the loader's decisions, the removal semantics and the deployed load.
- `apps/backend/migrations/README.md` §7 — seed data versus migrations, which is what this
  story read to decide.
