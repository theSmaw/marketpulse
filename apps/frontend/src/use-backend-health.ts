import type {
  BackendDegradedCause,
  BackendStatus,
  HealthResponse,
} from "@marketpulse/shared";
import { useEffect, useState } from "react";

import { API_TIMEOUT_MS, getHealth } from "./api-client.js";
import type { ApiResult } from "./api-client.js";

// The application's first state, first effect and first network loop
// (Task 1.12.3).
//
// It replaces `health-probe.ts`, which is deleted in the same change: that was
// one `fetch` at startup reported to a console, and this is a repeating check
// whose result the interface can render. The deletion belongs here rather than
// in Task 1.12.2 because the deployed frontend has to go on calling the
// deployed backend across every merge in this story — Story 1.11's criterion —
// and this is the first commit that has something to call it with.
//
// **Nothing renders here.** The hook owns the state, the interval, the
// visibility rule and the teardown; Task 1.12.4 builds what the states look
// like and Task 1.12.5 puts it in the chrome. Keeping the two apart is what
// lets the indicator be reviewed in a workshop that never makes a request.
//
// ## Why a failed poll is not an error
//
// `getHealth()` **never throws, in any branch** — every transport failure comes
// back as an `ApiResult` variant. So an unreachable backend is a value this
// hook stores rather than an exception that unwinds through `ErrorBoundary`,
// which is why "the rest of the interface remains usable" is structural here
// rather than something the error boundaries happen to allow. There is no
// `try`/`catch` below and its absence is deliberate.
//
// ## The seven outcomes are not the three states, and the mapping is judgement
//
// `ApiResult` has seven outcomes and `BackendStatus` has three members. The
// collapse is four lines and each one is a decision rather than a rename — see
// `toBackendHealth` below, and note the one outcome that maps to **no state at
// all**.

/**
 * How long between the end of one check and the start of the next.
 *
 * ## Why 30 seconds, and why the floor is not a taste question
 *
 * The hard constraint first: this must be **strictly greater than
 * `API_TIMEOUT_MS`**, which Task 1.12.2 set at 5 s. At or below it a hung
 * request is still outstanding when the next poll starts and the two overlap
 * forever — the exact failure the deadline exists to prevent, arriving from the
 * other side. Nothing in `pnpm verify` checks that ordering; it is stated in
 * `api-client.ts` beside the constant and honoured here. The two numbers can be
 * re-taken together and cannot be chosen independently: moving the deadline
 * moves which state a slow backend reports as, because a deadline that expires
 * is `unreachable` and not `degraded`.
 *
 * Above that floor there are three costs, and only one of them is log noise.
 *
 * - **The shared development terminal.** A `GET /health` is 2 rendered lines
 *   since Task 1.8.2's `singleLine`, in the same terminal as both watchers and
 *   Vite. At 5 s that is 24 lines a minute; at 30 s it is 4.
 * - **The deployed backend's log volume.** It writes 16 records a minute at
 *   idle from the three platform probes, against a probe-only baseline of 1–4
 *   requests per 30 s. A 5 s poll adds 12 requests a minute **from every open
 *   tab**; 30 s adds 2, which is inside the noise the platform already makes.
 * - **Billing.** The Consumption plan's idle rate — the difference between
 *   ~$9.21 and ~$19.04 a month — has among its conditions that the replica
 *   receive less than 1,000 bytes per second. Platform probes are not billable
 *   and these polls are. Whether continuous probing breaks that condition could
 *   not be answered in Story 1.11 (the environment was six hours old against
 *   cost data that lags 8–24 hours) and is not this task's to settle — but it
 *   is the reason the interval is not 5 s just because 5 s is legal.
 *
 * Against those, what 30 s costs the user: a backend that goes away is reported
 * within 30 s of the poll that would have caught it, and one that comes back is
 * reported within 30 s of recovering. For a status indicator in the chrome of
 * an application with no live data in it yet, that is not a number anybody can
 * feel. Epic 3's market feed is a **socket**, not a poll, so nothing here sets
 * a precedent for it.
 *
 * ## Why a literal and not a `VITE_` variable
 *
 * The frontend's ports are literals as a stated decision and this follows them,
 * on an argument that is stronger here. A variable would be the story's second,
 * and a variable is declared in three places now — `.env.example`,
 * `vite-env.d.ts` and `deploy.yml` — with nothing checking the set;
 * `scripts/check-env-example.mjs` reads the example and has no view of the
 * declarations. Worse, this number is **coupled** to `API_TIMEOUT_MS`, which is
 * a literal: making one of a pair configurable lets an operator invert an
 * ordering nothing checks, from a place where the other half of the pair is not
 * visible. If it ever becomes configurable, both move together and the check
 * for the ordering moves with them.
 */
export const HEALTH_POLL_INTERVAL_MS = 30_000;

