# Task 1.9.1 — Choose the test runner

**Status:** Complete (2026-09-02)
**Story:** [1.9 Automated Testing Foundations](STORY.md)
**Depends on:** nothing

## Objective

Pick the runner, on this workspace's constraints rather than on popularity, and write down what it was measured against. Nothing ships from this task except a decision and the evidence behind it — the same shape as Task 1.4.1, which chose a component library and installed nothing.

## Work

- **Test the module setup first, not last.** The story says this is the constraint most likely to bite and it is the one that disqualifies candidates: `"type": "module"` in all three packages, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files. A runner that resolves `./foo.js` differently from Node, or that assumes CommonJS anywhere in its transform pipeline, fights all of it. Write one throwaway test importing `./something.js` from a `.ts` file in a scratch tree and see what each candidate does with it — this is a five-minute measurement and it is the whole decision for at least one candidate
- **Measure at least three, and name them.** `vitest`, Node's built-in `node:test` with `--experimental-strip-types` (or `tsx`), and one of `jest` / `bun test` as the control. The comparison table should carry: does it need a transform step at all; does it honour `nodenext` extension resolution; what does it cost in packages and install size; does it trip `allowBuilds`; and can one runner serve all three packages or does the frontend need a second
- **Vite being here is an argument, and it is not the same argument as "Vitest is already downloaded".** State them separately. The real one is that Vitest reuses `vite.config.ts`, so the resolver that builds the frontend is the resolver that runs its tests — which matters more than usual because ADR 0003 records that `tsc` and Rolldown reach the `.js`-extension convention by **different routes** and disagree on the negative case. A third resolver is a third opinion about what `./App.js` means. The weak one is that `@vitest/expect`, `@vitest/spy`, `@testing-library/dom`, `@testing-library/jest-dom` and `@testing-library/user-event` are already in the lockfile as Storybook 10 transitives — cheap, and the story says explicitly that "it is already downloaded" is the weakest criterion available
- **Decide how the runner resolves `@marketpulse/shared`, and treat it as a decision rather than a default.** Two options with different failure modes: through the package's `exports` (built output — correct, matches what ships, and needs a build before a bare `pnpm test`), or through a source alias (fast, no build ordering, and quietly diverges from the artefact). `verify` builds first either way; a developer running `pnpm test` after editing shared does not. Whichever is chosen, say what the other one's symptom looks like
- **Check `allowBuilds` before installing anything.** `esbuild` is currently the only entry and the only package in the tree with an install script. A candidate that adds a second is not disqualified, but the policy fails the install outright and pnpm rewrites `pnpm-workspace.yaml` when it fires — know that before it happens rather than during
- **Note what each candidate does about the two things this story cannot test by injection.** The backend's process half (signals, exit codes, the 5-second shutdown ceiling, the second-signal path) needs a real child process against a **built** tree; the frontend needs a DOM environment that is a _package_ dependency under ADR 0001 §6. Neither settles the choice; both are cheaper under some candidates than others
- **Look at what a decision for Vitest would make available, and do not treat availability as a reason.** `@storybook/addon-vitest` would turn the five components' existing stories into smoke tests and give the a11y addon a way to fail rather than report. That is Task 1.9.4's to adopt or reject; this task only needs to record whether the runner choice forecloses it
- **Do not install the winner into the workspace here.** Spike in a scratch tree or a worktree and throw it away. Task 1.9.2 is where it lands, so the install and its cost are attributable to the task that made it

## Done when

- One runner is chosen, and the write-up names the alternatives it beat and why — package count, install size, resolver behaviour under `nodenext`, and the `.js`-extension result specifically
- The `@marketpulse/shared` resolution question is answered, with the rejected option's failure mode written down
- Whether one runner covers all three packages is answered rather than assumed
- The workspace is unchanged — no dependency added, no config file, no script edited
- `pnpm verify` still exits 0, trivially, because nothing moved

## Notes

Two of this repository's decisions went the other way after a spike — Story 1.6 built full Zod and Valibot implementations before throwing both away, and Task 1.7.6 built `react-error-boundary` before rejecting it on +932 B. Building the losing option is normal here and is what makes the recorded cost real. Task 1.8.3's inversion is the one to keep in mind: the finding that settled it was not the argument the task was written around.

