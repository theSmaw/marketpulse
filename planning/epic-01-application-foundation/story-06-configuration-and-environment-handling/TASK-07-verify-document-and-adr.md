# Task 1.6.7 — Verify, document and record the decision as ADR 0006

**Status:** Complete — 2026-08-31
**Story:** [1.6 Configuration & Environment Handling](STORY.md)
**Depends on:** Task 1.6.6

## Objective

Close the story from a clean tree, reproducing every figure rather than inheriting it, and write down why configuration is shaped the way it is.

## Work

- **Re-run every acceptance criterion from a clean tree**, not from the working tree the previous six tasks left behind: `pnpm clean`, `pnpm install`, `pnpm verify`, and record the timing against Task 1.5.6's 11.0s baseline with its step split (build 3.2s, lint 2.9s, `format:check` 1.6s, `stories` 0.25s, `test` 0.45s). A configuration module should cost nothing here; if it does, that is the finding. **The chain is six steps now, not five** — Task 1.6.6 added `env:check` between `stories` and `test` — so the comparison is not like for like and the new step needs a figure of its own. Note it imports the backend's built `dist/config.js`, so it is one of the two steps after `build` that would fail on a tree where `build` had not run
- **Re-measure the artefact.** Task 1.5.6's baseline is 265 modules, 342.08 kB of JavaScript, 9.82 kB of CSS, three files — **but the tree is at 342.00 kB** and has been since commit `b244f15`, which landed after Story 1.5 closed, so 342.00 is the number to measure against and the 0.08 kB is not this story's. Task 1.6.4 measured zero delta on every figure including the content hashes. State this story's total delta in one place rather than leaving it distributed across six task outcomes, and confirm the file count. Task 1.6.1 measured what a validator would have cost here — +74.88 kB for Zod, +3.14 kB for Valibot, for one single-key schema — and then adopted neither, so **the expected frontend delta for this whole story is close to zero**: `envPrefix`/`envDir` are build configuration, and a `basename` read from `import.meta.env.BASE_URL` is a string. A meaningful growth in the artefact is therefore a finding rather than a cost, and the first place to look is whether something imported a validator. The measured total is **+0.01 kB** — Task 1.6.5's `basename` prop, on an otherwise unchanged 265 modules, 9.82 kB of CSS and three files. Confirm it from a clean tree rather than inheriting it
- **Re-run the failure paths rather than citing them.** Invalid `PORT`, two invalid variables at once — re-run it with the shipped variables rather than quoting Task 1.6.2's temporary probe, which is only possible if a later task added a second variable that can be invalid — no `.env` at all, and a subpath build served from a static host. Add the two Task 1.6.3 established, because they are the interaction between the loader and the readers and neither is covered above: **a blank `KEY=` in a file** falling back to the default rather than binding port 0, and **precedence** — a real environment variable beating a file entry, tested both ways round. These are the criteria that matter and they are all cheap to repeat
- **Write `docs/adr/0006-configuration-and-the-secrets-boundary.md`** from the facts, in the shape of 0001–0005: what was decided, what was measured, what was rejected and why, and what would reverse it. The **eight** things it must carry are the validation choice and its rejected alternatives — including the measurement that decided it, which is that a schema over `process.env` is a schema over strings, so blank-means-absent and a message quoting the operator's input have to be hand-written either way — the browser boundary and the two ways it can be defeated (`envPrefix` widening and `define`), the build-time-inlining consequence that one frontend artefact cannot be promoted across environments, and the two decisions Task 1.6.3 took, both of which have rejected alternatives and stated reversal triggers and so belong here rather than only in a task file: **`process.loadEnvFile()` over `--env-file`** (exit 9 on a missing file, which is what a fresh clone is; and a flag needs repeating at both invocation sites, one of which is inside the unchecked `scripts/dev.sh`), and **no environment variable at all** (nothing branches, so the three environments differ in where values come from rather than in code paths — reversed by the first thing that has to _behave_ differently rather than be _configured_ differently); and the two Task 1.6.4 took, which are **the type-level browser boundary being gone and replaced by lint** (`@types/node` reaches `apps/frontend/src` through the triple-slash references in Storybook's and Vite's node-side declarations, which an explicit `types` array does not filter, so `process` and `node:path` have typechecked in browser code since Task 1.4.5; `no-restricted-globals`/`no-restricted-imports` now stand where TS2591 did, and the reversal is a separate tsconfig project for the stories — and state the **scope**, because the ADR will otherwise overclaim: Task 1.6.4 measured `packages/shared` and it is intact, still TS2591 on `process`, TS2304 on `__dirname`, TS2591 on `Buffer`, because nothing it imports drags the node types in. The leak is `apps/frontend` only and its cause is the stories, so the general rule is that a `types` array is only as narrow as the declaration files the program reaches) and **the port asymmetry standing deliberately** (the backend's ports are a deployed process's, the frontend's two are development tools' and reach no deployment at all; reversed by two people needing two frontends at once). The eighth is Task 1.6.6's, and it is the smallest but the one with the most durable consequence: **the documented variable set is a checked claim rather than prose**, because `CONFIG_VARIABLES` exists to be walked and `pnpm env:check` walks it — including the defaults, which is the half a grep cannot do and the half that rots first. The rejected alternative is the two-greps-once the Done-when bullet would have accepted, and it was rejected because a check run once keeps nothing in step. Carry the placement decision with it — one example per package beside the file its loader actually reads, no root example, because `cp .env.example .env` at the root produces a file no loader reads, silently — and the `git check-ignore -v` trap, which exits **0** on a negated path and so reads as "ignored" for a file that is tracked. This is the finding in the story that most deserves an ADR: it is an invariant that decayed silently between stories, and the record of _how_ is worth more than the rule that replaced it
- **Update `CLAUDE.md`.** Its Current state and Commands sections describe a backend that reads two variables inline and a frontend with no environment mechanism at all; both stop being true in this story. Task 1.6.4 has already corrected the two paragraphs that claimed `process` fails to typecheck in browser code, which had been wrong since Task 1.4.5 — check them rather than rewriting them, and treat the fact that a stated invariant in that file went stale for two stories as an argument for re-measuring the others rather than copying them forward. The file's own instruction is to keep those sections current as things actually land
- **Feed the findings into the remaining stories**, the way every story in this epic has: **Story 1.7** inherits `readEnum` — still unbuilt, because Task 1.6.3 went looking for the first enum variable and found none — and the reversal trigger for the environment concept, since a pino-pretty-in-development log format would be _introducing_ that concept rather than inheriting one; Story 1.8 inherits the setup step and the "no `.env`" behaviour, both now written into `README.md`'s `## Configuration` section by Task 1.6.6 — so 1.8's job there is to follow that section from a clean clone rather than to write it; Story 1.9 inherits whatever test configuration was named and whether `loadConfig()` is callable twice; Story 1.11 inherits the `base`/`basename` pair — **already written into its STORY.md by Task 1.6.5**, along with that task's measured example of a correctly scoped fallback, so check it rather than writing it again — and the promotion constraint; Story 1.12 inherits the first real frontend variable — the backend's URL — and the CORS origin pinned to 5173; **Story 1.10** inherits the general form of Task 1.6.4's finding for its "know what `pnpm verify` does not cover" bullet, which is that the gaps listed there are the files no tool reads, while this one was a file every tool read and a guarantee that had quietly stopped being enforced — a stated invariant is not a checked one, and the only thing that found it was a task whose Done-when said to re-measure. **Task 1.6.3 already wrote the Story 1.7 and Story 1.9 sections**, so check they are still true rather than writing them again. Record in `EPIC.md` whether anything was added, deleted or re-ordered
- Set the story's status to Complete with the date, and the same on each task file

