// The two numbers Story 1.12 chose, restated here because they cannot be
// imported — and checked against the running application so the restatement
// cannot drift silently (Task 1.13.3).
//
// ## Why they are copies
//
// `HEALTH_POLL_INTERVAL_MS` lives in `apps/frontend/src/use-backend-health.ts`
// and `API_TIMEOUT_MS` in `apps/frontend/src/api-client.ts`, and neither module
// can be loaded from a spec. Measured rather than assumed: importing either one
// under Node throws
//
//     TypeError: Cannot read properties of undefined (reading 'VITE_API_BASE_URL')
//
// because `api-base-url.ts` reads `import.meta.env` at module load, which Vite
// substitutes at build time and which is `undefined` in a plain Node process.
// Every path from these constants to a spec runs through that module, so the
// import is structurally unavailable rather than merely awkward.
//
// The three alternatives were considered and each is worse:
//
//   - **Moving the constants to `packages/shared`.** That package is the *wire
//     contract*; a poll interval is client policy, which is the argument Task
//     1.12.3 used to keep the number beside the hook. Relocating shipped code
//     for a test's convenience is what Task 1.10.5 refused to do when it
//     declined to widen `MIN_PORT` so a process test could bind port 0.
//   - **Exposing them on `window`.** Application source changed for a test,
//     with a global added to a browser bundle for the life of the product.
//   - **A number that happens to pass.** Explicitly ruled out by this task, and
//     rightly: 35 000 is the arithmetic for a hung cycle and 36 000 is what was
//     actually measured, so a wait derived from the wrong one is a flake on the
//     one path this suite exists for.
//
// ## Why the copy is safe
//
// **`backend-recovery.spec.ts` measures the interval the running application
// actually polls at and asserts it against `HEALTH_POLL_INTERVAL_MS` below.**
// It gets that measurement for free, because it already waits out two cycles.
// So this is a checked copy rather than a silent one, and changing the number
// in `use-backend-health.ts` without changing it here fails a spec that names
// both values — which is this repository's own rule that a test beats another
// `verify` step when the thing being checked is reachable from a running
// instance.
//
// `API_TIMEOUT_MS` is not asserted here and its copy is unchecked. It is used
// only as slack in a derived timeout, where being wrong by five seconds cannot
// change a verdict, and producing the hung-socket path that would check it
// costs a spec 36 seconds to assert something Task 1.12.6 already measured in a
// browser. Stated rather than hidden.

/** `apps/frontend/src/use-backend-health.ts`. Checked — see above. */
export const HEALTH_POLL_INTERVAL_MS = 30_000;

/** `apps/frontend/src/api-client.ts`. Unchecked — see above. */
export const API_TIMEOUT_MS = 5_000;

/**
 * How long to allow for a state change that has to wait for the next poll.
 *
 * Derived from both constants rather than picked. The interval is the wait
 * itself; the deadline is added because a cause that *hangs* the request rather
 * than refusing it is not observed until the deadline expires and the next poll
 * is scheduled on **settle**, which is why Task 1.12.6 measured a hung cycle at
 * 36.00 s rather than the 35 s the arithmetic suggests. The remaining slack
 * covers the page's own work and a loaded CI runner, where the recorded
 * runner-to-runner spread on identical work is 13.6 s.
 *
 * Under Playwright the healthy cycle measures **30.02 s**, not the 31.00 s
 * Tasks 1.12.6 and 1.12.7 recorded — those readings came from an automated tab
 * that Chrome had genuinely backgrounded and whose timers it was aligning to
 * the second. Both numbers are right about their own harness; do not read the
 * difference as drift.
 */
export const NEXT_POLL_TIMEOUT_MS =
  HEALTH_POLL_INTERVAL_MS + API_TIMEOUT_MS + 10_000;

/**
 * How far a measured interval may sit from the declared one before the copy
 * above is considered stale.
 *
 * Wide on purpose. The thing being checked is that the constant is *the same
 * number*, not that the browser's timers are accurate — asserting the latter
 * would be asserting latency, which this suite's must-not list forbids and for
 * which CI's spread is the reason.
 */
export const POLL_INTERVAL_TOLERANCE_MS = 5_000;
