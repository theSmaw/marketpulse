// The `market` module — this application's first feature module under
// PRODUCT_SPEC.md §26's boundaries, and **the precedent for the seven that
// follow it** (Task 2.10.4).
//
// Epics 3 to 11 add `topology`, `charts`, `anomalies`, `investigations`,
// `replay`, `filings` and `shared`. Where the first one goes and what leaves it
// is therefore worth deciding once and writing down, rather than being settled
// seven times by whoever needs the second one.
//
// ## Where it sits, and why not literally where §26 draws it
//
// §26 draws `app/market/{data,models,state}`. This tree has no `app/` — the
// application *is* `apps/frontend/src`, which is flat today: `components/`,
// `routes/`, `styles/`, and the hooks and helpers at the root. Nesting one more
// `app/` inside `src/` would be a directory whose only content is the word
// "app", which is the shape of a convention copied rather than applied.
//
// So a feature module is **a directory under `src/`, sibling to `components/`
// and `routes/`**, named for its domain. That is the rule the next seven
// inherit.
//
// §26's three sub-namespaces are a *shape for a module big enough to need
// them*. This one is three files, and `data/`, `models/` and `state/`
// directories holding one file each would be five directories of ceremony over
// 400 lines of code. They are spelled as filenames instead —
// `bar-series-payload.ts` is the data edge, `bar-series-view.ts` is the state —
// and a directory arrives when a namespace has more than a couple of files in
// it. `CLAUDE.md`'s "do not scaffold ahead of the current step" is the whole
// argument.
//
// ## What leaves the module, and what enforces it
//
// **This file is the module's API.** §26's rule — the one that matters — is
// that a feature module exposes a domain-level API rather than reaching into
// another's internals, and a barrel is the mechanism: what is re-exported here
// is public, and everything else in the directory is the module's business.
//
// It is not a convention somebody remembers. `eslint.config.mjs` carries a
// `no-restricted-imports` block forbidding any file outside `src/market/` from
// importing anything under it except this file, because a stated invariant that
// nothing checks quietly stops being true — this repository has watched that
// happen and wrote it down.
//
// ## What is deliberately NOT in here
//
// **The four existing hooks stay where they are.** `use-backend-health.ts` and
// `use-market-clock.ts` are chrome rather than market domain — a service's
// health and a wall clock are facts about the deployment and the day, not about
// the market's data. `use-securities.ts` genuinely is market domain and is a
// candidate; moving it is a change with **no user in it**, it would touch a
// route, a component, two test files and a story to relocate a file that works,
// and this task's job is to establish the module rather than to reorganise
// around it. The judgement is recorded here so the next reader knows it was
// taken rather than missed. It moves when something else has to move anyway.
//
// **`bar-series-query.ts` stays at the root too**, for the same reason and one
// more: Task 2.10.3 shipped it, `api-client.ts` imports it, and its header is
// referenced from two documents by path. Its types are re-exported below, so a
// consumer of this module gets one import for *what we ask for* and *what we
// know about the answer* without the file moving.

export { toDomainSeries } from "./bar-series-payload.js";
// The chart layer's arithmetic (Task 2.12.3). Scales, a price domain, ticks and
// the market gap, all of it pure and none of it aware that a DOM exists —
// `CHARTING.md` §1 chose hand-built SVG with no charting dependency, so this is
// the whole of what a renderer is handed.
export { chartDensity } from "./chart-density.js";
export type { ChartDensity } from "./chart-density.js";
export {
  READING_ANNOUNCEMENT_DELAY_MS,
  READING_ANNOUNCEMENT_MIN_GAP_MS,
  barChangePercent,
  clearedAnnouncement,
  formatBarInstant,
  readingAnnouncement,
} from "./chart-reading.js";
export {
  clampToRange,
  linearScale,
  nearestSlot,
  scaleSlot,
  scaleValue,
  slotScale,
  unscaleSlot,
  unscaleValue,
} from "./chart-scale.js";
export type { LinearScale, SlotScale } from "./chart-scale.js";
export {
  formatSessionDate,
  formatSessionTime,
  nearestPlaced,
  placeBars,
  positionOfInstant,
  seamSlots,
  timeAxis,
  timeTicks,
} from "./chart-time-axis.js";
export type {
  AxisPosition,
  AxisSession,
  PlacedBar,
  TimeAxis,
  TimeTick,
  TimeTickOptions,
} from "./chart-time-axis.js";
export {
  FLAT_DOMAIN_FRACTION,
  PRICE_DOMAIN_PAD,
  priceDomain,
  valueTicks,
} from "./chart-value-axis.js";
export type { ValueTick } from "./chart-value-axis.js";
export {
  PRICE_DIRECTIONS,
  directionOf,
  formatChangePercent,
  formatPrice,
} from "./price-format.js";
export type { PriceDirection } from "./price-format.js";
export {
  BAR_SERIES_FAILURES,
  toBarSeriesView,
  toRetryingBarSeriesView,
  toStaleBarSeriesView,
} from "./bar-series-view.js";
export type {
  BarSeriesFailure,
  BarSeriesView,
  PopulatedBarSeries,
} from "./bar-series-view.js";
export {
  SEARCH_ANNOUNCEMENT_DELAY_MS,
  SEARCH_ANNOUNCEMENT_MIN_GAP_MS,
  searchAnnouncement,
} from "./search-announcement.js";
export type { SearchCorpus } from "./search-announcement.js";
export {
  MATCH_TIERS,
  SECURITY_MATCH_LIMIT,
  matchSecurities,
} from "./security-match.js";
export type {
  MatchEmphasis,
  MatchTier,
  SecurityMatch,
  SecurityMatches,
} from "./security-match.js";
export { useBarSeries } from "./use-bar-series.js";
export type { BarSeriesSource } from "./use-bar-series.js";

// The cache itself is deliberately **not** exported. It is an implementation
// detail of the hook — nothing outside this module should be able to read a
// series without asking for one, which is the rule that keeps *every read is
// accompanied by a request* true (`FRONTEND-STATE.md` §2) rather than merely
// stated.
//
// **One function off it is, and only one** (Task 2.10.6): the reset. It can
// forget and it cannot read, so the invariant above is untouched, and what it
// buys is that `src/test-setup.ts` — which is outside this module and reaches it
// only through this file — can clear a module-level singleton between tests. The
// argument for exporting a test-only function at all, and the `eslint.config.mjs`
// exemption that was rejected instead, are in `series-cache.ts` beside it.
export { clearBarSeriesCache } from "./series-cache.js";

// Re-exported rather than moved — see the header. A consumer asking for a
// series and a consumer holding one should not need to know that the request
// type predates the module.
export { barSeriesQuery } from "../bar-series-query.js";
export type { BarSeriesRequest, SeriesWindow } from "../bar-series-query.js";