## Outcome

**Decision: Vitest 4.1.11, one runner for all three packages, resolving `@marketpulse/shared` through its `exports` map — the built output — and never through a source alias.**

Settled on measurement, in a scratch tree and a throwaway copy of this repository at `313682e`, both deleted afterwards. The workspace is unchanged: no dependency added, no config file written, no script edited, and `pnpm verify` exits 0 in **9.29 s** on the six steps it already had. The only files this task touched are planning documents — this one, and three stale `buildServer(...)` signatures corrected below.

### The `.js`-extension test, which is the whole decision for one candidate

The story predicted this constraint would disqualify a candidate before any other criterion was reached. It did, and the disqualification is structural rather than a matter of configuration.

One throwaway file — `src/ticker.test.ts` importing `./ticker.js` and `./bands.js`, with a `import type` beside each value import so `verbatimModuleSyntax` is exercised too — run under every candidate:

| Candidate                                      | `./foo.js` from a `.ts` file                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------- |
| **Vitest 4.1.11**                              | **resolves, unconfigured** — 2 passed                                           |
| `node:test` (Node 24.20.0, no flag)            | **`ERR_MODULE_NOT_FOUND`** for `src/ticker.js`                                  |
| `node:test` + `--experimental-strip-types`     | **`ERR_MODULE_NOT_FOUND`** — identical                                          |
| `node:test` + `--experimental-transform-types` | **`ERR_MODULE_NOT_FOUND`** — identical                                          |
| `node:test` + `tsx` 4.23.13                    | resolves — 2 passed                                                             |
| Jest 30.5.1 + `@swc/jest`                      | `Cannot find module './ticker.js'` — passes **only** with a hand-written mapper |

**Node's type stripping does not rewrite import specifiers, and there is no flag that makes it.** It strips types and leaves `./ticker.js` exactly as written, then asks the ordinary ESM resolver for a file that does not exist. There is no `.js` → `.ts` fallback anywhere in Node 24.20.0 — confirmed directly with a bare `import("./src/ticker.js")`, which is `ERR_MODULE_NOT_FOUND` outside the test runner too.

The only specifier `node:test` accepts on sources is `./ticker.ts`, and **that form is unavailable to two of the three packages**, measured rather than assumed:

- `tsc` rejects it outright — **TS5097**, "An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled"
- enabling that option is **TS5096** — it "can only be used when one of `noEmit`, `emitDeclarationOnly`, or `rewriteRelativeImportExtensions` is set"

`packages/shared` and `apps/backend` both emit, and `packages/shared`'s declarations _are_ its contract. So adopting `node:test` on sources means either a per-package convention two packages cannot follow, or turning on `rewriteRelativeImportExtensions` and inverting the extension rule ADR 0001 §7 records — changing the module setup of the shipping application to suit the test runner. Neither is worth it, and the second is the tail wagging the dog.

`node:test` **against built output** does work and is not a candidate for a different reason: it tests `dist/`, which is right for two packages and impossible for `apps/frontend`, whose TypeScript half is `noEmit` and which therefore has no `dist/` of tsc's at all.

Jest's failure is softer and its fix is worse than it looks. `moduleNameMapper: { "^(\\.{1,2}/.*)\\.js$": "$1" }` makes the suite green — a hand-written regex whose job is to **undo** the convention `tsc` requires, maintained by us, in a fourth resolver's vocabulary. ADR 0003 already records that `tsc` and Rolldown reach the same convention by different routes and disagree on the negative case; a hand-rolled third opinion is precisely the thing not to add.

### The comparison table the task asked for

Package counts and sizes are the **marginal** cost in this workspace, measured against a fresh `pnpm install` of `313682e`, which reproduced the documented **327** packages and 237 MB exactly.

