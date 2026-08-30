# ADR 0003 — Frontend build tooling and the browser baseline

**Status:** Accepted
**Date:** 2026-08-30
**Delivered by:** Epic 1, Story 1.3 (Tasks 1.3.1–1.3.5)

## Context

Story 1.3 builds the container every frontend feature in Epics 2–14 is added
to: a React + TypeScript application that builds to static assets, runs in
development with fast refresh, and renders a placeholder shell. No routing, no
styling system, no state library — those are Stories 1.4 and 1.5 and Epic 2.

`PRODUCT_SPEC.md` §25 named React and TypeScript and stopped there. Everything
below it was open: which bundler, what `build` means once one exists, where its
output goes, and which browsers the emitted JavaScript is allowed to assume.

This is the first story to introduce a **second producer of JavaScript**.
Until now `tsc` compiled everything this repository ships, and ADR 0001's
decisions — project references, built output, `typecheck` and `build` being the
same command — were all shaped by that being true. A bundler breaks the
assumption, and three of the four decisions here are consequences of it.

## Decisions

### 1. Vite, not a hand-assembled toolchain

Vite 8.2.2, pinned as a root devDependency under ADR 0001 §6.

The argument is not speed. It is that a frontend needs a dev server with
module replacement, an HTML entry point, asset hashing, and a production
bundler, and that assembling those separately means owning the seams between
them. Vite is one dependency that answers all four, with `@vitejs/plugin-react`
adding Fast Refresh.

**The rejected alternative and its cost.** The alternative worth naming is
`tsc` plus a static `index.html` and no bundler at all — genuinely viable for a
placeholder shell, and it would have kept `tsc` as the single producer. It was
rejected because the first real dependency makes it untenable: browsers cannot
resolve bare specifiers, so `import { createRoot } from "react-dom/client"`
needs either an import map maintained by hand or a bundler. Deferring the
bundler defers it to the story that can least afford the distraction.

**Know what Vite 8 is, because the ecosystem's advice predates it.** Vite 8 is
the Rolldown release. This toolchain contains **no esbuild**, and material
written for Vite 5 or 6 describes a different bundler with a different
resolver. Two things followed from this immediately: the plugin whose name
points at it, `@vitejs/plugin-react-oxc`, peers on `^6.3.0 || ^7.0.0` and does
**not** admit Vite 8 — the obvious-looking choice is the wrong one — and the
install-script prediction below failed.

### 2. `build` is `tsc -b && vite build`, and the root's is not the same string

Types are checked before the bundle is emitted, in that order, so a type error
fails the build rather than shipping. `typecheck` stays the `tsc -b` half
alone.

**The catch nobody predicted: the root `build` had to change too.** It was a
direct `tsc -b` over the root solution. With the frontend's TypeScript half now
emitting nothing, that would have typechecked the frontend and produced no
bundle at all — so `pnpm verify` would have gone green without the bundler ever
running, and a build that fails only in Rolldown would have reached CI
unnoticed. The root script is now:

```
"build": "tsc -b && pnpm --filter @marketpulse/frontend exec vite build"
```

**The rejected alternative and its cost.** The obvious fix is `pnpm -r run
build`, which ADR 0001 §5 deliberately avoids: the reference graph already
orders the work, and a fan-out builds `packages/shared` three times. Naming one
package in a root script is uglier and it hardcodes a package name that a
second frontend would silently miss — which is the specific regression to watch
for, and the reason the root `build` is worth reading whenever a package is
added. It is a known cost, taken because a wrong `verify` is worse than an
inelegant script.

### 3. The `dist/` collision is resolved by removing a producer, not by moving output

`tsc -b` and Vite both default to writing into `apps/frontend/dist`. Rather
than separating the directories, the frontend's TypeScript half is `noEmit`, so
**Vite owns `dist/` alone** and TypeScript there typechecks and nothing else.

This is safe only because `apps/frontend` is a composite project **referenced
by nothing**. No consumer ever reads its declarations, so the emit was dead
output. It would be actively wrong for `packages/shared`, whose emitted
declarations are its entire contract — do not generalise this.

**The rejected alternative and its cost.** Giving tsc its own `outDir` —
`dist-tsc/`, say — keeps both producers and costs an ignore entry in three
files, a directory nobody reads, and a `tsc -b --clean` that only knows about
the half it produced. `noEmit` was preferred because a directory nothing
consumes is not worth maintaining.

`composite` still applies alongside `noEmit` and is still required, because the
root solution references this project. That combination was an error in older
TypeScript versions; it is accepted by 6.0.3 and worth re-checking on an
upgrade.

