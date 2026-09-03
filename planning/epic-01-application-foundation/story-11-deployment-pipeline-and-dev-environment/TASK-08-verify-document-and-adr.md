# Task 1.11.8 — Verify the deployed environment, document it, and record ADR 0011

**Status:** Not started
**Story:** [1.11 Deployment Pipeline & Development Environment](STORY.md)
**Depends on:** Task 1.11.7

## Objective

Close the story: re-run all six acceptance criteria against the deployed environment rather than inheriting them from the tasks that built it, and leave the reasoning somewhere it outlives this planning tree.

## Work

- **Re-run every acceptance criterion, and re-take every figure.** This is the Story 1.10 pattern and it exists because citation rots: that story's closing task found a badge state that had expired, a heading count that had been counting the wrong thing, and eight copies of a convention that had quietly become false. So merge something and watch it deploy, request `/health`, deep-load a route and a made-up path, make the cross-origin call from a browser, read the cache headers again, and compare the deployed frontend's three files against a fresh local build
- **Re-take the frontend artefact's figures rather than carrying them.** This story is the first thing in six stories to change that artefact: `staticwebapp.config.json` has to reach the root of the build output, so `dist/` stops being three files and the md5 line that has been reproduced byte-for-byte since Task 1.7.7 stops being the whole story. Find every place the old figures stand with a `grep` for the byte counts rather than from memory — Task 1.10.8 found eight stale copies of a convention that way, and the count somebody remembers has been wrong twice in this repository.
- **Update `README.md`** with what a person needs and cannot derive: the two URLs, what is deployed to each, how a deploy is triggered, how to roll back, where the backend's configuration lives (the platform's panel) and why the frontend's cannot live there. Keep the existing honesty about what a green tick means; a deploy badge, if one is added, needs the same treatment — say what it certifies and what it does not
- **Update `CLAUDE.md`**: current state, the file tree (this story adds files — a container definition, platform configuration, possibly a deploy workflow), the Commands section if anything new is runnable, and the deployment facts that belong in the operational summary
- **Re-date the `pnpm verify` gap list and enlarge it honestly, because this story makes it worse in a new way.** The list is currently six entries, and the newest of them is `.github/workflows/verify.yml`, whose formatting Prettier checks and whose schema nothing does. Anything this story adds is the same shape or worse: a `Dockerfile` is read by no tool here at all (the `scripts/dev.sh` case), a platform configuration file may or may not have a Prettier parser — **check it with `prettier --file-info` rather than guessing**, which is the one-liner that separated the workflow from the shell script. Two concrete predictions to test rather than assume: `staticwebapp.config.json` is JSON and so is probably **inside** the net, which would make it the first platform configuration this repository actually checks; and a `Dockerfile` is probably **outside** it entirely, joining `scripts/dev.sh`. If `staticwebapp.config.json` ships inside `dist/`, note the second-order effect — it is then both a source file Prettier formats and a build output, which is a shape nothing else here has — and a deployed URL in prose is a figure nothing verifies. Count the new entries rather than describing them, and record the tool decisions (`actionlint` and `shellcheck` are both declined and dated; a third decline needs the same treatment)
- **Write `docs/adr/0011-*`.** It is the eleventh, and the numbering convention is in `docs/adr/README.md`. What it must record, each with the alternative that was rejected: the hosting choice for both halves and what the reversal costs; the two artefact shapes and why `pnpm deploy --filter` answers one and is meaningless for the other; the container start command, the `linux/amd64` requirement and the PID 1 finding; **the container registry choice and its authentication**; **`minReplicas: 1`, which is the setting the whole Epic 3 argument rests on**; the fallback's scoping and why a blanket catch-all was refused; the cache policy; **the per-environment build consequence**, which is the decision most likely to be re-litigated later; where the deploy runs and why it does not re-define the build; the failure and rollback behaviour, including the asymmetry between the two halves; the database decision; and the publish-the-workshop decision. **`HOSTING.md` is the input rather than a second copy** — the ADR records why, and should not restate the quoted limit tables, but it does owe one thing that document cannot have: **Epic 10's four-minute SSE constraint**, which is a decision taken in a deployment story that binds an epic nine stories away and will otherwise be discovered by an agent stream dying in production
- **Say what Story 1.12 inherits.** It is the last story in Epic 1 and it lands the first real frontend-to-backend call, which is also the first thing that makes the backend's `@marketpulse/shared` symlink live at run time — a latent problem this story's artefact work should already have closed, and 1.12 is where it would surface if it did not
- **Mark the story complete**, with the criteria table and the date, and note anything that was deliberately left open with its owner

## Done when

- All six acceptance criteria were re-run against the deployed environment and recorded, including the two Story 1.5 criteria this story inherited
- Every figure in the story's documentation was re-taken rather than copied, and any that had drifted is corrected with the correction itself measured
- `README.md` and `CLAUDE.md` are updated, and every command in them was executed rather than read
- `docs/adr/0011-*` exists and explains _why_, with rejected alternatives
- The `pnpm verify` gap list is re-dated, with this story's new entries counted and each tool decision stated
- The story is marked complete and Story 1.12's inheritance is written down

## Notes

Epic 1's exit criterion is a deployed, verified foundation, and this is the task that gets to claim it. The claim is only worth anything if it was re-measured here: five of the last six closing tasks in this epic found at least one recorded figure that had stopped being true, and every one of them was found by re-running rather than by reading.
