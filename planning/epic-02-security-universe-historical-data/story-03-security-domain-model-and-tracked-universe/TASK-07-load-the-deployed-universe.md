# Task 2.3.7 — Load the deployed universe, and decide whether that happens on every deploy

**Status:** Complete
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
> first merge after the story that adds it. ~~What it does **not** change is the ordering
> constraint in the second bullet: `0003_security_vocabulary.sql` is on **this branch and
> not on `main`**, so the deployed database does not yet have the three-member `kind`, the
> `status` check or the provenance columns. **The first deploy after this story merges runs
> `0003` and then this load, in that order, and a seed that ran before its own migration is
> the one ordering that cannot work** — which is no longer hypothetical, it is what the next
> merge actually does.~~
>
> **That last paragraph is FALSE as of 2026-09-05 and was falsified by a merge rather than
> by any task here — re-checked at Task 2.3.6 by measurement.** `0003_security_vocabulary.sql`
> **is on `origin/main`** (`git cat-file -e origin/main:…` succeeds; `git ls-tree` lists all
> three migrations there), and **three `deploy.yml` runs have completed successfully on
> `main` since**, the most recent on the current tip — so the deployed database already has
> the three-member `kind`, the `status` check and the four provenance columns, and this task
> does **not** carry the seed-before-its-own-migration ordering risk. Two consequences.
> **The `0003`-then-load ordering is no longer this task's to get right**, so the second
> bullet's "it must be **after** the migration step" is a standing rule rather than a live
> hazard. And **the read-back bullet gets sharper rather than easier**: `0003` being applied
> is now an assumption this task should _confirm from the deployed database_ rather than
> infer from a merge, because the whole point of reading rows back is not trusting a step's
> output — and a `status` check that is somehow absent would let the untrack path below
> write a value nothing constrains.

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
  and it is not a `*.test.*` file, so nothing in `files` excludes it.
  **After 2.3.5 both halves are measured rather than one: `dist/load-universe.js` is
  31,608 B and is equally not a `*.test.*` file, so the image carries the MECHANISM as well
  as the DATA** — which is what makes the boot-time option genuinely available rather than
  arguable, since a boot-time migration was impossible because `apps/backend/migrations/` is
  not in the image at all and neither half of that argument transfers here.
  So the argument that killed a boot-time job for migrations
  genuinely does not transfer to this, and a boot-time seed is available in a way a
  boot-time migration is not. Weigh it anyway rather than taking it.
  **Amended after 2.3.6, and this is a NEW argument against boot-time that did not exist
  when the bullet was written: the loader now writes rows it did not insert.** Before
  2.3.6 it could only converge upward — every write named a symbol in its own file — so two
  loaders running concurrently with different files produced the union and removed nothing.
  Since 2.3.6 a symbol in the database and not in **that** loader's file is marked
  `untracked`. A boot-time seed runs on **every replica start**, and during a rollout the
  outgoing and incoming revisions carry **different `universe.ts` files** — so an old
  replica booting would untrack a symbol the new file added while the new replica sets it
  `active`, and which value survives depends on start order. That is a flip-flop against
  production with nothing recording it, and it is unreachable from a `deploy.yml` step,
  which runs **once** with **one** file. Weigh it; it looks decisive. The other half does
  transfer unchanged: the startup probe (2 s / 3 s / 30) kills a replica at roughly 90
  seconds, and `Single` mode at `minReplicas: 1` makes an unready replica **no service**
- **Decide whether it runs on every deploy or once.** Idempotence makes "every deploy"
  safe, which is exactly why it is tempting; weigh against it that it is a write against
  production on every merge, that the Consumption plan's idle rate is conditional on under
  1,000 bytes per second, and that a step which usually does nothing is a step nobody reads
  the output of. If it runs on every deploy it must be **after** the migration step and
  before or after the code rolls by a stated rule — a seed that runs before its own
  migration is the one ordering that cannot work
