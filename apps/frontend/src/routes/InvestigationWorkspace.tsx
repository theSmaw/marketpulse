import { Placeholder } from "./Placeholder.js";

// PRODUCT_SPEC.md §8.2 — "Why might this be happening?", and the spec calls it
// the core product. Nothing behind it yet by design: the investigation engine
// is Epic 7's and the AI that drives it is Epic 10's, in that order and not the
// other way round.
export function InvestigationWorkspace() {
  return (
    <Placeholder name="Investigation Workspace">
      Where an anomaly becomes a question with evidence behind it. Epic 7 builds
      the deterministic investigation engine and its event stream, Epic 8 the
      evidence workspace, and Epic 10 lets a model drive what already works
      without one.
    </Placeholder>
  );
}
