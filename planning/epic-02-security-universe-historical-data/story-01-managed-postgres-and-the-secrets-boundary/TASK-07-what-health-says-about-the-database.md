# Task 2.1.7 — Decide what `/health` says about the database, and where reachability is actually reported

**Status:** Not started
**Story:** [2.1 Managed Postgres Provisioning & the Secrets Boundary](STORY.md)
**Depends on:** Task 2.1.6
**Amended:** 2026-09-04 and 2026-09-05, after Tasks 2.1.1 to 2.1.5 — see the five _Amended_ sections below

## Objective

Answer the story's fourth open decision with something running: whether `/health` reports the database, and if not, what surface does — without turning a database blip into a crash-loop.

## Work

- **Start from the property that makes this dangerous.** The Container App's **liveness probe hits `/health`**, and a failing liveness probe kills the replica. So a `/health` that fails when the database is unreachable converts a recoverable dependency outage into a restart loop, during which the application is _less_ available than it would have been, and on a platform where Task 1.11.7 already measured a failing rollout sitting at `Activating` for ten minutes. Whatever is decided, the liveness answer must stay cheap and local
- **Read what `/health` currently is before changing it.** It is a wire contract in `packages/shared` — `HEALTH_STATUSES`, `HealthResponse`, `isHealthResponse()` — with a response schema and a `satisfies` guard on the backend, a 61-byte body, three platform probes pointed at it, a client that polls it every 30 seconds, and a `BackendStatus` vocabulary on the frontend derived from it. Adding a field is therefore a change to a contract with five readers, and the guard means the type and the schema cannot silently disagree — which is the mechanism working, and it makes the change cheap to do correctly and impossible to do accidentally
- **Note that the vocabulary for this already exists and was designed for exactly this arrival.** `BackendStatus`'s `degraded` is defined **structurally** — `not-ok-status` and `unreadable-body` — rather than by latency, and the recorded reason for structural definition was that there was nothing to set a threshold from _while `/health` reads `process.uptime()` and returns_. A database check is the first thing that changes that sentence. Whether "the backend is up and its database is not" should reach the user as `degraded` is a genuine product question and it belongs to this task, not to the frontend story that would render it
- **Take the decision explicitly among at least three shapes**, with the rejected ones named: `/health` gains a field the probes do not fail on; a **second endpoint** (a readiness or diagnostic surface) that the platform's readiness probe may use where liveness does not; or nothing at all in this story, with database reachability visible only in logs and Story 2.8 owning the surface. The third is a legitimate answer and the record should say why it was or was not taken
- **If a check is added, decide what it costs and how often it runs.** A per-request `SELECT 1` on an endpoint polled by three probes and every open browser tab is a real query rate against a B1MS with a small connection ceiling — Task 1.12.7 measured the deployed baseline as a precise and explainable **4 requests per 30 s** with **+1 per visible tab** — and it is also billable traffic against the Consumption plan's under-1,000-bytes-per-second idle condition. Cache it, or bound it, and say which
- **Whatever is added must be produced rather than reasoned about.** Break the database, watch the endpoint, watch the probes, watch the replica, and watch what the frontend's indicator does — in a browser, because that is the only instrument that sees the frontend's verdict. If the indicator changes state, `e2e/specs-deployed/` is where that becomes an assertion; if it does not, say so, because "no user-visible change" is a valid outcome that should be a decision rather than an omission
- **Do not widen the health contract for a future need.** If a database field is added, it is one field with a stated meaning; Epic 3's feed and Epic 10's agent will both want one too, and a generic dependency-status map invented here is a schema nobody has requirements for yet

## Done when

- The decision is taken and recorded with the rejected shapes named
- Whatever ships was produced against a genuinely unreachable database, with the endpoint, the probes, the replica and the frontend all observed
- The liveness probe does not kill the replica when the database is down, watched across probe intervals
- Any contract change to `/health` carries the schema, the `satisfies` guard, the shared type and the frontend's reading of it in the same change
- The added query rate and its cost are stated
- `pnpm verify`, `pnpm test:process` and the browser suites all still pass, with and without a database

## Notes

Story 1.12 built a three-state vocabulary and then spent two tasks proving that a server-side instrument cannot see what a browser sees. This is the first time a state has arrived that the _server_ can see and the browser cannot infer — and the temptation will be to report it everywhere. The probe property is the reason not to.

## Amended after Task 2.1.1 (2026-09-04)

