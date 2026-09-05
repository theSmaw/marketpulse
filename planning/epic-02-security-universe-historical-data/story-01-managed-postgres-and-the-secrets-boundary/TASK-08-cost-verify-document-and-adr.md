# Task 2.1.8 — Re-take the cost question, verify from a clean clone, document, and record ADR 0014

**Status:** Not started
**Story:** [2.1 Managed Postgres Provisioning & the Secrets Boundary](STORY.md)
**Depends on:** Tasks 2.1.1–2.1.7
**Amended:** 2026-09-04 and 2026-09-05, after Tasks 2.1.1 to 2.1.5 — see the five _Amended_ sections below

## Objective

Close the story: answer the cost question Epic 1 could not, re-run all eight acceptance criteria against what actually shipped rather than citing the tasks that built it, and write the decision record.

## Work

- **Re-take the cost question, and characterise the refusal again if it refuses.** Epic 1 left this explicitly open and owned by Epic 2. Task 1.11.8 found both billing APIs refusing the subscription — reproduced six times — with the decisive cause being that the whole environment was **under six hours old** against a billing lag of 8–24 hours; Task 1.12.7 then found the refusal had **changed shape**, with `az consumption usage list` returning `[]` at exit 0 and the Cost Management query API answering `429`. The environment is now old enough that the stated cause no longer applies, so this is a real attempt with a real expectation. If it refuses again, the finding is _how_ — a third shape means the earlier diagnosis was wrong
- **Answer the question the estimate was always a proxy for: does continuous probing break the Consumption plan's idle-billing condition?** That is under 1,000 bytes per second, platform probes do not count and the frontend's polls do, and Epic 1 recorded the whole question as still open. A real bill for a month that contains both is the only instrument that answers it
- **Re-read the budget and adjust it if the database moved the arithmetic.** $20 with alerts at 50/80/100%, re-read twice and found to sit just *above* the active-rate total of $19.04 — so it would not fire on the change that matters most. A database that adds anything at all makes that worse, and Task 2.1.1 predicted a figure this task should now check against reality
- **Re-run all eight acceptance criteria and re-take every figure.** The repository's rule is that a claim is re-measured rather than cited, and Epic 1's closing tasks earned that rule four separate times by finding recorded claims that had stopped being true. Specifically: run `pnpm verify` **with no database running**, which is criterion 8 and the property the chain has had since Story 1.1; run `pnpm test:process` both ways; and do criterion 3 by **following `README.md` from a genuine clean clone** rather than reading it, since that is the only place a first-run instruction's gaps show up
- **Sweep the claims this story falsified.** ~~ADR 0011's "nothing deployed holds a credential"~~ **— corrected 2026-09-04: Task 2.1.1's decision keeps that claim true, so it is not on the sweep list; verify it still holds rather than amending it** — and ADR 0006's untested secrets boundary is the one the story genuinely does move, and the sweep is a `grep` across the tree with **every occurrence read** rather than replaced — Task 1.13.6's finding is that of sixteen occurrences of one sentence, four were live claims, nine were historical records correct in their own context, and one was about something else entirely. Strike through rather than delete, per this repository's habit
- **Check the duplicated-sentence blocks and the figure-carrying prose.** Twelve convention blocks, ten byte-identical, and a `README.md` that publishes figures nothing regenerates. This story changes what a clean clone needs and what `pnpm ready` reports, so at least one of those figures moves
- **Write `docs/adr/0014-*`.** The subjects are the four creation decisions and why each is what it is, the authentication choice and what it costs the connection path, why the local database is what it is and what it costs a clean clone, why the pool closes where it does, what `/health` does and does not say about the database, and — in the shape ADRs 0010 to 0013 use — **what a reachable database certifies and what it does not**. That last section is the one a future reader will actually use
- **Update `CLAUDE.md` and `README.md`**, including the gap list, the command list if a command was added, and the first-run narrative. `CLAUDE.md`'s own instruction is that a change to the facts usually needs a change to the ADRs, and the reverse is true here

## Done when

- The cost question is answered with a real figure, or its refusal is characterised in its current shape
- The budget is re-read and adjusted if the arithmetic moved, with the decision stated either way
- All eight acceptance criteria were re-run against the shipped system, and criterion 3 was met by following `README.md` from a clean clone
- `pnpm verify` passes with no database running, and `pnpm test:process` passes both ways
- Every claim this story falsified is corrected in every place it stands, with each occurrence read
- `docs/adr/0014-*` exists and carries the what-it-certifies section
- `CLAUDE.md` and `README.md` reflect what shipped

