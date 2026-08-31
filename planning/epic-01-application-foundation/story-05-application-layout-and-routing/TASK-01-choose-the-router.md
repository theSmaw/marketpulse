# Task 1.5.1 — Choose the router, and close the check Story 1.4 owes

**Status:** Not started
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
