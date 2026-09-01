# Task 1.7.6 — The frontend error boundary and its region fallback

**Status:** Complete
**Story:** [1.7 Logging & Error Handling](STORY.md)
**Depends on:** Story 1.5 (complete). Independent of Tasks 1.7.1–1.7.5

## Objective

Contain a render failure to the region it happened in, offer a way out of it, and leave the rest of the screen working — the frontend half of PRODUCT_SPEC.md §36's "degrade locally".

## Work

- **The containment boundary has a literal referent now, and the wrong placement was measured rather than argued.** Story 1.5 built four `region` landmarks on the landing route — market topology, unusual activity, market breadth, current investigations — each with `aria-labelledby` pointing at its own heading. Task 1.5.5 put a `<Suspense fallback={null}>` at the router and served the build from a host delaying each chunk: `AppHeader` rendered perfectly and the **entire** `<main>` went blank underneath it. A boundary at `<Routes>` blanks the page body; a boundary at a region blanks a box. That is the degenerate case criterion 7 exists to rule out
- **Decide the placement for all five routes, not just the one with regions.** The landing route gets a boundary per region. The other four are deliberately a single area, so on those routes "the affected region" means the outlet — say which, rather than letting the two cases quietly mean different things. And decide `AppHeader` separately: it is outside `<Routes>` and eager, which is what makes a Story 1.12 status indicator survive the thing it reports on, and it also means a failure _in_ the chrome has nothing above it. Either it gets its own boundary or a broken header is allowed to take the page — both are defensible, neither is a default
- **This is the codebase's first class component, and React 19 has not changed that.** There is still no hook equivalent for `componentDidCatch`/`getDerivedStateFromError`. Decide hand-rolled versus a small library (`react-error-boundary` is the standing candidate) and **measure it against the baseline before adopting**: 265 modules, **342.01 kB** of JavaScript, 9.82 kB of CSS, three files. A library that costs a few kB for a reset API and a well-tested `key`-based remount may well win; the point is that the number is attached to the decision the way Task 1.5.1's was
- **React 19's root options are a reporting hook, not a containment one.** `createRoot` takes `onUncaughtError`, `onCaughtError` and `onRecoverableError`, and `main.tsx` passes none today. They complement a boundary rather than replace it, and they are the natural place for whatever this application does with an error it has already contained. Decide whether to wire them, knowing there is nowhere to send a log — see below
- **The backend just drew this exact line and the frontend has to draw it too, so borrow the shape rather than rediscovering it.** Task 1.7.5 split failures into _contained_ — a route throws, the error handler answers, the process lives — and _uncontained_, which needed a second mechanism entirely because it escapes the request lifecycle. A React boundary is the first half and **only** the first half: it catches errors thrown during render, in lifecycle methods and in constructors, and it catches **nothing** thrown in an event handler, a `setTimeout`, a promise callback or any code that runs outside the render pass. That is the same failure as 1.7.5's third row — work detached from the thing that scheduled it — and it is why `onUncaughtError` is worth wiring rather than optional: without it, a click handler that throws leaves a screen that looks fine and a console nobody is reading, with no region showing a fallback. Say explicitly which failures this boundary does not catch, the way 1.7.5 said a crash drops in-flight requests. The backend's answer to the uncontained half was to make it loud whatever the settings said; the frontend's cannot exit, so the decision is what "loud" means in a browser with nowhere to send a log
- **`StrictMode` double-invokes render in development, so anything that counts or reports an error will see it twice locally and once in production.** That was adopted deliberately in Task 1.3.3 and it will look like a duplicate-logging defect the first time it is seen. Note it wherever the reporting lands
- **The frontend has nowhere to send a log, and this task should not invent one.** The backend writes JSON to stdout; a browser boundary has no destination, and the criteria do not ask for one. The correlation-id chain only closes once the frontend makes a request, which is Story 1.12. `console.error` with the component stack is an honest stopping point
- **Whatever renders is a component with a component's obligations.** `src/components/<Name>/` holding `<Name>.tsx`, `<Name>.module.css` and `<Name>.stories.tsx`; one story per discrete state plus an `AllPermutations` grid; `pnpm stories` fails the build without the file. A fallback genuinely has states worth a story each, which makes this one of the few places the permutation rule does real work rather than bookkeeping
- **Expect the landmark conflict, and confine the fix to the grid story.** If the fallback renders inside or as a `region`, the permutation grid puts several landmarks on one page and axe reports `landmark-unique` — exactly what `AppHeader` hit in Task 1.5.3, where the fix was disabling the rule via `parameters.a11y.config.rules` **on that one story and nowhere else**. A permanent badge trains the next author to ignore the badge
- **The visual rules are already decided and two of them are easy to get wrong.** There is **one red**: `--status-error` and `--price-negative` resolve to the same value, and what separates "this failed" from "this fell" is presentation — a titled block with a message versus a bare signed figure. So reaching for a distinct error red breaks the one-red rule rather than helping. And colour is never the sole encoding: under greyscale this palette's red and green differ by 1.05:1, so the state must be carried by a **word** — a heading or a label — exactly as an anomaly band carries its name inside its fill. The a11y panel will not catch a failure here: axe returns `color-contrast` as _inconclusive_ on non-text content, which is precisely an icon-only error state
- **The fallback fits the box it is given.** The region grid takes a `height`, not a `min-height`, and each region scrolls its own overflow — which is what stops a fallback pushing its neighbours around or changing §9's 3:1 and 2:1 proportions. A fallback that brings its own layout loses the property the criterion is about
- **`ApiError` now exists in `packages/shared`, and this boundary must not reach for it.** Task 1.7.3 put the API's error shape there — `{ code, message, requestId, details? }` — and it is a **transport** contract. A render failure is not a transport failure: it has no status code, no correlation id, and nothing on the wire, so expressing it as an `ApiError` would invent a `requestId` that names no request and no log record. The two meet only in Story 1.12, where a failed fetch produces a real `ApiError` that a region renders; the fallback's props are its own vocabulary until then. The one thing worth importing early is `REQUEST_ID_HEADER`, and not by this task
- **A degraded feed is not an error and already has a component.** `FeedIndicator` (`live`/`stale`/`disconnected`) is built, takes its `FeedStatus` from `packages/shared`, and is achromatic apart from the amber on `stale`, because §36 makes a dropped feed a product state. The "displaying data through 10:42:17" case is **not** this boundary's job; do not style it as one
- **Recovery is a reset, not a page reload.** Re-render the region rather than reloading the document — a reload discards the rest of a working screen, which is the failure mode being avoided. That reset is likely the first genuinely stateful thing in this application, which makes it the first real test of the React Compiler's 15 error-level rules; they have fired exactly once, in Task 1.5.1's spike, on `set-state-in-effect`, and never on shipped code. `--max-warnings 0` means whatever they say is a failing build
- **`Region` may move, and that is this story's call.** It lives in `src/routes/` and owes no stories because a label and a slot have one state. The rule is a directory rule: a `.tsx` under `src/components/` owes stories, and the test is whether it has states worth reviewing side by side. If this task gives `Region` a failed state, it moves — and its permutation grid meets the landmark conflict above. If the boundary wraps a region's children instead and leaves `Region` untouched, it stays. Decide, do not drift