**The cost that did land: `clean` is no longer `tsc -b --clean`.** Both the
root's and the frontend's gained an `rm -rf` half, because `tsc -b --clean`
knows nothing about output it did not emit. Note this makes the frontend's
`clean` immune to the orphaning trap ADR 0001 describes — `rm -rf` is
content-blind, where `tsc -b --clean` deletes the output of the sources that
currently exist — and note also that the worry it was guarding against turned
out to be moot: `build.emptyOutDir` defaults to true when `outDir` is inside
the project root, so Vite clears the directory on every build and hashed assets
never accumulate. That is a default rather than a guarantee, and
`emptyOutDir: false` brings the whole problem back.

### 4. The browser baseline is evergreen desktop, expressed as ES2024

Desktop-first per `PRODUCT_SPEC.md` §3, and evergreen: current Chrome, Edge,
Firefox and Safari. ES2024 is the language level those four have shared since
roughly March 2024 — Safari 17.4 is the constraint; Chrome 119 and Firefox 121
arrived earlier — which makes it about two years of headroom rather than a bet
on something new.

**It has two readers and they must agree.** `target` in
`apps/frontend/tsconfig.json` decides what the language allows; `build.target`
in `vite.config.ts` decides what actually ships after downlevelling. Vite 8's
default is `baseline-widely-available`, which is **lower** than es2024 — so
leaving `build.target` unset is not neutral. It is a silent disagreement in
which tsc permits syntax the bundler then rewrites for browsers nobody agreed
to support. Both are stated explicitly; change one and change the other.

**The rejected alternative and its cost.** A lower baseline — es2020, or Vite's
default — would widen browser support at the cost of shipping downlevelled
output for browsers this product does not target. `PRODUCT_SPEC.md` puts mobile
UX out of scope for V1 and the tool is a desktop analysis surface, so the
support was not worth the transform. The cost is real if that changes: a
mobile or embedded-webview requirement makes this a decision to revisit rather
than a setting to nudge.

Note what this decision is not. It is a **choice, not a measurement** — no
browser matrix has been exercised, and nothing here has run in Firefox or
Safari at all.

## Consequences worth stating separately

### The frontend's dev server does not typecheck, and its two failure modes are opposites

Measured in Tasks 1.3.1 and 1.3.3. A **type** error is applied as an ordinary
HMR update — no overlay, no console error, component state preserved — and is
caught only by the editor or `pnpm verify`. A **syntax** error fails the oxc
transform loudly, logs source context, and leaves the page on its last good
render.

The first is the dangerous one, because a green-looking dev server is not
evidence of a compiling tree. This is the reason `build` runs `tsc -b` first
rather than trusting the bundler.

### The `.js`-extension convention is enforced by `tsc` alone

ADR 0001 §11 requires relative imports from `.ts` files to carry the emitted
`.js` extension. Both producers accept it, and Task 1.3.2 recorded that they
agree for different reasons — `tsc` maps the emitted name back under
`nodenext`, Rolldown tries TypeScript source extensions for a `.js` specifier.

Task 1.3.5 checked the **negative** case and they do not agree at all. Drop the
extension and `tsc -b` fails with TS2835 and exit 1, while `vite build`
resolves `./App` to `App.tsx` and emits a byte-identical bundle. So the
convention has exactly one enforcer in this package. A frontend-only change
that violated it would be caught by `build` and by nothing the dev server or
the bundler does — another consequence of the ordering in §2.

### The two apps' deployable units are different shapes

Measured in Task 1.3.4, and the asymmetry is the point. The frontend's
deployable unit is `dist/` **alone**: two files, no `package.json`, no
`node_modules`, zero bare imports left in the bundle. Copied outside the
workspace and served by `python3 -m http.server`, it renders. ADR 0002 records
the opposite for the backend, where `dist/` alone does not run at all and the
package directory is the unit.

Two specifics for Story 1.11 that neither half implies on its own. The emitted
asset path is **absolute** (`base` defaults to `/`), so a subpath deployment is
a `base` change and a **rebuild**, not a hosting setting. And rebuilding
`packages/shared` does **not** reach a built frontend, because the shared code
is inlined at bundle time and the workspace symlink is not part of the
artefact.

### `vite preview` is not a static host, and the difference hides a real failure

`preview` was added in Task 1.3.4 with the status `apps/backend`'s `start`
has — an extra, not a seventh verb, no root fan-out, no place in `verify`, and
it builds nothing. It is the right way to look at a production build locally
and the wrong way to prove one works. Measured:

