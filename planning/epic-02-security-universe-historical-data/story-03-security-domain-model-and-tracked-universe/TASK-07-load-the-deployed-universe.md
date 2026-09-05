# Task 2.3.7 — Load the deployed universe, and decide whether that happens on every deploy

**Status:** Not started
**Story:** [2.3 Security Domain Model & the Tracked Universe](STORY.md)
**Depends on:** Task 2.3.6 (every change to the list has been made locally first) — and on
Story 2.2's Task 2.2.7, **which is Complete, so this dependency is satisfied**

> **~~Sequencing hazard, found by Task 2.3.3 and recorded here because this is the task it
> blocks.~~ RESOLVED — re-checked at Task 2.3.4 (2026-09-05) by measurement rather than by
> assumption, and every one of its three premises has stopped being true.** Story 2.2's
> task table reads **Complete** for all eight tasks including 2.2.7 and 2.2.8;
> `.github/workflows/deploy.yml` **has a migration step**, `Migrate the deployed database`,
> which invokes `pnpm migrate` by name under a `timeout 120`; and 2.2.7's commit
> (`8115713`) is an **ancestor of `origin/main`**, so the managed database has had `0001`
> and `0002` applied and **does hold a `securities` table**. The struck-through paragraph is
> kept rather than deleted because it records a real block that was real when it was
> written, and because the resolution is the interesting half: nothing in this story fixed
> it, Story 2.2 finishing did.
>
> **Two things it changes for this task, and one it does not.** The decision this task was
> supposed to weigh against now exists to be weighed against — 2.2.7 chose _a step in
> `deploy.yml` before either half of the code rolls_, with its own deadline, and the first
> bullet below can finally do what it says. And 2.2.7's own recorded honest gap transfers
> directly: a step added to `deploy.yml` only runs on `main`, so its first execution is the
> first merge after the story that adds it. What it does **not** change is the ordering
> constraint in the second bullet: `0003_security_vocabulary.sql` is on **this branch and
> not on `main`**, so the deployed database does not yet have the three-member `kind`, the
> `status` check or the provenance columns. **The first deploy after this story merges runs
> `0003` and then this load, in that order, and a seed that ran before its own migration is
> the one ordering that cannot work** — which is no longer hypothetical, it is what the next
> merge actually does.

## Objective

Get the universe into the managed database, and decide where that runs relative to a
deploy — the same half of the problem Task 2.2.7 answered for migrations, arriving a second
time and with a different answer available.

It comes late deliberately, for Task 1.11.2's reason and doubly so here: a platform failing
on something that was never correct is the most expensive failure to read, and the deployed
server carries a `CanNotDelete` lock, so **"drop it and start again" is not an available
recovery**.

## Work

- **Decide where the load runs. Not simply Task 2.2.7's decision repeated** — and, since
  2.2.7 is Complete, **there is now a decision to weigh against**, which there was not when
  the struck-through hazard above was written: 2.2.7 chose a step in `deploy.yml` running
  `pnpm migrate` by name before either half of the code rolls, under its own `timeout 120`.
  Weigh this against that shape rather than in the abstract, and expect a **different**
  answer to be available, for the reason below. The half this task can settle on its own is
  confirmed rather than conditional:
  Task 2.3.1 put the universe in a `.ts` module under `src/`, so it compiles into `dist/`,
  and `apps/backend/package.json`'s `files` field is `["dist", "!dist/**/*.test.*"]` —
  **the container image carries the universe**, where it does not carry
  `apps/backend/migrations/`. **Confirmed on the shipped file rather than predicted from the
  manifest (2.3.4): `apps/backend/dist/universe.js` exists after `pnpm build`, at 28,819 B**,
  and it is not a `*.test.*` file, so nothing in `files` excludes it. So the argument that killed a boot-time job for migrations
  genuinely does not transfer to this, and a boot-time seed is available in a way a
  boot-time migration is not. Weigh it anyway rather than taking it. The other half does
  transfer unchanged: the startup probe (2 s / 3 s / 30) kills a replica at roughly 90
  seconds, and `Single` mode at `minReplicas: 1` makes an unready replica **no service**