- **The tier supplies a new way for the database to be unavailable, and it is the one most likely to be mistaken for a bug.** B1MS is credit-based, and its own documentation says that if CPU "runs near or above baseline for long periods, credits deplete and **the server might become unreachable**", with "delays or transient failures in management operations until credits rebuild". So the outage this task must not turn into a crash-loop is not only a network blip or a maintenance restart — it is a **self-inflicted, load-correlated** outage that Story 2.7's backfill is the most likely thing to cause. That strengthens the liveness argument rather than changing it.
- **The per-check cost has a harder ceiling than the brief assumed.** Any `SELECT 1` added to a polled endpoint consumes one of **35 usable connections**, and there is **no PgBouncer on this tier** to absorb it. A per-request check on an endpoint hit by three probes plus one per visible browser tab is therefore competing with the application for a small pool, not just adding query load. Cache it or bound it, and state which — the brief already asks for that, and this is the number that decides it.
- **The database is in a different region from the backend**, so any check added here crosses East US → East US 2. That latency is unmeasured until Task 2.1.5 takes it, and it lands inside an endpoint with a 5-second client deadline and a liveness probe on it.

## Amended after Task 2.1.2 (2026-09-04)

- **There is now a cheap, repeatable way to produce the state this task must observe.** `pnpm db down` makes the local database unreachable and `pnpm db` brings it back with its data intact, so the local half of "break the database, watch the endpoint, watch the probes, watch the replica" costs one command rather than a firewall change. The deployed half still needs the firewall, and only the deployed half has a liveness probe.
- **`pnpm ready`'s third check is a precedent this task should read before deciding, because it answered a smaller version of the same question.** It reports the database, does not gate, and states the reversal trigger — deliberately choosing "report" over "fail" because the thing consuming the signal (`pnpm e2e`) would have been broken by a failure it had no interest in. `/health`'s consumers are three platform probes, a browser poll every 30 seconds per tab, and `BackendStatus`; the liveness probe is the one that turns a report into a restart. **The shapes are the same and the stakes are not**, which is the comparison worth making explicitly rather than the conclusion worth copying.
- **A local check exercises a different connection path from the deployed one**, in two ways 2.1.2 measured: the local server offers **no TLS** and authenticates with a password, where the deployed one enforces encryption and takes a token. So a database check that works locally has not been tested on the path that can actually be slow, and the cross-region round trip the brief already flags is only visible deployed.

## Amended after Task 2.1.3 (2026-09-04)

This task is the least affected of the four remaining, and saying so is worth as much as
the two changes below.

- **The `pnpm ready` precedent this task was told to read before deciding is now
  finished, and it went the way the amendment above predicted.** The third check reports
  rather than gates, and its reversal trigger is stated as a **condition** — "the first
  check in `pnpm verify` or `pnpm e2e` that fails without a database" — rather than as a
  task number. That is the smaller version of this task's question answered in full, and
  the comparison the previous amendment asks for can now be made against something
  settled rather than something in flight. The conclusion is still not the thing to copy:
  the consumer that made `pnpm ready` choose "report" was a browser suite with no
  interest in a database, and the consumer that makes `/health` dangerous is a liveness
  probe that restarts the replica.
- **A `/health` that says anything about the database now has a place to read the
  answer from.** `config.ts` exposes a frozen `Config.database`, and Task 2.1.4's pool
  takes it — so a database check is a call against an existing pool rather than a second
  connection path invented inside a route handler. That matters for the cost bullet
  above: the connection this check would consume is one of the pool's, not an extra
  against the 35-connection ceiling, **provided the check goes through the pool**. A
  route that opens its own client to answer a health question is the shape to reject.
- **One new fact the cost bullet should carry.** `DATABASE_SSL=verify-full` and
  `DATABASE_AUTH=entra` mean the deployed connection is TLS-verified, token-authenticated
  **and** cross-region. A `SELECT 1` on an already-open pooled connection pays none of
  that; a check that causes the pool to open a **new** connection pays all three,
  including a token mint. So "cache it, or bound it" is now also an argument about which
  connections the check is allowed to cause.

## Amended after Task 2.1.4 (2026-09-05)

- **There is a `SELECT 1` to call and it should be called rather than re-written.**
  `pingDatabase(pool)` in `database.ts` is the whole query surface and it
  **returns a result rather than throwing** — `{ ok: true, ms }` or
  `{ ok: false, ms, error }` — which is the shape a health handler wants, since it
  must not let a database failure become a thrown error inside a route. Note it
  goes **through the pool**: a route that opens its own client to answer a health
  question consumes a connection outside the pool's `max`, which is the shape to
  reject on a tier with 35 usable and no PgBouncer.
