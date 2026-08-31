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
- **A code-split router changes the shape of the deployable artefact, and the change is not free.** `dist/` is ~~two~~ **three** files today — `index.html`, one hashed `assets/*.js`, and since Task 1.4.2 (2026-08-31) one hashed `assets/*.css`. The first `React.lazy` or route-level dynamic `import()` makes it many, and ADR 0003 records that `base` defaults to `/` so **every** emitted chunk path is absolute. A subpath deployment is then a `base` change and a rebuild rather than a hosting setting, applied to a directory rather than to one file. Decide route splitting on its merits, but know it lands on Story 1.11's desk. The stylesheet is emitted by the same bundler and carries an absolute hashed path too, so route-level splitting splits the CSS as well as the JavaScript
- ~~**There is one component and no chrome.**~~ **Half of this is no longer true as of Story 1.4 (2026-08-31): there are five components, a stylesheet and a design language — but still no chrome, and that half is this story's.** `apps/frontend/src/App.tsx` is still a single stateless function; what it now composes is `SecurityRow` and the four primitives under it. This story is what makes "persistent chrome" a real thing rather than a description, and it does so on top of a token layer rather than from nothing — see the Story 1.4 section below
- **The React Compiler rule set is in force and has still never met real code.** Fifteen of `eslint-plugin-react-hooks`'s 17 rules are at `error`, `exhaustive-deps` is a `warn`, and `lint` runs with `--max-warnings 0` — so a warning fails `verify`. Story 1.4 expected its five components to be the first collision and was wrong, because CSS Modules compute nothing during render: the rules are about _state_, and this tree has none. A router is the first thing here that holds state, so expect this to be where those rules first say something — and expect it to be unwelcome, since `recommended` was taken whole
- **The router is an `apps/frontend` dependency; a router's build-time plugin is root tooling.** Task 1.3.2 drew that line the same way — React in the package, `eslint-plugin-react-hooks` at the root. A file-based routing plugin for Vite would go to the root beside Vite itself

### What Story 1.4 hands this story

Story 1.4 is complete — six tasks, recorded in `docs/adr/0004-styling-approach-component-library-and-the-component-workshop.md` — and this story is its first real consumer. It was written as the test of whether Story 1.4 documented itself well enough: **if building the chrome needs an answer Story 1.4 should have given, the answer belongs back there, retrospectively.**

- **The design language is structural, and the chrome is where that is most visible.** A warm `#f4f3ee` ground under white surfaces, 1px near-black hairlines rather than grey borders, one 2px radius, a 4px spacing grid, the system font stack. There is no brand hue and no distinctive typeface, so the identity is entirely those values — a neutral grey ground or a light border produces a generic admin panel, which is exactly the failure a header, a sidebar and a status strip are most exposed to. `VISUAL-LANGUAGE.md` in the Story 1.4 directory is the input, not a suggestion
- **Use the components, not the tokens** — and one of the three chrome areas this story's criteria name already has one. `FeedIndicator` (`live` / `stale` / `disconnected`, marker shape plus word) is built, has stories, and takes its `FeedStatus` type from `packages/shared`. Place it rather than inventing a coloured dot; Story 1.12 gives it real data. The market clock area has no component and the product name is text
- **Every component this story adds is a directory with a stylesheet and a stories file.** `src/components/<Name>/<Name>.tsx` + `.module.css` + `.stories.tsx`, one component per file, one story per discrete state plus an `AllPermutations` grid. `pnpm stories` fails the build if the stories file is missing and has been seen to fail. **Task 1.4.5 exempted `App.tsx` and `main.tsx` as page shell rather than workshop material and left this story to decide where the line falls now that there is real chrome** — a header is arguably a component and a route placeholder is arguably not. Decide it once, here, and write it down
- **A layout component with a router dependency does not render in the workshop on its own.** `.storybook/preview.ts` loads the same three stylesheets in the same order as `main.tsx` and asserts the tokens, but it wires no providers. A router decorator is the likely first divergence between the workshop and the application, and it is this story's to add — deliberately, since Task 1.4.5's reason for reusing `vite.config.ts` untouched was to keep exactly one place where the build lives
- **Two authoring costs that bite hardest in a story that adds many small files at once.** Compose class names with `cx(styles.a, styles.b)` — the template-literal and bracket forms are both lint errors — and know that a **misspelled class name is completely silent**: it typechecks, lints, builds, and renders unstyled. Nothing in `pnpm verify` catches it. This is the second rule on this page with that property; the other is the `.js` import extension, and only `tsc` catches that one
- **Focus belongs to the token layer.** `base.css` carries one global `:focus-visible` rule — a 2px near-black outline at 2px offset, measured on a real button — and no component declares another. A navigation link that adds its own focus style is answering a question already answered
- **Base UI sits behind our own wrappers and exactly one file imports it.** If this story needs a navigation menu, a dialog or a dropdown, it becomes the second — and the reason for choosing Base UI over the lighter Radix is a later swap to an external shared component library **whose exports have still not been read**. That check is owed before this story adds more wrappers, not after. Two related findings to inherit rather than rediscover: "accessible primitives" is a per-primitive property (Base UI's tooltip renders no `role="tooltip"` and wires no `aria-describedby`, which is why the anomaly explanation is a popover), and the a11y addon reports without failing anything

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
