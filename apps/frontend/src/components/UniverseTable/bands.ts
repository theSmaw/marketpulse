// Which sector bands are shut, and the two figures that follow from it (Task
// 2.11.8).
//
// ## Why this is a module beside the table rather than four lines in it
//
// The same reason `coverage.ts` and `last-close.ts` are: the arithmetic a
// summary line publishes is the part that can be quietly wrong, and a figure in
// a component is a figure nothing tests. `rowsShown` in particular is the whole
// content of the sentence this task owes — *a control that genuinely changes
// which rows are on screen has to change that line in the same commit* — and it
// is one off-by-one away from being a lie on a screen that claims 518 of
// something.
//
// ## The set is of band **keys**, not of sectors
//
// `UniverseGroup.key` is a `Sector` for eleven of the twelve and the literal
// `market-proxies` for the twelfth, which has no sector to be keyed by. Typing
// this as `Set<Sector>` would make the market proxies the one band that cannot
// be collapsed — a control that cannot reach a band, which is the thing
// `UNIVERSE.md` §12.2's rule is about even though that rule is written about
// `status`.
//
// ## Nothing here mutates
//
// Every function returns a new `Set`. That is not tidiness: the set is React
// state, and a mutated `Set` passed back to `setState` is the same object, so
// the render that would show the change never happens.

/** The shape this module needs from a rendered band. Deliberately structural
 *  rather than an import of `UniverseGroup`, so the arithmetic can be tested
 *  without building six `Security` literals to get at two numbers. */
export interface CountedBand {
  readonly key: string;
  readonly securities: readonly unknown[];
}

/** Open a shut band, or shut an open one. */
export function toggleBand(
  collapsed: ReadonlySet<string>,
  key: string,
): ReadonlySet<string> {
  const next = new Set(collapsed);
  if (!next.delete(key)) next.add(key);
  return next;
}

/** Shut everything. */
export function collapseAll(
  bands: readonly CountedBand[],
): ReadonlySet<string> {
  return new Set(bands.map((band) => band.key));
}

/** Open everything. */
export function expandAll(): ReadonlySet<string> {
  return new Set();
}

/**
 * Is every band shut?
 *
 * **Asked of the bands on screen rather than of the set's size**, because the
 * set can hold a key for a band that is no longer rendered: the universe is
 * re-fetched by the retry control, and a sector that lost its last row between
 * two loads leaves a key behind. Comparing sizes would then report "all
 * collapsed" over a table with rows in it, and the one control whose label
 * depends on this answer would offer to expand a table that is already open.
 */
export function allCollapsed(
  bands: readonly CountedBand[],
  collapsed: ReadonlySet<string>,
): boolean {
  return bands.length > 0 && bands.every((band) => collapsed.has(band.key));
}

/**
 * How many rows are actually on screen.
 *
 * The figure the summary line's last clause reports, and the reason it is a
 * function rather than `securities.length - something`: a collapsed key with no
 * band behind it must subtract nothing, which is the same stale-key case
 * {@link allCollapsed} is careful about.
 */
export function rowsShown(
  bands: readonly CountedBand[],
  collapsed: ReadonlySet<string>,
): number {
  return bands.reduce(
    (total, band) =>
      collapsed.has(band.key) ? total : total + band.securities.length,
    0,
  );
}

/**
 * The DOM id of a band's disclosure button — the thing the rail jumps to.
 *
 * **Prefixed by a `useId()` value supplied by the caller**, because a page can
 * hold more than one of these tables: the workshop's permutation grid renders
 * eleven, and two elements with `id="band-technology"` is a duplicate-id
 * violation in a tree that gates on axe. The prefix is opaque and no test
 * asserts on one — `e2e/README.md` names a `useId()` value as a thing a test
 * must not assert on, which is why every instrument for this control reaches it
 * by role and name instead.
 */
export function bandButtonId(prefix: string, key: string): string {
  return `${prefix}-band-${key}`;
}

/** The DOM id of the rows a band's button controls. See `bandButtonId` for the
 *  prefix. */
export function bandRowsId(prefix: string, key: string): string {
  return `${prefix}-rows-${key}`;
}