/**
 * What this client currently believes about the backend.
 *
 * `status` is `BackendStatus` from `packages/shared` and nothing here invents a
 * fourth name for anything — including for "we have not finished asking yet",
 * which is what `hasChecked` is for. A fourth status member would leak a
 * client-lifecycle fact into a vocabulary that is defined entirely in terms of
 * the wire contract.
 */
export interface BackendHealth {
  /** The conclusion, derived from the most recent poll that produced one. */
  readonly status: BackendStatus;

  /**
   * Which of the two producible causes made it `degraded`, and `null` in every
   * other state. Named rather than boolean because `BACKEND_DEGRADED_CAUSES`
   * exists precisely so the middle state is testable.
   */
  readonly degradedCause: BackendDegradedCause | null;

  /**
   * When the last **successful** check completed, or `null` if none ever has.
   *
   * This is the story's second acceptance criterion and the field most likely
   * to be broken by accident: a failed poll must not clear it. That is why
   * every failing branch below spreads the previous state rather than building
   * a fresh object.
   */
  readonly lastSuccessAt: Date | null;

  /** The body of that last successful check, for anything that wants to show
   * what the backend actually said. `null` until one succeeds. */
  readonly lastSuccess: HealthResponse | null;

  /**
   * Has any poll settled yet?
   *
   * Before the first one has, `status` reads `unreachable` — which is literally
   * true, nothing has arrived — but it is true for an uninteresting reason, and
   * an indicator that flashes "unreachable" for one round trip on every page
   * load is reporting the client's own startup as a fact about the server. This
   * boolean is how Task 1.12.4 tells the two apart without a fourth state name.
   */
  readonly hasChecked: boolean;
}

/**
 * Before anything has been asked.
 *
 * `unreachable` rather than a fourth name: it is the member that means "no
 * response at all", and no response has arrived. `hasChecked` is what carries
 * the difference between that and a failed check.
 */
const INITIAL: BackendHealth = {
  status: "unreachable",
  degradedCause: null,
  lastSuccessAt: null,
  lastSuccess: null,
  hasChecked: false,
};

/**
 * Collapse one of the seven outcomes onto the three states.
 *
 * This mapping is the substance of this task and it is four decisions:
 *
 * - `ok` → `healthy`, and the only branch that records a time and a payload.
 * - `unreadable-body` → `degraded` / `unreadable-body`. Something answered 2xx
 *   at the API's address and it was not a health report — a static host serving
 *   `index.html`, which this repository has measured twice.
 * - **Both** `api-error` and `http-error` → `degraded` / `not-ok-status`. The
 *   client tells those two apart only by whether the body carried a
 *   `requestId` a user could quote, and that is not a distinction
 *   `BackendStatus` has. Do not add one for it here.
 * - **Both** `timeout` and `unreachable` → `unreachable`. Nothing arrived in
 *   either case, which is Task 1.12.1's structural definition rather than a
 *   convenience: `degraded` is a judgement about an answer that did arrive, so
 *   a slow backend that never answers is not a degraded one.
 *
 * `aborted` is the fifth case and it maps to **no state at all** — it is a
 * torn-down effect or a superseded request, not a fact about the backend, so it
 * returns the previous state untouched. The caller below filters it before
 * getting here as well; this branch exists so the union stays exhaustively
 * handled and a new outcome cannot be added silently.
 */
function toBackendHealth(
  previous: BackendHealth,
  result: ApiResult<HealthResponse>,
  now: Date,
): BackendHealth {
  switch (result.outcome) {
    case "ok":
      return {
        status: "healthy",
        degradedCause: null,
        lastSuccessAt: now,
        lastSuccess: result.data,
        hasChecked: true,
      };

    case "unreadable-body":
      return {
        ...previous,
        status: "degraded",
        degradedCause: "unreadable-body",
        hasChecked: true,
      };

    case "api-error":
    case "http-error":
      return {
        ...previous,
        status: "degraded",
        degradedCause: "not-ok-status",
        hasChecked: true,
      };

    case "timeout":
    case "unreachable":
      return {
        ...previous,
        status: "unreachable",
        degradedCause: null,
        hasChecked: true,
      };

    case "aborted":
      return previous;
  }
}

/**
 * Options. Both exist for the reason `loadConfig(env)` takes an argument and
 * `resolveApiBaseUrl(raw)` takes one: a number that can only be varied by
 * editing the module is a number no test can exercise. **Production passes
 * neither**, and the defaults are the decisions — see the two constants.
 */
export interface UseBackendHealthOptions {
  /** Defaults to {@link HEALTH_POLL_INTERVAL_MS}. */
  readonly intervalMs?: number;