## Notes

The pattern is Task 1.13.6's: the value of a closing task is almost entirely in the things it finds that had stopped being true, and every one of those was found by re-measuring something a citation would have carried forward unchanged.

## Amended after Task 2.1.1 (2026-09-04)

- **The claim to sweep is ADR 0006's, not ADR 0011's.** Task 2.1.1 chose an authentication path under which the platform holds no secret, so "nothing deployed holds a credential" survives this story and **must be confirmed rather than corrected**. `EPIC.md` says this epic is where that claim expires; it expires in **Story 2.6**. Correcting `EPIC.md`'s prediction is in scope for this task; correcting ADR 0011 is not.
- **The budget arrives with a recommendation attached, and the recommendation is to leave it at `$20`.** Task 2.1.1 re-read it (`marketpulse-monthly`, `$20`/month, actual-cost alerts at 50 / 80 / 100%, all enabled) and predicted the database contributes **`$0.00`** while the free offer holds. The argument for not raising it is that **a database-attributable alert _is_ the signal that one of the three offer conditions broke** — B1MS, 32 GiB, under 750 hours — and a budget raised to accommodate a cost that should not exist cannot report that cost appearing. This task should accept or reject that reasoning explicitly rather than re-derive it.
- **Three predictions from 2.1.1 are waiting to be checked against a real bill** rather than re-derived: the database's line is `$0.00` (or a `Compute - Free` meter at zero); no budget alert fires because of the database; and the total stays in the `$9.21`–`$19.04` band. Outside the offer the figure is **`$16.09`/month** — `$12.41` compute, `$3.68` storage, `$0.00` backup — which puts the totals at `$25.30` / `$35.13` once the offer expires around **2027-09-03**.
- **The cost question has a sharper form now.** Task 2.1.1 re-took it and the refusal's shape is **unchanged since Task 1.12.7** — `az consumption usage list` returns `[]` at exit 0 and the budget reports `currentSpend` `0.0` — but the environment was **~30 hours** old at that reading, against a documented 8–24 hour lag. **So "wait longer" is no longer an available explanation**, and a third reading that still returns `[]` is evidence about the API or the subscription rather than about timing.
- **One more figure moves that the original brief does not name**: `HOSTING.md`'s _Account facts_ table gained five rows in Task 2.1.1 and its region row changed, because **the database is in East US 2 rather than East US**. Any prose elsewhere describing this subscription as "East US" needs the same read-every-occurrence treatment as the other sweeps.

## Amended after Task 2.1.2 (2026-09-04)

The brief says "at least one of those figures moves". Task 2.1.2 moved several, and they are named here so the closing sweep checks rather than rediscovers them.

- **Criterion 3 has already been met once and must be met again from a genuinely clean clone.** Task 2.1.2 followed `README.md` from a fresh clone to a running database — `pnpm db` in **6.2 s**, `pnpm ready` reporting it — and `pnpm verify` exited **0 in 24.45 s** from that clone **with no database running**, which is criterion 8. Both are re-runs for this task, not citations.
- **`README.md`'s Prerequisites section changed and that is the biggest first-run change in the story.** Docker is now a prerequisite it was not before, with the narrowness of that stated in the same paragraph. A clean-clone run that already has Docker does not test the sentence; the honest check is whether the failure a machine **without** Docker gets names the right thing.
- **The "what looks broken on a correct first run" list went from seven items to eight**, and the new one is the only item on that list with a **stated expiry** — it describes `pnpm ready` reporting a database that is not running and exiting 0 anyway, which stops being correct when the third check becomes gating. Task 2.1.4 owns re-taking that decision; whatever it decides, this list is one of the places the answer has to land.
- **The gap lists gained two entries in two different kinds**, both in `README.md` and `CLAUDE.md`: `compose.yaml` joins the fifth kind (Prettier reads it, nothing validates its schema — measured with the same `--file-info` one-liner as the workflows), and **the version pin joins the third kind** — nothing compares `LOCAL_DATABASE.version` against the deployed `--version`, and a check would need Azure credentials `pnpm verify` deliberately does not have. The third kind is the one this repository's own history says actually causes wrong claims to stand, so re-measure it rather than citing it.
- **`pnpm ready`'s documented output changed**, and it is quoted verbatim in `README.md` — three lines now, with a `○` state and two diagnoses that are not `ECONNREFUSED`. Prose figures are the half of the fourth gap that has been wrong nearly every time it was read.
- **A sweep target this task should expect to find:** if Task 2.1.4 restates the third check's reversal trigger as a condition rather than "Task 2.1.4", that sentence stands in `scripts/check-ready.mjs`, `README.md`, `HOSTING.md` and `CLAUDE.md`. Read every occurrence rather than replacing them, per Task 1.13.6's finding.
- **`HOSTING.md` gained a section this task's ADR draws on**: _The database — the local development database_, beside Task 2.1.1's creation decisions in the same document, deliberately rather than in a second file.

