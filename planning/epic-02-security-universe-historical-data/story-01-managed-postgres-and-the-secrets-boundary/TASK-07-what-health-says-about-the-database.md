# Task 2.1.7 — Decide what `/health` says about the database, and where reachability is actually reported

**Status:** Complete — 2026-09-05
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

---

## Record — 2026-09-05

### The decision, in one line

**`/health` says nothing about the database. `GET /diagnostics/database` says it
instead, no probe uses it, and the frontend does not read it.**

`/health` is unchanged **byte for byte**: 61 bytes, three fields, same schema, same
`satisfies` guard, same `HealthResponse`, same `isHealthResponse()`, same
`BackendStatus`. So the criterion "any contract change to `/health` carries the schema,
the guard, the shared type and the frontend's reading of it in the same change" is met
vacuously, and that is the intended outcome rather than a dodge.

### The three shapes, and why two were rejected

**Shape 1 — a field on `/health` the probes are not taught to fail on. Rejected on
cost, and the cost is measured rather than feared.** All three probes point at
`/health`, read off the live app rather than recalled:

| Probe     | period | timeout | failureThreshold | initialDelay |
| --------- | -----: | ------: | ---------------: | -----------: |
| Startup   |    2 s |     3 s |               30 |          1 s |
| Readiness |   10 s |     5 s |                3 |          3 s |
| Liveness  |   30 s |     5 s |                3 |          5 s |

Task 2.1.6 measured that the pool holds **zero connections at rest** — `pg` closes an
idle client after ten seconds and nothing queries afterwards — so a check on `/health`
pays the **cold** path nearly every time: **~1,023 ms deployed, 866 ms of it the Entra
token mint**. That is a third of the startup probe's 3-second timeout, on a route hit
every 2 s during startup, every 10 s by readiness, every 30 s by liveness and once per
30 s per **visible browser tab**. It would also widen a wire contract with five readers
for a field with no consumer, which is the brief's own instruction not to.

**Shape 2 — a readiness surface the readiness probe uses where liveness does not.
Rejected, and the reason is `Single` revision mode at `minReplicas: 1`.** There is
exactly one replica behind the ingress, so an unready replica is not a degraded service,
it is **no** service — a readiness probe failing on an unreachable database would take
an application whose every current route is answerable without a database entirely off
the air. That is strictly worse than the baseline Task 2.1.6 measured, where an
unreachable database left `/health` answering 200 on every poll for 3 min 30 s at
`restartCount: 0`.

**This one is reasoned rather than produced, and that is a decision rather than a gap.**
Producing it means pointing the readiness probe at a failing path and taking the deployed
backend off the air to watch it happen — a live outage spent confirming how ingress is
defined to work, in support of a shape being _rejected_ rather than shipped. The three
facts it rests on are each readable without breaking anything, and all three were read off
the live app rather than recalled: `activeRevisionsMode: Single`, `minReplicas: 1`, and
the probe table above. **Where a rejection turns on something that could genuinely
surprise us, produce it; this one cannot**, and a rejection does not carry the same
evidentiary bar as something that ships — the same call Task 1.13.3 made when it declined
a render-failure journey and named the gap instead.

**Shape 3 — nothing at all, logs only, Story 2.8 owns the surface. Rejected on a gap
that is real rather than anticipated.** Database reachability is currently reported in
exactly one place: the level-40 record `index.ts` writes at **startup**. A running
replica whose database goes away afterwards therefore reports **nothing anywhere**, and
cannot — nothing queries the database once the startup probe's connection has aged out.
And the question cannot be answered from anywhere else: a laptop dialling the database
tests a laptop's network, its own credential and no managed identity at all, where the
path that matters is East US replica → North Central US server, over TLS, as
`marketpulse-backend`, with a token from the platform's own sidecar. **The endpoint is
the only instrument standing in that position** — which is Story 1.12's lesson arriving
from the other side, where no server-side instrument could see what a browser saw.

### What ships

- `apps/backend/src/routes/diagnostics.ts` — `GET /diagnostics/database`, a factory
  taking a **check function** rather than a pool, registered from `index.ts`.
- `createCachedDatabaseCheck` in `database.ts` — the bound.
- `POOL_IDLE_TIMEOUT_MS = 10_000`, restating `pg`'s default **explicitly** so the
  coupling below cannot move underneath it, and `DIAGNOSTIC_CACHE_TTL_MS = 5000`.