  /**
   * Defaults to the client's own {@link API_TIMEOUT_MS}, which is the number
   * that decides whether a slow backend reads as `unreachable`. It is here so
   * a test can make a deadline expire without waiting five real seconds, and
   * **not** as a second place to configure the deadline: pass it and the
   * ordering this hook's interval is chosen against becomes the caller's to
   * keep.
   */
  readonly timeoutMs?: number;
}

/**
 * Poll `GET /health` and report what it concludes.
 *
 * ## Scheduling: a chain of timeouts, not an interval
 *
 * The next poll is scheduled when the previous one **settles**, so two requests
 * can never be outstanding at once — which makes the overlap the interval floor
 * exists to prevent structurally impossible as well as arithmetically avoided.
 * `setInterval` would fire on a clock that knows nothing about whether the last
 * request came back. The floor is still honoured, and both belong here: a
 * future move back to an interval must not silently reintroduce the overlap.
 *
 * ## Visibility: a hidden tab does not poll
 *
 * A background tab polling forever is every cost above multiplied by every tab
 * a user forgot, for a state nobody is looking at. So the loop stops on
 * `visibilitychange` to hidden and — this is the half that makes it usable —
 * polls **immediately** on becoming visible again rather than waiting out the
 * interval, so a returning user does not read a stale state.
 *
 * Two consequences worth knowing before measuring anything. An **automated tab
 * reports `hidden`**, which is why every component timing in this repository is
 * measured hidden against hidden — so a browser-driven check of the poll (Task
 * 1.12.6, Story 1.13) sees the first poll and then silence unless it makes the
 * tab visible. And a tab hidden mid-flight lets that request finish and writes
 * its result: cancelling it would abort a request the backend has already been
 * asked to serve, for nothing.
 */
export function useBackendHealth(
  options: UseBackendHealthOptions = {},
): BackendHealth {
  const intervalMs = options.intervalMs ?? HEALTH_POLL_INTERVAL_MS;
  const timeoutMs = options.timeoutMs ?? API_TIMEOUT_MS;
  const [health, setHealth] = useState<BackendHealth>(INITIAL);

  useEffect(() => {
    // Everything the loop needs lives in this closure rather than in refs.
    // The effect is the loop's whole lifetime: it is created with the mount,
    // torn down with it, and nothing outside it reads any of this.
    const controller = new AbortController();

    let timer: number | undefined;
    let inFlight = false;
    let stopped = false;

    // `stopped` is read through a function rather than directly, and that is
    // forced rather than stylistic. TypeScript narrows a `let` from an
    // enclosing scope and does **not** widen it again across an `await` — the
    // only assignment to `true` is in the teardown closure, which the analysis
    // cannot see running — so `if (stopped) return;` after the request comes
    // back is `no-unnecessary-condition` at error: *"value is always falsy"*.
    // It is not always falsy; it is exactly the case teardown produces. A call
    // expression is never narrowed, so reading it through this closes the gap
    // without an assertion or a disabled rule.
    const hasStopped = (): boolean => stopped;

    const clearPending = (): void => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    };

    const isHidden = (): boolean => document.visibilityState === "hidden";

    const schedule = (): void => {
      clearPending();
      if (hasStopped() || isHidden()) return;
      timer = window.setTimeout(() => {
        void poll();
      }, intervalMs);
    };

    const poll = async (): Promise<void> => {
      if (hasStopped() || inFlight || isHidden()) return;
      inFlight = true;

      // No `try`/`catch`: `getHealth` never throws. A rejection here would be a
      // bug in the client rather than a backend that is down, and swallowing it
      // is how that bug would stay invisible.
      const result = await getHealth({ signal: controller.signal, timeoutMs });

      inFlight = false;
      if (hasStopped()) return;

      // The teardown case. `aborted` is not a fact about the backend, so it is
      // written nowhere — this is the "resolved after unmount" bug closed at
      // the one place it can be closed. Which signal fired was decided inside
      // the client off the signals themselves; nothing here inspects a
      // rejection or compares a `DOMException` name across realms.
      if (result.outcome !== "aborted") {
        const now = new Date();
        setHealth((previous) => toBackendHealth(previous, result, now));
      }

      schedule();
    };

    const onVisibilityChange = (): void => {
      if (isHidden()) {
        clearPending();
        return;
      }

      // Catch up rather than resume: the state on screen was last written
      // before the tab was hidden and may be arbitrarily old.
      void poll();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    void poll();

    return () => {
      stopped = true;
      clearPending();
      document.removeEventListener("visibilitychange", onVisibilityChange);

      // Abort last, so the `aborted` result lands on a closure that already
      // knows it has stopped. Under `StrictMode` the development double-invoke
      // runs this immediately after the first mount, and the first effect's
      // in-flight request comes back `aborted` and writes nothing — which is
      // the designed behaviour rather than something to suppress.
      controller.abort();
    };
  }, [intervalMs, timeoutMs]);

  return health;
}
