import { Placeholder } from "./Placeholder.js";

// PRODUCT_SPEC.md §8.4 — "What was knowable at this moment?". Epic 13's, and
// the reason invariant 4 exists from the first query rather than from the epic
// that needs it: temporal isolation is enforced in the data and tool layers, so
// that future information is structurally unreachable rather than merely
// unrequested.
export function MarketReplay() {
  return (
    <Placeholder label="Placeholder" name="Market Replay">
      Replaying a historical session through its own clock, with every part of
      the product constrained to what was knowable at that moment. Epic 13
      builds it, on top of the temporal isolation the data layer carries from
      the beginning.
    </Placeholder>
  );
}
