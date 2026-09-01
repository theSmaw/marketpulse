# Task 1.7.7 — Verify, document, and record the decisions as ADR 0007

**Status:** Not started
**Story:** [1.7 Logging & Error Handling](STORY.md)
**Depends on:** Tasks 1.7.1–1.7.6

## Objective

Close the story from a clean tree by re-running every criterion and re-measuring every figure, then write down what the next stories inherit.

## Work

- **Re-measure; do not inherit.** This is the rule Task 1.6.4 paid for: `apps/frontend`'s explicit `types` array was written down in three places as making `process` a compile error in browser code, stopped being true in Task 1.4.5, and stayed wrong for two stories because it was a stated invariant rather than a checked one. Every figure and every criterion in this task's outcome is measured in this task, from a clean tree — not copied from Tasks 1.7.1–1.7.6, which measured mid-story trees
- **Re-run all seven acceptance criteria end to end**, and for each one record the evidence rather than a tick: literal log lines for the structured-logging and request-logging criteria, a `curl -i` showing the correlation id in a header next to the log entry carrying it, the error body for a 500 and for a 404, a crash line surviving the exit, and a screenshot-equivalent description of one region failing while three render
- **Re-measure the numbers this story could have moved:**
  - Backend start-to-listening against Task 1.7.1's re-measured **73 ms** median for `LOG_FORMAT=json` and **79 ms** for `pretty` (the 76 ms figure recorded before this story is the pre-`LOG_FORMAT` one and reproduced at 74 ms), and the dev loop's edit-to-new-listener against **805–936 ms** json / **815–973 ms** pretty, both under the ~1.1 s baseline. **Take care with the "~100 ms SIGTERM half" figure** — 1.7.1 measured the raw process at **2 ms** json / 3 ms pretty and Ctrl-C to loop exit at 16–19 ms; the ~100 ms recorded in `CLAUDE.md` is the dev loop's restart half and is not the same measurement. Say which one is being reported
  - The frontend artefact against **265 modules, 342.08 kB of JavaScript, 9.82 kB of CSS, three files** — and whether it is still three files, which a boundary should not change
  - `pnpm verify` end to end and per step, against the **9.3–9.8 s** Task 1.6.7 recorded with its six steps
  - `storybook-static/` against **289 modules, 52 files, 9.2 MB on disk** — and note that figure was wrong in two planning documents until 2026-09-01, so cite the corrected one
- **Count the files importing whatever was installed.** If a logging transport, an error-boundary library or a schema helper landed, the count of files importing it is the figure worth watching, the same way one file imports `@base-ui/react`
- **Update the documentation that is now wrong, and there is more of it than usual:**
  - `CLAUDE.md` — the file structure block, the commands section if a script changed, and prose for the logging and error contract. If any package verb changed meaning, the **eleven-copy convention block** in every Epic 1 story changes with it; that drift has now been caught twice by a sweep rather than by a diff, so check it here rather than at the end of the epic
  - `README.md` — `LOG_LEVEL` **and `LOG_FORMAT`** in the human-facing environment reference (both landed in Task 1.7.1, taking `apps/backend/.env.example` to four variables), kept in step with that file, which `pnpm env:check` already checks against `CONFIG_VARIABLES`. Re-check the three level behaviours 1.7.1 documented there are still true: silence at `warn` and above including the readiness line, `silent` meaning silent, and `debug` showing nothing `info` does not — the last of these **should** have changed if any task in this story added a `debug` record
  - `EPIC.md` — the status line, and a **What Story 1.7 established for the rest of this epic** section
  - Feed-forward sections in the stories that inherit this: **1.9** gets a testable error contract and `buildServer({ logLevel: "silent", logFormat: "json" })`, which is why `silent` was admitted; **1.10** gets whatever CI now has to keep quiet or assert; **1.11** gets a log destination question, the production-detail decision, and the readiness hazard Task 1.7.1 measured — **at `warn` and above the server never prints `Server listening at …`, so a supervisor or health check waiting on that line hangs**, which is a deployment trap and not a logging detail; **1.12** gets the correlation-id header to send and the error shape to render
- **Write `docs/adr/0007-*`**, following 0001–0006: the decisions, the alternatives rejected, the measurements behind each, and the reversal triggers. The ones that must be in it:
  - **The log format, and the environment concept surviving its first real test.** `LOG_FORMAT=json|pretty` as a value set by `scripts/dev.sh`, with `NODE_ENV` and the `dev.sh` pipe rejected for stated reasons. This is the section most likely to be re-litigated later, because "surely this is what `NODE_ENV` is for" is the obvious thought
  - **`pino-pretty` as a `dependency` rather than a `devDependency`**, and the general rule it refines: the house test keys on _resolution at runtime_, not on the `import` keyword. That generalises past this story
  - The response-schema choice and the argument for why Story 1.6's rejection did not transfer
  - The production-detail mechanism
  - The boundary placement, with Task 1.5.5's blank-`<main>` measurement as its evidence
- **Check the gaps list is still accurate, and it is now understated.** `CLAUDE.md` records two files no tool reads (`scripts/dev.sh` and the `rm -rf` fragments in two `clean` scripts). Task 1.7.1 did **not** put a pipe there — it added `export LOG_FORMAT="${LOG_FORMAT:-pretty}"` — but that is still a change in kind: `scripts/dev.sh` now carries a **configuration value**, and it is the only variable in the application that `pnpm env:check` cannot see, because that check reads `CONFIG_VARIABLES` and `.env.example` and has no view of a shell script. A typo there is a silent fallback to JSON in the dev loop. Decide whether that is worth closing or is another known-and-dated acceptance, and update the note either way
- **Confirm the clean-clone path still works**, the way Tasks 1.1.8, 1.3.5, 1.4.6, 1.5.6 and 1.6.7 each did: fresh clone, cold store, `pnpm install`, `pnpm verify`, then run the pair. Note what a clean clone still does not prove — the stale-`dist` trap and the nested-worktree problem have no evidence there

## Done when

- Every acceptance criterion is re-verified from a clean tree with its evidence recorded
- Every figure above is re-measured and any that moved is attributed to the thing that moved it
- `CLAUDE.md`, `README.md`, `EPIC.md`, the story's own file and the downstream stories' feed-forward sections are all updated
- `docs/adr/0007-*` exists and records the alternatives and reversal triggers, not only the outcome
- `pnpm verify` exits 0 from a clean clone, and the story is marked Complete

## Notes

The story's own `Notes` section says later epics extend this pattern rather than replacing it — failed analytical tools (Epic 7), SEC unavailability (Epic 9) and agent failures (Epic 10) are product states. The ADR is where that intent has to be legible to whoever implements them.
