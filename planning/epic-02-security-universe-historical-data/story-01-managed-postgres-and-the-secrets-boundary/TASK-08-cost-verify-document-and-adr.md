# Task 2.1.8 — Re-take the cost question, verify from a clean clone, document, and record ADR 0014

**Status:** Not started
**Story:** [2.1 Managed Postgres Provisioning & the Secrets Boundary](STORY.md)
**Depends on:** Tasks 2.1.1–2.1.7
**Amended:** 2026-09-04, after Tasks 2.1.1 and 2.1.2 — see the two _Amended_ sections below

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
