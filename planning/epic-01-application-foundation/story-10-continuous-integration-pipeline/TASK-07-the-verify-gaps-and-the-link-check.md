# Task 1.10.7 — The `pnpm verify` gaps, re-dated, and the README link-check decision

**Status:** Complete
**Story:** [1.10 Continuous Integration Pipeline](STORY.md)
**Depends on:** Task 1.10.2 — read its hand-off in [STORY.md](STORY.md#what-task-1102-hands-the-remaining-tasks) first

## Objective

State plainly, in the one story whose deliverable is a green tick, everything that green tick does not cover — and settle the one gap Stories 1.8 and 1.9 both explicitly handed here.

## Work

- **There are four gaps and they are two different kinds.** The story's criterion says to record them rather than close them, and Stories 1.7, 1.8 and 1.9 each re-dated them rather than deleting any. Re-date all four again, and re-check each rather than citing it — the whole reason the fourth kind exists is that a cited claim rots:
  - **`apps/backend/scripts/dev.sh`** — read by nothing. ESLint sees only JS and TS, Prettier has no shell parser and skips it silently, `tsc` has no view of it. It is the file that starts the development loop, and since Task 1.7.1 it carries `export LOG_FORMAT="${LOG_FORMAT:-pretty}"`, the only configuration value `pnpm env:check` cannot see — so a typo there is not an error, it is a silent fallback to JSON
  - **The `rm -rf` fragments in two `clean` scripts** — unchecked shell inside a JSON string, in the root and in `apps/frontend`, both carrying `storybook-static` since Task 1.4.5
  - **The stated-but-unchecked invariant** — the kind Task 1.6.4 found, where a file every tool reads carries a guarantee nothing enforces. `apps/frontend`'s `types` array was documented in three places as making `process` a compile error in browser code; it stopped being one in Task 1.4.5 and stayed wrong for two stories. Two checks exist because of it (`env:check`, and `no-restricted-globals` over `apps/frontend/src/**`), and both were made to fail before they were trusted. **This is the one CI structurally cannot help with**, and it is the reason this task exists in a story about automation
  - **`README.md`'s prose figures and its intra-document links** — recorded by Task 1.8.7 and enlarged twice by Story 1.9 (a three-row coverage table in two documents, and a whole section of executed command forms), and **once more by Task 1.10.6, into the most-read paragraph in the repository**: the sentence beside the badge names the chain's seven steps and 103 fast tests plus the 10-test process suite, taken from a real run and checked by nothing thereafter. It goes stale the moment a test is added, and it now sits above the fold under a green badge. This story owns it
- **Do not add `shellcheck`.** The story says so explicitly, and the reasoning is the repository's standing one: one small shell file and two short strings do not justify a new root dependency and a further `verify` step. Record it as a known and dated choice, not as something CI is quietly assumed to catch
- **Settle the link check, and read Story 1.8's argument before deciding.** The two halves are not alike. **Links are cheaply checkable and have been checked by hand four times** — and the recorded figures are stale, which is itself the argument: Task 1.8.7's 34 headings / 11 links / 10 distinct is now **42 headings, 13 links, 12 distinct, 0 broken**, re-measured in Task 1.10.6 after the badge paragraph added two. The standing trap holds — a slugger which collapses whitespace reports the correct double-hyphen anchor as broken, and 1.10.6's checker reproduced that a fourth time by not collapsing. **Figures in prose have nothing to compare against and no tool can check them at all** — and the evidence is that they go wrong: Task 1.8.5 found the stylesheet documented at 9.82 kB against an actual 10,926 B, stale for two stories, and Task 1.8.6 found three more wrong figures in a single reading. So closing the cheap half alone makes the section _look_ covered while the expensive half stays open, which is the argument that rejected it twice as scaffolding. Decide here, with two constraints on a yes:
  - **A CI-only check forks the definition of "verified"**, which is the exact failure Task 1.10.2 exists to prevent. If a link check is built, it belongs in `verify` as an **eighth** step — the chain took its seventh in Task 1.10.5 — alongside `stories` and `env:check`, both of which are plain-JavaScript scripts under `scripts/` that ESLint and Prettier already cover — and not as a workflow step. **Task 1.10.5 is the worked example of that rule now rather than the hypothetical**: it needed a gating suite, put it in the chain, and cost the workflow no edit at all
  - **It must be made to fail before it is trusted.** `stories` and `env:check` were both broken deliberately before they were believed; the double-hyphen anchor is the ready-made test case
  - If the answer is no, say so as a decision with its reversal trigger, and do not leave the gap implied
- **Add the new gap this story creates — and it is half a gap, which Task 1.10.1 measured rather than left for this task to determine.** `.github/workflows/*.yml` is YAML, and the instinct is to file it beside `scripts/dev.sh` as another file no tool reads. That is wrong in one direction: **Prettier ships a YAML parser and `prettier --check .` reaches `.github/workflows/`**, proved by dropping a badly-formatted probe workflow into the directory and watching `format:check` fail on it. So the file's _formatting_ is inside the net. ESLint does not read it and nothing validates the **schema**: a misspelled key, an action reference that does not resolve, or a `runs-on` label GitHub retires are all green locally and red only on the runner. `actionlint` is the tool that would close it; declining it is the `shellcheck` decision applied to one file, and should be recorded the same way rather than left implied. **Tasks 1.10.3 and 1.10.4 enlarged this half-gap and it is now the more interesting half.** The file carries **four** third-party actions pinned to commit SHAs — `actions/checkout`, `actions/setup-node`, `actions/cache` and `actions/upload-artifact` — every one of them bumped by hand, because a SHA does not follow security releases. **Count them rather than citing this sentence**: it has been wrong once already, and it grows by one whenever a task adds a step. Nothing in this repository reads them, `actionlint` would not check them either, and a stale pin is invisible in every way a stale dependency is not: `pnpm outdated` has no view of a YAML file. Record it as its own line inside the half-gap, with the honest note that Dependabot is the tool that closes it and is a repository setting rather than a file — the same invisible-in-a-diff shape as the required check, **which Task 1.10.6 went on to actually set** — see the new bullet below. Re-check the Prettier half here rather than citing it — that is this task's whole subject — but do not re-derive it from scratch. The pipeline's own definition is the one file whose breakage is invisible until a run fails — or worse, until a run silently stops triggering. Record it with the others rather than letting it arrive unlisted
- **Task 1.10.2 added an unchecked claim of the third kind — the expensive kind — and it is inside the pipeline itself.** The `Verify` step's per-step split is **derived** from pnpm's output format: the step names are parsed out of the first `$ pnpm run a && pnpm run b …` line and the boundaries are the timestamps of the root-level `$ ` lines. Nothing checks that pnpm still prints either. If a pnpm upgrade changes the announcement format, the split prints **nothing, or the wrong names, on a run that is still green** — a stated invariant with no enforcement, which is exactly Task 1.6.4's class rather than the "file no tool reads" class. It is deliberately harmless by construction (the exit code is the chain's, never the parser's) and that is the sentence to write: **the split is diagnostics, not a check, and a silently empty split is not a failing build.** **Task 1.10.6 gave that claim a second consumer and a slightly worse failure mode**: the same derived file now also renders the job summary's first section, so a pnpm format change empties a section a reviewer reads rather than a block in a log nobody opens — still green, still harmless, and now more likely to be believed. Re-check it here by reading a real run's output rather than by citing this bullet
- **Task 1.10.3 added one more unchecked claim of the same class, and it is one line in the workflow.** The `Install` step prints `cache-hit` and then a sentence telling the reader to use pnpm's `reused`/`downloaded` counts to tell a restore-key hit from a miss. That sentence is true of `actions/cache` v6.1.0, read out of its own `action.yml`, and nothing checks it stays true across a SHA bump — the same shape as the derived split's dependence on pnpm's output format, and harmless in the same way: the cache is diagnostics around an install that either succeeds or fails on its own. Say so in one clause rather than letting it read as a check
- **Task 1.10.4 added a third claim of that class, and it is the one whose failure is quietest.** The coverage step's per-package table is derived from `pnpm -r`'s line prefixes — `<package-dir> coverage: All files | …` — exactly as the split is derived from pnpm's announcement lines, and nothing checks that pnpm keeps printing either. The difference is what happens when it stops: the split degrades inside a step whose exit code is the chain's, while the coverage table sits inside a step marked **`continue-on-error`**, so a derivation that matches nothing produces an annotation on a **green** run. Say that in one clause — **everything the coverage step reports is diagnostics that can only ever raise an annotation** — and note the one thing in there that is a real assertion: the two 0% entrypoints are checked for **presence in the report**, which is the answer to the third gap's own complaint that a stated invariant stops being enforced. It is enforced now, to the strength a non-gating step allows
- **Task 1.10.5 added two more of the third kind — stated invariants nothing enforces — and both are inside the test suites rather than in the pipeline.** Neither is worth a check; both are worth a line, because each fails silently and green:
  - **The two-runner partition is a naming convention with nothing behind it.** `apps/backend` has two Vitest configs whose globs partition `src/**/*.test.ts`: the unit config excludes `src/**/*.process.test.ts` and the process config includes exactly that. So a process-style test written as `src/thing.test.ts` runs in the **fast** suite — making the suite developers run all day conditional on a build and able to bind ports — and a `*.process.test.ts` file added to `packages/shared` or `apps/frontend` runs **nowhere at all**, because no other package has a second config. Both are green. This is Task 1.9.4's `.tsx` glob trap in a new place, and the mitigation is that the two globs are written as one decision with a comment in each file saying so
  - **The process suite's dependence on a fresh `dist/` is enforced by `pnpm verify`'s ordering and by an existence check, and by nothing else.** `pnpm test:process` on a stale `dist/` tests the previous commit and passes. A staleness check was built for exactly this and **removed after it was measured**: `tsc -b` re-emits from content hashes in `.tsbuildinfo`, so a `git checkout` makes every source newer than every output without changing a byte, and the mtime comparison failed a correct tree on its first run. Record the removal as a decision with that measurement, not as an omission
- **The derived split has now been exercised with a step it did not know about, on the runner.** Task 1.10.5 added `test:process` to the chain and the split printed it — `test:process 9199 ms`, in the same table as the other six, with the workflow file untouched — **`.github/workflows/verify.yml` since Task 1.10.6 renamed it**, so that task's own run is the second sighting of the property (`test:process 9069 ms` in a seven-row table, again with no step named in the file). That is evidence for the property rather than for the claim: the split still depends on pnpm's output format and nothing checks that it does, so the framing is unchanged — **diagnostics, not a check** — but it has now been seen to work in the one case it was built for. Re-read it from a real run here, as this task already says
- **The action-SHA count is still four after Tasks 1.10.5 and 1.10.6**, neither of which added an action — 1.10.5 added no step at all, and 1.10.6 renamed the file and extended a step that already existed. That is a fact to check against the file rather than to carry forward: the instruction above is to count them, and this line exists so a miscount has something to disagree with
- **Task 1.10.6 added a sixth thing nothing in this repository checks, and it is not a file at all.** `verify` is a **required status check on `main`**, through repository ruleset `main` (id 22160620), which requires a pull request and that check. Nothing in the tree records it, no tool reads it, and `pnpm verify` cannot see it — it is the invisible-in-a-diff shape the action-SHA bullet above predicts for Dependabot, arriving first. Three things about it fail silently and belong in the list rather than only in the ADR: it keys on the **job** name, so renaming the job un-requires it with no error anywhere; **admin bypass is retained**, so the gate is a decision to override rather than a wall, and a merged red run leaves no trace in any file; and two GitHub defaults were changed at creation — `require_extra_approval_for_unattributed_changes` **off** (it defaults **on**, and with `required_approving_review_count: 0` it blocks the maintainer's own pull request over a co-author trailer that resolves to no account) and `strict_required_status_checks_policy` **off** (a `pull_request` run already verifies the merge commit). A future reader finding the gate absent cannot tell whether it was removed or never set. Record the ruleset id and both changed defaults, and say plainly that the repository has no way to detect its own gate being switched off
- **And record what `continue-on-error` does to a step's reported result, because it reads like a gap and is not one.** A step marked `continue-on-error` reports `conclusion: success` however it exited — in the API and in the UI — and the real result lives in `steps.<id>.outcome`. That is the intended shape (no coverage outcome may turn the tick red) and it is also exactly the sort of thing a later reader files as "CI is silently swallowing failures". Write it down as a decision with its evidence — a throwaway commit made the assertion fail, the run stayed `success`, and two `failure` annotations were the visible trace
- **Write the honest framing into the ADR and the README, in one sentence each.** A green pipeline means every check passed, not that every claim holds. The only thing that has ever caught a claim in this repository is a task whose Done-when said to re-measure rather than to cite

## Done when

- All four gaps are re-checked, re-dated, and stated in `CLAUDE.md`, `README.md` and the ADR with the same wording — the third of them now covering Task 1.10.5's two additions (the two-runner naming partition, and the process suite's unchecked dependence on a fresh `dist/`)
- The fifth — the workflow file itself — is added to the list **as a half-gap**, with Prettier's actual treatment of it re-checked rather than cited, with `actionlint` recorded as declined rather than unconsidered, and with the hand-bumped action SHAs recorded as the part no tool in or out of this repository watches — **counted from the file rather than copied from a task write-up**
- The link-check question is answered in writing; if built, it is a `verify` step and it was made to fail first
- `shellcheck` is still not installed, and the reason is dated
- The required-check ruleset is recorded — id, the job-name coupling, admin bypass, and both GitHub defaults changed at creation — as configuration no file in this repository can see
- Both derived readouts — the per-step split and the coverage table — are recorded as diagnostics rather than checks, with their dependence on pnpm's output format stated and re-read from a real run, and with the coverage step's `continue-on-error` reporting behaviour written down as a decision rather than left to look like a swallowed failure
- Nothing in the repository implies CI covers any of the five

## Notes

The list is the deliverable. Three stories in a row have chosen to record these rather than close them, and each time the record was worth more than a partial fix would have been — because the gaps are the places where a reader would otherwise assume coverage from a green badge.

## Outcome

Delivered 2026-09-03. The list is in `README.md` (a new
`What \`pnpm verify\` does not cover`section, linked from the badge paragraph
at the top) and in`CLAUDE.md`, in the same terms. **ADR 0010 does not exist
yet and was deliberately not stubbed here** — Task 1.10.8 owns writing it and
already lists _"the five things `pnpm verify` does not cover"_ as one of its
numbered sections, so a stub written now would fork the record it is meant to
be. This task's list is the input; 1.10.8 carries it across.

**Every claim was re-measured rather than cited, and one of them was wrong.**

- **`scripts/dev.sh` is still read by nothing**, and the cheapest proof is a
  one-liner rather than a probe: `prettier --file-info` reports
  `"inferredParser": null` for it and `"inferredParser": "yaml"` for
  `.github/workflows/verify.yml` — the same command separating the two gaps.
  ESLint reports `File ignored because no matching configuration was supplied`
- **Prettier really does reach `.github/workflows/`.** Re-proved end to end: a
  badly-formatted probe workflow dropped into the directory failed
  `pnpm format:check` by name at exit 1, and the failure went away when it did
- **The invariant of the third kind is still where Task 1.6.4 left it.** A
  probe under `apps/frontend/src/` reading `process.env` and importing
  `node:path` typechecks at **exit 0**; only ESLint reports it, by name, on
  both rules
- **Four pinned actions**, counted from the file: `actions/checkout`,
  `actions/setup-node`, `actions/cache`, `actions/upload-artifact`. No
  `.github/dependabot.yml` exists
- **The ruleset was read from the API**, not from Task 1.10.6's write-up: id
  22160620, `enforcement: active`, `~DEFAULT_BRANCH`, one `pull_request` rule
  with `required_approving_review_count: 0` and
  `require_extra_approval_for_unattributed_changes: false`, one
  `required_status_checks` rule with `strict_required_status_checks_policy:
false` and context `verify`, `bypass_actors` RepositoryRole 5 at
  `bypass_mode: always`
- **The derived split was read off a real run** (`main`, run 33709042823),
  which is its third sighting and its second on a chain the workflow file has
  never heard of: build 8,281 / lint 7,715 / `format:check` 6,307 /
  `stories` 446 / `env:check` 448 / `test` 6,429 / **`test:process` 8,910**,
  TOTAL **39,441 ms**. The coverage table and both
  `in the denominator: …` assertion lines were read off the same run

**The one thing that had rotted was a prose figure, which is the argument the
task is about.** Task 1.10.6 recorded `README.md` at **42 headings**; it has
**36**. The six-heading difference is `#` comment lines inside fenced code
blocks — a naive `grep -cE '^#{1,6} '` counts them and a correct slugger does
not, so the figure was a count of the wrong thing rather than one that went
stale. The link figures from the same reading reproduced exactly, and the
double-hyphen trap reproduced a fourth time.

## The link check: declined, with the evidence that had not existed before

The checker was **built and run before the decision was taken**, over every
tracked Markdown file rather than `README.md` alone, because a checker confined
to one document in a repository holding 110 of them would be an odd artefact.
The result: **110 files, 210 cross-file links, 13 anchor links (12 distinct),
0 broken.**

That number is the decision. Across ten stories, **the half that is cheap to
check has never once been wrong, and the half that cannot be checked at all is
wrong nearly every time anybody reads it** — the 9.82 kB stylesheet stale for
two stories, three more figures wrong in one reading in Task 1.8.6, and the 42
headings above. A link checker in `pnpm verify` would be a gating step guarding
the one thing that has never rotted, and its presence is precisely what would
make the section _look_ covered while the expensive half stayed open. That is
Story 1.8's argument, now with numbers under it rather than intuition.

**Reversal trigger:** a broken link actually shipping — found by a reader
rather than by a task — or documentation gaining generated content whose links
are not hand-written. If it is built then, it is an **eighth `pnpm verify`
step** and a plain-JavaScript file under `scripts/` beside `check-stories.mjs`
and `check-env-example.mjs`, never a workflow step; and the double-hyphen
anchors are a ready-made failure case, so the "made to fail first" rule costs
nothing.

`shellcheck` is still not installed. `actionlint` is declined for the same
reason. Both dated 2026-09-03.
