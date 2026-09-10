// The public surface of @marketpulse/shared. Consumers import from the package
// root only; deep imports into ./dist are not part of the contract.
//
// Note the `.js` extension on a `.ts` file. That is not a mistake: `nodenext`
// resolution requires the extension of the *emitted* file, and omitting it is a
// hard error (TS2835). Every relative import in this package looks like this.
export { isTicker, toTicker } from "./ticker.js";
export type { Ticker } from "./ticker.js";

// Market vocabulary shared with the interface. These are names, not values:
// the colours that present them live in apps/frontend and deliberately do not
// come from here — nothing about colour is domain knowledge.
export { ANOMALY_BANDS } from "./anomaly.js";
export type { AnomalyBand } from "./anomaly.js";
export { FEED_STATUSES } from "./feed-status.js";
export type { FeedStatus } from "./feed-status.js";
// What a security IS in this product, and every vocabulary that describes one
// (Task 2.3.2, completing what Task 2.2.4 started with SECURITY_KINDS alone).
// Here rather than in apps/backend for two reasons that are not the same one:
// the `securities` table's `check` constraints need a source of truth that is
// not the constraint (apps/backend/migrations/README.md), and Epics 4, 5, 6, 7
// and 9 all read this vocabulary, so it is a fact both sides depend on rather
// than a fact about one process's transport. The ROW type stays in
// apps/backend/src/schema.ts and is deliberately a different type.
export {
  ETF_KINDS,
  isEtf,
  isSecurity,
  SECTOR_ETFS,
  SECTOR_LABELS,
  SECTORS,
  SECURITY_FIELD_GROUP,
  SECURITY_FIELD_GROUPS,
  SECURITY_KINDS,
  SECURITY_STATUSES,
} from "./security.js";
export type {
  EquitySecurity,
  EtfKind,
  EtfSecurity,
  IndexEtfSecurity,
  Sector,
  SectorEtfSecurity,
  Security,
  SecurityFieldGroup,
  SecurityKind,
  SecurityStatus,
} from "./security.js";

// The wire contract for GET /securities (Task 2.4.2). A separate file from
// security.ts on purpose: that one says what a security IS and every epic reads
// it, this one says what one RESPONSE looks like and only the two ends of this
// API do. `isSecuritiesResponse` arrived with Task 2.4.3's frontend rather than
// with the contract, which is Task 1.7.3's rule that a predicate ships with its
// first reader — and `isSecurity` beside it was already the hard half, so what
// this one checks is the envelope and nothing about a row.
export { isSecuritiesResponse } from "./securities-response.js";
export type {
  FieldGroupProvenance,
  SecuritiesProvenance,
  SecuritiesResponse,
  SecurityCoverage,
  SecurityLastClose,
} from "./securities-response.js";

// The wire contract with the API: the shape every error response takes, and the
// name of the header that correlates any response with its log records. Both
// are here for the same reason — the backend writes them and Story 1.12's
// frontend reads them, and a wire format described in two places is a wire
// format that will disagree with itself.
export { API_ERROR_CODES, apiError, isApiError } from "./api-error.js";
export type { ApiError, ApiErrorCode } from "./api-error.js";
export { REQUEST_ID_HEADER } from "./request-id.js";

// The health endpoint's wire contract (Task 1.12.1). It lived in
// apps/backend/src/routes/health.ts until this story needed the frontend to
// compile against the same definition rather than a second copy of it — and
// importing it back is what makes apps/backend's long-standing declared
// dependency on this package honest.
export { HEALTH_STATUSES, isHealthResponse } from "./health.js";
export type { HealthResponse, HealthStatus } from "./health.js";

// What a *client* concludes about the backend, which is a different fact from
// what the backend said about itself: "unreachable" is the absence of a
// response, which no server can report about itself, and "degraded" is a
// judgement about an answer that did arrive. Two vocabularies, deliberately —
// see backend-status.ts for why widening HealthStatus would have been wrong.
export { BACKEND_DEGRADED_CAUSES, BACKEND_STATUSES } from "./backend-status.js";
export type { BackendDegradedCause, BackendStatus } from "./backend-status.js";

// The one conversion boundary between a UTC instant and market-local time
// (Task 2.5.2). Story 2.5's acceptance criterion 2 is that nothing outside
// `market-time.ts` performs that conversion, and it is held by a grep in
// `market-time.test.ts` plus the rule written beside the module's own exports —
// the same way `api-client.ts` holds "one file calls fetch" and `securities.ts`
// holds Epic 13's temporal seam. It is here rather than in `apps/backend`
// because Story 2.8's ingestion (which minutes should have bars) and Story
// 2.12's chart axis (where to draw a session boundary) are on opposite sides of
// the wire and must not have two copies of it.
//
// It deliberately knows nothing about holidays or sessions — those are Tasks
// 2.5.3 and 2.5.4 — because the two fail differently: a wrong row in the
// calendar is wrong one day a year, a wrong conversion is wrong twice a year
// for everything.
export {
  instantFromMarketTime,
  isMarketDate,
  marketDateAt,
  marketOffsetAt,
  MarketTimeError,
  marketWallClockAt,
  toMarketDate,
  toMarketTimeOfDay,
} from "./market-time.js";
export type {
  MarketDate,
  MarketOffset,
  MarketTimeErrorReason,
  MarketTimeOfDay,
  MarketWallClock,
} from "./market-time.js";

