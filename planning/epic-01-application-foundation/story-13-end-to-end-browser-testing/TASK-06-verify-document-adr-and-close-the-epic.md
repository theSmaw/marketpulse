# Task 1.13.6 — Verify, document, record ADR 0013, and close Epic 1

**Status:** Not started
**Story:** [1.13 End-to-End Browser Testing](STORY.md)
**Depends on:** Task 1.13.5

## Objective

Close the story the way every Epic 1 story has been closed — re-running every criterion and re-taking every figure from a clean tree — and then close the epic, which no task before this one has had to do.

## Work

- **Re-run all six acceptance criteria and re-take every figure rather than citing one.** The record across twelve stories is that the half that is cheap to check has never been wrong and the half that cannot be checked has been wrong nearly every time it is read
- **Write `docs/adr/0013-*`.** It should record decisions rather than a changelog: the tool and what the rejected one was better at; where specs live and why a `.ts` file's home is a constraint rather than a preference; where the suite sits relative to `pnpm verify`, stated **next to** Story 1.10's rule that the pipeline defines nothing of its own, because this is the first thing that strained it; what the suite deliberately does not assert; and — in the shape ADR 0010 used for the tick — **what a green run certifies and what it does not**
- **Update `CLAUDE.md` and `README.md` together.** The test-level list is now five levels rather than four, `allowBuilds` has a second entry for the first time since Task 1.4.5, the pinned-action count moves if Task 1.13.4 added one, there is a new command in the Commands section, and there is a new workspace package or a new top-level directory in the tree diagram — which is the first structural change to that diagram since Story 1.1 drew it
- **Run the duplicated-sentence sweep with a `grep`, and expect this story to have created work for it.** Two stories have found this class of drift: Task 1.9.7 found a warning standing in **thirteen** places rather than the three recorded, and Task 1.10.8 found **eight** copies of a claim false since Task 1.10.5 and amended only in the copy being edited. **This story's own STORY.md added a copy of the "Conventions from Story 1.1" block**, so the hash comparison should now find ten identical rather than nine — verify that rather than assuming it, since a block copied by hand is exactly how the count starts drifting. **Re-measured in Story 1.12's review pass (2026-09-04) and the shape is worth knowing before you count: there are twelve blocks, of which ten are byte-identical.** Stories 1.2 and 1.3 carry their own historical strike-throughs and Story 1.1 correctly carries none, having set them — so the number to compare is _identical hashes_, not copies, and the two are not the same number
- **Sweep for claims this story falsified.** Candidates: every statement that the backend's process half is the fourth and last level of test; ADR 0009's account of what has and has not been installed, which currently records that **no** Playwright was ever pulled in; the `verify`-gap list, whose fifth kind is four files whose formatting is checked and whose schema is not — a browser tool's config file is probably a fifth; and the "`esbuild` is the only install script in the tree" sentence, which stands in several places and is about to be false
- **Close Epic 1.** Check each of `EPIC.md`'s four exit criteria against the tree rather than against story statuses — the last of them was met by Story 1.12, and nothing else in the epic will check them. Record any criterion met by a different mechanism than the one it names, and any not met
- **Hand over to Epic 2 deliberately**, and say what this suite is not: it is a harness with a handful of journeys, not coverage of an application that barely exists. Epic 8 is the checkpoint with journeys worth asserting on in quantity, and the value it inherits is that the tool, the home and the CI position are already decided and recorded. The roadmap divergence this story deliberately did not resolve — `PRODUCT_SPEC.md` §41 puts E2E tests in Phase 6 while Epic 15's scope carries only "Testing strategy documentation" — should be handed on as an open question rather than left in this story's notes
- Re-run the full chain from a **clean clone** with an empty pnpm store, as every closing task in this epic has: install, `pnpm verify`, the per-step split, the artefact hashes and the test counts across every suite — now including this one, and including how much longer a clean clone takes when it also has to download a browser

## Done when

- All six criteria are met, each re-verified rather than inherited, with the deployed evidence separate from the local evidence
- `docs/adr/0013-*` exists and records decisions, including what a green run does not certify
- `CLAUDE.md` and `README.md` agree with the tree, and the sweep has been run with a `grep` and its counts recorded
- Epic 1's four exit criteria have each been checked against the tree, with any gap named
- `pnpm verify` passes from a clean clone, the pipeline is green, and the deployed environment is up and correct

## Approach note

Every closing task in this epic has found at least one recorded claim that had stopped being true, and every one of them was found by re-measuring rather than by reading — Task 1.11.8 found three, including a paragraph that contradicted itself two sentences apart and an arithmetic error of a factor of about 35. This task closes an epic as well as a story, so it is reading **twelve** stories' worth of claims rather than one. Budget for it.
