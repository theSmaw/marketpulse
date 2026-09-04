# Task 2.1.4 — The connection pool, `SELECT 1`, and closing inside the drain

**Status:** Not started
**Story:** [2.1 Managed Postgres Provisioning & the Secrets Boundary](STORY.md)
**Depends on:** Tasks 2.1.2, 2.1.3
**Amended:** 2026-09-04, after Tasks 2.1.1, 2.1.2 and 2.1.3 — see the three _Amended_ sections below

## Objective

Open one pool for the process, execute a trivial query through it against the local database, and close it inside the shutdown Story 1.2 built — well inside the 5-second ceiling and the platform's 30-second grace. Locally only; the deployed half is Task 2.1.6's.

## Work

- **Choose the driver, and measure its cost before adopting it rather than after.** This repository's habit is to install a candidate, take the store-entry count, the disk figure and the lockfile delta from a **fresh install** — Task 1.13.1's finding is that a virtual-store count is only comparable across one — and to sweep for install scripts, because `allowBuilds` has exactly one entry and Task 1.4.5 is still the only time the policy has fired. `pg` and `postgres` are the obvious two; an ORM is **out of scope and belongs to Story 2.2**, and adopting one here would decide that story's question inside this one
- **Decide where the pool lives, and let `buildServer()`'s existing shape decide it.** That factory takes its logger settings rather than defaulting them, precisely so a test can build an instance without inheriting production defaults — the same argument applies to a database. What must not happen is a module-scope pool created on import, because every test file that imports the server would then open sockets. Note ADR 0002 §3's standing warning: the first `await` inside the factory changes every caller, and this is the most likely thing to introduce one
- **`SELECT 1` and nothing more.** This story ends there deliberately. No table, no migration, no typed access, no query helper beyond what one trivial query needs — all of that is Story 2.2's, and a query layer invented here is one Story 2.2 has to argue with
- **Close it in the drain, and prove the ordering rather than assume it.** The shutdown path is a `shuttingDown` flag, `app.close()`, a 5-second ceiling that forces an exit at level 50, and a second signal that exits 1. A pool closed _before_ the drain kills in-flight requests that still need it; one closed after `app.close()` resolves is the correct order and it has to be seen to be, because the failure looks like a slow shutdown rather than an error. Measure `signal received` → `shutdown complete` and compare it against the recorded ~100 ms and sub-millisecond drain: a pool that takes seconds to close is a route holding a client
- **Decide what the server does when the database is absent or refuses, and decide it as a product state.** The backend must still start — `pnpm verify` runs with nothing listening, `test:process` spawns a server with no database, and a process that exits because Postgres is down is a crash-loop on a platform whose liveness probe restarts it. So the pool's first failure is a logged, levelled record rather than an exit, and what a request that needs data then gets is a decision to write down (Story 2.8 owns the API, but the shape of "the data layer is unavailable" is set here)
- **Extend `test:process` rather than leaving the new lifecycle untested.** That suite is the only thing here that drives signals, exit codes and the ceiling against a real spawned `dist/index.js`, and the story's sixth criterion asks for it **both ways**: with a database configured and reachable, and with one absent. Follow the suite's own rules — nothing waits on a log line, no timing is asserted, and every new test is seen to fail against a deliberate break before it is trusted
- **Keep the fast suite fast.** The 189 tests in `pnpm test` need no build and no socket, and that is the property Story 1.9 and Task 1.10.5 both defended. A unit test that needs a live database has picked the wrong runner; if a real connection is genuinely needed, it belongs with the process suite and its cost is stated

## Done when

- The driver is chosen with its measured cost recorded from a fresh install, and the install-script sweep still returns `esbuild@0.28.2` and nothing else
- One pool per process, created where a test can build a server without one, and never at module scope
- `SELECT 1` succeeds against the local database and nothing larger was built
- `SIGTERM` still drains and exits 0 with the pool closed, and the timing was compared against the recorded baseline
- A start with no database reachable is a logged failure and not an exit, and the behaviour was produced
- `pnpm test:process` passes with a database configured and with one absent, with the new tests seen to fail first
- `pnpm verify` passes with no database running

## Notes

The two halves of the sixth acceptance criterion pull in opposite directions and that is the point: the pool has to be real enough to close cleanly and optional enough that the whole verification chain still runs on a laptop with nothing installed.

## Amended after Task 2.1.1 (2026-09-04)