## Done when

- Every acceptance criterion in `STORY.md` is either ticked with evidence or annotated with what it now depends on and which story owns it — the Story 1.5 precedent, where two criteria were annotated rather than ticked because they were properties of the host
- `pnpm verify` exits 0 from a clean clone and the timing is recorded
- ADR 0006 exists and was written from the measurements rather than from the plan
- `CLAUDE.md` and `README.md` both describe what is actually there
- The downstream stories carry their sections

## Notes

The rule the epic has followed five times: reproduce the figures in this task rather than copying them out of the task that first measured them. Task 1.4.5 recorded 293.06 kB and 7.05 kB mid-task and Task 1.4.6's clean-build numbers were different — the clean-tree figures are the story's baseline and the mid-task ones are not.

## Outcome

**Done on 2026-08-31.** No source change in either application. `docs/adr/0006-configuration-and-the-secrets-boundary.md` carries the eight decisions; everything below is the measurement it was written from.

### `pnpm verify` from a clean tree

`pnpm clean && pnpm install && pnpm verify` — exit 0 in **9.32s**, **9.71s**, **9.81s** across three runs.

| Step           | This story | Task 1.5.6 |
| -------------- | ---------- | ---------- |
| `build`        | 3.60s      | 3.2s       |
| `lint`         | 2.98s      | 2.9s       |
| `format:check` | 1.87s      | 1.6s       |
| `stories`      | 0.26s      | 0.25s      |
| `env:check`    | **0.26s**  | —          |
| `test`         | 0.47s      | 0.45s      |