- **The 5-second connection deadline is now the number that decides the cost
  question.** `connectionTimeoutMillis` is 5000, so a health check that causes the
  pool to open a **new** connection can block for five seconds — inside an endpoint
  polled by three platform probes and every open browser tab, behind a liveness
  probe that restarts the replica, and read by a client whose own deadline is
  **also** 5 s (`API_TIMEOUT_MS`). Those two 5s are independent and nothing keeps
  them ordered. **A check on an already-open pooled connection pays none of that**;
  the brief's "cache it, or bound it" is therefore first an argument about which
  connections the check may cause, and only then about frequency.
- **The startup probe is the precedent to read, and it went the way this task
  probably should.** `index.ts` asks once, **after** `listen()`, logs a level-40
  record if it fails, and **never exits**. That is the same shape as `pnpm ready`'s
  third check — report, do not gate — arriving for the second time in this story
  and now inside the application. The consumer is what differs: nothing acts on the
  startup record, where a liveness probe acts on `/health` by killing the replica.
- **`BackendStatus` already has somewhere to put this and it costs a browser test
  either way.** If `/health` gains a field the frontend reads, `degraded` is where
  it lands and `e2e/specs-deployed/` is where it becomes an assertion; if it does
  not, the record should say "no user-visible change" as a decision. 2.1.4 changed
  nothing about the wire contract — `/health` is still 61 bytes, field for field —
  so this task starts from exactly where Story 1.12 left it.

## Amended after Task 2.1.5 (2026-09-05)

This task was promised a number and now has it. Everything below is measured against the
created server.

### The latency this decision turns on, split the way it has to be

| What a check would pay                                          | Cost                                                        |
| --------------------------------------------------------------- | ----------------------------------------------------------- |
| A query on a **pooled** connection (East US → North Central US) | **~23 ms** — one round trip                                 |
| A check that causes a **new** connection                        | ~~**~150–250 ms**~~ **~1,023 ms** — see the 2.1.6 amendment |
| The client deadline it sits inside                              | 5,000 ms                                                    |

~~So **both shapes fit comfortably inside a liveness probe's budget, and latency is not
what makes this dangerous** — the failure mode is.~~ **Half of that is falsified by Task
2.1.6 and the correction is in its own amendment below: a new connection under `entra`
also pays a token mint, measured at 866 ms cold, so the true figure is ~1,023 ms rather
than 150–250 ms.** The pooled figure stands. What survives is the conclusion's second
half, and it is now the whole of it: the failure mode is what makes this dangerous. That sharpens the brief rather than
changing it: the argument against a database check on `/health` was never that it is
slow, it is that a failing liveness probe kills the replica. **Do not let the comfortable
number talk you into the check.**

Note the region moved: the hop is **East US → North Central US**, not East US 2, because
East US 2 became `OfferRestricted` before the server was created.

### The connection ceiling is the real constraint, and it is tighter than 35

Confirmed on the created server: `max_connections` **50**, minus 10 superuser-reserved
and 5 reserved, gives **35** — and **36 was opened before the 37th was refused**, so 35 is
the number to design against. The half that matters for this task is underneath it:
**Azure's own maintenance sessions already hold 7–10 connections at idle.** With
`POOL_MAX: 10`, the application is at ~12 of roughly 25 genuinely free slots before any
health check exists.

There is **no PgBouncer on this tier**, so a per-request `SELECT 1` on an endpoint hit by
three platform probes plus one per visible browser tab competes for that pool rather than
merely adding query load. **Cache it or bound it** — the brief already says so, and this
is the arithmetic that decides it.

### The idle-credit picture argues the same way

`cpu_credits_remaining` sits at its **30** cap while `cpu_percent` reads **10.5–12.1%**
against a 10% baseline — so an idle B1MS with no application attached is already on the
line and **banks almost nothing**. A cheap check is genuinely cheap in CPU terms; what it
cannot do is arrive during Story 2.7's backfill and expect headroom.

### One new way the database becomes unreachable, already exercised

Task 2.1.5's `CanNotDelete` lock **inherits to child resources**, so the firewall lever
this task will want is `firewall-rule update`, not `delete` — the latter returns
`ScopeLocked`. Breaking and restoring connectivity is two `update` calls, and firewall
changes "can take up to five minutes to take effect", which is a wait to plan for rather
than a failure to debug.

**Superseded in practice by Task 2.1.6: that command was refused by this environment's
own permission policy, so the firewall lever has never been exercised here.** What 2.1.6
used instead is in its amendment below, and it is cheaper and safer. Read that before
reaching for `az`.

## Amended after Task 2.1.6 (2026-09-05)

The deployed backend now connects, so this task's subject exists. Three things
2.1.6 measured change what this one has to decide, and one of them is a cost
nobody had a number for.

### The number that decides everything here: a cold connection costs ~1 second

A `/health` that touches the database pays what the pool pays, and 2.1.6
measured both halves from the deployed replica:

- **First connection of a replica's life: 1,023 ms**, of which the **Entra token
  mint is 866 ms** (866 / 889 / 887 ms across three cold starts).
- A warm token from the platform's sidecar is **5–94 ms**, so a _second_
  connection is a few hundred milliseconds rather than a second.

Against a startup probe with `failureThreshold` counting 2-second intervals, and
a liveness probe on the same route, **a `/health` that opens a connection is a
`/health` that can take a second**. That is the arithmetic this task needs and
it did not exist before.

### And the pool is COLD almost every time, which is the trap

`pg`'s default `idleTimeoutMillis` is **10 seconds**, and 2.1.6 confirmed the
consequence deployed: the connection made by the startup probe was visible in
`pg_stat_activity` for **exactly ten seconds** and then gone. **The deployed
backend holds zero connections at rest.**

So a `/health` that queries the database at any interval slower than 10 seconds
pays the **cold** path every single time — including the token mint, unless the
sidecar's cache is still warm. Do not size this against the warm figure. If this
task decides `/health` should touch the database, `idleTimeoutMillis` becomes a
number worth choosing rather than inheriting, and that is a change to
`database.ts` this task would own.

### The failure this task exists to avoid is now measured, not just feared

2.1.6 produced an unreachable database on the deployed replica (by pointing
`DATABASE_HOST` at an unroutable address) and watched it for **3 min 30 s** —
seven liveness intervals and twenty-one readiness intervals. The replica held
`ready: true`, `restartCount: 0`, `/health` **200 on every poll**, and
`uptimeSeconds` rose 128 → 217 with no reset.

**That is the baseline this task must not lose.** Whatever `/health` reports
about the database, the platform's liveness probe must not restart a replica
because a dependency is down — which is the trap this file already records, now
with a measured control on the correct side of it.

One ordering fact that helps: **`pg` calls the credential function only after
the socket is up**, so an unreachable database produced **no token-mint record
at all**. A token-endpoint outage and a database outage are therefore
distinguishable in the log, which matters if `/health` is going to say which
one it is.

### The lever, which is NOT the one the earlier amendments name

The 2.1.5 amendment above tells this task to break connectivity with
`az postgres flexible-server firewall-rule update`. **Task 2.1.6 could not run it** — the
command was refused by this environment's own permission policy — so that instruction has
never been executed and should not be planned around.

What 2.1.6 used instead, and what this task should use first:

```
az containerapp update -n marketpulse-backend -g rg-marketpulse-dev \
  --set-env-vars DATABASE_HOST=203.0.113.7          # break
az containerapp update -n marketpulse-backend -g rg-marketpulse-dev \
  --set-env-vars DATABASE_HOST=psql-marketpulse-dev.postgres.database.azure.com   # restore
```

`203.0.113.7` is RFC 5737 TEST-NET-3, so packets are dropped rather than refused and the
failure is a genuine **timeout** — the shape a real outage has, and the one that
interacts with `connectionTimeoutMillis`. It is arguably the better lever anyway: it
cannot affect any other consumer of the database, it does not briefly firewall the server
off from the rest of Azure, and it takes effect on the next revision rather than after
the firewall's documented five-minute delay — so the 2.1.5 amendment's warning about
starting the clock too early does not apply to it.

**What it does not exercise is the firewall path itself**, and the difference is real for
this task: an app-side break produces a timeout on a replica that is otherwise perfectly
configured, where a firewall break also tests that a _correctly_ configured replica
survives the database refusing it. If this task wants the second, the firewall command
needs a permission the environment currently withholds, and asking for it is the first
step rather than a workaround.

### And one number from the 2.1.5 amendment is now wrong, in the direction that matters

That amendment's table says a check causing a **new** connection costs ~150–250 ms, and
concludes that latency is not what makes this dangerous. **Under `entra` a new connection
also pays a token mint** — 866 / 889 / 887 ms cold — so the real figure is **~1,023 ms**.
It is struck through above. The conclusion survives but is weaker than it reads: a cold
connection is ~20% of the client's own 5-second `API_TIMEOUT_MS` and a fifth of a
liveness budget, on an endpoint three probes and every browser tab hit. **The pooled
figure (~23 ms) is unaffected**, which makes "the check must not cause a connection" a
sharper rule than it was rather than a softer one.

### Reading the answer is cheap now

`LOG_LEVEL` is back to `info` on the deployed app, where the token mint prints
nothing and a healthy start is one `database reachable` record. Setting it to
`debug` for a measurement is one `az containerapp update` and shows the mint,
the drain's `http drained` and `database pool closed`, and nothing else — all
three confirmed reaching Log Analytics.
