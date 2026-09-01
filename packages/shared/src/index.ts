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

// The wire contract with the API: the shape every error response takes, and the
// name of the header that correlates any response with its log records. Both
// are here for the same reason — the backend writes them and Story 1.12's
// frontend reads them, and a wire format described in two places is a wire
// format that will disagree with itself.
export { API_ERROR_CODES, apiError } from "./api-error.js";
export type { ApiError, ApiErrorCode } from "./api-error.js";
export { REQUEST_ID_HEADER } from "./request-id.js";
