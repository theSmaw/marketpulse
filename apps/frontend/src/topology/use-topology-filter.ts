import { useMemo } from "react";
import { useSearchParams } from "react-router";

import { readTopologyFilter } from "./filter.js";
import type { TopologyFilter } from "./filter.js";

// The one place this application reads a **sector filter** out of the address
// (Task 6.8.1), and the sibling of `use-time-window.ts` in every respect.
//
// `FRONTEND-STATE.md` §3: **the path names the subject and the query names the
// view.** `/` is the subject — the whole market — and which sector of it is
// drawn is a view, so it is a query parameter and gets `?sessions=`'s exact
// treatment: one reader, here; one builder, `topologySectorPath` beside it in
// `filter.ts`. `?sessions=…` was the first occupant of this product's query
// string and this is the second.
//
// ## Why the reader is here and the rest of the module is pure
//
// `useSearchParams` is the only thing in this behaviour that needs React at
// all. The criterion, the narrowing, the path and the words are a function of
// a query string (`filter.ts`), which is what lets a unit test cover every one
// of them without a router — including the states a test cannot easily reach
// through a hook, like an address naming a sector this product does not track.
//
// ## It is NOT in `routes/`, unlike `use-time-window.ts`
//
// That reader serves two routes (`/securities` and `/securities/:symbol`) and
// a control that three components read. This one serves exactly one region,
// whose every other part already lives under `topology/` — and §26's module
// rule is that a feature module's business lives inside it and its API is the
// barrel. A reader in `routes/` would be the one piece of this region's
// behaviour outside the module that owns it.

/**
 * What the address says the topology is narrowed to.
 *
 * **Memoised on the two strings it is derived from**, so the object identity
 * changes exactly when the address does — which is what lets
 * `MarketTopology`'s own `setFilter` effect depend on this value directly
 * without re-applying a filter on every one of `/`'s 6.8–16.1 renders a
 * minute. The feed changes this never.
 */
export function useTopologyFilter(): TopologyFilter {
  const [params] = useSearchParams();
  const search = params.toString();

  return useMemo(() => readTopologyFilter(search), [search]);
}