| request               | `vite preview` | `python3 -m http.server` |
| --------------------- | -------------- | ------------------------ |
| `/`                   | 200 html       | 200 html                 |
| `/assets/<hashed>.js` | 200 js         | 200 js                   |
| `/no-such-route`      | **200 html**   | **404**                  |
| `/assets/nope.js`     | **200 html**   | 404                      |

The last row has teeth: preview's SPA fallback answers a **missing asset** with
`index.html`, so a broken reference arrives in the browser as a MIME-type error
rather than a 404 naming the file. Story 1.11 has to state its host's fallback
behaviour rather than discover it.

### Three ports, and only two of them are decisions

Backend 3000 and dev server 5173 were chosen. Preview 4173 is Vite's default
written down explicitly, because `preview` **inherits** `server.strictPort` but
**not** `server.port` — measured both ways. A config naming only 5173 would
read as covering both servers while leaving one implicit.
`preview.strictPort` is deliberately absent for the opposite reason: it _is_
inherited, and a second copy is one more place for the two to disagree on an
upgrade.

`strictPort: true` itself is the decision rather than the default. Vite would
otherwise print `Port 5173 is in use, trying another one...` and quietly bind
5174, which Task 1.3.1 hit on its first run. The deciding reason was Story
1.12: CORS is configured against this origin, and a frontend that silently
moves ports fails an allowlist as a browser CORS error — a symptom naming
neither the port nor the cause.

### Both frontend servers bind IPv6 loopback; the backend binds IPv4

Task 1.3.5 measured it. `vite` and `vite preview` listen on `[::1]`, so
`curl http://localhost:5173/` works and `curl http://127.0.0.1:5173/` is
**connection refused**. `apps/backend` defaults to `127.0.0.1` and is the
reverse. Both are "localhost" to a browser and are not to a script, which
matters for anything Story 1.10 or 1.11 writes as a health check.

### The install-script prediction was wrong, and `allowBuilds` is still untested

ADR 0001 §13 predicted esbuild arriving with Vite as the first dependency to
trip the install-script allowlist. It did not happen, and it will not: Vite 8
uses Rolldown, which ships as prebuilt per-platform binaries. Four sweeps —
Tasks 1.3.1, 1.3.2, 1.3.3 and a cold 200-package install in 1.3.5 — found
**zero** `preinstall`/`install`/`postinstall` scripts anywhere in the tree.

`allowBuilds` is empty and has never been exercised. The policy is unchanged
for whenever something does bring one; what is no longer true is the claim that
we know what it feels like when it fires.

### Rolldown is the first platform-specific native binding in this repository

`@rolldown/binding-darwin-arm64` resolves locally; Linux CI resolves something
else. The lockfile records all fifteen platform variants as optional
dependencies, so this should just work — but it is the first time "works on my
machine" has a real mechanism behind it here, and CI is where it would surface.
Story 1.10 carries the note.

### What this story deliberately did not do

- **No bundle-size budget.** 190.80 kB (60.16 kB gzipped) across 17 modules is
  React and almost nothing else, so a budget today is a budget on a dependency
  rather than on this application's code. Deferred to **Epic 14 — Performance &
  Scale Validation**, where the measurement has something to measure
- **No CSS.** The build emits no stylesheet because nothing imports one.
  Story 1.4 chooses the styling approach and is what makes an asset appear
- **No tests** (Story 1.9). A component test needs a DOM environment, which is
  a different runner decision from the backend's `app.inject()`
- **No routing** (Story 1.5), no state library, and no request to the backend
  (Story 1.12, which also owns CORS)
- **No real static host.** `python3 -m http.server` proves the artefact is
  self-contained and proves nothing about caching, compression, redirects or
  SPA fallback on whatever Story 1.11 picks
- **The React Compiler rule set has never met real code.** Fifteen of
  `eslint-plugin-react-hooks`'s 17 rules are at `error` and this tree contains
  one stateless component, so they have been adopted rather than exercised. The
  first time they say something interesting will be in Epic 2, and it may not
  be welcome then — that is the risk that came with taking `recommended` whole

## Related

- [ADR 0001](0001-repository-structure-and-typescript-toolchain.md), whose
  single-producer assumptions this record amends — §5 (root scripts), §12 (the
  per-app compiler overrides, now six rather than four) and §13 (the
  install-script prediction)
- [ADR 0002](0002-backend-framework-and-server-composition.md), for the
  deployable-unit comparison
- [Story 1.3](../../planning/epic-01-application-foundation/story-03-frontend-application-shell/STORY.md)
  and its five task records, which carry the measurements behind each claim
- `PRODUCT_SPEC.md` §3 (target users and platform), §25 (frontend
  architecture), §39 (architecture decision records)
