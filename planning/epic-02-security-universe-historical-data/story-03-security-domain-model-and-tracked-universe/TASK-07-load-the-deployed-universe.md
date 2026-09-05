# Task 2.3.7 — Load the deployed universe, and decide whether that happens on every deploy

**Status:** Not started
**Story:** [2.3 Security Domain Model & the Tracked Universe](STORY.md)
**Depends on:** Task 2.3.6 (every change to the list has been made locally first) — **and,
added after Task 2.3.3, on Story 2.2's Task 2.2.7, which has not been done**

> **Sequencing hazard, found by Task 2.3.3 and recorded here because this is the task it
> blocks.** This file is written as though migrations already reach the deployed database
> ("this is not simply Task 2.2.7's decision repeated"). They do not. Task 2.2.7 and 2.2.8
> are **Not started**, `.github/workflows/deploy.yml` contains no migration step, and **the
> managed database has never had a single migration applied to it** — it holds no
> `securities` table at all. So this task cannot run first: a universe loaded into a
> database with no schema fails on the first insert, and the decision this task is supposed
> to weigh against 2.2.7's ("not simply that decision repeated") has no decision to weigh
> against. Either 2.2.7 lands before this task, or this task absorbs it — and absorbing it
> is the wrong shape, because migrating a production database is Story 2.2's subject and
> carries its own rollout, deadline and failure-behaviour questions. **Settle this with the
> user before starting.**

## Objective

Get the universe into the managed database, and decide where that runs relative to a
deploy — the same half of the problem Task 2.2.7 answered for migrations, arriving a second
time and with a different answer available.

It comes late deliberately, for Task 1.11.2's reason and doubly so here: a platform failing
on something that was never correct is the most expensive failure to read, and the deployed
server carries a `CanNotDelete` lock, so **"drop it and start again" is not an available
recovery**.

## Work

- **Decide where the load runs.** ~~Not simply Task 2.2.7's decision repeated~~ — **there
  is no decision to repeat, because 2.2.7 has not been done**; see the hazard above. The
  half of it this task can settle on its own is now confirmed rather than conditional:
  Task 2.3.1 put the universe in a `.ts` module under `src/`, so it compiles into `dist/`,
  and `apps/backend/package.json`'s `files` field is `["dist", "!dist/**/*.test.*"]` —
  **the container image carries the universe**, where it does not carry
  `apps/backend/migrations/`. So the argument that killed a boot-time job for migrations
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