- **Note what the loader needs from wherever it runs, because three of its properties shape
  the step and none of them is visible from the outside.** **Added after 2.3.5.** It reads
  `loadConfig()` and builds its pool through `createDatabasePool`, exactly as `pnpm migrate`
  does, so **both `DATABASE_AUTH` modes work with no code of its own** — an Entra token is
  minted per connection deployed, and nothing here has to invent that. It needs a **built
  tree** and says ``run `pnpm build` first`` otherwise, which is the same guard the migration
  step already lives with. It **refuses arguments**, so there is no `--dry-run` to reach for
  and no flag a deploy step could pass. And its `application_name` is
  **`marketpulse-universe`** rather than the backend's, which is what to look for in
  `pg_stat_activity` when reading the deployed rows back — a load labelled as the runtime
  service would be the same mistake Task 2.2.7 avoided for the migration identity. One small
  comfort for the ordering constraint above: a seed run before its own migration fails
  **loudly and by name**, because the loader's error path names `pnpm migrate` as the fix
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
  and a confirmation that nothing else in `public` changed. **Add `status` to that list
  (2.3.6):** every row should read `active` and **none** should read `untracked` on a first
  load, which is the check that the untrack path did not fire against an empty table. It is
  cheap and it is the one column whose wrong value would be invisible in a count. Compare the distribution
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
  no with a reversal trigger. No route serves a security until Story 2.9, so there is
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

---

## Amended after Task 2.3.5 (2026-09-05)

Two edits, no work added or removed, and neither changes the shape of the task.

- **The `dist/` measurement now covers both halves.** `dist/load-universe.js` is 31,608 B
  beside `dist/universe.js`'s 28,819 B, so the container image carries the loader as well as
  the list — which is what makes a boot-time seed a real option to weigh rather than a
  hypothetical one.
- **Three properties of the loader shape the step**: it needs a built tree, it refuses
  arguments, and it takes its connection and identity from `loadConfig()` like
  `pnpm migrate` — so both auth modes work with no code, and it appears in
  `pg_stat_activity` as `marketpulse-universe`.

---

## Amended after Task 2.3.6 (2026-09-05)

Three edits, no work added or removed — and one of them corrects a premise this file states
twice.

- **The `0003`-is-unmerged ordering hazard is FALSE and was falsified by a merge**, not by
  2.3.6. `0003` is on `origin/main` and three `deploy.yml` runs have succeeded on `main`
  since, so the deployed database already carries the three-member `kind`, the `status`
  check and the provenance columns. What replaces it is not nothing: **confirm it from the
  deployed database** rather than inferring it, which the read-back bullet was going to do
  anyway.
- **Boot-time seeding gained a new argument against it that did not exist before 2.3.6**:
  the loader now writes rows it did **not** insert, so two revisions booting with different
  `universe.ts` files during a rollout can untrack and re-activate the same symbol depending
  on start order. A `deploy.yml` step runs once with one file and cannot produce it.
- **The read-back must include `status`**, because a first load should produce **101
  `active` and zero `untracked`**, and a wrong value there is invisible in a count.

**Nothing needed adding.** The candidate — a task for what a removal does _deployed_ — is
this task's own read-back plus §12.2's reader rule, not work of its own: the mechanism is
shipped and tested, and the deployed table holds zero rows, so there is no removal to
perform there.

---

## Done (2026-09-05)

**The universe is in the managed database — 101 rows, all `active` — and a step in
`.github/workflows/deploy.yml` keeps it there on every merge.** The full record is
`UNIVERSE.md` §13; this section is the outcome and the decisions, not a second copy of the
evidence.

### What shipped

**One step, in one file.** `.github/workflows/deploy.yml` gained **`Load the tracked
universe`**, sited immediately after `Migrate the deployed database` and before the backend
image is built. **No application source changed, no dependency was added, no lockfile line
moved, and `apps/backend/src/universe.ts` is byte-identical to where Task 2.3.4 left it.**
`pnpm verify` is exit 0 in **27.32 s**, `pnpm test` **287**, `pnpm test:database` **55**.

