# Task 1.10.7 — The `pnpm verify` gaps, re-dated, and the README link-check decision

**Status:** Not started
**Story:** [1.10 Continuous Integration Pipeline](STORY.md)
**Depends on:** Task 1.10.2

## Objective

State plainly, in the one story whose deliverable is a green tick, everything that green tick does not cover — and settle the one gap Stories 1.8 and 1.9 both explicitly handed here.

## Work

- **There are four gaps and they are two different kinds.** The story's criterion says to record them rather than close them, and Stories 1.7, 1.8 and 1.9 each re-dated them rather than deleting any. Re-date all four again, and re-check each rather than citing it — the whole reason the fourth kind exists is that a cited claim rots:
  - **`apps/backend/scripts/dev.sh`** — read by nothing. ESLint sees only JS and TS, Prettier has no shell parser and skips it silently, `tsc` has no view of it. It is the file that starts the development loop, and since Task 1.7.1 it carries `export LOG_FORMAT="${LOG_FORMAT:-pretty}"`, the only configuration value `pnpm env:check` cannot see — so a typo there is not an error, it is a silent fallback to JSON
  - **The `rm -rf` fragments in two `clean` scripts** — unchecked shell inside a JSON string, in the root and in `apps/frontend`, both carrying `storybook-static` since Task 1.4.5
  - **The stated-but-unchecked invariant** — the kind Task 1.6.4 found, where a file every tool reads carries a guarantee nothing enforces. `apps/frontend`'s `types` array was documented in three places as making `process` a compile error in browser code; it stopped being one in Task 1.4.5 and stayed wrong for two stories. Two checks exist because of it (`env:check`, and `no-restricted-globals` over `apps/frontend/src/**`), and both were made to fail before they were trusted. **This is the one CI structurally cannot help with**, and it is the reason this task exists in a story about automation
  - **`README.md`'s prose figures and its intra-document links** — recorded by Task 1.8.7 and enlarged twice by Story 1.9 (a three-row coverage table in two documents, and a whole section of executed command forms). This story owns it
- **Do not add `shellcheck`.** The story says so explicitly, and the reasoning is the repository's standing one: one small shell file and two short strings do not justify a new root dependency and a further `verify` step. Record it as a known and dated choice, not as something CI is quietly assumed to catch
- **Settle the link check, and read Story 1.8's argument before deciding.** The two halves are not alike. **Links are cheaply checkable and have been checked by hand three times** — 34 headings, 11 links, 10 distinct, **0 broken**, with the standing trap that a slugger which collapses whitespace reports the correct double-hyphen anchor as broken. **Figures in prose have nothing to compare against and no tool can check them at all** — and the evidence is that they go wrong: Task 1.8.5 found the stylesheet documented at 9.82 kB against an actual 10,926 B, stale for two stories, and Task 1.8.6 found three more wrong figures in a single reading. So closing the cheap half alone makes the section _look_ covered while the expensive half stays open, which is the argument that rejected it twice as scaffolding. Decide here, with two constraints on a yes:
  - **A CI-only check forks the definition of "verified"**, which is the exact failure Task 1.10.2 exists to prevent. If a link check is built, it belongs in `verify` as a seventh step — alongside `stories` and `env:check`, both of which are plain-JavaScript scripts under `scripts/` that ESLint and Prettier already cover — and not as a workflow step
  - **It must be made to fail before it is trusted.** `stories` and `env:check` were both broken deliberately before they were believed; the double-hyphen anchor is the ready-made test case
  - If the answer is no, say so as a decision with its reversal trigger, and do not leave the gap implied
- **Add the new gap this story creates — and it is half a gap, which Task 1.10.1 measured rather than left for this task to determine.** `.github/workflows/*.yml` is YAML, and the instinct is to file it beside `scripts/dev.sh` as another file no tool reads. That is wrong in one direction: **Prettier ships a YAML parser and `prettier --check .` reaches `.github/workflows/`**, proved by dropping a badly-formatted probe workflow into the directory and watching `format:check` fail on it. So the file's _formatting_ is inside the net. ESLint does not read it and nothing validates the **schema**: a misspelled key, an action reference that does not resolve, or a `runs-on` label GitHub retires are all green locally and red only on the runner. `actionlint` is the tool that would close it; declining it is the `shellcheck` decision applied to one file, and should be recorded the same way rather than left implied. Re-check the Prettier half here rather than citing it — that is this task's whole subject — but do not re-derive it from scratch. The pipeline's own definition is the one file whose breakage is invisible until a run fails — or worse, until a run silently stops triggering. Record it with the others rather than letting it arrive unlisted
- **Write the honest framing into the ADR and the README, in one sentence each.** A green pipeline means every check passed, not that every claim holds. The only thing that has ever caught a claim in this repository is a task whose Done-when said to re-measure rather than to cite

## Done when

- All four gaps are re-checked, re-dated, and stated in `CLAUDE.md`, `README.md` and the ADR with the same wording
- The fifth — the workflow file itself — is added to the list **as a half-gap**, with Prettier's actual treatment of it re-checked rather than cited, and with `actionlint` recorded as declined rather than unconsidered
- The link-check question is answered in writing; if built, it is a `verify` step and it was made to fail first
- `shellcheck` is still not installed, and the reason is dated
- Nothing in the repository implies CI covers any of the five

## Notes

The list is the deliverable. Three stories in a row have chosen to record these rather than close them, and each time the record was worth more than a partial fix would have been — because the gaps are the places where a reader would otherwise assume coverage from a green badge.