- **The driver choice has acquired a hard functional criterion, and it can eliminate a candidate on its own.** Because the deployed credential is an Entra access token minted per connection, **the driver must accept a credential that is computed asynchronously, per connection** — not a fixed password string set once at pool construction. That is now a selection criterion alongside the store-entry count and the install-script sweep, and it should be checked **before** the cost measurement rather than after, because a driver that cannot do it is out regardless of what it weighs.
- **The pool has a ceiling and Task 2.1.1 already supplied the number, so this task sizes against a fact rather than a guess.** B1MS allows **50 `max_connections`, of which 35 are usable** — "an Azure Database for PostgreSQL flexible server reserves 15 connections for physical replication and monitoring". That 35 is shared with every migration run, every `psql` session, every probe and, from Epic 3, a second writer. **And `Burstable servers currently don't have access to the built-in PgBouncer connection pooler`**, so the application's own pool is the only pool and there is no server-side safety net to fall back on. The original brief does not mention pool size at all; it should now choose one and state what it is leaving for everything else.
- **Task 2.1.5's "measure the connection ceiling" is therefore a confirmation, not a discovery.** The order is unchanged and correct: this task can proceed on the documented figure, and 2.1.5 checks it against the created server.
- **Token acquisition is deliberately NOT in this task.** This task is local and uses a password, so the first code that asks Azure for a token belongs to **Task 2.1.6**. What this task owes 2.1.6 is a seam: the pool must take its credential from something that can later be an async function, so that 2.1.6 adds a provider rather than reopens the pool's construction.
- **"What the server does when the database is absent" gained a second failure mode that is not absence.** B1MS is a credit-based tier whose own documentation says that under sustained CPU load "credits deplete and **the server might become unreachable**", and that it is "not recommended for production workloads". So the unreachable case is not only "nobody started the container" — it is a state the managed server can enter on its own, and the logged-not-exited behaviour this task chooses is what keeps that from becoming a crash-loop.

## Amended after Task 2.1.2 (2026-09-04)

### This task owns re-taking a decision 2.1.2 made about it, and 2.1.2 probably got it wrong

Task 2.1.2 added a third check to `pnpm ready` that **reports** the database and does not gate — `○` rather than `✗`, exit code unchanged — because nothing opens a connection yet and `pnpm e2e` gates on that same script, so failing on a missing database would refuse to start a browser suite with no interest in one, on a laptop and on the runner alike. That reasoning stands.

**What 2.1.2 got wrong is the reversal trigger, and it named this task.** The sentence it shipped says the trigger is "Task 2.1.4 — the pool, the first thing here that opens a connection", and then, in the same breath, "on the day the backend needs a database to serve a request". **Those are not the same day**, and this task's own "Done when" list is the proof: a start with no database reachable is a logged failure and **not** an exit, `pnpm test:process` passes with a database absent, and `pnpm verify` passes with no database running. After this task the backend still starts, `/health` still answers, and **nothing in either check chain fails without a database** — so `pnpm ready`'s exit 0 is still the honest answer and flipping the line to `✗` here would be inventing a requirement ahead of the code that has it, which is the thing 2.1.2 declined to do in the first place.

So this task should **re-take the decision rather than execute it**, and the likely outcome is that the check stays reporting and the trigger is restated as a **condition rather than a task number** — the shape `src/report-error.ts` already uses, where `CLAUDE.md` records that "the trigger was never 'Story 1.12', it was _an endpoint that accepts a client error report_". The condition here is **the first check in `pnpm verify` or `pnpm e2e` that fails without a database**, which is Story 2.2's migrations or Story 2.8's routes rather than anything in this story.

**If it does flip, the cost is not local**, and 2.1.2 named it: the `e2e` job in `.github/workflows/verify.yml` starts `pnpm dev` and calls `pnpm e2e`, which gates on `check-ready.mjs` — so a gating third check means that job gains a Postgres service. That is a workflow change with a cache key, a startup wait and a second definition of the database's address in a file that currently defines none of the pair, and it is the sort of thing Story 1.10's founding rule exists to keep out of a workflow. Cheap to state now, expensive to discover in a red CI run.

### What 2.1.2 hands this task concretely

- **The target is real and its figures are taken**: PostgreSQL **18.6** on `127.0.0.1:5432`, database `marketpulse`, user `marketpulse`, password `marketpulse`, reachable in **0.093 s** and started by `pnpm db`.
- **The local server offers no TLS**, measured — `pnpm ready` reports `no TLS offered` — and the managed one enforces it. `pg` defaults to `ssl: false`, so a pool that works perfectly against the local database is a pool with TLS switched off, and that difference is invisible until Task 2.1.6. The driver's TLS configuration is therefore something this task must set **deliberately rather than by default**, even though it cannot exercise the deployed side; Task 2.1.5 owns the verification mode and the trust store.
- **`pnpm db down` is the instrument for the absent-database case** this task has to produce, and `pnpm db` brings it back with the data intact, so the failure can be produced repeatedly without re-seeding anything.
- **The container ships `psql` 18.6**, so `pnpm db exec postgres psql …` is available for checking by hand what the pool did, with no host install.

## Amended after Task 2.1.3 (2026-09-04)

Task 2.1.3 built more of this task's groundwork than its brief anticipated, and it
**settled** one thing the amendment above asked this task to re-take.

