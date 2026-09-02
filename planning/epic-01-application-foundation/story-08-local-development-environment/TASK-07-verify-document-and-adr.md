# Task 1.8.7 — Verify, document, and record the decisions as ADR 0008

**Status:** Not started
**Story:** [1.8 Local Development Environment](STORY.md)
**Depends on:** Tasks 1.8.1–1.8.6

## Objective

Close the story: re-run every acceptance criterion from a clean tree rather than inheriting it, update `CLAUDE.md`, and write down why the development loop is shaped the way it is.

## Work

- **Re-run the criteria; do not tick them from the task write-ups.** Six of this story's criteria were already annotated as met or partly met before it started, and at least two of those annotations were written by earlier stories. Take each measurement again on the shipping tree. Task 1.7.7 rebuilt four old commits to discover that two "corrections" to recorded figures were themselves wrong — a figure that has moved looks exactly like a figure that was mis-recorded, and only re-taking it tells them apart
- **Re-measure, and attribute anything that moved to what moved it:** startup to both-ready, rendered lines per browser page load, both edit-to-visible timings in a **foreground** tab, the Ctrl-C survivor count and port release, `pnpm verify`'s per-step split warm and from a cold clone, and the built artefact's module count, byte size and file count. "Foreground" is a claim that has to be evidenced rather than asserted — Task 1.8.1 recorded `document.visibilityState` at the moment the DOM changed, and found a hidden tab costs **4–6×**, which is what made Task 1.4.6's 177–280 ms an upper bound and what collapsed the component and CSS-edit figures onto each other. If the frontend gained a dependency in Task 1.8.3, its cost is that task's number and belongs beside it
- **Write `docs/adr/0008-*` and add the row to `docs/adr/README.md`.** They are numbered in the order written and never renumbered. Context, decision, rejected alternatives, consequences — the consequences are the part that earns its keep. The decisions this story produces:
  - **How the pair is made legible** — Task 1.8.2 concluded, so this is a decision to record rather than a question to resolve: two `pino-pretty` options (`singleLine`, `translateTime: "SYS:h:MM:ss.l TT"`), a request from **12 rendered lines to 2**, no dependency and no change to `scripts/dev.sh`. The alternatives it beat all have names and measurements — `LOG_LEVEL` (the `warn`-and-above silence makes a quieter default a trap rather than an improvement), `messageFormat` (a template applies to every record and there is no per-record form), `ignore` (dropping `reqId` and `pid` is 172 → 117 columns and was rejected because `reqId` exists to survive interleaving), and a process manager (never reached, because two options cleared the bar). Two consequences belong in the write-up: **a stack is still multi-line**, so the port-conflict record did not shrink at all, and **`SYS:` is load-bearing** — without it `translateTime` formats in UTC, silently
  - **Proxy versus backend CORS**, with the Story 1.12 consequence stated: a proxy would leave 1.12's CORS allowlist testing nothing in the one environment anybody runs
  - **Why the frontend's ports are literals** (or are not, if Task 1.8.4 reversed it), and why `strictPort` is right either way
  - **How readiness is determined**, and the two independent reasons it cannot be a log grep — the silence at `warn`, and Fastify rewriting `0.0.0.0` to `127.0.0.1` in its own startup line
  - **Why Storybook is not in `pnpm dev`**, as a decision rather than an omission — and Task 1.8.2's reason is not the one Task 1.4.5 gave. The terminal-crowding argument does not survive measurement (the banner is 12 startup lines and survives pnpm's prefix intact); what decides it is that **Storybook does not strict-port**, so a busy 6006 silently becomes 6007 — the behaviour `strictPort: true` exists to prevent for 5173 and 4173
  - **Why there is still no environment concept**, if that held — ADR 0007 §1 is the record, and this story was the second test of Task 1.6.3's decision after the log format was the first
- **Two `CLAUDE.md` claims are already known to be wrong and this is where they get fixed — and Task 1.8.2 already fixed two _others_, so check before correcting.** What 1.8.2 landed in `CLAUDE.md`: a paragraph on the `pretty` rendering and one on why `LOG_LEVEL` was not the lever; a correction to the Ctrl-C paragraph (the package pnpm blames is a **race**, and every lever was measured); and a correction to the `--preserveWatchOutput` note, which now records that tsc's clear sequence is `ESC[2J ESC[H` and **not** the `ESC[1;1H ESC[0J` that paragraph attributes to it — that one is Vite's, so the two tools need two greps. The two still outstanding are 1.8.1's: Task 1.8.1 found both by re-running them rather than citing them: the filtered-frontend failure is no longer `Failed to run dependency scan … Are they installed?` but a `vite:import-analysis` pre-transform error naming the file and line, **and it does not appear until a browser requests a module** — `curl /` gets a clean 200 from a server that cannot render. And the sentence implying the doubled `packages/shared` build is visible in the dev loop is wrong; the second compile finds nothing to do and says so under a different prefix. Correct both rather than layering a note on top
- **Update `CLAUDE.md` and keep it and `README.md` in step.** The Commands section is the operational summary; the ADR is the record of _why_, and the two cross-reference. Story 1.8's status changes in the Current state paragraph, and the standing note "Still missing here: how to run a **single** test" stays — that is Story 1.9's
- **Update the epic.** Mark Story 1.8 complete in `planning/epic-01-application-foundation/EPIC.md`, and do the pass the last three stories each did: read Stories 1.9–1.12 against what this story actually shipped rather than what it was expected to ship, and correct the predictions it falsified. Story 1.10 inherits the readiness answer and the unchecked-`scripts/dev.sh` gap; Story 1.11 inherits the deep-linking constraint and anything build-time the API address turned out to be; Story 1.12 inherits the CORS decision and the connection mechanism — **and one reversal trigger from Task 1.8.2**: `reqId` was kept in the `pretty` rendering precisely because 1.12 is what makes requests interleave, and if they turn out not to, `ignore: "reqId,pid"` is the lever and it is worth 172 → 117 columns, which is the difference between a request line wrapping and not
- **Say what this story did not close.** The three gaps in `pnpm verify` are unchanged unless this story changed them: `scripts/dev.sh` is read by nothing, two `clean` scripts carry unchecked `rm -rf` fragments, and a stated invariant can quietly stop being enforced. Re-date them rather than deleting them
- Run `pnpm format` then `pnpm verify` from a clean tree, and confirm the artefact is reproducible

## Done when

- Every acceptance criterion is re-run on the shipping tree, and each one is ticked, annotated, or handed to a named story with its constraints
- Every figure this story publishes was re-taken here rather than copied from a task file
- `docs/adr/0008-*` exists, its row is in `docs/adr/README.md`, and each decision names the alternative it beat
- `CLAUDE.md` and `README.md` agree, and both describe what actually runs
- `EPIC.md` marks Story 1.8 complete and records the pass over Stories 1.9–1.12
- `pnpm verify` exits 0 from a clean tree, with the per-step split recorded

## Notes

The two things most likely to be got wrong here are citing a figure instead of re-taking it, and ticking a criterion an earlier story annotated. Both have precedent in this epic and both were caught late.
