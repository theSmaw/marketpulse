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

// **The highlight's own lifetime, Task 7.4.3.** The holder lives in `App.tsx`
// — outside every route, because it is the one element that outlives the
// navigation from the page that produces a command to the page that draws it
// — so the reducer that decides what the holder becomes is part of this
// module's API rather than its business. `highlightOutlivesChannelEnd` is
// NOT: it is read only by the hook, which is the one thing here that watches
// a stream end.
export { applyWorkspaceHighlight } from "./workspace-highlight.js";
export type {
  WorkspaceHighlightCommand,
  WorkspaceHighlightState,
} from "./workspace-highlight.js";

export type {
  ChecklistState,
  ChecklistStepStatus,
  ChecklistStepView,
} from "./investigation-checklist-state.js";
