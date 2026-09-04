# Task 2.1.4 — The connection pool, `SELECT 1`, and closing inside the drain

**Status:** Not started
**Story:** [2.1 Managed Postgres Provisioning & the Secrets Boundary](STORY.md)
**Depends on:** Tasks 2.1.2, 2.1.3

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