The comparison is not like for like — the chain is six steps now — and the chain nevertheless got **faster** than 1.5.6's 11.0s, which is run-to-run variance rather than an improvement. The figure that means something is the new step's **0.26s**, which is what a configuration module was supposed to cost here and does.

Cold, the build splits `tsc -b` **1.53s** / `vite build` **0.45s** / `storybook build` **1.33s**. `env:check` imports the backend's built `dist/config.js`, so it and `stories` are the two steps that depend on `build` having run; standalone on a clean tree it says ``run `pnpm build` first`` rather than throwing a resolver error.

### The artefact

| Stage                          | Modules | JS            | CSS     | Files |
| ------------------------------ | ------- | ------------- | ------- | ----- |
| Pre-story baseline (`b244f15`) | 265     | 342.00 kB     | 9.82 kB | 3     |
| This story, clean tree         | 265     | **342.01 kB** | 9.82 kB | 3     |

**+0.01 kB and nothing else** — Task 1.6.5's `basename` prop. The stylesheet's content hash is **`index-FpotQPsC.css` in both builds**, byte-identical across the whole story; only the JavaScript hash moved (`index-DUP5HHpy.js` → `index-BAidohu3.js`). The current figures reproduce byte-for-byte across rebuilds.

The baseline was **rebuilt in a worktree at `b244f15`** rather than taken from a document, and it confirms the 342.00 the task predicted rather than ADR 0005's 342.08 — that 0.08 kB belongs to the `Placeholder` change that landed after Story 1.5 closed.

Task 1.6.1 measured that a validator here would have been +74.88 kB (Zod) or +3.14 kB (Valibot), so a meaningful growth would have been the finding. There is none.

### Two figures in `CLAUDE.md` were wrong

Re-measuring the workshop artefact gives **289 modules across 52 files, 9.2 MB on disk**. Task 1.5.6 recorded 227 modules, 50 files and 7.4 MB. Story 1.6 changed none of it — a **worktree built at Story 1.5's close, with its own lockfile, gives the identical 289 / 52 / 9.2 MB**. The size discrepancy is a unit: 9.2 MB on disk is **7.3 MB apparent**, and 7.4 was the apparent figure. The module and file counts were simply mis-recorded.

Corrected in `CLAUDE.md` with the mis-record stated rather than silently overwritten, because copying a figure forward is exactly how it happened, and this task exists to catch that.

### Configuration failure paths, re-run

