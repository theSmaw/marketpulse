// The `investigations` module — Epic 7's own feature module, `market/
// index.ts`'s precedent followed exactly: this file is the module's API,
// everything else under this directory is its business, and
// `eslint.config.mjs`'s feature-module boundary enforces it rather than
// relying on anyone remembering.
//
// What is NOT re-exported, deliberately, mirrors `market/index.ts`'s own
// choices: `investigation-stream.ts`'s `startInvestigation`/
// `streamInvestigationEvents` stay private, because nothing outside this
// module should be able to open a stream directly — every subscription
// comes with the state that interprets it, which is `useInvestigation`'s
// whole job. `investigation-event.ts`'s decoder and its wire types stay
// private too: a consumer wants a checklist, never a raw frame.

export {
  useInvestigation,
  CONNECTION_LOST_SENTENCE,
} from "./use-investigation.js";
export type { UseInvestigationResult } from "./use-investigation.js";

export type {
  ChecklistState,
  ChecklistStepStatus,
  ChecklistStepView,
} from "./investigation-checklist-state.js";
