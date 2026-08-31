# Task 1.5.1 — Choose the router, and close the check Story 1.4 owes

**Status:** Complete (2026-08-31)
**Story:** [1.5 Application Layout & Routing](STORY.md)
**Depends on:** Story 1.4 (complete)

## Objective

Settle this story's one open decision from a working spike rather than from reputation, and read the external shared component library's exports while the wrapper count is still one. Nothing permanent is installed by the spike; the router chosen at the end of it is.

## Work

- **Read the external shared component library's exports first.** This is owed to this story by Task 1.4.6 and it gets more expensive with every wrapper: the reason Base UI was chosen over the lighter Radix (+37 kB for one primitive, +46 kB for three, both measured) is an intended later swap to that library, and the assumption that its interfaces resemble Base UI's has never been checked. It is not reachable from this repository, so this may need the user. **If it still cannot be read, say so in the Outcome and record what would change if the assumption turns out to be wrong** — one file imports `@base-ui/react` today and Task 1.5.3 is about to make it two. An unresolved check that is written down is a different thing from one that is forgotten
- **Spike the candidates on the real toolchain**, the way Task 1.4.1 did — React 19.2.8, Vite 8/Rolldown, `strictTypeChecked` type-aware linting, `verbatimModuleSyntax`. React Router is the story's default assumption and is the one to beat, not the one to adopt by default. TanStack Router is the serious alternative and its pitch is type-safe routes; a file-based routing plugin is a third shape with a different cost profile. Whatever is measured, record the version numbers
- **Measure the four things the choice actually turns on**, and throw the spike away afterwards:
  - **Bundle cost**, against the story's baseline of 193 modules / 300.09 kB JS / 7.21 kB CSS in three files. Base UI already spent 104 kB here; a router is the next largest single addition this application will make before Epic 2
  - **Whether the type-aware rule set is happy with it.** `strictTypeChecked` plus 15 React Compiler rules at `error` and `--max-warnings 0` — a router that generates types, or that wants a `useEffect` in a route module, is where those rules finally meet real code. Check with a deliberate route rather than by reading the README
  - **What it does to `tsc -b`.** A file-based or codegen router writes a generated file, which needs a `.gitignore` entry, a place in the build order and a staleness answer — the exact shape Task 1.4.3 rejected for design tokens. That is a cost, not a disqualification, but it must be stated
  - **Whether it forces a build-time plugin.** The house rule splits cleanly and this story should not blur it: the router is imported by `apps/frontend`'s code and goes in that package; a Vite plugin for it is root tooling beside Vite itself
- **Check the peer ranges before installing, not after.** React 19.2.8, Vite 8, TypeScript 6.0.3 — the toolchain has already been narrowed once by a peer range (`@vitejs/plugin-react-oxc` does not admit Vite 8, despite its name) and once by a pin (typescript-eslint caps at `<6.1.0`). Report a candidate ruled out by a peer range as a finding rather than silently picking the other one
- **State what is deliberately not decided here.** Data loading, route-level `loader`/`action` APIs, and any router-owned state are not this story's; the domain state library is Redux by intention (see the intended stack) and is not being chosen here. A router adopted for its data layer would be taking a decision that belongs to Epic 2 or later
- Install the winner into `apps/frontend` and leave the tree passing `pnpm verify` with **no routes yet** — one dependency, no behaviour. The route table is Task 1.5.2's

## Done when

- The open decision in `STORY.md` is closed, with the measurements and the rejected alternatives and the reasons they lost — a list without reasons is not a record
- The reversal triggers are stated: what would have to be true for this choice to be wrong, and what it would cost to reverse it at that point
- The router is a dependency of `apps/frontend`, any plugin is at the root, and the reason is written down
- The shared component library's exports are read, or the failure to read them is recorded with its consequence
- `pnpm verify` exits 0 and the built artefact is measured again, so the router's cost is attributed to this task rather than to the first route

## Notes

Task 1.4.1's shape is the model: decide from a spike, throw the spike away, install once. The difference is that a router is far cheaper to reverse than a component library — nothing in this story is "expensive once dozens of components exist" — so this task should be smaller than 1.4.1 was, and it is a mistake to spend a day on it.

## Outcome