- **Decide whether it runs on every deploy or once.** Idempotence makes "every deploy"
  safe, which is exactly why it is tempting; weigh against it that it is a write against
  production on every merge, that the Consumption plan's idle rate is conditional on under
  1,000 bytes per second, and that a step which usually does nothing is a step nobody reads
  the output of. If it runs on every deploy it must be **after** the migration step and
  before or after the code rolls by a stated rule — a seed that runs before its own
  migration is the one ordering that cannot work
- **Use the migration identity rather than the backend's**, unless there is a reason not to.
  `marketpulse-github-deploy` exists, owns the tables, and connects from the runner in
  **142 ms** including TLS `verify-full` and the Entra token; the backend cannot be
  impersonated from CI anyway, because a service principal cannot mint a token for another
  principal's Postgres role. Check that the grants actually cover what a loader does —
  ownership covers DML on tables that role created, but confirm it rather than assume it,
  and record anything that had to be granted, because those statements exist in `HOSTING.md`
  and nowhere else in this repository
- **Give the step its own deadline**, for Task 2.2.7's measured reason: a runner waiting on
  a lock or a hung connection waits far longer than anything worth waiting for, and the
  deadline is what turns that into a red step with a message rather than a stalled job
- **Read the deployed rows back off the deployed database rather than trusting the step's
  output** — the count, the per-sector distribution, a spot check of provenance on a row,
  and a confirmation that nothing else in `public` changed. Compare the distribution
  against `UNIVERSE.md`'s recorded local figures; they should be identical, and identical
  is the check rather than a coincidence
- **Run it twice against the deployed database**, because idempotence proven locally is
  idempotence proven against a database created and dropped by a test. This is the first
  time it meets a database it cannot drop
- **State what a failed load leaves behind, in the same terms Task 2.2.7 used for a failed
  rollout.** A whole-load transaction means the answer should be "nothing", and that should
  be produced rather than asserted — a deliberately invalid universe, refused, with the
  deployed table unchanged afterwards
- **Confirm the deployed backend did not notice.** `/health` 200 throughout,
  `uptimeSeconds` never resetting, `restartCount` unchanged, and `/diagnostics/database`
  reporting `reachable: true` — the same observation Task 2.2.7 took, and worth re-taking
  because this is the first deploy that writes rows rather than DDL
- **Decide whether anything goes into `e2e/specs-deployed/`**, and expect the answer to be
  no with a reversal trigger. No route serves a security until Story 2.8, so there is
  nothing browser-visible to make a rollback decision from — which is the argument Task
  2.2.7 already made about a schema. Say so explicitly rather than leaving it unanswered
- **Take the leak check on whatever this task's producers are.** A CI run log is one of
  them, and it is the fifth producer that has been swept; the deployed rows are a new kind
  of surface but hold nothing secret by construction. Re-read the container app's `secrets`
  array while you are there, because ADR 0011's claim that nothing deployed holds a
  credential is still standing and is still cheap to re-take

## Done when

- The universe is in the managed database, read back and matching the local figures
- Where the load runs relative to a deploy is decided, implemented, and its failure
  behaviour written down
- Running it twice deployed changes nothing, observed
- A refused load leaves the deployed table untouched, produced
- The deployed backend served `/health` throughout with no restart
- Anything that had to be granted by hand is recorded in `HOSTING.md`, which is its only
  durable copy

## Notes

The honest gap Task 2.2.7 recorded is worth expecting again: a step added to `deploy.yml`
only runs on `main`, so its first real execution is the first merge after this story, and
whatever is run from a branch is the step's **body** rather than the step. Say which was
proved.

---

## Amended after Task 2.3.4 (2026-09-05)

Two edits, and the first is the one that matters: **the sequencing hazard is resolved, and
this task is unblocked.** It was resolved by Story 2.2 finishing rather than by anything
here, and it was re-checked by measurement — Story 2.2's task table, the migration step in
`deploy.yml`, and 2.2.7's commit being an ancestor of `origin/main` — rather than by
assuming a status file was current. The user no longer needs to settle anything before this
task starts.

The ordering constraint it leaves behind is sharper than the one it removes: **`0003` is
still unmerged**, so the first deploy after this story applies `0003` and then loads the
universe, in that order, against a deployed table whose `kind` check is still the
two-member one until that migration runs.

The second edit turns the `dist/` claim from a manifest reading into a measurement.