|                            | Vitest 4.1.11              | `node:test` + `tsx`                 | Jest 30.5.1 + `@swc/jest`   | `node:test` alone |
| -------------------------- | -------------------------- | ----------------------------------- | --------------------------- | ----------------- |
| Transform step needed      | yes, Vite's — already here | yes, esbuild via tsx                | yes, swc                    | none              |
| `nodenext` `.js` extension | **native**                 | rewrites                            | hand-written mapper         | **fails**         |
| Marginal packages          | **+22** (327 → 349)        | +4                                  | **+279**                    | 0                 |
| Marginal `node_modules`    | **+4 MB** (237 → 241 MB)   | +11 MB standalone                   | +74 MB standalone           | 0                 |
| Trips `allowBuilds`        | **no**                     | no — `esbuild`, already allowlisted | **yes — three new entries** | no                |
| Serves all three packages  | **yes**                    | no — see CSS below                  | yes, with a stub            | no                |

**Jest's `allowBuilds` result is the one to know before it happens rather than during.** Installing it produced `[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: @parcel/watcher@2.6.0, @swc/core@1.16.1, unrs-resolver@1.12.2` — three new entries at once against the current one, and in this workspace that is a **hard install failure** with `pnpm-workspace.yaml` rewritten under you. Vitest adds none: `pnpm add -D -w vitest` exits 0 and `esbuild` remains the only package in the tree with an install script.

### Whether one runner covers all three packages — it does, and a `.css` import is what decides it

This is the question the extension test does not settle, and it separates the two surviving candidates cleanly. A fixture component importing a CSS Module — the house idiom, `import styles from "./Widget.module.css"` — was run under both:

- **Vitest**: renders, and the class is **`_positive_9a210b`** — a real hashed name, because it is the same Vite CSS pipeline that builds the artefact
- **`node:test` + `tsx`**: **`ERR_UNKNOWN_FILE_EXTENSION: ".css"`**. The component cannot be imported at all

Jest's answer to this is `identity-obj-proxy` or a stub — class names become identity strings, so any assertion about them is an assertion about the stub.

Run against the **real** components rather than a fixture, with `apps/frontend/vitest.config.mts` doing nothing but `mergeConfig(viteConfig, { test: { environment: "jsdom" } })`:

- `PriceChange` renders with `class="_change_ea28d5 _negative_ea28d5"` — the hashed names again, from `vite.config.ts` unmodified
- `AppHeader` **throws** rendered bare and passes wrapped in a `MemoryRouter`, with `getByRole("banner")` and `getByRole("navigation")` both resolving — so the story's router-context concern is real and the workshop's existing answer transfers
- `buildServer(...).inject()` gives `/health` a **200** carrying `x-request-id` and `access-control-allow-origin: http://localhost:5173`, and `/nope` a **404** whose body matches `{ code: "NOT_FOUND" }` — the whole Story 1.7 and 1.8 contract, with no listening socket

So: **one runner, configured per package**, which is also the shape the workspace already has — `test` is one of the two verbs that genuinely fans out with `pnpm -r`, and this decision introduces no new command. `jsdom` and `@testing-library/react` are a further **+36 packages** and belong to `apps/frontend` under ADR 0001 §6, because the test code imports them; they are Task 1.9.4's cost, not this decision's, and the DOM environment itself is still that task's choice to make.

### How the runner resolves `@marketpulse/shared` — through `exports`, and the alias was measured before being rejected

Both were built and both were made to fail.

**Through `exports` (chosen).** With `packages/shared/dist` stale, a freshly added shared export arrives as `undefined` and the test fails on the value — `AssertionError: expected undefined to be 'from-source'`. That symptom is worth stating plainly because it **names nothing about staleness**: it looks like the export is missing, not like the build is behind. `pnpm build` fixes it, `verify` orders it already, and a bare `pnpm test` after editing shared is the case where it bites.

**Through a source alias (rejected).** It is faster and needs no build ordering, and its failure mode is not slowness — it is blindness. Two measurements:

- with `packages/shared/dist` **deleted entirely**, the aliased suite is **4 passed**. A green suite against a package that has never been built is not testing what ships
- breaking the package's own `exports` map — `"default": "./dist/index.mjs"`, a real publishable defect — leaves the aliased suite at **4 passed** and stops the `exports` route dead with `Failed to resolve entry for package "@marketpulse/shared". The package may have incorrect main/module/exports specified in its package.json`

The alias bypasses the `exports` field, so the one file that defines this package's contract is the one file the tests would stop reading. That is the deciding argument, and it is stronger than the "diverges from the artefact" one the story anticipated.

