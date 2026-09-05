# Task 2.2.7 — Migrate the deployed database, and decide what a failed migration does to a rollout

**Status:** Not started
**Story:** [2.2 Database Schema & Migration Mechanism](STORY.md)
**Depends on:** Task 2.2.6 (what a broken migration leaves behind — which is what decides this task's shape)

## Objective

Get `securities` into the managed database by the chosen mechanism, observed rather than
assumed, and settle where that happens relative to a deploy.

## Work

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
  for free, and `DATABASE_AUTH=entra` needs no new token code anywhere. That removes the
  mechanical half of this task and leaves the half below, which is the part with a decision
  in it
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
- **Apply it and read the result off the managed database**, which is acceptance criterion
  3: connect, read the schema back, confirm it matches the local one column for column, and
  confirm the tracking table records what it should. Task 2.1.5's operator-connection
  traps apply — `psql` from a laptop cannot do `verify-full` where Node can, because the
  container has no CA store, and `pnpm db exec` **echoes its arguments**, which is how a
  live bearer token was printed into a terminal once already
- **Take the leak check on the new surface.** A migration runner logs SQL, and a
  connection failure quotes a DSN. Story 2.1's leak check is clean in four places —
  repository, built output, log destination and terminal echo — and this task adds a fifth
  producer of all four. Confirm no credential reaches Log Analytics, and confirm the
  deployed `secrets` array is **still `null`**, which has now been read back twice and is
  ADR 0011's claim that this epic keeps confirming rather than expiring
- **Watch the deploy that carries it.** Whatever shape is chosen, run it for real and
  record the ordinary numbers: how long the migration step takes, what the run summary says,
  and whether a running page notices anything — Task 1.12.7 measured a full pipeline deploy
  of both halves as invisible to a polling page, and a schema change on a database no route
  reads should be at least as quiet. If it is not, that is the finding
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
- No credential appears in the repository, the built output, the log destination or a
  terminal, checked rather than assumed
- The `secrets` array is read back and reported

## Notes

This is the half of the story that gets skipped and then hurts — the story says so
directly. It is also the first task in this epic to write DDL to something with a
`CanNotDelete` lock on it, and the reason that lock exists is not the data, which is all
re-derivable from Alpaca: it is the backups and the bootstrap that exist in no file here.
