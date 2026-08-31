# Task 1.5.6 — Verify the story end to end, document it and record the decision

**Status:** Not started
**Story:** [1.5 Application Layout & Routing](STORY.md)
**Depends on:** Task 1.5.5

## Objective

Prove the story's criteria against a clean tree, write the conventions down where the next author will find them, and record the routing and layout decisions as an ADR. This is the story's acceptance test.

## Work

- **Verify from a clean build, not a warm one.** `pnpm clean && pnpm install && pnpm verify`, then `pnpm build`, then serve `apps/frontend/dist` with `python3 -m http.server` from **outside** the workspace — not `vite preview`, whose SPA fallback hides exactly the failures this story is most exposed to
- **Check each acceptance criterion by doing it**, in a browser: all four routes, the not-found state, the chrome surviving every navigation, the focus outline on every interactive element, the active-route indication without colour, and the §9 regions at the stated design width
- **Re-measure the artefact and the timings.** Modules, JS, CSS and file count against the story's 193 / 300.09 kB / 7.21 kB / 3 baseline **and against Task 1.5.1's measured router cost of 253 / 337.82 kB**, which is the figure that separates what the router cost from what this story's own code cost; `pnpm verify` against 10.5s from a clean tree; HMR against the two figures Task 1.4.6 established — CSS-only 24–130 ms, component 177–280 ms warm — with the same method (`performance.timeOrigin` unchanged proves it was HMR and not a reload) and the same caveat (a hidden tab throttles React's scheduler, so measure in the foreground or state the bound). Story 1.10 inherits the `verify` number
- ~~**Report what the React Compiler rules finally said.**~~ **They said it in Task 1.5.1, before this task's turn came.** `react-hooks/set-state-in-effect` failed `lint` at **error** on a spike route mirroring a URL parameter into state; the router itself provoked nothing, and the same route without the effect lints clean. So the standing question is answered and this task inherits a narrower one: **report what the rules said across Tasks 1.5.2 to 1.5.5** — whether anything fired in code that shipped rather than in a spike that was thrown away, and whether `--max-warnings 0` cost anything real. Silence across four tasks of shipping code is itself the finding, and it means the 17 rules taken wholesale in Task 1.3.2 are still cheap
- **Write the conventions where they will be read.** `CLAUDE.md` gets the operational half — the file tree with the routes and the chrome in it, where route modules live and why, the workshop's router decorator, the `App.tsx` exemption boundary this story settled, the route-path table and what it does and does not close, and the re-measured figures. Task 1.5.1 already wrote the router's own operational notes there (the `react-router-dom` trap, the `react >=19.2.7` peer margin, the no-plugin rule); check them rather than restating them. `README.md` gets whatever a human needs to run and look at it. Neither gets the reasoning; that is the ADR's
- **Write the ADR with the next free number, checked rather than assumed.** `docs/adr/` holds 0001–0004 as of 2026-08-31, so **0005** — confirm it at the time, and add the row to `docs/adr/README.md`. ADRs are numbered in the order written and never renumbered. Follow 0001's shape: context, decision, rejected alternatives **with the reasons they lost**, and the consequences a future reader would otherwise discover by tripping over them
- **The consequences worth stating plainly** are the ones this story cannot resolve inside itself: the deep-linking fallback is a host property and Story 1.11 owns it; route splitting changes the artefact from a file into a directory with absolute paths; and the region structure is what Story 1.7's local failure containment will be built against
- **ADR 0005 carries Task 1.5.1's decision as well as this story's layout ones, and does not give it a number of its own** — the same way 0004 covered both the component library and the workshop. Its rejected-alternatives section is TanStack Router, the file-based plugin and `wouter`, with the reasons they lost taken from Task 1.5.1's Outcome rather than from memory, and its reversal triggers are that task's. **One consequence belongs there that this story did not choose**: React Router's `to` is an unchecked string, so the route-path table from Task 1.5.2 is a mitigation rather than a fix, and a typed router is the standing answer if mistyped paths become a real defect
- Update `EPIC.md` with what this story establishes for the stories after it — 1.7 and 1.12 most immediately, both of which were written expecting regions and a chrome that did not exist
- **Answer the question Task 1.4.6 asked of this story.** Story 1.4 was documented on the bet that its first consumer would not need to ask it anything. Record what building the chrome actually needed and could not find — and if there is anything, the answer belongs back in ADR 0004 or `CLAUDE.md` retrospectively, not only here

## Done when

- Every acceptance criterion is met and each one was checked rather than reasoned about
- A clean build renders and navigates correctly from a static host outside the workspace, with the deep-linking result recorded honestly
- The artefact figures, the `verify` timing and the HMR figures are re-measured and recorded
- `docs/adr/0005-*.md` exists, is listed in `docs/adr/README.md`, and explains _why_ rather than _what_
- `CLAUDE.md` and `README.md` agree with each other and with the tree
- Story 1.5 is marked complete and `EPIC.md` records what it hands the remaining stories

## Notes

Story 1.12 is the next consumer of this one, and Story 1.7 is the next after that. The same test applies in turn: if building the health indicator or the first error state needs an answer this story should have given, the answer belongs here, retrospectively.