// The trading calendar as data (Task 2.5.3): every day the US equity market is
// shut and every day it closes early, 2024-2028. A TABLE rather than a rule set,
// because Good Friday is Easter-derived and a rule set that gets the other nine
// right looks correct for eleven months of every year — and because the table
// holds a row no rule can produce at all (2025-01-09, the National Day of
// Mourning). Beside `market-time.ts` rather than inside it, because the two fail
// differently: a wrong conversion is wrong twice a year for everything, a wrong
// row here is wrong on one day a year.
//
// A date outside the covered range is a REFUSAL naming the range and the file,
// never a silent "no holidays that year" — which would turn every 2029 holiday
// into a phantom trading session. That is Story 2.5's acceptance criterion 4.
//
// It knows nothing about sessions: no `isMarketOpen`, no bounds, no "last N
// days". Those are Task 2.5.4, built on top of this.
export {
  assertWithinMarketCalendar,
  MARKET_CALENDAR,
  MARKET_CALENDAR_EXCEPTION_KINDS,
  MARKET_CALENDAR_PROVENANCE,
  MARKET_CALENDAR_RANGE,
  MarketCalendarRangeError,
  marketCalendarExceptionOn,
  marketEarlyCloseOn,
} from "./market-calendar.js";
export type {
  MarketCalendarException,
  MarketCalendarExceptionKind,
  MarketEarlyClose,
  MarketFullClosure,
} from "./market-calendar.js";

// What a trading SESSION is, and the questions the rest of the product asks
// about one (Task 2.5.4). This is the module Story 2.5 exists for: Story 2.8
// asks which minutes should have bars, Story 2.12 where the x-axis starts and
// stops, Story 2.13 for "the last N sessions", and Epic 13 for the session state
// at a replayed instant.
//
// It composes the two modules above it and adds the one thing neither knows:
// `market-time.ts` converts and knows nothing about holidays, `market-calendar.ts`
// knows which days are exceptional and deliberately nothing about Saturdays —
// turning its `undefined` into a session is this module's job.
//
// The state at an instant is a DISCRIMINATED UNION and not a boolean, because
// `isMarketOpen()` collapses four things a user needs to tell apart: 04:00 on a
// normal Tuesday, Christmas Day, Sunday, and 14:00 on a half day that has
// already shut. Task 2.5.5 renders that difference in the header.
//
// Nothing here reads the clock, and that ABSENCE is Epic 13's seam: a pure
// function of an instant is already replay-ready, so there is no `Clock`
// interface to inject. Walking off the end of the 2024-2028 calendar PROPAGATES
// the refusal rather than truncating — a short list of sessions is a wrong
// answer wearing the shape of a right one.
export {
  lastMarketSessions,
  MARKET_SESSION_CLOSE,
  MARKET_SESSION_OPEN,
  MARKET_SESSION_STATUSES,
  marketSessionOn,
  marketSessionsBetween,
  marketSessionStateAt,
  nextMarketSession,
  previousMarketSession,
} from "./market-session.js";
export type {
  MarketSession,
  MarketSessionState,
  MarketSessionStatus,
} from "./market-session.js";

// What a price observation IS, and the intervals one may be asked for (Task
// 2.6.2). Here rather than in `apps/backend` because Story 2.12's chart axis and
// Story 2.8's ingestion are on opposite sides of the wire and must not hold two
// copies of it — `market-session.ts`'s reason, and Story 1.12's rule applied
// honestly rather than as a slogan. What deliberately does NOT come here is the
// `MarketDataProvider` interface: the frontend may know the NAME of a provider,
// because it renders it, and may not know the SHAPE of one, because that is a
// thing which holds a credential and makes vendor network calls (PROVIDER.md
// §1.2).
//
// `Bar` is six fields and no more, and the two that were declined have named
// triggers rather than being forgotten. `startsAt` is named for the end of the
// interval it marks, because a one-minute systematic error is invisible on a
// chart and wrong in every anomaly calculation. Prices are `number` and the
// guard that comes with that is prose: an aggregate over prices is computed in
// SQL over `numeric`, never in JavaScript over this type.
//
// The symbol, the timeframe and the provenance of a series all live on the
// SERIES rather than on a bar — Task 2.6.3 builds it, and criterion 3 is that
// there is no code path producing a bar without provenance.
export { TIMEFRAMES } from "./bar.js";
export type { Bar, Timeframe } from "./bar.js";

// The window a request is made over (Task 2.6.2). One type rather than two
// parameters, because two can be swapped at a call site and nothing notices;
// BRANDED, because a bare interface fixes only the positional half of that and
// lets an object literal skip the constructor entirely. Half-open, `[start,
// end)`, which is what makes adjacent windows tile without a duplicated bar at
// the seam — Story 2.8's backfill does that thousands of times, and a duplicate
// there is a real corruption rather than a cosmetic one.
export { toTimeRange } from "./time-range.js";
export type { TimeRange } from "./time-range.js";

