# Task 1.4.6 — Verify the story end to end, document the conventions and write ADR 0004

**Status:** Complete (2026-08-31)
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
- **The ADR covers Storybook too, and does not take a number of its own.** Task 1.4.5 added the component workshop to this story, and the decisions worth recording are of a piece with the component library's: which package each dependency landed in and why the answer is counter-intuitive, why every component must have stories and what the check in `verify` does and does not prove, and — the one a future reader would otherwise trip over — **why the Base UI seam is a popover rather than a tooltip**. That last one is a documented property of the primitive, not a bug, and it is the first evidence that "accessible primitives" is a per-primitive question
- **Re-measure with the workshop in the chain.** `verify` is five steps now and runs two bundlers, and `storybook build` is the slower half. Record the numbers; Story 1.10 inherits them
- Record whether `allowBuilds` finally fired. **It did, in Task 1.4.5, through Storybook's direct dependency on esbuild** — so this bullet is now a check that the record is accurate rather than an open question. It has never fired, Story 1.3 predicted it would and was wrong, and this story was the next plausible candidate. Either outcome is worth one sentence; a silent pass leaves the next person re-predicting it
- Update `CLAUDE.md`'s file tree and Commands section if anything moved or was added, and check the two stay in step with `README.md`
- Mark Story 1.4 complete, and update the Epic 1 file with what this story establishes for the stories after it — Story 1.5 most immediately, which builds the chrome from these tokens

## Done when

- Every acceptance criterion in the story is met and each one was checked rather than reasoned about
- A clean build renders correctly from a static host outside the workspace
- The new bundle size, module count and CSS asset are recorded
- The static Storybook build renders from a static host outside the workspace, and the stories check has been seen to fail
- `docs/adr/0004-*.md` exists, is listed in `docs/adr/README.md`, and explains _why_ rather than _what_
- `CLAUDE.md` and `README.md` agree with each other and with the tree
- Story 1.4 is marked complete and Epic 1 records what it hands the remaining stories

## Notes

Story 1.5 is the immediate consumer and the real test of this documentation: if building the persistent chrome requires a question this story should have answered, the answer belongs here, retrospectively.

## Outcome

**Done on 2026-08-31.** Story 1.4 is closed and [`docs/adr/0004-styling-approach-component-library-and-the-component-workshop.md`](../../../docs/adr/0004-styling-approach-component-library-and-the-component-workshop.md) is written, indexed in `docs/adr/README.md` and referenced from `README.md`, `CLAUDE.md` and `EPIC.md`. **0004 was the next free number, checked at the time rather than trusted** — `docs/adr/` held 0001–0003.

### Verified from a clean tree

`pnpm clean && pnpm install && pnpm verify` at exit 0, then `pnpm build`, then both artefacts copied **outside** the workspace and served by `python3 -m http.server` — not `vite preview`, whose SPA fallback answers a missing asset with `index.html` and a 200.

- The application renders correctly from the static host: `data-theme="light"`, body ground `rgb(244, 243, 238)`, `font-variant-numeric: tabular-nums`, `--price-positive` resolving to `#427400`, three security rows, one linked stylesheet at an absolute path, `/assets/nope.js` a genuine 404
- The static Storybook renders the same way — index and `iframe.html` both 200 — and the `AllPermutations` grid is intact
- The stories check was **seen to fail**: `PriceChange.stories.tsx` moved aside gives exit 1 naming the file and the path it wanted, restored gives `5 components, 5 stories files.`
- Both `clean` verbs remove `dist/` and `storybook-static/`

### The artefact, re-measured

| Stage                      | Modules | JS            | CSS         | Files |
| -------------------------- | ------- | ------------- | ----------- | ----- |
| ADR 0003 left it           | 17      | 190.80 kB     | none        | 2     |
| Task 1.4.4                 | 18      | 196.36 kB     | 6.22 kB     | 3     |
| **This task, clean build** | **193** | **300.09 kB** | **7.21 kB** | **3** |

97.43 kB and 1.94 kB gzipped. Still self-contained — no `package.json`, no `node_modules`, **zero bare imports** in the emitted JavaScript — and still three files, with no story string in the output. The stylesheet is the whole design language, both token layers and five components; nearly all of the +109 kB of JavaScript is Base UI's popover.

**Task 1.4.5's record says 293.06 kB and 7.05 kB, and it is wrong about the commit it shipped.** Those were measured mid-task. The current figures are deterministic across rebuilds and the source has not changed since that commit. TASK-05 is marked rather than rewritten.