## Done when

- The landing route's four regions each fail independently, demonstrated: one region shows its fallback while the other three and the chrome render normally
- The placement decision covers all five routes and the header, with reasoning
- The class-component decision records the bundle delta against 265 modules / 342.01 kB / 9.82 kB / 3 files, whichever way it went
- The fallback is a component with a stylesheet and stories, one per state plus `AllPermutations`, and `pnpm stories` passes
- Recovery is exercised — a failing region is reset back to a working one without a page reload
- axe is run against the built page on a static host, and any new finding is either fixed or scoped to a single story with a reason
- `Region`'s directory is decided either way and the reason recorded
- `pnpm verify` exits 0

## Notes

Deliberately independent of the backend tasks: it shares no file with them and could run first. Task 1.7.7 is the only thing downstream of both halves.

## Outcome

Three boundaries, two new components, one moved component and one reporting
seam. No dependency. `pnpm verify` exits 0 in 10.1s and the stories check is
now 9 components / 9 stories.

### The artefact

|                              | modules | JS        | CSS      | files |
| ---------------------------- | ------- | --------- | -------- | ----- |
| Baseline (`HEAD`)            | 267     | 342,017 B | 9,825 B  | 3     |
| Hand-rolled (shipped)        | 271     | 343,658 B | 10,926 B | 3     |
| `react-error-boundary` 6.1.4 | 272     | 344,590 B | 10,926 B | 3     |

**A correction to the baseline first.** Every figure carried since Task 1.5.5
says **265 modules**, and it is 267. The byte count and the bundle hash both
match exactly — `index-BAidohu3.js`, 342,017 B — so it is the same tree and the
same build, and the module figure was simply mis-recorded and then copied
forward through four tasks. Task 1.7.3 already corrected the byte figure by
re-measuring rather than citing; this is the same thing happening to the other
half of the same line.

