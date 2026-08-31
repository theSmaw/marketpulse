# Task 1.6.7 — Verify, document and record the decision as ADR 0006

**Status:** Not started
**Story:** [1.6 Configuration & Environment Handling](STORY.md)
**Depends on:** Task 1.6.6

## Objective

Close the story from a clean tree, reproducing every figure rather than inheriting it, and write down why configuration is shaped the way it is.

## Work

- **Re-run every acceptance criterion from a clean tree**, not from the working tree the previous six tasks left behind: `pnpm clean`, `pnpm install`, `pnpm verify`, and record the timing against Task 1.5.6's 11.0s baseline with its step split (build 3.2s, lint 2.9s, `format:check` 1.6s, `stories` 0.25s, `test` 0.45s). A configuration module should cost nothing here; if it does, that is the finding
- **Re-measure the artefact.** Task 1.5.6's baseline is 265 modules, 342.08 kB of JavaScript, 9.82 kB of CSS, three files. State this story's total delta in one place rather than leaving it distributed across six task outcomes, and confirm the file count. Task 1.6.1 measured what a validator would have cost here — +74.88 kB for Zod, +3.14 kB for Valibot, for one single-key schema — and then adopted neither, so **the expected frontend delta for this whole story is close to zero**: `envPrefix`/`envDir` are build configuration, and a `basename` read from `import.meta.env.BASE_URL` is a string. A meaningful growth in the artefact is therefore a finding rather than a cost, and the first place to look is whether something imported a validator
- **Re-run the failure paths rather than citing them.** Invalid `PORT`, two invalid variables at once, no `.env` at all, a subpath build served from a static host. These are the criteria that matter and they are all cheap to repeat
- **Write `docs/adr/0006-configuration-and-the-secrets-boundary.md`** from the facts, in the shape of 0001–0005: what was decided, what was measured, what was rejected and why, and what would reverse it. The three things it must carry are the validation choice and its rejected alternatives — including the measurement that decided it, which is that a schema over `process.env` is a schema over strings, so blank-means-absent and a message quoting the operator's input have to be hand-written either way — the browser boundary and the two ways it can be defeated (`envPrefix` widening and `define`), and the build-time-inlining consequence that one frontend artefact cannot be promoted across environments
- **Update `CLAUDE.md`.** Its Current state and Commands sections describe a backend that reads two variables inline and a frontend with no environment mechanism at all; both stop being true in this story. The file's own instruction is to keep those sections current as things actually land
- **Feed the findings into the remaining stories**, the way every story in this epic has: Story 1.8 inherits the setup step and the "no `.env`" behaviour, Story 1.9 inherits whatever test configuration was named and whether `loadConfig()` is callable twice, Story 1.11 inherits the `base`/`basename` pair and the promotion constraint, Story 1.12 inherits the first real frontend variable — the backend's URL — and the CORS origin pinned to 5173. Record in `EPIC.md` whether anything was added, deleted or re-ordered
- Set the story's status to Complete with the date, and the same on each task file

## Done when

- Every acceptance criterion in `STORY.md` is either ticked with evidence or annotated with what it now depends on and which story owns it — the Story 1.5 precedent, where two criteria were annotated rather than ticked because they were properties of the host
- `pnpm verify` exits 0 from a clean clone and the timing is recorded
- ADR 0006 exists and was written from the measurements rather than from the plan
- `CLAUDE.md` and `README.md` both describe what is actually there
- The downstream stories carry their sections

## Notes

The rule the epic has followed five times: reproduce the figures in this task rather than copying them out of the task that first measured them. Task 1.4.5 recorded 293.06 kB and 7.05 kB mid-task and Task 1.4.6's clean-build numbers were different — the clean-tree figures are the story's baseline and the mid-task ones are not.
