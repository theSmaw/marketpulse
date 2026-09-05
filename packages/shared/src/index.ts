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