**Done on 2026-08-31. The router is [React Router 8.3.1](https://www.npmjs.com/package/react-router), as a library in declarative mode, declared in `apps/frontend` with no plugin and no root tooling.** The story's default assumption survived, but it was measured rather than inherited — and the spike found two things that had nothing to do with the router.

### The toolchain admitted everything, which is itself the finding

The last two library choices here were narrowed by a peer range before they were narrowed by an argument (`@vitejs/plugin-react-oxc` does not admit Vite 8 despite its name; typescript-eslint caps TypeScript at `<6.1.0`). This time nothing was ruled out, so the decision had to be made on the measurements.

| Candidate                          | Peers                                                    | Verdict                           |
| ---------------------------------- | -------------------------------------------------------- | --------------------------------- |
| `react-router@8.3.1`               | `react >=19.2.7`, `react-dom` optional, node `>=22.22.0` | Admitted — and the margin is thin |
| `@tanstack/react-router@1.170.32`  | `react >=18 \|\| >=19`                                   | Admitted                          |
| `@tanstack/router-plugin@1.168.35` | `vite >=8` — every peer `optional: true`                 | Admitted                          |
| `wouter@3.10.0`                    | `react >=16.8.0`                                         | Admitted; not spiked, see below   |

Two things worth carrying forward. **React Router 8 peers `react >=19.2.7` and we are on 19.2.8** — a two-patch margin, the narrowest peer range in this repository, so a React downgrade is now a router failure as well. And **`react-router-dom` is not the package**: it is stranded at 7.18.3 and v8 ships everything from `react-router` itself. The obvious package name is the wrong one, which is the same shape of trap as `@vitejs/plugin-react-oxc` and worth stating once so nobody installs it from memory.

### The measurements

Each candidate was mounted for real — a chrome route with an `<Outlet/>`, an index route rendering the existing `App`, a `:symbol` route holding component state, and a catch-all — then built, typechecked and linted on the unmodified toolchain. The spike was thrown away afterwards. Keeping `App` inside the route graph matters: routing it away drops Base UI and the five components out of the bundle and reports a 229 kB "improvement" that is nothing of the kind.

| Build                      | Modules | JS            | JS gzip       | CSS     | Files |
| -------------------------- | ------- | ------------- | ------------- | ------- | ----- |
| Baseline (Task 1.4.6)      | 193     | 300.09 kB     | 97.43 kB      | 7.21 kB | 3     |
| **+ React Router 8.3.1**   | **253** | **337.82 kB** | **110.38 kB** | 7.21 kB | 3     |
| + TanStack Router 1.170.32 | 276     | 374.67 kB     | 122.68 kB     | 7.21 kB | 3     |

**+37.73 kB against +74.58 kB — TanStack is very nearly twice the cost**, and 25.25 kB against 12.95 kB gzipped. Neither touches the stylesheet and neither splits the artefact; three files in both cases, because nothing was lazily imported.

For scale: the baseline reproduced byte-for-byte before the spike started, and Base UI already spent 104 kB here. React Router is the second-largest single addition this application has made.

### What TanStack actually buys, verified rather than assumed

Its headline claim is real. With a code-based route tree and the `Register` module augmentation, a mistyped path is a compile error naming the valid set:

```
error TS2322: Type '"/overvieww"' is not assignable to
              type '"/" | "/securities/$symbol" | "." | ".."'.
```

That is not a small thing in **this** repository, which already carries two silent-failure classes it cannot close — a misspelled CSS Module class renders unstyled with nothing in `verify` catching it, and a missing `.js` import extension is caught by `tsc` alone. A router whose paths are checked closes a third before it opens.

It lost anyway, on three grounds together rather than on weight alone:

- **Twice the bundle for four static routes.** PRODUCT_SPEC.md §8 names four primary experiences, not fifty. The type safety scales with the number of routes; the 37 kB does not
- **The ergonomic path is codegen.** Code-based TanStack trees are verbose enough that the file-based plugin is how it is actually used, and that plugin writes `routeTree.gen.ts` — a generated file needing a `.gitignore` entry, a position in the build order and an answer to staleness. That is the exact shape Task 1.4.3 rejected for design tokens, for the same reasons, and it would arrive with `@babel/core`, `chokidar`, `zod` and `unplugin` as root tooling. Assessed from the registry rather than wired, and stated as such
- **Half its value is a data layer this task is forbidden to choose.** Route-level `loader`s and typed search params are genuinely good and they belong to Epic 2 or later. Adopting a router _for_ them would be taking that decision quietly

`wouter@3.10.0` was read on the registry and not spiked: it is smaller than both, but it offers no typed paths, and the axis this decision turns on is "type safety versus weight" — a candidate that is weaker on one axis and cheaper on the other is not a third position, it is a worse React Router. Recorded so nobody re-derives it.

### The React Compiler rules fired for the first time, and the prediction was right about the trigger and wrong about the cause

Story 1.4 expected five components to be the collision and was wrong. This story expected the router to be it. The spike's `:symbol` route synced state on a param change the obvious way, and `pnpm lint` failed at **error**:

```
apps/frontend/src/spike/routes.tsx
  30:5  error  Calling setState synchronously within an effect can trigger
               cascading renders  react-hooks/set-state-in-effect
```

**It is not the router.** Rewriting the same route without the effect lints clean, and neither candidate provoked anything on its own — `useParams`, `Link`, `Outlet`, `RouterProvider` and the `Register` augmentation are all silent under `strictTypeChecked` and all 17 rules. What woke the rule set was **state**, exactly as ADR 0004 predicted after Task 1.4.5 got it wrong. The router is merely the first thing here that gives anyone a reason to hold any.

Worth knowing before Task 1.5.3: the rule set is not hostile, but it has an opinion about a very common shape, `--max-warnings 0` makes that opinion a failing build, and the message is long. Route modules that derive from the URL rather than mirroring it into state will not meet it.

### `tsc -b`, the plugin question, and the install-script policy

- **No build-time plugin.** React Router in declarative mode is a library import and nothing else — the spike built against an unmodified `vite.config.ts`. `@react-router/dev` is its framework-mode Vite plugin and is deliberately **not** adopted; if it ever is, it is root tooling beside Vite, not a package dependency. The house rule is untouched by this task
- **Nothing generated, so nothing for `tsc -b` to order.** No `.gitignore` entry, no staleness question. This is the whole of TanStack's third cost avoided
- **`allowBuilds` did not fire.** A fresh sweep of the installed tree for `preinstall`/`install`/`postinstall` still returns `esbuild@0.28.2` and nothing else. React Router has one runtime dependency, `cookie-es`, and no install script

### Installed, and it currently costs nothing

`react-router@8.3.1` is a dependency of `apps/frontend`. **Nothing imports it yet**, so the built artefact is unchanged and byte-identical — same 193 modules, the same `index-B9nv89IS.js` at 300,090 bytes and `index-BqBMlqiB.css` at 7,216 bytes, still three files, and `react-router` does not appear in the output at all. The +37.73 kB in the table above is what Task 1.5.2 will spend when it writes the route table; it is measured here so that it is attributed to this decision rather than discovered as a regression there.

`pnpm verify` exits 0 in **9.7s**.

### Reversal triggers

- **Route-path typos become a real recurring defect.** This repository has a documented allergy to silent failures and two of them already; if a third arrives from mistyped `to=` props, TanStack's compile-time path checking is the answer and 37 kB is a fair price
- **Epic 2 or later needs typed search params or route-level loaders as first-class things** rather than as a convenience over its own data layer

The cost of reversing is the route table plus every `<Link to>` call site. That grows with the **number of routes**, which PRODUCT_SPEC.md §8 caps at four for now — not with the number of components, which is what made Task 1.4.1's equivalent decision expensive. At this scale it is an afternoon, which is exactly why this task was allowed to be smaller than 1.4.1 was.

### The check Story 1.4 owed: closed as unresolvable, and converted into a standing rule

The external shared component library is not reachable from this repository and, asked directly, **the author does not have its exports available**. So the check cannot be made, and pretending otherwise by deferring it again to Task 1.5.6 would just move the same sentence forward one file.

The decision taken with the user instead, on 2026-08-31: **build against Base UI's interfaces and our own, and make the seam as cheap to swap as possible.** That turns an open check into a constraint that is actually enforceable here:

- Every Base UI usage stays behind a thin wrapper of ours in `src/components/<Name>/`, and call sites import the wrapper. This is Task 1.4.5's rule, now standing on its own reason rather than on the pending check
- A wrapper's props are **our** vocabulary, not a re-export of the primitive's. `Popover` is the model: 30 lines of assembly, no behaviour, nothing of `@base-ui/react` in its public type
- The count of files importing `@base-ui/react` stays the number worth watching. It is **one** today, and Task 1.5.3 may make it two

What changes if the assumption turns out to be wrong: nothing structural. The swap cost is the wrapper files, not the application — which is the property the wrapper rule was bought for. ADR 0004 §2's assumption is not vindicated by this, it is **retired**: the reason for preferring Base UI over Radix is no longer a verifiable claim about a specific library's interfaces, it is a bet on a shape, and the wrapper layer is the hedge. If Epic 15's accessibility review finds against Base UI, Radix and react-aria-components are still the standing alternatives and the wrapper layer is what makes either affordable.

This bullet does not get carried forward again. It is answered.
