# Task 1.4.6 — Verify the story end to end, document the conventions and write ADR 0004

**Status:** Not started
**Story:** [1.4 UI Component Library & Styling Conventions](STORY.md)
**Depends on:** Task 1.4.5

## Objective

Prove the story's criteria against a clean tree, write the conventions down where the next author will find them, and record the decision as an ADR. This is the story's acceptance test, and the ADR is the criterion the story says earns its keep.

## Work

- **Verify from a clean build, not a warm one.** `pnpm clean && pnpm install && pnpm verify`, then `pnpm build`, then serve `apps/frontend/dist` with `python3 -m http.server` from **outside** the workspace and confirm it renders with styles. Not `vite preview`: its SPA fallback answers any unmatched path — a missing CSS asset included — with `index.html` and a 200, so a broken stylesheet reads as a MIME-type error rather than a 404 naming the file
- **Re-measure the build, because this story changed the artefact's shape.** It was 190.80 kB across 17 modules with no stylesheet before Task 1.4.2. Record the new size, the module count and the CSS asset, so the next story that grows the bundle has a baseline rather than an impression. Confirm `dist/` is still self-contained — no `package.json`, no `node_modules`, no bare imports left in the output
- Re-check the HMR baseline (~100–140 ms warm, first edit after start ~850 ms and not the number to regress against) now that a styling pipeline sits in it, and check a CSS-only edit separately from a component edit
- **Write the conventions where they will be read.** `CLAUDE.md` gets the operational summary — where tokens live, what the source of truth is, how a component is expected to consume them, which package each dependency landed in and why. `README.md` gets whatever a human needs to run and look at it. Neither gets the reasoning; that is the ADR's
- **Write the ADR with the next free number, checked rather than assumed.** `docs/adr/` holds 0001–0003, so **0004** as of 2026-08-30 — confirm it, and add the row to `docs/adr/README.md`. ADRs are numbered in the order written and never renumbered; the story's criterion originally said "0002" and was written before Stories 1.2 and 1.3 took that number and the one after, which is exactly why the number is checked at the time
- Follow 0001's shape: context, decision, rejected alternatives, and the consequences a future reader would otherwise discover by tripping over them. The consequences are the part that earns its keep, and this story has several worth stating plainly — the artefact now carries a CSS asset with an absolute path, the token layer has non-React consumers coming in Epics 2 and 6, colour is never the sole encoding of anything, and the reversal triggers recorded in Task 1.4.1
- Carry Task 1.4.1's rejected alternatives into the ADR **with the reasons they lost**, from that task's record rather than from memory. An ADR that lists alternatives without reasons is a list, not a record
- Record whether `allowBuilds` finally fired. It has never fired, Story 1.3 predicted it would and was wrong, and this story was the next plausible candidate. Either outcome is worth one sentence; a silent pass leaves the next person re-predicting it
- Update `CLAUDE.md`'s file tree and Commands section if anything moved or was added, and check the two stay in step with `README.md`
- Mark Story 1.4 complete, and update the Epic 1 file with what this story establishes for the stories after it — Story 1.5 most immediately, which builds the chrome from these tokens

## Done when

- Every acceptance criterion in the story is met and each one was checked rather than reasoned about
- A clean build renders correctly from a static host outside the workspace
- The new bundle size, module count and CSS asset are recorded
- `docs/adr/0004-*.md` exists, is listed in `docs/adr/README.md`, and explains _why_ rather than _what_
- `CLAUDE.md` and `README.md` agree with each other and with the tree
- Story 1.4 is marked complete and Epic 1 records what it hands the remaining stories

## Notes

Story 1.5 is the immediate consumer and the real test of this documentation: if building the persistent chrome requires a question this story should have answered, the answer belongs here, retrospectively.
