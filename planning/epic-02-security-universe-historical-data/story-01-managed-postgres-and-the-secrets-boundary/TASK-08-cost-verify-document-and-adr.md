# Task 2.1.8 — Re-take the cost question, verify from a clean clone, document, and record ADR 0014

**Status:** Not started
**Story:** [2.1 Managed Postgres Provisioning & the Secrets Boundary](STORY.md)
**Depends on:** Tasks 2.1.1–2.1.7

## Objective

Close the story: answer the cost question Epic 1 could not, re-run all eight acceptance criteria against what actually shipped rather than citing the tasks that built it, and write the decision record.

## Work

- **Re-take the cost question, and characterise the refusal again if it refuses.** Epic 1 left this explicitly open and owned by Epic 2. Task 1.11.8 found both billing APIs refusing the subscription — reproduced six times — with the decisive cause being that the whole environment was **under six hours old** against a billing lag of 8–24 hours; Task 1.12.7 then found the refusal had **changed shape**, with `az consumption usage list` returning `[]` at exit 0 and the Cost Management query API answering `429`. The environment is now old enough that the stated cause no longer applies, so this is a real attempt with a real expectation. If it refuses again, the finding is _how_ — a third shape means the earlier diagnosis was wrong
- **Answer the question the estimate was always a proxy for: does continuous probing break the Consumption plan's idle-billing condition?** That is under 1,000 bytes per second, platform probes do not count and the frontend's polls do, and Epic 1 recorded the whole question as still open. A real bill for a month that contains both is the only instrument that answers it
- **Re-read the budget and adjust it if the database moved the arithmetic.** $20 with alerts at 50/80/100%, re-read twice and found to sit just *above* the active-rate total of $19.04 — so it would not fire on the change that matters most. A database that adds anything at all makes that worse, and Task 2.1.1 predicted a figure this task should now check against reality
- **Re-run all eight acceptance criteria and re-take every figure.** The repository's rule is that a claim is re-measured rather than cited, and Epic 1's closing tasks earned that rule four separate times by finding recorded claims that had stopped being true. Specifically: run `pnpm verify` **with no database running**, which is criterion 8 and the property the chain has had since Story 1.1; run `pnpm test:process` both ways; and do criterion 3 by **following `README.md` from a genuine clean clone** rather than reading it, since that is the only place a first-run instruction's gaps show up
- **Sweep the claims this story falsified.** ADR 0011's "nothing deployed holds a credential" and ADR 0006's untested secrets boundary are the two the story names, and the sweep is a `grep` across the tree with **every occurrence read** rather than replaced — Task 1.13.6's finding is that of sixteen occurrences of one sentence, four were live claims, nine were historical records correct in their own context, and one was about something else entirely. Strike through rather than delete, per this repository's habit
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