### `verify` with two bundlers

Clean-tree `pnpm verify` is **10.5s**, against ~7.6s before the workshop. Warm steps: build 2.2s, lint 3.3s, `format:check` 1.4s, `stories` 0.24s, `test` 0.45s. Cold, the build splits `tsc -b` 1.54s, `vite build` 0.49s, `storybook build` 1.38s — Storybook is the slower bundler, at 227 modules and 7.4 MB across 50 files, none of it shipped to anyone. Story 1.10 inherits these and owns whether `storybook-static/` is published.

### HMR, re-measured with a styling pipeline in it

Measured by observing the DOM and checking `performance.timeOrigin` was unchanged on every sample, which proves the update was HMR rather than a reload — cheaper than the counter-component method and it answers the same question.

| Edit      | Warm                      | First after start |
| --------- | ------------------------- | ----------------- |
| CSS only  | 24–130 ms (median ~72 ms) | —                 |
| Component | 177–280 ms                | 977 ms            |

**A stylesheet edit is materially faster than a component edit**, which is the comparison worth keeping: one is a `<style>` swap and the other is a React re-render. Both component figures are **upper bounds** — the measuring tab reported `visibilityState: "hidden"`, which throttles React's scheduler — so they are not directly comparable to Task 1.3.3's foreground ~100–140 ms, and a regression should be judged against a foreground re-run rather than against these.

### `allowBuilds`: the record is accurate

It fired in Task 1.4.5, through Storybook's direct dependency on esbuild, and this task's job was to check rather than to predict. `pnpm-workspace.yaml` carries `esbuild: true` with the reason written beside it, and a fresh sweep of the installed tree for `preinstall`/`install`/`postinstall` returns **`esbuild@0.28.2` and nothing else**. ADR 0003's section saying `allowBuilds` is empty and untested now carries a dated marker pointing at 0004; it keeps its original wording, because the prediction is worth as much as the outcome.

### One thing found that no earlier task had looked at

**The a11y addon's tab badge counts inconclusives, not violations.** `SecurityRow`'s grid is 0 violations, 17 passes, 1 inconclusive, and the `1` on the tab is the inconclusive. Task 1.4.5 recorded those three numbers without opening the third. It is `color-contrast` over **24 nodes, every one of them a direction arrow** — `<span aria-hidden="true">▲</span>` — with axe's own reason: "Element content contains only non-text characters."

So the automated check **declines to judge the exact element that carries the non-colour encoding**. The arrow is what survives desaturation, and axe has nothing to say about it. That is the argument for Task 1.4.4's manual contrast and colour-blindness measurements being the record, and against Epic 15's accessibility review being an axe run.

### A smaller one

`pnpm --filter @marketpulse/frontend dev` after a `pnpm clean` starts, serves, and prints `Failed to run dependency scan … @marketpulse/shared … Are they installed?`. The install is fine; the project reference has no `dist`. Root `pnpm dev` never shows it because the shared watcher is one of its three loops. Recorded in `CLAUDE.md`.

### Documentation

- **`docs/adr/0004`** — context, six decisions, eight rejected alternatives with the reasons they lost carried from Task 1.4.1's record, and the consequences a future reader would otherwise trip over. It covers Storybook too, rather than taking a number of its own, and it amends ADR 0003 on install scripts
- **`CLAUDE.md`** — Story 1.4 complete, the ADR in the file tree and the intro, the corrected bundle figures with a note about the stale ones, the two HMR baselines, the `verify` timings, the a11y badge, and the filtered-dev trap
- **`README.md`** — a new **Styling and design tokens** section for a human: where the four style files live, the four things to know before writing a component (CSS is the source of truth, compose with `cx()`, colour is never the only signal, focus belongs to `base.css`), and the theming mechanism. Plus Story 1.4 marked complete and 0004 linked
- **`EPIC.md`** — a **What Story 1.4 established** section with the six things that bind later stories, and Story 1.5 named as unblocked and next

### Still owed, and it is owed to Story 1.5 rather than to this story

**The external shared component library's exports have not been read.** It is not reachable from this repository, so the assumption behind choosing Base UI over the lighter Radix is still an assumption. Task 1.4.5 made it as cheap as possible to be wrong — one file imports `@base-ui/react` — and this task cannot close it either. It gets more expensive with every wrapper, so it belongs **before** Story 1.5 adds more.