| Input                             | Result                                                                     |
| --------------------------------- | -------------------------------------------------------------------------- |
| `PORT=nonsense`                   | `PORT must be an integer between 1 and 65535, received "nonsense"`, exit 1 |
| `PORT=70000`                      | Same message quoting `"70000"`, exit 1                                     |
| `PORT=3000x`                      | Same message quoting `"3000x"`, exit 1 — `Number()`, not `parseInt()`      |
| No `.env` at all                  | Listens on `127.0.0.1:3000`, silently                                      |
| `PORT=` blank in `.env`           | Listens on **3000**, not port 0                                            |
| File `PORT=4010`, no env var      | 4010                                                                       |
| File `PORT=4010`, env `PORT=4020` | **4020** — the real variable wins                                          |
| File `PORT=4020`, env `PORT=4010` | **4010** — same rule, other way round                                      |

Every port confirmed with `lsof` against the listening process rather than read from Fastify's startup line, which rewrites `0.0.0.0` to `127.0.0.1`.

**Two invalid variables at once is not reproducible with the shipped variables, and that is the honest answer** rather than a gap. `readString` never throws, so `HOST` has no invalid value; only `PORT` can fail. Task 1.6.2 demonstrated the accumulator with a temporary third variable and no later task added a permanent one. Story 1.7's `LOG_LEVEL` — which also brings `readEnum` — is what makes it visible again. Recorded in ADR 0006 rather than left as a criterion nobody can re-run.

### `env:check`, all four failure modes re-made to fail

```
✗ PORT defaults to "3000" in config.ts but apps/backend/.env.example says "8080".
✗ HOST is read by apps/backend but is not in apps/backend/.env.example.
✗ TIMEOUT_MS is in apps/backend/.env.example but nothing in apps/backend reads it.
✗ API_BASE_URL is in apps/frontend/.env.example without the VITE_ prefix, so it
  would never reach the browser — the read compiles to `void 0`.
```

Exit 1 in each case; clean afterwards, `2 backend variables documented, frontend example clean.`

### The secrets boundary, both artefacts

A realistic secret and a legitimate variable planted in `apps/frontend/.env`, read once from application code and once from a story, then both removed:

| Artefact            | Emitted read                                                         | Secret value | Name `ALPACA` |
| ------------------- | -------------------------------------------------------------------- | ------------ | ------------- |
| `dist/`             | ``console.log(`probe`,void 0,`https://api.marketpulse.example/v1`)`` | 0 files      | 0 files       |
| `storybook-static/` | identical                                                            | 0 files      | 0 files       |

The workshop half needs the probe in a `.stories.tsx` rather than in `main.tsx` — Storybook's entry is `preview.tsx` plus the stories, so a probe in the application entrypoint proves nothing there. Worth stating because it is the obvious way to get a false pass.

### The gitignore negation, and a sharper version of the trap

| Path                          | `check-ignore -q` | `check-ignore -v` | `status --ignored=matching` |
| ----------------------------- | ----------------- | ----------------- | --------------------------- |
| `.env`                        | ignored           | exit 0            | `!!`                        |
| `.env.local`                  | ignored           | exit 0            | `!!`                        |
| `.env.example` (root, absent) | not ignored       | **exit 0**        | `??` when created           |
| `apps/backend/.env`           | ignored           | exit 0            | `!!`                        |
| `apps/backend/.env.local`     | ignored           | exit 0            | `!!`                        |
| `apps/backend/.env.example`   | not ignored       | **exit 1**        | tracked, clean              |
| `apps/frontend/.env`          | ignored           | exit 0            | `!!`                        |
| `apps/frontend/.env.local`    | ignored           | exit 0            | `!!`                        |
| `apps/frontend/.env.example`  | not ignored       | **exit 1**        | tracked, clean              |

Task 1.6.6 recorded that `check-ignore -v` exits 0 on a negated path. This task found **why the two tracked examples do not**: `check-ignore` skips paths already in the index, so it answers only for untracked ones — and prints the negation rule with exit 0 when it does. `--no-index` makes both tracked examples report `.gitignore:17:!.env.example` at exit 0.

So the trap is **narrower and worse than recorded**: it fires precisely on an untracked example, which is the case somebody checks before committing a new one. `README.md` and `CLAUDE.md` both now say to use `git status --porcelain --ignored=matching` instead.