### The four decisions, and which arguments actually decided them

**Where it runs: a step on the runner.** Boot-time was **genuinely available here and is not
for migrations** — measured on the shipped files, `dist/universe.js` (28,819 B) and
`dist/load-universe.js` (31,608 B) are both in the image, so Task 2.2.7's "the image carries
a description of the schema and nothing that can create it" does not transfer at all. It is
rejected on **an argument that did not exist before Task 2.3.6**: the loader now writes rows
it did not insert, a boot-time seed runs on every replica start, and during a rollout the
two revisions carry different `universe.ts` files — so an old replica booting untracks a
symbol the new file just added while the new replica sets it `active`, and which value
survives depends on start order. A flip-flop against production with nothing recording it,
unreachable from a step that runs once with one file.

**Every deploy, not once.** Run-once would make editing `universe.ts` **a change that ships
nowhere**. Two of the three costs against it do not survive measurement: a no-op run writes
nothing (0 rows with `updated_at <> recorded_at`, one distinct `updated_at` across all 101),
and the Consumption plan's under-1,000-bytes-per-second condition **does not apply**,
because that is a property of the replica and this step never touches it. The third cost —
a step nobody reads — is real, and what stands against it is the three counters it prints.

**Its own deadline, `timeout 120`.** Not for the migration's advisory-lock reason: this
takes no lock, and a hung connect is already bounded at 5 s by the pool. What is unbounded
is a hung query behind somebody else's `ACCESS EXCLUSIVE` lock.

**Nothing goes into `e2e/specs-deployed/`.** No route serves a security until Story 2.9.
Reversal trigger stated: that route.

### What was produced rather than asserted

- **Idempotence deployed, three times.** `101 inserted` then `0 / 0 / 101 unchanged` twice,
  and the database's own stronger version: one distinct `updated_at` across all 101 rows.
- **Both reachable failure classes, against a POPULATED table**, with the table
  fingerprinted before and after — `af810ff6671f05938a0d027e45c1a28d` throughout. A refused
  universe (a duplicated symbol) exits 1 **without opening a connection at all**; an
  unreachable host exits 1 in 5.43 s. Both left the table byte-identical.
- **Every verb the loader issues, executed as `marketpulse-github-deploy`** under `set role`
  and rolled back. **Nothing had to be granted** — that role owns the table — so
  `HOSTING.md` gains no `grant` statement, which is recorded there as the answer.
- **Both branches of the step's shell logic**, with a `timeout` stand-in. The failure branch
  exits 1 and emits its annotation, which is not ceremony: the `if ! cmd; then status=$?`
  form shipped in the migration step on 2026-09-05 and made a **refused migration report
  success**.
- **`0003` confirmed from the deployed database** rather than inferred from a merge, because
  a missing `securities_status_check` would let the untrack path write an unconstrained
  value. It is applied, and all four checks are on the table.

### Three things the brief did not anticipate

**A mid-transaction database refusal is not producible, and the reason is a good one.**
`0003` aligned the three levels so completely that **nothing the compiler accepts is
rejected by the database** — every constraint on the deployed table is mirrored in the
discriminated union. The one exception, a duplicate symbol, the validator catches first. So
the reachable deployed failure modes are exactly two, and both were produced. The
whole-load-transaction property itself is a property of the code, proved locally at 2.3.5.

**`set role` is the cheap way to test another principal's authority.** Task 2.2.7 built a
throwaway branch with a temporary federated credential to answer the equivalent question.
From the Entra administrator's own session, `set role "marketpulse-github-deploy"` executes
the loader's statements as that role and rolls back — no branch, no credential, no runner.

**The `developer-laptop` firewall rule moved back.** Task 2.2.7 moved it `122.11.246.19` →
`58.182.90.91`; this task moved it back. The hazard is not a drift in one direction, it is
that it changes on almost every task needing an operator connection. `HOSTING.md` now says
so instead of naming a current address.