- 6 route tests and 5 cache tests. `pnpm test` is **229** (37 + **89** + 103).

**`buildServer()` is untouched and so is every test that calls it.** The route is
registered from `index.ts` because the ordering forces it — the pool takes `app.log`, so
the app exists before the pool and the pool before the route — which means
`database.ts`'s recorded reversal trigger (the pool entering `ServerOptions`) is
**deliberately not fired** here. It belongs to Story 2.8's first route that serves data.
The cost is stated: `server.test.ts`'s route-table walk cannot see this route, so its
`500: apiErrorSchema` is asserted in the route's own test instead.

### The added query rate and its cost

**The bound is one query per 5 seconds and one in-flight query, whatever the caller
count**, and it was measured against the running pair rather than argued:

| What was done                                  | Distinct database queries |
| ---------------------------------------------- | ------------------------- |
| 300 sequential requests over 1.29 s            | **1**                     |
| 25 **concurrent** requests on a cold cache     | **1**                     |
| 2,853 requests over 60 s of continuous polling | **12** — exactly 60 ÷ 5   |

Single flight matters more than the TTL, and the concurrent row is why: without it, 25
simultaneous requests to a public unauthenticated endpoint on a cold pool would be 25
connections and, deployed, 25 token mints at 866 ms each — the _stampede_ rather than the
rate, against 35 usable connections of which Azure's own sessions already hold 7–10, with
no PgBouncer on this tier.

**The counter-intuitive half: a shorter TTL is cheaper.** The cost of a check steps at
`POOL_IDLE_TIMEOUT_MS` rather than scaling with frequency — below it the previous check's
connection is still pooled (**~23 ms**, no token mint), at or above it every check opens a
connection and mints a token (**~1,023 ms**). So a 10-second bound under sustained polling
would cost 6 cold connections and 6 token mints a minute where 5 seconds costs 12 warm
round trips and one mint. **5 s is chosen to sit below 10 s for that reason, and a test
asserts the ordering** — the third time this repository has met a coupled pair `pnpm
verify` cannot see, after `API_TIMEOUT_MS`/`HEALTH_POLL_INTERVAL_MS` and
`TOKEN_TIMEOUT_MS`/`CONNECT_TIMEOUT_MS`, and it gets the same treatment.

The price is stated: sustained polling holds **one** connection rather than zero.
Measured directly in `pg_stat_activity` — `1|idle` on three consecutive readings during
1 req/s polling, and **0** twelve seconds after it stopped. Nobody polls it today, and
there is deliberately **no background timer**: a timer would be uptime monitoring, which
Task 1.13.5 already declined for this repository, and it would be standing billable
traffic against the Consumption plan's under-1,000-bytes-per-second idle condition to
answer a question nobody is asking.

**A failure is cached exactly as a success is.** Not caching failures would turn an
unreachable database into an _unbounded_ query rate at the moment the ceiling matters
most.

### Produced locally against a genuinely unreachable database

`pnpm db down`, then watched across three intervals:

- **The endpoint** reported `{"reachable":false,"ms":2.61,"ageMs":0,…}` at **200**, in
  1–3 ms, because a refused connection is immediate.
- **`/health`** answered **200** throughout, and `uptimeSeconds` rose 214 → 220 → 226 →
  354 across the whole outage and **never reset** — the process was never restarted.
- **`pnpm ready`** reported `○ database … ECONNREFUSED` and **exit 0**, which is Task
  2.1.2's non-gating decision still correct.
- **The frontend, in a browser, read `healthy`** — see the decision below.
- **Recovery** was watched rather than inferred: `pnpm db` back up, and the next check
  past the TTL read `reachable: true` in 14.73 ms. The cache is visible ageing in the
  transcript — `ageMs` 0 → 2016 → 4042 → 0 at the 5-second boundary.

**The correlation id was followed from the wire to the reason**, which is the whole
mechanism the body's silence rests on:

```
body:   {"reachable":false,"ms":1.1,"ageMs":0,"checkedAt":"2026-09-05T01:22:04.336Z"}
header: x-request-id: e3313d1d-e5e6-4fef-9eda-e90f86b938e4
log:    level 40 | database unreachable, reported by the diagnostic endpoint
                 | Error: connect ECONNREFUSED 127.0.0.1:5432
```