`README.md` also carried a factual error from Task 1.6.6 — "the three `.env.example` files" — where there are two, one per package, and deliberately no root one. Corrected.

### The subpath build on a static host

Built at `base: "/marketpulse/"`, copied outside the workspace, served two ways:

| Request                       | Plain `http.server` | Scoped fallback |
| ----------------------------- | ------------------- | --------------- |
| `/marketpulse/`               | 200                 | 200             |
| `/marketpulse/investigations` | **404**             | 200             |
| `/marketpulse/securities`     | **404**             | 200             |
| `/marketpulse/replay`         | **404**             | 200             |
| `/marketpulse/nonsense`       | **404**             | 200             |
| `/marketpulse/assets/nope.js` | 404                 | **404**         |
| `/other/`                     | —                   | **404**         |

Deep-loaded cold on the fallback host: `/marketpulse/replay` renders Market Replay with `aria-current` set and the body ground computed as `rgb(244, 243, 238)`; `/marketpulse/` renders Market Overview with all four region landmarks — market topology, unusual activity, market breadth, current investigations — and header links reading `/marketpulse/`, `/marketpulse/investigations`, `/marketpulse/securities`, `/marketpulse/replay`; `/marketpulse/nonsense` renders `No such page` with its recovery link reading `/marketpulse/`.

**Deep-linking is still the host's property, unchanged from Task 1.5.5 and still Story 1.11's.** `vite.config.ts` and the scratch server were both reverted; the default build afterwards reproduces `index-BAidohu3.js` / `index-FpotQPsC.css` exactly.

### The node-types boundary, re-measured in both packages

| Package           | `process`      | `__dirname`    | `Buffer`       |
| ----------------- | -------------- | -------------- | -------------- |
| `packages/shared` | TS2591         | TS2304         | TS2591         |
| `apps/frontend`   | **typechecks** | **typechecks** | **typechecks** |

Task 1.6.4's finding reproduces exactly, including its **scope**: the leak is `apps/frontend` only and its cause is the stories, so the general rule is that a `types` array is only as narrow as the declaration files the program reaches. In `apps/frontend`, ESLint reports both globals as `no-restricted-globals` errors naming `envPrefix` and the server-only rule — the only thing standing there.

### Documentation

- **`docs/adr/0006-configuration-and-the-secrets-boundary.md`** — eight decisions, a rejected-alternatives table, six consequences and a Measured section. Indexed in `docs/adr/README.md`
- **`CLAUDE.md`** — Story 1.6 in the Current state and its ADR in the file tree; "no configuration module" removed; the workshop figures corrected with the mis-record stated; the clean-tree timing paragraph re-run; the `check-ignore` paragraph narrowed; and a new paragraph beside the `pnpm verify` gaps recording the **third kind of gap** — a file every tool reads carrying a guarantee nothing checks
- **`README.md`** — the ADR pointer moved to 0006, and the gitignore claim corrected

### Feed-forward

Stories **1.7**, **1.9** and **1.11** already carried their sections, written by Tasks 1.6.3 and 1.6.5; all three were re-checked against the shipped tree and are still true — `readEnum` is still unbuilt, there is still no `.env.test`, and 1.11's fallback example matches this task's re-run. Sections were **added** to:

- **Story 1.8** — the README's `## Configuration` section is written, so 1.8 follows it from a clean clone rather than writing it; the three things a first run trips over; and the one criterion this story does not touch, which is a clean clone reaching a _running_ application
- **Story 1.10** — the "know what `pnpm verify` does not cover" bullet gets the third kind of gap, and the framing that a green run means every check passed rather than every claim holding. Plus the practical note that the chain is six steps and `env:check` depends on `build`
- **Story 1.12** — the first real frontend variable, the `VITE_` requirement, the two places adding it touches, the rebuild-per-environment consequence, the credentials rule, and why the CORS-pinned 5173 is why the frontend's ports are literals

Nothing was added, deleted or re-ordered in `EPIC.md`'s story list.

### `pnpm verify`

Exit 0. No dependency added, no lockfile change, no source change.