### Vite being here — the two arguments, separately, as the task asked

**The real one, and it is the one that carried weight.** Vitest reuses `vite.config.ts`, so the resolver that builds the frontend is the resolver that runs its tests. ADR 0003 records that `tsc` and Rolldown reach the `.js`-extension convention by different routes and disagree on the negative case; every rejected candidate adds a **third** opinion about what `./App.js` means, and Jest's is one we would write and maintain ourselves. The CSS Module measurement is this argument made concrete — `_change_ea28d5` is the build's own class name, not a stub's.

**The weak one, stated so it can be discounted.** `@vitest/expect`, `@vitest/spy`, `@testing-library/dom`, `@testing-library/jest-dom` and `@testing-library/user-event` are already in the lockfile as Storybook 10 transitives. It is real — it is part of why the marginal cost is +22 rather than the 45 an empty tree pays — and it is not a reason. Had the extension test gone the other way, it would have changed nothing.

### What this forecloses, and what it does not

- **`@storybook/addon-vitest` is not foreclosed**, and Task 1.9.4 owns whether to adopt it. Version 10.5.10 matches the pinned `storybook` exactly and peers `vitest ^3 || ^4`, which 4.1.11 satisfies. One qualification on the story's "nearly free": it also peers `@vitest/browser` and `@vitest/browser-playwright`. Both are `optional: true`, so a jsdom path exists — but the addon's documented route is a browser runner, and a Playwright browser download is a cost of a different order from +22 packages. Do not carry "nearly free" forward unexamined
- **The backend's process half is unaffected by this choice.** Signals, exit codes, the 5-second ceiling, the second-signal path and both crash handlers all need a real child process against a built tree under every candidate. Vitest neither helps nor hinders; it spawns a child as readily as anything else. Task 1.9.3 still owns whether to demonstrate one or record the class with an owner
- **`bun test` was not measured, and that is a limitation of this record rather than a rejection on the merits.** Bun is not installed on this machine and is not a devDependency — it is a second JavaScript runtime, which is a different kind of commitment from a package, and adopting it would mean the tests run on a runtime the application never runs on. Jest was measured as the control instead

### Two things found on the way that the next tasks need

**Vitest does not typecheck, and the first spike test failed because of it.** `buildServer({ logLevel: "silent", logFormat: "json" })` — the exact call written in this story's own planning documents — produced two 500s and a log record reading `Invalid CORS origin option`, because Story 1.8 made `corsOrigin` a required third field and nobody updated the docs. The runner transpiles and strips types; it does not check them. `tsc -b` caught it immediately and precisely — `TS2345: Property 'corsOrigin' is missing` — **but only because the test file sat inside a tsconfig `include`**. That is the same failure mode ADR 0003 records for the Vite dev server, arriving in a second place: a green runner is not evidence of a compiling tree. **Test files must live inside a tsconfig's `include`, exactly as `.stories.tsx` already do**, and Tasks 1.9.2 and 1.9.6 should treat that as a rule with a measurement behind it. The three stale signatures are corrected in `STORY.md`, `TASK-03` and `TASK-06`; the Story 1.7 records that also carry the two-field form are left alone, per `docs/adr/README.md`.

**Name the root config `.mts`, not `.ts`.** A root `vitest.config.ts` is loaded as CommonJS, because the root `package.json` has no `"type": "module"` — Vite warns `ESM syntax in a file loaded as CommonJS ... configLoader: 'native'`, and notes that loader is planned to become the default. Renaming to `.mts` takes it to zero warnings. Cheap now, a breaking upgrade later.

### What would make this decision wrong

Two reversal triggers, both concrete. **Vitest's coupling to Vite becomes a liability if the frontend ever leaves Vite** — the argument that carried this decision is the same one that would unwind it, and the runner would follow the bundler. And **if the backend's suite grows to dominate `pnpm test`**, a Vite-based runner is carrying a browser-oriented transform pipeline for a Node process; `node:test` against **built** output is the fallback there, viable for `apps/backend` and `packages/shared` specifically because both emit — and it would mean two runners, which is the thing this decision bought.
