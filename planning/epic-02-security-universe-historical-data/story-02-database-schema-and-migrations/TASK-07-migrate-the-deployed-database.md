# Task 2.2.7 — Migrate the deployed database, and decide what a failed migration does to a rollout

**Status:** Complete — 2026-09-05
**Story:** [2.2 Database Schema & Migration Mechanism](STORY.md)
**Depends on:** Task 2.2.6 (complete — eight failure classes produced against a real
PostgreSQL 18.6, which is what decides this task's shape). Note also that Task 2.2.5 named
**this** task as the reversal trigger for the migration checksum it declined to build: from
here onward "drop it and re-migrate" stops being an available answer, which is the argument
that would reverse the decision — and **2.2.6 turned that argument into a produced failure**,
so the decision below is taken against evidence rather than against a hypothesis

## Objective

Get `securities` into the managed database by the chosen mechanism, observed rather than
assumed, and settle where that happens relative to a deploy.

## Work

- **One fact narrows the three shapes before you weigh them, and Task 2.2.2 handed it over
  deliberately rather than letting it be discovered here.** `apps/backend/package.json`'s
  `files` field is `["dist", "!dist/**/*.test.*"]`, so `pnpm deploy` — and therefore the
  container image — carries `dist/migrate.js` and **not** `apps/backend/migrations/`. The
  mechanism ships and the migrations do not. So "a job the container runs at boot" is not
  free: it needs `migrations` added to `files` in the same commit, which puts the SQL into
  every image and makes the image's contents a thing this story changed. "A step in
  `deploy.yml`" needs no such change, because the runner runs from a checkout. That is a
  cost to weigh rather than a decision already taken, and it must not be found out by a
  rollout failing on a missing directory. **Task 2.2.4 sharpened that into something worth
  saying out loud when the shapes are weighed**: `apps/backend/src/schema.ts` compiles into
  `dist/` and therefore _does_ ship, so the image currently carries a **description of the
  schema** and not the schema itself, and nothing inside it can create the table it
  describes. Harmless while nothing queries, and the clearest possible statement of why the
  boot-time shape needs the `files` change rather than merely benefiting from it
- **Two migrations at once is settled, and the answer changes what the boot-time shape
  costs.** Task 2.2.6 established it rather than assuming it: Kysely's Postgres adapter takes
  a **session-level `pg_advisory_lock(3853314791062309107)`** — a hard-coded id, read out of
  its own adapter — with `lock_timeout` set to **one hour**. Two `pnpm migrate` processes half
  a second apart against one database put the second in `pg_stat_activity` as
  `wait_event_type: Lock`, `wait_event: advisory`; it waited, then correctly reported
  `Already up to date` and exited 0. **The lock is per-database**, and **a failing first
  runner does not poison the second** — run 1 failed after six seconds, run 2 took the lock,
  ran the same migration itself and also exited 1, so both report the failure and neither
  reports success. That is the answer to "two overlapping deploys", which Task 1.11.6 already
  proved happens: two merges 95 s apart produced two deploy runs, handled with a concurrency
  group rather than by luck. **So overlap is safe and _hanging_ is the exposure**, and it
  falls unevenly across the three shapes. A **`deploy.yml` step** that waits on the lock waits
  up to an hour before erroring rather than failing fast, so the step needs **its own
  deadline** rather than relying on the lock's — the same lesson Task 1.11.7 learned when a
  300-second revision-wait expired four minutes too early to ever match the failure it was
  watching for. A **boot-time job** is worse and the interaction is specific: Task 2.1.7 read
  the startup probe off the live app as 2 s period / 3 s timeout / 30 failures, so a replica
  waiting on a migration lock is killed at roughly **90 seconds** — long before the lock's own
  hour — and a rolling revision that briefly runs two replicas is exactly what produces the
  wait. Weigh that with the `files` cost above rather than separately
- **Choose between the three shapes, and choose on the failure rather than the happy
  path.** A **step in `deploy.yml` before the container rolls** means a migration that
  succeeds and a deploy that then fails leaves a database ahead of the code — which is the
  survivable direction if migrations are additive and is not if they are not. A **job the
  container runs at boot** puts DDL on a liveness-probed platform at `minReplicas: 1`,
  where Task 2.1.7 established that an unready replica is not a degraded service, it is
  **no** service — and a migration that hangs is a replica that never comes up. A **manual
  command** is honest, has no failure mode nobody chose, and is a step somebody forgets.
  Write the answer to "the migration succeeded and the deploy then failed" for whichever
  is chosen, because that sentence is the decision
- **Connecting at all is solved, so do not re-solve it — the open question is _as whom_.**
  Task 2.2.1 measured that Kysely's `PostgresDialect` takes an existing `pg.Pool`, and
  re-took Task 2.1.4's credential measurement through it: three concurrent queries on a cold
  pool of three produced **three** credential calls and three more on the warm pool produced
  **none**. So a migration that builds its pool through `createDatabasePool` gets the Entra
  token path, TLS `verify-full`, the `pool.on("error")` handler and the connection deadline
  for free, and `DATABASE_AUTH=entra` needs no new token code anywhere. **Task 2.2.2 built
  exactly that** — `runMigrations()` calls `createDatabasePool(config.database, …)` and reads
  its address from the same `loadConfig()` every other script does — so this is confirmed
  rather than expected, and it removes the mechanical half of this task and leaves the half
  below, which is the part with a decision in it. **Two consequences of that reuse worth
  knowing before choosing an identity.** The pool sets `application_name` to
  `marketpulse-backend`, so a migration connection appears in `pg_stat_activity` as the
  runtime service — which is harmless if they are the same principal and actively misleading
  if the bullet below chooses a separate one, in which case the name has to move into the
  pool's configuration rather than staying a constant. And the pool carries `POOL_MAX: 10`
  against roughly 25 genuinely free connections, which is fine for one migration and is a
  number to notice if a migration ever runs beside a rolling replica
- **Answer who the migration connects as, which is this task's real work.** The deployed
  server is **Entra-only**, `passwordAuth` is `Disabled` and `administratorLogin` is
  `null`, so there is no connection string with a password in it anywhere. Three identities
  exist and none of them is obviously the right one: the backend's system-assigned managed
  identity, which holds the `marketpulse-backend` role created by a manual
  `pgaadauth_create_principal` call that exists in no file in this tree; the GitHub
  federated identity `marketpulse-github-deploy`, which is an Azure principal with
  **no Postgres role at all**; and the Entra administrator, which is a human. **Least
  privilege argues for a migration identity that is not the runtime identity** — the
  backend should not hold DDL rights on the table it reads — and the cost of that is a
  second principal, a second `pgaadauth_create_principal` call, and a second entry in the
  category of platform state no file here records. Whatever is chosen, the grants are
  written down beside the role, because Task 2.1.5 already learned that a bootstrap
  statement living only in a shell history is the thing a `CanNotDelete` lock exists to
  protect
- **Establish whether the runner can reach the database at all, before designing around
  the assumption that it can.** Networking is public access with the "allow all Azure
  services" rule — which Microsoft's own words say includes _"connections from the
  subscriptions of other customers"_ — plus a `developer-laptop` rule pinned to one IP that
  has already been recorded as a standing hazard because a developer's IP moves. A GitHub
  runner is neither of those two things by construction, and whether it is covered by the
  Azure rule is a question to **measure** rather than reason about. If it is not, the
  options are a firewall rule per run, which is a write to platform state from CI, or a
  shape that does not connect from CI at all — and that discovery would change the choice
  above, which is why it comes before committing to one
- **Note what the first deployed migration actually does, because it is smaller than it
  sounds and that is the reassuring half.** Task 2.2.4 shipped `securities` with **no seed
  data**, so what reaches the managed server is a `CREATE TABLE` against an empty schema and
  nothing else: no backfill, no rewrite, no lock on a table anything reads, and no data a
  failed run could damage. This is the cheapest first DDL this project will ever run against
  something carrying a `CanNotDelete` lock, which is an argument for doing it now rather than
  for treating it as routine
- **Apply it and read the result off the managed database**, which is acceptance criterion
  3: connect, read the schema back, confirm it matches the local one column for column, and
  confirm the tracking table records what it should. **Task 2.2.4 did that reading locally
  and it is worth copying rather than re-inventing** — `information_schema.columns` for
  names, types, nullability and defaults, then `pg_constraint` for the check and the unique
  constraint — with one trap it found that bites harder here than it did there:
  **`column_default` is `null` for an identity column** (`is_identity` is `'YES'`), so a
  comparison written against the default concludes there is no identity and finds nothing
  wrong. Read nullability from `information_schema` rather than by counting `pg_constraint`
  rows, because PostgreSQL 18 materialises `NOT NULL` as named constraint rows where older
  majors do not — which makes that count a statement about the engine version rather than
  about the schema. **There are THREE engine pins now and exactly one pair of them is compared**, which changes
  what this bullet is asking for. Task 2.2.5 added a `postgres:18` service to CI and, rather
  than leaving a second silent pin, made a step compare it against `LOCAL_DATABASE_VERSION`
  in `scripts/local-database.mjs` — so local-versus-CI drift is now a red job naming both
  numbers. **The deployed pin is still compared by nothing**, and it is the one whose drift
  has the "works locally, wrong in production" symptom the whole arrangement exists to
  prevent. A check for it stays refused for the reason it always was — it needs Azure
  credentials `pnpm verify` deliberately does not have, so building one forks the definition
  of "verified" — which makes **this task the cheapest place it will ever be taken by hand**,
  since it is already connected to both. Record the number rather than the fact that it
  matched. Task 2.1.5's operator-connection
  traps apply — `psql` from a laptop cannot do `verify-full` where Node can, because the
  container has no CA store, and `pnpm db exec` **echoes its arguments**, which is how a
  live bearer token was printed into a terminal once already
- **Take the checksum decision explicitly, because this is the task the trigger names and
  2.2.6 removed the last reason to defer it again.** 2.2.5 declined a stored hash and recorded
  why; 2.2.6 then **produced the consequence** rather than arguing it. An index appended to an
  already-applied `0002_securities.sql` took `pnpm migrate` to `Already up to date` at **exit
  0** with the index absent, and `pnpm test:database` to **23 passed** at **exit 0**, because
  that suite migrates a database of its own from empty and never looks at the one that is
  wrong. Two green instruments over a broken database, and **the only recovery that worked was
  dropping it and re-migrating** — which is precisely what a managed server with a
  `CanNotDelete` lock does not offer. So the question here is not "should we add a checksum"
  in the abstract; it is: **once production exists, a file edited after it was applied is a
  divergence no instrument reports and no command repairs.** Decide, and if the answer is to
  keep deferring, say what the deployed recovery actually is — hand-written SQL against a
  locked server, which is worth writing down before somebody needs it at speed. If the answer
  is to build it, it is a change to the provider and `migrate.ts` and belongs in this task
  rather than in a ninth one, since it is the same commit that first makes it matter. One
  thing it must not be confused with: **a pending-list would not have caught this** — the
  migration was recorded, so nothing was pending — which is worth stating in the bullet below
  before a dry run gets adopted as though it closed this
- **Note that a database-backed suite now exists, and decide out loud whether any of it
  points here.** `pnpm test:database` creates its own database, migrates it and drops it —
  which is exactly the thing a deployed server must never let anything do, and the suite is
  local-only by construction: it uses plain `pg` rather than `createDatabasePool`, so it has
  no Entra path at all. That asymmetry is deliberate and should stay. The question worth
  answering rather than assuming is the narrower one: **after the deployed migration runs, is
  there anything worth asserting against the deployed schema, and if so does it belong in
  `e2e/specs-deployed/` rather than here?** Task 1.13.5's precedent is the shape — a
  post-deploy check that gates nothing and whose output is a rollback decision — and the
  honest default is probably no, because a schema is not a user-visible surface and Task
  2.1.7 already declined to put the database behind `/health`. Say which, with the reason
- **Take the leak check on the new surface.** A migration runner logs SQL, and a
  connection failure quotes a DSN. Story 2.1's leak check is clean in four places —
  repository, built output, log destination and terminal echo — and this task adds a fifth
  producer of all four. Confirm no credential reaches Log Analytics, and confirm the
  deployed `secrets` array is **still `null`**, which has now been read back twice and is
  ADR 0011's claim that this epic keeps confirming rather than expiring
- **Know what a red step will actually print, because 2.2.6 measured it and it is less than
  you would expect.** The message names the **migration** and does **not** name the statement:
  the whole file body is one `sql.raw()` call, so a syntax error carries a `position`
  character offset and **every execution error carries none** — only SQLSTATE and
  PostgreSQL's internal `routine`. The error also carries a `line` field that is
  **PostgreSQL's own C source line**, not a line in the migration, which is a trap worth not
  falling into at speed. Both failure branches were confirmed to say the true thing about what
  was left behind, including the one where `results` is `undefined`. So a red deployed
  migration tells you which file and which SQLSTATE, and you read the file yourself
- **Watch the deploy that carries it.** Whatever shape is chosen, run it for real and
  record the ordinary numbers: how long the migration step takes, what the run summary says,
  and whether a running page notices anything — Task 1.12.7 measured a full pipeline deploy
  of both halves as invisible to a polling page, and a schema change on a database no route
  reads should be at least as quiet. If it is not, that is the finding
- **Note what the runner deliberately does not offer, and decide whether the chosen shape
  needs it.** `pnpm migrate` refuses arguments — there is no `down`, no "migrate to `0003`",
  no dry run and no "list what is pending". That was right for a local command and it is
  worth re-taking here rather than inheriting, because a deploy step that cannot say what it
  is about to apply is a deploy step nobody can review in advance. If a pending-list is
  wanted, it is a small addition to the existing runner (`migrator.getMigrations()` already
  returns each migration's executed state) and it belongs in this task rather than in a new
  one; if it is not wanted, say so, because the next person will ask
- **Write down what a red migration means for a rollback.** Task 1.11.7's asymmetry still
  holds — the backend rolls back in 43 s with `az containerapp update --image <digest>` and
  is silently undone by the next merge, the frontend takes a 3 min 42 s revert commit — and
  a database is a third thing that rolls back like neither. Say so in the run summary,
  where `deploy.yml` already writes its rollback table, rather than only in a task file

## Done when

- The deployed database holds `securities`, verified by reading it back
- The migration ran through the chosen mechanism rather than by hand, or the manual shape
  was chosen deliberately and its forget-mode stated
- The identity it connects as, and its grants, are recorded where the next person will find
  them — including anything that exists only in the platform
- Whether a CI runner can reach the database is a measurement
- "The migration succeeded and the deploy then failed" has a written answer
- The chosen shape has a **deadline of its own**, or the reason it does not need one, given
  that the advisory lock's own timeout is an hour
- The checksum decision is **taken** rather than deferred a third time, and if it is deferred
  again the deployed recovery for a divergence is written down
- No credential appears in the repository, the built output, the log destination or a
  terminal, checked rather than assumed
- The `secrets` array is read back and reported

## Notes

This is the half of the story that gets skipped and then hurts — the story says so
directly. It is also the first task in this epic to write DDL to something with a
`CanNotDelete` lock on it, and the reason that lock exists is not the data, which is all
re-derivable from Alpaca: it is the backups and the bootstrap that exist in no file here.

---

## What was done

**The deployed database holds `securities`, migrated from a GitHub Actions runner as
`marketpulse-github-deploy`, and the checksum decision was taken rather than deferred a
third time.**

### The shape: a step in `deploy.yml`, before either half of the code rolls

The other two were weighed and the arguments are written beside the step. A **boot-time
job** needs `migrations` added to `apps/backend/package.json`'s `files` — putting SQL in
every image — and puts DDL on a liveness-probed platform where the startup probe (2 s
period / 3 s timeout / 30 failures) kills a replica waiting on Kysely's advisory lock at
roughly 90 s, long before the lock's own hour; at `minReplicas: 1` in `Single` mode an
unready replica is no service. A **manual command** is a step somebody forgets.

**"The migration succeeded and the deploy then failed"** leaves the database ahead of the
code, which is survivable **only while migrations are additive**. That is now a written
convention — `migrations/README.md` §8's new "expand, then contract" section — rather than
an implicit hope, and nothing can enforce it, because whether a column is still read is a
fact about code.

**The step has its own deadline**: `timeout 120`, with a message naming the advisory lock
and `pg_stat_activity`'s `wait_event: advisory`. 120 s is two orders of magnitude above the
thing it is timing (`pnpm migrate` measured at **1.181 s** on the runner) and thirty times
inside the thing it protects against (the lock's one-hour `lock_timeout`). Task 1.11.7's
lesson is why that gap is stated: a deadline that cannot match the failure it watches for
goes red with the wrong message.

### The identity was forced, so least privilege came free

Task 2.1.6 measured that a service principal cannot mint a token for another principal's
Postgres role, so CI **could not** connect as `marketpulse-backend`. A second role was the
only option. `marketpulse-github-deploy` was created with
`pgaadauth_create_principal_with_oid(...)` on the **`postgres`** database and granted
`connect`, `usage, create on schema public`, plus default privileges handing the runtime
role `select, insert, update, delete` on the tables it creates. **Read back afterwards**:
all four tables are owned by the migration role, `marketpulse-backend` holds the four DML
privileges on `securities`, and `has_schema_privilege('marketpulse-backend', 'public',
'CREATE')` is **false**. The whole bootstrap is in `HOSTING.md`, because it exists in no
file here.

**Trap worth the write-up: `pgaadauth_*` exists only in the `postgres` maintenance
database.** From `marketpulse` it is `42883 … does not exist` and a `pg_proc` sweep returns
nothing at all.

### Whether a CI runner can reach the database is a measurement, and the answer is yes

Taken on a throwaway branch with a temporary federated credential, both deleted afterwards
— which was necessary because **both existing federated credentials are scoped to
`refs/heads/main`**, so no branch can authenticate to Azure. Runner egress was
**`172.174.110.129`**, an Azure address, which `AllowAllAzureServicesAndResources` admits.
So no firewall write from CI. **Connect in 142 ms** including TLS `verify-full` and the
token, against the deployed replica's ~1,023 ms first connection — the difference being the
866 ms sidecar mint the runner does not pay, since `az` already has one.

That run also **applied both migrations for real**: `Pending: 0001_baseline,
0002_securities`, `✓ ✓`, `Applied 2 migrations.`, **1.181 s** wall.

### Read back from the managed database

`securities` matches the local schema column for column through `information_schema` —
eleven columns, `id` `bigint` with `is_identity: YES` / `ALWAYS` and `column_default`
**null**, which is the trap Task 2.2.4 named. `pg_constraint` is identical line for line
including `securities_kind_check` reading `CHECK ((kind = ANY (ARRAY['equity'::text,
'etf'::text])))` and PostgreSQL 18's eight `NOT NULL` constraint rows. `kysely_migration`
holds both names; `securities` holds **0 rows**, because seeding is Story 2.3's.

**The checksums are byte-identical across environments** — `0001_baseline`
`cdebe2eabc21…`, `0002_securities` `8a944594c3fd…` — deployed and local, which is a
stronger statement of "the same files produced both" than a column comparison is.

**The third engine pin was taken by hand, which is the cheapest it will ever be**, because
this task connects to both: local container **PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2)**,
managed server **PostgreSQL 18.6 on x86_64-pc-linux-gnu**. The number is recorded rather
than the fact that it matched.

### The checksum was built

`migration_checksum (name, checksum, recorded_at)`, SHA-256 of the file's bytes, written by
the provider **inside the migrator's transaction** beside Kysely's own row, verified before
every run. **Task 2.2.6's exact break now goes red**: appending an index to an applied
`0002_securities.sql` takes `pnpm migrate` from `Already up to date` at exit 0 to **exit 1**
naming the file and printing both hashes, having applied nothing.

Three things about it that are stated rather than hidden. It **adopts** rather than fails on
a database that predates it — every existing database has `kysely_migration` rows and no
checksum rows — so a file edited before this existed is silently blessed exactly once, and
the line says `○ … checksum adopted` while it happens. It says nothing about a migration
that has not run. And there is **no command that repairs a divergence**: locally reset,
deployed write a new forward migration, because that server has a `CanNotDelete` lock.

**A correction found while building it.** Kysely 0.29.5 wraps **the whole run** in one
transaction, not one per migration — read out of its own `migrator.js` and confirmed by two
migrations recording an identical `recorded_at`, `now()` being transaction start time. So a
run of three whose third fails rolls back all three. `migrate.ts` and `CLAUDE.md` both said
"per migration".

### The pending list: yes, and it costs nothing

`pnpm migrate` still refuses arguments and there is still no `down` and no dry run. What it
now prints on every run is what it is about to apply — `Pending: 0001_baseline,
0002_securities`, or `Nothing pending.` — because a deploy step that cannot say what it is
about to do is a step nobody can review afterwards, and `getMigrations()` had to be called
for the checksum pass anyway.

### Nothing new in `e2e/specs-deployed/`, decided rather than assumed

A schema is not a user-visible surface, no route reads it, and Task 2.1.7 already declined
to put the database behind `/health`. The post-deploy browser check's output is a rollback
decision, and there is no browser-visible consequence of this change to make one from. The
reversal trigger is Story 2.8's first route that serves data.

### The leak check, on the fifth producer

The CI run log is a new place a credential can land. **Zero `eyJ`, zero `Bearer `** in the
whole 304-line run log; the three `DATABASE_PASSWORD` occurrences and the one `PGPASSWORD=`
are GitHub echoing the step's _script source_, i.e. the variable name, with
`::add-mask::` applied to the value. Log Analytics returns **0** for `eyJ`, `access_token`,
`IDENTITY_HEADER`, `ossrdbms` and `Bearer` across the window. The new code adds no
credential-shaped string. And the container app's **`secrets` array is `null`**, read back
— the third reading, and ADR 0011's claim still holds.

### What the deploy did to a running system: nothing

`uptimeSeconds` on the deployed replica was **4,723 s** after the migration with no restart,
`/health` answered 200 throughout, and `/diagnostics/database` reports `reachable: true` in
**186.19 ms** with a matching `x-request-id`. A schema change on a database no route reads is
as quiet as Task 1.12.7's full pipeline deploy was.

### Figures

`pnpm verify` **exit 0 in 26.76 s with no database**, `pnpm test` **246** (37 + 106 + 103),
`pnpm test:process` 14, `pnpm test:database` **25**. No new dependency and no lockfile
change. The frontend artefact is untouched, because this task shipped no frontend source.

### The honest gap

**The `deploy.yml` step itself has not run**, because it only runs on `main` and this branch
is not merged. What has run is its body — the same commands, the same identity, the same
network path, the same `pnpm migrate` — from a throwaway branch, which is what made the
reachability measurement possible at all. Its first run on `main` will report `Already up to
date` and `Nothing pending.`, which is a weaker demonstration than the one recorded above
and is ordinary observation once merged.