## Amended after Task 2.1.3 (2026-09-04)

The brief says "at least one of those figures moves". Task 2.1.3 moved the one this
repository has historically got wrong most often, and it is named here so the closing
sweep checks rather than rediscovers it.

### The test count moved, and it is the twelve-block problem arriving for the third time

`pnpm test` is **196** — 37 + **56** + 103 — where every convention block in Epic 1 says
**189**. Measured on 2026-09-04 rather than estimated: **`189` appears in ~30 places
across 25 files.** Most are historical records correct in their own context; the **live
present-tense claims** are the ones in the duplicated convention blocks and in
`EPIC.md`, and they read:

> **189 real tests across 19 files (37 in `packages/shared`, 49 in `apps/backend`, …**
> … A green tick now means those ~~103~~ **189** tests passed …

This is precisely the failure Task 1.12.8 documented — the "103 real tests" claim stood
in twelve sites, stale by six increments, while 27 other occurrences of "103 tests" were
historical records that a naive grep-and-replace would have destroyed. **Read every
occurrence.** The backend's own figure moved too (49 → 56), and it is quoted separately
in some of those blocks, so the sweep is two numbers rather than one. `README.md` and
`CLAUDE.md` were updated by Task 2.1.3 itself; the Epic 1 blocks were deliberately not,
because a sweep belongs in a closing task where every occurrence is read at once.

### Four more figures and names that moved

- **`CONFIG_VARIABLES` went from five variables to twelve**, and the count is quoted in
  `pnpm env:check`'s own success line (`12 backend variables documented`), in `README.md`
  and in `CLAUDE.md`. Anything describing the backend's configuration as "five
  variables" or listing them as `PORT`, `HOST`, `LOG_LEVEL`, `LOG_FORMAT`, `CORS_ORIGIN`
  is now short by seven.
- **`LOCAL_DATABASE` no longer exists.** Task 2.1.3 moved every value in it into the
  configuration boundary and left `LOCAL_DATABASE_VERSION`, a bare exported constant.
  The gap-list entry for the version pin names the old identifier in both `README.md`
  and `CLAUDE.md` — Task 2.1.3 corrected both, but the previous amendment to **Task
  2.1.5** and this task's own earlier amendment still use the old name, and any other
  occurrence needs reading rather than replacing.
- **`README.md` gained a "Talking to the database" section** carrying a seven-row table
  of variables and defaults, which is figure-carrying prose in the gap list's fourth
  kind and goes stale the moment a default changes.
- **`pnpm ready`'s documented output is unchanged in shape but its database line has a
  fourth state** — the address could not be resolved, because the tree is unbuilt or a
  `DATABASE_*` value is invalid. It is still `○` and still non-gating.

### Criterion 3's clean-clone procedure gained an ordering that is easy to get wrong

**`pnpm db` now requires a built tree**, because it reads the database's address out of
`apps/backend/dist/config.js`. `README.md`'s first-run sequence already puts
`pnpm install` and `pnpm verify` ahead of `pnpm db`, so following it works — **but a
reader who jumps straight to the `pnpm db` section does not have a built tree**, and the
honest check is that the failure they get names `pnpm build` rather than showing a
resolver stack. Produce it from the clean clone rather than reading the guard.

The two clean-clone figures to re-take are unchanged in kind and both moved: `pnpm db`'s
own time now includes whatever the build costs a reader who has not run one, and
`pnpm verify` is **27.9 s with no database running** against Task 2.1.2's 24.45 s from a
clone — a chain that gained no step and seven more variables, so the difference is
run-to-run variance and the per-step split is what to compare.

### One thing to look for that is not a figure

Task 2.1.3 recorded an **unexplained flake**: one `pnpm test` run reported 1 failed /
102 passed in `apps/frontend` with the failing test uncaptured, not reproduced in six
subsequent runs or in `pnpm verify`, on a task that shipped no frontend source. If it
recurs during this task's re-runs, **capture it** — that is the only way it stops being
an anecdote. If it does not, record that it did not.

## Amended after Task 2.1.4 (2026-09-05)

### One recorded claim was falsified outright, and two of its three occurrences are already corrected

**`LOG_LEVEL=debug` no longer "shows nothing `info` does not".** That claim was
true for six stories and stopped being true on 2026-09-05: the drain now writes
`http drained` and `database pool closed` at `debug`, so the level's lower half
holds exactly two records.

Task 2.1.4 corrected the two **live** occurrences in the same change that
falsified them — `README.md`'s logging section and `CLAUDE.md`'s "three
consequences of the level" paragraph — on Task 1.9.7's precedent that leaving a
false claim standing for four more tasks is the failure the triplication exists to
prevent. **The third occurrence is deliberately untouched**:
`planning/epic-01-application-foundation/story-07-.../TASK-01-log-format-level-and-transport.md`
records what Task 1.7.1 measured, which was correct then. **This task should
confirm that split rather than re-derive it**, and it is a worked example of Task
1.13.6's rule that occurrences are read rather than replaced.

### The test-count sweep grew again, and the same live/historical split applies

`pnpm test` is **207** — 37 + **67** + 103 — and `pnpm test:process` is **14**,
where Epic 1's convention blocks say 189 and 10. Both numbers moved, and the sweep
is now two numbers rather than one.

Task 2.1.4 corrected `README.md` throughout and `CLAUDE.md`'s **two live**
present-tense claims (the "a green `pnpm test` means exactly this" paragraph and
the no-placeholders paragraph). **It deliberately left CLAUDE.md's other
occurrences alone**, because they are historical records that are correct in their
own context — "`pnpm test` is untouched at 189 tests" is a true statement about
what Task 1.13.2 measured. `docs/adr/0010-*`'s "ten-test process suite" is the
same case.

**What is left for this task is Epic 1's duplicated convention blocks and
`EPIC.md`** — the twelve-block problem, third time of asking — plus
`docs/adr/0013-*`. Read every occurrence.

### Four figures and one file that moved

- **`apps/backend` is 67 tests across 4 files**, up from 56 across 3; the new file
  is `src/database.test.ts` and it is in the **fast** suite, which is only
  possible because `new Pool()` is lazy.
- **`pnpm test:process` is 14 and takes ~8.2 s.** It passes with a database and
  without one, **same count, no `skipIf`** — worth re-running both ways, because
  that property is the story's sixth criterion and it is the kind that decays
  silently.
- **`pnpm verify` is 25.2 s with no database and 25.8 s with one**, against Task
  2.1.3's 27.9 s. The chain gained no step; read the per-step split rather than
  the total.
- **A fresh install is 418 entries / 291,912 KB / 4,757 lockfile lines**, up from
  404 / 291,080 / 4,641. The one dependency is `pg` 8.23.0 with `@types/pg`, and
  **the install-script sweep still returns `esbuild@0.28.2` and nothing else** —
  re-run it rather than citing it, which is the check that has actually caught
  drift here.
- **The gap list gained nothing**, which is worth stating: `database.ts` is
  ordinary TypeScript that ESLint, Prettier and `tsc` all read.

### For the ADR: what a reachable database certifies, and what it does not

`docs/adr/0014-*`'s what-it-certifies section has two entries from this task that
a future reader will actually use, both of which are absences rather than
settings:

- **A green startup says the database answered `SELECT 1` once, after the server
  was already listening.** It does not say the pool will still connect a minute
  later, and it deliberately does not gate anything: an unreachable database is a
  level-40 record and never an exit, because a process that dies when Postgres is
  down is a crash-loop on a liveness-probed platform.
- **`pg`'s two most dangerous defaults are absences, and both are now set.** An
  `EventEmitter` with no `error` listener **throws**, so without `pool.on("error")`
  a dropped idle connection is an `uncaughtException` and an exit 1 — produced, by
  terminating the process's own backend. And `connectionTimeoutMillis` defaults to
  **0, meaning wait forever** — measured as still pending after four seconds
  against a socket that accepts and never answers. Neither is visible in a green
  run, which is exactly why they belong in that section.

And one lesson worth carrying out of the story rather than leaving in a task file:
**an ordering assertion needs a marker on each side of the step it is about, and
the marker has to travel with the step.** Task 2.1.4's ordering test passed twice
against a deliberately broken order before it was written correctly.

## Amended after Task 2.1.5 (2026-09-05)

Two of this task's questions were partly answered early, and its sweep list grew by a
category it did not have.

### The cost refusal already has its third shape, so this task is looking for a fourth or a figure

The brief says "if it refuses again, the finding is _how_ — a third shape means the
earlier diagnosis was wrong". **The third shape arrived in Task 2.1.5.**
`az consumption usage list` no longer returns `[]`: it returns **two records** — the Log
Analytics workspace and the container registry — with **every cost field the string
`'None'`** (`pretaxCost`, `currency`, `usageStart`, `usageQuantity` all `'None'`). The
database does not appear at all, consistent with it being about an hour old against a
documented 8–24 hour lag.

So Task 1.11.8's "the environment is too young" diagnosis is now definitively **not the
explanation** — the environment is two days old and the API answers with shaped records
carrying no numbers. **This task is looking for a fourth shape or a real figure**, and it
should also try the **Cost Management query API** separately, which last answered `429`.
The budget was re-read by 2.1.5 and is unchanged: `marketpulse-monthly`, **$20**,
50/80/100%, `currentSpend` **0.0**.

### The sweep list gained a category, and it is regions rather than credentials

Task 2.1.5 falsified recorded claims in a way this task must sweep, and **they are
Task 2.1.1's rather than Epic 1's**:

- **"the database is in East US 2"** — false; it is **North Central US**. Occurrences
  corrected in `HOSTING.md` (the section heading, the Account facts table), `CLAUDE.md`
  and this story's `STORY.md`; **grep the tree for the rest and read every one**, since
  some occurrences are historical records of what 2.1.1 decided and are correct in their
  own context. That is Task 1.13.6's read-every-occurrence rule, and this is its first
  application in Epic 2.
- **"the three price meters are identical in both regions"** — true of East US and East
  US 2, false generally; US regional variation reaches **29%**.
- **"usable capacity is ~27 GiB"** and **"~24 years / ~5 years"** — corrected to
  **~22.5 GiB** and **~20 years / ~4 years**. Struck through in `HOSTING.md` and
  `CLAUDE.md`; check for others.
- **`supportedIops: 640`** for `Standard_B1ms` is the SKU ceiling, not the provisioned
  disk's **120**.

### Three things for ADR 0014 that were not in the brief's subject list

- **Create this server through ARM, not through `az postgres flexible-server create`.**
  The CLI cannot create an Entra-only server and its error message
  (`MissingRequiredParameter: 'AdministratorLoginPassword'`) describes the tool rather
  than the platform. This belongs in the ADR because it is the reproduction recipe.
- **What a reachable database certifies and what it does not**, the section the brief
  already asks for, now has real material: `verify-full` verifies chain **and** host name
  (both made to fail), the server **requires** encryption (`28000`, "no encryption"), and
  **none of that says the credential path works** — that is Task 2.1.6's.
- **Region availability is not a decision this project gets to make.** Two regions were
  taken away in two days on one service, and a third resource is now in a third region.
  The transferable rule — re-read `list-skus` immediately before creating, never cite a
  document — earned itself in 24 hours and belongs in the ADR rather than only in
  `HOSTING.md`.

### Figures this task should expect to re-take rather than cite

`pnpm verify` was **exit 0 in 25.79 s** on 2026-09-05 with a database running and 207
fast tests plus 14 process tests. Task 2.1.5 shipped **no application source**, so the
frontend artefact should still reproduce Task 1.13.4's four files and **361,664 B** to
the byte — which is the check rather than a coincidence.

### Two additions found by re-reading this amendment round rather than by writing it

- **The platform-only-configuration gap — `CLAUDE.md`'s "sixth kind" — roughly doubled,
  and the sharpest new instance is not a setting.** It previously named the Container
  App's three probes, `minReplicas: 1`, the ingress port, `HOST` and `CORS_ORIGIN`. Task
  2.1.5 added the database's **two firewall rules**, its **Entra administrator**, the
  **action group and two metric alerts**, the **`CanNotDelete` lock**, and — the one that
  is different in kind — the **`marketpulse-backend` role**, which is not a value that can
  be re-read and diffed but a **one-off SQL statement that must be re-run by hand if the
  server is ever re-created**. `HOSTING.md` is its only copy. `CLAUDE.md` records this as
  of 2026-09-05; **ADR 0014 should carry it too**, because that is where a future reader
  looks for what the platform holds that this repository does not.
- **Confirm the `developer-laptop` firewall rule is still wanted.** Task 2.1.5's brief
  asked that laptop access be "a decision rather than something that quietly stays on",
  and it is currently a decision: one IPv4 address, `122.11.246.19`. But **a developer's
  IP moves**, so this rule is either stale or wrong most of the time, and under the lock it
  can be **updated but not deleted**. As the closing task, confirm it or remove it
  deliberately — this is exactly the "quietly stays on" the brief warned about.