So the boundaries cost **+4 modules, +1,641 B of JavaScript and +1,101 B of
CSS**, and the artefact is still three files.

### Hand-rolled, and the library was built before it was rejected

`react-error-boundary` 6.1.4 was installed, the boundary was rewritten to
delegate to it, and the artefact was built: **+932 B and +1 module** over
hand-rolling. Then it was reverted, and the tree rebuilt to the same hash as
before the spike.

932 bytes is not the argument, and pretending it is would be dishonest — it is
close to free. Two things decided it.

The first is that **the library's reset has exactly the limitation the
hand-rolled one does.** `resetErrorBoundary()` clears the error state; it does
not remount, so a child holding its own bad state throws again immediately and
the user clicks a button that visibly does nothing. Getting a real reset means
supplying `resetKeys` with a counter you increment yourself — which is the same
`key`-based remount the hand-rolled version does in two lines. The brief called
the library "a well-tested `key`-based remount"; it is a well-tested wrapper
around a `key`-based remount you still have to write.

The second is the count. This repository needs exactly one boundary component.
The library brings a second vocabulary — `fallbackRender`, `resetKeys`,
`onReset`, `useErrorBoundary` — beside the four props this one exposes, and
every one of those is a thing to learn and a thing to keep in step with. It
stays a standing alternative; the reversal trigger is a second boundary with
genuinely different reset semantics, which is Story 1.12's fetch-retry shape if
it is anybody's.

### Placement, all five routes and the header

```
ErrorBoundary  around <AppHeader>        outside <Routes>, compact fallback
ErrorBoundary  around <Routes>           the outlet
ErrorBoundary  inside <Region>           around the content slot, four of them on /
```

Nearest boundary wins, so on the landing route a failure in a region's contents
never reaches the outlet. All three were measured on the running application
with a temporary throwing probe, removed before the commit — the tree rebuilds
to `index-C-Puqfnm.js` with no probe residue.

- **A region fails alone.** `Unusual activity` shows its fallback while
  `Market topology`, `Market breadth` and `Current investigations` and the
  whole chrome render normally. All four `region` landmarks are still in the
  document, the failed one included.
- **The other four routes.** `/replay` made to throw renders the outlet
  fallback with the chrome intact, `Market Replay` still marked
  `aria-current="page"`. On those routes the outlet **is** the affected region,
  which is what the brief asked to be said rather than assumed.
- **The header.** With its boundary, a throwing `AppHeader` becomes a one-line
  compact fallback and all four regions below render. Without it — measured by
  removing the boundary — `#root` has **zero children** and `document.body` is
  empty. A blank document, from the one component that has nothing above it.
  The cost of the boundary, stated rather than discovered: the fallback
  replaces the `<header>`, so a broken chrome takes the banner landmark and the
  navigation with it.

### The boundary is inside `Region`, and `Region` moved because of it

`apps/frontend/src/routes/Region.tsx` → `apps/frontend/src/components/Region/`,
with a stories file. Its own header comment predicted this: a label and a slot
had one state, and the day it acquired a failed one it belonged in the
workshop. It has one now.

Inside rather than around, decided on what the user sees. A boundary outside
the `<section>` replaces the heading along with the contents, so the failed box
loses its name, loses its landmark, and stops being one of §9's four areas.
Inside, all three survive.

### Recovery

Measured in the browser, not asserted. With a probe armed to throw once,
clicking **Try again**:

- `performance.timeOrigin` unchanged and `window.__origin` still set — no
  reload
- exactly one `navigation` performance entry
- `[role="alert"]` count 0, and the region rendering its real content

The reset increments a counter used as the children's `key`, so the failed
subtree is unmounted and a fresh one mounted. Clearing the flag alone would
re-render a child still holding the state that broke it.

### What the boundary does not catch, measured

A button whose `onClick` throws: **no fallback anywhere**, all four regions
still rendering, and **no report at all** — not from the boundary and not from
`onUncaughtError`. A `window` `error` listener added from the console saw it as
`Uncaught Error: PROBE: thrown in an event handler`, and nothing else did.

That is Task 1.7.5's third row exactly — work detached from the thing that
scheduled it. **No `window` listener was installed**, and the reason is that
the backend's parallel does not carry over: `process.on("uncaughtException")`
earned its place by moving a crash out of raw stderr and into the log stream
every other record goes to, and the change was the _stream_. A browser has no
second stream. An uncaught error is already in the console with its stack,
which is the destination a report would use, so a listener would repeat what is
there while also catching every extension and third-party script on the page.
Story 1.12 gets a destination; that is when this is worth revisiting.

