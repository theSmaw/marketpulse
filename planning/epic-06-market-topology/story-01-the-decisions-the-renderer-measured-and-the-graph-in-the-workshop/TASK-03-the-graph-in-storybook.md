# Task 6.1.3 — The Graph, in Storybook

**Status:** Not started
**Story:** [6.1 The Decisions, the Renderer Measured, & the Graph in the Workshop](STORY.md)
**Depends on:** 6.1.2

## Objective

This is the task that pays off the story's own promise: "a graph of the whole
tracked market, in Storybook." Everything before this task was model, layout
and measurement with nothing to look at; this task wires the winning renderer
to real data and draws it exactly as `The graph at rest.dc.html` specifies.

## What the user can see when this lands

**A real graph of 516 real securities, in Storybook** — eleven sector clusters
converging on their benchmark ETFs, SPY at the centre with the three undecoded
proxies held beside it, pannable and zoomable, on the light grounds, with
every state this component can actually be in.

## Work

- **The host component** — `apps/frontend/src/components/MarketTopology/`
  (a `.tsx`, so `pnpm stories` can see it; **not** under `src/market/`, which
  holds no `.tsx` today and would escape that check silently). Props take a
  `SecuritiesView` (reuse the existing union from `use-securities.ts` — do not
  invent a parallel state type), builds `TopologyGraph` and `TopologyLayout`
  from the `loaded` securities, and mounts the winning renderer from Task
  6.1.2.
- **`apps/frontend/src/topology/index.ts`** — the barrel. Add the `eslint`
  boundary entry to the **same** `no-restricted-imports` `patterns` array that
  already holds `market/`'s entry (a second config block for the same rule
  silently _replaces_ rather than adds to it — verified in this repository
  once already).
- **Colour, read from tokens, never a literal**: add any new topology token
  names to `styles/tokens.ts`'s `TOKEN_NAMES` (the real mechanism — a startup
  throw) even though the `var()`-reading invariant cannot see a canvas. The
  parse layer (`getComputedStyle` → packed colour) **throws** on a missing or
  malformed token; it does not default silently.
- **Sizing**: the component reads its box via `ResizeObserver` and fits the
  layout's normalised coordinates to it — no pixel constant, no remembered
  size. (This story ships no route, so the box is Storybook's own; Story 6.2
  owns fitting it to the real, narrower landing-page region.)
- **Draw every state, each its own Storybook export**:
  - `loading` — a reserved box, never a half-drawn canvas.
  - `loaded`, whole universe — the headline story, matching the canvas page's
    geometry (ring radius, cluster radii, node ladder, edge gaps).
  - `loaded`, filtered to one sector — close enough to read labels and the
    footprint annulus.
  - `loaded`, the four market-proxy nodes alone — the state nobody had named:
    confirm the `sector: null` nodes render as the diamond shape, grouped
    under one `MARKET PROXIES` label, with `SPY` distinguished as the one
    carrying edges.
  - `empty` — the service answered correctly and holds nothing. DOM text,
    sibling to the (absent) canvas, never drawn inside it.
  - `failed` (+ `retryable`/`retrying`) — the sentence, a `requestId`
    reference, one `Try again`. DOM text, same rule.
- **A component test, in jsdom, for exactly the part jsdom can see**: the
  `empty` and `failed` states render their sentence as real DOM text (not
  inside the canvas/SVG), and `loading` renders no canvas element at all.
  **Do not write a `renders without crashing` test for the drawn graph
  itself** — jsdom has no WebGL/2D context and `getTokens()` throws in the
  test environment, so nothing below a real browser can assert a single pixel
  this renderer draws; a vacuous test here is worse than its absence.
- **`pnpm probe --story <id>`** against each state, at all four widths, for a
  person (orchestrator or designer) to compare against the canvas page before
  this task closes.

## Done when

1. `pnpm stories` passes (the host component has a sibling `.stories.tsx`).
2. All six states above exist as named Storybook exports and were reviewed via
   `pnpm probe --story` against `The graph at rest.dc.html`'s geometry and ink
   figures (ring radius ≈335px-equivalent, 4.3% ink, the node ladder, the gapped
   edges) — discrepancies are recorded, not silently reconciled.
3. The `eslint` boundary entry is in place and verified (attempt a deep import
   into `topology/` from outside it; confirm it fails lint; revert the
   attempt).
4. The jsdom component test for `empty`/`failed`/`loading` passes.
5. `pnpm build && pnpm lint && pnpm format:check` all exit 0.
6. `pnpm stories`'s own known blind spot is named in this task's record: it
   proves the file exists, not that these six states are inside it — the real
   verification is the `pnpm probe` review in item 2.

---

## What was done — YYYY-MM-DD

## For a stakeholder — a status report, YYYY-MM-DD
