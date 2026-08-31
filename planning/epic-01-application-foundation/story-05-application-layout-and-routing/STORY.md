# Story 1.5 — Application Layout & Routing

**Status:** Not started
**Epic:** [Epic 1 — Application Foundation](../EPIC.md)
**Depends on:** Story 1.4
**Epic scope covered:** basic routing and application layout

## Description

Establish navigation and the persistent application chrome. Routes correspond to the four primary experiences in PRODUCT_SPEC.md §8, each rendering a placeholder until its epic delivers it.

## Conventions from Story 1.1

Story 1.1 is complete, and these four bind this story. They are stated in every Epic 1 story so each one can be read on its own; the full reasoning is in `docs/adr/0001-repository-structure-and-typescript-toolchain.md`.

- **`pnpm verify` is the acceptance command** — `build && lint && format:check && stories && test`, chained with `&&` so the first failure is the exit code. It took its fifth step in Task 1.4.5: `stories` fails if a component has no stories file, and `build` now also produces the Storybook bundle. This story passes it from the repository root. Prettier owns Markdown as well as code, so an unformatted planning document fails it too
- **Six verbs, identical in every package** — `dev`, `build`, `test`, `lint`, `typecheck`, `clean`. Only `test` and `dev` fan out with `pnpm -r`; the rest run their tool once from the root, because the reference graph and ESLint's project service already cover the workspace in one pass. Changing what a verb means in one package means changing it everywhere, or saying why not
- **Shared tooling lives at the workspace root; packages declare only what they actually import.** ESLint, Prettier and TypeScript are root-only devDependencies, and pnpm puts the root's `node_modules/.bin` on every package script's PATH. A library the code imports belongs in the package that imports it — `@types/node` in `apps/backend` is the counter-example that keeps the rule from being over-applied
- **The module setup is ESM-only and single-file-safe** — `"type": "module"`, `module: nodenext`, `isolatedModules`, `verbatimModuleSyntax`, and relative imports carrying `.js` extensions from `.ts` files (TS2835 without one). `packages/shared` is consumed as **built output**, so it must be built before any consumer can be typechecked; `tsc -b` orders that itself, which is why `typecheck` and `build` are the same command

One thing that is true today and will not be forever: until Story 1.9 lands, **`pnpm test` passes because there are no tests** — all three `test` scripts are `echo` placeholders that exit 0, and they are now the only placeholders left. The companion note about both apps' `dev` scripts being placeholders is **no longer true** — Stories 1.2 and 1.3 made all three real.

## What that means for this story

- The router is a library this package imports, so it is declared in `apps/frontend` — not at the root. Root-only is for tools that are invoked as commands
- Route modules are `.ts`/`.tsx` inside `apps/frontend/src`, so relative imports between them carry `.js` extensions (`./routes/overview.js`). This is the rule most often forgotten in a story that adds many small files at once
- "Deep-linking to a route works on page reload" is a dev-server and hosting concern, not a router one. It needs a history-API fallback in whatever Story 1.3 chose and again in whatever Story 1.11 deploys to — verify it in both, because passing locally proves nothing about the deployed environment. Story 1.3 has since chosen, and the answer makes this criterion **easy to pass without evidence**; see below
- Adding a route is not a reason to add a package. `apps/frontend` stays one package; the feature modules under `app/` described in the frontend structure are directories, not workspace packages

### What Story 1.3 hands this story

- **The fallback that makes deep-linking work is already there, for free, in both local servers — which is why passing this criterion locally is not evidence.** Task 1.3.5 measured `vite preview` answering _any_ unmatched path with `index.html` and a 200, and a plain `python3 -m http.server` 404ing the same paths. The dev server behaves like preview. So every route this story invents will deep-link on reload the moment it exists, on a machine where nothing was configured — and the identical build served by a dumb static host will 404. **Prove this criterion against something without an SPA fallback, and again against whatever Story 1.11 picks.** The preview server's fallback is also actively misleading in a second way: it answers a _missing asset_ with HTML and a 200, so a genuinely broken chunk arrives in the browser as a MIME-type error rather than a 404 naming the file
- **`.js` import extensions have exactly one enforcer here, and it is `tsc`.** This is the rule most often forgotten in a story that adds many small files at once, and Task 1.3.5 measured what happens when it is: `tsc -b` fails with TS2835 and exit 1, while `vite build` resolves `./routes/overview` to `overview.tsx` and emits a **byte-identical** bundle. Neither the dev server nor the bundler will tell you. `pnpm verify` is the only thing that will
- **A code-split router changes the shape of the deployable artefact, and the change is not free.** `dist/` is two files today — `index.html` and one hashed `assets/*.js`. The first `React.lazy` or route-level dynamic `import()` makes it many, and ADR 0003 records that `base` defaults to `/` so **every** emitted chunk path is absolute. A subpath deployment is then a `base` change and a rebuild rather than a hosting setting, applied to a directory rather than to one file. Decide route splitting on its merits, but know it lands on Story 1.11's desk
- **There is one component and no chrome.** `apps/frontend/src/App.tsx` is a single stateless function with a heading and a paragraph, and the build contains no CSS because nothing imports any. This story is what makes "persistent chrome" a real thing rather than a description
- **The React Compiler rule set is in force and has barely met real code.** Fifteen of `eslint-plugin-react-hooks`'s 17 rules are at `error`, `exhaustive-deps` is a `warn`, and `lint` runs with `--max-warnings 0` — so a warning fails `verify`. A router brings the first components with real structure; expect this to be where those rules first say something
- **The router is an `apps/frontend` dependency; a router's build-time plugin is root tooling.** Task 1.3.2 drew that line the same way — React in the package, `eslint-plugin-react-hooks` at the root. A file-based routing plugin for Vite would go to the root beside Vite itself

## Acceptance criteria

- Routes exist for Market Overview (landing), Investigation Workspace, Security Explorer and Market Replay
- Each route renders an identifiable placeholder
- Persistent application chrome — product name, market clock area, connection status area — survives navigation
- An unknown route renders a not-found state rather than a blank screen
- Layout uses desktop-first regions consistent with the PRODUCT_SPEC.md §9 sketch
- Deep-linking to a route works on page reload

## Open decisions

- Router library — React Router is the default assumption

## Notes

The status and clock areas are placeholders here; Story 1.12 fills the status area, and Epic 3 supplies the live market clock.