The endpoint tells you **whether**; the log tells you **why**; Task 1.7.2's correlation id
makes that one investigation rather than two. `warn` and not `error`, for `index.ts`'s
reason: this server has not failed, a dependency is unavailable, and Task 1.7.4 reserves
50 for a failure this server produced.

### No user-visible change, as a decision

`BackendStatus` is untouched and the indicator does not move. **Watched in a browser with
the database fully down**: the `Backend service` region read `healthy`, `Market feed` read
its usual `disconnected`, there were **0** error fallbacks and 4 navigation links, and the
page made **only `/health` requests** — it never calls the diagnostic.

That is correct rather than a gap. `degraded` is defined as _something answered at the
API's address and it was not a readable health report_; a backend whose database is down
is answering perfectly and truthfully about itself. And nothing a user can do in the
product today needs the database, so rendering `degraded` would tell every user their
application is broken when nothing they can do is affected. **The reversal trigger is
Story 2.8's first route that serves data** — at which point a user _can_ be affected, the
failure surfaces as a 503 on that route where it is actionable, and whether the chrome
should say so becomes a question with a consumer. Consequently **no `e2e/specs-deployed/`
assertion was added**, because there is nothing new for a browser to see.

### Two findings the plan did not anticipate

**The leak assertion is a check on the SCHEMA, not on the handler, and it took two edits
to make it fail.** Adding `detail: check.error.message` to the handler alone left the test
**green** — `fast-json-stringify` strips a property the schema does not declare, which is
Task 1.7.3's mechanism measured again on a new route. It only went red once the field was
declared in `diagnosticProperties` too, at which point the payload read
`{"reachable":false,"detail":"no pg_hba…"}`. So what holds this public unauthenticated
endpoint closed is the schema, and **a green run here is not evidence that a handler could
not leak**. Recorded in the test.

**Fastify's `exposeHeadRoutes` default registers a HEAD route beside every GET**, so the
route-table walk saw two entries for one declaration and the schema test failed
`expected … length 1 but got 2` on its first run. The same class of surprise as the
`OPTIONS *` preflight route `server.test.ts` found on _its_ first run; the walk is
filtered to `GET`.

### Deliberate breaks, each seen to fail and reverted

1. Single flight removed (`??=` → `=`) — the concurrent test goes red.
2. `DIAGNOSTIC_CACHE_TTL_MS` raised to 15,000 — the ordering test goes red.
3. The reason added to the body — **green**, see the finding above; red only once the
   schema declares it.
4. `503` instead of `200` on an unreachable database — red.
5. `ageMs` hard-coded to 0 — red.

### Gates

- `pnpm verify` **exit 0 in 25.68 s with no database running**, and exit 0 with one.
- `pnpm test` **229** (37 + **89** + 103); `pnpm test:process` **14**, unchanged.
- `pnpm e2e` **10 passed** with a database, **9 passed in 3.4 s** with none (the
  recovery journey excluded for time, not for correctness).
- `pnpm ready` exit 0 both ways.
- The frontend artefact is untouched: this task ships no frontend source.

### What could not be produced, and it is the honest gap

**Every `az containerapp update` was refused by this environment's own permission
policy**, in both the forms this task needed — `--set` on the readiness probe's path, and
`--set-env-vars`. Read-only `az` works, which is how the probe table above was taken off
the live app. So two things are recorded as **not produced**:

1. **The endpoint has never run deployed.** It needs a new image on the Container App,
   which is the pipeline's job on a merge to `main`.
2. **The deployed break** using Task 2.1.6's `DATABASE_HOST=203.0.113.7` lever.

The **readiness-probe 503** is not in this list. It was designed and then **dropped on
purpose** rather than blocked — see shape 2 above. It would have cost a live outage to
confirm a property already readable from `az containerapp show`, in support of a
rejection, and that is not a trade worth making.

This is the same class of refusal Task 2.1.6 hit on the firewall command, one command
wider. What stands in place of both is Task 2.1.6's own measured control — an
unreachable deployed database leaving `restartCount: 0` and `/health` 200 across seven
liveness intervals — which is the baseline this task's decision was chosen to preserve
and which this task does not change, because **`/health` is unchanged**. That is the
argument for the gap being tolerable: the deployed risk of this change is bounded by the
fact that the route it adds is one nothing on the platform calls.

**Task 2.1.8 owns re-taking both against the deployed environment once this is merged**,
and both are ordinary observation of a running system rather than a deliberate outage —
which is exactly why they are worth taking and the readiness measurement is not.
