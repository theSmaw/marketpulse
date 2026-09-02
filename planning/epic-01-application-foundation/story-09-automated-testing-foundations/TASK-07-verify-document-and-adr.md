# Task 1.9.7 — Verify, document, and record the decisions as ADR 0009

**Status:** Not started
**Story:** [1.9 Automated Testing Foundations](STORY.md)
**Depends on:** Tasks 1.9.1–1.9.6

## Objective

Close the story: re-run every acceptance criterion from a clean tree rather than inheriting it, remove the three sentences this story makes false, update `CLAUDE.md` and `README.md`, and write down why the testing stack is shaped the way it is.

## Work

- **Re-run the criteria; do not tick them from the task write-ups.** Take each measurement again on the shipping tree. This epic has twice found that a "correction" to a recorded figure was itself wrong — Task 1.7.7 rebuilt four commits to establish it — and a figure that has moved looks exactly like a figure that was mis-recorded. The seven criteria are: a runner in all three packages from the root; backend integration tests through the real HTTP layer including `/health`; frontend component tests through the real tree; example tests of each kind passing; single file and single test by name documented; coverage on demand; conventions documented
- **The three sentences that must die in this change, together.** "A green `pnpm test` means _no tests exist_, not _tests pass_" is in `README.md`, in `CLAUDE.md` — where it also carries an instruction not to describe it as passing tests in a commit message or a PR — and in ADR 0001 §5. All three become false when the last placeholder goes, and a stale warning is as misleading as the thing it was warning about. Amend ADR 0001 §5 rather than rewriting it: the record of what was true then stays, with the date this story changed it
- **Sweep for the other stale claims, and expect the list to be longer than this brief.** `CLAUDE.md` says `test` is an `echo` placeholder in all three packages and "the **only** placeholder left in the workspace"; the Commands block says `pnpm test # placeholders until Story 1.9`; the file tree has no test files, no runner config and no `coverage/` in it; and the closing Commands paragraph's outstanding single-test item should already be gone from Task 1.9.6 — check before correcting it, because five of Story 1.8's seven tasks edited that file and re-reporting someone else's fix as your own is this epic's most repeated small mistake
- **Write `docs/adr/0009-*` and add its row to `docs/adr/README.md`.** Numbered in the order written and never renumbered. Context, decision, rejected alternatives, consequences — the consequences earn their keep. The decisions this story produces:
  - **The runner**, and what it beat — with the `.js`-extension result under `nodenext` stated as the disqualifying measurement it is, not as a footnote, and with the "already in the lockfile as a Storybook transitive" argument recorded as the weak one it was
  - **How `@marketpulse/shared` is resolved by tests** — built output through `exports`, or a source alias — and the rejected option's failure mode, which is the interesting half: a source alias diverges from what ships, silently
  - **Where the runner is declared and where its environment is** — the root-only rule with the DOM environment as the counter-example that keeps it from being over-applied, exactly as `@types/node` is for `apps/backend`
  - **Where tests live and what they are named**, and what that buys: inside `src/` they typecheck, lint type-aware, and take the React Compiler rules and `--max-warnings 0`
  - **The one render helper** as the third and last description of the application's context, after `App.tsx` and `.storybook/preview.tsx`, and the rule that every provider Epic 2 adds lands there
  - **Coverage on demand and no threshold**, with the baseline figures and what they structurally exclude
  - **`@storybook/addon-vitest`, adopted or rejected** — either way it is a decision with a reason, and the reversal trigger belongs with it
  - **What this story deliberately did not test**, which is the entry a future reader will most want: the backend's process half needs a child process against a built tree, and the frontend has no async subject at all until Story 1.12's polling effect
- **Update `EPIC.md`.** Mark Story 1.9 complete, and do the pass the last five stories each did: read Stories 1.10, 1.11 and 1.12 against what this story actually shipped rather than what it was expected to ship, and correct the predictions it falsified. Story 1.10 is the direct consumer — it depends on 1.9 and it inherits a `pnpm test` that finally means something, a coverage command that is deliberately **not** in `verify`, and the standing instruction that `pnpm ready` must not become a `verify` step either. Say whether anything this story found should change what CI runs. Do not add, delete or re-order a story without saying why in the epic's own notes, as every previous pass has
- **Re-take the workspace's own figures, because they are in two documents.** `pnpm verify` warm and from a cold clone, per-step — the split is what means something, since four consecutive stories have now measured the total going up and down while the tree only grew. The new `test` step is the figure this story owns. Take the built artefact's module count, byte size, file count and md5 too: the frontend gained a DOM environment as a devDependency and possibly a Storybook test addon, and if `dist/` moved at all, attribute it. It has been byte-identical at 271 modules / 343,658 B / 10,926 B / three files / md5 `cba2825c…` since Task 1.7.7
- **Run the clean clone.** It is the ninth, and this time it has a new question: does `pnpm test` pass from a fresh install, and does it pass **before** a build? `packages/shared` is consumed as built output, so the answer depends on Task 1.9.1's resolution decision, and a clean clone is the one environment with no `dist` anywhere to hide it. Record the install's package count — 327 at Task 1.8.7, and this story adds to it
- **Say what this story did not close.** The `verify` gaps are unchanged unless this story changed them, and one of them is now testable in a way it was not: `apps/backend/scripts/dev.sh` is still read by nothing, the two `clean` scripts still carry unchecked `rm -rf` fragments, `README.md`'s prose figures and links are still read by no tool, and a stated invariant can still quietly stop being enforced. Re-date them rather than deleting them. If Task 1.9.3's route-schema test landed, that is one gap closed by a test rather than a `verify` step — say so, because it is the model for the others
- Run `pnpm format` then `pnpm verify` from a clean tree, and confirm the artefact is reproducible

## Done when

- Every acceptance criterion is re-run on the shipping tree, and each one is ticked, annotated, or handed to a named story with its constraints
- Every figure this story publishes was re-taken here rather than copied from a task file
- All three "no tests exist" sentences are gone in this same change, ADR 0001 §5 amended rather than rewritten
- `docs/adr/0009-*` exists, its row is in `docs/adr/README.md`, and each decision names the alternative it beat
- `CLAUDE.md` and `README.md` agree, and both describe a workspace that has tests
- `EPIC.md` marks Story 1.9 complete and records the pass over Stories 1.10–1.12
- A clean clone installs, builds and passes `pnpm test`, with the per-step `verify` split recorded

## Notes

The two things most likely to be got wrong here are citing a figure instead of re-taking it, and ticking a criterion an earlier story annotated. Both have precedent in this epic and both were caught late. The third, specific to this story: writing "tests pass" where the honest sentence is which tests exist. The whole point of removing the placeholder warning is that the green tick now means something — it means precisely what was written, and no more.