### The honest gap

**The step's BODY ran; the step has not.** A step in `deploy.yml` only runs on `main`, so
its first execution is the first merge after this story — Task 2.2.7's gap, arriving again
and stated in the same words. What was proved is the same commands against the same server
over the same code path, plus both branches of its shell logic. What is unproven is the
runner's network path (which the migration step one line above proves on every merge) and
the token mint as the deploy principal (a laptop cannot impersonate a service principal with
no secret) — but **the thing that mint is _for_ was proved** by `set role`. The first real
run will print `0 inserted, 0 updated, 101 unchanged`, because this task loaded the rows by
hand.

---

## For the stakeholder — what this actually did, in plain terms

**The short version: MarketPulse's live system now knows which ~100 companies it is
watching, and it will never quietly forget.**

Every task in this story so far has been building up to one thing: a definitive list of the
securities the product tracks — 86 individual companies like NVIDIA, Tesla and JPMorgan,
plus 15 funds that stand in for whole sectors and for the market as a whole. Up to now that
list existed only on a developer's laptop and in the source code. **This task put it into
the real, live database that the deployed application talks to**, and — the more important
half — decided _when and how it gets there in future_, so nobody has to remember.

**The decision that mattered most was about forgetting.** There were three ways to load the
list. The tempting one was to load it once, by hand, and be done. That was rejected for a
reason that would have cost us months later: it would mean that when someone edits the list
— adds a company, corrects a sector, removes one that got taken over — **the change would go
nowhere**. The version in the code and the version customers see would silently drift apart,
and nobody would find out until something looked wrong on screen and no one could explain
why. So instead the list is re-applied on **every** deployment. If the file and the live
database ever disagree, the next deployment settles it in favour of the file.

The obvious worry about that is cost and risk: are we rewriting a hundred rows of a
production database every time anyone merges anything? **We measured it, and no.** When
nothing has changed, the load writes literally nothing — it compares and moves on. We proved
that by running it three times and asking the database whether any row had been touched. Not
one had.

**The second decision was about safety when things go wrong.** A deployment that half-works
is worse than one that fails outright, so the load happens _before_ the new code goes live.
If the list is broken, the deployment stops there and the currently-running application
carries on untouched. We didn't take that on trust — we deliberately broke it twice against
the real production database. Once by putting a duplicate company in the list, once by
pointing it at a database that doesn't exist. Both times it refused, said clearly what was
wrong, and left the production data **byte-for-byte identical**. We took a fingerprint of
the table before and after to prove it rather than assume it.

**And the live application never noticed any of it.** Throughout every load, every
deliberate failure and every re-run, the deployed backend answered every health check, never
restarted, and reported its database connection healthy the whole time.

**One quiet but genuinely valuable outcome: there is still no password anywhere.** The
system that writes to the production database authenticates with a short-lived identity
token that nothing stores — the deployed application holds no secrets at all, and we
re-confirmed that after adding a step that writes production data. That is unusual and it is
worth keeping.

**What this unlocks.** The universe is the foundation everything else in the product hangs
off. Story 2.8 will download years of historical price data — and it needs to know _which_
companies to download. The anomaly detection in Epic 5 compares a company against its own
sector — and it needs to know _which_ sector. The market topology visualisation in Epic 6
draws one node per security — and this is the list of nodes. None of that could start
without a real, deployed list.

**What a user still cannot do: anything.** This story remains invisible on screen. Nobody
visiting MarketPulse today sees these hundred companies — there is no page that lists them
yet, because nothing serves them over the network. That is **Story 2.4**, which was inserted
into the plan specifically because three consecutive stories had gone by with no visible
change: it takes a thin vertical slice — an endpoint that hands the list to the browser, and
a page that shows it — so that the next thing we can demonstrate is a real screen showing
real, tracked securities rather than the placeholder data that is on the landing page today.
This task is the last piece that story was waiting on.