// Where a price series came from, and what has been done to its numbers (Task
// 2.6.3). This is the story's product-weight decision rather than its
// engineering one: invariant 6 and §7.1 require the feed to be DISPLAYED and
// require us not to imply full US-market coverage, and §35 lists "hide data
// provenance" among the things this product must not do. So provenance is a
// field on the DATA and not a caption on a component — a caption is true of the
// component, and it is unchanged and wrong the moment Story 2.8 stitches stored
// bars onto fresh ones.
//
// A record names a LIST of sources for exactly that reason. Sources may
// disagree about FEED and that is reported truthfully; they are REFUSED if they
// disagree about ADJUSTMENT, because raw and split-adjusted prices are on two
// different scales and an array holding both has a step in it that is an
// artefact of our own stitching. `SeriesProvenance` is branded so that refusal
// is a mechanism rather than an instruction: `mergeSeriesProvenance` is the only
// way to obtain a multi-source record, and it always checks.
//
// The feed's user-facing words live here too, beside the vocabulary, because a
// renderer deriving a sentence from a slug and a lookup table of its own is two
// vocabularies for one fact. `Market feed: IEX` alone satisfies §7.1's letter
// and fails its intent — the sentence is the requirement, the label is the
// affordance.
export {
  ADJUSTMENTS,
  MARKET_FEED_DESCRIPTIONS,
  MARKET_FEEDS,
  mergeSeriesProvenance,
  PROVIDER_IDS,
  toSeriesProvenance,
} from "./market-provenance.js";
export type {
  Adjustment,
  BarSource,
  MarketFeed,
  MarketFeedDescription,
  ProviderId,
  SeriesProvenance,
} from "./market-provenance.js";

// The wire contract for GET /market-data (Task 2.6.7) — one question, asked
// once per page load: which market feed is this deployment reading? A separate
// file from market-provenance.ts for securities-response.ts's reason: that one
// says what provenance IS and every epic reads it, this one says what one
// RESPONSE looks like and only the two ends of this API do.
//
// The body is ONE field. `provider` is deliberately absent because nothing
// reads it: every provider declares its feed, so `feed === null` happens
// exactly when none is configured, and what §7.1 requires on screen is the feed
// rather than the vendor. It arrives with its first reader, Story 2.14, off
// SeriesProvenance where it already travels per series.
export { isMarketDataResponse } from "./market-data-response.js";
export type { MarketDataResponse } from "./market-data-response.js";

// A run of bars that cannot exist without saying where it came from (Task
// 2.6.3), which is Story 2.6's acceptance criterion 3 made structural rather
// than conventional. `BarSeries` is branded and `toBarSeries` is the only way to
// obtain one: a required field alone already makes a series without provenance
// uncompilable, and the brand buys the half a required field cannot, which is
// that a hand-written literal skips every coherence check — the source bar
// counts summing to the bars, the bars ascending, the covered range agreeing
// with both the bars and the request.
//
// Coverage lives on the SERIES rather than on a response envelope, on the
// argument that made provenance not a caption: an envelope is a fact about one
// HTTP exchange and a series outlives it. It says how far an answer REACHES,
// not whether it is dense — telling a thin name's missing minute from a failed
// fetch is Story 2.8's gap handling.
export { toBarSeries } from "./bar-series.js";
export type {
  BarSeries,
  BarSeriesInput,
  SeriesCoverage,
} from "./bar-series.js";

// The wire contract for GET /market-data/bars (Task 2.9.3). A separate file
// from bar.ts, bar-series.ts and market-provenance.ts for securities-response.ts's
// reason: those say what a bar, a series and its provenance ARE and three later
// epics read them, this one says what one RESPONSE looks like and only the two
// ends of this API do.
//
// The types are wire TWINS of the domain types rather than the domain types
// themselves, and that is structural rather than stylistic: `BarSeries`,
// `SeriesProvenance` and `TimeRange` are branded, so nothing parsed out of JSON
// is one of them, and a brand is a `unique symbol` key that no response schema
// can carry. `Date` is not a wire type either — every instant here is an ISO
// 8601 UTC string with the `Z`, and there is no timezone in the payload.
// `BarSource` is deliberately NOT twinned: all four of its fields are already
// JSON-native, so a copy would agree with the original only until one is edited.
//
// An envelope rather than a bare series, because MARKET-DATA-API.md §7 requires
// the response to be able to say the security is UNTRACKED — `status` is not
// filtered on this path, and a 404 for a symbol whose bars we hold would be a
// lie about our own data. `isBarSeriesResponse` is deliberately absent until
// Story 2.10 reads one, which is Task 1.7.3's rule.
export type {
  BarPayload,
  BarSeriesPayload,
  BarSeriesResponse,
  SeriesCoveragePayload,
  SeriesProvenancePayload,
  TimeWindowPayload,
} from "./bar-series-response.js";