### Reporting, and the `StrictMode` warning that did not materialise

All three `createRoot` options are wired to `report-error.ts`. Providing them
**replaces** React's own console message rather than adding to it — measured:
one entry per caught error, ours, with the full component stack, and React's
"The above error occurred in ..." absent.

**The double-report did not happen.** Story 1.7's notes and this brief both
warned that `StrictMode` would make anything reporting an error see it twice in
development, and that it would look like a duplicate-logging defect. A render
throw caught by a boundary produced **exactly one** `onCaughtError` report on
the development server with `StrictMode` on. The constructor does run twice;
the first throw aborts that render pass and React reports the failure once. The
warning stands for anything counting renders and does not stand for this, so no
de-duplicator was written.

### The landmark conflict was predicted and does not exist

Story 1.5, this brief and the first draft of `Region.stories.tsx` all expected
`landmark-unique` to fire on the permutation grid, the way six banners did for
`AppHeader` in Task 1.5.3 — and the disable was written before it was measured.
Three `region` landmarks in the grid report **0 violations**, and
`landmark-unique` is in the _passes_ list on all three nodes. The disable was
removed.

The reason is worth carrying forward, because it says when the conflict is real:
`landmark-unique` keys on role **and accessible name together**, so it fires on
landmarks that are indistinguishable, not on landmarks that repeat.
`AppHeader`'s six banners were six copies of one anonymous thing. A region's
name is its heading, and a grid reviewing regions gives each cell a different
one — because that is what a region is. The permutation grid and landmark
uniqueness only conflict for a component whose landmark has no name.

### axe, against the built page on a static host

axe-core 4.13.0, `dist/` served from outside the workspace by a dumb Python
host with the smallest correct SPA fallback.

| page                                                     | violations | passes | incomplete |
| -------------------------------------------------------- | ---------- | ------ | ---------- |
| `/` (healthy)                                            | 0          | 37     | 1          |
| `/investigations`, `/securities`, `/replay`, `/nonsense` | 0          | 25     | 0          |
| `/` with a region failed                                 | 0          | **41** | 1          |
| `/` with the header failed                               | 0          | 37     | 1          |
| workshop: `Region` AllPermutations                       | 0          | 16     | 0          |
| workshop: `ErrorFallback` AllPermutations                | 0          | 7      | 0          |
| workshop: `ErrorBoundary` AllPermutations                | 0          | 7      | 0          |

The healthy figures are identical to Task 1.5.4's, so the boundaries are not a
regression. The one `incomplete` is the known one and has not moved —
`color-contrast` over two `aria-hidden` direction arrows, "Element content
contains only non-text characters". The failed-region page adds four passes and
no violations. With the header failed, `<header>` and `<nav>` are gone from the
document and the four regions are still there.

### Visual rules

One red, and the fallback uses it as a rule down the left edge rather than as a
fill — the same shape `MarketOverview`'s render check has carried since Task
1.4.4, which was a sketch of this component. The state is carried by the words:
there is no icon-only version, deliberately, because axe returns
`color-contrast` as _inconclusive_ on non-text content and an icon-only error
state is precisely the shape it declines to judge. The fallback brings no
height, no minimum height and no centring, so a region keeps its grid-given box
and scrolls its own overflow.

### The React Compiler rules still have not fired

Sixteen new files' worth of code and they said nothing, which is not evidence
that the tree satisfies them. A class component is invisible to rules written
about function components, `ErrorFallback` is stateless, and the one piece of
state in this task — the boundary's `caught`/`resetCount` — lives in a class.
The first real test is still Story 1.12's.

### For Task 1.7.7

- Criterion 7 is met and the demonstration is above. The word "region" means
  three different boxes in three places and the brief asked for that to be
  said, which the placement table does.
- The baseline correction (265 → 267 modules) needs to reach `CLAUDE.md`, and
  the ADR should record it as the second half of a figure Task 1.7.3 already
  half-corrected.
- Two predictions in Story 1.7's own notes turned out to be wrong — the
  `StrictMode` double-report and the landmark conflict. Both were written as
  warnings and both were disproved by measurement; the ADR should say so
  rather than quietly dropping them.
- The `window`-listener decision is the one with a reversal trigger attached
  (Story 1.12's destination), and it is the frontend's half of Task 1.7.5's
  contained/uncontained split.