### The pool no longer decides anything about where the database is

`loadConfig()` returns a frozen `Config.database: DatabaseConfig` — `host`, `port`,
`name`, `user`, `auth`, `password?`, `ssl` — and Task 2.1.3 shaped it as a nested object
**specifically so this task's pool takes it whole**. So:

- **There is nothing here to read from the environment**, and there must not be:
  `config.ts` is still the only file in the workspace that touches `process.env`, and
  the pool receives a `DatabaseConfig` the way `buildServer()` receives its logger
  settings. That is the "let `buildServer()`'s existing shape decide it" bullet with
  the argument already made.
- **The defaults are the local container**, because `scripts/local-database.mjs` now
  reads them back out of the built `dist/config.js` and creates the container from
  them. A pool built from `loadConfig({})` and a `pnpm db` container cannot disagree
  about the address — which removes a whole class of "it works for me" from this task.

### The credential seam the amendment above asked for is half-built, and its shape is a discriminator rather than a callback

The previous amendment says "the pool must take its credential from something that can
later be an async function, so that 2.1.6 adds a provider rather than reopens the pool's
construction". Task 2.1.3 delivered the **discriminator** rather than the callback, and
that is a better seam than the one described:

- **`DATABASE_AUTH` is `password` | `entra`, named rather than inferred.** So the pool
  branches on a declared mode instead of on whether a password happens to be present.
- **`password` is genuinely absent under `entra`**, not `undefined` —
  `exactOptionalPropertyTypes` — so **a pool that reads `config.database.password`
  without narrowing on `auth` is a compile error rather than an empty string at
  connect time.** That is the seam enforced by the type system rather than by a comment.
- **What this task still owes 2.1.6 is only the async half**: the `entra` branch has no
  implementation yet, and the pool's construction must accept a per-connection
  asynchronously-computed password so 2.1.6 fills the branch rather than reopening the
  constructor. Leaving the `entra` branch as a thrown "not implemented here" is
  acceptable and honest **provided the branch exists**; silently treating `entra` as
  `password` is not.

**This sharpens, rather than replaces, the driver criterion.** A driver that cannot take
a function for `password` is still out before it is weighed.

### TLS is a setting now, so the driver choice has a second functional criterion

The brief's amendment above says "the driver's TLS configuration is therefore something
this task must set **deliberately rather than by default**". There is now a variable to
set it from: **`DATABASE_SSL` is `disable` | `require` | `verify-full`**, libpq's own
names, defaulting to `disable` because that is what the local container offers. So this
task maps three named modes onto the driver's options rather than inventing a setting,
and **a driver that cannot express the difference between `require` and `verify-full`
fails the criterion Task 2.1.1 warned about** — Microsoft's own sample connection string
carries `Trust Server Certificate=true`, which is `require` wearing a reassuring name.

Note what the vocabulary deliberately omits: **`verify-ca` is not in the set.** If Task
2.1.5 finds it needs that mode against the managed server, widening the union is a
one-line change in `config.ts` plus its `.env.example` line — but it should be a
decision recorded there, not a fourth value added because a driver accepted it.

### The `pnpm ready` re-take is already done, so this task confirms rather than decides

The amendment above says 2.1.2 "probably got it wrong" by naming this task as the third
check's reversal trigger. **It was corrected in Task 2.1.2's own shipped code**, before
this amendment was acted on: `scripts/check-ready.mjs` now states the trigger as a
**condition** — "the first check in `pnpm verify` or `pnpm e2e` that fails without a
database" — and says in as many words that it is _not_ Task 2.1.4, because this task
keeps both chains passing with no database.

So the work here shrinks to a confirmation: **after this task, `pnpm verify` and
`pnpm e2e` must still pass with no database**, and if they do, the check stays reporting
and nothing about the trigger changes. If they do not, that is this task having exceeded
its own "Done when" list rather than the trigger firing.

**One thing did change about that check and this task should know it.** Its database
line now has a **fourth** state beside ✓ / ○-not-running / ○-not-Postgres: the address
could not be resolved at all, because the tree is unbuilt or a `DATABASE_*` value is
invalid. It is still `○` and still non-gating. It matters here because **`pnpm e2e`
gates on this script**, so a `DATABASE_*` typo in someone's `apps/backend/.env` now
prints a database diagnosis during a browser run — reported, not fatal, and worth
recognising rather than debugging.

### One correction to this task's own figures

The amendment above records the local target as "password `marketpulse`" living in
`scripts/local-database.mjs`. **It moved**: it is `DATABASE_PASSWORD`'s documented
default in `apps/backend/.env.example`, where every other default lives, and the script
reads it back. The value is unchanged and it is still a fixture that is in the
repository on purpose. `LOCAL_DATABASE_VERSION` is the only value still declared in that
script.
